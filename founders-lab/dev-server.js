import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import handler from './api/game.js';
const port=Number(process.env.PORT||3000);
const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname==='/api/game'){
  try{req.query=Object.fromEntries(u.searchParams);let body='';for await(const chunk of req)body+=chunk;req.body=body?JSON.parse(body):{};res.status=n=>{res.statusCode=n;return res};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};await handler(req,res)}catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}))}return;
 }
 const p=path.join(process.cwd(),'public',u.pathname==='/'?'index.html':u.pathname.replace(/^\//,''));
 if(!p.startsWith(path.join(process.cwd(),'public'))) {res.statusCode=403;return res.end('Forbidden')}
 try{const data=await fs.readFile(p);res.setHeader('Content-Type',type[path.extname(p)]||'application/octet-stream');res.end(data)}catch{res.statusCode=404;res.end('Not found')}
}).listen(port,()=>console.log('Founders Lab available at http://localhost:'+port));
