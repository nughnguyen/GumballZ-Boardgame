// 🤖 Bot Mật Thư — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Mật vụ bot: duyệt mọi chủ đề trong kho từ, chấm điểm theo số điệp viên phe
// mình mà gợi ý bao được, trừ nặng khi dính lá địch / sát thủ / dân thường.
// Điệp viên bot: đoán các lá có từ nằm trong chủ đề của gợi ý vừa nhận.
// Easy: 30% ngẫu nhiên, phạt nhẹ khi gợi ý dính lá xấu, điệp viên thỉnh thoảng
// đoán bừa. Hard: chỉ gợi ý khi bao được ≥1 lá phe mình (ưu tiên ≥2), né sát
// thủ tuyệt đối, điệp viên không đoán bừa khi hết lá liên quan.
import { CLUE_MAP } from './words.js';
import { foeTeam, agentsLeft } from './engine.js';

const N = 25;
const lc = s => String(s || '').toLowerCase();

/* các lá chưa lật, chia theo màu, từ góc nhìn của đội team */
function unrevealedByColor(s, team) {
  const out = { own: [], foe: [], by: [], ass: null };
  for (let i = 0; i < N; i++) {
    if (s.revealed[i]) continue;
    const c = s.colors[i];
    if (c === team) out.own.push(i);
    else if (c === foeTeam(team)) out.foe.push(i);
    else if (c === 'N') out.by.push(i);
    else out.ass = i;
  }
  return out;
}

function pickClue(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const team = me.team;
  const u = unrevealedByColor(s, team);
  if (!u.own.length) return { type: 'pass' };
  const ownWords = new Set(u.own.map(i => lc(s.words[i])));
  const foeWords = new Set(u.foe.map(i => lc(s.words[i])));
  const byWords = new Set(u.by.map(i => lc(s.words[i])));
  const assWord = u.ass !== null ? lc(s.words[u.ass]) : null;
  const boardWords = new Set();
  for (let i = 0; i < N; i++) if (!s.revealed[i]) boardWords.add(lc(s.words[i]));
  const hard = level === 'hard';
  /* Mọi khóa của CLUE_MAP đều có thể làm gợi ý (gợi ý chủ đề hoặc 1 từ
     thành viên) — miễn là 1 từ và không trùng lá đang úp trên bàn. */
  const cands = [];
  for (const [clue, members] of CLUE_MAP) {
    if (/\s/.test(clue)) continue; /* gợi ý chỉ được 1 từ */
    if (boardWords.has(clue)) continue;
    let ownHit = 0, foeHit = 0, byHit = 0, assHit = 0;
    for (const w of members) {
      if (ownWords.has(w)) ownHit++;
      else if (foeWords.has(w)) foeHit++;
      else if (byWords.has(w)) byHit++;
      else if (assWord && w === assWord) assHit++;
    }
    if (ownHit === 0) continue;
    let score = ownHit * 3 - foeHit * 4 - byHit - assHit * (hard ? 12 : 6);
    if (ownHit >= 2) score += 2;
    if (!hard) score += Math.random() * 2;
    cands.push({ clue, ownHit, score });
  }
  if (!cands.length) return { type: 'clue', word: 'ĐỒ', num: 1 }; /* đường cùng: gợi ý chung, điệp viên đoán bừa để ván không kẹt */
  if (!hard && Math.random() < 0.3) {
    /* Easy: 30% gợi ý bừa 1 từ bao được ≥1 lá phe mình */
    const c = cands[Math.floor(Math.random() * cands.length)];
    return { type: 'clue', word: c.clue.toUpperCase(), num: Math.max(1, Math.min(c.ownHit, 9)) };
  }
  let best = cands[0];
  for (const c of cands) if (c.score > best.score) best = c;
  const num = Math.max(1, Math.min(best.ownHit, 9, agentsLeft(s, team)));
  return { type: 'clue', word: best.clue.toUpperCase(), num };
}

function pickGuess(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const clue = s.clue;
  if (!clue) return { type: 'pass' };
  const related = CLUE_MAP.get(lc(clue.word)) || [];
  const relSet = new Set(related.map(lc));
  const cands = [];
  for (let i = 0; i < N; i++) {
    if (!s.revealed[i] && relSet.has(lc(s.words[i]))) cands.push(i);
  }
  const free = [];
  for (let i = 0; i < N; i++) if (!s.revealed[i]) free.push(i);
  if (level !== 'hard') {
    if (Math.random() < 0.3 && free.length) {
      return { type: 'guess', idx: free[Math.floor(Math.random() * free.length)] };
    }
    if (cands.length) return { type: 'guess', idx: cands[0] };
    if (free.length) return { type: 'guess', idx: free[Math.floor(Math.random() * free.length)] };
    return { type: 'pass' };
  }
  /* Hard: chỉ đoán lá liên quan tới gợi ý; hết lá liên quan thì dừng, không
     liều. Ngoại lệ: gợi ý không có trong bảng (gợi ý đường cùng / người gõ
     tay) thì đoán bừa 1 lá để ván luôn tiến triển. */
  if (cands.length) return { type: 'guess', idx: cands[0] };
  if (!related.length && free.length) return { type: 'guess', idx: free[Math.floor(Math.random() * free.length)] };
  return { type: 'pass' };
}

/* Bot hành động 1 lượt: mật vụ ra gợi ý, điệp viên đoán. */
export function botAction(s, pid, p) {
  if (!s || s.phase === 'ended') return null;
  const me = s.players.find(pp => pp.id === pid);
  if (!me || me.team !== s.turn) return null;
  const level = (p && p.level) || 'easy';
  if (s.phase === 'clue') {
    if (me.role !== 'spy' && me.role !== 'both') return null;
    return pickClue(s, pid, level);
  }
  if (s.phase === 'guess') {
    if (me.role !== 'op' && me.role !== 'both') return null;
    return pickGuess(s, pid, level);
  }
  return null;
}
export { pickClue, pickGuess };
