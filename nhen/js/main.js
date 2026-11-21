// 🕷️ Nhện — giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Rắn Săn Mồi:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Đồng hồ đua 180s: chỉ CHỦ PHÒNG chạy — mỗi 1s kiểm tra, hết giờ thì
// gửi {type:'timeout'} (engine kết thúc ván theo dãy rồi điểm).
// Chơi chung máy (pvp): host có state thô nên vẽ cả 2 bàn bằng
// viewFor(raw, pid) — giống pattern chuyền tay của Tetris/Rắn Săn Mồi.
import { createGame, applyAction, viewFor, serialize, deserialize, actors, SUITS, RACE_TIME_MS, HINTS, UNDOS, RUN_SCORE, SUIT_CHAR, rankLabel } from './engine.js?v=1';
import { botAction, botDelay, BOT_NAMES } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import { Sfx } from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, cleanName, avatar } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'nhen', min: 1, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Nhện đua cần 2–4 người: đấu máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { suits: 'easy' },
  optOk: (k, v) => (k === 'botLevel' && (v === 'easy' || v === 'hard')) || (k === 'nhMode' && (v === 'solo' || v === 'race')) || (k === 'suits' && (v === 'easy' || v === 'medium' || v === 'hard')),
  create: createGame, apply: applyAction, view: viewFor, serialize, deserialize, actors, bot: botAction,
  /* máy đi sau 800–1200ms (Dễ) / 300–500ms (Khó) mỗi nước — botDelay ở bot.js */
  botDelay: (s, pid) => botDelay(s, pid),
  botNames: BOT_NAMES,
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'solo'; /* solo | race | pvp | online */
let botLevel = 'hard';
let suits = 'easy';
let p2name = 'Bạn 2';
try {
  const l = localStorage.getItem('gumballz-nhen-level');
  if (l === 'easy' || l === 'hard') botLevel = l;
  const s = localStorage.getItem('gumballz-nhen-suits');
  if (s === 'easy' || s === 'medium' || s === 'hard') suits = s;
  const n = localStorage.getItem('gumballz-nhen-p2');
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
  suits = $('#sel-solo-suits').value;
  try { localStorage.setItem('gumballz-nhen-suits', suits); } catch (e) {}
  mode = 'solo'; ui.startHost(true);
};
$('#btn-vs-bot').onclick = () => toggleBox('bot-row');
$('#btn-online').onclick = () => { mode = 'online'; toggleBox('room-box'); };
$('#btn-local').onclick = () => toggleBox('local-row');
$('#btn-start-bot').onclick = () => {
  botLevel = $('#sel-level').value === 'easy' ? 'easy' : 'hard';
  suits = $('#sel-suits').value;
  try {
    localStorage.setItem('gumballz-nhen-level', botLevel);
    localStorage.setItem('gumballz-nhen-suits', suits);
  } catch (e) {}
  mode = 'race'; ui.startHost(true);
};
$('#btn-start-local').onclick = () => {
  p2name = ($('#inp-p2name').value || 'Bạn 2').trim().slice(0, 16) || 'Bạn 2';
  suits = $('#sel-local-suits').value;
  try {
    localStorage.setItem('gumballz-nhen-p2', p2name);
    localStorage.setItem('gumballz-nhen-suits', suits);
  } catch (e) {}
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
  $('#lobby-list').innerHTML = `<p><b>${n}/4 người</b> (cần ${need}–4)</p>` + info.players.map(p => {
    return `<div class="lobby-row">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'hard' ? 'Khó' : 'Dễ'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ra">✕</button>` : ''}</div>`;
  }).join('') + (u.isHost && mode === 'online' && n < 4
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
    const hard = await confirmBox('Máy Khó ưu tiên thu dãy, lật lá úp, tạo cột trống (300–500ms/nước); máy Dễ đi ngẫu nhiên (800–1200ms/nước).', { title: '🤖 Thêm máy', ok: 'Máy Khó', cancel: 'Máy Dễ' });
    h.addBot({ level: hard ? 'hard' : 'easy' });
  } else if (b.id === 'btn-addlocal') {
    const nm = await promptBox('Người chơi cùng máy (chung bàn phím).', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (nm) h.addLocal(nm);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let pvpP2 = null; /* id người chơi 2 ở chế độ chung máy */
let sel = null; /* {pid, col, idx, count} — dãy đang chọn để di chuyển */
let lastRuns = 0;
let lastStatus = '';
let timeoutSent = false;

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
  game: 'nhen', net: NET,
  offline: h => {
    if (mode === 'solo') {
      h.setOpt('nhMode', 'solo');
      h.setOpt('suits', suits);
    } else if (mode === 'race') {
      h.setOpt('nhMode', 'race');
      h.setOpt('suits', suits);
      h.setOpt('botLevel', botLevel);
      h.addBot({ level: botLevel });
    } else if (mode === 'pvp') {
      h.setOpt('nhMode', 'race');
      h.setOpt('suits', suits);
      if (h.players.length < 2) h.addLocal(p2name);
    }
    /* online: mặc định race, không cần setOpt (dùng defaults suits easy) */
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (!v) { cur = null; endShownFor = ''; pvpP2 = null; sel = null; lastRuns = 0; lastStatus = ''; timeoutSent = false; render(null, null); return; }
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
  if (r) { stopRaceClock(); ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};

/* ---------- đồng hồ đua 180s (chỉ chủ phòng chạy) ---------- */
let raceTimer = null;
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function startRaceClock() {
  if (raceTimer) return;
  raceTimer = setInterval(() => {
    if (!cur || cur.phase !== 'playing' || !cur.race) return;
    const el = $('#nh-time');
    if (el) el.textContent = '⏱️ ' + fmtTime((RACE_TIME_MS - (Date.now() - cur.startedAt)) / 1000);
    if (ui.isHost && !timeoutSent && Date.now() - cur.startedAt >= RACE_TIME_MS) {
      timeoutSent = true;
      send(cur.me, { type: 'timeout' });
    }
  }, 1000);
}
function stopRaceClock() { if (raceTimer) { clearInterval(raceTimer); raceTimer = null; } }

/* ---------- vẽ bàn ---------- */
const isRedSuit = s => s === 1 || s === 2;
function cardHTML(c, col, idx) {
  if (!c.up) return `<div class="nh-card back" data-col="${col}" data-idx="${idx}"></div>`;
  const red = isRedSuit(c.s) ? ' red' : ' blk';
  return `<div class="nh-card${red}" data-col="${col}" data-idx="${idx}" draggable="true"><b>${rankLabel(c.r)}</b><i>${SUIT_CHAR[c.s]}</i></div>`;
}
/* dãy di chuyển được bắt đầu từ lá idx trong cột col (cùng chất giảm dần tới lá trên cùng) */
function movableFrom(view, col, idx) {
  const my = view.my;
  if (!my || !my.cols) return null;
  const c = my.cols[col];
  if (!c || idx < 0 || idx >= c.length || !c[idx].up) return null;
  for (let i = idx + 1; i < c.length; i++) {
    if (!c[i].up || c[i].s !== c[idx].s || c[i].r !== c[i - 1].r - 1) return null;
  }
  return { col, idx, count: c.length - idx };
}
function boardHTML(view, label, mainBoard) {
  const my = view.my;
  const me = view.players.find(p => p.id === view.me);
  const hint = my && my.hint;
  let cols = '';
  for (let c = 0; c < 10; c++) {
    const col = my ? my.cols[c] : [];
    let cards = '';
    if (!col.length) {
      const hEmpty = hint && hint.type === 'move' && hint.to === c;
      cards = `<div class="nh-empty${hEmpty ? ' hint' : ''}" data-col="${c}">＋</div>`;
    } else {
      for (let i = 0; i < col.length; i++) {
        const hFrom = hint && hint.type === 'move' && hint.from === c && i >= col.length - hint.count;
        const hTo = hint && hint.type === 'move' && hint.to === c && i === col.length - 1;
        cards += cardHTML(col[i], c, i).replace('class="nh-card', `class="nh-card${(hFrom || hTo) ? ' hint' : ''}`);
      }
    }
    cols += `<div class="nh-col" data-col="${c}">${cards}</div>`;
  }
  const stock = my ? my.stock : 0;
  return `<div class="nh-board-wrap" data-pid="${view.me}">
    <div class="nh-board-head"><b>${esc(label)}</b><span>🎉 <b>${me ? me.runs : 0}/8 dãy</b> · ⭐ <b>${me ? me.score : 0}</b>đ · 🃏 còn <b>${Math.floor(stock / 10)}</b> lần chia</span></div>
    <div class="nh-board"${mainBoard ? ' id="nh-board"' : ''}>${cols}</div>
    <div class="nh-board-foot"><span>🃏 Bài chờ chia: <b>${stock}</b> lá</span><span>💡 còn ${my ? my.hintsLeft : HINTS} gợi ý · ↩️ còn ${my ? my.undosLeft : UNDOS} hoàn tác</span></div>
  </div>`;
}

let lastRenderKey = '';
function render(v, prev) {
  cur = v;
  if (!v) {
    $('#nh-boards').innerHTML = '';
    $('#nh-opps').innerHTML = '';
    $('#nh-score').textContent = '0';
    $('#nh-runs').textContent = '0/8';
    $('#nh-stock').textContent = '50';
    $('#nh-time').textContent = '';
    $('#nh-status').textContent = '';
    sel = null;
    stopRaceClock();
    return;
  }
  /* key render: đổi khi bất cứ thứ gì hiển thị đổi — tránh vẽ thiếu (lỗi stale) */
  const me = v.players.find(p => p.id === v.me);
  const my = v.my;
  const rk = `${v.gid}|${v.seq}|${v.phase}|${me ? me.runs + '/' + me.score + '/' + me.status : ''}|${my ? JSON.stringify(my.cols) + '|' + my.stock + '|' + my.hintsLeft + '/' + my.undosLeft + '|' + JSON.stringify(my.hint) : ''}|${mode}|${sel ? sel.pid + ':' + sel.col + ':' + sel.idx : ''}`;
  if (rk === lastRenderKey && v.phase === 'playing') return;
  lastRenderKey = rk;
  if (v.race) startRaceClock(); else stopRaceClock();

  /* âm thanh thu dãy / kết thúc — theo dõi số dãy và trạng thái của mình */
  if (me) {
    if (me.runs > lastRuns) Sfx.run();
    if (me.status === 'done' && lastStatus !== 'done') Sfx.lose();
    lastRuns = me.runs;
    lastStatus = me.status;
  }

  $('#nh-score').textContent = String(me ? me.score : 0);
  $('#nh-runs').textContent = `${me ? me.runs : 0}/8`;
  $('#nh-stock').textContent = String(my ? my.stock : 50);
  if (v.solo) $('#nh-time').textContent = '';
  $('#nh-status').textContent = v.solo
    ? `Mục tiêu: thu đủ 8 dãy K→A cùng chất (${v.suits === 1 ? '1 chất ♠' : v.suits === 2 ? '2 chất ♠♥' : '4 chất'})`
    : `Đua 180 giây — ai thu đủ 8 dãy trước thì thắng; hết giờ thì so dãy rồi điểm`;

  const boardsEl = $('#nh-boards');
  if (mode === 'pvp') {
    const raw = ui.net && ui.net.raw && ui.net.raw.state;
    if (raw) {
      const ids = raw.players.map(p => p.id);
      const v1 = viewFor(raw, ids[0]);
      const v2 = ids[1] ? viewFor(raw, ids[1]) : null;
      boardsEl.innerHTML = boardHTML(v1, raw.players[0].name + ' (P1)', true) +
        (v2 ? boardHTML(v2, raw.players[1].name + ' (P2)', false) : '');
      $('#nh-opps').innerHTML = '';
      paintSel();
      return;
    }
  }
  boardsEl.innerHTML = boardHTML(v, me ? cleanName(me.name) : '', true);
  const opps = v.players.filter(p => p.id !== v.me);
  $('#nh-opps').innerHTML = opps.map(p => {
    return `<div class="nh-opp"><span>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}</span><b>🎉 ${p.runs}/8 dãy</b><span>${p.score}đ · ${p.moves} nước</span><i>${p.status === 'playing' ? '▶ đang chơi' : p.status === 'done' ? '🏁 xong' : '🏳️ xin thua'}</i></div>`;
  }).join('');
  paintSel();
}
function paintSel() {
  document.querySelectorAll('.nh-card.sel').forEach(el => el.classList.remove('sel'));
  if (!sel) return;
  const wrap = document.querySelector(`.nh-board-wrap[data-pid="${sel.pid}"]`);
  if (!wrap) return;
  const col = wrap.querySelectorAll('.nh-col')[sel.col];
  if (!col) return;
  col.querySelectorAll('.nh-card').forEach(el => {
    if (+el.dataset.idx >= sel.idx) el.classList.add('sel');
  });
}

/* ---------- kết thúc ---------- */
function showEnd(v) {
  stopRaceClock();
  const me = v.me;
  const sum = (v.final && v.final.summary) || {};
  const won = (v.winnerIds || []).includes(me);
  let h;
  if (v.endReason === 'draw') h = '🤝 Trận hòa!';
  else if (v.endReason === 'resign') h = '🏳️ Trận đã kết thúc!';
  else if (won) h = '🏆 Bạn thắng!';
  else if (v.solo && v.endReason === 'stuck') h = '😶 Hết nước đi rồi!';
  else if (v.solo) h = '😢 Chưa thu đủ 8 dãy!';
  else h = `🏆 ${esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name || 'Máy'))} thắng!`;
  const rows = v.players.map(p => {
    const q = sum[p.id] || {};
    const isWin = (v.winnerIds || []).includes(p.id);
    return `<div>${isWin ? '👑 ' : ''}${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''} — 🎉 ${q.runs || 0}/8 dãy · ${q.score || 0} điểm · ${q.moves || 0} nước · 🃏 ${q.deals || 0} lần chia</div>`;
  }).join('');
  let reason = '';
  if (v.solo && won) reason = `Bạn thu đủ 8 dãy K→A cùng chất${v.suits === 4 ? ' (4 chất!)' : v.suits === 2 ? ' (2 chất!)' : ''} — thắng!`;
  else if (v.solo && v.endReason === 'stuck') reason = `Bạn thu được ${sum[me] ? sum[me].runs : 0}/8 dãy thì hết nước đi (hết bài chia).`;
  else if (v.endReason === 'draw') reason = 'Không ai hơn ai — cùng số dãy, cùng điểm.';
  else if (v.endReason === 'resign') reason = 'Có người xin thua — bị loại khỏi ván.';
  else if (v.endReason === 'timeout') reason = 'Hết 180 giây — so số dãy đã thu, rồi so điểm.';
  else reason = 'Đua: ai thu đủ 8 dãy trước thì thắng.';
  if (won) Sfx.win(); else Sfx.lose();
  ui.openModal(`<h2>${h}</h2><p>${reason}</p><div>${rows}</div><div class="btns"><button class="btn primary" id="m-again">🔄 Chơi lại</button><button class="btn" id="m-close">Đóng</button></div>`);
  const c = $('#m-close'); if (c) c.onclick = ui.closeModal;
  const a = $('#m-again'); if (a) a.onclick = () => { ui.closeModal(); location.reload(); };
}

/* ---------- tương tác: bấm chọn + kéo-thả ---------- */
function myAction(a, pid) {
  const id = pid || (cur && cur.me);
  const cp = controlPid(cur, id);
  if (!cp) return;
  send(cp, a);
  if (a.type === 'move') Sfx.move();
  else if (a.type === 'deal') Sfx.deal();
  else if (a.type === 'hint') Sfx.hint();
}
function doMove(pid, from, to, count) {
  if (from === to) return;
  myAction({ type: 'move', from, to, count }, pid);
}
$('#nh-boards').addEventListener('click', e => {
  const card = e.target.closest('.nh-card');
  if (!card || !cur || cur.phase !== 'playing') return;
  const wrap = e.target.closest('.nh-board-wrap');
  const pid = wrap ? wrap.dataset.pid : cur.me;
  if (!controlPid(cur, pid)) return;
  const col = +card.dataset.col, idx = +card.dataset.idx;
  const view = mode === 'pvp'
    ? viewFor(ui.net.raw.state, pid)
    : cur;
  if (sel && sel.pid === pid) {
    if (sel.col === col) {
      /* bấm lá khác cùng cột thì chọn lại lá đó; bấm đúng lá đang chọn thì hủy */
      if (sel.idx === idx) { sel = null; render(cur, cur); return; }
      const mv2 = movableFrom(view, col, idx);
      if (!mv2) { tip('Dãy này không cùng chất giảm dần nên không di chuyển được.'); return; }
      sel = { pid, col, idx, count: mv2.count };
      Sfx.click();
      render(cur, cur);
      return;
    }
    const a = sel;
    sel = null;
    doMove(pid, a.col, col, a.count);
    render(cur, cur);
    return;
  }
  const mv = movableFrom(view, col, idx);
  if (!mv) { tip('Dãy này không cùng chất giảm dần nên không di chuyển được.'); return; }
  sel = { pid, col, idx, count: mv.count };
  Sfx.click();
  render(cur, cur);
});
/* bấm vào cột trống để đặt dãy đang chọn */
$('#nh-boards').addEventListener('click', e => {
  const empty = e.target.closest('.nh-empty');
  if (!empty || !cur || cur.phase !== 'playing') return;
  const wrap = e.target.closest('.nh-board-wrap');
  const pid = wrap ? wrap.dataset.pid : cur.me;
  if (!controlPid(cur, pid) || !sel || sel.pid !== pid) return;
  const a = sel;
  sel = null;
  doMove(pid, a.col, +empty.dataset.col, a.count);
  render(cur, cur);
});
/* kéo-thả bằng chuột (máy tính): kéo 1 lá thả lên cột khác */
let dragSel = null;
$('#nh-boards').addEventListener('dragstart', e => {
  const card = e.target.closest('.nh-card');
  if (!card || !cur || cur.phase !== 'playing') { e.preventDefault(); return; }
  const wrap = e.target.closest('.nh-board-wrap');
  const pid = wrap ? wrap.dataset.pid : cur.me;
  if (!controlPid(cur, pid)) { e.preventDefault(); return; }
  const view = mode === 'pvp' ? viewFor(ui.net.raw.state, pid) : cur;
  const mv = movableFrom(view, +card.dataset.col, +card.dataset.idx);
  if (!mv) { e.preventDefault(); return; }
  dragSel = { pid, ...mv };
  try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', JSON.stringify(dragSel)); } catch (err) { /* kệ */ }
});
$('#nh-boards').addEventListener('dragover', e => {
  if (e.target.closest('.nh-card') || e.target.closest('.nh-empty') || e.target.closest('.nh-col')) e.preventDefault();
});
$('#nh-boards').addEventListener('drop', e => {
  const t = e.target.closest('.nh-card, .nh-empty, .nh-col');
  if (!t || !dragSel) return;
  e.preventDefault();
  const to = +(t.dataset.col ?? t.closest('.nh-col')?.dataset.col);
  const a = dragSel;
  dragSel = null;
  if (Number.isInteger(to)) doMove(a.pid, a.col, to, a.count);
});
$('#nh-boards').addEventListener('dragend', () => { dragSel = null; });

/* ---------- nút hành động ---------- */
$('#btn-deal').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  myAction({ type: 'deal' });
};
$('#btn-hint').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  myAction({ type: 'hint' });
};
$('#btn-undo').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  myAction({ type: 'undo' });
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
$('#btn-guide-top').onclick = openGuide;
$('#btn-sound').onclick = () => {
  Sfx.setEnabled(!Sfx.isEnabled());
  $('#btn-sound').textContent = Sfx.isEnabled() ? '🔊 Âm thanh' : '🔇 Tắt tiếng';
};
if (!Sfx.isEnabled()) $('#btn-sound').textContent = '🔇 Tắt tiếng';
