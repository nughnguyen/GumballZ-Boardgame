// 🐾 Hội Săn Quái – giao diện. Luật ở engine.js, máy ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=53';
import { DEF } from './def.js?v=2';
import * as E from './engine.js?v=2';
import { CLS, CLS_KEYS, HEROES, LEADERS, ITEMS, MAGIC, MODS, MONSTERS, ALL, BEAST, EFF, PEN, typeName, descOf } from './cards.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=16';
import { toast } from '../../shared/ui/dialog.js?v=10';

const NET = makeNet(DEF);
let sound = ls.get('hsq-sound') !== '0', ac = null, look = null, endShown = null, lastTO = 0, lastPend = '', tick = 0;
function beep(kind) {
  if (!sound) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const N = { dice: [[220, 0, .04], [260, .05, .04], [200, .1, .04], [300, .15, .05]], ok: [[523, 0, .08], [659, .08, .08], [784, .16, .14]], bad: [[330, 0, .12], [247, .12, .2]], play: [[440, 0, .06], [660, .06, .08]], chal: [[196, 0, .1], [392, .1, .1], [196, .2, .12]], slay: [[392, 0, .1], [523, .1, .1], [659, .2, .1], [1047, .3, .3]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .35]], turn: [[660, 0, .06], [880, .07, .08]] }[kind] || [];
    for (const [f, at, len] of N) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.05, t + at + .012); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}
/* ---------- vẽ lá bài ---------- */
const K = k => ALL[k];
function art(k) {
  const c = K(k); if (!c) return '';
  if (c.t === 'hero') return `<i class="ar"><i class="px px-b_${BEAST[c.cls]}"></i><i class="px pr px-p_${c.prop}"></i></i>`;
  if (c.t === 'leader') return `<i class="ar"><i class="px px-b_${BEAST[c.cls]}"></i><i class="px cr px-p_crown"></i></i>`;
  if (MONSTERS[k]) return `<i class="ar"><i class="px px-${k}"></i></i>`;
  const ic = c.t === 'item' ? (c.mask ? 'i_mask' : c.k) : c.t === 'magic' ? ({ x_book: 'p_book', x_net: 'p_net' }[k] || k) : c.t === 'mod' ? 'mod' : 'chal';
  return `<i class="ar"><i class="px ic px-${ic}"${c.mask ? ` style="filter:hue-rotate(${CLS_KEYS.indexOf(c.mask) * 60}deg)"` : ''}></i></i>`;
}
const clsCol = c => (c.cls ? CLS[c.cls].col : MONSTERS[c.k] ? '#5b2a6e' : { item: '#c08a1e', magic: '#7c4dcc', mod: '#4b8b6b', chal: '#d0582a' }[c.t] || '#888');
function card(k, o = {}) {
  const c = K(k); if (!c) return '';
  const top = c.t === 'hero' || c.t === 'leader' ? `${CLS[c.cls].icon} ${CLS[c.cls].name}` : MONSTERS[k] ? 'Quái vật' : typeName[c.t];
  const badge = c.t === 'hero' ? `<b class="rl">${c.roll}+</b>` : c.t === 'mod' ? `<b class="rl mv">${c.vals.map(v => (v > 0 ? '+' : '−') + Math.abs(v)).join('/')}</b>` : MONSTERS[k] ? `<b class="rl mw">${c.win}+</b>` : '';
  return `<div class="cd t-${MONSTERS[k] ? 'mon' : c.t} ${o.cls || ''}" style="--c:${clsCol(c)}" ${o.attrs || ''}><div class="cd-top">${top}</div>${art(k)}${badge}<div class="cd-nm">${esc(c.name)}</div>${o.sub ? `<div class="cd-sub">${o.sub}</div>` : ''}${o.item ? `<i class="it" title="${esc(K(o.item.k).name)}">${art(o.item.k)}</i>` : ''}</div>`;
}
const fxName = { atk1: '+1 đánh quái', atk2: '+2 đánh quái', chal2: '+2 khi Thách', mod1: 'Cộng/Trừ +1', freeDraw: 'rút lá đầu miễn phí', magicDraw: 'Phép → rút 1', use1: '+1 dùng kỹ năng', use2: '+2 dùng kỹ năng', draw1: 'rút thêm đầu lượt', noDestroy: 'không bị huỷ', noSteal: 'không bị lấy', noRet: 'không bị trả về', hand1: 'tay < 3 → rút', ap1: '+1 hành động', itemFree: 'Vật phẩm miễn phí', heroFree: 'Anh hùng đầu lượt miễn phí' };
const dots = p => CLS_KEYS.map(c => `<i class="dot${E.classesOf(p).has(c) ? ' on' : ''}" style="--c:${CLS[c].col}" title="${CLS[c].name}"></i>`).join('');
/* ---------- phòng chờ ---------- */
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  $('#pcount').textContent = `${n}/6 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 6 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>⏱️ Giờ mỗi lượt</b><div class="seg">${[[0, 'Không'], [60, '60 giây'], [90, '90 giây'], [150, '150 giây']].map(([x, nm]) => `<button type="button" data-opt="turn" data-v="${x}" aria-pressed="${o.turn === x}" ${dis}>${nm}</button>`).join('')}</div><small>Hết giờ thì tự qua lượt. Thách / Cộng-Trừ luôn có đồng hồ riêng (vài giây).</small></div>
    <div class="opt"><b>🏆 Thắng khi</b><small>Diệt ${E.WIN_MON} quái vật, hoặc đội đủ ${E.WIN_CLS} hệ (tính cả Trưởng nhóm).</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2; $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt(b.dataset.opt, +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();
$('#hero').innerHTML = ['g1', 'o1', 'c2', 'm4', 't1'].map(k => card(k)).join('');
/* ---------- ván chơi ---------- */
const P = (v, id) => v.players.find(p => p.id === id);
const nameOf = (v, id) => { const p = P(v, id); return p ? esc(cleanName(p.name)) : '?'; };
const meOf = v => P(v, ui.myId);
const myTurn = v => !v.spec && v.phase === 'play' && v.cur === ui.myId && !v.pend;
function draw(v) {
  const me = meOf(v), cur = P(v, v.cur);
  $('#round').innerHTML = v.phase === 'ended' ? '🏁 Hết ván' : `${v.cur === ui.myId ? '⭐ Lượt bạn' : 'Lượt ' + nameOf(v, v.cur)}${v.left >= 0 && !v.pend ? ` · <span class="tm">${Math.ceil(v.left / 1000)}s</span>` : ''}`;
  $('#ap').innerHTML = v.phase === 'play' ? Array.from({ length: Math.max(3, v.ap) }, (_, i) => `<i class="${i < v.ap ? 'on' : ''}"></i>`).join('') : '';
  $('#mons').innerHTML = v.mons.map(m => { const can = me && E.canAttack(me, m); return card(m.k, { cls: can ? 'can' : '', attrs: `data-mon="${m.id}"`, sub: `${MONSTERS[m.k].req.n}🐾${MONSTERS[m.k].req.cls ? ' + ' + CLS[MONSTERS[m.k].req.cls].icon : ''}` }); }).join('') + `<div class="pile"><b>${v.deckN}</b><small>chồng rút</small><b>${v.disc.length}</b><small>chồng bỏ</small></div>`;
  const shown = look && P(v, look) || me || cur;
  $('#seats').innerHTML = v.players.map(p => `<button class="seat${p.id === v.cur ? ' turn' : ''}${p.id === shown.id ? ' on' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" data-look="${p.id}" data-pid="${p.id}">${avatar(p.name, 22)}<span class="nm">${esc(cleanName(p.name))}${p.id === ui.myId ? ' (bạn)' : ''}</span><span class="cnt">💀${p.slain.length} 🂠${p.handN}</span><span class="dots">${dots(p)}</span></button>`).join('');
  const mine = shown.id === ui.myId && !v.spec, canUse = mine && myTurn(v) && v.ap >= 1;
  const fx = E.fxOf(shown).map(x => fxName[x] || x);
  $('#board').innerHTML = `<div class="bd-h"><b>${mine ? '🐾 Đội của bạn' : `🐾 Đội của ${nameOf(v, shown.id)}`}${shown.shield ? ' 🛡️' : ''}</b><small>${E.classesOf(shown).size}/${E.WIN_CLS} hệ · 💀 ${shown.slain.length}/${E.WIN_MON} quái</small></div>
    <div class="party">${card(shown.leader, { cls: 'lead', attrs: `data-info="${shown.leader}"`, sub: 'Trưởng nhóm' })}${shown.party.map(h => card(h.k, { item: h.item, cls: (v.used[h.id] && shown.id === v.cur ? 'used ' : '') + (canUse && !v.used[h.id] ? 'tap' : ''), attrs: `data-hero="${h.id}" data-owner="${shown.id}"` })).join('')}${shown.slain.map(m => card(m.k, { cls: 'slain', attrs: `data-info="${m.k}"` })).join('')}</div>
    <div class="fxl">${fx.map(x => `<span>${x}</span>`).join('')}</div>`;
  let msg = '', acts = '';
  if (v.phase === 'ended') { msg = (v.winners || []).includes(ui.myId) ? '🎉 Hội của bạn săn giỏi nhất!' : `🏆 ${(v.winners || []).map(id => nameOf(v, id)).join(', ')} thắng!`; acts = ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : ''; }
  else if (v.spec) msg = '<small>👀 Bạn đang xem.</small>';
  else if (myTurn(v)) { msg = `Còn <b>${v.ap}</b> hành động. Chạm lá trên tay để chơi, chạm anh hùng để dùng kỹ năng, chạm quái để đánh.`; acts = `<button class="btn" data-a="draw" ${v.ap < 1 && !(E.fxOf(me).includes('freeDraw') && !v.tf.drew) ? 'disabled' : ''}>🂠 Rút 1 lá</button><button class="btn" data-a="redraw" ${v.ap < 3 ? 'disabled' : ''}>🔁 Đổi tay (3)</button><button class="btn pri" data-a="end">⏭ Hết lượt</button>`; }
  else msg = v.pend ? '' : `<small>Chờ ${nameOf(v, v.cur)}…</small>`;
  if (v.log.length) msg += `<div class="lg">${v.log.slice(-2).map(x => `<small>${esc(String(x).replace(/ 🤖/g, ''))}</small>`).join('')}</div>`;
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
  $('#hand').innerHTML = me && me.hand ? me.hand.map(c => card(c.k, { attrs: `data-card="${c.id}"`, cls: myTurn(v) && ['hero', 'item', 'magic'].includes(K(c.k).t) ? 'tap' : '' })).join('') || '<small class="empty">Tay trống</small>' : '';
  drawPend(v);
}
/* ---------- bảng chờ: Thách / tung xúc xắc / chọn mục tiêu ---------- */
const die = n => `<i class="die d${n}">${'<b></b>'.repeat(n)}</i>`;
function drawPend(v) {
  const el = $('#pend'), pd = v.pend; document.body.classList.toggle('hsq-pend', !!(pd && v.phase === 'play')); if (!pd || v.phase !== 'play') { el.hidden = true; lastPend = ''; return; }
  const me = meOf(v), mine = (v.acts || []).includes(ui.myId), sec = v.left >= 0 ? `<span class="tm">${Math.ceil(v.left / 1000)}s</span>` : '';
  const key = pd.k + (pd.k === 'roll' ? pd.what + pd.by + JSON.stringify(pd.d) : pd.k === 'chal' ? pd.play.card.id : pd.what + pd.eff);
  const fresh = key !== lastPend; lastPend = key;
  let h = '';
  if (pd.k === 'chal') {
    const c = pd.play.card;
    h = `<h3>${nameOf(v, pd.by)} chơi lá ${sec}</h3><div class="pc">${card(c.k)}</div><p>${esc(descOf(K(c.k)))}${pd.play.tgt && pd.play.tgt.pid ? ` → nhắm <b>${nameOf(v, pd.play.tgt.pid)}</b>` : ''}</p>`;
    if (mine) { const ch = me.hand.find(x => K(x.k).t === 'chal'); h += `<div class="pb"><button class="btn pri" data-pa="chal" data-cid="${ch ? ch.id : ''}">⚔️ Thách!</button><button class="btn" data-pa="pass">Cho qua</button></div>`; }
    else h += `<p class="wait">Chờ xem có ai Thách…</p>`;
    if (fresh) beep('play');
  } else if (pd.k === 'roll') {
    const tgt = pd.what === 'use' ? `cần ${HEROES[pd.ctx.k].roll}+` : pd.what === 'atk' ? `diệt ${MONSTERS[pd.ctx.k].win}+ · phạt ${MONSTERS[pd.ctx.k].lose}−` : 'ai cao hơn thắng';
    const side = s => `<div class="rs"><b>${nameOf(v, s === 'a' ? pd.by : pd.two)}</b><div class="dice${fresh ? ' roll' : ''}">${die(pd.d[s][0])}${die(pd.d[s][1])}</div><small>${pd.bonus[s] ? (pd.bonus[s] > 0 ? '+' : '') + pd.bonus[s] + ' nội tại ' : ''}${pd.mods.filter(m => m.on === s).map(m => `<em class="${m.v > 0 ? 'up' : 'dn'}">${m.v > 0 ? '+' : ''}${m.v}</em>`).join(' ')}</small><b class="tot">${E.rollTotal(pd, s)}</b></div>`;
    h = `<h3>🎲 ${pd.what === 'use' ? `${nameOf(v, pd.by)} dùng ${esc(HEROES[pd.ctx.k].name)}` : pd.what === 'atk' ? `${nameOf(v, pd.by)} đánh ${esc(MONSTERS[pd.ctx.k].name)}` : `Thách: ${nameOf(v, pd.by)} ⚔️ ${nameOf(v, pd.two)}`} ${sec}</h3><p class="need">${tgt}</p><div class="rolls">${side('a')}${pd.two ? side('b') : ''}</div>`;
    if (mine) {
      const mods = me.hand.filter(x => K(x.k).t === 'mod'), boost = E.fxOf(me).filter(x => x === 'mod1').length;
      h += `<p><small>Đánh lá Cộng / Trừ vào lần tung này?</small></p><div class="mods">${mods.map(c => K(c.k).vals.map(val => { const e = val + Math.sign(val) * boost, t = (e > 0 ? '+' : '') + e; return pd.two ? `<button class="btn mod" data-pa="mod" data-cid="${c.id}" data-v="${val}" data-on="a">${t} cho ${nameOf(v, pd.by)}</button><button class="btn mod" data-pa="mod" data-cid="${c.id}" data-v="${val}" data-on="b">${t} cho ${nameOf(v, pd.two)}</button>` : `<button class="btn mod ${e > 0 ? 'up' : 'dn'}" data-pa="mod" data-cid="${c.id}" data-v="${val}" data-on="a">${t}</button>`; }).join('')).join('')}</div><div class="pb"><button class="btn" data-pa="pass">Không đánh</button></div>`;
    } else h += `<p class="wait">${(v.acts || []).length ? 'Chờ người có lá Cộng / Trừ…' : ''}</p>`;
    if (fresh) beep('dice');
  } else if (pd.k === 'pick') {
    const what = { hero: 'chọn anh hùng của người khác', own: 'chọn anh hùng của bạn để hy sinh', player: 'chọn một người', item: 'chọn vật phẩm', dhero: 'nhặt Anh hùng trong chồng bỏ', ditem: 'nhặt Vật phẩm trong chồng bỏ', dmagic: 'nhặt Phép trong chồng bỏ', dchal: 'nhặt lá Thách trong chồng bỏ', dany: 'nhặt 1 lá trong chồng bỏ' }[pd.what];
    h = `<h3>🎯 ${pd.by === ui.myId ? 'Bạn' : nameOf(v, pd.by)} ${what} ${sec}</h3>${pd.eff && EFF[pd.eff] ? `<p><small>${esc(EFF[pd.eff])}</small></p>` : pd.eff === 'sac' ? `<p><small>${esc(PEN.sac)}</small></p>` : ''}`;
    if (pd.by === ui.myId) h += `<div class="opts">${pickList(v, pd)}</div>`; else h += '<p class="wait">Đang chọn…</p>';
  }
  el.innerHTML = `<div class="pbox ${pd.k}">${h}</div>`; el.hidden = false;
}
function pickList(v, pd) {
  if (['hero', 'own', 'item'].includes(pd.what)) {
    const out = []; for (const q of v.players) for (const h of q.party) {
      if (pd.what === 'hero' && (q.id === ui.myId)) continue; if (pd.what === 'own' && q.id !== ui.myId) continue; if (pd.what === 'item' && !h.item) continue;
      out.push(`<button class="opt" data-pick='${JSON.stringify({ pid: q.id, hid: h.id })}'>${card(h.k, { item: h.item })}<small>${nameOf(v, q.id)}</small></button>`);
    }
    return out.join('') || '<small>Không có mục tiêu.</small>';
  }
  if (pd.what === 'player') return v.players.filter(q => q.id !== ui.myId).map(q => `<button class="btn" data-pick='${JSON.stringify({ pid: q.id })}'>${avatar(q.name, 20)} ${nameOf(v, q.id)} · 🂠${q.handN}</button>`).join('');
  const f = { dhero: 'hero', ditem: 'item', dmagic: 'magic', dchal: 'chal' }[pd.what];
  return v.disc.filter(c => !f || K(c.k).t === f).map(c => `<button class="opt" data-pick='${JSON.stringify({ cid: c.id })}'>${card(c.k)}</button>`).join('');
}
$('#pend').addEventListener('click', e => {
  const b = e.target.closest('[data-pa],[data-pick]'), v = ui.view; if (!b || !v) return;
  if (b.dataset.pick) return ui.act({ type: 'pick', ...JSON.parse(b.dataset.pick) });
  const a = b.dataset.pa;
  if (a === 'pass') ui.act({ type: 'pass' });
  else if (a === 'chal') { if (!b.dataset.cid) return toast('Bạn không có lá Thách.'); ui.act({ type: 'chal', cid: b.dataset.cid }); }
  else if (a === 'mod') ui.act({ type: 'mod', cid: b.dataset.cid, v: +b.dataset.v, on: b.dataset.on });
});
/* ---------- chạm lá / anh hùng / quái ---------- */
function infoModal(k, extra = '') {
  const c = K(k);
  ui.openModal(`<div class="info">${card(k, { cls: 'big' })}<div><h3>${esc(c.name)}</h3><p><small>${typeName[c.t] || (MONSTERS[k] ? 'Quái vật' : '')}${c.cls ? ' · ' + CLS[c.cls].icon + ' ' + CLS[c.cls].name : ''}</small></p><p>${esc(c.t === 'leader' ? c.desc : descOf(c))}</p>${extra}</div></div><div class="btns" id="m-btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
}
const addBtn = html => { const b = $('#m-btns'); b.insertAdjacentHTML('afterbegin', html); };
$('#hand').addEventListener('click', e => {
  const d = e.target.closest('[data-card]'), v = ui.view; if (!d || !v) return;
  const me = meOf(v), c = me.hand.find(x => x.id === d.dataset.card); if (!c) return; const C0 = K(c.k);
  infoModal(c.k);
  if (!myTurn(v) || !['hero', 'item', 'magic'].includes(C0.t)) { if (C0.t === 'mod' || C0.t === 'chal') addBtn('<small class="hint">Lá này đánh ra khi có người tung xúc xắc / chơi lá.</small>'); return; }
  if (C0.t === 'hero') { addBtn(`<button class="btn pri" id="m-go">🐾 Đưa vào đội (1⚡)</button>`); $('#m-go').onclick = () => { ui.closeModal(); ui.act({ type: 'play', cid: c.id }); }; return; }
  if (C0.t === 'item' || (C0.t === 'magic' && C0.need === 'hero')) {
    const list = [];
    for (const q of v.players) for (const h of q.party) {
      if (C0.t === 'item') { if (h.item || (C0.curse && q.id === ui.myId) || (C0.own && q.id !== ui.myId)) continue; }
      else if (q.id === ui.myId || !E.heroTargets(v, ui.myId, C0.eff).some(t => t.hid === h.id)) continue;
      list.push(`<button class="opt" data-t='${JSON.stringify({ pid: q.id, hid: h.id })}'>${card(h.k, { item: h.item })}<small>${nameOf(v, q.id)}</small></button>`);
    }
    $('#m-btns').insertAdjacentHTML('beforebegin', `<p><b>${C0.t === 'item' ? 'Gắn lên anh hùng nào? (1⚡)' : 'Nhắm anh hùng nào? (1⚡)'}</b></p><div class="opts">${list.join('') || '<small>Không có anh hùng nào hợp.</small>'}</div>`);
    document.querySelectorAll('#modal-box [data-t]').forEach(b => b.onclick = () => { ui.closeModal(); ui.act({ type: 'play', cid: c.id, ...JSON.parse(b.dataset.t) }); });
    return;
  }
  if (C0.t === 'magic' && C0.need === 'player') {
    $('#m-btns').insertAdjacentHTML('beforebegin', `<p><b>Nhắm ai? (1⚡)</b></p><div class="opts">${v.players.filter(q => q.id !== ui.myId).map(q => `<button class="btn" data-t='${JSON.stringify({ pid: q.id })}'>${nameOf(v, q.id)} · 🂠${q.handN}</button>`).join('')}</div>`);
    document.querySelectorAll('#modal-box [data-t]').forEach(b => b.onclick = () => { ui.closeModal(); ui.act({ type: 'play', cid: c.id, ...JSON.parse(b.dataset.t) }); });
    return;
  }
  addBtn(`<button class="btn pri" id="m-go">🪄 Dùng phép (1⚡)</button>`); $('#m-go').onclick = () => { ui.closeModal(); ui.act({ type: 'play', cid: c.id }); };
});
$('#board').addEventListener('click', e => {
  const v = ui.view; if (!v) return;
  const inf = e.target.closest('[data-info]'); if (inf) return infoModal(inf.dataset.info);
  const d = e.target.closest('[data-hero]'); if (!d) return;
  const q = P(v, d.dataset.owner), h = q && q.party.find(x => x.id === d.dataset.hero); if (!h) return;
  infoModal(h.k, h.item ? `<p>🎒 Đang mang <b>${esc(K(h.item.k).name)}</b>: ${esc(K(h.item.k).desc)}</p>` : '');
  if (q.id === ui.myId && myTurn(v) && !v.used[h.id] && v.ap >= 1 && !(h.item && ITEMS[h.item.k].sleep)) {
    const b = E.bonusOf(v, q, 'use', { hid: h.id });
    addBtn(`<button class="btn pri" id="m-go">🎲 Dùng kỹ năng (1⚡) · cần ${HEROES[h.k].roll}+${b ? ` (bạn +${b})` : ''}</button>`); $('#m-go').onclick = () => { ui.closeModal(); ui.act({ type: 'use', hid: h.id }); };
  } else if (q.id === ui.myId && v.used[h.id]) addBtn('<small class="hint">Lượt này đã dùng kỹ năng anh hùng này.</small>');
});
$('#mons').addEventListener('click', e => {
  const d = e.target.closest('[data-mon]'), v = ui.view; if (!d || !v) return;
  const m = v.mons.find(x => x.id === d.dataset.mon), me = meOf(v); infoModal(m.k);
  if (!me) return; const ok = E.canAttack(me, m), b = E.bonusOf(v, me, 'atk');
  if (myTurn(v) && ok && v.ap >= 2) { addBtn(`<button class="btn pri" id="m-go">🗡️ Đánh (2⚡)${b ? ` · bạn +${b}` : ''}</button>`); $('#m-go').onclick = () => { ui.closeModal(); ui.act({ type: 'atk', mid: m.id }); }; }
  else addBtn(`<small class="hint">${!ok ? 'Đội chưa đủ điều kiện đánh quái này.' : myTurn(v) ? 'Cần 2 hành động.' : 'Chỉ đánh được trong lượt của bạn.'}</small>`);
});
$('#seats').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (!b || !ui.view) return; look = b.dataset.look; draw(ui.view); });
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'draw' || a === 'end' || a === 'redraw') ui.act({ type: a });
  else if (a === 'again' && ui.isHost) ui.net.raw.start(); else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
});
/* ---------- nhận trạng thái ---------- */
function render(v, prev) {
  if (prev && prev.gid === v.gid && v.last && (!prev.last || JSON.stringify(prev.last) !== JSON.stringify(v.last))) {
    const L = v.last, who = L.by === ui.myId ? 'Bạn' : nameOf(v, L.by);
    if (L.t === 'use') { beep(L.ok ? 'ok' : 'bad'); toast(`${who} tung ${L.A} cho ${K(L.k).name}: ${L.ok ? 'thành công ✨' : 'trượt'}`); }
    else if (L.t === 'slay') { beep('slay'); toast(`🗡️ ${who} diệt ${K(L.k).name}!`); }
    else if (L.t === 'flop') { beep('bad'); toast(`💥 ${K(L.k).name} phản đòn ${who}!`); }
    else if (L.t === 'miss') toast(`😮‍💨 ${who} chưa hạ được ${K(L.k).name}.`);
    else if (L.t === 'chal') { beep('chal'); toast(`⚔️ Thách ${L.A}–${L.B}: ${L.win ? K(L.k).name + ' bị bỏ!' : 'lá vẫn được chơi'}`); }
    else if (L.t === 'hit') toast(`${who} ${{ steal: 'lấy', ret: 'trả về tay', destroy: 'huỷ', destroyDraw: 'huỷ' }[L.eff] || 'đánh'} ${K(L.k).name} của ${nameOf(v, L.to)}`);
  }
  if (prev && prev.cur !== v.cur && v.cur === ui.myId && v.phase === 'play') { beep('turn'); look = null; }
  draw(v);
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); } } else endShown = null;
}
/* đồng hồ: đếm lùi + báo hết giờ */
setInterval(() => {
  const v = ui.view; if (!v || v.phase !== 'play' || v.left < 0) return;
  v.left = Math.max(0, v.left - 500); tick++;
  document.querySelectorAll('.tm').forEach(t => { t.textContent = Math.ceil(v.left / 1000) + 's'; });
  if (v.left <= 0 && !v.spec && P(v, ui.myId) && performance.now() - lastTO > 1500) { lastTO = performance.now(); ui.act({ type: 'timeout' }); }
}, 500);
function openGuide() {
  const by = c => Object.values(HEROES).filter(h => h.cls === c);
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Hội Săn Quái</h2>
    <p><b>Mục tiêu:</b> diệt <b>${E.WIN_MON} quái vật</b>, hoặc có đội đủ <b>${E.WIN_CLS} hệ</b> (Trưởng nhóm cũng tính 1 hệ).</p>
    <h3>Mỗi lượt có 3 ⚡ hành động</h3><ul><li>🂠 <b>Rút 1 lá</b> (1⚡)</li><li>🐾 <b>Chơi 1 lá</b> (1⚡): Anh hùng vào đội – vừa vào là được tung dùng kỹ năng miễn phí; Vật phẩm gắn lên anh hùng; Phép dùng một lần.</li>
    <li>🎲 <b>Dùng kỹ năng</b> một anh hùng trong đội (1⚡, mỗi con 1 lần/lượt): tung 2 xúc xắc, đủ điểm ghi trên lá là thành công.</li><li>🗡️ <b>Đánh quái</b> (2⚡): đội phải đủ điều kiện ghi trên quái. Tung đủ điểm diệt thì lấy quái về (có nội tại), thấp quá thì bị phạt.</li><li>🔁 <b>Đổi tay</b> (3⚡): bỏ hết tay, rút 5 lá mới.</li></ul>
    <h3>Lúc người khác làm</h3><ul><li>⚔️ <b>Thách</b>: ai chơi Anh hùng / Vật phẩm / Phép thì người khác đánh lá Thách được – hai bên cùng tung, bên Thách <b>cao hơn</b> thì lá kia bị bỏ.</li><li>🎴 <b>Cộng / Trừ</b>: lần tung nào cũng đánh vào được (của mình hay của người khác), chọn một trong hai số trên lá.</li></ul>
    <h3>Trưởng nhóm</h3><div class="gl">${Object.values(LEADERS).map(L => `<div class="dr">${card(L.k)}<div><b>${esc(L.name)}</b><small>${esc(L.desc)}</small></div></div>`).join('')}</div>
    <h3>Anh hùng</h3>${CLS_KEYS.map(c => `<h4>${CLS[c].icon} ${CLS[c].name} (${CLS[c].beast})</h4><div class="gl">${by(c).map(h => `<div class="dr">${card(h.k)}<div><b>${esc(h.name)}</b><small>${esc(descOf(h))}</small></div></div>`).join('')}</div>`).join('')}
    <h3>Quái vật</h3><div class="gl">${Object.values(MONSTERS).map(m => `<div class="dr">${card(m.k)}<div><b>${esc(m.name)}</b><small>${esc(descOf(m))}</small></div></div>`).join('')}</div>
    <h3>Vật phẩm & Phép</h3><div class="gl">${[...Object.values(ITEMS), ...Object.values(MAGIC)].map(c => `<div class="dr">${card(c.k)}<div><b>${esc(c.name)}</b><small>${esc(c.desc || descOf(c))}</small></div></div>`).join('')}</div>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`, 'wide');
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('hsq-sound', sound ? '1' : '0'); drawSound(); beep('ok'); };
const ui = gameKit({ game: 'hoisanquai', net: NET, onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); }, onState: (v, prev) => { if (v) render(v, prev); else { endShown = null; look = null; } }, offline: h => { h.addBot(); h.addBot(); } });
/* móc test (?dbgview=1): chỉ trả view của chính người chơi (đúng những gì UI đã vẽ, không lộ tay bài người khác) để test tự động đọc trạng thái rồi bấm qua UI thật */
if (new URLSearchParams(location.search).has('dbgview')) window.__hsqView = () => ui.view || null;
