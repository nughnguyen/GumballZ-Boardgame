// 🔐 Mật Thư (Codenames kiểu Việt) – luật chơi (thuần logic, không chạm DOM).
// Bàn 5×5 = 25 lá từ. Đội Đỏ có 9 điệp viên, đội Xanh 8, 1 sát thủ, 7 dân
// thường. Đỏ đi trước. Mỗi đội có 1 mật vụ (ra gợi ý) + điệp viên (đoán).
// - Lượt của 1 đội gồm 2 pha: 'clue' (mật vụ ra gợi ý 1 từ + số 0–9) rồi
//   'guess' (điệp viên bấm lá để đoán, tối đa số+1 lần; số 0 = đoán thoải
//   mái tới khi đoán sai).
// - Đoán trúng điệp viên phe mình: lật lá, được đoán tiếp. Đoán trúng lá
//   của địch hoặc dân thường: lật lá, hết lượt. Đoán trúng sát thủ: thua
//   ngay, đội kia thắng. Lộ hết điệp viên phe mình trước thì thắng.
// - Mật vụ không được gợi ý bằng 1 từ đang còn úp trên bàn (so không phân
//   biệt hoa/thường).
// - Xin thua: đội mình thua ngay. Bỏ lượt: mật vụ bỏ qua lượt ra gợi ý,
//   điệp viên dừng đoán sớm.
// Vai trò: players[0] = mật vụ Đỏ, players[1] = mật vụ Xanh, các ghế còn
// lại là điệp viên xen kẽ Đỏ/Xanh. Chỉ có 2 người thì mỗi người vừa là mật
// vụ vừa là điệp viên của đội mình (đua xem đội nào lộ hết trước).
// Mã màu lá: 'R' Đỏ, 'B' Xanh, 'N' dân thường, 'A' sát thủ.
// idx = y * 5 + x (y = 0 là hàng trên cùng).
import { WORDS } from './words.js';

export const W = 5, H = 5, N = 25;
export const RED_AGENTS = 9, BLUE_AGENTS = 8;
export const TEAM_NAME = { R: '🔴 Đỏ', B: '🔵 Xanh' };
export const foeTeam = t => (t === 'R' ? 'B' : 'R');

export const OPT_CHOICES = { timer: [0, 60, 120] };

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function dealBoard() {
  const words = shuffled(WORDS).slice(0, N);
  const colors = shuffled([
    ...Array(RED_AGENTS).fill('R'),
    ...Array(BLUE_AGENTS).fill('B'),
    ...Array(7).fill('N'),
    'A',
  ]);
  return { words, colors };
}
export function assignRoles(players) {
  /* players[0] mật vụ Đỏ, players[1] mật vụ Xanh; còn lại điệp viên xen kẽ.
     2 người: mỗi người vừa mật vụ vừa điệp viên của đội mình. */
  return players.map((p, i) => {
    let team, role;
    if (players.length === 2) { team = i === 0 ? 'R' : 'B'; role = 'both'; }
    else if (i === 0) { team = 'R'; role = 'spy'; }
    else if (i === 1) { team = 'B'; role = 'spy'; }
    else { team = (i % 2 === 0) ? 'R' : 'B'; role = 'op'; }
    return { ...p, team, role };
  });
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 2 || players.length > 8) throw new Error('Mật Thư chơi 2–8 người.');
  const timer = OPT_CHOICES.timer.includes(+opts.timer) ? +opts.timer : 0;
  const { words, colors } = dealBoard();
  const ps = assignRoles(players.map(p => ({
    id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
  })));
  return {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    phase: 'clue', /* 'clue' | 'guess' | 'ended' */
    words, colors, revealed: new Array(N).fill(false),
    players: ps,
    turn: 'R', /* Đỏ đi trước */
    clue: null, guessesLeft: 0, clueNo: 0,
    wrong: { R: 0, B: 0 }, /* số lần đoán sai (dân thường / lá địch) mỗi đội */
    deficit: { R: 0, B: 0 }, /* độ bị dẫn lớn nhất từng thấy (địch lộ − mình lộ) */
    winClueNum: null, winLastCard: false,
    winner: null, winnerIds: [], endReason: null, draw: false,
    lastGuess: null, timer, log: [],
  };
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.words) || s.words.length !== N || !Array.isArray(s.colors) || s.colors.length !== N
    || !Array.isArray(s.revealed) || s.revealed.length !== N || !Array.isArray(s.players) || s.players.length < 2) {
    throw new Error('Trạng thái Mật Thư không hợp lệ.');
  }
  return s;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const spyOf = (s, team) => s.players.find(p => p.team === team && (p.role === 'spy' || p.role === 'both'));
const opsOf = (s, team) => s.players.filter(p => p.team === team && (p.role === 'op' || p.role === 'both'));
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
export const revealedCount = (s, team) => {
  let n = 0;
  for (let i = 0; i < N; i++) if (s.revealed[i] && s.colors[i] === team) n++;
  return n;
};
export const agentsLeft = (s, team) => (team === 'R' ? RED_AGENTS : BLUE_AGENTS) - revealedCount(s, team);
const assassinRevealed = s => { for (let i = 0; i < N; i++) if (s.revealed[i] && s.colors[i] === 'A') return true; return false; };

function updateDeficit(s) {
  for (const t of ['R', 'B']) {
    const d = revealedCount(s, foeTeam(t)) - revealedCount(s, t);
    if (d > (s.deficit[t] || 0)) s.deficit[t] = d;
  }
}
function endGame(s, winnerTeam, reason) {
  s.phase = 'ended'; s.winner = winnerTeam; s.endReason = reason; s.seq++;
  s.winnerIds = s.players.filter(p => p.team === winnerTeam).map(p => p.id);
}
function endTurn(s) {
  s.turn = foeTeam(s.turn); s.phase = 'clue'; s.clue = null; s.guessesLeft = 0; s.seq++;
}

/* gợi ý: word = 1 từ (không dấu cách), num = 0–9 (0 = đoán thoải mái) */
export function applyClue(s, pid, clue) {
  if (!clue || s.phase !== 'clue') return { ok: false, reason: 'Chưa tới lúc ra gợi ý.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const spy = spyOf(s, s.turn);
  if (!spy || spy.id !== pid) return { ok: false, reason: 'Chỉ mật vụ của đội đang đi mới được ra gợi ý.' };
  const word = String(clue.word || '').trim();
  if (!word || /\s/.test(word) || word.length > 20) return { ok: false, reason: 'Gợi ý chỉ được 1 từ (tối đa 20 ký tự).' };
  const num = Number(clue.num);
  if (!Number.isInteger(num) || num < 0 || num > 9) return { ok: false, reason: 'Số gợi ý phải từ 0 tới 9.' };
  /* gợi ý không được trùng 1 từ đang còn úp trên bàn */
  const lw = word.toLowerCase();
  for (let i = 0; i < N; i++) {
    if (!s.revealed[i] && s.words[i].toLowerCase() === lw) return { ok: false, reason: `“${word}” đang là 1 lá còn úp trên bàn — không được dùng làm gợi ý.` };
  }
  s.clue = { word, num, by: pid, byName: me.name };
  s.guessesLeft = num === 0 ? 99 : num + 1;
  s.phase = 'guess'; s.clueNo++; s.seq++;
  pushLog(s, `🕵️ ${me.name} (${TEAM_NAME[s.turn]}) gợi ý: “${word}” — ${num === 0 ? 'không giới hạn' : num + ' lá'}`);
  return { ok: true };
}

export function applyGuess(s, pid, idx) {
  if (s.phase !== 'guess') return { ok: false, reason: 'Chưa tới lúc đoán.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (me.team !== s.turn) return { ok: false, reason: 'Chưa tới lượt đội bạn.' };
  if (me.role !== 'op' && me.role !== 'both') return { ok: false, reason: 'Chỉ điệp viên mới được đoán.' };
  if (!Number.isInteger(idx) || idx < 0 || idx >= N) return { ok: false, reason: 'Ngoài bàn.' };
  if (s.revealed[idx]) return { ok: false, reason: 'Lá này đã lật rồi.' };
  const color = s.colors[idx], word = s.words[idx];
  const ownBefore = agentsLeft(s, s.turn);
  s.revealed[idx] = true;
  s.seq++;
  s.lastGuess = { idx, by: pid, color, n: s.seq };
  const kindName = color === 'R' ? 'điệp viên Đỏ' : color === 'B' ? 'điệp viên Xanh' : color === 'N' ? 'dân thường' : 'SÁT THỦ 💀';
  if (color === s.turn) {
    const left = agentsLeft(s, s.turn);
    updateDeficit(s);
    pushLog(s, `${me.name} đoán “${word}” — đúng! ${TEAM_NAME[s.turn]} còn ${left} lá.${left === 0 ? ' 🎉' : ''}`);
    if (left === 0) {
      s.winClueNum = (s.clue || {}).num;
      s.winLastCard = ownBefore === 1 && !assassinRevealed(s);
      endGame(s, s.turn, 'agents');
      pushLog(s, `🏆 Đội ${TEAM_NAME[s.turn]} lộ hết điệp viên — THẮNG!`, 'win');
      return { ok: true, ended: true, win: true, kind: 'own' };
    }
    s.guessesLeft--;
    if (s.guessesLeft <= 0) endTurn(s);
    return { ok: true, ended: false, kind: 'own' };
  }
  /* đoán sai: lá địch / dân thường / sát thủ — đều hết lượt (sát thủ thì thua luôn) */
  s.wrong[s.turn] = (s.wrong[s.turn] || 0) + 1;
  updateDeficit(s);
  if (color === 'A') {
    pushLog(s, `${me.name} đoán “${word}” — trúng SÁT THỦ! 💀`, 'win');
    endGame(s, foeTeam(s.turn), 'assassin');
    pushLog(s, `🏆 Đội ${TEAM_NAME[foeTeam(s.turn)]} thắng — đối thủ chạm vào sát thủ!`, 'win');
    return { ok: true, ended: true, win: false, kind: 'assassin' };
  }
  pushLog(s, `${me.name} đoán “${word}” — là ${kindName}, hết lượt ${TEAM_NAME[s.turn]}.`);
  if (color === foeTeam(s.turn) && agentsLeft(s, color) === 0) {
    /* đoán nhầm mà lật trúng lá địch cuối cùng: đội đó thắng ngay */
    s.winClueNum = null; s.winLastCard = false;
    endGame(s, color, 'agents');
    pushLog(s, `🏆 Đội ${TEAM_NAME[color]} lộ hết điệp viên — THẮNG!`, 'win');
    return { ok: true, ended: true, win: false, kind: 'foe' };
  }
  endTurn(s);
  return { ok: true, ended: false, kind: color === 'N' ? 'bystander' : 'foe' };
}

/* bỏ lượt: mật vụ bỏ qua lượt ra gợi ý; điệp viên dừng đoán sớm */
export function applyPass(s, pid) {
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (me.team !== s.turn) return { ok: false, reason: 'Chưa tới lượt đội bạn.' };
  if (s.phase === 'clue') {
    if (me.role !== 'spy' && me.role !== 'both') return { ok: false, reason: 'Chỉ mật vụ mới được bỏ lượt gợi ý.' };
    pushLog(s, `${me.name} bỏ lượt ra gợi ý — ${TEAM_NAME[s.turn]} mất lượt.`);
  } else {
    if (me.role !== 'op' && me.role !== 'both') return { ok: false, reason: 'Chỉ điệp viên mới được dừng đoán.' };
    pushLog(s, `${me.name} dừng đoán — hết lượt ${TEAM_NAME[s.turn]}.`);
  }
  endTurn(s);
  return { ok: true };
}

export function applyResign(s, pid) {
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const foe = foeTeam(me.team);
  endGame(s, foe, 'resign');
  pushLog(s, `${me.name} (${TEAM_NAME[me.team]}) xin thua — 🏆 Đội ${TEAM_NAME[foe]} thắng!`, 'win');
  return { ok: true, ended: true };
}

export function legalMoves(s, pid) {
  if (s.phase !== 'guess') return [];
  const me = pOf(s, pid);
  if (!me || me.team !== s.turn || (me.role !== 'op' && me.role !== 'both')) return [];
  const out = [];
  for (let i = 0; i < N; i++) if (!s.revealed[i]) out.push(i);
  return out;
}

export const actors = s => {
  if (s.phase === 'ended') return [];
  if (s.phase === 'clue') { const sp = spyOf(s, s.turn); return sp ? [sp.id] : []; }
  return opsOf(s, s.turn).map(p => p.id);
};
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const isSpy = me && (me.role === 'spy' || me.role === 'both');
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: s.turn,
    words: [...s.words],
    /* mật vụ thấy toàn bộ bản đồ mật; điệp viên chỉ thấy lá đã lật.
       Ván kết thúc thì bản đồ mật hiện cho mọi người (xem bàn đã giải). */
    key: (isSpy || s.phase === 'ended') ? [...s.colors] : null,
    shown: s.colors.map((c, i) => (s.revealed[i] ? c : null)),
    revealed: [...s.revealed],
    clue: s.clue ? { ...s.clue } : null,
    guessesLeft: s.guessesLeft, clueNo: s.clueNo,
    counts: { R: revealedCount(s, 'R'), B: revealedCount(s, 'B') },
    left: { R: agentsLeft(s, 'R'), B: agentsLeft(s, 'B') },
    wrong: { ...s.wrong }, deficit: { ...s.deficit },
    winner: s.winner, winnerIds: [...(s.winnerIds || [])],
    endReason: s.endReason, draw: s.draw,
    lastGuess: s.lastGuess ? { ...s.lastGuess } : null,
    winClueNum: s.winClueNum, winLastCard: s.winLastCard,
    timer: s.timer,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, team: p.team, role: p.role })),
    log: s.log.slice(-30),
    me: pid, myTeam: me ? me.team : null, myRole: me ? me.role : null,
  };
}
/* Adapter cho phòng online (simplenet): action { type, word?, num?, idx? }.
   Cả 2 bên áp cùng 1 action sẽ ra cùng 1 trạng thái. */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'clue': return applyClue(s, pid, { word: a.word, num: a.num });
    case 'guess': return applyGuess(s, pid, a.idx);
    case 'pass': return applyPass(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
