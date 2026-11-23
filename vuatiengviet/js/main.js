// 👑 Vua Tiếng Việt – giao diện. Luật ở engine.js, kho từ ở words.js + proverbs.js, phòng/mạng dùng shared/net/simplenet.js.
// ?fast=1: chế độ test — vòng 3s, mở ô mỗi 2s (engine opt `fast`, không hiện ở phòng chờ).
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=15';
import { confirmBox, toast as tip } from '../../shared/ui/dialog.js?v=10';

const FAST = new URLSearchParams(location.search).has('fast');
const NET = makeNet(DEF);
let sound = ls.get('vtv-sound') !== '0';

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
  if (host && !optsLoaded) { optsLoaded = true; let saved = null; try { saved = JSON.parse(ls.get('vtv-opts') || 'null'); } catch (e) {}
    if (saved) { for (const k in E.DEFAULT_OPTS) if (k !== 'seen' && k in saved && E.optOk(k, saved[k])) host.opts[k] = saved[k]; host.pushLobby(); return; } }
  $('#pcount').textContent = `${n}/16 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 16 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#ccount').textContent = '';
  const seg = (key, items) => `<div class="seg">${items.map(([v, nm]) => `<button type="button" data-opt="${key}" data-v="${v}" aria-pressed="${o[key] === v}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#opts').innerHTML = `
    <div class="opt"><b>🤖 Độ giỏi của máy</b>${seg('bot', [[1, 'Mới học chữ'], [2, 'Thi sĩ'], [3, 'Trạng nguyên']])}<small>Máy càng giỏi thì mỗi lần đoán càng dễ trúng đáp án đúng.</small></div>
    <div class="opt"><b>📏 Luật vòng</b><small>7 vòng mỗi trận · 30 giây mỗi vòng, hết giờ mở 1 ô chữ, sau đó cứ 10 giây mở thêm 1 ô · Dễ 10đ · Trung bình 20đ · Khó (từ dài, ca dao) 30đ · điểm chỉ tính trong phòng.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 1;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
  else if (b.dataset.opt) h.setOpt(b.dataset.opt, b.dataset.opt === 'bot' ? +b.dataset.v : b.dataset.v);
  setTimeout(() => { try { ls.set('vtv-opts', JSON.stringify({ ...h.opts, seen: [] })); } catch (x) {} }, 50);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start(FAST ? { fast: true } : {});

// ---------- ván chơi ----------
let skew = 0, shownKey = '', toSent = '', lastTick = 0;
const P = (v, id) => v.players.find(p => p.id === id) || { name: '?' };
const nm = (v, id) => esc(cleanName(P(v, id).name));
const left = v => v.deadline ? (v.deadline - (Date.now() + skew)) / 1000 : null;
const rank = v => v.players.slice().sort((a, b) => b.score - a.score || b.wins - a.wins);
const TIER_NM = { de: 'Dễ', tb: 'Trung bình', kho: 'Khó' };

// ô chữ đã bấm (gõ tay vào ô nhập sẽ reset trạng thái ô chữ)
let seq = [], usedTiles = new Set();
function seqText() { return seq.map(s => (s.spaceBefore ? ' ' : '') + s.ch).join(''); }
function syncInput() { const inp = $('#vtv-in'); if (inp) inp.value = seqText(); }
function resetTiles() { seq = []; usedTiles = new Set(); }

function board(v) {
  const r = rank(v);
  return r.map((p, i) => `<div class="row${p.id === ui.myId ? ' me' : ''}${v.tried.includes(p.id) ? ' tried' : ''}" data-pid="${p.id}"><span class="rk">${i + 1}</span>${avatar(p.name, 26)}<span class="nm">${esc(cleanName(p.name))}</span>${p.streak >= 2 ? `<span class="fire" title="Chuỗi ${p.streak} vòng thắng">🔥${p.streak}</span>` : ''}${v.tried.includes(p.id) && v.phase === 'q' ? '<span title="Đã đoán sai, đang đoán lại">💭</span>' : ''}<b>${p.score}đ <small>· ${p.wins} vòng</small></b></div>`).join('');
}
function qCard(v) {
  const q = v.q;
  const hint = `<div class="hintrow">${q.hint.map(w => `<span class="hintword">${w.map(c => `<span class="hintcell${c ? ' open' : ''}">${c ? esc(c) : ''}</span>`).join('')}</span>`).join('')}</div>`;
  const tiles = `<div class="tiles">${q.tiles.map((w, wi) => `<span class="tileword">${w.map((c, ci) => `<button type="button" class="tile" data-w="${wi}" data-c="${ci}">${esc(c)}</button>`).join('')}</span>`).join('')}</div>`;
  return `<div class="qcard"><div class="qmeta"><span>Vòng ${v.i + 1}/${v.total}${q.kind === 'proverb' ? ' · 📜 Ca dao, tục ngữ' : ' · 🔤 Từ tiếng Việt'}</span><span class="tier ${q.tier}">${TIER_NM[q.tier]} · ${q.pts}đ</span></div>
    <div class="qt" style="font:800 clamp(17px,4.4vw,21px)/1.35 Nunito,sans-serif">Sắp xếp lại các chữ cái thành ${q.kind === 'proverb' ? 'câu ca dao, tục ngữ' : 'từ'} đúng!</div>
    ${hint}${tiles}
    <p class="qhint">${v.q.opened === 0 ? `⏱️ Hết ${v.roundT} giây mà chưa ai đoán đúng thì mở 1 ô chữ.` : `💡 Đã mở ${v.q.opened}/${q.total} ô · cứ ${v.revStep} giây mở thêm 1 ô.`} Gõ có dấu hay không dấu đều được.</p></div>`;
}
function ansForm(v) {
  if (v.spec) return `<div class="hint">👀 Bạn đang xem – ván sau sẽ được chơi.</div>`;
  const me = v.me || {};
  const wrong = me.lastWrong ? `<div class="res n">❌ “${esc(me.lastWrong)}” chưa đúng – đoán lại nhé! (đã thử ${me.tries} lần)</div>` : '';
  return `${wrong}<form class="ansform" id="vtv-form"><input id="vtv-in" maxlength="60" placeholder="Gõ đáp án của bạn…" autocomplete="off" enterkeyhint="go"><button class="btn ghost" type="button" id="vtv-bs" title="Xoá chữ cuối">⌫</button><button class="btn big pri" type="submit">Đoán</button></form><div class="hint">Ai đoán đúng TRƯỚC thì thắng vòng · đoán sai được đoán lại ngay!</div>`;
}
function myResult(v) {
  const w = v.win; if (!w) return `<div class="res info">⏰ Hết vòng – không ai đoán ra!</div>`;
  const winner = P(v, w.pid);
  if (w.pid === ui.myId) return `<div class="res y">🎉 Bạn đoán đúng trước! <b>+${w.pts}đ</b></div>`;
  return `<div class="res n">😢 <b>${nm(v, w.pid)}</b> đoán đúng trước, <b>+${w.pts}đ</b></div>`;
}
function ansBig(v) {
  const q = v.q; if (!q || !q.text) return '';
  return `<div class="ansbig"><small>Đáp án đúng là</small><b>“${esc(q.text)}”</b><small>${q.kind === 'proverb' ? '📜 Ca dao, tục ngữ' : '🔤 Từ tiếng Việt'} · ${TIER_NM[q.tier]} · ${q.pts}đ</small></div>`;
}
function ending(v) {
  const r = rank(v), pod = r.slice(0, 3), me = P(v, ui.myId), sum = (v.final && v.final.summary && v.final.summary[ui.myId]) || null;
  return `<div class="end"><h2>👑 ${v.draw ? 'Hòa nhau!' : 'Vua Tiếng Việt!'}</h2><div class="podium">${[1, 0, 2].map(i => pod[i] ? `<div class="pd p${i + 1}">${avatar(pod[i].name, i ? 44 : 58)}<b>${esc(cleanName(pod[i].name))}</b><span>${pod[i].score}đ · ${pod[i].wins} vòng</span><i>${['🥇', '🥈', '🥉'][i]}</i></div>` : '').join('')}</div>
    ${v.draw ? '<p class="mine">🤝 Hòa nhau ở ngôi vua – không ai thắng trận này!</p>' : ''}
    ${me && me.id && sum ? `<p class="mine">Bạn ghi <b>${sum.score}đ</b> · thắng <b>${sum.wins}/${v.total}</b> vòng · đúng <b>${sum.right}/${v.total}</b> vòng · chuỗi dài nhất <b>${sum.best}</b> · hạng <b>${r.findIndex(p => p.id === me.id) + 1}</b></p>` : ''}
    <p class="mine" style="font-size:13.5px;color:#ffffffb3">Điểm chỉ tính trong phòng này – không cộng vào XP hay bảng xếp hạng server.</p>
    <div class="lst">${r.map((p, i) => `<div class="row${p.id === ui.myId ? ' me' : ''}"><span class="rk">${i + 1}</span>${avatar(p.name, 26)}<span class="nm">${esc(cleanName(p.name))}</span><small>${p.wins}/${v.total} vòng thắng</small><b>${p.score}đ</b></div>`).join('')}</div></div>`;
}
function render(v, prev) {
  skew = (v.now || Date.now()) - Date.now();
  const me = v.players.find(p => p.id === ui.myId);
  $('#myscore').innerHTML = me ? `⭐ ${me.score}đ · 🏆 ${me.wins} vòng` : '';
  drawRound(v);
  let st = '', ac = '';
  if (v.phase === 'intro') st = `<div class="intro"><div class="big">👑</div><h2>Sẵn sàng làm vua chưa?</h2><p>7 vòng · 30 giây mỗi vòng · ai đoán đúng trước thì thắng vòng!</p><div class="cd" id="cd"></div></div>`;
  else if (v.phase === 'q' || v.phase === 'rev') {
    st = qCard(v);
    if (v.phase === 'q') ac = ansForm(v);
    else { st += myResult(v) + ansBig(v); ac = ui.isHost ? `<button class="btn pri" data-a="next">${v.i + 1 >= v.total ? '🏁 Xem kết quả' : 'Vòng tiếp ▶'}</button>` : ''; }
  } else if (v.phase === 'ended') {
    st = ending(v);
    ac = ui.isHost ? '<button class="btn big pri" data-a="again">🔁 Ván mới (từ mới)</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '<div class="hint">Chờ chủ phòng mở ván mới…</div>';
  }
  const key = `${v.gid}|${v.phase}|${v.i}|${v.q ? v.q.opened : ''}|${v.me ? `${v.me.tries}|${v.me.lastWrong}` : ''}|${v.players.map(p => p.score).join(',')}`;
  if (key !== shownKey) { $('#stage').innerHTML = st; $('#acts').innerHTML = ac; shownKey = key; resetTiles(); if (v.phase !== 'q') $('#stage').scrollTop = 0; const inp = $('#vtv-in'); if (inp) inp.focus(); }
  $('#board').innerHTML = v.phase === 'ended' ? '' : board(v);
  $('#hostbar').innerHTML = ui.isHost && v.phase !== 'ended' ? '<button class="chip" data-hh="end">🏁 Dừng ván</button>' : '';
  if (prev && prev.gid === v.gid) {
    if (v.phase === 'q' && (prev.phase !== 'q' || prev.i !== v.i)) beep('q');
    if (v.phase === 'rev' && prev.phase !== 'rev') { const w = v.win; beep(w && w.pid === ui.myId ? 'ok' : 'bad'); }
    if (v.phase === 'ended' && prev.phase !== 'ended') beep('win');
  }
}
function drawRound(v) {
  const t = left(v), s = t == null ? null : Math.max(0, Math.ceil(t));
  const ph = v.phase === 'intro' ? '👑 Chuẩn bị' : v.phase === 'ended' ? '🏁 Hết trận' : `🔤 Vòng ${v.i + 1}/${v.total}`;
  $('#round').innerHTML = `${ph}${s != null && v.phase !== 'ended' ? `<span class="tm${s <= 5 && v.phase === 'q' ? ' low' : ''}">${s}s</span>` : ''}`;
  const bar = $('#tbar i'), tot = v.t || E.ROUND_TIME;
  if (bar) { bar.style.width = t == null || v.phase === 'ended' ? '0%' : Math.max(0, Math.min(100, 100 * t / tot)) + '%'; bar.className = v.phase === 'q' ? (t <= 5 ? 'low' : '') : 'soft'; }
  const cd = $('#cd'); if (cd && v.phase === 'intro') cd.textContent = s > 0 ? s : 'Bắt đầu!';
}
setInterval(() => {
  const v = ui.view; if (!v || !ui.net || v.phase === 'ended' || !v.deadline) return; drawRound(v);
  const t = left(v), s = Math.ceil(t);
  if (v.phase === 'q' && s <= 3 && s > 0 && s !== lastTick) { lastTick = s; beep('tick'); }
  if (t <= -0.6 && toSent !== v.gid + ':' + v.seq) { toSent = v.gid + ':' + v.seq; ui.act({ type: 'timeout' }); }
}, 200);

$('#acts').addEventListener('submit', e => { // form đáp án nằm trong #acts (render() gán ac = ansForm(v) vào #acts)
  if (e.target.id !== 'vtv-form') return; e.preventDefault();
  const v = ui.view, inp = $('#vtv-in'); if (!v || !inp || v.phase !== 'q') return;
  const text = inp.value.trim(); if (!text) { tip('Gõ đáp án đã nha.'); return; }
  beep('pick'); ui.act({ type: 'ans', text });
  inp.disabled = true;
});
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'), v = ui.view;
  if (b && v && !b.disabled) {
    const a = b.dataset.a;
    if (a === 'next') ui.act({ type: 'next' });
    else if (a === 'again') ui.net.raw.start(FAST ? { fast: true } : {});
    else if (a === 'lobby') ui.net.raw.restart();
    return;
  }
  const bs = e.target.closest('#vtv-bs');
  if (bs) { const last = seq.pop(); if (last) usedTiles.delete(last.key); syncInput(); return; }
});
// Ô chữ nằm trong #stage (qCard render vào st), KHÔNG phải #acts —
// handler bấm ô phải gắn ở #stage, gắn ở #acts thì click không bao giờ tới.
$('#stage').addEventListener('click', e => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  const key = tile.dataset.w + ':' + tile.dataset.c, ch = tile.textContent;
  const idx = seq.findIndex(s => s.key === key);
  if (idx >= 0) { seq.splice(idx, 1); usedTiles.delete(key); tile.classList.remove('used'); }
  else {
    const wi = +tile.dataset.w;
    const spaceBefore = seq.length > 0 && wi > seq[seq.length - 1].wi;
    seq.push({ key, ch, wi, spaceBefore }); usedTiles.add(key); tile.classList.add('used');
  }
  syncInput();
});
$('#acts').addEventListener('input', e => { // gõ tay thì reset trạng thái ô chữ đã bấm
  if (e.target.id === 'vtv-in') resetTiles();
});
$('#hostbar').addEventListener('click', async e => {
  const b = e.target.closest('[data-hh]'); if (!b || !ui.isHost) return;
  if (await confirmBox('Dừng trận này và xem bảng điểm luôn nhé?', { title: '🏁 Dừng trận?', ok: 'Dừng', cancel: 'Chơi tiếp' })) ui.act({ type: 'end' });
});
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Vua Tiếng Việt</h2>
    <p>Mỗi trận có <b>7 vòng</b>. Mỗi vòng, một <b>từ tiếng Việt</b> hoặc một <b>câu ca dao, tục ngữ</b> bị xáo hết vị trí các chữ cái (cụm từ thì xáo trong từng từ, giữ khoảng trắng). Bạn <b>sắp xếp lại và đoán</b> – ai đoán đúng <b>TRƯỚC</b> thì thắng vòng và được cộng điểm.</p>
    <h3>Tính điểm – càng khó càng nhiều điểm</h3><ul><li><b>Dễ (≤ 5 chữ cái): 10đ</b>.</li><li><b>Trung bình (6–8 chữ cái): 20đ</b>.</li><li><b>Khó (≥ 9 chữ cái, hoặc ca dao, tục ngữ): 30đ</b>.</li></ul>
    <p>Điểm này <b>chỉ tính trong phòng</b> – không cộng vào XP hay bảng xếp hạng server, nên không thể vào đây cày điểm.</p>
    <h3>Đồng hồ + mở ô</h3><ul><li>Mỗi vòng có <b>30 giây</b>. Hết 30 giây mà chưa ai đoán đúng thì <b>mở 1 ô chữ</b> lên (chữ đúng vị trí gốc).</li><li>Sau đó cứ <b>10 giây mở thêm 1 ô</b>. Mở hết các ô mà vẫn chưa ai đúng thì vòng kết thúc không ai được điểm.</li><li>Đoán <b>sai được đoán lại ngay</b> – không bị khóa.</li></ul>
    <h3>Cách đoán</h3><ul><li>Gõ đáp án bằng <b>bàn phím</b> (gõ <b>có dấu hay không dấu đều được</b>) rồi bấm <b>Đoán</b>, hoặc <b>bấm các ô chữ</b> để xếp đáp án.</li><li>Trên điện thoại bấm ô chữ là tiện nhất; nút ⌫ xoá chữ cuối.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('vtv-sound', sound ? '1' : '0'); drawSound(); beep('pick'); };

const ui = gameKit({
  game: 'vuatiengviet', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { shownKey = ''; if (!ui.net) optsLoaded = false; } },
  offline: h => { for (let i = 0; i < 3; i++) h.addBot(); },
});
