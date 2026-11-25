/* =====================================================================
   app.js — หน้าจอทั้งหมดของระบบ (SPA แบบ hash route: #/...)
   ===================================================================== */
(() => {
  'use strict';
  const { esc, today, thDate, thDateNum, thLong, fyOf, money, num, iso, M, D } = U;
  const $ = (s, el = document) => el.querySelector(s);

  /* ---------- ค่าตั้ง / ค่าที่ผู้ใช้เลือก ---------- */
  const S = () => {
    const s = Object.assign({}, SITE, Store.settings());
    if (!Array.isArray(s.villages) || !s.villages.length) s.villages = SITE.villages;
    if (!Array.isArray(s.rooms) || !s.rooms.length) s.rooms = SITE.rooms;
    return s;
  };
  const PREF_KEY = SITE.storageKey + ':prefs';
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch (e) { return {}; } })();
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };

  const FY_NOW = fyOf(new Date());
  const st = { fy: prefs.fy || String(FY_NOW), filters: {}, cal: null };
  const curFY = () => (st.fy === 'all' ? FY_NOW : +st.fy);

  /* ---------- ดัชนีเมนู ---------- */
  const ITEM = {};
  GROUPS.forEach(g => g.items.forEach(it => { ITEM[it.key] = { item: it, group: g }; }));
  const tone = t => 't-' + (t || 'teal');
  const ROOM_ICON = { 'ห้องตรวจโรค': '🩺', 'ห้อง ER': '🚨', 'ห้องยา': '💊' };
  const EXTRA_ROOMS = ['เวรนอกเวลา (บ่าย)', 'เวรนอกเวลา (วันหยุด)'];
  const TYPE_TONE = { 'ประชุม': 't-teal', 'อบรม': 't-deep', 'ปฏิบัติงาน': 't-petrol', 'ออกหน่วยบริการ': 't-coral' };

  /* ---------- ป้ายสถานะ ---------- */
  const BADGE_OF = {};
  [
    ['ok', ['เสร็จสิ้น', 'อนุมัติ', 'ยืนยันแล้ว', 'ส่งใช้แล้ว', 'ใช้งานได้', 'มารับบริการแล้ว', 'ปกติ', 'ติดสังคม', 'เบิกจ่ายแล้ว', 'ตรวจรับแล้ว', 'ส่งแล้ว', 'ลงนามแล้ว', 'เยี่ยมแล้ว', 'ปิดเคส', 'เพียงพอ', 'มีบัตร', 'ได้รับเบี้ย', 'มี Care Plan', 'กินยาสม่ำเสมอ', 'ต่ำ']],
    ['warn', ['รอดำเนินการ', 'กำลังดำเนินการ', 'รออนุมัติ', 'รอยืนยัน', 'ยังไม่ส่งใช้', 'เสี่ยง', 'ติดบ้าน', 'รอเบิก', 'ใกล้หมด', 'ร่าง', 'เลื่อน', 'ยังไม่มีบัตร', 'ยังไม่ได้รับ', 'ยังไม่มี', 'ปานกลาง', 'ดำเนินการ', 'เปิดเคส', 'ตามแผน', 'สอบสวนแล้ว']],
    ['bad', ['ไม่อนุมัติ', 'ยกเลิก', 'ชำรุด/ส่งซ่อม', 'สงสัยป่วย', 'ติดเตียง', 'ขาดยา', 'สูง (SMI-V)', 'จำหน่ายแล้ว', 'เกินกำหนด']],
  ].forEach(([t, arr]) => arr.forEach(v => { BADGE_OF[v] = t; }));
  const badge = v => `<span class="badge b-${BADGE_OF[v] || 'info'}">${esc(v)}</span>`;

  /* ---------- ฟิลด์ ---------- */
  const rawOf = (f, r) => (f.compute ? f.compute(r) : r[f.k]);
  function plain(f, r) {
    const v = rawOf(f, r);
    if (v == null || v === '') return '';
    if (f.type === 'date') return thDate(v);
    if (f.type === 'money') return money(v);
    return String(v);
  }
  function cell(f, r) {
    const v = rawOf(f, r);
    if (v == null || v === '') return '<span class="dash">–</span>';
    if (f.badge) return badge(v);
    switch (f.type) {
      case 'date': return `<span class="nowrap">${esc(thDate(v))}</span>`;
      case 'money': return `<span class="num">${money(v)}</span>`;
      case 'number': return `<span class="num">${num(v)}</span>`;
      case 'auto': return `<b class="docno">${esc(v)}</b>`;
      case 'textarea': return `<span class="clip">${esc(v)}</span>`;
      default: return esc(v);
    }
  }
  const recText = (s, r) => s.fields.map(f => plain(f, r)).join(' ').toLowerCase();
  const villageKey = s => (s.fields.find(f => f.type === 'village') || {}).k;
  const statusField = s => s.fields.find(f => f.badge && f.options) || s.fields.find(f => f.badge);
  const autoField = s => s.fields.find(f => f.type === 'auto');

  function inFY(r, s) {
    if (st.fy === 'all') return true;
    if (s.fyKey) return String(r[s.fyKey]) === st.fy;
    if (s.dateKey) return !r[s.dateKey] || String(fyOf(r[s.dateKey])) === st.fy;
    return true;
  }
  function sortRows(rows, s) {
    const dk = s.dateKey, tk = s.timeKey;
    return rows.sort((a, b) => {
      if (dk) { const c = String(b[dk] || '').localeCompare(String(a[dk] || '')); if (c) return c; }
      if (tk) { const c = String(a[tk] || '').localeCompare(String(b[tk] || '')); if (c) return c; }
      return String(a.createdAt || '').localeCompare(String(b.createdAt || '')) * (dk ? -1 : 1);
    });
  }
  function filteredRows(key) {
    const s = ITEM[key].item.schema, f = st.filters[key] || {};
    let rows = Store.all(key).filter(r => inFY(r, s));
    if (f.q) { const q = f.q.trim().toLowerCase(); rows = rows.filter(r => recText(s, r).includes(q)); }
    const vk = villageKey(s);
    if (f.v && vk) rows = rows.filter(r => r[vk] === f.v);
    const sf = statusField(s);
    if (f.st && sf) rows = rows.filter(r => String(rawOf(sf, r)) === f.st);
    return sortRows(rows.slice(), s);
  }
  function nextNo(key, s, rec, af) {
    const fy = fyOf((s.dateKey && rec[s.dateKey]) || today());
    const used = Store.all(key)
      .filter(r => fyOf((s.dateKey && r[s.dateKey]) || '') === fy)
      .map(r => parseInt(String(r[af.k] || '').split('/')[0], 10) || 0);
    const n = (used.length ? Math.max(...used) : 0) + 1;
    return `${String(n).padStart(3, '0')}/${fy}`;
  }
  function defaults(s, preset) {
    const o = {};
    s.fields.forEach(f => {
      if (f.compute || f.type === 'auto') return;
      let v = f.def;
      if (v === 'today') v = today();
      else if (v === 'fy') v = curFY();
      else if (v === 'director') v = S().director;
      else if (v == null && f.type === 'select' && f.options) v = f.options[0];
      if (v != null) o[f.k] = v;
    });
    return Object.assign(o, preset || {});
  }
  const staffNames = () => Store.all('personnel').map(p => p.name).filter(Boolean);

  /* ---------- ส่วนประกอบหน้าจอ ---------- */
  const crumbs = parts => `<nav class="crumbs" aria-label="ตำแหน่งหน้า"><a href="#/">🏠 หน้าหลัก</a>${parts.map(([label, href]) =>
    ` <span aria-hidden="true">›</span> ${href ? `<a href="${href}">${esc(label)}</a>` : `<b>${esc(label)}</b>`}`).join('')}</nav>`;

  const empty = (msg, btn) => `<div class="empty"><div class="empty-ico">🗂️</div><p>${msg}</p>${btn || ''}</div>`;

  function renderSidebar(active) {
    const s = S();
    const nav = $('#sidebar .nav');
    const scroll = nav ? nav.scrollTop : 0;
    const key = (href, ico, toneCls, label, on) =>
      `<a class="nav-key${on ? ' active' : ''}" href="${href}"${on ? ' aria-current="page"' : ''}><span class="ico ${toneCls}">${ico}</span><span class="lbl">${esc(label)}</span></a>`;
    $('#sidebar').innerHTML = `
      <a class="brand" href="#/">
        <img src="assets/img/logo.svg" alt="ตรา ${esc(s.orgShort)}" width="54" height="54">
        <span><b>${esc(s.orgShort)}</b><small>${esc(s.systemName)}</small></span>
      </a>
      <nav class="nav" aria-label="เมนูหลัก">
        ${key('#/', '🏠', 't-aqua', 'หน้าหลัก (Dashboard)', active === 'home')}
        ${SITE.smartHomeVisitUrl ? `<a class="nav-key shv" href="${esc(SITE.smartHomeVisitUrl)}" target="_blank" rel="noopener noreferrer"><span class="ico" aria-hidden="true">📱</span><span class="lbl">Smart Home Visit<small>ระบบเยี่ยมบ้าน · เปิดแท็บใหม่ ↗</small></span></a>
        <button type="button" class="nav-help" data-act="shv-help">❓ เปิดไม่ได้? ดูวิธีแก้</button>` : ''}
        <div class="nav-label">กลุ่มงาน</div>
        ${GROUPS.map(g => key('#/group/' + g.key, g.emoji, tone(g.tone), g.title, active === g.key)).join('')}
        <div class="nav-label">ผู้ดูแลระบบ</div>
        ${key('#/settings', '⚙️', 't-deep', 'ตั้งค่าระบบ', active === 'settings')}
        ${key('#/backup', '💾', 't-deep', 'สำรอง / กู้คืนข้อมูล', active === 'backup')}
      </nav>
      <div class="userbox">
        <span class="avatar" aria-hidden="true">👤</span>
        <span><b>ผู้ดูแลระบบ</b><small>${Store.isDemo() ? 'โหมดต้นแบบ · ข้อมูลตัวอย่าง' : 'ข้อมูลเก็บในเครื่องนี้'}</small></span>
      </div>`;
    const nav2 = $('#sidebar .nav');
    if (nav2) nav2.scrollTop = scroll;
  }

  function buildFY() {
    const sel = $('#fySel');
    const set = new Set();
    for (let y = FY_NOW - 3; y <= FY_NOW + 1; y++) set.add(String(y));
    if (st.fy !== 'all') set.add(st.fy);
    sel.innerHTML = [...set].sort().reverse().map(y => `<option value="${y}">${y}</option>`).join('') + '<option value="all">ทุกปี</option>';
    sel.value = st.fy;
  }

  /* ---------- หน้า: แดชบอร์ด ---------- */
  function Dashboard() {
    const s = S(), t = today(), fy = curFY();
    const duty = Store.all('duty').filter(r => r.date === t);
    const extra = duty.filter(r => !s.rooms.includes(r.room));
    const ttm = Store.all('ttm').filter(r => r.date === t && r.status !== 'ยกเลิก').sort((a, b) => String(a.time).localeCompare(String(b.time)));
    const asg = Store.all('assignments').filter(r => r.date === t).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    const upcoming = k => Store.all(k).filter(r => r.date >= t).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 4);
    const ems = upcoming('ems'), blood = upcoming('blood');
    const pending = Store.all('incoming').filter(r => r.status !== 'เสร็จสิ้น');
    const overdue = pending.filter(r => r.due && r.due < t).length;
    const leaveWait = Store.all('leave').filter(r => r.status === 'รออนุมัติ').length;
    const spent = Store.all('deeka').filter(r => fyOf(r.date) === fy).reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const ltc = Store.all('ltcClients');
    const bed = ltc.filter(r => r.adl !== '' && r.adl != null && +r.adl <= 4).length;
    const news = Store.all('news').slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3);
    const now = new Date();

    const demo = Store.isDemo() && !prefs.hideDemo ? `
      <div class="demo-bar" role="note">
        <span class="demo-ico" aria-hidden="true">📌</span>
        <div><b>กำลังแสดงข้อมูลตัวอย่าง</b> เพื่อสาธิตโครงสร้างระบบ — ข้อมูลทั้งหมดเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่เชื่อมต่อฐานข้อมูลใด ๆ</div>
        <a class="b3d sm gold" href="#/backup">เริ่มใช้งานจริง</a>
        <button class="b3d sm light" data-act="hide-demo">ซ่อน</button>
      </div>` : '';

    const kpi = (href, ico, cls, label, value, hint) => `
      <a class="kpi ${cls}" href="${href}">
        <span class="kpi-ico" aria-hidden="true">${ico}</span>
        <span class="kpi-v">${value}</span>
        <span class="kpi-l">${esc(label)}</span>
        <span class="kpi-h">${hint}</span>
      </a>`;

    const listDate = (r, main, sub) => `
      <li class="li-date">
        <span class="date-pill"><b>${parseInt(r.date.slice(8), 10)}</b><small>${U.MS[+r.date.slice(5, 7) - 1]}</small></span>
        <span class="li-t"><b>${esc(main)}</b><small>${sub}</small></span>
      </li>`;

    return `${demo}
    <section class="hero">
      <div class="hero-logo"><img src="assets/img/logo.svg" alt="" width="104" height="104"></div>
      <div class="hero-txt">
        <div class="hero-date">${esc(thLong(now))}</div>
        <h1>${esc(s.systemTitle)}</h1>
        <p class="hero-sub">${esc(s.address)} · ${esc(s.systemName)}</p>
        <p class="hero-dir"><b>${esc(s.director)}</b> · ${esc(s.directorTitle)} <span class="pill">ปีงบประมาณ ${fy}</span></p>
      </div>
      <div class="hero-clock" aria-hidden="true"><span id="clock">--:--</span><small>น.</small></div>
      <svg class="dunes" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 70 Q 200 20 420 62 T 820 50 T 1200 58 V120 H0Z" fill="rgba(255,215,140,.22)"/>
        <path d="M0 92 Q 260 52 520 86 T 1000 78 T 1200 84 V120 H0Z" fill="rgba(255,225,165,.30)"/>
      </svg>
    </section>

    <section class="kpis" aria-label="ภาพรวม">
      ${kpi('#/m/incoming', '📥', 't-teal', 'หนังสือรับรอดำเนินการ', num(pending.length), overdue ? `⚠️ เกินกำหนด ${overdue} เรื่อง` : 'ไม่มีเรื่องเกินกำหนด')}
      ${kpi('#/m/leave', '🗓️', 't-aqua', 'ใบลารออนุมัติ', num(leaveWait), 'ทะเบียนควบคุมวันลา')}
      ${kpi('#/m/deeka', '🧾', 't-petrol', `เบิกจ่ายปีงบ ${fy} (บาท)`, money(spent), 'จากทะเบียนคุมฎีกา')}
      ${kpi('#/m/ltcClients', '🛏️', 't-coral', 'ผู้มีภาวะพึ่งพิงในความดูแล', num(ltc.length), `ติดเตียง ${bed} ราย`)}
    </section>

    <section class="grid3">
      <article class="card t-teal">
        <header class="card-h"><span>🩺 เวรประจำวันนี้</span><a class="b3d xs light" href="#/m/duty">✏️ แก้ไขตารางเวร</a></header>
        <div class="card-b">
          <div class="today-bar">🌤️ วัน${D[now.getDay()]} · ${thDateNum(t)}</div>
          <ul class="duty">
            ${s.rooms.map(room => {
              const who = duty.filter(r => r.room === room).map(r => r.person).join(', ');
              return `<li><span class="duty-ico" aria-hidden="true">${ROOM_ICON[room] || '🏥'}</span><span class="duty-room">${esc(room)}</span><b class="duty-who">${who ? esc(who) : '<span class="dash">ยังไม่จัดเวร</span>'}</b></li>`;
            }).join('')}
            ${extra.map(r => `<li><span class="duty-ico" aria-hidden="true">🌙</span><span class="duty-room">${esc(r.room)}</span><b class="duty-who">${esc(r.person)}</b></li>`).join('')}
          </ul>
        </div>
      </article>

      <article class="card t-slate">
        <header class="card-h"><span>💆 คิวแพทย์แผนไทยวันนี้</span><span class="h-right"><span class="count">${ttm.length} คิว</span><a href="#/m/ttm">ดูทั้งหมด</a></span></header>
        <div class="card-b">
          ${ttm.length ? `<ul class="qlist">${ttm.map(r => `
            <li><span class="time-pill">${esc(r.time || '-')}</span>
              <span class="li-t"><b>${esc(r.name)}</b><small>${esc([r.service, r.symptom].filter(Boolean).join(' · '))}</small><span class="li-badge">${badge(r.status)}</span></span>
              </li>`).join('')}</ul>`
            : empty('วันนี้ยังไม่มีคิวจอง', '<button class="b3d sm" data-act="add" data-key="ttm">+ เพิ่มคิว</button>')}
        </div>
      </article>

      <article class="card t-gold">
        <header class="card-h"><span>🗂️ มอบหมายงานวันนี้</span><span class="h-right"><span class="count">${asg.length} งาน</span><a href="#/m/assignments">ดูทั้งหมด</a></span></header>
        <div class="card-b">
          ${asg.length ? `<ul class="alist">${asg.map(r => `
            <li><b>${esc(r.title)}</b>
              <small>${esc([r.type, r.time ? r.time + ' น.' : '', r.place].filter(Boolean).join(' · '))}</small>
              <small class="who">👤 ${esc(r.assignee)}</small></li>`).join('')}</ul>`
            : empty('วันนี้ไม่มีงานที่มอบหมาย', '<button class="b3d sm" data-act="add" data-key="assignments">+ มอบหมายงาน</button>')}
        </div>
      </article>
    </section>

    <section class="grid2">
      <article class="card t-sea">
        <header class="card-h"><span>🚑 เวรออกหน่วยปฐมพยาบาล</span><a href="#/m/ems">ดูทั้งหมด</a></header>
        <div class="card-b">${ems.length ? `<ul class="dlist">${ems.map(r => listDate(r, r.event, esc([r.time ? r.time + ' น.' : '', r.place].filter(Boolean).join(' · ')) + `<br>👥 ${esc(r.team)}`)).join('')}</ul>` : empty('ยังไม่มีเวรที่กำลังจะถึง')}</div>
      </article>
      <article class="card t-coral">
        <header class="card-h"><span>🩸 เวรออกรับบริจาคโลหิต</span><a href="#/m/blood">ดูทั้งหมด</a></header>
        <div class="card-b">${blood.length ? `<ul class="dlist">${blood.map(r => listDate(r, r.place, `${r.time ? esc(r.time) + ' น. · ' : ''}👤 ${esc(r.person)}`)).join('')}</ul>` : empty('ยังไม่มีเวรที่กำลังจะถึง')}</div>
      </article>
    </section>

    <section class="grid2 news-row">
      <article class="card t-deep">
        <header class="card-h"><span>📰 ข่าวประชาสัมพันธ์ล่าสุด</span><a href="#/m/news">ดูทั้งหมด</a></header>
        <div class="card-b">${news.length ? `<ul class="nlist">${news.map(r => `<li><small>${esc(thDate(r.date))}</small><b>${esc(r.title)}</b>${r.detail ? `<span>${esc(r.detail)}</span>` : ''}</li>`).join('')}</ul>` : empty('ยังไม่มีข่าว')}</div>
      </article>
      <article class="card t-petrol">
        <header class="card-h"><span>⚡ ทางลัด</span></header>
        <div class="card-b quick">
          ${SITE.smartHomeVisitUrl ? `<a class="b3d danger span2" href="${esc(SITE.smartHomeVisitUrl)}" target="_blank" rel="noopener noreferrer">📱 เปิด Smart Home Visit (ระบบเยี่ยมบ้าน) ↗</a>
          <button type="button" class="linkish span2" data-act="shv-help">❓ เปิด Smart Home Visit ไม่ได้ / ขึ้น “Sorry, unable to open the file” — ดูวิธีแก้</button>` : ''}
          <button class="b3d" data-act="add" data-key="incoming">📥 ลงรับหนังสือ</button>
          <button class="b3d gold" data-act="add" data-key="outgoing">📤 ออกเลขหนังสือส่ง</button>
          <button class="b3d" data-act="add" data-key="ttm">💆 จองคิวแผนไทย</button>
          <button class="b3d gold" data-act="add" data-key="leave">🗓️ ยื่นใบลา</button>
          <button class="b3d" data-act="add" data-key="deeka">🧾 บันทึกฎีกา</button>
          <button class="b3d gold" data-act="add" data-key="ncd">🩺 คัดกรอง NCD</button>
        </div>
      </article>
    </section>

    <section>
      <h2 class="sec-title">เมนูกลุ่มงาน</h2>
      <div class="tiles">
        ${GROUPS.map(g => `<a class="tile3d" href="#/group/${g.key}"><span class="ico ${tone(g.tone)}" aria-hidden="true">${g.emoji}</span><span class="tt"><b>${esc(g.title)}</b><small>${g.items.length} เมนู</small></span></a>`).join('')}
      </div>
    </section>`;
  }

  /* ---------- หน้า: กลุ่มงาน ---------- */
  function itemTile(it, g) {
    const ext = !!it.href;
    const href = ext ? esc(it.href) : `#/m/${it.key}`;
    const attrs = ext ? ' target="_blank" rel="noopener noreferrer"' : '';
    const tag = ext ? '<span class="tag ext">เว็บภายนอก ↗</span>'
      : it.soon ? '<span class="tag soon">อยู่ระหว่างพัฒนา</span>'
      : `<span class="tag cnt">${num(Store.all(it.key).length)} รายการ</span>`;
    return `<a class="tile3d item" href="${href}"${attrs}>
      <span class="ico ${tone(it.tone || g.tone)}" aria-hidden="true">${it.emoji || g.emoji}</span>
      <span class="tt"><b>${esc(it.label)}</b><small>${esc(it.desc || '')}</small></span>${tag}</a>`;
  }
  function GroupPage(g) {
    const inner = g.items.filter(i => !i.href), ext = g.items.filter(i => i.href);
    return `${crumbs([[g.title]])}
    <section class="page-head ${tone(g.tone)}">
      <span class="ph-ico" aria-hidden="true">${g.emoji}</span>
      <div class="ph-t"><h1>${esc(g.title)}</h1><p>${inner.length} ระบบงานภายใน${ext.length ? ` · ${ext.length} ลิงก์ระบบภายนอก` : ''}</p></div>
    </section>
    ${inner.length ? `<h2 class="sec-title">ระบบงาน</h2><div class="tiles big">${inner.map(it => itemTile(it, g)).join('')}</div>` : ''}
    ${ext.length ? `<h2 class="sec-title">ระบบภายนอกที่เกี่ยวข้อง</h2><div class="tiles big">${ext.map(it => itemTile(it, g)).join('')}</div>` : ''}
    ${g.items.some(i => i.key === 'smarthv') ? '<button type="button" class="linkish" data-act="shv-help">❓ เปิด Smart Home Visit ไม่ได้ / ขึ้น “Sorry, unable to open the file” — ดูวิธีแก้</button>' : ''}`;
  }

  /* ---------- วิธีแก้เมื่อเปิด Smart Home Visit ไม่ได้ (บัญชี Google หลายบัญชี) ---------- */
  function shvHelp() {
    const url = SITE.smartHomeVisitUrl;
    openModal({
      title: 'เปิด Smart Home Visit ไม่ได้?',
      toneCls: 't-coral',
      body: `<div class="help">
        <p>ถ้าขึ้นข้อความ <b>“Sorry, unable to open the file at this time”</b> หรือ <b>Page Not Found</b>
        และช่องที่อยู่เว็บด้านบนมีคำว่า <code>/u/1/</code> (หรือ /u/2/) แสดงว่า<b>เบราว์เซอร์นี้เข้าสู่ระบบ Google ไว้หลายบัญชีพร้อมกัน</b>
        Google จึงพาไปผิดหน้า — ระบบ Smart Home Visit ไม่ได้เสีย</p>
        <h4>วิธีที่ 1 — เร็วที่สุด</h4>
        <ol>
          <li><b>คลิกขวา</b>ที่ปุ่ม Smart Home Visit (สีแดงในเมนูด้านซ้าย)</li>
          <li>เลือก <b>“เปิดลิงก์ในหน้าต่าง InPrivate”</b> (Microsoft Edge) หรือ <b>“เปิดลิงก์ในหน้าต่างที่ไม่ระบุตัวตน”</b> (Google Chrome)</li>
          <li>เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านตามปกติ</li>
        </ol>
        <h4>วิธีที่ 2</h4>
        <ol>
          <li>กดปุ่ม <b>“📋 คัดลอกลิงก์”</b> ด้านล่าง</li>
          <li>กด <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd> เพื่อเปิดหน้าต่างส่วนตัว</li>
          <li>วางลิงก์ด้วย <kbd>Ctrl</kbd> + <kbd>V</kbd> แล้วกด <kbd>Enter</kbd></li>
        </ol>
        <h4>แก้ถาวร</h4>
        <p>ในเบราว์เซอร์ที่ใช้เปิด Smart Home Visit ให้เข้าสู่ระบบ Google ไว้<b>เพียงบัญชีเดียว</b> หรือสร้างโปรไฟล์เบราว์เซอร์แยกไว้สำหรับงานนี้โดยเฉพาะ</p>
        <label class="copy-row"><span>ลิงก์ Smart Home Visit</span><input id="shvUrl" readonly value="${esc(url)}"></label>
      </div>`,
      foot: `<button class="b3d light" data-act="close-modal">ปิด</button>
        <button class="b3d gold" data-act="shv-copy">📋 คัดลอกลิงก์</button>
        <a class="b3d danger" href="${esc(url)}" target="_blank" rel="noopener noreferrer">เปิด Smart Home Visit ↗</a>`,
    });
  }
  function shvCopy() {
    const inp = $('#shvUrl');
    const done = () => toast('คัดลอกลิงก์แล้ว — กด Ctrl+Shift+N แล้ววางลิงก์');
    const fallback = () => { if (inp) { inp.focus(); inp.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('กด Ctrl+C เพื่อคัดลอกลิงก์ที่เลือกไว้'); } } };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(SITE.smartHomeVisitUrl).then(done, fallback);
    else fallback();
  }

  /* ---------- หน้า: ทะเบียน ---------- */
  function tableHTML(key) {
    const s = ITEM[key].item.schema;
    const rows = filteredRows(key);
    const cols = s.fields.filter(f => !f.hide);
    if (!rows.length) {
      const f = st.filters[key] || {};
      return empty(f.q || f.v || f.st ? 'ไม่พบรายการตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีรายการในปีงบประมาณนี้',
        `<button class="b3d sm" data-act="add" data-key="${key}">+ เพิ่มรายการแรก</button>`);
    }
    return `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th class="idx">#</th>${cols.map(c => `<th${c.wide ? ' class="w"' : ''}>${esc(c.label)}</th>`).join('')}<th class="act">จัดการ</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr>
        <td class="idx">${i + 1}</td>
        ${cols.map(c => `<td data-label="${esc(c.label)}"${c.wide ? ' class="w"' : ''}>${cell(c, r)}</td>`).join('')}
        <td class="act"><button class="b3d xs light" data-act="edit" data-key="${key}" data-id="${esc(r.id)}">✏️ แก้ไข</button>
          <button class="b3d xs danger" data-act="del" data-key="${key}" data-id="${esc(r.id)}" aria-label="ลบรายการ">🗑️</button></td>
      </tr>`).join('')}</tbody></table></div>
      <div class="tbl-foot">แสดง ${num(rows.length)} รายการ</div>`;
  }

  function ModulePage({ item, group }) {
    if (item.href) return LinkPage(item, group);
    if (item.soon) return SoonPage(item, group);
    if (item.page === 'calendar') return CalendarPage(item, group);
    const key = item.key, s = item.schema, f = st.filters[key] || {};
    const scoped = !!(s.dateKey || s.fyKey);
    const all = Store.all(key).filter(r => inFY(r, s));
    const ym = today().slice(0, 7);
    const sf = statusField(s), vk = villageKey(s);
    const statusOpts = sf ? (sf.options || [...new Set(Store.all(key).map(r => rawOf(sf, r)).filter(Boolean))]) : [];
    const chips = [
      `<span class="stat"><b>${num(all.length)}</b> ${scoped ? (st.fy === 'all' ? 'รายการทั้งหมด' : 'รายการในปีงบ ' + st.fy) : 'รายการทั้งหมด'}</span>`,
      s.dateKey ? `<span class="stat"><b>${num(all.filter(r => String(r[s.dateKey] || '').startsWith(ym)).length)}</b> รายการเดือนนี้</span>` : '',
      ...statusOpts.slice(0, 4).map(o => { const c = all.filter(r => String(rawOf(sf, r)) === o).length; return c ? `<span class="stat">${badge(o)} <b>${num(c)}</b></span>` : ''; }),
    ].join('');

    return `${crumbs([[group.title, '#/group/' + group.key], [item.label]])}
    <section class="page-head ${tone(item.tone || group.tone)}">
      <span class="ph-ico" aria-hidden="true">${item.emoji || group.emoji}</span>
      <div class="ph-t"><h1>${esc(item.label)}</h1><p>${esc(item.desc || '')}</p></div>
      <div class="ph-act">
        <button class="b3d gold" data-act="add" data-key="${key}">＋ เพิ่มรายการ</button>
        <button class="b3d light" data-act="csv" data-key="${key}">⬇️ ส่งออก Excel (CSV)</button>
      </div>
    </section>
    <div class="stats">${chips}</div>
    <section class="card plain">
      <div class="toolbar">
        <label class="search-in"><span aria-hidden="true">🔎</span><input type="search" data-filter="q" data-key="${key}" value="${esc(f.q || '')}" placeholder="ค้นหาใน${esc(item.label)}..." aria-label="ค้นหา"></label>
        ${vk ? `<select data-filter="v" data-key="${key}" aria-label="กรองหมู่บ้าน"><option value="">ทุกหมู่บ้าน</option>${S().villages.map(v => `<option${f.v === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>` : ''}
        ${sf ? `<select data-filter="st" data-key="${key}" aria-label="กรองสถานะ"><option value="">ทุก${esc(sf.label)}</option>${statusOpts.map(o => `<option${f.st === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>` : ''}
        ${scoped ? `<span class="fy-note">📆 ${st.fy === 'all' ? 'ทุกปีงบประมาณ' : 'ปีงบประมาณ ' + st.fy}</span>` : ''}
      </div>
      <div id="tbl">${tableHTML(key)}</div>
    </section>`;
  }

  function SoonPage(item, group) {
    return `${crumbs([[group.title, '#/group/' + group.key], [item.label]])}
    <section class="page-head ${tone(group.tone)}"><span class="ph-ico" aria-hidden="true">${item.emoji || group.emoji}</span>
      <div class="ph-t"><h1>${esc(item.label)}</h1><p>${esc(item.desc || '')}</p></div></section>
    <section class="card plain pad soon">
      <h2>🚧 อยู่ระหว่างพัฒนา</h2>
      <p>เมนูนี้วางโครงสร้างไว้แล้ว ความสามารถที่วางแผนไว้:</p>
      <ul class="checks">${item.soon.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <a class="b3d light" href="#/group/${group.key}">← กลับไป${esc(group.title)}</a>
    </section>`;
  }
  function LinkPage(item, group) {
    return `${crumbs([[group.title, '#/group/' + group.key], [item.label]])}
    <section class="card plain pad soon"><h2>${item.emoji || '🔗'} ${esc(item.label)}</h2><p>${esc(item.desc || '')}</p>
      <a class="b3d gold" href="${esc(item.href)}" target="_blank" rel="noopener noreferrer">เปิดระบบ ↗</a></section>`;
  }

  /* ---------- หน้า: ปฏิทินมอบหมายงาน ---------- */
  function CalendarPage(item, group) {
    const key = item.key;
    if (!st.cal) { const d = new Date(); st.cal = { y: d.getFullYear(), m: d.getMonth(), sel: today() }; }
    const { y, m, sel } = st.cal;
    const by = {};
    Store.all(key).forEach(e => { (by[e.date] = by[e.date] || []).push(e); });
    Object.values(by).forEach(a => a.sort((p, q) => String(p.time || '').localeCompare(String(q.time || ''))));
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const weeks = Math.ceil((first.getDay() + days) / 7);
    const t = today();
    let cells = '';
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(y, m, 1 - first.getDay() + i);
      const k = iso(d), list = by[k] || [];
      const cls = ['cal-cell', d.getMonth() !== m && 'out', k === t && 'today', k === sel && 'sel', (d.getDay() === 0 || d.getDay() === 6) && 'wkend'].filter(Boolean).join(' ');
      cells += `<button type="button" class="${cls}" data-act="cal-sel" data-d="${k}" aria-label="${esc(thDate(k))} ${list.length} งาน">
        <span class="dn">${d.getDate()}</span>
        ${list.slice(0, 3).map(e => `<span class="chip ${TYPE_TONE[e.type] || 't-teal'}">${esc((e.time ? e.time + ' ' : '') + e.title)}</span>`).join('')}
        ${list.length > 3 ? `<span class="more">+${list.length - 3} งาน</span>` : ''}
      </button>`;
    }
    const selList = by[sel] || [];
    const selD = U.parse(sel);
    return `${crumbs([[group.title, '#/group/' + group.key], [item.label]])}
    <section class="page-head ${tone(group.tone)}">
      <span class="ph-ico" aria-hidden="true">${item.emoji}</span>
      <div class="ph-t"><h1>${esc(item.label)}</h1><p>${esc(item.desc)}</p></div>
      <div class="ph-act"><button class="b3d" data-act="add" data-key="${key}" data-date="${sel}">＋ มอบหมายงาน</button>
        <button class="b3d light" data-act="csv" data-key="${key}">⬇️ ส่งออก CSV</button></div>
    </section>
    <div class="cal-wrap">
      <section class="card plain cal">
        <div class="cal-head">
          <button class="b3d sm light" data-act="cal-move" data-n="-1" aria-label="เดือนก่อน">◀</button>
          <h2>${M[m]} ${y + 543}</h2>
          <button class="b3d sm light" data-act="cal-move" data-n="1" aria-label="เดือนถัดไป">▶</button>
          <button class="b3d sm gold" data-act="cal-today">วันนี้</button>
        </div>
        <div class="cal-dow">${['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(x => `<span>${x}</span>`).join('')}</div>
        <div class="cal-grid">${cells}</div>
        <div class="legend">${Object.entries(TYPE_TONE).map(([k, c]) => `<span><i class="${c}"></i>${esc(k)}</span>`).join('')}</div>
      </section>
      <aside class="card t-aqua day-panel">
        <header class="card-h"><span>📅 ${esc(selD ? `วัน${D[selD.getDay()]}ที่ ${thDate(sel)}` : '')}</span></header>
        <div class="card-b">
          ${selList.length ? `<ul class="alist">${selList.map(e => `<li>
              <b>${esc(e.title)}</b>
              <small>${esc([e.type, e.time ? e.time + ' น.' : '', e.place].filter(Boolean).join(' · '))}</small>
              <small class="who">👤 ${esc(e.assignee)}</small>
              <span class="li-act"><button class="b3d xs light" data-act="edit" data-key="${key}" data-id="${esc(e.id)}">✏️ แก้ไข</button>
              <button class="b3d xs danger" data-act="del" data-key="${key}" data-id="${esc(e.id)}" aria-label="ลบ">🗑️</button></span>
            </li>`).join('')}</ul>` : empty('ไม่มีงานในวันนี้')}
          <button class="b3d block" data-act="add" data-key="${key}" data-date="${sel}">＋ มอบหมายงานวันนี้</button>
        </div>
      </aside>
    </div>`;
  }

  /* ---------- หน้า: ค้นหาทั้งระบบ ---------- */
  function SearchPage(q) {
    const ql = q.trim().toLowerCase();
    if (!ql) return `${crumbs([['ค้นหา']])}<section class="card plain pad">${empty('พิมพ์คำค้นที่ช่องค้นหาด้านบน เช่น ปี 2570, เลขที่หนังสือ, ชื่อ, เรื่อง')}</section>`;
    const menus = Object.values(ITEM).filter(({ item, group }) => `${item.label} ${item.desc || ''} ${group.title}`.toLowerCase().includes(ql));
    const hits = [];
    Object.values(ITEM).forEach(({ item, group }) => {
      if (!item.schema) return;
      const rows = Store.all(item.key).filter(r => recText(item.schema, r).includes(ql));
      if (rows.length) hits.push({ item, group, rows });
    });
    const total = hits.reduce((a, h) => a + h.rows.length, 0);
    return `${crumbs([['ผลการค้นหา']])}
    <section class="page-head t-teal"><span class="ph-ico" aria-hidden="true">🔎</span>
      <div class="ph-t"><h1>ผลการค้นหา “${esc(q)}”</h1><p>พบ ${num(total)} รายการใน ${hits.length} ทะเบียน${menus.length ? ` · ${menus.length} เมนู` : ''} (ค้นทุกปีงบประมาณ)</p></div></section>
    ${menus.length ? `<h2 class="sec-title">เมนูที่ตรงกัน</h2><div class="tiles big">${menus.map(({ item, group }) => itemTile(item, group)).join('')}</div>` : ''}
    ${hits.map(({ item, group, rows }) => {
      const cols = item.schema.fields.filter(f => !f.hide).slice(0, 4);
      return `<section class="card plain result">
        <header class="res-h"><span class="ico ${tone(group.tone)}" aria-hidden="true">${item.emoji || group.emoji}</span><b>${esc(item.label)}</b><small>${esc(group.title)} · ${rows.length} รายการ</small>
          <a class="b3d xs light" href="#/m/${item.key}?q=${encodeURIComponent(q)}&fy=all">เปิดทะเบียน →</a></header>
        <ul>${rows.slice(0, 8).map(r => `<li>${cols.map(c => `<span>${cell(c, r)}</span>`).join('<i>·</i>')}</li>`).join('')}</ul>
        ${rows.length > 8 ? `<p class="muted">และอีก ${rows.length - 8} รายการ</p>` : ''}
      </section>`;
    }).join('')}
    ${!menus.length && !hits.length ? `<section class="card plain pad">${empty('ไม่พบข้อมูลที่ตรงกับคำค้น')}</section>` : ''}`;
  }

  /* ---------- หน้า: ตั้งค่า ---------- */
  function SettingsPage() {
    const s = S();
    const F = [['orgShort', 'ชื่อย่อหน่วยงาน'], ['orgFull', 'ชื่อเต็มหน่วยงาน'], ['systemTitle', 'ชื่อระบบ (หัวข้อหน้าหลัก)'], ['systemName', 'ชื่อระบบภาษาอังกฤษ'],
      ['address', 'ที่ตั้ง'], ['director', 'ชื่อผู้อำนวยการ'], ['directorTitle', 'ตำแหน่ง (แสดงต่อท้ายชื่อ)']];
    return `${crumbs([['ตั้งค่าระบบ']])}
    <section class="page-head t-deep"><span class="ph-ico" aria-hidden="true">⚙️</span>
      <div class="ph-t"><h1>ตั้งค่าระบบ</h1><p>ข้อมูลหน่วยงานที่แสดงบนหน้าเว็บ หมู่บ้านในเขตรับผิดชอบ และจุดปฏิบัติงานเวรประจำวัน</p></div></section>
    <section class="card plain pad">
      <form id="setForm" class="form-grid">
        ${F.map(([k, l]) => `<label class="fld${k === 'systemTitle' || k === 'address' ? ' wide' : ''}"><span>${l}</span><input name="${k}" value="${esc(s[k])}" required></label>`).join('')}
        <label class="fld"><span>หมู่บ้านในเขตรับผิดชอบ (บรรทัดละ 1 หมู่บ้าน)</span><textarea name="villages" rows="8">${esc(s.villages.join('\n'))}</textarea></label>
        <label class="fld"><span>จุดปฏิบัติงานเวรประจำวัน (บรรทัดละ 1 จุด)</span><textarea name="rooms" rows="8">${esc(s.rooms.join('\n'))}</textarea></label>
        <div class="wide form-act"><button class="b3d gold" type="submit">💾 บันทึกการตั้งค่า</button></div>
      </form>
    </section>`;
  }

  /* ---------- หน้า: สำรอง/กู้คืน ---------- */
  function BackupPage() {
    const counts = Object.values(ITEM).filter(x => x.item.schema).reduce((a, x) => a + Store.all(x.item.key).length, 0);
    return `${crumbs([['สำรอง / กู้คืนข้อมูล']])}
    <section class="page-head t-deep"><span class="ph-ico" aria-hidden="true">💾</span>
      <div class="ph-t"><h1>สำรอง / กู้คืนข้อมูล</h1><p>ข้อมูลทั้งหมด ${num(counts)} รายการ เก็บในเบราว์เซอร์เครื่องนี้${Store.persistent() ? '' : ' (⚠️ เบราว์เซอร์นี้ไม่อนุญาตให้บันทึก — ข้อมูลจะหายเมื่อปิดหน้า)'}</p></div></section>
    <div class="grid3">
      <section class="card t-teal"><header class="card-h"><span>⬇️ สำรองข้อมูล</span></header>
        <div class="card-b"><p>ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ .json เก็บไว้ หรือนำไปใช้ต่อในเครื่องอื่น</p>
        <button class="b3d block" data-act="dl-backup">ดาวน์โหลดไฟล์สำรอง</button></div></section>
      <section class="card t-petrol"><header class="card-h"><span>⬆️ กู้คืนข้อมูล</span></header>
        <div class="card-b"><p>เลือกไฟล์สำรอง (.json) — ข้อมูลปัจจุบันในเครื่องนี้จะถูกแทนที่ทั้งหมด</p>
        <label class="b3d light block file-btn">เลือกไฟล์สำรอง…<input type="file" id="restoreFile" accept=".json,application/json"></label></div></section>
      <section class="card t-coral"><header class="card-h"><span>🧹 เริ่มใช้งานจริง</span></header>
        <div class="card-b"><p>${Store.isDemo() ? 'ตอนนี้เป็น<b>ข้อมูลตัวอย่าง</b> กดปุ่มด้านล่างเพื่อล้างทิ้งก่อนเริ่มบันทึกข้อมูลจริง' : 'ล้างข้อมูลทั้งหมด หรือโหลดข้อมูลตัวอย่างกลับมาเพื่อทดลอง'}</p>
        <button class="b3d danger block" data-act="ask-reset" data-demo="0">ล้างข้อมูลทั้งหมด</button>
        <button class="b3d light block" data-act="ask-reset" data-demo="1">โหลดข้อมูลตัวอย่างใหม่</button></div></section>
    </div>`;
  }

  const NotFound = () => `<section class="card plain pad">${empty('ไม่พบหน้าที่ต้องการ', '<a class="b3d" href="#/">กลับหน้าหลัก</a>')}</section>`;

  /* ---------- Modal / Toast ---------- */
  function openModal({ title, toneCls, body, foot }) {
    $('#modal-root').innerHTML = `<div class="modal-bg" data-act="modal-bg">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-h ${toneCls || 't-teal'}"><h3>${esc(title)}</h3><button class="x" data-act="close-modal" aria-label="ปิด">✕</button></div>
        <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}
      </div></div>`;
    document.body.classList.add('modal-open');
    const first = $('#modal-root .modal-b input:not([disabled]), #modal-root .modal-b select, #modal-root .modal-b textarea, #modal-root .modal-f .b3d');
    if (first) first.focus();
  }
  function closeModal() { $('#modal-root').innerHTML = ''; document.body.classList.remove('modal-open'); }
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    $('#toast-root').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  }
  function confirmBox(title, msg, okLabel, okAttrs) {
    openModal({ title, toneCls: 't-coral', body: `<p class="confirm-msg">${msg}</p>`,
      foot: `<button class="b3d light" data-act="close-modal">ยกเลิก</button><button class="b3d danger" ${okAttrs}>${okLabel}</button>` });
  }

  function fieldInput(f, v) {
    const id = 'f_' + f.k, req = f.req ? ' required' : '', val = v == null ? '' : v;
    const opts = (list, cur) => list.map(o => `<option${String(o) === String(cur) ? ' selected' : ''}>${esc(o)}</option>`).join('');
    switch (f.type) {
      case 'auto': return `<input id="${id}" value="${esc(val || 'ออกเลขอัตโนมัติเมื่อบันทึก')}" disabled>`;
      case 'textarea': return `<textarea id="${id}" name="${f.k}" rows="3"${req}>${esc(val)}</textarea>`;
      case 'date': return `<input id="${id}" name="${f.k}" type="date" value="${esc(val)}"${req}>`;
      case 'time': return `<input id="${id}" name="${f.k}" type="time" value="${esc(val)}"${req}>`;
      case 'number': case 'money':
        return `<input id="${id}" name="${f.k}" type="number" inputmode="decimal" step="${f.type === 'money' ? '0.01' : 'any'}"${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''} value="${esc(val)}"${req}>`;
      case 'select': {
        const list = f.options.includes(val) || val === '' ? f.options : [val, ...f.options];
        return `<select id="${id}" name="${f.k}"${req}>${f.req ? '' : '<option value="">— เลือก —</option>'}${opts(list, val)}</select>`;
      }
      case 'village': {
        const vs = S().villages, list = !val || vs.includes(val) ? vs : [val, ...vs];
        return `<select id="${id}" name="${f.k}"${req}><option value="">— เลือกหมู่บ้าน —</option>${opts(list, val)}</select>`;
      }
      case 'room': {
        const rs = [...S().rooms, ...EXTRA_ROOMS], list = !val || rs.includes(val) ? rs : [val, ...rs];
        return `<select id="${id}" name="${f.k}"${req}><option value="">— เลือกจุดปฏิบัติงาน —</option>${opts(list, val)}</select>`;
      }
      case 'staff': return `<input id="${id}" name="${f.k}" list="dl-staff" value="${esc(val)}" autocomplete="off" placeholder="พิมพ์หรือเลือกรายชื่อ"${req}>`;
      default: return `<input id="${id}" name="${f.k}" value="${esc(val)}"${req}>`;
    }
  }
  function openForm(key, id, preset) {
    const ref = ITEM[key]; if (!ref) return;
    const { item, group } = ref, s = item.schema;
    const rec = id ? Store.get(key, id) : null;
    if (id && !rec) { toast('ไม่พบรายการนี้แล้ว'); return; }
    const vals = rec ? Object.assign({}, rec) : defaults(s, preset);
    const fields = s.fields.filter(f => !f.compute);
    openModal({
      title: `${rec ? 'แก้ไข' : 'เพิ่ม'} · ${item.label}`,
      toneCls: tone(item.tone || group.tone),
      body: `<form id="recForm" class="form-grid" data-key="${key}" data-id="${rec ? esc(rec.id) : ''}" novalidate>
        ${fields.map(f => `<label class="fld${f.wide || f.type === 'textarea' ? ' wide' : ''}" for="f_${f.k}"><span>${esc(f.label)}${f.req ? ' <b class="req">*</b>' : ''}</span>${fieldInput(f, vals[f.k])}</label>`).join('')}
        <datalist id="dl-staff">${staffNames().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <p class="form-err" id="formErr" role="alert" hidden></p>
      </form>`,
      foot: `<button class="b3d light" data-act="close-modal" type="button">ยกเลิก</button><button class="b3d gold" type="submit" form="recForm">💾 บันทึก</button>`,
    });
  }
  function submitRecord(form) {
    const key = form.dataset.key, id = form.dataset.id;
    const s = ITEM[key].item.schema;
    const missing = s.fields.filter(f => f.req && !f.compute && f.type !== 'auto' && !String(form.elements[f.k] ? form.elements[f.k].value : '').trim());
    if (missing.length) {
      const err = $('#formErr'); err.hidden = false; err.textContent = 'กรุณากรอก: ' + missing.map(f => f.label).join(', ');
      form.elements[missing[0].k].focus();
      return;
    }
    const rec = {};
    s.fields.forEach(f => {
      if (f.compute || f.type === 'auto') return;
      let v = form.elements[f.k] ? String(form.elements[f.k].value).trim() : '';
      if ((f.type === 'number' || f.type === 'money') && v !== '') v = Number(v);
      rec[f.k] = v;
    });
    let msg = 'บันทึกการแก้ไขแล้ว';
    if (id) Store.update(key, id, rec);
    else {
      const af = autoField(s);
      if (af) rec[af.k] = nextNo(key, s, rec, af);
      const r = Store.add(key, rec);
      msg = af ? `บันทึกแล้ว · ออกเลข ${r[af.k]}` : 'บันทึกรายการแล้ว';
    }
    if (key === 'assignments' && st.cal && rec.date) {
      const d = U.parse(rec.date); st.cal = { y: d.getFullYear(), m: d.getMonth(), sel: rec.date };
    }
    closeModal(); toast(msg); route(true);
  }

  /* ---------- ส่งออก / สำรอง ---------- */
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportCSV(key) {
    const { item } = ITEM[key], s = item.schema;
    const rows = item.page === 'calendar' ? sortRows(Store.all(key).filter(r => inFY(r, s)), s) : filteredRows(key);
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [s.fields.map(f => q(f.label)).join(','), ...rows.map(r => s.fields.map(f => q(plain(f, r))).join(','))];
    download(`${item.label}_${st.fy === 'all' ? 'ทุกปี' : 'ปีงบ' + st.fy}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    toast(`ส่งออก ${rows.length} รายการแล้ว`);
  }

  /* ---------- Router ---------- */
  function route(keepScroll) {
    const h = location.hash.slice(1) || '/';
    const [path, qs] = h.split('?');
    const q = new URLSearchParams(qs || '');
    const p = path.split('/').filter(Boolean);
    let html = '', active = '', title = '';
    try {
      if (!p.length) { active = 'home'; html = Dashboard(); }
      else if (p[0] === 'group') {
        const g = GROUPS.find(x => x.key === p[1]);
        active = g ? g.key : ''; title = g ? g.title : '';
        html = g ? GroupPage(g) : NotFound();
      } else if (p[0] === 'm') {
        const ref = ITEM[p[1]];
        if (ref && (q.has('q') || q.has('fy'))) {
          if (q.has('q')) st.filters[p[1]] = { q: q.get('q') };
          if (q.has('fy')) { st.fy = q.get('fy'); buildFY(); }
          history.replaceState(null, '', '#/m/' + p[1]);
        }
        active = ref ? ref.group.key : ''; title = ref ? ref.item.label : '';
        html = ref ? ModulePage(ref) : NotFound();
      } else if (p[0] === 'search') { title = 'ค้นหา'; html = SearchPage(q.get('q') || ''); $('#q').value = q.get('q') || ''; }
      else if (p[0] === 'settings') { active = 'settings'; title = 'ตั้งค่าระบบ'; html = SettingsPage(); }
      else if (p[0] === 'backup') { active = 'backup'; title = 'สำรองข้อมูล'; html = BackupPage(); }
      else html = NotFound();
    } catch (err) {
      console.error(err);
      html = `<section class="card plain pad"><h2>เกิดข้อผิดพลาด</h2><p>${esc(err.message)}</p></section>`;
    }
    renderSidebar(active);
    $('#view').innerHTML = html;
    const s = S();
    document.title = `${title ? title + ' · ' : ''}${s.orgShort} · ${s.systemName}`;
    document.body.classList.remove('nav-open');
    if (!keepScroll) window.scrollTo(0, 0);
    tick();
  }

  function tick() {
    const el = $('#clock');
    if (el) { const d = new Date(); el.textContent = `${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`; }
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const d = a.dataset;
    switch (d.act) {
      case 'add': openForm(d.key, null, d.date ? { date: d.date } : null); break;
      case 'edit': openForm(d.key, d.id); break;
      case 'del': {
        const r = Store.get(d.key, d.id);
        const s = ITEM[d.key].item.schema;
        const label = r ? s.fields.filter(f => !f.hide).slice(0, 3).map(f => plain(f, r)).filter(Boolean).join(' · ') : '';
        confirmBox('ยืนยันการลบ', `ต้องการลบรายการนี้ใช่หรือไม่?<br><b>${esc(label)}</b>`, '🗑️ ลบรายการ', `data-act="del-yes" data-key="${esc(d.key)}" data-id="${esc(d.id)}"`);
        break;
      }
      case 'del-yes': Store.remove(d.key, d.id); closeModal(); toast('ลบรายการแล้ว'); route(true); break;
      case 'close-modal': closeModal(); break;
      case 'modal-bg': if (e.target === a) closeModal(); break;
      case 'toggle-nav': document.body.classList.toggle('nav-open'); break;
      case 'close-nav': document.body.classList.remove('nav-open'); break;
      case 'csv': exportCSV(d.key); break;
      case 'hide-demo': prefs.hideDemo = 1; savePrefs(); route(true); break;
      case 'shv-help': shvHelp(); break;
      case 'shv-copy': shvCopy(); break;
      case 'cal-move': {
        const n = new Date(st.cal.y, st.cal.m + Number(d.n), 1);
        st.cal.y = n.getFullYear(); st.cal.m = n.getMonth(); st.cal.sel = iso(n); route(true); break;
      }
      case 'cal-today': { const n = new Date(); st.cal = { y: n.getFullYear(), m: n.getMonth(), sel: today() }; route(true); break; }
      case 'cal-sel': {
        const n = U.parse(d.d); st.cal = { y: n.getFullYear(), m: n.getMonth(), sel: d.d }; route(true);
        if (window.innerWidth < 1100) { const p = $('.day-panel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        break;
      }
      case 'dl-backup': download(`สำรองข้อมูล_รพสต_ทรายมูล_${today()}.json`, Store.exportJSON(), 'application/json'); toast('ดาวน์โหลดไฟล์สำรองแล้ว'); break;
      case 'ask-reset':
        confirmBox(d.demo === '1' ? 'โหลดข้อมูลตัวอย่างใหม่' : 'ล้างข้อมูลทั้งหมด',
          'ข้อมูลทั้งหมดในเครื่องนี้จะถูกลบ (การตั้งค่าหน่วยงานยังคงอยู่) แนะนำให้กด “ดาวน์โหลดไฟล์สำรอง” ก่อน<br>ต้องการดำเนินการต่อหรือไม่?',
          'ยืนยัน', `data-act="do-reset" data-demo="${d.demo}"`);
        break;
      case 'do-reset': Store.reset(d.demo === '1'); prefs.hideDemo = 0; savePrefs(); closeModal(); toast(d.demo === '1' ? 'โหลดข้อมูลตัวอย่างแล้ว' : 'ล้างข้อมูลแล้ว พร้อมใช้งานจริง'); route(); break;
      default: break;
    }
  });

  document.addEventListener('submit', e => {
    if (e.target.id === 'recForm') { e.preventDefault(); submitRecord(e.target); }
    else if (e.target.id === 'setForm') {
      e.preventDefault();
      const f = e.target, o = {};
      ['orgShort', 'orgFull', 'systemTitle', 'systemName', 'address', 'director', 'directorTitle'].forEach(k => { o[k] = f.elements[k].value.trim(); });
      o.villages = f.elements.villages.value.split('\n').map(x => x.trim()).filter(Boolean);
      o.rooms = f.elements.rooms.value.split('\n').map(x => x.trim()).filter(Boolean);
      Store.saveSettings(o); toast('บันทึกการตั้งค่าแล้ว'); route(true);
    } else if (e.target.id === 'searchForm') {
      e.preventDefault();
      const target = '#/search?q=' + encodeURIComponent($('#q').value.trim());
      if (location.hash === target) route(); else location.hash = target;
    }
  });

  document.addEventListener('input', e => {
    const el = e.target.closest('[data-filter]');
    if (!el) return;
    const key = el.dataset.key;
    st.filters[key] = st.filters[key] || {};
    st.filters[key][el.dataset.filter] = el.value;
    const box = $('#tbl');
    if (box) box.innerHTML = tableHTML(key);
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'fySel') {
      st.fy = e.target.value; prefs.fy = st.fy; savePrefs(); route(true);
      toast(st.fy === 'all' ? 'แสดงข้อมูลทุกปีงบประมาณ' : `เปลี่ยนเป็นปีงบประมาณ ${st.fy}`);
    } else if (e.target.id === 'restoreFile') {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { Store.importJSON(JSON.parse(rd.result)); toast('กู้คืนข้อมูลเรียบร้อย'); route(); }
        catch (err) { toast('กู้คืนไม่สำเร็จ: ' + err.message); }
      };
      rd.readAsText(file);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if ($('#modal-root').innerHTML) closeModal(); else document.body.classList.remove('nav-open'); }
  });

  window.addEventListener('hashchange', () => route());

  /* ---------- Start ---------- */
  buildFY();
  $('#footYear').textContent = new Date().getFullYear() + 543;
  route();
  setInterval(tick, 15000);
})();
