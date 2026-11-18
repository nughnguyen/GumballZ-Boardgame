// ⏱️ Hẹn giờ không bị trình duyệt bóp khi tab chủ phòng nằm ở nền.
// Trình duyệt làm chậm setTimeout / setInterval của tab bị ẩn (1 giây/lần, ẩn lâu thì 1 phút/lần) → chủ phòng chuyển tab là cả bàn giật, tưởng mất kết nối.
// Hẹn giờ trong Web Worker thì không bị bóp, nên khi máy này làm chủ phòng (RoomHost gọi unthrottleTimers) ta cho mọi setTimeout / setInterval đi vòng qua một Worker nhỏ.
// Worker lỗi hay không tạo được thì trả về hẹn giờ gốc – game vẫn chạy như cũ. Không giúp được khi điện thoại khoá màn hình (cả trang bị đóng băng): lúc đó cơ chế chuyển chủ phòng lo.
export function unthrottleTimers() {
  const W = typeof window !== 'undefined' ? window : null;
  if (!W || W.__gumballzBgT || typeof Worker === 'undefined' || typeof Blob === 'undefined') return false;
  try {
    const src = 'const T=new Map();onmessage=e=>{const d=e.data,k=d[0],id=d[1];if(k==="s")T.set(id,setTimeout(()=>{T.delete(id);postMessage(id)},d[2]));else if(k==="i")T.set(id,setInterval(()=>postMessage(id),d[2]));else{const t=T.get(id);clearTimeout(t);clearInterval(t);T.delete(id)}}';
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    const nat = { st: W.setTimeout.bind(W), si: W.setInterval.bind(W), ct: W.clearTimeout.bind(W), ci: W.clearInterval.bind(W) };
    const cbs = new Map(); let n = 1e9, dead = false;
    const ms = v => Math.max(0, Math.min(2147483647, +v || 0));
    const run = c => { try { c.fn.apply(W, c.args); } catch (err) { nat.st(() => { throw err; }, 0); } }; /* lỗi trong hàm hẹn giờ vẫn hiện ra như bình thường */
    w.onmessage = e => { const c = cbs.get(e.data); if (!c) return; if (!c.rep) cbs.delete(e.data); run(c); };
    const fail = () => { /* Worker hỏng: trả hẹn giờ gốc và chạy nốt những cái đang chờ */
      if (dead) return; dead = true; w.onmessage = null; try { w.terminate(); } catch (e) {} W.setTimeout = nat.st; W.setInterval = nat.si; W.clearTimeout = nat.ct; W.clearInterval = nat.ci; W.__gumballzBgT = null;
      for (const [id, c] of cbs) { if (c.rep) c.nid = nat.si(() => run(c), c.ms); else c.nid = nat.st(() => { cbs.delete(id); run(c); }, c.ms); }
    };
    w.onerror = fail; w.onmessageerror = fail;
    const add = (rep, fn, t, args) => { const id = ++n, c = { fn, args, rep, ms: rep ? Math.max(4, ms(t)) : ms(t) }; cbs.set(id, c); w.postMessage([rep ? 'i' : 's', id, c.ms]); return id; };
    const clear = (id, natClear) => { const c = typeof id === 'number' && id > 1e9 ? cbs.get(id) : null; if (!c) return natClear(id); cbs.delete(id); if (c.nid != null) { nat.ct(c.nid); nat.ci(c.nid); } else if (!dead) w.postMessage(['c', id]); };
    W.setTimeout = (fn, t, ...args) => (typeof fn !== 'function' || dead ? nat.st(fn, t, ...args) : add(false, fn, t, args));
    W.setInterval = (fn, t, ...args) => (typeof fn !== 'function' || dead ? nat.si(fn, t, ...args) : add(true, fn, t, args));
    W.clearTimeout = id => clear(id, nat.ct); W.clearInterval = id => clear(id, nat.ci);
    W.__gumballzBgT = { w, nat, size: () => cbs.size };
    return true;
  } catch (e) { return false; }
}
