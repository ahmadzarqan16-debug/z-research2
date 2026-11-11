import test from 'node:test';import assert from 'node:assert/strict';import handler from '../api/game.js';
function call(op,p={},token='',method='POST'){const req={method,headers:token?{authorization:'Bearer '+token}:{},body:{op,...p},query:{op,...p}};const res={statusCode:200,setHeader(){},status(c){this.statusCode=c;return this},json(o){this.body=o;return this}};return Promise.resolve(handler(req,res)).then(()=>({code:res.statusCode,body:res.body}));}
test('19 teams are isolated; only lecturer can inspect all companies',async()=>{
 const create=await call('createClass',{setupKey:'local-development-key',pin:'test-investor-pin',className:'Game Security Test'});
 assert.equal(create.code,200);const room=create.body.room,lecturer=create.body.token;const groups=[];
 for(let i=1;i<=19;i++){const group=String(i).padStart(2,'0');const joined=await call('join',{room,role:'founder',group,pin:'different-'+group});assert.equal(joined.code,200);groups.push(joined.body.token)}
 const blocked=await call('join',{room,role:'founder',group:'20',pin:'another-pin'});assert.equal(blocked.code,400);
 const badPin=await call('join',{room,role:'founder',group:'01',pin:'wrong-pass'});assert.equal(badPin.code,403);
 const unauthorized=await call('state',{group:'02'},groups[0],'GET');assert.equal(unauthorized.code,200);assert.equal(unauthorized.body.group,'01');assert.equal(unauthorized.body.state.group,'01');assert.equal(unauthorized.body.teams,undefined);
 const unauthorizedAct=await call('action',{type:'offer',data:{group:'02',amount:100,equity:10}},groups[0]);assert.equal(unauthorizedAct.code,403);
 const founded=await call('action',{type:'createStartup',data:{name:'Private EdTech',industry:'EdTech',capital:200}},groups[0]);assert.equal(founded.code,200);
 const other=await call('state',{},groups[1],'GET');assert.equal(other.code,200);assert.equal(other.body.state.company,null);
 const all=await call('state',{},lecturer,'GET');assert.equal(all.code,200);assert.equal(all.body.teams.length,19);assert.equal(all.body.teams.find(t=>t.group==='01').company,'Private EdTech');
 const inspect=await call('state',{group:'01'},lecturer,'GET');assert.equal(inspect.code,200);assert.equal(inspect.body.state.company,'Private EdTech');
 const moved=await call('action',{type:'move',data:{x:480,y:225}},groups[0]);assert.equal(moved.code,200);
 const again=await call('state',{},groups[0],'GET');assert.deepEqual(again.body.state.avatar,{x:480,y:225});
});
