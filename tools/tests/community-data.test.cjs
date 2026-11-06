const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');const ops=import(pathToFileURL(path.resolve(__dirname,'../../assets/js/community-data.js')).href);
test('feedback validates score boundaries and trims text',async()=>{const o=await ops;assert.deepEqual(o.feedbackPayload({rating:'5',name:' ',text:'  hello  '}),{rating:5,name:'ผู้ชม',text:'hello'});for(const rating of [0,6,2.5,'abc'])assert.throws(()=>o.feedbackPayload({rating,name:'User',text:''}));assert.throws(()=>o.feedbackPayload({rating:5,name:'a'.repeat(31),text:''}));assert.throws(()=>o.feedbackPayload({rating:5,name:'User',text:'x'.repeat(501)}));});
test('requests validate length; raw HTML remains plain data',async()=>{const o=await ops;assert.throws(()=>o.requestPayload({title:'ab',description:'short',name:''}));const p=o.requestPayload({title:'<script>hello</script>',description:'A valid description for a new theme',name:''});assert.equal(p.name,'ผู้ชม');assert.equal(p.title,'<script>hello</script>');});
test('rating summary excludes pending and hidden feedback',async()=>{const o=await ops;assert.deepEqual(o.feedbackSummary([{status:'published',rating:5},{status:'published',rating:3},{status:'pending',rating:1},{status:'hidden',rating:1}]),{count:2,average:4});assert.deepEqual(o.feedbackSummary([]),{count:0,average:null});});

test('moderated submissions use supplied database and preserve creation timestamp', async () => {
  const o = await ops;
  const db = { id: 'expected-db' };
  const records = new Map();
  let transactions = 0;
  const client = {
    db, user: { uid: 'visitor' },
    firestore: {
      doc(database, ...parts) { assert.equal(database, db); return parts.join('/'); },
      serverTimestamp: () => 'server-time',
      async runTransaction(database, callback) {
        assert.equal(database, db); transactions++;
        return callback({
          get: async ref => ({ exists: () => records.has(ref), data: () => records.get(ref) }),
          set: (ref, value) => records.set(ref, value)
        });
      }
    }
  };
  const request = { title: 'Sakura theme', description: 'A peaceful sakura night theme', name: 'Viewer' };
  await o.submitRequest(client, request);
  assert.equal(records.get('themeRequests/visitor').status, 'pending');
  records.set('themeRequests/visitor', { ...records.get('themeRequests/visitor'), createdAt: 'original-time' });
  await o.submitRequest(client, { ...request, title: 'Sakura moon' });
  assert.equal(records.get('themeRequests/visitor').createdAt, 'original-time');
  await o.submitFeedback(client, 'gojo', { rating: 5, name: 'Viewer', text: 'Nice theme' });
  assert.equal(records.get('styleFeedback/gojo/entries/visitor').rating, 5);
  assert.equal(transactions, 3);
});
