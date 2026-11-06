(() => {
  'use strict';
const status = document.getElementById('likes-status');
const buttons = [...document.querySelectorAll('.like-button')];
const models = new Map(buttons.map(button => [button.dataset.style, { button, count: null, liked: false, busy: false }]));
let user = null;
let totalsReady = false;
let votesReady = false;
let failed = false;
const subscriptions = [];

function render() {
  for (const model of models.values()) {
    model.button.disabled = failed || !user || !totalsReady || !votesReady || model.busy;
    model.button.setAttribute('aria-pressed', String(model.liked));
    model.button.querySelector('.like-heart').textContent = model.liked ? '♥' : '♡';
    model.button.querySelector('.like-label').textContent = model.busy ? 'กำลังบันทึก…' : model.liked ? 'ถูกใจแล้ว' : 'ถูกใจ';
    model.button.querySelector('.like-count').textContent = model.count === null ? '—' : model.count.toLocaleString('th-TH');
  }
}
function fail(error) {
  failed = true;
  for (const unsubscribe of subscriptions.splice(0)) unsubscribe();
  const messages = {
    'auth/operation-not-allowed': 'ต้องเปิด Anonymous ใน Firebase Authentication ก่อนค่ะ',
    'auth/configuration-not-found': 'ต้องตั้งค่า Firebase Authentication และเปิด Anonymous ก่อนค่ะ',
    'auth/unauthorized-domain': 'ต้องเพิ่ม ronakitdev.github.io ใน Authorized domains ของ Firebase Authentication ค่ะ',
    'permission-denied': 'ระบบไลค์ยังไม่พร้อม กรุณาตรวจ Firestore Rules ค่ะ',
    'unavailable': 'เชื่อมต่อระบบไลค์ไม่ได้ ลองรีเฟรชอีกครั้งค่ะ',
    'resource-exhausted': 'ระบบไลค์ถึงขีดจำกัดชั่วคราว กรุณาลองภายหลังค่ะ'
  };
  status.textContent = messages[error?.code] || 'เชื่อมต่อระบบไลค์ไม่สำเร็จ กรุณาลองรีเฟรชอีกครั้งค่ะ';
  status.dataset.state = 'error';
  console.error('Likes connection failed:', error?.code || error?.message || 'unknown');
  render();
}
function ready() {
  if (!failed && user && totalsReady && votesReady) {
    status.textContent = 'ยอดไลค์รวมจากทุกคน · กดอีกครั้งเพื่อถอนถูกใจ';
    status.dataset.state = 'ready';
  }
  render();
}
async function start() {
  if (window.location.protocol === 'file:') {
    status.textContent = 'ดูยอดและกดไลค์ได้เมื่อเปิดผ่านเว็บไซต์หรือ localhost ค่ะ';
    return;
  }
  const { getClient } = await import('./firebase-client.js');
  const client = await getClient();
  const { db, firestore } = client;
  user = client.user;
  subscriptions.push(firestore.onSnapshot(firestore.collection(db, 'overlayLikes'), { includeMetadataChanges: true }, snapshot => {
    for (const model of models.values()) model.count = 0;
    for (const item of snapshot.docs) {
      const model = models.get(item.id);
      if (model) model.count = item.data().count;
    }
    totalsReady = !snapshot.metadata.fromCache;
    ready();
  }, fail));
  subscriptions.push(firestore.onSnapshot(firestore.collection(db, 'overlayVoters', user.uid, 'votes'), { includeMetadataChanges: true }, snapshot => {
    for (const model of models.values()) model.liked = false;
    for (const item of snapshot.docs) {
      const model = models.get(item.id);
      if (model) model.liked = item.data().liked === true;
    }
    votesReady = !snapshot.metadata.fromCache;
    ready();
  }, fail));
  for (const [id, model] of models) {
    model.button.addEventListener('click', async () => {
      if (model.button.disabled) return;
      model.busy = true;
      render();
      const totalRef = firestore.doc(db, 'overlayLikes', id);
      const voteRef = firestore.doc(db, 'overlayVoters', user.uid, 'votes', id);
      const desiredLiked = !model.liked;
      try {
        await firestore.runTransaction(db, async transaction => {
          const [total, vote] = await Promise.all([transaction.get(totalRef), transaction.get(voteRef)]);
          const wasLiked = vote.exists() && vote.data().liked === true;
          if (wasLiked === desiredLiked) return;
          const count = total.exists() ? total.data().count : 0;
          transaction.set(totalRef, { count: count + (desiredLiked ? 1 : -1), updatedAt: firestore.serverTimestamp() });
          transaction.set(voteRef, { liked: desiredLiked, updatedAt: firestore.serverTimestamp() });
        });
      } catch (error) {
        status.textContent = error?.code === 'permission-denied' ? 'บันทึกไม่ได้ กรุณาตรวจ Firestore Rules แล้วรีเฟรชค่ะ' : 'บันทึกไลค์ไม่สำเร็จ กรุณาลองใหม่ค่ะ';
        status.dataset.state = 'error';
      } finally {
        model.busy = false;
        render();
      }
    });
  }
}
start().catch(fail);

})();
