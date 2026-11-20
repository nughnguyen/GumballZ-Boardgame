// 🏝️ Đảo Khai Hoang – giao diện. Luật ở engine.js, hình học bàn ở map.js, máy ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=4';
import { HEXES, VERTS, EDGES, PIP, S } from './map.js?v=2';
import { botAction } from './bot.js?v=4';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { toast } from '../../shared/ui/dialog.js?v=8';
import { createDiceView } from '../../shared/js/dice3d-gl.js?v=4';

const NET = makeNet(DEF);
const RES = E.RES, RN = E.RES_NAME, HEX_NAME = { w: 'Rừng', b: 'Đồi đất', g: 'Ruộng lúa', f: 'Đồng cỏ', o: 'Núi đá', d: 'Bãi cát' };
const BUILD = { road: ['🛤️', 'Đường'], village: ['🏠', 'Làng'], town: ['🏘️', 'Thành phố'] };
const CARD = { guard: ['🛡️', 'Dời tên cướp sang ô khác rồi lấy 1 thẻ của người có làng cạnh ô đó. Dùng 3 thẻ nhiều nhất bàn: +2 điểm.'], vp: ['🏛️', '+1 điểm. Giữ kín tới khi thắng.'], road: ['🛤️', 'Làm ngay 2 con đường miễn phí.'], plenty: ['🌾', 'Lấy 2 tài nguyên tuỳ chọn từ kho.'], mono: ['🧺', 'Chọn 1 loại tài nguyên: cả bàn phải đưa hết loại đó cho bạn.'] };
let sound = ls.get('khaihoang-sound') !== '0', endShown = null, mode = null, discFor = null, stealFor = null, ac = null;
// ---------- xúc xắc 3D (model GLB) ----------
// Góc bản đồ chỉ còn bảng tổng nhỏ (đặt mặt tĩnh); nước đổ mới lăn to ở
// GIỮA bàn qua overlay #dice-ov rồi mờ dần. Hỏng WebGL/GLB thì về 2D như cũ.
let _glDice = null, _glDiceFailed = false, _glDiceLast = '';
$('#dice').innerHTML = `<div class="gl-holder" hidden></div><b class="dsum" hidden></b><div class="dice2d"></div>`;
(async () => {
  const holder = document.querySelector('#dice .gl-holder');
  if (!holder) return;
  const view = await createDiceView(holder, { count: 2, diePx: 34, gapPx: 6, w: 74, h: 44, muted: () => !sound });
  if (view) _glDice = { view }; else _glDiceFailed = true;
})();
// overlay lăn giữa bàn: hiện khi có nước đổ mới, mờ sau ~1.7s
let _glOv = null, _glOvLast = '', _glOvTimer = 0;
(async () => {
  const mapbox = document.querySelector('.mapbox');
  if (!mapbox) return;
  const ov = document.createElement('div');
  ov.className = 'dice-ov'; ov.id = 'dice-ov'; ov.setAttribute('aria-hidden', 'true');
  const holder = document.createElement('div'); holder.className = 'gl-holder';
  ov.appendChild(holder); mapbox.appendChild(ov);
  const view = await createDiceView(holder, { count: 2, diePx: 72, gapPx: 12, muted: () => !sound });
  if (view) _glOv = { view, ov }; else ov.remove();
})();
function beep(kind) {
  if (!sound) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { build: [[330, 0, .07], [494, .07, .1]], gain: [[784, 0, .06], [1047, .06, .1]], storm: [[196, 0, .3], [185, .12, .35]], trade: [[587, 0, .07], [740, .08, .1]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = kind === 'storm' ? 'sawtooth' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(kind === 'storm' ? .05 : .1, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}
// ---------- hình vẽ (tự vẽ bằng SVG, toạ độ quanh tâm 0,0 trong khung ±4.5) ----------
const GLYPH = {
  w: '<path d="M-3.4 2.4L-1.7-1.8 0 2.4ZM.4 2.8 2.1-2.6 3.8 2.8Z" fill="#2f7a3d"/><path d="M-1.5 3 0-.8 1.5 3Z" fill="#46a35a"/>',
  b: '<g fill="#b4532a"><rect x="-3.4" y="-2.3" width="3.1" height="1.9" rx=".3"/><rect x=".3" y="-2.3" width="3.1" height="1.9" rx=".3"/><rect x="-1.55" y=".3" width="3.1" height="1.9" rx=".3"/><rect x="-3.9" y=".3" width="1.8" height="1.9" rx=".3"/><rect x="2.1" y=".3" width="1.8" height="1.9" rx=".3"/></g>',
  g: '<path d="M0 3.2C-.2 .4-2.4-.8-3.1-2.6M0 3.2V-3.2M0 3.2C.2 .4 2.4-.8 3.1-2.6" stroke="#b7791f" stroke-width=".9" fill="none" stroke-linecap="round"/><g fill="#e0a526"><circle cx="-3.1" cy="-2.6" r=".85"/><circle cy="-3.2" r=".85"/><circle cx="3.1" cy="-2.6" r=".85"/><circle cx="-1.5" cy="-.9" r=".7"/><circle cx="1.5" cy="-.9" r=".7"/></g>',
  f: '<g fill="#3a3550"><rect x="-2.3" y="1" width=".9" height="2.4" rx=".3"/><rect x="1" y="1" width=".9" height="2.4" rx=".3"/></g><g fill="#fff" stroke="#3a3550" stroke-width=".35"><circle cx="-1.6" cy="-.2" r="1.7"/><circle cx=".3" cy="-.9" r="1.8"/><circle cx="1.6" cy=".3" r="1.6"/><circle cx="-.1" cy=".8" r="1.6"/></g><ellipse cx="-3.1" cy="-.9" rx="1.25" ry="1.05" fill="#3a3550"/><circle cx="-3.4" cy="-1.1" r=".28" fill="#fff"/>',
  o: '<path d="M-4.2 2.8-1.3-2.8 1.5 2.8Z" fill="#7b8794"/><path d="M-.6 2.8 1.9-1.5 4.3 2.8Z" fill="#5f6b78"/><path d="M-2-1.45-1.3-2.8-.6-1.45Z" fill="#fff"/>',
  d: '<path d="M-3.6 .6Q-1.6-1.4 .4 .6M-.2 2.4Q1.8 .6 3.8 2.4" stroke="#c39a52" stroke-width=".8" fill="none" stroke-linecap="round"/>',
};
const ico = (r, cls = '') => `<svg class="ri ${cls}" viewBox="-4.6 -4.6 9.2 9.2" aria-hidden="true">${GLYPH[r]}</svg>`;
const bag = b => RES.filter(r => b[r]).map(r => `<span class="bg">${b[r] > 1 ? b[r] : ''}${ico(r)}</span>`).join('') || '–';
const bagText = b => RES.filter(r => b[r]).map(r => `${b[r]} ${RN[r]}`).join(', ');
const hexPts = h => h.v.map(v => VERTS[v].x + ',' + VERTS[v].y).join(' ');
const HOUSE = { 1: 'M-2.1 2V-.3L0-2.4 2.1-.3V2Z', 2: 'M-3.1 2.4V-1.1L-1.3-3.1 .5-1.1V-.2H3.1V2.4Z' };
function boardSVG(v, o = {}) {
  const col = id => (v.players.find(p => p.id === id) || {}).color || '#888';
  let h = '<g class="isle">' + HEXES.map(hx => `<polygon points="${hexPts(hx)}"/>`).join('') + '</g>';
  for (const p of v.ports) { const a = VERTS[p.v[0]], b = VERTS[p.v[1]], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(mx, my), bx = mx + mx / d * 6, by = my + my / d * 6;
    h += `<g class="port" data-port="${p.t}"><path d="M${a.x} ${a.y}L${bx.toFixed(1)} ${by.toFixed(1)}L${b.x} ${b.y}"/><circle class="t-${p.t === '*' ? 'x' : p.t}" cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="3.1"/><text x="${bx.toFixed(1)}" y="${(by + .9).toFixed(1)}">${p.t === '*' ? '3:1' : '2:1'}</text></g>`; }
  HEXES.forEach((hx, i) => { const x = v.hexes[i], hot = x.n === 6 || x.n === 8;
    h += `<g class="hex t-${x.t}${v.dice && v.dice[0] + v.dice[1] === x.n && v.phase !== 'roll' && i !== v.storm ? ' hit' : ''}" data-h="${i}"><polygon points="${hexPts(hx)}"/><g transform="translate(${hx.x.toFixed(2)} ${(hx.y - (x.n ? 3.7 : 0)).toFixed(2)})">${GLYPH[x.t]}</g>`
      + (x.n ? `<g class="tok${hot ? ' hot' : ''}" transform="translate(${hx.x.toFixed(2)} ${(hx.y + 3.6).toFixed(2)})"><circle r="3.2"/><text y=".9">${x.n}</text>${Array.from({ length: PIP[x.n] }, (_, k) => `<circle class="pip" cx="${((k - (PIP[x.n] - 1) / 2) * .9).toFixed(2)}" cy="2.1" r=".3"/>`).join('')}</g>` : '') + '</g>'; });
  { const hx = HEXES[v.storm]; h += `<g class="storm" transform="translate(${hx.x.toFixed(2)} ${(hx.y + (v.hexes[v.storm].n ? 3.6 : 3.4)).toFixed(2)})"><circle r="3.6"/><path d="M-1.9 2.4C-1.9 .4-.9-.2 0-.2S1.9 .4 1.9 2.4Z"/><circle class="hd" cy="-1.5" r="1.25"/></g>`; }
  for (const e in v.R) { const E_ = EDGES[e], a = VERTS[E_.a], b = VERTS[E_.b], k = .16, x1 = a.x + (b.x - a.x) * k, y1 = a.y + (b.y - a.y) * k, x2 = b.x + (a.x - b.x) * k, y2 = b.y + (a.y - b.y) * k;
    h += `<g class="road${v.last && v.last.t === 'build' && v.last.kind === 'road' && v.last.at === +e ? ' last' : ''}"><line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/><line class="c" style="stroke:${col(v.R[e])}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/></g>`; }
  for (const k in v.B) { const b = v.B[k], p = VERTS[k]; h += `<path class="bd${v.last && v.last.t === 'build' && v.last.kind !== 'road' && v.last.at === +k ? ' last' : ''}" transform="translate(${p.x} ${p.y}) scale(1.25)" d="${HOUSE[b.t]}" fill="${col(b.p)}"/>`; }
  if (o.kind === 'road') for (const e of o.list) { const a = VERTS[EDGES[e].a], b = VERTS[EDGES[e].b]; h += `<line class="tg" data-e="${e}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`; }
  else if (o.kind === 'village' || o.kind === 'town') for (const k of o.list) h += `<circle class="tg${o.kind === 'town' ? ' up' : ''}" data-v="${k}" cx="${VERTS[k].x}" cy="${VERTS[k].y}" r="2.7"/>`;
  else if (o.kind === 'storm') HEXES.forEach((hx, i) => { if (i !== v.storm) h += `<circle class="tg sto" data-s="${i}" cx="${hx.x.toFixed(2)}" cy="${hx.y.toFixed(2)}" r="5.2"/>`; });
  return h;
}
{ /* hình ở trang đầu: một hòn đảo mẫu cố định */
  const T = 'wgfobwgfdgowfbgwofb', N = [5, 9, 4, 8, 10, 6, 3, 11, 0, 4, 9, 5, 12, 6, 2, 10, 8, 3, 11];
  $('#hero').innerHTML = `<svg viewBox="-46 -42 92 84">${boardSVG({ players: [], ports: [], hexes: [...T].map((t, i) => ({ t, n: N[i] })), storm: 8, R: {}, B: {} })}</svg>`;
}
// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length, seg = (k, list) => `<div class="seg">${list.map(([v, nm]) => `<button type="button" data-opt="${k}" data-v="${v}" aria-pressed="${o[k] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#pcount').textContent = `${n}/4 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 4 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>⭐ Điểm để thắng</b>${seg('goal', [[8, '8 · nhanh'], [10, '10 · vừa'], [12, '12 · dài']])}<small>Làng 1 điểm, thành phố 2 điểm, Đường dài nhất và Đội quân mạnh nhất mỗi thứ 2 điểm.</small></div>
    <div class="opt"><b>🎲 Số trên ô</b>${seg('nums', [[1, 'Vòng xoắn · luật gốc'], [0, 'Ngẫu nhiên']])}<small>Luật gốc đặt số theo vòng xoắn nên 6 và 8 không bao giờ nằm cạnh nhau.</small></div>
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
const DIE = n => `<span class="die">${[[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]][n - 1].map(i => `<i style="grid-area:${1 + (i / 3 | 0)}/${1 + i % 3}"></i>`).join('')}</span>`;
function target(v) { /* đang cần chạm vào đâu trên bản đồ */
  const me = ui.myId; if (v.spec || v.cur !== me) return {};
  if (v.phase === 'setup') return { kind: v.setup.need, list: E.spots(v, me, v.setup.need) };
  if (v.phase === 'storm') return { kind: 'storm' };
  if (v.phase === 'roll' && v.free > 0) return { kind: 'road', list: E.spots(v, me, 'road') };
  if (v.phase === 'main' && !v.offer) { const k = v.free > 0 ? 'road' : mode; if (k) return { kind: k, list: E.count(v, me, k) < E.LIMIT[k] ? E.spots(v, me, k) : [] }; }
  return {};
}
function draw(v) {
  const me = ui.myId, mine = v.players.find(p => p.id === me), ended = v.phase === 'ended', myTurn = !v.spec && v.cur === me, cur = nameOf(v, v.cur);
  if (!(myTurn && v.phase === 'main')) mode = null;
  const tg = target(v); $('#map').innerHTML = boardSVG(v, tg);
  { // xúc xắc: 3D GLB nếu có, không thì 2D như cũ
    const diceEl = $('#dice'), holder = diceEl.querySelector('.gl-holder'), sum = diceEl.querySelector('.dsum'), d2 = diceEl.querySelector('.dice2d');
    if (v.dice) {
      const vals = [v.dice[0], v.dice[1]];
      if (_glDice) {
        holder.hidden = false; sum.hidden = false; d2.hidden = true;
        sum.textContent = v.dice[0] + v.dice[1];
        if (vals.join() !== _glDiceLast) { _glDiceLast = vals.join(); _glDice.view.show(vals); /* góc bàn chỉ đặt mặt tĩnh, để overlay giữa bàn lăn */ }
      } else {
        holder.hidden = true; sum.hidden = true; d2.hidden = false;
        d2.innerHTML = DIE(v.dice[0]) + DIE(v.dice[1]) + `<b>${v.dice[0] + v.dice[1]}</b>`;
      }
      if (_glOv && vals.join() !== _glOvLast) { /* lăn to ở giữa bàn */
        _glOvLast = vals.join();
        clearTimeout(_glOvTimer);
        _glOv.ov.classList.add('show');
        _glOv.view.rollTo(vals, { duration: 950 });
        _glOvTimer = setTimeout(() => _glOv.ov.classList.remove('show'), 1700);
      }
    } else {
      holder.hidden = true; sum.hidden = true; d2.hidden = true; _glDiceLast = ''; _glOvLast = '';
      if (_glOv) { clearTimeout(_glOvTimer); _glOv.ov.classList.remove('show'); }
    }
  }
  $('#round').textContent = ended ? '🏁 Hết ván' : v.phase === 'setup' ? `🏝️ Chọn chỗ ở (vòng ${v.setup.round})` : `${myTurn ? '🎯 Lượt của bạn' : '⏳ ' + ((v.players.find(p => p.id === v.cur) || {}).name || '')} · đích ⭐${v.opts.goal}`;
  $('#seats').innerHTML = v.players.map(p => `<div class="seat${p.id === v.cur ? ' turn' : ''}" style="--pc:${p.color}" data-pid="${p.id}">${avatar(p.name, 24)}<span class="nm">${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</span><span class="pt">${p.id === me && !ended ? v.myPts : p.pts}<i>⭐</i></span><small title="thẻ tài nguyên · thẻ phát triển · thẻ Hiệp sĩ đã dùng · đường dài nhất">🃏${p.cards} · 🎴${p.devN} · 🛡️${p.guards}${v.army === p.id ? '👑' : ''} · 🛤️${p.road}${v.longest === p.id ? '👑' : ''}${v.need[p.id] ? ' · đang bỏ bài' : ''}</small></div>`).join('');
  $('#hand').innerHTML = v.spec ? '' : RES.map(r => `<span class="hc t-${r}${v.hand[r] ? '' : ' z'}" title="${RN[r]}">${ico(r)}<b>${v.hand[r]}</b><small>${RN[r]}</small></span>`).join('') + `<button class="hc dev" data-a="cards" aria-label="Thẻ phát triển của bạn">🎴<b>${v.dev.length + v.fresh.length}</b><small>thẻ</small></button>`;
  let msg = '', acts = '';
  const can = k => E.canPay(v.hand, E.COST[k]), cost = k => `<small>${bag(E.COST[k])}</small>`;
  if (ended) { msg = (v.winners || []).includes(me) ? `🎉 Bạn thắng với ${v.result.find(x => x.id === me).total} điểm!` : `🏆 ${nameOf(v, v.winner)} thắng!`; acts = `<button class="btn" data-a="result">📊 Bảng điểm</button>` + (ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : ''); }
  else if (v.spec) msg = '<small>👀 Bạn đang xem.</small>';
  else if (v.phase === 'discard') msg = v.need[me] ? `🥷 Tên cướp tới! Bạn phải bỏ ${v.need[me]} thẻ.` : '<small>Chờ mọi người bỏ bớt bài…</small>', acts = v.need[me] ? '<button class="btn pri" data-a="discard">Chọn thẻ bỏ</button>' : '';
  else if (v.offer && v.phase === 'main') {
    const of = v.offer;
    if (of.from === me) { msg = `🤝 Bạn mời: đưa ${bag(of.give)} lấy ${bag(of.get)}<br><small>Đang chờ trả lời… (${of.no.length} người từ chối)</small>`; acts = '<button class="btn" data-a="cancel">Huỷ lời mời</button>'; }
    else { msg = `🤝 <b>${nameOf(v, of.from)}</b> mời: họ đưa ${bag(of.give)}, bạn đưa ${bag(of.get)}`; acts = of.no.includes(me) ? '<small class="wait">Bạn đã từ chối.</small>' : `<button class="btn pri" data-a="accept" ${E.canPay(v.hand, of.get) ? '' : 'disabled'}>✓ Đồng ý</button><button class="btn" data-a="decline">✕ Từ chối</button>`; }
  }
  else if (!myTurn) msg = `<small>Chờ ${cur}${v.phase === 'storm' ? ' dời tên cướp' : v.phase === 'setup' ? ' chọn chỗ' : ''}…</small>`;
  else if (v.phase === 'setup') msg = v.setup.need === 'village' ? 'Chạm một <b>chấm tròn</b> để dựng làng 🏠 (gần ô số 6, 8 thì dễ ra hàng)' : 'Chạm một <b>vạch</b> cạnh làng để làm đường 🛤️';
  else if (v.phase === 'storm') msg = '🥷 Chạm một ô để dời <b>tên cướp</b> tới đó: ô có tên cướp không ra tài nguyên';
  else if (v.phase === 'steal') msg = 'Chọn người để lấy 1 thẻ', acts = '<button class="btn pri" data-a="steal">Chọn người</button>';
  else if (v.phase === 'roll') { msg = v.free > 0 ? `🛤️ Chạm một vạch để làm đường miễn phí (còn ${v.free}), hoặc đổ xúc xắc luôn` : 'Tới lượt bạn!'; acts = `<button class="btn pri big" data-a="roll">🎲 Đổ xúc xắc</button>${!v.played && v.dev.includes('guard') ? '<button class="btn" data-a="cards">🛡️ Hiệp sĩ trước</button>' : ''}`; }
  else { /* pha chính */
    const k = tg.kind;
    msg = v.free > 0 ? `🛤️ Chạm một vạch để làm đường miễn phí (còn ${v.free})` : k ? (tg.list.length ? `Chạm chỗ đang nháy để ${k === 'road' ? 'làm đường' : k === 'village' ? 'dựng làng' : 'lên thành phố'}` : `Chưa có chỗ nào ${k === 'village' ? 'dựng làng được: làng phải nối với đường của bạn và cách làng khác 2 đoạn' : k === 'town' ? 'lên thành phố: cần có làng trước' : 'làm đường'}.`) : 'Xây, mua thẻ, đổi hàng – xong thì bấm <b>Xong lượt</b>';
    acts = ['road', 'village', 'town'].map(b => `<button class="btn bld${k === b ? ' on' : ''}" data-a="mode" data-k="${b}" ${can(b) || (b === 'road' && v.free > 0) ? '' : 'disabled'}><span>${BUILD[b][0]} ${BUILD[b][1]}</span>${cost(b)}</button>`).join('')
      + `<button class="btn bld" data-a="buy" ${can('card') && v.deckN ? '' : 'disabled'}><span>🎴 Thẻ</span>${cost('card')}</button><button class="btn bld" data-a="trade"><span>🔁 Đổi</span><small>kho · bạn</small></button><button class="btn bld pri" data-a="end"><span>⏭️ Xong lượt</span></button>`;
  }
  if (!ended && v.log.length) msg += `<br><small>${esc(v.log[v.log.length - 1])}</small>`;
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  if (!v.spec && v.phase === 'discard' && v.need[me]) { if (discFor !== v.gid + ':' + v.need[me]) { discFor = v.gid + ':' + v.need[me]; openDiscard(v); } } else discFor = null;
  if (myTurn && v.phase === 'steal') { if (stealFor !== v.gid) { stealFor = v.gid; openSteal(v); } } else stealFor = null;
}
const stepper = (id, max) => `<div class="stp" data-id="${id}">${RES.map(r => `<div class="st t-${r}">${ico(r)}<small>${RN[r]}</small><div><button type="button" data-r="${r}" data-d="-1" aria-label="Bớt ${RN[r]}">−</button><b data-n="${r}">0</b><button type="button" data-r="${r}" data-d="1" ${max && !max[r] ? 'disabled' : ''} aria-label="Thêm ${RN[r]}">+</button></div></div>`).join('')}</div>`;
function bindStepper(id, max, onChange) { const box = document.querySelector(`.stp[data-id="${id}"]`), val = { w: 0, b: 0, g: 0, f: 0, o: 0 };
  box.onclick = e => { const b = e.target.closest('button'); if (!b) return; const r = b.dataset.r, n = val[r] + (+b.dataset.d); if (n < 0 || (max && n > max[r]) || n > 9) return; val[r] = n; box.querySelector(`[data-n="${r}"]`).textContent = n; onChange(val); };
  return val; }
function openDiscard(v) {
  const n = v.need[ui.myId];
  ui.openModal(`<h2>🥷 Tên cướp tới</h2><p class="center">Bạn đang cầm hơn 7 thẻ nên phải bỏ <b>${n}</b> thẻ. Chọn thẻ muốn bỏ:</p>${stepper('disc', v.hand)}<div class="btns"><button class="btn pri" id="m-ok" disabled>Bỏ 0/${n} thẻ</button></div>`);
  const val = bindStepper('disc', v.hand, x => { const t = E.total(x); $('#m-ok').disabled = t !== n; $('#m-ok').textContent = `Bỏ ${t}/${n} thẻ`; });
  $('#m-ok').onclick = () => { ui.closeModal(); ui.act({ type: 'discard', cards: val }); };
}
function openSteal(v) {
  ui.openModal(`<h2>🫳 Lấy 1 thẻ của ai?</h2><div class="pick">${v.vic.map(id => { const p = v.players.find(x => x.id === id); return `<button class="btn" data-id="${id}" style="--pc:${p.color}">${avatar(p.name, 24)} ${esc(cleanName(p.name))} <small>🃏${p.cards}</small></button>`; }).join('')}</div>`);
  document.querySelectorAll('.pick button').forEach(b => { b.onclick = () => { ui.closeModal(); ui.act({ type: 'steal', from: b.dataset.id }); }; });
}
function openTrade(v) {
  const me = ui.myId; let give = RES.find(r => v.hand[r] >= E.rate(v, me, r)) || null, get = null;
  const chips = (k, sel) => RES.map(r => { const rt = E.rate(v, me, r), ok = k === 'get' ? v.bank[r] > 0 : v.hand[r] >= rt; return `<button type="button" class="tc t-${r}" data-${k}="${r}" aria-pressed="${sel === r}" ${ok ? '' : 'disabled'}>${ico(r)}<small>${k === 'give' ? rt + ' ' + RN[r] : '1 ' + RN[r]}</small></button>`; }).join('');
  const html = () => `<h2>🔁 Đổi hàng</h2>
    <h3>🏦 Đổi với kho</h3><p class="hint">Bình thường 4 đổi 1. Có làng ở bến thuyền thì rẻ hơn (3:1 hoặc 2:1).</p>
    <div class="lbl">Bạn đưa</div><div class="tcs">${chips('give', give)}</div><div class="lbl">Bạn nhận</div><div class="tcs">${chips('get', get)}</div>
    <div class="btns"><button class="btn pri" id="m-bank" ${give && get && give !== get ? '' : 'disabled'}>Đổi với kho</button></div>
    ${v.players.length > 1 ? `<h3>🤝 Mời cả bàn</h3><p class="hint">Ai đồng ý trước thì đổi với người đó.</p><div class="lbl">Bạn đưa</div>${stepper('give', v.hand)}<div class="lbl">Bạn muốn nhận</div>${stepper('get')}
    <div class="btns"><button class="btn pri" id="m-offer" disabled>Gửi lời mời</button><button class="btn" id="m-close">Đóng</button></div>` : '<div class="btns"><button class="btn" id="m-close">Đóng</button></div>'}`;
  const bind = () => {
    $('#m-close').onclick = ui.closeModal;
    document.querySelectorAll('.tc').forEach(b => { b.onclick = () => { if (b.dataset.give) give = b.dataset.give; else get = b.dataset.get; if (give === get) { if (b.dataset.give) get = null; else give = null; } ui.openModal(html()); bind(); }; });
    $('#m-bank').onclick = () => { ui.closeModal(); ui.act({ type: 'bank', give, get }); };
    if ($('#m-offer')) { let g = null, t = null; const chk = () => { $('#m-offer').disabled = !(g && t && E.total(g) && E.total(t) && !RES.some(r => g[r] && t[r])); };
      g = bindStepper('give', v.hand, chk); t = bindStepper('get', null, chk);
      $('#m-offer').onclick = () => { ui.closeModal(); ui.act({ type: 'offer', give: g, get: t }); }; }
  };
  ui.openModal(html()); bind();
}
function openCards(v) {
  const canUse = c => !v.spec && v.cur === ui.myId && !v.played && c !== 'vp' && (v.phase === 'main' || v.phase === 'roll') && !v.offer;
  const row = (c, fresh) => `<div class="cardrow${fresh ? ' fresh' : ''}"><span class="ci">${CARD[c][0]}</span><div><b>${E.CARD_NAME[c]}</b><small>${CARD[c][1]}${fresh && c !== 'vp' ? ' <i>Mới mua – lượt sau mới dùng được.</i>' : ''}</small></div>${!fresh && canUse(c) ? `<button class="btn pri" data-c="${c}">Dùng</button>` : ''}</div>`;
  const used = new Set(), list = v.dev.map(c => { const first = !used.has(c); used.add(c); return row(c, false).replace(first ? '' : /<button.*?<\/button>/, ''); }).join('') + v.fresh.map(c => row(c, true)).join('');
  ui.openModal(`<h2>🎴 Thẻ phát triển của bạn</h2>${list || '<p class="center">Chưa có thẻ nào. Mua 1 thẻ tốn 1 lúa + 1 cừu + 1 đá.</p>'}<p class="hint center">Mỗi lượt dùng được 1 thẻ. Còn ${v.deckN} thẻ trong chồng.</p><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  document.querySelectorAll('.cardrow button').forEach(b => { b.onclick = () => { const c = b.dataset.c;
    if (c === 'plenty') pickRes('🌾 Năm được mùa: chọn 2 tài nguyên', 2, r => ui.act({ type: 'play', card: c, a: r[0], b: r[1] }));
    else if (c === 'mono') pickRes('🧺 Độc quyền: chọn 1 loại', 1, r => ui.act({ type: 'play', card: c, r: r[0] }));
    else { ui.closeModal(); ui.act({ type: 'play', card: c }); } }; });
}
function pickRes(title, n, done) {
  const sel = [];
  const html = () => `<h2>${title}</h2><div class="tcs">${RES.map(r => `<button type="button" class="tc t-${r}" data-r="${r}">${ico(r)}<small>${RN[r]}${sel.filter(x => x === r).length ? ' ×' + sel.filter(x => x === r).length : ''}</small></button>`).join('')}</div><div class="btns"><button class="btn" id="m-close">Thôi</button></div>`;
  const bind = () => { $('#m-close').onclick = ui.closeModal; document.querySelectorAll('.tc').forEach(b => { b.onclick = () => { sel.push(b.dataset.r); if (sel.length >= n) { ui.closeModal(); done(sel); } else { ui.openModal(html()); bind(); } }; }); };
  ui.openModal(html()); bind();
}
function openResult(v) {
  const rows = [...v.result].sort((a, b) => b.total - a.total);
  ui.openModal(`<h2>📊 Bảng điểm</h2><div style="overflow-x:auto"><table class="res"><tr><th>Người chơi</th><th>🏠</th><th>🏘️</th><th>🛤️</th><th>🛡️</th><th>🏛️</th><th>Tổng</th></tr>${rows.map(r => `<tr class="${(v.winners || []).includes(r.id) ? 'win' : ''}"><td>${nameOf(v, r.id)}</td><td>${r.village}</td><td>${r.town}<small>×2</small></td><td>${r.road}${r.long ? ' <small>+2</small>' : ''}</td><td>${r.guards}${r.army ? ' <small>+2</small>' : ''}</td><td>${r.vp}</td><td><b>${r.total}</b></td></tr>`).join('')}</table></div>
    <p class="hint center">🏠 làng · 🏘️ thành phố · 🛤️ đường dài nhất · 🛡️ thẻ Hiệp sĩ đã dùng · 🏛️ thẻ Điểm thắng</p><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
}
function render(v, prev) {
  if (!prev || prev.gid !== v.gid) { mode = null; discFor = stealFor = null; }
  if (prev && prev.gid === v.gid && prev.seq !== v.seq && v.last && v.last !== prev.last && JSON.stringify(v.last) !== JSON.stringify(prev.last)) { const l = v.last;
    if (l.t === 'roll') { /* tiếng lắc do khung 3D kêu trong rollTo() */ const g = l.gain && l.gain[ui.myId]; if (g) { setTimeout(() => beep('gain'), 260); toast('Bạn nhận ' + bagText(g)); } }
    else if (l.t === 'build') beep('build'); else if (l.t === 'storm') beep('storm'); else if (l.t === 'trade' || l.t === 'bank') beep('trade'); }
  draw(v);
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); openResult(v); } } else endShown = null;
}
$('#map').addEventListener('click', e => {
  const v = ui.view; if (!v) return; const t = e.target.closest('.tg');
  if (t) { if (t.dataset.s !== undefined) return ui.act({ type: 'storm', hex: +t.dataset.s });
    const kind = t.dataset.e !== undefined ? 'road' : v.phase === 'setup' ? 'village' : mode === 'town' ? 'town' : 'village';
    if (v.phase === 'main' && v.free <= 0) mode = null;
    return ui.act({ type: 'build', kind, at: +(t.dataset.e ?? t.dataset.v) }); }
  const p = e.target.closest('.port'); if (p) return toast(p.dataset.port === '*' ? '⚓ Bến thuyền 3:1 – có làng ở đây thì đổi 3 thẻ cùng loại lấy 1 thẻ bất kỳ.' : `⚓ Bến ${RN[p.dataset.port]} 2:1 – có làng ở đây thì đổi 2 ${RN[p.dataset.port]} lấy 1 thẻ bất kỳ.`);
  const h = e.target.closest('.hex'); if (h) { const x = v.hexes[+h.dataset.h]; toast(x.t === 'd' ? '🏖️ Bãi cát – không ra tài nguyên.' : `${HEX_NAME[x.t]} số ${x.n}: đổ ra ${x.n} thì làng cạnh ô này được 1 ${RN[x.t]} (thành phố được 2).${+h.dataset.h === v.storm ? ' Đang có tên cướp nên tạm không ra gì.' : ''}`); }
});
function onAct(e) {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v || b.disabled) return; const a = b.dataset.a;
  if (a === 'roll' || a === 'end' || a === 'buy' || a === 'cancel' || a === 'accept' || a === 'decline') ui.act({ type: a });
  else if (a === 'mode') { mode = mode === b.dataset.k ? null : b.dataset.k; draw(v); }
  else if (a === 'trade') openTrade(v); else if (a === 'cards') openCards(v); else if (a === 'discard') openDiscard(v); else if (a === 'steal') openSteal(v);
  else if (a === 'result') openResult(v); else if (a === 'again' && ui.isHost) ui.net.raw.start(); else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
}
$('#acts').addEventListener('click', onAct); $('#hand').addEventListener('click', onAct);
function openGuide() {
  const c = k => bag(E.COST[k]);
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Đảo Khai Hoang</h2>
    <p><b>Mục tiêu:</b> là người đầu tiên đạt đủ điểm (thường là 10). <b>Làng</b> 1 điểm, <b>thành phố</b> 2 điểm.</p>
    <h3>Đầu ván</h3><ul><li>Lần lượt mỗi người dựng 1 làng + 1 đường, rồi vòng hai đi ngược lại. Làng thứ hai cho ngay tài nguyên của các ô quanh nó.</li><li>Làng nằm ở <b>góc</b> ô, đường nằm trên <b>cạnh</b>. Hai làng phải cách nhau ít nhất 2 đoạn đường.</li></ul>
    <h3>Mỗi lượt</h3><ul>
    <li><b>Đổ xúc xắc 🎲</b>: ô nào mang số vừa đổ thì mọi làng cạnh ô đó được 1 tài nguyên (thành phố được 2). Số 6 và 8 (màu đỏ) hay ra nhất.</li>
    <li><b>Xây</b>: Đường ${c('road')} · Làng ${c('village')} · Thành phố ${c('town')} (nâng từ làng) · Thẻ phát triển ${c('card')}.</li>
    <li><b>Đổi hàng</b>: 4 thẻ cùng loại lấy 1 thẻ bất kỳ từ kho; có làng ở <b>bến thuyền ⚓</b> thì chỉ 3:1 hoặc 2:1. Cũng có thể mời cả bàn đổi với mình.</li></ul>
    <h3>Tên cướp 🥷</h3><ul><li>Đổ ra <b>7</b>: ai cầm hơn 7 thẻ phải bỏ một nửa. Người đổ dời tên cướp sang ô khác và lấy 1 thẻ của một người có làng cạnh ô đó.</li><li>Ô có tên cướp không ra tài nguyên.</li></ul>
    <h3>Thẻ phát triển 🎴</h3><ul><li><b>Hiệp sĩ</b>: dời tên cướp + lấy 1 thẻ. Dùng từ 3 thẻ và nhiều nhất bàn: +2 điểm.</li><li><b>Làm đường</b>, <b>Năm được mùa</b>, <b>Độc quyền</b>, <b>Điểm thắng</b> (+1 điểm, giữ kín).</li><li>Thẻ mới mua phải chờ lượt sau; mỗi lượt dùng 1 thẻ (dùng được cả trước khi đổ xúc xắc).</li><li>Kho có 19 thẻ mỗi loại tài nguyên; kho không đủ chia cho mọi người thì lượt đó loại ấy không ai được.</li></ul>
    <h3>Điểm thưởng</h3><ul><li><b>Đường dài nhất</b> (liền từ 5 đoạn): +2 điểm. Người khác làm dài hơn thì mất.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('khaihoang-sound', sound ? '1' : '0'); drawSound(); beep('build'); };
const ui = gameKit({ game: 'khaihoang', net: NET, onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); }, onState: (v, prev) => { if (v) render(v, prev); else { endShown = null; mode = null; discFor = stealFor = null; } }, offline: h => { h.addBot(); h.addBot(); } });
