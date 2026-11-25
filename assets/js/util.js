/* util.js — เครื่องมือช่วยด้านวันที่/ตัวเลข (ปกติไม่ต้องแก้ไฟล์นี้) */
window.U = (() => {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const today = () => iso(new Date());
  const addDays = (n, base = new Date()) => { const x = new Date(base); x.setDate(x.getDate() + n); return iso(x); };

  const M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const MS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const D = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  /* ปีงบประมาณ: 1 ต.ค. – 30 ก.ย. (ต.ค. 2569 = ปีงบ 2570) */
  const fyOf = s => {
    const d = typeof s === 'string' ? parse(s) : s;
    if (!d) return null;
    return d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0);
  };
  const thDate = s => { const d = parse(s); return d ? `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear() + 543}` : ''; };
  const thDateNum = s => { const d = parse(s); return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543}` : ''; };
  const thLong = (d = new Date()) => `วัน${D[d.getDay()]}ที่ ${d.getDate()} ${M[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = n => (Number(n) || 0).toLocaleString('th-TH');

  return { pad, iso, parse, today, addDays, M, MS, D, fyOf, thDate, thDateNum, thLong, esc, money, num };
})();
