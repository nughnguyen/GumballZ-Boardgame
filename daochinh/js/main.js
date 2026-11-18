// 👑 Đảo Chính – giao diện. Luật ở engine.js, máy ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { DEF } from './def.js?v=2';
import * as E from './engine.js?v=2';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { openNews, newsBadge } from '../../shared/ui/news.js?v=176';

const NET = makeNet(DEF);
const { ROLES, ROLE_NAME, ACTS } = E, LV = { 1: 'Dễ', 2: 'Vừa', 3: 'Khó' };
const COL = { duke: '#7c3aed', assassin: '#1f2937', captain: '#0e7490', ambassador: '#15803d', contessa: '#be123c' };
const EN = { duke: 'Duke', assassin: 'Assassin', captain: 'Captain', ambassador: 'Ambassador', contessa: 'Contessa' }; /* tên gốc tiếng Anh ghi kèm trên lá (anh dặn 16/11/2026) */
const ICON = { duke: '👑', assassin: '🗡️', captain: '⚓', ambassador: '📜', contessa: '🌹' };
const DO = { duke: 'Thu thuế +3 · chặn Xin viện trợ', assassin: 'Trả 3 xu: Ám sát', captain: 'Cướp 2 xu · chặn Cướp', ambassador: 'Đổi vai · chặn Cướp', contessa: 'Chặn Ám sát' };
/* hình lá bài tự vẽ bằng SVG: khung + huy hiệu riêng từng vai */
const EMB = {
  duke: `<path d="M22 64 L26 38 L38 52 L50 30 L62 52 L74 38 L78 64 Z" fill="#facc15" stroke="#713f12" stroke-width="3" stroke-linejoin="round"/><rect x="22" y="64" width="56" height="9" rx="3" fill="#eab308" stroke="#713f12" stroke-width="3"/><circle cx="50" cy="30" r="4" fill="#f43f5e"/><circle cx="26" cy="38" r="3.5" fill="#38bdf8"/><circle cx="74" cy="38" r="3.5" fill="#38bdf8"/><g fill="#fde047" stroke="#713f12" stroke-width="2.5"><ellipse cx="34" cy="88" rx="11" ry="5"/><ellipse cx="34" cy="83" rx="11" ry="5"/><ellipse cx="62" cy="88" rx="11" ry="5"/></g>`,
  assassin: `<path d="M50 18 L57 66 L50 74 L43 66 Z" fill="#e5e7eb" stroke="#111827" stroke-width="3" stroke-linejoin="round"/><path d="M50 22 L50 68" stroke="#9ca3af" stroke-width="2"/><rect x="33" y="70" width="34" height="7" rx="3.5" fill="#b91c1c" stroke="#111827" stroke-width="3"/><rect x="45.5" y="77" width="9" height="14" rx="3" fill="#7f1d1d" stroke="#111827" stroke-width="3"/><circle cx="50" cy="95" r="5" fill="#b91c1c" stroke="#111827" stroke-width="3"/>`,
  captain: `<circle cx="50" cy="26" r="7" fill="none" stroke="#e0f2fe" stroke-width="5"/><path d="M50 33 V86" stroke="#e0f2fe" stroke-width="6" stroke-linecap="round"/><path d="M36 46 H64" stroke="#e0f2fe" stroke-width="6" stroke-linecap="round"/><path d="M24 66 C26 84 40 90 50 90 C60 90 74 84 76 66" fill="none" stroke="#e0f2fe" stroke-width="6" stroke-linecap="round"/><path d="M18 70 L24 62 L30 70 M70 70 L76 62 L82 70" fill="none" stroke="#e0f2fe" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`,
  ambassador: `<rect x="28" y="24" width="44" height="62" rx="4" fill="#fef3c7" stroke="#14532d" stroke-width="3"/><path d="M28 30 C20 30 20 20 30 20 H72 C80 20 80 30 72 30" fill="#fde68a" stroke="#14532d" stroke-width="3"/><path d="M28 80 C20 80 20 90 30 90 H72 C80 90 80 80 72 80" fill="#fde68a" stroke="#14532d" stroke-width="3"/><path d="M36 42 H64 M36 51 H64 M36 60 H56" stroke="#a16207" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="72" r="7" fill="#dc2626" stroke="#14532d" stroke-width="2.5"/>`,
  contessa: `<path d="M50 54 C36 54 32 40 40 34 C38 26 48 22 50 28 C52 22 62 26 60 34 C68 40 64 54 50 54 Z" fill="#fb7185" stroke="#4c0519" stroke-width="3" stroke-linejoin="round"/><path d="M44 38 C48 44 54 44 56 38" fill="none" stroke="#4c0519" stroke-width="2.5" stroke-linecap="round"/><path d="M50 54 C50 70 48 80 46 94" fill="none" stroke="#166534" stroke-width="4" stroke-linecap="round"/><path d="M49 70 C40 62 32 66 30 70 C38 74 44 74 49 70 Z M48 82 C56 76 64 78 66 82 C58 86 52 86 48 82 Z" fill="#22c55e" stroke="#166534" stroke-width="2.5"/>`,
};
const BACK = `<rect x="6" y="6" width="88" height="128" rx="9" fill="#3b1d4a" stroke="#d4a017" stroke-width="3"/><path d="M50 22 L78 70 L50 118 L22 70 Z" fill="none" stroke="#d4a017" stroke-width="2.5"/><path d="M50 40 L66 70 L50 100 L34 70 Z" fill="#d4a017" opacity=".25"/><circle cx="50" cy="70" r="8" fill="#d4a017"/>`;
function card(r, { dead = false, cls = '', attrs = '' } = {}) {
  if (!r) return `<span class="cd back ${cls}" ${attrs}><svg viewBox="0 0 100 140" aria-hidden="true">${BACK}</svg></span>`;
  return `<span class="cd ${r}${dead ? ' dead' : ''} ${cls}" style="--rc:${COL[r]}" ${attrs} title="${ROLE_NAME[r]} (${EN[r]})${dead ? ' (đã lật bỏ)' : ''}"><svg viewBox="0 0 100 140" aria-hidden="true"><rect x="4" y="4" width="92" height="132" rx="10" fill="${COL[r]}"/><rect x="10" y="10" width="80" height="102" rx="6" fill="#ffffff14" stroke="#ffffff55" stroke-width="2"/><g transform="translate(5 0) scale(.9)">${EMB[r]}</g></svg><b>${ROLE_NAME[r]}<em>${EN[r]}</em></b></span>`;
}
const coins = n => `<span class="coin">🪙 ${n}</span>`;
let sound = ls.get('daochinh-sound') !== '0', autoPass = ls.get('daochinh-auto') === '1', pick = null, exSel = [], dl = 0, lastTO = 0;
$('#hero').innerHTML = ['duke', 'assassin', 'contessa', 'captain', 'ambassador'].map(r => card(r)).join('');
let ac = null;
function beep(kind) {
  if (!sound) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { act: [[440, 0, .07]], chal: [[330, 0, .08], [262, .09, .14]], block: [[523, 0, .06], [523, .08, .06]], lose: [[196, 0, .25]], turn: [[660, 0, .06], [880, .07, .1]], tick: [[1200, 0, .03]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.12, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}
// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length, seg = (k, list) => `<div class="seg">${list.map(([v, nm]) => `<button type="button" data-opt="${k}" data-v="${v}" aria-pressed="${o[k] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#pcount').textContent = `${n}/6 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 6 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>⏱️ Thời gian mỗi lượt</b>${seg('time', [[12, '12 giây'], [20, '20 giây'], [30, '30 giây'], [0, 'Không giới hạn']])}<small>Hết giờ: lượt chính tự Thu thuế dân, ai chưa trả lời coi như cho qua.</small></div>
    <div class="opt"><b>🤖 Sức máy</b>${seg('level', [[1, 'Dễ'], [2, 'Vừa'], [3, 'Khó']])}<small>Máy chỉ biết lá của nó + những gì cả bàn thấy. Mức cao bịp gan hơn, nghi khéo hơn.</small></div>
    <div class="opt"><b>🪙 Nghi đúng được thưởng</b>${seg('bonus', [[0, 'Luật gốc'], [1, '+1 xu']])}<small>Luật nhà: ai nghi trúng người bịp được thêm 1 xu – cả bàn hăng nghi hơn.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2; $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt(b.dataset.opt, +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();
// ---------- ván chơi ----------
const nameOf = (v, id) => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : '?'; };
const who = (v, id) => id === ui.myId ? 'Bạn' : nameOf(v, id);
function flowText(v) {
  const f = v.flow; if (!f) return '';
  const A = ACTS[f.act]; let t = `<b>${who(v, f.by)}</b> ${A.name.toLowerCase()}${f.target ? ` <b>${who(v, f.target)}</b>` : ''}`;
  if (A.role) t += ` <span class="claim" style="--rc:${COL[A.role]}">${ICON[A.role]} xưng ${ROLE_NAME[A.role]}</span>`;
  if (f.blocker) t += `<br>🛡️ <b>${who(v, f.blocker)}</b> chặn <span class="claim" style="--rc:${COL[f.brole]}">${ICON[f.brole]} xưng ${ROLE_NAME[f.brole]}</span>`;
  return t;
}
let endShown = null, seenGid = null, autoT = null;
function render(v, prev) {
  const me = ui.myId, mine = v.players.find(p => p.id === me), ended = v.phase === 'ended', need = v.need || [], myNeed = !v.spec && need.includes(me);
  if (seenGid !== v.gid) { seenGid = v.gid; pick = null; exSel = []; }
  if (v.phase !== 'action' || v.cur !== me) pick = null;
  if (v.phase !== 'exchange') exSel = [];
  if (v.left >= 0 && (!prev || prev.seq !== v.seq || prev.gid !== v.gid)) dl = performance.now() + v.left;
  const cur = v.players.find(p => p.id === v.cur);
  $('#round').innerHTML = ended ? '🏁 Hết ván' : v.cur === me ? '👑 Lượt của bạn' : `👑 Lượt ${nameOf(v, v.cur)}`;
  $('#deck').textContent = `🂠 ${v.deckN}`;
  // ghế người khác
  const others = v.players.filter(p => p.id !== me);
  const targetable = p => pick && p.alive && !E.canDo({ players: v.players }, me, pick, p.id);
  $('#seats').innerHTML = others.map(p => `<div class="seat${p.id === v.cur && !ended ? ' turn' : ''}${p.alive ? '' : ' out'}${need.includes(p.id) && !ended ? ' need' : ''}${targetable(p) ? ' tg' : ''}${v.flow && v.flow.target === p.id ? ' hit' : ''}${v.winner === p.id ? ' win' : ''}" data-pid="${p.id}" ${targetable(p) ? `role="button" tabindex="0" aria-label="Chọn ${esc(cleanName(p.name))}"` : ''}>
      <div class="who">${avatar(p.name, 30)}<b>${esc(cleanName(p.name))}${p.isBot ? ` <small>${LV[v.opts.level]}</small>` : ''}</b></div>
      <div class="mini">${p.cards.map(c => card(c.r, { dead: c.dead, cls: 'sm' })).join('')}</div>${coins(p.coins)}${need.includes(p.id) && !ended ? '<i class="think">…</i>' : ''}</div>`).join('');
  // sân khấu: chuyện đang diễn ra
  let stage = '';
  if (ended) { const w = v.winner === me ? '🎉 Bạn lên ngôi!' : `🏆 ${nameOf(v, v.winner)} lên ngôi!`; stage = `<div class="big">${w}</div>`; }
  else if (v.lose) stage = `💀 ${v.lose.pid === me ? '<b>Bạn</b> phải' : `<b>${nameOf(v, v.lose.pid)}</b> đang`} chọn 1 lá để lật bỏ${{ chal: ' (nghi sai)', bluff: ' (bị bắt bịp)', kill: ' (bị ám sát)', coup: ' (bị đảo chính)' }[v.lose.why] || ''}.`;
  else if (v.phase === 'exchange') stage = v.ex && v.ex.pool ? '📜 Bạn đang đổi vai: chọn lá giữ lại.' : `📜 <b>${nameOf(v, v.ex && v.ex.pid)}</b> đang đổi vai…`;
  else if (v.flow) stage = flowText(v);
  else stage = v.cur === me ? '👉 Chọn một hành động.' : `<small>Chờ ${nameOf(v, v.cur)} chọn hành động…</small>`;
  if (v.last && v.last.t === 'reveal' && !ended) stage = `<div class="rev ${v.last.ok ? 'ok' : 'no'}">${v.last.ok ? '✅' : '❌'} ${who(v, v.last.who)} ${v.last.ok ? 'có thật' : 'không có'} ${ICON[v.last.role]} ${ROLE_NAME[v.last.role]}</div>` + stage;
  $('#stage').innerHTML = stage;
  $('#clock').hidden = ended || v.left < 0;
  // bài của mình
  const loseMe = v.lose && v.lose.pid === me;
  $('#me').innerHTML = mine ? `<div class="mycards${loseMe ? ' picking' : ''}">${mine.cards.map((c, i) => card(c.r, { dead: c.dead, cls: 'lg', attrs: loseMe && !c.dead ? `data-lose="${i}" role="button" tabindex="0"` : '' })).join('')}</div><div class="mystat">${coins(mine.coins)}${mine.alive ? '' : '<b class="outtag">Đã bị loại</b>'}${E.mustCoup(mine) && v.cur === me && v.phase === 'action' ? '<b class="must">Từ 10 xu phải Đảo chính!</b>' : ''}</div>` : '<p class="spec">👀 Bạn đang xem.</p>';
  // nút bấm
  let acts = '';
  const has = r => mine && mine.cards.some(c => !c.dead && c.r === r);
  if (ended) acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '<small>Chờ chủ phòng mở ván mới…</small>';
  else if (loseMe) acts = '<p class="hint">👆 Chạm vào lá bạn muốn lật bỏ.</p>';
  else if (v.phase === 'exchange' && v.ex && v.ex.pool) acts = `<p class="hint">Chọn ${v.ex.keep} lá giữ lại (${exSel.length}/${v.ex.keep})</p><div class="pool">${v.ex.pool.map((r, i) => card(r, { cls: 'lg' + (exSel.includes(i) ? ' sel' : ''), attrs: `data-ex="${i}" role="button" tabindex="0"` })).join('')}</div><button class="btn pri" data-a="keep" ${exSel.length === v.ex.keep ? '' : 'disabled'}>✔ Giữ những lá này</button>`;
  else if (v.phase === 'action' && v.cur === me && !v.lose) {
    if (pick) acts = `<p class="hint">🎯 ${ACTS[pick].name}: chạm vào người bạn nhắm tới.</p><button class="btn" data-a="unpick">✕ Thôi</button>`;
    else acts = `<div class="actgrid">${Object.entries(ACTS).map(([k, A]) => { const err = E.canDo({ players: v.players }, me, k, A.target ? v.players.find(p => p.id !== me && p.alive).id : null); const lie = A.role && !has(A.role);
      return `<button class="act${lie ? ' lie' : ''}" data-act="${k}" ${err ? `disabled title="${esc(err)}"` : ''} style="--rc:${A.role ? COL[A.role] : '#6b7280'}"><b>${A.role ? ICON[A.role] : k === 'coup' ? '💥' : k === 'aid' ? '🤲' : '🪙'} ${A.name}</b><small>${{ income: '+1 xu, không ai cản', aid: '+2 xu · Công tước chặn được', coup: '7 xu · bắt bỏ 1 lá, không cản được', tax: '+3 xu', assassinate: '3 xu · bắt bỏ 1 lá · Nữ bá tước chặn', steal: 'Lấy 2 xu · Thuyền trưởng/Đại sứ chặn', exchange: 'Bốc 2, trả 2' }[k]}</small>${lie ? '<i>🎭 bịp</i>' : ''}</button>`; }).join('')}</div>`;
  } else if (myNeed && v.phase === 'respond') {
    const f = v.flow, A = ACTS[f.act];
    if (f.step === 'block') acts = A.block.map(r => `<button class="btn blk${has(r) ? '' : ' lie'}" data-block="${r}" style="--rc:${COL[r]}">🛡️ Chặn bằng ${ICON[r]} ${ROLE_NAME[r]}${has(r) ? '' : ' 🎭'}</button>`).join('');
    else acts = `<button class="btn chal" data-a="challenge">🤨 Nghi! (${ROLE_NAME[f.step === 'bchal' ? f.brole : A.role]} là bịp)</button>`;
    acts += `<button class="btn pri" data-a="pass">${f.step === 'block' ? '✋ Không chặn' : '👌 Cho qua'}</button>`;
  } else if (!v.spec && mine && mine.alive && v.phase === 'respond') acts = '<small>Đang chờ người khác trả lời…</small>';
  acts += !ended && !v.spec && mine && mine.alive ? `<label class="auto"><input type="checkbox" id="auto-pass" ${autoPass ? 'checked' : ''}> Tự cho qua khi không nhắm vào mình</label>` : '';
  $('#acts').innerHTML = acts;
  $('#log').innerHTML = (v.log || []).slice().reverse().map(l => `<li>${esc(l)}</li>`).join('');
  // âm thanh + tự cho qua
  if (prev && prev.gid === v.gid && v.seq !== prev.seq) {
    const l = v.last, pl = prev.last;
    if (l !== pl && l) beep(l.t === 'reveal' ? 'chal' : l.t === 'block' ? 'block' : l.t === 'lost' ? 'lose' : 'act');
    if (v.cur === me && prev.cur !== me && v.phase === 'action') beep('turn');
  }
  clearTimeout(autoT);
  if (autoPass && myNeed && v.phase === 'respond' && v.flow && v.flow.target !== me && v.flow.by !== me) { const seq = v.seq; autoT = setTimeout(() => { if (ui.view && ui.view.seq === seq) ui.act({ type: 'pass' }); }, 900); }
  if (ended) { if (endShown !== v.gid) { endShown = v.gid; beep('end'); } } else endShown = null;
  tickClock();
}
/* đồng hồ: máy giữ ván báo còn bao nhiêu ms; về 0 thì người trong bàn báo "hết giờ" (engine tự kiểm lại) */
function tickClock() {
  const v = ui.view; if (!v || v.phase === 'ended' || v.left < 0) return;
  const total = (v.opts.time || 1) * 1000 * (v.phase === 'action' || v.phase === 'exchange' ? 1 : .6), left = Math.max(0, dl - performance.now()), sec = Math.ceil(left / 1000);
  const bar = $('#clock i'); if (bar) bar.style.width = Math.min(100, left / total * 100) + '%'; $('#clock').classList.toggle('low', sec <= 5);
  $('#clock b').textContent = sec + 's';
  if (left <= 0 && !v.spec && v.players.some(p => p.id === ui.myId) && performance.now() - lastTO > 1500) { lastTO = performance.now(); ui.act({ type: 'timeout' }); }
  if ((v.need || []).includes(ui.myId) && sec <= 3 && sec > 0 && tickClock.s !== sec) { tickClock.s = sec; beep('tick'); }
}
setInterval(tickClock, 250);
function choose(el) {
  const v = ui.view; if (!v || !el) return;
  if (el.dataset.lose != null) { ui.act({ type: 'lose', i: +el.dataset.lose }); return; }
  if (el.dataset.ex != null) { const i = +el.dataset.ex; exSel = exSel.includes(i) ? exSel.filter(x => x !== i) : exSel.length < v.ex.keep ? [...exSel, i] : [...exSel.slice(1), i]; render(v, null); return; }
  if (el.classList.contains('tg') && pick) { const a = pick; pick = null; ui.act({ type: 'act', act: a, target: el.dataset.pid }); }
}
$('#screen-game').addEventListener('click', e => {
  const v = ui.view; if (!v) return;
  const c = e.target.closest('[data-lose],[data-ex],.seat.tg'); if (c) { choose(c); return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.act) { const k = b.dataset.act; if (ACTS[k].target) { const ts = v.players.filter(p => p.id !== ui.myId && p.alive); if (ts.length === 1) ui.act({ type: 'act', act: k, target: ts[0].id }); else { pick = k; render(v, null); } } else ui.act({ type: 'act', act: k }); return; }
  if (b.dataset.block) { ui.act({ type: 'block', role: b.dataset.block }); return; }
  const a = b.dataset.a;
  if (a === 'pass' || a === 'challenge') ui.act({ type: a });
  else if (a === 'unpick') { pick = null; render(v, null); }
  else if (a === 'keep') { const idx = exSel; exSel = []; ui.act({ type: 'keep', idx }); }
  else if (a === 'again' && ui.isHost) ui.net.raw.start(); else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
});
$('#screen-game').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-lose],[data-ex],.seat.tg')) { e.preventDefault(); choose(e.target); } });
$('#screen-game').addEventListener('change', e => { if (e.target.id === 'auto-pass') { autoPass = e.target.checked; ls.set('daochinh-auto', autoPass ? '1' : '0'); if (ui.view) render(ui.view, null); } });
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Đảo Chính</h2>
    <p><b>Mục tiêu:</b> là người cuối cùng còn lá úp. Mỗi người có <b>2 lá vai úp</b> (mạng sống) và <b>2 xu</b>. Mất cả 2 lá là bị loại.</p>
    <p>Tới lượt, chọn 1 hành động. Bạn được <b>xưng bất kỳ vai nào</b> – kể cả vai không có trong tay (bịp 🎭).</p>
    <div class="roles">${ROLES.map(r => `<div class="rl">${card(r, { cls: 'sm' })}<div><b>${ROLE_NAME[r]} <i class="en">(${EN[r]})</i></b><small>${DO[r]}</small></div></div>`).join('')}</div>
    <h3>Ai cũng làm được</h3><ul><li>🪙 <b>Thu thuế dân</b>: +1 xu, không ai cản.</li><li>🤲 <b>Xin viện trợ</b>: +2 xu, người xưng Công tước chặn được.</li><li>💥 <b>Đảo chính</b>: trả 7 xu, bắt một người bỏ 1 lá, không ai cản. Có <b>từ 10 xu là bắt buộc</b> Đảo chính.</li></ul>
    <h3>Nghi (🤨) và chặn (🛡️)</h3><ul><li>Ai xưng vai thì ai cũng có thể <b>nghi</b>. Người xưng lật lá: <b>có thật</b> → người nghi mất 1 lá, người xưng xáo lá đó vào chồng và bốc lá mới; <b>không có</b> → người xưng mất 1 lá, hành động hỏng (được trả lại xu).</li><li>Lời <b>chặn</b> cũng là xưng vai nên cũng bị nghi được.</li><li>Bị chặn mà không ai nghi thì hành động hỏng – Ám sát bị chặn vẫn mất 3 xu.</li><li>Bị ám sát mà nghi sai thì có thể mất cả 2 lá một lượt – cẩn thận!</li></ul>
    <h3>Mẹo</h3><ul><li>Để ý lá đã lật: cả bộ chỉ có <b>3 lá mỗi vai</b>. Ai xưng vai đã lật đủ 3 lá thì chắc chắn bịp.</li><li>Bật <b>Tự cho qua</b> để khỏi phải bấm khi chuyện không dính tới mình.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('daochinh-sound', sound ? '1' : '0'); drawSound(); beep('act'); };
$('#btn-news-home').onclick = () => openNews('daochinh'); newsBadge($('#btn-news-home'), 'daochinh');
const ui = gameKit({ game: 'daochinh', net: NET, onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); }, onState: (v, prev) => { if (v) render(v, prev); else { pick = null; exSel = []; endShown = null; } }, offline: h => { h.addBot(); h.addBot(); } });
