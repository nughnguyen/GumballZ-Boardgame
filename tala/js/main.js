// 🀄 Tá lả (Phỏm) – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { flipRender } from '../../shared/lib/gsap/flip.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import * as E from './engine.js?v=2';
import { botAction } from './bot.js?v=2';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { cardHTML, backHTML } from '../../shared/ui/deck/deck.js?v=1';

const NET = makeNet({
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'tala', min: 2, max: 4, minMsg: 'Cần ít nhất 2 người: mời bạn vào phòng hoặc thêm bot.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: botAction, botDelay: s => (s.stage === 'draw' ? 700 : 1000) + Math.random() * 500,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Đậu'],
});
const card = (c, cls = '', attrs = '', tag = 'div') => cardHTML(E.rank(c) + 1, E.SUITS[E.suit(c)], { cls, attrs, tag });
let sound = ls.get('tala-sound') !== '0';
$('#hero').innerHTML = [[20, -14], [24, -5], [28, 5], [51, 14]].map(([c, r]) => card(c, '', `style="--rot:${r}deg;--up:${Math.abs(r) / 2}"`)).join('');

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
  $('#opts').innerHTML = `<div class="opt"><b>🔁 Số lượt đánh mỗi người</b><div class="seg">${[[4, '4 lượt (chuẩn)'], [3, '3 lượt (nhanh)']].map(([v, nm]) => `<button type="button" data-opt="turns" data-v="${v}" aria-pressed="${o.turns === v}" ${dis}>${nm}</button>`).join('')}</div><small>Người đi đầu cầm 10 lá, còn lại 9 lá. Hết lượt cuối thì tự hạ phỏm, gửi bài và tính điểm – ít điểm nhất thắng.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt('turns', +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let sel = null, endShown = null;
const nameOf = (v, id) => { const p = v.players.find(p => p.id === id); return p ? esc(cleanName(p.name)) : '?'; };
const small = cs => `<span class="sm" style="display:flex">${cs.map(c => card(c)).join('')}</span>`;
function render(v, prev) {
  const me = ui.myId, myTurn = v.cur === me && !v.spec, mine = v.players.find(p => p.id === me);
  if (!v.hand.includes(sel)) sel = null;
  $('#round').textContent = v.phase === 'ended' ? '🏁 Hết ván' : `🂠 Nọc ${v.deckN} · lượt ${Math.min(v.opts.turns, (v.turns[v.cur] || 0) + 1)}/${v.opts.turns}`;
  // ghế: bài rác, lá đã ăn, phỏm đã hạ
  $('#seats').innerHTML = v.players.map(p => {
    const d = v.done[p.id], pile = v.piles[p.id], laid = v.laid[p.id];
    return `<div class="seat${p.id === v.cur ? ' turn' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}${d ? ' done' : ''}" data-pid="${p.id}"><div class="who">${avatar(p.name, 26)}<b>${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</b><small>${d ? (d.mom ? '😵 móm' : `${d.pts} điểm`) : `🂠 ${p.n}`}</small></div>
      <div class="row"><i>Rác</i>${pile.length ? `<span class="sm" style="display:flex">${pile.map((c, i) => card(c, v.offer === c && i === pile.length - 1 ? 'hot' : '')).join('')}</span>` : '<small style="color:var(--muted)">–</small>'}</div>
      ${laid ? `<div class="row"><i>Phỏm</i><span class="melds">${laid.length ? laid.map(small).join('') : '<small style="color:var(--muted)">không có</small>'}</span></div>` : v.eaten[p.id].length ? `<div class="row"><i>Ăn</i>${small(v.eaten[p.id])}</div>` : ''}</div>`;
  }).join('');
  // giữa bàn: nọc + lá có thể ăn
  $('#pile').innerHTML = v.deckN ? `${backHTML()}<span class="cnt">${v.deckN} lá</span>` : '<span class="cnt">Hết nọc</span>';
  const off = v.offer, prevP = v.last && v.players.find(p => p.id === v.last.by);
  $('#tbl').innerHTML = v.phase === 'ended' ? '' : off != null ? `${card(off)}<span>${prevP ? esc(cleanName(prevP.name)) : ''} vừa đánh<small>${myTurn ? (v.canEat ? 'Lá này ghép được phỏm với bài bạn – ăn được!' : 'Không ghép được phỏm – bốc nọc thôi.') : ''}</small></span>` : v.last && v.last.eatenBy ? `<span>🍽️ ${nameOf(v, v.last.eatenBy)} ăn ${E.cardTxt(v.last.ate)} của ${nameOf(v, v.last.by)}</span>` : '<span>Ván mới bắt đầu<small>Người đi đầu đánh 1 lá.</small></span>';
  // bài của tôi: xếp phỏm trước, lá lẻ sau
  const hand = $('#hand'), myE = mine ? v.eaten[me] : [];
  if (v.spec || !mine) { hand.innerHTML = ''; $('#mine').innerHTML = ''; }
  else {
    const a = E.arrange(v.hand, myE) || { melds: [], rest: v.hand, left: 0 }, inM = new Set(a.melds.flat()), n = v.hand.length;
    const w = hand.clientWidth || innerWidth, cw = parseFloat(getComputedStyle(hand).getPropertyValue('--cw')) || 66, gaps = a.melds.length;
    const ov = n > 1 ? Math.max(-.7, Math.min(-.22, ((w - 20 - cw - gaps * cw * .5) / (n - 1) - cw) / cw)) : 0;
    const one = c => card(c, `${c === sel ? 'sel' : ''} ${myE.includes(c) ? 'eat' : inM.has(c) ? 'in' : ''} ${myTurn && v.stage === 'discard' && !E.canDiscard(v.hand, myE, c) ? 'no' : ''}`, `data-c="${c}" style="--ov:${ov.toFixed(3)}"`, 'button');
    flipRender(hand, '[data-c]', 'data-c', () => { hand.innerHTML = a.melds.map(m => E.sortHand(m).map(one).join('')).join('<span class="gap"></span>') + (a.melds.length && a.rest.length ? '<span class="gap"></span>' : '') + E.sortHand(a.rest).map(one).join(''); });
    $('#mine').innerHTML = v.done[me] ? '' : `<span>🟩 trong phỏm · 🟧 lá đã ăn (phải giữ)</span><span>Điểm lá lẻ hiện tại: <b>${a.left}</b>${a.melds.length ? '' : ' · chưa có phỏm (móm)'}</span>`;
  }
  // lời nhắc + nút
  let msg = '', acts = '';
  if (v.phase === 'ended') acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '<button class="btn" data-a="sum">🏅 Kết quả</button>';
  else if (v.spec || !mine) msg = '<small>👀 Bạn đang xem – ván sau sẽ được chơi.</small>';
  else if (myTurn && v.stage === 'draw') { msg = 'Tới lượt bạn: <b>bốc nọc</b>' + (v.canEat ? ' hoặc <b>ăn</b> lá vừa đánh' : ''); acts = `${v.canEat ? '<button class="btn pri" data-a="eat">🍽️ Ăn lá này</button>' : ''}<button class="btn${v.canEat ? '' : ' pri'}" data-a="draw" ${v.deckN ? '' : 'disabled'}>🂠 Bốc nọc</button>`; }
  else if (myTurn) { const lastT = v.turns[me] >= v.opts.turns - 1; msg = lastT ? '🏁 Lượt cuối: đánh 1 lá, máy sẽ tự hạ phỏm và gửi bài giúp bạn.' : 'Chọn 1 lá rồi bấm <b>Đánh</b> <small>(chạm 2 lần vào lá để đánh nhanh)</small>'; acts = `${v.canU ? '<button class="btn u" data-a="u">🎉 Ù!</button>' : ''}<button class="btn pri" data-a="discard" ${sel != null ? '' : 'disabled'}>🃏 Đánh${sel != null ? ' ' + E.cardTxt(sel) : ''}</button>`; }
  else msg = `<small>${v.done[me] ? 'Bạn đã hạ bài – chờ mọi người đánh xong.' : `Chờ ${nameOf(v, v.cur)}…`}</small>`;
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  if (prev && prev.gid === v.gid) {
    if (v.seq !== prev.seq) beep(v.last && v.last.eatenBy && !(prev.last && prev.last.eatenBy === v.last.eatenBy && prev.last.ate === v.last.ate) ? 'eat' : 'play');
    if (myTurn && prev.cur !== me) beep('turn');
  }
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); setTimeout(() => ui.view === v && showSummary(v), 800); } } else endShown = null;
}
function discard(v, c) {
  const me = ui.myId; if (!E.canDiscard(v.hand, v.eaten[me], c)) { ui.toast(v.eaten[me].includes(c) ? 'Lá đã ăn phải giữ lại trong phỏm.' : 'Đánh lá này thì phỏm có lá ăn sẽ bị vỡ.'); return; }
  sel = null; ui.act({ type: 'discard', card: c });
}
$('#hand').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'), v = ui.view; if (!b || !v || v.spec || v.phase !== 'play') return; const c = +b.dataset.c;
  if (v.cur === ui.myId && v.stage === 'discard' && sel === c) return discard(v, c);
  sel = sel === c ? null : c; render(v, null);
});
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'discard') { if (sel != null) discard(v, sel); }
  else if (a === 'eat' || a === 'draw' || a === 'u') ui.act({ type: a });
  else if (a === 'again' && ui.isHost) ui.net.raw.start();
  else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
  else if (a === 'sum') showSummary(v);
});
function showSummary(v) {
  const me = ui.myId, r = v.result, w = r.order[0];
  const head = v.u ? (v.u === me ? '🎉 Bạn Ù rồi!' : `🎉 ${nameOf(v, v.u)} Ù!`) : w === me ? '🥇 Bạn về nhất!' : `🥇 ${nameOf(v, w)} về nhất`;
  ui.openModal(`<h2>${head}</h2><ul class="sum">${r.order.map((id, i) => { const p = v.players.find(p => p.id === id), d = r.done[id], left = (v.reveal && v.reveal[id]) || [], ch = r.chips[id];
    return `<li class="${i === 0 ? 'win' : ''}">${avatar(p.name)}<span class="nm">${i + 1}. ${esc(cleanName(p.name))}<small>${v.u === id ? 'ù – toàn phỏm' : d.mom ? `móm · lá lẻ: ${left.map(E.cardTxt).join(' ')}` : `${d.pts} điểm${left.length ? ' · lá lẻ: ' + left.map(E.cardTxt).join(' ') : ''}`}</small></span><span class="chip-d ${ch < 0 ? 'neg' : 'pos'}">${ch > 0 ? '+' : ''}${ch} xu</span></li>`; }).join('')}</ul>
    <p style="text-align:center;color:var(--muted);font-size:13px;margin:8px 0 0">Xu chỉ để tính vui trong ván, không phải tiền thật.</p>
    <div class="btns">${ui.isHost ? '<button class="btn pri" id="m-again">🔁 Ván nữa</button>' : ''}<button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal; if ($('#m-again')) $('#m-again').onclick = () => { ui.closeModal(); ui.net.raw.start(); };
}
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Tá lả (Phỏm)</h2>
    <p><b>Mục tiêu:</b> gom bài thành <b>phỏm</b> để lá lẻ còn lại càng ít điểm càng tốt. Át 1 điểm, 2–10 theo số, J 11, Q 12, K 13.</p>
    <h3>Phỏm là gì</h3><ul><li>3–4 lá <b>cùng số</b> (ví dụ 7♠ 7♣ 7♦), hoặc</li><li>từ 3 lá <b>liên tiếp cùng chất</b> (ví dụ 5♥ 6♥ 7♥). Q-K-A không tính.</li></ul>
    <h3>Mỗi lượt</h3><ul><li><b>Bốc</b> 1 lá từ nọc, hoặc <b>ăn</b> lá người ngồi trước vừa đánh nếu nó ghép được phỏm với bài bạn.</li><li>Rồi <b>đánh</b> 1 lá. Lá đã ăn phải giữ trong phỏm, không được đánh đi.</li><li>Người đi đầu cầm 10 lá nên lượt đầu chỉ đánh, không bốc.</li></ul>
    <h3>Kết thúc</h3><ul><li>Mỗi người đánh đủ số lượt. Ở lượt cuối, máy tự <b>hạ phỏm</b> và <b>gửi</b> lá lẻ vào phỏm người khác đã hạ giúp bạn.</li><li>Cộng điểm lá lẻ: <b>ít điểm nhất thắng</b>. Không có phỏm nào là <b>móm</b>, xếp cuối.</li><li><b>Ù:</b> mọi lá đều nằm trong phỏm (được bỏ 1 lá) – thắng ngay.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('tala-sound', sound ? '1' : '0'); drawSound(); beep('turn'); };
addEventListener('resize', () => { clearTimeout(render.t); render.t = setTimeout(() => ui.view && render(ui.view, null), 150); });

const ui = gameKit({
  game: 'tala', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { sel = null; endShown = null; } },
  offline: h => { h.addBot(); h.addBot(); h.addBot(); },
});
