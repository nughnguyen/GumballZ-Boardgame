// 🀄 Tứ sắc (luật Nam) – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { flipRender } from '../../shared/lib/gsap/flip.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import * as E from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=15';

const NET = makeNet({
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'tusac', min: 2, max: 4, minMsg: 'Cần ít nhất 2 người: mời bạn vào phòng hoặc thêm bot.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: botAction, botDelay: s => (s.stage === 'claim' ? 900 : 1100) + Math.random() * 500,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Đậu'],
});
const card = (c, cls = '', attrs = '', tag = 'div') => `<${tag} class="ts ${E.COLORS[E.color(c)]} ${cls}" ${attrs} title="${E.cardTxt(c)}"><b>${E.HAN[E.rank(c)]}</b><i>${E.RANKS[E.rank(c)]}</i></${tag}>`;
const small = cs => `<span class="sm">${cs.map(c => card(c)).join('')}</span>`;
let sound = ls.get('tusac-sound') !== '0';
$('#hero').innerHTML = [[0, -12], [4 * 8 + 4 * 3, -4], [4 * 14 + 4 * 5, 4], [4 * 21 + 4 * 6, 12]].map(([c, r]) => card(c, '', `style="--rot:${r}deg"`)).join('');

let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { turn: [[660, 0, .09], [880, .09, .13]], play: [[420, 0, .05], [300, .04, .07]], eat: [[520, 0, .07], [780, .07, .12]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.12, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  $('#pcount').textContent = `${n}/${info.max} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· bot</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < info.max ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm bot</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>✋ Khui ngoài lượt</b><div class="seg">${[[true, 'Được khui'], [false, 'Chỉ ăn đúng lượt']].map(([v, nm]) => `<button type="button" data-opt="chiu" data-v="${v}" aria-pressed="${o.chiu === v}" ${dis}>${nm}</button>`).join('')}</div><small>Được khui: ai cầm sẵn đôi (hoặc khạp) giống lá vừa lật thì được lấy dù chưa tới lượt. Lấy để <b>tới</b> thì lúc nào cũng được. Luật Nam: người cái 21 lá, nọc còn ${E.STOP} lá mà chưa ai tới thì hoà.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt('chiu', b.dataset.v === 'true');
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let sel = null, endShown = null;
const nameOf = (v, id) => { const p = v.players.find(p => p.id === id); return p ? esc(cleanName(p.name)) : '?'; };
const OPT_TXT = { doi: 'Ăn đôi', le: 'Ăn lẻ', khap: 'Khui khạp (3)', quan: 'Khui quằn (4)', tot3: 'Ăn Tốt 3 màu', tot4: 'Ăn Tốt 4 màu', tuong: 'Giữ Tướng' };
function render(v, prev) {
  const me = ui.myId, mine = v.players.find(p => p.id === me), myDisc = v.stage === 'discard' && v.cur === me && !v.spec, ended = v.phase === 'ended';
  if (!v.hand.includes(sel)) sel = null;
  $('#round').textContent = ended ? '🏁 Hết ván' : `🂠 Nọc ${v.deckN} · còn ${Math.max(0, v.deckN - E.STOP)} lượt bốc`;
  $('#seats').innerHTML = v.players.map(p => {
    const pile = v.piles[p.id], ms = v.melds[p.id], lenh = ms.reduce((n, m) => n + E.meldPts(m.k, true), 0);
    return `<div class="seat${p.id === v.cur && !ended ? ' turn' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" data-pid="${p.id}"><div class="who">${avatar(p.name, 26)}<b>${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}${p.id === v.dealer ? ' 👑' : ''}</b><small>🂠 ${p.n}${lenh ? " · " + lenh + " lệnh" : ""}</small></div>
      <div class="row"><i>Bộ</i><span class="melds">${ms.length ? ms.map(m => small(m.cards)).join('') : '<small style="color:var(--muted)">–</small>'}</span></div>
      <div class="row"><i>Rác</i>${pile.length ? `<span class="sm rac">${pile.slice(-12).map(c => card(c)).join('')}</span>` : '<small style="color:var(--muted)">–</small>'}</div></div>`;
  }).join('');
  $('#pile').innerHTML = `<div class="ts back"></div><span class="cnt">${v.deckN} lá</span>`;
  const L = v.last;
  $('#tbl').innerHTML = ended ? '' : v.card != null ? `${card(v.card)}<span>${v.cardKind === 'draw' ? `${nameOf(v, v.cardBy)} bốc nọc${v.second ? ' – không dùng' : ''}` : `${nameOf(v, v.cardBy)} đánh`}<small>${v.cur === me ? 'Bạn lấy được lá này.' : v.cur ? `Chờ ${nameOf(v, v.cur)} quyết định…` : ''}</small></span>` : L && L.type === 'take' ? `<span>🍽️ ${nameOf(v, L.by)} ${OPT_TXT[L.k].toLowerCase()} lá ${E.cardTxt(L.card)}${L.from !== L.by ? ' của ' + nameOf(v, L.from) : ''}</span>` : '<span>Ván mới bắt đầu<small>Người cái (👑) cầm 21 lá, đánh trước 1 lá.</small></span>';
  // bài của tôi: xếp theo bộ đang có, lá rác để cuối
  const hand = $('#hand');
  if (v.spec || !mine) { hand.innerHTML = ''; $('#mine').innerHTML = ''; }
  else {
    const left = E.minLeft(v.hand), groups = groupHand(v.hand);
    const one = (c, inM) => card(c, `${c === sel ? 'sel' : ''} ${inM ? 'in' : ''} ${myDisc && !E.canDiscard(v.hand, c) ? 'no' : ''}`, `data-c="${c}"`, 'button');
    flipRender(hand, '[data-c]', 'data-c', () => { hand.innerHTML = groups.melds.map(m => m.map(c => one(c, true)).join('')).join('<span class="gap"></span>') + (groups.melds.length && groups.rest.length ? '<span class="gap"></span>' : '') + groups.rest.map(c => one(c, false)).join(''); });
    $('#mine').innerHTML = ended ? '' : `<span>🟩 lá đã thành bộ</span><span>Còn <b>${left}</b> lá rác – hết rác là tới</span>`;
  }
  let msg = '', acts = '';
  if (ended) acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button><button class="btn" data-a="sum">🏅 Kết quả</button>' : '<button class="btn" data-a="sum">🏅 Kết quả</button>';
  else if (v.spec || !mine) msg = '<small>👀 Bạn đang xem – ván sau sẽ được chơi.</small>';
  else if (v.myOpts) {
    msg = `Lá <b>${E.cardTxt(v.card)}</b>: bạn muốn lấy không?`;
    acts = v.myOpts.map((o, i) => `<button class="btn ${o.win ? 'u' : 'pri'}" data-take="${i}">${o.win ? `🎉 Tới! (${o.pts} lệnh)` : OPT_TXT[o.k]}${o.use.length ? small(o.use) : ''}</button>`).join('') + `<button class="btn" data-a="pass">${v.natural === me && !(v.cardKind === 'draw' && v.cardBy === me && !v.second) ? '🂠 Bỏ, bốc nọc' : 'Bỏ qua'}</button>`;
  }
  else if (myDisc) { msg = 'Chọn 1 lá rác rồi bấm <b>Đánh</b> <small>(chạm 2 lần vào lá để đánh nhanh)</small>'; acts = `<button class="btn pri" data-a="discard" ${sel != null ? '' : 'disabled'}>🀄 Đánh${sel != null ? ' ' + E.cardTxt(sel) : ''}</button>`; }
  else msg = `<small>Chờ ${nameOf(v, v.cur)}…</small>`;
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  if (prev && prev.gid === v.gid) {
    if (v.seq !== prev.seq) beep(L && L.type === 'take' && v.card == null ? 'eat' : 'play');
    if (v.cur === me && prev.cur !== me && !v.spec) beep('turn');
  }
  if (ended) { if (endShown !== v.gid) { endShown = v.gid; beep('end'); setTimeout(() => ui.view === v && showSummary(v), 800); } } else endShown = null;
}
/* gom lá trên tay thành các bộ đang có (tham lam: bỏ dần lá rác cho tới khi xếp hết) để dễ nhìn */
function groupHand(h) {
  let rest = [], cur = E.sortHand(h), a = E.arrange(cur), guard = 0;
  while (!a && cur.length && guard++ < 30) { const base = E.minLeft(cur); const i = cur.findIndex((c, k) => E.minLeft(cur.filter((_, j) => j !== k)) < base); const [c] = cur.splice(i < 0 ? cur.length - 1 : i, 1); rest.push(c); a = E.arrange(cur); }
  return { melds: a ? a.melds.map(m => m.cards) : [], rest: E.sortHand(rest) };
}
function discard(v, c) { if (!E.canDiscard(v.hand, c)) { ui.toast('Tướng tự nó đã là một bộ – không đánh đi được.'); return; } sel = null; ui.act({ type: 'discard', card: c }); }
$('#hand').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'), v = ui.view; if (!b || !v || v.spec || v.phase !== 'play') return; const c = +b.dataset.c;
  if (v.stage === 'discard' && v.cur === ui.myId && sel === c) return discard(v, c);
  sel = sel === c ? null : c; render(v, null);
});
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (b.dataset.take != null) ui.act({ type: 'take', i: +b.dataset.take });
  else if (a === 'pass') ui.act({ type: 'pass' });
  else if (a === 'discard') { if (sel != null) discard(v, sel); }
  else if (a === 'again' && ui.isHost) ui.net.raw.start();
  else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
  else if (a === 'sum') showSummary(v);
});
function showSummary(v) {
  const me = ui.myId, r = v.result, w = r.winner;
  const head = !w ? '🤝 Hoà – hết nọc mà chưa ai tới' : w === me ? `🎉 Bạn tới – ${r.pts} lệnh!` : `🎉 ${nameOf(v, w)} tới – ${r.pts} lệnh`;
  const wm = w ? [...v.melds[w].map(m => ({ ...m, open: true })), ...((r.hand && r.hand.melds) || [])] : [];
  ui.openModal(`<h2>${head}</h2>${w ? `<div class="winmelds">${wm.map(m => `<span>${small(m.cards)}${E.MELD_VN[m.k]}${m.open ? ' khui' : ''} · ${E.meldPts(m.k, !!m.open)}</span>`).join('')}</div>` : ''}
    <ul class="sum">${v.players.map(p => { const ch = r.chips[p.id]; return `<li class="${p.id === w ? 'win' : ''}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}<small>${p.id === w ? 'tới' : w ? 'còn ' + E.minLeft((v.reveal && v.reveal[p.id]) || []) + ' lá rác' : 'hoà'}</small></span><span class="chip-d ${ch < 0 ? 'neg' : 'pos'}">${ch > 0 ? '+' : ''}${ch} xu</span></li>`; }).join('')}</ul>
    <p style="text-align:center;color:var(--muted);font-size:13px;margin:8px 0 0">Mỗi lệnh = 1 xu. Xu chỉ để tính vui trong ván, không phải tiền thật.</p>
    <div class="btns">${ui.isHost ? '<button class="btn pri" id="m-again">🔁 Ván nữa</button>' : ''}<button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal; if ($('#m-again')) $('#m-again').onclick = () => { ui.closeModal(); ui.net.raw.start(); };
}
function openGuide() {
  const ex = (...cs) => small(cs.map(([r, col]) => (col * 7 + r) << 2));
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Tứ sắc (luật Nam)</h2>
    <p><b>Bộ bài:</b> 112 lá, 4 màu (đỏ, vàng, xanh, trắng). Mỗi màu có 7 quân như cờ tướng: Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt – mỗi quân 4 lá giống hệt nhau.</p>
    <p><b>Mục tiêu:</b> gom toàn bộ bài thành <b>bộ</b>. Ai hết lá rác trước thì <b>tới</b> (thắng) và ăn số xu bằng số <b>lệnh</b> của mình từ mỗi người.</p>
    <h3>Các bộ và số lệnh</h3><table><tr><th>Bộ</th><th>Ví dụ</th><th>Lệnh</th></tr>
    <tr><td>Tướng (1 lá cũng là bộ)</td><td>${ex([0, 0])}</td><td>1</td></tr><tr><td>Đôi: 2 lá giống hệt</td><td>${ex([4, 1], [4, 1])}</td><td>0</td></tr>
    <tr><td>Lẻ: Tướng-Sĩ-Tượng hoặc Xe-Pháo-Mã <b>cùng màu</b></td><td>${ex([3, 2], [4, 2], [5, 2])}</td><td>1</td></tr>
    <tr><td>Khạp: 3 lá giống hệt</td><td>${ex([1, 3], [1, 3], [1, 3])}</td><td>3 (khui: 1)</td></tr><tr><td>Quằn: 4 lá giống hệt</td><td>${ex([5, 0], [5, 0], [5, 0], [5, 0])}</td><td>8 (khui: 6)</td></tr>
    <tr><td>Tốt 3 màu / 4 màu khác nhau</td><td>${ex([6, 0], [6, 1], [6, 2], [6, 3])}</td><td>1 / 4</td></tr></table>
    <h3>Mỗi lượt</h3><ul><li>Người cái (👑) cầm 21 lá, đánh trước 1 lá rác. Tướng không được đánh đi.</li><li>Tới lượt bạn: <b>ăn</b> lá người trước vừa đánh nếu nó ghép được một bộ với bài trên tay – bộ đó lật ra bàn – rồi đánh 1 lá rác.</li><li>Không ăn thì <b>bốc nọc</b>: lá bốc lật cho cả bàn xem. Ghép được bộ thì giữ rồi đánh 1 lá; không thì lá đó thành lá cho người kế tiếp.</li><li><b>Khui ngoài lượt:</b> ai cầm sẵn đôi (hoặc khạp) giống lá vừa lật thì được lấy để thành khạp (quằn), dù chưa tới lượt.</li><li><b>Tới:</b> lấy một lá mà toàn bộ bài thành bộ. Ai cũng được lấy để tới, ưu tiên người gần lượt nhất. Số lệnh khi tới luôn là số lẻ.</li><li>Nọc còn ${E.STOP} lá mà chưa ai tới thì <b>hoà</b>.</li></ul>
    <p style="color:var(--muted);font-size:13.5px">Chữ trên lá: 將 Tướng · 士 Sĩ · 象 Tượng · 車 Xe · 砲 Pháo · 馬 Mã · 卒 Tốt (có ghi tên Việt bên dưới).</p>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('tusac-sound', sound ? '1' : '0'); drawSound(); beep('turn'); };

const ui = gameKit({
  game: 'tusac', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { sel = null; endShown = null; } },
  offline: h => { h.addBot(); h.addBot(); h.addBot(); },
});
