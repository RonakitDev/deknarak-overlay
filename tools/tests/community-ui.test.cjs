const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const puppeteer=require(process.env.PUPPETEER_MODULES || 'puppeteer');
const root=path.resolve(__dirname,'../..');let server,browser,base;
const fixture=`
const store=new Map([
 ['styleFeedback/gojo/entries/public-review',{rating:5,name:'<img src=x onerror=window.__xss=1>',text:'<script>window.__xss=1</script>',status:'published'}],
 ['themeRequests/author',{title:'Moon garden',description:'A peaceful moonlit garden',name:'Visitor',status:'published'}],
 ['themeRequestTotals/author',{count:4,updatedAt:0}]
]);window.__testStore=store;
const listeners=[];
function snap(ref){
 const key=typeof ref==='string'?ref:ref.ref;
 if(key.split('/').length%2===0)return {metadata:{fromCache:false},exists:()=>store.has(key),data:()=>store.get(key)};
 let docs=[...store].filter(([k])=>k.startsWith(key+'/')&&k.split('/').length===key.split('/').length+1).map(([k,v])=>({id:k.split('/').pop(),data:()=>v}));
 if(ref.filters)for(const filter of ref.filters)if(filter.kind==='where')docs=docs.filter(d=>d.data()[filter.field]===filter.value);else if(filter.kind==='limit')docs=docs.slice(0,filter.value);
 return {metadata:{fromCache:false},docs};
}
const f={collection:(_, ...p)=>p.join('/'),doc:(_, ...p)=>p.join('/'),query:(ref,...filters)=>({ref,filters}),where:(field,op,value)=>({kind:'where',field,value}),limit:value=>({kind:'limit',value}),serverTimestamp:()=>({toMillis:()=>Date.now()}),onSnapshot(ref,options,callback){const entry={ref,callback};listeners.push(entry);queueMicrotask(()=>callback(snap(ref)));return()=>{};},async runTransaction(_,callback){const writes=[];const value=await callback({get:async ref=>({exists:()=>store.has(ref),data:()=>store.get(ref)}),set:(ref,data)=>writes.push([ref,data])});for(const [key,value]of writes)store.set(key,value);for(const listener of listeners)listener.callback(snap(listener.ref));return value;}};
export async function getClient(){return {db:{},user:{uid:'test-visitor'},firestore:f};}
`;
before(async()=>{
 server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/assets/js/firebase-client.js'){res.setHeader('Content-Type','text/javascript');res.end(fixture);return;}let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu']});
});
after(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function page(){const p=await browser.newPage();await p.setViewport({width:1600,height:1100});await p.evaluateOnNewDocument(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.__failClipboard)throw Error('blocked');window.__copied=text;}}});});return p;}
test('preview counts views, only tracks successful copies, submits pending feedback, and renders HTML safely',async()=>{
 const p=await page();try{
 await p.goto(base+'/preview.html?style=gojo');await p.waitForFunction(()=>window.__testStore?.has('engagementVisitors/test-visitor/styles/gojo'));
 assert.equal(await p.$eval('[data-preview-metrics] [data-views]',e=>e.textContent),'1');
 await p.evaluate(()=>window.__failClipboard=true);await p.click('#copy-button');assert.equal(await p.evaluate(()=>window.__testStore.get('engagementVisitors/test-visitor/styles/gojo').copied),false);
 await p.evaluate(()=>window.__failClipboard=false);await p.click('#copy-button');await p.waitForFunction(()=>window.__testStore.get('engagementVisitors/test-visitor/styles/gojo').copied);
 await p.waitForFunction(()=>document.querySelector('#feedback-list').textContent.includes('<script>'));
 assert.equal(await p.evaluate(()=>window.__xss),undefined);assert.equal(await p.$$eval('#feedback-list img,#feedback-list script',els=>els.length),0);
 await p.select('#feedback-rating','4');await p.type('#feedback-name','Tester');await p.type('#feedback-text','Please make the title a little bigger.');await p.click('#feedback-form button');await p.waitForFunction(()=>window.__testStore.has('styleFeedback/gojo/entries/test-visitor'));
 assert.equal(await p.evaluate(()=>window.__testStore.get('styleFeedback/gojo/entries/test-visitor').status),'pending');assert.equal(await p.$$eval('#feedback-list .community-entry',els=>els.length),1);
 await p.setViewport({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await p.setViewport({width:1600,height:1100});
 if(process.env.COMMUNITY_SCREENSHOT_DIR)await p.screenshot({path:path.join(process.env.COMMUNITY_SCREENSHOT_DIR,'community-preview.png'),fullPage:true});
 }finally{await p.close();}
});
test('gallery keeps four columns, submits moderated requests and toggles request votes',async()=>{
 const p=await page();try{
 await p.goto(base+'/styles.html');await p.waitForFunction(()=>!document.querySelector('#request-form fieldset').disabled&&document.querySelector('#request-list button')&&!document.querySelector('#request-list button').disabled);
 assert.equal(await p.$$eval('.card',els=>els.length),26);assert.equal(await p.$eval('.grid',el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),4);
 await p.click('#request-list button');await p.waitForFunction(()=>window.__testStore.get('themeRequestTotals/author').count===5);
 await p.click('#request-list button');await p.waitForFunction(()=>window.__testStore.get('themeRequestTotals/author').count===4);
 await p.type('#request-title','Sakura night');await p.type('#request-description','A peaceful sakura garden at night');await p.click('#request-form button');await p.waitForFunction(()=>window.__testStore.has('themeRequests/test-visitor'));assert.equal(await p.evaluate(()=>window.__testStore.get('themeRequests/test-visitor').status),'pending');
 await p.setViewport({width:390,height:844});assert.equal(await p.$eval('.grid',el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 if(process.env.COMMUNITY_SCREENSHOT_DIR){await p.setViewport({width:1600,height:1100});await p.$eval('#theme-requests',el=>el.scrollIntoView());await p.screenshot({path:path.join(process.env.COMMUNITY_SCREENSHOT_DIR,'community-requests.png')});}
 }finally{await p.close();}
});
