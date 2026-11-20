// 🎪 Lô tô hội chợ – giao diện. Luật ở engine.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import * as E from './engine.js?v=4';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';

const NET = makeNet({
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'loto', min: 2, max: 16, maxSeats: 24, minMsg: 'Cần ít nhất 2 người: mời bạn vào phòng hoặc thêm bot.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: E.botAction, botDelay: () => 1200 + Math.random() * 1600,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Đậu', 'Nấm', 'Sữa', 'Gấu Bông', 'Chanh', 'Vừng', 'Ổi', 'Quýt', 'Hạt Dẻ', 'Trà Sữa'],
});
$('#hero').innerHTML = '<span class="hb">7</span><span class="hb">45</span><span class="hb">90</span>';
let sound = ls.get('loto-sound') !== '0', music = false, autoMark = ls.get('loto-auto') !== '0';

// ---------- lời rao (tự viết, vần vui) ----------
const RAO = ['Cờ ra con mấy, con mấy gì ra…', 'Lẳng lặng mà nghe, số gì ra đây…', 'Tay dò cho kỹ, mắt nhìn cho tinh…', 'Bà con chú ý, số kế tiếp là…', 'Ai chờ con này, giơ tay lên nào…', 'Xóc xóc lắc lắc, banh rơi ra rồi…', 'Hồi hộp chưa nè, con số may mắn…', 'Đừng chớp mắt nha, kẻo trượt mất số…', 'Vé ai sắp kinh, nghe cho rõ nè…', 'Gió đưa banh lăn, lăn ra con số…'];
const DIGIT = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const numWord = n => n < 10 ? DIGIT[n] : n % 10 === 0 ? (n === 10 ? 'mười' : DIGIT[n / 10 | 0] + ' mươi') : (n < 20 ? 'mười ' : DIGIT[n / 10 | 0] + ' mươi ') + (n % 10 === 5 ? 'lăm' : n % 10 === 1 && n > 20 ? 'mốt' : DIGIT[n % 10]);

// ---------- âm thanh: tiếng bíp, giọng đọc số (nếu máy có giọng tiếng Việt), nhạc nền tự soạn ----------
let ac = null; const ctx = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
function tone(f, at, len, vol = .12, type = 'triangle') { const a = ctx(), t = a.currentTime + at, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + len); o.connect(g).connect(a.destination); o.start(t); o.stop(t + len + .03); }
function beep(kind) { if (!sound) return; try { ({ draw: () => { tone(880, 0, .08); tone(1320, .08, .12); }, mark: () => tone(520, 0, .06), wait: () => { tone(660, 0, .1); tone(660, .14, .1); }, miss: () => { tone(300, 0, .16); tone(220, .14, .24); }, win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .11, .22)) })[kind](); } catch (e) {} }
function say(n) {
  if (!sound || !('speechSynthesis' in window)) return;
  try { const vi = speechSynthesis.getVoices().find(v => /^vi/i.test(v.lang)); if (!vi) return; /* máy không có giọng Việt thì thôi, khỏi đọc sai */
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('Số ' + numWord(n)); u.voice = vi; u.lang = vi.lang; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) {}
}
/* nhạc nền: một điệu ngũ cung vui tự soạn, lặp lại */
const TUNE = [392, 440, 523, 587, 523, 440, 392, 0, 587, 659, 587, 523, 440, 523, 392, 0, 523, 587, 659, 784, 659, 587, 523, 0, 440, 523, 440, 392, 330, 392, 262, 0];
let musT = 0, musI = 0;
function playMusic() { clearInterval(musT); if (!music) return; try { ctx().resume(); } catch (e) {} musT = setInterval(() => { const f = TUNE[musI++ % TUNE.length]; if (f) try { tone(f, 0, .22, .035, 'square'); if (musI % 4 === 1) tone(f / 2, 0, .3, .04, 'sine'); } catch (e) {} }, 210); }

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  $('#pcount').textContent = `${n}/${info.max} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· bot</small>' : p.id === 'host' ? ' <small>· quản trò</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < info.max ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm bot</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>⏱️ Nhịp rao số</b><div class="seg">${[[3, 'Nhanh · 3 giây'], [5, 'Vừa · 5 giây'], [8, 'Thong thả · 8 giây'], [0, 'Quản trò tự bấm']].map(([v, nm]) => `<button type="button" data-opt="speed" data-v="${v}" aria-pressed="${o.speed === v}" ${dis}>${nm}</button>`).join('')}</div><small>Mỗi người được phát một tờ vé 9 hàng. Đủ 5 số trên <b>một hàng ngang</b> thì bấm <b>KINH!</b> – ai kinh trước người đó thắng.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt('speed', +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let marks = new Set(), marksGid = '', endShown = null, drawT = 0, drawKey = '', raoLine = '';
const nameOf = (v, id) => { const p = v.players.find(p => p.id === id); return p ? esc(cleanName(p.name)) : '?'; };
const loadMarks = v => { if (marksGid === v.gid) return; marksGid = v.gid; marks = new Set(); try { const d = JSON.parse(ls.get('loto-marks') || 'null'); if (d && d.gid === v.gid) marks = new Set(d.m); } catch (e) {} };
const saveMarks = () => ls.set('loto-marks', JSON.stringify({ gid: marksGid, m: [...marks] }));
function ticketHTML(t, { color = 0, called, marked, win = [], name = '', live = false }) {
  const row = (r, i) => r.map(n => { if (!n) return '<div class="cell"></div>'; const m = marked.has(n), hot = live && !m && called.has(n); return `<button type="button" class="cell n${m ? ' m' : ''}${hot ? ' hot' : ''}${win.includes(i) ? ' w' : ''}" data-n="${n}" aria-label="Số ${n}${m ? ' (đã dò)' : ''}"><span>${n}</span></button>`; }).join('');
  const blk = b => `<div class="blk">${t.slice(b * 3, b * 3 + 3).map((r, i) => row(r, b * 3 + i)).join('')}</div>`;
  return `<div class="ticket c${color}"><div class="tk-head">★ Lô tô hội chợ ★</div>${blk(0)}<div class="tk-mid"><span>GumballZ</span><span>${name ? esc(name) : 'gumballzgames.vercel.app'}</span></div>${blk(1)}<div class="tk-mid"><span>Mã đáo thành công</span><span>Chúc may mắn</span></div>${blk(2)}</div>`;
}
function render(v, prev) {
  const me = ui.myId, called = new Set(v.called), lastN = v.called[v.called.length - 1], mine = v.players.find(p => p.id === me), playing = v.phase === 'play';
  loadMarks(v);
  if (autoMark && v.ticket) { let ch = false; for (const row of v.ticket) for (const n of row) if (n && called.has(n) && !marks.has(n)) { marks.add(n); ch = true; } if (ch) saveMarks(); }
  const newDraw = !prev || prev.gid !== v.gid || prev.called.length !== v.called.length;
  if (newDraw) raoLine = RAO[(v.called.length * 7 + v.gid.charCodeAt(0)) % RAO.length];
  $('#round').textContent = playing ? `🎱 Đã ra ${v.called.length}/90${v.paused ? ' · ⏸ tạm dừng' : ''}` : '🏁 Hết ván';
  const ball = $('#ball'); ball.textContent = lastN || '?'; if (newDraw && lastN) { ball.classList.remove('pop'); void ball.offsetWidth; ball.classList.add('pop'); }
  $('#rao').innerHTML = !v.called.length ? 'Quản trò chuẩn bị bốc số…<small>Dò vé của bạn, đủ 5 số một hàng thì KINH!</small>' : v.last && v.last.t === 'miss' && playing ? `😅 ${nameOf(v, v.last.id)} kinh hụt rồi!<small>Chưa đủ 5 số trên một hàng đâu nha.</small>` : `${raoLine}<small>Con số <b>${lastN}</b> – ${numWord(lastN)}!</small>`;
  $('#recent').innerHTML = v.called.slice(-9, -1).reverse().map(n => `<i>${n}</i>`).join('');
  $('#seats').innerHTML = v.players.map(p => `<div class="seat${p.id === me ? ' me' : ''}${v.winners.includes(p.id) ? ' win' : p.best >= 4 ? ' wait' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" data-pid="${p.id}">${avatar(p.name, 26)}${esc(cleanName(p.name))} <small>${v.winners.includes(p.id) ? '🏆 KINH' : p.best >= 4 ? '🔥 chờ' : p.best + '/5'}</small></div>`).join('');
  $('#ticket').parentElement.innerHTML = v.ticket ? ticketHTML(v.ticket, { color: mine ? mine.color : 0, called, marked: marks, win: (v.winRows || {})[me] || [], name: mine ? cleanName(mine.name) : '', live: playing }).replace('class="ticket ', 'id="ticket" class="ticket ') : '<div id="ticket" class="wait">👀 Bạn đang xem – ván sau sẽ được phát vé.</div>';
  // nút
  const full = v.ticket ? E.fullRows(v.ticket, called).length > 0 : false, markedFull = v.ticket ? E.fullRows(v.ticket, marks).length > 0 : false;
  let acts = '';
  if (playing) {
    if (v.ticket) acts += `<button class="btn pri kinh${full && markedFull ? ' go' : ''}" data-a="kinh">KINH!</button><button class="btn" data-a="auto" title="Máy dò số giúp / tự dò">${autoMark ? '🤖 Dò giúp' : '👆 Tự dò'}</button>`;
    if (ui.isHost) acts += v.opts.speed ? `<button class="btn" data-a="pause">${v.paused ? '▶' : '⏸'}</button>` : `<button class="btn dark" data-a="draw">🎱 Bốc số</button>`;
  } else acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '<button class="btn" data-a="sum">🏅 Kết quả</button>';
  $('#acts').innerHTML = acts;
  // âm thanh
  if (prev && prev.gid === v.gid) {
    if (newDraw && lastN) { beep('draw'); say(lastN); if (mine && mine.best >= 4 && (prev.players.find(p => p.id === me) || {}).best < 4) setTimeout(() => beep('wait'), 350); }
    if (v.last && v.last.t === 'miss' && v.seq !== prev.seq && (!prev.last || prev.last.t !== 'miss' || prev.called.length === v.called.length)) beep('miss');
  }
  // quản trò: máy tự bốc số theo nhịp
  if (ui.isHost) {
    const k = `${v.gid}|${v.called.length}|${v.paused}|${v.phase}`;
    if (k !== drawKey) { drawKey = k; clearTimeout(drawT); if (playing && !v.paused && v.opts.speed > 0) drawT = setTimeout(() => { if (ui.view && ui.view.gid === v.gid && ui.isHost) ui.act({ type: 'draw' }); }, (v.called.length ? v.opts.speed : 3) * 1000); }
  }
  if (!playing) { if (endShown !== v.gid) { endShown = v.gid; beep(v.winners.length ? 'win' : 'miss'); setTimeout(() => ui.view === v && showSummary(v), 900); } } else endShown = null;
}
$('#screen-game').addEventListener('click', e => {
  const c = e.target.closest('.cell.n'), v = ui.view;
  if (c && v && v.phase === 'play' && c.closest('#ticket')) { const n = +c.dataset.n;
    if (marks.has(n)) { if (autoMark) return; marks.delete(n); } else { if (!v.called.includes(n)) { ui.toast(`Số ${n} chưa ra mà 😄`); return; } marks.add(n); beep('mark'); }
    saveMarks(); render(v, v); return; }
  const b = e.target.closest('#acts button'); if (!b || !v) return; const a = b.dataset.a;
  if (a === 'kinh') ui.act({ type: 'kinh' });
  else if (a === 'auto') { autoMark = !autoMark; ls.set('loto-auto', autoMark ? '1' : '0'); ui.toast(autoMark ? '🤖 Máy dò số giúp bạn' : '👆 Tự dò: số nào ra thì chạm vào ô đó'); render(v, v); }
  else if (a === 'draw') ui.act({ type: 'draw' });
  else if (a === 'pause') ui.act({ type: 'pause', on: !v.paused });
  else if (a === 'again' && ui.isHost) ui.net.raw.start();
  else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
  else if (a === 'sum') showSummary(v);
});
function showSummary(v) {
  const me = ui.myId, called = new Set(v.called), w = v.winners;
  const head = !w.length ? '😮 Ra hết 90 số mà không ai kinh!' : w.includes(me) ? (w.length > 1 ? '🏆 KINH trùng – bạn thắng!' : '🏆 KINH! Bạn thắng rồi!') : `🏆 ${w.map(id => nameOf(v, id)).join(' & ')} KINH!`;
  ui.openModal(`<h2>${head}</h2><p style="text-align:center;color:var(--muted);font-weight:800;margin:0">Sau ${v.called.length} số${w.length > 1 ? ' · kinh trùng, cùng thắng' : ''}</p><ul class="sum">${w.map(id => { const p = v.players.find(p => p.id === id); return `<li>${esc(cleanName(p.name))}${ticketHTML(v.shown[id], { color: p.color, called, marked: called, win: v.winRows[id], name: cleanName(p.name) })}</li>`; }).join('')}</ul>
    <div class="btns">${ui.isHost ? '<button class="btn pri" id="m-again">🔁 Ván nữa</button>' : ''}<button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal; if ($('#m-again')) $('#m-again').onclick = () => { ui.closeModal(); ui.net.raw.start(); };
}
$('#btn-board').onclick = () => {
  const v = ui.view; if (!v) return; const cs = new Set(v.called), last = v.called[v.called.length - 1];
  ui.openModal(`<h2>🔢 Các số đã ra (${v.called.length}/90)</h2><div class="board">${Array.from({ length: 90 }, (_, i) => `<i class="${i + 1 === last ? 'last' : cs.has(i + 1) ? 'on' : ''}">${i + 1}</i>`).join('')}</div><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Lô tô</h2>
    <p>Mỗi người được phát một <b>tờ vé</b> 9 hàng, mỗi hàng có 5 số (từ 1 tới 90).</p>
    <h3>Dò số</h3><ul><li>Quản trò (máy) lần lượt <b>rao từng số</b>.</li><li>Vé bạn có số đó thì đặt hạt lên. Để <b>🤖 Dò giúp</b> thì máy đặt hộ; chuyển sang <b>👆 Tự dò</b> nếu thích tự tay chạm cho giống hội chợ.</li></ul>
    <h3>Kinh!</h3><ul><li>Đủ <b>5 số trên cùng một hàng ngang</b> thì bấm <b>KINH!</b> thật nhanh – người kinh đúng đầu tiên thắng.</li><li>Hai người cùng đủ ở một số thì <b>kinh trùng</b>, cùng thắng.</li><li>Kinh mà chưa đủ số là <b>kinh hụt</b>: phải chờ số kế tiếp mới được kinh lại.</li></ul>
    <h3>Mẹo</h3><ul><li>Người nào hiện <b>🔥 chờ</b> là đã có hàng 4/5 số – coi chừng!</li><li>Bấm 🔢 để xem lại các số đã ra.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawBtns = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; $('#btn-music').classList.toggle('on', music); }; drawBtns();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('loto-sound', sound ? '1' : '0'); drawBtns(); if (sound) beep('draw'); else try { speechSynthesis.cancel(); } catch (e) {} };
$('#btn-music').onclick = () => { music = !music; drawBtns(); playMusic(); };
try { speechSynthesis.getVoices(); } catch (e) {} /* gọi sớm để trình duyệt nạp danh sách giọng */

const ui = gameKit({
  game: 'loto', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { clearTimeout(drawT); drawKey = ''; endShown = null; if (!ui.net) { music = false; playMusic(); drawBtns(); } } },
  offline: h => { h.addBot(); h.addBot(); h.addBot(); },
});
