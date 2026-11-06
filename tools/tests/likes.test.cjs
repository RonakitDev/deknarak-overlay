const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '../../assets/js/likes.js'), 'utf8');
function harness({ protocol = 'https:', error = null } = {}) {
  const child = () => ({ textContent: '' });
  const button = { dataset: { style: 'gojo' }, disabled: true, children: { '.like-heart': child(), '.like-label': child(), '.like-count': child() }, setAttribute(k,v) { this[k]=v; }, querySelector(k) { return this.children[k]; }, addEventListener(k,fn) { this[k]=fn; } };
  const status = { dataset: {}, textContent: '' };
  const listeners = [];
  const records = new Map();
  let transactionError = null;
  const snapshot = (data, cached = false) => ({ metadata: { fromCache: cached }, docs: Object.entries(data).map(([id,value]) => ({ id, data: () => value })) });
  const total = 'overlayLikes/gojo'; const vote = 'overlayVoters/user-a/votes/gojo';
  const sdk = {
    getFirestore: () => ({}), collection: (_, ...parts) => parts.join('/'), doc: (_, ...parts) => parts.join('/'), serverTimestamp: () => 'timestamp',
    onSnapshot(ref, options, callback, fail) { assert.equal(options.includeMetadataChanges, true); listeners.push({ref,callback,fail}); return () => {}; },
    async runTransaction(_, callback) {
      if (transactionError) throw transactionError;
      const writes=[];
      await callback({ async get(ref) { assert.equal(writes.length,0); return { exists: () => records.has(ref), data: () => records.get(ref) }; }, set(ref,data) { writes.push([ref,data]); } });
      for (const [ref,data] of writes) records.set(ref,data);
      listeners[0].callback(snapshot(records.has(total) ? { gojo: records.get(total) } : {}));
      listeners[1].callback(snapshot(records.has(vote) ? { gojo: records.get(vote) } : {}));
    }
  };
  const imports = async url => {
    if(error) throw error;
    if(url.includes('firebase-client.js')) return { getClient: async () => ({ user: { uid: 'user-a' }, db: {}, firestore: sdk }) };
    if(url.includes('firebase-app.js')) return { initializeApp: () => ({}) };
    if(url.includes('firebase-auth.js')) return { getAuth: () => ({ authStateReady: async () => {}, currentUser: { uid:'user-a' } }) };
    if(url.includes('firebase-firestore.js')) return sdk;
    return { firebaseConfig: {} };
  };
  const context = vm.createContext({ document: { getElementById: () => status, querySelectorAll: () => [button] }, window: { location: { protocol } }, console: { error() {} }, __import: imports });
  vm.runInContext(source.replaceAll('import(', '__import(').replace('start().catch(fail);', 'globalThis.started = start().catch(fail);'), context);
  return { button, status, listeners, records, snapshot, ready: context.started, total, vote, setError: value => transactionError=value };
}
test('like, duplicate-click guard, unlike and shared totals', async () => {
  const h=harness(); await h.ready;
  h.listeners[0].callback(h.snapshot({},true)); h.listeners[1].callback(h.snapshot({},true)); assert(h.button.disabled);
  h.listeners[0].callback(h.snapshot({})); h.listeners[1].callback(h.snapshot({})); assert(!h.button.disabled);
  const pending=h.button.click(); assert(h.button.disabled); await h.button.click(); await pending;
  assert.equal(h.records.get(h.total).count,1); assert.equal(h.records.get(h.vote).liked,true); assert.equal(h.button['aria-pressed'],'true');
  // Another visitor likes the same style, then this user unlikes: keep the other vote.
  h.records.set(h.total,{count:2});h.listeners[0].callback(h.snapshot({gojo:{count:2}}));
  await h.button.click(); assert.equal(h.records.get(h.total).count,1); assert.equal(h.records.get(h.vote).liked,false); assert.equal(h.button['aria-pressed'],'false');
});
test('transaction errors do not fake success or change the count', async () => {
  const h=harness();await h.ready;h.listeners[0].callback(h.snapshot({}));h.listeners[1].callback(h.snapshot({}));h.setError({code:'permission-denied'});await h.button.click();assert.equal(h.records.size,0);assert.equal(h.button['aria-pressed'],'false');assert.equal(h.status.dataset.state,'error');assert(!h.button.disabled);
});
test('listener failure disables voting', async () => { const h=harness();await h.ready;h.listeners[0].fail({code:'permission-denied'});assert(h.button.disabled);assert.equal(h.status.dataset.state,'error'); });
test('file URL stays disabled without contacting Firebase', async () => { const h=harness({protocol:'file:'});await h.ready;assert(h.button.disabled);assert.equal(h.listeners.length,0);assert(h.status.textContent.includes('localhost')); });
test('SDK/network initialization failure is visible', async () => { const h=harness({error:new Error('offline')});await h.ready;assert.equal(h.status.dataset.state,'error');assert(h.button.disabled); });
