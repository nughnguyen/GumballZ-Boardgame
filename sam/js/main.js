// 🃏 Sâm lốc – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { flipRender } from '../../shared/lib/gsap/flip.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { cardHTML } from '../../shared/ui/deck/deck.js?v=5';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=176';

const NET = makeNet(DEF);
const card = (c, cls = '', attrs = '', tag = 'div') => cardHTML(E.rank(c) + 1, E.SUITS[E.suitOf(c)], { cls, attrs, tag });
let sound = ls.get('sam-sound') !== '0';
$('#hero').innerHTML = [[41, -14], [45, -5], [49, 5], [4, 14]].map(([c, r]) => card(c, '', `style="--rot:${r}deg;--up:${Math.abs(r) / 2}"`)).join('');

let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { turn: [[660, 0, .09], [880, .09, .13]], play: [[420, 0, .05], [300, .04, .07]], pass: [[260, 0, .08]], sam: [[392, 0, .1], [523, .1, .1], [784, .2, .25]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.12, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  $('#pcount').textContent = `${n}/${info.max} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· bot</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < info.max ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm bot</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>🔥 Báo Sâm</b><div class="seg">${[[true, 'Có báo Sâm'], [false, 'Không']].map(([v, nm]) => `<button type="button" data-opt="sam" data-v="${v}" aria-pressed="${o.sam === v}" ${dis}>${nm}</button>`).join('')}</div><small>Báo Sâm = cam kết đánh hết 10 lá mà không ai chặt được lần nào. Thành công ăn mỗi người ${E.SAM_PAY} xu; bị chặt một lần là thua ngay và đền cả làng.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt('sam', b.dataset.v === 'true');
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let sel = new Set(), endShown = null;
const nameOf = (v, id) => { const p = v.players.find(p => p.id === id); return p ? esc(cleanName(p.name)) : '?'; };
const TYPE_VN = { single: 'lá lẻ', pair: 'đôi', triple: 'sám cô', four: 'tứ quý', straight: 'sảnh' };
function render(v, prev) {
  const me = ui.myId, mine = !v.spec && v.players.some(p => p.id === me), myTurn = v.cur === me && mine, ended = v.phase === 'ended';
  sel = new Set([...sel].filter(c => v.hand.includes(c)));
  $('#round').textContent = ended ? '🏁 Hết ván' : v.stage === 'sam' ? '🔥 Ai báo Sâm?' : v.table ? `🃏 Đang chặt ${TYPE_VN[v.table.cb.t]}${v.table.cb.n > 1 && v.table.cb.t === 'straight' ? ' ' + v.table.cb.n + ' lá' : ''}` : '🃏 Lượt mới – đánh gì cũng được';
  $('#seats').innerHTML = v.players.filter(p => p.id !== me || !mine).map(p => `<div class="seat${p.id === v.cur ? ' turn' : ''}${v.passed[p.id] ? ' passed' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" data-pid="${p.id}"><div class="who">${avatar(p.name, 26)}<b>${esc(cleanName(p.name))}</b><small>🂠 ${p.n}</small></div>
    <div class="row"><span class="backs">${'<i></i>'.repeat(Math.min(10, p.n))}</span>${v.sam === p.id ? '<span class="tag hot">🔥 báo Sâm</span>' : ''}${p.n === 1 && !ended ? '<span class="tag hot">báo 1</span>' : ''}${v.passed[p.id] ? '<span class="tag">bỏ lượt</span>' : ''}</div>
    ${ended && v.reveal && v.reveal[p.id].length ? `<div class="row"><span class="sm" style="display:flex">${E.sortHand(v.reveal[p.id]).map(c => card(c)).join('')}</span></div>` : ''}</div>`).join('');
  $('#tbl').innerHTML = ended ? '<span>Hết ván</span>' : v.table ? `<span class="played">${v.table.cards.map(c => card(c)).join('')}</span><span>${nameOf(v, v.tableBy)} đánh<small>${TYPE_VN[v.table.cb.t]}</small></span>` : v.stage === 'sam' ? `<span>🔥 Báo Sâm?<small>${v.cur === me ? 'Tới bạn quyết định.' : 'Chờ ' + nameOf(v, v.cur) + '…'}</small></span>` : `<span>Bàn trống<small>${nameOf(v, v.cur)} cầm lượt, đánh bộ nào cũng được.</small></span>`;
  const hand = $('#hand');
  if (!mine) hand.innerHTML = '';
  else {
    const h = E.sortHand(v.hand), n = h.length, w = hand.clientWidth || innerWidth, cw = parseFloat(getComputedStyle(hand).getPropertyValue('--cw')) || 66;
    const ov = n > 1 ? Math.max(-.7, Math.min(-.12, ((w - 20 - cw) / (n - 1) - cw) / cw)) : 0;
    flipRender(hand, '[data-c]', 'data-c', () => { hand.innerHTML = h.map(c => card(c, sel.has(c) ? 'sel' : '', `data-c="${c}" style="--ov:${ov.toFixed(3)}"`, 'button')).join(''); });
  }
  let msg = '', acts = '';
  const picked = [...sel], err = mine && v.stage === 'play' && picked.length ? E.canPlay({ hands: { [me]: v.hand }, table: v.table }, me, picked) : null;
  if (ended) acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button><button class="btn" data-a="sum">🏅 Kết quả</button>' : '<button class="btn" data-a="sum">🏅 Kết quả</button>';
  else if (!mine) msg = '<small>👀 Bạn đang xem – ván sau sẽ được chơi.</small>';
  else if (v.stage === 'sam') { if (myTurn) { msg = 'Bài đủ mạnh để đánh hết mà <b>không ai chặt được</b>? Báo Sâm đi!'; acts = '<button class="btn u" data-a="sam">🔥 Báo Sâm</button><button class="btn pri" data-a="skip">Không báo</button>'; } else msg = `<small>Chờ ${nameOf(v, v.cur)} quyết định báo Sâm…</small>`; }
  else if (myTurn) {
    msg = picked.length ? (err ? `<small>${err}</small>` : 'Bộ này đánh được 👍') : v.table ? 'Tới lượt bạn: chọn bài <b>chặt</b> hoặc <b>bỏ lượt</b>' : 'Bạn cầm lượt: chọn lá rồi bấm <b>Đánh</b>';
    acts = `${v.table ? '<button class="btn" data-a="pass">🙅 Bỏ lượt</button>' : ''}<button class="btn" data-a="hint">💡 Gợi ý</button><button class="btn pri" data-a="play" ${picked.length && !err ? '' : 'disabled'}>🃏 Đánh${picked.length ? ' ' + picked.length + ' lá' : ''}</button>`;
  } else msg = `<small>${v.passed[me] ? 'Bạn đã bỏ lượt vòng này – ' : ''}Chờ ${nameOf(v, v.cur)}…</small>`;
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  if (prev && prev.gid === v.gid) {
    if (v.seq !== prev.seq && v.last) beep(v.last.type === 'sam' ? 'sam' : v.last.type === 'pass' ? 'pass' : 'play');
    if (myTurn && prev.cur !== me) beep('turn');
  }
  if (ended) { if (endShown !== v.gid) { endShown = v.gid; beep('end'); setTimeout(() => ui.view === v && showSummary(v), 800); } } else endShown = null;
}
$('#hand').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'), v = ui.view; if (!b || !v || v.spec || v.phase !== 'play') return; const c = +b.dataset.c;
  sel.has(c) ? sel.delete(c) : sel.add(c); render(v, null);
});
function hint(v) { /* gợi ý: bộ nhỏ nhất đánh được; bấm tiếp thì xoay sang bộ kế */
  const me = ui.myId, list = E.allCombos(v.hand).filter(cs => !E.canPlay({ hands: { [me]: v.hand }, table: v.table }, me, cs)).sort((a, b) => (v.table ? 0 : b.length - a.length) || E.combo(a).top - E.combo(b).top);
  if (!list.length) { ui.toast('Không có bộ nào chặt được – bỏ lượt thôi.'); return; }
  const curKey = [...sel].sort().join(','), i = list.findIndex(cs => cs.slice().sort().join(',') === curKey); sel = new Set(list[(i + 1) % list.length]); render(v, null);
}
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'play') { const cards = [...sel]; sel = new Set(); ui.act({ type: 'play', cards }); }
  else if (a === 'pass') { sel = new Set(); ui.act({ type: 'pass' }); }
  else if (a === 'sam' || a === 'skip') ui.act({ type: a });
  else if (a === 'hint') hint(v);
  else if (a === 'again' && ui.isHost) ui.net.raw.start();
  else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
  else if (a === 'sum') showSummary(v);
});
function showSummary(v) {
  const me = ui.myId, r = v.result, w = r.winner, wn = w === me ? 'Bạn' : nameOf(v, w);
  const head = r.white ? `✨ ${wn} ăn trắng: ${r.white}!` : r.block ? `🛑 ${wn} chặn được Sâm của ${r.sam === me ? 'bạn' : nameOf(v, r.sam)}!` : r.sam === w ? `🔥 ${wn} báo Sâm thành công!` : `🥇 ${wn} hết bài trước`;
  ui.openModal(`<h2>${head}</h2><ul class="sum">${v.players.slice().sort((a, b) => r.chips[b.id] - r.chips[a.id]).map(p => { const ch = r.chips[p.id], left = (v.reveal && v.reveal[p.id]) || [];
    return `<li class="${p.id === w ? 'win' : ''}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}<small>${p.id === w ? 'thắng' : r.block ? (p.id === r.sam ? 'báo Sâm bị chặn – đền cả làng' : 'thoát') : ch === -E.CONG_PAY && !r.white && r.sam !== w ? 'cóng – chưa đánh được lá nào' : left.length + ' lá còn lại'}</small></span><span class="chip-d ${ch < 0 ? 'neg' : 'pos'}">${ch > 0 ? '+' : ''}${ch} xu</span></li>`; }).join('')}</ul>
    <p style="text-align:center;color:var(--muted);font-size:13px;margin:8px 0 0">Xu chỉ để tính vui trong ván, không phải tiền thật.</p>
    <div class="btns">${ui.isHost ? '<button class="btn pri" id="m-again">🔁 Ván nữa</button>' : ''}<button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal; if ($('#m-again')) $('#m-again').onclick = () => { ui.closeModal(); ui.net.raw.start(); };
}
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Sâm lốc</h2>
    <p><b>Mục tiêu:</b> đánh hết 10 lá trước mọi người. Thứ tự lá: 3 nhỏ nhất … K, Át, <b>2 lớn nhất</b>. Chất không phân hơn kém.</p>
    <h3>Các bộ đánh được</h3><ul><li><b>Lá lẻ</b>, <b>đôi</b>, <b>sám cô</b> (3 lá giống số), <b>tứ quý</b> (4 lá giống số).</li><li><b>Sảnh:</b> từ 3 lá liên tiếp, không cần cùng chất. Át đứng đầu (A-2-3) hoặc cuối (Q-K-A) đều được; K-A-2 thì không.</li></ul>
    <h3>Chặt bài</h3><ul><li>Phải đánh <b>cùng loại, cùng số lá</b> và lớn hơn. Không chặt được hoặc không muốn thì <b>bỏ lượt</b> (bỏ rồi phải chờ hết vòng).</li><li><b>Tứ quý chặt được lá 2.</b></li><li>Mọi người bỏ lượt thì người đánh cuối được ra bộ mới.</li><li><b>Không được về bằng 2:</b> lá cuối cùng đánh ra không được là 2.</li></ul>
    <h3>Báo Sâm & tính xu</h3><ul><li>Đầu ván, ai tự tin thì <b>báo Sâm</b>: được đánh trước, hết bài mà không ai chặt lần nào thì ăn mỗi người ${E.SAM_PAY} xu. Bị chặt một lần là thua ngay, đền cả làng.</li><li>Thắng thường: mỗi người thua trả 1 xu cho mỗi lá còn trên tay; <b>cóng</b> (chưa đánh được lá nào) trả ${E.CONG_PAY} xu.</li><li><b>Ăn trắng</b> ngay khi chia bài: tứ quý 2, sảnh rồng 10 lá, năm đôi, ba sám cô, đồng màu – ăn mỗi người ${E.WHITE_PAY} xu.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('sam-sound', sound ? '1' : '0'); drawSound(); beep('turn'); };
$('#btn-news-home').onclick = () => openNews('sam'); newsBadge($('#btn-news-home'), 'sam');
addEventListener('resize', () => { clearTimeout(render.t); render.t = setTimeout(() => ui.view && render(ui.view, null), 150); });

const ui = gameKit({
  game: 'sam', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { sel = new Set(); endShown = null; } },
  offline: h => { h.addBot(); h.addBot(); h.addBot(); },
});
