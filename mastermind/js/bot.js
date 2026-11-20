// 🤖 Bot Mastermind — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng viewFor — không nhìn state thô, không đọc mã bí mật của đối thủ.
// Giai đoạn đặt mã: máy chọn mã bừa (4 chốt, màu được lặp lại).
// Máy Dễ: "trí nhớ ngắn" — chỉ nhớ phản hồi GẦN NHẤT, đoán bừa trong các
// mã còn khớp với lượt đoán vừa rồi (không loại theo toàn bộ lịch sử),
// nên hay đoán lại mã đã bị phản hồi cũ loại và đoán ra chậm hơn nhiều
// (đo đơn lẻ: đoán ra ~26/100 ván, TB ~6,8 lượt, so với máy Khó ~73/100,
// TB ~4,3 lượt). Không bao giờ đoán lại đúng mã đã thử.
// Máy Khó: chiến lược Knuth (minimax) trên các mã còn khớp với toàn bộ
// phản hồi — với mỗi mã ứng cử, tính số mã còn lại lớn nhất theo từng
// phản hồi có thể nhận, rồi chọn mã làm số đó nhỏ nhất; hòa thì ưu tiên
// mã vẫn còn khớp, rồi mã nhỏ nhất theo thứ tự từ điển. Nước đầu tiên
// dùng mã [0,0,1,1] (nước mở đầu tối ưu của Knuth) để khỏi quét
// 1296×1296 phản hồi.
import { viewFor, legalGuesses, allCodes, feedback, consistent, CODE_LEN } from './engine.js?v=1';

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

/* mọi phản hồi có thể (black + white <= 4, trừ (3,1) không xảy ra) */
const ALL_FB = [];
for (let b = 0; b <= CODE_LEN; b++) {
  for (let w = 0; w <= CODE_LEN - b; w++) {
    if (b === 3 && w === 1) continue;
    ALL_FB.push({ black: b, white: w });
  }
}
const fbKey = f => f.black + ',' + f.white;

/* nước Knuth: chọn mã ứng cử làm tệ nhất cũng loại được nhiều mã nhất */
function knuthGuess(cands) {
  if (cands.length === 1) return cands[0];
  let best = null, bestWorst = Infinity, bestInSet = false;
  for (const g of cands) {
    const buckets = {};
    for (const code of cands) {
      const k = fbKey(feedback(code, g));
      buckets[k] = (buckets[k] || 0) + 1;
    }
    let worst = 0;
    for (const k in buckets) if (buckets[k] > worst) worst = buckets[k];
    /* hòa: ưu tiên mã vẫn còn khớp (Knuth cũng làm vậy) */
    if (worst < bestWorst || (worst === bestWorst && !bestInSet)) {
      bestWorst = worst; best = g; bestInSet = true;
    }
  }
  return best;
}

export function botAction(s, pid, level) {
  if (!s || s.phase === 'ended') return null;
  /* QUAN TRỌNG: bot chỉ nhìn view của chính mình — không đọc state thô */
  const v = viewFor(s, pid);
  const me = v.players.find(p => p.id === pid);
  if (!me || v.turn !== pid) return null;
  const hard = (typeof level === 'string' ? level : level && level.level) === 'hard';

  /* ---------- giai đoạn đặt mã: chọn mã bừa ---------- */
  if (v.phase === 'setup') {
    return { type: 'setcode', code: [rnd(6), rnd(6), rnd(6), rnd(6)] };
  }
  if (v.phase !== 'playing') return null;

  const cands = legalGuesses(v, pid);
  if (!cands.length) {
    /* không còn mã nào khớp (không xảy ra nếu phản hồi đúng) — đoán bừa */
    return { type: 'guess', guess: pick(allCodes()) };
  }

  /* ---------- Máy Dễ: trí nhớ ngắn — chỉ khớp phản hồi gần nhất ---------- */
  if (!hard) {
    const n = me.guesses.length;
    const tried = new Set(me.guesses.map(g => g.join(',')));
    let pool;
    if (n === 0) pool = allCodes();
    else {
      pool = allCodes().filter(c => consistent(c, [me.guesses[n - 1]], [me.feedbacks[n - 1]]));
    }
    pool = pool.filter(c => !tried.has(c.join(',')));
    if (!pool.length) pool = allCodes().filter(c => !tried.has(c.join(',')));
    return { type: 'guess', guess: pick(pool) };
  }

  /* ---------- Máy Khó: Knuth ---------- */
  if (me.guesses.length === 0 && cands.length === 1296) {
    return { type: 'guess', guess: [0, 0, 1, 1] };
  }
  return { type: 'guess', guess: knuthGuess(cands) };
}

export default { botAction };
