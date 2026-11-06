const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const external = createRequire(path.join(process.env.FIREBASE_TEST_MODULES, 'package.json'));
const { initializeTestEnvironment, assertSucceeds, assertFails } = external('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, writeBatch, serverTimestamp } = external('firebase/firestore');
let env;
before(async()=>{ env=await initializeTestEnvironment({ projectId:'demo-deknarak-likes', firestore:{ host:'127.0.0.1',port:8787,rules:fs.readFileSync(path.resolve(__dirname,'../../firestore.rules'),'utf8') } }); });
after(async()=>{if(env)await env.cleanup();});
function refs(db, uid, style='gojo'){ return {total:doc(db,'overlayLikes',style), vote:doc(db,'overlayVoters',uid,'votes',style)}; }
function paired(db, uid, count, liked, style='gojo') { const r=refs(db,uid,style);const b=writeBatch(db);b.set(r.total,{count,updatedAt:serverTimestamp()});b.set(r.vote,{liked,updatedAt:serverTimestamp()});return b.commit(); }
test('paired likes/unlikes, public totals and private voter data',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore(),publicDb=env.unauthenticatedContext().firestore();
 await assertSucceeds(paired(a,'alice',1,true));await assertSucceeds(paired(b,'bob',2,true));
 assert.equal((await assertSucceeds(getDoc(refs(publicDb,'alice').total))).data().count,2);
 await assertSucceeds(getDocs(collection(publicDb,'overlayLikes')));
 await assertSucceeds(getDocs(collection(a,'overlayVoters','alice','votes')));
 await assertFails(getDoc(refs(b,'alice').vote));await assertFails(getDocs(collection(b,'overlayVoters','alice','votes')));
 await assertSucceeds(paired(a,'alice',1,false));await assertSucceeds(paired(a,'alice',2,true));
 await assertFails(paired(a,'alice',3,true));
});
test('forged count, unpaired writes, wrong UID, unknown styles and unauthenticated writes are rejected',async()=>{
 const db=env.authenticatedContext('mallory').firestore();const r=refs(db,'mallory');
 let batch=writeBatch(db);batch.set(r.total,{count:999,updatedAt:serverTimestamp()});await assertFails(batch.commit());
 batch=writeBatch(db);batch.set(r.vote,{liked:true,updatedAt:serverTimestamp()});await assertFails(batch.commit());
 await assertFails(paired(db,'mallory',999,true));await assertFails(paired(db,'alice',3,false));await assertFails(paired(db,'mallory',1,true,'unknown'));
 await assertFails(paired(env.unauthenticatedContext().firestore(),'mallory',1,true,'naruto'));
});
test('invalid payloads, negative/fractional counts and deletes are rejected',async()=>{
 const db=env.authenticatedContext('eve').firestore();
 for(const count of [-1,1.5])await assertFails(paired(db,'eve',count,true,'naruto'));
 let r=refs(db,'eve','naruto'),batch=writeBatch(db);batch.set(r.total,{count:1,updatedAt:serverTimestamp(),extra:true});batch.set(r.vote,{liked:true,updatedAt:serverTimestamp()});await assertFails(batch.commit());
 await assertSucceeds(paired(db,'eve',1,true,'naruto'));
 batch=writeBatch(db);batch.delete(r.total);batch.delete(r.vote);await assertFails(batch.commit());
});

test('Rapunzel accepts a valid paired like',async()=>{const db=env.authenticatedContext('rapunzel-fan').firestore();await assertSucceeds(paired(db,'rapunzel-fan',1,true,'rapunzel'));assert.equal((await getDoc(refs(db,'rapunzel-fan','rapunzel').total)).data().count,1);});

const sdk = external('firebase/firestore');
let operations;
before(async()=>{ operations=await import(require('node:url').pathToFileURL(path.resolve(__dirname,'../../assets/js/community-data.js')).href); });
function clientFor(uid){ return { user:{uid}, db:env.authenticatedContext(uid).firestore(), firestore:sdk }; }
async function publish(refPath, changes){ await env.withSecurityRulesDisabled(async context=>{await sdk.setDoc(sdk.doc(context.firestore(),...refPath),changes,{merge:true});}); }
test('unique views/copies are atomic, idempotent and private',async()=>{
 const a=clientFor('visitor-a'),b=clientFor('visitor-b');
 await assertSucceeds(operations.recordEngagement(a,'gojo','viewed'));
 assert.equal(await operations.recordEngagement(a,'gojo','viewed'),false);
 await assertSucceeds(operations.recordEngagement(a,'gojo','copied'));
 assert.equal(await operations.recordEngagement(a,'gojo','copied'),false);
 await assertSucceeds(operations.recordEngagement(b,'gojo','copied'));
 const total=await sdk.getDoc(sdk.doc(a.db,'styleEngagement','gojo'));assert.equal(total.data().views,2);assert.equal(total.data().copies,2);
 await assertFails(sdk.getDoc(sdk.doc(b.db,'engagementVisitors','visitor-a','styles','gojo')));
 const forged=sdk.writeBatch(a.db);forged.set(sdk.doc(a.db,'styleEngagement','gojo'),{views:999,copies:999,updatedAt:sdk.serverTimestamp()});await assertFails(forged.commit());
 await assertFails(sdk.setDoc(sdk.doc(a.db,'engagementVisitors','visitor-a','styles','gojo'),{viewed:false,copied:false,updatedAt:sdk.serverTimestamp()}));
 await assertFails(operations.recordEngagement(a,'not-a-style','viewed'));
});
test('feedback stays pending; only moderated feedback is public and edits have a server cooldown',async()=>{
 const a=clientFor('reviewer-a'),other=clientFor('reviewer-b'),publicDb=env.unauthenticatedContext().firestore();
 const payload={rating:5,name:'Viewer',text:'<img src=x onerror=alert(1)>'};
 await assertSucceeds(operations.submitFeedback(a,'gojo',payload));
 const ownRef=sdk.doc(a.db,'styleFeedback','gojo','entries',a.user.uid);
 assert.equal((await sdk.getDoc(ownRef)).data().status,'pending');
 await assertFails(sdk.getDoc(sdk.doc(other.db,'styleFeedback','gojo','entries',a.user.uid)));
 const q=sdk.query(sdk.collection(publicDb,'styleFeedback','gojo','entries'),sdk.where('status','==','published'),sdk.limit(50));
 assert.equal((await assertSucceeds(sdk.getDocs(q))).size,0);
 await assertFails(sdk.getDocs(sdk.collection(publicDb,'styleFeedback','gojo','entries')));
 await assertFails(operations.submitFeedback(a,'gojo',{...payload,rating:4}));
 await publish(['styleFeedback','gojo','entries',a.user.uid],{status:'published',updatedAt:sdk.Timestamp.fromMillis(Date.now()-120000)});
 assert.equal((await sdk.getDocs(q)).size,1);
 await assertSucceeds(operations.submitFeedback(a,'gojo',{...payload,rating:4}));assert.equal((await sdk.getDocs(q)).size,0);
 const badRef=sdk.doc(other.db,'styleFeedback','gojo','entries',other.user.uid);
 await assertFails(sdk.setDoc(badRef,{rating:6,name:'Viewer',text:'bad',status:'pending',createdAt:sdk.serverTimestamp(),updatedAt:sdk.serverTimestamp()}));
 await assertFails(sdk.setDoc(badRef,{rating:5,name:'Viewer',text:'bad',status:'published',createdAt:sdk.serverTimestamp(),updatedAt:sdk.serverTimestamp()}));
 await assertFails(operations.submitFeedback(a,'unknown',payload));
});
test('requests are moderated/rate-limited and request votes are paired and owned',async()=>{
 const a=clientFor('request-author'),b=clientFor('request-fan'),c=clientFor('request-fan-2');
 const payload={title:'Moon garden',description:'A peaceful midnight garden theme',name:'Viewer'};
 await assertSucceeds(operations.submitRequest(a,payload));
 await assertFails(operations.submitRequest(a,{...payload,title:'Another theme'}));
 await assertFails(operations.voteRequest(b,a.user.uid,true));
 const q=sdk.query(sdk.collection(b.db,'themeRequests'),sdk.where('status','==','published'),sdk.limit(30));assert.equal((await sdk.getDocs(q)).size,0);
 await assertFails(sdk.getDocs(sdk.collection(b.db,'themeRequests')));
 await publish(['themeRequests',a.user.uid],{status:'published'});
 assert.equal((await sdk.getDocs(q)).size,1);
 await assertSucceeds(operations.voteRequest(b,a.user.uid,true));await operations.voteRequest(b,a.user.uid,true);
 await assertSucceeds(operations.voteRequest(c,a.user.uid,true));await assertSucceeds(operations.voteRequest(b,a.user.uid,false));
 assert.equal((await sdk.getDoc(sdk.doc(b.db,'themeRequestTotals',a.user.uid))).data().count,1);
 await assertFails(sdk.setDoc(sdk.doc(b.db,'themeRequestTotals',a.user.uid),{count:888,updatedAt:sdk.serverTimestamp()}));
 await assertFails(sdk.getDoc(sdk.doc(b.db,'themeRequestVoters',c.user.uid,'votes',a.user.uid)));
 await assertFails(sdk.setDoc(sdk.doc(b.db,'themeRequests','someone-else'),{...payload,status:'pending',createdAt:sdk.serverTimestamp(),updatedAt:sdk.serverTimestamp()}));
});
