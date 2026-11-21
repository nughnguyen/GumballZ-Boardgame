// 🚂 Tàu Xuyên Việt – giao diện. Luật ở engine.js, bản đồ ở map.js, máy ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=5';
import { CITIES, ROUTES, TICKETS, COLORS, COLOR_NAME, ROUTE_PTS } from './map.js?v=5';
import { botAction } from './bot.js?v=5';
import { LAND, LBL, MAP_W, MAP_H } from './geo.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { toast } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet(DEF);
const LV = { 1: 'Dễ', 2: 'Vừa', 3: 'Khó' }, CC = c => `var(--c-${c})`;
let sound = ls.get('xuyenviet-sound') !== '0', endShown = null, goal = null, offerKey = '', ac = null;
function beep(kind) {
  if (!sound) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { card: [[700, 0, .04]], claim: [[392, 0, .08], [523, .08, .08], [659, .16, .14]], horn: [[311, 0, .22], [370, 0, .22]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = kind === 'horn' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(kind === 'horn' ? .05 : .1, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}
// ---------- bản đồ ----------
const VB = `0 0 ${MAP_W + 14} ${MAP_H}`; /* chừa dải biển phía đông cho hai quần đảo */
function mapSVG(v, o = {}) {
  let h = `<path class="land" d="${LAND}"/><text class="sea" x="${MAP_W - 22}" y="62">Biển Đông</text>
    <g class="isl"><circle cx="${MAP_W + 4}" cy="97" r="1.2"/><circle cx="${MAP_W + 7}" cy="99.5" r=".9"/><circle cx="${MAP_W + 2.5}" cy="101" r=".8"/><text x="${MAP_W + 12}" y="107">QĐ. Hoàng Sa</text>
    <circle cx="${MAP_W + 2}" cy="178" r="1"/><circle cx="${MAP_W + 7}" cy="182" r="1.1"/><circle cx="${MAP_W + 4}" cy="186.5" r=".8"/><circle cx="${MAP_W + 9}" cy="175" r=".8"/><text x="${MAP_W + 12}" y="193">QĐ. Trường Sa</text></g>`;
  for (const r of ROUTES) { const [, ax, ay] = CITIES[r.a], [, bx, by] = CITIES[r.b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    /* tuyến cong (r.bend = độ lệch giữa tuyến): đường Bezier bậc 2, toa đặt dọc đường cong – tuyến đôi / tuyến đi sát tuyến khác khỏi đè nhau */
    const nx = -dy / len, ny = dx / len, cx = (ax + bx) / 2 + nx * r.bend * 2, cy = (ay + by) / 2 + ny * r.bend * 2;
    const at = t => [(1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx, (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by];
    const tan = t => Math.atan2(2 * (1 - t) * (cy - ay) + 2 * t * (by - cy), 2 * (1 - t) * (cx - ax) + 2 * t * (bx - cx)) * 180 / Math.PI;
    const arc = len * (1 + (r.bend / len) ** 2 * 2.6), pad = 2.2, seg = (arc - pad * 2) / r.n, w = Math.max(1.6, seg - .7), own = v && v.owner[r.id], pc = own && (v.players.find(p => p.id === own) || {}).color;
    let cars = ''; const hh = own ? 3.3 : 2.1; /* tuyến đã xây: toa to hơn, viền trắng, có chấm trắng – để không lẫn với màu tuyến chưa xây */
    for (let k = 0; k < r.n; k++) { const t = (pad + seg * (k + .5)) / arc, [x, y] = at(t); cars += `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${tan(t).toFixed(1)})"><rect class="car" x="${(-w / 2).toFixed(2)}" y="${-hh / 2}" width="${w.toFixed(2)}" height="${hh}" rx=".7" fill="${own ? pc : CC(r.c)}"/>${own ? '<circle class="dot" cx="0" cy="0" r=".62"/>' : ''}</g>`; }
    const t0 = pad / arc, t1 = 1 - t0, [sx, sy] = at(t0), [ex, ey] = at(t1), hit = `M${sx.toFixed(2)} ${sy.toFixed(2)} Q${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
    h += `<g class="rt${own ? ' own' : ''}${o.can && o.can.has(r.id) ? ' can' : ''}${v && v.last && v.last.route === r.id ? ' last' : ''}${r.tw != null ? ' tw' : ''}" data-r="${r.id}">${cars}<path class="hit" d="${hit}"/></g>`; }
  for (const [k, [nm, x, y]] of Object.entries(CITIES)) { const l = LBL[k] || [2.6, 1.2, 'start']; h += `<g class="city${o.goal && o.goal.includes(k) ? ' goal' : ''}"><circle cx="${x}" cy="${y}" r="1.9"/><text x="${x + l[0]}" y="${y + l[1]}" text-anchor="${l[2]}">${esc(nm)}</text></g>`; }
  return h;
}
$('#hero').innerHTML = `<svg viewBox="${VB}">${mapSVG(null)}</svg>`; $('#map').setAttribute('viewBox', VB); document.documentElement.style.setProperty('--map-ar', `${MAP_W + 14} / ${MAP_H}`);
// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length, seg = (k, list) => `<div class="seg">${list.map(([v, nm]) => `<button type="button" data-opt="${k}" data-v="${v}" aria-pressed="${o[k] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#pcount').textContent = `${n}/5 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 5 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>🚃 Số toa mỗi người</b>${seg('trains', [[22, '22 · nhanh'], [30, '30 · vừa'], [38, '38 · dài']])}<small>Ai còn 2 toa trở xuống là báo hiệu lượt cuối.</small></div>
    <div class="opt"><b>🤖 Sức máy</b>${seg('level', [[1, 'Dễ'], [2, 'Vừa'], [3, 'Khó']])}<small>Chỉ dùng khi có máy trong bàn.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2; $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt(b.dataset.opt, +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();
// ---------- ván chơi ----------
const nameOf = (v, id) => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : '?'; };
const tkName = t => `${CITIES[t.a][0]} ↔ ${CITIES[t.b][0]}`;
function draw(v) {
  const me = ui.myId, mine = v.players.find(p => p.id === me), ended = v.phase === 'ended', myTurn = !v.spec && v.cur === me && v.phase === 'play' && !v.offer;
  const can = new Set(); if (myTurn && !v.drawn) for (const r of ROUTES) if (E.routeFree(v, r.id, me) && r.n <= mine.trains && E.payOptions(v.hand, r).length) can.add(r.id);
  $('#map').innerHTML = mapSVG(v, { can, goal });
  $('#round').textContent = ended ? '🏁 Hết ván' : v.phase === 'tickets' ? '🎫 Chọn vé đích' : v.finalLeft >= 0 ? `🚨 Lượt cuối (còn ${v.finalLeft})` : `🚂 Lượt của ${v.cur === me ? 'bạn' : (v.players.find(p => p.id === v.cur) || {}).name || ''}`;
  $('#seats').innerHTML = v.players.map(p => `<div class="seat${p.id === v.cur ? ' turn' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" style="--pc:${p.color}" data-pid="${p.id}">${avatar(p.name, 24)}<span class="nm">${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</span><span class="pt">${p.pts}</span><small title="toa còn lại · thẻ trên tay · vé đích">🚃${p.trains} · 🃏${p.cards} · 🎫${p.tks}${p.choosing ? ' · chọn vé' : ''}</small></div>`).join('');
  const dis = !myTurn;
  $('#market').innerHTML = v.up.map((c, i) => `<button class="cd ${c}" style="--cc:${CC(c)}" data-up="${i}" ${dis || (c === 'L' && v.drawn) ? 'disabled' : ''} aria-label="Lấy thẻ ${COLOR_NAME[c]}">${c === 'L' ? '🚂' : ''}</button>`).join('')
    + `<button class="cd deck" data-deck ${dis || !v.deckN ? 'disabled' : ''} aria-label="Bốc thẻ úp">🂠 ${v.deckN}</button><button class="cd tk" data-tk ${dis || v.drawn || !v.tkN ? 'disabled' : ''} aria-label="Bốc vé đích">🎫 +</button>`;
  const cnt = c => v.hand.filter(x => x === c).length;
  $('#hand').innerHTML = v.spec ? '' : `<span class="lbl">Bài<br>của bạn</span>` + [...COLORS, 'L'].map(c => `<span class="hc ${c}${cnt(c) ? '' : ' z'}" style="--cc:${CC(c)}" title="${COLOR_NAME[c]}">${cnt(c) || ''}${c === 'L' && cnt(c) ? '🚂' : ''}</span>`).join('');
  let msg = '', acts = '';
  if (ended) { const r = v.result.find(x => x.id === me); msg = (v.winners || []).includes(me) ? `🎉 Bạn thắng với ${r.total} điểm!` : `🏆 ${nameOf(v, v.winner)} thắng!`; acts = `<button class="btn" data-a="result">📊 Bảng điểm</button>` + (ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : ''); }
  else { msg = v.spec ? '<small>👀 Bạn đang xem.</small>' : v.offer ? 'Chọn vé đích để giữ' : v.phase === 'tickets' ? '<small>Chờ mọi người chọn vé…</small>' : myTurn ? (v.drawn ? 'Bốc thêm 1 thẻ nữa' : 'Lượt bạn: bốc 2 thẻ, hoặc chạm một tuyến đang nháy để xây, hoặc bốc vé 🎫') : `<small>Chờ ${nameOf(v, v.cur)}…</small>`;
    if (v.log.length) msg += `<br><small>${esc(v.log[v.log.length - 1])}</small>`;
    acts = v.spec ? '' : `<button class="btn" data-a="tickets">🎫 Vé của tôi (${v.tickets.filter(t => t.ok).length}/${v.tickets.length})</button>${myTurn && v.canPass && !v.drawn ? '<button class="btn" data-a="pass">⏭️ Bỏ lượt</button>' : ''}`; }
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  if (v.offer && offerKey !== v.gid + ':' + v.offer.join()) { offerKey = v.gid + ':' + v.offer.join(); openOffer(v); }
}
function openOffer(v) {
  ui.openModal(`<h2>🎫 Chọn vé đích</h2><p class="center">Nối được hai thành phố trên vé thì <b>cộng điểm</b>, cuối ván chưa nối được thì <b>bị trừ</b>. Giữ ít nhất <b>${v.need}</b> vé.</p>
    <div class="tkl">${v.offer.map(id => `<label><input type="checkbox" value="${id}" checked><span>${esc(tkName(TICKETS[id]))}</span><b>${TICKETS[id].pts}</b></label>`).join('')}</div>
    <div class="btns"><button class="btn pri" id="m-keep">Giữ các vé đã chọn</button></div>`);
  const sel = () => [...document.querySelectorAll('.tkl input:checked')].map(i => +i.value);
  document.querySelectorAll('.tkl input').forEach(i => { i.onchange = () => { const s = sel(); $('#m-keep').disabled = s.length < v.need; goal = s.flatMap(id => [TICKETS[id].a, TICKETS[id].b]); $('#map').innerHTML = mapSVG(ui.view, { goal }); }; });
  $('#m-keep').onclick = () => { const ids = sel(); if (ids.length < v.need) return; goal = null; ui.closeModal(); ui.act({ type: 'keep', ids }); };
}
function openTickets(v) {
  ui.openModal(`<h2>🎫 Vé đích của bạn</h2><div class="tkl">${v.tickets.map(t => `<div class="t${t.ok ? ' ok' : ''}" data-t="${t.id}" role="button" tabindex="0"><span>${t.ok ? '✅' : '⬜'} ${esc(tkName(TICKETS[t.id]))}</span><b>${t.ok ? '+' : ''}${TICKETS[t.id].pts}</b></div>`).join('') || '<p class="center">Chưa có vé nào.</p>'}</div>
    <p class="center"><small>Chạm một vé để thấy hai thành phố sáng lên trên bản đồ.</small></p><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  document.querySelectorAll('.tkl .t').forEach(d => { d.onclick = () => { const t = TICKETS[+d.dataset.t]; goal = [t.a, t.b]; ui.closeModal(); draw(ui.view); setTimeout(() => { if (goal && goal[0] === t.a && goal[1] === t.b) { goal = null; ui.view && draw(ui.view); } }, 6000); }; });
}
function openResult(v) {
  const rows = [...v.result].sort((a, b) => b.total - a.total);
  ui.openModal(`<h2>📊 Bảng điểm</h2><div style="overflow-x:auto"><table class="res"><tr><th>Người chơi</th><th>Tuyến</th><th>Vé</th><th>Dài nhất</th><th>Tổng</th></tr>${rows.map(r => `<tr class="${(v.winners || []).includes(r.id) ? 'win' : ''}"><td>${nameOf(v, r.id)}</td><td>${r.route}</td><td>${r.tpts >= 0 ? '+' : ''}${r.tpts} <small>(${r.tickets.filter(t => t.ok).length}/${r.tickets.length})</small></td><td>${r.long}${r.bonus ? ' <small>+10</small>' : ''}</td><td><b>${r.total}</b></td></tr>`).join('')}</table></div>
    <div class="tkl">${(v.result.find(r => r.id === ui.myId) || { tickets: [] }).tickets.map(t => `<div class="t${t.ok ? ' ok' : ''}"><span>${t.ok ? '✅' : '❌'} ${esc(tkName(TICKETS[t.id]))}</span><b>${t.ok ? '+' : '−'}${TICKETS[t.id].pts}</b></div>`).join('')}</div>
    <div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
}
function render(v, prev) {
  if (!prev || prev.gid !== v.gid) { goal = null; offerKey = ''; }
  if (prev && prev.gid === v.gid && prev.seq !== v.seq && v.last) { if (v.last.t === 'claim' && (!prev.last || prev.last.route !== v.last.route)) beep('claim'); else if (v.last.t === 'draw') beep('card'); }
  if (prev && prev.finalLeft < 0 && v.finalLeft >= 0) { beep('horn'); toast('🚨 Lượt cuối! Mỗi người còn đúng 1 lượt.'); }
  draw(v);
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); openResult(v); } } else endShown = null;
}
$('#map').addEventListener('click', e => {
  const g = e.target.closest('.rt'), v = ui.view; if (!g || !v) return; const r = ROUTES[+g.dataset.r], own = v.owner[r.id];
  const info = `${CITIES[r.a][0]} – ${CITIES[r.b][0]}: ${r.n} toa ${r.c === 'x' ? 'cùng một màu bất kỳ' : 'màu ' + COLOR_NAME[r.c]} · ${ROUTE_PTS[r.n]} điểm`;
  if (own !== undefined) return toast(`${info}. Đã thuộc về ${own === ui.myId ? 'bạn' : (v.players.find(p => p.id === own) || {}).name}.`);
  const mine = v.players.find(p => p.id === ui.myId);
  if (v.spec || v.cur !== ui.myId || v.phase !== 'play' || v.offer) return toast(info);
  if (v.drawn) return toast('Bạn đang bốc dở – bốc nốt thẻ thứ hai đã.');
  const opts = r.n <= mine.trains ? E.payOptions(v.hand, r) : [];
  if (!opts.length) return toast(`${info}. ${r.n > mine.trains ? 'Bạn không đủ toa.' : 'Bạn chưa đủ thẻ.'}`);
  ui.openModal(`<h2>🛤️ Xây tuyến này?</h2><p class="center">${esc(info)}</p><div class="pay">${opts.map(o => `<button class="${o.color}" style="--cc:${o.color === 'L' ? '#6b5f8a' : CC(o.color)}" data-c="${o.color}">Trả ${r.n - o.locos ? (r.n - o.locos) + ' thẻ ' + COLOR_NAME[o.color] : ''}${r.n - o.locos && o.locos ? ' + ' : ''}${o.locos ? o.locos + ' đầu máy 🚂' : ''}</button>`).join('')}</div><div class="btns"><button class="btn" id="m-close">Thôi</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  document.querySelectorAll('.pay button').forEach(b => { b.onclick = () => { ui.closeModal(); ui.act({ type: 'claim', route: r.id, color: b.dataset.c }); }; });
});
$('#market').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; if (b.dataset.up !== undefined) ui.act({ type: 'up', i: +b.dataset.up }); else if ('deck' in b.dataset) ui.act({ type: 'deck' }); else if ('tk' in b.dataset) ui.act({ type: 'tickets' }); });
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'tickets') openTickets(v); else if (a === 'result') openResult(v); else if (a === 'pass') ui.act({ type: 'pass' });
  else if (a === 'again' && ui.isHost) ui.net.raw.start(); else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
});
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Tàu Xuyên Việt</h2>
    <p><b>Mục tiêu:</b> nhiều điểm nhất khi hết ván. Điểm đến từ <b>tuyến đã xây</b>, <b>vé đích hoàn thành</b> và <b>đường liên tục dài nhất</b> (+10).</p>
    <h3>Mỗi lượt chọn 1 trong 3 việc</h3><ul>
    <li><b>Bốc 2 thẻ toa</b>: lấy thẻ đang ngửa hoặc bốc chồng úp. Lấy <b>đầu máy 🚂 đang ngửa</b> thì chỉ được 1 thẻ đó.</li>
    <li><b>Xây 1 tuyến</b>: chạm tuyến đang nháy, trả đủ số thẻ <b>cùng màu với tuyến</b> (tuyến xám: màu nào cũng được, miễn cùng màu). Đầu máy thay được mọi màu. Tuyến dài ăn nhiều điểm: 1·2·4·7·10·15.</li>
    <li><b>Bốc vé đích 🎫</b>: nhận 3 vé, giữ ít nhất 1.</li></ul>
    <h3>Vé đích</h3><ul><li>Mỗi vé ghi hai thành phố. Nối được chúng bằng các tuyến <b>của mình</b> thì cộng điểm trên vé; hết ván chưa nối được thì <b>bị trừ</b> đúng số đó.</li><li>Vé của ai người đó biết, hết ván mới lộ.</li></ul>
    <h3>Hết ván</h3><ul><li>Ai còn <b>2 toa trở xuống</b> thì mỗi người (kể cả người đó) đi thêm đúng 1 lượt rồi tính điểm.</li><li>Người đi sau được thêm thẻ lúc đầu để bù thiệt.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('xuyenviet-sound', sound ? '1' : '0'); drawSound(); beep('card'); };
const ui = gameKit({ game: 'xuyenviet', net: NET, onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); }, onState: (v, prev) => { if (v) render(v, prev); else { endShown = null; goal = null; offerKey = ''; } }, offline: h => { h.addBot(); h.addBot(); } });
