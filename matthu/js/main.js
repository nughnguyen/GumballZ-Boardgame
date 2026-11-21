// 🔐 Mật Thư (Codenames kiểu Việt) – giao diện. Luật ở engine.js, bot ở bot.js,
// kho từ ở words.js, phòng/mạng dùng shared/net/simplenet.js (cùng pattern
// Gián Điệp / Cờ Lật: chủ phòng giữ state, khách chỉ gửi action {type, ...}).
// Mật vụ ra gợi ý 1 từ + số; điệp viên bấm lá để đoán. Chỉ mật vụ thấy bản
// đồ mật (bấm 👁 để hiện/tắt — chơi chuyền tay nhớ tắt trước khi đưa máy).
import { createGame, applyAction, viewFor, actors, RED_AGENTS, BLUE_AGENTS, TEAM_NAME } from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { THEMES } from './words.js?v=1';
import { GUIDE_HTML } from './guide.js?v=1';
import * as Snd from './sound.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { promptBox, toast as tip, confirmBox } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet({
  game: 'matthu', min: 2, max: 8, maxSeats: 10, allowLocal: true,
  minMsg: 'Mật Thư cần 2–8 người: thêm máy, thêm người chơi cùng máy, hoặc mời bạn vào phòng.',
  defaults: { timer: 0 },
  optOk: (k, v) => k === 'timer' && [0, 60, 120].includes(+v),
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 900 + Math.random() * 1200,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu'],
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
  try { localStorage.setItem('gumballz-matthu-mode', m); } catch (e) {}
}
modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
try {
  const sm = localStorage.getItem('gumballz-matthu-mode');
  if (['ai-easy', 'ai-hard', 'pvp', 'online'].includes(sm)) setMode(sm); else setMode('ai-hard');
} catch (e) { setMode('ai-hard'); }

/* ---------- phòng chờ ---------- */
/* ghế 1 = mật vụ Đỏ, ghế 2 = mật vụ Xanh, các ghế sau = điệp viên xen kẽ.
   Chơi đúng 2 người thì mỗi người vừa mật vụ vừa điệp viên đội mình. */
function seatRole(i, total) {
  if (total === 2) return { team: i === 0 ? 'R' : 'B', role: 'both', label: '🎭 Mật vụ + Điệp viên' };
  if (i === 0) return { team: 'R', role: 'spy', label: '🕵️ Mật vụ Đỏ' };
  if (i === 1) return { team: 'B', role: 'spy', label: '🕵️ Mật vụ Xanh' };
  const team = i % 2 === 0 ? 'R' : 'B';
  return { team, role: 'op', label: `🔍 Điệp viên ${team === 'R' ? 'Đỏ' : 'Xanh'}` };
}
function renderLobby(info, ui) {
  const n = info.players.length;
  $('#pcount').textContent = `${n}/8 người`;
  $('#plist').innerHTML = info.players.map((p, i) => {
    const r = seatRole(i, n);
    return `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ` <small>· máy ${p.level === 'easy' ? 'Dễ' : 'Khó'}</small>` : p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ` <small>· chủ phòng</small>` : ''}</span><span class="seat-role ${r.team === 'R' ? 'r' : 'b'}">${r.label}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`;
  }).join('');
  $('#add-box').innerHTML = !ui.isHost ? '' : (n < 8
    ? `<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button><button class="btn" id="btn-addlocal">👥 Người chơi cùng máy</button></div>`
    : '');
  const o = info.opts || {}, dis = ui.isHost ? '' : 'disabled';
  $('#opts').innerHTML = `<div class="opt"><b>⏱️ Đồng hồ đi (mỗi lượt)</b><div class="seg">${[[0, 'Tắt'], [60, '60 giây'], [120, '120 giây']].map(([v, n]) => `<button type="button" data-timer="${v}" aria-pressed="${+o.timer === v}" ${dis}>${n}</button>`).join('')}</div><small>Hết giờ mà chưa ra gợi ý / chưa đoán thì lượt tự chuyển sang đội kia.</small></div>
  <div class="opt"><b>🎭 Chia vai</b><div class="role-note">Ghế 1 = mật vụ Đỏ, ghế 2 = mật vụ Xanh, các ghế sau là điệp viên xen kẽ 2 đội. Chơi đúng 2 người thì mỗi người vừa làm mật vụ vừa làm điệp viên đội mình. Đỏ luôn đi trước (9 điệp viên, Xanh 8).</div></div>`;
  $('#btn-start-online').style.display = ui.isHost ? '' : 'none';
  $('#btn-start-online').disabled = n < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !ui.net) return;
  const h = ui.net.raw;
  if (!h) return;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
  else if (b.id === 'btn-addlocal') {
    const n = await promptBox('Mọi người chuyền máy cho nhau, tới lượt ai người đó cầm. Mật vụ nhớ tắt bản đồ mật trước khi đưa máy!', { title: '👥 Tên người chơi', placeholder: 'VD: Bơ', maxlength: 16, ok: 'Thêm', required: true });
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
function actorIds(v) {
  if (v.phase === 'clue') {
    const sp = v.players.find(p => p.team === v.turn && (p.role === 'spy' || p.role === 'both'));
    return sp ? [sp.id] : [];
  }
  if (v.phase === 'guess') return v.players.filter(p => p.team === v.turn && (p.role === 'op' || p.role === 'both')).map(p => p.id);
  return [];
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
    const acts = actors(s);
    if (acts.length) { ui.actAs(acts[0], { type: 'pass' }); tip('Hết giờ — lượt tự chuyển sang đội kia.'); }
  }, 1000);
}

/* ---------- ván chơi ---------- */
let cur = null, endShownGid = null, lastGuessN = -1;
let keyShown = false, clueNum = 2;

const spyOf = (v, team) => v.players.find(p => p.team === team && (p.role === 'spy' || p.role === 'both'));
const opsOf = (v, team) => v.players.filter(p => p.team === team && (p.role === 'op' || p.role === 'both'));
const canClue = v => v.phase === 'clue' && (() => { const sp = spyOf(v, v.turn); return sp && ui.controls(sp.id); })();
const guessActor = v => { const ops = opsOf(v, v.turn); const mine = ops.find(p => ui.controls(p.id)); return mine ? mine.id : null; };
const canGuess = v => v.phase === 'guess' && !!guessActor(v);
const teamName = t => TEAM_NAME[t] || t;
const roleLabel = p => p.role === 'spy' ? '🕵️ Mật vụ' : p.role === 'op' ? '🔍 Điệp viên' : '🎭 Mật vụ + Điệp viên';

/* gợi ý nhanh: các chủ đề bao được nhiều lá phe mình nhất (chỉ mật vụ thấy) */
function hintChips(v) {
  if (!v.key) return '';
  const own = [], foe = [], by = [], ass = [];
  for (let i = 0; i < 25; i++) {
    if (v.revealed[i]) continue;
    if (v.key[i] === v.turn) own.push(v.words[i].toLowerCase());
    else if (v.key[i] === 'N') by.push(v.words[i].toLowerCase());
    else if (v.key[i] === 'A') ass.push(v.words[i].toLowerCase());
    else foe.push(v.words[i].toLowerCase());
  }
  const ownSet = new Set(own), foeSet = new Set(foe), bySet = new Set(by), assWord = ass[0] || null;
  const boardSet = new Set(v.words.filter((w, i) => !v.revealed[i]).map(w => w.toLowerCase()));
  const scored = [];
  for (const t of THEMES) {
    if (boardSet.has(t.clue.toLowerCase())) continue;
    let oh = 0, fh = 0, bh = 0, ah = 0;
    for (const w of t.words) {
      const lw = w.toLowerCase();
      if (ownSet.has(lw)) oh++;
      else if (foeSet.has(lw)) fh++;
      else if (bySet.has(lw)) bh++;
      else if (assWord && lw === assWord) ah++;
    }
    if (oh > 0) scored.push({ clue: t.clue, n: oh, score: oh * 3 - fh * 4 - bh - ah * 12 });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map(s => `<button type="button" class="hint-chip" data-clue="${esc(s.clue)}" data-num="${Math.min(s.n, 9)}">${esc(s.clue)} · ${s.n} lá</button>`).join('');
}

function cardClass(v, i) {
  const cls = ['mt-card'];
  const c = v.revealed[i] ? v.shown[i] : null;
  if (c === 'R') cls.push('rev-r');
  else if (c === 'B') cls.push('rev-b');
  else if (c === 'N') cls.push('rev-n');
  else if (c === 'A') cls.push('rev-a');
  if (v.lastGuess && v.lastGuess.idx === i) cls.push('last');
  if (!v.revealed[i] && canGuess(v)) cls.push('pick');
  return cls.join(' ');
}
function boardHTML(v) {
  let html = '';
  for (let i = 0; i < 25; i++) {
    const c = v.revealed[i] ? v.shown[i] : null;
    const mark = c === 'R' ? '🔴' : c === 'B' ? '🔵' : c === 'N' ? '⚪' : c === 'A' ? '💀' : '';
    const dot = (!v.revealed[i] && keyShown && v.key) ? `<span class="kdot ${v.key[i] === 'R' ? 'r' : v.key[i] === 'B' ? 'b' : v.key[i] === 'A' ? 'a' : 'n'}">${v.key[i] === 'A' ? '💀' : ''}</span>` : '';
    html += `<button type="button" class="${cardClass(v, i)}" data-idx="${i}" aria-label="Lá ${esc(v.words[i])}${c ? `, đã lật: ${c === 'R' ? 'Đỏ' : c === 'B' ? 'Xanh' : c === 'N' ? 'dân thường' : 'sát thủ'}` : ''}">${dot}<span class="w">${esc(v.words[i])}</span>${mark ? `<span class="mk">${mark}</span>` : ''}</button>`;
  }
  return html;
}

function render(v, prev) {
  cur = v;
  if (!v) { lastGuessN = -1; endShownGid = null; keyShown = false; stopTimer(); timerKey = ''; return; }
  const me = v.players.find(p => p.id === v.me);
  const turnTeam = v.turn;
  const sp = spyOf(v, turnTeam);
  /* âm thanh lá mới lật: so lượt đoán mới với ván trước (đội đoán = lượt cũ) */
  if (prev && v.seq !== prev.seq && v.lastGuess && v.lastGuess.n !== lastGuessN) {
    lastGuessN = v.lastGuess.n;
    Snd.flip();
    const c = v.lastGuess.color;
    if (c === 'A') Snd.assassin();
    else if (c === prev.turn) Snd.correct();
    else Snd.wrong();
  }
  /* bản đồ mật tự tắt khi sang pha đoán hoặc đổi lượt (chơi chuyền tay khỏi lộ) */
  if (prev && (v.phase !== prev.phase || v.turn !== prev.turn)) keyShown = false;
  /* đồng hồ đi: reset khi đổi lượt/pha, chỉ chạy cho người mình điều khiển */
  const tKey = v.gid + ':' + v.turn + ':' + v.phase + ':' + v.clueNo;
  if (v.timer && v.phase !== 'ended') {
    if (tKey !== timerKey) {
      timerKey = tKey;
      const acts = actorIds(v);
      const mine = acts.find(id => ui.controls(id));
      const actor = mine ? v.players.find(p => p.id === mine) : null;
      if (actor && !actor.isBot) startTimer(v); else stopTimer();
    }
  } else { stopTimer(); timerKey = ''; }
  const timerChip = v.timer && v.phase !== 'ended' ? ` <span class="timer-chip" id="timer-chip">⏱️ <b id="timer-left">${timerLeft}</b>s</span>` : '';
  const assassinOut = v.shown.includes('A');
  $('#round').innerHTML = v.phase === 'ended'
    ? (v.endReason === 'assassin' ? `💀 Sát thủ đã lộ — 🏆 Đội ${teamName(v.winner)} thắng!`
      : v.endReason === 'resign' ? `🏳️ Đội ${teamName(v.winner)} thắng — đối thủ xin thua!`
      : `🏆 Đội ${teamName(v.winner)} lộ hết điệp viên — THẮNG!`)
    : v.phase === 'clue'
      ? `🕵️ Lượt ${teamName(turnTeam)} · ${sp ? esc(cleanName(sp.name)) + ' đang ra gợi ý…' : ''}${timerChip}`
      : `🔍 Lượt ${teamName(turnTeam)} · điệp viên đang đoán…${timerChip}`;
  /* ghế theo đội */
  const seatHTML = p => {
    const isTurnTeam = p.team === v.turn && v.phase !== 'ended';
    return `<div class="seat${isTurnTeam ? ' on' : ''} ${p.team === 'R' ? 'tr' : 'tb'}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${p.id === v.me ? ' (bạn)' : ''}</b>
      <span class="side-badge ${p.team === 'R' ? 'r' : 'b'}">${p.team === 'R' ? '🔴' : '🔵'}</span>
      <small>${roleLabel(p)}${p.isBot ? ' · máy ' + (p.level === 'easy' ? 'Dễ' : 'Khó') : p.local ? ' · cùng máy' : ''}</small></div>`;
  };
  $('#seats').innerHTML = `<div class="team-col"><h4>🔴 Đội Đỏ · còn ${v.left.R}/9 lá</h4>${v.players.filter(p => p.team === 'R').map(seatHTML).join('')}</div>
    <div class="team-col"><h4>🔵 Đội Xanh · còn ${v.left.B}/8 lá</h4>${v.players.filter(p => p.team === 'B').map(seatHTML).join('')}</div>`;
  const total = Math.max(1, v.counts.R + v.counts.B);
  $('#ratio-r').style.width = (v.counts.R / total * 100) + '%';
  $('#ratio-rl').textContent = `🔴 Đỏ: ${v.counts.R}/9`;
  $('#ratio-yl').textContent = `Xanh: ${v.counts.B}/8 🔵`;
  $('#assassin-line').textContent = assassinOut ? '💀 Sát thủ đã lộ!' : '💀 Sát thủ còn ẩn — đừng chạm vào!';
  /* banner gợi ý hiện tại */
  const cb = $('#clue-banner');
  if (v.phase === 'guess' && v.clue) {
    cb.style.display = '';
    cb.innerHTML = `🕵️ ${esc(cleanName(v.clue.byName || 'Mật vụ'))} gợi ý: <b>“${esc(v.clue.word)}” — ${v.clue.num === 0 ? 'không giới hạn' : v.clue.num + ' lá'}</b> · còn <b>${v.guessesLeft === 99 ? '∞' : v.guessesLeft}</b> lượt đoán`;
  } else if (v.phase === 'ended' && v.clue) {
    cb.style.display = '';
    cb.innerHTML = `🕵️ Gợi ý cuối: <b>“${esc(v.clue.word)}” — ${v.clue.num === 0 ? 'không giới hạn' : v.clue.num + ' lá'}</b>`;
  } else cb.style.display = 'none';
  /* ô ra gợi ý (chỉ mật vụ của đội đang đi) */
  const clueBox = $('#clue-box');
  if (canClue(v)) {
    clueBox.style.display = '';
    $('#clue-title').innerHTML = `🕵️ Tới lượt bạn ra gợi ý cho đội ${teamName(v.turn)} — còn ${v.left[v.turn]} lá cần lộ`;
    $('#hint-chips').innerHTML = hintChips(v);
    document.querySelectorAll('#clue-num button').forEach(b => b.classList.toggle('on', +b.dataset.num === clueNum));
  } else clueBox.style.display = 'none';
  /* thanh dừng đoán (điệp viên đội đang đi) */
  const gb = $('#guess-bar');
  if (canGuess(v)) { gb.style.display = ''; $('#guess-info').textContent = 'Bấm vào lá để đoán — đoán trúng lá phe mình được đoán tiếp.'; }
  else gb.style.display = 'none';
  /* nút bản đồ mật (chỉ ai có bản đồ mật mới thấy) */
  const kb = $('#key-bar');
  if (v.key) {
    kb.style.display = '';
    $('#btn-key').textContent = keyShown ? '🙈 Che bản đồ mật' : '👁 Bản đồ mật';
    $('#key-note').textContent = keyShown ? 'Đang hiện chấm màu ở góc lá — nhớ che lại trước khi đưa máy!' : 'Chấm màu: 🔴 Đỏ · 🔵 Xanh · ⚪ dân thường · 💀 sát thủ.';
  } else kb.style.display = 'none';
  /* bàn */
  const inner = $('#board-inner');
  const key = (keyShown ? '1' : '0') + ':' + (canGuess(v) ? '1' : '0');
  if (!inner.dataset.gid || inner.dataset.gid !== v.gid || inner.dataset.seq !== String(v.seq) || inner.dataset.key !== key) {
    inner.dataset.gid = v.gid; inner.dataset.seq = String(v.seq); inner.dataset.key = key;
    inner.innerHTML = boardHTML(v);
  }
  const log = $('#log');
  log.innerHTML = v.log.slice(-12).reverse().map(l => `<div>${esc(l.text)}</div>`).join('') || '<div>Chưa có gợi ý nào.</div>';
  /* kết thúc: hộp thoại (1 lần / ván)
     Số ván/thắng do stats.watch() tự ghi khi ván kết thúc (simplenet bọc onState)
     — KHÔNG gọi record() tay ở đây, kẻo đếm trùng.
     Huy hiệu riêng (mt-*) do SP.matthu trong shared/ui/stats.js tự phát hiện
     từ view (end) — main.js không ghi gì thêm. */
  if (v.phase === 'ended' && endShownGid !== v.gid && !v.spec) {
    endShownGid = v.gid;
    const won = (v.winnerIds || []).includes(v.me);
    if (won) Snd.winJingle(); else Snd.lose();
    const wName = teamName(v.winner);
    let reason = '';
    if (v.endReason === 'assassin') reason = 'Có người chạm vào sát thủ — đội kia thắng luôn!';
    else if (v.endReason === 'resign') reason = won ? 'Đối thủ xin thua — đội bạn thắng!' : 'Đội bạn xin thua.';
    else reason = won ? `Đội bạn lộ hết điệp viên trước — thắng!` : `Đội ${wName} lộ hết điệp viên trước.`;
    const solved = v.key ? `<div class="solved">${v.words.map((w, i) => `<span class="sv ${v.key[i] === 'R' ? 'r' : v.key[i] === 'B' ? 'b' : v.key[i] === 'A' ? 'a' : 'n'}">${esc(w)}</span>`).join('')}</div>` : '';
    ui.openModal(`<h2>${won ? '🏆 Đội bạn thắng!' : '🏆 Đội ' + wName + ' thắng!'}</h2>
      <p style="text-align:center">${reason}</p>
      <div class="bigscore" style="text-align:center;font-family:'Baloo 2',sans-serif;font-size:36px;font-weight:800">🔴 ${v.counts.R}/9 – ${v.counts.B}/8 🔵</div>
      <p style="text-align:center;font-weight:700">Bản đồ mật lúc kết thúc:</p>${solved}
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

/* ---------- bấm lá để đoán ---------- */
$('#board-inner').addEventListener('click', e => {
  const card = e.target.closest('.mt-card');
  if (!card || !cur || cur.phase !== 'guess') return;
  const idx = Number(card.dataset.idx);
  if (cur.revealed[idx]) return;
  const actor = guessActor(cur);
  if (!actor) { tip(cur.spec ? 'Bạn đang xem ván đấu 👀' : 'Chưa tới lượt đoán của đội bạn.'); return; }
  ui.actAs(actor, { type: 'guess', idx });
});

/* ---------- ô ra gợi ý ---------- */
document.querySelectorAll('#clue-num button').forEach(b => b.addEventListener('click', () => {
  clueNum = +b.dataset.num;
  document.querySelectorAll('#clue-num button').forEach(x => x.classList.toggle('on', +x.dataset.num === clueNum));
}));
$('#hint-chips').addEventListener('click', e => {
  const c = e.target.closest('.hint-chip'); if (!c) return;
  $('#clue-word').value = c.dataset.clue;
  clueNum = +c.dataset.num;
  document.querySelectorAll('#clue-num button').forEach(x => x.classList.toggle('on', +x.dataset.num === clueNum));
  Snd.clue();
});
$('#btn-clue').onclick = () => {
  const v = cur;
  if (!v || !canClue(v)) return;
  const word = $('#clue-word').value.trim();
  if (!word || /\s/.test(word) || word.length > 20) { Snd.invalid(); tip('Gợi ý chỉ được 1 từ (tối đa 20 ký tự).'); return; }
  const lw = word.toLowerCase();
  for (let i = 0; i < 25; i++) {
    if (!v.revealed[i] && v.words[i].toLowerCase() === lw) { Snd.invalid(); tip(`“${word}” đang là 1 lá còn úp trên bàn — không được dùng làm gợi ý.`); return; }
  }
  const sp = spyOf(v, v.turn);
  ui.actAs(sp.id, { type: 'clue', word, num: clueNum });
  $('#clue-word').value = '';
  Snd.clue();
};
$('#clue-word').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-clue').click(); });
$('#btn-pass-clue').onclick = () => {
  const v = cur;
  if (!v || !canClue(v)) return;
  ui.actAs(spyOf(v, v.turn).id, { type: 'pass' });
};
$('#btn-pass-guess').onclick = () => {
  const v = cur;
  if (!v || !canGuess(v)) return;
  ui.actAs(guessActor(v), { type: 'pass' });
};
$('#btn-key').onclick = () => {
  keyShown = !keyShown;
  if (cur) {
    const inner = $('#board-inner');
    inner.dataset.key = '';
    inner.innerHTML = boardHTML(cur);
    $('#btn-key').textContent = keyShown ? '🙈 Che bản đồ mật' : '👁 Bản đồ mật';
    $('#key-note').textContent = keyShown ? 'Đang hiện chấm màu ở góc lá — nhớ che lại trước khi đưa máy!' : 'Chấm màu: 🔴 Đỏ · 🔵 Xanh · ⚪ dân thường · 💀 sát thủ.';
  }
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
  const r = await confirmBox('Nhận thua ván này? Đội kia thắng luôn.', { title: '🏳️ Xin thua', ok: 'Xin thua', cancel: 'Đánh tiếp', danger: true });
  if (!r) return;
  /* online: xin thua cho chính mình; chơi chung máy: xin thua cho đội đang đi */
  if (mode === 'online') ui.act({ type: 'resign' });
  else {
    const p = v.players.find(x => x.team === v.turn);
    if (p) ui.actAs(p.id, { type: 'resign' });
  }
};
const drawSound = () => { $('#btn-sound').textContent = Snd.isSoundOn() ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { Snd.setSound(!Snd.isSoundOn()); drawSound(); };

const ui = gameKit({
  game: 'matthu', net: NET,
  offline: h => {
    if (mode === 'ai-easy' || mode === 'ai-hard') h.addBot({ level: mode === 'ai-easy' ? 'easy' : 'hard' });
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
