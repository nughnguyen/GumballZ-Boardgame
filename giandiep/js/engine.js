// 🕵️ Ai là Gián Điệp – luật chơi (thuần logic, chạy ở máy chủ phòng).
// 4–12 người. Mỗi vòng mọi người nhận 1 từ bí mật: đa số (dân thường) cùng 1 từ,
// 1–2 người (gián điệp) nhận 1 từ khác nhưng tương tự. Lần lượt mô tả từ của mình
// bằng 1 câu (không được nói ra từ đó), rồi bỏ phiếu tìm gián điệp. Người bị loại
// nhiều phiếu nhất lộ từ của mình. Dân thường thắng khi loại hết gián điệp;
// gián điệp thắng khi số gián điệp ≥ số dân còn lại. Hết vòng thì chơi vòng mới
// với cặp từ mới (từ và vai trò chia lại từ đầu).
import { WORD_PAIRS } from './words.js?v=1';

export const MIN_PLAYERS = 4, MAX_PLAYERS = 12;
export const OPT_CHOICES = { spies: [1, 2], timer: [0, 30, 45, 60] };

export const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); /* inputfix: đ→d — trước đây 'đ' bị [^a-z0-9] xoá mất ('đá'→'a') nên bot không khớp được từ khoá chứa đ */

// Từ có bị nói ra trong câu mô tả không — so nguyên từ, GIỮ dấu tiếng Việt.
// (So chuỗi sau khi bỏ dấu sẽ bắt nhầm từ đồng âm khác dấu: "mùa" ≠ "mưa",
// "vòi" ≠ "voi", "sống" không chứa "ong". Mô tả là công khai nên chỉ cần
// chặn đúng từ của mình; gõ không dấu để lách thì cả bàn vẫn nhìn thấy.)
const wordsOf = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
export const saysWord = (text, word) => {
  const t = wordsOf(text), w = wordsOf(word);
  if (!w.length) return false;
  for (let i = 0; i + w.length <= t.length; i++)
    if (w.every((x, j) => t[i + j] === x)) return true;
  return false;
};

const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

function pickPair(used) {
  const avail = WORD_PAIRS.map((p, i) => i).filter(i => !used.includes(i));
  const pool = avail.length ? avail : WORD_PAIRS.map((p, i) => i);
  const id = pool[Math.floor(Math.random() * pool.length)];
  return { pair: WORD_PAIRS[id], id };
}

function dealRoles(s, pair) {
  const alive = s.players.filter(p => p.alive);
  const prevFirst = (s.order && s.order[0]) || null;
  const spies = Math.max(1, Math.min(s.spies, Math.floor((alive.length - 1) / 2)));
  const spyIds = new Set(shuffle(alive.map(p => p.id)).slice(0, spies));
  for (const p of alive) {
    p.role = spyIds.has(p.id) ? 'spy' : 'civ';
    p.word = p.role === 'spy' ? pair.spy : pair.civ;
    p.described = false; p.voted = false;
  }
  s.order = shuffle(alive.map(p => p.id));
  /* vòng sau không trùng người mô tả đầu vòng trước: đổi chỗ 0↔1 */
  if (prevFirst && s.order.length > 1 && s.order[0] === prevFirst) [s.order[0], s.order[1]] = [s.order[1], s.order[0]];
  s.turn = s.order[0] || null;
}

export function createGame(players, opts = {}) {
  const n = players.length;
  if (n < MIN_PLAYERS) throw new Error(`Cần ít nhất ${MIN_PLAYERS} người.`);
  if (n > MAX_PLAYERS) throw new Error(`Tối đa ${MAX_PLAYERS} người.`);
  const spies = Math.max(1, Math.min(+opts.spies || 1, 2));
  const timer = OPT_CHOICES.timer.includes(+opts.timer) ? +opts.timer : 0;
  const { pair, id: pairId } = pickPair([]);
  const s = {
    gid: 'gd' + Math.random().toString(36).slice(2, 9), seq: 0,
    phase: 'describe', round: 1, pairId, pair: { civ: pair.civ, spy: pair.spy },
    spies, timer, usedPairs: [pairId],
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, role: 'civ', word: '', alive: true, described: false, voted: false, survived: 0 })),
    order: [], turn: null, descs: [], votes: {}, elim: null,
    winnerIds: [], winSide: null, civLost: 0, firstVoteCatchers: null,
    log: [],
  };
  dealRoles(s, pair);
  const firstName = (s.players.find(p => p.id === s.turn) || {}).name || '?';
  s.log = [{ text: `Vòng 1 bắt đầu — ${n} người chơi, ${spies} gián điệp đang trà trộn. ${firstName} mô tả đầu tiên! Mỗi người mô tả từ của mình bằng 1 câu, đừng nói ra từ đó nhé!`, kind: 'info' }];
  return s;
}

function startRound(s) {
  const { pair, id } = pickPair(s.usedPairs);
  s.usedPairs = [...s.usedPairs, id].slice(-WORD_PAIRS.length);
  s.pairId = id; s.pair = { civ: pair.civ, spy: pair.spy };
  s.round++;
  s.phase = 'describe'; s.descs = []; s.votes = {}; s.elim = null;
  dealRoles(s, pair);
  const firstName = (s.players.find(p => p.id === s.turn) || {}).name || '?';
  s.log.push({ text: `Vòng ${s.round} bắt đầu — cặp từ mới, vai trò chia lại từ đầu. ${firstName} mô tả đầu tiên!`, kind: 'info' });
}

function endGame(s, side) {
  s.phase = 'ended'; s.winSide = side;
  s.winnerIds = s.players.filter(p => p.alive && (side === 'civ' ? p.role === 'civ' : p.role === 'spy')).map(p => p.id);
  s.log.push({ text: side === 'civ' ? '🎉 Dân thường thắng! Gián điệp đã bị lộ hết.' : '🕵️ Gián điệp thắng! Số gián điệp đã bằng số dân còn lại.', kind: 'end' });
}

function voteCounts(s) {
  const c = {};
  for (const t of Object.values(s.votes)) c[t] = (c[t] || 0) + 1;
  return c;
}

function resolveVote(s) {
  const counts = voteCounts(s);
  const max = Math.max(...Object.values(counts));
  const top = Object.keys(counts).filter(id => counts[id] === max);
  if (top.length > 1) {
    const names = top.map(id => (s.players.find(p => p.id === id) || {}).name).filter(Boolean).join(', ');
    s.elim = { pid: null, tie: true, tied: top, votes: max };
    s.phase = 'elim';
    s.log.push({ text: `Hòa phiếu ${max}–${max} giữa ${names} — không ai bị loại, chơi vòng mới với cặp từ mới.`, kind: 'tie' });
    return;
  }
  const out = s.players.find(p => p.id === top[0]);
  out.alive = false;
  s.elim = { pid: out.id, name: out.name, role: out.role, word: out.word, votes: counts[out.id] };
  if (s.round === 1 && out.role === 'spy') s.firstVoteCatchers = Object.entries(s.votes).filter(([, t]) => t === out.id).map(([v]) => v);
  if (out.role === 'civ') s.civLost++;
  for (const p of s.players) if (p.alive) p.survived++;
  s.log.push({ text: `${out.name} bị loại với ${counts[out.id]} phiếu — ${out.role === 'spy' ? 'là GIÁN ĐIỆP 🕵️' : 'là dân thường 😢'} (từ: “${out.word}”).`, kind: out.role === 'spy' ? 'caught' : 'wrong' });
  const spiesAlive = s.players.filter(p => p.alive && p.role === 'spy').length;
  const civsAlive = s.players.filter(p => p.alive && p.role === 'civ').length;
  if (spiesAlive === 0) endGame(s, 'civ');
  else if (spiesAlive >= civsAlive) endGame(s, 'spy');
  else s.phase = 'elim';
}

export function applyAction(s, pid, a) {
  const p = s.players.find(x => x.id === pid);
  if (!p) return { ok: false, reason: 'Bạn không có trong ván này.' };
  if (!a || typeof a !== 'object') return { ok: false, reason: 'Hành động không hợp lệ.' };
  if (a.type === 'describe') {
    if (s.phase !== 'describe') return { ok: false, reason: 'Chưa tới lúc mô tả.' };
    if (!p.alive) return { ok: false, reason: 'Bạn đã bị loại.' };
    if (s.turn !== pid) return { ok: false, reason: 'Chưa tới lượt bạn mô tả.' };
    if (p.described) return { ok: false, reason: 'Bạn mô tả rồi.' };
    const text = String(a.text || '').trim().replace(/\s+/g, ' ');
    if (!text) return { ok: false, reason: 'Nhập 1 câu mô tả đã nhé.' };
    if (text.length > 120) return { ok: false, reason: 'Mô tả tối đa 120 ký tự.' };
    if (saysWord(text, p.word)) return { ok: false, reason: 'Không được nói ra từ của mình!' };
    p.described = true;
    s.descs.push({ pid, name: p.name, text });
    const next = s.order.find(id => { const q = s.players.find(x => x.id === id); return q && q.alive && !q.described; });
    if (next) s.turn = next;
    else { s.phase = 'vote'; s.turn = null; s.log.push({ text: 'Hết vòng mô tả — giờ bỏ phiếu tìm gián điệp!', kind: 'vote' }); }
    s.seq++;
    return { ok: true };
  }
  if (a.type === 'vote') {
    if (s.phase !== 'vote') return { ok: false, reason: 'Chưa tới lúc bỏ phiếu.' };
    if (!p.alive) return { ok: false, reason: 'Bạn đã bị loại.' };
    if (p.voted) return { ok: false, reason: 'Bạn bỏ phiếu rồi.' };
    const t = s.players.find(x => x.id === a.target);
    if (!t || !t.alive) return { ok: false, reason: 'Chọn 1 người còn trong ván.' };
    p.voted = true; s.votes[pid] = a.target;
    const alive = s.players.filter(x => x.alive);
    if (alive.every(x => x.voted)) resolveVote(s);
    s.seq++;
    return { ok: true };
  }
  if (a.type === 'next') {
    if (s.phase !== 'elim') return { ok: false, reason: 'Chưa tới lúc.' };
    if (s.winSide) return { ok: false, reason: 'Ván đã kết thúc.' };
    startRound(s);
    s.seq++;
    return { ok: true };
  }
  return { ok: false, reason: 'Hành động không hợp lệ.' };
}

export function actors(s) {
  if (!s) return [];
  if (s.phase === 'describe') return s.turn ? [s.turn] : [];
  if (s.phase === 'vote') return s.players.filter(p => p.alive && !p.voted).map(p => p.id);
  return [];
}

// Ảnh chụp ván gửi cho từng người: từ và vai trò của người khác KHÔNG bao giờ lộ,
// trừ từ của người vừa bị loại và toàn bộ vai trò khi ván kết thúc.
export function viewFor(s, pid) {
  const me = s.players.find(p => p.id === pid);
  const showVotes = s.phase === 'elim' || s.phase === 'ended';
  const v = {
    gid: s.gid, seq: s.seq, phase: s.phase, round: s.round, spies: s.spies, timer: s.timer,
    me: pid,
    you: me ? { id: me.id, role: me.role, word: me.word, alive: me.alive, survived: me.survived || 0 } : null,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, alive: p.alive, described: p.described, voted: p.voted, survived: p.survived || 0 })),
    order: s.order, turn: s.turn,
    descs: s.descs.map(d => ({ ...d })),
    votes: showVotes ? { ...s.votes } : (me && s.votes[pid] ? { [pid]: s.votes[pid] } : {}),
    voteCounts: showVotes ? voteCounts(s) : null,
    elim: s.elim ? { ...s.elim } : null,
    winnerIds: s.winnerIds, winSide: s.winSide, civLost: s.civLost,
    firstVoteCatchers: s.firstVoteCatchers,
    log: s.log.slice(-30),
  };
  if (s.phase === 'ended') v.reveal = s.players.map(p => ({ id: p.id, name: p.name, role: p.role, word: p.word, alive: p.alive }));
  return v;
}
