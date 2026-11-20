// 🎲 Bầu cua tôm cá – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=49';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=11';
import { createDiceView } from '../../shared/js/dice3d-gl.js?v=4';

const NET = makeNet(DEF);
/* quả bầu tự vẽ (không có emoji bầu hồ lô) */
const BAU = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6c-2 0-3 2-3 4v5c-6 2-9 7-9 12 0 4 2 7 4 9-6 3-10 8-10 14 0 8 8 12 18 12s18-4 18-12c0-6-4-11-10-14 2-2 4-5 4-9 0-5-3-10-9-12v-5c0-2-1-4-3-4z" fill="#7cc04b" stroke="#2a2340" stroke-width="3" stroke-linejoin="round"/><path d="M26 44c-2 3-1 7 2 9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/><path d="M29 8c4-4 9-3 11 0" fill="none" stroke="#2a2340" stroke-width="3" stroke-linecap="round"/></svg>';
const PIC = { nai: '🦌', bau: BAU, ga: '🐓', ca: '🐟', cua: '🦀', tom: '🦐' }, COL = { nai: '#f6d7a8', bau: '#d9f0c2', ga: '#ffd1c7', ca: '#c9e6fb', cua: '#ffc9a3', tom: '#ffe3ee' };
const CHIP_COL = { 5: '#12a66a', 10: '#3d8bff', 20: '#c0271d', 50: '#2a2340' }, PCOL = ['#e0432f', '#3d8bff', '#12a66a', '#f59e0b', '#8b5cf6', '#0ea5a4', '#d6336c', '#7a5c3e'];
const die = k => `<div class="die">${PIC[k]}</div>`;
// ---------- xúc xắc 3D (model GLB mặt con vật) trong chén ----------
// 3 con: mặt con vật SYMS[i] ↔ số i+1 (nai=1, bầu=2, gà=3, cá=4, cua=5, tôm=6).
// Model riêng shared/models/dice-animals.glb vẽ mặt con vật thật (không phải chấm số).
// Dưới xúc xắc vẫn ghi tên con vật để đọc kết quả. Hỏng WebGL/GLB thì về 2D như cũ.
let _glBowl = null, _glBowlFailed = false, _glBowlLast = '';
$('#bowl').innerHTML = `<div class="gl-wrap" hidden><div class="gl-holder"></div><div class="gl-labels"></div></div><div class="dice2d" hidden></div><div class="cup-wrap"><span class="cup">🥣</span><span>Đặt xu vào ô bạn chọn<br><small style="opacity:.85">Đủ người chốt là lắc</small></span></div>`;
(async () => {
  const holder = document.querySelector('#bowl .gl-holder');
  if (!holder) return;
  const view = await createDiceView(holder, { count: 3, diePx: 88, gapPx: 8, muted: () => !sound, model: 'animals', spin: true });
  if (view) _glBowl = { view }; else _glBowlFailed = true;
})();
function showBowlDice(bowl, dice) {
  const glWrap = bowl.querySelector('.gl-wrap'), d2 = bowl.querySelector('.dice2d'), cup = bowl.querySelector('.cup-wrap');
  if (!dice) { glWrap.hidden = true; d2.hidden = true; cup.hidden = false; _glBowlLast = ''; return; }
  cup.hidden = true;
  const vals = dice.map(s => E.SYMS.indexOf(s) + 1);
  if (_glBowl) {
    glWrap.hidden = false; d2.hidden = true;
    if (vals.join() !== _glBowlLast) { _glBowlLast = vals.join(); _glBowl.view.rollTo(vals, { duration: 1100 }); }
    glWrap.querySelector('.gl-labels').innerHTML = dice.map(s => `${PIC[s]} ${E.SYM_VN[s]}`).join(' · ');
  } else {
    glWrap.hidden = true; d2.hidden = false;
    d2.innerHTML = dice.map(die).join('');
  }
}
let sound = ls.get('baucua-sound') !== '0', chip = +ls.get('baucua-chip') || 10;
$('#hero').innerHTML = ['bau', 'cua', 'tom'].map(die).join('');

let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { bet: [[520, 0, .05]], win: [[523, 0, .1], [659, .1, .1], [784, .2, .18]], lose: [[330, 0, .12], [247, .12, .2]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.12, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  $('#pcount').textContent = `${n}/${info.max} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· bot</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < info.max ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm bot</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>🎲 Số ván lắc</b><div class="seg">${E.CHOICES.rounds.map(v => `<button type="button" data-opt="rounds" data-v="${v}" aria-pressed="${o.rounds === v}" ${dis}>${v} ván</button>`).join('')}</div><small>Mỗi người có ${E.START} xu ảo. Đặt vào con nào, xúc xắc ra con đó thì ăn 1 lần cho mỗi mặt ra; không ra thì mất xu đặt. Hết số ván ai nhiều xu nhất thắng.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 1;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt('rounds', +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let endShown = null, autoT = null;
const nameOf = (v, id) => { const p = v.players.find(p => p.id === id); return p ? esc(cleanName(p.name)) : '?'; };
function render(v, prev) {
  const me = ui.myId, mine = !v.spec && me in v.cash, ended = v.phase === 'ended', bet = v.stage === 'bet', res = v.stage === 'result' || ended, myBets = mine ? v.bets[me] : {}, left = mine ? v.cash[me] - (bet ? E.betSum(myBets) : 0) : 0;
  const col = id => PCOL[v.players.findIndex(p => p.id === id) % PCOL.length];
  $('#round').textContent = ended ? '🏁 Hết ván' : `🎲 Ván ${v.round}/${v.opts.rounds} · ${bet ? 'đặt cược' : 'kết quả'}`;
  $('#seats').innerHTML = v.players.map(p => { const g = res && v.gain ? v.gain[p.id] : null; return `<div class="seat${v.ready[p.id] && bet ? ' ok' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" data-pid="${p.id}" style="--pc:${col(p.id)}">${avatar(p.name, 28)}<span><b>${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</b><small>💰 ${v.cash[p.id]} xu${g != null && g !== 0 ? ` <span class="g ${g > 0 ? 'pos' : 'neg'}">${g > 0 ? '+' : ''}${g}</span>` : bet ? (v.ready[p.id] ? ' · ✅ chốt' : ` · đặt ${E.betSum(v.bets[p.id])}`) : ''}</small></span></div>`; }).join('');
  const bowl = $('#bowl'); bowl.classList.toggle('shake', bet);
  showBowlDice(bowl, res && v.dice ? v.dice : null);
  $('#board').innerHTML = E.SYMS.map(k => { const n = res && v.dice ? v.dice.filter(d => d === k).length : 0, who = v.players.filter(p => v.bets[p.id][k]);
    return `<button type="button" class="cell${res ? (n ? ' hit' : ' miss') : ''}" data-sym="${k}" style="--cc:${COL[k]}" ${bet && mine && !v.ready[me] ? '' : 'disabled'}>${n ? `<span class="x">×${n}</span>` : ''}${myBets[k] ? `<span class="mine">${myBets[k]}</span>` : ''}<span class="pic">${PIC[k]}</span>${E.SYM_VN[k]}<span class="who">${who.filter(p => p.id !== me).map(p => `<i style="--pc:${col(p.id)}">${esc(cleanName(p.name).slice(0, 1))} ${v.bets[p.id][k]}</i>`).join('')}</span></button>`; }).join('');
  $('#chips').innerHTML = bet && mine && !v.ready[me] ? E.CHIPS.map(c => `<button type="button" class="chip-c" data-chip="${c}" style="--k:${CHIP_COL[c]}" aria-pressed="${c === chip}" ${c > left ? 'disabled' : ''}>${c}</button>`).join('') : '';
  let msg = '', acts = '';
  if (ended) acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Chơi lại</button><button class="btn" data-a="lobby">Về phòng chờ</button><button class="btn" data-a="sum">🏅 Kết quả</button>' : '<button class="btn" data-a="sum">🏅 Kết quả</button>';
  else if (!mine) msg = '<small>👀 Bạn đang xem – ván sau sẽ được chơi.</small>';
  else if (bet) {
    msg = v.ready[me] ? '<small>Đã chốt – chờ mọi người…</small>' : `Chọn mệnh giá rồi chạm vào con bạn muốn đặt · còn <b>${left}</b> xu${(v.relief || []).includes(me) ? ' <small>(vừa được cứu trợ ' + E.RELIEF + ' xu)</small>' : ''}`;
    acts = v.ready[me] ? '<button class="btn" data-a="unready">↩️ Đặt lại</button>' : `<button class="btn" data-a="clear" ${E.betSum(myBets) ? '' : 'disabled'}>🧹 Xoá cược</button><button class="btn pri" data-a="ready">✅ Chốt${E.betSum(myBets) ? ' ' + E.betSum(myBets) + ' xu' : ' (không đặt)'}</button>`;
    if (ui.isHost) acts += '<button class="btn" data-a="force" title="Lắc ngay dù còn người chưa chốt">🎲 Lắc luôn</button>';
  } else {
    const g = v.gain[me]; msg = g > 0 ? `🎉 Bạn ăn <b>+${g}</b> xu!` : g < 0 ? `😵 Bạn mất <b>${-g}</b> xu` : 'Ván này bạn huề.';
    acts = ui.isHost ? `<button class="btn pri" data-a="next">${v.round >= v.opts.rounds ? '🏁 Xem kết quả' : '▶ Ván kế'}</button>` : v.ready[me] ? '' : '<button class="btn pri" data-a="ok">▶ Ván kế</button>';
  }
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  clearTimeout(autoT); if (ui.isHost && v.stage === 'result') autoT = setTimeout(() => ui.view === v && ui.act({ type: 'next' }), 7000); /* chủ phòng tự sang ván kế sau 7 giây */
  if (prev && prev.gid === v.gid) {
    if (prev.stage === 'bet' && v.stage === 'result') { /* tiếng lắc xúc xắc giờ do khung 3D kêu trong rollTo() */ if (mine) setTimeout(() => beep(v.gain[me] > 0 ? 'win' : v.gain[me] < 0 ? 'lose' : ''), 500); }
    else if (v.seq !== prev.seq && bet) beep('bet');
  }
  if (ended) { if (endShown !== v.gid) { endShown = v.gid; beep('end'); setTimeout(() => ui.view === v && showSummary(v), 700); } } else endShown = null;
}
$('#chips').addEventListener('click', e => { const b = e.target.closest('[data-chip]'); if (!b || b.disabled) return; chip = +b.dataset.chip; ls.set('baucua-chip', String(chip)); ui.view && render(ui.view, null); });
$('#board').addEventListener('click', e => {
  const b = e.target.closest('[data-sym]'), v = ui.view; if (!b || b.disabled || !v) return; const me = ui.myId, left = v.cash[me] - E.betSum(v.bets[me]);
  const c = chip <= left ? chip : [...E.CHIPS].reverse().find(x => x <= left); if (!c) { ui.toast('Hết xu để đặt rồi.'); return; }
  ui.act({ type: 'bet', sym: b.dataset.sym, amt: c });
});
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'ready') ui.act({ type: 'ready', on: true }); else if (a === 'unready') ui.act({ type: 'ready', on: false }); else if (a === 'clear') ui.act({ type: 'clear' });
  else if (a === 'force' || a === 'next') ui.act({ type: a }); else if (a === 'ok') ui.act({ type: 'ready' });
  else if (a === 'again' && ui.isHost) ui.net.raw.start(); else if (a === 'lobby' && ui.isHost) ui.net.raw.restart(); else if (a === 'sum') showSummary(v);
});
function showSummary(v) {
  const me = ui.myId, r = v.result, w = r.order[0];
  ui.openModal(`<h2>${w === me ? '🏆 Bạn hốt nhiều xu nhất!' : `🏆 ${nameOf(v, w)} hốt nhiều xu nhất!`}</h2><ul class="sum">${r.order.map((id, i) => { const p = v.players.find(p => p.id === id); return `<li class="${i === 0 ? 'win' : ''}">${avatar(p.name)}<span class="nm">${i + 1}. ${esc(cleanName(p.name))}</span><span>💰 ${r.cash[id]} xu</span></li>`; }).join('')}</ul>
    <p style="text-align:center;color:var(--muted);font-size:13px;margin:8px 0 0">Xu chỉ để tính vui trong ván, không phải tiền thật.</p>
    <div class="btns">${ui.isHost ? '<button class="btn pri" id="m-again">🔁 Chơi lại</button>' : ''}<button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal; if ($('#m-again')) $('#m-again').onclick = () => { ui.closeModal(); ui.net.raw.start(); };
}
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Bầu cua tôm cá</h2>
    <p><b>Mục tiêu:</b> sau số ván đã chọn, ai có nhiều xu nhất thì thắng. Mỗi người bắt đầu với ${E.START} xu ảo.</p>
    <h3>Mỗi ván</h3><ul><li>Chọn mệnh giá (5, 10, 20, 50) rồi chạm vào con bạn muốn đặt: <b>Nai, Bầu, Gà, Cá, Cua, Tôm</b>. Đặt nhiều con cũng được.</li><li>Bấm <b>Chốt</b>. Cả bàn chốt xong thì lắc 3 xúc xắc (chủ phòng có nút Lắc luôn).</li><li>Con bạn đặt ra <b>1 mặt</b>: ăn 1 lần xu đặt. Ra <b>2 mặt</b>: ăn gấp đôi. <b>3 mặt</b>: ăn gấp ba. Không ra: mất xu đã đặt vào con đó.</li><li>Cháy túi thì đầu ván sau được phát ${E.RELIEF} xu cứu trợ để chơi tiếp.</li></ul>
    <p style="color:var(--muted);font-size:13.5px">Chỉ là xu ảo để vui ngày Tết – không nạp, không rút, không tiền thật.</p>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('baucua-sound', sound ? '1' : '0'); drawSound(); beep('bet'); };

const ui = gameKit({
  game: 'baucua', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { endShown = null; clearTimeout(autoT); } },
  offline: h => { h.addBot(); h.addBot(); h.addBot(); },
});
