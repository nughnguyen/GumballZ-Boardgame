// 🎨 Bot Azul — chỉ dùng viewFor (không bao giờ đọc state thô).
// - Dễ: 70% nước bừa, 30% nước tốt.
// - Khó: với mỗi nước lấy gạch, mô phỏng trên bản sao bàn của mình (từ
//   view) rồi tính điểm: hoàn thành hàng mẫu thì tính điểm ốp tường +
//   thưởng hàng/cột/màu cuối ván, tránh tràn xuống hàng sàn, tránh lấy
//   dấu "1" khi không cần, chặn đối thủ (lấy nốt màu mà hàng mẫu của họ
//   đang chờ), và tránh đổ gạch thừa ra trung tâm cho đối thủ hưởng.
//   Bot không biết thứ tự túi gạch (chỉ biết số gạch còn).
import {
  viewFor, legalMovesFromView, canPlaceLine,
  wallScore, wallStats, wallCol, floorPenalty,
  COLORS, LINE_CAP,
} from './engine.js';

export function botAction(s, pid, level) {
  if (!s || s.phase !== 'playing') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const moves = legalMovesFromView(v, pid);
  if (!moves.length) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';
  /* Máy Dễ: 70% đánh bừa */
  if (!hard && Math.random() < 0.7) return moves[Math.floor(Math.random() * moves.length)];
  /* Máy Khó (và 30% của máy Dễ): nước tốt nhất theo view */
  return goodMove(v, moves);
}

/* số gạch mỗi màu còn trong xưởng + trung tâm (theo view) */
function supplyCounts(v) {
  const c = { B: 0, Y: 0, R: 0, K: 0, W: 0 };
  for (const f of v.factories) for (const t of f) c[t]++;
  for (const t of v.centre) c[t]++;
  return c;
}

/* giá trị của 1 nước lấy gạch, mô phỏng trên bản sao bàn của mình */
function scoreMove(v, me, move) {
  const before = supplyCounts(v);
  const taken = (move.from === 'factory' ? v.factories[move.source] : v.centre)
    .filter(c => c === move.color).length;
  /* bản sao bàn của mình */
  const lines = me.lines.map(l => ({ color: l.color, count: l.count }));
  const wall = me.wall.map(r => r.slice());
  const floor = me.floor.slice();
  let marker = me.marker;
  let val = 0;

  /* gạch thừa khi lấy từ xưởng sẽ đổ ra trung tâm — cho đối thủ hưởng */
  if (move.from === 'factory') {
    const rest = v.factories[move.source].filter(c => c !== move.color);
    let feed = 0;
    for (const c of rest) {
      for (const opp of v.players) {
        if (opp.id === me.id) continue;
        if (opp.lines.some(l => l.color === c && l.count < LINE_CAP[opp.lines.indexOf(l)])) { feed++; break; }
      }
    }
    val -= Math.min(feed * 0.3, 1.5);
  }

  /* lấy dấu "1": tốn 1 ô sàn nhưng được đi đầu vòng sau */
  if (move.from === 'centre' && v.markerInCentre) {
    marker = true;
    val -= 0.5;
  }

  /* đặt gạch vào hàng mẫu / hàng sàn */
  let overflow = taken;
  if (move.line >= 0) {
    const L = lines[move.line];
    const free = LINE_CAP[move.line] - L.count;
    const placed = Math.min(taken, free);
    const wasEmpty = L.count === 0;
    L.color = move.color;
    L.count += placed;
    overflow = taken - placed;
    if (L.count === LINE_CAP[move.line]) {
      /* hàng đầy -> ốp tường cuối vòng: tính điểm + thưởng hàng/cột/màu */
      const col = wallCol(move.line, move.color);
      wall[move.line][col] = true;
      val += wallScore(wall, move.line, col);
      const st = wallStats(wall);
      /* thưởng chỉ tính phần tăng thêm do gạch này (so với tường cũ) */
      const old = wallStats(me.wall);
      val += (st.bonus - old.bonus);
    } else {
      val += placed * 0.5; /* tiến độ lấp hàng */
      if (wasEmpty && LINE_CAP[move.line] >= 4) val -= 0.3; /* cam kết hàng dài */
    }
  }
  /* gạch tràn xuống sàn: trừ điểm sàn + ác cảm lãng phí */
  const oldFloorN = me.floor.length + (me.marker ? 1 : 0);
  for (let i = 0; i < overflow; i++) if (floor.length < 7) floor.push(move.color);
  const newFloorN = floor.length + (marker ? 1 : 0);
  val -= (floorPenalty(newFloorN) - floorPenalty(oldFloorN)) + overflow * 0.4;

  /* chặn đối thủ: lấy nốt màu mà hàng mẫu của họ đang chờ */
  const remaining = before[move.color] - taken;
  if (remaining === 0) {
    for (const opp of v.players) {
      if (opp.id === me.id) continue;
      for (let li = 0; li < 5; li++) {
        const L = opp.lines[li];
        if (L.color === move.color && L.count < LINE_CAP[li]) {
          val += (L.count === LINE_CAP[li] - 1) ? 2.5 : 1.5;
        }
      }
    }
  }
  return val;
}

function goodMove(v, moves) {
  const me = v.players.find(p => p.id === v.me);
  if (!me) return moves[0];
  let best = null, bestV = -Infinity;
  for (const m of moves) {
    let val = scoreMove(v, me, m);
    val += Math.random() * 0.4;
    if (val > bestV) { bestV = val; best = m; }
  }
  return best || moves[0];
}

export default { botAction };
