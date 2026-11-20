// 🔄 Cờ Lật (Reversi) – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng
// dùng shared/net/simplenet.js (cùng pattern Cờ Đam / Cờ Thú: chủ phòng giữ
// state, khách chỉ gửi action {type, x?, y?}). Bấm ô có chấm vàng để xem trước
// sẽ lật những quân nào, bấm lần nữa vào đúng ô đó để đặt quân.
import { createGame, applyAction, viewFor, actors, W, H, idx, coordName, genMovesFor, legalMoves, legalMoveAt, counts, cornersOf } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=12';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'colat', min: 2, max: 2, maxSeats: 10, allowLocal: true,
  minMsg: 'Cờ Lật cần 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { side: 'black', timer: 0 },
  optOk: (k, v) => (k === 'side' && ['black', 'white', 'random'].includes(v)) || (k === 'timer' && [0, 30, 60].includes(+v)),
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 600 + Math.random() * 600,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#fld-name2').style.display = m === 'pvp' ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  try { localStorage.setItem('gumballz-colat-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try {
  const sm = localStorage.getItem('gumballz-colat-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const seated = info.players.slice(0, 2);
  $('#pcount').textContent = `${seated.length}/2 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (seated.length < 2
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  const o = info.opts || {}, dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>⚫ Quân của chủ phòng</b><div class="seg">${[['black', '⚫ Đen (đi trước)'], ['white', '⚪ Trắng'], ['random', '🎲 Ngẫu nhiên']].map(([v, n]) => `<button type="button" data-side="${v}" aria-pressed="${o.side === v}" ${dis}>${n}</button>`).join('')}</div><small>Đen luôn đi trước — chọn Trắng thì bạn đi sau.</small></div>
  <div class="opt"><b>⏱️ Đồng hồ đi</b><div class="seg">${[[0, 'Tắt'], [30, '30 giây'], [60, '60 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${+o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ mà chưa đi thì game tự đi 1 nước hợp lệ giúp bạn.</small></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = seated.length < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Hai người chuyền máy cho nhau, mỗi người một lượt.', { title: '👥 Tên người chơi thứ hai', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
  else if (b.dataset.side && ui.isHost) h.setOpt('side', b.dataset.side);
  else if (b.dataset.timer && ui.isHost) h.setOpt('timer', +b.dataset.timer);
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
/* chế độ local: mở phòng offline trên máy này, thêm máy / người cùng máy theo chế độ đã chọn */
$('#btn-start').onclick = () => {
  ui.startHost(true);
};

/* ---------- đồng hồ đi (mỗi máy tự chạy cho người mình điều khiển) ---------- */
let timerInt = null, timerLeft = 0, timerKey = '';
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function drawTimerChip() {
  const el = $('#timer-left'); if (el) el.textContent = Math.max(0, timerLeft);
  const chip = $('#timer-chip'); if (chip) chip.classList.toggle('low', timerLeft <= 10);
}
function startTimer(v) {
  stopTimer();
  timerLeft = v.timer;
  drawTimerChip();
  timerInt = setInterval(() => {
    timerLeft--;
    drawTimerChip();
    if (timerLeft > 0) return;
    stopTimer();
    const s = ui.net && ui.net.raw && ui.net.raw.state;
    if (!s || s.phase !== 'playing' || s.turn !== v.turn) return;
    const moves = legalMoves(s, s.turn);
    if (moves.length) {
      const m = moves[Math.floor(Math.random() * moves.length)];
      ui.actAs(s.turn, { type: 'move', x: m.x, y: m.y });
      tip('Hết giờ — game tự đi 1 nước giúp bạn.');
    }
  }, 1000);
}

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null, lastSeq = -1, lastPassN = -1;
let preview = null; /* { x, y, flips: [{x,y}...] } ô đang xem trước (bấm 1 lần) */

function sideLabel(side) { return side === 'B' ? '⚫ Đen' : '⚪ Trắng'; }

function cellClass(v, x, y) {
  const cls = ['cl-cell'];
  const lm = v.lastMove;
  if (lm && lm.at.x === x && lm.at.y === y) cls.push('last-to');
  if (preview && preview.x === x && preview.y === y) cls.push('preview');
  else if (preview && preview.flips.some(f => f.x === x && f.y === y)) cls.push('preview-flip');
  else if (v.phase === 'playing' && ui.controls(v.turn)) {
    const mv = legalMoveAt(v, v.turn, x, y);
    if (mv) cls.push('move-dot');
  }
  return cls.join(' ');
}
function boardHTML(v) {
  const flipped = new Set((v.lastMove ? v.lastMove.flipped : []).map(f => f.x + ',' + f.y));
  const isNew = v.lastMove ? v.lastMove.at.x + ',' + v.lastMove.at.y : '';
  let html = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = v.cells[idx(x, y)];
      const key = x + ',' + y;
      const disc = c !== 0
        ? `<span class="disc ${c === 1 ? 'b' : 'w'}${flipped.has(key) ? ' flip' : ''}${isNew === key ? ' new' : ''}"></span>`
        : '';
      const coord = (y === 7 ? `<span class="coord file">${String.fromCharCode(97 + x)}</span>` : '') + (x === 0 ? `<span class="coord rank">${8 - y}</span>` : '');
      html += `<button type="button" class="${cellClass(v, x, y)}" data-x="${x}" data-y="${y}" aria-label="Ô ${coordName(x, y)}${c !== 0 ? `, quân ${c === 1 ? 'Đen' : 'Trắng'}` : ''}">${coord}${disc}</button>`;
    }
  }
  return html;
}

function render(v, prev) {
  cur = v;
  if (!v) { lastSeq = -1; lastPassN = -1; endShownGid = null; preview = null; stopTimer(); timerKey = ''; return; }
  const me = v.players.find(p => p.id === v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  const away = (v.away || []).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
  const c = counts(v.cells);
  /* âm thanh nước mới / bỏ lượt */
  if (v.lastMove && v.lastMove.n !== lastSeq) {
    if (lastSeq !== -1) Snd.place(v.lastMove.flipped.length);
    lastSeq = v.lastMove.n;
  }
  if (v.lastPass && v.lastPass.n !== lastPassN) {
    if (lastPassN !== -1) Snd.pass();
    lastPassN = v.lastPass.n;
  }
  /* xem trước hết hạn khi lượt đổi / nước đó không còn hợp lệ */
  if (preview && (v.phase !== 'playing' || !legalMoveAt(v, v.turn, preview.x, preview.y))) preview = null;
  /* đồng hồ đi: reset khi đổi lượt (kể cả bỏ lượt), chỉ chạy cho người mình điều khiển */
  const tKey = v.gid + ':' + v.turn + ':' + v.turnNo + ':' + v.passStreak;
  if (v.timer && v.phase === 'playing') {
    if (tKey !== timerKey) {
      timerKey = tKey;
      if (ui.controls(v.turn)) startTimer(v); else stopTimer();
    }
  } else { stopTimer(); timerKey = ''; }
  const timerChip = v.timer && v.phase === 'playing' ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${timerLeft}</b>s</span>` : '';
  const passNote = v.lastPass && v.phase === 'playing' ? ` · ⏭️ ${esc(cleanName((v.players.find(p => p.id === v.lastPass.by) || {}).name || 'Đối thủ'))} hết nước — bỏ lượt!` : '';
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.draw ? `🤝 Hòa ${c.B}–${c.W}${v.endReason === 'draw-agree' ? ' — cả 2 đồng ý!' : ' — 2 bên bằng quân nhau!'}`
      : v.endReason === 'resign' ? `🏳️ ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng ${c.B}–${c.W} — đối thủ xin thua!`
      : `🏁 ${v.winner === v.me ? 'Bạn thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng!'} — ${c.B}–${c.W}.`)
    : `⚔️ Lượt ${v.turnNo} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn!' : 'đang chờ ' + esc(cleanName(turnP.name)) + '…') : ''}${passNote}${away.length ? ` · ⚠️ ${esc(away.join(', '))} mất kết nối — máy sẽ đi thay` : ''}${timerChip}`;
  $('#seats').innerHTML = v.players.map(p => {
    const n = p.side === 'B' ? c.B : c.W;
    const nk = cornersOf(v.cells, p.side);
    return `<div class="seat${p.id === v.turn && v.phase === 'playing' ? ' on' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
      <span class="side-badge ${p.side === 'B' ? 'b' : 'w'}">${p.side === 'B' ? '⚫' : '⚪'}</span>
      <small>${sideLabel(p.side)} · ${n} quân${nk ? ` · ${nk} góc 👑` : ''}${p.isBot ? ' · máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? ' · cùng máy' : ''}</small></div>`;
  }).join('');
  const total = Math.max(1, c.B + c.W);
  $('#ratio-b').style.width = (c.B / total * 100) + '%';
  $('#ratio-bl').textContent = `⚫ Đen: ${c.B}`;
  $('#ratio-wh').textContent = `Trắng: ${c.W} ⚪`;
  const inner = $('#board-inner');
  const pvKey = preview ? preview.x + ',' + preview.y : '';
  if (!inner.dataset.gid || inner.dataset.gid !== v.gid || inner.dataset.seq !== String(v.seq) || inner.dataset.pv !== pvKey) {
    inner.dataset.gid = v.gid; inner.dataset.seq = String(v.seq);
    inner.dataset.pv = pvKey;
    inner.innerHTML = boardHTML(v);
  }
  /* dải đề nghị hòa */
  const db = $('#draw-bar');
  if (v.phase === 'playing' && v.drawOffer) {
    const offerer = v.players.find(p => p.id === v.drawOffer);
    const other = v.players.find(p => p.id !== v.drawOffer);
    if (v.drawOffer === v.me || (mode !== 'online' && ui.controls(v.drawOffer))) {
      db.innerHTML = `<div>🤝 Bạn đã đề nghị hòa — đang chờ ${esc(cleanName((other || {}).name || 'đối thủ'))} trả lời…</div><div class="btns"><button class="btn" id="btn-draw-cancel">Rút đề nghị</button></div>`;
      $('#btn-draw-cancel').onclick = () => drawAct({ type: 'draw' });
    } else if (ui.controls(other ? other.id : '')) {
      db.innerHTML = `<div>🤝 ${esc(cleanName((offerer || {}).name || 'Đối thủ'))} đề nghị hòa — bạn có đồng ý không?</div><div class="btns"><button class="btn pri" id="btn-draw-yes">Đồng ý hòa</button><button class="btn" id="btn-draw-no">Từ chối, đánh tiếp</button></div>`;
      $('#btn-draw-yes').onclick = () => drawAct({ type: 'draw' });
      $('#btn-draw-no').onclick = () => drawAct({ type: 'draw-decline' });
    } else {
      db.innerHTML = `<div>🤝 ${esc(cleanName((offerer || {}).name || 'Đối thủ'))} đề nghị hòa — đang chờ ${esc(cleanName((other || {}).name || 'đối thủ'))} trả lời…</div>`;
    }
  } else {
    db.innerHTML = '';
  }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có nước đi nào.</div>';
  /* kết thúc: hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng.
     Huy hiệu riêng (cl-*) do SP.colat trong shared/ui/stats.js tự phát hiện
     từ view (tick/end) — main.js không ghi gì thêm. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = v.winner === v.me;
    if (v.draw) Snd.draw();
    else if (won) Snd.winJingle();
    else Snd.lose();
    const wName = (v.players.find(p => p.id === v.winner) || {}).name;
    let reason = '';
    if (v.draw) reason = v.endReason === 'draw-agree' ? 'Cả 2 cùng đồng ý hòa.' : '2 bên bằng quân nhau!';
    else if (v.endReason === 'resign') reason = won ? 'Đối thủ xin thua — bạn thắng!' : esc(cleanName(wName)) + ' thắng vì bạn xin thua.';
    else reason = won ? 'Bạn nhiều quân hơn khi hết ván!' : esc(cleanName(wName)) + ' nhiều quân hơn khi hết ván!';
    const pB = v.players.find(p => p.side === 'B'), pW = v.players.find(p => p.side === 'W');
    ui.openModal(`<h2>${v.draw ? '🤝 Ván hòa!' : won ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName(wName)) + ' thắng!'}</h2>
      <p style="text-align:center">${reason}</p>
      <div class="bigscore" style="text-align:center;font-family:'Baloo 2',sans-serif;font-size:40px;font-weight:800">⚫ ${c.B} – ${c.W} ⚪</div>
      <div class="score-lines" style="text-align:center">⚫ ${esc(cleanName((pB || {}).name || 'Đen'))}: ${c.B} quân${cornersOf(v.cells, 'B') ? ` · ${cornersOf(v.cells, 'B')} góc` : ''}<br>⚪ ${esc(cleanName((pW || {}).name || 'Trắng'))}: ${c.W} quân${cornersOf(v.cells, 'W') ? ` · ${cornersOf(v.cells, 'W')} góc` : ''}</div>
      <div class="btn-col">${ui.isHost
        ? '<button class="btn big pri" id="m-again">🔁 Chơi ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button>'
        : '<button class="btn" id="m-close">Đóng — chờ chủ phòng mở ván mới</button>'}
      <button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
    const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
    const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
    const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
    $('#m-home').onclick = () => { ui.closeModal(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); };
  }
}
/* hành động hòa: online thì gửi với tư cách chính mình; chơi chung máy thì
   gửi với tư cách người đang tới lượt / người được đề nghị (chủ phòng điều
   khiển cả 2 ghế) */
function drawAct(a) {
  const v = cur;
  if (!v) return;
  if (mode === 'online') { ui.act(a); return; }
  const other = v.drawOffer ? v.players.find(p => p.id !== v.drawOffer) : null;
  const actor = a.type === 'draw' && !v.drawOffer ? v.turn : (other ? other.id : v.turn);
  ui.actAs(actor, a);
}

/* ---------- bấm ô có chấm vàng để xem trước, bấm lần nữa để đặt quân ---------- */
$('#board-inner').addEventListener('click', e => {
  const cell = e.target.closest('.cl-cell');
  if (!cell || !cur || cur.phase !== 'playing') return;
  const x = Number(cell.dataset.x), y = Number(cell.dataset.y);
  if (!ui.net) { tip('Chưa vào ván.'); return; }
  if (!ui.controls(cur.turn)) { tip(cur.spec ? 'Bạn đang xem ván đấu 👀' : 'Chưa tới lượt bạn.'); return; }
  const mv = legalMoveAt(cur, cur.turn, x, y);
  const inner = $('#board-inner');
  if (mv) {
    /* bấm lần 2 vào đúng ô đang xem trước → đặt quân */
    if (preview && preview.x === x && preview.y === y) {
      preview = null;
      ui.actAs(cur.turn, { type: 'move', x, y });
      return;
    }
    /* bấm lần 1 → xem trước sẽ lật những quân nào */
    preview = { x, y, flips: mv.flips };
    Snd.select();
    inner.dataset.pv = x + ',' + y;
    inner.innerHTML = boardHTML(cur);
    return;
  }
  /* bấm vào ô khác → bỏ xem trước */
  if (preview) {
    preview = null;
    inner.dataset.pv = '';
    inner.innerHTML = boardHTML(cur);
  }
});

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký trận đấu</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
$('#btn-new').onclick = () => {
  if (!cur) return;
  if (!ui.isHost) { tip('Chỉ chủ phòng mở ván mới được.'); return; }
  ui.net.raw.start();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua ván này? Đối thủ thắng luôn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  /* online: xin thua cho chính mình; chơi chung máy: xin thua cho người đang tới lượt */
  if (mode === 'online') ui.act({ type: 'resign' });
  else ui.actAs(v.turn, { type: 'resign' });
};
$('#btn-draw').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  if (v.drawOffer) { tip('Đã có đề nghị hòa đang chờ trả lời.'); return; }
  const r = await confirmBox('Đề nghị hòa với đối thủ? Đối thủ đồng ý thì ván hòa, từ chối thì đánh tiếp.', { title: '🤝 Xin hòa', ok: 'Đề nghị hòa', cancel: 'Đánh tiếp' });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'draw' });
  else ui.actAs(v.turn, { type: 'draw' });
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'colat', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    else if (mode === 'pvp') {
      const n2 = ($('#name2').value.trim() || 'Người chơi 2').slice(0, 16);
      if (!h.addLocal(n2)) h.addBot({ level: 'hard' });
    }
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
