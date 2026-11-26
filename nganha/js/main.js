// 🌌 Săn Thú Ngân Hà – giao diện. Luật ở engine.js, máy ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=1';
import { EL, EL_KEYS, MONS, BEASTS, BEAST_NEED, BEAST_PTS, CHARS, TREAS, EVENTS } from './cards.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { toast } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet(DEF);
let sound = ls.get('nganha-sound') !== '0', ac = null, look = null, endShown = null, lastTO = 0, lastPend = '';
function beep(kind) {
  if (!sound) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const N = { dice: [[330, 0, .04], [392, .05, .04], [294, .1, .04], [440, .15, .05]], ok: [[523, 0, .08], [659, .08, .08], [784, .16, .14]], bad: [[330, 0, .12], [247, .12, .2]], card: [[660, 0, .05], [990, .05, .08]], beast: [[392, 0, .1], [523, .1, .1], [659, .2, .1], [784, .3, .1], [1047, .4, .4]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .35]], turn: [[740, 0, .06], [988, .07, .1]], day: [[523, 0, .1], [784, .1, .18]] }[kind] || [];
    for (const [f, at, len] of N) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.07, t + at + .012); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}
const px = (n, cls = '') => `<i class="px px-${n} ${cls}"></i>`;
const mPx = k => px('m_' + k);
const chkPx = () => px('chk');
/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  $('#pcount').textContent = `${n}/6 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 6 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>⏱️ Giờ mỗi lượt</b><div class="seg">${[[0, 'Không'], [45, '45 giây'], [60, '60 giây'], [90, '90 giây']].map(([x, nm]) => `<button type="button" data-opt="turn" data-v="${x}" aria-pressed="${o.turn === x}" ${dis}>${nm}</button>`).join('')}</div><small>Hết giờ thì tự qua lượt. Lúc đang đấu, ai cũng có vài giây để đánh bảo bối.</small></div>
    <div class="opt"><b>🏆 Luật</b><small>${E.DAYS} ngày · mỗi người nhận ngẫu nhiên 1 chiến binh cung hoàng đạo · hết ngày ${E.DAYS} nhiều điểm nhất thắng – nhưng nếu không ai thu phục được Siêu thú cổ đại nào thì cả bàn cùng thua!</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2; $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt(b.dataset.opt, +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();
$('#hero').innerHTML = px('m_lua_nhay') + px('ch_leo') + px('b_khi', 'big') + px('ch_pisces') + px('m_nuoc_quy');
/* ---------- ván chơi ---------- */
const P = (v, id) => v.players.find(p => p.id === id);
const nameOf = (v, id) => { const p = P(v, id); return p ? esc(cleanName(p.name)) : '?'; };
const meOf = v => P(v, ui.myId);
const myTurn = v => !v.spec && v.phase === 'play' && v.cur === ui.myId && !v.pend;
const elCount = p => EL_KEYS.map(e => [e, p.mons.filter(m => MONS[m.k].el === e).length]);
const elsHTML = p => elCount(p).filter(([, n]) => n).map(([e, n]) => `<span title="${EL[e].name}">${EL[e].icon}${n}</span>`).join('');
function tcard(c, o = {}) {
  const T = TREAS[c.k];
  return `<button class="tc ${T.col}${o.can ? ' can' : ''}" ${o.attrs || ''}>${px(c.k)}<span class="nm">${esc(T.name)}</span><span class="ty">${T.col === 'red' ? '🔴 lượt mình' : '🟢 lúc nào cũng được'}</span></button>`;
}
function draw(v) {
  const me = meOf(v);
  $('#round').innerHTML = v.phase === 'ended' ? '🏁 Hết ván' : `Ngày ${v.day}/${E.DAYS} · ${v.cur === ui.myId ? '⭐ Bạn' : nameOf(v, v.cur)}${v.left >= 0 && !v.pend ? ` · <span class="tm">${Math.ceil(v.left / 1000)}s</span>` : ''}`;
  const noBeast = !EL_KEYS.some(e => v.beasts[e]);
  $('#evt').className = 'evt' + (noBeast && v.day >= 6 && v.phase === 'play' ? ' warn' : '');
  $('#evt').innerHTML = v.phase === 'ended' ? '' : `<b>📜 ${esc(EVENTS[v.ev].name)}</b><span>${esc(EVENTS[v.ev].desc)}${noBeast && v.day >= 6 ? ' · ⚠️ Chưa ai thu phục Siêu thú – hết ngày 8 mà vẫn vậy thì cả bàn thua!' : ''}</span>`;
  $('#beasts').innerHTML = EL_KEYS.map(e => {
    const B = BEASTS[e], own = v.beasts[e], can = me && !own && myTurn(v) && !v.tf.beast && E.bestSet(me, e);
    return `<button class="tile${own ? ' done' : ''}${can ? ' can' : ''}" style="--c:${EL[e].col}" data-beast="${e}">${own ? `<span class="own">✔ ${nameOf(v, own)}</span>` : ''}${px(B.k)}<span class="nm">${esc(B.name)}</span><span class="row">${BEAST_NEED}${EL[e].icon} · ⭐${BEAST_PTS}</span></button>`;
  }).join('');
  $('#caves').innerHTML = v.caves.map((c, i) => {
    if (!c.m) return `<div class="tile off"><span class="door">${chkPx()}×${c.cost}</span><span class="nm">Hang trống</span></div>`;
    const M = MONS[c.m.k], can = me && myTurn(v) && !v.tf.cave && me.chk >= c.pay;
    return `<button class="tile${can ? ' can' : ''}" style="--c:${EL[M.el].col}" data-cave="${i}"><span class="door">${chkPx()}${c.pay !== c.cost ? `<s>${c.cost}</s>` : ''}${c.pay}</span>${mPx(M.k)}<span class="nm">${esc(M.name)}</span><span class="row">${EL[M.el].icon} ⚔️+${M.pw}</span></button>`;
  }).join('');
  $('#seats').innerHTML = v.players.map(p => `<button class="seat${p.id === v.cur && v.phase === 'play' ? ' turn' : ''}${look === p.id ? ' on' : ''}" data-look="${p.id}" data-pid="${p.id}">${px('ch_' + p.ch)}<span class="tx"><span class="nm">${CHARS[p.ch].sym} ${esc(cleanName(p.name))}${p.id === ui.myId ? ' (bạn)' : ''}</span><span class="st"><b>⭐${p.pts}</b> · 🍗${p.chk} · 🎴${p.handN}${p.beasts.length ? ' · 🌟' + p.beasts.length : ''}</span><span class="els">${elsHTML(p)}</span></span></button>`).join('');
  const shown = (look && P(v, look)) || me;
  let msg = '', acts = '';
  if (v.phase === 'ended') {
    const rk = [...v.players].sort((a, b) => b.pts - a.pts || b.beasts.length - a.beasts.length || b.chk - a.chk);
    msg = v.fail ? '💥 Không ai thu phục được Siêu thú cổ đại – ngân hà sụp đổ, cả bàn cùng thua!' : (v.winners || []).includes(ui.myId) ? '🎉 Bạn là thợ săn giỏi nhất ngân hà!' : `🏆 ${(v.winners || []).map(id => nameOf(v, id)).join(', ')} thắng!`;
    msg += `<ol class="rank">${rk.map(p => `<li>${px('ch_' + p.ch)}<span>${nameOf(v, p.id)}${p.beasts.length ? ' ' + p.beasts.map(e => EL[e].icon).join('') : ''}</span><b>${p.pts}</b></li>`).join('')}</ol>`;
    acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : '';
  } else if (v.spec) msg = '<small>👀 Bạn đang xem.</small>';
  else if (myTurn(v)) {
    msg = v.tf.cave ? (v.tf.beast ? 'Xong lượt rồi, bấm Hết lượt nha.' : 'Còn đấu Siêu thú được nếu đủ quái cùng hệ, hoặc Hết lượt.') : 'Chạm 1 hang để vào săn quái (trả 🍗 ghi trên cửa = điểm nhận được).';
    const rc = me ? (CHARS[me.ch].fx === 'freeRef' ? 0 : 1) : 1;
    acts = `<button class="btn" data-a="refresh" ${v.tf.ref || v.tf.cave || me.chk < rc ? 'disabled' : ''}>🔄 Làm mới hang (${rc}🍗)</button><button class="btn pri" data-a="end">⏭ Hết lượt</button>`;
  } else msg = v.pend ? '' : `<small>Chờ ${nameOf(v, v.cur)}…</small>`;
  if (v.log.length && v.phase === 'play') msg += `<div class="lg">${v.log.slice(-2).map(x => `<small>${esc(String(x).replace(/ 🤖/g, ''))}</small>`).join('')}</div>`;
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  if (shown) {
    const C = CHARS[shown.ch];
    $('#mine').innerHTML = `${px('ch_' + shown.ch)}<div class="who"><b>${C.sym} ${esc(C.name)}${shown.id === ui.myId ? '' : ` · ${nameOf(v, shown.id)}`}</b><small>${esc(C.desc)}</small>
      <div class="res"><span>${chkPx()} ${shown.chk}</span><span>⭐ ${shown.pts}</span>${shown.boost ? `<span>💨 +${shown.boost} trận sau</span>` : ''}${shown.beasts.map(e => `<span>${px(BEASTS[e].k)}</span>`).join('')}</div>
      <div class="mons">${shown.mons.map(m => mPx(m.k)).join('') || '<small>Chưa thu phục quái nào.</small>'}</div></div>`;
  } else $('#mine').innerHTML = '';
  $('#hand').innerHTML = me && me.hand ? me.hand.map(c => tcard(c, { attrs: `data-card="${c.id}"`, can: canPlayV(v, me, c) })).join('') || '<small class="empty">Chưa có bảo bối</small>' : '';
  drawPend(v);
}
/* kiểm tra lá đánh được (chạy trên view – cùng luật với engine.canPlay) */
function canPlayV(v, p, c) {
  const T = TREAS[c.k], pd = v.pend; if (v.phase !== 'play' || v.spec) return false;
  if (!pd) return T.win === 'turn' && v.cur === p.id;
  if (!(v.acts || []).includes(p.id) || (pd.n[p.id] || 0) >= E.PER_FIGHT) return false;
  const mine = pd.by === p.id, yen = v.ev === 'yen';
  if (T.win === 'self') return mine; if (T.win === 'turn') return false; if (T.win === 'other') return !mine && !yen;
  if (c.k === 'bom') return mine || !yen;
  if (c.k === 'gay') return pd.mods.some(m => m.by !== p.id && m.v && !m.x);
  return true;
}
/* ---------- bảng trận đấu ---------- */
const MODN = { kiem: 'Kiếm', khien: 'Bùa', gio: 'Gió', giay: 'Giày', bom: 'Bom', gay: 'Gậy', rr: 'Đổ lại' };
function drawPend(v) {
  const el = $('#pend'), pd = v.pend; document.body.classList.toggle('ng-pend', !!(pd && v.phase === 'play')); if (!pd || v.phase !== 'play') { el.hidden = true; lastPend = ''; return; }
  const me = meOf(v), mine = (v.acts || []).includes(ui.myId), key = pd.by + pd.what + pd.a + pd.b + pd.mods.length, fresh = key !== lastPend; lastPend = key;
  const foe = pd.what === 'cave' ? { px: 'm_' + pd.m.k, nm: MONS[pd.m.k].name } : { px: BEASTS[pd.el].k, nm: BEASTS[pd.el].name };
  const mods = side => pd.mods.filter(m => m.on === side).map(m => m.re ? `<em>${MODN[m.k] || ''} 🎲${m.re[0]}→${m.re[1]}</em>` : m.cut ? '' : `<em class="${m.v > 0 ? 'up' : 'dn'}${m.x ? ' x' : ''}">${MODN[m.k]} ${m.v > 0 ? '+' : ''}${m.v}</em>`).join('');
  const base = side => { const n = side === 'a' ? pd.pb : pd.mb; return n ? `${n > 0 ? '+' : ''}${n} ${side === 'a' ? (pd.what === 'beast' ? 'quái nộp / nội tại' : 'nội tại') : 'sức quái'}` : ''; };
  const A = E.total(pd, 'a'), B = E.total(pd, 'b'), sec = v.left >= 0 ? `<span class="tm">${Math.ceil(v.left / 1000)}s</span>` : '';
  let h = `<h3>${pd.what === 'beast' ? '🌟' : '⚔️'} ${pd.by === ui.myId ? 'Bạn' : nameOf(v, pd.by)} đấu ${esc(foe.nm)} ${sec}</h3>
    <div class="vs"><div class="side">${px('ch_' + P(v, pd.by).ch)}<span class="nm">${nameOf(v, pd.by)}</span><span><i class="die${fresh ? ' roll' : ''}">${pd.a}</i></span><small>${base('a')} ${mods('a')}</small><b class="tot">${A}</b></div>
    <span class="vsx">VS</span><div class="side">${px(foe.px)}<span class="nm">${esc(foe.nm)}</span><span><i class="die${fresh ? ' roll' : ''}">${pd.b}</i></span><small>${base('b')} ${mods('b')}</small><b class="tot">${B}</b></div></div>
    <p class="need">${A >= B ? '✅ Đang thắng (hoà cũng thắng)' : `❌ Đang thua ${B - A}`}</p>`;
  if (mine && me) {
    const cards = me.hand.filter(c => canPlayV(v, me, c)), rr = pd.by === ui.myId && CHARS[me.ch].fx === 'reroll' && !me.rr;
    h += `<div class="pc">${cards.map(c => tcard(c, { attrs: `data-pc="${c.id}"`, can: true })).join('')}</div><div class="pb">${rr ? '<button class="btn" data-pa="rr">♊ Đổ lại (miễn phí)</button>' : ''}<button class="btn pri" data-pa="pass">${pd.by === ui.myId ? 'Chốt' : 'Bỏ qua'}</button></div>`;
  } else h += `<p class="wait need">${(v.acts || []).length ? 'Chờ người có bảo bối…' : ''}</p>`;
  if (fresh) beep(pd.mods.length ? 'card' : 'dice');
  el.innerHTML = `<div class="pbox">${h}</div>`; el.hidden = false;
}
$('#pend').addEventListener('click', e => {
  const b = e.target.closest('[data-pa],[data-pc]'); if (!b || !ui.view) return;
  if (b.dataset.pc) return ui.act({ type: 'card', cid: b.dataset.pc });
  ui.act({ type: b.dataset.pa === 'rr' ? 'reroll' : 'pass' });
});
/* ---------- chạm hang / siêu thú / lá ---------- */
const pWin = (x, y) => { let w = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + x >= b + y) w++; return Math.round(w / 36 * 100); };
function modal(html) { ui.openModal(`${html}<div class="btns" id="m-btns"><button class="btn" id="m-close">Đóng</button></div>`); $('#m-close').onclick = ui.closeModal; }
const addBtn = html => $('#m-btns').insertAdjacentHTML('afterbegin', html);
$('#caves').addEventListener('click', e => {
  const d = e.target.closest('[data-cave]'), v = ui.view; if (!d || !v) return;
  const i = +d.dataset.cave, c = v.caves[i], M = MONS[c.m.k], me = meOf(v);
  const fx = me ? CHARS[me.ch].fx : '', pb = me ? me.boost + (fx === 'cave3' && c.cost === 3 ? 1 : 0) + (fx === 'cave1' && c.cost <= 2 ? 1 : 0) + (fx === 'freeRef' && M.el === 'dat' ? 1 : 0) : 0, mb = M.pw + (v.ev === 'nhat' ? 1 : 0);
  modal(`<div class="info">${mPx(M.k)}<div><h3>${esc(M.name)}</h3><p>${EL[M.el].icon} Hệ ${EL[M.el].name} · sức mạnh +${M.pw}${v.ev === 'nhat' ? ' (+1 Nhật Thực)' : ''}</p>
    <p>Vào cửa: <b>${c.pay} 🍗</b> · thắng được <b>${c.cost + (M.pw >= 2 ? 1 : 0)} điểm</b> + ${EL[M.el].giftTxt}${M.pw >= 2 ? ' (quái mạnh +1 điểm)' : ''}.</p>${me ? `<p><small>Bạn ${pb ? '+' + pb : '+0'} vs quái +${mb}: chưa tính bảo bối, khoảng <b>${pWin(pb, mb)}%</b> thắng.</small></p>` : ''}</div></div>`);
  if (!me) return;
  if (myTurn(v) && !v.tf.cave && me.chk >= c.pay) { addBtn(`<button class="btn pri" id="m-go">🕳️ Vào hang (${c.pay}🍗)</button>`); $('#m-go').onclick = () => { ui.closeModal(); ui.act({ type: 'enter', cave: i }); }; }
  else addBtn(`<small class="hint">${!myTurn(v) ? 'Chỉ vào hang trong lượt của bạn.' : v.tf.cave ? 'Mỗi lượt chỉ vào 1 hang.' : 'Không đủ đùi gà.'}</small>`);
});
$('#beasts').addEventListener('click', e => {
  const d = e.target.closest('[data-beast]'), v = ui.view; if (!d || !v) return;
  const el = d.dataset.beast, B = BEASTS[el], me = meOf(v), own = v.beasts[el], summon = me && CHARS[me.ch].fx === 'summon';
  modal(`<div class="info">${px(B.k)}<div><h3>${esc(B.name)}</h3><p>Siêu thú cổ đại hệ ${EL[el].icon} ${EL[el].name} · sức mạnh +${B.pw}${v.ev === 'tron' ? ' (+1 hôm nay)' : ''}</p>
    <p>Không vào bằng đùi gà: nộp <b>${BEAST_NEED} quái thú hệ ${EL[el].name}</b>${summon ? ' (bạn là Thiên Bình: 1 con khác hệ cũng được)' : ''}. Sức mạnh của các quái nộp cộng vào sức mạnh của bạn. Thắng được <b>${BEAST_PTS} điểm</b> + 2 🍗 + 2 bảo bối. Thua thì mất quái đã nộp.</p>${own ? `<p>✔ ${nameOf(v, own)} đã thu phục.</p>` : ''}</div></div><div id="bsel"></div>`);
  if (!me || own || !myTurn(v) || v.tf.beast) { if (!own && me) addBtn(`<small class="hint">${!myTurn(v) ? 'Chỉ đấu trong lượt của bạn.' : 'Mỗi lượt chỉ đấu 1 Siêu thú.'}</small>`); return; }
  let sel = E.bestSet(me, el) || [];
  const cand = me.mons.filter(m => MONS[m.k].el === el || summon);
  const paint = () => {
    $('#bsel').innerHTML = cand.length ? `<p><b>Chọn ${BEAST_NEED} quái để nộp:</b></p><div class="pick">${cand.map(m => `<button type="button" data-m="${m.id}" aria-pressed="${sel.includes(m.id)}">${mPx(m.k)}${esc(MONS[m.k].name)}<small>⚔️+${MONS[m.k].pw}</small></button>`).join('')}</div>` : `<p><small>Bạn chưa có quái hệ ${EL[el].name} nào.</small></p>`;
    const ok = E.beastOk(me, el, sel), pb = ok ? sel.reduce((n, id) => n + MONS[me.mons.find(m => m.id === id).k].pw, 0) + me.boost + (CHARS[me.ch].fx === 'beast2' ? 2 : 0) : 0;
    const go = $('#m-go'); if (go) go.remove();
    addBtn(`<button class="btn pri" id="m-go" ${ok ? '' : 'disabled'}>🌟 Thách đấu${ok ? ` · ~${pWin(pb, B.pw + (v.ev === 'tron' ? 1 : 0))}%` : ''}</button>`);
    $('#m-go').onclick = () => { ui.closeModal(); ui.act({ type: 'beast', el, ids: sel }); };
    $('#bsel').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const id = b.dataset.m; sel = sel.includes(id) ? sel.filter(x => x !== id) : sel.length < BEAST_NEED ? [...sel, id] : sel; paint(); });
  };
  paint();
});
$('#hand').addEventListener('click', e => {
  const d = e.target.closest('[data-card]'), v = ui.view; if (!d || !v) return;
  const me = meOf(v), c = me.hand.find(x => x.id === d.dataset.card); if (!c) return; const T = TREAS[c.k];
  modal(`<div class="info">${px(c.k)}<div><h3>${esc(T.name)}</h3><p><small>${T.col === 'red' ? '🔴 Bảo bối đỏ' : '🟢 Bảo bối xanh'}</small></p><p>${esc(T.desc)}</p></div></div>`);
  if (canPlayV(v, me, c)) { addBtn(`<button class="btn pri" id="m-go">✨ Dùng</button>`); $('#m-go').onclick = () => { ui.closeModal(); ui.act({ type: 'card', cid: c.id }); }; }
  else addBtn(`<small class="hint">${T.win === 'turn' ? 'Dùng trong lượt của bạn, lúc không đấu.' : 'Lá này đánh ra lúc đang có trận đấu.'}</small>`);
});
$('#seats').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (!b || !ui.view) return; look = look === b.dataset.look ? null : b.dataset.look; draw(ui.view); });
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'end' || a === 'refresh') ui.act({ type: a });
  else if (a === 'again' && ui.isHost) ui.net.raw.start(); else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
});
/* ---------- nhận trạng thái ---------- */
function render(v, prev) {
  if (prev && prev.gid === v.gid && v.last && JSON.stringify(prev.last) !== JSON.stringify(v.last)) {
    const L = v.last, who = L.by === ui.myId ? 'Bạn' : cleanName((P(v, L.by) || {}).name || '?'); /* toast in chữ thường, đừng esc */
    if (L.t === 'win') { beep('ok'); toast(`✨ ${who} thu phục ${MONS[L.k].name}! +${L.pts} điểm`); }
    else if (L.t === 'lose') { beep('bad'); toast(`💫 ${who} thua ${MONS[L.k].name} (${L.A}–${L.B})`); }
    else if (L.t === 'bwin') { beep('beast'); toast(`🌟 ${who} thu phục Siêu thú ${BEASTS[L.el].name}!`); }
    else if (L.t === 'blose') { beep('bad'); toast(`🌪️ ${BEASTS[L.el].name} thắng ${who} (${L.A}–${L.B})`); }
  }
  if (prev && prev.gid === v.gid && prev.day !== v.day && v.phase === 'play') { beep('day'); toast(`🌅 Ngày ${v.day}: ${EVENTS[v.ev].name}`); }
  if (prev && prev.cur !== v.cur && v.cur === ui.myId && v.phase === 'play') beep('turn');
  draw(v);
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); } } else endShown = null;
}
/* đồng hồ: đếm lùi + báo hết giờ */
setInterval(() => {
  const v = ui.view; if (!v || v.phase !== 'play' || v.left < 0) return;
  v.left = Math.max(0, v.left - 500);
  document.querySelectorAll('.tm').forEach(t => { const x = Math.ceil(v.left / 1000) + 's'; if (t.textContent !== x) t.textContent = x; });
  if (v.left <= 0 && !v.spec && P(v, ui.myId) && performance.now() - lastTO > 1500) { lastTO = performance.now(); ui.act({ type: 'timeout' }); }
}, 500);
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Săn Thú Ngân Hà</h2>
    <p>Bạn là một chiến binh cung hoàng đạo, có <b>${E.DAYS} ngày</b> để săn quái thú và thu phục <b>4 Siêu thú cổ đại</b>. Hết ngày ${E.DAYS}, ai nhiều <b>⭐ điểm chiến công</b> nhất thắng. Nhưng nếu <b>không ai thu phục được Siêu thú nào</b> thì cả bàn cùng thua!</p>
    <h3>Mỗi ngày</h3><ul><li>🎁 Từ ngày 2: ai cũng nhận 1 🍗 và 1 bảo bối.</li><li>📜 Lật 1 sự kiện, áp dụng cho cả ngày.</li><li>🔁 Lần lượt mỗi người chơi 1 lượt (người đi đầu đổi mỗi ngày).</li></ul>
    <h3>Trong lượt của bạn</h3><ul><li>🕳️ <b>Vào 1 hang</b>: trả số 🍗 ghi trên cửa (1, 1, 2, 2, 3). Bạn và quái cùng đổ 1 xúc xắc, cộng sức mạnh; <b>hoà là bạn thắng</b>. Thắng: lấy quái về, nhận điểm = số 🍗 trên cửa (quái ⚔️+2 thêm 1 điểm) và quà theo hệ: 🔥 +1 🍗 · 💧 +1 bảo bối · 💨 +1 sức mạnh trận sau · 🌱 +1 điểm. Thua: mất 🍗.</li>
    <li>🌟 <b>Đấu 1 Siêu thú</b>: nộp ${BEAST_NEED} quái cùng hệ của nó, sức mạnh các quái nộp cộng cho bạn. Thắng +${BEAST_PTS} điểm, 2 🍗, 2 bảo bối.</li><li>🔄 Làm mới cả 5 hang (1 🍗) trước khi vào hang.</li><li>🔴 Dùng bảo bối đỏ.</li></ul>
    <h3>Bảo bối</h3><p>🔴 Đỏ: chỉ trong lượt / trận của bạn. 🟢 Xanh: lúc nào cũng được – kể cả phá trận của người khác. Đang có trận thì ai có lá dùng được đều có vài giây để đánh.</p>
    <div class="gl">${Object.values(TREAS).map(t => `<div class="dr">${px(t.k)}<div><b>${esc(t.name)}</b> <small>${t.col === 'red' ? '🔴' : '🟢'} ${esc(t.desc)} (${t.n} lá)</small></div></div>`).join('')}</div>
    <h3>12 chiến binh</h3><div class="gl">${Object.values(CHARS).map(c => `<div class="dr">${px('ch_' + c.k)}<div><b>${c.sym} ${esc(c.name)}</b><small>${esc(c.desc)}</small></div></div>`).join('')}</div>
    <h3>Siêu thú cổ đại</h3><div class="gl">${EL_KEYS.map(e => `<div class="dr">${px(BEASTS[e].k)}<div><b>${esc(BEASTS[e].name)}</b><small>${EL[e].icon} cần ${BEAST_NEED} quái hệ ${EL[e].name} · sức mạnh +${BEASTS[e].pw}</small></div></div>`).join('')}</div>
    <h3>Quái thú</h3><div class="gl">${EL_KEYS.map(e => Object.values(MONS).filter(m => m.el === e).map(m => `<div class="dr">${mPx(m.k)}<div><b>${esc(m.name)}</b><small>${EL[e].icon} ⚔️+${m.pw} · ${m.n} lá</small></div></div>`).join('')).join('')}</div>
    <h3>Sự kiện</h3><div class="gl">${Object.values(EVENTS).map(x => `<div class="dr"><div><b>📜 ${esc(x.name)}</b><small>${esc(x.desc)}</small></div></div>`).join('')}</div>
    <p><small>Cách chơi theo board game Siêu Thú Ngân Hà.</small></p>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`, 'wide');
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('nganha-sound', sound ? '1' : '0'); drawSound(); beep('ok'); };
const ui = gameKit({ game: 'nganha', net: NET, onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); }, onState: (v, prev) => { if (v) render(v, prev); else { endShown = null; look = null; } }, offline: h => { h.addBot(); h.addBot(); } });
