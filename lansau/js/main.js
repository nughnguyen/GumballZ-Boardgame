// 🤿 Lặn Sâu – giao diện. Luật ở engine.js, câu hỏi ở questions.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet(DEF);
let sound = ls.get('ls-sound') !== '0';

// ---------- âm thanh nhỏ ----------
let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { q: [[523, 0, .08], [659, .08, .08], [784, .16, .14]], pick: [[660, 0, .06]], ok: [[659, 0, .1], [880, .1, .1], [1175, .2, .24]], bad: [[330, 0, .16], [262, .16, .28]], win: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .34]], tick: [[880, 0, .04]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.12, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}

// ---------- phòng chờ ----------
let optsLoaded = false;
function renderLobby(info, ui) {
  const host = ui.isHost && ui.net ? ui.net.raw : null, o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  if (host && !optsLoaded) { optsLoaded = true; let saved = null; try { saved = JSON.parse(ls.get('ls-opts') || 'null'); } catch (e) {}
    if (saved) { for (const k in E.DEFAULT_OPTS) if (k !== 'seen' && k in saved && E.optOk(k, saved[k])) host.opts[k] = saved[k]; host.pushLobby(); return; } }
  $('#pcount').textContent = `${n}/16 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 16 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#ccount').textContent = '';
  const seg = (key, items) => `<div class="seg">${items.map(([v, nm]) => `<button type="button" data-opt="${key}" data-v="${v}" aria-pressed="${o[key] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#opts').innerHTML = `
    <div class="opt"><b>🌊 Chế độ chơi</b>${seg('mode', [['free', 'Chơi tự do'], ['daily', '7 câu hôm nay']])}<small>${o.mode === 'daily' ? `Hôm nay ${E.vnDateStr()} – cả server cùng 1 bộ 7 câu, mai đổi bộ mới.` : 'Câu ngẫu nhiên trong kho 35 câu – mỗi ván một bộ khác nhau.'}</small></div>
    <div class="opt"><b>🤖 Độ giỏi của máy</b>${seg('bot', [[1, 'Mới biết bơi'], [2, 'Thợ lặn'], [3, 'Thợ săn đáy biển']])}<small>Máy yếu hay nghĩ đáp án phổ biến, máy giỏi hay nghĩ đáp án hiếm.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 1;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
  else if (b.dataset.opt) h.setOpt(b.dataset.opt, b.dataset.opt === 'bot' ? +b.dataset.v : b.dataset.v);
  setTimeout(() => { try { ls.set('ls-opts', JSON.stringify({ ...h.opts, seen: [] })); } catch (x) {} }, 50);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let skew = 0, shownKey = '', toSent = '', lastTick = 0, seen = [], seenAll = [];
const P = (v, id) => v.players.find(p => p.id === id) || { name: '?' };
const nm = (v, id) => esc(cleanName(P(v, id).name));
const left = v => v.deadline ? (v.deadline - (Date.now() + skew)) / 1000 : null;
const rank = v => v.players.slice().sort((a, b) => b.score - a.score || b.right - a.right);
const DEPTH = s => Math.max(0, s) * 10;
const fmtM = m => m.toLocaleString('vi-VN') + 'm';
function depthBar(v) {
  const me = v.me, d = me ? me.depth : 0, pct = Math.min(100, d / E.MAX_DEPTH_M * 100);
  return `<div class="depth"><div class="d-top"><span>🤿 Độ sâu của bạn</span><b>${fmtM(d)} / ${fmtM(E.MAX_DEPTH_M)}</b></div><div class="d-bar"><i style="width:${pct}%"></i><span class="d-mark" style="left:71.4%">5.000m</span></div><small>1 điểm = lặn sâu thêm 10m · 700 điểm = chạm đáy rãnh</small></div>`;
}
function board(v) {
  const r = rank(v), g = v.gain || {};
  return r.map((p, i) => `<div class="row${p.id === ui.myId ? ' me' : ''}${v.answered.includes(p.id) ? ' done' : ''}" data-pid="${p.id}"><span class="rk">${i + 1}</span>${avatar(p.name, 26)}<span class="nm">${esc(cleanName(p.name))}</span>${p.streak >= 3 ? `<span class="fire" title="Chuỗi ${p.streak} câu ghi điểm">🔥${p.streak}</span>` : ''}${g[p.id] ? `<span class="gn ${g[p.id].g > 0 ? 'y' : ''}">${g[p.id].g > 0 ? '+' : ''}${g[p.id].g}</span>` : ''}<b>${p.score} <small>· ${fmtM(DEPTH(p.score))}</small></b></div>`).join('');
}
function qCard(v) {
  const q = v.q;
  return `<div class="qcard"><div class="qmeta"><span>Câu ${v.i + 1}/${v.total}${v.daily ? ` · 📅 ${v.daily}` : ''}</span><span>⏱️ ${E.Q_TIME}s · tối đa 100đ</span></div><div class="qt">${esc(q.q)}</div><p class="qhint">Gõ một đáp án bất kỳ – đáp án càng ít người nghĩ tới càng nhiều điểm!</p></div>`;
}
function ansForm(v) {
  if (v.spec) return `<div class="hint">👀 Bạn đang xem – ván sau sẽ được chơi.</div>`;
  const me = v.me || {};
  if (me.ans !== null) return `<div class="hint">Đã chốt <b>${esc(me.ans)}</b> – chờ mọi người (${v.answered.length}/${v.players.length})…</div>`;
  return `<form class="ansform" id="ls-form"><input id="ls-in" maxlength="40" placeholder="Gõ đáp án của bạn…" autocomplete="off" enterkeyhint="go"><button class="btn big pri" type="submit">Gửi đáp án</button></form><div class="hint">Chọn rồi không đổi lại được!</div>`;
}
function myResult(v) {
  const g = v.gain && v.gain[ui.myId]; if (!g) return v.spec ? '' : '';
  if (g.ok) return `<div class="res y">🎉 <b>${esc(g.text)}</b> được <b>+${g.g}đ</b>${g.rare ? ' · 💎 đáp án hiếm!' : ''} · sâu thêm ${fmtM(g.g * 10)}</div>`;
  return `<div class="res n">${g.text ? `😵 <b>${esc(g.text)}</b> không có trong danh sách đáp án – <b>0đ</b>` : '⏰ Hết giờ – <b>0đ</b>'}</div>`;
}
function rareList(v) {
  const list = (v.q && v.q.list) || [];
  if (!list.length) return '';
  return `<div class="rare"><b>💎 Đáp án hiếm nhất câu này</b>${list.slice(0, 5).map(([t, p], i) => `<div class="rrow"><span class="rk">${i + 1}</span><span>${esc(t)}</span><b>${p}đ</b></div>`).join('')}</div>`;
}
function ending(v) {
  const r = rank(v), pod = r.slice(0, 3), me = P(v, ui.myId), sum = (v.final && v.final.summary && v.final.summary[ui.myId]) || null;
  return `<div class="end"><h2>🏆 Chạm đáy rãnh!</h2><div class="podium">${[1, 0, 2].map(i => pod[i] ? `<div class="pd p${i + 1}">${avatar(pod[i].name, i ? 44 : 58)}<b>${esc(cleanName(pod[i].name))}</b><span>${pod[i].score}đ · ${fmtM(DEPTH(pod[i].score))}</span><i>${['🥇', '🥈', '🥉'][i]}</i></div>` : '').join('')}</div>
    ${v.draw ? '<p class="mine">🤝 Hòa nhau ở đỉnh rãnh – không ai thắng ván này!</p>' : ''}
    ${me && me.id && sum ? `<p class="mine">Bạn ghi <b>${sum.score}đ</b> · lặn sâu <b>${fmtM(sum.depth)}</b> · đúng <b>${sum.right}/${v.total}</b> câu · đáp án hiếm <b>${sum.rare}</b> · chuỗi dài nhất <b>${sum.best}</b> · hạng <b>${r.findIndex(p => p.id === me.id) + 1}</b></p>` : ''}
    <div class="lst">${r.map((p, i) => `<div class="row${p.id === ui.myId ? ' me' : ''}"><span class="rk">${i + 1}</span>${avatar(p.name, 26)}<span class="nm">${esc(cleanName(p.name))}</span><small>${p.right}/${v.total} đúng · ${p.rare} hiếm</small><b>${p.score}đ</b></div>`).join('')}</div></div>`;
}
function render(v, prev) {
  skew = (v.now || Date.now()) - Date.now();
  if (v.ids) seen = v.ids;
  const me = v.players.find(p => p.id === ui.myId);
  $('#myscore').innerHTML = me ? `⭐ ${me.score} · 🤿 ${fmtM(DEPTH(me.score))}` : '';
  drawRound(v);
  let st = '', ac = '';
  if (v.phase === 'intro') st = `<div class="intro"><div class="big">🤿</div><h2>Sẵn sàng lặn chưa?</h2><p>7 câu · 25 giây mỗi câu · đáp án càng hiếm càng lặn sâu!</p><div class="cd" id="cd"></div></div>`;
  else if (v.phase === 'q' || v.phase === 'rev') {
    st = depthBar(v) + qCard(v);
    if (v.phase === 'q') ac = ansForm(v);
    else { st += myResult(v) + rareList(v); ac = ui.isHost ? `<button class="btn pri" data-a="next">${v.i + 1 >= v.total ? '🏁 Xem kết quả' : 'Câu tiếp ▶'}</button>` : ''; }
  } else if (v.phase === 'ended') {
    st = ending(v);
    ac = ui.isHost ? '<button class="btn big pri" data-a="again">🔁 Ván mới (câu mới)</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '<div class="hint">Chờ chủ phòng mở ván mới…</div>';
  }
  const key = `${v.gid}|${v.phase}|${v.i}|${v.me ? `${v.me.ans}|${v.me.depth}` : ''}|${v.answered.length}`;
  if (key !== shownKey) { $('#stage').innerHTML = st; $('#acts').innerHTML = ac; shownKey = key; if (v.phase !== 'q') $('#stage').scrollTop = 0; const inp = $('#ls-in'); if (inp) inp.focus(); }
  $('#board').innerHTML = v.phase === 'ended' ? '' : board(v);
  $('#hostbar').innerHTML = ui.isHost && v.phase !== 'ended' ? '<button class="chip" data-hh="end">🏁 Dừng ván</button>' : '';
  if (prev && prev.gid === v.gid) {
    if (v.phase === 'q' && (prev.phase !== 'q' || prev.i !== v.i)) beep('q');
    if (v.phase === 'rev' && prev.phase !== 'rev') { const g = v.gain && v.gain[ui.myId]; beep(g && g.ok ? 'ok' : 'bad'); }
    if (v.phase === 'ended' && prev.phase !== 'ended') beep('win');
  }
}
function drawRound(v) {
  const t = left(v), s = t == null ? null : Math.max(0, Math.ceil(t));
  const ph = v.phase === 'intro' ? '🤿 Chuẩn bị' : v.phase === 'ended' ? '🏁 Hết ván' : `❓ Câu ${v.i + 1}/${v.total}`;
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

$('#acts').addEventListener('submit', e => { // form đáp án nằm trong #acts (render() gán ac = ansForm(v) vào #acts)
  if (e.target.id !== 'ls-form') return; e.preventDefault();
  const v = ui.view, inp = $('#ls-in'); if (!v || !inp || v.phase !== 'q') return;
  const text = inp.value.trim(); if (!text) { tip('Gõ một đáp án đã nha.'); return; }
  beep('pick'); ui.act({ type: 'ans', text });
  inp.disabled = true;
});
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'), v = ui.view; if (!b || !v || b.disabled) return;
  const a = b.dataset.a;
  if (a === 'next') ui.act({ type: 'next' });
  else if (a === 'again') { seenAll = [...new Set([...seenAll, ...seen])].slice(-300); ui.net.raw.start({ seen: seenAll }); }
  else if (a === 'lobby') ui.net.raw.restart();
});
$('#hostbar').addEventListener('click', async e => {
  const b = e.target.closest('[data-hh]'); if (!b || !ui.isHost) return;
  if (await confirmBox('Dừng ván này và xem bảng điểm luôn nhé?', { title: '🏁 Dừng ván?', ok: 'Dừng', cancel: 'Chơi tiếp' })) ui.act({ type: 'end' });
});
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Lặn Sâu</h2>
    <p>Mỗi ván có <b>7 câu hỏi</b>, mỗi câu <b>25 giây</b>. Mỗi câu yêu cầu kể tên một thứ – ví dụ một loại trái cây, một con vật, một món ăn… Bạn <b>gõ đáp án tự do</b> rồi gửi.</p>
    <h3>Tính điểm – đáp án càng hiếm càng sâu</h3><ul><li><b>10đ</b> – đáp án ai cũng nghĩ ra.</li><li><b>15đ</b> – đáp án khá phổ biến.</li><li><b>30đ</b> – đáp án quen.</li><li><b>60đ</b> – đáp án hiếm.</li><li><b>85đ</b> – đáp án rất hiếm.</li><li><b>100đ</b> – đáp án hiếm nhất câu.</li><li>Đáp án <b>không có trong danh sách</b>: 0đ.</li></ul>
    <p><b>1 điểm = lặn sâu thêm 10m.</b> Tối đa <b>700 điểm = 7.000m</b>, chạm đáy rãnh! Sau mỗi câu sẽ hiện đáp án hiếm nhất để học hỏi.</p>
    <h3>Chế độ chơi</h3><ul><li><b>Chơi tự do</b>: câu ngẫu nhiên trong kho 35 câu.</li><li><b>7 câu hôm nay</b>: cả server cùng 1 bộ 7 câu theo ngày, mai đổi bộ mới.</li><li><b>Online</b>: 1–16 người cùng trả lời một câu, chấm cùng lúc.</li></ul>
    <p>Chữ không phân biệt hoa thường hay dấu – gõ "xoi" vẫn nhận là "xoài" nha!</p>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('ls-sound', sound ? '1' : '0'); drawSound(); beep('pick'); };

const ui = gameKit({
  game: 'lansau', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { shownKey = ''; if (!ui.net) optsLoaded = false; } },
  offline: h => { for (let i = 0; i < 3; i++) h.addBot(); },
});
