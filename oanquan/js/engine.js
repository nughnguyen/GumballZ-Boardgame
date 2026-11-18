// 🪀 Ô Ăn Quan – luật chơi (thuần logic, không chạm DOM).
// Bàn cờ là mảng vòng tròn 12 ô theo chiều kim đồng hồ:
//   ô 0 = Ô Quan Trái (bán nguyệt trái), ô 1–5 = 5 ô dân hàng trên (Người chơi 2 / Máy),
//   ô 6 = Ô Quan Phải (bán nguyệt phải), ô 7–11 = 5 ô dân hàng dưới (Người chơi 1).
// Hướng rải: +1 = theo chiều kim đồng hồ, −1 = ngược chiều kim đồng hồ. Trên MÀN HÌNH thì
// hướng này ngược nhau ở 2 hàng (hàng trên xếp 1..5 trái→phải, hàng dưới xếp 11..7 trái→phải)
// nên giao diện KHÔNG dùng "Trái/Phải = dir" nữa mà suy dir từ ô kề được bấm (dirFromNeighbor).
// Mỗi ô là { q: số Quan, d: số Dân }. Quan chỉ nằm trong 2 ô Quan; thả quân luôn thả 1 Dân
// (kể cả khi thả vào ô Quan). Ăn 1 ô thì ăn cả Quan lẫn Dân trong ô đó.
// Luật lượt (xét ô kế tiếp ngay sau ô vừa thả viên cuối):
//   A. ô Dân có quân → bốc hết lên, rải tiếp theo hướng cũ.
//   B. ô Quan đang có quân → KHÔNG được bốc, mất lượt ("chững").
//   C. ô trống + ô sau đó có quân → ĂN ô sau đó; ăn dây: sau ô vừa ăn, ô kế trống + ô sau có quân → ăn tiếp.
//   D. ô trống + ô sau cũng trống → hết lượt.
// Luật "Cứu dân": đầu lượt, nếu 5 ô dân bên mình đều trống mà ván chưa kết thúc thì bắt buộc
// trích 5 Dân từ túi điểm rải đều (mỗi ô 1 quân). Không đủ Dân thì đổi 1 Quan = 10 Dân trước;
// vẫn thiếu thì vay Dân trong túi đối phương (ghi nợ, trừ vào tổng điểm cuối trận).
// Nếu vẫn không đủ (túi mình hết Dân + hết Quan, túi đối phương cũng không đủ Dân để vay)
// thì ván kết thúc ngay, tính điểm tàn quân.
// Kết thúc: khi cả 2 ô Quan đều trống (cả Quan lẫn Dân). Tàn quân: Dân còn trên 5 ô hàng
// của bên nào thuộc về bên đó. Quân còn trong 2 ô Quan lúc ván kết thúc do không cứu được
// dân thì KHÔNG tính cho bên nào (luật này chỉ xảy ra ở trường hợp biên đó, vì kết thúc
// thường thì 2 ô Quan đã trống). Tổng điểm = Quan ăn được × giá trị Quan (5 hoặc 10)
// + Dân có được − nợ vay (không âm).
export const N = 12;
export const MANDARIN = [0, 6];
export const QUAN_VALUES = [5, 10];
export const QUAN_DEFAULT = 10;
/* Tùy chọn bàn cho phòng online (simplenet): chủ phòng chọn trong phòng chờ,
   khách chỉ xem. optOk để máy chủ từ chối giá trị lạ gửi từ khách. */
export const DEFAULT_OPTS = { quanValue: QUAN_DEFAULT };
export const OPT_CHOICES = { quanValue: QUAN_VALUES };
export const optOk = (k, v) => k in OPT_CHOICES && OPT_CHOICES[k].includes(v);
/* 5 ô dân của từng bên, theo chỉ số người chơi (0 = Người chơi 1, hàng dưới; 1 = Người chơi 2, hàng trên) */
export const SIDE_CELLS = [[7, 8, 9, 10, 11], [1, 2, 3, 4, 5]];
export const isMandarin = c => c === 0 || c === 6;
export const nextCell = (c, dir) => (c + dir + N) % N;
/* Hướng rải suy ra từ ô kề được bấm (cơ chế bấm ô kề, thay cho 2 nút mũi tên):
   ô kề == ô tiếp theo theo dir +1 → rải +1; ô kề == ô tiếp theo theo dir −1 → rải −1;
   không phải ô kề → 0 (không rải).
   Vì hàng trên xếp trái→phải là 1..5 còn hàng dưới xếp trái→phải là 11..7 nên cùng 1 dir
   sẽ đi ngược hướng trên màn hình ở 2 hàng (vd: dir +1 đi sang PHẢI ở hàng trên nhưng sang
   TRÁI ở hàng dưới) — suy hướng từ ô kề thì luôn khớp với màn hình ở cả 2 hàng. */
export function dirFromNeighbor(cell, neighbor) {
  if (neighbor === nextCell(cell, 1)) return 1;
  if (neighbor === nextCell(cell, -1)) return -1;
  return 0;
}
export const neighborCells = cell => [nextCell(cell, -1), nextCell(cell, 1)];
/* Trạng thái bốc đá (cơ chế bấm ô kề): heldCell = ô đang bốc, null nếu chưa bốc.
   Trả về hành động cho 1 lần bấm ô:
   - 'pickup': chưa bốc mà bấm ô dân bên mình còn quân → bốc lên.
   - 'putback': bấm lại chính ô gốc → đặt đá về, hủy bốc.
   - 'sow': đang bốc mà bấm ô kề → rải theo dir suy ra từ ô kề.
   - 'ignore': mọi trường hợp còn lại (ô trống, ô đối phương, ô không kề…) → giữ nguyên
     trạng thái đang bốc (nếu có), không làm gì cả. */
export function resolveHoldClick({ heldCell, clicked, mySide, stones }) {
  if (heldCell == null) {
    return (mySide.includes(clicked) && stones > 0) ? { action: 'pickup' } : { action: 'ignore' };
  }
  if (clicked === heldCell) return { action: 'putback' };
  const dir = dirFromNeighbor(heldCell, clicked);
  return dir !== 0 ? { action: 'sow', dir } : { action: 'ignore' };
}
export const cellTotal = cell => (cell.q || 0) + (cell.d || 0);
const emptyCell = () => ({ q: 0, d: 0 });

export function createGame(players, opts = {}) {
  if (!players || players.length !== 2) throw new Error('Ô Ăn Quan chơi 2 người.');
  const quanValue = QUAN_VALUES.includes(opts.quanValue) ? opts.quanValue : QUAN_DEFAULT;
  const cells = Array.from({ length: N }, emptyCell);
  cells[0] = { q: 1, d: 0 };
  cells[6] = { q: 1, d: 0 };
  for (const c of [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]) cells[c] = { q: 0, d: 5 };
  return {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    opts: { quanValue },
    cells,
    players: players.map(p => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      bag: { q: 0, d: 0 }, debt: 0,
    })),
    turn: players[0].id, turnNo: 1, winner: null, draw: false,
    scores: null, endReason: null, lastMove: null, lastTrace: [], log: [],
  };
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const pOf = (s, id) => s.players.find(p => p.id === id);
const foeOf = (s, id) => s.players.find(p => p.id !== id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
export const sideCells = (s, pid) => SIDE_CELLS[pIdx(s, pid)] || [];
/* tổng điểm hiện tại của từng người (tàn quân chỉ tính khi ván đã kết thúc hoặc để xem trước) */
export function scores(s) {
  const qv = s.opts.quanValue || QUAN_DEFAULT;
  return s.players.map((p, i) => {
    const side = SIDE_CELLS[i].reduce((a, c) => a + s.cells[c].d, 0);
    return { id: p.id, bag: { ...p.bag }, side, debt: p.debt, total: Math.max(0, p.bag.q * qv + p.bag.d + side - p.debt) };
  });
}
export function legalMoves(s, pid) {
  if (s.phase !== 'playing' || s.turn !== pid) return [];
  const out = [];
  for (const c of sideCells(s, pid)) if (s.cells[c].d > 0) { out.push({ cell: c, dir: 1 }); out.push({ cell: c, dir: -1 }); }
  return out;
}
const bothMandarinEmpty = s => cellTotal(s.cells[0]) === 0 && cellTotal(s.cells[6]) === 0;
function endGame(s, reason) {
  s.phase = 'ended';
  s.endReason = reason;
  s.scores = scores(s);
  const [a, b] = s.scores;
  if (a.total > b.total) s.winner = a.id;
  else if (b.total > a.total) s.winner = b.id;
  else { s.winner = null; s.draw = true; }
  const wName = s.winner ? pOf(s, s.winner).name : null;
  pushLog(s, reason === 'mandarin'
    ? `🏁 Cả 2 ô Quan đều trống – ván kết thúc! ${s.draw ? 'Hoà!' : wName + ' thắng ' + Math.max(a.total, b.total) + ' – ' + Math.min(a.total, b.total) + '!'}`
    : `🏁 Không cứu được dân – ván kết thúc! ${s.draw ? 'Hoà!' : wName + ' thắng ' + Math.max(a.total, b.total) + ' – ' + Math.min(a.total, b.total) + '!'}`, 'win');
  return s.scores;
}
/* Cứu dân cho người chơi vừa tới lượt (gọi ngay sau khi đổi lượt). Trả về trace cứu dân,
   null nếu không cần cứu, hoặc { failed: true } nếu không cứu được → kết thúc ván. */
function tryRescue(s, pid, trace) {
  const pi = pIdx(s, pid), p = s.players[pi], foe = s.players[1 - pi];
  const side = SIDE_CELLS[pi];
  if (!side.every(c => s.cells[c].d === 0)) return null; /* vẫn còn quân, không cần cứu */
  const need0 = 5;
  /* kiểm tra khả năng TRƯỚC khi đụng vào túi nào (để thất bại thì không mất gì) */
  if (p.bag.d + p.bag.q * 10 + foe.bag.d < need0) return { failed: true };
  let need = need0, fromBag = 0, converted = 0, borrowed = 0;
  fromBag = Math.min(p.bag.d, need); p.bag.d -= fromBag; need -= fromBag;
  while (need > 0 && p.bag.q > 0) {
    p.bag.q--; p.bag.d += 10; converted++;
    const take = Math.min(p.bag.d, need); p.bag.d -= take; need -= take;
  }
  if (need > 0) {
    borrowed = Math.min(foe.bag.d, need);
    foe.bag.d -= borrowed; p.debt += borrowed; need -= borrowed;
  }
  side.forEach(c => { s.cells[c].d = 1; });
  const info = { t: 'rescue', cells: [...side], fromBag, converted, borrowed };
  trace.push(info);
  pushLog(s, `🛟 ${p.name} hết quân bên mình nên cứu dân: rải đều 1 Dân vào 5 ô${converted ? ` (đổi ${converted} Quan = ${converted * 10} Dân)` : ''}${borrowed ? ` (vay ${borrowed} Dân của ${foe.name}, trừ vào điểm cuối trận)` : ''}.`, 'rescue');
  return info;
}

/* Thực hiện 1 nước đi (bốc ô cell, rải theo dir). Trả về { ok, trace, ... }.
   trace để giao diện animate từng bước: pickup / drop / eat / chain / stop / rescue / end. */
const MAX_DROPS = 1000; /* chặn vòng lặp bệnh lý: 1 nước không bao giờ rải quá số này */
export function applyMove(s, pid, move) {
  if (!move || s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const { cell, dir } = move;
  if (dir !== 1 && dir !== -1) return { ok: false };
  if (!sideCells(s, pid).includes(cell)) return { ok: false, reason: 'Chỉ được bốc ô dân bên phía mình.' };
  if (s.cells[cell].d <= 0) return { ok: false, reason: 'Ô này không còn quân.' };
  const trace = [];
  const eaten = { q: 0, d: 0 };
  let chainMax = 0;
  /* bốc toàn bộ quân ở ô đã chọn */
  let hand = s.cells[cell].d;
  s.cells[cell].d = 0;
  trace.push({ t: 'pickup', cell, n: hand });
  let cur = cell, drops = 0, stopped = null;
  /* rải: thả từng viên, rồi xét ô kế tiếp (A: rải tiếp / B: chững vì Quan / C: ăn / D: 2 ô trống) */
  while (true) {
    while (hand > 0) {
      if (++drops > MAX_DROPS) { stopped = { t: 'stop', why: 'guard' }; break; }
      cur = nextCell(cur, dir);
      s.cells[cur].d++;
      hand--;
      trace.push({ t: 'drop', cell: cur });
    }
    if (stopped) break;
    const nxt = nextCell(cur, dir), nc = s.cells[nxt];
    if (isMandarin(nxt) && cellTotal(nc) > 0) { stopped = { t: 'stop', why: 'mandarin', cell: nxt }; trace.push(stopped); break; } /* B */
    if (!isMandarin(nxt) && nc.d > 0) { /* A: bốc hết ô Dân kế tiếp, rải tiếp hướng cũ */
      hand = nc.d; nc.d = 0;
      trace.push({ t: 'pickup', cell: nxt, n: hand });
      cur = nxt;
      continue;
    }
    const nxt2 = nextCell(nxt, dir), c2 = s.cells[nxt2];
    if (cellTotal(c2) > 0) { /* C: ăn ô sau ô trống, rồi ăn dây */
      let e = nxt2, chain = 0;
      while (chain < N) {
        const ce = s.cells[e];
        me.bag.q += ce.q; me.bag.d += ce.d;
        eaten.q += ce.q; eaten.d += ce.d;
        trace.push({ t: 'eat', cell: e, q: ce.q, d: ce.d });
        s.cells[e] = emptyCell();
        chain++;
        const e1 = nextCell(e, dir), e2 = nextCell(e1, dir);
        if (cellTotal(s.cells[e1]) > 0) break; /* ô kế có quân chặn lại */
        if (cellTotal(s.cells[e2]) === 0) break; /* 2 ô trống liên tiếp */
        e = e2;
      }
      chainMax = Math.max(chainMax, chain);
      trace.push({ t: 'chain', n: chain });
      stopped = { t: 'stop', why: 'eat', chain };
      break;
    }
    stopped = { t: 'stop', why: 'empty', cell: nxt }; trace.push(stopped); break; /* D */
  }
  s.seq++;
  s.lastMove = { by: pid, cell, dir, eaten: { ...eaten }, chain: chainMax, stopped: stopped ? stopped.why : null };
  if (eaten.q > 0 || eaten.d > 0) pushLog(s, `😋 ${me.name} ăn ${eaten.q ? eaten.q + ' Quan ' : ''}${eaten.d ? eaten.d + ' Dân' : ''} ở ${chainMax > 1 ? 'dây ' + chainMax + ' ô' : '1 ô'}!`, 'eat');
  /* hết ván chưa? (cả 2 ô Quan đều trống) */
  if (bothMandarinEmpty(s)) {
    endGame(s, 'mandarin');
    trace.push({ t: 'end', reason: 'mandarin' });
    return { ok: true, trace, eaten, chain: chainMax, ended: true };
  }
  /* đổi lượt, rồi cứu dân cho người vừa tới lượt (nếu bên họ hết quân) */
  const foe = foeOf(s, pid);
  s.turn = foe.id; s.turnNo++;
  const rescue = tryRescue(s, foe.id, trace);
  if (rescue && rescue.failed) {
    endGame(s, 'rescue');
    trace.push({ t: 'end', reason: 'rescue' });
    return { ok: true, trace, eaten, chain: chainMax, ended: true, rescueFailed: true };
  }
  return { ok: true, trace, eaten, chain: chainMax, ended: false, rescue: rescue || null };
}
export const actors = s => (s.phase === 'playing' && s.turn ? [s.turn] : []);
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: s.turn, turnNo: s.turnNo,
    winner: s.winner, draw: s.draw, scores: s.scores, endReason: s.endReason,
    cells: s.cells.map(c => ({ ...c })), quanValue: s.opts.quanValue,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, bag: { ...p.bag }, debt: p.debt })),
    log: s.log.slice(-30), lastMove: s.lastMove,
    trace: s.lastTrace || [], /* dấu vết nước vừa đi — 2 bên cùng chạy 1 animation bàn tay */
    me: pid, mySide: me ? sideCells(s, pid) : [],
  };
}
/* Adapter cho phòng online (simplenet): action { type:'move', cell, dir }.
   Luật cứu dân nằm trọn trong applyMove với thứ tự cố định (túi Dân mình →
   đổi 1 Quan = 10 Dân → vay đối phương) nên 2 bên áp cùng 1 action sẽ ra
   cùng 1 trạng thái — không có lựa chọn nào khác nằm ngoài action. */
export function applyAction(s, pid, a, ctx) {
  if (!a || a.type !== 'move') return { ok: false, reason: 'Hành động không hợp lệ.' };
  const r = applyMove(s, pid, { cell: a.cell, dir: a.dir });
  if (r.ok) s.lastTrace = r.trace;
  return r;
}
