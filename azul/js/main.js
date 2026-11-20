// 🎨 Azul – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Carcassonne:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}). Mỗi lượt lấy
// tất cả gạch 1 màu ở 1 xưởng (gạch còn lại ra trung tâm) hoặc ở trung
// tâm, đặt vào 1 hàng mẫu (hoặc thẳng xuống hàng sàn); hàng mẫu đầy thì
// ốp 1 gạch lên tường cuối vòng.
import { createGame, applyAction, viewFor, actors, canPlaceLine, wallCol, WALL, COLORS, COLOR_NAME, FLOOR_PENALTIES, LINE_CAP } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { gameKit, $, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'azul', min: 2, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Azul cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* màu gạch theo ghế ngồi (chấm điểm) */
const PLAYER_COLORS = ['#E05D5D', '#5B8DEF', '#E8B93C', '#58B368'];
const colorOf = (v, pid) => {
  const i = v.players.findIndex(p => p.id === pid);
  return PLAYER_COLORS[i < 0 ? 0 : i % PLAYER_COLORS.length];
};
const COLOR_EMOJI = { B: '🔵', Y: '🟡', R: '🔴', K: '⚫', W: '⚪' };
const tileHtml = (color, extra = '') => `<span class="az-tile c-${color}" ${extra}>${COLOR_EMOJI[color]}</span>`;

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 2; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-azul-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-azul-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-azul-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-azul-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/4 người (cần 2–4)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Người đi đầu</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🎨 Luật nhanh</b><div class="role-note">100 gạch, 5 màu. Mỗi lượt lấy tất cả gạch 1 màu ở 1 xưởng (gạch còn lại ra trung tâm) hoặc ở trung tâm, đặt vào 1 hàng mẫu (1–5 gạch, 1 hàng chỉ 1 màu). Hàng đầy thì ốp 1 gạch lên tường tính điểm; hàng sàn trừ -1,-1,-2,-2,-2,-3,-3. Ván kết thúc khi có người hoàn thành 1 hàng ngang trên tường.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2 || n > 4;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = n < 2 ? `Cần ít nhất 2 người mới bắt đầu (đang có ${n}).` : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó đi. Bàn của mọi người đều công khai!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
/* lựa chọn lấy gạch: { from: 'factory'|'centre', source: idx|-1, color } + hàng đích */
let sel = null;           /* null | { from, source, color } */
let targetLine = null;    /* null | -1 (sàn) | 0..4 (hàng mẫu) */

function turnHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  if (mode === 'pvp') return p && !p.isBot ? p : null;
  return v.players.find(x => x.id === v.me) || null;
}
function isMyTurn(v, pid) {
  return v && v.phase === 'playing' && v.turn === pid;
}
function myBoard(v) {
  const human = turnHuman(v);
  return human ? v.players.find(p => p.id === human.id) : null;
}

/* 1 bàn người chơi: hàng mẫu + tường + hàng sàn.
   interactive = true chỉ cho bàn của người tới lượt (bấm chọn hàng đích). */
function boardHtml(pl, v, interactive, meP) {
  const isMe = meP && pl.id === meP.id;
  const myTurn = interactive && isMe;
  let h = `<div class="az-board${isMe ? ' me' : ''}"><h4>${esc(cleanName(pl.name))}${isMe ? ' (bạn)' : ''}${pl.isBot ? ' 🤖' : ''} · <small>${pl.score} điểm</small></h4><div class="az-board-grid"><div class="az-lines">`;
  for (let li = 0; li < 5; li++) {
    const L = pl.lines[li];
    const full = L.count >= LINE_CAP[li];
    const okTarget = myTurn && sel && canPlaceLine(pl, li, sel.color);
    const isSel = targetLine === li;
    h += `<div class="az-line${full ? ' full' : ''}${okTarget ? ' targetable' : ''}${isSel ? ' sel' : ''}" data-line="${li}" title="Hàng mẫu ${li + 1} (chứa ${LINE_CAP[li]} gạch)">`;
    h += `<span class="az-lnum">${li + 1}</span>`;
    for (let k = 0; k < LINE_CAP[li]; k++) {
      h += `<span class="az-slot">${k < L.count && L.color ? tileHtml(L.color) : ''}</span>`;
    }
    if (L.color) h += `<span class="az-lhint">${COLOR_EMOJI[L.color]} ${L.count}/${LINE_CAP[li]}</span>`;
    h += `</div>`;
  }
  /* hàng sàn */
  const floorN = pl.floor.length + (pl.marker ? 1 : 0);
  const okFloor = myTurn && sel;
  h += `<div class="az-floor${okFloor ? ' targetable' : ''}${targetLine === -1 ? ' sel' : ''}" data-line="-1" title="Hàng sàn (trừ điểm)">`;
  h += `<span class="az-lnum">−</span>`;
  for (let k = 0; k < 7; k++) {
    const c = pl.floor[k];
    h += `<span class="az-slot">${c ? tileHtml(c) : `<span class="az-pen">${FLOOR_PENALTIES[k]}</span>`}</span>`;
  }
  if (pl.marker) h += `<span class="az-slot"><span class="az-marker" title="Dấu đi đầu">1</span></span>`;
  h += `<span class="az-pen">${floorN ? '−' + (FLOOR_PENALTIES.slice(0, Math.min(floorN, 7)).reduce((a, x) => a - x, 0) + (floorN > 7 ? 3 * (floorN - 7) : 0)) + 'đ' : ''}</span>`;
  h += `</div></div>`;
  /* tường 5×5 (ô trống hiện màu mẫu mờ) */
  h += `<div class="az-wall">`;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const filled = pl.wall[r][c];
      const col = WALL[r][c];
      h += `<div class="az-wcell">${filled ? tileHtml(col) : `<span class="az-ghost c-${col}"></span>`}</div>`;
    }
  }
  h += `</div></div></div>`;
  return h;
}

function render(v, prev) {
  cur = v;
  if (!v) { endShownFor = ''; sel = null; targetLine = null; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const human = turnHuman(v);
  const handPid = human ? human.id : null;
  const meP = myBoard(v);
  const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
  /* đổi lượt thì bỏ lựa chọn cũ */
  if (prev && (v.turnCount !== prev.turnCount || v.phase !== prev.phase)) { sel = null; targetLine = null; }

  const winnerP = v.winner ? v.players.find(p => p.id === v.winner) : null;
  $('#round').textContent = v.phase === 'ended'
    ? (v.winner
      ? `🏁 ${winnerP ? cleanName(winnerP.name) : 'Ai đó'} thắng với ${winnerP ? winnerP.score : '?'} điểm!`
      : '🏁 Ván kết thúc.')
    : `🎲 Lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · Vòng ${v.round} · 👜 túi còn ${v.bagCount} gạch`;
  $('#status').innerHTML = v.players.map((p, i) => {
    const wallTiles = p.wall.flat().filter(Boolean).length;
    return `<span class="stat ${p.id === v.me ? 'me' : ''} ${p.id === v.turn && v.phase === 'playing' ? 'turn' : ''}"><span class="dot" style="background:${colorOf(v, p.id)}"></span>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.id === v.turn && v.phase === 'playing' ? ' 👉 tới lượt' : ''}: <b>${p.score} điểm</b> · 🧱 ${wallTiles} gạch tường</span>`;
  }).join('');

  /* ----- xưởng + trung tâm ----- */
  $('#bag-count').textContent = `· túi còn ${v.bagCount} gạch${v.lidCount ? ` · nắp hộp ${v.lidCount} gạch` : ''}`;
  let fh = '';
  v.factories.forEach((f, i) => {
    const counts = {};
    for (const c of f) counts[c] = (counts[c] || 0) + 1;
    fh += `<div class="az-factory" data-factory="${i}"><div class="az-frow">`;
    fh += f.slice(0, 2).map(c => `<button type="button" class="az-tile c-${c}${sel && sel.from === 'factory' && sel.source === i && sel.color === c ? ' sel' : ''}" data-source="factory" data-idx="${i}" data-color="${c}" ${!myTurn || v.phase !== 'playing' ? 'disabled' : ''}>${COLOR_EMOJI[c]}</button>`).join('');
    fh += `</div><div class="az-frow">`;
    fh += f.slice(2, 4).map(c => `<button type="button" class="az-tile c-${c}${sel && sel.from === 'factory' && sel.source === i && sel.color === c ? ' sel' : ''}" data-source="factory" data-idx="${i}" data-color="${c}" ${!myTurn || v.phase !== 'playing' ? 'disabled' : ''}>${COLOR_EMOJI[c]}</button>`).join('');
    fh += `</div><span class="az-flabel">Xưởng ${i + 1}</span></div>`;
  });
  $('#factories').innerHTML = fh;
  let ch = '';
  if (v.markerInCentre) ch += `<span class="az-marker" title="Dấu đi đầu — ai lấy ở trung tâm đầu tiên thì lấy luôn dấu này">1</span>`;
  const centreCounts = {};
  for (const c of v.centre) centreCounts[c] = (centreCounts[c] || 0) + 1;
  for (const c of COLORS) {
    if (!centreCounts[c]) continue;
    ch += `<button type="button" class="az-tile c-${c}${sel && sel.from === 'centre' && sel.color === c ? ' sel' : ''}" data-source="centre" data-idx="-1" data-color="${c}" ${!myTurn || v.phase !== 'playing' ? 'disabled' : ''}>${COLOR_EMOJI[c]}</button><span class="az-note">×${centreCounts[c]}</span>`;
  }
  if (!v.centre.length && !v.markerInCentre) ch += `<span class="az-note">Trung tâm trống.</span>`;
  $('#centre').innerHTML = ch;

  /* ----- bàn của mình + bàn đối thủ ----- */
  $('#myboard').innerHTML = meP ? boardHtml(meP, v, true, meP) : '';
  $('#opponents').innerHTML = v.players.filter(p => !meP || p.id !== meP.id)
    .map(p => boardHtml(p, v, false, meP)).join('');

  /* ----- thanh hành động: chọn gạch rồi chọn hàng đích, bấm xác nhận ----- */
  const actionBar = $('#action-bar');
  if (v.phase === 'playing' && myTurn && sel) {
    const taken = (sel.from === 'factory' ? v.factories[sel.source] : v.centre)
      .filter(c => c === sel.color).length;
    const srcName = sel.from === 'factory' ? ('xưởng ' + (sel.source + 1)) : 'trung tâm';
    let targetTxt = 'chưa chọn hàng đích — bấm 1 hàng mẫu hoặc hàng sàn ở bàn của bạn';
    if (targetLine === -1) targetTxt = 'đặt thẳng xuống hàng sàn';
    else if (targetLine !== null) targetTxt = `đặt vào hàng mẫu ${targetLine + 1}`;
    actionBar.style.display = '';
    actionBar.innerHTML = `<span class="hint">Đã chọn: ${taken} gạch ${COLOR_NAME[sel.color]} ${COLOR_EMOJI[sel.color]} ở ${srcName}${sel.from === 'centre' && v.markerInCentre ? ' (+ dấu "1")' : ''} — ${targetTxt}</span>`
      + `<button class="btn pri" id="btn-confirm-take" ${targetLine === null ? 'disabled' : ''}>✅ Lấy gạch</button>`
      + `<button class="btn" id="btn-cancel-take">✕ Hủy chọn</button>`;
    const bc = $('#btn-confirm-take');
    if (bc) bc.onclick = () => {
      if (targetLine === null) return;
      Snd.place();
      ui.actAs(handPid, { type: 'take', from: sel.from, source: sel.source, color: sel.color, line: targetLine });
      sel = null; targetLine = null;
    };
    const bx = $('#btn-cancel-take');
    if (bx) bx.onclick = () => { sel = null; targetLine = null; Snd.hint(); render(cur, cur); };
  } else if (v.phase === 'playing' && myTurn) {
    actionBar.style.display = '';
    actionBar.innerHTML = `<span class="hint">Tới lượt bạn — bấm 1 màu gạch ở xưởng hoặc trung tâm, rồi bấm hàng mẫu (hoặc hàng sàn) để đặt.</span>`;
  } else {
    actionBar.style.display = 'none';
    actionBar.innerHTML = '';
  }

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.place();
    else if (v.round !== prev.round) Snd.eat();
  }
  if (v.phase === 'ended') {
    const key = v.gid + ':' + v.seq;
    if (endShownFor !== key) { endShownFor = key; showEnd(v); }
    if (v.winners && v.winners.includes(v.me)) Snd.winJingle(); else if (prev && prev.phase !== 'ended') Snd.lose();
  }
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const sum = (v.final && v.final.summary) || {};
  const scores = (v.final && v.final.scores ? v.final.scores.slice() : v.players.map(p => ({ id: p.id, name: p.name, score: p.score })))
    .sort((a, b) => b.score - a.score);
  const winnerNames = v.winners.map(id => {
    const p = v.players.find(x => x.id === id);
    return p ? cleanName(p.name) : 'Ai đó';
  }).join(' + ');
  let title, body;
  if (v.winners.length) {
    title = `🏆 ${winnerNames} thắng!`;
    body = `<div class="az-final-scores">${scores.map(s => {
      const st = sum[s.id] || { rows: 0, cols: 0, colours: 0, bonus: 0 };
      return `<div class="row ${v.winners.includes(s.id) ? 'winner' : ''}"><span>${v.winners.includes(s.id) ? '👑 ' : ''}${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}<span class="sub">Hàng đủ ${st.rows} (+${2 * st.rows}) · Cột đủ ${st.cols} (+${7 * st.cols}) · Màu đủ ${st.colours} (+${10 * st.colours})</span></span><b>${s.score} điểm</b></div>`;
    }).join('')}</div>
    <p class="note">${v.endReason === 'resign' ? 'Có người xin thua nên ván dừng lại — tính điểm cuối ván rồi chọn người cao điểm nhất trong số người còn lại.' : 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.'}</p>`;
  } else {
    title = '🤝 Ván kết thúc';
    body = `<div class="az-final-scores">${scores.map(s => `<div class="row"><span>${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}</span><b>${s.score} điểm</b></div>`).join('')}</div>
    <p class="note">Chơi 1 ván +2 xu.</p>`;
  }
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- bấm gạch ở xưởng / trung tâm: chọn màu để lấy ---------- */
$('#market').addEventListener('click', e => {
  const b = e.target.closest('[data-source]');
  if (!b || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  const from = b.dataset.source;
  const source = +b.dataset.idx;
  const color = b.dataset.color;
  if (sel && sel.from === from && sel.source === source && sel.color === color) {
    sel = null; targetLine = null; Snd.hint(); render(cur, cur); return;
  }
  sel = { from, source, color };
  targetLine = null;
  Snd.pick();
  render(cur, cur);
});

/* ---------- bấm hàng mẫu / hàng sàn ở bàn mình: chọn hàng đích ---------- */
$('#myboard').addEventListener('click', e => {
  const el = e.target.closest('[data-line]');
  if (!el || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (!sel) { tip('Chọn 1 màu gạch ở xưởng hoặc trung tâm trước.'); return; }
  const line = +el.dataset.line;
  const meP = myBoard(cur);
  if (!meP) return;
  if (!canPlaceLine(meP, line, sel.color)) {
    Snd.invalid();
    tip(line === -1 ? 'Hàng sàn lúc nào cũng đặt được — thử lại.' : 'Hàng này không nhận màu đó (khác màu, đã đầy, hoặc tường hàng đó đã có màu này).');
    return;
  }
  targetLine = line;
  Snd.pick();
  render(cur, cur);
});

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký ván chơi</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua trận này? Ván dừng lại ngay, tính điểm cuối ván rồi chọn người cao điểm nhất trong số người còn lại.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const human = turnHuman(v);
    const pid = human ? human.id : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'azul', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + (số người − 1) máy */
      for (let i = 0; i < playerCount - 1; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
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
