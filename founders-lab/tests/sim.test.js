import test from 'node:test';import assert from 'node:assert/strict';import {initial,evolve,replay} from '../lib/sim.js';
const e=(i,type,data={})=>({id:String(i).padStart(3,'0'),ts:1e5+i,type,data,group:'01'});
test('same events always produce identical business outcome',()=>{
 const events=[e(1,'createStartup',{name:'Orbital',industry:'EdTech',capital:200,price:2}),e(2,'hire',{role:'engineer',name:'Ari'}),e(3,'task',{employee:'002',task:'mvp'}),e(4,'week'),e(5,'week'),e(6,'week'),e(7,'week'),e(8,'advance'),e(9,'campaign',{channel:'social',budget:12}),e(10,'advance')];
 assert.deepEqual(replay('ZZZZ1234','01',events.map(x=>structuredClone(x))),replay('ZZZZ1234','01',events.map(x=>structuredClone(x))));
});
test('hire increases payroll, sprint delivers skill-based quality, cash ledger balances',()=>{
 const s=initial('01');for(let i=1;i<=7;i++){const ev=[null,e(1,'createStartup',{name:'Orbit',industry:'SaaS',capital:200}),e(2,'hire',{role:'engineer'}),e(3,'task',{employee:'002',task:'mvp'}),e(4,'week'),e(5,'week'),e(6,'week'),e(7,'week')][i];evolve(s,ev,'ABCD2345')}
 assert.equal(s.employees.length,1);assert.equal(s.employees[0].salary,12);assert.equal(s.tasks.length,1);assert.ok(s.quality>12);
 const sums=s.ledger.reduce((a,x)=>a+x.amount,200);assert.equal(Math.round(sums*100)/100,s.cash);
});
test('investor dilutes founders without creating money from refusal',()=>{
 const s=initial('01');evolve(s,e(1,'createStartup',{name:'A',industry:'SaaS',capital:120}), 'ABCD2345');
 const cash=s.cash;evolve(s,e(2,'offer',{amount:150,equity:20}),'ABCD2345');evolve(s,e(3,'accept',{offer:'002'}),'ABCD2345');assert.equal(s.founderEquity,80);assert.equal(s.cash,cash+150);
});
test('movement persists and is clamped to office dimensions',()=>{const s=initial('01');evolve(s,e(1,'createStartup',{name:'A',industry:'SaaS',capital:120}),'ABCD2345');evolve(s,e(2,'move',{x:5000,y:0}),'ABCD2345');assert.deepEqual(s.avatar,{x:880,y:75});});
