const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {NextRequest}=require('next/server');
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-secret';
const tables={settings:[],tickets:[],events:[]};
let mail;
const db={from(table){
 let op='select',values,filters=[],one=false,limit=500;
 const q={select(){return q;},insert(v){op='insert';values=v;return q;},update(v){op='update';values=v;return q;},delete(){op='delete';return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},gte(k,v){filters.push(r=>r[k]>=v);return q;},lt(k,v){filters.push(r=>r[k]<v);return q;},ilike(k,v){filters.push(r=>r[k].toLowerCase()===v.replace(/\\(.)/g,'$1').toLowerCase());return q;},order(){return q;},limit(n){limit=n;return q;},maybeSingle(){one=true;return q;},then(resolve,reject){try{
 let rows=tables[table].filter(r=>filters.every(f=>f(r))).slice(0,limit);
 if(op==='insert'){if(tables[table].some(r=>r.key===values.key))return Promise.resolve({error:{code:'23505'}}).then(resolve,reject);tables[table].push({...values});rows=[values];}
 if(op==='update')rows.forEach(r=>Object.assign(r,values));
 if(op==='delete')tables[table]=tables[table].filter(r=>!rows.includes(r));
 return Promise.resolve({data:one?(rows[0]?{...rows[0]}:null):rows.map(r=>({...r})),error:null}).then(resolve,reject);
 }catch(e){return Promise.reject(e).then(resolve,reject);}}};return q;
}};
function load(file){const exports={};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{exports,require(name){if(name==='@/lib/supabase')return {supabase:db};if(name==='@/lib/customer-access')return auth;if(name==='resend')return {Resend:class{emails={send:async data=>{mail=data;return {data:{id:'test'}}}}}};if(name==='@/lib/ticket-pdf')return {generateTicketPdf:async()=>Buffer.from('%PDF-test')};return require(name);},process,Buffer,URL,Request,Response,console});return exports;}
const auth=load('lib/customer-access.ts');
const access=load('app/api/customer/access/route.ts');
const tickets=load('app/api/customer/tickets/route.ts');
function request(body,cookie='',origin='https://www.wolnaa.de'){return new NextRequest('https://www.wolnaa.de/api/customer/access',{method:'POST',headers:{origin,cookie,'content-type':'application/json','x-vercel-forwarded-for':'127.0.0.1'},body:JSON.stringify(body)});}
(async()=>{
 assert.equal((await access.POST(request({action:'send',email:'buyer@example.com'},'','https://evil.example'))).status,403);
 const sent=await access.POST(request({action:'send',email:'buyer@example.com'}));assert.equal(sent.status,200);
 const challenge=sent.cookies.get(auth.CHALLENGE_COOKIE).value;
 const cookie=`${auth.CHALLENGE_COOKIE}=${challenge}`;
 const code=mail.text.match(/\b\d{6}\b/)[0];
 assert.equal((await access.POST(request({action:'send',email:'buyer@example.com'}))).status,429);
 assert.equal((await access.POST(request({action:'verify',code:'000000'},cookie))).status,401);
 const verified=await access.POST(request({action:'verify',code},cookie));assert.equal(verified.status,200);
 const session=verified.cookies.get(auth.CUSTOMER_COOKIE).value;
 assert.equal(auth.customerSessionEmail(session),'buyer@example.com');
 assert.equal((await access.POST(request({action:'verify',code},cookie))).status,401);
 tables.tickets=[{ticket_id:'WOLNAA-OWN',customer_email:'BUYER@example.com',status:'paid'},{ticket_id:'WOLNAA-OTHER',customer_email:'other@example.com',status:'paid'},{ticket_id:'WOLNAA-CANCELLED',customer_email:'buyer@example.com',status:'cancelled'}];
 const get=(search='',token=session)=>tickets.GET(new NextRequest('https://www.wolnaa.de/api/customer/tickets'+search,{headers:{cookie:`${auth.CUSTOMER_COOKIE}=${token}`}}));
 assert.equal((await get('', 'invalid')).status,401);
 const list=await (await get()).json();assert.deepEqual(list.tickets.map(t=>t.ticket_id),['WOLNAA-OWN','WOLNAA-CANCELLED']);
 assert.equal((await get('?download=WOLNAA-OTHER')).status,404);
 assert.equal((await get('?download=WOLNAA-CANCELLED')).status,404);
 const pdf=await get('?download=WOLNAA-OWN');assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');
 console.log('Customer route integration passed: send, rate limit, wrong code, verification, replay, ownership and download status');
})().catch(e=>{console.error(e);process.exitCode=1;});
