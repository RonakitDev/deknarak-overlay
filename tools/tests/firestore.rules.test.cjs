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
