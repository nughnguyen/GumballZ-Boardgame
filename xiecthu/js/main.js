// 🎪 Gánh Xiếc Thú – giao diện. Luật ở engine.js, máy ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { DEF } from './def.js?v=1';
import * as E from './engine.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { toast, confirmBox } from '../../shared/ui/dialog.js?v=8';

const NET = makeNet(DEF);
const { TOONS } = E;
let sound = ls.get('xiecthu-sound') !== '0', endShown = null, ac = null, lastRound = 0, look = null;
function beep(kind) {
  if (!sound) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { flip: [[880, 0, .04], [1175, .05, .05]], hire: [[523, 0, .07], [659, .07, .07], [784, .14, .12]], out: [[392, 0, .1], [262, .1, .18]], show: [[392, 0, .12], [523, .12, .12], [659, .24, .12], [784, .36, .22]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .35]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.09, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}
const RANK = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5'];
/* một thẻ thú: icon to, tên, danh tiếng gốc, khả năng */
function toon(c, o = {}) {
  if (!c) return `<div class="tn empty"></div>`;
  const t = TOONS[c.k];
  if (o.down) return `<div class="tn back ${o.cls || ''}" ${o.attrs || ''}><span>🎪</span></div>`;
  return `<div class="tn ${RANK[t.rank]} ${o.cls || ''}" ${o.attrs || ''} style="${o.delay != null ? `--d:${o.delay}ms` : ''}" title="${esc(t.name + (t.fx ? ': ' + t.fx : ''))}">
    <i class="ic px px-${c.k}" aria-hidden="true"></i><span class="nm">${esc(t.name)}</span><i class="fm${t.fame < 0 ? ' neg' : ''}">${o.f != null ? o.f : t.fame}</i>${t.fx ? '<i class="fx">✦</i>' : ''}${o.price != null ? `<em class="pr">${o.price}⭐</em>` : ''}</div>`;
}
/* sân khấu 3×2 của một người */
function stage(p, me, anim) {
  const f = {}; (p.parts || []).forEach(x => { f[x.id] = x.f; });
  const ord = {}; (p.order || []).forEach((id, i) => { ord[id] = i; });
  return `<div class="stage">${p.grid.map((cell, i) => `<div class="slot">${cell.length ? cell.map((c, j) => toon(c, { down: !c.up, f: f[c.id], cls: (j ? 'stk ' : '') + (anim ? 'flip' : '') + (me && c.up && !c.gone ? ' tap' : ''), delay: anim ? ord[c.id] * 260 : null, attrs: me && c.up ? `data-dis="${c.id}"` : '' })).join('') : '<div class="tn empty"></div>'}</div>`).join('')}</div>`;
}
$('#hero').innerHTML = ['meo', 'su', 'voi', 'thao', 'lan'].map((k, i) => toon({ k, id: 'h' + i })).join('');
// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  $('#pcount').textContent = `${n}/5 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < 5 ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm máy</button></div>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>⭐ Mốc danh tiếng</b><div class="seg">${[[20, '20 · nhanh'], [30, '30 · vừa'], [40, '40 · dài']].map(([x, nm]) => `<button type="button" data-opt="goal" data-v="${x}" aria-pressed="${o.goal === x}" ${dis}>${nm}</button>`).join('')}</div><small>Có người diễn được tới mốc này thì cả gánh diễn thêm 1 đêm cuối rồi tính.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 2; $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt(b.dataset.opt, +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();
// ---------- ván chơi ----------
const nameOf = (v, id) => { const p = v.players.find(x => x.id === id); return p ? esc(cleanName(p.name)) : '?'; };
function draw(v, anim) {
  const me = v.players.find(p => p.id === ui.myId), myTurn = !v.spec && v.phase === 'play' && v.cur === ui.myId;
  $('#round').textContent = v.phase === 'ended' ? '🏁 Hết ván' : `${v.final ? '🌟 Đêm cuối sắp tới · ' : ''}🎪 Đêm ${v.round} · ${v.cur === ui.myId ? 'lượt bạn' : 'lượt ' + (v.players.find(p => p.id === v.cur) || {}).name}`;
  $('#market').innerHTML = `<div class="mk-h"><b>🛒 Chợ thú</b><small>${v.pileN} thẻ còn úp${me && me.disc ? ` · 🐷 giảm ${me.disc}` : ''}</small></div><div class="mk">${v.market.map((c, i) => toon(c, { price: me ? E.hirePrice(v, me, i) : v.prices[i], cls: myTurn && me.left > 0 && me.fame >= E.hirePrice(v, me, i) ? 'can' : 'off', attrs: `data-hire="${i}"` })).join('')}</div>`;
  const shown = look && v.players.find(p => p.id === look) || me || v.players[0];
  $('#seats').innerHTML = v.players.map(p => `<button class="seat${p.id === v.cur ? ' turn' : ''}${p.id === shown.id ? ' on' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" data-look="${p.id}" data-pid="${p.id}">${avatar(p.name, 24)}<span class="nm">${esc(cleanName(p.name))}${p.id === ui.myId ? ' (bạn)' : ''}</span><span class="pt" title="Danh tiếng đêm nay${p.final != null ? ' · đêm cuối' : ''}">${p.final != null ? p.final : p.fame}⭐</span><small>🎴 ${p.deck.length} thú · cao nhất ${p.best}${v.critic === p.id ? ' · 📰 +3' : ''}</small></button>`).join('');
  const mine = shown === me && !v.spec;
  $('#board').innerHTML = `<div class="bd-h"><b>${mine ? '🎭 Sân khấu của bạn' : `🎭 Sân khấu của ${nameOf(v, shown.id)}`}</b><span class="tot">${shown.final != null ? shown.final : shown.fame}⭐${shown.rest ? ` <small>· ${shown.rest} thú chưa lên sân</small>` : ''}</span></div>${stage(shown, mine && myTurn && me.left > 0, anim)}`;
  let msg = '', acts = '';
  if (v.phase === 'ended') { msg = (v.winners || []).includes(ui.myId) ? '🎉 Gánh của bạn nổi tiếng nhất!' : `🏆 ${(v.winners || []).map(id => nameOf(v, id)).join(', ')} thắng!`; acts = `<button class="btn" data-a="deck">🎴 Bộ thú</button>` + (ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button><button class="btn" data-a="lobby">Về phòng chờ</button>' : ''); }
  else if (v.spec) msg = '<small>👀 Bạn đang xem.</small>';
  else if (myTurn) { msg = `Bạn có <b>${me.fame}⭐</b> · còn ${me.left} lượt: chạm thú ở chợ để thuê, hoặc chạm thú trên sân khấu để mời ra (${E.DISMISS}⭐). <small>Danh tiếng không dùng sẽ mất.</small>`; acts = `<button class="btn pri" data-a="done">✅ Xong lượt</button><button class="btn" data-a="deck">🎴 Bộ thú</button>`; }
  else { msg = `<small>Chờ ${nameOf(v, v.cur)} thuê thú…</small>`; acts = `<button class="btn" data-a="deck">🎴 Bộ thú</button>`; }
  if (v.log.length) msg += `<br><small>${esc(v.log[v.log.length - 1])}</small>`;
  $('#msg').innerHTML = msg; $('#acts').innerHTML = acts;
}
function render(v, prev) {
  const anim = !prev || prev.gid !== v.gid || prev.round !== v.round;
  if (prev && prev.gid === v.gid && prev.seq !== v.seq && v.last && !anim) { if (v.last.t === 'hire') beep('hire'); else if (v.last.t === 'dismiss') beep('out'); }
  if (anim) { look = null; beep('show'); }
  draw(v, anim);
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); openResult(v); } } else endShown = null;
}
function openResult(v) {
  const rows = [...v.players].sort((a, b) => b.final - a.final);
  ui.openModal(`<h2>🏆 Đêm diễn cuối</h2><table class="res"><tr><th>Gánh</th><th>Đêm cuối</th><th>Báo khen</th><th>Tổng</th></tr>${rows.map(p => `<tr class="${(v.winners || []).includes(p.id) ? 'win' : ''}"><td>${nameOf(v, p.id)}</td><td>${p.fame}</td><td>${v.critic === p.id ? '+3' : ''}</td><td><b>${p.final}</b></td></tr>`).join('')}</table><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
}
function openDeck(v, p) {
  const by = {}; for (const c of p.deck) by[c.k] = (by[c.k] || 0) + 1;
  ui.openModal(`<h2>🎴 Gánh của ${nameOf(v, p.id)} (${p.deck.length} thú)</h2><div class="dk">${Object.entries(by).sort((a, b) => TOONS[b[0]].rank - TOONS[a[0]].rank).map(([k, n]) => `<div class="dr">${toon({ k, id: k })}<div><b>${esc(TOONS[k].name)} ×${n}</b><small>${TOONS[k].fame}⭐ · bậc ${TOONS[k].rank}${TOONS[k].fx ? ' · ' + esc(TOONS[k].fx) : ''}</small></div></div>`).join('')}</div>${p.out.length ? `<p class="center"><small>Đã mời ra: ${p.out.map(c => TOONS[c.k].icon).join(' ')}</small></p>` : ''}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#market').addEventListener('click', e => {
  const d = e.target.closest('[data-hire]'), v = ui.view; if (!d || !v) return; const i = +d.dataset.hire, c = v.market[i], t = TOONS[c.k], me = v.players.find(p => p.id === ui.myId);
  const info = `${t.icon} ${t.name}: ${t.fame}⭐${t.fx ? ' · ' + t.fx : ''}`;
  if (v.spec || v.cur !== ui.myId || !me || me.left <= 0) return toast(info);
  const cost = E.hirePrice(v, me, i); if (me.fame < cost) return toast(`${info} – cần ${cost}⭐, bạn có ${me.fame}⭐.`);
  ui.act({ type: 'hire', i });
});
$('#board').addEventListener('click', async e => {
  const d = e.target.closest('[data-dis]'), v = ui.view; if (!d || !v) { const t = e.target.closest('.tn'); if (t && t.title) toast(t.title); return; }
  const me = v.players.find(p => p.id === ui.myId), c = me.grid.flat().find(x => x.id === d.dataset.dis); if (!c) return; const t = TOONS[c.k];
  if (c.k === 'voi') return toast('Voi không chịu đi đâu 🐘');
  if (me.fame < E.DISMISS) return toast(`${t.icon} ${t.name}: ${t.fame}⭐${t.fx ? ' · ' + t.fx : ''}. Mời ra cần ${E.DISMISS}⭐.`);
  if (await confirmBox(`Mời ${t.icon} ${t.name} ra khỏi gánh (mất ${E.DISMISS}⭐)? Con này sẽ không lên sân khấu nữa.`)) ui.act({ type: 'dismiss', id: c.id });
});
$('#seats').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (!b || !ui.view) return; look = b.dataset.look; draw(ui.view, false); });
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('button'), v = ui.view; if (!b || !v) return; const a = b.dataset.a;
  if (a === 'done') ui.act({ type: 'done' }); else if (a === 'deck') openDeck(v, v.players.find(p => p.id === (look || ui.myId)) || v.players[0]);
  else if (a === 'again' && ui.isHost) ui.net.raw.start(); else if (a === 'lobby' && ui.isHost) ui.net.raw.restart();
});
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Gánh Xiếc Thú</h2>
    <p><b>Mục tiêu:</b> gánh xiếc nổi tiếng nhất. Ai diễn được <b>${ui.view ? ui.view.opts.goal : 30}⭐</b> trong một đêm thì cả bàn diễn thêm <b>1 đêm cuối</b> – đêm cuối ai nhiều ⭐ nhất thắng (người chạm mốc cao nhất được báo khen +3).</p>
    <h3>Mỗi đêm</h3><ul><li><b>Lật sân khấu:</b> máy xào bộ thú của mỗi người rồi lật lần lượt vào 6 ô (3 trên, 3 dưới). Thú nhiều hơn 6 thì phần còn lại nghỉ đêm đó.</li>
    <li><b>Tính danh tiếng ⭐</b>: cộng ⭐ của các thú ngửa, có tính khả năng ✦ (đứng cạnh nhau, hàng dưới, cột giữa…).</li>
    <li><b>Đi chợ</b> (lần lượt): mỗi người 2 lượt – <b>thuê</b> 1 thú ở chợ (giá ghi trên thẻ: 2·3·5·7·9⭐, con bậc cao nằm bên phải) hoặc <b>mời ra</b> 1 thú đang ngửa trên sân khấu của mình (${E.DISMISS}⭐, gánh phải giữ ít nhất ${E.MIN_KEEP} thú). Danh tiếng không dùng thì <b>mất</b>.</li></ul>
    <h3>Mẹo</h3><ul><li>🦨 Chồn hôi trừ điểm – mời ra sớm, hoặc thuê 🐵 Khỉ nghịch để úp nó xuống.</li><li>Bộ thú gọn thì thú mạnh lên sân thường xuyên hơn.</li><li>Chạm vào ghế người khác để xem sân khấu của họ, nút 🎴 để xem cả gánh.</li></ul>
    <h3>Các con thú</h3><div class="dk">${Object.entries(TOONS).map(([k, t]) => `<div class="dr">${toon({ k, id: k })}<div><b>${esc(t.name)}</b><small>${t.fame}⭐ · bậc ${t.rank}${t.fx ? ' · ' + esc(t.fx) : ''}</small></div></div>`).join('')}</div>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('xiecthu-sound', sound ? '1' : '0'); drawSound(); beep('flip'); };
const ui = gameKit({ game: 'xiecthu', net: NET, onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); }, onState: (v, prev) => { if (v) render(v, prev); else { endShown = null; look = null; } }, offline: h => { h.addBot(); h.addBot(); } });
