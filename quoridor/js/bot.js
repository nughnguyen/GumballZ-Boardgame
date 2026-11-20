// 🤖 Bot Quoridor — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng viewFor (vị trí các quân + tường trên bàn) — không nhìn
// state thô. Máy Dễ: 70% chơi bừa (đi hoặc đặt tường bừa hợp lệ),
// 30% chơi nước tốt nhất. Máy Khó: tham lam — đi theo đường BFS ngắn
// nhất tới đích, đặt tường chặn đối thủ đang gần đích nhất khi tường
// đó làm đối thủ xa đích thêm ≥ 2 bước mà không làm mình xa thêm.
import { viewFor, distToGoal, legalMoves, legalWalls } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

/* khoảng cách BFS từ 1 ô tới đích, với bộ tường cho trước */
function distAt(view, pos, goal, hWalls, vWalls) {
  return distToGoal(new Set(hWalls), new Set(vWalls), pos, goal);
}
/* đối thủ đang gần đích nhất (người dẫn đầu) */
function leader(view, meId) {
  let best = null;
  for (const p of view.players) {
    if (p.id === meId) continue;
    if (!best || p.dist < best.dist) best = p;
  }
  return best;
}

/* dựng state tối thiểu từ view để dùng chung hàm legalMoves/legalWalls */
function stateFromView(view) {
  return {
    phase: 'playing',
    players: view.players.map(p => ({ id: p.id, pos: p.pos.slice(), goal: { ...p.goal }, wallsLeft: p.wallsLeft, turns: p.turns })),
    hWalls: view.hWalls.slice(), vWalls: view.vWalls.slice(),
    turnIdx: view.turnIdx,
  };
}

function greedyMove(view, me) {
  const s = stateFromView(view);
  const moves = legalMoves(s, me.id);
  if (!moves.length) return null;
  let best = null;
  for (const m of moves) {
    const d = distAt(view, m.to, me.goal, view.hWalls, view.vWalls);
    const score = d === 0 ? -100 : d;
    if (!best || score < best.score) best = { act: m, score };
  }
  return best.act;
}

function greedyWall(view, me) {
  const s = stateFromView(view);
  const walls = legalWalls(s, me.id);
  if (!walls.length) return null;
  const lead = leader(view, me.id);
  if (!lead) return null;
  let best = null;
  for (const w of walls) {
    const h = view.hWalls.slice(), v = view.vWalls.slice();
    if (w.orient === 'h') h.push(w.r + ',' + w.c); else v.push(w.r + ',' + w.c);
    const oppAfter = distAt(view, lead.pos, lead.goal, h, v);
    const myAfter = distAt(view, me.pos, me.goal, h, v);
    /* tường có ích nếu đối thủ xa thêm nhiều mà mình không xa thêm */
    const value = (oppAfter - lead.dist) - (myAfter - me.dist);
    if (!best || value > best.value) best = { act: { type: 'wall', orient: w.orient, r: w.r, c: w.c }, value, oppAfter, myAfter };
  }
  return best;
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const me = v.players.find(p => p.id === pid);
  if (!me || v.turn !== pid) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';

  /* thắng ngay nếu có nước đi tới đích */
  const win = greedyMove(v, me);
  if (win) {
    const d = distAt(v, win.to, me.goal, v.hWalls, v.vWalls);
    if (d === 0) return win;
  }

  /* ---------- Máy Dễ: 70% bừa, 30% nước tốt ---------- */
  if (!hard && Math.random() < 0.7) {
    const st = stateFromView(v);
    const moves = legalMoves(st, pid);
    const walls = me.wallsLeft > 0 ? legalWalls(st, pid) : [];
    const all = moves.concat(walls.map(w => ({ type: 'wall', orient: w.orient, r: w.r, c: w.c })));
    if (all.length) return pick(all);
    return null;
  }

  /* ---------- Máy Khó (và 30% của máy Dễ): tham lam ---------- */
  const wall = greedyWall(v, me);
  if (wall && wall.value >= 2) return wall.act;
  if (win) return win;
  return null;
}

export default { botAction };
