// 🚢 Bắn Tàu – giao diện. Luật ở engine.js, bot ở bot.js, phòng/mạng dùng shared/net/simplenet.js.
import { SHIPS, SHIP_BY_ID, ITEMS, COINS_START, coordName, area3x3, placeOk, shipCells, randomFleet, createGame, applyAction, actors, viewFor } from './engine.js?v=10';
import { botAction } from './bot.js?v=10';
import { GUIDE_HTML } from './guide.js?v=10';
import { makeNet } from '../../shared/net/simplenet.js?v=52';
import { gameKit, $, esc, ls, avatar, cleanName } from '../../shared/ui/gamekit.js?v=14';
import { toast as tip } from '../../shared/ui/dialog.js?v=10';
import { recordEvent } from '../../shared/ui/stats.js?v=93';
import { stock, useItem } from '../../shared/ui/wallet.js?v=7'; /* 💰 kho ví: vật phẩm mua sẵn ở Cửa hàng */

let sound = ls.get('bantau-sound') !== '0';

const NET = makeNet({
  game: 'bantau', min: 2, max: 2, maxSeats: 10,
  minMsg: 'Cần 2 thuyền trưởng: thêm máy hoặc mời bạn vào phòng.',
  create: createGame, apply: applyAction, view: viewFor, actors, bot: botAction,
  botDelay: () => 800 + Math.random() * 700, botNames: ['Mochi', 'Bơ', 'Pudding', 'Xôi'],
});

// ---------- âm thanh (WebAudio tổng hợp, không file nhạc ngoài) ----------
let ac = null, noiseBuf = null;
function beep(kind) {
  if (!sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    const tone = (f, at, len, type = 'triangle', vol = .13) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(vol, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len);
      o.connect(g).connect(ac.destination); o.start(t + at); o.stop(t + at + len + .03);
    };
    const noise = (at, len, vol = .25, freq = 800) => {
      if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const src = ac.createBufferSource(); src.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
      const g = ac.createGain(); g.gain.setValueAtTime(vol, t + at); g.gain.exponentialRampToValueAtTime(.0001, t + at + len);
      src.connect(f).connect(g).connect(ac.destination); src.start(t + at); src.stop(t + at + len);
    };
    if (kind === 'shoot') { noise(0, .18, .2, 2400); tone(180, 0, .12, 'square', .08); }
    else if (kind === 'miss') { tone(420, 0, .09, 'sine', .1); tone(300, .07, .12, 'sine', .08); }
    else if (kind === 'hit') { noise(0, .25, .3, 1200); tone(120, 0, .25, 'sawtooth', .14); }
    else if (kind === 'sink') { tone(392, 0, .12); tone(311, .12, .12); tone(233, .24, .3); noise(0, .3, .2, 900); }
    else if (kind === 'nuke') { noise(0, .7, .4, 500); tone(60, 0, .7, 'sawtooth', .2); tone(45, .15, .6, 'sine', .2); }
    else if (kind === 'whistle') { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(950, t); o.frequency.exponentialRampToValueAtTime(280, t + .6); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + .62); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .65); }
    else if (kind === 'pop') { noise(0, .14, .22, 1600); tone(100, 0, .14, 'sawtooth', .1); }
    else if (kind === 'radar') { tone(500, 0, .08); tone(700, .08, .08); tone(900, .16, .12); }
    else if (kind === 'trap') { tone(220, 0, .1, 'square', .12); tone(440, .08, .14, 'square', .12); }
    else if (kind === 'turn') { tone(660, 0, .08); tone(880, .08, .1); }
    else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .13, .22)); }
    else if (kind === 'place') { tone(520, 0, .06); }
  } catch (e) {}
}

/* ---------- hình tàu SVG (nhìn từ trên xuống, mũi tàu hướng phải) ---------- */
function shipArtInner(s) {
  const W = s.len * 10;
  const hull = (y0, y1) => `<path d="M1.4 ${y0 + 0.7} L${W - 4.5} ${y0} L${W - 0.5} 5 L${W - 4.5} ${y1} L1.4 ${y1 - 0.7} Q0.3 5 1.4 ${y0 + 0.7} Z" fill="#66798f" stroke="#2a2340" stroke-width=".45"/>`;
  const hi = y => `<path d="M2.6 ${y} L${W - 6} ${y - 0.4}" stroke="#ffffff70" stroke-width=".45" fill="none" stroke-linecap="round"/>`;
  const turret = x => `<circle cx="${x}" cy="5" r="1.2" fill="#46586e" stroke="#2a2340" stroke-width=".3"/><rect x="${x + 0.9}" y="4.78" width="2.7" height=".44" rx=".2" fill="#2f3d4f"/>`;
  const funnel = (x, w = 2.2) => `<rect x="${x}" y="3.8" width="${w}" height="2.4" rx=".4" fill="#8a6d3b" stroke="#2a2340" stroke-width=".3"/>`;
  const bridge = (x, w = 2.8) => `<rect x="${x}" y="4.2" width="${w}" height="1.6" rx=".5" fill="#4d5e73" stroke="#2a2340" stroke-width=".3"/>`;
  if (s.id === 'carrier') return hull(2.2, 7.8) + hi(3.1)
    + `<rect x="4" y="4.15" width="${W - 9}" height="1.7" rx=".6" fill="#8ba2b8"/><line x1="5.5" y1="5" x2="${W - 6}" y2="5" stroke="#dfe9f2" stroke-width=".35" stroke-dasharray="1.6 1.2"/><rect x="${W * 0.64}" y="2.5" width="5.5" height="1.7" rx=".5" fill="#4d5e73" stroke="#2a2340" stroke-width=".3"/><line x1="${W * 0.64 + 2.7}" y1="2.5" x2="${W * 0.64 + 2.7}" y2="1.4" stroke="#2a2340" stroke-width=".35"/>`;
  if (s.id === 'battleship') return hull(2.2, 7.8) + hi(3.1) + turret(9) + turret(23) + funnel(30) + bridge(15.5);
  if (s.id === 'cruiser') return hull(2.2, 7.8) + hi(3.1) + turret(8) + funnel(17) + bridge(12);
  if (s.id === 'submarine') return `<path d="M1.4 4.1 L${W - 4.5} 3.5 L${W - 0.5} 5 L${W - 4.5} 6.5 L1.4 5.9 Q0.4 5 1.4 4.1 Z" fill="#66798f" stroke="#2a2340" stroke-width=".45"/>`
    + `<rect x="12" y="4" width="6" height="2" rx="1" fill="#4d5e73" stroke="#2a2340" stroke-width=".3"/><line x1="15" y1="4" x2="15" y2="2.9" stroke="#2a2340" stroke-width=".35"/><circle cx="6" cy="5" r=".55" fill="#8ba2b8"/><circle cx="24" cy="5" r=".55" fill="#8ba2b8"/>`;
  return hull(2.2, 7.8) + hi(3.1) + turret(6.5) + funnel(12.5, 2); /* destroyer */
}
function shipSVG(s, dir) {
  const inner = shipArtInner(s);
  const vb = `0 0 ${s.len * 10} 10`;
  if (dir === 'h') return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${inner}</svg>`;
  return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style="position:absolute;left:50%;top:50%;width:${s.len * 100}%;height:${100 / s.len}%;transform:translate(-50%,-50%) rotate(90deg)">${inner}</svg>`;
}
function shipPlace(cells) {
  if (!cells || !cells.length) return null;
  const r = Math.floor(cells[0] / 10), c = cells[0] % 10;
  const dir = cells.length > 1 && Math.floor(cells[1] / 10) === r ? 'h' : 'v';
  return { r, c, dir };
}
/* lớp phủ vẽ tàu đã đặt thành 1 hình liền mạch trên lưới (đặt theo ô bằng grid) */
function shipLayerHTML(fleetObj, sunkIds = []) {
  const out = [];
  for (const s of SHIPS) {
    const cells = fleetObj[s.id] || [];
    if (!cells.length) continue;
    const p = shipPlace(cells);
    const area = p.dir === 'h' ? `grid-column:${p.c + 1} / span ${s.len};grid-row:${p.r + 1}` : `grid-column:${p.c + 1};grid-row:${p.r + 1} / span ${s.len}`;
    const sunk = sunkIds.includes(s.id);
    out.push(`<div class="ship-svg${sunk ? ' sunk' : ''}" data-ship="${s.id}" style="${area}">${shipSVG(s, p.dir)}${sunk ? '<span class="wreck-smoke">💨</span>' : ''}</div>`);
  }
  return out.length ? `<div class="ship-layer">${out.join('')}</div>` : '';
}
/* dấu bắn trên các ô có tàu (vẽ trên lớp tàu để không bị tàu che) */
function markLayerHTML(v) {
  const onShip = new Set(Object.values(v.you.fleet).flat());
  const out = [];
  for (let n = 0; n < 100; n++) {
    if (!onShip.has(n)) continue;
    let cls = '', ch = '';
    if (v.you.hits.includes(n)) { cls = 'mk-hit'; ch = pendingMarksOwn.has(n) ? '💥' : '✖'; }
    else if (v.foe.shots[n] === 'void') { cls = 'mk-trap'; ch = '🪤'; }
    else if (v.you.traps.some(t => t.cell === n && !t.used)) { cls = 'mk-trap'; ch = '🪤'; }
    if (!cls) continue;
    out.push(`<span class="${cls}" style="grid-column:${n % 10 + 1};grid-row:${Math.floor(n / 10) + 1}">${ch}</span>`);
  }
  return out.length ? `<div class="mark-layer">${out.join('')}</div>` : '';
}

// ---------- phòng chờ ----------
function renderLobby(info, ui) {
  $('#pcount').textContent = `${info.players.length}/2 người`;
  $('#plist').innerHTML = info.players.map(p => `<li class="${p.connected ? '' : 'off'}" data-id="${p.id}">${avatar(p.name)}<span class="nm">${esc(cleanName(p.name))}${p.local ? ' <small>· cùng máy</small>' : p.id === 'host' ? ' <small>· chủ phòng</small>' : p.isBot ? ' <small>· máy</small>' : ''}</span>${ui.isHost && p.id !== 'host' ? `<button class="x" data-rm="${p.id}" aria-label="Mời ${esc(p.name)} ra">✕</button>` : ''}</li>`).join('');
  $('#add-box').innerHTML = ui.isHost && info.players.length < 2 ? '<div class="row-btns"><button class="btn" id="btn-addbot">🤖 Thêm máy</button></div>' : '';
  $('#btn-start').style.display = ui.isHost ? '' : 'none';
  $('#btn-start').disabled = info.players.length < 2;
  $('#wait-msg').style.display = ui.isHost ? 'none' : '';
}
$('#screen-lobby').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !ui.net || !ui.isHost) return;
  const h = ui.net.raw;
  if (b.dataset.rm) h.removePlayer(b.dataset.rm);
  else if (b.id === 'btn-addbot') h.addBot();
});
$('#btn-start').onclick = () => ui.isHost && ui.net.raw.start();

// ---------- ván chơi ----------
let cur = null, endShown = null, lastFx = '';
let pendingStock = null; /* 💰 đang chờ xác nhận lấy vật phẩm từ kho ví: { item, before } */
/* ---------- theo dõi thành tựu Bắn Tàu (ghi vào shared/ui/stats.js) ---------- */
let achStreak = 0, achGid = '', achFlawlessGid = '';
/* export để test được trực tiếp trong trình duyệt (import lại cùng module) */
export function trackAch(v, prev) {
  if (!v || v.phase === 'setup') return;
  const me = v.me;
  if (v.gid !== achGid) { achGid = v.gid; achStreak = 0; } /* ván mới: chuỗi trúng tính lại từ đầu */
  if (v.turn !== me) achStreak = 0; /* hết lượt mình thì chuỗi trúng reset */
  const ls = v.lastShot;
  if (ls && ls.by === me && (!prev || !prev.lastShot || prev.lastShot.n !== ls.n || prev.lastShot.cell !== ls.cell || prev.lastShot.res !== ls.res)) {
    if (ls.res === 'hit' || ls.res === 'sink') { achStreak++; if (achStreak >= 3) recordEvent('bantau', 'hit', { streak: achStreak }); }
    else if (ls.res === 'miss' || ls.res === 'void') achStreak = 0;
  }
  const sunkNow = (v.you.sunk || []).length, sunkPrev = prev ? (prev.you.sunk || []).length : 0;
  if (sunkNow > sunkPrev) { for (let i = sunkPrev; i < sunkNow; i++) recordEvent('bantau', 'sink', { gid: v.gid }); }
  if (v.lastNuke && (!prev || !prev.lastNuke || prev.lastNuke.n !== v.lastNuke.n) && sunkNow > sunkPrev) recordEvent('bantau', 'nukesink');
  if (prev) {
    if (!prev.you.radarUsed && v.you.radarUsed) {
      recordEvent('bantau', 'item', { item: 'radar' });
      const sc = v.you.scans[v.you.scans.length - 1];
      if (sc && sc.hasShip) recordEvent('bantau', 'radarhit');
    }
    if (!prev.you.nukeUsed && v.you.nukeUsed) recordEvent('bantau', 'item', { item: 'nuke' });
    if ((v.you.traps || []).length > (prev.you.traps || []).length) recordEvent('bantau', 'item', { item: 'trap' });
    const usedNow = (v.you.traps || []).filter(t => t.used).length, usedPrev = (prev.you.traps || []).filter(t => t.used).length;
    if (usedNow > usedPrev) recordEvent('bantau', 'traptrigger');
  }
  if (v.phase === 'ended' && v.winner === me && (v.you.hits || []).length === 0 && achFlawlessGid !== v.gid) { achFlawlessGid = v.gid; recordEvent('bantau', 'flawless'); }
}
/* ô đang nổ (chưa hiện dấu): 💥 hiện trước, X/O hiện sau khi nổ xong.
   TÁCH 2 set theo lưới — 1 set chung sẽ làm 💥 hiện trên CẢ 2 lưới cùng tọa độ
   (lỗi bom: 9 ô nổ hiện cả ở biển mình lẫn lưới mục tiêu). */
const pendingMarksTgt = new Set(); /* lưới mục tiêu (biển địch) */
const pendingMarksOwn = new Set(); /* biển của mình */
const pmFor = own => own ? pendingMarksOwn : pendingMarksTgt;
/* ô bom vừa nổ (giữ hiệu ứng nổ đủ 800ms/600ms): render() vẽ lại lưới nên KHÔNG
   thêm class trực tiếp vào DOM như trước — class đó bị lần render sau xóa mất
   (chỉ ô cuối giữ đủ 800ms). Đưa vào Map, cellCls() sẽ gắn class lúc vẽ. */
const nukeFxTgt = new Map(); /* lưới mục tiêu: cell → 'nuke-boom' | 'nuke-miss' */
const nukeFxOwn = new Map(); /* biển của mình: cell → 'nuke-boom' | 'nuke-miss' */
const nukeFxFor = own => own ? nukeFxOwn : nukeFxTgt;
/* ô radar đã lộ nhưng chưa tới lúc sáng lên (chờ quét xong) */
const pendingReveal = new Set();
/* log đã hiện toast (chống trùng khi render lại) */
const shownLog = new Set();
let toastGid = '';
let fleet = {}, selShip = 'carrier', dir = 'h', mode = null; /* mode: 'radar' | 'nuke' | 'trap' | null */
const myId = () => (cur && cur.me) || null;
const isMyTurn = v => v.phase === 'battle' && v.turn === myId();
const takenSet = () => new Set(Object.values(fleet).flat());
const placedCount = () => Object.values(fleet).filter(c => c && c.length).length;

function cellCls(n, v, own) {
  const cls = ['cell'];
  const pending = pmFor(own).has(n);
  const fx = nukeFxFor(own).get(n);
  if (fx) cls.push(fx); /* ô bom vừa nổ: giữ hiệu ứng đủ 800ms/600ms qua các lần render */
  if (own) {
    if (v.you.hits.includes(n)) { if (!pending) cls.push('hit'); }
    else if ((v.foe.shots[n] === 'miss')) cls.push('miss');
    else if (v.foe.shots[n] === 'void') cls.push('void');
    if (pending) cls.push('boom');
    if (v.you.traps.some(t => t.cell === n && !t.used)) cls.push('trap');
  } else {
    const st = v.you.shots[n];
    if (pending) cls.push('boom'); /* đang nổ: chưa hiện X/O */
    else if (st === 'hit') cls.push(v.you.sunkCells.includes(n) ? 'sunk' : 'hit');
    else if (st === 'miss') cls.push('miss');
    else if (st === 'void') cls.push('void');
    else if (v.you.reveals[n] === 'ship') cls.push('reveal-ship');
    else if (v.you.reveals[n] === 'water') cls.push('reveal-water');
    const lastScan = v.you.scans[v.you.scans.length - 1];
    if (lastScan && lastScan.cells.includes(n)) cls.push('scanned');
    /* radar đã lộ đúng ô có thuyền (chưa bắn, chưa tới lúc sáng thì chờ) */
    if (!st && !pendingReveal.has(n) && v.you.scans.some(sc => (sc.shipCells || []).includes(n))) cls.push('radar-reveal');
  }
  return cls.join(' ');
}
function gridHTML(v, own) {
  const letters = 'ABCDEFGHIJ';
  let cells = '';
  for (let n = 0; n < 100; n++) {
    const onShip = own && SHIPS.some(s => (v.you.fleet[s.id] || []).includes(n));
    const mark = pmFor(own).has(n) ? '💥' /* đang nổ: chưa hiện dấu */
      : onShip ? '' /* dấu trên ô có tàu vẽ ở lớp mark-layer để không bị tàu che */
      : own
      ? (v.you.hits.includes(n) ? '✖' : v.foe.shots[n] === 'miss' ? '○' : v.foe.shots[n] === 'void' ? '🪤' : v.you.traps.some(t => t.cell === n && !t.used) ? '🪤' : '')
      : (v.you.shots[n] === 'hit' ? '✖' : v.you.shots[n] === 'miss' ? '○' : v.you.shots[n] === 'void' ? '🪤' : v.you.reveals[n] === 'ship' ? '👁' : v.you.reveals[n] === 'water' ? '≈' : '');
    cells += `<button type="button" class="${cellCls(n, v, own)}" data-cell="${n}" aria-label="${coordName(n)}">${mark}</button>`;
  }
  /* lưới mục tiêu: vẽ nguyên hình tàu địch ĐÃ chìm (cháy đen, bốc khói) đúng vị trí/loại */
  const sunkShown = (!own && v.foe.sunkShips) ? v.foe.sunkShips.filter(x => !pendingWrecks.has(x.id)) : [];
  const sunkLayer = sunkShown.length ? shipLayerHTML(Object.fromEntries(sunkShown.map(x => [x.id, x.cells])), sunkShown.map(x => x.id)) : '';
  /* lưới mình: tàu cháy hỏng là tàu của mình mà địch đã chìm (không phải tàu mình đã chìm của địch) */
  const layers = own ? shipLayerHTML(v.you.fleet, sunkOfMe(v).filter(id => !pendingWrecks.has(id))) + markLayerHTML(v) : sunkLayer;
  return `<div class="axis-left">${[...letters].map(l => `<span>${l}</span>`).join('')}</div><div class="ship-grid">${cells}${layers}</div><div class="axis-bottom">${Array.from({ length: 10 }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>`;
}
function setupGridHTML() {
  const letters = 'ABCDEFGHIJ';
  let cells = '';
  for (let n = 0; n < 100; n++) {
    cells += `<button type="button" class="cell" data-cell="${n}" aria-label="${coordName(n)}"></button>`;
  }
  return `<div class="axis-left">${[...letters].map(l => `<span>${l}</span>`).join('')}</div><div class="ship-grid">${cells}${shipLayerHTML(fleet)}</div><div class="axis-bottom">${Array.from({ length: 10 }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>`;
}
function trayHTML() {
  return SHIPS.map(s => {
    const cells = fleet[s.id] || [];
    const done = cells.length === s.len;
    return `<button type="button" class="tray-ship${done ? ' done' : ''}${selShip === s.id ? ' sel' : ''}" data-ship="${s.id}" title="${s.name} (${s.len} ô)" style="--sc:${s.color}">
      <span class="t-art">${shipSVG(s, 'h')}</span><span class="t-nm">${s.short}<small>${s.len} ô${done ? ' · đã đặt ✓' : ''}</small></span></button>`;
  }).join('');
}
function shopHTML(v) {
  const y = v.you;
  return `<div class="shop-head">🛒 Cửa hàng · <b class="coins">🪙 ${y.coins} xu</b></div><div class="shop-items">${Object.values(ITEMS).map(it => {
    const owned = y.bought[it.id], used = it.id === 'radar' ? y.radarUsed : it.id === 'nuke' ? y.nukeUsed : 0;
    const left = it.max - owned, canBuy = left > 0 && y.coins >= it.price;
    const canUse = owned > 0 && !used && (it.id !== 'trap' || owned - y.traps.length > 0);
    const using = mode === it.id;
    const stk = stock('bt-' + it.id); /* vật phẩm mua sẵn ở Cửa hàng, nằm trong kho ví */
    return `<div class="shop-item${using ? ' using' : ''}"><span class="s-ic">${it.icon}</span><span class="s-nm">${it.name}<small>${it.price} xu · còn ${left}/${it.max}${it.id === 'trap' ? ` · đã đặt ${y.traps.length}` : ''}</small></span>
      <button class="btn sm" data-buy="${it.id}" ${canBuy ? '' : 'disabled'}>Mua</button>${stk > 0 ? `<button class="btn sm" data-stock="${it.id}" ${left > 0 ? '' : 'disabled'}>📦 Kho (${stk})</button>` : ''}
      <button class="btn sm ${using ? 'pri' : ''}" data-use="${it.id}" ${canUse && isMyTurn(v) ? '' : 'disabled'}>${using ? 'Đang chọn…' : 'Dùng'}</button></div>`;
  }).join('')}</div><p class="shop-note">Trúng +50 xu · chìm tàu +100 xu. Bắn trúng được bắn tiếp, trượt thì đổi lượt. Dùng Bẫy/Radar/Bom là hết lượt (dù trước đó có bắn trúng); mua vật phẩm không tốn lượt. Có vật phẩm trong kho ví (mua sẵn ở 🛍️ Cửa hàng) thì bấm “📦 Kho” để lấy miễn phí, không tốn xu trong trận.</p>`;
}
/* tàu địch đã chìm nhưng chưa tới lúc hiện nguyên hình (chờ nổ xong) */
const pendingWrecks = new Set();
/* tàu của mình đã bị địch chìm (sunk của địch = tàu mình mất) */
const sunkOfMe = v => (v.players.find(p => p.id !== v.me) || { sunk: [] }).sunk;
const sunkOf = (vv, pid) => (((vv.players || []).find(p => p.id === pid) || {}).sunk || []);

/* ---------- lập lịch hiệu ứng TRƯỚC khi vẽ lưới (để giấu dấu tới lúc nổ xong) ---------- */
function planFx(v, prev) {
  if (!prev || !v.lastShot) return;
  const ls = v.lastShot, pls = prev.lastShot;
  const isNewShot = !pls || pls.n !== ls.n || pls.cell !== ls.cell || pls.res !== ls.res || pls.by !== ls.by;
  if (isNewShot && (ls.res === 'hit' || ls.res === 'sink')) {
    /* nổ 1 ô: 💥 hiện trước, X hiện sau ~450ms — chỉ trên lưới bị bắn
       (mình bắn địch → lưới mục tiêu; địch bắn mình → biển của mình) */
    const pm = ls.by === v.me ? pendingMarksTgt : pendingMarksOwn;
    pm.add(ls.cell);
    setTimeout(() => { pm.delete(ls.cell); if (cur) render(cur, cur); }, 450);
  }
  if (isNewShot && ls.res === 'sink' && ls.ship) {
    /* chìm tàu: vụ nổ lớn xong (~950ms) mới hiện nguyên hình tàu cháy */
    pendingWrecks.add(ls.ship);
    setTimeout(() => { pendingWrecks.delete(ls.ship); if (cur) render(cur, cur); }, 950);
  }
  if (isNewShot && (ls.res === 'radar-hit' || ls.res === 'radar-miss')) {
    /* radar: các ô có thuyền chỉ sáng lên SAU khi quét xong (~2000ms = 1 vòng quét) */
    const sc = v.you.scans[v.you.scans.length - 1];
    if (sc && sc.shipCells) {
      sc.shipCells.forEach(n => pendingReveal.add(n));
      setTimeout(() => { sc.shipCells.forEach(n => pendingReveal.delete(n)); if (cur) render(cur, cur); }, 2000);
    }
  }
  const ln = v.lastNuke, pln = prev.lastNuke;
  if (ln && (!pln || pln.n !== ln.n)) {
    /* bom: 9 ô nổ LẦN LƯỢT sau khi bom rơi xuống (~650ms), mỗi ô cách nhau 120ms.
       Chỉ hiện trên lưới bị ném bom (mình ném → lưới mục tiêu; địch ném → biển mình) */
    const mine = ln.by === v.me;
    const pm = mine ? pendingMarksTgt : pendingMarksOwn;
    const nukeFx = mine ? nukeFxTgt : nukeFxOwn;
    ln.cells.forEach(n => pm.add(n));
    const newSunk = [...sunkOf(v, v.me).filter(id => !sunkOf(prev, prev.me).includes(id)),
      ...(prev.foe && v.foe ? sunkOf(v, v.foe.id).filter(id => !sunkOf(prev, prev.foe.id).includes(id)) : [])];
    newSunk.forEach(id => pendingWrecks.add(id));
    ln.cells.forEach((n, i) => {
      setTimeout(() => {
        pm.delete(n);
        /* ghi hiệu ứng nổ vào Map TRƯỚC khi render để cellCls() gắn class lúc vẽ —
           render lần sau không xóa được nữa, ô nào cũng giữ đủ 800ms/600ms */
        const res = (ln.res || [])[i];
        let dur = 0;
        if (res === 'hit' || res === 'sink') { nukeFx.set(n, 'nuke-boom'); beep('pop'); dur = 800; }
        else if (res === 'miss') { nukeFx.set(n, 'nuke-miss'); dur = 600; }
        if (dur) setTimeout(() => { nukeFx.delete(n); if (cur) render(cur, cur); }, dur);
        if (!cur) return;
        render(cur, cur);
      }, 650 + i * 120);
    });
    setTimeout(() => { newSunk.forEach(id => pendingWrecks.delete(id)); if (cur) render(cur, cur); }, 650 + ln.cells.length * 120 + 150);
  }
}
/* quả bom rơi từ trên trời xuống ô mục tiêu */
function nukeBombFx(grid, cell) {
  if (!grid) return;
  const el = grid.querySelector(`[data-cell="${cell}"]`);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const b = document.createElement('div');
  b.className = 'nuke-bomb';
  b.textContent = '💣';
  b.style.left = (r.left + r.width / 2) + 'px';
  b.style.top = (r.top + r.height / 2) + 'px';
  document.body.append(b);
  beep('whistle');
  setTimeout(() => {
    b.remove();
    const boards = document.querySelector('#boards');
    if (boards) { boards.classList.add('shake'); setTimeout(() => boards.classList.remove('shake'), 600); }
    beep('nuke');
  }, 680);
}
/* đĩa radar quét kiểu Uiverse giant-lion-34 trên vùng 3×3 quanh ô tâm:
   vệt quạt xanh xoay 1 vòng/2s rồi biến mất, đúng lúc các ô lộ sáng lên */
function radarSweepFx(grid, centerCell) {
  if (!grid) return;
  const g = grid.querySelector('.ship-grid');
  if (!g) return;
  const cells = area3x3(centerCell);
  const rows = cells.map(n => Math.floor(n / 10)), cols = cells.map(n => n % 10);
  const r0 = Math.min(...rows), r1 = Math.max(...rows), c0 = Math.min(...cols), c1 = Math.max(...cols);
  const layer = document.createElement('div');
  layer.className = 'fx-layer';
  layer.innerHTML = `<div class="radar-sweep" style="grid-column:${c0 + 1} / span ${c1 - c0 + 1};grid-row:${r0 + 1} / span ${r1 - r0 + 1}"><div class="radar-ring"></div></div>`;
  g.append(layer);
  setTimeout(() => layer.remove(), 2000);
}
/* vụ nổ LỚN khi chìm tàu: từng ô của tàu nổ lệch nhau + rung mạnh */
function sinkFx(boards, grid, v) {
  const shipId = v.lastShot.ship;
  if (!shipId) return;
  const mine = v.lastShot.by === v.me;
  const cells = mine
    ? ((v.foe.sunkShips || []).find(x => x.id === shipId) || {}).cells || []
    : (v.you.fleet[shipId] || []);
  boards.classList.add('shake');
  setTimeout(() => boards.classList.remove('shake'), 900);
  cells.forEach((n, i) => {
    setTimeout(() => {
      const el = grid && grid.querySelector(`[data-cell="${n}"]`);
      if (el) { el.classList.add('sink-boom'); setTimeout(() => el.classList.remove('sink-boom'), 1000); }
    }, i * 80);
  });
  /* trên lưới của mình, tàu còn vẽ nguyên hình – cho cả con tàu rung/nổ theo */
  const shipEl = grid && grid.querySelector(`.ship-layer [data-ship="${shipId}"]`);
  if (shipEl) { shipEl.style.animation = 'bt-sinkboom .95s ease'; setTimeout(() => { shipEl.style.animation = ''; }, 1000); }
}

function render(v, prev) {
  cur = v;
  if (pendingStock && v.you && prev && prev.you) { const now = (v.you.bought || {})[pendingStock.item] || 0; if (now > pendingStock.before) useItem('bt-' + pendingStock.item); pendingStock = null; } /* 💰 kho ví: trừ 1 khi lượt xem sau xác nhận vật phẩm đã vào tay (lấy bằng xu thì không trừ) */
  trackAch(v, prev); /* ghi sự kiện thành tựu Bắn Tàu (chìm tàu, chuỗi trúng, vật phẩm…) */
  planFx(v, prev); /* lập lịch giấu dấu/hiện tàu chìm TRƯỚC khi vẽ lưới */
  const me = v.players.find(p => p.id === v.me), foe = v.players.find(p => p.id !== v.me);
  const turnP = v.players.find(p => p.id === v.turn);
  $('#round').innerHTML = v.phase === 'setup' ? '⚓ Xếp tàu – kéo tàu vào biển của bạn'
    : v.phase === 'ended' ? `🏁 ${v.winner === v.me ? 'Bạn thắng! 🎉' : (v.players.find(p => p.id === v.winner) || {}).name + ' thắng!'}`
    : `⚔️ Lượt ${v.turnNo} · ${turnP ? (turnP.id === v.me ? 'tới lượt bạn!' : 'đang chờ ' + cleanName(turnP.name) + ' bắn…') : ''}`;
  $('#seats').innerHTML = v.players.map(p => {
    const mine = p.id === v.me;
    return `<div class="seat${p.id === v.turn && v.phase === 'battle' ? ' on' : ''}">${avatar(p.name, 40)}<b>${esc(cleanName(p.name))}${mine ? ' (bạn)' : ''}</b>
      <small>🪙 ${p.coins} xu · 💥 đã chìm ${p.sunk.length}/5 tàu địch${p.ready ? ' · ✅ sẵn sàng' : ''}</small></div>`;
  }).join('');
  const boards = $('#boards'), acts = $('#acts');
  if (v.phase === 'setup') {
    boards.innerHTML = `<div class="board-wrap"><h3>⚓ Biển của bạn <small>– kéo tàu từ khay vào biển, hoặc bấm tàu rồi bấm ô để đặt</small></h3>${setupGridHTML()}
      <div class="tray">${trayHTML()}</div></div>
      <div class="board-wrap dim"><h3>🎯 Lưới mục tiêu <small>– hiện sau khi bắt đầu</small></h3>${gridHTML({ ...v, you: { ...v.you, shots: {}, reveals: {}, scans: [], sunkCells: [] }, foe: { shots: {} } }, false)}</div>`;
    acts.innerHTML = `<button class="btn" data-act="rotate">🔄 Xoay (${dir === 'h' ? 'ngang' : 'dọc'})</button>
      <button class="btn" data-act="random">🎲 Ngẫu nhiên</button>
      <button class="btn" data-act="clear">🧹 Xóa</button>
      <button class="btn big pri" data-act="ready" ${placedCount() === 5 ? '' : 'disabled'}>⚓ Sẵn sàng (${placedCount()}/5 tàu)</button>`;
    $('#shop').innerHTML = '';
    $('#hostbar').innerHTML = '';
  } else {
    boards.innerHTML = `<div class="board-wrap"><h3>⚓ Biển của bạn <small>– ${esc(cleanName(me.name))} · ${v.you.hits.length}/17 ô đã trúng</small></h3>${gridHTML(v, true)}</div>
      <div class="board-wrap"><h3>🎯 Lưới mục tiêu <small>– ${esc(cleanName(foe.name))} · đã chìm ${v.you.sunk.length}/5 tàu</small></h3>${gridHTML(v, false)}</div>`;
    $('#shop').innerHTML = v.phase === 'battle' ? shopHTML(v) : '';
    if (v.phase === 'ended') {
      acts.innerHTML = ui.isHost
        ? '<button class="btn big pri" data-a="again">🔁 Chơi ván mới</button><button class="btn" data-a="lobby">Về phòng chờ</button>'
        : '<button class="btn" data-a="lobby">Về phòng chờ</button>';
      $('#hostbar').innerHTML = '';
      if (endShown !== v.gid) { endShown = v.gid; beep('win'); const wName = (v.players.find(p => p.id === v.winner) || {}).name; ui.openModal(`<h2>${v.winner === v.me ? '🏆 Bạn thắng!' : '🏆 ' + esc(cleanName(wName)) + ' thắng!'}</h2><p style="text-align:center">${v.winner === v.me ? 'Đã chìm hết 5 tàu địch – hạm đội của bạn làm chủ mặt biển! 🌊' : 'Đã chìm hết 5 tàu của bạn – hạm đội của ' + esc(cleanName(wName)) + ' làm chủ mặt biển. Chơi ván mới gỡ lại nào! 🌊'}</p><div class="btns"><button class="btn" id="m-close">Đóng</button></div>`); $('#m-close').onclick = ui.closeModal; }
    } else {
      endShown = null;
      acts.innerHTML = mode === 'radar' ? '<span class="hint">📡 Đang chọn tâm quét – bấm 1 ô trên lưới mục tiêu (vùng 3×3).</span><button class="btn" data-act="cancel-mode">Hủy</button>'
        : mode === 'nuke' ? '<span class="hint">☢️ Đang chọn tâm nổ – bấm 1 ô trên lưới mục tiêu (nổ 3×3).</span><button class="btn" data-act="cancel-mode">Hủy</button>'
        : mode === 'trap' ? '<span class="hint">🪤 Đang gài bẫy – bấm 1 ô có tàu trên biển của bạn.</span><button class="btn" data-act="cancel-mode">Hủy</button>'
        : isMyTurn(v) ? `<span class="hint">${v.lastShot && v.lastShot.by === v.me && (v.lastShot.res === 'hit' || v.lastShot.res === 'sink') ? '🎯 Bắn trúng! Bạn được bắn tiếp — bắn nữa đi!' : '🎯 Lượt của bạn – bấm 1 ô trên lưới mục tiêu để bắn!'}</span>`
        : '<span class="hint">⏳ Đang chờ đối thủ bắn…</span>';
      $('#hostbar').innerHTML = '';
    }
  }
  /* hiệu ứng + âm thanh khi có phát bắn / bom / radar mới */
  const fxKey = `${v.gid}|${v.lastShot ? v.lastShot.n + ':' + v.lastShot.by + ':' + v.lastShot.cell + ':' + v.lastShot.res : ''}|${v.lastNuke ? v.lastNuke.n : ''}`;
  if (fxKey !== lastFx) {
    lastFx = fxKey;
    if (prev && v.lastShot && (!prev.lastShot || prev.lastShot.n !== v.lastShot.n || prev.lastShot.cell !== v.lastShot.cell || prev.lastShot.res !== v.lastShot.res)) {
      const mine = v.lastShot.by === v.me;
      const wraps = boards.querySelectorAll('.board-wrap');
      const grid = mine ? wraps[1] : wraps[0];
      const cellEl = grid && grid.querySelector(`[data-cell="${v.lastShot.cell}"]`);
      if (v.lastShot.res === 'nuke') { nukeBombFx(grid, v.lastShot.cell); /* bom rơi, 9 ô nổ lần lượt do planFx */ }
      else if (v.lastShot.res === 'radar-hit' || v.lastShot.res === 'radar-miss') { radarSweepFx(grid, v.lastShot.cell); beep('radar'); }
      else if (v.lastShot.res === 'void') { if (cellEl) cellEl.classList.add('boom'); beep('trap'); }
      else if (v.lastShot.res === 'sink') { sinkFx(boards, grid, v); beep('sink'); }
      else if (v.lastShot.res === 'hit') {
        if (cellEl) { cellEl.classList.add('boom'); boards.classList.add('shake'); setTimeout(() => boards.classList.remove('shake'), 500); }
        beep('hit');
      } else if (v.lastShot.res === 'miss') { if (cellEl) cellEl.classList.add('splash'); beep('miss'); }
      else beep('shoot');
    }
    if (prev && v.turn !== (prev.turn || null) && isMyTurn(v) && v.phase === 'battle') beep('turn');
  }
  /* toast: chìm tàu / dùng vật phẩm – lấy từ log (cả 2 bên đều thấy), không ghi thêm vào log */
  if (v.gid !== toastGid) { toastGid = v.gid; shownLog.clear(); v.log.forEach(l => shownLog.add(l.text)); }
  else {
    const fresh = v.log.filter(l => (l.kind === 'sink' || l.kind === 'trap' || l.kind === 'radar' || l.kind === 'nuke') && !shownLog.has(l.text));
    fresh.forEach(l => shownLog.add(l.text));
    if (fresh.length) tip(fresh[fresh.length - 1].text, 3600);
  }
  if (v.phase === 'setup') paintFootprint();
}

/* ---------- kéo thả tàu từ khay vào biển + xem trước footprint ---------- */
let drag = null, hoverCell = null, justDragged = false;
const DRAG_PX = 7;
function ownGrid() { const w = $('#boards').querySelectorAll('.board-wrap'); return w.length ? w[0].querySelector('.ship-grid') : null; }
function cellAtPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const b = el && el.closest ? el.closest('[data-cell]') : null;
  if (!b) return null;
  const wraps = $('#boards').querySelectorAll('.board-wrap');
  if (!wraps.length || b.closest('.board-wrap') !== wraps[0]) return null; /* chỉ biển của mình */
  return +b.dataset.cell;
}
/* chỉ highlight đúng footprint (độ dài tàu từ ô đang trỏ theo hướng hiện tại), xanh/đỏ theo placeOk */
function paintFootprint() {
  const grid = ownGrid();
  if (!grid || !cur || cur.phase !== 'setup') return;
  grid.querySelectorAll('.pv-ok,.pv-bad').forEach(x => x.classList.remove('pv-ok', 'pv-bad'));
  const active = (drag && drag.active) ? { id: drag.shipId, start: drag.over }
    : (selShip && !(fleet[selShip] || []).length && hoverCell != null ? { id: selShip, start: hoverCell } : null);
  if (!active || active.start == null) return;
  const s = SHIP_BY_ID[active.id];
  const ok = placeOk(active.start, dir, s.len, takenSet());
  shipCells(active.start, dir, s.len).forEach(n => {
    const el = grid.querySelector(`[data-cell="${n}"]`);
    if (el) el.classList.add(ok ? 'pv-ok' : 'pv-bad');
  });
}
function updateDragPos(x, y) {
  if (!drag || !drag.active) return;
  drag.lastX = x; drag.lastY = y;
  const cell = cellAtPoint(x, y);
  drag.over = cell;
  const s = SHIP_BY_ID[drag.shipId];
  const grid = ownGrid();
  const cellPx = grid ? grid.getBoundingClientRect().width / 10 : 40;
  const g = drag.ghost;
  const w = dir === 'h' ? s.len * cellPx : cellPx, h = dir === 'h' ? cellPx : s.len * cellPx;
  if (cell != null) {
    const el = grid.querySelector(`[data-cell="${cell}"]`);
    const r = el.getBoundingClientRect();
    g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
  } else {
    g.style.left = (x - w / 2) + 'px'; g.style.top = (y - h / 2) + 'px';
  }
  g.style.width = w + 'px'; g.style.height = h + 'px';
  g.innerHTML = shipSVG(s, dir);
  const ok = cell != null && placeOk(cell, dir, s.len, takenSet());
  g.classList.toggle('ok', cell != null && ok);
  g.classList.toggle('bad', cell != null && !ok);
  paintFootprint();
}
function endDrag(place, guardClick) {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.ghost) d.ghost.remove();
  const trayEl = document.querySelector(`[data-ship="${d.shipId}"]`);
  if (trayEl) trayEl.classList.remove('dragging');
  if (place && d.over != null && placeOk(d.over, dir, SHIP_BY_ID[d.shipId].len, takenSet())) {
    fleet[d.shipId] = shipCells(d.over, dir, SHIP_BY_ID[d.shipId].len);
    beep('place');
    const next = SHIPS.find(x => !(fleet[x.id] || []).length);
    selShip = next ? next.id : selShip;
  }
  if (guardClick) { justDragged = true; setTimeout(() => { justDragged = false; }, 0); }
  if (cur) render(cur, cur);
}
$('#boards').addEventListener('pointerdown', e => {
  const t = e.target.closest('[data-ship]');
  if (!t || !cur || cur.phase !== 'setup') return;
  if ((fleet[t.dataset.ship] || []).length) return; /* tàu đã đặt thì bấm để gỡ, không kéo */
  drag = { shipId: t.dataset.ship, startX: e.clientX, startY: e.clientY, active: false, over: null, ghost: null, lastX: e.clientX, lastY: e.clientY };
});
window.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.active) {
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_PX) return;
    drag.active = true;
    selShip = drag.shipId;
    const g = document.createElement('div');
    g.className = 'drag-ghost';
    g.innerHTML = shipSVG(SHIP_BY_ID[drag.shipId], dir);
    document.body.appendChild(g);
    drag.ghost = g;
    const trayEl = document.querySelector(`[data-ship="${drag.shipId}"]`);
    if (trayEl) trayEl.classList.add('dragging');
  }
  updateDragPos(e.clientX, e.clientY);
});
window.addEventListener('pointerup', () => { if (drag && drag.active) endDrag(true, true); else drag = null; });
window.addEventListener('pointercancel', () => { if (drag && drag.active) endDrag(false, false); else drag = null; });
window.addEventListener('keydown', e => {
  if (!drag || !drag.active) return;
  if (e.key === 'r' || e.key === 'R') { dir = dir === 'h' ? 'v' : 'h'; updateDragPos(drag.lastX, drag.lastY); }
  else if (e.key === 'Escape') endDrag(false, false);
});
/* xem trước footprint khi di chuột qua lưới (cách bấm-chọn-rồi-bấm-ô) */
$('#boards').addEventListener('pointerover', e => {
  if (!cur || cur.phase !== 'setup' || (drag && drag.active)) return;
  const b = e.target.closest('[data-cell]'); if (!b) return;
  const wraps = $('#boards').querySelectorAll('.board-wrap');
  if (!wraps.length || b.closest('.board-wrap') !== wraps[0]) return;
  hoverCell = +b.dataset.cell;
  paintFootprint();
});
$('#boards').addEventListener('pointerout', e => {
  if (!cur || cur.phase !== 'setup' || (drag && drag.active)) return;
  const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-cell]') : null;
  const wraps = $('#boards').querySelectorAll('.board-wrap');
  if (to && wraps.length && to.closest('.board-wrap') === wraps[0]) return;
  hoverCell = null;
  paintFootprint();
});
/* bấm đúp vào tàu trong khay để xoay */
$('#boards').addEventListener('dblclick', e => {
  const t = e.target.closest('[data-ship]');
  if (!t || !cur || cur.phase !== 'setup') return;
  dir = dir === 'h' ? 'v' : 'h';
  render(cur, cur);
});

/* ---------- tương tác ---------- */
$('#boards').addEventListener('click', e => {
  if (justDragged) { justDragged = false; return; } /* click đi kèm sau khi thả kéo – bỏ qua */
  const b = e.target.closest('[data-cell]'); if (!b || !cur) return;
  const cell = +b.dataset.cell, wrap = b.closest('.board-wrap'), own = wrap === $('#boards').querySelectorAll('.board-wrap')[0];
  if (cur.phase === 'setup') {
    if (!own) return;
    const shipAtCell = SHIPS.find(s => (fleet[s.id] || []).includes(cell));
    if (shipAtCell) { delete fleet[shipAtCell.id]; beep('place'); render(cur, cur); return; } /* bấm vào tàu đã đặt để gỡ ra */
    if (!selShip) { tip('Chọn 1 tàu ở khay bên dưới trước đã.'); return; }
    const s = SHIP_BY_ID[selShip];
    if ((fleet[selShip] || []).length) { tip(`${s.name} đã đặt rồi – bấm vào tàu trên biển để gỡ ra trước.`); return; }
    if (!placeOk(cell, dir, s.len, takenSet())) { tip('Không đặt được ở đây – tàu tràn bàn hoặc đè tàu khác.'); return; }
    fleet[selShip] = shipCells(cell, dir, s.len);
    beep('place');
    const next = SHIPS.find(x => !(fleet[x.id] || []).length);
    selShip = next ? next.id : selShip;
    render(cur, cur);
    return;
  }
  if (cur.phase !== 'battle' || !isMyTurn(cur)) { if (cur.phase === 'battle') tip('Chưa tới lượt bạn.'); return; }
  if (mode === 'radar') { mode = null; ui.act({ type: 'radar', cell }); return; }
  if (mode === 'nuke') { mode = null; ui.act({ type: 'nuke', cell }); return; }
  if (mode === 'trap') {
    if (!own) { tip('Bẫy đặt lên biển của bạn (lưới bên trái).'); return; }
    mode = null; ui.act({ type: 'place-trap', cell }); return;
  }
  if (own) { tip('Bắn sang lưới mục tiêu (bên phải) nha.'); return; }
  if (cur.you.shots[cell] && cur.you.shots[cell] !== 'void') { tip('Ô này bạn bắn rồi.'); return; }
  beep('shoot');
  ui.act({ type: 'fire', cell });
});
/* xem trước vùng 3×3 khi chọn radar/bom */
$('#boards').addEventListener('mouseover', e => {
  const b = e.target.closest('[data-cell]'); if (!b || !cur || cur.phase !== 'battle' || (mode !== 'radar' && mode !== 'nuke')) return;
  const wrap = b.closest('.board-wrap'); if (wrap !== $('#boards').querySelectorAll('.board-wrap')[1]) return;
  wrap.querySelectorAll('.aim').forEach(x => x.classList.remove('aim'));
  area3x3(+b.dataset.cell).forEach(n => { const el = wrap.querySelector(`[data-cell="${n}"]`); if (el) el.classList.add('aim'); });
});
$('#boards').addEventListener('click', e => {
  if (justDragged) { justDragged = false; return; } /* click đi kèm sau khi thả kéo – bỏ qua */
  const t = e.target.closest('[data-ship]'); if (!t || !cur || cur.phase !== 'setup') return;
  selShip = t.dataset.ship;
  if ((fleet[selShip] || []).length) { delete fleet[selShip]; beep('place'); } /* bấm tàu đã đặt ở khay để gỡ ra */
  render(cur, cur);
});
$('#acts').addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-a]'); if (!b || !cur) return;
  const a = b.dataset.act || b.dataset.a;
  if (a === 'rotate') { dir = dir === 'h' ? 'v' : 'h'; render(cur, cur); }
  else if (a === 'random') { fleet = randomFleet(); beep('place'); render(cur, cur); }
  else if (a === 'clear') { fleet = {}; render(cur, cur); }
  else if (a === 'cancel-mode') { mode = null; render(cur, cur); }
  else if (a === 'ready') {
    if (placedCount() !== 5) { tip('Xếp đủ 5 tàu đã rồi bấm Sẵn sàng.'); return; }
    ui.act({ type: 'ready', ships: fleet });
  }
  else if (a === 'again') ui.net.raw.start();
  else if (a === 'lobby') ui.net.raw.restart();
});
$('#shop').addEventListener('click', e => {
  const b = e.target.closest('[data-buy],[data-use],[data-stock]'); if (!b || !cur) return;
  if (b.dataset.stock) { pendingStock = { item: b.dataset.stock, before: (cur.you.bought || {})[b.dataset.stock] || 0 }; ui.act({ type: 'buy', item: b.dataset.stock, stock: true }); return; } /* lấy từ kho ví: trừ kho khi lượt xem sau xác nhận đã mua */
  if (b.dataset.buy) { pendingStock = null; ui.act({ type: 'buy', item: b.dataset.buy }); return; } /* mua sai thì máy chủ tự báo lý do qua toast */
  if (b.dataset.use) {
    mode = mode === b.dataset.use ? null : b.dataset.use;
    render(cur, cur);
  }
});
function openGuide() { ui.openModal(GUIDE_HTML); const c = $('#m-close'); if (c) c.onclick = ui.closeModal; }
$('#btn-guide').onclick = $('#btn-guide-home').onclick = openGuide;
$('#btn-log').onclick = () => {
  const v = cur, log = v ? v.log.slice().reverse() : [];
  ui.openModal(`<h2>📜 Nhật ký trận đấu</h2>${log.length ? `<ul class="logl">${log.map(l => `<li class="${l.kind || ''}">${esc(l.text)}</li>`).join('')}</ul>` : '<p style="text-align:center;color:var(--muted)">Chưa có gì.</p>'}<div class="btns"><button class="btn" id="m-close">Đóng</button></div>`);
  $('#m-close').onclick = ui.closeModal;
};
const drawSound = () => { $('#btn-sound').textContent = sound ? '🔊' : '🔇'; }; drawSound();
$('#btn-sound').onclick = () => { sound = !sound; ls.set('bantau-sound', sound ? '1' : '0'); drawSound(); beep('turn'); };

const ui = gameKit({
  game: 'bantau', net: NET, offline: h => h.addBot(),
  onLobby: (info, u, started) => { if (!started) renderLobby(info, u); },
  onState: (v, prev) => {
    if (v) render(v, prev);
    else { cur = null; endShown = null; lastFx = ''; fleet = {}; mode = null; }
  },
});
