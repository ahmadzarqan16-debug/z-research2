import test from 'node:test';import assert from 'node:assert/strict';import {initial,evolve,replay} from '../lib/sim.js';
const e=(i,type,data={})=>({id:String(i).padStart(3,'0'),ts:1e5+i,type,data,group:'01'});
test('same events always produce identical business outcome',()=>{
 const events=[e(1,'createStartup',{name:'Orbital',industry:'EdTech',capital:200,price:2}),e(2,'hire',{role:'engineer',name:'Ari'}),e(3,'task',{employee:'002',task:'mvp'}),e(4,'week'),e(5,'week'),e(6,'week'),e(7,'week'),e(8,'advance'),e(9,'campaign',{channel:'social',budget:12}),e(10,'advance')];
 assert.deepEqual(replay('ZZZZ1234','01',events.map(x=>structuredClone(x))),replay('ZZZZ1234','01',events.map(x=>structuredClone(x))));
});
test('hire increases payroll, sprint delivers skill-based quality, cash ledger balances',()=>{
 const s=initial('01');for(let i=1;i<=7;i++){const ev=[null,e(1,'createStartup',{name:'Orbit',industry:'SaaS',capital:200}),e(2,'hire',{role:'engineer'}),e(3,'task',{employee:'002',task:'mvp'}),e(4,'week'),e(5,'week'),e(6,'week'),e(7,'week')][i];evolve(s,ev,'ABCD2345')}
 assert.equal(s.employees.length,1);assert.equal(s.employees[0].salary,12);assert.equal(s.tasks.length,1);assert.ok(s.tasks[0].weeklyReports.length>=1);assert.equal(s.quality,12);assert.equal(s.tasks[0].done,false);assert.ok(['pending_review','working'].includes(s.tasks[0].status));
 const sums=s.ledger.reduce((a,x)=>a+x.amount,200);assert.equal(Math.round(sums*100)/100,s.cash);
});
test('investor dilutes founders without creating money from refusal',()=>{
 const s=initial('01');evolve(s,e(1,'createStartup',{name:'A',industry:'SaaS',capital:120}), 'ABCD2345');
 const cash=s.cash;evolve(s,e(2,'offer',{amount:150,equity:20}),'ABCD2345');evolve(s,e(3,'accept',{offer:'002'}),'ABCD2345');assert.equal(s.founderEquity,80);assert.equal(s.cash,cash+150);
});
test('movement persists and is clamped to office dimensions',()=>{const s=initial('01');evolve(s,e(1,'createStartup',{name:'A',industry:'SaaS',capital:120}),'ABCD2345');evolve(s,e(2,'move',{x:5000,y:0}),'ABCD2345');assert.deepEqual(s.avatar,{x:880,y:75});});

test('founder can input zero or much higher salary; payroll and recruitment are based on input',()=>{
 const s=initial('01'),room='TEST4321';
 evolve(s,e(1,'createStartup',{name:'Salary Lab',industry:'SaaS',capital:800}),room);
 evolve(s,e(2,'hire',{role:'engineer',name:'Founder Fellow',salary:0}),room);
 evolve(s,e(3,'hire',{role:'designer',name:'Senior Designer',salary:60}),room);
 assert.equal(s.employees[0].salary,0);
 assert.equal(s.employees[1].salary,60);
 assert.equal(s.employees[1].marketSalary,9);
 const before=s.cash;
 evolve(s,e(4,'advance'),room);
 assert.equal(s.finance[0].expenses>=60,true);
 assert.equal(s.cash<before,true);
 assert.equal(s.ledger.some(x=>x.label.includes('negotiated salary Rp60m')),true);
});
test('weekly QA logs reveal employee correctness and unapproved work adds zero quality',()=>{
 const s=initial('01'),room='QA123456';
 evolve(s,e(1,'createStartup',{name:'QualityLab',industry:'SaaS',capital:600}),room);
 evolve(s,e(2,'hire',{role:'engineer',name:'Underpaid',salary:1}),room);
 evolve(s,e(3,'task',{employee:'002',task:'mvp'}),room);
 for(let i=4;i<=7;i++)evolve(s,e(i,'week'),room);
 const t=s.tasks[0];assert.ok(t.weeklyReports.length>=1);assert.equal(t.weeklyReports[0].employee,'Underpaid');
 assert.equal(t.weeklyReports[0].workPoints>0,true);
 assert.equal(t.qualityScore>=15,true);
 assert.equal(t.status,'pending_review');assert.equal(t.done,false);assert.equal(s.quality,12);
 evolve(s,e(8,'reviewWork',{task:t.id}),room);
 assert.equal(t.reviewHistory.length,1);
 if(t.reviewHistory[0].approved){assert.equal(t.done,true);assert.ok(s.quality>12)}
 else{assert.equal(t.status,'needs_rework');assert.equal(t.done,false);
  const before=s.cash;evolve(s,e(9,'rework',{task:t.id}),room);
  assert.equal(t.status,'rework');assert.ok(s.cash<before);
 }
});
test('investor KPI failure freezes funding while investor can release freeze with an auditable action',()=>{
 const s=initial('01'),room='VC123456';
 evolve(s,e(1,'createStartup',{name:'Under Pressure',industry:'SaaS',capital:300}),room);
 evolve(s,e(2,'offer',{amount:200,equity:15}),room);
 evolve(s,e(3,'pressure',{metric:'cash',target:9000,deadline:1,text:'Raise liquidity above target before month 2'}),room);
 assert.equal(s.directives[0].status,'open');
 evolve(s,e(4,'answer',{pressure:'003',text:'We will cut unnecessary hiring and improve revenue.'}),room);
 assert.equal(s.directives[0].status,'open');
 const cash=s.cash;
 evolve(s,e(5,'advance'),room);
 assert.equal(s.directives[0].status,'failed');assert.equal(s.failedKpis,1);
 assert.ok(s.fundingFreezeUntil>s.month);assert.ok(s.confidence<60);
 evolve(s,e(6,'accept',{offer:'002'}),room);
 assert.equal(s.cash<cash+200,true);assert.equal(s.offers[0].status,'open');
 evolve(s,e(7,'relief'),room);assert.equal(s.fundingFreezeUntil,s.month);
 const before=s.cash;evolve(s,e(8,'accept',{offer:'002'}),room);assert.equal(s.cash,before+200);
 assert.equal(s.offers[0].status,'accepted');
});
test('board KPI success is determined by business state, not written promises',()=>{
 const s=initial('01'),room='VC123456';
 evolve(s,e(1,'createStartup',{name:'Stable Co',industry:'EdTech',capital:300}),room);
 evolve(s,e(2,'pressure',{metric:'quality',target:12,deadline:1,text:'Keep quality at or above twelve'}),room);
 evolve(s,e(3,'advance'),room);
 assert.equal(s.directives[0].status,'achieved');assert.equal(s.passedKpis,1);assert.equal(s.failedKpis,0);
});
