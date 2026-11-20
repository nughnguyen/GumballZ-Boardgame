// 🀄 Mạt Chược – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Sudoku/2048: chủ phòng giữ state,
// khách chỉ gửi action {type, a?, b?}). Mỗi người có bàn riêng (cùng 1 thế
// bài từ cùng 1 hạt giống), chỉ thấy tiến độ (số quân đã gỡ) của người khác
// — không ai thấy bàn của người khác. Thắng/thua/xu ghi qua watch() của
// simplenet — main.js KHÔNG gọi record() trực tiếp.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, isFree, matchKey, faceName, TOTAL_TILES, MAX_HINTS, MAX_SHUFFLES, MAX_UNDOS } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, $$, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=12';
import { confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'matchu', min: 1, max: 4, maxSeats: 4, allowLocal: false,
  create: (players, opts) => createGame(players, opts),
  apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy gỡ 1 cặp mỗi lượt; Máy Dễ gỡ chậm, Máy Khó nhanh */
  botDelay: (s, pid) => {
    const p = s.players.find(x => x.id === pid);
    const hard = p && p.level === 'hard';
    return hard ? 1400 + Math.random() * 600 : 2500 + Math.random() * 800;
  },
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Sữa', 'Bánh', 'Miu', 'Cún', 'Gấu'],
});

/* ---------- chế độ chơi ---------- */
let mode = 'solo';
try { mode = localStorage.getItem('gumballz-matchu-mode') || 'solo'; } catch (e) {}
if (!['solo', 'ai-easy', 'ai-hard', 'online'].includes(mode)) mode = 'solo';
function setMode(m) {
  mode = m;
  try { localStorage.setItem('gumballz-matchu-mode', m); } catch (e) {}
  $$('#screen-home .seg [data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'solo' ? '🀄 Bắt đầu gỡ một mình' : m === 'ai-easy' ? '🤖 Đua với máy Dễ' : '🧠 Đua với máy Khó';
}
$('#screen-home').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]'); if (!b) return;
  setMode(b.dataset.mode);
});
setMode(mode);

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/4 người (chơi đơn 1 · đua 2–4)`;
  $('#plist').innerHTML = info.players.map(p => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost || mode === 'solo' || mode.startsWith('ai-') ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot-easy">🤖 Thêm máy Dễ</button><button class="btn" id="btn-addbot-hard">🧠 Thêm máy Khó</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🐢 Bàn Rùa</b><p>144 quân xếp chồng 5 tầng — gỡ 2 quân trống cùng mặt, Hoa ghép Hoa, Mùa ghép Mùa. Gợi ý 5 lần, xào bài 3 lần, hoàn tác 5 lần (chơi đơn) mỗi ván.</p></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = mode === 'online' ? n < 2 : n < 1;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = mode === 'online' && n < 2 ? 'Cần ít nhất 2 người mới đua được (đang có 1).' : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot-easy') h.addBot({ level: 'easy' });
  else if (b.id === 'btn-addbot-hard') h.addBot({ level: 'hard' });
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái ván ---------- */
let cur = null, sel = null, endShown = '';
let timerInt = null;
const fmt = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const elapsedMs = v => {
  if (!v) return 0;
  const end = v.phase === 'ended' && v.endedAt ? v.endedAt : Date.now();
  return Math.max(0, end - v.startedAt);
};
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
function startTimer() {
  stopTimer();
  timerInt = setInterval(() => {
    const el = $('#timer-text'); if (!el || !cur) return;
    el.textContent = fmt(elapsedMs(cur));
  }, 1000);
}
function resetGameState() {
  cur = null; sel = null; endShown = '';
  stopTimer();
}
const BEST_KEY = 'gumballz-matchu-best';
function loadBest() { try { return +(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { return 0; } }
function saveBest(ms) {
  if (!ms) return;
  try {
    const old = loadBest();
    if (!old || ms < old) localStorage.setItem(BEST_KEY, String(ms));
  } catch (e) {}
}

/* ---------- vẽ quân ---------- */
const TW = 44, TH = 58, HX = 22, HY = 29, LZ = 6; // rộng, cao, nửa bước x/y, lệch tầng
function faceHtml(face) {
  const n = +(face[1] || 0);
  if (face[0] === 'c') {
    /* Vòng: chấm tròn đỏ/xanh xếp theo số */
    const dots = {
      1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]],
      4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
      6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
      7: [[0, 0], [2, 0], [1, 1], [0, 1], [2, 1], [0, 2], [2, 2]],
      8: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
      9: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    }[n] || [];
    const cell = (r, c) => dots.some(([a, b]) => a === r && b === c) ? '●' : '';
    const col = n === 5 ? 'var(--mc-red)' : (n % 2 ? 'var(--mc-red)' : 'var(--mc-green)');
    return `<span class="f-dots" style="color:${col}"><span>${cell(0, 0)}${cell(0, 1)}${cell(0, 2)}</span><span>${cell(1, 0)}${cell(1, 1)}${cell(1, 2)}</span><span>${cell(2, 0)}${cell(2, 1)}${cell(2, 2)}</span></span>`;
  }
  if (face[0] === 'b') {
    if (n === 1) return `<span class="f-bird">🐦</span>`;
    const sticks = {
      2: ['▎', '▎'], 3: ['▎▎', '▎'], 4: ['▎▎', '▎▎'], 5: ['▎▎', '▎', '▎▎'],
      6: ['▎▎', '▎▎', '▎▎'], 7: ['▎▎', '▎', '▎▎', '▎▎'], 8: ['▎▎▎', '▎▎▎', '▎▎'],
      9: ['▎▎▎', '▎▎▎', '▎▎▎'],
    }[n] || [];
    return `<span class="f-sticks">${sticks.map(s => `<span>${s}</span>`).join('')}</span>`;
  }
  if (face[0] === 'w') return `<span class="f-wan"><b>${n}</b><i>萬</i></span>`;
  if (face === 'E') return `<span class="f-wind">東</span>`;
  if (face === 'S') return `<span class="f-wind">南</span>`;
  if (face === 'W') return `<span class="f-wind">西</span>`;
  if (face === 'N') return `<span class="f-wind">北</span>`;
  if (face === 'DR') return `<span class="f-dragon" style="color:var(--mc-red)">中</span>`;
  if (face === 'DG') return `<span class="f-dragon" style="color:var(--mc-green)">發</span>`;
  if (face === 'DW') return `<span class="f-dragon f-white"></span>`;
  if (face[0] === 'F') return `<span class="f-bonus"><b>${{ F1: '梅', F2: '蘭', F3: '菊', F4: '竹' }[face]}</b><i>花</i></span>`;
  if (face[0] === 'S') return `<span class="f-bonus"><b>${{ S1: '春', S2: '夏', S3: '秋', S4: '冬' }[face]}</b><i>季</i></span>`;
  return `<span>${esc(face)}</span>`;
}
function tileHtml(v, t) {
  const free = isFree(v.you.tiles, t);
  const cls = ['mc-tile', free ? 'free' : 'blocked'];
  if (sel === t.id) cls.push('sel');
  if (v.you.hintPair && v.you.hintPair.includes(t.id)) cls.push('hint');
  const left = (t.x + 2) * HX - t.z * LZ;
  const top = t.y * HY - t.z * LZ;
  return `<button type="button" class="${cls.join(' ')}" data-tile="${t.id}" style="left:${left}px;top:${top}px;z-index:${t.z * 10 + 1}" aria-label="Quân ${esc(faceName(t.face))}${free ? ', trống' : ', chưa trống'}">${faceHtml(t.face)}</button>`;
}
function drawBoard(v) {
  const g = $('#board');
  const alive = v.you.tiles.filter(t => !t.removed);
  alive.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  g.innerHTML = alive.map(t => tileHtml(v, t)).join('');
}
function drawStatus(v) {
  const isRace = v.players.length > 1;
  const best = loadBest();
  $('#status').innerHTML = `<span class="stat">⏱️ <span id="timer-text">${fmt(elapsedMs(v))}</span></span><span class="stat">🀄 Đã gỡ: <b>${v.you.removed}/${TOTAL_TILES}</b></span><span class="stat">💡 Gợi ý: ${v.you.hintsLeft}/${MAX_HINTS}</span><span class="stat">🔀 Xào: ${v.you.shufflesLeft}/${MAX_SHUFFLES}</span>${mode === 'solo' && best ? `<span class="stat">🏆 Kỷ lục: <b>${fmt(best)}</b></span>` : ''}${v.you.failed ? '<span class="stat">😢 Bạn đã kẹt</span>' : ''}`;
  $('#btn-hint').textContent = `💡 Gợi ý (${v.you.hintsLeft})`;
  $('#btn-hint').disabled = v.phase === 'ended' || v.you.failed || v.you.hintsLeft <= 0;
  $('#btn-shuffle').textContent = `🔀 Xào bài (${v.you.shufflesLeft})`;
  $('#btn-shuffle').disabled = v.phase === 'ended' || v.you.failed || v.you.shufflesLeft <= 0;
  $('#btn-undo').style.display = mode === 'solo' ? '' : 'none';
  $('#btn-undo').textContent = `↩️ Hoàn tác (${v.you.undosLeft})`;
  $('#btn-undo').disabled = v.phase === 'ended' || v.you.failed || v.you.undosLeft <= 0;
  $('#btn-resign').disabled = v.phase === 'ended' || v.you.failed;
  const race = $('#race');
  if (isRace) {
    race.style.display = '';
    race.innerHTML = v.players.map(p => {
      const pct = Math.round((p.removed / TOTAL_TILES) * 100);
      return `<div class="race-row ${p.id === v.me ? 'me' : ''} ${p.failed ? 'out' : ''}">${avatar(p.name, 30)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}</span><span class="bar"><i style="width:${pct}%"></i></span><span class="cnt">${p.removed}/${TOTAL_TILES}</span><span class="mist">${p.failed ? '😢 kẹt' : `${p.moves} nước`}</span></div>`;
    }).join('');
  } else race.style.display = 'none';
  $('#round').textContent = isRace
    ? `🏁 Đua ${v.players.length} người · cùng 1 thế bài Rùa 144 quân — ai gỡ hết trước thì thắng!`
    : `🀄 Chơi đơn · bàn Rùa 144 quân · gỡ 2 quân trống cùng mặt, Hoa ghép Hoa, Mùa ghép Mùa`;
  const log = $('#log');
  log.innerHTML = v.log.map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

/* ---------- vẽ toàn ván ---------- */
function render(v, prev) {
  if (!v) { resetGameState(); return; }
  const newGame = !cur || cur.gid !== v.gid;
  if (newGame) { resetGameState(); cur = v; startTimer(); }
  else cur = v;
  if (v.phase === 'ended') {
    stopTimer();
    if (mode === 'solo' && v.winner === v.me) saveBest(elapsedMs(v));
  }
  drawBoard(v);
  drawStatus(v);
  if (v.phase === 'ended' && endShown !== v.gid) { endShown = v.gid; showEnd(v); }
}

/* ---------- modal kết thúc ---------- */
function showEnd(v) {
  const me = v.players.find(p => p.id === v.me) || {};
  const won = v.winner === v.me;
  const winner = v.players.find(p => p.id === v.winner);
  const time = fmt(elapsedMs(v));
  let title, body;
  if (won) {
    Snd.winJingle();
    title = '🎉 Gỡ hết bàn!';
    body = `<p>Bạn gỡ hết <b>144 quân</b> trong <b>${time}</b> — dùng <b>${v.you.hintsUsed}</b> gợi ý, <b>${v.you.shufflesUsed}</b> lần xào bài.</p><p class="note">Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.</p>`;
  } else if (v.endReason === 'resign' && v.you.failed) {
    Snd.lose();
    title = '🏳️ Bạn đã xin thua';
    body = `<p>Bạn đã xin thua ván này — đã gỡ được <b>${me.removed || 0}/144</b> quân trong <b>${time}</b>.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
  } else if (v.you.failed) {
    Snd.lose();
    title = '😢 Kẹt rồi!';
    body = `<p>Bạn hết cặp gỡ được mà cũng hết lượt xào bài — đã gỡ được <b>${me.removed || 0}/144</b> quân trong <b>${time}</b>.</p><p class="note">Chơi 1 ván +2 xu — ván sau ưu tiên gỡ quân tầng trên trước nhé!</p>`;
  } else if (v.endReason === 'allstuck' && winner) {
    title = `🏁 ${esc(cleanName(winner.name))} gỡ nhiều nhất!`;
    body = `<p>Mọi người đều kẹt — ${esc(cleanName(winner.name))} gỡ được <b>${winner.removed}/144</b> quân nên thắng. Bạn gỡ được <b>${me.removed || 0}/144</b> quân.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
  } else if (winner) {
    title = `🏁 ${esc(cleanName(winner.name))} gỡ hết trước!`;
    body = `<p>${esc(cleanName(winner.name))} gỡ hết 144 quân trước trong <b>${time}</b> — bạn gỡ được <b>${me.removed || 0}/144</b> quân.</p><p class="note">Chơi 1 ván +2 xu — ván sau cố gắng nhanh tay hơn nhé!</p>`;
  } else {
    Snd.lose();
    title = '😢 Không ai thắng';
    body = `<p>Mọi người đều xin thua — không ai gỡ hết bàn này.</p><p class="note">Chơi 1 ván +2 xu.</p>`;
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

/* ---------- tương tác ---------- */
$('#board').addEventListener('click', e => {
  const b = e.target.closest('[data-tile]'); if (!b || !cur) return;
  if (cur.phase === 'ended' || cur.you.failed) { tip('Ván đã kết thúc.'); return; }
  const id = +b.dataset.tile;
  const t = cur.you.tiles.find(x => x.id === id);
  if (!t || t.removed) return;
  if (!isFree(cur.you.tiles, t)) { tip(`Quân ${faceName(t.face)} chưa trống — đang bị đè hoặc bị chặn cả 2 bên.`); Snd.invalid(); return; }
  if (sel === id) { sel = null; Snd.pick(); drawBoard(cur); return; }
  if (sel == null) { sel = id; Snd.pick(); drawBoard(cur); return; }
  const prev = cur.you.tiles.find(x => x.id === sel);
  if (!prev) { sel = id; drawBoard(cur); return; }
  if (matchKey(prev.face) === matchKey(t.face)) {
    ui.act({ type: 'remove', a: sel, b: id });
    sel = null;
    Snd.place();
  } else {
    tip(`Quân ${faceName(prev.face)} khác mặt với quân ${faceName(t.face)} — chọn lại quân khác.`);
    Snd.invalid();
    sel = id;
    drawBoard(cur);
  }
});
$('#btn-hint').onclick = () => {
  if (!cur || cur.phase === 'ended' || cur.you.failed) return;
  if (cur.you.hintsLeft <= 0) { tip('Hết lượt gợi ý rồi.'); Snd.invalid(); return; }
  ui.act({ type: 'hint' });
  Snd.hint();
};
$('#btn-shuffle').onclick = async () => {
  if (!cur || cur.phase === 'ended' || cur.you.failed) return;
  if (cur.you.shufflesLeft <= 0) { tip('Hết lượt xào bài rồi.'); Snd.invalid(); return; }
  const r = await confirmBox('Xào lại mặt của các quân còn trên bàn? Bộ quân giữ nguyên, chỉ đổi vị trí các mặt.', { title: '🔀 Xào bài', ok: 'Xào bài', cancel: 'Để sau' });
  if (!r) return;
  ui.act({ type: 'shuffle' });
  Snd.shuffle();
};
$('#btn-undo').onclick = () => {
  if (!cur || cur.phase === 'ended' || cur.you.failed) return;
  ui.act({ type: 'undo' });
  Snd.pick();
};
$('#btn-resign').onclick = async () => {
  if (!cur || cur.phase === 'ended' || cur.you.failed) return;
  const r = await confirmBox('Nhận thua ván này? Bạn bị loại khỏi cuộc đua (chơi đơn thì ván kết thúc luôn).', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  ui.act({ type: 'resign' });
};
$('#btn-new').onclick = () => {
  if (!cur) return;
  if (!ui.isHost) { tip('Chỉ chủ phòng mở ván mới được.'); return; }
  ui.net.raw.start();
};
document.addEventListener('keydown', e => {
  if (!cur || !$('#screen-game').classList.contains('active') || cur.phase !== 'playing' || cur.you.failed) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key;
  if (k === 'h' || k === 'H') { $('#btn-hint').click(); return; }
  if (k === 'u' || k === 'U') { $('#btn-undo').click(); return; }
  if (k === 'Escape') { sel = null; drawBoard(cur); }
});

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký trận đấu</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'matchu', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đua với máy: bạn + 1 máy, cùng 1 thế bài */
      h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* chơi đơn: chỉ mình bạn; online: chủ phòng thêm máy trong phòng chờ */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => { render(v, prev); },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost && cur ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) ui.leave();
};
