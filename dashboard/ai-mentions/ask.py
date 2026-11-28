import json,sys,re,urllib.request
K=json.load(open('/Users/mbrew/Developer/project-nexus/secrets/api-keys.json'))
def key(v): return v if isinstance(v,str) else (v.get('api_key') or v.get('key') or list(v.values())[0])
OA=key(K['openai']); AN=key(K['anthropic'])
def post(url,h,body):
    r=urllib.request.Request(url,json.dumps(body).encode(),h); return json.load(urllib.request.urlopen(r,timeout=180))
def openai(q):
    d=post('https://api.openai.com/v1/responses',{'Authorization':'Bearer '+OA,'Content-Type':'application/json'},{'model':sys.argv[2],'tools':[{'type':'web_search'}],'input':q})
    txt=[];urls=[]
    for o in d.get('output',[]):
        for c in o.get('content',[]) or []:
            if c.get('type')=='output_text':
                txt.append(c['text']); urls+= [a.get('url') for a in c.get('annotations',[]) if a.get('url')]
    return '\n'.join(txt),urls
def claude(q):
    d=post('https://api.anthropic.com/v1/messages',{'x-api-key':AN,'anthropic-version':'2023-06-01','content-type':'application/json'},{'model':sys.argv[2],'max_tokens':1500,'tools':[{'type':'web_search_20250305','name':'web_search','max_uses':4}],'messages':[{'role':'user','content':q}]})
    txt=[];urls=[]
    for c in d.get('content',[]):
        if c.get('type')=='text':
            txt.append(c['text']); urls+=[x.get('url') for x in (c.get('citations') or []) if x.get('url')]
    return ''.join(txt),urls
f={'openai':openai,'claude':claude}[sys.argv[1]]
Q=json.load(open(sys.argv[3])); out=[]
for site,q in Q:
    try: t,u=f(q)
    except Exception as e: t,u='ERROR '+str(e)[:300],[]
    out.append({'site':site,'q':q,'text':t,'urls':u}); print('.',end='',flush=True)
json.dump(out,open(sys.argv[4],'w'),indent=1)
