export async function recordEngagement(client, style, kind) {
  if (!['viewed', 'copied'].includes(kind)) throw new Error('Invalid engagement');
  const { db, user, firestore: f } = client;
  const own = f.doc(db, 'engagementVisitors', user.uid, 'styles', style);
  const total = f.doc(db, 'styleEngagement', style);
  return f.runTransaction(db, async tx => {
    const [visitor, summary] = await Promise.all([tx.get(own), tx.get(total)]);
    const previous = visitor.exists() ? visitor.data() : { viewed: false, copied: false };
    if (previous[kind]) return false;
    const counts = summary.exists() ? summary.data() : { views: 0, copies: 0 };
    const next = { viewed: true, copied: previous.copied || kind === 'copied', updatedAt: f.serverTimestamp() };
    tx.set(own, next);
    tx.set(total, { views: counts.views + (next.viewed && !previous.viewed ? 1 : 0), copies: counts.copies + (next.copied && !previous.copied ? 1 : 0), updatedAt: f.serverTimestamp() });
    return true;
  });
}
export function feedbackPayload(values) {
  const rating = Number(values.rating);
  const name = values.name.trim() || 'ผู้ชม';
  const text = values.text.trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || name.length > 30 || text.length > 500) throw new Error('กรุณาให้คะแนน 1–5 ชื่อไม่เกิน 30 และข้อความไม่เกิน 500 ตัวอักษร');
  return { rating, name, text };
}
export function requestPayload(values) {
  const title = values.title.trim(), description = values.description.trim(), name = values.name.trim() || 'ผู้ชม';
  if (title.length < 3 || title.length > 80 || description.length < 10 || description.length > 500 || name.length > 30) throw new Error('ชื่อธีมต้องมี 3–80 รายละเอียด 10–500 และชื่อผู้ส่งไม่เกิน 30 ตัวอักษร');
  return { title, description, name };
}
async function saveModerated(client, ref, payload) {
  const { firestore: f, db } = client;
  await f.runTransaction(db, async tx => {
    const old = await tx.get(ref);
    tx.set(ref, { ...payload, status: 'pending', createdAt: old.exists() ? old.data().createdAt : f.serverTimestamp(), updatedAt: f.serverTimestamp() });
  });
}
export async function submitFeedback(client, style, values) {
  const data = feedbackPayload(values);
  const { firestore: f, db, user } = client;
  await saveModerated(client, f.doc(db, 'styleFeedback', style, 'entries', user.uid), data);
}
export async function submitRequest(client, values) {
  const data = requestPayload(values);
  const { firestore: f, db, user } = client;
  await saveModerated(client, f.doc(db, 'themeRequests', user.uid), data);
}
export async function voteRequest(client, requestId, desired) {
  const { firestore: f, db, user } = client;
  const voteRef = f.doc(db, 'themeRequestVoters', user.uid, 'votes', requestId);
  const countRef = f.doc(db, 'themeRequestTotals', requestId);
  await f.runTransaction(db, async tx => {
    const [vote, total] = await Promise.all([tx.get(voteRef), tx.get(countRef)]);
    const was = vote.exists() && vote.data().liked;
    if (!!was === desired) return;
    tx.set(voteRef, { liked: desired, updatedAt: f.serverTimestamp() });
    tx.set(countRef, { count: (total.exists() ? total.data().count : 0) + (desired ? 1 : -1), updatedAt: f.serverTimestamp() });
  });
}
export function feedbackSummary(entries) {
  const published = entries.filter(entry => entry.status === 'published');
  return { count: published.length, average: published.length ? published.reduce((sum, entry) => sum + entry.rating, 0) / published.length : null };
}
