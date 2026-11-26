// 📅 Thử thách hằng ngày kiểu Songless / More or Less (25/11/2026, anh dặn): cả web chơi chung một đề mỗi ngày (giờ VN),
// chơi xong thì xem mình so với mọi người (phân bố kết quả hôm nay) hoặc với chính mình (cả quá trình trên máy này).
// Máy chủ: POST /daily/<game>/score { day, v, dev } (mỗi máy 1 lần/ngày, lần đầu mới tính) → { n, c, mine }; GET /daily/<game>/dist?day=.
import { API } from '../../shared/net/api.js?v=29';

export const vnDay = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
export const dayNo = (day, start) => Math.round((Date.parse(day) - Date.parse(start)) / 864e5) + 1;
const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
export function devId() {
  let d = LS.get('gumballz-dev'); if (!d || !/^[a-z0-9]{8,40}$/.test(d)) { d = Array.from({ length: 16 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join(''); LS.set('gumballz-dev', d); }
  return d;
}
const tmo = ms => { if (AbortSignal.timeout) return AbortSignal.timeout(ms); const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
export async function postScore(g, day, v) {
  try { const r = await fetch(API() + `/daily/${g}/score`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day, v, dev: devId() }), signal: tmo(8000) }).then(r => r.json()); if (r && r.ok) return r; } catch (e) {}
  return getDist(g, day);
}
export async function getDist(g, day) {
  try { const r = await fetch(API() + `/daily/${g}/dist?day=${day}&dev=${devId()}`, { signal: tmo(8000) }).then(r => r.json()); if (r && r.ok) return r; } catch (e) {}
  return null;
}
/* kết quả các ngày trên máy này: { 'YYYY-MM-DD': v } */
export const history = g => { try { return JSON.parse(LS.get('gumballz-daily-' + g)) || {}; } catch (e) { return {}; } };
export function saveDay(g, day, v) { const h = history(g); if (!(day in h)) { h[day] = v; LS.set('gumballz-daily-' + g, JSON.stringify(h)); } return h; }
export const playedToday = (g, day = vnDay()) => day in history(g);

const CSS = `.bgd{background:var(--bgd-bg,#211b33);color:#f4efff;border-radius:18px;padding:14px 14px 12px;font:600 14px/1.35 Nunito,"Be Vietnam Pro",system-ui,sans-serif;text-align:left;max-width:420px;margin:0 auto}
.bgd-tab{display:flex;gap:4px;justify-content:center;margin:0 auto 12px;background:#ffffff12;border-radius:999px;padding:3px;width:max-content}
.bgd-tab button{border:0;background:none;color:#f4efffb3;font:800 13px Nunito,sans-serif;padding:5px 14px;border-radius:999px;cursor:pointer}
.bgd-tab button[aria-pressed=true]{background:#ffffff1f;color:#fff}
.bgd-st{display:flex;justify-content:center;background:#ffffff0d;border-radius:14px;padding:8px 4px;margin:0 auto 12px;max-width:300px}
.bgd-st>div{flex:1;text-align:center;padding:0 8px}.bgd-st>div+div{border-left:1px solid #ffffff1f}
.bgd-st small{display:block;color:#f4efffa6;font-size:12.5px}.bgd-st b{font:800 26px/1.1 "Baloo 2",Nunito,sans-serif}
.bgd-box{background:#ffffff0a;border-radius:14px;padding:10px 12px}
.bgd-h{display:flex;justify-content:space-between;color:#f4efffb3;font-size:13px;margin-bottom:8px}
.bgd-r{display:grid;grid-template-columns:3.4em 1fr;align-items:center;gap:6px;margin:4px 0;font:800 12.5px Nunito,sans-serif}
.bgd-r span{text-align:right;color:#f4efffcc}
.bgd-r i{display:block;height:20px;min-width:6px;border-radius:4px;background:#ffffff33;transform-origin:left;animation:bgd-in .5s ease-out both}
.bgd-r.me i{background:var(--bgd-ok,#4ad66d)}.bgd-r.me.x i{background:#e5484d}
.bgd-r em{font-style:normal;color:#f4efff99;font-size:11.5px;margin-left:6px}
.bgd-f{text-align:center;color:#f4efffb3;font-size:13px;margin:10px 0 0}
@keyframes bgd-in{from{transform:scaleX(0)}}
@media (prefers-reduced-motion:reduce){.bgd-r i{animation:none}}`;
let cssOn = false;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* Vẽ thẻ so sánh vào el.
   cfg: { g, day, v (kết quả của mình), buckets: [{ label, of: v => bool, x?: true (thua) }], mainLabel, main: v => chuỗi,
          avg: list => số | null (trung bình từ danh sách kết quả), avgFmt, sentence: (pct, v, n) => chuỗi } */
export function drawCard(el, cfg) {
  if (!cssOn) { cssOn = true; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
  let tab = 'today', dist = null;
  const bucketOf = v => cfg.buckets.findIndex(b => b.of(v));
  function counts() {
    if (tab === 'all') { const h = history(cfg.g), list = Object.values(h), c = cfg.buckets.map(() => 0); for (const v of list) { const i = bucketOf(v); if (i >= 0) c[i]++; } return { c, n: list.length, list }; }
    if (!dist) return null;
    const c = cfg.buckets.map(() => 0), list = []; dist.c.forEach((k, v) => { if (!k) return; const i = bucketOf(v); if (i >= 0) c[i] += k; for (let j = 0; j < Math.min(k, 5000); j++) list.push(v); });
    return { c, n: dist.n, list };
  }
  function draw() {
    const d = counts(), mi = bucketOf(cfg.v), max = d ? Math.max(1, ...d.c) : 1;
    const av = d && d.list.length ? cfg.avg(d.list) : null;
    const same = d && d.n ? Math.round(((d.c[mi] || 0) - (tab === 'today' ? 1 : 0)) / Math.max(1, d.n - (tab === 'today' ? 1 : 0)) * 1000) / 10 : 0;
    el.innerHTML = `<div class="bgd">${cfg.song ? '' : `<div class="bgd-tab"><button type="button" data-t="today" aria-pressed="${tab === 'today'}">Hôm nay</button><button type="button" data-t="all" aria-pressed="${tab === 'all'}">Của bạn</button></div>`}
      <div class="bgd-st"><div><small>${esc(tab === 'all' ? 'Đã chơi' : cfg.mainLabel)}</small><b>${esc(tab === 'all' ? String(d ? d.n : 0) : cfg.main(cfg.v))}</b></div><div><small>Trung bình</small><b>${av == null ? '–' : esc(cfg.avgFmt ? cfg.avgFmt(av) : (Math.round(av * 10) / 10).toLocaleString('vi-VN'))}</b></div></div>
      <div class="bgd-box"><div class="bgd-h"><span>${tab === 'all' ? 'Kết quả của bạn' : cfg.song ? 'Mọi người với bài này' : 'Mọi người hôm nay'}</span><span>${cfg.song ? '' : cfg.day.split('-').reverse().join('/')}</span></div>
      ${d ? cfg.buckets.map((b, i) => `<div class="bgd-r${tab === 'today' && i === mi ? ' me' + (b.x ? ' x' : '') : ''}"><span>${esc(b.label)}</span><div style="display:flex;align-items:center"><i style="width:${(d.c[i] / max * 100).toFixed(1)}%"></i><em>${d.c[i] || ''}</em></div></div>`).join('') : '<p class="bgd-f">Đang tải kết quả mọi người…</p>'}
      ${tab === 'today' && d && d.n > 1 ? `<p class="bgd-f">${esc(cfg.sentence(same, cfg.v, d.n, d.list))}</p>` : tab === 'today' && d ? `<p class="bgd-f">${cfg.song ? 'Bạn là người đầu tiên đoán bài này 🎉' : 'Bạn là người đầu tiên chơi hôm nay 🎉'}</p>` : ''}</div></div>`;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
  }
  draw();
  if (!cfg.song) saveDay(cfg.g, cfg.day, cfg.v);
  postScore(cfg.g, cfg.day, cfg.v).then(r => { if (r) { dist = r; if (dist.n < 1) { dist.n = 1; dist.c[cfg.v] = (dist.c[cfg.v] || 0) + 1; } draw(); } else { el.querySelector('.bgd-f') && (el.querySelector('.bgd-f').textContent = cfg.song ? 'Chưa tải được kết quả mọi người.' : 'Chưa tải được kết quả mọi người – xem "Của bạn" nha.'); } });
}
/* chép chữ khoe kết quả */
export async function shareText(t) {
  try { if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) { await navigator.share({ text: t }); return true; } } catch (e) { return false; }
  try { await navigator.clipboard.writeText(t); return 'copy'; } catch (e) { return false; }
}
