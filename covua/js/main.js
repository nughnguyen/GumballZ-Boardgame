// ♟️ Cờ vua – giao diện. Luật ở engine.js, máy tính ở ai.js (+ worker.js cho gợi ý / thanh đánh giá), phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import * as E from './engine.js?v=1';
import { botAction, botWants, think, mateIn, MATE } from './ai.js?v=1';
import { PUZZLES } from './puzzles.js?v=2';
import { gameKit, $, $$, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox } from '../../shared/ui/dialog.js?v=6';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=176';

const NET = makeNet({
  game: 'covua', min: 2, max: 2, maxSeats: 10, allowLocal: true, minMsg: 'Cờ vua cần 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: botWants, bot: botAction, botDelay: () => 350 + Math.random() * 300,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi'],
});
const LV = { easy: ['dễ', '🐣 Dễ'], normal: ['vừa', '🙂 Vừa'], hard: ['khó', '🔥 Khó'] };
const img = p => `<img src="img/${p === p.toUpperCase() ? 'w' : 'b'}${p.toUpperCase()}.svg" alt="${p}" draggable="false">`;
let want3d = ls.get('covua-3d') === '1', v3 = null, v3load = null, st3 = null; /* bàn 3D: chỉ tải three.js khi người chơi bật */
let sound = ls.get('covua-sound') !== '0', wantHint = ls.get('covua-hint') === '1', wantEval = ls.get('covua-eval') !== '0';

// ---------- âm thanh nhỏ ----------
let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { move: [[240, 0, .05]], cap: [[200, 0, .05], [150, .04, .08]], check: [[660, 0, .08], [880, .09, .12]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]], bad: [[220, 0, .15]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.14, t + at + .012); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}

// ---------- luồng phụ tính gợi ý + thanh đánh giá ----------
let worker = null, jobId = 0; const jobs = new Map();
function ask(fen, opt = {}) {
  return new Promise(res => {
    const id = ++jobId;
    try {
      if (!worker) { worker = new Worker(new URL('./worker.js?v=1', import.meta.url), { type: 'module' }); worker.onmessage = e => { const f = jobs.get(e.data.id); if (f) { jobs.delete(e.data.id); f(e.data); } }; worker.onerror = () => { worker = false; for (const f of jobs.values()) f(null); jobs.clear(); }; }
      if (worker) { jobs.set(id, res); worker.postMessage({ id, fen, ...opt }); return; }
    } catch (e) { worker = false; }
    /* máy không chạy được luồng phụ: tính nhanh ngay tại chỗ (nông hơn để khỏi giật) */
    setTimeout(() => { try { const P = E.fromFen(fen); let m = opt.mate ? mateIn(P, opt.mate) : null, r = null; if (m == null) { r = think(P, { depth: 2, ms: 150 }); m = r.move; } const sc = r ? r.score : MATE - 1, white = P.t === 'w' ? sc : -sc; res({ score: white, mate: Math.abs(sc) > MATE - 100 ? Math.sign(white) : 0, best: m == null ? null : { from: E.mFrom(m), to: E.mTo(m), promo: E.PROMO[E.mPromo(m)] } }); } catch (e) { res(null); } }, 0);
  });
}

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', seated = info.players.slice(0, 2), watch = info.players.slice(2);
  $('#pcount').textContent = `${seated.length}/2`;
  const row = p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${LV[p.level || o.level][0]}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  $('#plist').innerHTML = seated.map(row).join('') + (watch.length ? `<li class="sep"><small>👀 Đang xem</small></li>` + watch.map(row).join('') : '');
  $('#add-box').innerHTML = ui.isHost && seated.length < 2 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button><button class="btn" id="btn-addlocal">+ Người chơi cùng máy</button></div>` : '';
  const seg = (key, items) => `<div class="seg">${items.map(([v, nm]) => `<button type="button" data-opt="${key}" data-v="${v}" aria-pressed="${String(o[key]) === String(v)}" ${dis}>${nm}</button>`).join('')}</div>`;
  const vsBot = seated.some(p => p.isBot);
  $('#opts').innerHTML = `
    <div class="opt"><b>⚪ Ai cầm Trắng (đi trước)</b>${seg('first', [['host', 'Chủ phòng'], ['guest', 'Người kia'], ['random', 'Ngẫu nhiên']])}</div>
    <div class="opt"><b>🤖 Sức cờ của máy</b>${seg('level', Object.entries(LV).map(([k, v]) => [k, v[1]]))}<small>Chỉ dùng khi có máy ngồi vào bàn.</small></div>
    <div class="opt"><b>💡 Gợi ý &amp; 📊 thanh đánh giá</b>${seg('assist', [[false, 'Tắt'], [true, 'Cho phép']])}<small>${vsBot ? 'Đấu với máy thì luôn dùng được, ai thích thì tự bật ở góc trên bàn cờ.' : 'Hai người đấu nhau: tắt để công bằng, hoặc cho phép nếu đang tập cùng nhau.'}</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = seated.length < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
  else if (b.id === 'btn-addlocal') { const n = await promptBox('Hai người chuyền máy cho nhau, mỗi người một lượt.', { title: '👥 Tên người chơi thứ hai', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true }); if (n) h.addLocal(n); }
  else if (b.dataset.opt) { const v = b.dataset.v; h.setOpt(b.dataset.opt, b.dataset.opt === 'assist' ? v === 'true' : v); }
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- bàn cờ ----------
let sel = -1, targets = [], flip = null, at = -1 /* đang xem lại nước thứ mấy (-1 = mới nhất) */, hint = null, evalNow = null, askKey = '', endShown = null, replay = { gid: '', n: -1, list: [] };
const localIds = () => new Set((ui.lobby ? ui.lobby.players : []).filter(p => p.local).map(p => p.id));
const turnPlayer = v => v.players.find(p => p.side === v.turn);
const canMove = v => { if (v.phase !== 'playing' || at >= 0) return false; const t = turnPlayer(v); return !!t && !t.isBot && (t.id === ui.myId || (ui.isHost && localIds().has(t.id))); };
const actor = v => { const t = turnPlayer(v); return t && (t.id === ui.myId || localIds().has(t.id)) ? t : v.players.find(p => p.id === ui.myId); };
const posOf = v => ({ b: v.board, t: v.turn, c: v.castle, ep: v.ep, h: v.half });
const assistOk = v => !!v.puzzle || v.phase === 'ended' || v.opts.assist || v.players.some(p => p.isBot);
/* dựng lại các thế cờ đã qua từ danh sách nước đi (để xem lại ván) */
function positions(v) {
  if (replay.gid === v.gid && replay.n === v.nMoves) return replay.list;
  const list = []; let P = E.fromFen(v.puzzle && v.puzzle.fen ? v.puzzle.fen : E.START_FEN);
  if (v.moves.length === v.nMoves) { list.push(P); for (const m of v.moves) { const x = E.legal(P, m.from).find(x => E.mTo(x) === m.to && E.PROMO[E.mPromo(x)] === (m.promo || '')); if (x == null) break; P = E.make(P, x); list.push(P); } }
  replay = { gid: v.gid, n: v.nMoves, list }; return list;
}
function render(v, prev) {
  const me = ui.myId, mine = v.players.find(p => p.id === me), fl = flip != null ? flip : (mine ? mine.side === 'b' : false);
  if (prev && (prev.gid !== v.gid || prev.nMoves !== v.nMoves)) { sel = -1; targets = []; hint = null; at = -1; }
  const list = positions(v), past = at >= 0 && at < v.nMoves && list[at], P = past ? list[at] : posOf(v), b = P.b;
  const lm = past ? (at > 0 ? v.moves[at - 1] : null) : v.moves[v.moves.length - 1], chk = E.inCheck(P) ? E.kingSq(b, P.t) : -1;
  // thanh trên
  const tp = turnPlayer(v);
  $('#round').innerHTML = v.phase === 'ended' ? '🏁 Hết ván' : v.puzzle ? `🧩 Chiếu bí trong ${v.puzzle.n} nước` : `<i class="${v.turn}"></i>${canMove(v) && tp.id === me ? 'Tới lượt bạn' : `Lượt ${esc(cleanName(tp.name))}`}${v.check ? ' · ⚠️ Chiếu!' : ''}`;
  // hai dải người chơi (trên = đối thủ)
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 }, sum = s => v.caps[s].reduce((n, p) => n + VAL[p.toLowerCase()], 0), diff = sum('w') - sum('b');
  const strip = side => { const p = v.players.find(p => p.side === side), adv = side === 'w' ? diff : -diff; return `${avatar(p.name, 30)}<span class="nm" ${!p.isBot && !p.local && p.id !== me ? `data-gumballz-pid="${p.id}"` : ''}>${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''} <small>${side === 'w' ? '⚪ Trắng' : '⚫ Đen'}${p.isBot ? ' · máy ' + LV[p.level || v.opts.level][0] : ''}</small></span><span class="caps">${v.caps[side].slice().sort((x, y) => VAL[y.toLowerCase()] - VAL[x.toLowerCase()]).map(img).join('')}${adv > 0 ? `<b class="adv">+${adv}</b>` : ''}</span>`; };
  const topSide = fl ? 'w' : 'b';
  $('#strip-top').innerHTML = strip(topSide); $('#strip-bot').innerHTML = strip(E.other(topSide));
  $('#strip-top').classList.toggle('turn', v.phase === 'playing' && v.turn === topSide); $('#strip-bot').classList.toggle('turn', v.phase === 'playing' && v.turn !== topSide);
  // bàn cờ
  let h = '';
  for (let k = 0; k < 64; k++) {
    const i = fl ? 63 - k : k, r = i >> 3, c = i & 7, p = b[i], cls = ['sq', (r + c) % 2 ? 'd' : '', lm && (lm.from === i || lm.to === i) ? 'last' : '', i === sel ? 'sel' : '', i === chk ? 'chk' : '', targets.includes(i) ? 'mv' + (p || (i === P.ep && b[sel] && b[sel].toLowerCase() === 'p') ? ' cap' : '') : '', hint && !past && hint.from === i ? 'hf' : '', hint && !past && hint.to === i ? 'ht' : ''].filter(Boolean).join(' ');
    h += `<button type="button" class="${cls}" data-i="${i}" aria-label="${E.sqName(i)}${p ? ' ' + p : ''}">${p ? img(p) : ''}${(fl ? c === 7 : c === 0) ? `<span class="co r">${8 - r}</span>` : ''}${(fl ? r === 0 : r === 7) ? `<span class="co f">${'abcdefgh'[c]}</span>` : ''}</button>`;
  }
  const board = $('#board'); board.innerHTML = h; board.classList.toggle('past', !!past);
  st3 = { board: b, flip: fl, sel, targets, last: lm ? { from: lm.from, to: lm.to } : null, chk, hint: past ? null : hint, animate: !!prev && prev.gid === v.gid && v.nMoves === prev.nMoves + 1 && !past }; draw3d();
  // lời nhắn + nút
  const opp = mine && v.players.find(p => p !== mine && p.id !== me), a = actor(v), other = a && v.players.find(p => p.id !== a.id);
  let msg = '', acts = '';
  if (v.phase === 'ended') {
    const w = v.winner && v.players.find(p => p.id === v.winner);
    msg = `${w ? (w.id === me ? '🏆 Bạn thắng!' : `🏆 ${esc(cleanName(w.name))} thắng`) : '🤝 Hoà cờ'}<small>${E.RESULT_TEXT[v.result.kind] || ''}</small>`;
    acts = ui.isHost ? `<button class="btn pri" data-a="again">🔁 ${v.puzzle ? 'Thử lại' : 'Ván mới (đổi màu quân)'}</button><button class="btn" data-a="lobby">${v.puzzle ? '🧩 Cờ thế khác' : 'Về phòng chờ'}</button>` : '';
  } else if (!mine && !ui.isHost) msg = '👀 Bạn đang xem ván này.';
  else {
    if (v.offer && a && v.offer !== a.side) msg = `🤝 ${esc(cleanName(other.name))} cầu hoà.<div><button class="btn sm pri" data-a="draw">Đồng ý hoà</button><button class="btn sm" data-a="drawNo">Đánh tiếp</button></div>`;
    else if (v.undo && a && v.undo.by !== a.side) msg = `↩️ ${esc(cleanName(other.name))} xin đi lại.<div><button class="btn sm pri" data-a="undoOk">Cho đi lại</button><button class="btn sm" data-a="undoNo">Không</button></div>`;
    else if (v.puzzle) msg = `🧩 ${esc(v.puzzle.name || 'Cờ thế')}<small>Bạn cầm ${mine && mine.side === 'w' ? 'Trắng' : 'Đen'}, đi trước. Chiếu bí trong ${v.puzzle.n} nước.</small>`;
    else msg = canMove(v) ? (v.check ? '⚠️ Bạn đang bị chiếu – phải giải chiếu!' : 'Chạm quân rồi chạm ô muốn đi.') + (v.offer ? '<small>Đã gửi lời cầu hoà…</small>' : '') : `Chờ ${esc(cleanName(tp.name))} đi…`;
    acts = `<button class="btn sm" data-a="undo" ${v.nMoves ? '' : 'disabled'}>↩️ ${v.undo ? 'Đang xin…' : 'Đi lại'}</button>${v.puzzle ? '' : `<button class="btn sm" data-a="draw" ${v.offer ? 'disabled' : ''}>🤝 Cầu hoà</button>`}<button class="btn sm" data-a="resign">🏳️ ${v.puzzle ? 'Bỏ bài này' : 'Xin thua'}</button>`;
  }
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  // danh sách nước đi + thanh xem lại
  const cur = past ? at : v.nMoves, off = v.nMoves - v.moves.length, sb = v.puzzle && / b /.test(v.puzzle.fen || '') ? 1 : 0; /* cờ thế Đen đi trước: nước đầu nằm ở cột Đen */
  let mh = ''; for (let i = 0; i < v.moves.length; i++) { const n = off + i + sb; if (n % 2 === 0 || i === 0) mh += `<li class="no">${(n >> 1) + 1}.</li>${n % 2 ? '<li></li>' : ''}`; mh += `<li><button type="button" data-at="${n + 1 - sb}" class="${cur === n + 1 - sb ? 'cur' : ''}">${esc(v.moves[i].text)}</button></li>`; }
  $('#moves').innerHTML = mh; const cb = $('#moves .cur'); if (cb && !past) cb.scrollIntoView({ block: 'nearest' });
  $('#hist-txt').textContent = !v.nMoves ? 'Chưa đi nước nào' : cur === 0 ? 'Thế cờ ban đầu' : `${Math.ceil((cur + sb) / 2)}${(cur + sb) % 2 ? '.' : '…'} ${v.moves[cur - 1 - off] ? v.moves[cur - 1 - off].text : ''}${past ? ' (xem lại)' : ''}`;
  // gợi ý + thanh đánh giá
  const ok = assistOk(v); $('#btn-hint').disabled = $('#btn-eval').disabled = !ok;
  $('#btn-hint').setAttribute('aria-pressed', String(ok && wantHint)); $('#btn-eval').setAttribute('aria-pressed', String(ok && wantEval));
  const bar = $('#evalbar'), showEval = ok && wantEval && !v.puzzle; bar.hidden = !showEval; bar.classList.toggle('flip', fl);
  const fen = past ? E.toFen(P) : v.fen, key = `${v.gid}|${fen}|${showEval}|${ok && wantHint}`;
  if (key !== askKey) {
    askKey = key;
    if (showEval) ask(fen, { depth: 4, ms: 600 }).then(r => { if (askKey !== key || !r) return; evalNow = r; drawEval(); });
    if (ok && wantHint && !past && canMove(v)) ask(fen, v.puzzle ? { mate: Math.max(1, v.puzzle.n - (v.nMoves >> 1)), depth: 4, ms: 700 } : { depth: 4, ms: 700 }).then(r => { if (askKey !== key || !r || !r.best) return; hint = r.best; for (const s of $$('#board .sq')) { const i = +s.dataset.i; s.classList.toggle('hf', i === hint.from); s.classList.toggle('ht', i === hint.to); } if (st3) { st3 = { ...st3, hint, animate: false }; draw3d(); } });
    else hint = null;
  }
  if (showEval) drawEval();
  // âm thanh + kết thúc
  if (prev && prev.gid === v.gid && v.nMoves > prev.nMoves) { const m = v.moves[v.moves.length - 1]; beep(v.check ? 'check' : m.cap ? 'cap' : 'move'); }
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); onEnd(v); } } else endShown = null;
}
function drawEval() {
  if (!evalNow) return; const cp = evalNow.mate ? Math.sign(evalNow.mate) * 2000 : Math.max(-2000, Math.min(2000, evalNow.score)), pct = 100 / (1 + Math.pow(10, -cp / 400));
  $('#eval-fill').style.height = pct.toFixed(1) + '%';
  const n = $('#eval-num'); n.textContent = evalNow.mate ? 'M' + Math.abs(evalNow.mate) : (Math.abs(evalNow.score) / 100).toFixed(1); n.classList.toggle('neg', cp < 0);
  $('#evalbar').title = evalNow.mate ? `${evalNow.mate > 0 ? 'Trắng' : 'Đen'} chiếu bí trong ${Math.abs(evalNow.mate)} nước` : `${cp >= 0 ? 'Trắng' : 'Đen'} hơn khoảng ${(Math.abs(evalNow.score) / 100).toFixed(1)} tốt`;
}
async function tryMove(v, from, to) {
  const P = posOf(v), cand = E.legal(P, from).filter(m => E.mTo(m) === to); if (!cand.length) return;
  let promo = '';
  if (E.mPromo(cand[0])) { promo = await pickPromo(v.turn); if (!promo) { sel = -1; targets = []; render(v, v); return; } }
  sel = -1; targets = []; hint = null;
  ui.actAs(turnPlayer(v).id, { type: 'move', from, to, promo }); if (ui.view === v) render(v, v);
}
function pickPromo(side) {
  return new Promise(res => {
    ui.openModal(`<h2>Phong cấp tốt thành…</h2><div class="promo">${['q', 'r', 'b', 'n'].map(k => `<button type="button" data-k="${k}" aria-label="${k}">${img(side === 'w' ? k.toUpperCase() : k)}</button>`).join('')}</div><div class="btns"><button class="btn" id="m-close">Huỷ</button></div>`);
    $('.promo').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { ui.closeModal(); res(b.dataset.k); } }; $('#m-close').onclick = () => { ui.closeModal(); res(''); };
  });
}
$('#board').addEventListener('click', e => { const s = e.target.closest('.sq'); if (s) onSquare(+s.dataset.i); });
function onSquare(i) {
  const v = ui.view; if (!v) return;
  if (!canMove(v)) { if (at >= 0) ui.toast('Đang xem lại ván – bấm ⏭ để về nước mới nhất.'); return; }
  if (sel >= 0 && targets.includes(i)) return tryMove(v, sel, i);
  const p = v.board[i];
  if (p && E.sideOf(p) === v.turn && i !== sel) { sel = i; targets = [...new Set(E.legal(posOf(v), i).map(E.mTo))]; } else { sel = -1; targets = []; }
  render(v, v);
}
// ---------- bàn 3D ----------
function draw3d() {
  const box = $('#box3d'), on = want3d && !!st3; $('#board').hidden = on; box.hidden = !on; box.parentElement.classList.toggle('is3d', on); $('#btn-3d').setAttribute('aria-pressed', String(want3d));
  if (!on) return;
  if (v3) { v3.update(st3); return; }
  if (v3load) return; box.innerHTML = '<div class="load3d">Đang dựng bàn cờ 3D…</div>';
  v3load = import('./view3d.js?v=2').then(m => { box.innerHTML = ''; v3 = m.make3d(box, { onSquare }); if (st3) v3.update({ ...st3, animate: false }); })
    .catch(() => { want3d = false; ls.set('covua-3d', '0'); v3load = null; box.hidden = true; $('#board').hidden = false; ui.toast('Máy này không dựng được bàn 3D – dùng bàn 2D nha.'); });
}
$('#btn-3d').onclick = () => { want3d = !want3d; ls.set('covua-3d', want3d ? '1' : '0'); if (want3d) ui.toast('🧊 Bàn 3D: kéo để xoay, chụm 2 ngón / lăn chuột để phóng to.'); draw3d(); };
$('#acts').addEventListener('click', e => click(e)); $('#msg').addEventListener('click', e => click(e));
function click(e) {
  const b = e.target.closest('button[data-a]'), v = ui.view; if (!b || !v) return; const k = b.dataset.a;
  if (k === 'again') { const h = ui.net.raw; if (v.puzzle) return startPuzzle(PUZZLES.find(p => p.id === v.puzzle.id), !!v.puzzle.daily); h.restart(); h.setOpt('first', v.players[0].side === 'w' ? 'guest' : 'host'); h.start(); return; }
  if (k === 'lobby') { if (v.puzzle) { ui.leave(); openPuzzles(); } else ui.net.raw.restart(); return; }
  const a = actor(v); if (!a) return;
  ui.actAs(a.id, { type: k });
}
$('.hist').addEventListener('click', e => { const b = e.target.closest('[data-h]'), v = ui.view; if (!b || !v) return; const cur = at >= 0 ? at : v.nMoves, off = v.nMoves - v.moves.length, to = { first: off, prev: Math.max(off, cur - 1), next: cur + 1, last: v.nMoves }[b.dataset.h]; at = to >= v.nMoves ? -1 : to; sel = -1; targets = []; render(v, v); });
$('#moves').addEventListener('click', e => { const b = e.target.closest('[data-at]'), v = ui.view; if (!b || !v) return; const n = +b.dataset.at; at = n >= v.nMoves ? -1 : n; sel = -1; targets = []; render(v, v); });
$('#btn-flip').onclick = () => { const v = ui.view; if (!v) return; const mine = v.players.find(p => p.id === ui.myId), cur = flip != null ? flip : (mine ? mine.side === 'b' : false); flip = !cur; render(v, v); };
$('#btn-hint').onclick = () => { wantHint = !wantHint; ls.set('covua-hint', wantHint ? '1' : '0'); hint = null; askKey = ''; ui.toast(wantHint ? '💡 Bật gợi ý: tới lượt bạn, nước nên đi sẽ được viền xanh.' : 'Đã tắt gợi ý.'); ui.view && render(ui.view, ui.view); };
$('#btn-eval').onclick = () => { wantEval = !wantEval; ls.set('covua-eval', wantEval ? '1' : '0'); askKey = ''; ui.toast(wantEval ? '📊 Bật thanh đánh giá: phần trắng càng cao thì Trắng càng lợi.' : 'Đã tắt thanh đánh giá.'); ui.view && render(ui.view, ui.view); };

// ---------- kết thúc ván ----------
/* 🗓️ Giải đố hằng ngày: mỗi ngày (giờ Việt Nam) một bài cờ thế, giống nhau cho mọi người; đếm chuỗi ngày giải liên tiếp trên máy này */
const dayVN = (off = 0) => new Date(Date.now() + 7 * 3600e3 + off * 864e5).toISOString().slice(0, 10);
const dailyPz = () => { let h = 0; for (const ch of dayVN()) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PUZZLES[h % PUZZLES.length]; };
const daily = () => { try { return JSON.parse(ls.get('covua-daily')) || {}; } catch (e) { return {}; } };
const streakNow = () => { const d = daily(); return d.last === dayVN() || d.last === dayVN(-1) ? d.streak || 0 : 0; };
function drawDaily() { const b = $('#btn-daily'); if (!b) return; const d = daily(), done = d.last === dayVN(), st = streakNow(); b.innerHTML = `🗓️ Giải đố hôm nay${done ? ' ✅' : ''}${st ? ` <small style="font-weight:800;opacity:.85">🔥 ${st} ngày</small>` : ''}`; }
const solved = () => { try { return JSON.parse(ls.get('covua-pz')) || {}; } catch (e) { return {}; } };
function onEnd(v) {
  if (!v.puzzle) return;
  const ok = v.winner === 'host' && Math.ceil(v.nMoves / 2) <= v.puzzle.n;
  if (ok) { const d = solved(); d[v.puzzle.id] = 1; ls.set('covua-pz', JSON.stringify(d)); }
  const isDaily = v.puzzle.daily && v.puzzle.daily === dayVN(); let st = 0;
  if (ok && isDaily) { const d = daily(); if (d.last !== dayVN()) { d.streak = d.last === dayVN(-1) ? (d.streak || 0) + 1 : 1; d.best = Math.max(d.best || 0, d.streak); d.last = dayVN(); ls.set('covua-daily', JSON.stringify(d)); } st = d.streak; drawDaily(); }
  setTimeout(() => { if (ui.view !== v) return; const i = PUZZLES.findIndex(p => p.id === v.puzzle.id), next = PUZZLES[i + 1];
    ui.openModal(`<h2>${ok ? '🎉 Chính xác!' : '😅 Chưa đúng rồi'}</h2><p style="text-align:center">${ok ? `Bạn đã chiếu bí trong ${Math.ceil(v.nMoves / 2)} nước.${isDaily ? ` <b>🔥 Chuỗi ${st} ngày</b> – mai quay lại giải bài mới nha.` : ''}` : `Bài này cần chiếu bí trong ${v.puzzle.n} nước. Thử lại nha – có thể bật 💡 để xem gợi ý.`}</p><div class="btns">${ok && isDaily ? '' : ok && next ? '<button class="btn pri" id="m-next">Bài kế ▶</button>' : '<button class="btn pri" id="m-again">🔁 Thử lại</button>'}<button class="btn" id="m-close">Đóng</button></div>`);
    $('#m-close').onclick = ui.closeModal; if ($('#m-next')) $('#m-next').onclick = () => { ui.closeModal(); startPuzzle(next); }; if ($('#m-again')) $('#m-again').onclick = () => { ui.closeModal(); startPuzzle(PUZZLES[i], !!v.puzzle.daily); };
  }, 700);
}

// ---------- cờ thế ----------
function openPuzzles() {
  const d = solved();
  ui.openModal(`<h2>🧩 Cờ thế</h2><p style="text-align:center;color:var(--muted)">Bạn cầm bên tới lượt. Chiếu bí trong số nước đề cho.</p><div class="pz-grid">${PUZZLES.map((p, i) => `<button type="button" data-pz="${p.id}" class="${d[p.id] ? 'done' : ''}">${d[p.id] ? '✅' : '🧩'} Bài ${i + 1}<small>chiếu bí ${p.n} nước</small></button>`).join('')}</div><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
  $('.pz-grid').onclick = e => { const b = e.target.closest('[data-pz]'); if (b) { ui.closeModal(); startPuzzle(PUZZLES.find(p => p.id === b.dataset.pz)); } };
}
function startPuzzle(pz, isDaily = false) {
  if (!pz) return; if (ui.net) ui.leave(); const h = ui.startHost(true, true);
  h.addBot({ level: 'hard' }); h.start({ first: 'host', setup: pz.fen, puzzle: { id: pz.id, name: isDaily ? `Giải đố ngày ${dayVN().split('-').reverse().join('/')}` : `Cờ thế – bài ${PUZZLES.indexOf(pz) + 1}`, n: pz.n, fen: pz.fen, daily: isDaily ? dayVN() : undefined } });
}
$('#btn-puzzle').onclick = openPuzzles;
$('#btn-daily').onclick = () => startPuzzle(dailyPz(), true); drawDaily();
if (/[?&]daily=1/.test(location.search)) { history.replaceState(null, '', location.pathname); setTimeout(() => startPuzzle(dailyPz(), true), 300); } /* vào từ ô Thử thách hôm nay ở trang chủ */

function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Luật Cờ vua</h2>
    <p><b>Mục tiêu:</b> chiếu bí Vua đối phương – Vua bị tấn công mà không còn cách nào thoát.</p>
    <h3>Cách đi quân</h3><ul><li><b>Vua</b>: 1 ô mọi hướng. <b>Hậu</b>: ngang, dọc, chéo bao xa cũng được.</li><li><b>Xe</b>: ngang, dọc. <b>Tượng</b>: chéo. <b>Mã</b>: hình chữ L, nhảy qua quân khác được.</li><li><b>Tốt</b>: tiến 1 ô (nước đầu được tiến 2), ăn chéo 1 ô.</li></ul>
    <h3>Nước đặc biệt</h3><ul><li><b>Nhập thành:</b> Vua đi 2 ô về phía Xe, Xe nhảy qua Vua. Chỉ được khi cả hai chưa đi, giữa không có quân, Vua không bị chiếu và không đi qua ô bị chiếu.</li><li><b>Bắt tốt qua đường:</b> tốt đối phương vừa tiến 2 ô ngang qua tốt mình thì được ăn chéo ngay nước kế.</li><li><b>Phong cấp:</b> tốt tới hàng cuối được đổi thành Hậu, Xe, Tượng hoặc Mã.</li></ul>
    <h3>Hoà cờ</h3><ul><li>Hết nước đi mà không bị chiếu (pat), lặp lại thế cờ 3 lần, 50 nước không ăn quân và không đi tốt, không đủ quân để chiếu bí, hoặc hai bên đồng ý.</li></ul>
    <h3>Trợ giúp</h3><ul><li><b>💡 Gợi ý:</b> viền xanh nước nên đi. <b>📊 Thanh đánh giá:</b> cho biết bên nào đang lợi. Cả hai tự bật/tắt được; khi hai người đấu nhau thì chủ phòng quyết định có cho phép hay không.</li><li>Bấm ◀ ▶ để xem lại các nước đã đi.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('covua-sound', sound ? '1' : '0'); drawSound(); beep('move'); };
$('#btn-news-home').onclick = () => openNews('covua'); newsBadge($('#btn-news-home'), 'covua');

const ui = gameKit({
  game: 'covua', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { sel = -1; targets = []; flip = null; at = -1; hint = null; evalNow = null; askKey = ''; endShown = null; st3 = null; } },
  offline: h => { h.addBot(); },
});
