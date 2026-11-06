let connection;
export function getClient() {
  if (!connection) connection = connect().catch(error => { connection = null; throw error; });
  return connection;
}
async function connect() {
  if (location.protocol === 'file:') throw Object.assign(new Error('Open through the website or localhost'), { code: 'local-file' });
  const [appSdk, authSdk, firestore, { firebaseConfig }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js'),
    import('./firebase-config.js')
  ]);
  const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser || (await authSdk.signInAnonymously(auth)).user;
  return { user, firestore, db: firestore.getFirestore(app) };
}
