// ⚽ Đá Penalty — giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Bida 8-ball:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Mỗi cú sút: người sút + thủ môn cùng chọn 1 ô bí mật; engine lật
// bài ngay khi cả 2 đã chọn — giao diện chiếu hoạt hình lật bài
// (thủ môn đổ người + bóng bay) từ lastKick trong view.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, zoneName, ROUNDS, SOLO_SHOTS, SOLO_WIN_GOALS } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=16';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'dapenalty', min: 2, max: 2, maxSeats: 2, allowLocal: true,
  minMsg: 'Đá Penalty cần 2 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { dpMode: 'match' },
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'dpMode' && (v === 'solo' || v === 'match')),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đi sau 700–900ms (Dễ) / 400–600ms (Khó) mỗi lượt chọn — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | match | pvp | online */
let botLevel = 'hard';
let soloLevel = 'hard';
let p2name = 'Bạn 2';
try {
  const l = localStorage.getItem('gumballz-dapenalty-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const sl = localStorage.getItem('gumballz-dapenalty-solo-level');
  if (sl === 'easy' || sl === 'hard') soloLevel = sl;
  const n = localStorage.getItem('gumballz-dapenalty-p2');
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
  soloLevel = $('#sel-solo-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-dapenalty-solo-level', soloLevel); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-dapenalty-level', botLevel); } catch (e) {}
  mode = 'match'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-dapenalty-p2', p2name); } catch (e) {}
  mode = 'pvp'; ui.startHost(true);
};
/* inputfix: Enter trong ô tên người chơi 2 thì bắt đầu luôn (trước đây không làm gì) */
$('#inp-p2name').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('#btn-start-local').click(); } });

/* ---------- phòng chờ ---------- */
function needCount() {
  return 2; /* solo (người + thủ môn máy) / match / pvp / online đều cần 2 người */
}
function renderLobby(info, u) {
  const n = info.players.length;
  const need = needCount();
  $('#lobby-list').innerHTML = `<p><b>${n}/2 người</b> (cần ${need}–2)</p>` + info.players.map(p => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
  }).join('') + (u.isHost && mode === 'online' && n < 2
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>` : '');
  $('#btn-start-online').style.display = u.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < need;
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') {
    const hard = await confirmBox('Máy Khó đọc thói quen sút/bắt của bạn (400–600ms/lượt); máy Dễ chọn ngẫu nhiên (700–900ms/lượt).', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung 1 màn hình, thay phiên sút/bắt).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpP2 = null; /* id người chơi 2 ở chế độ chung máy */
let shownKickId = 0; /* id cú sút cuối cùng đã chiếu hoạt hình lật bài */
let revealing = false;
let revealTimer = null;
let coverForKick = -1; /* cú sút mà màn che (chung máy) đã được bỏ */
let coverDismissed = false;

function controlPid(v, pid) {
  if (!v || v.phase !== 'playing' || !pid) return null;
  const p = v.players.find(x => x.id === pid);
  return p && ui.controls(pid) ? pid : null;
}
function send(pid, a) {
  if (!ui.net || !cur) return;
  ui.actAs(pid, a);
}

const ui = gameKit({
  game: 'dapenalty', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('dpMode', 'solo');
      h.setOpt('botLevel', soloLevel);
      h.addBot({ level: soloLevel }); /* thủ môn máy */
    } else if (mode === 'match') {
      h.setOpt('dpMode', 'match');
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('dpMode', 'match');
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định match, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; pvpP2 = null; shownKickId = 0; revealing = false; coverForKick = -1; coverDismissed = false; if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; } render(null, null); return; }
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
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};

/* ---------- vị trí các ô (tọa độ % trong khung thành) ---------- */
const ZONE_POS = {
  tl: [16.6, 16.6], tc: [50, 16.6], tr: [83.3, 16.6],
  ml: [16.6, 50], mc: [50, 50], mr: [83.3, 50],
  bl: [16.6, 83.3], bc: [50, 83.3], br: [83.3, 83.3],
};
const GOAL_H = 0.78; /* khung thành chiếm 78% chiều cao của .dp-goal-wrap */
const keeperEl = $('#dp-keeper');
const ballEl = $('#dp-ball');
const revealEl = $('#dp-reveal');
const coverEl = $('#dp-cover');
const promptEl = $('#dp-prompt');
const zoneEls = [...document.querySelectorAll('.dp-zone')];
function resetFigures() {
  keeperEl.style.left = '50%';
  keeperEl.style.top = '78%';
  keeperEl.textContent = '🧍';
  keeperEl.classList.remove('dive-left', 'dive-right');
  ballEl.style.left = '50%';
  ballEl.style.top = '90%';
  revealEl.classList.remove('show');
  revealEl.textContent = '';
  for (const z of zoneEls) z.classList.remove('picked', 'reveal-goal', 'reveal-save');
}
function startReveal(kick) {
  shownKickId = kick.id;
  revealing = true;
  const [kx, ky] = ZONE_POS[kick.keepZone] || [50, 50];
  const [bx, by] = ZONE_POS[kick.shootZone] || [50, 50];
  keeperEl.style.left = kx + '%';
  keeperEl.style.top = ky + '%';
  keeperEl.textContent = '🤾';
  keeperEl.classList.toggle('dive-left', kx < 50);
  keeperEl.classList.toggle('dive-right', kx > 50);
  ballEl.style.left = bx + '%';
  ballEl.style.top = (by * GOAL_H) + '%';
  const zEl = zoneEls.find(z => z.dataset.zone === kick.shootZone);
  if (zEl) zEl.classList.add(kick.goal ? 'reveal-goal' : 'reveal-save');
  revealEl.textContent = kick.goal ? '⚽ VÀO!' : '🧤 CẢN PHÁ!';
  revealEl.classList.add('show');
  Sfx.kick();
  if (kick.goal) Sfx.goal(); else Sfx.save();
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    revealing = false;
    revealTimer = null;
    resetFigures();
    refreshPickUI();
  }, 1700);
}

/* picks thô từ state (chung máy: chủ phòng thấy cả 2 lựa chọn để xếp lượt) */
function rawPicks() {
  if (mode !== 'pvp') return null;
  const raw = ui.net && ui.net.raw && ui.net.raw.state;
  return raw ? raw.prog.picks : null;
}
/* ai đang phải chọn ở chế độ chung máy (sút trước, bắt sau) */
function pvpCurrentPicker() {
  if (!cur || cur.phase !== 'playing') return null;
  const picks = rawPicks() || {};
  if (picks[cur.shooter] === undefined) return cur.shooter;
  if (picks[cur.keeper] === undefined) return cur.keeper;
  return null;
}
function refreshPickUI() {
  const cover = coverEl;
  if (!cur || cur.phase !== 'playing') {
    for (const z of zoneEls) z.disabled = true;
    promptEl.textContent = '';
    cover.style.display = 'none';
    return;
  }
  if (revealing) {
    for (const z of zoneEls) z.disabled = true;
    promptEl.textContent = '';
    return;
  }
  if (mode === 'pvp') {
    /* chung máy: sút trước, bắt sau; che màn hình khi tới lượt bắt */
    if (coverForKick !== cur.kick) { coverForKick = cur.kick; coverDismissed = false; }
    const picks = rawPicks() || {};
    const picker = pvpCurrentPicker();
    const shooterName = (cur.players.find(p => p.id === cur.shooter) || {}).name || 'Người sút';
    const keeperName = (cur.players.find(p => p.id === cur.keeper) || {}).name || 'Thủ môn';
    if (picker === cur.shooter) {
      cover.style.display = 'none';
      for (const z of zoneEls) z.disabled = false;
      promptEl.textContent = `⚽ ${cleanName(shooterName)} sút — chạm 1 ô để chọn góc! (${cleanName(keeperName)} quay đi nhé)`;
    } else if (picker === cur.keeper) {
      if (!coverDismissed) {
        cover.style.display = 'flex';
        $('#dp-cover-text').textContent = `🙈 ${cleanName(shooterName)} đã chọn xong — ${cleanName(keeperName)} quay đi rồi bấm "Tôi đã sẵn sàng" để chọn hướng đổ người!`;
        for (const z of zoneEls) z.disabled = true;
        promptEl.textContent = '';
      } else {
        cover.style.display = 'none';
        for (const z of zoneEls) z.disabled = false;
        promptEl.textContent = `🧤 ${cleanName(keeperName)} bắt — chạm 1 ô để đổ người!`;
      }
    } else {
      cover.style.display = 'none';
      for (const z of zoneEls) z.disabled = true;
      promptEl.textContent = '⏳ Đang chờ lật bài…';
    }
    return;
  }
  /* solo / đấu máy / online: chỉ mình thấy màn hình của mình */
  cover.style.display = 'none';
  const me = cur.me;
  const iAmShooter = cur.shooter === me;
  const iAmKeeper = cur.keeper === me;
  if (!iAmShooter && !iAmKeeper) {
    for (const z of zoneEls) z.disabled = true;
    promptEl.textContent = '⏳ Đang chờ đối thủ chọn…';
    return;
  }
  if (cur.myPick !== null && cur.myPick !== undefined) {
    for (const z of zoneEls) {
      z.disabled = true;
      z.classList.toggle('picked', z.dataset.zone === cur.myPick);
    }
    promptEl.textContent = `Đã chọn ${zoneName(cur.myPick)} — đang chờ ${cur.oppPicked ? 'lật bài…' : 'đối thủ chọn…'}`;
    return;
  }
  for (const z of zoneEls) { z.disabled = false; z.classList.remove('picked'); }
  promptEl.textContent = iAmShooter
    ? '⚽ Bạn sút — chạm 1 ô trong khung thành để chọn góc sút!'
    : '🧤 Bạn bắt — chạm 1 ô để chọn hướng đổ người!';
}
$('#btn-cover-ok').onclick = () => {
  coverDismissed = true;
  coverEl.style.display = 'none';
  refreshPickUI();
};

function render(v, prev) {
  cur = v;
  if (!v) {
    resetFigures();
    $('#dp-turn').textContent = '—';
    $('#dp-round').textContent = '';
    $('#dp-score').textContent = '0 – 0';
    $('#dp-status').textContent = '';
    $('#dp-opps').innerHTML = '';
    $('#dp-kicks').innerHTML = '';
    $('#dp-log').textContent = '';
    refreshPickUI();
    return;
  }
  /* tỉ số / vòng / lượt sút */
  if (v.solo) {
    $('#dp-score').textContent = `${v.scores[v.me] || 0} bàn · ${v.shots[v.me] || 0}/${SOLO_SHOTS} cú`;
    $('#dp-round').textContent = `Cú sút ${Math.min(v.kick + 1, SOLO_SHOTS)}/${SOLO_SHOTS}`;
  } else {
    const [a, b] = v.players;
    $('#dp-score').textContent = `${v.scores[a.id] || 0} – ${b ? (v.scores[b.id] || 0) : 0}`;
    $('#dp-round').textContent = v.sudden ? `Luân lưu ${v.suddenRound}` : `Vòng ${v.round}/${ROUNDS}`;
  }
  const shooterP = v.players.find(p => p.id === v.shooter);
  $('#dp-turn').textContent = shooterP ? cleanName(shooterP.name) + (shooterP.isBot ? ' 🤖' : '') : '—';
  /* trạng thái */
  const statusEl = $('#dp-status');
  if (v.phase === 'ended') statusEl.textContent = '';
  else if (revealing) statusEl.textContent = '';
  else if (mode === 'pvp') statusEl.textContent = '';
  else if (v.myPick !== null && v.myPick !== undefined) statusEl.textContent = '✅ Đã chọn — đang chờ lật bài…';
  else if (v.shooter === v.me) statusEl.textContent = '⚽ Tới lượt bạn sút';
  else if (v.keeper === v.me) statusEl.textContent = '🧤 Tới lượt bạn bắt';
  else statusEl.textContent = '⏳ Đang chờ đối thủ…';
  /* bảng tỉ số */
  $('#dp-opps').innerHTML = v.players.map(p => {
    const role = p.id === v.shooter && v.phase === 'playing' ? '▶ đang sút' : p.id === v.keeper && v.phase === 'playing' ? '🧤 đang bắt' : '';
    return `<div class="dp-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>⚽ ${v.scores[p.id] || 0} bàn · 🧤 ${v.saves[p.id] || 0} cản phá</b><span>🎯 ${v.shots[p.id] || 0} cú sút · 🔥 chuỗi ${v.maxStreak[p.id] || 0}</span><i>${role}</i></div>`;
  }).join('');
  /* lịch sử sút (6 cú gần nhất, mới nhất lên đầu) */
  const kicks = (v.kicks || []).slice(-6).reverse();
  $('#dp-kicks').innerHTML = kicks.length
    ? kicks.map(k => {
        const sn = (v.players.find(p => p.id === k.shooter) || {}).name || '';
        const label = k.sudden ? `Luân lưu ${k.round - ROUNDS}` : `Vòng ${k.round}`;
        return `<div class="dp-kick">${label}: ${esc(cleanName(sn))} sút <b>${zoneName(k.shootZone)}</b> — <span class="${k.goal ? 'goal' : 'save'}">${k.goal ? '⚽ VÀO' : '🧤 CẢN PHÁ' + (k.adjacent ? ' (ô kề)' : '')}</span></div>`;
      }).join('')
    : 'Chưa có cú sút nào.';
  /* nhật ký */
  $('#dp-log').textContent = (v.log || []).slice(-3).map(l => l.text).join(' · ');
  /* lật bài: cú sút mới → chiếu hoạt hình */
  if (v.lastKick && v.lastKick.id !== shownKickId && !revealing) startReveal(v.lastKick);
  refreshPickUI();
}

function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (won) h = v.solo ? '🏆 Vua sút phạt!' : '🏆 Bạn thắng!';
  else if (v.solo) h = '😢 Chưa đủ 7 bàn!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — ⚽ ${q.goals || 0} bàn · 🧤 ${q.saves || 0} cản phá · 🎯 ${q.shots || 0} cú sút · 🔥 chuỗi dài nhất ${q.maxStreak || 0}</div>`;
  }).join('');
  let reason = '';
  if (v.endReason === 'draw') reason = 'Quá 10 vòng luân lưu vẫn hoà — không ai hơn ai.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else if (v.solo && won) reason = `Bạn ghi ${sum[me] ? sum[me].goals : 0}/${SOLO_SHOTS} bàn — đủ ${SOLO_WIN_GOALS} bàn để thắng!`;
  else if (v.solo) reason = `Bạn chỉ ghi ${sum[me] ? sum[me].goals : 0}/${SOLO_SHOTS} bàn — cần ${SOLO_WIN_GOALS} bàn mới thắng. Tập lại nhé!`;
  else reason = 'Đấu: ai ghi nhiều bàn hơn sau 5 vòng (hoặc dẫn trước ở loạt luân lưu) thì thắng.';
  if (won) Sfx.win(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- chọn ô (chạm vào khung thành) ---------- */
$('#dp-goal').addEventListener('click', e => {
  const zEl = e.target.closest('.dp-zone');
  if (!zEl || zEl.disabled || revealing) return;
  const zone = zEl.dataset.zone;
  let pid = null;
  if (mode === 'pvp') pid = pvpCurrentPicker();
  else if (cur) pid = cur.me;
  if (!controlPid(cur, pid)) { tip('Chưa tới lượt chọn của bạn.'); return; }
  if (mode === 'pvp') {
    /* chung máy: không tô ô đã chọn (kẻo người còn lại nhìn trộm) */
  } else {
    for (const z of zoneEls) z.classList.toggle('picked', z === zEl);
  }
  Sfx.click();
  send(pid, { type: 'pick', zone });
});

/* ---------- xin thua / hướng dẫn / âm thanh ---------- */
$('#btn-resign').onclick = async () => {
  if (!cur || cur.phase !== 'playing') return;
  const r = await confirmBox('Xin thua là thua luôn ván này.', { title: '🏳️ Xin thua?', ok: 'Xin thua', danger: true });
  if (!r) return;
  const pid = cur.me;
  if (mode === 'pvp' && pvpP2) {
    const p2 = await confirmBox('Chung máy 2 người: ai xin thua?', { title: '🏳️ Ai xin thua?', ok: 'Người 2', cancel: 'Người 1' });
    send(p2 ? pvpP2 : (cur.players[0] && cur.players[0].id), { type: 'resign' });
    return;
  }
  send(pid, { type: 'resign' });
};
async function openGuide() {
  ui.openModal(GUIDE_HTML);
  const c = $('#m-close');
  if (c) c.onclick = ui.closeModal;
}
$('#btn-guide-home').onclick = openGuide;
$('#btn-guide-top').onclick = openGuide;
$('#btn-sound').onclick = () => {
  Sfx.setEnabled(!Sfx.isEnabled());
  $('#btn-sound').textContent = Sfx.isEnabled() ? '🔊 Âm thanh' : '🔇 Tắt tiếng';
};
if (!Sfx.isEnabled()) $('#btn-sound').textContent = '🔇 Tắt tiếng';
