/* =====================================================================
   store.js — ชั้นจัดการข้อมูล (Data layer)
   ตอนนี้เก็บข้อมูลไว้ใน localStorage ของเบราว์เซอร์เครื่องนี้เท่านั้น
   ไม่ได้เชื่อมต่อฐานข้อมูลของเว็บต้นแบบ (NSN-PHC) หรือฐานข้อมูลใด ๆ

   เมื่อต้องการให้ทุกเครื่องใช้ข้อมูลร่วมกัน ให้เปลี่ยนเฉพาะฟังก์ชันใน Store
   (all/get/add/update/remove) ให้เรียก API ของ รพ.สต.ทรายมูลเอง
   เช่น Google Apps Script + Google Sheets — ส่วนหน้าจอไม่ต้องแก้
   ===================================================================== */

/* ---------- ข้อมูลตัวอย่าง (สร้างตามวันที่ปัจจุบัน) ---------- */
window.Seed = {
  build() {
    const d = n => U.addDays(n);
    const fy = U.fyOf(new Date());
    const DIR = SITE.director;
    const P = ['นางสาวสมใจ รักษ์ดี', 'นายสมชาย ใจดี', 'นางพิไลพร ศรีสุข', 'นางสาวกาญจนา มีสุข', 'นายวีระพงษ์ ทองดี'];
    let n = 0;
    const R = o => Object.assign({ id: 'seed' + (++n), createdAt: new Date(Date.now() - (1000 - n) * 60000).toISOString() }, o);
    const no = (i, date) => `${String(i).padStart(3, '0')}/${U.fyOf(date)}`;

    const duty = [];
    for (let i = -3; i <= 7; i++) {
      const date = d(i);
      SITE.rooms.forEach((room, j) => duty.push(R({ date, room, person: P[(i + 9 + j) % P.length] })));
    }

    return {
      personnel: [
        R({ name: DIR, position: 'ผู้อำนวยการ รพ.สต.', duty: 'บริหารงานทั่วไป', phone: '' }),
        R({ name: P[0], position: 'พยาบาลวิชาชีพชำนาญการ', duty: 'งานการพยาบาล / ห้อง ER / LTC', phone: '' }),
        R({ name: P[1], position: 'นักวิชาการสาธารณสุข', duty: 'งานส่งเสริมป้องกันโรค / สารสนเทศ', phone: '' }),
        R({ name: P[2], position: 'เจ้าพนักงานสาธารณสุข', duty: 'งานธุรการ / การเงินและบัญชี', phone: '' }),
        R({ name: P[3], position: 'แพทย์แผนไทย', duty: 'คลินิกแพทย์แผนไทย', phone: '' }),
        R({ name: P[4], position: 'ผู้ช่วยเจ้าหน้าที่สาธารณสุข', duty: 'ห้องยา / พัสดุ / ยานพาหนะ', phone: '' }),
      ],
      duty,
      incoming: [
        R({ no: no(1, d(-20)), date: d(-20), docNo: 'สน 0033.012/ว 1520', from: 'สสอ.สว่างแดนดิน', subject: 'ขอเชิญประชุมประจำเดือนผู้รับผิดชอบงาน NCD', owner: P[1], due: d(-14), status: 'เสร็จสิ้น' }),
        R({ no: no(2, d(-12)), date: d(-12), docNo: 'สน 51001/ว 845', from: 'อบจ.สกลนคร', subject: 'แจ้งแนวทางการจัดทำแผนการเงินการคลัง ปีงบประมาณ ' + fy, owner: P[2], due: d(-2), status: 'กำลังดำเนินการ' }),
        R({ no: no(3, d(-6)), date: d(-6), docNo: 'สน 0033.012/ว 1602', from: 'สสอ.สว่างแดนดิน', subject: 'การรณรงค์ป้องกันโรคไข้เลือดออก', owner: P[1], due: d(4), status: 'รอดำเนินการ' }),
        R({ no: no(4, d(-2)), date: d(-2), docNo: 'สน 0032/ว 3310', from: 'สสจ.สกลนคร', subject: 'ขอให้ส่งรายงานผลการคัดกรองผู้สูงอายุ', owner: P[0], due: d(10), status: 'รอดำเนินการ' }),
      ],
      outgoing: [
        R({ no: no(1, d(-10)), date: d(-10), to: 'สสอ.สว่างแดนดิน', subject: 'ส่งรายงานผลการดำเนินงาน EPI', owner: P[1], status: 'ส่งแล้ว' }),
        R({ no: no(2, d(-1)), date: d(-1), to: 'อบต.ทรายมูล', subject: 'ขอความอนุเคราะห์รถรับส่งผู้ป่วยติดเตียง', owner: P[0], status: 'ลงนามแล้ว' }),
      ],
      orders: [R({ no: no(1, d(-25)), date: d(-25), subject: 'แต่งตั้งคณะกรรมการตรวจรับพัสดุ', signer: DIR })],
      leave: [
        R({ person: P[3], type: 'ลาพักผ่อน', start: d(5), end: d(6), days: 2, status: 'รออนุมัติ' }),
        R({ person: P[1], type: 'ไปราชการ/อบรม', start: d(-8), end: d(-7), days: 2, status: 'อนุมัติ' }),
      ],
      vehicle: [R({ date: d(1), requester: P[0], destination: 'รพ.สว่างแดนดิน', purpose: 'ส่งต่อผู้ป่วย / รับยา', mileStart: 48210, mileEnd: '', status: 'อนุมัติ' })],
      deeka: [
        R({ no: no(1, d(-18)), date: d(-18), payee: 'ร้านวัสดุภัณฑ์สว่าง', detail: 'ค่าวัสดุสำนักงาน', category: 'ค่าวัสดุ', amount: 4850, tax: 0, status: 'เบิกจ่ายแล้ว' }),
        R({ no: no(2, d(-9)), date: d(-9), payee: 'การไฟฟ้าส่วนภูมิภาค', detail: 'ค่าไฟฟ้าประจำเดือน', category: 'ค่าสาธารณูปโภค', amount: 6320.5, tax: 0, status: 'เบิกจ่ายแล้ว' }),
        R({ no: no(3, d(-3)), date: d(-3), payee: 'บริษัทเวชภัณฑ์ (ตัวอย่าง)', detail: 'ค่าวัสดุการแพทย์', category: 'ค่าวัสดุการแพทย์', amount: 12400, tax: 124, status: 'รอเบิก' }),
      ],
      budget: [
        R({ fy, category: 'ค่าวัสดุ', budget: 60000 }),
        R({ fy, category: 'ค่าสาธารณูปโภค', budget: 90000 }),
        R({ fy, category: 'ค่าวัสดุการแพทย์', budget: 150000 }),
        R({ fy, category: 'ค่าตอบแทน', budget: 120000 }),
      ],
      procurement: [R({ no: no(1, d(-15)), date: d(-15), vendor: 'ร้านวัสดุภัณฑ์สว่าง', item: 'วัสดุสำนักงาน 12 รายการ', amount: 4850, status: 'ตรวจรับแล้ว' })],
      loan: [R({ no: no(1, d(-4)), date: d(-4), borrower: P[1], purpose: 'ยืมเงินจัดโครงการรณรงค์ไข้เลือดออก', amount: 8000, due: d(26), status: 'ยังไม่ส่งใช้' })],
      news: [
        R({ date: d(-1), title: 'เชิญชวนผู้สูงอายุรับวัคซีนไข้หวัดใหญ่ ฟรี ที่ รพ.สต.ทรายมูล', detail: 'ทุกวันจันทร์–ศุกร์ เวลา 08.30–16.00 น.', by: P[1] }),
        R({ date: d(-7), title: 'เปิดบริการคลินิกแพทย์แผนไทยช่วงบ่ายทุกวันพุธ', detail: 'จองคิวล่วงหน้าได้ที่เคาน์เตอร์', by: P[3] }),
      ],
      assignments: [
        R({ date: d(0), time: '08:30', title: 'ประชุมประจำเดือน คปสอ.สว่างแดนดิน', type: 'ประชุม', place: 'รพ.สว่างแดนดิน', assignee: DIR }),
        R({ date: d(0), time: '13:00', title: 'ออกคัดกรองความเสี่ยง NCD หมู่ 3', type: 'ออกหน่วยบริการ', place: 'ศาลากลางบ้าน หมู่ 3', assignee: P[1] }),
        R({ date: d(2), time: '09:00', title: 'อบรมฟื้นฟูความรู้ อสม.', type: 'อบรม', place: 'ห้องประชุม รพ.สต.', assignee: P[0] }),
        R({ date: d(4), time: '08:30', title: 'ตรวจนับพัสดุประจำปี', type: 'ปฏิบัติงาน', place: 'รพ.สต.ทรายมูล', assignee: P[4] }),
        R({ date: d(9), time: '09:00', title: 'ประชุมคณะกรรมการ กองทุน LTC', type: 'ประชุม', place: 'อบต.ทรายมูล', assignee: P[0] }),
      ],
      equipment: [
        R({ assetNo: '6515-001-0001/' + (fy - 3), name: 'เครื่องวัดความดันโลหิตแบบดิจิทัล', acquired: d(-1100), price: 3500, location: 'ห้องตรวจโรค', status: 'ใช้งานได้' }),
        R({ assetNo: '7440-001-0003/' + (fy - 2), name: 'คอมพิวเตอร์ตั้งโต๊ะ', acquired: d(-700), price: 22000, location: 'ห้องบัตร', status: 'ใช้งานได้' }),
        R({ assetNo: '6530-008-0002/' + (fy - 5), name: 'เตียงตรวจโรค', acquired: d(-1900), price: 9800, location: 'ห้อง ER', status: 'ชำรุด/ส่งซ่อม' }),
      ],
      supplies: [
        R({ name: 'ถุงมือยาง (กล่อง)', unit: 'กล่อง', qty: 4, min: 10, location: 'คลังพัสดุ' }),
        R({ name: 'สำลีก้อน', unit: 'ห่อ', qty: 30, min: 10, location: 'คลังพัสดุ' }),
        R({ name: 'กระดาษ A4', unit: 'รีม', qty: 12, min: 5, location: 'ห้องธุรการ' }),
      ],
      elderly: [
        R({ name: 'นายบุญมี ศรีทรายมูล', age: 78, village: 'หมู่ 2', group: 'ติดบ้าน', phone: '' }),
        R({ name: 'นางคำปุ่น ใจงาม', age: 84, village: 'หมู่ 5', group: 'ติดเตียง', phone: '' }),
        R({ name: 'นางทองใบ แสนดี', age: 67, village: 'หมู่ 1', group: 'ติดสังคม', phone: '' }),
      ],
      ems: [
        R({ date: d(3), time: '07:00', event: 'งานวิ่งการกุศลตำบลทรายมูล', place: 'สนามกีฬา อบต.ทรายมูล', team: `${P[0]}, ${P[4]}` }),
        R({ date: d(12), time: '18:00', event: 'งานบุญประจำปีวัดบ้านทรายมูล', place: 'วัดบ้านทรายมูล', team: `${P[1]}, ${P[2]}` }),
      ],
      blood: [
        R({ date: d(6), time: '08:30', place: 'ที่ว่าการอำเภอสว่างแดนดิน', person: P[0] }),
        R({ date: d(20), time: '08:30', place: 'โรงเรียนบ้านทรายมูล', person: P[2] }),
      ],
      ttm: [
        R({ date: d(0), time: '09:30 - 10:30', name: 'นางสมพร ทองดี', phone: '081-000-0001', service: 'นวดไทยเพื่อการรักษา', symptom: 'ปวดหลังส่วนล่าง', status: 'ยืนยันแล้ว' }),
        R({ date: d(0), time: '13:00 - 14:00', name: 'นายประยูร คำมูล', phone: '081-000-0002', service: 'ประคบสมุนไพร', symptom: 'ปวดเข่า', status: 'รอยืนยัน' }),
        R({ date: d(1), time: '08:30 - 09:30', name: 'นางบัวผัน สีดา', phone: '081-000-0003', service: 'อบไอน้ำสมุนไพร', symptom: 'ปวดเมื่อย', status: 'รอยืนยัน' }),
      ],
      osm: [
        R({ name: 'นางจันทร์เพ็ญ ศรีสุข', village: 'หมู่ 1', role: 'ประธาน อสม. ตำบล', phone: '', since: 2545 }),
        R({ name: 'นายสุพจน์ ทองมา', village: 'หมู่ 2', role: 'ประธาน อสม. หมู่บ้าน', phone: '', since: 2552 }),
        R({ name: 'นางลำดวน มีชัย', village: 'หมู่ 3', role: 'อสม.', phone: '', since: 2560 }),
      ],
      projects: [R({ date: d(15), title: 'โครงการรณรงค์ป้องกันโรคไข้เลือดออก ตำบลทรายมูล', target: 'ประชาชน 8 หมู่บ้าน', budget: 8000, owner: P[1], status: 'กำลังดำเนินการ' })],
      ncd: [
        R({ date: d(-5), name: 'นายเสาร์ คำภู', age: 52, village: 'หมู่ 3', sbp: 146, dbp: 92, fbs: 98 }),
        R({ date: d(-5), name: 'นางอุไร ศรีทอง', age: 47, village: 'หมู่ 3', sbp: 124, dbp: 78, fbs: 112 }),
        R({ date: d(-4), name: 'นางสาวพิมพ์ใจ ดวงดี', age: 36, village: 'หมู่ 4', sbp: 112, dbp: 72, fbs: 88 }),
      ],
      investigate: [R({ date: d(-9), disease: 'ไข้เลือดออก', patient: 'ด.ช.ตัวอย่าง (อายุ 9 ปี)', village: 'หมู่ 6', status: 'สอบสวนแล้ว' })],
      ltcClients: [
        R({ name: 'นางคำปุ่น ใจงาม', age: 84, village: 'หมู่ 5', adl: 3, cm: P[0], cg: 'นางสาวศรีไพร (CG)', careplan: 'มี Care Plan' }),
        R({ name: 'นายบุญมี ศรีทรายมูล', age: 78, village: 'หมู่ 2', adl: 9, cm: P[0], cg: 'นางหนูเพียร (CG)', careplan: 'มี Care Plan' }),
        R({ name: 'นายทองสุข พลราช', age: 71, village: 'หมู่ 7', adl: 6, cm: P[0], cg: '', careplan: 'ยังไม่มี' }),
      ],
      visitPlan: [
        R({ date: d(1), name: 'นางคำปุ่น ใจงาม', village: 'หมู่ 5', reason: 'ผู้ป่วยติดเตียง ดูแลแผลกดทับ', visitor: P[0], status: 'ตามแผน' }),
        R({ date: d(-3), name: 'นายบุญมี ศรีทรายมูล', village: 'หมู่ 2', reason: 'ผู้สูงอายุติดบ้าน ติดตามความดัน', visitor: P[1], status: 'เยี่ยมแล้ว' }),
      ],
    };
  },
};

/* ---------- Store ---------- */
window.Store = (() => {
  const KEY = SITE.storageKey;
  let db = null;
  let canPersist = true;
  const blank = () => ({ v: 1, demo: false, settings: {}, data: {} });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function save() {
    if (!canPersist) return;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { canPersist = false; }
  }
  (function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) db = JSON.parse(raw);
    } catch (e) { canPersist = false; db = null; }
    if (!db || typeof db !== 'object' || !db.data) {
      db = blank();
      db.data = Seed.build();
      db.demo = true;
      save();
    }
  })();

  const list = c => (db.data[c] = db.data[c] || []);
  return {
    all: list,
    get: (c, id) => list(c).find(r => r.id === id) || null,
    add(c, rec) {
      const r = Object.assign({}, rec, { id: uid(), createdAt: new Date().toISOString() });
      list(c).push(r); save(); return r;
    },
    update(c, id, patch) {
      const r = list(c).find(x => x.id === id);
      if (r) { Object.assign(r, patch, { updatedAt: new Date().toISOString() }); save(); }
      return r;
    },
    remove(c, id) { db.data[c] = list(c).filter(r => r.id !== id); save(); },
    settings: () => db.settings || {},
    saveSettings(s) { db.settings = Object.assign({}, db.settings, s); save(); },
    isDemo: () => !!db.demo,
    persistent: () => canPersist,
    exportJSON: () => JSON.stringify(Object.assign({ app: 'SaiMun-PHC', exportedAt: new Date().toISOString() }, db), null, 2),
    importJSON(obj) {
      if (!obj || typeof obj !== 'object' || !obj.data || typeof obj.data !== 'object') throw new Error('ไฟล์สำรองข้อมูลไม่ถูกต้อง');
      db = { v: 1, demo: !!obj.demo, settings: obj.settings || {}, data: obj.data };
      save();
    },
    reset(withDemo) {
      const keep = db.settings;
      db = blank();
      db.settings = keep;
      if (withDemo) { db.data = Seed.build(); db.demo = true; }
      save();
    },
  };
})();
