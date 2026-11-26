// 🌈 Wavelength – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Đoán Hành Động:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi trên giao diện: Nhà ngoại cảm bấm "Xem vị trí bí mật" rồi
// gõ gợi ý; người đoán bấm vào thang đo để đặt mốc rồi bấm "Chốt mốc".
// Chơi cùng máy: chuyền máy cho nhau, có màn che khi đổi người cầm máy
// để không lộ vị trí bí mật.
import { createGame, applyAction, viewFor, actors, serialize, deserialize, SOLO_ROUNDS, SOLO_WIN_POINTS, WIN_POINTS } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'wavelength', min: 1, max: 6, maxSeats: 6, allowLocal: true,
  minMsg: 'Wavelength cần 1–6 người: chơi đơn, thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: (k, v) => k === 'firstIdx' && Number.isInteger(v) && v >= 0, /* chỉ để chủ phòng đẩy ghế đi đầu ván tới cho phòng chờ */
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy hành động nhanh: đặt mốc/chốt/gợi ý sau 1.2–3s */
  botDelay: () => 1200 + Math.random() * 1800,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | ai-easy | ai-hard | pvp | online */
let playerCount = 4; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-wavelength-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
function toggleBox(id) {
  for (const b of ['bot-row', 'room-box', 'local-row']) {
    const el = document.getElementById(b);
    if (el) el.style.display = b === id ? (el.style.display === 'none' ? '' : 'none') : 'none';
  }
}
$('#btn-solo').onclick = () => { mode = 'solo'; ui.startHost(true); };
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  playerCount = +($('#sel-players').value || 4);
  try { localStorage.setItem('gumballz-wavelength-count', String(playerCount)); } catch (e) {}
  mode = $('#sel-level').value === 'easy' ? 'ai-easy' : 'ai-hard';
  ui.startHost(true);
};
$('#btn-start-local').onclick = () => { mode = 'pvp'; ui.startHost(true); };

/* ---------- phòng chờ ---------- */
/* xoay người đi đầu qua các ván: ghế đi đầu ván trước được nhớ (localStorage
   để sống qua cả tải lại trang); ván sau là ghế sau đó, ván đầu thì engine
   bốc thăm theo seed. Chủ phòng đẩy ghế đi đầu ván tới lên opts để mọi máy
   trong phòng chờ đều thấy cùng 1 người. */
const FIRST_KEY = 'gumballz-wavelength-firstidx';
let lobbyPlayers = [];
function readLastFirstIdx() {
  try { const v = +localStorage.getItem(FIRST_KEY); return Number.isInteger(v) && v >= 0 ? v : null; } catch (e) { return null; }
}
function saveLastFirstIdx(i) {
  try { localStorage.setItem(FIRST_KEY, String(i)); } catch (e) {}
}
function nextFirstIdx(n) {
  if (!n || n < 1) return null;
  const last = readLastFirstIdx();
  return last == null ? null : (last + 1) % n;
}
function publishNextFirstIdx(info, u) {
  if (!u.isHost || !u.net || !u.net.raw) return;
  const next = nextFirstIdx((info.players || []).length);
  if (next != null && (!info.opts || info.opts.firstIdx !== next)) u.net.raw.setOpt('firstIdx', next);
}
function startGame() {
  const n = (cur && cur.players ? cur.players.length : 0) || lobbyPlayers.length;
  const next = nextFirstIdx(n);
  ui.net.raw.start(next == null ? undefined : { firstIdx: next });
}
/* toast công bố người đi đầu khi ván mới mở (mọi máy đều thấy) */
let announcedGid = '';
function announceFirst(v, prev) {
  if (!v || v.solo || v.phase !== 'playing') return;
  if (prev && prev.gid === v.gid) return;
  if (!prev && v.seq > 0) return; /* vào giữa ván thì không công bố lại */
  if (announcedGid === v.gid) return;
  announcedGid = v.gid;
  const p = v.players.find(x => x.id === v.psychic);
  if (!p) return;
  tip(p.id === v.me ? '🎯 Bạn làm Nhà ngoại cảm đầu tiên!' : `🎯 ${cleanName(p.name)} làm Nhà ngoại cảm đầu tiên!`);
}
function renderLobby(info, u) {
  const n = info.players.length;
  const need = mode === 'solo' ? 1 : 2;
  lobbyPlayers = info.players.slice();
  publishNextFirstIdx(info, u);
  const next = mode === 'solo' ? null
    : (info.opts && Number.isInteger(info.opts.firstIdx) && info.opts.firstIdx < n) ? info.opts.firstIdx
    : nextFirstIdx(n);
  $('#lobby-list').innerHTML = `<p><b>${n}/6 người</b> (cần ${need}–6)</p>` + info.players.map((p, i) => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${next != null && i === next ? '<span class="seat-role">🎯 Đi trước</span>' : ''}${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
  }).join('') + (next == null && mode !== 'solo' && n >= need ? `<p class="note">🎲 Nhà ngoại cảm đầu tiên sẽ bốc thăm ngẫu nhiên khi mở ván.</p>` : '') + (u.isHost && mode !== 'solo' && !mode.startsWith('ai-') && n < 6
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
    const hard = await confirmBox('Máy Khó đặt mốc sát hơn máy Dễ.', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau. Tới lượt ai thì đưa máy cho người đó!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => { if (ui.isHost) startGame(); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpTurn = null, pvpCover = false;
let specKey = '';
let clueDraft = '', clueAreaKey = '';

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
/* người chơi thật tiếp theo phải hành động (chuyền tay): Nhà ngoại cảm
   lúc đưa gợi ý, người đoán chưa chốt lúc đặt mốc, bất kỳ ai lúc lật bài */
function pendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  if (v.solo) {
    const p = v.players[0];
    return p && !p.isBot ? p : null;
  }
  if (v.stage === 'clue') {
    const p = v.players.find(x => x.id === v.psychic);
    return p && !p.isBot ? p : null;
  }
  if (v.stage === 'guess') {
    const cur = v.current;
    if (cur) {
      const locked = new Set(cur.markers.filter(m => m.locked).map(m => m.pid));
      const g = v.players.find(p => !p.isBot && p.id !== v.psychic && !locked.has(p.id) && !p.resigned);
      if (g) return g;
    }
    return null;
  }
  if (v.stage === 'reveal') {
    return v.players.find(p => !p.isBot && !p.resigned) || null;
  }
  return null;
}

/* ---------- thang đo ---------- */
function barHtml(v, ctrl, myPos, canPlace) {
  const ticks = [0, 25, 50, 75, 100].map(t =>
    `<span class="wl-tick" style="left:${t}%"></span><span class="wl-tick-lbl" style="left:${t}%">${t}</span>`).join('');
  let markers = '';
  if (v.current && v.current.markers) {
    for (const m of v.current.markers) {
      if (m.pos == null) continue;
      const cls = m.pid === ctrl ? (m.locked ? 'wl-marker me locked' : 'wl-marker me') : 'wl-marker other';
      markers += `<span class="${cls}" style="left:${m.pos}%" title="${esc(cleanName((v.players.find(p => p.id === m.pid) || {}).name || ''))}"></span>`;
    }
  }
  if (v.solo && v.soloSet && v.soloSet.picked != null) {
    markers += `<span class="wl-marker me${v.soloSet.locked ? ' locked' : ''}" style="left:${v.soloSet.picked}%"></span>`;
  }
  let target = '';
  if (v.current && v.current.revealed && v.current.target != null) {
    target = `<span class="wl-target" style="left:${v.current.target}%"></span>`;
  }
  if (v.solo && v.soloSet && v.soloSet.revealed && v.soloSet.target != null) {
    target = `<span class="wl-target" style="left:${v.soloSet.target}%"></span>`;
  }
  const posLine = myPos != null
    ? `<div class="wl-pos">Vị trí của bạn: <b id="wl-my-pos">${myPos}</b></div>`
    : canPlace
      ? `<div class="wl-pos">Bấm vào thang đo để đặt mốc</div>`
      : '';
  return `<div class="wl-bar" id="spectrum-bar" data-place="${canPlace ? '1' : '0'}">${ticks}${markers}${target}</div>${posLine}`;
}

function spectrumAreaHtml(v, ctrl) {
  if (v.solo) {
    const set = v.soloSet;
    if (!set) return '';
    const canPlace = v.stage === 'guess' && !set.locked;
    return `<div class="wl-spec"><div class="wl-ends"><span class="wl-left">◀ ${esc(set.left)}</span><span class="wl-right">${esc(set.right)} ▶</span></div>`
      + barHtml(v, ctrl, set.picked, canPlace) + `</div>`;
  }
  const cur = v.current;
  if (!cur) return '';
  const isGuesser = ctrl && ctrl !== cur.psychic;
  const myMark = isGuesser ? cur.markers.find(m => m.pid === ctrl) : null;
  const canPlace = v.stage === 'guess' && isGuesser && !(myMark && myMark.locked);
  const myPos = myMark ? myMark.pos : null;
  return `<div class="wl-spec"><div class="wl-ends"><span class="wl-left">◀ ${esc(cur.left)}</span><span class="wl-right">${esc(cur.right)} ▶</span></div>`
    + barHtml(v, ctrl, myPos, canPlace) + `</div>`;
}

function clueAreaHtml(v, ctrl) {
  if (v.solo) {
    const set = v.soloSet;
    if (!set) return '';
    return `<div class="wl-clue"><span class="lbl">💡 Gợi ý</span>"${esc(set.clue)}"</div>`;
  }
  const cur = v.current;
  if (!cur) return '';
  if (v.stage === 'clue') {
    const isPsychic = ctrl === cur.psychic;
    if (isPsychic) {
      if (!cur.shown) {
        return `<div class="wl-targetbox covered"><div class="lbl">🎯 Vị trí bí mật của bạn</div><div class="target">🙈 Đã che lại</div><p class="hint">Bấm "Xem vị trí bí mật" bên dưới để xem, rồi đưa gợi ý cho mọi người.</p></div>`;
      }
      return `<div class="wl-targetbox"><div class="lbl">🎯 Vị trí bí mật của bạn — chỉ mình bạn thấy!</div><div class="target">${cur.target}</div><p class="hint">Gõ 1 gợi ý ngắn chỉ tới vị trí này (0 = ${esc(cur.left)}, 100 = ${esc(cur.right)}).</p></div>
      <div class="wl-clue-row"><input id="wl-clue-input" type="text" placeholder="Gõ gợi ý… (VD: Nước sôi)" maxlength="60" autocomplete="off"><button class="btn primary" id="btn-send-clue">💡 Gửi gợi ý</button></div>`;
    }
    const psy = v.players.find(p => p.id === cur.psychic);
    return `<div class="wl-targetbox covered"><div class="lbl">🎯 Nhà ngoại cảm</div><div class="target">🤫 ${esc(cleanName(psy ? psy.name : '…'))} đang xem vị trí bí mật…</div></div>`;
  }
  if (cur.clue) {
    const psy = v.players.find(p => p.id === cur.psychic);
    return `<div class="wl-clue"><span class="lbl">💡 Gợi ý của ${esc(cleanName(psy ? psy.name : '…'))}</span>"${esc(cur.clue)}"</div>`;
  }
  return '';
}

function logHtml(v) {
  return '<div class="wl-game-log">' + v.log.slice().reverse().map(l => `<div class="lg ${l.kind || ''}">${esc(l.text)}</div>`).join('') + '</div>';
}

function revealHtml(v) {
  if (v.stage !== 'reveal' || !v.lastReveal) return '';
  const r = v.lastReveal;
  const psy = r.psychic ? v.players.find(p => p.id === r.psychic) : null;
  const marks = r.markers.map(m => {
    const p = v.players.find(x => x.id === m.pid);
    const cls = m.band === 4 ? 'm4' : m.band === 0 ? 'm0' : '';
    return `<div class="${cls}">${esc(cleanName(p ? p.name : '…'))}: mốc ${m.pos} — cách đích ${Math.abs(m.pos - r.target)} → <b>${m.band} điểm</b></div>`;
  }).join('');
  const bonus = psy && r.roundPoints[psy.id] ? ` Nhà ngoại cảm +${r.roundPoints[psy.id]} điểm thưởng.` : '';
  return `<div class="wl-reveal"><div class="lbl">Vị trí bí mật</div><div class="big-target">🎯 ${r.target} <span style="font-size:16px">(${esc(r.left)} ↔ ${esc(r.right)})</span></div><div class="res">Gợi ý: "${esc(r.clue || '')}"${bonus}</div><div class="marks">${marks}</div></div>`;
}

function coverHtml(v) {
  if (mode !== 'pvp' || !pvpCover || v.phase !== 'playing') return '';
  const p = pendingHuman(v);
  if (!p) return '';
  const hint = v.stage === 'clue' ? 'Tới lượt bạn làm Nhà ngoại cảm — bấm để xem vị trí bí mật rồi đưa gợi ý.'
    : v.stage === 'guess' ? 'Tới lượt bạn đặt mốc — bấm để xem thang đo (đừng nhìn vị trí bí mật!).'
    : 'Xem kết quả lật bài rồi bấm Tiếp theo.';
  return `<div class="wl-cover"><div class="wl-cover-card"><div class="wl-cover-icon">🙈</div><h3>Đưa máy cho ${esc(cleanName(p.name))}</h3><p>${hint}</p><button class="btn big primary" id="btn-cover-ok">Tôi là ${esc(cleanName(p.name))} — tiếp tục</button></div></div>`;
}

function render(v, prev) {
  cur = v;
  if (!v) { endShownFor = ''; return; }
  if (Number.isInteger(v.firstIdx)) saveLastFirstIdx(v.firstIdx);
  announceFirst(v, prev);
  const ctrl = controlPid(v);
  const me = v.me;

  /* thang đo mới → xóa nháp gợi ý */
  const sk = v.solo ? `solo|${v.soloSet ? v.soloSet.index : 0}` : `${v.gid}|${v.psychic}|${v.round}`;
  if (sk !== specKey) { specKey = sk; clueDraft = ''; }

  /* âm thanh theo thay đổi */
  if (prev && prev.phase === 'playing' && v.phase === 'playing') {
    if (v.stage === 'reveal' && prev.stage !== 'reveal') Snd.reveal();
    const mine = v.players.find(p => p.id === (myPid(v) || v.me));
    const prevMe = prev.players.find(p => p.id === (myPid(prev) || prev.me));
    if (mine && prevMe && mine.points > prevMe.points) Snd.correct();
  }
  if (v.phase === 'ended' && prev && prev.phase === 'playing') {
    if (v.winner === me) Snd.winJingle(); else if (v.winner) Snd.lose();
  }

  /* dòng trạng thái */
  const psy = !v.solo ? v.players.find(p => p.id === v.psychic) : null;
  $('#wl-round').textContent = v.phase === 'ended'
    ? '🏁 Trận đã kết thúc'
    : v.solo
      ? `🌈 Lượt ${v.soloSet ? v.soloSet.index : 0}/${SOLO_ROUNDS} · ${v.you.points}/40 điểm`
      : `🌈 Lượt ${v.round}/${v.rounds} · Nhà ngoại cảm: ${psy ? cleanName(psy.name) : '…'}`;
  $('#wl-players').innerHTML = v.players.map(p => {
    return `<div class="wl-player ${p.id === me ? 'me' : ''} ${!v.solo && v.psychic === p.id && v.phase === 'playing' ? 'psychic' : ''}">${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.resigned ? ' 🏳️' : ''}${!v.solo && v.psychic === p.id && v.phase === 'playing' ? ' 🎯' : ''} <span class="pts">${p.points}đ</span> · 4đ ×${p.fourCount}${!v.solo ? ` · ngoại cảm ${p.roundsAsPsychic}` : ''}</div>`;
  }).join('');

  $('#wl-spectrum-area').innerHTML = spectrumAreaHtml(v, ctrl);
  /* ô gợi ý: chỉ vẽ lại khi giai đoạn đổi (giữ nguyên input khi đang gõ) — chơi đơn phải kèm số lượt, không thì gợi ý kẹt ở lượt 1 (key 'solo' hằng số) */
  const ck = v.solo ? `solo|${v.soloSet ? v.soloSet.index : 0}` : `${v.stage}|${ctrl || ''}|${v.current ? v.current.shown : false}|${v.current ? !!v.current.clue : false}|${v.gid}`;
  if (ck !== clueAreaKey) {
    clueAreaKey = ck;
    $('#wl-clue-area').innerHTML = clueAreaHtml(v, ctrl);
    const input = $('#wl-clue-input');
    if (input && clueDraft) input.value = clueDraft;
  }
  $('#wl-log').innerHTML = logHtml(v);
  $('#wl-reveal').innerHTML = revealHtml(v);
  $('#wl-cover').innerHTML = coverHtml(v);

  /* nút hành động */
  const isPsychic = !v.solo && v.current && ctrl === v.current.psychic;
  $('#btn-ready').style.display = (!v.solo && v.stage === 'clue' && isPsychic && v.current && !v.current.shown) ? '' : 'none';
  let lockShow = false;
  if (v.stage === 'guess' && ctrl) {
    if (v.solo) lockShow = !!(v.soloSet && v.soloSet.picked != null && !v.soloSet.locked);
    else if (v.current) {
      const m = v.current.markers.find(x => x.pid === ctrl);
      lockShow = !!(m && !m.locked);
    }
  }
  $('#btn-lock').style.display = lockShow ? '' : 'none';
  const nextBtn = $('#btn-next');
  if (v.stage === 'reveal' && ctrl) {
    nextBtn.style.display = '';
    nextBtn.textContent = 'Tiếp theo ▶';
  } else if (!v.solo && v.stage === 'guess' && isPsychic && v.current && v.current.markers.length) {
    nextBtn.style.display = '';
    nextBtn.textContent = '🎯 Lật bài ngay';
  } else {
    nextBtn.style.display = 'none';
  }
  $('#btn-resign').style.display = v.phase === 'playing' ? '' : 'none';
}

/* ---------- hộp kết thúc ---------- */
function showEnd(v) {
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const rows = v.players.map(p => {
    const s = sum[p.id] || {};
    return `<tr><td>${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</td><td>${s.points ?? 0}</td><td>${s.exactCount ?? 0}</td><td>${s.guesses ?? 0}</td><td>${s.roundsAsPsychic ?? 0}</td></tr>`;
  }).join('');
  const title = v.winner === me ? '👑 Bạn thắng trận!' : v.winner ? `🏁 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name))} thắng trận!` : v.endReason === 'draw' ? '🤝 Trận hòa!' : '🏁 Trận đã kết thúc!';
  const sub = v.winner === me
    ? (v.solo ? `🎉 Bạn đạt ${sum[me].points}/40 điểm — thắng Wavelength!` : `🎉 Bạn thắng với ${sum[me].points} điểm!`)
    : v.solo
      ? `Bạn đạt ${sum[me].points}/40 điểm — cần từ ${SOLO_WIN_POINTS} điểm mới thắng.`
      : `Bạn giữ ${sum[me].points} điểm — ${v.endReason === 'resign' ? 'đã xin thua' : v.endReason === 'draw' ? 'hòa' : 'trận đã kết thúc'}.`;
  ui.openModal(`<h2>${title}</h2><p style="text-align:center">${sub}</p>
    <table class="end-table"><tr><th>Người chơi</th><th>Điểm</th><th>Lần 4 điểm</th><th>Lượt đoán</th><th>Làm ngoại cảm</th></tr>${rows}</table>
    <div class="btns"><button class="btn big pri" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-home">🏠 Về trang chủ</button></div>`);
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); if (ui.isHost) startGame(); else tip('Chờ chủ phòng mở ván mới.'); };
  const home = $('#m-home'); if (home) home.onclick = () => { location.href = '../'; };
}

/* ---------- tương tác ---------- */
$('#wl-cover').addEventListener('click', e => {
  if (e.target.closest('#btn-cover-ok')) { pvpCover = false; Snd.pick(); render(cur, cur); }
});
$('#wl-spectrum-area').addEventListener('click', async e => {
  const bar = e.target.closest('#spectrum-bar');
  if (!bar || !cur || bar.dataset.place !== '1') return;
  const pid = controlPid(cur);
  if (!pid) return;
  const r = bar.getBoundingClientRect();
  const pos = Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100)));
  const a = await ui.actAs(pid, { type: 'place', pos });
  if (a && a.ok === false) { Snd.invalid(); tip(a.reason || 'Không đặt mốc được.'); return; }
  Snd.pick();
});
$('#wl-clue-area').addEventListener('input', e => {
  if (e.target && e.target.id === 'wl-clue-input') clueDraft = e.target.value;
});
$('#wl-clue-area').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target && e.target.id === 'wl-clue-input') { e.preventDefault(); sendClue(); }
});
$('#wl-clue-area').addEventListener('click', e => {
  if (e.target.closest('#btn-send-clue')) sendClue();
});
async function sendClue() {
  const input = $('#wl-clue-input');
  if (!input || !cur) return;
  const text = input.value.trim();
  if (!text) { tip('Gõ gợi ý vào ô trước đã.'); return; }
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn đưa gợi ý.'); return; }
  const r = await ui.actAs(pid, { type: 'clue', text });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không gửi gợi ý được.'); return; }
  clueDraft = '';
  Snd.pick();
}
$('#btn-ready').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'ready' });
  if (r && r.ok === false) tip(r.reason || 'Chưa xem được.'); else Snd.pick();
};
$('#btn-lock').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'lock' });
  if (r && r.ok === false) { Snd.invalid(); tip(r.reason || 'Không chốt mốc được.'); } else Snd.pick();
};
$('#btn-next').onclick = async () => {
  const pid = controlPid(cur); if (!pid) return;
  const r = await ui.actAs(pid, { type: 'next' });
  if (r && r.ok === false) tip(r.reason || 'Chưa sang lượt được.'); else Snd.pick();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua ván này? 2 người thì ván kết thúc ngay; 3+ người thì ván tiếp tục không có bạn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = mode === 'pvp' ? ((pendingHuman(v) || {}).id || v.me) : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide-top').onclick = openGuide;
$('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊 Âm thanh' : '🔇 Âm thanh'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'wavelength', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + (số người − 1) máy */
      for (let i = 0; i < playerCount - 1; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    }
    /* solo: chỉ mình bạn; pvp: chủ phòng thêm người trong phòng chờ */
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
