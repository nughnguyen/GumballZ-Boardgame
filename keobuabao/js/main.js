// ✌️ Kéo Búa Bao — giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Đá Penalty:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Mỗi vòng: cả 2 cùng chọn 1 tay bí mật; engine lật bài ngay khi cả 2
// đã chọn — giao diện chiếu hoạt hình lật bài (2 tay hiện ra cùng lúc)
// từ lastRound trong view.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, choiceName, choiceIcon, ROUNDS_TO_WIN } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'keobuabao', min: 2, max: 2, maxSeats: 2, allowLocal: true,
  minMsg: 'Kéo Búa Bao cần 2 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { kbbMode: 'match' },
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'kbbMode' && (v === 'solo' || v === 'match')),
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
  const l = localStorage.getItem('gumballz-keobuabao-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const sl = localStorage.getItem('gumballz-keobuabao-solo-level');
  if (sl === 'easy' || sl === 'hard') soloLevel = sl;
  const n = localStorage.getItem('gumballz-keobuabao-p2');
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
  try { localStorage.setItem('gumballz-keobuabao-solo-level', soloLevel); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-keobuabao-level', botLevel); } catch (e) {}
  mode = 'match'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  try { localStorage.setItem('gumballz-keobuabao-p2', p2name); } catch (e) {}
  mode = 'pvp'; ui.startHost(true);
};

/* ---------- phòng chờ ---------- */
function needCount() {
  return 2; /* solo (người + máy) / match / pvp / online đều cần 2 người */
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
    const hard = await confirmBox('Máy Khó đọc thói quen ra tay của bạn (400–600ms/lượt); máy Dễ chọn ngẫu nhiên (700–900ms/lượt).', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung 1 màn hình, thay phiên chọn).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpP2 = null; /* id người chơi 2 ở chế độ chung máy */
let shownRoundId = 0; /* id vòng cuối cùng đã chiếu hoạt hình lật bài */
let revealing = false;
let revealTimer = null;
let coverForRound = -1; /* vòng mà màn che (chung máy) đã được bỏ */
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
  game: 'keobuabao', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('kbbMode', 'solo');
      h.setOpt('botLevel', soloLevel);
      h.addBot({ level: soloLevel }); /* máy đấu cùng */
    } else if (mode === 'match') {
      h.setOpt('kbbMode', 'match');
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('kbbMode', 'match');
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định match, không cần setOpt */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; pvpP2 = null; shownRoundId = 0; revealing = false; coverForRound = -1; coverDismissed = false; if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; } render(null, null); return; }
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

/* ---------- lật bài: hiện 2 tay đã chọn ---------- */
const revealEl = $('#kbb-reveal');
const coverEl = $('#kbb-cover');
const promptEl = $('#kbb-prompt');
const pickEls = [...document.querySelectorAll('.kbb-pick')];
function resetReveal() {
  revealEl.classList.remove('show');
  revealEl.innerHTML = '';
  for (const b of pickEls) b.classList.remove('picked', 'reveal-win', 'reveal-lose', 'reveal-tie');
}
function startReveal(round) {
  shownRoundId = round.id;
  revealing = true;
  const [a, b] = cur.players;
  const ca = round.picks[a.id], cb = round.picks[b.id];
  const aWin = round.winner === a.id, bWin = round.winner === b.id;
  revealEl.innerHTML = `<div class="kbb-reveal-row">
    <div class="kbb-reveal-hand ${aWin ? 'win' : round.tie ? 'tie' : 'lose'}"><span class="kbb-reveal-icon">${choiceIcon(ca)}</span><span>${esc(cleanName(a.name))}</span><b>${choiceName(ca)}</b></div>
    <div class="kbb-reveal-vs">VS</div>
    <div class="kbb-reveal-hand ${bWin ? 'win' : round.tie ? 'tie' : 'lose'}"><span class="kbb-reveal-icon">${choiceIcon(cb)}</span><span>${esc(cleanName(b.name))}</span><b>${choiceName(cb)}</b></div>
  </div><div class="kbb-reveal-text">${round.tie ? '🤝 Hoà vòng — đá lại!' : aWin || bWin ? `🏆 ${esc(cleanName((cur.players.find(p => p.id === round.winner) || {}).name || ''))} thắng vòng ${round.round}!` : ''}</div>`;
  revealEl.classList.add('show');
  if (round.tie) Sfx.tie();
  else if (round.winner === cur.me) Sfx.win();
  else Sfx.lose();
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    revealing = false;
    revealTimer = null;
    resetReveal();
    refreshPickUI();
  }, 1700);
}

/* picks thô từ state (chung máy: chủ phòng thấy cả 2 lựa chọn để xếp lượt) */
function rawPicks() {
  if (mode !== 'pvp') return null;
  const raw = ui.net && ui.net.raw && ui.net.raw.state;
  return raw ? raw.prog.picks : null;
}
/* ai đang phải chọn ở chế độ chung máy (người 1 trước, người 2 sau) */
function pvpCurrentPicker() {
  if (!cur || cur.phase !== 'playing') return null;
  const picks = rawPicks() || {};
  const [a, b] = cur.players;
  if (a && picks[a.id] === undefined) return a.id;
  if (b && picks[b.id] === undefined) return b.id;
  return null;
}
function refreshPickUI() {
  const cover = coverEl;
  if (!cur || cur.phase !== 'playing') {
    for (const b of pickEls) b.disabled = true;
    promptEl.textContent = '';
    cover.style.display = 'none';
    return;
  }
  if (revealing) {
    for (const b of pickEls) b.disabled = true;
    promptEl.textContent = '';
    return;
  }
  if (mode === 'pvp') {
    /* chung máy: người 1 chọn trước, người 2 chọn sau; che màn hình khi tới lượt người 2 */
    if (coverForRound !== cur.round) { coverForRound = cur.round; coverDismissed = false; }
    const picks = rawPicks() || {};
    const picker = pvpCurrentPicker();
    const [a, b] = cur.players;
    const nameA = (a && a.name) || 'Người 1';
    const nameB = (b && b.name) || 'Người 2';
    if (picker === (a && a.id)) {
      cover.style.display = 'none';
      for (const btn of pickEls) btn.disabled = false;
      promptEl.textContent = `✌️ ${cleanName(nameA)} chọn — chạm 1 tay để ra! (${cleanName(nameB)} quay đi nhé)`;
    } else if (picker === (b && b.id)) {
      if (!coverDismissed) {
        cover.style.display = 'flex';
        $('#kbb-cover-text').textContent = `🙈 ${cleanName(nameA)} đã chọn xong — ${cleanName(nameB)} quay đi rồi bấm "Tôi đã sẵn sàng" để chọn tay của mình!`;
        for (const btn of pickEls) btn.disabled = true;
        promptEl.textContent = '';
      } else {
        cover.style.display = 'none';
        for (const btn of pickEls) btn.disabled = false;
        promptEl.textContent = `✌️ ${cleanName(nameB)} chọn — chạm 1 tay để ra!`;
      }
    } else {
      cover.style.display = 'none';
      for (const btn of pickEls) btn.disabled = true;
      promptEl.textContent = '⏳ Đang chờ lật bài…';
    }
    return;
  }
  /* solo / đấu máy / online: chỉ mình thấy màn hình của mình */
  cover.style.display = 'none';
  const me = cur.me;
  if (cur.myPick !== null && cur.myPick !== undefined) {
    for (const btn of pickEls) {
      btn.disabled = true;
      btn.classList.toggle('picked', btn.dataset.choice === cur.myPick);
    }
    promptEl.textContent = `Đã chọn ${choiceIcon(cur.myPick)} ${choiceName(cur.myPick)} — đang chờ ${cur.oppPicked ? 'lật bài…' : 'đối thủ chọn…'}`;
    return;
  }
  for (const btn of pickEls) { btn.disabled = false; btn.classList.remove('picked'); }
  promptEl.textContent = '✌️ Tới lượt bạn — chạm 1 tay để ra (Kéo / Búa / Bao)!';
}
$('#btn-cover-ok').onclick = () => {
  coverDismissed = true;
  coverEl.style.display = 'none';
  refreshPickUI();
};

function render(v, prev) {
  cur = v;
  if (!v) {
    resetReveal();
    $('#kbb-turn').textContent = '—';
    $('#kbb-round').textContent = '';
    $('#kbb-score').textContent = '0 – 0';
    $('#kbb-status').textContent = '';
    $('#kbb-opps').innerHTML = '';
    $('#kbb-rounds').innerHTML = '';
    $('#kbb-log').textContent = '';
    refreshPickUI();
    return;
  }
  /* tỉ số / vòng */
  const [a, b] = v.players;
  $('#kbb-score').textContent = `${v.roundWins[a.id] || 0} – ${b ? (v.roundWins[b.id] || 0) : 0}`;
  $('#kbb-round').textContent = `Vòng ${v.round} · thắng ${ROUNDS_TO_WIN} vòng thì thắng trận`;
  /* ai chưa chọn */
  const mePicked = v.myPick !== null && v.myPick !== undefined;
  const opp = v.players.find(p => p.id !== v.me);
  const turnName = !mePicked ? 'Bạn' : !v.oppPicked ? ((opp || {}).name || 'Đối thủ') : '—';
  $('#kbb-turn').textContent = turnName + (turnName !== '—' && turnName !== 'Bạn' && opp && opp.isBot ? ' 🤖' : '');
  /* trạng thái */
  const statusEl = $('#kbb-status');
  if (v.phase === 'ended') statusEl.textContent = '';
  else if (revealing) statusEl.textContent = '';
  else if (mode === 'pvp') statusEl.textContent = '';
  else if (mePicked) statusEl.textContent = '✅ Đã chọn — đang chờ lật bài…';
  else statusEl.textContent = '✌️ Tới lượt bạn chọn';
  /* bảng tỉ số */
  $('#kbb-opps').innerHTML = v.players.map(p => {
    const picked = (p.id === v.me && mePicked) || (p.id !== v.me && v.oppPicked);
    return `<div class="kbb-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>🏆 ${v.roundWins[p.id] || 0} vòng thắng</b><span>${picked ? '✅ đã chọn' : '⏳ chưa chọn'}</span></div>`;
  }).join('');
  /* lịch sử vòng (6 vòng gần nhất, mới nhất lên đầu) */
  const rounds = (v.rounds || []).slice(-6).reverse();
  $('#kbb-rounds').innerHTML = rounds.length
    ? rounds.map(r => {
        const pa = v.players[0], pb = v.players[1];
        const ca = r.picks[pa.id], cb = pb ? r.picks[pb.id] : null;
        const wName = r.winner ? (v.players.find(p => p.id === r.winner) || {}).name || '' : '';
        return `<div class="kbb-round-row">Vòng ${r.round}: ${esc(cleanName(pa.name))} ${choiceIcon(ca)} vs ${pb ? esc(cleanName(pb.name)) + ' ' + choiceIcon(cb) : ''} — <span class="${r.tie ? 'tie' : 'win'}">${r.tie ? '🤝 Hoà' : '🏆 ' + esc(cleanName(wName))}</span></div>`;
      }).join('')
    : 'Chưa có vòng nào.';
  /* nhật ký */
  $('#kbb-log').textContent = (v.log || []).slice(-3).map(l => l.text).join(' · ');
  /* lật bài: vòng mới → chiếu hoạt hình */
  if (v.lastRound && v.lastRound.id !== shownRoundId && !revealing) startReveal(v.lastRound);
  refreshPickUI();
}

function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (won) h = v.solo ? '🏆 Vua oẳn tù tì!' : '🏆 Bạn thắng!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — 🏆 ${q.roundWins || 0} vòng thắng · 🤝 ${q.ties || 0} vòng hoà · 🔥 chuỗi dài nhất ${q.maxStreak || 0}</div>`;
  }).join('');
  let reason = '';
  if (v.endReason === 'draw') reason = 'Hoà — không ai hơn ai.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else if (v.solo && won) reason = `Bạn thắng máy ${sum[me] ? sum[me].roundWins : 0}–${(v.players[1] && sum[v.players[1].id]) ? sum[v.players[1].id].roundWins : 0} ở best-of-5!`;
  else if (v.solo) reason = 'Máy thắng best-of-5 trước — tập lại nhé!';
  else reason = 'Best-of-5: ai thắng 3 vòng trước thì thắng trận.';
  if (won) Sfx.fanfare(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- chọn tay (chạm vào 1 trong 3 nút) ---------- */
$('#kbb-picks').addEventListener('click', e => {
  const bEl = e.target.closest('.kbb-pick');
  if (!bEl || bEl.disabled || revealing) return;
  const choice = bEl.dataset.choice;
  let pid = null;
  if (mode === 'pvp') pid = pvpCurrentPicker();
  else if (cur) pid = cur.me;
  if (!controlPid(cur, pid)) { tip('Chưa tới lượt chọn của bạn.'); return; }
  if (mode === 'pvp') {
    /* chung máy: không tô tay đã chọn (kẻo người còn lại nhìn trộm) */
  } else {
    for (const b of pickEls) b.classList.toggle('picked', b === bEl);
  }
  Sfx.pick();
  send(pid, { type: 'pick', choice });
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
