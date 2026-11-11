// Founders Lab deterministic simulation engine. All amounts are million IDR.
export const ROLES = {
 engineer:{label:"Software Engineer",salary:12,skill:8,team:"Product",color:"#67b7ff"},
 designer:{label:"Product Designer",salary:9,skill:7,team:"Product",color:"#ac96ff"},
 product:{label:"Product Manager",salary:14,skill:8,team:"Product",color:"#e1b4ff"},
 growth:{label:"Growth Marketer",salary:10,skill:7,team:"Growth",color:"#ffb477"},
 sales:{label:"Sales Executive",salary:9,skill:7,team:"Revenue",color:"#7cddc7"},
 finance:{label:"Finance Officer",salary:8,skill:7,team:"Operations",color:"#f4dd82"},
 support:{label:"Customer Success",salary:7,skill:7,team:"Operations",color:"#f4a6bf"}
};
export const INDUSTRIES = {SaaS:{demand:1.0,churn:.055},EdTech:{demand:1.12,churn:.06},FinTech:{demand:.84,churn:.045},FoodTech:{demand:1.2,churn:.10},HealthTech:{demand:.92,churn:.05},Agency:{demand:.87,churn:.09}};
export const TASKS = {mvp:{title:"Build MVP",cost:12,points:100,skill:"engineer",quality:16},ux:{title:"Improve UX",cost:5,points:75,skill:"designer",quality:9},research:{title:"Customer Discovery",cost:3,points:65,skill:"product",quality:6},features:{title:"Ship New Features",cost:9,points:110,skill:"engineer",quality:12},sales:{title:"Enterprise Sales Pipeline",cost:4,points:80,skill:"sales",quality:1},retention:{title:"Retention Program",cost:6,points:85,skill:"support",quality:3}};
export const CHANNELS = {social:{label:"Social Ads",cac:1.0},search:{label:"Search Ads",cac:1.3},community:{label:"Communities",cac:.58},partners:{label:"Partnerships",cac:.74}};
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const round=x=>Math.round(x*100)/100;
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0)/4294967295}
export function initial(group){return {group,company:null,industry:"SaaS",model:"Subscription",cash:0,capital:0,month:1,week:1,price:1.5,customers:0,market:1,quality:12,awareness:8,morale:76,confidence:60,founderEquity:100,investorEquity:0,employees:[],tasks:[],campaigns:[],notes:[],answers:[],offers:[],requests:[],shocks:[],ledger:[],timeline:[],finance:[],avatar:{x:170,y:245},revenue:0,expense:0,profit:0,score:0,bankrupt:false,paused:false}};
function money(s,label,amount,event){s.cash=round(s.cash+amount);s.ledger.push({month:s.month,week:s.week,label,amount:round(amount),balance:s.cash,id:event.id})}
function log(s,event,label){s.timeline.push({id:event.id,at:event.ts,month:s.month,label,kind:event.type});if(s.timeline.length>180)s.timeline.shift()}
function monthly(s,e,room){
 if(!s.company||s.bankrupt)return;
 const ind=INDUSTRIES[s.industry]||INDUSTRIES.SaaS;
 const volatility=0.88+hash(room+":"+s.group+":"+s.month)*.24;
 const acquisition=clip(Math.floor((s.quality*.17+s.awareness*.10)*(s.market*ind.demand)*volatility),0,200);
 const churned=Math.floor(s.customers*(ind.churn+(s.morale<40?.035:0)));
 s.customers=Math.max(0,s.customers+acquisition-churned);
 const conversion=clip(1.2-s.price*.075,.4,1.16);
 const earned=round(s.customers*s.price*conversion);
 const payroll=s.employees.reduce((t,w)=>t+w.salary,0);
 const variable=round(earned*.18);
 const fixed=9+3+Math.max(0,s.tasks.filter(t=>t.done).length)*.8;
 const out=round(payroll+variable+fixed);
 money(s,"Monthly revenue · "+s.month,earned,e);
 money(s,"Payroll and operations · "+s.month,-out,e);
 s.revenue=earned;s.expense=out;s.profit=round(earned-out);
 s.finance.push({month:s.month,revenue:earned,expenses:out,profit:s.profit,cash:s.cash,customers:s.customers});
 s.awareness=clip(round(s.awareness*.9+3),0,100);
 s.morale=clip(round(s.morale+s.employees.reduce((t,w)=>t+(w.energy<35?-3:1),0)),12,100);
 for(const w of s.employees){w.energy=clip(w.energy+20,10,100)}
 for(const p of s.offers){if(p.expiry<s.month)p.status="expired"}
 for(const q of s.shocks){if(q.until<s.month)s.market=1}
 if(s.cash<0&&s.finance.length>=2&&s.finance.slice(-2).every(v=>v.cash<0))s.bankrupt=true;
 s.month++;s.week=1;
 log(s,e,"Monthly close · revenue Rp"+earned+"m; expenses Rp"+out+"m");
}
export function evolve(s,e,room){
 const p=e.data||{},type=e.type;
 if(type==="createStartup"&&!s.company){
   s.company=String(p.name||"Untitled Venture").slice(0,45);s.industry=INDUSTRIES[p.industry]?p.industry:"SaaS";s.model=String(p.model||"Subscription").slice(0,35);
   s.capital=clip(n(p.capital,160),50,1000);s.cash=s.capital;s.price=clip(n(p.price,1.5),.2,20);
   s.notes.push({kind:"Vision",text:String(p.problem||"").slice(0,450),month:1});money(s,"Founding & setup fees",-10,e);log(s,e,"Founded "+s.company);return s;
 }
 if(!s.company)return s;
 switch(type){
 case "hire":{if(s.bankrupt)break;const r=ROLES[p.role];if(!r||s.employees.length>=24)break;const fee=round(r.salary*.3);if(s.cash<fee)break;const id=e.id;const x=210+(s.employees.length%4)*140;const y=150+Math.floor(s.employees.length/4)*75;
 s.employees.push({id,role:p.role,name:String(p.name||r.label).slice(0,34),salary:r.salary,skill:r.skill,energy:78,morale:76,x,y,taskId:null});money(s,"Recruitment · "+r.label,-fee,e);log(s,e,"Hired "+r.label);break;}
 case "fire":{const w=s.employees.find(w=>w.id===p.employee);if(!w)break;money(s,"Severance · "+w.name,-round(w.salary*.5),e);s.employees=s.employees.filter(x=>x.id!==w.id);log(s,e,"Released "+w.name);break;}
 case "task":{const w=s.employees.find(w=>w.id===p.employee),t=TASKS[p.task];if(!w||!t||s.bankrupt||w.taskId||s.cash<t.cost)break;const item={id:e.id,type:p.task,title:t.title,owner:w.id,progress:0,goal:t.points,done:false};s.tasks.push(item);w.taskId=item.id;money(s,"Project budget · "+t.title,-t.cost,e);log(s,e,"Started "+t.title);break;}
 case "week":{if(s.week>4||s.bankrupt)break;s.week++;
 for(const w of s.employees){if(!w.taskId)continue;const task=s.tasks.find(t=>t.id===w.taskId);if(!task||task.done)continue;
 const spec=TASKS[task.type];const match=spec.skill===w.role?1.55:spec.skill==="product"&&w.role==="designer"?1.15:.75;
 task.progress=clip(Math.round(task.progress+match*(w.skill*3+w.energy*.08+s.morale*.07)),0,task.goal);w.energy=clip(w.energy-15,7,100);
 if(task.progress>=task.goal){task.done=true;w.taskId=null;s.quality=clip(s.quality+spec.quality,0,100);if(task.type==="sales")s.customers+=8;if(task.type==="retention")s.morale=clip(s.morale+9,0,100);log(s,e,"Completed "+task.title);}
 }log(s,e,"Work week completed");break;}
 case "campaign":{if(s.bankrupt)break;const c=CHANNELS[p.channel],b=clip(n(p.budget),1,200);if(!c||s.cash<b)break;const gain=Math.floor((b/c.cac)*(s.quality/55+.48));s.customers+=gain;s.awareness=clip(s.awareness+b*.3,0,100);money(s,"Campaign · "+c.label,-b,e);s.campaigns.push({channel:p.channel,budget:b,gain,month:s.month,id:e.id});log(s,e,"Launched "+c.label+" · "+gain+" customers");break;}
 case "price":s.price=clip(n(p.price,s.price),.2,20);log(s,e,"Pricing changed");break;
 case "note":s.notes.push({kind:String(p.kind||"Decision").slice(0,25),text:String(p.text||"").slice(0,1500),month:s.month});log(s,e,"Recorded founder journal");break;
 case "fundingRequest":s.requests.push({id:e.id,amount:clip(n(p.amount),20,3000),equity:clip(n(p.equity),1,70),reason:String(p.reason||"").slice(0,900),status:"pending",month:s.month});log(s,e,"Submitted funding request");break;
 case "offer":s.offers.push({id:e.id,amount:clip(n(p.amount),20,3000),equity:clip(n(p.equity),1,65),expiry:s.month+2,status:"open",condition:String(p.condition||"").slice(0,400)});log(s,e,"Received investor term sheet");break;
 case "accept":{const o=s.offers.find(o=>o.id===p.offer&&o.status==="open");if(!o||s.bankrupt)break;o.status="accepted";const dilution=round(s.founderEquity*(o.equity/100));s.founderEquity=round(s.founderEquity-dilution);s.investorEquity=round(100-s.founderEquity);money(s,"Investment received",o.amount,e);s.confidence=clip(s.confidence+10,0,100);log(s,e,"Accepted investment · "+o.equity+"% post-money");break;}
 case "reject":{const o=s.offers.find(o=>o.id===p.offer&&o.status==="open");if(o){o.status="rejected";log(s,e,"Declined investment");}break;}
 case "pressure":s.notes.push({kind:"INVESTOR KPI",text:String(p.text||"").slice(0,900),month:s.month,deadline:s.month+clip(n(p.deadline,2),1,6),answered:false,id:e.id});s.confidence=clip(s.confidence-3,0,100);log(s,e,"Investor board directive");break;
 case "answer":{const q=s.notes.find(x=>x.id===p.pressure&&x.kind==="INVESTOR KPI");if(!q)break;q.answered=true;s.answers.push({id:e.id,to:p.pressure,text:String(p.text||"").slice(0,1200),month:s.month});s.confidence=clip(s.confidence+5,0,100);log(s,e,"Responded to investor");break;}
 case "shock":{s.market=clip(n(p.multiplier,1),.35,1.6);s.shocks.push({until:s.month+clip(n(p.duration,2),1,6),label:String(p.label||"Market shock").slice(0,140)});log(s,e,"Market shock · "+p.label);break;}
 case "advance":{for(const x of s.notes){if(x.kind==="INVESTOR KPI"&&!x.answered&&x.deadline<=s.month)s.confidence=clip(s.confidence-7,0,100)}monthly(s,e,room);break;}
 case "move":s.avatar={x:clip(n(p.x,170),40,880),y:clip(n(p.y,245),75,470)};break;
 }return s;
}
export function replay(room,group,events){
 const s=initial(group);
 for(const e of events.sort((a,b)=>a.ts-b.ts||a.id.localeCompare(b.id)))evolve(s,e,room);
 s.payroll=round(s.employees.reduce((t,w)=>t+w.salary,0));s.burn=round(Math.max(0,s.expense-s.revenue));s.runway=s.burn>0?round(Math.max(0,s.cash)/s.burn):null;
 s.score=clip(Math.round(s.quality*.25+s.confidence*.22+s.morale*.15+Math.min(100,s.customers)*.15+Math.max(0,s.cash)/Math.max(1,s.capital)*20+Math.min(20,s.notes.length)*.8),0,100);
 return s;
}
