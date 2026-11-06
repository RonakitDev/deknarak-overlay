(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const feedbackForm = byId('feedback-form');
  const requestForm = byId('request-form');
  const style = document.body.dataset.style;
  const subscriptions = [];
  let client, data, pendingCopy = false;
  const message = (id, text, failed = false) => {
    const node = byId(id);
    if (node) { node.textContent = text; node.dataset.state = failed ? 'error' : 'ready'; }
  };
  function errorText(error) {
    if (error?.code === 'permission-denied') return 'ยังบันทึกไม่ได้ กรุณารอครบช่วงเวลาส่งซ้ำ หรือลองใหม่ภายหลังค่ะ';
    return error?.message && !error?.code ? error.message : 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่ค่ะ';
  }
  function node(tag, text, className) {
    const result = document.createElement(tag);
    if (text !== undefined) result.textContent = text;
    if (className) result.className = className;
    return result;
  }
  function watch(ref, success, failure) {
    const unsubscribe = client.firestore.onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
      if (!snapshot.metadata.fromCache) success(snapshot);
    }, failure);
    subscriptions.push(unsubscribe);
  }
  function metricFields(container, value) {
    container.querySelector('[data-views]').textContent = (value?.views || 0).toLocaleString('th-TH');
    container.querySelector('[data-copies]').textContent = (value?.copies || 0).toLocaleString('th-TH');
  }
  function metrics() {
    const { firestore: f, db } = client;
    if (style) {
      watch(f.doc(db, 'styleEngagement', style), snapshot => {
        const container = document.querySelector('[data-preview-metrics]');
        if (container) metricFields(container, snapshot.exists() ? snapshot.data() : null);
      }, () => message('metrics-status', 'ยังโหลดสถิติไม่ได้ กรุณาลองรีเฟรชอีกครั้งค่ะ', true));
      data.recordEngagement(client, style, 'viewed').catch(() => message('metrics-status', 'ยังบันทึกสถิติไม่ได้ แต่ยังเปิดดูและคัดลอกลิงก์ได้ตามปกติค่ะ', true));
    } else {
      watch(f.collection(db, 'styleEngagement'), snapshot => {
        const totals = new Map(snapshot.docs.map(item => [item.id, item.data()]));
        document.querySelectorAll('[data-metrics]').forEach(container => metricFields(container, totals.get(container.dataset.metrics)));
      }, () => {});
    }
  }
  function values(form, names) {
    return Object.fromEntries(names.map(name => [name, form.elements.namedItem(name).value]));
  }
  function fill(form, entry, names) {
    for (const key of names) if (entry[key] !== undefined) form.elements.namedItem(key).value = entry[key];
  }
  function ownStatus(id, entry) {
    const states = { pending: 'รายการของคุณกำลังรอตรวจ', published: 'รายการของคุณเผยแพร่แล้ว', hidden: 'รายการของคุณถูกซ่อนโดยผู้ดูแล' };
    message(id, entry ? states[entry.status] || 'บันทึกรายการแล้ว' : '');
  }
  function submitHandler(form, statusId, cooldown, save) {
    let lastSent = 0;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const fieldset = form.querySelector('fieldset');
      if (fieldset.disabled) return;
      if (Date.now() - lastSent < cooldown) {
        message(statusId, 'กรุณารอก่อนส่งซ้ำค่ะ', true); return;
      }
      fieldset.disabled = true;
      try {
        await save();
        lastSent = Date.now();
        message(statusId, 'บันทึกแล้วค่ะ รายการจะปรากฏต่อทุกคนหลังผ่านการตรวจ');
      } catch (error) { message(statusId, errorText(error), true); }
      finally { fieldset.disabled = false; }
    });
    fieldsetEnable(form);
  }
  function fieldsetEnable(form) { form.querySelector('fieldset').disabled = false; }
  function feedback() {
    if (!feedbackForm || !style) return;
    const { firestore: f, db, user } = client;
    let ownLoaded = false;
    watch(f.doc(db, 'styleFeedback', style, 'entries', user.uid), snapshot => {
      const entry = snapshot.exists() ? snapshot.data() : null;
      if (!ownLoaded && entry) fill(feedbackForm, entry, ['rating', 'name', 'text']);
      ownLoaded = true; ownStatus('feedback-own-status', entry);
    }, error => message('feedback-status', errorText(error), true));
    const query = f.query(f.collection(db, 'styleFeedback', style, 'entries'), f.where('status', '==', 'published'), f.limit(50));
    watch(query, snapshot => {
      const entries = snapshot.docs.map(item => item.data()).sort((a,b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
      const summary = data.feedbackSummary(entries);
      byId('rating-summary').textContent = summary.count ? summary.average.toFixed(1) + ' / 5 จาก ' + summary.count + ' ความเห็นที่แสดง' : 'ยังไม่มีคะแนนที่เผยแพร่';
      byId('feedback-list').replaceChildren(...(entries.length ? entries.map(entry => {
        const card = node('article', undefined, 'community-entry');
        card.append(node('h4', '★'.repeat(entry.rating) + ' / 5'), node('p', entry.text || 'ให้คะแนนโดยไม่แนบข้อความ'), node('p', entry.name, 'entry-meta'));
        return card;
      }) : [node('p', 'ร่วมเป็นคนแรกที่ให้คะแนนแบบนี้ค่ะ', 'community-note')]));
    }, error => message('feedback-status', errorText(error), true));
    submitHandler(feedbackForm, 'feedback-status', 60000, () => data.submitFeedback(client, style, values(feedbackForm, ['rating','name','text'])));
    message('feedback-status', 'พร้อมรับคะแนนและความคิดเห็นค่ะ');
  }
  function requests() {
    if (!requestForm) return;
    const { firestore: f, db, user } = client;
    let entries = [], counts = new Map(), votes = new Map(), totalsReady = false, votesReady = false, ownLoaded = false;
    const busy = new Set();
    function renderRequests() {
      entries.sort((a,b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
      byId('request-list').replaceChildren(...(entries.length ? entries.map(entry => {
        const card = node('article', undefined, 'community-entry');
        const button = node('button', (votes.get(entry.id) ? '♥ โหวตแล้ว ' : '♡ โหวต ') + (totalsReady ? counts.get(entry.id) || 0 : '—'));
        button.type = 'button'; button.setAttribute('aria-pressed', String(!!votes.get(entry.id)));
        button.disabled = busy.has(entry.id) || !totalsReady || !votesReady;
        button.addEventListener('click', async () => {
          if (busy.has(entry.id)) return;
          busy.add(entry.id); renderRequests();
          try { await data.voteRequest(client, entry.id, !votes.get(entry.id)); }
          catch (error) { message('request-status', errorText(error), true); }
          finally { busy.delete(entry.id); renderRequests(); }
        });
        card.append(node('h4', entry.title), node('p', entry.description), node('p', entry.name, 'entry-meta'), button);
        return card;
      }) : [node('p', 'ยังไม่มีคำขอที่เผยแพร่ เสนอไอเดียแรกได้เลยค่ะ', 'community-note')]));
    }
    watch(f.doc(db, 'themeRequests', user.uid), snapshot => {
      const entry = snapshot.exists() ? snapshot.data() : null;
      if (!ownLoaded && entry) fill(requestForm, entry, ['title','description','name']);
      ownLoaded = true; ownStatus('request-own-status', entry);
    }, error => message('request-status', errorText(error), true));
    watch(f.query(f.collection(db, 'themeRequests'), f.where('status','==','published'), f.limit(30)), snapshot => {
      entries = snapshot.docs.map(item => ({ ...item.data(), id:item.id })); renderRequests();
    }, error => { byId('request-list').replaceChildren(node('p', 'โหลดไอเดียไม่ได้ กรุณาลองใหม่ภายหลังค่ะ', 'community-note')); message('request-status', errorText(error), true); });
    watch(f.collection(db, 'themeRequestTotals'), snapshot => {
      counts = new Map(snapshot.docs.map(item => [item.id,item.data().count])); totalsReady=true; renderRequests();
    }, error => message('request-status', errorText(error), true));
    watch(f.collection(db, 'themeRequestVoters', user.uid, 'votes'), snapshot => {
      votes = new Map(snapshot.docs.map(item => [item.id,item.data().liked])); votesReady=true; renderRequests();
    }, error => message('request-status', errorText(error), true));
    submitHandler(requestForm, 'request-status', 600000, () => data.submitRequest(client, values(requestForm,['title','description','name'])));
    message('request-status', 'พร้อมรับไอเดียใหม่ค่ะ');
  }
  window.addEventListener('overlay:copied', event => {
    if (!style || event.detail?.style !== style) return;
    if (client && data) data.recordEngagement(client, style, 'copied').catch(() => {});
    else pendingCopy = true;
  });
  async function start() {
    if (location.protocol === 'file:') {
      for (const id of ['feedback-status','request-status']) message(id,'ฟีเจอร์ชุมชนใช้ได้เมื่อเปิดผ่านเว็บไซต์หรือ localhost ค่ะ');
      return;
    }
    const [{getClient}, operations] = await Promise.all([import('./firebase-client.js'),import('./community-data.js?v=2')]);
    data = operations; client = await getClient();
    metrics(); feedback(); requests();
    if (pendingCopy && style) data.recordEngagement(client,style,'copied').catch(() => {});
  }
  start().catch(error => {
    for (const id of ['feedback-status','request-status']) message(id,errorText(error),true);
  });
})();
