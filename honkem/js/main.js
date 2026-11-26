// 🔼🔽 Hơn Hay Kém (Higher or Lower) – giao diện. Luật ở engine.js, số liệu ở data.js (Wikidata, CC0), phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=1';
import { vnDay, dayNo, drawCard, shareText, history } from './daily-ui.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet(DEF);
let sound = ls.get('hk-sound') !== '0';
let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const N = { ok: [[660, 0, .08], [880, .08, .14]], no: [[300, 0, .14], [220, .12, .22]], tick: [[880, 0, .04]], go: [[523, 0, .07], [784, .07, .12]], end: [[523, 0, .1], [659, .1, .1], [784, .2, .22]] }[kind] || [];
    for (const [f, at, len] of N) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.12, t + at + .012); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .02); }
  } catch (e) {}
}
/* số đẹp kiểu Việt: 1.234.567 · 8,2 triệu · 1,4 tỉ */
const vnNum = (x, d = 0) => x.toLocaleString('vi-VN', { maximumFractionDigits: d });
function fmt(c, v) {
  if (v == null) return '?';
  const big = x => x >= 1e9 ? vnNum(x / 1e9, 2) + ' tỉ' : x >= 1e6 ? vnNum(x / 1e6, 1) + ' triệu' : vnNum(x);
  switch (c.f) {
    case 'year': return 'năm ' + v;
    case 'pop': return big(v) + ' người';
    case 'km2': return big(v / 1e6) + ' km²';
    case 'm': return vnNum(v) + ' m';
    case 'km': return vnNum(v / 1000) + ' km';
    case 'kg': return v >= 1000 ? vnNum(v / 1000, 1) + ' tấn' : v >= 1 ? vnNum(v, 1) + ' kg' : vnNum(v * 1000) + ' g';
    default: return vnNum(v);
  }
}
const GRPN = { all: '🎲 Trộn hết', ...E.GROUPS };

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', seg = (k, list) => `<div class="seg">${list.map(([v, nm]) => `<button type="button" data-opt="${k}" data-v="${v}" aria-pressed="${o[k] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#pcount').textContent = `${info.players.length} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected === false ? 'off' : ''}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="chip" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && info.players.length < NET.MAX ? '<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>' : '';
  $('#opts').innerHTML = `<div class="opt"><b>🧩 Chủ đề</b>${seg('grp', Object.entries(GRPN).map(([k, n]) => [k, n]))}</div>
    <div class="opt"><b>🔁 Số vòng</b>${seg('rounds', [[10, '10'], [15, '15'], [25, '25']])}<small>Chơi một mình thì chơi tới khi hết mạng.</small></div>
    <div class="opt"><b>❤️ Mạng</b>${seg('lives', [[1, '1 · như bản gốc'], [3, '3'], [5, '5']])}</div>
    <div class="opt"><b>⏱️ Thời gian mỗi vòng</b>${seg('t', [[8, '8 giây'], [12, '12 giây'], [20, '20 giây']])}</div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none';
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
  else if (b.dataset.opt) { const k = b.dataset.opt, v = k === 'grp' ? b.dataset.v : +b.dataset.v; h.setOpt(k, v); try { ls.set('hk-opts', JSON.stringify({ ...h.opts, [k]: v })); } catch (x) {} }
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start({ day: '' });

// ---------- ván chơi ----------
let skew = 0, toSent = '', lastTick = 0, shown = '';
const left = v => v.deadline ? (v.deadline - (Date.now() + skew)) / 1000 : null;
/* ảnh từ Wikimedia Commons (giấy phép tự do, ghi nguồn bằng nút 📷 dẫn tới trang ảnh); thứ không có ảnh tự do (phim, game…) thì hiện biểu tượng */
const EMO = { dsqg: '🌍', dtqg: '🗺️', tp: '🏙️', nui: '🏔️', song: '🌊', toa: '🏢', bh: '🎵', album: '💿', casi: '🎤', casivn: '🎤', phim: '🎬', game: '🎮', anime: '📺', cty: '🏭', thu: '🐘', nuivn: '⛰️', songvn: '🛶', dsvn: '🏙️' };
const IMW = f => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=${/\.svg$/i.test(f) ? 480 : 640}`;
function card(side, it, c, v, cls = '') {
  const val = it.v != null ? `<b class="val">${esc(fmt(c, it.v))}</b>` : `<b class="val q">?</b>`;
  const flag = /^(dsqg|dtqg)$/.test(v.cat) && it.im;
  const bg = `<span class="emo" aria-hidden="true">${EMO[v.cat] || '❓'}</span>` + (it.im ? `<img class="ph${flag ? ' flag' : ''}" src="${esc(IMW(it.im))}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : '');
  const cr = it.im ? `<a class="cr" href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(it.im)}" target="_blank" rel="noopener" title="Ảnh: Wikimedia Commons – bấm xem tác giả & giấy phép">📷</a>` : '';
  return `<div class="card ${side}${cls}" data-c="${side === 'a' ? 'dn' : 'up'}" role="button" tabindex="0" aria-label="${esc(it.n)}">${bg}<div class="sh"></div><div class="tx"><h2>${esc(it.n)}</h2>${it.v != null ? `<small class="cap">${esc(c.n)}</small>${val}` : ''}</div>${cr}</div>`;
}
function render(v, prev) {
  skew = (v.now || Date.now()) - Date.now();
  const me = v.players.find(p => p.id === ui.myId), c = v.cn;
  $('#round').textContent = v.phase === 'ended' ? '🏁 Hết ván' : v.k < 0 ? 'Chuẩn bị…' : v.solo ? `Vòng ${v.k + 1}` : `Vòng ${v.k + 1}/${v.rounds}`;
  $('#myscore').innerHTML = me && v.opts.day ? `<b>✅ ${me.ok}</b>` : me ? `<span class="lv">${'❤️'.repeat(Math.max(0, me.lives))}${'🤍'.repeat(Math.max(0, v.opts.lives - me.lives))}</span> <b>${me.pts}</b>` : '<small>đang xem</small>';
  $('#board').innerHTML = v.players.length > 1 || v.phase === 'ended' ? v.players.slice().sort((a, b) => b.pts - a.pts).map(p => `<div class="pl${p.lives <= 0 ? ' out' : ''}${v.answered.includes(p.id) ? ' done' : ''}" data-pid="${p.id}">${avatar(p.name, 28)}<span>${esc(cleanName(p.name))}</span><b>${p.pts}</b>${p.last ? `<i>${p.last.ok ? '✅' : '❌'}</i>` : ''}</div>`).join('') : '';
  const st = $('#stage'), acts = $('#acts'), key = `${v.gid}|${v.k}|${v.phase}`;
  if (v.phase === 'ended' && v.opts.day) {
    if (shown !== key) {
      const n = me ? me.ok : 0;
      st.innerHTML = `<div class="endc"><small class="dk">📅 ${esc(GRPN[v.opts.grp] || '')} · #${dayNo(v.opts.day, START)}</small><h2>🎯 Đúng ${n}/${E.DAYN} câu</h2><p class="drow">${rowOf(v.me && v.me.log)}</p></div><div id="dcard"></div>`;
      dayCard($('#dcard'), v.opts.day, n, v.opts.grp);
      acts.innerHTML = '<button class="btn" data-a="dshare">📤 Chia sẻ</button><button class="btn big pri" data-a="dnext">🎯 Chơi tiếp (đề ngẫu nhiên)</button>';
      $('#board').innerHTML = ''; beep('end');
    }
    shown = key; return;
  }
  if (v.phase === 'ended') {
    if (shown !== key) {
      const w = v.players.filter(p => v.winners.includes(p.id));
      st.innerHTML = `<div class="endc"><h2>${v.solo ? `🏁 Chuỗi đúng: ${me ? me.ok : 0} câu` : w.length ? `🏆 ${w.map(p => esc(cleanName(p.name))).join(', ')} thắng!` : '🏁 Hết ván'}</h2><p>${me ? `Bạn được <b>${me.pts}</b> điểm · đúng ${me.ok} câu · chuỗi dài nhất ${me.best}` : ''}</p></div>`;
      acts.innerHTML = ui.isHost ? '<button class="btn big pri" data-a="again">🔁 Chơi lại</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '<p class="wait">Chờ chủ phòng mở ván mới…</p>';
      beep('end');
    }
    shown = key; return;
  }
  if (v.phase === 'intro') { st.innerHTML = `<div class="intro"><h2>Sẵn sàng!</h2><p>Chạm vào bên <b>nhiều hơn</b>!</p><b id="cd"></b></div>`; acts.innerHTML = ''; shown = key; return; }
  const rev = v.phase === 'rev', mine = v.me && v.me.lives > 0 && !v.spec, picked = v.me && v.me.pick;
  const vs = `<div class="vs">${rev ? (v.truth === 'up' ? '▶' : '◀') : 'HAY'}</div>`, myp = rev ? (me && v.picks[ui.myId]) : picked;
  const cl = side => { const c2 = side === 'a' ? 'dn' : 'up'; let k = ''; if (myp === c2) k += ' sel'; if (rev) k += v.truth === c2 ? ' win' : ' lose'; if (rev && myp === c2 && v.truth !== c2) k += ' bad'; if (!rev && mine && !picked) k += ' can'; return k; };
  st.innerHTML = `<p class="ask">${esc(c.q)}</p><div class="duo${rev ? ' rev ' + v.truth : ''}">${card('a', v.a, c, v, cl('a'))}${vs}${card('b', v.b, c, v, cl('b'))}</div>`;
  if (rev) {
    const myLast = me && me.last; acts.innerHTML = myLast ? `<p class="res ${myLast.ok ? 'ok' : 'no'}">${myLast.ok ? `✅ Đúng rồi! +${myLast.p}` : myLast.none ? '⌛ Hết giờ – mất 1 mạng' : '❌ Sai rồi – mất 1 mạng'}</p>` : '';
    if (prev && prev.phase === 'q' && myLast) beep(myLast.ok ? 'ok' : 'no');
  } else if (mine) {
    acts.innerHTML = picked ? (v.players.length > 1 ? '<p class="wait">Chờ mọi người chọn…</p>' : '') : `<p class="hint">👆 Chạm vào bên <b>${esc(c.up.toLowerCase())}</b></p>`;
  } else acts.innerHTML = `<p class="wait">${v.me && v.me.lives <= 0 ? '💔 Bạn hết mạng – xem mọi người chơi tiếp nha' : 'Đang xem…'}</p>`;
  if (prev && prev.phase !== 'q' && v.phase === 'q') beep('go');
  shown = key;
}
// ---------- 📅 Thử thách hôm nay: cả web chung một dãy cặp, 1 mạng ----------
const START = '2026-11-26'; /* làm lại từ 26/11/2026: 10 câu cố định mỗi ngày */
const BK = Array.from({ length: E.DAYN + 1 }, (_, i) => E.DAYN - i).map(x => ({ label: x + '/' + E.DAYN, of: v => v === x }));
const rowOf = log => (log || []).map(x => x ? '🟩' : '🟥').join('');
const DG = g => g && g !== 'all' ? 'hkd-' + g : 'hkd'; /* mỗi chủ đề một thử thách riêng (5 ô kiểu lessgames) */
let tabG = E.optOk('grp', ls.get('hk-tab')) ? ls.get('hk-tab') : 'all';
function dayCard(el, day, n, g = tabG) {
  drawCard(el, { g: DG(g), day, v: n, buckets: BK, mainLabel: 'Điểm của bạn', main: x => x + '/' + E.DAYN, avg: list => list.reduce((a, x) => a + x, 0) / list.length,
    sentence: (pct, x, tot, list) => { const lo = list.filter(y => y < x).length, p = Math.round(lo / Math.max(1, list.length - 1) * 100); return p > 0 ? `Bạn hơn ${p}% người chơi hôm nay` : x >= E.DAYN ? 'Tuyệt đối! 🎉' : 'Mai gỡ lại nha – đề mới lúc 0 giờ 🌙'; } });
}
function startSolo(extra) { if (ui.net) ui.leave(); const h = ui.startHost(true, true); h.start(extra); }
function startDay() {
  const day = vnDay(), h = history(DG(tabG));
  if (day in h) {
    ui.openModal(`<div class="guide"><h2>📅 ${esc(GRPN[tabG])} #${dayNo(day, START)}</h2><p>Hôm nay bạn chơi rồi – mai có đề mới nha!</p><div id="dcard2"></div><div class="btns"><button class="btn" id="m-share">📤 Chia sẻ</button><button class="btn" id="m-close">Đóng</button></div></div>`);
    dayCard($('#dcard2'), day, h[day]); $('#m-close').onclick = ui.closeModal; $('#m-share').onclick = () => dayShare(day, h[day], tabG); return;
  }
  startSolo({ day, grp: tabG });
}
function dayShare(day, n, g = 'all', log) { shareText(`Hơn Hay Kém #${dayNo(day, START)} ${GRPN[g] || ''} · ${n}/${E.DAYN}
${log ? rowOf(log) : ''}
gumballzgames.vercel.app/honkem/`).then(r => r === 'copy' && ui.toast('Đã chép kết quả – dán cho bạn bè nha 📋')); }
function drawDayBtn() { const b = $('#btn-day'); if (!b) return; const day = vnDay(), done = day in history(DG(tabG)); b.innerHTML = `📅 Thử thách hôm nay <small>#${dayNo(day, START)}${done ? ' · xem kết quả' : ''}</small>`;
  const t = $('#gtabs'); if (t) t.innerHTML = Object.entries(GRPN).map(([k, n]) => { const [e, ...w] = n.split(' '); return `<button type="button" data-g="${k}" aria-pressed="${k === tabG}" title="${esc(w.join(' '))}" aria-label="${esc(w.join(' '))}"><i>${e}</i>${day in history(DG(k)) ? '<b>✓</b>' : ''}</button>`; }).join('') + `<small class="gname">Chủ đề: <b>${esc(GRPN[tabG].split(' ').slice(1).join(' '))}</b></small>`; }
$('#gtabs').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; tabG = b.dataset.g; ls.set('hk-tab', tabG); drawDayBtn(); });
drawDayBtn(); setInterval(drawDayBtn, 60000);
$('#btn-day').onclick = startDay;
function pickCard(el) { const v = ui.view; if (!el || !v || v.phase !== 'q' || !v.me || v.me.pick || v.me.lives <= 0 || v.spec) return; ui.act({ type: 'pick', c: el.dataset.c }); el.classList.add('sel'); document.querySelectorAll('.duo .card').forEach(x => x.classList.remove('can')); }
$('#stage').addEventListener('click', e => { if (e.target.closest('.cr')) return; pickCard(e.target.closest('.card[data-c]')); });
$('#stage').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[data-c]')) { e.preventDefault(); pickCard(e.target); } });
addEventListener('keydown', e => { if (e.target.matches('input,textarea')) return; if (e.key === 'ArrowLeft') pickCard(document.querySelector('.card.a')); else if (e.key === 'ArrowRight') pickCard(document.querySelector('.card.b')); });
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.view) return;
  if (b.dataset.c) { ui.act({ type: 'pick', c: b.dataset.c }); b.parentNode.querySelectorAll('button').forEach(x => { x.disabled = true; }); b.classList.add('on'); }
  else if (b.dataset.a === 'again') ui.net.raw.start({ day: '' }); else if (b.dataset.a === 'lobby') ui.net.raw.restart();
  else if (b.dataset.a === 'dshare') { const v = ui.view, me = v.players.find(p => p.id === ui.myId); dayShare(v.opts.day, me ? me.ok : 0, v.opts.grp, v.me && v.me.log); }
  else if (b.dataset.a === 'dnext') $('#btn-solo').click();
});
setInterval(() => {
  const v = ui.view; if (!v || !ui.net || v.phase === 'ended' || !v.deadline) return;
  const t = left(v), s = Math.ceil(t), bar = $('#tbar i');
  if (bar) { const tot = v.phase === 'q' ? v.t : v.phase === 'intro' ? E.INTRO_T : E.REV_T; bar.style.transform = `scaleX(${Math.max(0, Math.min(1, t / tot))})`; bar.parentNode.dataset.ph = v.phase; }
  const cd = $('#cd'); if (cd) cd.textContent = s > 0 ? s : 'Đoán!';
  if (v.phase === 'q' && v.me && !v.me.pick && v.me.lives > 0 && s <= 3 && s > 0 && s !== lastTick) { lastTick = s; beep('tick'); }
  if (t <= -0.5 && toSent !== v.gid + ':' + v.seq) { toSent = v.gid + ':' + v.seq; ui.act({ type: 'timeout' }); }
}, 200);
$('#hostbar').addEventListener('click', async e => { const b = e.target.closest('[data-h]'); if (b && ui.isHost && await confirmBox('Kết thúc ván và xem kết quả nhé?', { title: '🏁 Kết thúc?', ok: 'Kết thúc', cancel: 'Chơi tiếp' })) ui.act({ type: 'end' }); });
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Hơn Hay Kém</h2>
    <p>Mỗi vòng có hai thứ cùng loại (hai quốc gia, hai bài hát, hai ngọn núi…). <b>Chạm vào hình</b> của thứ bạn nghĩ nhiều hơn (đông hơn, cao hơn, mới hơn…). Máy tính: bấm phím ◀ ▶.</p>
    <ul><li>Đúng: +10 điểm, chọn càng nhanh thưởng thêm tới 5 điểm.</li><li>Sai hoặc hết giờ: mất 1 mạng. Hết mạng thì ngồi xem.</li><li>Thứ bên phải của vòng này sang bên trái ở vòng sau; cứ 5 vòng đổi chủ đề.</li><li>📅 Thử thách hôm nay: mỗi chủ đề (5 ô trên màn hình đầu + ô Trộn) có một đề chung cả web, 1 mạng, xong xem mình so với mọi người.</li><li>Chơi một mình: chơi tới khi hết mạng, xem chuỗi đúng dài nhất.</li></ul>
    <p class="src">Số liệu lấy từ Wikidata (CC0) – có thể lệch chút so với số mới nhất. Ảnh từ Wikimedia Commons, bấm 📷 trên ảnh để xem tác giả và giấy phép.</p>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('hk-sound', sound ? '1' : '0'); drawSound(); beep('ok'); };
$('#btn-solo').onclick = () => { if (ui.net) ui.leave(); const h = ui.startHost(true, true); let o = {}; try { o = JSON.parse(ls.get('hk-opts') || '{}'); } catch (e) {} h.start({ day: '', grp: tabG, lives: 1, t: 12 }); };

const ui = gameKit({
  game: 'honkem', net: NET,
  offline: h => { for (let i = 0; i < 3; i++) h.addBot(); },
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) { render(v, prev); $('#hostbar').innerHTML = ui.isHost && v.phase !== 'ended' && !v.solo ? '<button class="chip" data-h="end">🏁 Kết thúc ván</button>' : ''; } else shown = ''; },
});
