// สร้างไฟล์ firestore.rules จากรายชื่อทะเบียนใน config.js และ ownerUid ใน firebase-config.js
// ใช้:  node tools/build-rules.js   แล้ว   firebase deploy --only firestore:rules
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
['assets/js/util.js', 'assets/js/config.js', 'assets/js/firebase-config.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));

const keys = [];
ctx.GROUPS.forEach(g => g.items.forEach(i => { if (i.schema) keys.push(i.key); }));
keys.forEach(k => { if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(k)) throw new Error('ชื่อทะเบียนไม่ถูกต้อง: ' + k); });
if (['members', 'meta', 'counters'].some(k => keys.includes(k))) throw new Error('ชื่อทะเบียนชนกับชื่อระบบ');
const owner = (ctx.FIREBASE_OPTIONS || {}).ownerUid || '';
if (!/^[A-Za-z0-9]*$/.test(owner)) throw new Error('ownerUid ไม่ถูกต้อง');

const rules = `rules_version = '2';
// สร้างอัตโนมัติจาก tools/build-rules.js — อย่าแก้ไฟล์นี้โดยตรง
// หลักการ: อ่าน/เขียนได้เฉพาะผู้ใช้ที่ผู้ดูแลระบบเพิ่มไว้ใน members และยังเปิดใช้งาน (active == true)
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isOwner() { return signedIn() && request.auth.uid == '${owner}'; }
    function hasMember() { return signedIn() && exists(/databases/$(database)/documents/members/$(request.auth.uid)); }
    function member() { return get(/databases/$(database)/documents/members/$(request.auth.uid)).data; }
    function isMember() { return isOwner() || (hasMember() && member().active == true); }
    function isAdmin() { return isOwner() || (hasMember() && member().active == true && member().role == 'admin'); }

    // บัญชีผู้ใช้งาน: ผู้ดูแลระบบจัดการ / เจ้าตัวอ่านของตัวเองได้ และปิดสถานะ "ต้องเปลี่ยนรหัสผ่าน" ได้เท่านั้น
    match /members/{uid} {
      allow read: if isMember() || (signedIn() && request.auth.uid == uid);
      allow create, delete: if isAdmin();
      allow update: if isAdmin()
        || (signedIn() && request.auth.uid == uid
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['mustChangePassword'])
            && request.resource.data.mustChangePassword == false);
    }

    // การตั้งค่าหน่วยงาน
    match /meta/{docId} {
      allow read: if isMember();
      allow write: if isAdmin();
    }

    // ตัวนับเลขที่หนังสือ (ออกเลขไม่ซ้ำ)
    match /counters/{docId} {
      allow read, write: if isMember();
    }

    // ทะเบียนต่าง ๆ (${keys.length} ทะเบียน)
    match /{col}/{docId} {
      allow read, write: if isMember() && col in [${keys.map(k => `'${k}'`).join(', ')}];
    }
  }
}
`;
fs.writeFileSync(path.join(root, 'firestore.rules'), rules);
console.log(`firestore.rules: ${keys.length} ทะเบียน, owner = ${owner || '(ยังไม่กำหนด)'}`);
