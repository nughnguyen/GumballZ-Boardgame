// 🎲 Bầu cua tôm cá – thuần logic. Cả bàn cùng đặt xu ảo vào 6 con, lắc 3 xúc xắc: ra con nào trúng con đó (1 ăn 1 cho mỗi mặt ra).
export const SYMS = ['nai', 'bau', 'ga', 'ca', 'cua', 'tom'], SYM_VN = { nai: 'Nai', bau: 'Bầu', ga: 'Gà', ca: 'Cá', cua: 'Cua', tom: 'Tôm' };
export const CHIPS = [5, 10, 20, 50], START = 100, RELIEF = 20;
export const DEFAULT_OPTS = { rounds: 10 };
export const CHOICES = { rounds: [5, 10, 15, 20] };
export const optOk = (k, v) => k in CHOICES && CHOICES[k].includes(v);
export const betSum = b => Object.values(b || {}).reduce((x, y) => x + y, 0);

export function createGame(players, opts = {}) {
  const s = { gid: Math.random().toString(36).slice(2, 8), seq: 0, phase: 'play', stage: 'bet', round: 1, opts: { ...DEFAULT_OPTS, ...opts },
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot })), cash: {}, bets: {}, ready: {}, dice: null, gain: null, relief: [], winner: null, result: null };
  for (const p of players) { s.cash[p.id] = START; s.bets[p.id] = {}; s.ready[p.id] = false; }
  return s;
}
function roll(s, rnd) {
  s.dice = [0, 1, 2].map(() => SYMS[Math.floor(rnd() * 6)]); s.gain = {};
  for (const p of s.players) { let g = 0; for (const [k, amt] of Object.entries(s.bets[p.id])) { const n = s.dice.filter(d => d === k).length; g += n ? amt * n : -amt; } s.gain[p.id] = g; s.cash[p.id] += g; s.ready[p.id] = false; }
  s.stage = 'result';
}
function next(s) {
  if (s.round >= s.opts.rounds) {
    const order = s.players.map(p => p.id).sort((a, b) => s.cash[b] - s.cash[a]); s.phase = 'ended'; s.stage = null; s.winner = order[0]; s.result = { order, cash: { ...s.cash } }; return;
  }
  s.round++; s.stage = 'bet'; s.relief = [];
  for (const p of s.players) { s.bets[p.id] = {}; s.ready[p.id] = false; if (s.cash[p.id] < CHIPS[0]) { s.cash[p.id] += RELIEF; s.relief.push(p.id); } } /* cháy túi thì được phát 20 xu cứu trợ để chơi tiếp */
}
export function applyAction(s, pid, a, rnd) {
  if (typeof rnd !== 'function') rnd = Math.random;
  if (s.phase !== 'play' || !a) return { ok: false, reason: 'Ván đã xong.' };
  const mine = pid in s.cash, isHost = pid === 'host';
  if (s.stage === 'bet') {
    if (a.type === 'force' && isHost) { s.seq++; roll(s, rnd); return { ok: true }; }
    if (!mine) return { ok: false, reason: 'Bạn đang xem.' };
    if (a.type === 'bet') {
      if (!SYMS.includes(a.sym) || !CHIPS.includes(a.amt)) return { ok: false, reason: 'Cược lạ.' };
      if (s.ready[pid]) return { ok: false, reason: 'Bạn đã chốt cược rồi.' };
      if (betSum(s.bets[pid]) + a.amt > s.cash[pid]) return { ok: false, reason: 'Không đủ xu.' };
      s.bets[pid][a.sym] = (s.bets[pid][a.sym] || 0) + a.amt; s.seq++; return { ok: true };
    }
    if (a.type === 'clear') { if (s.ready[pid]) return { ok: false, reason: 'Bạn đã chốt cược rồi.' }; s.bets[pid] = {}; s.seq++; return { ok: true }; }
    if (a.type === 'ready') { s.ready[pid] = a.on !== false; s.seq++; if (s.players.every(p => s.ready[p.id])) roll(s, rnd); return { ok: true }; }
    return { ok: false, reason: 'Thao tác lạ.' };
  }
  if (a.type === 'next' && isHost) { s.seq++; next(s); return { ok: true }; }
  if (a.type === 'ready' && mine) { s.ready[pid] = true; s.seq++; if (s.players.every(p => s.ready[p.id])) next(s); return { ok: true }; }
  return { ok: false, reason: 'Chờ chủ phòng sang ván kế.' };
}
export const actors = s => (s.phase === 'play' ? s.players.filter(p => !s.ready[p.id]).map(p => p.id) : []);
export function viewFor(s, pid) {
  return { gid: s.gid, seq: s.seq, phase: s.phase, stage: s.stage, round: s.round, opts: s.opts, players: s.players, cash: s.cash, bets: s.bets, ready: s.ready, dice: s.stage === 'result' || s.phase === 'ended' ? s.dice : null,
    gain: s.stage === 'result' || s.phase === 'ended' ? s.gain : null, relief: s.relief, winner: s.winner, result: s.result, spec: !(pid in s.cash) };
}
