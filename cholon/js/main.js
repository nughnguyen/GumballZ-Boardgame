// 🏮 Chợ Lớn – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import * as E from './engine.js?v=1';
import { botAction } from './bot.js?v=1';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
/* 🗺️ Bản đồ kiểu nhìn từ trên xuống: tên đường thật ở Chợ Lớn (Q.5–Q.6), mái nhà trang trí ở ô không bán, màu riêng cho từng loại tiệm */
const STREETS = ['Đ. Tháp Mười', 'Đ. Hải Thượng Lãn Ông', 'Đ. Triệu Quang Phục', 'Đ. Kim Biên', 'Đ. Lương Nhữ Học', 'Đ. Trần Văn Kiểu'];
const VEH = ['🛵', '🚲', '🛺', '🛵', '🚚', '🚲'], ROOF = ['', '🏯', '🌳', '🛕', '⛲', '⚓'];
const SHOP_COL = { tra: '#3f8f5a', anh: '#9bc53d', haisan: '#f08a4b', vang: '#5fb0e0', thuoc: '#2fa39a', may: '#c264b0', mi: '#e2553a', giat: '#9a5a48', doco: '#d9b77a', nhahang: '#f2b035', moc: '#a9743a', taphoa: '#d63a55' };

const NET = makeNet({
  srv: true, /* phòng online do máy chủ giữ ván (server/src/srvhost.js) */
  game: 'cholon', min: 3, max: 5, minMsg: 'Chợ Lớn cần 3–5 người: mời bạn vào phòng hoặc thêm bot.',
  defaults: E.DEFAULT_OPTS, optOk: E.optOk, create: E.createGame, apply: E.applyAction, view: E.viewFor, actors: E.actors,
  bot: botAction, botDelay: s => (s.stage === 'keep' ? 900 : 1300) + Math.random() * 700,
  botNames: ['Mochi', 'Bơ', 'Pudding', 'Kẹo', 'Xôi', 'Đậu'],
});
$('#hero').innerHTML = '<i>🍵</i><i>🏮</i><i>🥟</i>';
let sound = ls.get('cholon-sound') !== '0';
let ac = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    const notes = { tap: [[420, 0, .05]], deal: [[660, 0, .08], [880, .09, .12]], coin: [[988, 0, .07], [1319, .07, .16]], offer: [[523, 0, .08], [659, .09, .12]], end: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .3]] }[kind] || [];
    for (const [f, at, len] of notes) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(.12, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03); }
  } catch (e) {}
}
const tileHTML = (k, cls = '', extra = '') => { const t = E.shop(k); return `<span class="tile ${cls}" data-k="${k}" title="${t.n}: đủ ${t.need} tiệm liền nhau là trọn bộ"><i>${t.e}</i>${t.n} <small>${t.need}</small>${extra}</span>`; };
const money = n => `${n}k`;

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  const o = info.opts, dis = ui.isHost ? '' : 'disabled', n = info.players.length;
  $('#pcount').textContent = `${n}/${info.max} người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.isBot ? ' <small>· bot tập sự</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && n < info.max ? `<div class="row-btns"><button class="btn" id="btn-addbot">+ Thêm bot</button></div><small style="display:block;margin-top:6px;color:var(--muted)">Bot chỉ biết đổi chác đơn giản – game này vui nhất khi đủ người thật để trả giá.</small>` : '';
  $('#opts').innerHTML = `<div class="opt"><b>📅 Số năm buôn bán</b><div class="seg">${[[6, '6 năm (chuẩn)'], [4, '4 năm (nhanh)']].map(([v, nm]) => `<button type="button" data-opt="years" data-v="${v}" aria-pressed="${o.years === v}" ${dis}>${nm}</button>`).join('')}</div><small>Mỗi năm: nhận đất → nhận biển hiệu → mặc cả và dựng tiệm → thu tiền. Hết năm cuối ai nhiều tiền nhất thắng.</small></div>`;
  $('#btn-start').style.display = ui.isHost ? '' : 'none'; $('#btn-start').disabled = n < 3;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return; const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm); else if (b.id === 'btn-addbot') h.addBot(); else if (b.dataset.opt) h.setOpt('years', +b.dataset.v);
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let pick = [], selTile = null, endShown = null, lastYearSeen = '';
const P = (v, id) => v.players.find(p => p.id === id);
const nameOf = (v, id) => { const p = P(v, id); return p ? esc(cleanName(p.name)) : '?'; };
const sideHTML = (v, side) => [...side.lots.map(i => `<span class="lchip">📍${i}${v.built[i] ? ' ' + E.shop(v.built[i]).e : ''}</span>`), ...side.tiles.map(k => tileHTML(k, 'sm')), side.cash ? `<span class="lchip">💵 ${money(side.cash)}</span>` : ''].join('') || '<small>không gì cả</small>';
function render(v, prev) {
  const me = v.me, mine = P(v, me), keepStage = v.stage === 'keep', trade = v.stage === 'trade';
  if (!keepStage) pick = []; pick = pick.filter(i => v.dealt.includes(i)); if (selTile && !(v.tiles[me] || []).includes(selTile)) selTile = null;
  $('#round').textContent = v.phase === 'ended' ? '🏁 Hết ván' : `🏮 Năm ${v.year}/${v.opts.years} · ${keepStage ? 'chọn đất' : 'mặc cả & dựng tiệm'}`;
  // người chơi
  $('#seats').innerHTML = v.players.map(p => `<div class="seat${keepStage ? '' : v.ready[p.id] ? ' ok' : ''}${(v.away || []).includes(p.id) ? ' away' : ''}" style="--pc:${p.color}" data-pid="${p.id}">${avatar(p.name, 28)}<span><span class="nm">${esc(cleanName(p.name))}${p.id === me ? ' (bạn)' : ''}</span><small>${v.cash[p.id] != null ? '💵 ' + money(v.cash[p.id]) + ' · ' : ''}📈 +${v.incomeNow[p.id]}/năm · 🏷️ ${v.tiles[p.id].length}${trade && v.ready[p.id] ? ' · ✅' : ''}</small></span></div>`).join('');
  // bàn
  const full = new Set(); for (const p of v.players) for (const c of E.chains(v, p.id)) if (c.lots.length >= E.shop(c.k).need) c.lots.forEach(i => full.add(i));
  $('#board').innerHTML = E.DISTRICTS.map((nm, d) => `<div class="dist"><span class="st">${STREETS[d]}</span><i class="veh">${VEH[d]}</i><h4>${nm}</h4><div class="dgrid">${d ? `<span class="roof" style="grid-row:${d % 2 ? 1 : 3};grid-column:${d % 3 === 0 ? 1 : 5}">${ROOF[d]}</span>` : ''}${E.LOTS.filter(l => l.d === d).map(l => {
    const o = v.owner[l.id], op = o && P(v, o), k = v.built[l.id], deal = keepStage && v.dealt.includes(l.id) && !v.iKept;
    const cls = ['lot', o ? 'own' : '', o === me ? 'mine' : '', deal ? 'deal' : '', pick.includes(l.id) ? 'pick' : '', k ? 'built' : '', trade && selTile && o === me && !k ? 'can' : '', full.has(l.id) ? 'full' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-lot="${l.id}" style="grid-row:${l.r + 1};grid-column:${l.c + 1};${op ? '--pc:' + op.color : ''}${k ? ';--sc:' + SHOP_COL[k] : ''}" title="Lô ${l.id}${op ? ' – ' + esc(cleanName(op.name)) : ''}${k ? ' – ' + E.shop(k).n : ''}"><span class="no">${l.id}</span>${k ? E.shop(k).e + '<b class="nd">' + E.shop(k).need + '</b>' : ''}</button>`; }).join('')}</div></div>`).join('') + '<div class="canal"><span>⛵</span><b>Kênh Tàu Hủ · Bến Bình Đông</b><span>🚤</span></div>';
  // lời nhắn
  let msg = '';
  if (v.phase === 'ended') msg = `🏁 Hết ${v.opts.years} năm buôn bán!<small>Bấm 🏅 để xem bảng xếp hạng.</small>`;
  else if (!mine) msg = '👀 Bạn đang xem ván này.';
  else if (keepStage) msg = v.iKept ? `Đã chọn đất – chờ mọi người (${v.keptN}/${v.players.length})…` : `📜 Bạn được phát ${v.dealt.length} sổ đất (ô viền đỏ nhấp nháy). Chạm để chọn <b>${Math.min(v.need, v.dealt.length)}</b> lô muốn giữ.<small>Nên giữ các lô nằm cạnh nhau, hoặc lô người khác đang cần để đem đi đổi.</small>`;
  else msg = selTile ? `Chạm một lô trống của bạn (viền xanh) để dựng <b>${E.shop(selTile).n}</b>.<small>Dựng rồi không dời được, nhưng vẫn đổi cả lô cho người khác được.</small>` : `🤝 Tự do mặc cả! Đổi đất, biển hiệu, tiền với bất kỳ ai; chạm biển hiệu bên dưới rồi chạm lô của mình để dựng tiệm.<small>Thu nhập nếu chốt sổ ngay: +${v.incomeNow[me]}k. Xong thì bấm ✅.</small>`;
  $('#msg').innerHTML = msg;
  // biển hiệu của tôi
  const my = (v.tiles[me] || []).slice().sort(), cnt = {}; my.forEach(k => { cnt[k] = (cnt[k] || 0) + 1; });
  $('#tray').innerHTML = !mine || v.phase === 'ended' ? '' : `<b>Biển hiệu của bạn:</b>${Object.keys(cnt).length ? Object.keys(cnt).map(k => tileHTML(k, selTile === k ? 'sel' : '', cnt[k] > 1 ? ` ×${cnt[k]}` : '')).join('') : '<small style="color:var(--muted)">chưa có</small>'}`;
  // lời mời
  $('#offers').innerHTML = v.offers.map(o => { const tome = o.to === me, fromMe = o.from === me;
    return `<div class="offer${tome ? ' tome' : ''}"><b>${nameOf(v, o.from)}</b> mời <b>${nameOf(v, o.to)}</b><div class="row">Đưa: ${sideHTML(v, o.give)}</div><div class="row">Nhận: ${sideHTML(v, o.get)}</div>${tome ? `<button class="btn sm pri" data-a="accept" data-id="${o.id}">🤝 Đồng ý</button><button class="btn sm" data-a="decline" data-id="${o.id}">Không</button><button class="btn sm" data-a="counter" data-id="${o.id}">↩️ Trả giá lại</button>` : fromMe ? `<button class="btn sm" data-a="cancel" data-id="${o.id}">Rút lại</button>` : ''}</div>`; }).join('');
  // nút
  let acts = '';
  if (v.phase === 'ended') acts = `<button class="btn" data-a="sum">🏅 Kết quả</button>${ui.isHost ? '<button class="btn pri" data-a="again">🔁 Ván nữa</button>' : ''}`;
  else if (mine && keepStage && !v.iKept) { const need = Math.min(v.need, v.dealt.length); acts = `<button class="btn pri" data-a="keep" ${pick.length === need ? '' : 'disabled'}>📜 Giữ ${pick.length}/${need} lô</button>`; }
  else if (mine && trade) acts = `<button class="btn" data-a="trade">🤝 Mặc cả…</button><button class="btn ${v.ready[me] ? '' : 'pri'}" data-a="ready">${v.ready[me] ? '↩️ Khoan, chưa xong' : '✅ Xong năm nay'}</button>${ui.isHost ? '<button class="btn" data-a="force" title="Chốt sổ ngay dù còn người chưa bấm xong">⏭</button>' : ''}`;
  $('#acts').innerHTML = acts;
  // âm thanh + báo thu nhập
  if (prev && prev.gid === v.gid) {
    if (v.offers.some(o => o.to === me && !prev.offers.some(x => x.id === o.id))) beep('offer');
    if (prev.stage === 'keep' && trade) beep('deal');
    if (v.income && (!prev.income || prev.income.year !== v.income.year)) { beep('coin'); if (mine) ui.toast(`💰 Hết năm ${v.income.year}: bạn thu ${money(v.income.by[me])}`); }
  }
  if (v.phase === 'ended') { if (endShown !== v.gid) { endShown = v.gid; beep('end'); setTimeout(() => ui.view === v && showSummary(v), 900); } } else endShown = null;
}
$('#board').addEventListener('click', e => {
  const b = e.target.closest('[data-lot]'), v = ui.view; if (!b || !v || v.phase !== 'play') return; const i = +b.dataset.lot, me = v.me;
  if (v.stage === 'keep') { if (v.iKept || !v.dealt.includes(i)) return; const need = Math.min(v.need, v.dealt.length); if (pick.includes(i)) pick = pick.filter(x => x !== i); else if (pick.length < need) pick.push(i); else return ui.toast(`Chỉ giữ được ${need} lô – bỏ chọn bớt một lô trước đã.`); beep('tap'); return render(v, null); }
  if (selTile) { if (v.owner[i] !== me) return ui.toast('Chỉ dựng tiệm trên đất của bạn.'); if (v.built[i]) return ui.toast('Lô này đã có tiệm rồi.'); const k = selTile; if ((v.tiles[me] || []).filter(x => x === k).length <= 1) selTile = null; ui.act({ type: 'place', lot: i, tile: k }); beep('tap'); return; }
  const o = v.owner[i], k = v.built[i]; ui.toast(`Lô ${i} · ${E.DISTRICTS[E.lot(i).d]}${o ? ' · của ' + cleanName(P(v, o).name) : ' · chưa có chủ'}${k ? ' · ' + E.shop(k).n : ''}`);
});
$('#tray').addEventListener('click', e => { const t = e.target.closest('[data-k]'), v = ui.view; if (!t || !v || v.stage !== 'trade') return; selTile = selTile === t.dataset.k ? null : t.dataset.k; render(v, null); });
function onAct(e) {
  const b = e.target.closest('button[data-a]'), v = ui.view; if (!b || !v) return; const a = b.dataset.a, id = +b.dataset.id;
  if (a === 'keep') { ui.act({ type: 'keep', lots: pick.slice() }); pick = []; }
  else if (a === 'ready') ui.act({ type: 'ready', on: !v.ready[v.me] });
  else if (a === 'force') ui.act({ type: 'force' });
  else if (a === 'accept' || a === 'decline' || a === 'cancel') ui.act({ type: a, id });
  else if (a === 'counter') { const o = v.offers.find(o => o.id === id); if (o) openTrade(v, o.from, { give: o.get, get: o.give }, id); }
  else if (a === 'trade') openTrade(v);
  else if (a === 'sum') showSummary(v);
  else if (a === 'again' && ui.isHost) ui.net.raw.start();
}
$('#acts').addEventListener('click', onAct); $('#offers').addEventListener('click', onAct);

// ---------- hộp mặc cả ----------
function openTrade(v, toId = null, init = null, replaceId = null) {
  const me = v.me, others = v.players.filter(p => p.id !== me); let to = toId || others[0].id;
  const st = { give: { lots: new Set(init ? init.give.lots : []), tiles: (init ? init.give.tiles : []).slice(), cash: init ? init.give.cash : 0 }, get: { lots: new Set(init ? init.get.lots : []), tiles: (init ? init.get.tiles : []).slice(), cash: init ? init.get.cash : 0 } };
  const draw = () => {
    const col = (side, pid, title) => { const lots = Object.keys(v.owner).map(Number).filter(i => v.owner[i] === pid).sort((a, b) => a - b), cnt = {}; (v.tiles[pid] || []).forEach(k => { cnt[k] = (cnt[k] || 0) + 1; });
      return `<div><h4>${title}</h4><div class="grp">${lots.map(i => `<button type="button" class="lchip${st[side].lots.has(i) ? ' on' : ''}" data-s="${side}" data-l="${i}">📍${i}${v.built[i] ? ' ' + E.shop(v.built[i]).e : ''}</button>`).join('') || '<small>chưa có đất</small>'}</div>
        <div class="grp">${Object.keys(cnt).map(k => { const n = st[side].tiles.filter(x => x === k).length; return `<button type="button" class="lchip${n ? ' on' : ''}" data-s="${side}" data-t="${k}" data-max="${cnt[k]}">${E.shop(k).e} ${E.shop(k).n}${cnt[k] > 1 || n ? ` ${n}/${cnt[k]}` : ''}</button>`; }).join('') || '<small>không có biển hiệu</small>'}</div>
        <label>💵 Tiền (nghìn)<input type="number" inputmode="numeric" min="0" max="999" data-s="${side}" data-cash value="${st[side].cash || ''}" placeholder="0"></label></div>`; };
    ui.openModal(`<h2>🤝 Mặc cả</h2><div class="seg" style="margin-bottom:10px">${others.map(p => `<button type="button" data-to="${p.id}" aria-pressed="${p.id === to}">${esc(cleanName(p.name))}</button>`).join('')}</div>
      <div class="tr-cols" id="tr-cols">${col('give', me, 'Bạn đưa')}${col('get', to, `${nameOf(v, to)} đưa bạn`)}</div>
      <p style="font-size:13px;color:var(--muted);margin:8px 0 0">Chạm để chọn đất (📍 số lô) và biển hiệu. Lời mời hiện cho cả bàn thấy – cứ chat/nói chuyện để trả giá thêm.</p>
      <div class="btns"><button class="btn pri" id="m-send">📨 Gửi lời mời</button><button class="btn" id="m-close">Huỷ</button></div>`);
    $('#m-close').onclick = ui.closeModal;
    $('#m-send').onclick = () => { const pack = s => ({ lots: [...st[s].lots], tiles: st[s].tiles.slice(), cash: st[s].cash | 0 }); if (replaceId) ui.act({ type: 'decline', id: replaceId }); ui.act({ type: 'offer', to, give: pack('give'), get: pack('get') }); ui.closeModal(); };
    $('#modal-box').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.to) { to = b.dataset.to; st.get = { lots: new Set(), tiles: [], cash: 0 }; return draw(); }
      const s = b.dataset.s; if (!s) return;
      if (b.dataset.l) { const i = +b.dataset.l; st[s].lots.has(i) ? st[s].lots.delete(i) : st[s].lots.add(i); return draw(); }
      if (b.dataset.t) { const k = b.dataset.t, n = st[s].tiles.filter(x => x === k).length; if (n >= +b.dataset.max) st[s].tiles = st[s].tiles.filter(x => x !== k); else st[s].tiles.push(k); return draw(); }
    };
    $('#modal-box').oninput = e => { const i = e.target.closest('[data-cash]'); if (i) st[i.dataset.s].cash = Math.max(0, Math.min(999, Math.floor(+i.value || 0))); };
  };
  draw();
}
function showSummary(v) {
  const r = v.result, me = v.me;
  ui.openModal(`<h2>${r.order[0] === me ? '🏆 Bạn giàu nhất Chợ Lớn!' : `🏆 ${nameOf(v, r.order[0])} giàu nhất Chợ Lớn!`}</h2><ul class="sum">${r.order.map((id, i) => { const p = P(v, id); return `<li class="${i === 0 ? 'win' : ''}" style="--pc:${p.color}">${avatar(p.name)}<span class="nm">${i + 1}. ${esc(cleanName(p.name))}</span><span>💵 ${money(r.cash[id])}</span></li>`; }).join('')}</ul>
    <div class="btns">${ui.isHost ? '<button class="btn pri" id="m-again">🔁 Ván nữa</button>' : ''}<button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal; if ($('#m-again')) $('#m-again').onclick = () => { ui.closeModal(); ui.net.raw.start(); };
}
$('#btn-log').onclick = () => { const v = ui.view; if (!v) return; ui.openModal(`<h2>📜 Nhật ký</h2><ul class="loglist">${v.log.slice().reverse().map(l => `<li>${esc(l)}</li>`).join('') || '<li>Chưa có gì.</li>'}</ul><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`); $('#m-close').onclick = ui.closeModal; };
function openGuide() {
  ui.openModal(`<div class="guide"><h2>📖 Cách chơi Chợ Lớn</h2>
    <p><b>Mục tiêu:</b> sau 6 năm buôn bán, ai nhiều tiền nhất thì thắng. Mỗi người bắt đầu với 50k.</p>
    <h3>Mỗi năm có 4 bước</h3><ul><li><b>Nhận đất:</b> được phát vài sổ đất, chọn giữ lại một phần. Đất giữ lại là của bạn.</li><li><b>Nhận biển hiệu:</b> mỗi người được phát ngẫu nhiên vài biển hiệu tiệm.</li><li><b>Mặc cả &amp; dựng tiệm:</b> tự do đổi đất, biển hiệu, tiền với bất kỳ ai, đổi mấy lần cũng được. Chạm biển hiệu rồi chạm lô trống của mình để dựng tiệm.</li><li><b>Thu tiền:</b> mọi người bấm ✅ Xong thì chốt sổ.</li></ul>
    <h3>Tiền thu mỗi năm</h3><p>Các tiệm <b>cùng loại nằm liền nhau</b> (chung cạnh, cùng khu) trên đất của bạn tạo thành một chuỗi. Con số nhỏ trên biển hiệu là số tiệm cần để chuỗi <b>trọn bộ</b>.</p>
    <table><tr><th>Số tiệm liền nhau</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr><tr><td>Chưa trọn bộ</td><td>10k</td><td>20k</td><td>40k</td><td>60k</td><td>80k</td><td>–</td></tr><tr><td>Trọn bộ ★</td><td>–</td><td>–</td><td>50k</td><td>80k</td><td>110k</td><td>140k</td></tr></table>
    <h3>Mẹo</h3><ul><li>Đất của bạn thường nằm rải rác: hãy đổi lấy lô cạnh nhau.</li><li>Thứ bạn không cần có thể là thứ người khác đang khát – cứ hét giá!</li><li>Tiền của người khác là bí mật tới hết ván.</li></ul>
    <div class="btns"><button class="btn" id="m-close">Đã hiểu</button></div></div>`);
  $('#m-close').onclick = ui.closeModal;
}
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('cholon-sound', sound ? '1' : '0'); drawSound(); beep('tap'); };

const ui = gameKit({
  game: 'cholon', net: NET,
  onLobby: (info, ui, started) => { if (!started) renderLobby(info, ui); },
  onState: (v, prev) => { if (v) render(v, prev); else { pick = []; selTile = null; endShown = null; } },
  offline: h => { h.addBot(); h.addBot(); h.addBot(); },
});
