import {randomBytes,createHmac,scryptSync,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {get,put,list} from '@vercel/blob';
import {replay,ROLES,TASKS,CHANNELS,INDUSTRIES} from '../lib/sim.js';
const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const rid=()=>randomBytes(10).toString("hex");
const code=()=>Array.from(randomBytes(8),x=>alphabet[x%alphabet.length]).join("");
const num=(x,a,b)=>Number.isFinite(+x)&&+x>=a&&+x<=b;
const plain=(x,n=200)=>typeof x==="string"&&x.trim().length>0&&x.length<=n;
const validRoom=r=>/^[A-Z2-9]{8}$/.test(r||"");
const validGroup=g=>/^(0[1-9]|1[0-9])$/.test(g||"");
const local=!(process.env.VERCEL||process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN);
const dir=path.join(process.cwd(),".local-state");
function keyHash(pin,salt){return scryptSync(String(pin),salt,32).toString("hex")}
function checkHash(pin,stored){if(!stored)return false;const [salt,h]=stored.split(":");try{return timingSafeEqual(Buffer.from(keyHash(pin,salt),"hex"),Buffer.from(h,"hex"))}catch{return false}}
function makeHash(pin){const salt=randomBytes(12).toString("hex");return salt+":"+keyHash(pin,salt)}
async function readKey(k){if(local){try{return JSON.parse(await fs.readFile(path.join(dir,k),"utf8"))}catch{return null}}
 const response=await get(k,{access:"private",useCache:false});if(!response||response.statusCode!==200)return null;return JSON.parse(await new Response(response.stream).text());}
async function writeKey(k,obj){if(local){const f=path.join(dir,k);await fs.mkdir(path.dirname(f),{recursive:true});await fs.writeFile(f,JSON.stringify(obj),"utf8");return}
 await put(k,JSON.stringify(obj),{access:"private",addRandomSuffix:false,contentType:"application/json",allowOverwrite:false});}
async function findKeys(prefix){if(local){const all=[];async function walk(p){let children=[];try{children=await fs.readdir(p,{withFileTypes:true})}catch{return}for(const entry of children){const target=path.join(p,entry.name);if(entry.isDirectory())await walk(target);else all.push(path.relative(dir,target))}}await walk(path.join(dir,prefix));return all.sort()}
 let cursor;const paths=[];do{const out=await list({prefix,limit:1000,cursor});paths.push(...out.blobs.map(b=>b.pathname));cursor=out.hasMore?out.cursor:null;}while(cursor&&paths.length<4500);return paths;}
const secret=()=>process.env.SESSION_SECRET||(local?"founders-lab-local-dev-rotate-in-production":"");
function sign(data){const b=Buffer.from(JSON.stringify({...data,exp:Date.now()+1000*60*60*16})).toString("base64url");const mac=createHmac("sha256",secret()).update(b).digest("base64url");return b+"."+mac}
function token(req){try{const raw=(req.headers.authorization||"").replace(/^Bearer /i,"");const [b,s]=raw.split(".");if(!b||!s||!secret())return null;const expected=createHmac("sha256",secret()).update(b).digest("base64url");if(!timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return null;const d=JSON.parse(Buffer.from(b,"base64url").toString());return d.exp>Date.now()&&validRoom(d.room)&&(d.role==="lecturer"||d.role==="founder"&&validGroup(d.group))?d:null}catch{return null}}
async function eventsFor(room,group){const base="fl4/"+room+"/";const [own,board]=await Promise.all([findKeys(base+"events/"+group+"/"),findKeys(base+"board/")]);const files=[...own,...board];const all=await Promise.all(files.map(readKey));return all.filter(Boolean).filter(e=>e.target==="all"||e.target===group||!e.target&&e.group===group);}
async function stateFor(room,group){return replay(room,group,await eventsFor(room,group))}
function failure(res,code,message){res.status(code).json({error:message})}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store, no-cache, must-revalidate");res.setHeader("X-Content-Type-Options","nosniff");
 try{
 const op=req.method==="GET"?String(req.query.op||"state"):String(req.body?.op||"");
 const p=req.body||{};
 if(!secret())return failure(res,503,"SESSION_SECRET belum dikonfigurasi");
 if(op==="createClass"&&req.method==="POST"){
  if(!process.env.SETUP_KEY&&!local)return failure(res,503,"SETUP_KEY belum dikonfigurasi");
  if(!plain(p.pin,64)||p.pin.length<6||!plain(p.className,90))return failure(res,400,"Nama kelas dan PIN dosen minimal 6 karakter diperlukan");
  if((process.env.SETUP_KEY||"local-development-key")!==p.setupKey)return failure(res,403,"Kode setup dosen salah");
  let room=code();while(await readKey("fl4/"+room+"/meta.json"))room=code();
  await writeKey("fl4/"+room+"/meta.json",{room,className:p.className.trim(),pin:makeHash(p.pin),createdAt:Date.now(),slots:19});
  return res.json({room,token:sign({room,role:"lecturer"})});
 }
 if(op==="join"&&req.method==="POST"){
  const room=String(p.room||"").trim().toUpperCase();if(!validRoom(room))return failure(res,400,"Kode kelas tidak valid");
  const meta=await readKey("fl4/"+room+"/meta.json");if(!meta)return failure(res,404,"Kelas tidak ditemukan");
  if(p.role==="lecturer"){
   if(!checkHash(p.pin,meta.pin))return failure(res,403,"PIN dosen salah");
   return res.json({room,role:"lecturer",className:meta.className,token:sign({room,role:"lecturer"})});
  }
  const group=String(p.group||"").padStart(2,"0");
  if(!validGroup(group)||!plain(p.pin,64)||p.pin.length<6)return failure(res,400,"Group 1–19 dan PIN minimal 6 karakter diperlukan");
  const claimPath="fl4/"+room+"/claims/"+group+".json";
  let claim=await readKey(claimPath);
  if(!claim){try{await writeKey(claimPath,{group,pin:makeHash(p.pin),createdAt:Date.now()});}catch{return failure(res,409,"Slot kelompok baru saja diklaim; masuk dengan PIN kelompok tersebut")}claim=await readKey(claimPath)}
  if(!claim||!checkHash(p.pin,claim.pin))return failure(res,403,"PIN kelompok salah");
  return res.json({room,group,role:"founder",className:meta.className,token:sign({room,group,role:"founder"})});
 }
 const user=token(req);if(!user)return failure(res,401,"Login diperlukan atau sesi berakhir");
 const base="fl4/"+user.room+"/";
 if(op==="state"&&req.method==="GET"){
  const group=user.role==="founder"?user.group:String(req.query.group||"");
  if(group){
   if(!validGroup(group)||user.role==="founder"&&group!==user.group)return failure(res,403,"Tidak berhak melihat kelompok lain");
   return res.json({role:user.role,group,state:await stateFor(user.room,group),catalog:{roles:ROLES,tasks:TASKS,channels:CHANNELS,industries:INDUSTRIES}});
  }
  if(user.role!=="lecturer")return failure(res,403,"Akses dosen diperlukan");
  const claims=await findKeys(base+"claims/");
  const groups=claims.map(x=>x.match(/(\d\d)\.json$/)?.[1]).filter(validGroup);
  const states=await Promise.all(groups.map(async g=>{const s=await stateFor(user.room,g);return {group:g,company:s.company,industry:s.industry,cash:s.cash,month:s.month,customers:s.customers,score:s.score,profit:s.profit,payroll:s.payroll,confidence:s.confidence,bankrupt:s.bankrupt,employees:s.employees.length,pending:s.requests.filter(x=>x.status==="pending").length}}));
  const board=await findKeys(base+"board/");const all=await Promise.all(board.map(readKey));
  return res.json({role:"lecturer",room:user.room,className:(await readKey(base+"meta.json"))?.className,teams:states.sort((a,b)=>a.group.localeCompare(b.group)),board:all.filter(Boolean).slice(-30),catalog:{roles:ROLES,tasks:TASKS,channels:CHANNELS,industries:INDUSTRIES}});
 }
 if(op==="action"&&req.method==="POST"){
  const type=String(p.type||"");const d=p.data||{};
  const founderActions=["createStartup","hire","fire","task","week","campaign","price","note","fundingRequest","accept","reject","answer","move"];
  const lecturerActions=["offer","pressure","shock","advance"];
  if(user.role==="founder"&&!founderActions.includes(type)||user.role==="lecturer"&&!lecturerActions.includes(type))return failure(res,403,"Aksi tidak diizinkan bagi peran ini");
  let group=user.group;let target=null;
  if(user.role==="lecturer"){target=type==="advance"?"all":type==="shock"&&d.group==="all"?"all":String(d.group||"");if(target!=="all"&&!validGroup(target))return failure(res,400,"Pilih kelompok 01–19 atau all untuk market shock");group=target;}
  else {
   const s=await stateFor(user.room,group);
   if(type!=="createStartup"&&!s.company)return failure(res,409,"Buat startup terlebih dahulu");
   if(type==="createStartup"&&s.company)return failure(res,409,"Startup sudah dibuat");
   if(type==="createStartup"&&(!plain(d.name,45)||!INDUSTRIES[d.industry]||!num(d.capital,50,1000)))return failure(res,400,"Nama, industri dan modal Rp50–1000 juta diperlukan");
   if(type==="hire"&&(!ROLES[d.role]||s.employees.length>=24||s.cash<ROLES[d.role].salary*.3))return failure(res,400,"Kandidat tidak valid, tim penuh, atau kas tidak mencukupi");
   if(type==="fire"&&!s.employees.some(x=>x.id===d.employee))return failure(res,400,"Karyawan tidak ditemukan");
   if(type==="task"&&(!TASKS[d.task]||!s.employees.some(x=>x.id===d.employee&&!x.taskId)||s.cash<TASKS[d.task].cost))return failure(res,400,"Tugas/karyawan tidak valid atau kas tidak cukup");
   if(type==="week"&&s.week>4)return failure(res,409,"Empat pekan selesai. Dosen harus memajukan bulan");
   if(type==="campaign"&&(!CHANNELS[d.channel]||!num(d.budget,1,200)||s.cash<+d.budget))return failure(res,400,"Anggaran kampanye tidak valid atau kas tidak cukup");
   if(type==="price"&&!num(d.price,.2,20))return failure(res,400,"Harga harus Rp0,2–20 juta");
   if(type==="fundingRequest"&&(!num(d.amount,20,3000)||!num(d.equity,1,70)||!plain(d.reason,900)))return failure(res,400,"Proposal pendanaan tidak valid");
   if(type==="accept"&&!s.offers.some(o=>o.id===d.offer&&o.status==="open"))return failure(res,400,"Term sheet tidak tersedia");
   if(type==="reject"&&!s.offers.some(o=>o.id===d.offer&&o.status==="open"))return failure(res,400,"Term sheet tidak tersedia");
   if(type==="answer"&&(!plain(d.text,1200)||!s.notes.some(q=>q.id===d.pressure&&q.kind==="INVESTOR KPI")))return failure(res,400,"Jawaban investor tidak valid");
   if(type==="note"&&!plain(d.text,1500))return failure(res,400,"Catatan tidak boleh kosong");
   if(type==="move"&&(!num(d.x,40,880)||!num(d.y,75,470)))return failure(res,400,"Posisi tidak valid");
   if(s.bankrupt&&!["note","fundingRequest","move","reject","createStartup"].includes(type))return failure(res,409,"Startup bangkrut. Konsultasikan dengan dosen");
  }
  if(type==="offer"&&(!num(d.amount,20,3000)||!num(d.equity,1,65)))return failure(res,400,"Pendanaan dan equity tidak valid");
  if(type==="pressure"&&(!plain(d.text,900)||!num(d.deadline,1,6)))return failure(res,400,"Instruksi investor tidak valid");
  if(type==="shock"&&(!num(d.multiplier,.35,1.6)||!num(d.duration,1,6)))return failure(res,400,"Market shock tidak valid");
  const event={id:rid(),ts:Date.now(),type,data:d,group:user.group||null,target};
  const file=base+(user.role==="lecturer"?"board/":"events/"+user.group+"/")+String(event.ts)+"-"+event.id+".json";
  await writeKey(file,event);
  return res.json({ok:true,eventId:event.id});
 }
 return failure(res,404,"Endpoint tidak tersedia");
 }catch(e){console.error("Founders Lab request failed",e?.message);return failure(res,500,"Terjadi kegagalan server; periksa konfigurasi dan log")}
}
