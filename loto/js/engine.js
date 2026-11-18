// 🎪 Lô tô hội chợ – luật, thuần logic. Phòng/mạng dùng shared/net/simplenet.js.
// Tờ vé: 9 hàng × 9 cột, mỗi hàng 5 số, cột c chứa số thuộc hàng chục c (cột 0: 1–9, cột 8: 80–90). Ô trống = 0.
// Chủ phòng là "quản trò": máy tự bốc số theo nhịp (hoặc bấm tay). Ai đủ 5 số trên một hàng thì bấm KINH!
export const DEFAULT_OPTS = { speed: 5 };
export const CHOICES = { speed: [3, 5, 8, 0] }; /* giây mỗi số; 0 = chủ phòng tự bấm bốc */
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);
export const ROWS = 9, COLS = 9, PER_ROW = 5, MAXN = 90;
const shuffle = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const colRange = c => c === 0 ? [1, 9] : c === 8 ? [80, 90] : [c * 10, c * 10 + 9];

export function makeTicket(rnd = Math.random) {
  /* khuôn 0/1: mỗi hàng 5 ô, mỗi cột 5 ô. Bắt đầu từ khuôn xoay vòng rồi xáo hàng, xáo cột, đổi chéo ngẫu nhiên (giữ nguyên tổng hàng/cột) */
  let m = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => ((c - r + COLS) % COLS) < PER_ROW ? 1 : 0));
  const rp = shuffle([...Array(ROWS).keys()], rnd), cp = shuffle([...Array(COLS).keys()], rnd);
  m = rp.map(r => cp.map(c => m[r][c]));
  for (let k = 0; k < 200; k++) {
    const r1 = Math.floor(rnd() * ROWS), r2 = Math.floor(rnd() * ROWS), c1 = Math.floor(rnd() * COLS), c2 = Math.floor(rnd() * COLS);
    if (m[r1][c1] && m[r2][c2] && !m[r1][c2] && !m[r2][c1]) { m[r1][c1] = m[r2][c2] = 0; m[r1][c2] = m[r2][c1] = 1; }
  }
  for (let c = 0; c < COLS; c++) {
    const [a, b] = colRange(c), nums = shuffle(Array.from({ length: b - a + 1 }, (_, i) => a + i), rnd).slice(0, PER_ROW);
    let k = 0; for (let r = 0; r < ROWS; r++) if (m[r][c]) m[r][c] = nums[k++];
  }
  return m;
}
export const rowNums = row => row.filter(n => n > 0);
/* hàng nào đã đủ 5 số (theo các số đã ra) */
export function fullRows(ticket, calledSet) { const out = []; if (!Array.isArray(ticket)) return out; /* người không có vé (vd. vào thay giữa ván) thì coi như chưa trúng hàng nào */ ticket.forEach((row, i) => { if (rowNums(row).every(n => calledSet.has(n))) out.push(i); }); return out; }
export function bestRow(ticket, calledSet) { if (!Array.isArray(ticket)) return 0; return Math.max(...ticket.map(row => rowNums(row).filter(n => calledSet.has(n)).length)); }

export function createGame(players, opts, rnd = Math.random) {
  if (typeof rnd !== 'function') rnd = Math.random;
  const tickets = {}; players.forEach(p => { tickets[p.id] = makeTicket(rnd); });
  return { gid: Math.random().toString(36).slice(2, 8), seq: 0, phase: 'play', opts: { ...DEFAULT_OPTS, ...opts }, players: players.map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, color: i % 8 })),
    tickets, bag: shuffle(Array.from({ length: MAXN }, (_, i) => i + 1), rnd), called: [], winners: [], winRows: {}, paused: false, missAt: {}, last: null };
}
export function applyAction(s, pid, a) {
  if (!s || s.phase !== 'play') return { ok: false, reason: 'Ván đã xong.' };
  if (a.type === 'draw') {
    if (pid !== 'host') return { ok: false, reason: 'Chỉ quản trò (chủ phòng) được bốc số.' };
    if (!s.bag.length) return { ok: false, reason: 'Hết số rồi.' };
    s.called.push(s.bag.pop()); s.last = { t: 'draw', n: s.called[s.called.length - 1] };
    if (!s.bag.length) { s.phase = 'ended'; } /* ra hết 90 số mà không ai kinh */
  } else if (a.type === 'pause') {
    if (pid !== 'host') return { ok: false, reason: 'Chỉ chủ phòng được tạm dừng.' };
    s.paused = !!a.on;
  } else if (a.type === 'kinh') {
    if (!s.tickets[pid]) return { ok: false, reason: 'Bạn đang xem, không có vé.' };
    if (s.missAt[pid] === s.called.length) return { ok: false, reason: 'Vừa kinh hụt rồi, chờ số kế tiếp nha.' };
    const cs = new Set(s.called);
    if (!fullRows(s.tickets[pid], cs).length) { s.missAt[pid] = s.called.length; s.last = { t: 'miss', id: pid }; s.seq++; return { ok: true }; }
    /* ai cũng đủ hàng ở cùng số này thì cùng thắng ("kinh trùng") */
    for (const p of s.players) { const f = fullRows(s.tickets[p.id], cs); if (f.length) { s.winners.push(p.id); s.winRows[p.id] = f; } }
    s.winners.sort((x, y) => (y === pid) - (x === pid)); s.phase = 'ended'; s.last = { t: 'kinh', id: pid };
  } else return { ok: false, reason: 'Không hiểu.' };
  s.seq++; return { ok: true };
}
/* bot (và người rớt mạng) đủ hàng thì hô kinh */
export function actors(s) { if (s.phase !== 'play') return []; const cs = new Set(s.called); return s.players.filter(p => s.missAt[p.id] !== s.called.length && fullRows(s.tickets[p.id], cs).length).map(p => p.id); }
export const botAction = () => ({ type: 'kinh' });
export function viewFor(s, pid) {
  const { bag, tickets, ...v } = s, cs = new Set(s.called), ended = s.phase === 'ended';
  return { ...v, left: bag.length, ticket: tickets[pid] || null,
    players: s.players.map(p => ({ ...p, best: bestRow(tickets[p.id], cs) })),
    shown: ended ? Object.fromEntries(s.winners.map(id => [id, tickets[id]])) : null };
}
