// 🐍🪜 Rắn và Thang (Snakes and Ladders) – luật chơi (thuần logic, không chạm DOM).
// Bàn 10×10 = 100 ô, đánh số kiểu rắn bò (boustrophedon) từ góc dưới-trái:
// hàng 1 là ô 1–10 đi trái→phải, hàng 2 là ô 11–20 đi phải→trái, xen kẽ
// lên tới ô 100 ở góc trên-trái. 2–4 người chơi, mỗi người 1 quân cờ.
// Tới lượt thì tung xúc xắc (1–6), đi tiến bấy nhiêu ô; trúng chân thang thì
// leo lên đầu thang, trúng đầu rắn thì trượt xuống đuôi rắn. Phải về ĐÚNG
// ô 100 mới thắng — tung quá thì đứng yên tại chỗ. Tung được 6 thì được
// tung tiếp 1 lần nữa. Trúng đầu thang hay đuôi rắn không kích hoạt gì thêm
// (không có chuỗi thang/rắn trong bàn này).
export const LADDERS = { 2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
export const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
export const COLORS = [
  { name: 'Đỏ', css: '#e0432f', light: '#ff8a7a', emoji: '🔴' },
  { name: 'Xanh dương', css: '#2f6fd6', light: '#7fb2ff', emoji: '🔵' },
  { name: 'Xanh lá', css: '#12a66a', light: '#5ed3a0', emoji: '🟢' },
  { name: 'Vàng', css: '#e0a800', light: '#ffd94a', emoji: '🟡' },
];
export const MIN_PLAYERS = 2, MAX_PLAYERS = 4, GOAL = 100;
/* số ô → tọa độ lưới: hàng 1 (ô 1–10) ở dưới cùng, đi trái→phải; hàng 2
   (ô 11–20) đi phải→trái, cứ thế xen kẽ lên tới ô 100 ở góc trên-trái.
   Trả {x, y} với y tính từ trên xuống (dùng cho CSS grid / SVG overlay). */
export function cellXY(n) {
  const row = Math.floor((n - 1) / 10); // 0 = hàng dưới cùng
  const col = row % 2 === 0 ? (n - 1) % 10 : 9 - ((n - 1) % 10);
  return { x: col, y: 9 - row };
}
/* kiểm tra bàn thang/rắn hợp lệ: thang đi lên, rắn đi xuống, đầu rắn không
   trùng đầu thang, đuôi rắn không trùng chân thang, đầu rắn không trùng
   chân thang, không trùng nhau trong cùng 1 loại. Đuôi rắn trùng đầu thang
   thì được (đáp xuống đầu thang không kích hoạt gì — không có chuỗi). */
export function validateLayout() {
  const lb = Object.keys(LADDERS).map(Number), lt = Object.values(LADDERS);
  const sh = Object.keys(SNAKES).map(Number), st = Object.values(SNAKES);
  const inter = (a, b) => a.filter(x => b.includes(x));
  const problems = [];
  if (!lb.every((b, i) => lt[i] > b)) problems.push('có thang không đi lên');
  if (!sh.every((h, i) => st[i] < h)) problems.push('có rắn không đi xuống');
  if (inter(sh, lt).length) problems.push('đầu rắn trùng đầu thang: ' + inter(sh, lt));
  if (inter(st, lb).length) problems.push('đuôi rắn trùng chân thang: ' + inter(st, lb));
  if (inter(sh, lb).length) problems.push('đầu rắn trùng chân thang: ' + inter(sh, lb));
  for (const [nm, arr] of [['chân thang', lb], ['đầu thang', lt], ['đầu rắn', sh], ['đuôi rắn', st]])
    if (new Set(arr).size !== arr.length) problems.push('trùng nhau trong ' + nm);
  return problems;
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error('Rắn và Thang chơi 2–4 người.');
  if (opts.online && players.length !== 2) throw new Error('Chơi online Rắn và Thang chỉ đúng 2 người.');
  const pos = {};
  for (const p of players) pos[p.id] = 0; /* 0 = chưa vào bàn (đang ở ô xuất phát) */
  /* 🎯 lượt đầu: mặc định ghế 0 (ván đầu theo ghế); chơi lại thì main truyền
     firstIdx (hoặc prevFirstIdx) để ĐỔI người đi đầu qua các ván — mọi client
     cùng thấy vì firstIdx nằm trong state chung. */
  const n = players.length;
  let firstIdx = 0;
  if (Number.isInteger(opts.firstIdx) && opts.firstIdx >= 0 && opts.firstIdx < n) firstIdx = opts.firstIdx;
  else if (Number.isInteger(opts.prevFirstIdx) && opts.prevFirstIdx >= 0 && opts.prevFirstIdx < n && n > 1) firstIdx = (opts.prevFirstIdx + 1) % n;
  const gameNo = Number.isInteger(opts.gameNo) && opts.gameNo > 0 ? opts.gameNo : 1;
  const st = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0, phase: 'playing',
    players: players.map((p, i) => ({
      id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local,
      level: p.level || null, color: i,
    })),
    pos, out: [],
    turn: players[firstIdx].id, turnNo: 1, moveCount: 0,
    firstIdx, firstId: players[firstIdx].id, gameNo,
    lastRoll: null, lastMove: null,
    winner: null, draw: false, endReason: null, log: [],
  };
  pushLog(st, `🎯 ${players[firstIdx].name} đi trước!`);
  return st;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < MIN_PLAYERS || s.players.length > MAX_PLAYERS) throw new Error('Trạng thái Rắn và Thang không hợp lệ.');
  if (!s.pos || typeof s.pos !== 'object') throw new Error('Trạng thái Rắn và Thang không hợp lệ.');
  return s;
}
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const cellName = n => n === 0 ? 'ô xuất phát' : 'ô ' + n;
/* người chơi tiếp theo còn trong ván (bỏ qua người đã xin thua), tính từ
   vị trí fromIdx; trả -1 nếu không còn ai (không xảy ra khi còn ≥2 người). */
function nextActiveIdx(s, fromIdx) {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (fromIdx + k) % n;
    if (!s.out.includes(s.players[i].id)) return i;
  }
  return -1;
}
function advanceTurn(s) {
  const cur = pIdx(s, s.turn);
  const ni = nextActiveIdx(s, cur);
  if (ni >= 0) { s.turn = s.players[ni].id; s.turnNo++; }
}

/* Tung xúc xắc: value do người tới lượt tung ra (1–6), gửi kèm trong action
   nên 2 bên áp cùng 1 action sẽ ra cùng 1 trạng thái. Tung 6 thì được tung
   tiếp (lượt không đổi); tung quá ô 100 thì đứng yên (vẫn tính là đã tung). */
export function applyRoll(s, pid, value) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  if (!Number.isInteger(value) || value < 1 || value > 6) return { ok: false, reason: 'Xúc xắc chỉ ra từ 1 đến 6.' };
  const from = s.pos[pid] || 0;
  const target = from + value;
  s.seq++; s.moveCount++;
  s.lastRoll = { by: pid, value, n: s.seq };
  const extra = value === 6;
  if (target > GOAL) {
    s.lastMove = { by: pid, roll: value, from, landed: from, to: from, ladder: false, snake: false, overshoot: true, extra, n: s.seq };
    pushLog(s, `${me.name} tung ${value} — cần đúng ${GOAL - from} để về đích nên đứng yên tại ${cellName(from)}${extra ? ' (tung 6, được tung tiếp!)' : ''}.`);
    if (!extra) advanceTurn(s);
    return { ok: true, ended: false, overshoot: true, ladder: false, snake: false, extra };
  }
  let to = target, ladder = false, snake = false;
  if (LADDERS[target]) { to = LADDERS[target]; ladder = true; }
  else if (SNAKES[target]) { to = SNAKES[target]; snake = true; }
  s.pos[pid] = to;
  s.lastMove = { by: pid, roll: value, from, landed: target, to, ladder, snake, overshoot: false, extra: extra && to !== GOAL, n: s.seq };
  if (ladder) pushLog(s, `${me.name} tung ${value}: ${cellName(from)} → ô ${target} rồi leo thang lên ô ${to}! 🪜${extra ? ' (tung 6, được tung tiếp!)' : ''}`);
  else if (snake) pushLog(s, `${me.name} tung ${value}: ${cellName(from)} → ô ${target} rồi trượt rắn xuống ô ${to}! 🐍${extra ? ' (tung 6, được tung tiếp!)' : ''}`);
  else pushLog(s, `${me.name} tung ${value}: ${cellName(from)} → ô ${to}${extra ? ' (tung 6, được tung tiếp!)' : ''}.`);
  if (to === GOAL) {
    s.phase = 'ended'; s.winner = pid; s.endReason = 'win';
    pushLog(s, `🏁 ${me.name} về đúng ô 100 — thắng!`, 'win');
    return { ok: true, ended: true, ladder, snake, overshoot: false, extra: false };
  }
  if (!extra) advanceTurn(s);
  return { ok: true, ended: false, ladder, snake, extra };
}

/* Xin thua: người xin thua rời ván (không đi nữa). Nếu chỉ còn 1 người thì
   người đó thắng luôn. Người xin thua đúng lượt của mình thì lượt chuyển
   sang người tiếp theo còn trong ván. */
export function applyResign(s, pid) {
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (s.out.includes(pid)) return { ok: false, reason: 'Bạn đã rời ván rồi.' };
  s.out.push(pid);
  s.seq++;
  pushLog(s, `${me.name} xin thua — rời ván.`);
  const active = s.players.filter(p => !s.out.includes(p.id));
  if (active.length === 1) {
    s.phase = 'ended'; s.winner = active[0].id; s.endReason = 'resign';
    pushLog(s, `🏆 ${active[0].name} thắng — là người còn lại duy nhất!`, 'win');
    return { ok: true, ended: true };
  }
  if (s.turn === pid) advanceTurn(s);
  return { ok: true, ended: false };
}

export const actors = s => (s.phase === 'playing' && s.turn ? [s.turn] : []);
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: s.turn, turnNo: s.turnNo,
    firstIdx: s.firstIdx, firstId: s.firstId, gameNo: s.gameNo || 1,
    moveCount: s.moveCount, winner: s.winner, draw: s.draw,
    endReason: s.endReason, pos: { ...s.pos }, out: [...s.out],
    lastRoll: s.lastRoll, lastMove: s.lastMove,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, color: p.color })),
    log: s.log.slice(-30),
    me: pid, myColor: me ? me.color : null,
  };
}
/* Adapter cho phòng online (simplenet): action { type, value? }.
   Số xúc xắc do người tới lượt tung ra và gửi kèm trong action nên 2 bên
   áp cùng 1 action sẽ ra cùng 1 trạng thái. */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'roll': return applyRoll(s, pid, a.value);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
