// 🀄 Rummikub – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Lấy 6: chủ
// phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi trên giao diện: bấm 1 lá để chọn, bấm 1 bộ (hoặc "Bộ mới")
// để đặt lá đó vào bộ; bấm "Xong lượt" để gửi toàn bộ bàn mới.
// Lá trên bàn không được lấy về tay; bàn xếp sai thì máy chủ phạt rút
// 3 lá (giao diện kiểm tra trước bằng cùng hàm validatePlayTable của
// engine nên hiếm khi bị phạt).
import { createGame, applyAction, viewFor, actors, meldInfo, validatePlayTable, tileValue, tileColor, tileNumber, isJoker, sortTiles } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet({
  game: 'rummikub', min: 2, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Rummikub cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: () => false,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 2; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-rummikub-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-rummikub-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-rummikub-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-rummikub-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/4 người (cần 2–4)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === 0 ? '<span class="seat-role">👑 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🀄 Bộ bài</b><div class="role-note">106 lá: 2 bộ 1–13 × 4 màu (đỏ, xanh dương, cam, đen) + 2 joker. Mỗi người 14 lá, mở bài lần đầu ≥ 30 điểm, hết bài trên tay thì thắng.</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2 || n > 4;
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
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó bấm 👁 xem bài rồi đánh. Nhớ che bài trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
/* bàn nháp của lượt hiện tại: bàn + tay lúc bắt đầu lượt, bàn + tay đang
   xếp dở, lá đang chọn. Chỉ tồn tại khi tới lượt người mình điều khiển. */
let stage = null; /* {turnPid, baseTable, baseHand, melded, table, hand, sel} */
let handRevealed = false; /* chuyền tay: đã bấm 👁 xem bài chưa */
let revealedFor = null;

const tileHtml = (t, opts = {}) => {
  const cls = isJoker(t) ? 'cJ' : 'c' + tileColor(t);
  const label = isJoker(t) ? '🃏' : tileNumber(t);
  return `<span class="rk-tile ${cls} ${opts.sel ? 'sel' : ''} ${opts.cant ? 'cant' : ''}" data-tile="${t}">${label}</span>`;
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
/* người tới lượt có phải do mình điều khiển không */
function controlPid(v) {
  if (!v || v.phase !== 'playing') return null;
  const pid = v.turn;
  return pid && ui.controls(pid) ? pid : null;
}
/* người cùng máy tới lượt (chuyền tay) */
function pendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  return p && !p.isBot ? p : null;
}
function ensureStage(v) {
  const pid = controlPid(v);
  if (!pid) { stage = null; return null; }
  const hand = handOf(v, pid);
  const baseTableJson = JSON.stringify(v.table);
  const baseHandJson = JSON.stringify(hand);
  if (!stage || stage.turnPid !== pid || stage.baseTableJson !== baseTableJson || stage.baseHandJson !== baseHandJson) {
    const me = v.players.find(x => x.id === pid) || {};
    stage = {
      turnPid: pid, baseTableJson, baseHandJson, melded: !!me.melded,
      baseTable: JSON.parse(baseTableJson), baseHand: JSON.parse(baseHandJson),
      table: JSON.parse(baseTableJson), hand: JSON.parse(baseHandJson), sel: null,
    };
  }
  return stage;
}
function stageInfo(st) {
  const played = st.baseHand.filter(t => !st.hand.includes(t));
  const playedSet = new Set(played);
  let newValue = 0;
  for (const m of st.table) {
    if (m.length && m.every(t => playedSet.has(t))) newValue += meldInfo(m).value;
  }
  return { played, newValue };
}

function render(v, prev) {
  cur = v;
  if (!v) { stage = null; handRevealed = false; revealedFor = null; endShownFor = ''; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  /* chuyền tay: đổi người thì che bài lại */
  const pending = mode === 'pvp' ? pendingHuman(v) : null;
  if (mode === 'pvp' && revealedFor && (!pending || revealedFor !== pending.id)) { handRevealed = false; revealedFor = null; }

  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'không có người thắng.'}`
    : `🀄 Vòng ${v.round} · Lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · còn ${v.deckCount} lá trong chồng`;
  $('#status').innerHTML = v.players.map(p => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>🃏 ${p.handCount} lá</b> · ${p.melded ? '<span class="opened">✓ đã mở bài</span>' : '<span class="not-opened">… chưa mở bài</span>'}</span>`;
  }).join('');

  /* ----- bàn: đang xếp dở thì hiện bàn nháp, không thì hiện bàn thật ----- */
  const st = ensureStage(v);
  const tableToShow = st ? st.table : v.table;
  const canEdit = !!st;
  $('#table').innerHTML = (tableToShow.length ? tableToShow.map((m, i) => {
    const info = meldInfo(m);
    return `<div class="rk-meld ${canEdit ? 'targetable' : ''}" data-meld="${i}">
      <span class="rk-meld-no">${i + 1}</span>
      <span class="rk-meld-tiles">${m.map(t => tileHtml(t, { sel: st && st.sel && st.sel.tile === t && st.sel.from === 'table', cant: !canEdit })).join('')}</span>
      <span class="rk-meld-info ${info.valid ? '' : 'bad'}">${info.valid ? (info.kind === 'run' ? 'Dãy' : 'Nhóm') + ' · ' + info.value + ' điểm' : '⚠️ chưa hợp lệ'}</span>
    </div>`;
  }).join('')
    : `<div class="rk-table-empty">${canEdit ? 'Bàn chưa có bộ nào — bấm 1 lá trên tay rồi bấm "Bộ mới" để mở bài (cần ≥ 30 điểm).' : 'Bàn chưa có bộ nào.'}</div>`)
    + (canEdit ? `<div class="rk-meld new" data-meld="new"><span class="rk-new-label">＋ Bộ mới — bấm 1 lá rồi bấm đây để tạo bộ mới</span></div>` : '');

  $('#players').innerHTML = v.players.map(p => {
    return `<div class="rk-player ${p.id === v.turn && v.phase === 'playing' ? 'turn' : ''} ${p.id === v.me ? 'me' : ''}">
      ${avatar(p.name, 40)}
      <div class="rk-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${p.id === v.winner ? ' 👑' : ''}</b>
        <span class="rk-ptotal">🃏 ${p.handCount} lá trên tay${v.phase === 'ended' ? ` · điểm ${p.score}` : ''}</span>
        <span class="rk-pmeta">${p.melded ? '✓ đã mở bài' : '… chưa mở bài'} · đã đánh ${p.meldsPlayed} lá · ${p.turns} lượt</span>
      </div>
    </div>`;
  }).join('');

  /* ----- tay bài ----- */
  const handPid = mode === 'pvp' ? (pending ? pending.id : null) : v.me;
  const hand = st ? st.hand : (v.phase === 'playing' && handPid ? handOf(v, handPid) : []);
  const cover = mode === 'pvp' && v.phase === 'playing' && pending && !handRevealed;
  $('#hand-cover').style.display = cover ? '' : 'none';
  $('#hand').style.display = cover ? 'none' : '';
  $('#btn-reveal-hand').textContent = pending ? `👁 Xem bài của ${cleanName(pending.name)}` : '👁 Xem bài của bạn';
  if (!cover) {
    if (!hand.length) {
      $('#hand').innerHTML = v.phase === 'ended' ? '' : (mode === 'pvp' && !pending ? '<p class="note">🤖 Máy đang suy nghĩ…</p>' : '<p class="note">Đang chờ chia bài…</p>');
    } else {
      const handName = mode === 'pvp' ? cleanName((pending || {}).name) : 'bạn';
      $('#hand').innerHTML = `<div class="rk-hand-label">${st ? `Bài của ${handName} — bấm 1 lá để chọn, rồi bấm 1 bộ (hoặc "Bộ mới") để đặt:` : 'Bài trên tay:'}</div>`
        + hand.map(t => tileHtml(t, { sel: st && st.sel && st.sel.tile === t && st.sel.from === 'hand', cant: !st })).join('');
    }
  }

  /* ----- dòng trạng thái lượt + nút bấm ----- */
  if (st) {
    const { played, newValue } = stageInfo(st);
    const openTxt = st.melded ? '' : (newValue >= 30 ? ` · <span class="ok">bộ mới ${newValue} điểm — đủ mở bài ✓</span>` : ` · <span class="need">bộ mới ${newValue} điểm — mở bài cần ≥ 30</span>`);
    $('#stage-info').innerHTML = played.length
      ? `Đã ra <b>${played.length} lá</b>${openTxt} — kiểm tra bàn rồi bấm "✔ Xong lượt".`
      : (st.melded ? 'Bấm 1 lá trên tay rồi bấm 1 bộ (hoặc "Bộ mới") để đánh; hoặc rút 1 lá.' : 'Mở bài lần đầu cần ≥ 30 điểm — bấm lá để xếp bộ, hoặc rút 1 lá.');
    $('#btn-done').disabled = !played.length;
    $('#btn-draw').disabled = !!played.length;
    $('#btn-reset').disabled = !played.length;
  } else {
    $('#stage-info').innerHTML = v.phase === 'playing' ? 'Đang chờ đối thủ đi…' : '';
    $('#btn-done').disabled = true;
    $('#btn-draw').disabled = true;
    $('#btn-reset').disabled = true;
  }
  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.hint();
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
  const rows = (v.final ? v.final.scores : v.players.map(p => ({ id: p.id, name: p.name, score: p.score }))).map(s => {
    const p = v.players.find(x => x.id === s.id) || {};
    const sum = v.final ? v.final.summary[s.id] : null;
    return `<tr><td>${esc(cleanName(s.name))}${s.id === v.winner ? ' 👑' : ''}${s.id === v.me ? ' (bạn)' : ''}</td><td>🃏 ${sum ? sum.tilesLeft : p.handCount} lá</td><td>${s.score >= 0 ? '+' : ''}${s.score} điểm</td></tr>`;
  }).join('');
  const body = `<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Người chơi</th><th>Còn lại</th><th>Điểm</th></tr>${rows}</table><p class="note">${v.endCause === 'pool-empty' ? 'Chồng bài đã hết — người ít điểm bài nhất thắng. ' : ''}${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- xếp bàn: bấm lá rồi bấm bộ ---------- */
function removeFromMeld(st, meldIdx, tile) {
  const m = st.table[meldIdx];
  const i = m.indexOf(tile);
  if (i >= 0) m.splice(i, 1);
  if (!m.length) st.table.splice(meldIdx, 1);
}
$('#table').addEventListener('click', e => {
  if (!cur || cur.phase !== 'playing' || !stage) return;
  const st = stage;
  const tileEl = e.target.closest('[data-tile]');
  const meldEl = e.target.closest('[data-meld]');
  if (tileEl) {
    const t = tileEl.dataset.tile;
    /* bấm lại lá đang chọn thì bỏ chọn */
    if (st.sel && st.sel.tile === t) { st.sel = null; Snd.pick(); render(cur, cur); return; }
    if (st.sel) {
      /* đã chọn 1 lá: đặt nó vào bộ của lá vừa bấm */
      const targetMeld = tileEl.closest('[data-meld]');
      if (!targetMeld) return;
      const mi = +targetMeld.dataset.meld;
      const sel = st.sel;
      if (sel.from === 'hand') {
        const hi = st.hand.indexOf(sel.tile);
        if (hi >= 0) st.hand.splice(hi, 1);
      } else {
        removeFromMeld(st, sel.meld, sel.tile);
      }
      st.table[mi].push(sel.tile);
      st.sel = null;
      Snd.place();
      render(cur, cur);
      return;
    }
    /* chưa chọn lá nào: chọn lá này */
    const meldEl2 = tileEl.closest('[data-meld]');
    st.sel = { tile: t, from: 'table', meld: meldEl2 ? +meldEl2.dataset.meld : null };
    Snd.pick();
    render(cur, cur);
    return;
  }
  if (meldEl) {
    const mi = meldEl.dataset.meld;
    if (!st.sel) { tip('Bấm 1 lá trước, rồi mới bấm bộ để đặt lá đó vào.'); return; }
    const sel = st.sel;
    if (sel.from === 'hand') {
      const hi = st.hand.indexOf(sel.tile);
      if (hi >= 0) st.hand.splice(hi, 1);
    } else {
      removeFromMeld(st, sel.meld, sel.tile);
    }
    if (mi === 'new') {
      st.table.push([sel.tile]);
    } else {
      st.table[+mi].push(sel.tile);
    }
    st.sel = null;
    Snd.place();
    render(cur, cur);
  }
});
$('#hand').addEventListener('click', e => {
  if (!cur || cur.phase !== 'playing' || !stage) return;
  const el = e.target.closest('[data-tile]'); if (!el) return;
  const st = stage;
  const t = el.dataset.tile;
  if (st.sel && st.sel.tile === t) { st.sel = null; Snd.pick(); render(cur, cur); return; }
  if (st.sel && st.sel.from === 'table') { tip('Lá trên bàn không được lấy về tay — bấm 1 bộ để đặt lá đó.'); return; }
  st.sel = { tile: t, from: 'hand', meld: null };
  Snd.pick();
  render(cur, cur);
});
/* ---------- nút lượt ---------- */
$('#btn-done').onclick = () => {
  if (!cur || !stage) return;
  const st = stage;
  const pid = st.turnPid;
  const chk = validatePlayTable(JSON.parse(st.baseTableJson), JSON.parse(st.baseHandJson), st.melded, st.table);
  if (!chk.ok) { Snd.invalid(); tip(chk.reason); return; }
  Snd.place();
  stage = null;
  ui.actAs(pid, { type: 'play', table: st.table });
};
$('#btn-reset').onclick = () => {
  if (!cur || !stage) return;
  const st = stage;
  st.table = JSON.parse(st.baseTableJson);
  st.hand = JSON.parse(st.baseHandJson);
  st.sel = null;
  Snd.hint();
  render(cur, cur);
};
$('#btn-draw').onclick = () => {
  if (!cur || !stage) return;
  const st = stage;
  if (st.hand.length !== st.baseHand.length) { tip('Bạn đã xếp lá ra bàn — bấm "Đặt lại bàn" trước khi rút, hoặc bấm "Xong lượt".'); return; }
  Snd.place();
  stage = null;
  ui.actAs(st.turnPid, { type: 'draw' });
};
$('#btn-reveal-hand').onclick = () => {
  const pending = pendingHuman(cur);
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
  const r = await confirmBox('Nhận thua trận này? Trận kết thúc ngay, người còn lại ít điểm bài nhất thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = mode === 'pvp' ? ((pendingHuman(v) || {}).id || v.me) : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'rummikub', net: NET,
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
