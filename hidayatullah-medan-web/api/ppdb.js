// Hidayatullah PPDB pilot — GitHub private repo encrypted storage.
// Secrets are read only server-side. Never expose this route without access control.
const crypto = require('node:crypto');
const ALLOWED_LEVELS = ['tk','sd','mts','ma'];
const STATUSES = ['baru','ditinjau','perlu_perbaikan','diterima','ditolak'];
const MAX_BODY=14000;
const json=(res,code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));};
const bad=(res,code,message)=>json(res,code,{ok:false,message});
const uuid=()=>crypto.randomUUID();
const base64url=v=>Buffer.from(v).toString('base64url');
const sign=v=>crypto.createHmac('sha256',process.env.PPDB_SESSION_SECRET).update(v).digest('base64url');
function config(){
  const repo=process.env.GITHUB_PPDB_REPO||'';
  const key=Buffer.from(process.env.PPDB_ENCRYPTION_KEY||'','base64');
  let users=[];try{users=JSON.parse(process.env.PPDB_ADMIN_USERS_JSON||'[]')}catch{}
  return {repo, key, users,ready:/^[A-Za-z\d_.-]+\/[A-Za-z\d_.-]+$/.test(repo)&&Boolean(process.env.GITHUB_PPDB_TOKEN)&&key.length===32&&(process.env.PPDB_SESSION_SECRET||'').length>=32&&users.some(u=>u.username&&u.level&&u.passwordHash)};
}
function readJson(req){return new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>{data+=chunk;if(data.length>MAX_BODY){reject(Error('Formulir terlalu besar.'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'))}catch{reject(Error('JSON tidak valid.'))}});req.on('error',reject)});}
function session(req){let cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(x=>x.startsWith('ppdb_session='));if(!cookie)return null;let token=decodeURIComponent(cookie.slice(13));let i=token.lastIndexOf('.');if(i<=0)return null;let value=token.slice(0,i),signature=token.slice(i+1);let expected=sign(value);if(signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;try{let s=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));if(s.exp<Date.now()||!ALLOWED_LEVELS.includes(s.level)&&s.level!=='all')return null;return s;}catch{return null}}
function cookie(res,value,maxAge){res.setHeader('Set-Cookie',`ppdb_session=${encodeURIComponent(value)}; Path=/api/ppdb; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`)}
function matchingPassword(password,hash){try{let [method,salt,hex]=hash.split('$');if(method!=='scrypt'||!/^[0-9a-f]{32}$/i.test(salt)||!/^[0-9a-f]{128}$/i.test(hex))return false;let actual=crypto.scryptSync(password,salt,64);return crypto.timingSafeEqual(actual,Buffer.from(hex,'hex'));}catch{return false}}
function encrypt(obj,key){let iv=crypto.randomBytes(12);let c=crypto.createCipheriv('aes-256-gcm',key,iv);let payload=Buffer.concat([c.update(JSON.stringify(obj),'utf8'),c.final()]);return JSON.stringify({v:1,iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:payload.toString('base64')});}
function decrypt(content,key){let x=JSON.parse(content);if(x.v!==1)throw Error('unknown ciphertext version');let d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(x.iv,'base64'));d.setAuthTag(Buffer.from(x.tag,'base64'));return JSON.parse(Buffer.concat([d.update(Buffer.from(x.data,'base64')),d.final()]).toString('utf8'));}
async function github(path,{method='GET',body}={}){let [owner,repo]=(process.env.GITHUB_PPDB_REPO||'').split('/');let url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${path}`;let response=await fetch(url,{method,headers:{'Authorization':`Bearer ${process.env.GITHUB_PPDB_TOKEN}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'Hidayatullah-PPDB-Pilot'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(11000)});let data=await response.json().catch(()=>({}));if(!response.ok){let e=new Error(`GitHub ${response.status}`);e.status=response.status;throw e;}return data;}
async function ensurePrivate(){let metadata=await github('');if(metadata.private!==true)throw Error('Repositori PPDB harus privat.');}
async function getRecord(id,key){let obj=await github(`/contents/registrations/${id}.json`);let raw=Buffer.from(obj.content.replace(/\s/g,''),'base64').toString('utf8');return {data:decrypt(raw,key),sha:obj.sha};}
function safeString(x,max=180){return typeof x==='string'?x.trim().slice(0,max):'';}
function validateForm(x){let level=safeString(x.level,10);let student=safeString(x.student),parent=safeString(x.parent),phone=safeString(x.phone,30);if(!ALLOWED_LEVELS.includes(level)||student.length<2||parent.length<2||!/^(?:\+?\d[\d\s-]{8,17})$/.test(phone)||x.agree!==true)return null;return {level,student,previous:safeString(x.previous),parent,phone,city:safeString(x.city),message:safeString(x.message,1500)};}
function originOk(req){let origin=req.headers.origin;if(!origin)return false;try{let parsed=new URL(origin);let host=req.headers.host;return parsed.protocol==='https:'&&parsed.host===host;}catch{return false}}
module.exports=async function handler(req,res){
  const cfg=config();const op=(new URL(req.url,'https://placeholder.local')).searchParams.get('action')||'health';
  if(req.method==='GET'&&op==='health')return json(res,200,{ok:true,configured:cfg.ready,storage:'private-github-encrypted',status:cfg.ready?'ready':'setup_required'});
  if(!cfg.ready)return bad(res,503,'PPDB belum diaktifkan oleh administrator.');
  if(req.method!=='GET'&&!originOk(req))return bad(res,403,'Permintaan dari asal yang tidak diizinkan.');
  try{
    if(op==='login'&&req.method==='POST'){
      let x=await readJson(req);let u=cfg.users.find(a=>a.username===safeString(x.username,80)&& (ALLOWED_LEVELS.includes(a.level)||a.level==='all'));
      if(!u||!matchingPassword(String(x.password||''),u.passwordHash))return bad(res,401,'Username atau kata sandi salah.');
      let s={username:u.username,level:u.level,exp:Date.now()+8*3600000};let payload=base64url(JSON.stringify(s));cookie(res,`${payload}.${sign(payload)}`,8*3600);return json(res,200,{ok:true,username:s.username,level:s.level});
    }
    if(op==='logout'&&req.method==='POST'){cookie(res,'',0);return json(res,200,{ok:true});}
    if(op==='session'&&req.method==='GET'){let s=session(req);return json(res,200,{ok:true,loggedIn:!!s,user:s?{username:s.username,level:s.level}:null});}
    if(op==='register'&&req.method==='POST'){
      let form=validateForm(await readJson(req));if(!form)return bad(res,422,'Data belum lengkap atau persetujuan belum diberikan.');await ensurePrivate();let id=uuid();let now=new Date().toISOString();let record={id,number:`HM-${now.slice(0,4)}-${id.slice(0,8).toUpperCase()}`,createdAt:now,updatedAt:now,status:'baru',...form};let content=Buffer.from(encrypt(record,cfg.key)).toString('base64');await github(`/contents/registrations/${id}.json`,{method:'PUT',body:{message:`PPDB: new encrypted registration ${id}`,content}});return json(res,201,{ok:true,registrationNumber:record.number,notice:'Pendaftaran sudah diterima sistem, bukan keputusan penerimaan sekolah.'});
    }
    let user=session(req);if(!user)return bad(res,401,'Silakan masuk sebagai admin sekolah.');
    if(op==='list'&&req.method==='GET'){
      await ensurePrivate();let rows;try{rows=await github('/contents/registrations?per_page=1000')}catch(e){if(e.status===404)rows=[];else throw e};if(!Array.isArray(rows))throw Error('directory listing unexpected');if(rows.length>=1000)return bad(res,507,'Batas penyimpanan GitHub tercapai; perlu migrasi ke database transaksional.');let records=[];for(let i=0;i<rows.length;i+=12){let batch=await Promise.allSettled(rows.slice(i,i+12).filter(x=>/^[0-9a-f-]{36}\.json$/.test(x.name)).map(x=>getRecord(x.name.slice(0,-5),cfg.key)));for(let b of batch)if(b.status==='fulfilled'&&(user.level==='all'||user.level===b.value.data.level))records.push(b.value.data);}records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return json(res,200,{ok:true,records});
    }
    if(op==='status'&&req.method==='PATCH'){
      let x=await readJson(req);if(!/^[0-9a-f-]{36}$/.test(String(x.id))||!STATUSES.includes(x.status))return bad(res,422,'Permintaan tidak valid.');await ensurePrivate();let {data,sha}=await getRecord(x.id,cfg.key);if(user.level!=='all'&&user.level!==data.level)return bad(res,403,'Admin tidak memiliki akses ke jenjang ini.');data.status=x.status;data.updatedAt=new Date().toISOString();data.lastUpdatedBy=user.username;let content=Buffer.from(encrypt(data,cfg.key)).toString('base64');await github(`/contents/registrations/${x.id}.json`,{method:'PUT',body:{message:`PPDB: update encrypted registration ${x.id}`,content,sha}});return json(res,200,{ok:true,record:data});
    }
    return bad(res,404,'Endpoint tidak ditemukan.');
  }catch(e){console.error('PPDB backend error category:',e.status||e.message);return bad(res,e.status===404?404:502,'Layanan pendaftaran belum dapat memproses permintaan. Silakan coba kembali.');}
};
