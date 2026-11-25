/* =====================================================================
   cloud.js — เชื่อมต่อ Firebase (Authentication + Cloud Firestore)
   ทำงานเมื่อ firebase-config.js มี apiKey: แทนที่ window.Store ด้วยฐานข้อมูลกลางบนคลาวด์
   และเพิ่ม window.Cloud สำหรับเข้าสู่ระบบ / เปลี่ยนรหัสผ่าน / จัดการผู้ใช้งาน
   ความปลอดภัยของข้อมูลบังคับที่ Firestore Security Rules (firestore.rules) ไม่ใช่ที่หน้าเว็บ
   ===================================================================== */
(() => {
  'use strict';
  const CFG = window.FIREBASE_CONFIG || {};
  const OPT = window.FIREBASE_OPTIONS || {};
  if (!CFG.apiKey) return; // ไม่มีค่า Firebase → ใช้โหมดเก็บข้อมูลในเครื่อง (store.js)

  const BASE = `https://www.gstatic.com/firebasejs/${OPT.sdk || '10.14.1'}/`;
  const DOMAIN = OPT.userDomain || 'staff.saimun-phc.local';
  const toEmail = u => `${String(u || '').trim().toLowerCase()}@${DOMAIN}`;
  const toUser = e => String(e || '').split('@')[0];
  const nowISO = () => new Date().toISOString();
  const REG = [];
  GROUPS.forEach(g => g.items.forEach(it => { if (it.schema) REG.push(it.key); }));

  let A, AU, FS, auth, db;
  let me = null, state = { status: 'loading' }, deniedMsg = '';
  const authCbs = [], changeCbs = [], errorCbs = [];
  const cache = {}, loaded = {}, unsubs = {};
  let settings = {}, settingsUnsub = null, emitTimer = null;

  /* ---------- ข้อความผิดพลาดภาษาไทย ---------- */
  const ERR = {
    'invalid-credential': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'wrong-password': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'user-not-found': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'invalid-email': 'ชื่อผู้ใช้ไม่ถูกต้อง',
    'missing-password': 'กรุณากรอกรหัสผ่าน',
    'too-many-requests': 'ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
    'network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาตรวจสอบแล้วลองใหม่',
    'unavailable': 'เชื่อมต่อฐานข้อมูลไม่ได้ (ออฟไลน์?) กรุณาลองใหม่',
    'deadline-exceeded': 'ฐานข้อมูลตอบสนองช้าเกินไป กรุณาลองใหม่',
    'permission-denied': 'ไม่มีสิทธิ์ดำเนินการนี้',
    'insufficient-permissions': 'ไม่มีสิทธิ์ดำเนินการนี้',
    'weak-password': 'รหัสผ่านสั้นเกินไป (อย่างน้อย 8 ตัวอักษร)',
    'email-already-in-use': 'ชื่อผู้ใช้นี้มีอยู่แล้ว',
    'requires-recent-login': 'กรุณาออกจากระบบแล้วเข้าใหม่ ก่อนเปลี่ยนรหัสผ่าน',
    'user-disabled': 'บัญชีนี้ถูกปิดการใช้งาน',
  };
  function errText(e) {
    const code = String((e && e.code) || '');
    const hit = Object.keys(ERR).find(k => code === k || code.endsWith('/' + k));
    return hit ? ERR[hit] : ((e && e.message) || String(e));
  }

  /* ---------- เหตุการณ์ ---------- */
  function setState(s) {
    state = s;
    authCbs.forEach(cb => { try { cb(s); } catch (e) { console.error(e); } });
  }
  function emitChange() {
    clearTimeout(emitTimer);
    emitTimer = setTimeout(() => changeCbs.forEach(cb => { try { cb(); } catch (e) { console.error(e); } }), 60);
  }
  const emitError = err => errorCbs.forEach(cb => { try { cb(err); } catch (e) { console.error(e); } });

  /* ---------- โหลด Firebase SDK (ES modules จาก gstatic) ---------- */
  const sdk = Promise.all(['app', 'auth', 'firestore'].map(n => import(`${BASE}firebase-${n}.js`)))
    .then(([a, au, fs]) => {
      A = a; AU = au; FS = fs;
      const app = A.initializeApp(CFG);
      auth = AU.getAuth(app);
      db = FS.getFirestore(app);
      AU.onAuthStateChanged(auth, onUser);
    })
    .catch(err => {
      console.error(err);
      setState({ status: 'error', message: 'โหลดระบบเชื่อมต่อฐานข้อมูลไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้าใหม่ (F5)' });
    });

  /* ---------- สถานะการเข้าสู่ระบบ ---------- */
  async function onUser(user) {
    stopSync();
    me = null;
    if (!user) {
      const msg = deniedMsg; deniedMsg = '';
      setState(msg ? { status: 'denied', message: msg } : { status: 'signedOut' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const uid = user.uid;
      const isOwner = !!OPT.ownerUid && uid === OPT.ownerUid;
      const ref = FS.doc(db, 'members', uid);
      const snap = await FS.getDoc(ref);
      let m = snap.exists() ? snap.data() : null;
      if (!m && isOwner) {
        m = { username: toUser(user.email), name: SITE.director || 'ผู้ดูแลระบบ', position: 'ผู้ดูแลระบบ', role: 'admin', active: true, mustChangePassword: false, createdAt: nowISO() };
        await FS.setDoc(ref, m);
      }
      if (!m || (!isOwner && m.active !== true)) {
        deniedMsg = !m ? 'บัญชีนี้ยังไม่ได้รับอนุญาตให้ใช้งานระบบ — ติดต่อผู้ดูแลระบบ' : 'บัญชีนี้ถูกระงับการใช้งาน — ติดต่อผู้ดูแลระบบ';
        await AU.signOut(auth);
        return;
      }
      me = Object.assign({}, m, { uid, isOwner, role: isOwner ? 'admin' : (m.role || 'staff') });
      settingsUnsub = FS.onSnapshot(FS.doc(db, 'meta', 'settings'),
        s => { settings = s.exists() ? s.data() : {}; emitChange(); },
        err => console.warn('settings', err));
      setState({ status: 'ready', user: me });
    } catch (err) {
      console.error(err);
      deniedMsg = errText(err);
      try { await AU.signOut(auth); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- ซิงก์ข้อมูลแบบเรียลไทม์ (โหลดเฉพาะทะเบียนที่เปิดใช้) ---------- */
  function subscribe(col) {
    if (!me || unsubs[col]) return;
    unsubs[col] = FS.onSnapshot(FS.collection(db, col), snap => {
      cache[col] = snap.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
      loaded[col] = true;
      emitChange();
    }, err => {
      console.error(col, err);
      loaded[col] = true;
      emitError(err);
      emitChange();
    });
  }
  function stopSync() {
    Object.keys(unsubs).forEach(k => { try { unsubs[k](); } catch (e) { /* ignore */ } delete unsubs[k]; });
    if (settingsUnsub) { try { settingsUnsub(); } catch (e) { /* ignore */ } settingsUnsub = null; }
    Object.keys(cache).forEach(k => delete cache[k]);
    Object.keys(loaded).forEach(k => delete loaded[k]);
    settings = {};
  }
  function loadAll(cols) {
    cols = cols || REG;
    cols.forEach(subscribe);
    return new Promise(resolve => {
      const started = Date.now();
      const t = setInterval(() => {
        if (cols.every(c => loaded[c]) || Date.now() - started > 30000) { clearInterval(t); resolve(); }
      }, 100);
    });
  }

  const stamp = create => (create
    ? { createdAt: nowISO(), createdBy: me ? me.username : '' }
    : { updatedAt: nowISO(), updatedBy: me ? me.username : '' });
  const clean = rec => {
    const o = {};
    Object.keys(rec || {}).forEach(k => { if (k !== 'id' && rec[k] !== undefined) o[k] = rec[k]; });
    return o;
  };
  function genPassword(n) {
    const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const a = new Uint32Array(n || 10);
    crypto.getRandomValues(a);
    let p = '';
    a.forEach(x => { p += cs[x % cs.length]; });
    return p;
  }

  /* ---------- Store (อินเทอร์เฟซเดียวกับโหมดในเครื่อง) ---------- */
  const CloudStore = {
    mode: 'cloud',
    all(c) { subscribe(c); return cache[c] || (cache[c] = []); },
    loaded: c => !!loaded[c],
    get: (c, id) => (cache[c] || []).find(r => r.id === id) || null,
    add(c, rec) {
      const ref = FS.doc(FS.collection(db, c));
      const data = Object.assign(clean(rec), stamp(true));
      return FS.setDoc(ref, data).then(() => Object.assign({ id: ref.id }, data));
    },
    /* เพิ่มรายการพร้อมออกเลขอัตโนมัติแบบไม่ซ้ำ (transaction บนตัวนับ counters/{ทะเบียน}_{ปีงบ}) */
    async addNumbered(c, rec, field, fy, base) {
      const recRef = FS.doc(FS.collection(db, c));
      const cRef = FS.doc(db, 'counters', `${c}_${fy}`);
      const data = Object.assign(clean(rec), stamp(true));
      const val = await FS.runTransaction(db, async t => {
        const cs = await t.get(cRef);
        const n = Math.max(cs.exists() ? Number(cs.data().n) || 0 : 0, Number(base) || 0) + 1;
        const v = `${String(n).padStart(3, '0')}/${fy}`;
        t.set(cRef, { n, updatedAt: nowISO() });
        t.set(recRef, Object.assign({}, data, { [field]: v }));
        return v;
      });
      return Object.assign({ id: recRef.id }, data, { [field]: val });
    },
    update(c, id, patch) { return FS.updateDoc(FS.doc(db, c, id), Object.assign(clean(patch), stamp(false))); },
    remove(c, id) { return FS.deleteDoc(FS.doc(db, c, id)); },
    settings: () => settings,
    saveSettings(s) { return FS.setDoc(FS.doc(db, 'meta', 'settings'), Object.assign(clean(s), stamp(false)), { merge: true }); },
    isDemo: () => false,
    persistent: () => true,
    onChange(cb) { changeCbs.push(cb); },
    async exportJSON() {
      await loadAll();
      const data = {};
      REG.forEach(c => { data[c] = (cache[c] || []).map(r => Object.assign({}, r)); });
      return JSON.stringify({ app: 'SaiMun-PHC', source: 'firebase', exportedAt: nowISO(), v: 1, demo: false, settings, data }, null, 2);
    },
    async importJSON(obj) {
      if (!obj || typeof obj !== 'object' || !obj.data || typeof obj.data !== 'object') throw new Error('ไฟล์สำรองข้อมูลไม่ถูกต้อง');
      const ops = [];
      REG.forEach(c => (Array.isArray(obj.data[c]) ? obj.data[c] : []).forEach(r => { if (r && typeof r === 'object') ops.push([c, r]); }));
      for (let i = 0; i < ops.length; i += 400) {
        const b = FS.writeBatch(db);
        ops.slice(i, i + 400).forEach(([c, r]) => {
          const ref = r.id && !String(r.id).includes('/') ? FS.doc(db, c, String(r.id)) : FS.doc(FS.collection(db, c));
          b.set(ref, clean(r));
        });
        await b.commit();
      }
      if (obj.settings && typeof obj.settings === 'object' && Object.keys(obj.settings).length) await CloudStore.saveSettings(obj.settings);
      return ops.length;
    },
    async reset() {
      await loadAll(REG.concat('counters'));
      const refs = [];
      REG.concat('counters').forEach(c => (cache[c] || []).forEach(r => refs.push(FS.doc(db, c, r.id))));
      for (let i = 0; i < refs.length; i += 400) {
        const b = FS.writeBatch(db);
        refs.slice(i, i + 400).forEach(ref => b.delete(ref));
        await b.commit();
      }
      return refs.length;
    },
  };
  window.Store = CloudStore;

  /* ---------- Cloud: เข้าสู่ระบบ / ผู้ใช้งาน ---------- */
  window.Cloud = {
    onAuth(cb) { authCbs.push(cb); cb(state); },
    onError(cb) { errorCbs.push(cb); },
    me: () => me,
    isAdmin: () => !!me && me.role === 'admin',
    ownerUid: OPT.ownerUid || '',
    errText,
    usernameOk: u => /^[a-z0-9][a-z0-9._-]{2,29}$/.test(String(u || '')),
    async signIn(username, password) {
      await sdk;
      if (!auth) throw new Error('ยังเชื่อมต่อระบบไม่ได้ กรุณาโหลดหน้าใหม่');
      deniedMsg = '';
      return AU.signInWithEmailAndPassword(auth, toEmail(username), password);
    },
    async signOut() { await sdk; return auth ? AU.signOut(auth) : null; },
    async changePassword(current, next) {
      const u = auth && auth.currentUser;
      if (!u) throw new Error('ยังไม่ได้เข้าสู่ระบบ');
      await AU.reauthenticateWithCredential(u, AU.EmailAuthProvider.credential(u.email, current));
      await AU.updatePassword(u, next);
      if (me && me.mustChangePassword) {
        await FS.updateDoc(FS.doc(db, 'members', me.uid), { mustChangePassword: false });
        me.mustChangePassword = false;
      }
    },
    members() { return CloudStore.all('members'); },
    async createUser({ username, name, position, role }) {
      const u = String(username || '').trim().toLowerCase();
      if (!window.Cloud.usernameOk(u)) throw new Error('ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษตัวเล็ก ตัวเลข หรือ . _ - ยาว 3–30 ตัว');
      const password = genPassword(10);
      // ใช้แอปสำรองสร้างบัญชี เพื่อไม่ให้ผู้ดูแลระบบหลุดออกจากระบบ
      const sec = A.initializeApp(CFG, 'create-' + Date.now());
      try {
        const secAuth = AU.initializeAuth(sec, { persistence: AU.inMemoryPersistence });
        const cred = await AU.createUserWithEmailAndPassword(secAuth, toEmail(u), password);
        const uid = cred.user.uid;
        await AU.signOut(secAuth);
        await FS.setDoc(FS.doc(db, 'members', uid), {
          username: u, name: name || u, position: position || '', role: role === 'admin' ? 'admin' : 'staff',
          active: true, mustChangePassword: true, createdAt: nowISO(), createdBy: me ? me.username : '',
        });
        return { uid, username: u, password };
      } finally {
        A.deleteApp(sec).catch(() => {});
      }
    },
    updateMember(uid, patch) { return FS.updateDoc(FS.doc(db, 'members', uid), Object.assign(clean(patch), stamp(false))); },
  };
})();
