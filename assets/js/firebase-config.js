/* =====================================================================
   firebase-config.js — ค่าการเชื่อมต่อ Firebase ของ รพ.สต.ทรายมูล (โปรเจกต์ saimun-phc)
   ค่าเหล่านี้เปิดเผยได้ตามปกติของ Firebase (ไม่ใช่รหัสลับ)
   ความปลอดภัยของข้อมูลอยู่ที่ Firestore Security Rules (firestore.rules)
   ถ้าตั้ง apiKey เป็น '' เว็บจะกลับไปใช้โหมดเก็บข้อมูลในเครื่อง (ไม่เชื่อมฐานข้อมูลกลาง)
   ===================================================================== */
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD2djcJNz2B6zPCq9RuniWGws026S0xLEk',
  authDomain: 'saimun-phc.firebaseapp.com',
  projectId: 'saimun-phc',
  storageBucket: 'saimun-phc.firebasestorage.app',
  messagingSenderId: '669154398207',
  appId: '1:669154398207:web:66ad58aa15507b08a3a1ca',
};

window.FIREBASE_OPTIONS = {
  sdk: '10.14.1',                      // เวอร์ชัน Firebase JS SDK
  userDomain: 'staff.saimun-phc.local', // ชื่อผู้ใช้ "somchai" = somchai@staff.saimun-phc.local (ใช้ภายในเท่านั้น ไม่มีการส่งอีเมล)
  ownerUid: 'KXzM61fm8ERvwmlONGyrV9NysQm1',                      // UID บัญชีผู้ดูแลระบบหลัก (เจ้าของ) — ใช้ใน firestore.rules ด้วย
};
