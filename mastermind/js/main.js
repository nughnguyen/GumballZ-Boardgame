// 🔴 Mastermind – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Blokus:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi trên giao diện: đầu ván mỗi người đặt mã bí mật 4 chốt
// (bấm 1 màu ở bảng màu rồi bấm vào các ô, hoặc bấm ô rồi chọn màu);
// tới lượt đoán thì xếp 4 chốt ở hàng đoán rồi bấm ✅ Đoán — phản hồi
// ⚫ đen = đúng màu đúng chỗ, ⚪ trắng = đúng màu sai chỗ.
import { createGame, applyAction, viewFor, actors, validateGuess, legalGuesses, COLORS, CODE_LEN, COLOR_COUNT, MAX_GUESSES } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'mastermind', min: 2, max: 2, maxSeats: 2, allowLocal: true,
  minMsg: 'Mastermind cần đúng 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay (2 người)' : m === 'ai-easy' ? '🤖 Bắt đầu chơi với máy Dễ' : '🧠 Bắt đầu chơi với máy Khó';
  try { localStorage.setItem('gumballz-mastermind-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try {
  const sm = localStorage.getItem('gumballz-mastermind-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/2 người (cần đúng 2)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 2
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🔴 Đấu song song 2 bàn</b><div class="role-note">Mỗi người đặt 1 mã bí mật 4 chốt (6 màu, màu được lặp lại), rồi luân phiên đoán mã của nhau — ai đoán ra trước (4 chốt đen) thì thắng, tối đa 10 lượt mỗi người.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n !== 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = n < 2 ? `Cần đúng 2 người mới bắt đầu (đang có ${n}).` : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó đánh. Nhớ che màn hình trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-copy-code').onclick = () => {
  const code = $('#room-code').textContent.trim();
  if (!code || code === '…') { tip('Chưa có mã phòng.'); return; }
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => tip('Đã sao chép mã phòng: ' + code)).catch(() => tip('Mã phòng: ' + code));
  else tip('Mã phòng: ' + code);
};
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let setupCode = [null, null, null, null]; /* mã đang đặt */
let setupSel = 0; /* ô đang chọn trong hàng đặt mã */
let guessCode = [null, null, null, null]; /* lượt đoán đang soạn */
let guessSel = 0; /* ô đang chọn trong hàng đoán */

function controlPid(v) {
  if (!v || v.phase !== 'playing') return null;
  const pid = v.turn;
  return pid && ui.controls(pid) ? pid : null;
}
function setupPid(v) {
  if (!v || v.phase !== 'setup') return null;
  const pid = v.turn;
  return pid && ui.controls(pid) ? pid : null;
}
function pendingHuman(v) {
  if (!v || v.phase === 'ended') return null;
  const p = v.players.find(x => x.id === v.turn);
  return p && !p.isBot ? p : null;
}
function pegHtml(colorIdx, extra = '') {
  return `<span class="mm-peg c${colorIdx} ${extra}" title="${COLORS[colorIdx].name}"></span>`;
}
function fbHtml(fb) {
  let dots = '';
  for (let i = 0; i < CODE_LEN; i++) {
    const cls = i < fb.black ? 'fb-b' : i < fb.black + fb.white ? 'fb-w' : 'fb-e';
    dots += `<span class="mm-fb-dot ${cls}"></span>`;
  }
  return `<span class="mm-fb">${dots}</span>`;
}
function secretHtml(code, hidden) {
  if (hidden || !code) return '<span class="mm-secret-code">' + ['?', '?', '?', '?'].map(() => '<span class="mm-peg q">?</span>').join('') + '</span>';
  return '<span class="mm-secret-code">' + code.map(c => pegHtml(c)).join('') + '</span>';
}
function boardHtml(p, isMine) {
  let html = '';
  for (let i = 0; i < MAX_GUESSES; i++) {
    const g = p.guesses[i], f = p.feedbacks[i];
    if (!g) {
      html += `<div class="mm-row empty"><span class="mm-num">${i + 1}</span><span class="mm-pegs">${[0, 1, 2, 3].map(() => '<span class="mm-peg e"></span>').join('')}</span><span class="mm-fb">${[0, 1, 2, 3].map(() => '<span class="mm-fb-dot fb-e"></span>').join('')}</span></div>`;
    } else {
      html += `<div class="mm-row${i === p.guesses.length - 1 ? ' latest' : ''}"><span class="mm-num">${i + 1}</span><span class="mm-pegs">${g.map(c => pegHtml(c)).join('')}</span>${fbHtml(f)}</div>`;
    }
  }
  return html;
}
function paletteHtml(idPrefix) {
  return COLORS.map(c => `<button type="button" class="mm-pal c${c.idx}" data-color="${c.idx}" data-pal="${idPrefix}" title="${c.name}" aria-label="Màu ${c.name}"></button>`).join('');
}
function slotsHtml(code, sel, idPrefix) {
  return code.map((c, i) => c === null
    ? `<button type="button" class="mm-slot${i === sel ? ' sel' : ''}" data-slot="${i}" data-sl="${idPrefix}" aria-label="Ô ${i + 1}">?</button>`
    : `<button type="button" class="mm-slot${i === sel ? ' sel' : ''}" data-slot="${i}" data-sl="${idPrefix}" aria-label="Ô ${i + 1}">${pegHtml(c)}</button>`).join('');
}

function render(v, prev) {
  cur = v;
  if (!v) { endShownFor = ''; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const meP = v.players.find(p => p.id === v.me);
  const oppP = v.players.find(p => p.id !== v.me);

  /* ----- giai đoạn đặt mã ----- */
  const spid = setupPid(v);
  $('#setup-box').style.display = v.phase === 'setup' ? '' : 'none';
  $('#boards').style.display = v.phase === 'setup' ? 'none' : '';
  $('#guess-box').style.display = v.phase === 'playing' ? '' : 'none';
  if (v.phase === 'setup') {
    const turnName = turnP ? cleanName(turnP.name) : '…';
    $('#setup-title').textContent = spid ? `🔒 ${turnName} đặt mã bí mật` : `🔒 Đang chờ ${turnName} đặt mã…`;
    $('#setup-note').textContent = spid
      ? 'Chọn 4 chốt màu (màu được lặp lại) — chỉ mình bạn thấy mã này. Bấm 1 màu ở bảng màu rồi bấm vào các ô, hoặc bấm ô rồi chọn màu.'
      : `${turnName} đang đặt mã bí mật — đừng nhìn màn hình hộ bạn ấy!`;
    $('#setup-slots').innerHTML = slotsHtml(setupCode, setupSel, 'setup');
    $('#setup-palette').innerHTML = paletteHtml('setup');
    $('#btn-setup-done').disabled = !spid || setupCode.some(c => c === null);
    $('#round').textContent = `🔒 Đặt mã bí mật — lượt của ${turnName}${turnP && turnP.isBot ? ' 🤖' : ''}`;
  }

  /* ----- giai đoạn đoán ----- */
  if (v.phase === 'playing' || v.phase === 'ended') {
    $('#round').textContent = v.phase === 'ended'
      ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'trận hòa!'}`
      : `🔴 Vòng ${v.round} · Lượt đoán của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · mỗi người tối đa ${MAX_GUESSES} lượt`;
    $('#status').innerHTML = v.players.map((p) => {
      const sum = v.final ? v.final.summary[p.id] : null;
      return `<span class="stat ${p.id === v.me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>${sum ? sum.guesses : p.guesses.length}/${MAX_GUESSES} lượt</b> · tốt nhất ${p.bestBlack}⚫ ${p.bestWhite}⚪${p.cracked ? ' · đã đoán ra! 🎉' : ''}</span>`;
    }).join('');
    /* bảng của mình: mình đoán mã của đối thủ (mã đó chỉ lộ khi hết ván) */
    $('#board-title').textContent = `🎯 Bảng đoán của bạn — mã của ${oppP ? cleanName(oppP.name) : 'đối thủ'}`;
    $('#my-secret').innerHTML = `Mã cần đoán: ${secretHtml(oppP ? oppP.secret : null, v.phase !== 'ended')}`;
    $('#board').innerHTML = boardHtml(meP || { guesses: [], feedbacks: [] }, true);
    /* bảng đối thủ: đối thủ đoán mã của mình (mã mình chỉ mình thấy,
       chuyền tay thì che luôn để người ngồi cạnh không nhìn trộm) */
    $('#board-opp-title').textContent = `👀 Bảng đoán của ${oppP ? cleanName(oppP.name) : 'đối thủ'} — mã của bạn`;
    $('#opp-secret').innerHTML = `Mã của bạn: ${secretHtml(meP ? meP.secret : null, mode === 'pvp' && v.phase !== 'ended')}`;
    $('#board-opp').innerHTML = boardHtml(oppP || { guesses: [], feedbacks: [] }, false);

    const pid = controlPid(v);
    $('#guess-slots').innerHTML = slotsHtml(guessCode, guessSel, 'guess');
    $('#palette').innerHTML = paletteHtml('guess');
    $('#btn-guess').disabled = !pid || guessCode.some(c => c === null);
    if (v.phase !== 'playing') {
      $('#stage-info').innerHTML = '';
    } else if (!pid) {
      $('#stage-info').innerHTML = `Đang chờ ${turnP ? esc(cleanName(turnP.name)) : 'đối thủ'} đoán…`;
    } else {
      const left = legalGuesses(v, pid).length;
      $('#stage-info').innerHTML = `Xếp 4 chốt rồi bấm ✅ Đoán — còn <b>${left}</b> mã khớp với các phản hồi đã có.`;
    }
  }

  $('#players').innerHTML = v.players.map((p, i) => {
    const sum = v.final ? v.final.summary[p.id] : null;
    return `<div class="mm-player ${p.id === v.turn && v.phase !== 'ended' ? 'turn' : ''} ${p.id === v.me ? 'me' : ''}">
      <span class="mm-dot"></span>
      <div class="mm-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${p.id === v.winner ? ' 👑' : ''}</b>
        <span class="mm-ptotal">${v.phase === 'ended' ? `Điểm ${p.score}` : `đã đoán ${sum ? sum.guesses : p.turns} lượt · tốt nhất ${p.bestBlack}⚫ ${p.bestWhite}⚪`}</span>
        <span class="mm-pmeta">${v.phase === 'ended' ? (sum && sum.cracked ? 'Đã đoán ra mã! 🎉' : `chưa đoán ra (${sum ? sum.guesses : p.turns}/${MAX_GUESSES} lượt)`) : (p.secret ? 'đã đặt mã 🔒' : 'chưa đặt mã…')}</span>
      </div>
    </div>`;
  }).join('');

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.hint();
    else if (v.seq !== prev.seq) Snd.place();
  }
  if (v.phase === 'ended') {
    const k = v.gid + ':' + v.seq;
    if (endShownFor !== k) { endShownFor = k; showEnd(v); }
    if (v.winner === v.me) Snd.winJingle(); else if (prev && prev.phase !== 'ended') Snd.lose();
  }
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const winner = v.players.find(p => p.id === v.winner);
  const title = v.winner === v.me ? '👑 Bạn thắng trận!' : winner ? `🏁 ${esc(cleanName(winner.name))} thắng trận!` : '🤝 Trận hòa!';
  const rows = (v.final ? v.final.scores : v.players.map(p => ({ id: p.id, name: p.name, score: p.score }))).map(s => {
    const p = v.players.find(x => x.id === s.id) || {};
    const sum = v.final ? v.final.summary[s.id] : null;
    const code = p.secret ? p.secret.map(c => `<span class="mm-peg sm c${c}"></span>`).join('') : '????';
    return `<tr><td>${esc(cleanName(s.name))}${s.id === v.winner ? ' 👑' : ''}${s.id === v.me ? ' (bạn)' : ''}</td><td>${code}</td><td>${sum ? sum.guesses : '–'}/${MAX_GUESSES} lượt</td><td>${sum && sum.cracked ? 'Đã đoán ra 🎉' : `tốt nhất ${sum ? sum.bestBlack : 0}⚫ ${sum ? sum.bestWhite : 0}⚪`}</td><td>${s.score} điểm</td></tr>`;
  }).join('');
  const body = `<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Người chơi</th><th>Mã bí mật</th><th>Lượt đoán</th><th>Kết quả</th><th>Điểm</th></tr>${rows}</table><p class="note">${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- tương tác: bảng màu + ô chốt ---------- */
function fillSlot(codeArr, selRef, colorIdx) {
  codeArr[selRef.i] = colorIdx;
  selRef.i = (selRef.i + 1) % CODE_LEN;
  Snd.pick();
}
const setupSelRef = { get i() { return setupSel; }, set i(v) { setupSel = v; } };
const guessSelRef = { get i() { return guessSel; }, set i(v) { guessSel = v; } };
document.addEventListener('click', e => {
  const pal = e.target.closest('[data-pal]');
  if (pal) {
    const colorIdx = +pal.dataset.color;
    if (pal.dataset.pal === 'setup') {
      if (!cur || cur.phase !== 'setup' || !setupPid(cur)) { tip('Chưa tới lượt bạn đặt mã.'); return; }
      fillSlot(setupCode, setupSelRef, colorIdx);
      render(cur, cur);
    } else {
      if (!cur || cur.phase !== 'playing' || !controlPid(cur)) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
      fillSlot(guessCode, guessSelRef, colorIdx);
      render(cur, cur);
    }
    return;
  }
  const slot = e.target.closest('[data-sl]');
  if (slot) {
    const i = +slot.dataset.slot;
    if (slot.dataset.sl === 'setup') {
      if (!cur || cur.phase !== 'setup' || !setupPid(cur)) return;
      setupSel = i; Snd.pick(); render(cur, cur);
    } else {
      if (!cur || cur.phase !== 'playing' || !controlPid(cur)) return;
      guessSel = i; Snd.pick(); render(cur, cur);
    }
  }
});
/* ---------- nút đặt mã / đoán / xóa ---------- */
$('#btn-setup-random').onclick = () => {
  if (!cur || cur.phase !== 'setup' || !setupPid(cur)) { tip('Chưa tới lượt bạn đặt mã.'); return; }
  setupCode = [0, 1, 2, 3].map(() => Math.floor(Math.random() * COLOR_COUNT));
  setupSel = 0;
  Snd.pick();
  render(cur, cur);
};
$('#btn-setup-done').onclick = () => {
  if (!cur || cur.phase !== 'setup') return;
  const pid = setupPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn đặt mã.'); return; }
  if (setupCode.some(c => c === null)) { Snd.invalid(); tip('Chọn đủ 4 chốt màu cho mã bí mật đã.'); return; }
  ui.actAs(pid, { type: 'setcode', code: setupCode.slice() });
  setupCode = [null, null, null, null];
  setupSel = 0;
  Snd.place();
  render(cur, cur);
};
$('#btn-clear-guess').onclick = () => {
  guessCode = [null, null, null, null];
  guessSel = 0;
  Snd.pick();
  if (cur) render(cur, cur);
};
$('#btn-guess').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  const chk = validateGuess(cur, pid, guessCode);
  if (!chk.ok) { Snd.invalid(); tip(chk.reason); return; }
  ui.actAs(pid, { type: 'guess', guess: guessCode.slice() });
  guessCode = [null, null, null, null];
  guessSel = 0;
  Snd.place();
  render(cur, cur);
};

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký ván chơi</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
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
  const r = await confirmBox('Nhận thua trận này? Trận kết thúc ngay, đối thủ thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = mode === 'pvp' ? ((pendingHuman(v) || {}).id || v.me) : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'mastermind', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: thêm 1 máy (máy tự đặt mã + tự đoán) */
      h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* pvp: chủ phòng thêm người trong phòng chờ (thêm máy / người cùng máy) */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
