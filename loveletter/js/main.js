// 💌 Love Letter – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng
// shared/net/simplenet.js (cùng pattern Avalon: chủ phòng giữ state, khách
// chỉ gửi action {type, ...}). Bài trên tay chỉ hiện cho chính người đó;
// chơi chuyền tay thì tới lượt ai người đó bấm 👁 xem bài, đánh xong che lại.
import { createGame, applyAction, viewFor, actors, CARD_INFO, TOKEN_TARGET } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'loveletter', min: 2, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Love Letter cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { target: 0 },
  optOk: (k, v) => k === 'target' && [0, 3, 4, 5, 6, 7].includes(+v),
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
  try { localStorage.setItem('gumballz-loveletter-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try {
  const sm = localStorage.getItem('gumballz-loveletter-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/4 người (cần 2–4)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  const o = info.opts || {}, dis = ui.isHost ? '' : 'disabled';
  const t = +o.target || 0;
  $('#opts').innerHTML = `<div class="opt"><b>💌 Dấu Yêu để thắng trận</b><div class="seg">${[[0, 'Tự động'], [3, '3 dấu'], [4, '4 dấu'], [5, '5 dấu'], [6, '6 dấu'], [7, '7 dấu']].map(([v, n]) => `<button type="button" data-target="${v}" aria-pressed="${t === v}" ${dis}>${n}</button>`).join('')}</div><small>Tự động: 2 người cần 7 dấu, 3 người cần 5 dấu, 4 người cần 4 dấu.</small></div>
  <div class="opt"><b>🃏 Bộ bài</b><div class="role-note">16 lá: Vệ binh ×5, Linh mục ×2, Nam tước ×2, Thị nữ ×2, Hoàng tử ×2, Quốc vương, Nữ bá tước, Công chúa. Mỗi vòng úp 1 lá ra ngoài (2 người thì lật thêm 3 lá ngửa).</div></div>
  <div class="opt"><b>🎲 Ai đi trước?</b><div class="role-note">Vòng 1 bốc thăm ngẫu nhiên. Từ vòng 2, người thắng vòng trước đi trước.</div></div>`;
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
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó bấm 👁 xem bài. Nhớ che bài trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
  else if (b.dataset.target !== undefined && ui.isHost) h.setOpt('target', +b.dataset.target);
});
$('#btn-start-online').onclick = () => ui.isHost && ui.net.raw.start();
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let selCard = null;      /* lá đang chọn để đánh */
let selTarget = null;    /* người đang chọn làm mục tiêu */
let handRevealed = false; /* chuyền tay: đã bấm 👁 xem bài của người tới lượt chưa */
let revealedFor = null;
let endShownFor = '';
const kindOf = id => id.slice(0, id.lastIndexOf('-'));
const cardHtml = (id, opts = {}) => {
  const k = kindOf(id), info = CARD_INFO[k];
  return `<div class="ll-card ${opts.mini ? 'mini' : ''} ${opts.sel ? 'sel' : ''} ${opts.dead ? 'dead' : ''}" data-card="${id}">
    <span class="ll-num">${info.value}</span><span class="ll-ic">${info.icon}</span>
    <b class="ll-name">${info.name}</b>${opts.mini ? '' : `<span class="ll-desc">${info.desc}</span>`}
  </div>`;
};
const cardBack = (n = 1) => `<span class="ll-back" title="${n} lá trên tay">🂠</span>`;

/* ---------- vẽ ván ---------- */
function handOf(v, pid) {
  /* chuyền tay (host): lấy tay bài từ state gốc — chỉ cho người cùng máy,
     không lộ bài của máy */
  if (mode === 'pvp' && ui.net && ui.net.raw && ui.net.raw.state) {
    const p = ui.net.raw.state.players.find(x => x.id === pid);
    if (p && !p.isBot) return p.hand.slice();
    if (p && p.isBot) return [];
  }
  const p = v.players.find(x => x.id === pid);
  return p ? (p.hand || []).slice() : [];
}
function render(v, prev) {
  cur = v;
  if (!v) { selCard = null; selTarget = null; handRevealed = false; revealedFor = null; endShownFor = ''; return; }
  const me = v.players.find(p => p.id === v.me) || {};
  const turnP = v.players.find(p => p.id === v.turn);
  /* công bố người đi đầu mỗi vòng (mọi máy đều thấy): vòng 1 bốc thăm ngẫu
     nhiên, vòng sau người thắng vòng trước đi trước — tên đã có trong log mở vòng */
  if (v.phase === 'playing' && turnP) {
    const newRound = (prev && prev.round !== v.round) || (!prev && v.seq === 0);
    if (newRound) tip(v.turn === v.me ? `💌 Vòng ${v.round}: Bạn đi trước!` : `💌 Vòng ${v.round}: ${cleanName(turnP.name)} đi trước!`);
  }
  /* chuyền tay: đổi lượt thì che bài lại */
  if (mode === 'pvp' && revealedFor !== v.turn) { handRevealed = false; revealedFor = null; }
  selCard = null; selTarget = null;
  $('#target-panel').style.display = 'none';

  const turnName = turnP ? cleanName(turnP.name) : '—';
  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'không có người thắng.'}`
    : `💌 Vòng ${v.round} · cần ${v.target} dấu Yêu · còn ${v.deckCount} lá trong bộ bài · tới lượt ${turnName}${v.turn === v.me ? ' (bạn)' : ''}`;
  $('#status').innerHTML = v.players.map(p => {
    const tokens = '💌'.repeat(p.tokens) || '<span class="no-token">chưa có dấu</span>';
    return `<span class="stat">${esc(cleanName(p.name))}: <b>${tokens}</b></span>`;
  }).join('');
  $('#faceup').style.display = v.faceUp && v.faceUp.length ? '' : 'none';
  if (v.faceUp && v.faceUp.length) {
    $('#faceup').innerHTML = `<b>🃏 Lá ngửa ngoài bàn:</b> ${v.faceUp.map(c => cardHtml(c, { mini: true })).join('')}`;
  }
  $('#players').innerHTML = v.players.map(p => {
    const isTurn = p.id === v.turn && v.phase === 'playing';
    const myPeek = (me && p.id !== v.me && v.players.find(x => x.id === v.me)?.peeks?.[p.id]) || null;
    return `<div class="ll-player ${isTurn ? 'turn' : ''} ${p.alive ? '' : 'out'}">
      ${avatar(p.name, 40)}
      <div class="ll-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${isTurn ? ' · <span class="turn-tag">đang đi</span>' : ''}</b>
        <span class="ll-ptokens">${'💌'.repeat(p.tokens)}${p.protected ? ' 🌸 được bảo vệ' : ''}${p.alive ? '' : ' 💀 đã bị loại'}</span>
        <span class="ll-phand">${p.alive ? cardBack(p.handCount) + (p.handCount > 1 ? cardBack(p.handCount - 1) : '') + `<small>${p.handCount} lá trên tay</small>` : ''}${myPeek ? ` · <small class="peek-tag">👁 bạn đã xem: ${CARD_INFO[myPeek].icon} ${CARD_INFO[myPeek].name}</small>` : ''}</span>
        ${p.discards.length ? `<span class="ll-discards">Đã bỏ: ${p.discards.map(c => cardHtml(c, { mini: true })).join('')}</span>` : '<span class="ll-discards"><small>Chưa bỏ lá nào</small></span>'}
      </div>
    </div>`;
  }).join('');

  /* ----- bài trên tay ----- */
  const handPid = mode === 'pvp' ? v.turn : v.me;
  const hand = v.phase === 'playing' ? handOf(v, handPid) : [];
  const canControl = handPid && ui.controls(handPid);
  const turnIsHuman = turnP && !turnP.isBot;
  const cover = mode === 'pvp' && v.phase === 'playing' && !handRevealed && turnIsHuman;
  $('#hand-cover').style.display = cover ? '' : 'none';
  $('#hand').style.display = cover ? 'none' : '';
  $('#btn-reveal-hand').textContent = `👁 Xem bài của ${turnName}`;
  if (!cover) {
    if (!hand.length) {
      $('#hand').innerHTML = v.phase === 'ended' ? '' : (turnIsHuman === false && v.phase === 'playing' ? `<p class="note">🤖 ${esc(turnName)} đang suy nghĩ…</p>` : '<p class="note">Bạn đã bị loại khỏi vòng này — chờ vòng sau nhé.</p>');
    } else {
      /* Nữ bá tước bắt buộc nếu cầm chung Vua/Hoàng tử — tính được từ tay bài */
      const kinds = hand.map(kindOf);
      const legal = (kinds.includes('countess') && (kinds.includes('king') || kinds.includes('prince')))
        ? hand.filter(c => kindOf(c) === 'countess') : hand;
      $('#hand').innerHTML = `<div class="ll-hand-label">${canControl ? 'Bài của bạn — bấm 1 lá để đánh:' : 'Bài trên tay:'}</div>` + hand.map(c => cardHtml(c, { sel: false })).join('');
      $('#hand').querySelectorAll('.ll-card').forEach(el => {
        if (!legal.includes(el.dataset.card)) el.classList.add('illegal');
        el.classList.toggle('cant', !canControl);
      });
    }
  }
  /* gợi ý Linh mục đã xem */
  const myPeeks = v.players.find(p => p.id === v.me)?.peeks || {};
  const peekTxt = Object.entries(myPeeks).map(([tid, k]) => {
    const pn = v.players.find(p => p.id === tid);
    return pn ? `👁 ${esc(cleanName(pn.name))} đang cầm ${CARD_INFO[k].icon} ${CARD_INFO[k].name}` : '';
  }).filter(Boolean).join(' · ');
  $('#peek').innerHTML = peekTxt ? `<span class="peek-tag">${peekTxt}</span>` : '';
  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.round !== prev.round) Snd.hint();
    else if (v.seq !== prev.seq) {
      const myP = v.players.find(p => p.id === v.me);
      const prevP = prev.players.find(p => p.id === v.me);
      if (myP && prevP && !myP.alive && prevP.alive) Snd.wrong();
      else Snd.place();
    }
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
  const body = `<p>${v.players.map(p => `${esc(cleanName(p.name))}: <b>${p.tokens} dấu Yêu</b>${p.id === v.winner ? ' 👑' : ''}`).join('<br>')}</p><p class="note">${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); ui.net.raw.start(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- đánh bài: chọn lá → chọn người → (Vệ binh) đoán lá ---------- */
function targetsFor(kind, meId) {
  if (!cur) return [];
  const me = cur.players.find(p => p.id === meId);
  return cur.players.filter(p => {
    if (!p.alive) return false;
    if (kind === 'prince') return p.id === meId || !p.protected; /* Hoàng tử được chọn cả mình, nhưng không được chọn người khác đang được Thị nữ bảo vệ (engine từ chối thì lượt kẹt luôn — test đã kẹt 300 lượt vì vậy) */
    if (p.id === meId) return false;
    if (p.protected) return false;
    return true;
  });
}
function playCard(card, target, guess) {
  const handPid = mode === 'pvp' ? cur.turn : cur.me;
  const act = { type: 'play', card };
  if (target) act.target = target;
  if (guess) act.guess = guess;
  ui.actAs(handPid, act);
  Snd.place();
  handRevealed = false; revealedFor = null;
  selCard = null; selTarget = null;
  $('#target-panel').style.display = 'none';
}
$('#hand').addEventListener('click', e => {
  const el = e.target.closest('.ll-card'); if (!el || !cur || cur.phase !== 'playing') return;
  const handPid = mode === 'pvp' ? cur.turn : cur.me;
  if (!ui.controls(handPid)) { tip('Chưa tới lượt bạn.'); return; }
  if (el.classList.contains('illegal')) { Snd.invalid(); tip('Đang cầm Nữ bá tước chung với Quốc vương / Hoàng tử thì bắt buộc đánh Nữ bá tước.'); return; }
  const card = el.dataset.card, kind = kindOf(card);
  selCard = card; selTarget = null;
  Snd.pick();
  if (['guard', 'priest', 'baron', 'prince', 'king'].includes(kind)) {
    const ts = targetsFor(kind, handPid);
    if (!ts.length) {
      /* không có ai để chọn (mọi người đang được Thị nữ bảo vệ) thì lá
         đánh ra không có hiệu ứng — vẫn đánh được */
      tip(kind === 'prince' ? 'Hoàng tử chọn chính mình.' : 'Không có ai để chọn — lá này không có hiệu ứng.');
      if (kind === 'prince') playCard(card, handPid);
      else playCard(card);
      return;
    }
    $('#target-title').textContent = { guard: '🛡️ Vệ binh — chọn người để đoán bài', priest: '⛪ Linh mục — chọn người để xem bài', baron: '⚖️ Nam tước — chọn người để so bài', prince: '🤴 Hoàng tử — chọn người phải bỏ bài bốc lại', king: '👑 Quốc vương — chọn người để đổi bài' }[kind];
    $('#target-sub').textContent = 'Bấm 1 người bên dưới' + (kind === 'guard' ? ', rồi chọn lá bạn đoán họ đang cầm.' : '.');
    $('#target-body').innerHTML = ts.map(p => `<button class="btn" data-tid="${p.id}">${avatar(p.name, 28)} ${esc(cleanName(p.name))}${p.id === handPid ? ' (mình)' : ''}</button>`).join('') + (kind === 'guard' ? `<div class="guess-row" id="guess-row" style="display:none"><b>Đoán họ cầm lá:</b><div class="guess-btns">${[2, 3, 4, 5, 6, 7, 8].map(n => `<button class="btn" data-guess="${n}">${CARD_INFO[Object.keys(CARD_INFO).find(k => CARD_INFO[k].value === n)].icon} ${n} · ${CARD_INFO[Object.keys(CARD_INFO).find(k => CARD_INFO[k].value === n)].name}</button>`).join('')}</div></div>` : '');
    $('#target-panel').style.display = '';
  } else {
    playCard(card);
  }
});
$('#target-body').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !cur) return;
  if (b.dataset.tid) {
    selTarget = b.dataset.tid;
    [...$('#target-body').querySelectorAll('[data-tid]')].forEach(x => x.classList.toggle('sel', x.dataset.tid === selTarget));
    Snd.pick();
    if (selCard && kindOf(selCard) === 'guard') { $('#guess-row').style.display = ''; return; }
    if (selCard) playCard(selCard, selTarget);
  } else if (b.dataset.guess && selCard && selTarget) {
    playCard(selCard, selTarget, +b.dataset.guess);
  }
});
$('#btn-target-cancel').onclick = () => { selCard = null; selTarget = null; $('#target-panel').style.display = 'none'; };
$('#btn-reveal-hand').onclick = () => { handRevealed = true; revealedFor = cur ? cur.turn : null; Snd.pick(); render(cur, cur); };

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
  const r = await confirmBox('Nhận thua ván này? Bạn bị loại khỏi trận luôn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const pid = mode === 'pvp' ? v.turn : v.me;
    ui.actAs(pid, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'loveletter', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      /* đấu máy: bạn + 3 máy = 4 người */
      for (let i = 0; i < 3; i++) h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
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
