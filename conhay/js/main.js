// 🔴 Cờ Nhảy — giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Splendor:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Bàn vẽ bằng SVG: x = R·√3·(q + r/2), y = R·1.5·r.
// Bấm bi của mình để chọn (hiện lỗ bước được + lỗ nhảy được), bấm lỗ
// bước thì đi ngay, bấm lỗ nhảy thì bi ở lại đó để nhảy tiếp trong
// cùng lượt (bấm "✅ Xong lượt" để kết thúc chuỗi, "✕ Hủy" để hủy).
import { createGame, applyAction, viewFor, actors, HOLES, TRIANGLES, stepDests, jumpDests, legalMovesFromView } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { gameKit, $, esc, avatar, cleanName } from '../../shared/ui/gamekit.js?v=15';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'conhay', min: 2, max: 6, maxSeats: 6, allowLocal: true,
  minMsg: 'Cờ Nhảy cần 2, 3, 4 hoặc 6 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* màu ghế ngồi (chấm điểm) — cùng thứ tự với engine.js PLAYER_COLORS */
const PLAYER_COLORS = ['#E05D5D', '#5B8DEF', '#58B368', '#E8B93C', '#9B7ED9', '#E8823C'];
const PLAYER_EMOJI = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];
const colorOf = (v, pid) => {
  const i = v.players.findIndex(p => p.id === pid);
  return PLAYER_COLORS[i < 0 ? 0 : i % PLAYER_COLORS.length];
};
const emojiOf = (v, pid) => {
  const i = v.players.findIndex(p => p.id === pid);
  return PLAYER_EMOJI[i < 0 ? 0 : i % PLAYER_EMOJI.length];
};

/* ---------- tọa độ SVG của bàn sao ---------- */
const R = 26; /* khoảng cách giữa 2 lỗ kề */
const holePos = new Map(); /* holeId -> {x, y} */
{
  for (const h of HOLES) {
    holePos.set(h.id, {
      x: R * Math.sqrt(3) * (h.q + h.r / 2),
      y: R * 1.5 * h.r,
    });
  }
  /* căn viewBox vừa khít bàn (tính từ tọa độ thật, không đoán) */
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const { x, y } of holePos.values()) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const pad = 24;
  $('#board').setAttribute('viewBox', `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`);
}

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 2; /* đấu máy: tổng số người (bạn + máy) — chỉ 2/3/4/6 hợp lệ */
try {
  const c = +localStorage.getItem('gumballz-conhay-count');
  if ([2, 3, 4, 6].includes(c)) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-conhay-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-conhay-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-conhay-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/6 người (cần 2, 3, 4 hoặc 6)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Người đi đầu</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 6
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🔴 Luật nhanh</b><div class="role-note">Bàn sao 6 cánh 121 lỗ, mỗi người 10 bi. Mỗi lượt dời 1 bi: bước 1 lỗ kề trống HOẶC nhảy qua 1 bi kề sang lỗ trống ngay sau nó — được nhảy liên tiếp nhiều lần trong cùng lượt. Ai đưa hết 10 bi vào tam giác đối diện trước thì thắng. Số người phải là 2, 3, 4 hoặc 6 (5 người không chia đều bàn được).</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = ![2, 3, 4, 6].includes(n);
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
  $('#wait-msg').textContent = ![2, 3, 4, 6].includes(n) ? `Cần 2, 3, 4 hoặc 6 người mới bắt đầu (đang có ${n}).` : 'Đang chờ chủ phòng bắt đầu…';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó đi. Mọi thông tin đều công khai!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
/* lựa chọn hiện tại: bi đang chọn + chuỗi nhảy đang đi dở */
let sel = null; /* { from, path: [holeId...], jumps: n } | null */
let selMarble = null; /* holeId của bi đang chọn (chưa nhảy) */

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
/* vị trí bi đang chọn hiện tại (đầu chuỗi hoặc đã nhảy được vài bước) */
function selCurrentHole() {
  if (!sel) return selMarble;
  return sel.path.length ? sel.path[sel.path.length - 1] : sel.from;
}
/* bàn hiển thị: áp chuỗi nhảy đang đi dở lên occ (bi tạm ở vị trí mới) */
function displayOcc(v) {
  const occ = v.occ.slice();
  if (sel && sel.path.length) {
    occ[sel.from] = null;
    occ[sel.path[sel.path.length - 1]] = v.me;
  }
  return occ;
}

function render(v, prev) {
  cur = v;
  if (!v) { endShownFor = ''; sel = null; selMarble = null; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  const human = turnHuman(v);
  const handPid = human ? human.id : null;
  const meP = myBoard(v);
  const myTurn = handPid && isMyTurn(v, handPid) && ui.controls(handPid);
  /* đổi lượt / đổi vòng / đổi trạng thái thì bỏ lựa chọn cũ */
  if (prev && (v.turnCount !== prev.turnCount || v.phase !== prev.phase)) { sel = null; selMarble = null; }

  const winnerP = v.winner ? v.players.find(p => p.id === v.winner) : null;
  $('#round').textContent = v.phase === 'ended'
    ? (v.winner
      ? `🏁 ${winnerP ? cleanName(winnerP.name) : 'Ai đó'} thắng — đưa hết 10 bi vào đích!`
      : '🏁 Ván kết thúc.')
    : `🔴 Lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · Vòng ${v.round} · Bạn: ${meP ? meP.score : 0}/10 bi vào đích`;
  $('#status').innerHTML = v.players.map((p) => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''} ${p.id === v.turn && v.phase === 'playing' ? 'turn' : ''}"><span class="dot" style="background:${colorOf(v, p.id)}"></span>${emojiOf(v, p.id)} ${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}${p.id === v.turn && v.phase === 'playing' ? ' 👉 tới lượt' : ''}: <b>${p.score}/10</b></span>`;
  }).join('');

  /* ----- bàn cờ SVG ----- */
  const occ = displayOcc(v);
  const destSet = meP ? new Set(TRIANGLES[meP.destTri]) : new Set();
  const homeSet = meP ? new Set(TRIANGLES[meP.tri]) : new Set();
  /* các lỗ đích khi đang chọn bi: bước được (vàng) + nhảy được (tím) */
  let stepSet = new Set(), jumpSet = new Set();
  const curHole = selCurrentHole();
  if (myTurn && v.phase === 'playing' && curHole != null && (sel || selMarble != null)) {
    const from = sel ? sel.from : selMarble;
    const visited = sel ? [from, ...sel.path] : [from];
    /* bước chỉ được khi chưa nhảy (chuỗi nhảy thì không được bước nữa) */
    if (!sel || sel.path.length === 0) {
      for (const d of stepDests(v, handPid, curHole)) stepSet.add(d);
    }
    for (const d of jumpDests(v, handPid, curHole, visited)) jumpSet.add(d);
  }
  let svg = '';
  for (const h of HOLES) {
    const { x, y } = holePos.get(h.id);
    const owner = occ[h.id];
    const isTarget = stepSet.has(h.id);
    const isJump = jumpSet.has(h.id);
    const cls = `ch-hole${homeSet.has(h.id) ? ' home' : ''}${destSet.has(h.id) ? ' dest' : ''}${isTarget ? ' target' : ''}${isJump ? ' jump-target' : ''}`;
    svg += `<circle class="${cls}" data-hole="${h.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11"><title>Lỗ ${h.q},${h.r}</title></circle>`;
    if (owner) {
      const isMe = owner === v.me;
      const isSel = h.id === curHole && (sel || selMarble != null);
      svg += `<circle class="ch-marble${isMe ? ' me' : ''}${isSel ? ' sel' : ''}" data-marble="${h.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9.5" fill="${colorOf(v, owner)}"/>`;
      if (isSel) svg += `<circle class="ch-hole sel-ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14.5"/>`;
    }
  }
  $('#board').innerHTML = svg;

  /* ----- thanh hành động ----- */
  const actionBar = $('#action-bar');
  if (v.phase === 'playing' && myTurn) {
    const moves = legalMovesFromView(v, handPid);
    const hasMove = moves.some(m => m.type === 'move');
    if (sel && sel.path.length > 0) {
      /* đang nhảy dở chuỗi: cho xong lượt hoặc hủy */
      actionBar.style.display = '';
      actionBar.innerHTML = `<span class="hint">⛓️ Chuỗi nhảy: <b>${sel.jumps} cú nhảy</b> — bấm tiếp lỗ tím để nhảy nữa, hoặc:</span>`
        + `<div class="ch-act-btns"><button class="btn pri" id="btn-finish-chain">✅ Xong lượt (${sel.jumps} nhảy)</button><button class="btn" id="btn-cancel-chain">✕ Hủy chuỗi</button></div>`;
      $('#btn-finish-chain').onclick = () => {
        Snd.eat();
        ui.actAs(handPid, { type: 'move', from: sel.from, path: sel.path.slice(), jumps: sel.jumps });
        sel = null; selMarble = null;
      };
      $('#btn-cancel-chain').onclick = () => { sel = null; selMarble = null; Snd.hint(); render(cur, cur); };
    } else if (!hasMove) {
      actionBar.style.display = '';
      actionBar.innerHTML = `<span class="hint">😶 Bạn không còn nước đi nào (bi bị chặn hết) — bấm Bỏ lượt.</span>`
        + `<div class="ch-act-btns"><button class="btn pri" id="btn-pass">⏭️ Bỏ lượt</button></div>`;
      $('#btn-pass').onclick = () => { Snd.place(); ui.actAs(handPid, { type: 'pass' }); };
    } else if (selMarble != null) {
      actionBar.style.display = '';
      actionBar.innerHTML = `<span class="hint">🔴 Đã chọn 1 bi — bấm <b>lỗ vàng</b> để bước 1 lỗ, bấm <b>lỗ tím</b> để nhảy qua bi (nhảy xong còn nhảy tiếp được).</span>`
        + `<div class="ch-act-btns"><button class="btn" id="btn-deselect">✕ Bỏ chọn</button></div>`;
      $('#btn-deselect').onclick = () => { selMarble = null; Snd.hint(); render(cur, cur); };
    } else {
      actionBar.style.display = '';
      actionBar.innerHTML = `<span class="hint">🔴 Tới lượt bạn — bấm 1 bi <b style="color:${colorOf(v, handPid)}">màu của bạn</b> để chọn, rồi bấm lỗ trống để đi.</span>`;
    }
  } else {
    actionBar.style.display = 'none';
    actionBar.innerHTML = '';
  }

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.place();
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
    body = `<div class="ch-final-scores">${scores.map(s => {
      const st = sum[s.id] || { inHome: s.score, progress: 0, jumpChainMax: 0, turns: 0 };
      return `<div class="row ${v.winners.includes(s.id) ? 'winner' : ''}"><span>${v.winners.includes(s.id) ? '👑 ' : ''}${emojiOf(v, s.id)} ${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}<span class="sub">${st.inHome}/10 bi vào đích · chuỗi nhảy dài nhất ${st.jumpChainMax} · ${st.turns} lượt đi</span></span><b>${s.score}/10</b></div>`;
    }).join('')}</div>
    <p class="note">${v.endReason === 'resign' ? 'Có người xin thua nên ván dừng lại — người có tiến độ cao nhất trong số người còn lại thắng (hòa tiến độ thì ít bi ngoài đích hơn thắng).' : 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.'}</p>`;
  } else {
    title = '🤝 Ván kết thúc';
    body = `<div class="ch-final-scores">${scores.map(s => `<div class="row"><span>${emojiOf(v, s.id)} ${esc(cleanName(s.name))}${s.id === v.me ? ' (bạn)' : ''}</span><b>${s.score}/10</b></div>`).join('')}</div>
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

/* ---------- bấm bi / lỗ trên bàn SVG ---------- */
$('#board').addEventListener('click', e => {
  const marble = e.target.closest('[data-marble]');
  const hole = e.target.closest('[data-hole]');
  if ((!marble && !hole) || !cur || cur.phase !== 'playing') return;
  const human = turnHuman(cur);
  const handPid = human ? human.id : null;
  if (!handPid || !isMyTurn(cur, handPid) || !ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  /* bấm bi của mình: chọn / đổi bi chọn */
  if (marble) {
    const hid = +marble.dataset.marble;
    if (cur.occ[hid] !== handPid) { tip('Đó là bi của người khác — chỉ được đi bi của mình.'); return; }
    if (sel && sel.path.length > 0) { tip('Đang nhảy dở chuỗi — bấm "✅ Xong lượt" hoặc "✕ Hủy chuỗi" trước.'); return; }
    sel = null;
    selMarble = selMarble === hid ? null : hid;
    Snd.pick();
    render(cur, cur);
    return;
  }
  /* bấm lỗ: đi tới lỗ đó (bước hoặc nhảy) */
  if (!hole) return;
  const hid = +hole.dataset.hole;
  if (selMarble == null && !sel) { tip('Bấm 1 bi của bạn trước, rồi mới bấm lỗ trống.'); return; }
  const from = sel ? sel.from : selMarble;
  const curHole = selCurrentHole();
  const visited = sel ? [from, ...sel.path] : [from];
  const isStep = !sel || sel.path.length === 0 ? stepDests(cur, handPid, curHole).includes(hid) : false;
  const isJump = jumpDests(cur, handPid, curHole, visited).includes(hid);
  if (!isStep && !isJump) { Snd.invalid(); tip('Lỗ này không đi được — chỉ đi được lỗ vàng (bước) hoặc lỗ tím (nhảy).'); return; }
  if (isStep) {
    /* bước 1 lỗ: đi ngay, hết lượt */
    Snd.place();
    ui.actAs(handPid, { type: 'move', from, path: [hid], jumps: 0 });
    sel = null; selMarble = null;
    return;
  }
  /* nhảy: bi ở lại lỗ mới, cho nhảy tiếp trong cùng lượt */
  if (!sel) sel = { from, path: [], jumps: 0 };
  sel.path.push(hid);
  sel.jumps += 1;
  selMarble = null;
  Snd.eat();
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
  const r = await confirmBox('Nhận thua trận này? Ván dừng lại ngay, người có tiến độ cao nhất trong số người còn lại thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
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
  game: 'conhay', net: NET,
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
