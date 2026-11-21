// 🃏 Bài Tấn – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { flipRender } from '../../shared/lib/gsap/flip.js?v=1';
import { makeNet } from '../../shared/net/simplenet.js?v=51';
import * as E from './engine.js?v=2';
import { botAction } from './bot.js?v=2';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=13';
import { cardHTML, backHTML } from '../../shared/ui/deck/deck.js?v=1';

const NET = makeNet({
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'baitan', min: 2, max: 6, minMsg: 'Cần ít nhất 2 người: mời bạn vào phòng hoặc thêm bot.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: botAction, botDelay: s => (s.table.some(t => t.d == null) ? 800 : 1100) + Math.random() * 600,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Đậu', 'Nấm', 'Sữa'],
});
const card = (c, cls = '', attrs = '', tag = 'div') => cardHTML(E.rank(c) + 2, E.SUITS[E.suit(c)], { cls, attrs, tag });
const SUIT_HTML = s => `<span class="${s >= 2 ? 'red' : ''}">${E.SUIT_CH[s]}</span>`;
let sound = ls.get('tan-sound') !== '0';
$('#hero').innerHTML = [[50, -14], [43, -5], [28, 5], [51, 14]].map(([c, r], i) => card(c, '', `style="--rot:${r}deg;--up:${Math.abs(r) / 2}"`)).join('');

// ---------- âm thanh nhỏ ----------
let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { turn: [[660, 0, .09], [880, .09, .13]], play: [[420, 0, .05], [300, .04, .07]], beat: [[520, 0, .07], [780, .07, .12]], take: [[330, 0, .12], [247, .1, .2]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.12, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}

// ---------- phòng chờ ----------
let optsLoaded = false;
function renderLobby(info, ui) {
  const host = ui.isHost && ui.net ? ui.net.raw : null, o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  if (host && !optsLoaded) { optsLoaded = true; let saved = null; try { saved = JSON.parse(ls.get('tan-opts') || 'null'); } catch (e) {} /* nhớ luật bàn lần trước */
    if (saved) { let ch = false; for (const k of ['hand', 'adders', 'team']) if (k in saved && E.optOk(k, saved[k]) && host.opts[k] !== saved[k]) { host.opts[k] = saved[k]; ch = true; } if (ch) { host.pushLobby(); return; } } }
  $('#pcount').textContent = `${n}/${info.max} người`;
  $('#plist').innerHTML = info.players.map((p, i) => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· bot</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}${o.team && n === 4 ? ` <small>· đội ${i % 2 ? '🔵' : '🟠'}</small>` : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < info.max ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm bot</button></div>` : '';
  const seg = (key, items) => `<div class="seg">${items.map(([v, nm]) => `<button type="button" data-opt="${key}" data-v="${v}" aria-pressed="${String(o[key]) === String(v)}" ${dis}>${nm}</button>`).join('')}</div>`;
  $('#opts').innerHTML = `
    <div class="opt"><b>🖐️ Số lá mỗi người</b>${seg('hand', [[8, '8 lá'], [6, '6 lá']])}<small>Đánh xong lượt nào thì bốc bù cho đủ số lá, tới khi hết nọc.${n * 8 > 48 ? ' Bàn 6 người tự chia 6 lá.' : ''}</small></div>
    <div class="opt"><b>⚔️ Ai được tấn thêm</b>${seg('adders', [['all', 'Cả bàn'], ['side', 'Hai người ngồi cạnh']])}<small>Sau lá tấn đầu, những người này được "ném" thêm lá cùng số.</small></div>
    <div class="opt"><b>🤝 Kiểu chơi</b>${seg('team', [[false, 'Cá nhân'], [true, 'Chéo cánh (2 đấu 2)']])}<small>${o.team ? (n === 4 ? 'Người ngồi đối diện là đồng đội. Đội nào hết bài cả hai trước thì thắng.' : '⚠️ Chéo cánh cần đúng 4 người – hiện sẽ chơi cá nhân.') : 'Ai còn bài sau cùng là người thua.'}</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
  else if (b.dataset.opt) { const v = b.dataset.v, val = b.dataset.opt === 'hand' ? +v : b.dataset.opt === 'team' ? v === 'true' : v; h.setOpt(b.dataset.opt, val); ls.set('tan-opts', JSON.stringify(h.opts)); }
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let sel = [], target = -1, endShown = null, lastKey = '', shownCards = new Set();
const meId = () => ui.myId;
/* dựng lại "state" tối thiểu từ view để dùng chung hàm kiểm tra luật của engine (chỉ cần số lá của người khác) */
const pseudo = v => ({ ...v, hands: Object.fromEntries(v.players.map(p => [p.id, p.id === meId() ? v.hand : Array(p.n).fill(-1)])) });
const nameOf = (v, id) => { const p = v.players.find(p => p.id === id); return p ? esc(cleanName(p.name)) : '?'; };
function render(v, prev) {
  const me = meId(), s = pseudo(v), iDef = v.def === me && !v.spec, canAtt = !v.spec && v.phase === 'play' && E.canAdd(s, me);
  const open = v.table.map((t, i) => t.d == null ? i : -1).filter(i => i >= 0), ranks = new Set(v.table.flatMap(t => t.d != null ? [E.rank(t.a), E.rank(t.d)] : [E.rank(t.a)]));
  const key = `${v.gid}|${v.bout}|${v.table.length}`; if (key !== lastKey) { sel = []; lastKey = key; }
  sel = sel.filter(c => v.hand.includes(c)); if (!open.includes(target)) target = open.length ? open[0] : -1;
  // thanh trên
  $('#round').innerHTML = v.phase === 'ended' ? '🏁 Hết ván' : `🂠 Nọc ${v.deckN} · Chủ ${SUIT_HTML(v.trump)}${v.opts.team ? ' · 🤝 Chéo cánh' : ''}`;
  // ghế
  $('#seats').innerHTML = v.players.map(p => {
    const outI = v.out.indexOf(p.id), cls = [p.id === me && 'me', p.id === v.att && 'att', p.id === v.def && 'def', outI >= 0 && 'out', v.loser === p.id && 'lose', (v.away || []).includes(p.id) && 'away', v.passed.includes(p.id) && p.id !== v.att && p.id !== v.def && 'done'].filter(Boolean).join(' ');
    const role = v.loser === p.id ? '😵 Thua' : outI >= 0 ? (outI === 0 ? '🥇 Về nhất' : `✅ Hạng ${outI + 1}`) : p.id === v.def ? '🛡️ Đỡ' : p.id === v.att ? '⚔️ Tấn' : v.passed.includes(p.id) ? 'Cho qua' : '';
    return `<div class="seat ${cls}" data-pid="${p.id}">${role ? `<span class="role">${role}</span>` : ''}${p.team != null ? `<i class="tm t${p.team}"></i>` : ''}${avatar(p.name, 34)}<b>${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</b><small>🂠 ${p.n} lá</small></div>`;
  }).join('');
  // nọc + lá chủ
  $('#pile').innerHTML = v.deckN > 0 ? `${card(v.trumpCard, 'trump')}${v.deckN > 1 ? backHTML() : ''}<span class="cnt">${v.deckN}</span>` : `<span class="ts ${v.trump >= 2 ? 'red' : ''}" title="Chất chủ">${E.SUIT_CH[v.trump]}</span>`;
  // bàn
  const seen = shownCards; shownCards = new Set(v.table.flatMap(t => t.d != null ? [t.a, t.d] : [t.a])); const nw = c => seen.has(c) ? '' : ' new'; /* chỉ lá vừa đặt xuống mới có hiệu ứng */
  $('#tbl').innerHTML = v.table.length ? v.table.map((t, i) => `<div class="pair${t.d == null ? ' open' : ''}${iDef && i === target ? ' tg' : ''}" data-i="${i}">${card(t.a, nw(t.a))}${t.d != null ? card(t.d, 'd' + nw(t.d)) : ''}</div>`).join('')
    : `<div class="empty">${v.phase === 'ended' ? '' : v.last ? (v.last.res === 'take' ? `😵 ${nameOf(v, v.last.def)} bốc ${v.last.n} lá` : `🛡️ ${nameOf(v, v.last.def)} đỡ hết – bỏ ${v.last.n} lá`) + '<br>' : ''}${v.phase === 'play' ? `Chờ ${v.att === me ? 'bạn' : nameOf(v, v.att)} ra bài…` : ''}</div>`;
  // lời nhắc + nút
  let msg = '', acts = '';
  if (v.phase === 'play' && !v.spec) {
    if (iDef) {
      msg = open.length ? `🛡️ Bạn đang <b>đỡ</b>: chạm lá cùng chất lớn hơn, hoặc lá chủ ${SUIT_HTML(v.trump)}` : (v.table.length ? '🛡️ Đỡ xong – chờ mọi người xem có tấn thêm không…' : `Chờ ${nameOf(v, v.att)} tấn bạn…`);
      if (open.length) acts = `<button class="btn" data-a="take">😵 Bốc hết (${v.table.reduce((n, t) => n + 1 + (t.d != null), 0)} lá)</button>`;
    } else if (canAtt) {
      const first = !v.table.length;
      msg = first ? `⚔️ Tới lượt bạn <b>tấn ${nameOf(v, v.def)}</b>: chọn 1 lá (hoặc nhiều lá cùng số)` : (v.room > 0 ? `⚔️ Tấn thêm ${nameOf(v, v.def)} bằng lá <b>cùng số</b> với lá trên bàn, hoặc cho qua` : 'Hết chỗ tấn thêm rồi.');
      acts = `<button class="btn pri" data-a="attack" ${sel.length ? '' : 'disabled'}>⚔️ ${first ? 'Tấn' : 'Tấn thêm'}${sel.length ? ` (${sel.length})` : ''}</button>${first ? '' : `<button class="btn" data-a="pass" ${v.passed.includes(me) ? 'disabled' : ''}>${v.passed.includes(me) ? '✋ Đã cho qua' : '✋ Cho qua'}</button>`}`;
    } else msg = v.out.includes(me) ? '🎉 Bạn đã hết bài – ngồi xem thôi!' : `<small>${nameOf(v, v.att)} đang tấn ${nameOf(v, v.def)}…</small>`;
  } else if (v.spec) msg = '<small>👀 Bạn đang xem – ván sau sẽ được chơi.</small>';
  if (v.phase === 'ended') acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '<button class="btn" data-a="sum">🏅 Kết quả</button>';
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  // bài trên tay
  const hand = $('#hand'), n = v.hand.length;
  if (v.spec || !n) { hand.className = 'hand spec'; hand.innerHTML = v.spec ? '' : (v.phase === 'play' ? '🎉 Sạch tay!' : ''); }
  else {
    hand.className = 'hand';
    const w = hand.clientWidth || innerWidth, cw = parseFloat(getComputedStyle(hand).getPropertyValue('--cw')) || 70; /* nhiều lá thì xếp chồng khít hơn cho vừa màn hình */
    const ov = n > 1 ? Math.max(-.72, Math.min(-.25, ((w - 20 - cw) / (n - 1) - cw) / cw)) : 0;
    const tgt = target >= 0 ? v.table[target] : null;
    flipRender(hand, '[data-c]', 'data-c', () => { hand.innerHTML = v.hand.map(c => {
      let ok = false;
      if (iDef) ok = !!tgt && E.beats(c, tgt.a, v.trump);
      else if (canAtt && v.room > 0) ok = v.table.length ? ranks.has(E.rank(c)) : (!sel.length || E.rank(c) === E.rank(sel[0]));
      const act = iDef ? open.length > 0 : canAtt;
      return card(c, `${sel.includes(c) ? 'sel' : ''} ${act ? (ok ? 'ok' : 'dim') : ''} ${E.suit(c) === v.trump ? 'tr' : ''}`, `data-c="${c}" style="--ov:${ov.toFixed(3)}"`, 'button');
    }).join(''); });
  }
  // âm thanh + kết thúc
  if (prev && prev.gid === v.gid) {
    const myTurnNow = (iDef && open.length) || (canAtt && !v.table.length), pm = pseudo(prev), wasTurn = (prev.def === me && prev.table.some(t => t.d == null)) || (E.canAdd(pm, me) && !prev.table.length);
    if (v.bout !== prev.bout && v.last) beep(v.last.res === 'take' ? 'take' : 'beat'); else if (v.table.length > prev.table.length || v.table.filter(t => t.d != null).length > prev.table.filter(t => t.d != null).length) beep('play');
    if (myTurnNow && !wasTurn) beep('turn');
  }
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); setTimeout(() => ui.view === v && showSummary(v), 700); } } else endShown = null;
}
$('#hand').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'), v = ui.view; if (!b || !v || v.spec || v.phase !== 'play') return; const c = +b.dataset.c, me = meId();
  if (v.def === me) {
    if (target < 0) return; const t = v.table[target];
    if (!E.beats(c, t.a, v.trump)) { ui.toast(`Lá này không đỡ được ${E.cardTxt(t.a)} – cần cùng chất lớn hơn hoặc lá chủ.`); return; }
    ui.act({ type: 'defend', i: target, card: c }); return;
  }
  if (!E.canAdd(pseudo(v), me)) return;
  if (sel.includes(c)) sel = sel.filter(x => x !== c);
  else {
    if (v.table.length) { const ranks = new Set(v.table.flatMap(t => t.d != null ? [E.rank(t.a), E.rank(t.d)] : [E.rank(t.a)])); if (!ranks.has(E.rank(c))) { ui.toast('Chỉ tấn thêm được lá cùng số với lá trên bàn.'); return; } }
    else if (sel.length && E.rank(sel[0]) !== E.rank(c)) sel = []; /* chọn số khác → bỏ chọn cũ */
    if (sel.length >= v.room) { ui.toast(v.room > 0 ? `Chỉ tấn được tối đa ${v.room} lá lúc này.` : 'Hết chỗ tấn thêm rồi.'); return; }
    sel.push(c);
  }
  render(v, null);
});
$('#tbl').addEventListener('click', e => { const p = e.target.closest('.pair.open'), v = ui.view; if (!p || !v || v.def !== meId()) return; target = +p.dataset.i; render(v, null); });
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'attack') { if (sel.length) { ui.act({ type: 'attack', cards: sel.slice() }); sel = []; } }
  else if (a === 'pass' || a === 'take') ui.act({ type: a });
  else if (a === 'again' && ui.isHost) ui.net.raw.start();
  else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
  else if (a === 'sum') showSummary(v);
});
function showSummary(v) {
  const me = meId(), rows = [...v.out.map(id => v.players.find(p => p.id === id)), ...v.players.filter(p => !v.out.includes(p.id))];
  let head;
  if (v.opts.team) { const mine = (v.players.find(p => p.id === me) || {}).team; head = v.winTeam == null ? '🤝 Hoà!' : mine == null ? `🏆 Đội ${v.winTeam ? '🔵' : '🟠'} thắng!` : v.winTeam === mine ? '🏆 Đội bạn thắng!' : '😵 Đội bạn thua rồi…'; }
  else head = !v.loser ? '🤝 Hoà – không ai ôm bài!' : v.loser === me ? '😵 Bạn ôm bài rồi…' : v.winner === me ? '🥇 Bạn về nhất!' : `😵 ${nameOf(v, v.loser)} ôm bài!`;
  ui.openModal(`<h2>${head}</h2><ul class="sum">${rows.map(p => { const i = v.out.indexOf(p.id), left = (v.reveal && v.reveal[p.id]) || []; return `<li class="${i < 0 ? 'lose' : ''}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.team != null ? ` ${p.team ? '🔵' : '🟠'}` : ''}<small>${i < 0 ? `còn ${left.length} lá: ${left.map(E.cardTxt).join(' ')}` : i === 0 ? 'hết bài đầu tiên' : 'đã hết bài'}</small></span><span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i < 0 ? '😵' : '✅'}</span></li>`; }).join('')}</ul>
    <div class="btns">${ui.isHost ? '<button class="btn pri" id="m-again">🔁 Ván nữa</button>' : ''}<button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal; if ($('#m-again')) $('#m-again').onclick = () => { ui.closeModal(); ui.net.raw.start(); };
}
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Bài Tấn</h2>
    <p><b>Mục tiêu:</b> đánh hết bài trên tay. Khi nọc đã hết, ai còn ôm bài sau cùng là <b>người thua</b>.</p>
    <h3>Lá chủ</h3><ul><li>Lá lật dưới đáy nọc cho biết <b>chất chủ</b>. Lá chủ thắng mọi lá chất khác.</li><li>Thứ tự lớn dần: 2, 3 … 10, J, Q, K, A.</li></ul>
    <h3>Tấn và đỡ</h3><ul><li>Người <b>⚔️ tấn</b> đánh 1 lá (hoặc nhiều lá cùng số) vào người kế bên.</li><li>Người <b>🛡️ đỡ</b> phải đè từng lá bằng lá <b>cùng chất lớn hơn</b> hoặc một <b>lá chủ</b>.</li><li>Mọi người được <b>tấn thêm</b> lá cùng số với bất kỳ lá nào đang nằm trên bàn (tối đa 6 lá, không quá số bài người đỡ đang cầm).</li></ul>
    <h3>Hết lượt</h3><ul><li><b>Đỡ được hết:</b> bài trên bàn bỏ đi, người đỡ được quyền tấn tiếp.</li><li><b>Không đỡ nổi:</b> bấm <b>Bốc hết</b>, ôm toàn bộ bài trên bàn và mất lượt tấn.</li><li>Sau mỗi lượt, mọi người bốc bù cho đủ bài tới khi hết nọc.</li></ul>
    <h3>Chéo cánh</h3><ul><li>4 người, ngồi đối diện là đồng đội, không tấn đồng đội. Đội nào cả hai hết bài trước thì thắng.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('tan-sound', sound ? '1' : '0'); drawSound(); beep('turn'); };
addEventListener('resize', () => { clearTimeout(render.t); render.t = setTimeout(() => ui.view && render(ui.view, null), 150); });

const ui = gameKit({
  game: 'baitan', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { sel = []; target = -1; endShown = null; lastKey = ''; if (!ui.net) optsLoaded = false; } },
  offline: h => { h.addBot(); h.addBot(); },
});
