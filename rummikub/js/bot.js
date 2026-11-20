// 🤖 Bot Rummikub — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng viewFor (bàn + tay bài của mình) — không nhìn tay bài người khác.
// Máy Dễ: 85% chơi 1 bộ bừa (hoặc rút nếu không có),
// 15% chơi nước tốt nhất. Máy Khó: tham lam — kết hợp nhiều bộ mới +
// thêm lá vào bộ có sẵn để đánh được nhiều lá nhất, ưu tiên hết bài.
import { viewFor, meldInfo, validatePlayTable, tileValue, isJoker, tileColor, tileNumber, COLORS } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

/* ---------- liệt kê các bộ mới làm được từ tay bài ---------- */
/* dãy: theo từng màu, các số liên tiếp (joker lấp chỗ thiếu hoặc nối dài) */
function findRuns(hand) {
  const jokers = hand.filter(isJoker);
  const out = [];
  for (const color of COLORS) {
    const byNum = new Map();
    for (const t of hand) {
      if (isJoker(t) || tileColor(t) !== color) continue;
      if (!byNum.has(tileNumber(t))) byNum.set(tileNumber(t), t);
    }
    if (!byNum.size) continue;
    for (let start = 1; start <= 13; start++) {
      for (let len = 3; len <= 13 && start + len - 1 <= 13; len++) {
        const missing = [];
        const tiles = [];
        for (let n = start; n < start + len; n++) {
          if (byNum.has(n)) tiles.push(byNum.get(n));
          else missing.push(n);
        }
        if (missing.length > jokers.length) continue;
        if (missing.length && tiles.length < 1) continue;
        const meld = tiles.concat(jokers.slice(0, missing.length));
        if (meld.length >= 3) out.push(meld);
      }
    }
  }
  return out;
}
/* nhóm: theo từng số, các màu khác nhau (joker thay màu còn thiếu) */
function findGroups(hand) {
  const jokers = hand.filter(isJoker);
  const out = [];
  const byNum = new Map();
  for (const t of hand) {
    if (isJoker(t)) continue;
    const n = tileNumber(t);
    if (!byNum.has(n)) byNum.set(n, new Map());
    const m = byNum.get(n);
    if (!m.has(tileColor(t))) m.set(tileColor(t), t);
  }
  for (const [num, colors] of byNum) {
    const colorTiles = [...colors.values()];
    for (const size of [3, 4]) {
      for (let j = 0; j <= Math.min(jokers.length, size - 1); j++) {
        const need = size - j;
        if (need > colorTiles.length || need < 1) continue;
        /* mọi tổ hợp `need` màu trong các màu có sẵn */
        const combos = [];
        const pickColors = (arr, k, from, acc) => {
          if (acc.length === k) { combos.push(acc.slice()); return; }
          for (let i = from; i < arr.length; i++) { acc.push(arr[i]); pickColors(arr, k, i + 1, acc); acc.pop(); }
        };
        pickColors(colorTiles, need, 0, []);
        for (const combo of combos) out.push(combo.concat(jokers.slice(0, j)));
      }
    }
  }
  return out;
}
/* mọi bộ mới làm được từ tay bài (chỉ giữ bộ hợp lệ theo engine) */
function candidateMelds(hand) {
  const all = findRuns(hand).concat(findGroups(hand));
  const seen = new Set();
  const out = [];
  for (const m of all) {
    const info = meldInfo(m);
    if (!info.valid) continue;
    const key = [...m].sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ meld: m, value: info.value });
  }
  return out;
}
/* thêm lá trên tay vào các bộ có sẵn trên bàn (mở rộng dãy / đủ nhóm);
   thử lá giá trị cao trước để giảm điểm bài trên tay (quan trọng khi
   trận kết thúc vì hết chồng: người ít điểm bài nhất thắng) */
function extendTable(table, hand) {
  const work = table.map(m => m.slice());
  const used = [];
  const rest = hand.slice().sort((a, b) => tileValue(b) - tileValue(a));
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i];
    for (let mi = 0; mi < work.length; mi++) {
      if (meldInfo([...work[mi], t]).valid) {
        work[mi].push(t);
        used.push(t);
        rest.splice(i, 1);
        i--;
        break;
      }
    }
  }
  return { table: work, used, rest };
}
/* nước tham lam: nhiều bộ mới (không trùng lá) + thêm lá vào bộ có sẵn.
   Ưu tiên bộ GIÁ TRỊ cao (giảm điểm bài trên tay) rồi mới tới nhiều lá:
   vừa mau hết bài, vừa thắng khi trận kết thúc vì hết chồng. */
function greedyPlay(view, me) {
  const hand = me.hand.slice();
  const cands = candidateMelds(hand).sort((a, b) => b.value - a.value || b.meld.length - a.meld.length);
  const usedSet = new Set();
  const newMelds = [];
  for (const c of cands) {
    if (c.meld.some(t => usedSet.has(t))) continue;
    c.meld.forEach(t => usedSet.add(t));
    newMelds.push(c.meld.slice());
  }
  let rest = hand.filter(t => !usedSet.has(t));
  const ext = extendTable(view.table.concat(newMelds), rest);
  const newTable = ext.table;
  const used = hand.filter(t => !ext.rest.includes(t));
  return { newTable, used };
}
/* nước tham lam ưu tiên nhiều lá (cho lúc chưa mở bài mà nước ưu tiên
   điểm vẫn chưa đủ 30: thử cách kết hợp khác) */
function greedyPlayBySize(view, me) {
  const hand = me.hand.slice();
  const cands = candidateMelds(hand).sort((a, b) => b.meld.length - a.meld.length || b.value - a.value);
  const usedSet = new Set();
  const newMelds = [];
  for (const c of cands) {
    if (c.meld.some(t => usedSet.has(t))) continue;
    c.meld.forEach(t => usedSet.add(t));
    newMelds.push(c.meld.slice());
  }
  let rest = hand.filter(t => !usedSet.has(t));
  const ext = extendTable(view.table.concat(newMelds), rest);
  return { newTable: ext.table, used: hand.filter(t => !ext.rest.includes(t)) };
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const me = v.players.find(p => p.id === pid);
  if (!me || v.turn !== pid) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  const hand = me.hand || [];
  if (!hand.length) return null;

  /* ---------- Máy Dễ: 85% chơi 1 bộ bừa, 15% chơi nước tốt ---------- */
  if (!hard && Math.random() < 0.85) {
    const cands = candidateMelds(hand);
    if (cands.length) {
      const one = pick(cands).meld;
      const newTable = v.table.map(m => m.slice());
      newTable.push(one.slice());
      const chk = validatePlayTable(v.table, hand, me.melded, newTable);
      if (chk.ok) return { type: 'play', table: newTable };
    }
    return { type: 'draw' };
  }

  /* ---------- Máy Khó (và 30% của máy Dễ): nước tham lam ---------- */
  let play = greedyPlay(v, me);
  let chk = validatePlayTable(v.table, hand, me.melded, play.newTable);
  if (!chk.ok && !me.melded) {
    /* chưa mở bài mà chưa đủ 30 điểm: thử nước ưu tiên nhiều lá */
    play = greedyPlayBySize(v, me);
    chk = validatePlayTable(v.table, hand, me.melded, play.newTable);
  }
  if (chk.ok) return { type: 'play', table: play.newTable };
  return { type: 'draw' };
}

export default { botAction };
