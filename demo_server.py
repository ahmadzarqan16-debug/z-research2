"""Stateless, public-safe demo. It deliberately DOES NOT expose the full local backend."""
from __future__ import annotations
import csv
import math
import statistics
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

BASE=Path(__file__).resolve().parent
SAMPLE=BASE/'sample'/'consumer_survey_demo.csv'
with SAMPLE.open(encoding='utf-8-sig',newline='') as f:
    reader=csv.DictReader(f)
    RAW=[r for r in reader]
    COLS=reader.fieldnames or []
if len(RAW)<4 or not COLS or any(c is None for c in COLS):
    raise RuntimeError('Bundled demo dataset missing or invalid')
DATA=[{k:float(v) for k,v in r.items()} for r in RAW]
app=FastAPI(title='Z-Research v0.9.4 Public Demo',version='0.9.4-demo',docs_url=None,redoc_url=None,openapi_url=None)
app.mount('/static',StaticFiles(directory=str(BASE/'static')),name='static')

@app.middleware('http')
async def demo_headers(request:Request,call_next):
    # No persistence, authentication, uploads, or third-party AI credentials in demo.
    if request.method not in ('GET','HEAD','OPTIONS'):
        return JSONResponse({'detail':'Read-only demo: uploads and write actions are disabled.'},status_code=405)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Permissions-Policy']='camera=(), microphone=(), geolocation=()'
    response.headers['Content-Security-Policy']=("default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; connect-src 'self'; upgrade-insecure-requests")
    response.headers['Cache-Control']='no-store' if request.url.path.startswith('/api/') else 'public, max-age=300'
    return response

@app.get('/')
def home(): return FileResponse(BASE/'static'/'index.html')

@app.get('/health')
def health(): return {'status':'ok','version':'0.9.4-demo','mode':'public_sample_read_only','saved_data':False,'ai_login':False}

@app.get('/api/demo/dataset')
def dataset():
    return {'name':'consumer_survey_demo.csv','synthetic_sample':True,'rows':len(DATA),'columns':COLS,
            'preview':DATA[:6],'notice':'Data simulasi bawaan. Tidak menerima atau menyimpan unggahan.'}

def selected_columns(cols:str,min_cols=1,max_cols=8):
    items=[c.strip() for c in cols.split(',') if c.strip()]
    if len(items)<min_cols or len(items)>max_cols or len(set(items))!=len(items) or any(c not in COLS for c in items):
        raise HTTPException(422,'Pilih variabel dari dataset contoh (tanpa duplikat).')
    return items

@app.get('/api/demo/descriptive')
def descriptive(columns:str=Query('social_media_1,trust_1,purchase_intention',max_length=200)):
    cols=selected_columns(columns)
    return {'n':len(DATA),'results':[
      {'variable':c,'mean':round(statistics.mean(r[c] for r in DATA),4),
       'std_dev':round(statistics.stdev(r[c] for r in DATA),4),
       'min':min(r[c] for r in DATA),'max':max(r[c] for r in DATA)} for c in cols],
      'notice':'Perhitungan deskriptif data simulasi; bukan interpretasi kausal.'}

@app.get('/api/demo/correlation')
def correlation(x:str=Query('social_media_1',max_length=60),y:str=Query('trust_1',max_length=60)):
    if x not in COLS or y not in COLS or x==y:raise HTTPException(422,'Pilih dua variabel berbeda dari sampel.')
    xa=[r[x] for r in DATA];ya=[r[y] for r in DATA]
    xm=statistics.mean(xa);ym=statistics.mean(ya)
    d=math.sqrt(sum((v-xm)**2 for v in xa)*sum((v-ym)**2 for v in ya))
    if not d:raise HTTPException(422,'Varians nol; korelasi tidak terdefinisi.')
    r=sum((a-xm)*(b-ym) for a,b in zip(xa,ya))/d
    return {'x':x,'y':y,'n':len(DATA),'pearson_r':round(r,5),
            'notice':'Korelasi bukan bukti hubungan sebab-akibat. Data simulasi.'}

@app.get('/api/demo/reliability')
def reliability(columns:str=Query('social_media_1,social_media_2,social_media_3',max_length=200)):
    cols=selected_columns(columns,min_cols=2,max_cols=8)
    k=len(cols)
    values=[[r[c] for c in cols] for r in DATA]
    variances=sum(statistics.variance(row[i] for row in values) for i in range(k))
    totalvariance=statistics.variance(sum(row) for row in values)
    if totalvariance<=0:raise HTTPException(422,'Total variance must be positive')
    alpha=k/(k-1)*(1-variances/totalvariance)
    return {'columns':cols,'n':len(DATA),'cronbach_alpha':round(alpha,5),
            'notice':'Alpha perlu diuji bersama validitas konstruk; data simulasi.'}

@app.get('/robots.txt')
def robots():return Response('User-agent: *\nDisallow: /\n',media_type='text/plain')
