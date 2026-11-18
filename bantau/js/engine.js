// 🚢 Bắn Tàu – luật chơi (thuần logic, chạy ở máy chủ phòng).
// 2 người, mỗi người 2 lưới 10×10 (hàng A–J, cột 1–10): lưới chính giấu tàu mình,
// lưới mục tiêu ghi tọa độ đã bắn sang địch. 5 tàu/người, 17 ô.
// Luật lượt: bắn TRÚNG 1 ô thì được bắn tiếp; bắn TRƯỢT (hoặc bị bẫy vô hiệu) thì đổi lượt.
// Dùng vật phẩm hỗ trợ (Bẫy/Radar/Bom) thì hết lượt dù trước đó có bắn trúng; mua vật phẩm không tốn lượt.
// Xu trong trận: bắt đầu 500 xu, +50 xu mỗi phát trúng, +100 xu mỗi tàu chìm.
// Vật phẩm: Bẫy 150 xu (tối đa 2/trận), Radar 200 xu (tối đa 1), Bom hạt nhân 300 xu (tối đa 1).
export const SIZE = 10, CELLS = 100;
export const SHIPS = [
  { id: 'carrier', name: 'Tàu sân bay', short: 'Sân bay', len: 5, color: '#e0432f', art: '🚢' },
  { id: 'battleship', name: 'Thiết giáp hạm', short: 'Thiết giáp', len: 4, color: '#2f7fc4', art: '🛳️' },
  { id: 'cruiser', name: 'Tuần dương hạm', short: 'Tuần dương', len: 3, color: '#12a66a', art: '⛴️' },
  { id: 'submarine', name: 'Tàu ngầm', short: 'Tàu ngầm', len: 3, color: '#7b5cff', art: '🛟' },
  { id: 'destroyer', name: 'Tàu khu trục', short: 'Khu trục', len: 2, color: '#b8860b', art: '🚤' },
];
export const SHIP_BY_ID = Object.fromEntries(SHIPS.map(s => [s.id, s]));
export const TOTAL_CELLS = 17;
export const COINS_START = 500, COIN_HIT = 50, COIN_SINK = 100;
export const ITEMS = {
  trap: { id: 'trap', name: 'Bẫy', icon: '🪤', price: 150, max: 2, desc: 'Đặt lên 1 ô có tàu của mình. Địch bắn đúng ô bẫy thì phát bắn bị vô hiệu và bẫy lộ vị trí tàu địch tại cùng tọa độ trên lưới mục tiêu của mình. Đặt bẫy xong là hết lượt, dù trước đó có bắn trúng.' },
  radar: { id: 'radar', name: 'Radar', icon: '📡', price: 200, max: 1, desc: 'Quét vùng 3×3 trên lưới địch, lộ đúng các ô có thuyền trong vùng (đánh dấu trên lưới mục tiêu để bắn tiếp). Dùng là hết lượt.' },
  nuke: { id: 'nuke', name: 'Bom hạt nhân', icon: '☢️', price: 300, max: 1, desc: 'Nổ toàn bộ vùng 3×3 (9 ô đều tính như 9 phát bắn: trúng/trượt, có thể chìm tàu). Dùng là hết lượt, dù trúng hay trượt.' },
};
export const coordName = n => 'ABCDEFGHIJ'[Math.floor(n / 10)] + (n % 10 + 1);
export const parseCoord = t => { const m = /^([A-Ja-j])(10|[1-9])$/.exec(String(t || '').trim()); return m ? (m[1].toUpperCase().charCodeAt(0) - 65) * 10 + (+m[2] - 1) : -1; };
export const rowOf = n => Math.floor(n / 10), colOf = n => n % 10;
export const inBoard = n => Number.isInteger(n) && n >= 0 && n < CELLS;
export const area3x3 = c => { const r = rowOf(c), co = colOf(c), out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = co + dc; if (rr >= 0 && rr < 10 && cc >= 0 && cc < 10) out.push(rr * 10 + cc); } return out; };

// các ô của 1 tàu đặt từ ô đầu theo hướng 'h' (ngang) hoặc 'v' (dọc)
export function shipCells(start, dir, len) {
  const r = rowOf(start), c = colOf(start), out = [];
  for (let i = 0; i < len; i++) out.push(dir === 'h' ? r * 10 + c + i : (r + i) * 10 + c);
  return out;
}
// kiểm tra 1 tàu đặt hợp lệ trên lưới trống (không tràn, không đè các ô đã có)
export function placeOk(start, dir, len, taken) {
  if (!inBoard(start) || (dir !== 'h' && dir !== 'v')) return false;
  const r = rowOf(start), c = colOf(start);
  if (dir === 'h' && c + len > 10) return false;
  if (dir === 'v' && r + len > 10) return false;
  return shipCells(start, dir, len).every(n => !taken.has(n));
}
// kiểm tra cả đội hình: đủ 5 tàu, mỗi tàu đúng độ dài, thẳng hàng, không đè nhau
export function validateFleet(ships) {
  if (!ships || typeof ships !== 'object') return { ok: false, reason: 'Chưa xếp tàu.' };
  const taken = new Set();
  for (const s of SHIPS) {
    const cells = ships[s.id];
    if (!Array.isArray(cells) || cells.length !== s.len) return { ok: false, reason: `Thiếu tàu ${s.name} (${s.len} ô).` };
    if (new Set(cells).size !== cells.length) return { ok: false, reason: `Tàu ${s.name} bị trùng ô.` };
    if (cells.some(n => !inBoard(n))) return { ok: false, reason: `Tàu ${s.name} tràn khỏi bàn.` };
    const rs = cells.map(rowOf), cs = cells.map(colOf);
    const straight = (rs.every(r => r === rs[0]) && cs.slice().sort((a, b) => a - b).every((v, i) => v === cs[0] + i)) ||
      (cs.every(c => c === cs[0]) && rs.slice().sort((a, b) => a - b).every((v, i) => v === rs[0] + i));
    if (!straight) return { ok: false, reason: `Tàu ${s.name} phải đặt thẳng hàng ngang hoặc dọc.` };
    for (const n of cells) { if (taken.has(n)) return { ok: false, reason: 'Hai tàu đè lên nhau.' }; taken.add(n); }
  }
  return { ok: true };
}
// xếp ngẫu nhiên 1 đội hình hợp lệ (rand: () => [0,1) – để test gieo hạt được)
export function randomFleet(rand = Math.random) {
  const taken = new Set(), ships = {};
  for (const s of SHIPS) {
    let cells = null;
    for (let t = 0; t < 500 && !cells; t++) {
      const dir = rand() < .5 ? 'h' : 'v', start = Math.floor(rand() * CELLS);
      if (placeOk(start, dir, s.len, taken)) cells = shipCells(start, dir, s.len);
    }
    if (!cells) return randomFleet(rand); /* cực hiếm: xếp lại từ đầu */
    ships[s.id] = cells; cells.forEach(n => taken.add(n));
  }
  return ships;
}
const shipAt = (p, cell) => { for (const s of SHIPS) if ((p.fleet[s.id] || []).includes(cell)) return s; return null; };
const hitsOf = (p, shipId) => (p.fleet[shipId] || []).filter(n => p.hits.includes(n)).length;
const isSunk = (p, shipId) => hitsOf(p, shipId) === SHIP_BY_ID[shipId].len;
const allSunk = p => SHIPS.every(s => isSunk(p, s.id));

export function createGame(players, opts = {}) {
  if (players.length !== 2) throw new Error('Bắn Tàu chơi 2 người.');
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'setup', opts: { ...opts },
    players: players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      ready: false, fleet: {}, hits: [], shots: {}, sunk: [], sunkCells: [], missStreak: 0,
      coins: COINS_START, bought: { trap: 0, radar: 0, nuke: 0 },
      traps: [], radarUsed: false, nukeUsed: false, reveals: {}, scans: [],
    })),
    turn: null, turnNo: 0, winner: null, lastShot: null, lastNuke: null, log: [],
  };
  return s;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const foeOf = (s, id) => s.players.find(p => p.id !== id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const passTurn = s => { s.turn = foeOf(s, s.turn).id; s.turnNo++; };

// giải quyết 1 phát bắn vào 1 ô (dùng chung cho bắn thường và từng ô của bom hạt nhân)
function resolveShot(s, me, foe, cell, viaNuke) {
  const trap = foe.traps.find(t => !t.used && t.cell === cell);
  if (trap) {
    trap.used = true;
    me.shots[cell] = 'void';
    const hasShip = !!shipAt(me, cell);
    foe.reveals[cell] = hasShip ? 'ship' : 'water';
    pushLog(s, `🪤 Bẫy của ${foe.name} đã vô hiệu hoá phát bắn vào ${coordName(cell)}!${hasShip ? ` Bẫy lộ ra: ${coordName(cell)} bên địch có tàu.` : ` Bẫy cho biết ${coordName(cell)} bên địch là nước trống.`}`, 'trap');
    return { res: 'void', cell };
  }
  const ship = shipAt(foe, cell);
  if (!ship) { me.shots[cell] = 'miss'; me.missStreak++; return { res: 'miss', cell }; }
  if (foe.hits.includes(cell)) return { res: 'dup', cell }; /* ô đã trúng từ trước (chỉ gặp khi bom nổ trúng ô đã bắn) */
  foe.hits.push(cell);
  me.shots[cell] = 'hit';
  me.coins += COIN_HIT;
  me.missStreak = 0;
  if (isSunk(foe, ship.id)) {
    me.sunk.push(ship.id);
    me.sunkCells.push(...foe.fleet[ship.id]);
    me.coins += COIN_SINK;
    pushLog(s, `💥 ${me.name} đã đánh chìm ${ship.name} (${ship.len} ô) của ${foe.name}! (+${COIN_HIT + COIN_SINK} xu)`, 'sink');
    return { res: 'sink', cell, ship: ship.id };
  }
  pushLog(s, `${viaNuke ? '☢️' : '🎯'} ${me.name} bắn trúng ${coordName(cell)}${ship ? ` (${ship.name})` : ''}! (+${COIN_HIT} xu)`, 'hit');
  return { res: 'hit', cell, ship: ship.id };
}
function checkWin(s, me, foe) {
  if (allSunk(foe)) {
    s.phase = 'ended'; s.winner = me.id;
    pushLog(s, `🏆 ${me.name} đã đánh chìm toàn bộ hạm đội của ${foe.name} và thắng ván!`, 'win');
    return true;
  }
  return false;
}
export function applyAction(s, pid, a) {
  if (!a) return { ok: false };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const foe = foeOf(s, pid);
  if (s.phase === 'setup') {
    if (a.type === 'ready') {
      if (me.ready) return { ok: false, reason: 'Bạn đã sẵn sàng rồi.' };
      const v = validateFleet(a.ships);
      if (!v.ok) return { ok: false, reason: v.reason };
      me.fleet = Object.fromEntries(SHIPS.map(x => [x.id, [...a.ships[x.id]]])); me.ready = true; s.seq++;
      pushLog(s, `⚓ ${me.name} đã khóa đội hình.`);
      if (s.players.every(p => p.ready)) { s.phase = 'battle'; s.turn = s.players[0].id; s.turnNo = 1; pushLog(s, '⚔️ Trận đấu bắt đầu! ' + s.players[0].name + ' bắn trước.'); }
      return { ok: true };
    }
    return { ok: false, reason: 'Chưa bắt đầu – hãy xếp tàu rồi bấm Sẵn sàng.' };
  }
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  /* mua vật phẩm: chỉ tốn xu, không tốn lượt – mua lúc nào trong trận cũng được */
  if (a.type === 'buy') {
    const it = ITEMS[a.item];
    if (!it) return { ok: false };
    if (me.bought[a.item] >= it.max) return { ok: false, reason: `${it.name} mỗi trận chỉ mua tối đa ${it.max} lần.` };
    if (me.coins < it.price) return { ok: false, reason: `Không đủ xu (cần ${it.price} xu).` };
    me.coins -= it.price; me.bought[a.item]++; s.seq++;
    pushLog(s, `🛒 ${me.name} đã mua ${it.icon} ${it.name} (${it.price} xu).`);
    return { ok: true };
  }
  /* đặt bẫy: hành động miễn phí trong lượt của mình */
  if (a.type === 'place-trap') {
    if (pid !== s.turn) return { ok: false, reason: 'Chưa tới lượt bạn.' };
    if (!inBoard(a.cell)) return { ok: false };
    if (me.bought.trap - me.traps.length <= 0) return { ok: false, reason: 'Bạn chưa mua Bẫy (hoặc đã đặt hết).' };
    if (!shipAt(me, a.cell)) return { ok: false, reason: 'Bẫy phải đặt lên 1 ô có tàu của mình.' };
    if (me.hits.includes(a.cell)) return { ok: false, reason: 'Ô này đã bị bắn trúng, đặt bẫy cũng vô ích.' };
    if (me.traps.some(t => t.cell === a.cell)) return { ok: false, reason: 'Ô này đã có bẫy rồi.' };
    me.traps.push({ cell: a.cell, used: false }); s.seq++;
    pushLog(s, `🪤 ${me.name} đã gài bẫy tại ${coordName(a.cell)} – hết lượt.`, 'trap');
    passTurn(s); /* đặt bẫy tốn lượt: đặt xong thì đổi lượt, dù trước đó có bắn trúng */
    return { ok: true };
  }
  if (pid !== s.turn) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (a.type === 'fire') {
    if (!inBoard(a.cell)) return { ok: false };
    if (me.shots[a.cell] && me.shots[a.cell] !== 'void') return { ok: false, reason: 'Ô này bạn bắn rồi.' }; /* ô bị bẫy vô hiệu (void) thì bắn lại được – bẫy chỉ chặn 1 lần */
    const r = resolveShot(s, me, foe, a.cell, false);
    s.lastShot = { cell: a.cell, res: r.res, by: pid, n: s.turnNo, ship: r.ship || undefined };
    if (r.res === 'miss') pushLog(s, `💦 ${me.name} bắn trượt ${coordName(a.cell)}.`, 'miss');
    s.seq++;
    /* bắn trúng/chìm thì được bắn tiếp (giữ nguyên lượt); trượt hoặc bị bẫy vô hiệu thì đổi lượt */
    if (!checkWin(s, me, foe) && (r.res === 'miss' || r.res === 'void')) passTurn(s);
    return { ok: true, res: r.res };
  }
  if (a.type === 'radar') {
    if (!inBoard(a.cell)) return { ok: false };
    if (me.bought.radar <= 0) return { ok: false, reason: 'Bạn chưa mua Radar.' };
    if (me.radarUsed) return { ok: false, reason: 'Radar mỗi trận chỉ dùng 1 lần.' };
    const cells = area3x3(a.cell);
    /* radar mới: lộ ĐÚNG các ô có thuyền chưa bị bắn trúng trong vùng (chỉ người dùng radar thấy) */
    const shipCells = cells.filter(n => { const sh = shipAt(foe, n); return sh && !foe.hits.includes(n); });
    const hasShip = shipCells.length > 0;
    me.radarUsed = true; me.scans.push({ cells, hasShip, shipCells, n: s.turnNo }); s.seq++;
    pushLog(s, `📡 Radar của ${me.name} quét quanh ${coordName(a.cell)}: ${hasShip ? `lộ ra ${shipCells.length} ô có tàu trong vùng!` : 'không có tàu trong vùng.'}`, 'radar');
    s.lastShot = { cell: a.cell, res: hasShip ? 'radar-hit' : 'radar-miss', by: pid, n: s.turnNo };
    if (!checkWin(s, me, foe)) passTurn(s);
    return { ok: true, hasShip, shipCells };
  }
  if (a.type === 'nuke') {
    if (!inBoard(a.cell)) return { ok: false };
    if (me.bought.nuke <= 0) return { ok: false, reason: 'Bạn chưa mua Bom hạt nhân.' };
    if (me.nukeUsed) return { ok: false, reason: 'Bom hạt nhân mỗi trận chỉ dùng 1 lần.' };
    me.nukeUsed = true;
    const cells = area3x3(a.cell);
    const results = cells.map(n => (me.shots[n] && me.shots[n] !== 'void' ? { res: 'dup', cell: n } : resolveShot(s, me, foe, n, true)));
    const hits = results.filter(r => r.res === 'hit' || r.res === 'sink').length;
    s.lastNuke = { cells, by: pid, n: s.turnNo, res: results.map(r => r.res) };
    s.lastShot = { cell: a.cell, res: 'nuke', by: pid, n: s.turnNo };
    pushLog(s, `☢️ ${me.name} thả bom hạt nhân quanh ${coordName(a.cell)}: ${hits} ô trúng${hits ? '' : ', toàn trượt'}.`, 'nuke');
    s.seq++;
    /* bom dùng xong là hết lượt, dù trúng hay trượt */
    if (!checkWin(s, me, foe)) passTurn(s);
    return { ok: true, hits };
  }
  return { ok: false };
}
export const actors = s => {
  if (s.phase === 'setup') return s.players.filter(p => !p.ready).map(p => p.id);
  if (s.phase === 'battle' && s.turn) return [s.turn];
  return [];
};
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const pub = p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, ready: p.ready, coins: p.coins, shots: p.shots, sunk: p.sunk, sunkCells: p.sunkCells, hitsTaken: p.hits.length });
  const v = {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: s.turn, turnNo: s.turnNo, winner: s.winner,
    players: s.players.map(pub), log: s.log.slice(-30),
    lastShot: s.lastShot, lastNuke: s.lastNuke,
    me: pid, you: null, foe: null,
  };
  if (me) {
    const foe = foeOf(s, pid);
    v.you = {
      fleet: me.fleet, hits: me.hits, shots: me.shots, sunk: me.sunk, sunkCells: me.sunkCells, coins: me.coins,
      bought: me.bought, traps: me.traps, radarUsed: me.radarUsed, nukeUsed: me.nukeUsed,
      reveals: me.reveals, scans: me.scans,
    };
    v.foe = { id: foe.id, name: foe.name, coins: foe.coins, ready: foe.ready, shots: foe.shots, sunkByMe: me.sunk,
      /* chỉ lộ tàu ĐÃ chìm của địch (đúng ô từng tàu) – tàu còn sống không bao giờ lộ */
      sunkShips: me.sunk.map(id => ({ id, cells: [...(foe.fleet[id] || [])] })) };
  }
  return v;
}
