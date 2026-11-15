// Newsletter interest list, encrypted in a separate private GitHub data repository.
// Does not send email. Disabled unless NEWSLETTER_ENABLED=true and all secrets are present.
const crypto = require('node:crypto');
const MAX_BODY = 2048;
const reply = (res,status,payload) => {res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(payload));};
function settings(){const repo=process.env.GITHUB_PPDB_REPO||'';const token=process.env.GITHUB_PPDB_TOKEN||'';const key=Buffer.from(process.env.PPDB_ENCRYPTION_KEY||'','base64');return {repo,token,key,ready:process.env.NEWSLETTER_ENABLED==='true'&&/^[\w.-]+\/[\w.-]+$/.test(repo)&&token.length>15&&key.length===32};}
function requestBody(req){return new Promise((resolve,reject)=>{let buf='';req.on('data',part=>{buf+=part;if(buf.length>MAX_BODY){reject(new Error('too-large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(buf||'{}'));}catch{reject(new Error('invalid-json'));}});req.on('error',reject);});}
function encrypt(record,key){const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(JSON.stringify(record),'utf8'),cipher.final()]);return JSON.stringify({v:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')});}
async function gh(cfg,path,opts={}){const r=await fetch(`https://api.github.com/repos/${cfg.repo}${path}`,{method:opts.method||'GET',headers:{'Authorization':`Bearer ${cfg.token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'HidayatullahMedan-NewsletterPilot'},body:opts.data?JSON.stringify(opts.data):undefined,signal:AbortSignal.timeout(12000)});const result=await r.json().catch(()=>({}));if(!r.ok){const err=new Error('GitHub API failure');err.status=r.status;throw err;}return result;}
module.exports=async function handler(req,res){
  const cfg=settings();const op=new URL(req.url,'https://placeholder.invalid').searchParams.get('action')||'health';
  if(req.method==='GET'&&op==='health')return reply(res,200,{ok:true,configured:cfg.ready,emailsSent:false,storage:'encrypted-private-github'});
  if(req.method!=='POST'||op!=='subscribe')return reply(res,404,{ok:false,message:'Halaman tidak ditemukan.'});
  if(!cfg.ready)return reply(res,503,{ok:false,message:'Pendaftaran minat newsletter belum diaktifkan oleh pengelola.'});
  try{
    const origin=req.headers.origin;const host=req.headers.host;
    if(!origin||new URL(origin).protocol!=='https:'||new URL(origin).host!==host)return reply(res,403,{ok:false,message:'Permintaan tidak diperbolehkan.'});
    const data=await requestBody(req);const email=String(data.email||'').trim().toLowerCase();
    if(data.consent!==true||data.website||email.length<6||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return reply(res,422,{ok:false,message:'Alamat email atau persetujuan tidak valid.'});
    const meta=await gh(cfg,'');
    if(meta.private!==true)return reply(res,503,{ok:false,message:'Penyimpanan harus menggunakan repository privat.'});
    // HMAC prevents the record path from exposing a raw or guessable email digest.
    const id=crypto.createHmac('sha256',cfg.key).update(email).digest('hex');
    const path=`/contents/newsletter/${id}.json`;
    let exists=false;
    try{await gh(cfg,path);exists=true;}catch(e){if(e.status!==404)throw e;}
    if(!exists){const record={email,createdAt:new Date().toISOString(),consentVersion:'v1-nov-2026',consent:true,source:'website-blog',status:'pending-email-service'};
      try{await gh(cfg,path,{method:'PUT',data:{message:`Newsletter: encrypted opt-in ${id.slice(0,12)}`,content:Buffer.from(encrypt(record,cfg.key)).toString('base64')}});}catch(e){if(e.status!==422)throw e;}
    }
    return reply(res,200,{ok:true,message:'Permintaan newsletter telah diterima. Belum ada pengiriman email otomatis.'});
  }catch(e){console.error('Newsletter service error category:',e.status||e.message);return reply(res,502,{ok:false,message:'Belum dapat memproses permintaan newsletter.'});}
};
