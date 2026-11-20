// 🐂 Lấy 6 (6 Nimmt!) – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Sushi Go: chủ
// phòng giữ state, khách chỉ gửi action {type, ...}). Mọi người cùng
// chọn 1 lá mỗi lượt nên actors() = những ai chưa chọn (lượt chọn) hoặc
// người đang phải chọn dãy để lấy (lượt lấy dãy); chơi chuyền tay thì
// từng người bấm 👁 xem bài rồi chọn, chọn xong che lại cho người kế tiếp.
import { createGame, applyAction, viewFor, actors, bullheads } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=12';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'lay6', min: 2, max: 10, maxSeats: 10, allowLocal: true,
  minMsg: 'Lấy 6 cần 2–10 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 4; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-lay6-count');
  if (c >= 2 && c <= 10) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-lay6-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-lay6-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-lay6-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/10 người (cần 2–10)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 10
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🐂 Bộ bài</b><div class="role-note">104 lá số 1–104: 55 = 7 đầu bò, lá đôi = 5, tận cùng 0 = 3, tận cùng 5 = 2, còn lại = 1. Mỗi người 10 lá, 4 dãy trên bàn, chơi 10 lượt.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2 || n > 10;
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
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt chọn ai người đó bấm 👁 xem bài. Nhớ che bài trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let handRevealed = false; /* chuyền tay: đã bấm 👁 xem bài của người tới lượt chọn chưa */
let revealedFor = null;
let endShownFor = '';
const cardHtml = (card, opts = {}) => {
  const h = bullheads(card);
  return `<div class="l6-card h${h} ${opts.inRow ? 'in-row' : ''}" data-card="${card}">
    <span class="l6-num">${card}</span>
    <span class="l6-heads">${'🐂'.repeat(Math.min(h, 3))}${h > 1 ? ' ×' + h : ''}</span>
  </div>`;
};

/* tay bài của 1 người: chuyền tay (host) thì lấy từ state gốc — chỉ cho
   người cùng máy, không lộ bài của máy */
function handOf(v, pid) {
  if (mode === 'pvp' && ui.net && ui.net.raw && ui.net.raw.state) {
    const p = ui.net.raw.state.players.find(x => x.id === pid);
    if (p && !p.isBot) return p.hand.slice();
    if (p && p.isBot) return [];
  }
  const p = v.players.find(x => x.id === pid);
  return p ? (p.hand || []).slice() : [];
}
/* người cùng máy tiếp theo chưa chọn lá trong lượt này (chuyền tay);
   ở lượt lấy dãy thì chính là người đang phải lấy dãy (nếu là người) */
function nextPendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  if (v.stage === 'take' && v.pendingTake) {
    const p = v.players.find(x => x.id === v.pendingTake.pid);
    return p && !p.isBot ? p : null;
  }
  return v.players.find(p => !p.isBot && !p.picked) || null;
}
/* có phải lượt TÔI (người đang cầm máy) chọn dãy để lấy không */
function myTurnToTake(v) {
  if (!v || v.stage !== 'take' || !v.pendingTake) return false;
  if (mode === 'pvp') return !!nextPendingHuman(v);
  return v.pendingTake.pid === v.me;
}

function render(v, prev) {
  cur = v;
  if (!v) { handRevealed = false; revealedFor = null; endShownFor = ''; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  /* chuyền tay: đổi người chọn thì che bài lại */
  const pending = mode === 'pvp' ? nextPendingHuman(v) : null;
  if (mode === 'pvp' && revealedFor && (!pending || revealedFor !== pending.id)) { handRevealed = false; revealedFor = null; }

  const takeP = v.stage === 'take' && v.pendingTake ? v.players.find(p => p.id === v.pendingTake.pid) : null;
  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'không có người thắng.'}`
    : takeP
      ? `⚠️ Lá ${v.pendingTake.card} nhỏ hơn mọi dãy — ${cleanName(takeP.name)} phải lấy 1 dãy!`
      : `🐂 Lượt ${v.turn}/10 · ${v.players.filter(p => p.picked).length}/${v.players.length} người đã chọn`;
  $('#status').innerHTML = v.players.map(p => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>🐂 ${p.bullheads}</b> · 🃏 ${p.taken}</span>`;
  }).join('');

  /* ----- 4 dãy trên bàn ----- */
  const canTake = myTurnToTake(v);
  $('#rows').innerHTML = v.rows.map((r, i) => {
    const heads = r.reduce((t, c) => t + bullheads(c), 0);
    return `<div class="l6-row ${canTake ? 'takeable' : ''}" data-row="${i}">
      <span class="l6-row-no">${i + 1}</span>
      <span class="l6-row-cards">${r.map(c => cardHtml(c, { inRow: true })).join('')}</span>
      <span class="l6-row-heads">🐂 ${heads}</span>
    </div>`;
  }).join('');
  $('#take-banner').style.display = canTake ? '' : 'none';
  if (canTake) {
    $('#take-banner').textContent = `⚠️ Lá ${v.pendingTake.card} của bạn nhỏ hơn mọi dãy — bấm 1 dãy trên bàn để lấy dãy đó (nên lấy dãy ít đầu bò nhất)!`;
  }

  $('#players').innerHTML = v.players.map(p => {
    const isTakeTurn = v.stage === 'take' && v.pendingTake && v.pendingTake.pid === p.id;
    return `<div class="l6-player ${p.picked ? 'picked' : ''} ${p.id === v.me ? 'me' : ''} ${isTakeTurn ? 'take-turn' : ''}">
      ${avatar(p.name, 40)}
      <div class="l6-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${p.id === v.winner ? ' 👑' : ''}</b>
        <span class="l6-ptotal">🐂 ${p.bullheads} đầu bò · 🃏 ${p.taken} lá đã lấy</span>
        <span class="l6-pmeta">${p.handCount} lá trên tay · ${p.picked ? '<span class="l6-picked-tag">✅ đã chọn</span>' : '<span class="l6-picked-wait">… đang chọn</span>'}${isTakeTurn ? ' · <span class="l6-picked-wait">⚠️ đang chọn dãy</span>' : ''}</span>
      </div>
    </div>`;
  }).join('');

  /* ----- bài trên tay ----- */
  const handPid = mode === 'pvp' ? (pending ? pending.id : null) : v.me;
  const hand = v.phase === 'playing' && handPid ? handOf(v, handPid) : [];
  const canControl = handPid && ui.controls(handPid);
  const mePicked = (v.players.find(p => p.id === handPid) || {}).picked;
  const cover = mode === 'pvp' && v.phase === 'playing' && pending && !handRevealed;
  $('#hand-cover').style.display = cover ? '' : 'none';
  $('#hand').style.display = cover ? 'none' : '';
  $('#btn-reveal-hand').textContent = pending ? `👁 Xem bài của ${cleanName(pending.name)}` : '👁 Xem bài của bạn';
  $('#picked-note').style.display = (!cover && v.phase === 'playing' && v.stage === 'pick' && mePicked) ? '' : 'none';
  if (!cover) {
    if (!hand.length) {
      $('#hand').innerHTML = v.phase === 'ended' ? '' : (mePicked || v.stage === 'take' ? '' : '<p class="note">Đang chờ chia bài…</p>');
    } else if (mePicked || v.stage === 'take') {
      /* đã chọn lá rồi (hoặc đang chờ lấy dãy): hiện bài nhưng không bấm được */
      $('#hand').innerHTML = `<div class="l6-hand-label">Bài của ${mode === 'pvp' ? cleanName((pending || {}).name) : 'bạn'}:</div>` + hand.map(c => cardHtml(c)).join('');
      $('#hand').querySelectorAll('.l6-card').forEach(el => el.classList.add('cant'));
    } else {
      const handName = mode === 'pvp' ? cleanName((pending || {}).name) : 'bạn';
      $('#hand').innerHTML = `<div class="l6-hand-label">${canControl ? `Bài của ${handName} — bấm 1 lá để chọn:` : 'Bài trên tay:'}</div>` + hand.map(c => cardHtml(c)).join('');
      $('#hand').querySelectorAll('.l6-card').forEach(el => {
        el.classList.toggle('cant', !canControl);
      });
    }
  }
  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.hint();
    else if (v.stage === 'take' && prev.stage !== 'take') Snd.wrong();
    else if (v.seq !== prev.seq) Snd.place();
  }
  if (v.phase === 'ended') {
    const key = v.gid + ':' + v.seq;
    if (endShownFor !== key) { endShownFor = key; showEnd(v); }
    if (v.winner === v.me) Snd.winJingle(); else if (prev && prev.phase !== 'ended') Snd.lose();
  }
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const winner = v.players.find(p => p.id === v.winner);
  const title = v.winner === v.me ? '👑 Bạn thắng trận!' : winner ? `🏁 ${esc(cleanName(winner.name))} thắng trận!` : '😢 Không ai thắng';
  const rows = [...v.players].sort((a, b) => a.bullheads - b.bullheads || a.taken - b.taken).map(p =>
    `<tr><td>${esc(cleanName(p.name))}${p.id === v.winner ? ' 👑' : ''}${p.id === v.me ? ' (bạn)' : ''}</td><td>🐂 ${p.bullheads}</td><td>🃏 ${p.taken} lá</td></tr>`).join('');
  const body = `<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Người chơi</th><th>Đầu bò</th><th>Đã lấy</th></tr>${rows}</table><p class="note">${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- chọn lá: bấm 1 lá là chọn luôn ---------- */
$('#hand').addEventListener('click', e => {
  const el = e.target.closest('.l6-card'); if (!el || !cur || cur.phase !== 'playing') return;
  if (cur.stage !== 'pick') { tip('Đang chờ chọn dãy — bấm 1 dãy trên bàn.'); return; }
  const handPid = mode === 'pvp' ? (nextPendingHuman(cur) || {}).id : cur.me;
  if (!handPid || !ui.controls(handPid)) { tip('Chưa tới lượt bạn chọn.'); return; }
  const card = el.dataset.card;
  Snd.pick();
  ui.actAs(handPid, { type: 'pick', card });
  handRevealed = false; revealedFor = null;
});
/* ---------- chọn dãy để lấy: bấm 1 dãy trên bàn ---------- */
$('#rows').addEventListener('click', e => {
  const rowEl = e.target.closest('.l6-row'); if (!rowEl || !cur || cur.phase !== 'playing') return;
  if (cur.stage !== 'take' || !cur.pendingTake) return;
  const pid = mode === 'pvp' ? (nextPendingHuman(cur) || {}).id : cur.me;
  if (!pid || cur.pendingTake.pid !== pid) { tip('Chưa tới lượt bạn chọn dãy.'); return; }
  if (!ui.controls(pid)) { tip('Chưa tới lượt bạn chọn dãy.'); return; }
  const row = +rowEl.dataset.row;
  ui.actAs(pid, { type: 'take', row });
  Snd.place();
  handRevealed = false; revealedFor = null;
});
$('#btn-reveal-hand').onclick = () => {
  const pending = nextPendingHuman(cur);
  handRevealed = true; revealedFor = pending ? pending.id : (cur ? cur.me : null);
  Snd.pick(); render(cur, cur);
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
  const r = await confirmBox('Nhận thua trận này? Bạn bị loại khỏi trận luôn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = mode === 'pvp' ? ((nextPendingHuman(v) || {}).id || v.me) : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'lay6', net: NET,
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
