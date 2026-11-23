// 🧠 Đố Vui Siêu Tốc – giao diện. Luật ở engine.js, câu hỏi ở questions.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { DEF } from './def.js?v=4';
import * as E from './engine.js?v=5';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=15';
import { confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet(DEF);
let sound = ls.get('dv-sound') !== '0';
const LVN = ['Khởi động', 'Dễ', 'Vừa', 'Khó', 'Siêu khó'], L = ['A', 'B', 'C', 'D'], CAT = Object.fromEntries(E.CATS.map(c => [c.id, c])), STAR = d => '⭐'.repeat(d);

// ---------- âm thanh nhỏ ----------
let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { q: [[523, 0, .08], [659, .08, .08], [784, .16, .14]], pick: [[660, 0, .06]], ok: [[659, 0, .1], [880, .1, .1], [1175, .2, .24]], bad: [[330, 0, .16], [262, .16, .28]], win: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .34]], tick: [[880, 0, .04]], help: [[440, 0, .06], [660, .06, .1]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.12, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}

// ---------- phòng chờ ----------
let optsLoaded = false;
function renderLobby(info, ui) {
  const host = ui.isHost && ui.net ? ui.net.raw : null, o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  if (host && !optsLoaded) { optsLoaded = true; let saved = null; try { saved = JSON.parse(ls.get('dv-opts') || 'null'); } catch (e) {}
    if (saved) { for (const k in E.DEFAULT_OPTS) if (k !== 'seen' && k in saved && E.optOk(k, saved[k])) host.opts[k] = saved[k]; host.pushLobby(); return; } }
  $('#pcount').textContent = `${n}/16 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 16 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#ccount').textContent = '';
  const seg = (key, items) => `<div class="seg">${items.map(([v, nm]) => `<button type="button" data-opt="${key}" data-v="${v}" aria-pressed="${o[key] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  const nq = E.CATS.filter(c => (o.cats || []).includes(c.id)).length;
  $('#opts').innerHTML = `
    <div class="opt"><b>❓ Số câu mỗi ván</b>${seg('n', [[10, '10 câu'], [15, '15 câu'], [20, '20 câu']])}<small>Như gameshow: câu đầu khởi động, càng về cuối càng khó (⭐ → ⭐⭐⭐⭐⭐) và càng nhiều điểm.</small></div>
    <div class="opt"><b>⏱️ Thời gian mỗi câu</b>${seg('t', [[12, '12s'], [20, '20s'], [30, '30s']])}</div>
    <div class="opt"><b>🛟 Quyền trợ giúp</b>${seg('help', [[1, 'Có'], [0, 'Không']])}<small>Mỗi người mỗi ván 1 lần: ✂️ 50:50 · 👥 Hỏi khán giả · 📞 Gọi người thân · ✖️2 Nhân đôi (đúng ×2, sai bị trừ).</small></div>
    <div class="opt"><b>🤖 Độ giỏi của máy</b>${seg('bot', [[1, 'Học sinh'], [2, 'Sinh viên'], [3, 'Giáo sư']])}</div>
    <div class="opt"><b>🗂️ Chủ đề <small>(${nq}/${E.CATS.length})</small></b><div class="cats">${E.CATS.map(c => `<button type="button" data-cat="${c.id}" aria-pressed="${(o.cats || []).includes(c.id)}" ${dis}>${c.e} ${c.name}</button>`).join('')}</div></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 1;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
  else if (b.dataset.opt) h.setOpt(b.dataset.opt, +b.dataset.v);
  else if (b.dataset.cat) { const id = b.dataset.cat, cur = h.opts.cats || [], nx = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]; if (!nx.length) { tip('Giữ lại ít nhất một chủ đề nha.'); return; } h.setOpt('cats', nx); }
  setTimeout(() => { try { ls.set('dv-opts', JSON.stringify({ ...h.opts, seen: [] })); } catch (x) {} }, 50);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let skew = 0, shownKey = '', toSent = '', lastTick = 0, seen = [], seenAll = [];
let endShown = null, endModalOpen = false; /* end modal chỉ hiện 1 lần mỗi ván */
const freshSeed = () => (Math.random() * 0xFFFFFFFF) >>> 0; /* ván mới: seed ngẫu nhiên mới → câu mới */
const P = (v, id) => v.players.find(p => p.id === id) || { name: '?' };
const nm = (v, id) => esc(cleanName(P(v, id).name));
const left = v => v.deadline ? (v.deadline - (Date.now() + skew)) / 1000 : null;
const rank = v => v.players.slice().sort((a, b) => b.score - a.score || b.right - a.right);
function board(v) {
  const r = rank(v), g = v.gain || {};
  return r.map((p, i) => `<div class="row${p.id === ui.myId ? ' me' : ''}${v.answered.includes(p.id) ? ' done' : ''}" data-pid="${p.id}"><span class="rk">${i + 1}</span>${avatar(p.name, 26)}<span class="nm">${esc(cleanName(p.name))}</span>${p.streak >= 3 ? `<span class="fire" title="Chuỗi ${p.streak} câu đúng">🔥${p.streak}</span>` : ''}${g[p.id] ? `<span class="gn ${g[p.id].g > 0 ? 'y' : g[p.id].g < 0 ? 'n' : ''}">${g[p.id].g > 0 ? '+' : ''}${g[p.id].g || (g[p.id].ok ? '' : '✗')}</span>` : ''}<b>${p.score}</b></div>`).join('');
}
function qCard(v) {
  const q = v.q, lad = E.ladder(v.total); /* không hiện chủ đề (anh dặn 19/11/2026) – chỉ thang câu khó dần */
  const pips = lad.map((d, i) => `<i class="pp d${d}${i < v.i ? ' past' : i === v.i ? ' cur' : ''}"></i>`).join('');
  return `<div class="qcard"><div class="qmeta"><span>Câu ${v.i + 1}/${v.total} · ${LVN[q.d - 1]}</span><span>${STAR(q.d)} ${E.BASE[q.d]} điểm</span></div><div class="pips" aria-hidden="true">${pips}</div><div class="qt">${esc(q.q)}</div></div>`;
}
function options(v) {
  const q = v.q, me = v.me || {}, rev = q.a !== null, cnt = [0, 0, 0, 0];
  if (rev && v.gain) for (const g of Object.values(v.gain)) if (g.c !== null) cnt[g.c]++;
  return `<div class="anss${q.o.some(o => o.length > 26) ? ' long' : ''}${rev ? ' rev' : ''}">${q.o.map((o, i) => {
    const hid = (me.hid || []).includes(i), mine = me.ans === i, cls = [`o${i}`, hid ? 'hid' : '', mine ? 'mine' : '', rev && i === q.a ? 'right' : '', rev && mine && i !== q.a ? 'wrong' : ''].join(' ');
    return `<button type="button" class="ans ${cls}" data-c="${i}" ${hid || me.ans !== null || rev || v.spec ? 'disabled' : ''}><span class="lt">${L[i]}</span><span class="tx">${esc(o)}</span>${rev && cnt[i] ? `<span class="ct">${cnt[i]}</span>` : ''}</button>`;
  }).join('')}</div>`;
}
function helps(v) {
  if (!v.opts.help || !v.me || v.spec) return '';
  const can = v.phase === 'q' && v.me.ans === null, me = v.me;
  const b = (h, ic, t, ok, on) => `<button type="button" class="hb${on ? ' on' : ''}" data-h="${h}" ${can && ok ? '' : 'disabled'}><i>${ic}</i>${t}</button>`;
  return `<div class="helps">${b('fifty', '✂️', '50:50', me.fifty && !me.hid.length)}${b('aud', '👥', 'Khán giả', me.audLeft && !me.aud)}${b('call', '📞', 'Gọi điện', me.callLeft && !me.call)}${b('dbl', '✖️2', me.dbl ? 'Đang ×2!' : 'Nhân đôi', me.dblLeft && !me.dbl, me.dbl)}</div>`;
}
/* kết quả trợ giúp hiện ngay dưới câu hỏi */
function helpOut(v) {
  const me = v.me; if (!me || v.spec) return '';
  let h = '';
  if (me.aud) h += `<div class="aud"><b>👥 Khán giả trong trường quay bình chọn</b><div class="bars">${me.aud.map((p, i) => `<div class="bar o${i}"><span style="height:${Math.max(2, p)}%"></span><small>${p}%</small><b>${L[i]}</b></div>`).join('')}</div></div>`;
  if (me.call) h += `<div class="call">📞 <b>${esc(me.call.who)}</b>: "Alo… chắc là <b>${L[me.call.c]}</b> – ${esc(v.q.o[me.call.c])} đó. Chắc khoảng <b>${me.call.sure}%</b> thôi nha!"</div>`;
  return h;
}
function myResult(v) {
  const g = v.gain && v.gain[ui.myId]; if (!g) return v.spec ? '' : '';
  return `<div class="res ${g.ok ? 'y' : 'n'}">${g.ok ? `🎉 Chính xác! <b>+${g.g}</b>${g.streak >= 3 ? ` · 🔥 chuỗi ${g.streak}` : ''}` : g.c === null ? `⏰ Hết giờ${g.g < 0 ? ` <b>${g.g}</b>` : ''}` : `😵 Sai rồi${g.g < 0 ? ` <b>${g.g}</b>` : ''}`}</div>`;
}
function ending(v) {
  const r = rank(v), pod = r.slice(0, 3), me = P(v, ui.myId);
  return `<div class="end"><h2>🏆 Bảng vàng</h2><div class="podium">${[1, 0, 2].map(i => pod[i] ? `<div class="pd p${i + 1}">${avatar(pod[i].name, i ? 44 : 58)}<b>${esc(cleanName(pod[i].name))}</b><span>${pod[i].score}</span><i>${['🥇', '🥈', '🥉'][i]}</i></div>` : '').join('')}</div>
    ${me && me.id ? `<p class="mine">Bạn đúng <b>${me.right}/${v.total}</b> câu · chuỗi dài nhất <b>${me.best}</b> · hạng <b>${r.findIndex(p => p.id === me.id) + 1}</b></p>` : ''}
    <div class="lst">${r.map((p, i) => `<div class="row${p.id === ui.myId ? ' me' : ''}"><span class="rk">${i + 1}</span>${avatar(p.name, 26)}<span class="nm">${esc(cleanName(p.name))}</span><small>${p.right}/${v.total} đúng</small><b>${p.score}</b></div>`).join('')}</div></div>`;
}
/* end modal chuẩn như các game khác (mẫu mastermind/baucua): hiện khi hết ván, có điểm số
   + nút chơi lại / về sảnh / về trang chủ. Bảng vàng trong màn hình game vẫn giữ làm nền. */
function showEndModal(v) {
  const r = rank(v), me = P(v, ui.myId), w = r[0];
  const title = !w || w.score <= 0 ? '🤝 Chưa ai ghi điểm!' : w.id === ui.myId ? '👑 Bạn thắng ván này!' : `🏁 ${esc(cleanName(w.name))} thắng ván này!`;
  const rows = r.map((p, i) => `<li class="${i === 0 && p.score > 0 ? 'win' : ''}">${avatar(p.name)}<span class="nm">${i + 1}. ${esc(cleanName(p.name))}${p.id === ui.myId ? ' (bạn)' : ''}<small>đúng ${p.right}/${v.total} câu · chuỗi dài nhất ${p.best}</small></span><b>${p.score}</b></li>`).join('');
  const btns = ui.isHost
    ? `<button class="btn big pri" id="m-again">🔁 Ván mới</button><button class="btn" id="m-lobby">Về phòng chờ</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`
    : `<button class="btn big pri" id="m-close">Đóng</button><button class="btn" id="m-home">🏠 Về trang chủ</button>`;
  ui.openModal(`<h2>${title}</h2><ul class="sum">${rows}</ul>${me && me.id ? `<p style="text-align:center;color:var(--muted);font-weight:800;margin:10px 0 0">Bạn đúng ${me.right}/${v.total} câu · hạng ${r.findIndex(p => p.id === me.id) + 1}</p>` : ''}<div class="btns">${btns}</div>`, 'lock');
  endModalOpen = true;
  const again = $('#m-again'); if (again) again.onclick = () => { ui.closeModal(); endModalOpen = false; seenAll = [...new Set([...seenAll, ...seen])].slice(-300); ui.net.raw.start({ seen: seenAll, seed: freshSeed() }); };
  const lobby = $('#m-lobby'); if (lobby) lobby.onclick = () => { ui.closeModal(); endModalOpen = false; ui.net.raw.restart(); };
  const home = $('#m-home'); if (home) home.onclick = () => { ui.closeModal(); endModalOpen = false; ui.leave(); };
  const close = $('#m-close'); if (close) close.onclick = () => { ui.closeModal(); endModalOpen = false; };
}
function render(v, prev) {
  skew = (v.now || Date.now()) - Date.now();
  if (v.ids) seen = v.ids;
  const me = v.players.find(p => p.id === ui.myId);
  $('#myscore').innerHTML = me ? `⭐ ${me.score}` : '';
  drawRound(v);
  let st = '', ac = '';
  if (v.phase === 'intro') st = `<div class="intro"><div class="big">🧠</div><h2>Sẵn sàng chưa?</h2><p>${v.total} câu · ${v.t} giây mỗi câu · trả lời càng nhanh càng nhiều điểm!</p><div class="cd" id="cd"></div></div>`;
  else if (v.phase === 'q' || v.phase === 'rev') {
    st = qCard(v) + (v.phase === 'q' ? helpOut(v) : '') + options(v); /* kết quả trợ giúp nằm ngay trên đáp án cho khỏi bị khuất */
    if (v.phase === 'q') ac = helps(v) + `<div class="hint">${v.spec ? '👀 Bạn đang xem – ván sau sẽ được chơi.' : v.me.ans !== null ? `Đã chốt <b>${L[v.me.ans]}</b> – chờ mọi người (${v.answered.length}/${v.players.length})…` : 'Chọn một đáp án – không đổi lại được!'}</div>`;
    else { st += myResult(v) + `<div class="fact"><b><span class="nerd" aria-hidden="true">🤓☝️</span> Bạn có biết?</b>${esc(v.q.f)}</div>`; ac = ui.isHost ? `<button class="btn pri" data-a="next">${v.i + 1 >= v.total ? '🏁 Xem kết quả' : 'Câu tiếp ▶'}</button>` : ''; }
  } else if (v.phase === 'ended') {
    st = ending(v);
    ac = ui.isHost ? '<button class="btn big pri" data-a="again">🔁 Ván mới (câu mới)</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '<div class="hint">Chờ chủ phòng mở ván mới…</div>';
  }
  const key = `${v.gid}|${v.phase}|${v.i}|${v.me ? `${v.me.ans}|${v.me.hid}|${v.me.dbl}|${!!v.me.aud}|${!!v.me.call}` : ''}|${v.answered.length}`;
  if (key !== shownKey) { $('#stage').innerHTML = st; $('#acts').innerHTML = ac; shownKey = key; if (v.phase !== 'q') $('#stage').scrollTop = 0; }
  $('#board').innerHTML = v.phase === 'ended' ? '' : board(v);
  $('#hostbar').innerHTML = ui.isHost && v.phase !== 'ended' ? '<button class="chip" data-hh="end">🏁 Dừng ván</button>' : '';
  if (prev && prev.gid === v.gid) {
    if (v.phase === 'q' && (prev.phase !== 'q' || prev.i !== v.i)) beep('q');
    if (v.phase === 'rev' && prev.phase !== 'rev') { const g = v.gain && v.gain[ui.myId]; beep(g && g.ok ? 'ok' : 'bad'); }
    if (v.phase === 'ended' && prev.phase !== 'ended') beep('win');
  }
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; setTimeout(() => { if (ui.view === v && !endModalOpen) showEndModal(v); }, 600); } }
  else { endShown = null; if (endModalOpen) { endModalOpen = false; ui.closeModal(); } } /* ván mới bắt đầu thì đóng end modal */
}
function drawRound(v) {
  const t = left(v), s = t == null ? null : Math.max(0, Math.ceil(t));
  const ph = v.phase === 'intro' ? '🧠 Chuẩn bị' : v.phase === 'ended' ? '🏁 Hết ván' : `❓ Câu ${v.i + 1}/${v.total}`;
  $('#round').innerHTML = `${ph}${s != null && v.phase !== 'ended' ? `<span class="tm${s <= 5 && v.phase === 'q' ? ' low' : ''}">${s}s</span>` : ''}`;
  const bar = $('#tbar i'), tot = v.phase === 'q' ? v.t : v.phase === 'rev' ? E.REV_T : E.INTRO_T;
  if (bar) { bar.style.width = t == null || v.phase === 'ended' ? '0%' : Math.max(0, Math.min(100, 100 * t / tot)) + '%'; bar.className = v.phase === 'q' ? (t <= 5 ? 'low' : '') : 'soft'; }
  const cd = $('#cd'); if (cd && v.phase === 'intro') cd.textContent = s > 0 ? s : 'Bắt đầu!';
}
setInterval(() => {
  const v = ui.view; if (!v || !ui.net || v.phase === 'ended' || !v.deadline) return; drawRound(v);
  const t = left(v), s = Math.ceil(t);
  if (v.phase === 'q' && v.me && v.me.ans === null && s <= 3 && s > 0 && s !== lastTick) { lastTick = s; beep('tick'); }
  if (t <= -0.6 && toSent !== v.gid + ':' + v.seq) { toSent = v.gid + ':' + v.seq; ui.act({ type: 'timeout' }); }
}, 200);

$('#stage').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'), v = ui.view; if (!b || !v || b.disabled || v.phase !== 'q') return;
  beep('pick'); ui.act({ type: 'ans', c: +b.dataset.c });
  b.classList.add('mine'); document.querySelectorAll('#stage .ans').forEach(x => x.disabled = true); /* phản hồi ngay, không chờ máy chủ */
});
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('[data-a],[data-h]'), v = ui.view; if (!b || !v || b.disabled) return;
  if (b.dataset.h) { beep('help'); ui.act({ type: b.dataset.h }); return; }
  const a = b.dataset.a;
  if (a === 'next') ui.act({ type: 'next' });
  else if (a === 'again') { seenAll = [...new Set([...seenAll, ...seen])].slice(-300); ui.net.raw.start({ seen: seenAll, seed: freshSeed() }); } /* không lặp câu vừa hỏi */
  else if (a === 'lobby') ui.net.raw.restart();
});
$('#hostbar').addEventListener('click', async e => {
  const b = e.target.closest('[data-hh]'); if (!b || !ui.isHost) return;
  if (await confirmBox('Dừng ván này và xem bảng điểm luôn nhé?', { title: '🏁 Dừng ván?', ok: 'Dừng', cancel: 'Chơi tiếp' })) ui.act({ type: 'end' });
});
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Đố Vui Siêu Tốc</h2>
    <p>Cả phòng cùng nhận một câu hỏi với 4 đáp án. Chọn thật nhanh – <b>chọn rồi không đổi được</b>!</p>
    <h3>Tính điểm</h3><ul><li>Câu hỏi <b>khó dần</b> như gameshow: ⭐ 100 · ⭐⭐ 200 · ⭐⭐⭐ 300 · ⭐⭐⭐⭐ 500 · ⭐⭐⭐⭐⭐ 800 điểm.</li><li><b>Nhanh tay</b>: trả lời ngay lập tức được thêm tới 50%.</li><li><b>🔥 Chuỗi</b>: từ câu đúng thứ 3 liên tiếp, mỗi câu đúng thêm 50 điểm.</li></ul>
    <h3>Quyền trợ giúp (mỗi ván 1 lần)</h3><ul><li><b>✂️ 50:50</b> – bỏ bớt 2 đáp án sai.</li><li><b>👥 Hỏi ý kiến khán giả</b> – xem khán giả trong trường quay bình chọn đáp án nào (khán giả cũng có lúc sai!).</li><li><b>📞 Gọi điện cho người thân</b> – một người thân đoán giúp kèm độ chắc chắn.</li><li><b>✖️2 Nhân đôi</b> – bật trước khi trả lời: đúng được gấp đôi, sai bị trừ nửa điểm gốc.</li></ul>
    <p>Sau mỗi câu có mục <b>💡 Bạn có biết?</b> – đọc để lần sau thắng nha!</p>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('dv-sound', sound ? '1' : '0'); drawSound(); beep('pick'); };

const ui = gameKit({
  game: 'dovui', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { shownKey = ''; if (!ui.net) optsLoaded = false; } },
  offline: h => { for (let i = 0; i < 3; i++) h.addBot(); },
});
