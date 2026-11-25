/* =====================================================================
   config.js — ข้อมูลหน่วยงาน + โครงสร้างเมนู + ฟิลด์ของทะเบียนทั้งหมด
   แก้ไขไฟล์นี้เพื่อเปลี่ยนชื่อ เพิ่ม/ลดเมนู ลิงก์ หรือช่องข้อมูลของทะเบียน
   (ชื่อหน่วยงาน/ผอ./หมู่บ้าน แก้ได้จากหน้า "ตั้งค่าระบบ" ด้วย)
   ===================================================================== */
window.SITE = {
  orgShort: 'รพ.สต.ทรายมูล',
  orgFull: 'โรงพยาบาลส่งเสริมสุขภาพตำบลทรายมูล',
  systemTitle: 'ระบบบริหารโรงพยาบาลส่งเสริมสุขภาพตำบลทรายมูล',
  systemName: 'SaiMun-PHC Management System',
  address: 'ตำบลทรายมูล อำเภอสว่างแดนดิน จังหวัดสกลนคร',
  director: 'นายอธิพงษ์ ภูผิว',
  directorTitle: 'ผู้อำนวยการ',
  villages: ['หมู่ 1', 'หมู่ 2', 'หมู่ 3', 'หมู่ 4', 'หมู่ 5', 'หมู่ 6', 'หมู่ 7', 'หมู่ 8'],
  rooms: ['ห้องตรวจโรค', 'ห้อง ER', 'ห้องยา'],
  storageKey: 'saimun-phc-v1',
};

(() => {
  const OPT = {
    doc: ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น'],
    approve: ['รออนุมัติ', 'อนุมัติ', 'ไม่อนุมัติ'],
    leave: ['ลาป่วย', 'ลากิจส่วนตัว', 'ลาพักผ่อน', 'ลาคลอดบุตร', 'ลาอุปสมบท', 'ไปราชการ/อบรม'],
    budget: ['ค่าจ้างชั่วคราว', 'ค่าตอบแทน', 'ค่าใช้สอย', 'ค่าวัสดุ', 'ค่ายาและเวชภัณฑ์', 'ค่าวัสดุการแพทย์', 'ค่าสาธารณูปโภค', 'ค่าครุภัณฑ์', 'ค่าที่ดินและสิ่งก่อสร้าง', 'อื่น ๆ'],
    ttmTime: ['08:30 - 09:30', '09:30 - 10:30', '10:30 - 11:30', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00'],
    ttmService: ['นวดไทยเพื่อการรักษา', 'นวดเพื่อสุขภาพ', 'ประคบสมุนไพร', 'อบไอน้ำสมุนไพร', 'ทับหม้อเกลือ (หญิงหลังคลอด)', 'พอกเข่า'],
    ttmStatus: ['รอยืนยัน', 'ยืนยันแล้ว', 'มารับบริการแล้ว', 'ยกเลิก'],
    asgType: ['ประชุม', 'อบรม', 'ปฏิบัติงาน', 'ออกหน่วยบริการ'],
  };

  /* ---------- ฟิลด์คำนวณ ---------- */
  const budgetUsed = r => Store.all('deeka')
    .filter(x => x.category === r.category && String(U.fyOf(x.date)) === String(r.fy))
    .reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const bpResult = r => {
    const s = +r.sbp, d = +r.dbp;
    if (!s || !d) return '';
    if (s >= 140 || d >= 90) return 'สงสัยป่วย';
    if (s >= 120 || d >= 80) return 'เสี่ยง';
    return 'ปกติ';
  };
  const dmResult = r => {
    const f = +r.fbs;
    if (!f) return '';
    if (f >= 126) return 'สงสัยป่วย';
    if (f >= 100) return 'เสี่ยง';
    return 'ปกติ';
  };
  const adlGroup = r => {
    if (r.adl === '' || r.adl == null) return '';
    const a = +r.adl;
    return a >= 12 ? 'ติดสังคม' : a >= 5 ? 'ติดบ้าน' : 'ติดเตียง';
  };

  /*
    รูปแบบเมนูย่อย (item):
      schema : ทะเบียนภายใน (ตาราง + ฟอร์มเพิ่ม/แก้ไข/ลบ + ส่งออก CSV)
      page   : หน้าพิเศษ ('calendar')
      href   : ลิงก์ไปเว็บภายนอก (เปิดแท็บใหม่)
      soon   : [รายการความสามารถ] = เมนูที่รอพัฒนา
    ชนิดฟิลด์: text | textarea | date | time | number | money | select | staff | village | auto(ออกเลขอัตโนมัติ)
    ตัวเลือกฟิลด์: req=บังคับกรอก, hide=ไม่แสดงในตาราง, wide=เต็มแถวในฟอร์ม, badge=แสดงเป็นป้ายสถานะ, compute=ฟังก์ชันคำนวณ
  */
  window.GROUPS = [
    {
      key: 'admin', title: 'งานธุรการ', emoji: '📋', tone: 'caramel',
      items: [
        { key: 'incoming', label: 'ทะเบียนหนังสือรับ', emoji: '📥', desc: 'ลงรับหนังสือ ติดตามกำหนดดำเนินการ', schema: { dateKey: 'date', fields: [
          { k: 'no', label: 'เลขรับ', type: 'auto' },
          { k: 'date', label: 'วันที่รับ', type: 'date', req: 1, def: 'today' },
          { k: 'docNo', label: 'เลขที่หนังสือ' },
          { k: 'from', label: 'จาก', req: 1 },
          { k: 'subject', label: 'เรื่อง', req: 1, wide: 1 },
          { k: 'owner', label: 'ผู้รับผิดชอบ', type: 'staff' },
          { k: 'due', label: 'กำหนดดำเนินการ', type: 'date' },
          { k: 'status', label: 'สถานะ', type: 'select', options: OPT.doc, badge: 1 },
        ] } },
        { key: 'outgoing', label: 'ทะเบียนหนังสือส่ง', emoji: '📤', desc: 'ออกเลขที่หนังสือส่ง ติดตามสถานะ', schema: { dateKey: 'date', fields: [
          { k: 'no', label: 'เลขที่ส่ง', type: 'auto' },
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'to', label: 'ถึง', req: 1 },
          { k: 'subject', label: 'เรื่อง', req: 1, wide: 1 },
          { k: 'owner', label: 'ผู้รับผิดชอบ', type: 'staff' },
          { k: 'status', label: 'สถานะ', type: 'select', options: ['ร่าง', 'ลงนามแล้ว', 'ส่งแล้ว'], badge: 1 },
        ] } },
        { key: 'orders', label: 'ทะเบียนคำสั่ง', emoji: '📜', desc: 'ออกเลขคำสั่ง', schema: { dateKey: 'date', fields: [
          { k: 'no', label: 'เลขที่คำสั่ง', type: 'auto' },
          { k: 'date', label: 'ลงวันที่', type: 'date', req: 1, def: 'today' },
          { k: 'subject', label: 'เรื่อง', req: 1, wide: 1 },
          { k: 'signer', label: 'ผู้ลงนาม', type: 'staff', def: 'director' },
        ] } },
        { key: 'announce', label: 'ทะเบียนประกาศ', emoji: '📢', desc: 'ออกเลขประกาศ', schema: { dateKey: 'date', fields: [
          { k: 'no', label: 'เลขที่ประกาศ', type: 'auto' },
          { k: 'date', label: 'ลงวันที่', type: 'date', req: 1, def: 'today' },
          { k: 'subject', label: 'เรื่อง', req: 1, wide: 1 },
          { k: 'signer', label: 'ผู้ลงนาม', type: 'staff', def: 'director' },
        ] } },
        { key: 'contract', label: 'ทะเบียนคุมเลขหนังสือสัญญา', emoji: '🤝', desc: 'ออกเลขหนังสือสัญญา', schema: { dateKey: 'date', fields: [
          { k: 'no', label: 'เลขที่สัญญา', type: 'auto' },
          { k: 'date', label: 'วันที่ทำสัญญา', type: 'date', req: 1, def: 'today' },
          { k: 'party', label: 'คู่สัญญา', req: 1 },
          { k: 'subject', label: 'รายการ', req: 1, wide: 1 },
          { k: 'amount', label: 'วงเงิน (บาท)', type: 'money' },
        ] } },
        { key: 'certificate', label: 'ทะเบียนคุมเลขที่เกียรติบัตร', emoji: '🏅', desc: 'ออกเลขเกียรติบัตร', schema: { dateKey: 'date', fields: [
          { k: 'no', label: 'เลขที่', type: 'auto' },
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'recipient', label: 'ผู้ได้รับ', req: 1 },
          { k: 'event', label: 'กิจกรรม/โครงการ', wide: 1 },
        ] } },
        { key: 'leave', label: 'ทะเบียนควบคุมวันลา', emoji: '🗓️', desc: 'ยื่นใบลา อนุมัติ สรุปวันลา', schema: { dateKey: 'start', fields: [
          { k: 'person', label: 'ผู้ลา', type: 'staff', req: 1 },
          { k: 'type', label: 'ประเภทการลา', type: 'select', options: OPT.leave },
          { k: 'start', label: 'ตั้งแต่วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'end', label: 'ถึงวันที่', type: 'date', req: 1, def: 'today' },
          { k: 'days', label: 'จำนวนวัน', type: 'number', def: 1 },
          { k: 'status', label: 'สถานะ', type: 'select', options: OPT.approve, badge: 1 },
          { k: 'note', label: 'หมายเหตุ', type: 'textarea', hide: 1 },
        ] } },
        { key: 'vehicle', label: 'ทะเบียนควบคุมยานพาหนะ', emoji: '🚐', desc: 'ขอใช้รถ อนุมัติ บันทึกเลขไมล์', schema: { dateKey: 'date', fields: [
          { k: 'date', label: 'วันที่ใช้รถ', type: 'date', req: 1, def: 'today' },
          { k: 'requester', label: 'ผู้ขอใช้', type: 'staff', req: 1 },
          { k: 'destination', label: 'ไปที่', req: 1 },
          { k: 'purpose', label: 'วัตถุประสงค์', wide: 1 },
          { k: 'mileStart', label: 'เลขไมล์เริ่ม', type: 'number', hide: 1 },
          { k: 'mileEnd', label: 'เลขไมล์กลับ', type: 'number', hide: 1 },
          { k: 'km', label: 'ระยะทาง (กม.)', type: 'number', compute: r => (r.mileEnd && r.mileStart) ? (+r.mileEnd - +r.mileStart) : '' },
          { k: 'status', label: 'สถานะ', type: 'select', options: OPT.approve, badge: 1 },
        ] } },
        { key: 'survey', label: 'ประเมินความพึงพอใจ', emoji: '📊', desc: 'แบบประเมินผ่าน QR Code', soon: ['แบบประเมินความพึงพอใจผ่าน QR Code', 'แดชบอร์ดสรุปผลรายเดือน/รายไตรมาส', 'ส่งออกรายงานผลความพึงพอใจ'] },
      ],
    },
    {
      key: 'finance', title: 'งานการเงินและบัญชี', emoji: '💰', tone: 'amber',
      items: [
        { key: 'deeka', label: 'ทะเบียนคุมฎีกาเบิกจ่าย', emoji: '🧾', desc: 'ฎีกาเบิกจ่าย ภาษี ตัดยอดงบตามหมวดอัตโนมัติ', schema: { dateKey: 'date', fields: [
          { k: 'no', label: 'เลขที่ฎีกา', type: 'auto' },
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'payee', label: 'ผู้รับเงิน', req: 1 },
          { k: 'detail', label: 'รายการ', req: 1, wide: 1 },
          { k: 'category', label: 'หมวดเงินบำรุง', type: 'select', options: OPT.budget },
          { k: 'amount', label: 'จำนวนเงิน (บาท)', type: 'money', req: 1 },
          { k: 'tax', label: 'ภาษีหัก ณ ที่จ่าย', type: 'money', hide: 1 },
          { k: 'status', label: 'สถานะ', type: 'select', options: ['รอเบิก', 'เบิกจ่ายแล้ว'], badge: 1 },
        ] } },
        { key: 'budget', label: 'งบประมาณตามหมวดเงินบำรุง', emoji: '📊', desc: 'ตั้งงบต้นปีรายหมวด ดูยอดใช้ไป/คงเหลือ', schema: { fyKey: 'fy', fields: [
          { k: 'fy', label: 'ปีงบประมาณ', type: 'number', req: 1, def: 'fy' },
          { k: 'category', label: 'หมวด', type: 'select', options: OPT.budget, req: 1 },
          { k: 'budget', label: 'งบที่ตั้งไว้ (บาท)', type: 'money', req: 1 },
          { k: 'used', label: 'ใช้ไปแล้ว', type: 'money', compute: budgetUsed },
          { k: 'remain', label: 'คงเหลือ', type: 'money', compute: r => (Number(r.budget) || 0) - budgetUsed(r) },
        ] } },
        { key: 'procurement', label: 'ทะเบียนคุมการสั่งซื้อสั่งจ้าง', emoji: '🛒', desc: 'ใบสั่งซื้อ/สั่งจ้าง เลขที่เรียงอัตโนมัติ', schema: { dateKey: 'date', fields: [
          { k: 'no', label: 'เลขที่ใบสั่ง', type: 'auto' },
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'vendor', label: 'ผู้ขาย/ผู้รับจ้าง', req: 1 },
          { k: 'item', label: 'รายการ', req: 1, wide: 1 },
          { k: 'amount', label: 'จำนวนเงิน (บาท)', type: 'money' },
          { k: 'status', label: 'สถานะ', type: 'select', options: ['ดำเนินการ', 'ตรวจรับแล้ว'], badge: 1 },
        ] } },
        { key: 'loan', label: 'ทะเบียนคุมสัญญายืมเงิน', emoji: '💵', desc: 'สัญญายืมเงิน ติดตามการส่งใช้', schema: { dateKey: 'date', fields: [
          { k: 'no', label: 'เลขที่สัญญายืม', type: 'auto' },
          { k: 'date', label: 'วันที่ยืม', type: 'date', req: 1, def: 'today' },
          { k: 'borrower', label: 'ผู้ยืม', type: 'staff', req: 1 },
          { k: 'purpose', label: 'วัตถุประสงค์', wide: 1 },
          { k: 'amount', label: 'จำนวนเงิน (บาท)', type: 'money', req: 1 },
          { k: 'due', label: 'กำหนดส่งใช้', type: 'date' },
          { k: 'status', label: 'สถานะ', type: 'select', options: ['ยังไม่ส่งใช้', 'ส่งใช้แล้ว'], badge: 1 },
        ] } },
        { key: 'cheque', label: 'ทะเบียนคุมการเบิกจ่ายเล่มเช็ค', emoji: '🏦', desc: 'ควบคุมการสั่งจ่ายเช็ค', schema: { dateKey: 'date', fields: [
          { k: 'chequeNo', label: 'เลขที่เช็ค', req: 1 },
          { k: 'date', label: 'วันที่สั่งจ่าย', type: 'date', req: 1, def: 'today' },
          { k: 'payee', label: 'สั่งจ่าย', req: 1 },
          { k: 'amount', label: 'จำนวนเงิน (บาท)', type: 'money', req: 1 },
          { k: 'bank', label: 'ธนาคาร/บัญชี' },
        ] } },
        { key: 'receipt', label: 'ทะเบียนคุมใบเสร็จรับเงิน', emoji: '🧾', desc: 'ควบคุมเล่ม/เลขที่ใบเสร็จรับเงิน', schema: { dateKey: 'date', fields: [
          { k: 'book', label: 'เล่มที่', req: 1 },
          { k: 'no', label: 'เลขที่', req: 1 },
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'payer', label: 'ได้รับเงินจาก', req: 1 },
          { k: 'item', label: 'รายการ', wide: 1 },
          { k: 'amount', label: 'จำนวนเงิน (บาท)', type: 'money' },
        ] } },
        { key: 'elaas', label: 'ระบบการเงินและบัญชี (New e-LAAS)', emoji: '🧮', desc: 'ระบบบัญชีคอมพิวเตอร์ อปท.', href: 'https://laas.dla.go.th' },
        { key: 'sso-pay', label: 'ระบบจ่ายเงินประกันสังคมออนไลน์', emoji: '🛡️', desc: 'e-Service สำนักงานประกันสังคม', href: 'https://www.sso.go.th/eservices/esv/login.do' },
        { key: 'baac', label: 'ธ.ก.ส. Corporate Banking', emoji: '🏦', desc: 'โอนจ่ายผ่าน BAAC Corporate', href: 'https://corp.inbaac.com/corp-webe/auth/login' },
        { key: 'ktb', label: 'Krungthai Corporate Online', emoji: '🏦', desc: 'โอนจ่ายผ่าน Krungthai Corporate', href: 'https://www.bizgrowing.krungthai.com/corporate/' },
        { key: 'qubit', label: 'Qubit Portal System', emoji: '🧩', desc: 'ระบบงาน รพ.สต. สังกัด อบจ.สกลนคร', href: 'https://qubitco.online/portal' },
      ],
    },
    {
      key: 'info', title: 'งานข้อมูลข่าวสารและสารสนเทศ', emoji: '🌐', tone: 'cocoa',
      items: [
        { key: 'news', label: 'ข่าวประชาสัมพันธ์', emoji: '📰', desc: 'ข่าวสาร กิจกรรม ประกาศของ รพ.สต.', schema: { dateKey: 'date', fields: [
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'title', label: 'หัวข้อข่าว', req: 1, wide: 1 },
          { k: 'detail', label: 'รายละเอียด', type: 'textarea', hide: 1 },
          { k: 'by', label: 'ผู้ประกาศ', type: 'staff' },
        ] } },
        { key: 'pop-report', label: 'รายงานประชากรตามเงื่อนไข', emoji: '👨‍👩‍👧', desc: 'ดึงข้อมูลจาก JHCIS (ต้องเชื่อมฐานข้อมูล)', soon: ['เลือกกลุ่มอายุ หมู่บ้าน เพศ สิทธิ', 'ส่งออกรายชื่อเป็น Excel', 'ต้องเชื่อมต่อฐานข้อมูล JHCIS ของ รพ.สต.ทรายมูล'] },
        { key: 'onestop', label: 'NHSO Digital Platform (One Stop Service)', emoji: '🏥', desc: 'สปสช.', href: 'https://iam.nhso.go.th/realms/nhso/protocol/openid-connect/auth?response_type=code&client_id=nhso-digital-platform&redirect_uri=https%3A%2F%2Fserviceunit-nhsodp.nhso.go.th%2Flogin&scope=openid+mobile+email+profile' },
        { key: 'oppp', label: 'โปรแกรม OP/PP', emoji: '📤', desc: 'สปสช. บันทึก/ส่งข้อมูลบริการ', href: 'https://op.nhso.go.th/op/main/MainWebAction.do' },
        { key: 'eclaim', label: 'ระบบ E-CLAIM', emoji: '💳', desc: 'เบิกจ่ายค่าบริการ สปสช.', href: 'https://eclaim.nhso.go.th/webComponent/main/MainWebAction.do' },
        { key: 'srm', label: 'ระบบตรวจสอบสิทธิ์', emoji: '🔎', desc: 'ตรวจสอบสิทธิ์การรักษา สปสช.', href: 'https://srmportal.nhso.go.th/' },
        { key: 'smt', label: 'Smart Money Transfer (SMT)', emoji: '💹', desc: 'สรุปงบเบิกจ่ายกองทุน สปสช.', href: 'https://smt.nhso.go.th/smtf/#/home/budget/summary' },
        { key: 'eportal', label: 'e-Portal ขึ้นทะเบียน', emoji: '🗂️', desc: 'ศูนย์กลางงานขึ้นทะเบียน สปสช.', href: 'https://ossregister.nhso.go.th/#/public-portal' },
        { key: 'drugcat', label: 'โปรแกรม Drug Catalogue', emoji: '💊', desc: 'บัญชียาและรหัสยา สปสช.', href: 'https://drug.nhso.go.th/drugcatalogue/' },
        { key: 'sso', label: 'โปรแกรมเบิกประกันสังคม', emoji: '🛡️', desc: 'อัปโหลดข้อมูลเบิกประกันสังคม', href: 'https://cs10.chi.or.th/ssopupload' },
        { key: 'mohp', label: 'ระบบหมอพร้อม Digital ID', emoji: '🆔', desc: 'MOPH Digital ID', href: 'https://moph.id.th/oauth/login' },
        { key: 'hdc', label: 'HDC จังหวัดสกลนคร', emoji: '📈', desc: 'Health Data Center สสจ.สกลนคร', href: 'https://hdc.moph.go.th/snk/public/main' },
      ],
    },
    {
      key: 'manage', title: 'งานบริหาร', emoji: '🏛️', tone: 'copper',
      items: [
        { key: 'personnel', label: 'ทำเนียบบุคลากร', emoji: '👥', desc: 'ข้อมูลบุคลากรและหน้าที่รับผิดชอบ', schema: { fields: [
          { k: 'name', label: 'ชื่อ-สกุล', req: 1 },
          { k: 'position', label: 'ตำแหน่ง', req: 1 },
          { k: 'duty', label: 'หน้าที่รับผิดชอบ', wide: 1 },
          { k: 'phone', label: 'เบอร์โทร' },
        ] } },
        { key: 'duty', label: 'ตารางเวรประจำวัน / นอกเวลา', emoji: '🕘', desc: 'จัดเวรห้องตรวจ ER ห้องยา และเวรนอกเวลา', schema: { dateKey: 'date', asc: 0, fields: [
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'room', label: 'จุดปฏิบัติงาน', type: 'room', req: 1 },
          { k: 'person', label: 'ผู้ปฏิบัติงาน', type: 'staff', req: 1 },
          { k: 'note', label: 'หมายเหตุ' },
        ] } },
      ],
    },
    {
      key: 'assign', title: 'ปฏิทินมอบหมายงาน', emoji: '🗂️', tone: 'honey',
      items: [
        { key: 'assignments', label: 'ปฏิทินมอบหมายงาน', emoji: '📅', desc: 'มอบหมายงาน ประชุม อบรม ออกหน่วยบริการ', page: 'calendar', schema: { dateKey: 'date', timeKey: 'time', fields: [
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'time', label: 'เวลา', type: 'time' },
          { k: 'title', label: 'เรื่อง/งานที่มอบหมาย', req: 1, wide: 1 },
          { k: 'type', label: 'ประเภท', type: 'select', options: OPT.asgType },
          { k: 'place', label: 'สถานที่' },
          { k: 'assignee', label: 'ผู้ได้รับมอบหมาย', type: 'staff', req: 1 },
          { k: 'note', label: 'หมายเหตุ', type: 'textarea', hide: 1 },
        ] } },
      ],
    },
    {
      key: 'supply', title: 'งานครุภัณฑ์-พัสดุ', emoji: '📦', tone: 'terracotta',
      items: [
        { key: 'equipment', label: 'ทะเบียนครุภัณฑ์', emoji: '🖥️', desc: 'เลขครุภัณฑ์ ที่ตั้ง สถานะการใช้งาน', schema: { fields: [
          { k: 'assetNo', label: 'เลขครุภัณฑ์', req: 1 },
          { k: 'name', label: 'รายการ', req: 1, wide: 1 },
          { k: 'acquired', label: 'วันที่ได้มา', type: 'date' },
          { k: 'price', label: 'ราคา (บาท)', type: 'money' },
          { k: 'location', label: 'ที่ตั้ง' },
          { k: 'status', label: 'สถานะ', type: 'select', options: ['ใช้งานได้', 'ชำรุด/ส่งซ่อม', 'จำหน่ายแล้ว'], badge: 1 },
        ] } },
        { key: 'supplies', label: 'ทะเบียนพัสดุ / วัสดุคงคลัง', emoji: '📦', desc: 'คงเหลือ จุดสั่งซื้อ แจ้งเตือนใกล้หมด', schema: { fields: [
          { k: 'name', label: 'รายการ', req: 1, wide: 1 },
          { k: 'unit', label: 'หน่วยนับ' },
          { k: 'qty', label: 'คงเหลือ', type: 'number', req: 1 },
          { k: 'min', label: 'จุดสั่งซื้อ', type: 'number' },
          { k: 'stock', label: 'สถานะคงคลัง', badge: 1, compute: r => (r.qty === '' || r.qty == null) ? '' : (+r.qty <= +(r.min || 0) ? 'ใกล้หมด' : 'เพียงพอ') },
          { k: 'location', label: 'ที่เก็บ', hide: 1 },
        ] } },
      ],
    },
    {
      key: 'nursing', title: 'งานการพยาบาล', emoji: '🩺', tone: 'chestnut',
      items: [
        { key: 'elderly', label: 'ทะเบียนผู้สูงอายุ', emoji: '👵', desc: 'รายชื่อผู้สูงอายุ กรองรายหมู่บ้าน', schema: { fields: [
          { k: 'name', label: 'ชื่อ-สกุล', req: 1 },
          { k: 'age', label: 'อายุ (ปี)', type: 'number' },
          { k: 'village', label: 'หมู่บ้าน', type: 'village', req: 1 },
          { k: 'group', label: 'กลุ่ม', type: 'select', options: ['ติดสังคม', 'ติดบ้าน', 'ติดเตียง'], badge: 1 },
          { k: 'phone', label: 'เบอร์โทร' },
          { k: 'caregiver', label: 'ผู้ดูแล', hide: 1 },
        ] } },
        { key: 'disabled', label: 'ทะเบียนผู้พิการ', emoji: '♿', desc: 'ประเภทความพิการ บัตร เบี้ยความพิการ', schema: { fields: [
          { k: 'name', label: 'ชื่อ-สกุล', req: 1 },
          { k: 'village', label: 'หมู่บ้าน', type: 'village', req: 1 },
          { k: 'type', label: 'ประเภทความพิการ', type: 'select', options: ['ทางการเห็น', 'ทางการได้ยิน/สื่อความหมาย', 'ทางการเคลื่อนไหว/ร่างกาย', 'ทางจิตใจ/พฤติกรรม', 'ทางสติปัญญา', 'ทางการเรียนรู้', 'ออทิสติก'] },
          { k: 'card', label: 'บัตรคนพิการ', type: 'select', options: ['มีบัตร', 'ยังไม่มีบัตร'], badge: 1 },
          { k: 'allowance', label: 'เบี้ยความพิการ', type: 'select', options: ['ได้รับเบี้ย', 'ยังไม่ได้รับ'], badge: 1 },
        ] } },
        { key: 'mental', label: 'ทะเบียนผู้ป่วยจิตเวช', emoji: '🧠', desc: 'ความเสี่ยง การกินยา วันนัด', schema: { fields: [
          { k: 'name', label: 'ชื่อ-สกุล', req: 1 },
          { k: 'village', label: 'หมู่บ้าน', type: 'village', req: 1 },
          { k: 'dx', label: 'การวินิจฉัย' },
          { k: 'risk', label: 'ระดับความเสี่ยง', type: 'select', options: ['ต่ำ', 'ปานกลาง', 'สูง (SMI-V)'], badge: 1 },
          { k: 'meds', label: 'การกินยา', type: 'select', options: ['กินยาสม่ำเสมอ', 'ขาดยา'], badge: 1 },
          { k: 'nextAppt', label: 'วันนัดครั้งถัดไป', type: 'date' },
        ] } },
        { key: 'ems', label: 'เวรออกหน่วยปฐมพยาบาล', emoji: '🚑', desc: 'จัดทีมออกหน่วยปฐมพยาบาลในงานต่าง ๆ', schema: { dateKey: 'date', fields: [
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'time', label: 'เวลา', type: 'time' },
          { k: 'event', label: 'งาน/กิจกรรม', req: 1, wide: 1 },
          { k: 'place', label: 'สถานที่' },
          { k: 'team', label: 'ทีมที่ออกหน่วย', req: 1 },
        ] } },
        { key: 'blood', label: 'เวรออกรับบริจาคโลหิต', emoji: '🩸', desc: 'ตารางเวรออกหน่วยรับบริจาคโลหิต', schema: { dateKey: 'date', fields: [
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'time', label: 'เวลา', type: 'time' },
          { k: 'place', label: 'สถานที่', req: 1, wide: 1 },
          { k: 'person', label: 'ผู้ออกหน่วย', type: 'staff', req: 1 },
        ] } },
      ],
    },
    {
      key: 'thai', title: 'งานคลินิกแพทย์แผนไทย', emoji: '🌿', tone: 'mocha',
      items: [
        { key: 'ttm', label: 'ระบบจองคิวบริการแพทย์แผนไทย', emoji: '💆', desc: 'รับจองคิว จัดการคิวรายวัน', schema: { dateKey: 'date', timeKey: 'time', fields: [
          { k: 'date', label: 'วันที่', type: 'date', req: 1, def: 'today' },
          { k: 'time', label: 'ช่วงเวลา', type: 'select', options: OPT.ttmTime },
          { k: 'name', label: 'ชื่อผู้รับบริการ', req: 1 },
          { k: 'phone', label: 'เบอร์โทร' },
          { k: 'service', label: 'บริการ', type: 'select', options: OPT.ttmService },
          { k: 'symptom', label: 'อาการ' },
          { k: 'status', label: 'สถานะ', type: 'select', options: OPT.ttmStatus, badge: 1 },
        ] } },
        { key: 'herbs', label: 'คลังยาสมุนไพร', emoji: '🌱', desc: 'รับ-จ่ายยาสมุนไพร คงเหลือ', soon: ['ทะเบียนยาสมุนไพรและวันหมดอายุ', 'รับเข้า/จ่ายออก', 'แจ้งเตือนยาใกล้หมด/ใกล้หมดอายุ'] },
      ],
    },
    {
      key: 'academic', title: 'งานวิชาการและงานสุขภาพภาคประชาชน', emoji: '🎓', tone: 'caramel',
      items: [
        { key: 'osm', label: 'ทะเบียน อสม.', emoji: '🙋', desc: 'รายชื่อ อสม. แยกรายหมู่บ้าน', schema: { fields: [
          { k: 'name', label: 'ชื่อ-สกุล', req: 1 },
          { k: 'village', label: 'หมู่บ้าน', type: 'village', req: 1 },
          { k: 'role', label: 'ตำแหน่ง', type: 'select', options: ['อสม.', 'ประธาน อสม. หมู่บ้าน', 'ประธาน อสม. ตำบล'] },
          { k: 'phone', label: 'เบอร์โทร' },
          { k: 'since', label: 'เป็น อสม. ตั้งแต่ปี (พ.ศ.)', type: 'number' },
        ] } },
        { key: 'projects', label: 'โครงการ / การอบรม', emoji: '📚', desc: 'แผนโครงการ งบประมาณ ผู้รับผิดชอบ', schema: { dateKey: 'date', fields: [
          { k: 'date', label: 'วันที่จัด', type: 'date', req: 1, def: 'today' },
          { k: 'title', label: 'ชื่อโครงการ', req: 1, wide: 1 },
          { k: 'target', label: 'กลุ่มเป้าหมาย' },
          { k: 'budget', label: 'งบประมาณ (บาท)', type: 'money' },
          { k: 'owner', label: 'ผู้รับผิดชอบ', type: 'staff' },
          { k: 'status', label: 'สถานะ', type: 'select', options: OPT.doc, badge: 1 },
        ] } },
      ],
    },
    {
      key: 'disease', title: 'งานส่งเสริมป้องกันโรค', emoji: '🛡️', tone: 'terracotta',
      items: [
        { key: 'ncd', label: 'ระบบคัดกรองกลุ่มเสี่ยง NCD', emoji: '🩺', desc: 'คัดกรองเบาหวาน/ความดัน แปลผลอัตโนมัติ', schema: { dateKey: 'date', fields: [
          { k: 'date', label: 'วันที่คัดกรอง', type: 'date', req: 1, def: 'today' },
          { k: 'name', label: 'ชื่อ-สกุล', req: 1 },
          { k: 'age', label: 'อายุ', type: 'number' },
          { k: 'village', label: 'หมู่บ้าน', type: 'village' },
          { k: 'sbp', label: 'ความดันตัวบน (SBP)', type: 'number', hide: 1 },
          { k: 'dbp', label: 'ความดันตัวล่าง (DBP)', type: 'number', hide: 1 },
          { k: 'fbs', label: 'น้ำตาล FBS (mg/dL)', type: 'number', hide: 1 },
          { k: 'bp', label: 'ความดัน', compute: r => (r.sbp && r.dbp) ? `${r.sbp}/${r.dbp}` : '' },
          { k: 'bpRes', label: 'ผลความดัน', badge: 1, compute: bpResult },
          { k: 'dmRes', label: 'ผลน้ำตาล', badge: 1, compute: dmResult },
        ] } },
        { key: 'investigate', label: 'สอบสวนโรค', emoji: '🔬', desc: 'เปิดเคสสอบสวนโรค ติดตามสถานะ', schema: { dateKey: 'date', fields: [
          { k: 'date', label: 'วันที่รับแจ้ง', type: 'date', req: 1, def: 'today' },
          { k: 'disease', label: 'โรค', type: 'select', options: ['ไข้เลือดออก', 'อุจจาระร่วง', 'ไข้หวัดใหญ่', 'โควิด-19', 'มือเท้าปาก', 'วัณโรค', 'อื่น ๆ'] },
          { k: 'patient', label: 'ผู้ป่วย', req: 1 },
          { k: 'village', label: 'หมู่บ้าน', type: 'village' },
          { k: 'status', label: 'สถานะ', type: 'select', options: ['เปิดเคส', 'สอบสวนแล้ว', 'ปิดเคส'], badge: 1 },
        ] } },
        { key: 'epi', label: 'บันทึกการให้วัคซีน (EPI)', emoji: '💉', desc: 'วัคซีนเด็กและผู้ใหญ่', schema: { dateKey: 'date', fields: [
          { k: 'date', label: 'วันที่ฉีด', type: 'date', req: 1, def: 'today' },
          { k: 'name', label: 'ชื่อ-สกุล', req: 1 },
          { k: 'age', label: 'อายุ' },
          { k: 'vaccine', label: 'วัคซีน', type: 'select', options: ['BCG', 'HB', 'DTP-HB-Hib', 'OPV', 'IPV', 'Rota', 'MMR', 'JE', 'HPV', 'dT', 'ไข้หวัดใหญ่'] },
          { k: 'village', label: 'หมู่บ้าน', type: 'village' },
        ] } },
        { key: 'forms', label: 'ตัวอย่างแบบฟอร์มรายงาน', emoji: '🗃️', desc: 'คลังไฟล์ Word/PDF แบบฟอร์มต่าง ๆ', soon: ['อัปโหลดไฟล์ Word/PDF', 'ตั้งชื่อ เปิดดู ลบได้', 'ต้องมีพื้นที่เก็บไฟล์ (เช่น Google Drive)'] },
      ],
    },
    {
      key: 'ltc', title: 'งานดูแลผู้มีภาวะพึ่งพิง LTC', emoji: '🤝', tone: 'copper',
      items: [
        { key: 'ltcClients', label: 'ทะเบียนผู้มีภาวะพึ่งพิง', emoji: '🛏️', desc: 'คะแนน ADL จัดกลุ่มอัตโนมัติ CM/CG Care Plan', schema: { fields: [
          { k: 'name', label: 'ชื่อ-สกุล', req: 1 },
          { k: 'age', label: 'อายุ', type: 'number' },
          { k: 'village', label: 'หมู่บ้าน', type: 'village', req: 1 },
          { k: 'adl', label: 'คะแนน ADL (0-20)', type: 'number', min: 0, max: 20 },
          { k: 'adlGroup', label: 'กลุ่มตาม ADL', badge: 1, compute: adlGroup },
          { k: 'cm', label: 'Care Manager', type: 'staff' },
          { k: 'cg', label: 'Caregiver (CG)' },
          { k: 'careplan', label: 'Care Plan', type: 'select', options: ['มี Care Plan', 'ยังไม่มี'], badge: 1 },
        ] } },
      ],
    },
    {
      key: 'visit', title: 'งานเยี่ยมบ้านและงานดูแลผู้ป่วยเชิงรุก', emoji: '🏡', tone: 'chestnut',
      items: [
        { key: 'visitPlan', label: 'แผนเยี่ยมบ้านเชิงรุกประจำเดือน', emoji: '🗺️', desc: 'วางแผนและติดตามการเยี่ยมบ้าน', schema: { dateKey: 'date', fields: [
          { k: 'date', label: 'วันที่นัดเยี่ยม', type: 'date', req: 1, def: 'today' },
          { k: 'name', label: 'ผู้รับการเยี่ยม', req: 1 },
          { k: 'village', label: 'หมู่บ้าน', type: 'village', req: 1 },
          { k: 'reason', label: 'เหตุผล/กลุ่ม', wide: 1 },
          { k: 'visitor', label: 'ผู้เยี่ยม', type: 'staff' },
          { k: 'status', label: 'สถานะ', type: 'select', options: ['ตามแผน', 'เยี่ยมแล้ว', 'เลื่อน'], badge: 1 },
        ] } },
      ],
    },
  ];
})();
