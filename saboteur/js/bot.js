// 🤖 Bot Saboteur — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng thông tin công khai + vai trò của chính mình + những lá đích
// mà chính mình đã xem bằng Bản đồ — không nhìn tay bài, vai trò người khác,
// hay thân phận đích chưa xem. (Dùng thân phận đích chưa xem để chấm điểm
// là gian lận, bot không làm vậy.)
// Máy Dễ: 70% đánh bừa, 30% đánh nước tốt. Máy Khó: heuristic theo vai:
// thợ đào dùng Bản đồ tìm vàng sớm rồi mở đường thẳng về đích đó (mô phỏng
// từng nước đặt để đo khoảng cách); kẻ phá hoại cũng dùng Bản đồ để biết
// vàng ở đâu rồi chặn bằng lá cụt, phá dụng cụ của người vừa đặt đường,
// dùng Đá rơi phá lá ở biên đường.
import { legalMoves, exitsOf, isPath, isAction, isDeadEnd, cardKind, frontierDist, reachableGoals } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

/* các ô đã nối được từ lá Bắt đầu (để biết lá nào đang ở biên đường) */
function reachableCells(s) {
  const seen = new Set(['0,0']);
  const q = [[0, 0]];
  const DIR = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  const cellExits = (x, y) => {
    if (x === 0 && y === 0) return ['N', 'E', 'S', 'W'];
    if (s.goals.some(g => g.x === x && g.y === y)) return ['E'];
    const c = s.board[x + ',' + y];
    return c ? exitsOf(c.card, c.rotated) : null;
  };
  while (q.length) {
    const [x, y] = q.shift();
    const ex = cellExits(x, y);
    if (!ex) continue;
    for (const d of ex) {
      const [dx, dy] = DIR[d];
      const nx = x + dx, ny = y + dy;
      const key = nx + ',' + ny;
      if (seen.has(key)) continue;
      if (s.goals.some(g => g.x === nx && g.y === ny)) continue;
      const nEx = cellExits(nx, ny);
      if (!nEx || !nEx.includes(OPP[d])) continue;
      seen.add(key);
      q.push([nx, ny]);
    }
  }
  return seen;
}
/* khoảng cách Manhattan ngắn nhất từ biên đường tới 1 đích cụ thể */
function goalDistFromFrontier(s, gi, reach) {
  const g = s.goals[gi];
  let best = Infinity;
  for (const key of reach) {
    const [x, y] = key.split(',').map(Number);
    best = Math.min(best, Math.abs(x - g.x) + Math.abs(y - g.y));
  }
  return best;
}
/* đích mục tiêu: lá vàng đã xem bằng Bản đồ (nếu có), nếu không thì đích
   chưa lộ gần biên đường nhất. Trả về chỉ số đích hoặc -1. */
function targetGoal(s, pid, reach) {
  const me = s.players.find(p => p.id === pid);
  for (const gi of me.peeked) {
    if (s.goals[gi].kind === 'gold') return gi;
  }
  let best = -1, bestD = Infinity;
  s.goals.forEach((g, i) => {
    if (g.revealed) return;
    let d = goalDistFromFrontier(s, i, reach);
    /* đích giữa (y=0) nằm trên đường thẳng từ ô bắt đầu — ưu tiên nó để
       cả nhóm đào cùng một hướng thay vì mỗi người đuổi một đích khác nhau */
    if (g.y === 0) d -= 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}
/* mô phỏng: đặt thử 1 lá rồi đo khoảng cách biên đường tới đích mục tiêu
   và xem có tới được đích nào không */
function simPlace(s, mv, target) {
  const key = mv.x + ',' + mv.y;
  s.board[key] = { card: mv.card, rotated: mv.rotated };
  const reach = reachableCells(s);
  const d = target >= 0 ? goalDistFromFrontier(s, target, reach) : Infinity;
  const reached = reachableGoals(s);
  delete s.board[key];
  return { d, reached };
}

function scoreMove(s, pid, mv, reach, target) {
  const me = s.players.find(p => p.id === pid);
  const isSab = me.role === 'saboteur';
  const goldKnown = target >= 0 && s.goals[target].kind === 'gold' && me.peeked.includes(target);

  if (mv.type === 'play-path') {
    const exits = exitsOf(mv.card, mv.rotated);
    const dead = isDeadEnd(mv.card);
    const hasEW = exits.includes('E') && exits.includes('W');
    if (isSab) {
      /* chặn: lá cụt đặt sát đích mục tiêu (vàng nếu đã biết, không thì đích gần nhất) */
      const tg = target >= 0 ? s.goals[target] : null;
      const dist = tg ? Math.abs(mv.x - tg.x) + Math.abs(mv.y - tg.y) : 99;
      let v = dead ? 40 : 0;
      v += Math.max(0, 6 - dist) * 4;
      v += (4 - exits.length) * 3;
      return v;
    }
    /* đào: tới được đích vàng đã biết thì thắng vòng luôn; nếu không thì
       đặt càng gần đích mục tiêu càng tốt (theo chính ô đặt, không theo
       biên đường chung — để đường đi thẳng về đích thay vì lan man) */
    const { reached } = simPlace(s, mv, target);
    if (target >= 0 && reached.includes(target)) return goldKnown ? 1000 : 200;
    const tg = target >= 0 ? s.goals[target] : null;
    const dist = tg ? Math.abs(mv.x - tg.x) + Math.abs(mv.y - tg.y) : 99;
    let v = (20 - dist) * 6;
    if (tg && mv.y === tg.y) v += 40; /* cùng hàng với đích: đi thẳng, không lan man */
    if (hasEW) v += 8; /* lá đi thẳng qua, nối tiếp đường về Tây */
    v += exits.length * 2;
    if (dead) v -= 50;
    return v;
  }

  if (mv.type === 'play-action') {
    const kind = cardKind(mv.card);
    if (kind === 'map') {
      const unrevealed = s.goals.filter(g => !g.revealed).length;
      const peekedAny = me.peeked.length > 0;
      /* dùng Bản đồ sớm để biết vàng ở đâu (thợ đào cần hơn) */
      if (!peekedAny && unrevealed >= 2) return isSab ? 70 : 90;
      return -10;
    }
    if (kind === 'rockfall') {
      if (!isSab) return -30;
      const key = mv.x + ',' + mv.y;
      if (!reach.has(key)) return 5;
      const tg = target >= 0 ? s.goals[target] : null;
      const dist = tg ? Math.abs(mv.x - tg.x) + Math.abs(mv.y - tg.y) : 99;
      return 30 + Math.max(0, 6 - dist) * 4;
    }
    if (kind.startsWith('break-')) {
      if (!isSab) return -20;
      /* phá dụng cụ của người vừa đặt đường (nhiều khả năng là thợ đào đang xây) */
      return mv.target === s.lastPathBy ? 40 : 15;
    }
    if (kind.startsWith('repair-')) {
      const broken = me.tools.pickaxe || me.tools.lamp || me.tools.cart;
      return mv.target === pid && broken ? 50 : -10;
    }
  }

  if (mv.type === 'discard') {
    /* bỏ lá ít dùng nhất: thợ đào bỏ lá cụt, kẻ phá hoại giữ lá cụt để chặn */
    if (isPath(mv.card)) return isSab ? (isDeadEnd(mv.card) ? -40 : 0) : (isDeadEnd(mv.card) ? 5 : -5);
    return 0;
  }
  return 0;
}

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  const moves = legalMoves(s, pid);
  if (!moves.length) return null;
  /* Máy Dễ: 70% đánh bừa */
  if (!hard && Math.random() < 0.7) return pick(moves);
  /* Máy Khó (và 30% của máy Dễ): nước điểm cao nhất */
  const reach = reachableCells(s);
  const target = targetGoal(s, pid, reach);
  let best = null, bestV = -Infinity;
  for (const mv of moves) {
    const v = scoreMove(s, pid, mv, reach, target) + Math.random() * 0.5;
    if (v > bestV) { bestV = v; best = mv; }
  }
  return best;
}
