// ⚔️ Avalon (The Resistance: Avalon) – luật chơi (thuần logic, không chạm DOM).
// 5–10 người, 2 phe: Thiện (Arthur) vs Ác (Mordred). 5 nhiệm vụ, mỗi nhiệm vụ
// thủ lĩnh chọn 1 đội, cả bàn bỏ phiếu Thuận/Chống, đội được duyệt thì từng
// thành viên bí mật chọn Thành công/Thất bại (phe Thiện BẮT BUỘC thành công).
// Nhiệm vụ thành công khi số lần thất bại < ngưỡng (1, riêng nhiệm vụ 4 ở
// 7+ người cần 2 lần thất bại mới hỏng). Phe nào thắng 3 nhiệm vụ trước thì
// thắng giai đoạn nhiệm vụ; nếu phe Thiện thắng 3 nhiệm vụ thì Sát thủ được
// đoán Merlin — đúng thì phe Ác lật kèo thắng, sai thì phe Thiện thắng.
// 5 lần đề xuất liên tiếp bị bác thì phe Ác thắng ngay.
// Vai trò theo số người (chuẩn theo hướng dẫn game):
//   5 người: Merlin, Percival, Hiệp sĩ — Sát thủ, Morgana
//   6 người: + Mordred        7 người: + Oberon
//   8 người: + Hiệp sĩ        9 người: + Hiệp sĩ
//   10 người: + Tay sai Mordred
// Kiến thức: Merlin thấy hết phe Ác trừ Mordred; Percival thấy Merlin +
// Morgana (không biết ai là ai); phe Ác thấy nhau trừ Oberon; Oberon
// không thấy ai và không ai thấy mình; Hiệp sĩ không biết gì thêm.
// Số người mỗi nhiệm vụ: 5p 2,3,2,3,3 · 6p 2,3,4,3,4 · 7p 2,3,3,4,4 ·
// 8p 3,4,4,5,5 · 9p 3,4,4,5,5 · 10p 3,4,4,5,5.
export const QUEST_SIZES = {
  5: [2, 3, 2, 3, 3], 6: [2, 3, 4, 3, 4], 7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5], 9: [3, 4, 4, 5, 5], 10: [3, 4, 4, 5, 5],
};
export const failsNeededFor = (n, qi) => (n >= 7 && qi === 3 ? 2 : 1);
export const OPT_CHOICES = { timer: [0, 60, 120] };
export const ROLE_INFO = {
  merlin: { side: 'good', name: 'Merlin', icon: '🧙', desc: 'Thấy hết phe Ác — trừ Mordred.' },
  percival: { side: 'good', name: 'Percival', icon: '🛡️', desc: 'Thấy Merlin và Morgana, nhưng không biết ai là ai.' },
  servant: { side: 'good', name: 'Hiệp sĩ trung thành', icon: '⚔️', desc: 'Không biết gì thêm — chỉ tin vào lá phiếu của mình.' },
  assassin: { side: 'evil', name: 'Sát thủ', icon: '🗡️', desc: 'Cuối ván đoán Merlin — đúng thì phe Ác lật kèo thắng.' },
  morgana: { side: 'evil', name: 'Morgana', icon: '🔮', desc: 'Hiện ra như Merlin trước mắt Percival.' },
  mordred: { side: 'evil', name: 'Mordred', icon: '😈', desc: 'Ẩn mình khỏi tầm nhìn của Merlin.' },
  oberon: { side: 'evil', name: 'Oberon', icon: '👤', desc: 'Không biết ai, và không ai biết mình.' },
  minion: { side: 'evil', name: 'Tay sai Mordred', icon: '🐺', desc: 'Biết các phe Ác khác — trừ Oberon.' },
};
/* Bảng vai theo tỉ lệ CHUẨN của Avalon (rulebook chính thức):
   5: 3 Thiện/2 Ác · 6: 4/2 · 7: 4/3 · 8: 5/3 · 9: 6/3 · 10: 6/4.
   Phe Thiện LUÔN đa số. Vai đặc biệt thay thế Hiệp sĩ/Tay sai cùng phe,
   không cộng thêm người — vì vậy Mordred chỉ vào từ 7 người, Oberon giữ
   ghế Ác thứ 3 ở 9 người (làm phe Ác mất liên lạc, cân bằng đội Thiện lớn),
   Tay sai là Ác thứ 4 ở 10 người. */
const ROLES_BY_COUNT = {
  5: ['merlin', 'percival', 'servant', 'assassin', 'morgana'],
  6: ['merlin', 'percival', 'servant', 'servant', 'assassin', 'morgana'],
  7: ['merlin', 'percival', 'servant', 'servant', 'assassin', 'morgana', 'mordred'],
  8: ['merlin', 'percival', 'servant', 'servant', 'servant', 'assassin', 'morgana', 'mordred'],
  9: ['merlin', 'percival', 'servant', 'servant', 'servant', 'servant', 'assassin', 'morgana', 'oberon'],
  10: ['merlin', 'percival', 'servant', 'servant', 'servant', 'servant', 'assassin', 'morgana', 'mordred', 'minion'],
};
export function rolesFor(n) {
  return (ROLES_BY_COUNT[n] || []).slice();
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 5 || players.length > 10) throw new Error('Avalon chơi 5–10 người.');
  const timer = OPT_CHOICES.timer.includes(+opts.timer) ? +opts.timer : 0;
  const n = players.length;
  const roles = shuffled(rolesFor(n));
  const ps = players.map((p, i) => ({
    id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null,
    role: roles[i], side: ROLE_INFO[roles[i]].side,
  }));
  const sizes = QUEST_SIZES[n];
  return {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    phase: 'propose', /* 'propose' | 'vote' | 'quest' | 'assassin' | 'ended' */
    players: ps, n,
    leader: Math.floor(Math.random() * n), /* ghế thủ lĩnh đầu tiên */
    questNo: 0, questSizes: sizes,
    failsNeeded: sizes.map((_, qi) => failsNeededFor(n, qi)),
    quests: sizes.map((size, qi) => ({ qi, size, failsNeeded: failsNeededFor(n, qi), team: [], votes: null, fails: 0, result: null, leader: null })),
    proposal: null, votes: {}, questPicks: {}, pickedIds: [],
    rejects: 0,
    winner: null, winnerIds: [], endReason: null, assassinPick: null,
    q4Double: failsNeededFor(n, 3) === 2,
    log: [], timer,
  };
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 5 || s.players.length > 10
    || !Array.isArray(s.quests) || s.quests.length !== 5 || typeof s.phase !== 'string') {
    throw new Error('Trạng thái Avalon không hợp lệ.');
  }
  return s;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const pIdx = (s, id) => s.players.findIndex(p => p.id === id);
const nextLeader = s => (s.leader + 1) % s.players.length;
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const sideName = side => (side === 'good' ? '🛡️ phe Thiện' : '😈 phe Ác');
const roleName = r => `${ROLE_INFO[r].icon} ${ROLE_INFO[r].name}`;
function endGame(s, winnerSide, reason) {
  s.phase = 'ended'; s.winner = winnerSide; s.endReason = reason; s.seq++;
  s.winnerIds = s.players.filter(p => p.side === winnerSide).map(p => p.id);
}
const questWins = (s, side) => s.quests.filter(q => q.result === (side === 'good' ? 'success' : 'fail')).length;

/* thủ lĩnh đề xuất 1 đội đúng số người của nhiệm vụ hiện tại */
export function applyPropose(s, pid, team) {
  if (s.phase !== 'propose') return { ok: false, reason: 'Chưa tới lúc chọn đội.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (pIdx(s, pid) !== s.leader) return { ok: false, reason: 'Chỉ thủ lĩnh mới được chọn đội.' };
  const size = s.questSizes[s.questNo];
  if (!Array.isArray(team) || team.length !== size) return { ok: false, reason: `Nhiệm vụ ${s.questNo + 1} cần đúng ${size} người.` };
  const uniq = [...new Set(team)];
  if (uniq.length !== size || uniq.some(id => !pOf(s, id))) return { ok: false, reason: 'Đội không hợp lệ (trùng người / người lạ).' };
  s.proposal = { team: uniq.slice(), by: pid };
  s.quests[s.questNo].team = uniq.slice();
  s.quests[s.questNo].leader = pid;
  s.votes = {}; s.phase = 'vote'; s.seq++;
  pushLog(s, `👑 ${me.name} đề xuất đội nhiệm vụ ${s.questNo + 1}: ${uniq.map(id => pOf(s, id).name).join(', ')}`);
  return { ok: true };
}

/* bỏ phiếu Thuận/Chống cho đội đang đề xuất; đủ phiếu thì công bố */
export function applyVote(s, pid, approve) {
  if (s.phase !== 'vote') return { ok: false, reason: 'Chưa tới lúc bỏ phiếu.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (pid in s.votes) return { ok: false, reason: 'Bạn đã bỏ phiếu rồi.' };
  s.votes[pid] = !!approve; s.seq++;
  const n = s.players.length;
  if (Object.keys(s.votes).length < n) return { ok: true, voted: Object.keys(s.votes).length };
  /* đủ phiếu: công bố — Thuận phải quá bán (hòa = bác) */
  const yes = Object.values(s.votes).filter(Boolean).length;
  const q = s.quests[s.questNo];
  q.votes = { ...s.votes };
  if (yes > n / 2) {
    s.phase = 'quest'; s.questPicks = {}; s.pickedIds = []; s.seq++;
    pushLog(s, `🗳️ Bỏ phiếu ${yes}/${n} Thuận — đội được duyệt, làm nhiệm vụ ${s.questNo + 1}!`);
    return { ok: true, passed: true, yes };
  }
  s.rejects++;
  pushLog(s, `🗳️ Bỏ phiếu ${yes}/${n} Thuận — đội bị bác (${s.rejects}/5 lần bác liên tiếp).`);
  if (s.rejects >= 5) {
    endGame(s, 'evil', 'rejects');
    pushLog(s, `🏆 5 lần đề xuất liên tiếp bị bác — ${sideName('evil')} thắng!`, 'win');
    return { ok: true, passed: false, yes, ended: true };
  }
  s.leader = nextLeader(s);
  s.proposal = null; s.votes = {}; s.phase = 'propose'; s.seq++;
  return { ok: true, passed: false, yes };
}

/* thành viên trong đội bí mật chọn Thành công/Thất bại (Thiện bắt buộc thành công) */
export function applyQuest(s, pid, choice) {
  if (s.phase !== 'quest') return { ok: false, reason: 'Chưa tới lúc làm nhiệm vụ.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const q = s.quests[s.questNo];
  if (!q.team.includes(pid)) return { ok: false, reason: 'Bạn không ở trong đội nhiệm vụ này.' };
  if (pid in s.questPicks) return { ok: false, reason: 'Bạn đã chọn rồi.' };
  if (choice !== 'success' && choice !== 'fail') return { ok: false, reason: 'Chọn Thành công hoặc Thất bại.' };
  if (me.side === 'good' && choice === 'fail') return { ok: false, reason: 'Phe Thiện chỉ được chọn Thành công!' };
  s.questPicks[pid] = choice; s.pickedIds.push(pid); s.seq++;
  if (s.pickedIds.length < q.team.length) return { ok: true, picked: s.pickedIds.length };
  /* đủ lựa chọn: công bố số lần thất bại (không nói ai) */
  const fails = Object.values(s.questPicks).filter(c => c === 'fail').length;
  q.fails = fails;
  q.result = fails >= q.failsNeeded ? 'fail' : 'success';
  pushLog(s, `⚔️ Nhiệm vụ ${s.questNo + 1}: ${fails} lần thất bại — ${q.result === 'success' ? '✅ THÀNH CÔNG!' : '❌ THẤT BẠI!'}`, q.result === 'success' ? '' : 'win');
  const gw = questWins(s, 'good'), ew = questWins(s, 'evil');
  if (gw >= 3) {
    s.phase = 'assassin'; s.seq++;
    pushLog(s, `🛡️ Phe Thiện thắng 3 nhiệm vụ — 🗡️ Sát thủ, đoán xem ai là Merlin!`);
    return { ok: true, questDone: true, result: q.result };
  }
  if (ew >= 3) {
    endGame(s, 'evil', 'quests');
    pushLog(s, `🏆 Phe Ác phá hỏng 3 nhiệm vụ — ${sideName('evil')} THẮNG!`, 'win');
    return { ok: true, questDone: true, result: q.result, ended: true };
  }
  s.questNo++;
  s.leader = nextLeader(s);
  s.proposal = null; s.votes = {}; s.questPicks = {}; s.pickedIds = []; s.rejects = 0;
  s.phase = 'propose'; s.seq++;
  return { ok: true, questDone: true, result: q.result };
}

/* Sát thủ đoán Merlin sau khi phe Thiện thắng 3 nhiệm vụ */
export function applyAssassin(s, pid, targetId) {
  if (s.phase !== 'assassin') return { ok: false, reason: 'Chưa tới lúc ám sát.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  if (me.role !== 'assassin') return { ok: false, reason: 'Chỉ Sát thủ mới được đoán Merlin.' };
  const target = pOf(s, targetId);
  if (!target) return { ok: false, reason: 'Không có người này.' };
  if (target.side !== 'good') return { ok: false, reason: 'Sát thủ chỉ đoán trong phe Thiện.' };
  s.assassinPick = { by: pid, target: targetId };
  if (target.role === 'merlin') {
    endGame(s, 'evil', 'assassin');
    pushLog(s, `🗡️ Sát thủ chỉ đúng ${target.name} là Merlin — ${sideName('evil')} LẬT KÈO THẮNG!`, 'win');
  } else {
    endGame(s, 'good', 'assassin-wrong');
    pushLog(s, `🗡️ Sát thủ đoán sai — ${target.name} không phải Merlin — ${sideName('good')} THẮNG!`, 'win');
  }
  return { ok: true };
}

export function applyResign(s, pid) {
  if (s.phase === 'ended') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  const foe = me.side === 'good' ? 'evil' : 'good';
  endGame(s, foe, 'resign');
  pushLog(s, `${me.name} (${sideName(me.side)}) xin thua — 🏆 ${sideName(foe)} thắng!`, 'win');
  return { ok: true, ended: true };
}

/* ai đang phải hành động (cho bot + đồng hồ) */
export const actors = s => {
  if (s.phase === 'ended') return [];
  if (s.phase === 'propose') return [s.players[s.leader].id];
  if (s.phase === 'vote') return s.players.filter(p => !(p.id in s.votes)).map(p => p.id);
  if (s.phase === 'quest') {
    const q = s.quests[s.questNo];
    return q.team.filter(id => !(id in s.questPicks));
  }
  if (s.phase === 'assassin') {
    const a = s.players.find(p => p.role === 'assassin');
    return a ? [a.id] : [];
  }
  return [];
};

/* góc nhìn riêng của 1 người chơi: vai trò + kiến thức của mình, KHÔNG lộ vai người khác */
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const myRole = me ? me.role : null;
  const mySide = me ? me.side : null;
  let knownEvil = [], merlinCandidates = [];
  if (me) {
    const evil = s.players.filter(p => p.side === 'evil');
    if (myRole === 'merlin') knownEvil = evil.filter(p => p.role !== 'mordred').map(p => p.id);
    else if (myRole === 'percival') {
      merlinCandidates = s.players.filter(p => p.role === 'merlin' || p.role === 'morgana').map(p => p.id);
    } else if (mySide === 'evil' && myRole !== 'oberon') {
      knownEvil = evil.filter(p => p.id !== pid && p.role !== 'oberon').map(p => p.id);
    }
  }
  const ended = s.phase === 'ended';
  /* Sát thủ cần biết mình là Sát thủ + được đoán những ai (mọi người trừ
     mình và phe Ác mình đã biết — gồm cả Oberon, vì Sát thủ không biết
     Oberon là Ác; đoán trúng Oberon thì vẫn tính là đoán sai Merlin).
     Chỉ tiết lộ cho chính Sát thủ — người khác không biết ai là Sát thủ. */
  const iAmAssassin = myRole === 'assassin';
  const assassinTargets = iAmAssassin
    ? s.players.filter(p => p.id !== pid && !knownEvil.includes(p.id)).map(p => p.id)
    : [];
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, n: s.n,
    leader: s.players[s.leader] ? s.players[s.leader].id : null,
    leaderName: s.players[s.leader] ? s.players[s.leader].name : null,
    questNo: s.questNo, questSizes: [...s.questSizes], failsNeeded: [...s.failsNeeded],
    quests: s.quests.map(q => ({ qi: q.qi, size: q.size, failsNeeded: q.failsNeeded, team: [...q.team], votes: q.votes ? { ...q.votes } : null, fails: q.fails, result: q.result, leader: q.leader })),
    proposal: s.proposal ? { team: [...s.proposal.team], by: s.proposal.by } : null,
    votes: { ...s.votes }, votedIds: Object.keys(s.votes),
    pickedIds: [...s.pickedIds],
    rejects: s.rejects, q4Double: s.q4Double,
    winner: s.winner, winnerIds: [...(s.winnerIds || [])],
    endReason: s.endReason, assassinPick: s.assassinPick ? { ...s.assassinPick } : null,
    timer: s.timer,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    /* vai trò mọi người CHỈ hiện khi ván đã kết thúc (màn lộ bài) */
    roles: ended ? Object.fromEntries(s.players.map(p => [p.id, p.role])) : null,
    sides: ended ? Object.fromEntries(s.players.map(p => [p.id, p.side])) : null,
    log: s.log.slice(-30),
    me: pid, myRole, mySide,
    knownEvil, merlinCandidates,
    iAmAssassin, assassinTargets,
    goodWins: questWins(s, 'good'), evilWins: questWins(s, 'evil'),
  };
}

/* Adapter cho phòng online (simplenet): action { type, team?, approve?, choice?, target? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'propose': return applyPropose(s, pid, a.team);
    case 'vote': return applyVote(s, pid, a.approve);
    case 'quest': return applyQuest(s, pid, a.choice);
    case 'assassin': return applyAssassin(s, pid, a.target);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
export { roleName, sideName };
