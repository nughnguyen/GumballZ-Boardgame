// Đường chính: máy chủ phòng GumballZ trên Cloudflare (server/ – Workers + Durable Objects), nối bằng WebSocket.
// Giao diện giả lập "conn" giống fbrelay.js / relay.js: on('open'|'data'|'close'|'error'), send(msg), close(), open, peer.
// Thử máy chủ khác: ?cf=ws://127.0.0.1:8787 (lưu lại trong máy) · tắt: ?cf=0
const DEFAULT = 'wss://gumballz-rooms.hungnq-august.workers.dev';
// Địa chỉ dự phòng của cùng máy chủ – dùng khi máy chủ chính gặp sự cố. Để trống = tắt (máy chủ chính giờ đã là Worker riêng của GumballZ).
const FALLBACK = '';
let alt = null, probing = null;
try { const a = JSON.parse(sessionStorage.getItem('gumballz-cf-alt')); if (a && a.u === FALLBACK && Date.now() - a.t < 15 * 60e3) alt = a.u; } catch (e) {}
const ping = (u, ms = 4000) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); return fetch(u.replace(/^ws/, 'http') + '/health', { signal: c.signal, cache: 'no-store' }).then(r => r.ok).catch(() => false).finally(() => clearTimeout(t)); };
// Gọi khi nối máy chủ chính thất bại: nếu địa chỉ chính chết thật mà địa chỉ dự phòng còn sống thì chuyển sang dự phòng (nhớ 15 phút trong tab này).
export function cfProbe() {
  if (!FALLBACK || alt || probing) return probing;
  try { if (localStorage.getItem('gumballz-cf')) return null; } catch (e) {} /* đang trỏ máy chủ thử nghiệm thì thôi */
  probing = (async () => {
    if (await ping(DEFAULT)) return;
    if (!(await ping(FALLBACK))) return;
    alt = FALLBACK; try { sessionStorage.setItem('gumballz-cf-alt', JSON.stringify({ u: alt, t: Date.now() })); } catch (e) {}
    try { dispatchEvent(new CustomEvent('gumballz-cf-alt')); } catch (e) {}
  })().finally(() => { probing = null; });
  return probing;
}
function base() {
  try {
    const q = new URLSearchParams(location.search).get('cf');
    if (q !== null) { if (q === '0' || q === '') localStorage.setItem('gumballz-cf', 'off'); else if (/^wss?:\/\//.test(q)) localStorage.setItem('gumballz-cf', q); else localStorage.removeItem('gumballz-cf'); }
    const v = localStorage.getItem('gumballz-cf');
    if (v === 'off') return null;
    if (v) return v.replace(/\/+$/, '');
  } catch (e) {}
  return alt || DEFAULT;
}
try { base(); } catch (e) {} // đọc ?cf= ngay khi tải trang (lưu lại cho các trang sau)
export const cfHttp = () => (base() || DEFAULT).replace(/^ws/, 'http'); // địa chỉ http(s) của máy chủ (góp ý…)
export const cfEnabled = () => !!base() && typeof WebSocket !== 'undefined';
const rid = () => Math.random().toString(36).slice(2, 12);
const enc = d => JSON.stringify(d), dec = s => { try { return JSON.parse(s); } catch (e) { return null; } };
// Khoá của chủ phòng cho 1 mã phòng: k = "chìa" giữ ghế chủ phòng trên máy chủ, bk = khoá mã hoá bản sao trạng thái gửi người kế vị.
// Nhớ trong tab (sessionStorage) để tải lại trang vẫn là chính mình – thay được socket cũ còn treo thay vì bị báo "phòng đã có chủ".
const hkKey = (ns, code) => 'gumballz-hk-' + ns + '-' + code;
export function hostKeys(ns, code, fresh = false) {
  try { if (!fresh) { const v = JSON.parse(sessionStorage.getItem(hkKey(ns, code))); if (v && v.k && v.bk) return v; } } catch (e) {}
  const v = { k: rid() + rid(), bk: rid() + rid() + rid() };
  try { sessionStorage.setItem(hkKey(ns, code), JSON.stringify(v)); } catch (e) {}
  return v;
}
export function dropHostKeys(ns, code) { try { sessionStorage.removeItem(hkKey(ns, code)); } catch (e) {} }
// Người kế vị xin tiếp quản: nối vào như chủ phòng kèm pk (chìa của chủ cũ). Máy chủ chỉ trao khoá giải mã bản sao cho người THẬT SỰ lên làm chủ phòng.
// Trả về { bk } (được), { no: true } (đã có người khác tiếp quản / máy chủ không giữ khoá) hoặc null (lỗi mạng, quá giờ).
export function cfClaim(ns, code, pk, ms = 6000) {
  return new Promise(res => {
    if (!cfEnabled() || !pk) return res(null);
    const { k, bk } = hostKeys(ns, code, true);
    let ws = null, done = false;
    const fin = v => { if (done) return; done = true; clearTimeout(t); if (!v || !v.bk) dropHostKeys(ns, code); try { ws && ws.close(1000, 'bye'); } catch (e) {} res(v); };
    const t = setTimeout(() => fin(null), ms);
    try { ws = new WebSocket(wsUrl(ns, code, `role=host&k=${k}&bk=${bk}&pk=${encodeURIComponent(pk)}`)); } catch (e) { return fin(null); }
    ws.onmessage = ev => { const m = dec(ev.data); if (!m) return; if (m.x === 'bk' && m.bk) fin({ bk: m.bk }); else if (m.x === 'taken' || m.x === 'nobk') fin({ no: true }); };
    ws.onclose = () => fin(null); ws.onerror = () => {};
  });
}
const wsUrl = (ns, code, q) => `${base()}/r/${encodeURIComponent(ns)}/${encodeURIComponent(code)}?${q}`;

class FakeConn {
  constructor(peer, sendFn) { this.peer = peer; this.open = true; this._h = {}; this._send = sendFn; }
  on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; }
  emit(e, x) { (this._h[e] || []).forEach(f => { try { f(x); } catch (err) { console.error(err); } }); }
  send(msg) { if (this.open) this._send(msg); }
  close() { if (!this.open) return; this.open = false; this._send({ t: '__bye' }); this.emit('close'); }
}

// ---- chủ phòng: 1 WebSocket, máy chủ gắn nhãn người gửi ----
export class CfHost {
  constructor(ns, code, onConn, opts = {}) {
    this.ns = ns; this.code = code; this.onConn = onConn; this.conns = new Map(); { const hk = hostKeys(ns, code); this.k = hk.k; this.bk = hk.bk; } this.pk = opts.pk || ''; this.onTaken = opts.onTaken || null; this.wait = 1000;
    if (cfEnabled()) this.open();
  }
  open() {
    if (this.dead) return;
    const q = `role=host&k=${this.k}&bk=${this.bk}${this.pk ? '&pk=' + encodeURIComponent(this.pk) : ''}`;
    let ws; try { ws = new WebSocket(wsUrl(this.ns, this.code, q)); } catch (e) { this.retry(); return; }
    this.ws = ws;
    let opened = false;
    ws.onopen = () => { opened = true; clearTimeout(this.eoT); this.eoT = setTimeout(() => { if (this.ws === ws && !this.taken) this.everOpen = true; }, 1500); /* máy chủ báo "taken" ngay sau khi mở: phải qua 1,5 giây yên ổn mới tính là đã từng giữ phòng này */ this.wait = 1000; this.lastPong = Date.now(); clearInterval(this.ka); this.ka = setInterval(() => this.keep(ws), 15000); };
    ws.onmessage = ev => {
      if (ev.data === 'pong') { this.lastPong = Date.now(); return; }
      const m = dec(ev.data); if (!m) return;
      if (m.x === 'taken') { this.taken = true; if ((this.everOpen || this.pk) && this.onTaken) try { this.onTaken(); } catch (e) {} return; } /* đã từng mở phòng này mà giờ bị báo "có chủ khác" = người kế nhiệm đã tiếp quản lúc mình rớt mạng */ // trùng mã với phòng khác đang mở – đường này bỏ, còn Firebase/PeerJS
      if (!m.f) return;
      let conn = this.conns.get(m.f);
      if (m.bye) { if (conn) { this.conns.delete(m.f); conn.open = false; conn.emit('close'); } return; }
      const d = dec(m.s);
      if (!conn) {
        if (!d || d.t !== 'join') { this.push({ to: m.f, bye: 1 }); return; } /* người này còn nối với máy chủ nhưng mình không còn giữ kết nối của họ (socket chủ phòng vừa bị thay): cắt để họ tự vào lại, kẻo treo im */
        const id = m.f;
        conn = new FakeConn('cf:' + id, msg => {
          if (!this.ws || this.ws.readyState !== 1) return;
          this.push(msg && msg.t === '__bye' ? { to: id, bye: 1 } : { to: id, s: enc(msg) });
        });
        this.conns.set(id, conn); this.onConn(conn);
      }
      if (d) conn.emit('data', d);
    };
    ws.onclose = () => {
      if (!opened) cfProbe();
      if (this.ws !== ws) return;
      for (const c of this.conns.values()) { c.open = false; c.emit('close'); } // máy chủ đã ngắt mọi người: họ sẽ tự vào lại
      this.conns.clear();
      if (!this.taken) this.retry();
    };
    ws.onerror = () => {};
  }
  // gom mọi tin gửi đi trong cùng 1 nhịp nhưng giới hạn cả số gói (<=32) lẫn tổng byte (<=130KB)
  push(x) {
    const n = x.s ? x.s.length : 40;
    if (this.q && this.q.length && ((this.qn || 0) + n > 110000 || this.q.length >= 32)) this.flush();
    (this.q = this.q || []).push(x); this.qn = (this.qn || 0) + n;
    if (this.qn >= 110000 || this.q.length >= 32) { this.flush(); return; }
    if (!this.qT) { this.qT = true; queueMicrotask(() => this.flush()); }
  }
  flush() {
    const q = this.q || []; this.q = []; this.qn = 0; this.qT = false;
    if (!q.length || !this.ws || this.ws.readyState !== 1) return;
    let part = [], bytes = 0;
    const send = () => {
      if (!part.length) return;
      try { this.ws.send(enc(part.length === 1 ? part[0] : { b: part })); } catch (e) {}
      part = []; bytes = 0;
    };
    for (const x of q) {
      const n = x.s ? x.s.length : 40;
      if (part.length && (part.length >= 32 || bytes + n > 130000)) send();
      part.push(x); bytes += n;
    }
    send();
  }
  keep(ws) { // giữ kết nối: ping 15s/lần (máy chủ tự trả "pong" miễn phí); 40s không có pong thì nối lại
    if (ws !== this.ws || ws.readyState !== 1) return;
    if (Date.now() - this.lastPong > 40000) { try { ws.close(); } catch (e) {} return; }
    try { ws.send('ping'); } catch (e) {}
  }
  retry() { if (this.dead) return; clearTimeout(this.rt); this.rt = setTimeout(() => this.open(), this.wait); this.wait = Math.min(this.wait * 2, 15000); }
  destroy() { this.flush(); this.dead = true; clearTimeout(this.rt); clearTimeout(this.eoT); clearInterval(this.ka); try { this.ws && this.ws.close(1000, 'bye'); } catch (e) {} }
}

// ---- người vào phòng ----
export function cfConnect(ns, code, extra = '') { /* extra: tham số thêm cho phòng "máy chủ giữ ván" (srv=<game>&ok=<chìa người tạo phòng>) */
  const me = rid(); let alive = true;
  let ws = null;
  const conn = new FakeConn('cf', msg => { if (ws && ws.readyState === 1) ws.send(enc(msg)); });
  conn.open = false;
  const fail = () => { if (!alive) return; alive = false; conn.open = false; try { ws && ws.close(); } catch (e) {} conn.emit('close'); };
  try { ws = new WebSocket(wsUrl(ns, code, `role=c&id=${me}${extra ? '&' + extra : ''}`)); } catch (e) { setTimeout(fail, 0); return conn; }
  let lastPong = Date.now(), ka = null, pingAt = 0;
  ws.onopen = () => { if (!alive) return; conn.open = true; conn.wasOpen = true; conn.emit('open'); lastPong = Date.now();
    ka = setInterval(() => { if (!alive) { clearInterval(ka); return; } if (Date.now() - lastPong > 30000) { clearInterval(ka); fail(); return; } try { pingAt = Date.now(); ws.send('ping'); } catch (e) {} }, 10000); };
  ws.onmessage = ev => {
    if (!alive) return;
    lastPong = Date.now(); if (ev.data === 'pong') { if (pingAt) { try { window.__gumballzSrvRtt = Date.now() - pingAt; } catch (e) {} pingAt = 0; } return; } /* độ trễ tới máy chủ – netmeter.js dùng để biết lag do mạng mình hay do chủ phòng */
    const d = dec(ev.data); if (!d) return;
    if (d.x) { if (d.x === 'nf') conn.notFound = true; fail(); return; }
    if (d.t === '__bye') { fail(); return; }
    conn.emit('data', d);
  };
  ws.onclose = () => { clearInterval(ka); if (!conn.open && !conn.notFound) cfProbe(); fail(); };
  ws.onerror = () => {};
  conn.close = () => { clearInterval(ka); if (!alive) return; alive = false; conn.open = false; try { ws.close(1000, 'bye'); } catch (e) {} };
  return conn;
}
