// 🚁 Đội Cứu Hộ – giao diện. Luật ở engine.js, máy ở bot.js, phòng/mạng dùng shared/net/simplenet.js. Bản đồ dùng chung hình Việt Nam của Tàu Xuyên Việt.
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { DEF } from './def.js?v=3';
import * as E from './engine.js?v=4';
import { CITIES, ROUTES } from '../../xuyenviet/js/map.js?v=4';
import { LAND, LBL, MAP_W, MAP_H } from '../../xuyenviet/js/geo.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { toast } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet(DEF);
const { COLORS, HAZ, HAZ_ICON, CITY_COLOR, CITY_IDS, ROLE_NAME, ROLE_ICON, ROLE_COLOR, ROLE_DO, EVENT_NAME, EVENT_ICON, EVENT_DO } = E;
const CC = c => `var(--h-${c})`, LV = { 4: 'Dễ', 5: 'Vừa', 6: 'Khó' };
let sound = ls.get('cuuho-sound') !== '0', endShown = null, ac = null, picked = null;
/* 🎯 xoay lượt đầu qua các ván trong phòng này: nhớ người đi đầu ván trước
   (theo ghế ngồi ở phòng chờ — engine không xáo ghế nên ghế lobby = ghế ván). */
let ftLastIdx = -1, ftLastId = null, ftGameNo = 0, ftN = 0, ftGid = null;
const ftExtra = () => (ftLastIdx < 0 || ftN < 2 ? undefined : { firstIdx: (ftLastIdx + 1) % ftN, gameNo: ftGameNo + 1 });
const ftNote = v => {
  const i = v.firstIdx != null ? v.firstIdx : v.turn;
  if (i >= 0 && v.players[i]) { ftLastIdx = i; ftLastId = v.players[i].id; ftGameNo = v.gameNo || ftGameNo + 1; }
  ftN = v.players.length;
};
const ftNext = n => (n < 2 ? -1 : ftLastIdx < 0 ? 0 : (ftLastIdx + 1) % n); /* ghế đi đầu ván tới (ván đầu: ghế 0) */
function beep(kind) {
  if (!sound) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { step: [[620, 0, .05]], treat: [[523, 0, .06], [784, .06, .1]], boom: [[110, 0, .35], [82, .05, .4]], epi: [[220, 0, .25], [196, .25, .25], [174, .5, .4]], cure: [[523, 0, .1], [659, .1, .1], [784, .2, .1], [1047, .3, .25]], win: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .35]], lose: [[392, 0, .2], [330, .2, .2], [262, .4, .45]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = kind === 'boom' || kind === 'epi' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(kind === 'boom' ? .14 : .09, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}
// ---------- bản đồ ----------
const VB = `0 0 ${MAP_W + 14} ${MAP_H}`;
const XY = k => [CITIES[k][1], CITIES[k][2]];
function mapSVG(v, o = {}) {
  let h = `<path class="land" d="${LAND}"/><text class="sea" x="${MAP_W - 22}" y="62">Biển Đông</text>
    <g class="isl"><circle cx="${MAP_W + 4}" cy="97" r="1.2"/><circle cx="${MAP_W + 7}" cy="99.5" r=".9"/><circle cx="${MAP_W + 2.5}" cy="101" r=".8"/><text x="${MAP_W + 12}" y="107">QĐ. Hoàng Sa</text>
    <circle cx="${MAP_W + 2}" cy="178" r="1"/><circle cx="${MAP_W + 7}" cy="182" r="1.1"/><circle cx="${MAP_W + 4}" cy="186.5" r=".8"/><circle cx="${MAP_W + 9}" cy="175" r=".8"/><text x="${MAP_W + 12}" y="193">QĐ. Trường Sa</text></g>`;
  const seen = new Set();
  for (const r of ROUTES) { if (r.xv) continue; const key = [r.a, r.b].sort().join(); if (seen.has(key)) continue; seen.add(key); const [ax, ay] = XY(r.a), [bx, by] = XY(r.b); h += `<line class="road" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`; }
  for (const k of CITY_IDS) {
    const [x, y] = XY(k), l = LBL[k] || [2.6, 1.2, 'start'], c = CITY_COLOR[k], cub = v ? v.cubes[k] : null, st = v && v.stations.includes(k);
    const cls = ['city', o.can && o.can.has(k) ? 'can' : '', v && (v.burst || []).includes(k) ? 'boom' : '', v && (v.hits || []).includes(k) ? 'hit' : '', o.sel === k ? 'sel' : ''].join(' ');
    let pips = '';
    if (cub) { let i = 0; for (const cc of COLORS) for (let n = 0; n < cub[cc]; n++, i++) pips += `<rect class="pip" x="${(x - 3.6 + (i % 3) * 2.6).toFixed(2)}" y="${(y - 5.9 - Math.floor(i / 3) * 2.6).toFixed(2)}" width="2.3" height="2.3" rx=".5" fill="${CC(cc)}"/>`; }
    h += `<g class="${cls}" data-c="${k}"><circle class="ring" cx="${x}" cy="${y}" r="2.6" fill="${CC(c)}"/>${st ? `<text class="st" x="${x}" y="${y + 1.25}">🏠</text>` : ''}<text class="nm" x="${x + l[0]}" y="${y + l[1]}" text-anchor="${l[2]}">${esc(CITIES[k][0])}</text>${pips}<circle class="hitbox" cx="${x}" cy="${y}" r="5"/></g>`;
  }
  if (v) { const by = {}; for (const p of v.players) (by[p.at] ||= []).push(p);
    for (const [k, ps] of Object.entries(by)) { const [x, y] = XY(k); ps.forEach((p, i) => { const px = x + 3.4 + i * 2.6, py = y + 3; h += `<g class="pawn${p.id === v.cur ? ' turn' : ''}"><circle cx="${px}" cy="${py}" r="1.55" fill="${ROLE_COLOR[p.role]}"/><text x="${px}" y="${py + .75}">${ROLE_ICON[p.role]}</text></g>`; }); } }
  return h;
}
$('#hero').innerHTML = `<svg viewBox="${VB}">${mapSVG(null)}</svg>`; $('#map').setAttribute('viewBox', VB); document.documentElement.style.setProperty('--map-ar', `${MAP_W + 14} / ${MAP_H}`);
// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  $('#pcount').textContent = `${n}/4 người`;
  if (ftLastId && !info.players.some(p => p.id === ftLastId)) { ftLastIdx = -1; ftLastId = null; ftGameNo = 0; } /* sang phòng khác / người đi đầu đã rời: quên lượt cũ */
  ftN = n;
  const nextFirst = ftNext(n);
  $('#plist').innerHTML = info.players.map((p, i) => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}${i === nextFirst ? ' <span class="ft-badge">🎯 Đi trước</span>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 4 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>⚠️ Độ khó</b><div class="seg">${[4, 5, 6].map(x => `<button type="button" data-opt="epi" data-v="${x}" aria-pressed="${o.epi === x}" ${dis}>${LV[x]} · ${x}</button>`).join('')}</div><small>Số lá ⚠️ Siêu thiên tai trộn trong chồng thẻ. Mới chơi thì chọn Dễ.</small></div>
    <div class="opt"><b>🤝 Chơi chung</b><small>Cả bàn cùng thắng hoặc cùng thua. Bài ai cũng thấy – bàn bạc thoải mái nha!</small></div>
    <div class="opt"><b>🎯 Người đi đầu</b><small>${ftLastIdx < 0 || nextFirst < 0 ? 'Ván đầu: người ngồi ghế đầu đi trước.' : `Ván sau: ${esc(cleanName(info.players[nextFirst].name))} đi trước (xoay lượt qua các ván).`}</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2; $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt(b.dataset.opt, +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start(ftExtra());
// ---------- ván chơi ----------
const nameOf = (v, id) => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : '?'; };
const meP = v => v.players.find(p => p.id === ui.myId);
const myTurn = v => !v.spec && v.phase === 'play' && v.cur === ui.myId && v.step === 'act';
const cardHTML = (c, attrs = '') => E.isEvent(c) ? `<button class="pc ev" ${attrs} title="${esc(EVENT_DO[c.slice(3)])}"><b>${EVENT_ICON[c.slice(3)]}</b><span>${EVENT_NAME[c.slice(3)]}</span></button>`
  : `<button class="pc" style="--cc:${CC(CITY_COLOR[c])}" ${attrs}><b>${HAZ_ICON[CITY_COLOR[c]]}</b><span>${esc(E.cityName(c))}</span></button>`;
function draw(v) {
  const me = meP(v), mine = myTurn(v), can = new Set();
  if (mine) for (const k of CITY_IDS) if (E.moveWays(v, me, k).length) can.add(k);
  $('#map').innerHTML = mapSVG(v, { can, sel: picked });
  const cp = v.players.find(p => p.id === v.cur);
  $('#round').textContent = v.phase === 'ended' ? (v.result && v.result.win ? '🏆 Cả đội thắng!' : '💀 Cả đội thua') : v.step === 'discard' ? `🃏 ${cp ? cleanName(cp.name) : ''} bỏ bớt thẻ` : `${v.cur === ui.myId ? '👉 Lượt bạn' : '⏳ ' + (cp ? cleanName(cp.name) : '')} · còn ${v.left} việc`;
  $('#track').innerHTML = `<span class="tk${v.outbreaks >= 6 ? ' red' : ''}" title="Số lần vỡ đê (8 là thua)">💥 ${v.outbreaks}/8</span><span class="tk" title="Mỗi lượt có bấy nhiêu nơi bị thiên tai">🌧️ ×${v.rate}</span><span class="tk" title="Thẻ cứu hộ còn lại · Siêu thiên tai còn trong chồng">🃏 ${v.pDeckN} · ⚠️${v.epiLeft}</span>`
    + COLORS.map(c => `<span class="cure${v.cured[c] ? ' on' : ''}${v.gone[c] ? ' gone' : ''}" style="--cc:${CC(c)}" title="${HAZ[c]}: ${v.gone[c] ? 'đã dập tắt hẳn' : v.cured[c] ? 'đã khắc phục' : 'chưa khắc phục'} · ${E.totalCubes(v, c)}/24 điểm nguy">${HAZ_ICON[c]}${v.cured[c] ? '✓' : ''}</span>`).join('');
  $('#seats').innerHTML = v.players.map(p => `<div class="seat${p.id === v.cur ? ' turn' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" style="--pc:${ROLE_COLOR[p.role]}" data-pid="${p.id}"><span class="rl" data-role="${p.id}" role="button" tabindex="0" title="${esc(ROLE_DO[p.role])}">${ROLE_ICON[p.role]}</span><span class="nm">${esc(cleanName(p.name))}${p.id === ui.myId ? ' (bạn)' : ''}<small>${ROLE_NAME[p.role]} · 📍${esc(E.cityName(p.at))}</small></span><span class="hd" data-hand="${p.id}" role="button" tabindex="0" title="Xem bài">🃏 ${p.hand.length}</span></div>`).join('');
  let msg = '';
  if (v.phase === 'ended') msg = v.result && v.result.win ? '🎉 Cả đội đã khắc phục đủ 4 loại thiên tai!' : `💀 Thua: ${esc(v.result && v.result.why || '')}`;
  else if (v.spec) msg = '<small>👀 Bạn đang xem.</small>';
  else if (v.step === 'discard') msg = v.cur === ui.myId ? '🃏 Quá 7 thẻ – chọn 1 thẻ để bỏ.' : `<small>Chờ ${nameOf(v, v.cur)} bỏ bớt thẻ…</small>`;
  else if (mine) msg = `Còn <b>${v.left}</b> việc. Chạm thành phố đang nháy để đi, hoặc chọn việc bên dưới.`;
  else msg = `<small>Chờ ${nameOf(v, v.cur)}…</small>`;
  if (v.log.length) msg += `<br><small>${esc(v.log[v.log.length - 1])}</small>`;
  $('#msg').innerHTML = msg;
  let acts = '';
  if (v.phase === 'ended') acts = `<button class="btn" data-a="log">📜 Nhật ký</button>` + (!v.spec && v.canUndo ? `<button class="btn" data-a="undo">↩️ Hoàn tác</button>` : '') + (ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button>' + (v.seed != null ? '<button class="btn" data-a="replay">🔂 Chơi lại ván cũ</button>' : '') + '<button class="btn" data-a="lobby">Về phòng chờ</button>' : '');
  else if (mine) {
    const here = v.cubes[me.at], cubes = COLORS.filter(c => here[c] > 0), sta = v.stations.includes(me.at);
    const cureC = sta ? COLORS.filter(c => !v.cured[c] && me.hand.filter(x => CITY_COLOR[x] === c).length >= E.curePrice(me)) : [];
    const mates = v.players.filter(o => o !== me && o.at === me.at);
    acts = `<button class="btn" data-a="treat" ${cubes.length ? '' : 'disabled'}>🧹 Cứu nạn</button>`
      + `<button class="btn" data-a="build" ${!sta && (me.role === 'engineer' || me.hand.includes(me.at)) ? '' : 'disabled'}>🏠 Lập trạm</button>`
      + `<button class="btn" data-a="share" ${mates.length ? '' : 'disabled'}>🤝 Trao thẻ</button>`
      + (cureC.length ? `<button class="btn pri" data-a="cure">💊 Khắc phục</button>` : '')
      + `<button class="btn" data-a="pass">⏭️ Xong lượt</button>`;
  }
  if (v.phase === 'play' && !v.spec && me && me.hand.some(E.isEvent)) acts += `<button class="btn ev" data-a="event">✨ Thẻ đặc biệt</button>`;
  if (v.phase === 'play') acts += `<button class="btn" data-a="log">📜</button>` + (!v.spec && v.canUndo ? `<button class="btn" data-a="undo">↩️ Hoàn tác</button>` : '');
  $('#acts').innerHTML = acts;
  $('#hand').innerHTML = !me ? '' : `<span class="lbl">Bài<br>của bạn</span>` + me.hand.map((c, i) => cardHTML(c, `data-card="${i}"`)).join('');
  if (v.step === 'discard' && v.cur === ui.myId) openDiscard(v); else if ($('#modal-box').dataset.k === 'discard') ui.closeModal();
}
function pick(title, items, cb) { /* hộp chọn chung: items = [{ label, html?, val }] */
  ui.openModal(`<h2>${title}</h2><div class="pick">${items.map((x, i) => `<button class="btn" data-i="${i}">${x.html || esc(x.label)}</button>`).join('')}</div><div class="btns"><button class="btn" id="m-close">Thôi</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  document.querySelectorAll('.pick [data-i]').forEach(b => { b.onclick = () => { ui.closeModal(); cb(items[+b.dataset.i].val); }; });
}
function openDiscard(v) {
  const me = meP(v);
  ui.openModal(`<h2>🃏 Bỏ bớt 1 thẻ</h2><p class="center">Tay chỉ giữ được 7 thẻ. Thẻ đặc biệt ✨ có thể dùng luôn thay vì bỏ.</p><div class="cards">${me.hand.map((c, i) => cardHTML(c, `data-d="${i}"`)).join('')}</div>`);
  $('#modal-box').dataset.k = 'discard';
  document.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const c = me.hand[+b.dataset.d]; $('#modal-box').dataset.k = ''; ui.closeModal(); if (E.isEvent(c)) useEvent(c.slice(3)); else ui.act({ type: 'discard', card: c }); }; });
}
const WAY = { move: '🚶 Đi bộ (đường kề)', shuttle: '🏠 Đi giữa hai trạm', fly: '✈️ Bay – bỏ thẻ nơi đến', charter: '🛩️ Thuê chuyến – bỏ thẻ nơi đang đứng' };
function cityInfo(v, k) {
  const c = v.cubes[k], ps = v.players.filter(p => p.at === k).map(p => ROLE_ICON[p.role] + ' ' + esc(cleanName(p.name)));
  return `${HAZ_ICON[CITY_COLOR[k]]} <b>${esc(E.cityName(k))}</b> · vùng ${HAZ[CITY_COLOR[k]]}${v.stations.includes(k) ? ' · 🏠 có trạm' : ''}<br>${COLORS.filter(x => c[x]).map(x => `${HAZ_ICON[x]} ${c[x]}`).join(' · ') || 'Bình yên'}${ps.length ? '<br>' + ps.join(', ') : ''}`;
}
$('#map').addEventListener('click', e => {
  const g = e.target.closest('.city'), v = ui.view; if (!g || !v) return; const k = g.dataset.c;
  picked = k; draw(v); setTimeout(() => { if (picked === k) { picked = null; ui.view && draw(ui.view); } }, 2500);
  const me = meP(v), ways = myTurn(v) ? E.moveWays(v, me, k) : [];
  if (!ways.length) return toast(cityInfo(v, k).replace(/<br>/g, ' · ').replace(/<[^>]+>/g, ''));
  if (ways.length === 1 && ways[0].type === 'move') return ui.act(ways[0]);
  ui.openModal(`<h2>🗺️ Tới ${esc(E.cityName(k))}?</h2><p class="center">${cityInfo(v, k)}</p><div class="pick">${ways.map((w, i) => `<button class="btn" data-w="${i}">${WAY[w.type]}</button>`).join('')}</div><div class="btns"><button class="btn" id="m-close">Thôi</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  document.querySelectorAll('[data-w]').forEach(b => { b.onclick = () => { ui.closeModal(); ui.act(ways[+b.dataset.w]); }; });
});
function useEvent(ev) {
  const v = ui.view; if (!v) return;
  if (ev === 'calm') return ui.act({ type: 'event', ev });
  if (ev === 'heli') return pick('🚁 Đưa ai đi?', v.players.map(p => ({ label: ROLE_ICON[p.role] + ' ' + cleanName(p.name), val: p.id })), who => pick('🚁 Tới đâu?', CITY_IDS.map(k => ({ label: HAZ_ICON[CITY_COLOR[k]] + ' ' + E.cityName(k), val: k })), to => ui.act({ type: 'event', ev, who, to })));
  if (ev === 'camp') return pick('⛺ Lập trạm ở đâu?', CITY_IDS.filter(k => !v.stations.includes(k)).map(k => ({ label: HAZ_ICON[CITY_COLOR[k]] + ' ' + E.cityName(k), val: k })), to => ui.act({ type: 'event', ev, to }));
  if (ev === 'fund') { if (!v.infDisc.length) return toast('Chồng thẻ thiên tai đã bốc đang trống.'); return pick('💰 Gia cố thành phố nào?', v.infDisc.map(k => ({ label: HAZ_ICON[CITY_COLOR[k]] + ' ' + E.cityName(k), val: k })), city => ui.act({ type: 'event', ev, city })); }
}
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v || b.disabled) return; const a = b.dataset.a, me = meP(v);
  if (a === 'again' && ui.isHost) return ui.net.raw.start(ftExtra()); if (a === 'lobby' && ui.isHost) return ui.net.raw.restart();
  if (a === 'replay' && ui.isHost && v.seed != null) return ui.net.raw.start({ seed: v.seed, firstIdx: v.firstIdx }); /* chơi lại đúng ván cũ: cùng seed + cùng người đi đầu → cùng bài chia ban đầu */
  if (a === 'undo') return ui.act({ type: 'undo' });
  if (a === 'log') { ui.openModal(`<h2>📜 Nhật ký</h2><div class="log">${v.log.slice().reverse().map(x => `<p>${esc(x)}</p>`).join('')}</div><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`); $('#m-close').onclick = ui.closeModal; return; }
  if (a === 'event') return pick('✨ Dùng thẻ đặc biệt', me.hand.filter(E.isEvent).map(c => ({ html: `${EVENT_ICON[c.slice(3)]} <b>${EVENT_NAME[c.slice(3)]}</b><br><small>${EVENT_DO[c.slice(3)]}</small>`, val: c.slice(3) })), useEvent);
  if (a === 'pass') return ui.act({ type: 'pass' });
  if (a === 'build') return ui.act({ type: 'build' });
  if (a === 'treat') { const cs = COLORS.filter(c => v.cubes[me.at][c] > 0); return cs.length === 1 ? ui.act({ type: 'treat', color: cs[0] }) : pick('🧹 Cứu loại nào?', cs.map(c => ({ label: `${HAZ_ICON[c]} ${HAZ[c]} (${v.cubes[me.at][c]})`, val: c })), color => ui.act({ type: 'treat', color })); }
  if (a === 'cure') { const cs = COLORS.filter(c => !v.cured[c] && me.hand.filter(x => CITY_COLOR[x] === c).length >= E.curePrice(me)); return pick('💊 Khắc phục loại nào?', cs.map(c => ({ label: `${HAZ_ICON[c]} ${HAZ[c]} – bỏ ${E.curePrice(me)} thẻ`, val: c })), color => ui.act({ type: 'cure', color })); }
  if (a === 'share') {
    const items = [];
    for (const o of v.players.filter(o => o !== me && o.at === me.at)) {
      for (const c of me.hand.filter(x => E.isCity(x) && (x === me.at || me.role === 'logistic'))) items.push({ label: `➡️ Trao ${E.cityName(c)} cho ${cleanName(o.name)}`, val: { type: 'give', other: o.id, card: c } });
      for (const c of o.hand.filter(x => E.isCity(x) && (x === me.at || o.role === 'logistic'))) items.push({ label: `⬅️ Lấy ${E.cityName(c)} của ${cleanName(o.name)}`, val: { type: 'take', other: o.id, card: c } });
    }
    if (!items.length) return toast(`Chỉ trao được thẻ ${E.cityName(me.at)} (thành phố đang đứng) – Hậu cần 📦 thì trao thẻ nào cũng được.`);
    return pick('🤝 Trao / nhận thẻ', items, x => ui.act(x));
  }
});
$('#seats').addEventListener('click', e => {
  const v = ui.view; if (!v) return; const r = e.target.closest('[data-role]'), h = e.target.closest('[data-hand]');
  const p = v.players.find(x => x.id === (r ? r.dataset.role : h ? h.dataset.hand : '')); if (!p) return; e.stopPropagation();
  ui.openModal(`<h2>${ROLE_ICON[p.role]} ${esc(cleanName(p.name))} – ${ROLE_NAME[p.role]}</h2><p class="center">${esc(ROLE_DO[p.role])}</p><p class="center">📍 ${esc(E.cityName(p.at))}</p><div class="cards">${p.hand.map(c => cardHTML(c, 'disabled')).join('') || '<p class="center">Chưa có thẻ.</p>'}</div><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
});
$('#hand').addEventListener('click', e => {
  const b = e.target.closest('[data-card]'), v = ui.view; if (!b || !v) return; const me = meP(v), c = me.hand[+b.dataset.card];
  if (E.isEvent(c)) { if (v.phase === 'play') useEvent(c.slice(3)); return; }
  toast(`${HAZ_ICON[CITY_COLOR[c]]} ${E.cityName(c)}: bay tới đây, thuê chuyến khi đang đứng ở đây, lập trạm ở đây, hoặc gom ${E.curePrice(me)} thẻ ${HAZ[CITY_COLOR[c]]} để khắc phục.`);
});
function render(v, prev) {
  if (v.gid !== ftGid) {
    /* 🎯 ván mới mở: ghi nhớ + công bố người đi đầu (cả online lẫn chung máy) */
    ftGid = v.gid; ftNote(v);
    const fp = v.players[v.firstIdx != null ? v.firstIdx : v.turn];
    if (fp && v.phase === 'play') toast(fp.id === ui.myId ? '🎯 Bạn đi trước!' : `🎯 ${cleanName(fp.name)} đi trước!`);
  }
  if (prev && prev.gid === v.gid && prev.seq !== v.seq) {
    if (v.outbreaks > prev.outbreaks) { beep('boom'); toast(`💥 Vỡ đê! (${v.outbreaks}/8)`); }
    else if (v.rateI > prev.rateI) { beep('epi'); toast(`⚠️ Siêu thiên tai ở ${E.cityName(v.lastEpi)}!`); }
    else if (COLORS.some(c => v.cured[c] && !prev.cured[c])) beep('cure');
    else if (v.last && v.last.t === 'treat') beep('treat'); else beep('step');
  }
  draw(v);
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep(v.result && v.result.win ? 'win' : 'lose'); } } else endShown = null;
}
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Đội Cứu Hộ</h2>
    <p><b>Chơi chung:</b> cả bàn là một đội cứu hộ. <b>Thắng</b> khi khắc phục đủ 4 loại thiên tai: 🌊 Lũ quét (miền Bắc), 🌀 Bão (Bắc Trung Bộ), 🔥 Cháy rừng (Tây Nguyên – Nam Trung Bộ), 🏜️ Hạn mặn (miền Nam).</p>
    <p><b>Thua</b> khi: vỡ đê 8 lần · một loại thiên tai lan hết 24 điểm nguy · hết chồng thẻ cứu hộ.</p>
    <h3>Mỗi lượt làm 4 việc (chọn tuỳ ý, lặp lại cũng được)</h3><ul>
    <li>🚶 <b>Đi</b> sang thành phố kề (có đường nối).</li>
    <li>✈️ <b>Bay</b>: bỏ thẻ của nơi muốn tới. 🛩️ <b>Thuê chuyến</b>: bỏ thẻ của nơi đang đứng để tới bất kỳ đâu. 🏠 Đang ở trạm thì đi thẳng tới trạm khác.</li>
    <li>🧹 <b>Cứu nạn</b>: bỏ 1 điểm nguy ở chỗ đang đứng (loại đã khắc phục thì dọn sạch luôn).</li>
    <li>🏠 <b>Lập trạm</b>: bỏ thẻ của nơi đang đứng.</li>
    <li>🤝 <b>Trao thẻ</b>: hai người đứng cùng chỗ trao nhau thẻ của chính thành phố đó.</li>
    <li>💊 <b>Khắc phục</b>: đứng ở trạm, bỏ 4 thẻ cùng màu.</li></ul>
    <h3>Hết 4 việc</h3><ul><li>Bốc 2 thẻ cứu hộ. Gặp ⚠️ <b>Siêu thiên tai</b>: mức thiên tai tăng, một thành phố bị 3 điểm nguy, và các nơi vừa bị sẽ dễ bị lại.</li>
    <li>Rồi vài thành phố (số 🌧️) bị thêm 1 điểm nguy. Nơi đã có 3 mà bị thêm thì <b>💥 vỡ đê</b>: lan sang mọi thành phố kề.</li><li>Tay giữ tối đa 7 thẻ.</li></ul>
    <h3>Vai trò</h3><ul>${E.ROLES.map(r => `<li>${ROLE_ICON[r]} <b>${ROLE_NAME[r]}</b>: ${esc(ROLE_DO[r])}</li>`).join('')}</ul>
    <p>↩️ <b>Hoàn tác</b>: bấm để quay lại nước trước của mình (kể cả nước máy vừa đi sau đó). 🔂 <b>Chơi lại ván cũ</b> (màn hình kết thúc, chủ phòng bấm): chơi lại đúng ván đó, bài chia ban đầu y hệt.</p>
    <h3>Thẻ đặc biệt ✨ (dùng lúc nào cũng được, không tốn việc)</h3><ul>${E.EVENTS.map(x => `<li>${EVENT_ICON[x]} <b>${EVENT_NAME[x]}</b>: ${esc(EVENT_DO[x])}</li>`).join('')}</ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('cuuho-sound', sound ? '1' : '0'); drawSound(); beep('step'); };
const ui = gameKit({ game: 'cuuho', net: NET, onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); }, onState: (v, prev) => { if (v) render(v, prev); else { endShown = null; picked = null; } }, offline: h => { h.addBot(); } });
