// 🤖 Bot Bắn Tàu – chỉ dùng thông tin của chính nó (lưới mục tiêu, xu, vật phẩm) + thông tin công khai.
// Không đọc fleet của địch. Chế độ săn (ô chẵn lẻ) + bám (ô kề sau khi trúng, theo hướng khi trúng 2 ô).
import { SHIPS, SHIP_BY_ID, randomFleet, area3x3, rowOf, colOf, inBoard, ITEMS } from './engine.js?v=10';

const unshot = (me, n) => inBoard(n) && (!me.shots[n] || me.shots[n] === 'void'); /* ô bị bẫy vô hiệu thì bắn lại được */
const neighbours = n => [n - 10, n + 10, n - 1, n + 1].filter(x => inBoard(x) && (Math.abs(colOf(x) - colOf(n)) + Math.abs(rowOf(x) - rowOf(n)) === 1));
// các ô trúng mà tàu của nó chưa chìm (tàu chìm thì ô đã nằm trong sunkCells, công khai)
export const openHits = me => Object.keys(me.shots).map(Number).filter(n => me.shots[n] === 'hit' && !me.sunkCells.includes(n));

// các ô radar đã lộ là có thuyền (chưa bắn, tàu chưa chìm) – bắn vào đó chắc trúng
export const radarTargets = me => {
  const out = [];
  for (const sc of (me.scans || [])) for (const n of (sc.shipCells || []))
    if (unshot(me, n) && !me.sunkCells.includes(n) && !out.includes(n)) out.push(n);
  return out;
};

function pickShot(me) {
  /* ưu tiên cao nhất: ô radar đã lộ có thuyền */
  const rt = radarTargets(me);
  if (rt.length) return rt[Math.floor(Math.random() * rt.length)];
  const open = openHits(me);
  if (open.length) {
    const cands = new Map(); /* ô -> điểm ưu tiên */
    for (const h of open) for (const nb of neighbours(h)) if (unshot(me, nb)) cands.set(nb, (cands.get(nb) || 0) + 1);
    /* trúng 2 ô thẳng hàng thì ưu tiên nối dài theo hướng đó */
    for (let i = 0; i < open.length; i++) for (let j = i + 1; j < open.length; j++) {
      const a = open[i], b = open[j];
      if (rowOf(a) === rowOf(b) && Math.abs(colOf(a) - colOf(b)) === 1) {
        const l = a - 1, r = b + 1;
        if (unshot(me, l) && rowOf(l) === rowOf(a)) cands.set(l, (cands.get(l) || 0) + 3);
        if (unshot(me, r) && rowOf(r) === rowOf(a)) cands.set(r, (cands.get(r) || 0) + 3);
      }
      if (colOf(a) === colOf(b) && Math.abs(rowOf(a) - rowOf(b)) === 1) {
        const u = a - 10, d = b + 10;
        if (unshot(me, u) && colOf(u) === colOf(a)) cands.set(u, (cands.get(u) || 0) + 3);
        if (unshot(me, d) && colOf(d) === colOf(a)) cands.set(d, (cands.get(d) || 0) + 3);
      }
    }
    if (cands.size) {
      const best = Math.max(...cands.values());
      const top = [...cands.entries()].filter(([, v]) => v === best).map(([k]) => k);
      return top[Math.floor(Math.random() * top.length)];
    }
  }
  /* săn: ô chẵn lẻ để tìm tàu nhanh (tàu nhỏ nhất 2 ô nên ô chẵn lẻ nào cũng chạm được tàu) */
  const parity = [], rest = [];
  for (let n = 0; n < 100; n++) if (unshot(me, n)) ((rowOf(n) + colOf(n)) % 2 === 0 ? parity : rest).push(n);
  const pool = parity.length ? parity : rest;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : -1;
}
function pickRadarCell(me) {
  const pool = [];
  for (let n = 0; n < 100; n++) if (unshot(me, n)) pool.push(n);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : 44;
}
export function botAction(s, pid) {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  if (s.phase === 'setup') return { type: 'ready', ships: randomFleet() };
  if (s.phase !== 'battle' || s.turn !== pid) return null;
  /* 1. đặt bẫy đã mua (tốn lượt) khi mình đã bị bắn trúng vài ô */
  if (me.bought.trap - me.traps.length > 0 && me.hits.length >= 2) {
    const cells = SHIPS.flatMap(sh => me.fleet[sh.id] || []).filter(n => !me.hits.includes(n) && !me.traps.some(t => t.cell === n));
    if (cells.length) return { type: 'place-trap', cell: cells[Math.floor(Math.random() * cells.length)] };
  }
  /* 2. mua vật phẩm khi đủ xu */
  if (me.coins >= ITEMS.radar.price && me.bought.radar < ITEMS.radar.max && !me.radarUsed && me.missStreak >= 6) return { type: 'buy', item: 'radar' };
  if (me.coins >= ITEMS.nuke.price && me.bought.nuke < ITEMS.nuke.max && !me.nukeUsed && openHits(me).length >= 2) return { type: 'buy', item: 'nuke' };
  if (me.coins >= ITEMS.trap.price && me.bought.trap < ITEMS.trap.max && me.hits.length >= 3) return { type: 'buy', item: 'trap' };
  /* 3. dùng radar khi săn lâu không trúng */
  if (me.bought.radar > 0 && !me.radarUsed && me.missStreak >= 6) return { type: 'radar', cell: pickRadarCell(me) };
  /* 4. dùng bom khi đang bám được cụm tàu (nổ quanh ô trúng) */
  const open = openHits(me);
  if (me.bought.nuke > 0 && !me.nukeUsed && open.length >= 2) return { type: 'nuke', cell: open[0] };
  /* 5. bắn */
  const cell = pickShot(me);
  return cell >= 0 ? { type: 'fire', cell } : null;
}
