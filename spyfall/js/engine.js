// 🕵️ Spyfall – luật chơi (thuần logic, không chạm DOM).
// 3–8 người, mỗi ván 1 gián điệp + 1 địa điểm bí mật: mọi người (trừ gián
// điệp) nhận cùng 1 thẻ địa điểm kèm vai trò ở đó; gián điệp chỉ biết mình
// là gián điệp. Hỏi đáp lần lượt: người hỏi chọn 1 người để hỏi, người được
// hỏi trả lời rồi thành người hỏi tiếp. Bất kỳ ai cũng có thể hô "Bỏ phiếu
// ngay" để kết thúc vòng hỏi. Bỏ phiếu: ai bị tố nhiều phiếu nhất thì bị
// buộc tội — nếu đúng là gián điệp, gián điệp phải đoán địa điểm: đoán đúng
// thì gián điệp thắng một mình, đoán sai thì cả đội còn lại thắng; nếu buộc
// tội nhầm người thì gián điệp thắng ngay; hòa phiếu thì không ai bị buộc
// tội, gián điệp thắng. Gián điệp được đoán địa điểm sớm bất kỳ lúc nào
// trong vòng hỏi: đoán đúng thắng ngay, đoán sai thua ngay. Trận gồm nhiều
// ván: ai thắng đủ số ván mục tiêu (chủ phòng chọn 1/2/3) thì thắng trận.
import { LOCATIONS } from './locations.js?v=1';

export const OPT_CHOICES = { timer: [0, 60, 120], target: [1, 2, 3] };
const locById = id => LOCATIONS.find(l => l.id === id) || null;

/* bộ sinh số giả ngẫu nhiên có hạt giống, lưu trong state: ván mới chia lại
   (địa điểm, gián điệp, vai, người hỏi đầu) phải giống hệt nhau ở mọi máy
   cùng áp 1 hành động 'next' — dùng Math.random() ở đây thì 2 máy lệch nhau */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealRound(s, prevLocationId = null, prevSpyId = null) {
  const rnd = () => nextRand(s);
  const locs = shuffled(LOCATIONS.filter(l => l.id !== prevLocationId), rnd);
  const loc = locs[0] || LOCATIONS[0];
  const ids = shuffled(s.players.map(p => p.id), rnd);
  const spyId = ids.find(id => id !== prevSpyId) || ids[0];
  const roles = shuffled(loc.roles, rnd);
  s.locationId = loc.id;
  s.spyId = spyId;
  s.players.forEach((p, i) => {
    p.isSpy = p.id === spyId;
    p.role = p.isSpy ? 'spy' : roles[i % roles.length];
  });
  s.askerId = ids[Math.floor(nextRand(s) * ids.length)];
  s.pendingQ = null; s.qa = []; s.votes = {};
  s.accusedId = null; s.spyGuess = null;
  s.roundWinnerIds = []; s.endReason = null;
}

/* kết thúc 1 ván: cộng điểm, nếu có người đủ điểm mục tiêu thì kết thúc trận */
function endRound(s, winnerIds, reason) {
  s.roundWinnerIds = winnerIds.slice();
  s.endReason = reason;
  for (const id of winnerIds) s.wins[id] = (s.wins[id] || 0) + 1;
  const champs = s.players.filter(p => (s.wins[p.id] || 0) >= s.target).map(p => p.id);
  const spyWon = winnerIds.length === 1 && winnerIds[0] === s.spyId;
  if (champs.length) {
    s.phase = 'ended'; s.winnerIds = champs; s.matchWinner = spyWon ? 'spy' : 'team';
  } else {
    s.phase = 'roundover';
  }
  s.seq++;
  const names = ids => ids.map(id => (s.players.find(p => p.id === id) || {}).name || '?').join(', ');
  if (reason === 'spy-guess') pushLog(s, `🕵️ Gián điệp đoán đúng địa điểm (${locById(s.locationId).name}) — ${names(winnerIds)} thắng ván!`, 'win');
  else if (reason === 'spy-early-guess') pushLog(s, `🕵️ Gián điệp đoán đúng địa điểm sớm (${locById(s.locationId).name}) — thắng ván!`, 'win');
  else if (reason === 'spy-guess-wrong') pushLog(s, `🕵️ Gián điệp đoán sai địa điểm (${locById(s.locationId).name}) — cả đội còn lại thắng ván!`, 'win');
  else if (reason === 'spy-early-wrong') pushLog(s, `🕵️ Gián điệp đoán sai địa điểm sớm (${locById(s.locationId).name}) — cả đội còn lại thắng ván!`, 'win');
  else if (reason === 'wrong-accuse') pushLog(s, `🗳️ Cả bàn buộc tội nhầm người — 🕵️ gián điệp thắng ván!`, 'win');
  else if (reason === 'tie') pushLog(s, `🗳️ Hòa phiếu, không ai bị buộc tội — 🕵️ gián điệp thắng ván!`, 'win');
  else if (reason === 'resign') pushLog(s, `🏳️ Có người xin thua — ${spyWon ? '🕵️ gián điệp' : 'cả đội còn lại'} thắng ván!`, 'win');
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 3 || players.length > 8) throw new Error('Spyfall chơi 3–8 người.');
  const timer = OPT_CHOICES.timer.includes(+opts.timer) ? +opts.timer : 0;
  const target = OPT_CHOICES.target.includes(+opts.target) ? +opts.target : 1;
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed: Math.floor(Math.random() * 2147483647) + 1, /* hạt giống PRNG — chia ván mới phải giống hệt ở mọi máy */
    phase: 'ask', /* 'ask' | 'vote' | 'guess' | 'roundover' | 'ended' */
    players: players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null, role: null, isSpy: false })),
    n: players.length,
    locationId: null, spyId: null,
    askerId: null, pendingQ: null, qa: [],
    votes: {}, accusedId: null, spyGuess: null,
    wins: {}, target, timer,
    roundNo: 1, roundWinnerIds: [], endReason: null,
    winnerIds: [], matchWinner: null,
    log: [],
  };
  dealRound(s);
  pushLog(s, `🕵️ Ván 1 bắt đầu — ${s.n} người, 1 gián điệp đang trà trộn!`);
  return s;
}
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 3 || s.players.length > 8
    || !s.locationId || !s.spyId || typeof s.phase !== 'string' || !Array.isArray(s.qa)) {
    throw new Error('Trạng thái Spyfall không hợp lệ.');
  }
  return s;
}
const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };
const nonSpies = s => s.players.filter(p => !p.isSpy).map(p => p.id);
const locName = s => (locById(s.locationId) || {}).name || '?';

/* hỏi 1 người: chỉ người đang tới lượt hỏi, chưa có câu hỏi chờ trả lời */
export function applyAsk(s, pid, to, text) {
  if (s.phase !== 'ask') return { ok: false, reason: 'Chưa tới vòng hỏi đáp.' };
  if (pid !== s.askerId) return { ok: false, reason: 'Chưa tới lượt bạn hỏi.' };
  if (s.pendingQ) return { ok: false, reason: 'Đang chờ người kia trả lời.' };
  const target = pOf(s, to);
  if (!target) return { ok: false, reason: 'Không có người này.' };
  if (to === pid) return { ok: false, reason: 'Không tự hỏi mình.' };
  const q = String(text || '').trim();
  if (!q || q.length > 120) return { ok: false, reason: 'Câu hỏi dài 1–120 ký tự.' };
  s.pendingQ = { from: pid, to, text: q };
  s.qa.push({ from: pid, to, q, a: null });
  s.seq++;
  return { ok: true };
}

/* trả lời câu hỏi đang chờ: chỉ người được hỏi; trả lời xong thì tới lượt mình hỏi tiếp */
export function applyAnswer(s, pid, text) {
  if (s.phase !== 'ask') return { ok: false, reason: 'Chưa tới vòng hỏi đáp.' };
  if (!s.pendingQ) return { ok: false, reason: 'Không có câu hỏi nào đang chờ.' };
  if (pid !== s.pendingQ.to) return { ok: false, reason: 'Câu hỏi này không hỏi bạn.' };
  const a = String(text || '').trim();
  if (!a || a.length > 200) return { ok: false, reason: 'Câu trả lời dài 1–200 ký tự.' };
  const last = s.qa[s.qa.length - 1];
  if (last) last.a = a;
  s.pendingQ = null;
  s.askerId = pid; /* người vừa trả lời sẽ hỏi tiếp */
  s.seq++;
  /* giới hạn hỏi đáp: mỗi ván tối đa 2 vòng quanh bàn (2 × số người câu hỏi)
     rồi tự chuyển sang bỏ phiếu — ván không bao giờ kẹt ở vòng hỏi */
  if (s.qa.length >= s.n * 2) {
    s.votes = {}; s.phase = 'vote'; s.seq++;
    pushLog(s, `❓ Hết lượt hỏi (${s.qa.length} câu) — cả bàn bỏ phiếu tìm gián điệp!`);
  }
  return { ok: true };
}

/* bất kỳ ai cũng có thể hô bỏ phiếu để kết thúc vòng hỏi */
export function applyCallVote(s, pid) {
  if (s.phase !== 'ask') return { ok: false, reason: 'Chưa tới vòng hỏi đáp.' };
  if (!pOf(s, pid)) return { ok: false };
  s.pendingQ = null;
  s.votes = {}; s.phase = 'vote'; s.seq++;
  pushLog(s, `🗳️ ${pOf(s, pid).name} hô bỏ phiếu — cả bàn tìm gián điệp!`);
  return { ok: true };
}

/* bỏ phiếu cho 1 người (không tự bầu mình); đủ phiếu thì công bố */
export function applyVote(s, pid, target) {
  if (s.phase !== 'vote') return { ok: false, reason: 'Chưa tới lúc bỏ phiếu.' };
  if (!pOf(s, pid)) return { ok: false };
  if (pid in s.votes) return { ok: false, reason: 'Bạn đã bỏ phiếu rồi.' };
  if (!pOf(s, target)) return { ok: false, reason: 'Không có người này.' };
  if (target === pid) return { ok: false, reason: 'Không tự bầu mình làm gián điệp.' };
  s.votes[pid] = target; s.seq++;
  const n = s.players.length;
  if (Object.keys(s.votes).length < n) return { ok: true, voted: Object.keys(s.votes).length };
  /* đủ phiếu: đếm — hòa phiếu thì gián điệp thắng ngay */
  const counts = {};
  for (const t of Object.values(s.votes)) counts[t] = (counts[t] || 0) + 1;
  const top = Math.max(...Object.values(counts));
  const leaders = Object.keys(counts).filter(id => counts[id] === top);
  if (leaders.length > 1) {
    pushLog(s, `🗳️ Hòa phiếu ${top}–${top} — không ai bị buộc tội!`);
    endRound(s, [s.spyId], 'tie');
    return { ok: true, tied: true, ended: true };
  }
  const accused = leaders[0];
  s.accusedId = accused;
  if (accused === s.spyId) {
    s.phase = 'guess'; s.seq++;
    pushLog(s, `🗳️ ${pOf(s, accused).name} bị buộc tội — đúng là gián điệp! Gián điệp, đoán địa điểm đi!`);
    return { ok: true, accused, isSpy: true };
  }
  pushLog(s, `🗳️ ${pOf(s, accused).name} bị buộc tội — nhưng không phải gián điệp!`);
  endRound(s, [s.spyId], 'wrong-accuse');
  return { ok: true, accused, isSpy: false, ended: true };
}

/* gián điệp bị buộc tội thì đoán địa điểm: đúng thắng, sai thua */
export function applyGuess(s, pid, location) {
  if (s.phase !== 'guess') return { ok: false, reason: 'Chưa tới lúc đoán địa điểm.' };
  if (pid !== s.spyId) return { ok: false, reason: 'Chỉ gián điệp mới được đoán địa điểm.' };
  if (!locById(location)) return { ok: false, reason: 'Không có địa điểm này.' };
  const correct = location === s.locationId;
  s.spyGuess = { by: pid, location, correct };
  s.seq++;
  if (correct) endRound(s, [s.spyId], 'spy-guess');
  else endRound(s, nonSpies(s), 'spy-guess-wrong');
  return { ok: true, correct };
}

/* gián điệp đoán sớm trong vòng hỏi: đúng thắng ngay, sai thua ngay */
export function applySpyGuess(s, pid, location) {
  if (s.phase !== 'ask') return { ok: false, reason: 'Chỉ đoán sớm trong vòng hỏi đáp.' };
  if (pid !== s.spyId) return { ok: false, reason: 'Chỉ gián điệp mới được đoán địa điểm.' };
  if (!locById(location)) return { ok: false, reason: 'Không có địa điểm này.' };
  const correct = location === s.locationId;
  s.spyGuess = { by: pid, location, correct, early: true };
  s.seq++;
  pushLog(s, `🕵️ Gián điệp đoán sớm: ${locById(location).name} — ${correct ? 'ĐÚNG!' : 'SAI!'}`);
  if (correct) endRound(s, [s.spyId], 'spy-early-guess');
  else endRound(s, nonSpies(s), 'spy-early-wrong');
  return { ok: true, correct };
}

/* ván tiếp theo (giữ điểm số trận đấu) */
export function applyNext(s, pid) {
  if (s.phase !== 'roundover') return { ok: false, reason: 'Chưa hết ván.' };
  if (!pOf(s, pid)) return { ok: false };
  const prevLoc = s.locationId, prevSpy = s.spyId;
  s.roundNo++;
  dealRound(s, prevLoc, prevSpy);
  s.phase = 'ask'; s.seq++;
  pushLog(s, `🕵️ Ván ${s.roundNo} bắt đầu — gián điệp và địa điểm đã đổi!`);
  return { ok: true };
}

export function applyResign(s, pid) {
  if (s.phase === 'ended' || s.phase === 'roundover') return { ok: false, reason: 'Ván đã kết thúc.' };
  const me = pOf(s, pid); if (!me) return { ok: false };
  pushLog(s, `${me.name} xin thua.`);
  if (me.isSpy) endRound(s, nonSpies(s), 'resign');
  else endRound(s, [s.spyId], 'resign');
  return { ok: true, ended: true };
}

/* ai đang phải hành động (cho bot + đồng hồ) */
export const actors = s => {
  if (s.phase === 'ask') return s.pendingQ ? [s.pendingQ.to] : [s.askerId];
  if (s.phase === 'vote') return s.players.filter(p => !(p.id in s.votes)).map(p => p.id);
  if (s.phase === 'guess') return [s.spyId];
  return [];
};

/* góc nhìn riêng của 1 người chơi: thẻ địa điểm/vai của mình; KHÔNG lộ địa
   điểm cho gián điệp, KHÔNG lộ ai là gián điệp cho tới khi ván ngã ngũ */
export function viewFor(s, pid) {
  const me = pOf(s, pid);
  const amSpy = !!(me && me.isSpy);
  const loc = locById(s.locationId);
  const revealed = s.phase === 'guess' || s.phase === 'roundover' || s.phase === 'ended';
  const roundDone = s.phase === 'roundover' || s.phase === 'ended';
  const myVote = (s.votes || {})[pid] || null;
  const votesAgainstMe = Object.values(s.votes || {}).filter(t => t === pid).length;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, n: s.n,
    roundNo: s.roundNo, target: s.target, timer: s.timer,
    wins: { ...s.wins },
    askerId: s.askerId,
    askerName: (pOf(s, s.askerId) || {}).name || null,
    pendingQ: s.pendingQ ? { ...s.pendingQ } : null,
    qa: s.qa.map(x => ({ ...x })),
    votes: roundDone ? { ...s.votes } : {},
    votedIds: Object.keys(s.votes || {}),
    accusedId: s.accusedId,
    spyGuess: s.spyGuess ? { ...s.spyGuess } : null,
    roundWinnerIds: [...(s.roundWinnerIds || [])],
    endReason: s.endReason,
    winnerIds: [...(s.winnerIds || [])],
    matchWinner: s.matchWinner,
    players: s.players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null })),
    locationList: LOCATIONS.map(l => ({ id: l.id, name: l.name, icon: l.icon })),
    /* thẻ của mình: địa điểm + vai; gián điệp chỉ biết mình là gián điệp */
    myLocation: amSpy ? null : (loc ? { id: loc.id, name: loc.name, icon: loc.icon, desc: loc.desc } : null),
    myRole: me ? me.role : null,
    amSpy,
    /* gián điệp + địa điểm chỉ lộ khi ván ngã ngũ (hoặc lúc gián điệp bị buộc tội) */
    spyId: revealed ? s.spyId : null,
    locationId: roundDone ? s.locationId : null,
    locationName: roundDone ? locName(s) : null,
    roles: roundDone ? Object.fromEntries(s.players.map(p => [p.id, p.role])) : null,
    log: s.log.slice(-30),
    me: pid, myVote, votesAgainstMe,
  };
}

/* Adapter cho phòng online (simplenet): action { type, to?, text?, target?, location? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'ask': return applyAsk(s, pid, a.to, a.text);
    case 'answer': return applyAnswer(s, pid, a.text);
    case 'callvote': return applyCallVote(s, pid);
    case 'vote': return applyVote(s, pid, a.target);
    case 'guess': return applyGuess(s, pid, a.location);
    case 'spyguess': return applySpyGuess(s, pid, a.location);
    case 'next': return applyNext(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}
