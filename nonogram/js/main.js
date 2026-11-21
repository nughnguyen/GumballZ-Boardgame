// 🧩 Nonogram – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Rắn Săn Mồi:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Đua có giới hạn 180 giây — CHỦ PHÒNG chạy đồng hồ 1 giây, hết giờ
// thì gửi {type:'timeout'} để engine so % hoàn thành.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, CELL, LIVES, HINTS, RACE_TIME_MS } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=51';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=13';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'nonogram', min: 1, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Nonogram đua cần 2–4 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { size: 10 },
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'ngMode' && (v === 'solo' || v === 'race')) || (k === 'size' && [5, 10, 15].includes(v)),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đi sau 800–1200ms (Dễ) / 250–450ms (Khó) mỗi nước — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | race | pvp | online */
let botLevel = 'hard';
let soloSize = 10, raceSize = 10, localSize = 10;
let p2name = 'Bạn 2';
try {
  const l = localStorage.getItem('gumballz-nonogram-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const n = localStorage.getItem('gumballz-nonogram-p2');
  if (n) p2name = n;
} catch (e) {}
function toggleBox(id) {
  for (const b of ['solo-row', 'bot-row', 'room-box', 'local-row']) {
    const el = document.getElementById(b);
    if (el) el.style.display = b === id ? (el.style.display === 'none' ? '' : 'none') : 'none';
  }
}
$('#btn-solo').onclick = () => toggleBox('solo-row');
$('#btn-start-solo').onclick = () => {
  botLevel = 'hard';
  soloSize = +($('#sel-solo-size').value || 10);
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
/* Nút Tạo phòng/Vào phòng nằm TRONG #room-box nên Online mở đúng 'room-box'
   (bài học Bắn Bóng: tên div trong handler phải khớp div chứa #btn-create). */
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-nonogram-level', botLevel); } catch (e) {}
  raceSize = +($('#sel-size').value || 10);
  mode = 'race'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-nonogram-p2', p2name); } catch (e) {}
  localSize = +($('#sel-local-size').value || 10);
  mode = 'pvp'; ui.startHost(true);
};

/* ---------- phòng chờ ---------- */
function needCount() {
  if (mode === 'solo') return 1;
  return 2; /* race / pvp / online đều cần ít nhất 2 */
}
function renderLobby(info, u) {
  const n = info.players.length;
  const need = needCount();
  const size = info.opts && info.opts.size ? info.opts.size : 10;
  $('#lobby-list').innerHTML = `<p><b>${n}/4 người</b> (cần ${need}–4) · Bảng ${size}×${size}</p>` + info.players.map(p => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
  }).join('') + (u.isHost && mode === 'online' && n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>` : '')
    + (u.isHost && !info.started && mode === 'online'
    ? `<div class="row"><label>Kích thước bảng:
      <select id="sel-lobby-size">
        <option value="5"${size === 5 ? ' selected' : ''}>Dễ — 5×5</option>
        <option value="10"${size === 10 ? ' selected' : ''}>Vừa — 10×10</option>
        <option value="15"${size === 15 ? ' selected' : ''}>Khó — 15×15</option>
      </select></label></div>` : '');
  $('#btn-start-online').style.display = u.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < need;
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') {
    const hard = await confirmBox('Máy Khó suy luận như người chơi giỏi (250–450ms/nước); máy Dễ tô ngẫu nhiên, hay tô sai (800–1200ms/nước).', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung màn hình).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#screen-lobby').addEventListener('change', e => {
  if (e.target && e.target.id === 'sel-lobby-size' && ui.net && ui.net.raw) {
    ui.net.raw.setOpt('size', +e.target.value);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpP2 = null; /* id người chơi 2 ở chế độ chung máy */
let lastMistakes = 0;
let tool = 'fill'; /* 'fill' tô đen | 'mark' đánh dấu X */
let lastSec = -1;

function controlPid(v, pid) {
  if (!v || v.phase !== 'playing' || !pid) return null;
  const p = v.players.find(x => x.id === pid);
  return p && p.status === 'playing' && ui.controls(pid) ? pid : null;
}
function send(pid, a) {
  if (!ui.net || !cur) return;
  ui.actAs(pid, a);
}

const ui = gameKit({
  game: 'nonogram', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('ngMode', 'solo');
      h.setOpt('size', soloSize);
    } else if (mode === 'race') {
      h.setOpt('ngMode', 'race');
      h.setOpt('size', raceSize);
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('ngMode', 'race');
      h.setOpt('size', localSize);
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định race, size 10; chủ phòng đổi trong sảnh chờ */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; pvpP2 = null; lastMistakes = 0; lastSec = -1; render(null, null); return; }
    if (mode === 'pvp') {
      const raw = ui.net && ui.net.raw && ui.net.raw.state;
      if (raw) {
        const ids = raw.players.map(p => p.id);
        if (ids.length >= 2 && !pvpP2) pvpP2 = raw.players.find(p => p.local)?.id || ids[1];
      }
    }
    render(v, prev);
    if (v.phase === 'ended') {
      const k = v.gid + '|' + v.seq;
      if (endShownFor !== k) { endShownFor = k; showEnd(v); }
    }
  },
});

/* 🏠 nút home phải về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { stopTimer(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};

/* ---------- đồng hồ (chỉ chủ phòng gửi timeout khi hết 180s đua) ---------- */
let tickTimer = null;
function startTimer() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    if (!cur || cur.phase !== 'playing') return;
    if (ui.isHost && cur.race) {
      const elapsed = Date.now() - cur.startedAt;
      if (elapsed >= RACE_TIME_MS) {
        ui.actAs(cur.me, { type: 'timeout' });
        return;
      }
    }
    render(cur, cur); /* cập nhật đồng hồ mỗi giây */
  }, 1000);
}
function stopTimer() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

/* ---------- vẽ bảng ---------- */
function boardHTML(view, label, mainBoard) {
  const my = view.my;
  const n = my.size;
  let colClues = '<div class="ng-colclues">';
  for (let x = 0; x < n; x++) {
    colClues += `<div class="ng-cc">${my.colClues[x].map(v => `<span>${v}</span>`).join('')}</div>`;
  }
  colClues += '</div>';
  let rowClues = '<div class="ng-rowclues">';
  for (let y = 0; y < n; y++) {
    rowClues += `<div class="ng-rc">${my.rowClues[y].map(v => `<span>${v}</span>`).join('<span>&nbsp;</span>')}</div>`;
  }
  rowClues += '</div>';
  let cells = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = my.grid[y][x];
      cells += `<div class="cell${v === CELL.FILLED ? ' filled' : v === CELL.MARKED ? ' marked' : v === CELL.LOCKED ? ' locked' : ''}" data-x="${x}" data-y="${y}"></div>`;
    }
  }
  const me = view.players.find(p => p.id === view.me);
  return `<div class="ng-board-wrap" data-pid="${view.me}">
    <div class="ng-board-head"><b>${esc(label)}</b><span>🧩 <b>${me ? me.filled : 0}/${my.totalBlack}</b> · ❤️ ${my.livesLeft}</span></div>
    <div class="ng-board ng-n${n}">
      <div class="ng-corner"></div>
      ${colClues}${rowClues}
      <div class="ng-grid"${mainBoard ? ' id="ng-board"' : ''}>${cells}</div>
    </div>
  </div>`;
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

let lastRenderKey = '';
function render(v, prev) {
  cur = v;
  if (!v) {
    $('#ng-boards').innerHTML = '';
    $('#ng-opps').innerHTML = '';
    $('#ng-score').textContent = '0';
    $('#ng-filled').textContent = '0/0';
    $('#ng-lives').textContent = String(LIVES);
    $('#ng-time').textContent = '0:00';
    $('#ng-status').textContent = '';
    $('#ng-hints').textContent = String(HINTS);
    $('#ng-log').innerHTML = '';
    lastSec = -1;
    stopTimer();
    return;
  }
  const me = v.players.find(p => p.id === v.me);
  const my = v.my;
  const sec = v.phase === 'playing' ? Math.floor((Date.now() - v.startedAt) / 1000) : Math.floor(((v.endedAt || Date.now()) - v.startedAt) / 1000);
  /* key render: đổi khi bất cứ thứ gì hiển thị đổi — tránh vẽ thiếu (lỗi stale) */
  const rk = `${v.gid}|${v.seq}|${v.phase}|${me ? me.filled + '/' + me.mistakes + '/' + me.status : ''}|${my ? my.grid.map(r => r.join('')).join('|') + '|' + my.hintsLeft : ''}|${mode}|${tool}|${sec}`;
  if (rk === lastRenderKey && v.phase === 'playing') return;
  lastRenderKey = rk;
  lastSec = sec;
  if (v.phase === 'playing') startTimer(); else stopTimer();

  /* âm thanh tô sai — theo dõi số lỗi của mình */
  if (me) {
    if (me.mistakes > lastMistakes) Sfx.error();
    lastMistakes = me.mistakes;
  }

  $('#ng-score').textContent = String(me ? me.score : 0);
  $('#ng-filled').textContent = my ? `${my.filled}/${my.totalBlack}` : '0/0';
  $('#ng-lives').textContent = String(my ? my.livesLeft : LIVES);
  $('#ng-time').textContent = v.race && v.phase === 'playing'
    ? fmtTime(Math.max(0, RACE_TIME_MS / 1000 - sec)) : fmtTime(sec);
  $('#ng-status').textContent = v.solo
    ? `Chơi đơn ${v.size}×${v.size} — tô đủ ${v.totalBlack} ô đen thì thắng`
    : `Đua ${v.size}×${v.size} — ai tô đủ ${v.totalBlack} ô đen trước thì thắng`;
  $('#ng-hints').textContent = String(my ? my.hintsLeft : HINTS);
  $('#btn-hint').disabled = !my || my.hintsLeft <= 0;

  const boardsEl = $('#ng-boards');
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (raw) {
      const ids = raw.players.map(p => p.id);
      const v1 = viewFor(raw, ids[0]);
      const v2 = ids[1] ? viewFor(raw, ids[1]) : null;
      boardsEl.innerHTML = boardHTML(v1, raw.players[0].name + ' (P1)', true) +
        (v2 ? boardHTML(v2, raw.players[1].name + ' (P2)', false) : '');
      $('#ng-opps').innerHTML = '';
      renderLog(v);
      return;
    }
  }
  boardsEl.innerHTML = boardHTML(v, me ? cleanName(me.name) : '', true);
  const opps = v.players.filter(p => p.id !== v.me);
  $('#ng-opps').innerHTML = opps.length ? opps.map(p => {
    return `<div class="ng-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>🧩 ${Math.round((p.percent || 0) * 100)}% · ❌ ${p.mistakes} lỗi</b><i>${p.status === 'playing' ? '▶ đang chơi' : p.status === 'done' ? '🏁 xong' : p.status === 'dead' ? '💥 hết mạng' : p.status === 'resigned' ? '🏳️ xin thua' : p.status}</i></div>`;
  }).join('') : '<div class="ng-opp">Chơi đơn: chỉ có bạn.</div>';
  renderLog(v);
}
function renderLog(v) {
  const log = (v.log || []).slice(-5);
  $('#ng-log').innerHTML = log.map(l => `<div>${esc(l.text)}</div>`).join('');
}

/* ---------- kết thúc ---------- */
function showEnd(v) {
  stopTimer();
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (won) h = '🏆 Bạn thắng!';
  else if (v.solo) h = '😢 Hết mạng rồi!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — 🧩 ${q.filled || 0}/${v.totalBlack} ô (${Math.round((q.percent || 0) * 100)}%) · ❌ ${q.mistakes || 0} lỗi · 💡 ${q.hintsUsed || 0} gợi ý · ⏱️ ${fmtTime((q.timeMs || 0) / 1000)}</div>`;
  }).join('');
  let reason = '';
  if (v.solo && won) reason = `Bạn tô đủ ${v.totalBlack} ô đen — thắng!`;
  else if (v.solo) reason = `Bạn tô được ${sum[me] ? sum[me].filled : 0}/${v.totalBlack} ô thì hết 3 mạng.`;
  else if (v.endReason === 'draw') reason = 'Không ai hơn ai — cùng % hoàn thành, cùng số lỗi.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else if (v.endReason === 'percent') reason = 'Hết 180 giây — so % hoàn thành để phân thắng thua.';
  else reason = `Đua ${v.size}×${v.size}: ai tô đủ ${v.totalBlack} ô đen trước thì thắng.`;
  if (won) Sfx.win(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- tương tác: bấm ô + chuột phải + đổi chế độ ---------- */
function myAction(a, pid) {
  const id = pid || (cur && cur.me);
  const cp = controlPid(cur, id);
  if (!cp) return;
  send(cp, a);
}
$('#ng-boards').addEventListener('click', e => {
  const cell = e.target.closest('.cell');
  if (!cell || !cur || cur.phase !== 'playing') return;
  const wrap = e.target.closest('.ng-board-wrap');
  const pid = wrap ? wrap.dataset.pid : cur.me;
  if (!controlPid(cur, pid)) return;
  const x = +cell.dataset.x, y = +cell.dataset.y;
  const cls = cell.classList;
  let a;
  if (tool === 'mark') {
    a = (cls.contains('filled') || cls.contains('marked')) ? { type: 'clear', x, y } : { type: 'mark', x, y };
  } else {
    a = (cls.contains('filled') || cls.contains('marked')) ? { type: 'clear', x, y } : { type: 'fill', x, y };
  }
  myAction(a, pid);
  Sfx.fill();
});
$('#ng-boards').addEventListener('contextmenu', e => {
  const cell = e.target.closest('.cell');
  e.preventDefault();
  if (!cell || !cur || cur.phase !== 'playing') return;
  const wrap = e.target.closest('.ng-board-wrap');
  const pid = wrap ? wrap.dataset.pid : cur.me;
  if (!controlPid(cur, pid)) return;
  const x = +cell.dataset.x, y = +cell.dataset.y;
  const cls = cell.classList;
  if (cls.contains('filled') || cls.contains('marked')) myAction({ type: 'clear', x, y }, pid);
  else myAction({ type: 'mark', x, y }, pid);
  Sfx.mark();
});
$('#btn-tool').onclick = () => {
  tool = tool === 'fill' ? 'mark' : 'fill';
  $('#btn-tool').textContent = tool === 'fill' ? '✏️ Chế độ: Tô đen' : '✖️ Chế độ: Đánh dấu';
};
$('#btn-hint').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  myAction({ type: 'hint' }, cur.me);
  Sfx.hint();
};
$('#btn-resign').onclick = async () => {
  if (!cur || cur.phase !== 'playing') return;
  const r = await confirmBox('Xin thua là thua luôn ván này (đua thì các người còn lại chơi tiếp).', { title: '🏳️ Xin thua?', ok: 'Xin thua', danger: true });
  if (!r) return;
  const pid = cur.me;
  if (mode === 'pvp' && pvpP2) {
    const p2 = await confirmBox('Chung máy 2 người: ai xin thua?', { title: '🏳️ Ai xin thua?', ok: 'Người 2', cancel: 'Người 1' });
    send(p2 ? pvpP2 : (cur.players[0] && cur.players[0].id), { type: 'resign' });
    return;
  }
  send(pid, { type: 'resign' });
};

/* ---------- hướng dẫn + âm thanh + rời ván ---------- */
async function openGuide() {
  ui.openModal(GUIDE_HTML);
  const c = $('#m-close');
  if (c) c.onclick = ui.closeModal;
}
$('#btn-guide').onclick = openGuide;
$('#btn-guide-home').onclick = openGuide;
$('#btn-sound').onclick = () => {
  Sfx.setEnabled(!Sfx.isEnabled());
  $('#btn-sound').textContent = Sfx.isEnabled() ? '🔊 Âm thanh' : '🔇 Tắt tiếng';
};
if (!Sfx.isEnabled()) $('#btn-sound').textContent = '🔇 Tắt tiếng';
