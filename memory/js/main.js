// 🃏 Memory – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Bắn Tàu/Cờ Caro: chủ phòng giữ state,
// khách chỉ gửi action {flip, hide}). Bộ bài do host xáo 1 lần khi tạo ván và
// nằm trong state chung — 2 bên luôn thấy cùng 1 bộ bài. 2 lá lật trượt giữ
// ngửa chờ úp lại (pendingHide) rồi host tự gửi action 'hide' sau ~900ms.
import { createGame, applyAction, viewFor, actors, LEVELS } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { promptBox, confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=8';
import { record, recordEvent } from '../../shared/ui/stats.js?v=69';

const HIDE_MS = 900; /* 2 lá trượt giữ ngửa chừng này rồi úp lại */
const LEVEL_LABEL = { easy: 'Dễ · 12 lá', medium: 'Vừa · 16 lá', hard: 'Khó · 24 lá' };

const NET = makeNet({
  game: 'memory', min: 2, max: 2, maxSeats: 10, allowLocal: true,
  defaults: { level: 'medium' },
  optOk: (k, v, opts) => k === 'level' ? ['easy', 'medium', 'hard'].includes(v) : false,
  minMsg: 'Memory cần 2 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 600,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo'],
});

/* ---------- chế độ chơi + mức khó (màn hình chính) ---------- */
let mode = 'solo'; /* solo | ai-easy | ai-hard | pvp | online */
let level = 'medium'; /* easy | medium | hard */
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const lvBtns = [...document.querySelectorAll('[data-lv]')];
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#fld-name2').style.display = m === 'pvp' ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  try { localStorage.setItem('gumballz-memory-mode', m); } catch (e) {}
}
function setLevel(v) {
  if (!LEVELS[v]) v = 'medium';
  level = v;
  lvBtns.forEach(b => { b.classList.toggle('on', b.dataset.lv === v); b.setAttribute('aria-pressed', b.dataset.lv === v); });
  try { localStorage.setItem('gumballz-memory-level', v); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
lvBtns.forEach(b => b.addEventListener('click', () => setLevel(b.dataset.lv)));
try {
  const sm = localStorage.getItem('gumballz-memory-mode');
  if (['solo', 'ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('solo');
  setLevel(localStorage.getItem('gumballz-memory-level') || 'medium');
} catch (e) { setMode('solo'); setLevel('medium'); }

/* ---------- trạng thái ván ---------- */
let cur = null, endShownGid = null, lastFlipKey = '', lastSeq = -1;
let soloG = null; /* state engine chơi đơn (không qua mạng) */
let hideTimer = null, gameStartAt = 0, endAt = 0, curGid = '';
const myName = () => { try { return localStorage.getItem('gumballz-name') || 'Bạn'; } catch (e) { return 'Bạn'; } };
const fmtTime = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
/* xếp hạng sao chơi đơn: 3 sao = không trượt lần nào; 2 sao = trượt ≤ số cặp; còn lại 1 sao */
const starsFor = (misses, pairs) => misses === 0 ? 3 : misses <= pairs ? 2 : 1;

function clearHideTimer() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } }
/* host tự úp lại 2 lá trượt sau 1 nhịp — khách chỉ việc chờ state mới về */
function scheduleHide(v) {
  if (!v || !v.pendingHide || !ui.isHost || hideTimer) return;
  const gid = v.gid, seq = v.seq, turn = v.turn;
  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (!cur || cur.gid !== gid || cur.seq !== seq || !cur.pendingHide) return;
    ui.actAs(turn, { type: 'hide' });
  }, HIDE_MS);
}

/* ---------- phòng chờ ---------- */
let optsLoaded = false;
function renderLobby(info, u) {
  const host = u.isHost && u.net ? u.net.raw : null, o = info.opts || {}, dis = u.isHost ? '' : 'disabled', n = info.players.length;
  if (host && !optsLoaded) {
    /* nhớ mức khó lần trước của chủ phòng */
    optsLoaded = true;
    const saved = ls.get('gumballz-memory-level');
    if (['easy', 'medium', 'hard'].includes(saved) && host.opts.level !== saved) { host.opts.level = saved; host.pushLobby(); return; }
  }
  $('#pcount').textContent = `${n}/2 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${u.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = !u.isHost ? '' : (n < 2
    ? `<div class="row-btns"><button class="btn" id="btn-addbot-easy">🤖 Thêm máy Dễ</button><button class="btn" id="btn-addbot-hard">🧠 Thêm máy Khó</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  const seg = (key, items) => `<div class="seg">${items.map(([v, nm]) => `<button type="button" data-opt="${key}" data-v="${v}" aria-pressed="${String(o[key]) === String(v)}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#opts').innerHTML = `<div class="opt"><b>😊 Mức khó (số lá)</b>${seg('level', [['easy', 'Dễ · 12 lá'], ['medium', 'Vừa · 16 lá'], ['hard', 'Khó · 24 lá']])}<small>Càng nhiều lá càng khó nhớ vị trí.</small></div>`;
  $('#btn-start-online').style.display = u.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2;
  $('#wait-msg').style.display = u.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.isHost ? ui.net.raw : null;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot-easy') h.addBot({ level: 'easy' });
  else if (b.id === 'btn-addbot-hard') h.addBot({ level: 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n2 = await promptBox('Hai người chuyền máy cho nhau, mỗi người một lượt lật.', { title: '👥 Tên người chơi thứ hai', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n2) h.addLocal(n2);
  } else if (b.dataset.opt) {
    const v = b.dataset.v;
    h.setOpt(b.dataset.opt, v);
    try { localStorage.setItem('gumballz-memory-level', v); } catch (err) {}
  }
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();

/* ---------- chơi đơn (không qua mạng) ---------- */
function startSolo() {
  clearHideTimer();
  const p1name = ($('#name').value.trim() || myName()).slice(0, 16);
  try { localStorage.setItem('gumballz-name', p1name); } catch (e) {}
  soloG = createGame([{ id: 'p1', name: p1name }], { level });
  gameStartAt = Date.now(); endAt = 0; curGid = soloG.gid;
  endShownGid = null; lastFlipKey = ''; lastSeq = -1;
  $('#screen-home').classList.remove('active');
  $('#screen-game').classList.add('active');
  render(viewFor(soloG, 'p1'));
  tip('Lật 2 lá giống nhau để ăn cặp — nhớ vị trí nhé!');
}
function showHome() {
  clearHideTimer();
  soloG = null; cur = null; endShownGid = null; lastFlipKey = ''; lastSeq = -1;
  gameStartAt = 0; endAt = 0; curGid = '';
  if (!ui.net) optsLoaded = false;
  $('#screen-game').classList.remove('active');
  $('#screen-lobby').classList.remove('active');
  $('#screen-home').classList.add('active');
}
function soloFlip(i) {
  if (!soloG || soloG.phase !== 'playing') return;
  const r = applyAction(soloG, 'p1', { type: 'flip', index: i });
  if (!r.ok) { tip(r.reason || 'Không lật được lá này.'); return; }
  render(viewFor(soloG, 'p1'));
  if (r.match === false) {
    /* lật trượt: úp lại sau 1 nhịp (chơi đơn tự úp, không qua mạng) */
    setTimeout(() => {
      if (!soloG || soloG.gid !== curGid || !soloG.pendingHide) return;
      applyAction(soloG, 'p1', { type: 'hide' });
      render(viewFor(soloG, 'p1'));
    }, HIDE_MS);
  }
}
$('#btn-start').onclick = () => {
  if (mode === 'solo') { startSolo(); return; }
  ui.startHost(true);
};

/* ---------- ván chơi (dùng chung cho chơi đơn + online) ---------- */
function boardHTML(v) {
  const lastPair = v.lastFlip && v.lastFlip.pair ? new Set(v.lastFlip.pair) : new Set();
  let html = '';
  for (let i = 0; i < v.cards.length; i++) {
    const c = v.cards[i];
    const cls = ['mem-card'];
    if (c.up) cls.push('up');
    if (c.matched) cls.push('matched');
    if (lastPair.has(i) && (c.up || c.matched)) cls.push('last');
    html += `<button type="button" class="${cls.join(' ')}" data-i="${i}" ${(c.up || c.matched) ? 'disabled' : ''} aria-label="Lá ${i + 1}${c.matched ? ', đã trúng cặp ' + (c.face || '') : c.up ? ', đang ngửa ' + (c.face || '') : ', đang úp'}"><span class="mem-inner"><span class="mem-face mem-front"></span><span class="mem-face mem-back">${c.face ? esc(c.face) : ''}</span></span></button>`;
  }
  return html;
}
function render(v, prev) {
  if (!v) { cur = null; lastSeq = -1; endShownGid = null; clearHideTimer(); return; }
  const isNewGame = v.gid !== curGid;
  if (isNewGame) { curGid = v.gid; gameStartAt = Date.now(); endAt = 0; endShownGid = null; lastFlipKey = ''; lastSeq = -1; clearHideTimer(); }
  cur = v;
  /* âm thanh theo lần lật mới (flips tăng = có lá mới được lật; úp lại không tăng flips nên không kêu lại) */
  const fk = v.gid + '|' + v.flips + '|' + (v.lastFlip ? v.lastFlip.i : '');
  if (v.lastFlip && fk !== lastFlipKey) {
    lastFlipKey = fk;
    if (v.lastFlip.match === true) Snd.match();
    else if (v.lastFlip.match === false) Snd.miss();
    else Snd.flip();
  }
  lastSeq = v.seq;
  scheduleHide(v);
  const me = v.players.find(p => p.id === v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  const away = (v.away || []).map(id => (v.players.find(p => p.id === id) || {}).name).filter(Boolean);
  const found = v.players.reduce((a, p) => a + p.pairs, 0);
  if (v.phase === 'ended') endAt = endAt || Date.now();
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.draw ? '🤝 Hòa!' : `🏁 ${v.winner === v.me ? 'Bạn thắng! 🎉' : esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng!'}`)
    : (v.solo ? `🃏 Tìm đủ ${v.pairs} cặp để thắng — đã tìm ${found} cặp!`
      : `⚔️ Lượt ${v.turnNo} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn — lật 2 lá!' : 'đang chờ ' + esc(cleanName(turnP.name)) + ' lật…') : ''}${away.length ? ` · ⚠️ ${esc(away.join(', '))} mất kết nối — máy sẽ đi thay` : ''}`);
  const seats = $('#seats');
  seats.classList.toggle('solo', v.solo);
  seats.innerHTML = v.players.map(p => `<div class="seat${p.id === v.turn && v.phase === 'playing' ? ' on' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
    <span class="pair-badge">🎯 ${p.pairs} cặp</span>
    <small>${p.isBot ? 'máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? 'cùng máy' : ''}</small></div>`).join('');
  $('#stat-flips').textContent = v.flips;
  $('#stat-pairs').textContent = found + '/' + v.pairs;
  $('#stat-miss').textContent = v.misses;
  const wrap = $('#board-wrap');
  wrap.classList.toggle('cols-6', v.cols === 6);
  wrap.classList.toggle('cols-4', v.cols !== 6);
  const board = $('#board');
  board.style.setProperty('--cols', v.cols);
  if (board.dataset.gid !== v.gid) {
    /* ván mới: dựng lại bàn 1 lần; các nước sau chỉ đổi class tại chỗ để
       hiệu ứng lật 3D (transition) còn chạy được — rebuild innerHTML mỗi
       nước sẽ làm mất animation. */
    board.dataset.gid = v.gid; board.dataset.seq = String(v.seq);
    board.innerHTML = boardHTML(v);
  } else if (board.dataset.seq !== String(v.seq)) {
    board.dataset.seq = String(v.seq);
    const lastPair = v.lastFlip && v.lastFlip.pair ? new Set(v.lastFlip.pair) : new Set();
    board.querySelectorAll('.mem-card').forEach(el => {
      const i = Number(el.dataset.i), c = v.cards[i];
      if (!c) return;
      el.classList.toggle('up', !!c.up);
      el.classList.toggle('matched', !!c.matched);
      el.classList.toggle('last', lastPair.has(i) && (c.up || c.matched));
      if (c.up || c.matched) el.setAttribute('disabled', ''); else el.removeAttribute('disabled');
      const back = el.querySelector('.mem-back');
      if (back && (c.up || c.matched) && c.face) back.textContent = c.face;
    });
  }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có nước lật nào.</div>';
  /* kết thúc: ghi thành tựu + hộp thoại (1 lần / ván).
     Số ván/thắng ở chế độ mạng do stats.watch() tự ghi khi ván kết thúc
     (simplenet bọc onState) — KHÔNG gọi record() tay ở đây, kẻo đếm trùng.
     Chơi đơn không qua mạng nên main.js tự record(). Chỉ ghi recordEvent cho
     các huy hiệu (trí nhớ hoàn hảo, xong nhanh…). */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = v.winner === v.me;
    const seconds = Math.round(((endAt || Date.now()) - gameStartAt) / 1000);
    if (v.solo) {
      record('memory', true);
      recordEvent('memory', 'end', { won: true, misses: v.misses, seconds, level: v.level, solo: true }); /* huy hiệu hoàn hảo / xong nhanh ở chơi đơn (chế độ mạng đã ghi ở nhánh dưới) */
      Snd.winJingle();
      const stars = starsFor(v.misses, v.pairs);
      ui.openModal(`<h2>🏆 Tìm đủ ${v.pairs} cặp!</h2>
        <p style="text-align:center;font-size:26px;letter-spacing:4px">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
        <p style="text-align:center">⏱ ${fmtTime(seconds * 1000)} · 🔄 ${v.flips} lá đã lật · ❌ ${v.misses} lần trượt · mức ${LEVEL_LABEL[v.level] || ''}</p>
        <p style="text-align:center">${v.misses === 0 ? 'Trí nhớ hoàn hảo — không trượt lần nào! 🧠' : stars === 2 ? 'Nhớ khá tốt! Thử lại để được 3 sao nhé.' : 'Tìm đủ cặp rồi! Chơi lại để nhớ tốt hơn nhé.'}</p>
        <div class="btn-col"><button class="btn big pri" id="m-again">🔁 Chơi ván mới</button>
        <button class="btn" id="m-home">🏠 Về màn hình chính</button></div>`);
      $('#m-again').onclick = () => { ui.closeModal(); startSolo(); };
      $('#m-home').onclick = () => { ui.closeModal(); showHome(); };
    } else {
      recordEvent('memory', 'end', { won, misses: v.misses, seconds, level: v.level, solo: false });
      Snd.winJingle();
      const score = v.players.map(p => `${esc(cleanName(p.name))} ${p.pairs}`).join(' – ');
      ui.openModal(`<h2>${v.draw ? '🤝 Hòa!' : won ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName((v.players.find(p => p.id === v.winner) || {}).name)) + ' thắng!'}</h2>
        <p style="text-align:center">${score} cặp · ⏱ ${fmtTime(seconds * 1000)} · 🔄 ${v.flips} lá đã lật · mức ${LEVEL_LABEL[v.level] || ''}</p>
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
}

/* ---------- bấm lá bài ---------- */
$('#board').addEventListener('click', e => {
  const b = e.target.closest('.mem-card'); if (!b) return;
  const i = Number(b.dataset.i);
  if (soloG) { soloFlip(i); return; }
  const v = cur;
  if (!v || v.phase !== 'playing') return;
  if (v.pendingHide) { tip('Đang úp lại 2 lá vừa lật, chờ chút…'); return; }
  if (!ui.net) { tip('Chưa vào ván.'); return; }
  if (!ui.controls(v.turn)) { tip(v.spec ? 'Bạn đang xem ván đấu 👀' : 'Chưa tới lượt bạn.'); return; }
  const c = v.cards[i];
  if (!c) return;
  if (c.matched) { tip('Lá này đã trúng cặp rồi.'); return; }
  if (c.up) { tip('Lá này đang ngửa rồi.'); return; }
  ui.actAs(v.turn, { type: 'flip', index: i });
});

/* ---------- đồng hồ bấm giờ ---------- */
setInterval(() => {
  const el = $('#stat-time'); if (!el) return;
  if (!gameStartAt || !$('#screen-game').classList.contains('active')) return;
  el.textContent = fmtTime((endAt || Date.now()) - gameStartAt);
}, 500);

/* ---------- nút phụ ---------- */
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký trận đấu</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
$('#btn-new').onclick = () => {
  if (soloG) { startSolo(); return; }
  if (!cur) return;
  if (!ui.isHost) { tip('Chỉ chủ phòng mở ván mới được.'); return; }
  ui.net.raw.start();
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'memory', net: NET,
  offline: h => {
    /* phòng offline trên máy này: thêm máy / người cùng máy theo chế độ đã chọn */
    if (mode === 'ai-easy' || mode === 'ai-hard') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
    else if (mode === 'pvp') {
      const n2 = ($('#name2').value.trim() || 'Người chơi 2').slice(0, 16);
      if (!h.addLocal(n2)) h.addBot({ level: 'hard' });
    }
  },
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev, u) => {
    if (!v) {
      /* rời phòng / phòng giải tán / chủ phòng bấm về phòng chờ */
      clearHideTimer(); soloG = null; cur = null; endShownGid = null; lastFlipKey = '';
      gameStartAt = 0; endAt = 0; curGid = '';
      if (!u.net) optsLoaded = false;
      return;
    }
    soloG = null;
    render(v, prev);
  },
});
/* nút 🏠 rời ván: về đúng trang chủ web (gameKit chỉ về màn hình đầu của game) */
$('#btn-leave').onclick = async () => {
  if (soloG) {
    const r = await confirmBox('Ván đang chơi dở sẽ không tính điểm.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
    if (r) { showHome(); location.href = '../'; }
    return;
  }
  const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
  if (r) { ui.leave(); setTimeout(() => { location.href = '../'; }, 250); }
};
