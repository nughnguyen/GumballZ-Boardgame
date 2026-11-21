// 🛡️ The Resistance – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Wavelength:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi trên giao diện: Thủ lĩnh bấm vào thẻ người chơi để chọn
// đội rồi bấm "Đề cử đội"; cả bàn bấm Đồng ý / Từ chối (công khai);
// người trong đội bí mật bấm Thành công / Thất bại.
// Chơi cùng máy: chuyền máy cho nhau, có màn che khi đổi người cầm máy
// để không lộ vai trò.
import { createGame, applyAction, viewFor, actors, serialize, deserialize, TEAM_SIZES, SPY_COUNT } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { MISSIONS, ROLE_TEXT } from './words.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=51';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=13';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'resistance', min: 1, max: 10, maxSeats: 10, allowLocal: true,
  minMsg: 'The Resistance cần 5–10 người: chơi đơn (tự có máy), thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: (k, v) => k === 'botLevel' && (v === 'easy' || v === 'hard'),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy hành động sau 1.2–3s */
  botDelay: () => 1200 + Math.random() * 1800,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | ai-easy | ai-hard | pvp | online */
let playerCount = 5; /* đấu máy / cùng máy: tổng số người */
let botLevel = 'hard';
try {
  const c = +localStorage.getItem('gumballz-resistance-count');
  if (c >= 5 && c <= 10) playerCount = c;
  const l = localStorage.getItem('gumballz-resistance-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
} catch (e) {}
function toggleBox(id) {
  for (const b of ['solo-row', 'bot-row', 'room-box', 'local-row']) {
    const el = document.getElementById(b);
    if (el) el.style.display = b === id ? (el.style.display === 'none' ? '' : 'none') : 'none';
  }
}
$('#btn-solo').onclick = () => toggleBox('solo-row');
$('#btn-start-solo').onclick = () => {
  botLevel = $('#sel-solo-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-resistance-level', botLevel); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  playerCount = +($('#sel-players').value || 5);
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  try { localStorage.setItem('gumballz-resistance-count', String(playerCount)); localStorage.setItem('gumballz-resistance-level', botLevel); } catch (e) {}
  mode = botLevel === 'easy' ? 'ai-easy' : 'ai-hard';
  ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  playerCount = +($('#sel-local-players').value || 5);
  try { localStorage.setItem('gumballz-resistance-count', String(playerCount)); } catch (e) {}
  mode = 'pvp'; ui.startHost(true);
};

/* ---------- phòng chờ ---------- */
function renderLobby(info, u) {
  const n = info.players.length;
  const need = mode === 'solo' ? 1 : 5;
  $('#lobby-list').innerHTML = `<p><b>${n}/10 người</b> (cần ${need}–10)</p>` + info.players.map(p => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
  }).join('') + (u.isHost && mode !== 'solo' && !mode.startsWith('ai-') && n < 10
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
    const hard = await confirmBox('Máy Khó suy luận từ lịch sử nhiệm vụ; máy Dễ chơi ngẫu nhiên hơn.', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau. Tới lượt ai thì đưa máy cho người đó!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpTurn = null, pvpCover = false;
let picked = new Set(); /* đội đang chọn (Thủ lĩnh) */
let pickedKey = '';

function myPid(v) {
  if (!v) return null;
  if (mode === 'pvp') return pvpTurn;
  return v.me;
}
/* người đang phải hành động mà mình điều khiển được (null nếu không phải lượt mình) */
function controlPid(v) {
  if (!v || v.phase !== 'playing') return null;
  const pid = myPid(v);
  if (!pid) return null;
  const p = v.players.find(x => x.id === pid);
  return p && !p.resigned && ui.controls(pid) ? pid : null;
}
/* người chơi thật tiếp theo phải hành động (chuyền tay) */
function pendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  if (v.stage === 'propose') {
    const p = v.players.find(x => x.id === v.leader);
    return p && !p.isBot ? p : null;
  }
  if (v.stage === 'vote') {
    const p = v.players.find(x => !x.isBot && x.vote == null && !x.resigned);
    return p || null;
  }
  if (v.stage === 'mission') {
    const p = v.players.find(x => !x.isBot && x.onTeam && !x.acted && !x.resigned);
    return p || null;
  }
  if (v.stage === 'reveal') {
    return v.players.find(p => !p.isBot && !p.resigned) || null;
  }
  return null;
}

const ui = gameKit({
  game: 'resistance', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + (số người − 1) máy */
      for (let i = 0; i < playerCount - 1; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    if (mode === 'solo') {
      /* chơi đơn: engine tự thêm 4 máy (người chơi luôn là Kháng chiến);
         độ khó của máy đi qua opts.botLevel (setOpt cần optOk cho phép) */
      h.setOpt('botLevel', botLevel);
    }
    /* pvp: chủ phòng thêm người trong phòng chờ */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (mode === 'pvp' && !pvpTurn && v.players.length) pvpTurn = v.players[0].id;
    /* chuyền tay: đổi người cầm máy khi lượt đổi sang người thật khác */
    if (mode === 'pvp' && v.phase === 'playing') {
      const nx = pendingHuman(v);
      if (nx && nx.id !== pvpTurn) {
        const prevPending = prev ? pendingHuman(prev) : null;
        if (!prevPending || prevPending.id !== nx.id) { pvpTurn = nx.id; pvpCover = true; }
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

function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide-top').onclick = openGuide;
$('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊 Âm thanh' : '🔇 Âm thanh'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

/* ---------- hiển thị ---------- */
function missionDots(v) {
  let out = '<div class="rs-missions">';
  for (let m = 1; m <= 5; m++) {
    const h = v.history.find(x => x.mission === m);
    const cls = h ? (h.result === 'success' ? 'win' : 'lose') : (m === v.mission && v.phase === 'playing' ? 'cur' : '');
    const mark = h ? (h.result === 'success' ? '✓' : '✗') : String(m);
    out += `<span class="m ${cls}" title="Nhiệm vụ ${m}${h ? (h.result === 'success' ? ' — thành công' : ' — thất bại') : ''}">${mark}</span>`;
  }
  return out + '</div>';
}

function roleHtml(v, ctrl) {
  const me = v.players.find(p => p.id === (ctrl || v.me));
  if (!me) return '';
  const side = me.side;
  if (!side) return `<div class="rs-role"><span class="lbl">🎭 Vai trò của bạn</span>Đang chờ chia vai…</div>`;
  const rt = ROLE_TEXT[side];
  let extra = '';
  if (side === 'spy' && v.spyIds && v.spyIds.length > 1) {
    const mates = v.spyIds.filter(id => id !== me.id).map(id => {
      const p = v.players.find(x => x.id === id);
      return p ? esc(cleanName(p.name)) : '';
    }).filter(Boolean);
    if (mates.length) extra = `<small>🕵️ Đồng đội gián điệp của bạn: <b>${mates.join(', ')}</b></small>`;
  }
  if (side === 'resistance' && v.solo) extra = `<small>Bạn chơi cùng 4 máy — 2 trong số đó là gián điệp. Hãy tìm ra chúng!</small>`;
  return `<div class="rs-role${side === 'spy' ? ' spy' : ''}"><span class="lbl">🎭 Vai trò của bạn</span>${rt.icon} Bạn là <b>${rt.short}</b>${extra}</div>`;
}

function teamAreaHtml(v, ctrl) {
  const leader = v.players.find(p => p.id === v.leader);
  const leaderName = leader ? esc(cleanName(leader.name)) : '…';
  const mName = MISSIONS[v.mission - 1] ? MISSIONS[v.mission - 1].name : '';
  let out = missionDots(v);
  if (v.stage === 'propose') {
    const isLeader = ctrl === v.leader;
    out += `<div class="rs-team"><h3>🎯 Nhiệm vụ ${v.mission}: ${esc(mName)}</h3>`
      + `<p>${isLeader ? '👑 <b>Bạn là Thủ lĩnh</b> — bấm vào thẻ người chơi bên dưới để chọn đội.' : `👑 <b>${leaderName}</b> đang chọn đội…`}</p>`
      + `<p>Cần đội <b>${v.teamSize} người</b> (đã chọn <b id="rs-picked-count">${picked.size}</b>).${v.failsNeeded === 2 ? ' <b>Nhiệm vụ này cần 2 Thất bại mới thất bại.</b>' : ''}</p>`
      + `<p class="hint">Mẹo: đề cử người từng ở nhiệm vụ thành công; tránh người từng ở nhiệm vụ thất bại.</p></div>`;
    return out;
  }
  if (v.stage === 'vote') {
    const team = (v.proposal && v.proposal.team) || [];
    const names = team.map(id => {
      const p = v.players.find(x => x.id === id);
      const vote = v.proposal.votes[id];
      const mark = vote === 'approve' ? ' <span class="ok">✅</span>' : vote === 'reject' ? ' <span class="no">❌</span>' : '';
      return p ? esc(cleanName(p.name)) + mark : '';
    }).join(', ');
    const voted = Object.keys(v.proposal ? v.proposal.votes : {}).length;
    out += `<div class="rs-team"><h3>🗳️ Bỏ phiếu cho đội nhiệm vụ ${v.mission}</h3>`
      + `<p class="names">Đội được đề cử (${team.length} người): <b>${names}</b></p>`
      + `<p>Đã bỏ phiếu: <b>${voted}/${v.players.length}</b> · Từ chối liên tiếp: <b>${v.rejects}/5</b> (5 lần thì Gián điệp thắng!)</p>`
      + `<p class="hint">Phiếu bầu là công khai — ai cũng thấy ai bỏ phiếu gì.</p></div>`;
    return out;
  }
  if (v.stage === 'mission') {
    const team = (v.current && v.current.team) || [];
    const names = team.map(id => {
      const p = v.players.find(x => x.id === id);
      return p ? esc(cleanName(p.name)) : '';
    }).join(', ');
    const acted = v.current ? v.current.actedCount : 0;
    const me = v.players.find(p => p.id === ctrl);
    const onTeam = me && team.includes(me.id);
    out += `<div class="rs-team"><h3>🎯 Nhiệm vụ ${v.mission} đang diễn ra</h3>`
      + `<p class="names">Đội làm nhiệm vụ: <b>${names}</b></p>`
      + `<p>Đã chọn xong: <b>${acted}/${team.length}</b> người.${v.current && v.current.failsNeeded === 2 ? ' Cần <b>2 Thất bại</b> mới thất bại.' : ' Chỉ cần <b>1 Thất bại</b> là nhiệm vụ thất bại.'}</p>`
      + (onTeam ? `<p>${v.current.myAction ? `Bạn đã chọn: <b>${v.current.myAction === 'success' ? '✅ Thành công' : '💥 Thất bại'}</b> (bí mật — không ai thấy).` : 'Tới lượt bạn chọn — <b>Thành công</b> hay <b>Thất bại</b>? (Kháng chiến chỉ được chọn Thành công.)'}</p>` : `<p class="hint">Bạn không có trong đội — chờ kết quả lật bài.</p>`)
      + `</div>`;
    return out;
  }
  /* reveal */
  const r = v.lastReveal;
  if (r) {
    out += `<div class="rs-team"><h3>🎯 Nhiệm vụ ${r.mission} đã xong</h3>`
      + `<p class="names">Đội: <b>${r.team.map(id => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : ''; }).join(', ')}</b></p>`
      + `<p>${r.result === 'success' ? '🎉 <b>THÀNH CÔNG</b>' : '💥 <b>THẤT BẠI</b>'} — ${r.fails} Thất bại (cần ${r.required} để thất bại).</p></div>`;
  }
  return out;
}

function logHtml(v) {
  return '<div class="rs-game-log">' + v.log.slice().reverse().map(l => `<div class="lg ${l.kind || ''}">${esc(l.text)}</div>`).join('') + '</div>';
}

function revealHtml(v) {
  if (v.stage !== 'reveal' || !v.lastReveal) return '';
  const r = v.lastReveal;
  const good = r.result === 'success';
  return `<div class="big">${good ? '🎉 Nhiệm vụ THÀNH CÔNG!' : '💥 Nhiệm vụ THẤT BẠI!'}</div>`
    + `<div class="det ${good ? 'good' : 'bad'}">${r.fails} Thất bại · Kháng chiến ${v.winsRes} – ${v.winsSpy} Gián điệp</div>`
    + `<div class="det">Chỉ công bố số Thất bại — không lộ ai đã chọn gì.</div>`;
}

function coverHtml(v) {
  if (mode !== 'pvp' || !pvpCover || v.phase !== 'playing') return '';
  const p = pendingHuman(v);
  if (!p) return '';
  const hint = v.stage === 'propose' ? 'Tới lượt bạn làm Thủ lĩnh — bấm để xem vai trò rồi đề cử đội.'
    : v.stage === 'vote' ? 'Tới lượt bạn bỏ phiếu — bấm để xem vai trò rồi bỏ phiếu Đồng ý / Từ chối.'
    : v.stage === 'mission' ? 'Tới lượt bạn làm nhiệm vụ — bấm để xem vai trò rồi chọn Thành công / Thất bại.'
    : 'Xem kết quả lật bài rồi bấm Tiếp theo.';
  return `<div class="rs-cover"><div class="rs-cover-card"><div class="rs-cover-icon">🙈</div><h3>Đưa máy cho ${esc(cleanName(p.name))}</h3><p>${hint}</p><button class="btn big primary" id="btn-cover-ok">Tôi là ${esc(cleanName(p.name))} — tiếp tục</button></div></div>`;
}

function render(v, prev) {
  cur = v;
  if (!v) { endShownFor = ''; return; }
  const ctrl = controlPid(v);
  const me = v.me;

  /* đội đang chọn: xóa khi đổi nhiệm vụ / đổi Thủ lĩnh (tránh kẹt lựa chọn cũ) */
  const pk = `${v.gid}|${v.mission}|${v.leader}|${v.stage}`;
  if (pk !== pickedKey) { pickedKey = pk; picked = new Set(); }

  /* âm thanh theo thay đổi */
  if (prev && prev.phase === 'playing' && v.phase === 'playing') {
    if (v.stage === 'reveal' && prev.stage !== 'reveal') {
      const last = v.history[v.history.length - 1];
      if (last && last.result === 'success') Snd.correct(); else Snd.wrong();
      Snd.reveal();
    }
  }
  if (v.phase === 'ended' && prev && prev.phase === 'playing') {
    if (v.winnerIds && v.winnerIds.includes(me)) Snd.winJingle(); else Snd.lose();
  }

  /* dòng trạng thái */
  const mName = MISSIONS[v.mission - 1] ? MISSIONS[v.mission - 1].name : '';
  $('#rs-mission').textContent = v.phase === 'ended'
    ? '🏁 Trận đã kết thúc'
    : `🎯 Nhiệm vụ ${v.mission}/5 · ${mName}`;
  $('#rs-score').textContent = `🛡️ ${v.winsRes} · ${v.winsSpy} 🕵️`;
  $('#rs-role').innerHTML = roleHtml(v, ctrl);
  $('#rs-players').innerHTML = v.players.map(p => {
    const isLeader = p.id === v.leader && v.phase === 'playing';
    const onTeam = p.onTeam;
    const pickable = v.stage === 'propose' && ctrl === v.leader && v.phase === 'playing';
    const isPicked = picked.has(p.id);
    let st = '';
    if (isLeader) st += ' 👑';
    if (onTeam) st += ' 🎯';
    if (v.stage === 'vote' && p.voted) st += p.vote === 'approve' ? ' ✅' : ' ❌';
    if (v.stage === 'mission' && p.acted) st += ' ✓';
    if (p.isBot) st += ' 🤖';
    return `<div class="rs-player ${p.id === (ctrl || v.me) ? 'me' : ''} ${isLeader ? 'leader' : ''} ${onTeam ? 'on-team' : ''} ${pickable ? 'pickable' : ''} ${isPicked ? 'picked' : ''}" data-pid="${p.id}">${esc(cleanName(p.name))}${p.id === (ctrl || v.me) ? ' (bạn)' : ''}<span class="st">${st}</span></div>`;
  }).join('');

  $('#rs-team-area').innerHTML = teamAreaHtml(v, ctrl);
  $('#rs-log').innerHTML = logHtml(v);
  $('#rs-result').innerHTML = revealHtml(v);
  $('#rs-cover').innerHTML = coverHtml(v);

  /* nút hành động */
  const isLeader = v.stage === 'propose' && ctrl === v.leader;
  $('#btn-propose').style.display = (isLeader && v.phase === 'playing') ? '' : 'none';
  $('#btn-propose').disabled = picked.size !== v.teamSize;
  const voted = v.stage === 'vote' && ctrl && v.players.find(p => p.id === ctrl) && v.players.find(p => p.id === ctrl).vote == null;
  $('#btn-approve').style.display = (voted && v.phase === 'playing') ? '' : 'none';
  $('#btn-reject').style.display = (voted && v.phase === 'playing') ? '' : 'none';
  const onTeam = v.stage === 'mission' && ctrl && v.current && v.current.team.includes(ctrl) && !v.current.myAction;
  $('#btn-success').style.display = (onTeam && v.phase === 'playing') ? '' : 'none';
  const meSide = v.players.find(p => p.id === ctrl);
  $('#btn-fail').style.display = (onTeam && v.phase === 'playing' && meSide && meSide.side === 'spy') ? '' : 'none';
  $('#btn-next').style.display = (v.stage === 'reveal' && ctrl && v.phase === 'playing') ? '' : 'none';
  $('#btn-resign').style.display = v.phase === 'playing' ? '' : 'none';
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  const title = v.winner === 'resistance' ? '🛡️ Kháng chiến thắng!' : '🕵️ Gián điệp thắng!';
  /* tiêu đề "Trận hòa!" CHỈ khi endReason === 'draw' — The Resistance không bao giờ hòa */
  const h = v.endReason === 'draw' ? '🤝 Trận hòa!' : title;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const side = q.side === 'spy' ? '🕵️ Gián điệp' : '🛡️ Kháng chiến';
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))} — ${side} · ${q.missionsPlayed || 0} nhiệm vụ trong đội · ${q.votesCorrect || 0} phiếu đúng${q.missionsFailed ? ` · ${q.missionsFailed} lần phá nhiệm vụ` : ''}</div>`;
  }).join('');
  const reason = v.endReason === 'rejects' ? '5 lần từ chối liên tiếp — Gián điệp thắng.'
    : v.endReason === 'resign' ? 'Có người xin thua — cả phe đầu hàng.'
    : `Phe ${v.winner === 'resistance' ? 'Kháng chiến' : 'Gián điệp'} thắng 3 nhiệm vụ.`;
  ui.openModal(`<h2>${h}</h2><p>${won ? '🎉 Bạn thắng ván này!' : '😢 Phe của bạn thua ván này.'} ${reason}</p><p>Kháng chiến ${v.winsRes} – ${v.winsSpy} Gián điệp.</p><div>${rows}</div><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
}

/* ---------- tương tác ---------- */
$('#rs-cover').addEventListener('click', e => {
  if (e.target.closest('#btn-cover-ok')) { pvpCover = false; Snd.pick(); render(cur, cur); }
});
$('#rs-players').addEventListener('click', e => {
  const card = e.target.closest('.rs-player[data-pid]');
  if (!card || !cur || cur.phase !== 'playing') return;
  if (!(cur.stage === 'propose' && controlPid(cur) === cur.leader)) return;
  const pid = card.dataset.pid;
  if (picked.has(pid)) picked.delete(pid);
  else if (picked.size < cur.teamSize) picked.add(pid);
  else { tip(`Đội nhiệm vụ ${cur.mission} chỉ cần ${cur.teamSize} người.`); return; }
  Snd.pick();
  render(cur, cur);
});
$('#btn-propose').onclick = async () => {
  const pid = controlPid(cur); if (!pid || !cur) return;
  if (picked.size !== cur.teamSize) { tip(`Chọn đủ ${cur.teamSize} người đã.`); return; }
  const r = await ui.actAs(pid, { type: 'propose', team: [...picked] });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không đề cử được.'); } else { picked = new Set(); Snd.pick(); }
};
$('#btn-approve').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'vote', choice: 'approve' });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không bỏ phiếu được.'); } else Snd.pick();
};
$('#btn-reject').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'vote', choice: 'reject' });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không bỏ phiếu được.'); } else Snd.pick();
};
$('#btn-success').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'action', choice: 'success' });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không chọn được.'); } else Snd.pick();
};
$('#btn-fail').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'action', choice: 'fail' });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không chọn được.'); } else Snd.pick();
};
$('#btn-next').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'next' });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Chưa sang được.'); } else Snd.pick();
};
$('#btn-resign').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await confirmBox('Xin thua = đầu hàng cả phe: phe của bạn thua ngay, phe còn lại thắng. Chắc chắn xin thua?', { title: '🏳️ Xin thua?', ok: 'Xin thua', cancel: 'Ở lại', danger: true });
  if (!r) return;
  const rr = await ui.actAs(pid, { type: 'resign' });
  if (rr && rr.ok === false) tip(rr.reason || 'Không xin thua được.');
};
$('#btn-again').onclick = () => { location.reload(); };
