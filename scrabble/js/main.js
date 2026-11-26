// 🔤 Scrabble – giao diện. Luật ở engine.js, bot ở bot.js,
// phòng/mạng dùng shared/net/simplenet.js (cùng pattern Blokus/Quoridor:
// chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Cách chơi trên giao diện: bấm 1 chữ trên khay để chọn, rồi bấm vào 1 ô
// trên bàn để đặt tạm (bấm lại vào chữ trên bàn để thu về); các chữ đặt
// tạm phải thẳng 1 hàng ngang hoặc 1 cột dọc; bấm ✅ Đặt từ để đánh.
// Ô trống (★): bấm vào ô trên bàn sẽ hỏi dùng làm chữ nào. Đổi chữ: bấm
// 🔀 Đổi chữ rồi chọn các chữ trên khay, bấm ✅ Đổi chữ.
import { createGame, applyAction, viewFor, actors, validatePlace, TILE_VALUE, SIZE, CENTER, PREMIUM } from './engine.js?v=2';
import { botAction } from './bot.js?v=2';
import { GUIDE_HTML } from './guide.js?v=2';
import { loadExtraDict } from './words.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

/* ---------- từ điển mở rộng: nạp kho từ Nối từ trước khi mở phòng ----------
   (words.js: ~710 từ gốc → ~45.000 từ). Nạp lỗi (mất mạng/file://) thì
   chơi tiếp với từ điển gốc, không chặn trang. */
try { await loadExtraDict(); } catch (e) {}

const NET = makeNet({
  game: 'scrabble', min: 2, max: 4, maxSeats: 4, allowLocal: true,
  minMsg: 'Scrabble cần 2–4 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: {},
  optOk: (k, v) => k === 'firstIdx' && Number.isInteger(v) && v >= 0 && v < 4,
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 700 + Math.random() * 900,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh', 'Cốm'],
});

/* 🔄 Xoay lượt đi đầu qua các ván: host giữ bộ đếm trong localStorage
   (sống qua cả tải lại trang); ván nào lấy firstIdx = đếm % số người
   rồi tăng đếm, đăng lên opts để mọi người trong phòng chờ đều thấy ai
   đi trước ván tới. */
const FT_KEY = 'gumballz-scrabble-firstctr';
let firstCtr = 0;
try { firstCtr = +localStorage.getItem(FT_KEY) || 0; } catch (e) {}
const peekFirst = n => (n > 0 ? firstCtr % n : 0);
const takeFirst = n => { const i = peekFirst(n); firstCtr++; try { localStorage.setItem(FT_KEY, String(firstCtr)); } catch (e) {} return i; };
let lastLobby = null;
function startGame() {
  if (!ui.isHost || !ui.net || !ui.net.raw) return;
  const n = (lastLobby && lastLobby.players && lastLobby.players.length) || 2;
  if (n < 2) return;
  ui.net.raw.start({ firstIdx: takeFirst(n) });
}

/* ---------- chế độ chơi (màn hình chính) ---------- */
let mode = 'ai-hard'; /* ai-easy | ai-hard | pvp | online */
let playerCount = 2; /* đấu máy: tổng số người (bạn + máy) */
try {
  const c = +localStorage.getItem('gumballz-scrabble-count');
  if (c >= 2 && c <= 4) playerCount = c;
} catch (e) {}
const modeBtns = [...document.querySelectorAll('[data-mode]')];
const countBtns = [...document.querySelectorAll('#count-seg [data-count]')];
function drawCount() {
  countBtns.forEach(b => { b.classList.toggle('on', +b.dataset.count === playerCount); b.setAttribute('aria-pressed', +b.dataset.count === playerCount); });
}
countBtns.forEach(b => b.addEventListener('click', () => {
  playerCount = +b.dataset.count; drawCount();
  try { localStorage.setItem('gumballz-scrabble-count', String(playerCount)); } catch (e) {}
}));
function setMode(m) {
  mode = m;
  modeBtns.forEach(b => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', b.dataset.mode === m); });
  $('#count-box').style.display = (m === 'ai-easy' || m === 'ai-hard') ? '' : 'none';
  $('#local-box').style.display = m === 'online' ? 'none' : '';
  $('#online-box').style.display = m === 'online' ? '' : 'none';
  $('#btn-start').textContent = m === 'pvp' ? '👥 Mở phòng chuyền tay' : m === 'ai-easy' ? `🤖 Bắt đầu chơi với máy Dễ (${playerCount} người)` : `🧠 Bắt đầu chơi với máy Khó (${playerCount} người)`;
  try { localStorage.setItem('gumballz-scrabble-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
drawCount();
try {
  const sm = localStorage.getItem('gumballz-scrabble-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }
// đổi số người thì cập nhật chữ nút Bắt đầu
countBtns.forEach(b => b.addEventListener('click', () => setMode(mode)));

/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  lastLobby = info;
  const n = info.players.length;
  /* đăng lượt đi đầu ván tới lên opts để khách trong phòng cũng thấy đúng người */
  const peek = peekFirst(n);
  if (ui.isHost && ui.net && ui.net.raw && typeof ui.net.raw.setOpt === 'function' && (info.opts || {}).firstIdx !== peek) ui.net.raw.setOpt('firstIdx', peek);
  const fi = Number.isInteger(info.opts && info.opts.firstIdx) ? info.opts.firstIdx : peek;
  $('#pcount').textContent = `${n}/4 người (cần 2–4)`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span>${i === fi ? '<span class="seat-role">🎯 Đi trước</span>' : ''}${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 4
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  $('#opts').innerHTML = `<div class="opt"><b>🔤 Bàn cờ</b><div class="role-note">Bàn 15×15, mỗi người 7 chữ trên khay, túi 100 chữ. Từ đầu phải phủ ô trung tâm ★, từ sau phải nối với chữ đã có. Đặt hết 7 chữ = Bingo +50.</div></div>`;
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
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó đánh. Nhớ che màn hình trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
    if (n) h.addLocal(n);
  }
});
$('#btn-start-online').onclick = () => startGame();
$('#btn-copy-code').onclick = () => { const c = ($('#room-code').textContent || '').trim(); if (!c || c === '—') return; navigator.clipboard?.writeText(c).then(() => tip('Đã chép mã phòng 📋'), () => tip(c)); };
$('#btn-start').onclick = () => { ui.startHost(true); };

/* ---------- trạng thái hiển thị ---------- */
let cur = null;
let endShownFor = '';
let announcedGid = ''; /* gid đã công bố lượt đi đầu (tránh toast lặp khi vẽ lại) */
let staged = []; /* [{rackIdx, ch, blank, letter, r, c}] — chữ đặt tạm trên bàn */
let selRack = null; /* vị trí chữ đang chọn trên khay */
let stageDir = 'H'; /* hướng của từ đang đặt tạm (1 chữ) */
let stageFor = null;
let stageRackJson = '';
let exchanging = false;
let exchangeSel = new Set();
let rackRevealed = false, revealedFor = null;

function resetStage() {
  staged = []; selRack = null; stageDir = 'H';
  exchanging = false; exchangeSel = new Set();
}
function controlPid(v) {
  if (!v || v.phase !== 'playing') return null;
  const pid = v.turn;
  return pid && ui.controls(pid) ? pid : null;
}
function pendingHuman(v) {
  if (!v || v.phase !== 'playing') return null;
  const p = v.players.find(x => x.id === v.turn);
  return p && !p.isBot ? p : null;
}
/* khay chữ của 1 người: chuyền tay (host) thì lấy từ state gốc — chỉ cho
   người cùng máy, không lộ khay của máy (theo mẫu Rummikub) */
function rackOf(v, pid) {
  if (mode === 'pvp' && ui.net && ui.net.raw && ui.net.raw.state) {
    const p = ui.net.raw.state.players.find(x => x.id === pid);
    if (p && !p.isBot) return p.rack.slice();
    if (p && p.isBot) return [];
  }
  const p = v.players.find(x => x.id === pid);
  return p ? (p.rack || []).slice() : [];
}
/* view dùng để kiểm tra trước khi gửi (chỉ cần khay của người đang đi) */
function validationView(v, pid) {
  const vv = JSON.parse(JSON.stringify(v));
  const p = vv.players.find(x => x.id === pid);
  if (p) p.rack = rackOf(v, pid);
  return vv;
}

/* ---------- từ đang đặt tạm ---------- */
function buildWord(v) {
  if (!staged.length) return null;
  let dir = stageDir;
  const rows = new Set(staged.map(t => t.r)), cols = new Set(staged.map(t => t.c));
  if (staged.length >= 2) {
    if (rows.size === 1) dir = 'H';
    else if (cols.size === 1) dir = 'V';
    else return { ok: false, reason: 'Các chữ đặt phải thẳng 1 hàng ngang hoặc 1 cột dọc.' };
  }
  const line = dir === 'H' ? staged[0].r : staged[0].c;
  let lo = Math.min(...staged.map(t => dir === 'H' ? t.c : t.r));
  let hi = Math.max(...staged.map(t => dir === 'H' ? t.c : t.r));
  const cellAt = (rr, cc) => v.board[rr * SIZE + cc];
  while (lo > 0) {
    const rr = dir === 'H' ? line : lo - 1, cc = dir === 'H' ? lo - 1 : line;
    if (!cellAt(rr, cc)) break;
    lo--;
  }
  while (hi < SIZE - 1) {
    const rr = dir === 'H' ? line : hi + 1, cc = dir === 'H' ? hi + 1 : line;
    if (!cellAt(rr, cc)) break;
    hi++;
  }
  const r0 = dir === 'H' ? line : lo, c0 = dir === 'H' ? lo : line;
  let word = '';
  const blanks = [];
  for (let k = lo; k <= hi; k++) {
    const rr = dir === 'H' ? line : k, cc = dir === 'H' ? k : line;
    const st = staged.find(t => t.r === rr && t.c === cc);
    const cell = cellAt(rr, cc);
    if (st) { word += st.letter; if (st.blank) blanks.push(word.length - 1); }
    else if (cell) word += cell.ch;
    else return { ok: false, reason: 'Từ bị hở 1 ô trống ở giữa — phải đặt kín hoặc dùng chữ có sẵn lấp vào.' };
  }
  return { ok: true, dir, r: r0, c: c0, word, blanks };
}
function validateCurrent(v, pid) {
  const bw = buildWord(v);
  if (!bw) return { ok: false, reason: 'Chưa đặt chữ nào.' };
  if (!bw.ok) return bw;
  const chk = validatePlace(validationView(v, pid), pid, { type: 'place', dir: bw.dir, r: bw.r, c: bw.c, word: bw.word, blanks: bw.blanks });
  if (!chk.ok) return chk;
  return { ok: true, dir: bw.dir, r: bw.r, c: bw.c, word: bw.word, blanks: bw.blanks, score: chk.score, bingo: chk.bingo };
}

/* ---------- vẽ bàn + khay ---------- */
function boardHtml(v) {
  let html = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = v.board[r * SIZE + c];
      const st = staged.find(t => t.r === r && t.c === c);
      const prem = PREMIUM[r][c];
      const cls = ['sc-cell'];
      if (prem) cls.push('p-' + prem.toLowerCase());
      let inner = '';
      if (cell) {
        cls.push('filled');
        inner = `<span class="sc-tile${cell.blank ? ' blank' : ''}">${cell.ch}<i>${cell.blank ? 0 : TILE_VALUE[cell.ch]}</i></span>`;
      } else if (st) {
        cls.push('staged-cell');
        inner = `<span class="sc-tile staged${st.blank ? ' blank' : ''}">${st.letter}<i>${st.blank ? 0 : TILE_VALUE[st.letter]}</i></span>`;
      } else if (r === CENTER && c === CENTER) {
        inner = '<span class="prem">★</span>';
      } else if (prem) {
        inner = `<span class="prem">${prem === 'TW' ? '×3 TỪ' : prem === 'DW' ? '×2 TỪ' : prem === 'TL' ? '×3 CHỮ' : '×2 CHỮ'}</span>`;
      }
      html += `<div class="${cls.join(' ')}" data-cell="${r},${c}">${inner}</div>`;
    }
  }
  return html;
}
function rackHtml(v, pid) {
  const rack = rackOf(v, pid);
  return rack.map((ch, i) => {
    const used = staged.some(t => t.rackIdx === i);
    const exSel = exchangeSel.has(i);
    const label = ch === '*' ? '★' : ch;
    const val = ch === '*' ? 0 : TILE_VALUE[ch];
    return `<button type="button" class="sc-rack-tile${selRack === i ? ' sel' : ''}${exSel ? ' ex-sel' : ''}${used ? ' used' : ''}" data-rack="${i}" ${used ? 'disabled' : ''} title="${ch === '*' ? 'Ô trống — đại diện bất kỳ chữ nào, 0 điểm' : 'Chữ ' + ch + ' — ' + val + ' điểm'}">${label}<i>${val}</i></button>`;
  }).join('');
}

function render(v, prev) {
  cur = v;
  if (!v) { resetStage(); endShownFor = ''; rackRevealed = false; revealedFor = null; announcedGid = ''; return; }
  /* 🎯 Công bố người đi trước lúc mở ván (cả online lẫn đấu máy/chuyền tay) */
  if (v.phase === 'playing' && v.seq === 0 && v.gid !== announcedGid) {
    announcedGid = v.gid;
    const fp = v.players[v.turnIdx];
    if (fp) tip(`🎯 ${cleanName(fp.name)} đi trước!`);
  }
  const pid = controlPid(v);
  const turnP = v.players.find(p => p.id === v.turn);
  /* đổi lượt / đổi khay thì bỏ hết chữ đặt tạm */
  const rackJson = pid ? JSON.stringify(rackOf(v, pid)) : '';
  if (pid !== stageFor || rackJson !== stageRackJson) {
    resetStage();
    stageFor = pid;
    stageRackJson = rackJson;
  }
  if (mode === 'pvp' && revealedFor && (!pendingHuman(v) || revealedFor !== pendingHuman(v).id)) {
    rackRevealed = false; revealedFor = null;
  }

  $('#round').textContent = v.phase === 'ended'
    ? `🏁 Trận đã kết thúc — ${v.winner ? cleanName((v.players.find(p => p.id === v.winner) || {}).name) + ' thắng trận!' : 'không có người thắng.'}`
    : `🔤 Vòng ${v.round} · Lượt của ${turnP ? cleanName(turnP.name) : '…'}${turnP && turnP.isBot ? ' 🤖' : ''} · túi còn ${v.bagCount} chữ`;
  $('#status').innerHTML = v.players.map((p) => {
    return `<span class="stat ${p.id === v.me ? 'me' : ''}">${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}${p.isBot ? ' 🤖' : ''}: <b>${p.score} điểm</b> · khay ${p.rackCount} chữ · đã đặt ${p.wordsPlayed} từ</span>`;
  }).join('');

  $('#board').innerHTML = boardHtml(v);

  /* khay chữ (che lại khi chuyền tay chưa bấm xem) */
  const handPid = mode === 'pvp' ? (pendingHuman(v) ? pendingHuman(v).id : null) : v.me;
  const cover = mode === 'pvp' && v.phase === 'playing' && pendingHuman(v) && !rackRevealed;
  $('#rack-cover').style.display = cover ? '' : 'none';
  $('#rack').style.display = cover ? 'none' : '';
  $('#btn-reveal-rack').textContent = pendingHuman(v) ? `👁 Xem khay của ${cleanName(pendingHuman(v).name)}` : '👁 Xem khay của bạn';
  $('#btn-reveal-rack').style.display = mode === 'pvp' && v.phase === 'playing' && pendingHuman(v) ? '' : 'none';
  if (v.phase === 'playing' && handPid) {
    $('#rack').innerHTML = rackHtml(v, handPid);
    $('#rack-label').innerHTML = `Khay của <b>${esc(cleanName((v.players.find(p => p.id === handPid) || {}).name || '…'))}</b> — bấm 1 chữ để chọn, rồi bấm vào 1 ô trên bàn để đặt tạm.`;
  } else {
    $('#rack').innerHTML = '';
    $('#rack-label').innerHTML = '';
  }

  $('#players').innerHTML = v.players.map((p) => {
    const sum = v.final ? v.final.summary[p.id] : null;
    return `<div class="sc-player ${p.id === v.turn && v.phase === 'playing' ? 'turn' : ''} ${p.id === v.me ? 'me' : ''}">
      <span class="sc-dot"></span>
      <div class="sc-pinfo">
        <b>${esc(cleanName(p.name))}${p.isBot ? ' 🤖' : ''}${p.id === v.me ? ' (bạn)' : ''}${p.id === v.winner ? ' 👑' : ''}</b>
        <span class="sc-ptotal">${p.score} điểm · khay ${sum ? sum.tilesLeft : p.rackCount} chữ${v.phase === 'ended' ? ` · đã đặt ${sum ? sum.wordsPlayed : p.wordsPlayed} từ${sum && sum.bingoCount ? ` · Bingo ×${sum.bingoCount}` : ''}` : ` · đã đặt ${p.wordsPlayed} từ`}</span>
      </div>
    </div>`;
  }).join('');

  /* ----- dòng hướng dẫn lượt ----- */
  if (v.phase !== 'playing') {
    $('#stage-info').innerHTML = '';
  } else if (!pid) {
    $('#stage-info').innerHTML = `Đang chờ ${turnP ? esc(cleanName(turnP.name)) : 'đối thủ'} đi…`;
  } else if (exchanging) {
    $('#stage-info').innerHTML = `Đang đổi chữ: bấm các chữ trên khay để chọn (đã chọn <b>${exchangeSel.size}</b>), rồi bấm <b>✅ Đổi chữ</b>. Bấm lại 🔀 Đổi chữ để hủy.`;
  } else if (staged.length) {
    const chk = validateCurrent(v, pid);
    if (chk.ok) {
      $('#stage-info').innerHTML = `Từ "<b>${chk.word}</b>" — <b>${chk.score} điểm</b>${chk.bingo ? ' 🎉 BINGO +50!' : ''}. Bấm <b>✅ Đặt từ</b> để đánh, hoặc bấm vào chữ trên bàn để thu lại.`;
    } else {
      $('#stage-info').innerHTML = `<span class="need">Từ "<b>${(buildWord(v) || {}).word || '…'}</b>" chưa đánh được: ${esc(chk.reason || '')}</span>`;
    }
  } else if (v.board.every(c => !c)) {
    $('#stage-info').innerHTML = 'Nước đầu tiên <b>phải phủ ô trung tâm ★</b> — chọn chữ trên khay, rồi bấm vào ô ở giữa bàn.';
  } else {
    $('#stage-info').innerHTML = 'Chọn 1 chữ trên khay, rồi bấm vào 1 ô trên bàn để đặt tạm. Đặt xong bấm <b>✅ Đặt từ</b>.';
  }
  $('#btn-confirm-place').disabled = !pid || !staged.length;
  $('#btn-dir').textContent = stageDir === 'H' ? '↔️ Ngang' : '↕️ Dọc';
  $('#btn-dir').disabled = staged.length >= 2;
  $('#btn-confirm-exchange').style.display = exchanging ? '' : 'none';
  $('#btn-exchange').classList.toggle('on', exchanging);

  $('#log').innerHTML = v.log.slice().reverse().map(l => `<div class="${l.kind || ''}">${esc(l.text)}</div>`).join('');

  /* âm thanh + hộp kết thúc */
  if (prev && v.phase === 'playing' && prev.phase === 'playing') {
    if (v.turn !== prev.turn) Snd.hint();
    else if (v.seq !== prev.seq) Snd.place();
  }
  if (v.phase === 'ended') {
    const k = v.gid + ':' + v.seq;
    if (endShownFor !== k) { endShownFor = k; showEnd(v); }
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
    return `<tr><td>${esc(cleanName(s.name))}${s.id === v.winner ? ' 👑' : ''}${s.id === v.me ? ' (bạn)' : ''}</td><td>${sum ? sum.wordsPlayed : p.wordsPlayed || 0} từ</td><td>${sum && sum.bingoCount ? 'Bingo ×' + sum.bingoCount : '–'}</td><td>${sum ? sum.tilesLeft : p.rackCount || 0} chữ còn</td><td>${s.score >= 0 ? '+' : ''}${s.score} điểm</td></tr>`;
  }).join('');
  const body = `<table style="width:100%;border-collapse:collapse;font-size:14px;text-align:center"><tr><th style="text-align:left">Người chơi</th><th>Từ đã đặt</th><th>Bingo</th><th>Còn lại</th><th>Điểm</th></tr>${rows}</table><p class="note">${v.winner === v.me ? 'Thắng +10 xu, chơi 1 ván +2 xu (tổng +12 xu) — đã ghi vào ví của bạn.' : 'Chơi 1 ván +2 xu.'}</p>`;
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2>${body}<div class="btns">${btns}</div>`, 'lock');
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); startGame(); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = ui.closeModal;
}

/* ---------- tương tác: khay chữ ---------- */
$('#rack').addEventListener('click', e => {
  const el = e.target.closest('[data-rack]');
  if (!el) return;
  if (!cur || cur.phase !== 'playing' || !controlPid(cur)) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  const i = +el.dataset.rack;
  if (exchanging) {
    if (exchangeSel.has(i)) exchangeSel.delete(i); else exchangeSel.add(i);
    Snd.pick(); render(cur, cur); return;
  }
  if (staged.some(t => t.rackIdx === i)) { tip('Chữ này đã đặt lên bàn rồi — bấm vào chữ trên bàn để thu lại.'); return; }
  selRack = selRack === i ? null : i;
  Snd.pick(); render(cur, cur);
});
/* ---------- tương tác: bàn cờ ---------- */
$('#board').addEventListener('click', async e => {
  const cellEl = e.target.closest('[data-cell]');
  if (!cellEl) return;
  if (!cur || cur.phase !== 'playing') return;
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  const [r, c] = cellEl.dataset.cell.split(',').map(Number);
  /* bấm vào chữ đã đặt tạm thì thu lại */
  const si = staged.findIndex(t => t.r === r && t.c === c);
  if (si >= 0) { staged.splice(si, 1); selRack = null; Snd.pick(); render(cur, cur); return; }
  if (cur.board[r * SIZE + c]) { tip('Ô này đã có chữ.'); return; }
  if (exchanging) { tip('Đang ở chế độ đổi chữ — bấm 🔀 Đổi chữ để tắt.'); return; }
  if (selRack == null) { tip('Chọn 1 chữ trên khay trước, rồi mới bấm vào bàn.'); return; }
  const rack = rackOf(cur, pid);
  const ch = rack[selRack];
  if (ch === undefined) { tip('Chữ này không còn trên khay.'); return; }
  if (staged.some(t => t.rackIdx === selRack)) { tip('Chữ này đã đặt lên bàn rồi.'); return; }
  if (staged.length) {
    const rows = new Set(staged.map(t => t.r)), cols = new Set(staged.map(t => t.c));
    const sameRow = rows.size === 1 && rows.has(r);
    const sameCol = cols.size === 1 && cols.has(c);
    if (!sameRow && !sameCol) { tip('Chữ tiếp theo phải cùng hàng hoặc cùng cột với chữ đã đặt.'); return; }
  }
  let letter = ch, blank = false;
  if (ch === '*') {
    const ans = await promptBox('Ô trống dùng làm chữ nào? (A–Z)', { title: '★ Ô trống', placeholder: 'VD: A', maxlength: 1, ok: 'Chọn', required: true });
    if (!ans) return;
    letter = ans.trim().toUpperCase();
    if (!/^[A-Z]$/.test(letter)) { tip('Chỉ nhập 1 chữ cái A–Z.'); return; }
    blank = true;
  }
  staged.push({ rackIdx: selRack, ch, blank, letter, r, c });
  selRack = null;
  Snd.pick();
  render(cur, cur);
});
/* ---------- nút đặt từ / hướng / đổi chữ / bỏ lượt ---------- */
$('#btn-confirm-place').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  const chk = validateCurrent(cur, pid);
  if (!chk.ok) { Snd.invalid(); tip(chk.reason); return; }
  ui.actAs(pid, { type: 'place', dir: chk.dir, r: chk.r, c: chk.c, word: chk.word, blanks: chk.blanks });
  resetStage();
  Snd.place();
  render(cur, cur);
};
$('#btn-clear-stage').onclick = () => { resetStage(); Snd.pick(); if (cur) render(cur, cur); };
$('#btn-dir').onclick = () => {
  if (staged.length >= 2) { tip('Hướng đã cố định theo các chữ đã đặt.'); return; }
  stageDir = stageDir === 'H' ? 'V' : 'H';
  Snd.pick(); if (cur) render(cur, cur);
};
$('#btn-exchange').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  if (cur.bagCount < 7) { tip('Túi còn ít hơn 7 chữ — không đổi được, hãy bỏ lượt.'); return; }
  exchanging = !exchanging;
  exchangeSel = new Set();
  if (exchanging) { staged = []; selRack = null; }
  Snd.pick(); render(cur, cur);
};
$('#btn-confirm-exchange').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  const pid = controlPid(cur);
  if (!pid) return;
  if (!exchangeSel.size) { tip('Chọn ít nhất 1 chữ trên khay để đổi.'); return; }
  ui.actAs(pid, { type: 'exchange', tiles: [...exchangeSel].sort((a, b) => a - b) });
  resetStage();
  Snd.place();
  render(cur, cur);
};
$('#btn-pass').onclick = () => {
  if (!cur || cur.phase !== 'playing') return;
  const pid = controlPid(cur);
  if (!pid) { tip('Chưa tới lượt bạn — đang chờ đối thủ đi.'); return; }
  ui.actAs(pid, { type: 'pass' });
  resetStage();
  Snd.place();
  render(cur, cur);
};
$('#btn-reveal-rack').onclick = () => {
  const pending = pendingHuman(cur);
  if (!pending) return;
  rackRevealed = true;
  revealedFor = pending.id;
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
  startGame();
};
$('#btn-resign').onclick = async () => {
  const v = cur;
  if (!v || v.phase === 'ended') return;
  const r = await confirmBox('Nhận thua trận này? Trận kết thúc ngay, người còn lại điểm cao nhất thắng.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
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
  game: 'scrabble', net: NET,
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
