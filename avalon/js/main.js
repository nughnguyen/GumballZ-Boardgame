// ⚔️ Avalon – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Mật Thư: chủ phòng giữ state, khách
// chỉ gửi action {type, ...}). Vai trò bí mật: mỗi người chỉ xem được vai
// của mình (bấm 👁), bỏ phiếu và chọn Thành công/Thất bại đều làm lần lượt
// qua màn che để chơi chuyền tay không lộ.
import { createGame, applyAction, viewFor, actors, ROLE_INFO } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=50';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=12';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'avalon', min: 5, max: 10, maxSeats: 10, allowLocal: true,
  minMsg: 'Avalon cần 5–10 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { timer: 0 },
  optOk: (k, v) => k === 'timer' && [0, 60, 120].includes(+v),
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 900 + Math.random() * 1200,
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
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? '🤖 Bắt đầu chơi với máy Dễ' : '🧠 Bắt đầu chơi với máy Khó';
  try { localStorage.setItem('gumballz-avalon-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try {
  const sm = localStorage.getItem('gumballz-avalon-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/10 người (cần 5–10)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Thủ lĩnh đầu tiên</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 10
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  const o = info.opts || {}, dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>⏱️ Đồng hồ đi (mỗi pha)</b><div class="seg">${[[0, 'Tắt'], [60, '60 giây'], [120, '120 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${+o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ thì lượt tự chuyển: thủ lĩnh tự chọn đội ngẫu nhiên, phiếu chưa bỏ thì tính Thuận, nhiệm vụ chưa chọn thì Thiện tự Thành công / Ác tự Thất bại, Sát thủ đoán bừa 1 người phe Thiện.</small></div>
  <div class="opt"><b>🎭 Chia vai</b><div class="role-note">Vai trò chia ngẫu nhiên khi bắt đầu: 5 người: Merlin, Percival, Hiệp sĩ — Sát thủ, Morgana · 6 người: + Mordred · 7 người: + Oberon · 8–9 người: + Hiệp sĩ · 10 người: + Tay sai Mordred. Mỗi người chỉ xem được vai của mình (bấm 👁 Xem vai trò trong ván).</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 5 || n > 10;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = n < 5 ? `Cần ít nhất 5 người mới bắt đầu (đang có ${n}).` : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó cầm. Nhớ che vai trò trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
  else if (b.dataset.timer && ui.isHost) h.setOpt('timer', +b.dataset.timer);
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

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
    if (!s || s.phase === 'ended') return;
    /* hết giờ: tự hành động cho mọi người mình điều khiển còn chờ */
    const acts = actors(s);
    for (const pid of acts) {
      if (!ui.controls(pid)) continue;
      const p = s.players.find(x => x.id === pid);
      if (!p) continue;
      if (s.phase === 'propose') {
        const size = s.questSizes[s.questNo];
        const team = s.players.map(x => x.id).sort(() => Math.random() - 0.5).slice(0, size);
        ui.actAs(pid, { type: 'propose', team });
      } else if (s.phase === 'vote') {
        ui.actAs(pid, { type: 'vote', approve: true });
      } else if (s.phase === 'quest') {
        ui.actAs(pid, { type: 'quest', choice: p.side === 'good' ? 'success' : 'fail' });
      } else if (s.phase === 'assassin') {
        const good = s.players.filter(x => x.side === 'good');
        if (good.length) ui.actAs(pid, { type: 'assassin', target: good[Math.floor(Math.random() * good.length)].id });
      }
    }
    tip('Hết giờ — lượt tự chuyển.');
  }, 1000);
}

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null;
let selTeam = []; /* đội đang chọn (thủ lĩnh) */
let voteRevealed = null, questRevealed = null, assassinTarget = null, assassinRevealed = false, assassinTargetsNow = [], assassinActorNow = null;
let roleShown = false, peekPid = null;
let lastPhase = '', lastQuestNo = -1, lastQuestResult = '';

const roleLabel = r => r ? `${ROLE_INFO[r].icon} ${ROLE_INFO[r].name}` : '';
const sideLabel = s => s === 'good' ? '🛡️ phe Thiện' : s === 'evil' ? '😈 phe Ác' : '';
function myLocalPlayers(v) {
  return v.players.filter(p => ui.controls(p.id) && !p.isBot);
}
function resetFlowState(v, prev) {
  /* Đổi ván mới nhận biết qua gid (createGame sinh gid ngẫu nhiên mỗi ván).
     KHÔNG dùng v.seq === 0: seq vẫn = 0 từ lúc bắt đầu ván tới hành động đầu
     tiên, nên điều kiện đó reset roleShown/selTeam ở MỌI lần render đầu ván
     và làm nút 👁 xem vai trò không bao giờ hiện thẻ vai. */
  const changed = !prev || v.gid !== prev.gid || v.phase !== prev.phase || v.questNo !== prev.questNo;
  if (changed) { selTeam = []; voteRevealed = null; questRevealed = null; assassinTarget = null; assassinRevealed = false; assassinTargetsNow = []; assassinActorNow = null; roleShown = false; }
}

/* Thông tin Sát thủ từ raw state (chỉ host/chuyền tay mới có): id + danh
   sách mục tiêu được đoán (mọi người trừ mình và phe Ác mình đã biết). */
function assassinInfo() {
  const s = ui.net && ui.net.raw && ui.net.raw.state;
  if (!s || !s.players) return null;
  const a = s.players.find(p => p.role === 'assassin');
  if (!a) return null;
  const knownEvil = s.players.filter(p => p.side === 'evil' && p.id !== a.id && p.role !== 'oberon').map(p => p.id);
  const targets = s.players.filter(p => p.id !== a.id && !knownEvil.includes(p.id)).map(p => p.id);
  return { id: a.id, targets };
}

function roleCardHTML(v) {
  const pid = peekPid || v.me;
  const p = v.players.find(x => x.id === pid);
  if (!p || !v.myRole || pid !== v.me && !ui.controls(pid)) return '';
  /* vai trò chỉ lấy từ view của chính người đó: myRole/mySide/knownEvil chỉ
     đúng cho v.me; khi xem hộ người cùng máy thì dùng raw state (chỉ host
     cùng máy mới có) */
  let role = v.myRole, side = v.mySide, known = v.knownEvil, cands = v.merlinCandidates;
  if (pid !== v.me) {
    const s = ui.net && ui.net.raw && ui.net.raw.state;
    const pp = s && s.players.find(x => x.id === pid);
    if (!pp) return '';
    role = pp.role; side = pp.side;
    const evil = s.players.filter(x => x.side === 'evil');
    if (role === 'merlin') known = evil.filter(x => x.role !== 'mordred').map(x => x.id);
    else if (role === 'percival') cands = s.players.filter(x => x.role === 'merlin' || x.role === 'morgana').map(x => x.id);
    else if (side === 'evil' && role !== 'oberon') known = evil.filter(x => x.id !== pid && x.role !== 'oberon').map(x => x.id);
    else known = [];
  }
  const info = ROLE_INFO[role];
  const nm = id => { const x = v.players.find(y => y.id === id); return x ? esc(cleanName(x.name)) : '?'; };
  let knowHTML = '';
  if (role === 'merlin') knowHTML = `<div class="know">🧙 Bạn thấy phe Ác (trừ Mordred): <b>${known.map(nm).join(', ') || '—'}</b></div>`;
  else if (role === 'percival') knowHTML = `<div class="know">🛡️ Một trong 2 người này là Merlin, một là Morgana: <b>${cands.map(nm).join(', ')}</b></div>`;
  else if (side === 'evil' && role !== 'oberon' && known.length) knowHTML = `<div class="know">😈 Đồng bọn phe Ác của bạn (trừ Oberon): <b>${known.map(nm).join(', ')}</b></div>`;
  else if (side === 'evil' && role === 'oberon') knowHTML = `<div class="know">👤 Bạn không biết ai — và không ai biết bạn.</div>`;
  else knowHTML = `<div class="know">⚔️ Bạn không biết thêm gì — hãy tin vào lá phiếu của mình.</div>`;
  return `<div class="ric">${info.icon}</div><h3>${esc(cleanName(p.name))} — ${info.name}</h3>
    <div class="rside ${side}">${sideLabel(side)}</div>
    <p>${info.desc}</p>${knowHTML}
    <div class="btn-row" style="display:flex;gap:8px;justify-content:center;margin-top:10px"><button class="btn" id="btn-hide-role">🙈 Che lại</button></div>`;
}

function render(v, prev) {
  cur = v;
  if (!v) { endShownGid = null; roleShown = false; peekPid = null; stopTimer(); timerKey = ''; lastPhase = ''; return; }
  resetFlowState(v, prev);
  /* âm thanh theo diễn biến */
  if (prev && v.seq !== prev.seq) {
    if (v.phase !== prev.phase) {
      if (v.phase === 'vote') Snd.propose();
      else if (v.phase === 'quest') Snd.vote();
      else if (v.phase === 'assassin') Snd.assassin();
    }
    const q = v.quests[v.questNo];
    if (q && q.result && q.result !== lastQuestResult) {
      lastQuestResult = q.result;
      if (q.result === 'success') Snd.success(); else Snd.fail();
    }
  }
  if (v.phase !== lastPhase || v.questNo !== lastQuestNo) { lastPhase = v.phase; lastQuestNo = v.questNo; lastQuestResult = ''; }
  /* đồng hồ đi */
  const tKey = v.gid + ':' + v.phase + ':' + v.questNo + ':' + v.rejects;
  if (v.timer && v.phase !== 'ended') {
    if (tKey !== timerKey) {
      timerKey = tKey;
      const rs = ui.net && ui.net.raw && ui.net.raw.state;
      const acts = rs ? actors(rs) : [];
      const mine = rs && acts.find(id => { const p = (rs.players || []).find(x => x.id === id); return ui.controls(id) && p && !p.isBot; });
      if (mine) startTimer(v); else stopTimer();
    }
  } else { stopTimer(); timerKey = ''; }
  const timerChip = v.timer && v.phase !== 'ended' ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${timerLeft}</b>s</span>` : '';
  /* dãy 5 nhiệm vụ */
  $('#quests').innerHTML = v.quests.map((q, i) => {
    const cls = ['quest'];
    if (i === v.questNo && v.phase !== 'ended') cls.push('cur');
    if (q.result === 'success') cls.push('ok');
    else if (q.result === 'fail') cls.push('bad');
    return `<div class="${cls.join(' ')}"><div class="qn">NHIỆM VỤ ${i + 1}</div><div class="qs">${q.size} người</div><div class="qf">${q.failsNeeded > 1 ? 'cần 2 lần thất bại mới hỏng' : q.result === 'fail' ? q.fails + ' lần thất bại' : q.result === 'success' ? 'thành công' : 'chưa làm'}</div></div>`;
  }).join('');
  /* dòng trạng thái */
  const leadName = esc(cleanName(v.leaderName || ''));
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.endReason === 'assassin' ? `🗡️ Sát thủ đoán đúng Merlin — 🏆 ${sideLabel(v.winner)} thắng!`
      : v.endReason === 'assassin-wrong' ? `🗡️ Sát thủ đoán sai Merlin — 🏆 ${sideLabel(v.winner)} thắng!`
      : v.endReason === 'rejects' ? `🗳️ 5 lần đề xuất bị bác liên tiếp — 🏆 ${sideLabel(v.winner)} thắng!`
      : v.endReason === 'resign' ? `🏳️ ${sideLabel(v.winner)} thắng — đối thủ xin thua!`
      : `🏆 ${sideLabel(v.winner)} thắng ${v.goodWins}–${v.evilWins} nhiệm vụ!`)
    : v.phase === 'propose' ? `👑 Nhiệm vụ ${v.questNo + 1} (${v.questSizes[v.questNo]} người) · ${leadName} đang chọn đội…${timerChip}`
    : v.phase === 'vote' ? `🗳️ Nhiệm vụ ${v.questNo + 1} · đang bỏ phiếu (${v.votedIds.length}/${v.players.length})…${timerChip}`
    : v.phase === 'quest' ? `⚔️ Nhiệm vụ ${v.questNo + 1} · đội đang chọn Thành công/Thất bại (${v.pickedIds.length}/${(v.proposal || {}).team ? v.proposal.team.length : 0})…${timerChip}`
    : `🗡️ Phe Thiện thắng 3 nhiệm vụ — Sát thủ đang đoán Merlin…${timerChip}`;
  /* thanh xem vai trò */
  const locals = myLocalPlayers(v);
  const rb = $('#role-bar');
  if (v.phase !== 'ended') {
    rb.style.display = '';
    if (locals.length > 1) {
      $('#role-note').innerHTML = `Chơi chuyền tay: chọn người rồi bấm 👁 — xem xong nhớ che lại! <select id="peek-sel">${locals.map(p => `<option value="${p.id}" ${p.id === (peekPid || v.me) ? 'selected' : ''}>${esc(cleanName(p.name))}</option>`).join('')}</select>`;
    } else {
      $('#role-note').textContent = 'Chỉ mình bạn thấy vai này — chơi chuyền tay nhớ che lại trước khi đưa máy!';
    }
  } else rb.style.display = 'none';
  const rc = $('#role-card');
  if (roleShown && v.phase !== 'ended') { rc.style.display = ''; rc.innerHTML = roleCardHTML(v); }
  else { rc.style.display = 'none'; rc.innerHTML = ''; }
  /* ghế người chơi */
  const leaderId = v.leader;
  const inTeam = v.proposal ? v.proposal.team : [];
  $('#seats').innerHTML = v.players.map((p, i) => {
    const isLeader = p.id === leaderId;
    const sel = selTeam.includes(p.id);
    const voted = v.votedIds.includes(p.id);
    const picked = v.pickedIds.includes(p.id);
    const inProp = inTeam.includes(p.id);
    const cls = ['seat'];
    if (isLeader) cls.push('leader');
    if (sel) cls.push('sel');
    if (isLeader && v.phase !== 'ended') cls.push('on');
    return `<div class="${cls.join(' ')}" data-id="${p.id}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
      ${isLeader ? '<span class="crown" title="Thủ lĩnh">👑</span>' : ''}
      ${v.phase === 'vote' && voted ? '<span class="voted">✓ đã bỏ phiếu</span>' : ''}
      ${v.phase === 'quest' && inProp && picked ? '<span class="picked">✓ đã chọn</span>' : ''}
      ${v.phase === 'quest' && inProp && !picked ? '<span class="picked" style="color:#b3232a">… đang chọn</span>' : ''}
      <small>${p.isBot ? 'máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? 'cùng máy' : ''}</small></div>`;
  }).join('');
  /* panel chọn đội (thủ lĩnh là mình) */
  const pp = $('#propose-panel');
  const iAmLeader = v.phase === 'propose' && ui.controls(leaderId);
  if (iAmLeader) {
    pp.style.display = '';
    $('#propose-title').textContent = `👑 Bạn là thủ lĩnh — chọn đội nhiệm vụ ${v.questNo + 1}`;
    $('#propose-sub').textContent = `Bấm vào ghế người chơi để chọn đúng ${v.questSizes[v.questNo]} người (đã chọn ${selTeam.length}/${v.questSizes[v.questNo]}).`;
    const btn = $('#btn-propose');
    btn.disabled = selTeam.length !== v.questSizes[v.questNo];
    btn.textContent = `📨 Đề xuất đội (${selTeam.length}/${v.questSizes[v.questNo]})`;
  } else pp.style.display = 'none';
  /* panel bỏ phiếu (màn che lần lượt) */
  const vp = $('#vote-panel');
  if (v.phase === 'vote') {
    vp.style.display = '';
    const pending = v.players.filter(p => !v.votedIds.includes(p.id) && ui.controls(p.id) && !p.isBot);
    $('#vote-sub').textContent = `Đội đề xuất: ${inTeam.map(id => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : '?'; }).join(', ')} — đã bỏ ${v.votedIds.length}/${v.players.length} phiếu.`;
    const body = $('#vote-body');
    if (!pending.length) {
      body.innerHTML = `<p style="text-align:center;font-weight:700">⏳ Đang chờ mọi người bỏ phiếu xong…</p>`;
    } else {
      const cur_ = voteRevealed && pending.some(p => p.id === voteRevealed) ? voteRevealed : null;
      if (!cur_) {
        body.innerHTML = `<div class="cover"><div class="who">👤 Tới lượt bỏ phiếu: ${pending.map(p => esc(cleanName(p.name))).join(', ')}</div><div class="warn">Người khác quay đi — chỉ người bỏ phiếu được nhìn màn hình!</div>${pending.map(p => `<button class="btn" data-voter="${p.id}">Tôi là ${esc(cleanName(p.name))} — hiện nút bỏ phiếu</button>`).join(' ')}</div>`;
      } else {
        const p = v.players.find(x => x.id === cur_);
        body.innerHTML = `<div class="cover"><div class="who">👤 ${esc(cleanName(p.name))} — bạn bỏ phiếu cho đội này?</div><div class="vote-btns"><button class="btn yes" data-vote="1">👍 Thuận</button><button class="btn no" data-vote="0">👎 Chống</button></div><div style="margin-top:8px"><button class="btn" id="btn-vote-back">← Không phải tôi</button></div></div>`;
      }
    }
  } else vp.style.display = 'none';
  /* panel làm nhiệm vụ (màn che lần lượt) */
  const qp = $('#quest-panel');
  if (v.phase === 'quest') {
    qp.style.display = '';
    const pending = inTeam.filter(id => !v.pickedIds.includes(id)).map(id => v.players.find(x => x.id === id)).filter(p => p && ui.controls(p.id) && !p.isBot);
    $('#quest-sub').textContent = `Đội nhiệm vụ ${v.questNo + 1}: ${inTeam.map(id => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : '?'; }).join(', ')} — đã chọn ${v.pickedIds.length}/${inTeam.length}. Nhiệm vụ hỏng khi có ${v.failsNeeded[v.questNo]} lần thất bại trở lên.`;
    const body = $('#quest-body');
    if (!pending.length) {
      body.innerHTML = `<p style="text-align:center;font-weight:700">⏳ Đang chờ thành viên trong đội chọn xong…</p>`;
    } else {
      const cur_ = questRevealed && pending.some(p => p.id === questRevealed) ? questRevealed : null;
      if (!cur_) {
        body.innerHTML = `<div class="cover"><div class="who">👤 Tới lượt chọn: ${pending.map(p => esc(cleanName(p.name))).join(', ')}</div><div class="warn">Người khác quay đi — lựa chọn của bạn là bí mật!</div>${pending.map(p => `<button class="btn" data-picker="${p.id}">Tôi là ${esc(cleanName(p.name))} — hiện nút chọn</button>`).join(' ')}</div>`;
      } else {
        const p = v.players.find(x => x.id === cur_);
        body.innerHTML = `<div class="cover"><div class="who">👤 ${esc(cleanName(p.name))} — bạn chọn gì cho nhiệm vụ này?</div><div class="vote-btns"><button class="btn yes" data-quest="success">✅ Thành công</button><button class="btn no" data-quest="fail">❌ Thất bại</button></div><div style="margin-top:8px"><button class="btn" id="btn-quest-back">← Không phải tôi</button></div></div>`;
      }
    }
  } else qp.style.display = 'none';
  /* panel ám sát */
  const ap = $('#assassin-panel');
  if (v.phase === 'assassin') {
    ap.style.display = '';
    const body = $('#assassin-body');
    const pvp = v.players.filter(p => p.local && !p.isBot).length > 1;
    const ai = pvp ? assassinInfo() : null; /* {id, targets} từ raw state (chuyền tay) */
    const pickerHTML = () => `<div class="cover"><div class="who">🗡️ Bạn là Sát thủ — bấm vào ghế 1 người để chọn, rồi bấm Xác nhận.</div><div class="btn-row" style="display:flex;gap:8px;justify-content:center;margin-top:10px"><button class="btn big pri" id="btn-assassin-go" ${assassinTarget ? '' : 'disabled'}>🗡️ Đoán ${assassinTarget ? esc(cleanName((v.players.find(x => x.id === assassinTarget) || {}).name || '')) + ' là Merlin' : '…chọn 1 người ở ghế trên'}</button></div></div>`;
    if (!pvp && v.iAmAssassin) {
      /* online, chính mình là Sát thủ: chọn thẳng */
      assassinTargetsNow = v.assassinTargets || [];
      assassinActorNow = v.me;
      body.innerHTML = pickerHTML();
    } else if (pvp && ai) {
      /* chuyền tay: màn che — người khác quay đi, chỉ Sát thủ được nhìn */
      if (!assassinRevealed) {
        body.innerHTML = `<div class="cover"><div class="who">🗡️ Tới lượt Sát thủ đoán Merlin.</div><div class="warn">Người khác quay đi — chỉ Sát thủ được nhìn màn hình!</div><button class="btn big" id="btn-assassin-reveal">🗡️ Tôi là Sát thủ — hiện nút đoán</button></div>`;
      } else {
        assassinTargetsNow = ai.targets;
        assassinActorNow = ai.id;
        body.innerHTML = pickerHTML();
      }
    } else {
      /* không hiện tên Sát thủ — người khác không được biết ai là Sát thủ */
      body.innerHTML = `<p style="text-align:center;font-weight:700">⏳ Sát thủ đang đoán xem ai là Merlin…</p>`;
    }
  } else ap.style.display = 'none';
  /* nhật ký */
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có gì.</div>';
  /* kết thúc: hộp thoại (1 lần / ván) */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = (v.winnerIds || []).includes(v.me);
    if (won) Snd.winJingle(); else Snd.lose();
    let reason = '';
    if (v.endReason === 'assassin') reason = 'Sát thủ đoán đúng Merlin — phe Ác lật kèo thắng!';
    else if (v.endReason === 'assassin-wrong') reason = 'Sát thủ đoán sai Merlin — phe Thiện thắng!';
    else if (v.endReason === 'rejects') reason = '5 lần đề xuất liên tiếp bị bác — phe Ác thắng!';
    else if (v.endReason === 'resign') reason = won ? 'Đối thủ xin thua — phe bạn thắng!' : 'Phe bạn xin thua.';
    else reason = won ? `Phe bạn thắng ${v.goodWins}–${v.evilWins} nhiệm vụ!` : `Phe đối thủ thắng ${v.evilWins}–${v.goodWins} nhiệm vụ.`;
    const reveal = v.roles ? `<div class="reveal-grid">${v.players.map(p => {
      const r = v.roles[p.id], s = v.sides[p.id];
      return `<div class="rv ${s}">${ROLE_INFO[r].icon} <b>${esc(cleanName(p.name))}</b> — ${ROLE_INFO[r].name} (${s === 'good' ? 'Thiện' : 'Ác'})${p.id === v.me ? ' · bạn' : ''}</div>`;
    }).join('')}</div>` : '';
    ui.openModal(`<h2>${won ? '🏆 Phe bạn thắng!' : '🏆 ' + sideLabel(v.winner) + ' thắng!'}</h2>
      <p style="text-align:center">${reason}</p>
      <div class="bigscore" style="text-align:center;font-family:'Baloo 2',sans-serif;font-size:30px;font-weight:800">🛡️ ${v.goodWins} – ${v.evilWins} 😈</div>
      <p style="text-align:center;font-weight:700">Lộ bài — vai trò mọi người:</p>${reveal}
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

/* ---------- bấm ghế: chọn đội (thủ lĩnh) / chọn mục tiêu ám sát ---------- */
$('#seats').addEventListener('click', e => {
  const seat = e.target.closest('.seat');
  if (!seat || !cur) return;
  const id = seat.dataset.id;
  if (cur.phase === 'propose' && ui.controls(cur.leader)) {
    const i = selTeam.indexOf(id);
    if (i >= 0) selTeam.splice(i, 1);
    else {
      if (selTeam.length >= cur.questSizes[cur.questNo]) { Snd.invalid(); tip(`Nhiệm vụ ${cur.questNo + 1} chỉ cần ${cur.questSizes[cur.questNo]} người.`); return; }
      selTeam.push(id);
    }
    Snd.pick();
    render(cur, cur);
    return;
  }
  if (cur.phase === 'assassin') {
    const p = cur.players.find(x => x.id === id);
    if (!p || !assassinTargetsNow.includes(id)) { Snd.invalid(); tip('Sát thủ chỉ đoán người mà mình chưa biết là Ác.'); return; }
    assassinTarget = id;
    Snd.pick();
    render(cur, cur);
  }
});

/* ---------- các nút trong panel ---------- */
$('#btn-propose').onclick = () => {
  const v = cur;
  if (!v || v.phase !== 'propose') return;
  if (selTeam.length !== v.questSizes[v.questNo]) return;
  ui.actAs(v.leader, { type: 'propose', team: selTeam.slice() });
  Snd.propose();
};
$('#vote-body').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !cur) return;
  if (b.dataset.voter) { voteRevealed = b.dataset.voter; Snd.pick(); render(cur, cur); return; }
  if (b.id === 'btn-vote-back') { voteRevealed = null; render(cur, cur); return; }
  if (b.dataset.vote !== undefined && voteRevealed) {
    ui.actAs(voteRevealed, { type: 'vote', approve: b.dataset.vote === '1' });
    Snd.vote();
    voteRevealed = null;
  }
});
$('#quest-body').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !cur) return;
  if (b.dataset.picker) { questRevealed = b.dataset.picker; Snd.pick(); render(cur, cur); return; }
  if (b.id === 'btn-quest-back') { questRevealed = null; render(cur, cur); return; }
  if (b.dataset.quest && questRevealed) {
    ui.actAs(questRevealed, { type: 'quest', choice: b.dataset.quest });
    Snd.pick();
    questRevealed = null;
  }
});
$('#assassin-body').addEventListener('click', e => {
  if (e.target.closest('#btn-assassin-reveal')) { assassinRevealed = true; Snd.pick(); render(cur, cur); return; }
  const b = e.target.closest('#btn-assassin-go'); if (!b || !cur || !assassinTarget || !assassinActorNow) return;
  ui.actAs(assassinActorNow, { type: 'assassin', target: assassinTarget });
  Snd.assassin();
});

/* ---------- xem vai trò ---------- */
$('#btn-role').onclick = () => {
  if (!cur) return;
  if (!peekPid) peekPid = cur.me;
  roleShown = !roleShown;
  render(cur, cur);
};
$('#role-bar').addEventListener('change', e => {
  if (e.target.id === 'peek-sel') { peekPid = e.target.value; roleShown = true; render(cur, cur); }
});
$('#role-card').addEventListener('click', e => {
  if (e.target.closest('#btn-hide-role')) { roleShown = false; render(cur, cur); }
});

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
  const r = await confirmBox('Nhận thua ván này? Phe của bạn thua luôn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = peekPid || v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'avalon', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + 4 máy = 5 người (chủ phòng thêm máy trong phòng chờ nếu muốn đông hơn) */
      for (let i = 0; i < 4; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
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
