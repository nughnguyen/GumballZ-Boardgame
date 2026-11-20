// 🍣 Sushi Go – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Love Letter: chủ phòng giữ state,
// khách chỉ gửi action {type, ...}). Mọi người cùng chọn 1 lá mỗi lượt
// nên actors() = những ai chưa chọn; chơi chuyền tay thì từng người bấm
// 👁 xem bài rồi chọn, chọn xong che lại cho người kế tiếp.
import { createGame, applyAction, viewFor, actors, CARD_INFO, MAKI_ICONS, HAND_SIZE } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'sushigo', min: 2, max: 5, maxSeats: 5, allowLocal: true,
  minMsg: 'Sushi Go cần 2–5 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 3; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-sushigo-count');
  if ([2, 3, 4, 5].includes(c)) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-sushigo-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-sushigo-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-sushigo-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/5 người (cần 2–5)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 5
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🍣 Bộ bài</b><div class="role-note">108 lá: Tempura ×14, Sashimi ×14, Há cảo ×14, Maki ×1 ×6, Maki ×2 ×12, Maki ×3 ×8, Nigiri Cá hồi ×10, Mực ×5, Trứng ×5, Pudding ×10, Wasabi ×6, Đũa ×4. Mỗi vòng chia 10/9/8/7 lá (2/3/4/5 người).</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2 || n > 5;
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
let selCard = null;      /* lá đầu tiên đã chọn khi dùng Đũa */
let chopMode = false;    /* đang bật chế độ dùng Đũa (chọn 2 lá) */
let handRevealed = false; /* chuyền tay: đã bấm 👁 xem bài của người tới lượt chọn chưa */
let revealedFor = null;
let endShownFor = '';
const kindOf = id => id.slice(0, id.lastIndexOf('-'));
const cardHtml = (entry, opts = {}) => {
  const id = typeof entry === 'string' ? entry : entry.id;
  const k = kindOf(id), info = CARD_INFO[k];
  const wasabi = typeof entry === 'object' && entry.wasabi;
  return `<div class="sg-card k-${k} ${opts.mini ? 'mini' : ''} ${opts.sel ? 'sel' : ''} ${wasabi ? 'on-wasabi' : ''}" data-card="${id}">
    <span class="sg-ic">${info.icon}</span>
    <b class="sg-name">${info.name}</b>${opts.mini ? '' : `<span class="sg-desc">${info.desc}</span>`}${wasabi ? '<span class="sg-wasabi">×3 Wasabi!</span>' : ''}
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
/* người cùng máy tiếp theo chưa chọn lá trong lượt này (chuyền tay) */
function nextPendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  return v.players.find(p => !p.isBot && !p.picked) || null;
}

function render(v, prev) {
  cur = v;
  if (!v) { selCard = null; chopMode = false; handRevealed = false; revealedFor = null; endShownFor = ''; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  selCard = null; chopMode = false;
  /* chuyền tay: đổi người chọn thì che bài lại */
  const pending = mode === 'pvp' ? nextPendingHuman(v) : null;
  if (mode === 'pvp' && revealedFor && (!pending || revealedFor !== pending.id)) { handRevealed = false; revealedFor = null; }

  const dirTxt = v.direction === 1 ? 'chuyền sang trái' : 'chuyền sang phải';
  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'không có người thắng.'}`
    : `🍣 Vòng ${v.round}/3 · lượt ${v.turnNum}/${v.handSize} · ${dirTxt} · ${v.players.filter(p => p.picked).length}/${v.players.length} người đã chọn`;
  $('#status').innerHTML = v.players.map(p => {
    return `<span class="stat">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>${p.total} điểm</b> · 🍮 ${p.puddings}</span>`;
  }).join('');
  /* bảng điểm các vòng */
  const hasScores = v.players.some(p => p.roundScores.length);
  $('#scores').style.display = hasScores ? '' : 'none';
  if (hasScores) {
    const rounds = Math.max(...v.players.map(p => p.roundScores.length));
    $('#scores').innerHTML = `<table><tr><th>Người chơi</th>${[1, 2, 3].slice(0, rounds).map(r => `<th>Vòng ${r}</th>`).join('')}<th>🍮 Pudding</th><th>Tổng</th></tr>${v.players.map(p => `<tr><td>${esc(cleanName(p.name))}${p.id === v.winner ? ' 👑' : ''}</td>${p.roundScores.map(s => `<td>+${s}</td>`).join('')}${'<td>–</td>'.repeat(Math.max(0, rounds - p.roundScores.length))}<td>${p.puddings}</td><td class="tot">${p.total}</td></tr>`).join('')}</table>`;
  }
  $('#players').innerHTML = v.players.map(p => {
    const maki = p.played.reduce((t, e) => t + (MAKI_ICONS[e.kind] || 0), 0);
    return `<div class="sg-player ${p.picked ? 'picked' : ''} ${p.id === v.me ? 'me' : ''}">
      ${avatar(p.name, 40)}
      <div class="sg-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${p.id === v.winner ? ' 👑' : ''}</b>
        <span class="sg-ptotal">${p.total} điểm${p.roundScores.length ? ` · vòng ${p.roundScores.map(s => '+' + s).join(' ')}` : ''}</span>
        <span class="sg-pmeta">🍣 Maki ${maki} · 🍮 Pudding ${p.puddings} · ${p.handCount} lá trên tay · ${p.picked ? '<span class="sg-picked-tag">✅ đã chọn</span>' : '<span class="sg-picked-wait">… đang chọn</span>'}${p.wasabiOpen ? ` · 🌶️ ${p.wasabiOpen} Wasabi mở` : ''}</span>
        ${p.played.length ? `<span class="sg-played">${p.played.map(e => cardHtml(e, { mini: true })).join('')}</span>` : '<span class="sg-played"><span class="empty">Chưa đặt lá nào vòng này</span></span>'}
      </div>
    </div>`;
  }).join('');

  /* ----- bài trên tay ----- */
  const handPid = mode === 'pvp' ? (pending ? pending.id : null) : v.me;
  const hand = v.phase === 'playing' && handPid ? handOf(v, handPid) : [];
  const canControl = handPid && ui.controls(handPid);
  const mePicked = (v.players.find(p => p.id === (mode === 'pvp' ? (pending ? pending.id : null) : v.me)) || {}).picked;
  const cover = mode === 'pvp' && v.phase === 'playing' && pending && !handRevealed;
  $('#hand-cover').style.display = cover ? '' : 'none';
  $('#hand').style.display = cover ? 'none' : '';
  $('#btn-reveal-hand').textContent = pending ? `👁 Xem bài của ${cleanName(pending.name)}` : '👁 Xem bài của bạn';
  $('#picked-note').style.display = (!cover && v.phase === 'playing' && mePicked) ? '' : 'none';
  const handP = handPid ? v.players.find(p => p.id === handPid) : null;
  const showChop = !cover && v.phase === 'playing' && handP && handP.chopsticks && !mePicked;
  $('#chop-row').style.display = showChop ? '' : 'none';
  $('#btn-chop').classList.toggle('on', chopMode);
  if (!cover) {
    if (!hand.length) {
      $('#hand').innerHTML = v.phase === 'ended' ? '' : (mePicked ? '' : '<p class="note">Đang chờ chia bài…</p>');
    } else if (mePicked) {
      $('#hand').innerHTML = '';
    } else {
      const handName = mode === 'pvp' ? cleanName((pending || {}).name) : 'bạn';
      $('#hand').innerHTML = `<div class="sg-hand-label">${canControl ? `Bài của ${handName} — bấm 1 lá để đặt xuống${handP && handP.chopsticks ? ' (hoặc bật Đũa để đặt 2 lá)' : ''}:` : 'Bài trên tay:'}</div>` + hand.map(c => cardHtml(c)).join('');
      $('#hand').querySelectorAll('.sg-card').forEach(el => {
        el.classList.toggle('cant', !canControl);
      });
    }
  }
  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.round !== prev.round) Snd.hint();
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
  const rows = [...v.players].sort((a, b) => b.total - a.total).map(p =>
    `<tr><td>${esc(cleanName(p.name))}${p.id === v.winner ? ' 👑' : ''}${p.id === v.me ? ' (bạn)' : ''}</td><td>${p.roundScores.map(s => '+' + s).join(' ')}</td><td>🍮 ${p.puddings}</td><td><b>${p.total}</b></td></tr>`).join('');
  const body = `<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Người chơi</th><th>Các vòng</th><th>Pudding</th><th>Tổng</th></tr>${rows}</table><p class="note">${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- chọn bài: bấm 1 lá đặt luôn; bật Đũa thì bấm 2 lá ---------- */
function playCards(cards) {
  const handPid = mode === 'pvp' ? (nextPendingHuman(cur) || {}).id : cur.me;
  if (!handPid) return;
  const act = { type: 'play', card: cards[0] };
  if (cards[1]) act.card2 = cards[1];
  ui.actAs(handPid, act);
  Snd.place();
  handRevealed = false; revealedFor = null;
  selCard = null; chopMode = false;
}
$('#hand').addEventListener('click', e => {
  const el = e.target.closest('.sg-card'); if (!el || !cur || cur.phase !== 'playing') return;
  const handPid = mode === 'pvp' ? (nextPendingHuman(cur) || {}).id : cur.me;
  if (!handPid || !ui.controls(handPid)) { tip('Chưa tới lượt bạn chọn.'); return; }
  const card = el.dataset.card;
  Snd.pick();
  if (chopMode) {
    if (selCard === card) { selCard = null; el.classList.remove('sel'); return; }
    if (!selCard) { selCard = card; el.classList.add('sel'); tip('Đã chọn 1 lá — bấm thêm 1 lá nữa để đặt cả 2 (dùng Đũa).'); return; }
    playCards([selCard, card]);
  } else {
    playCards([card]);
  }
});
$('#btn-chop').onclick = () => {
  chopMode = !chopMode; selCard = null;
  $('#btn-chop').classList.toggle('on', chopMode);
  document.querySelectorAll('#hand .sg-card.sel').forEach(x => x.classList.remove('sel'));
  tip(chopMode ? 'Chế độ Đũa: bấm 2 lá để đặt cùng lúc.' : 'Đã tắt chế độ Đũa.');
  Snd.pick();
};
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
  game: 'sushigo', net: NET,
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
