// 🛡️ The Resistance – luật chơi (thuần logic, không chạm DOM).
// Game suy luận xã hội (bản gốc, KHÔNG có Merlin/Assassin — chỉ có
// Kháng chiến vs Gián điệp, như bản cơ bản của The Resistance).
// 5–10 người. Gián điệp biết nhau; Kháng chiến không biết ai là ai.
// 5 nhiệm vụ, mỗi nhiệm vụ: Thủ lĩnh đề cử 1 đội → cả bàn bỏ phiếu
// Đồng ý / Từ chối (công khai). Đa số Đồng ý thì nhiệm vụ diễn ra;
// Từ chối thì quyền Thủ lĩnh chuyển sang người tiếp theo. 5 lần từ
// chối liên tiếp → Gián điệp thắng ngay (luật chính thức).
// Trong nhiệm vụ, mỗi thành viên trong đội bí mật chọn Thành công hay
// Thất bại. Kháng chiến BẮT BUỘC chọn Thành công (engine chặn chọn
// Thất bại). Nhiệm vụ thành công khi số Thất bại < số cần thiết
// (1, hoặc 2 ở nhiệm vụ 4 trong ván 7+ người). Kết quả chỉ công bố
// SỐ lượng Thất bại — không bao giờ lộ ai đã chọn gì.
// Phe nào thắng 3 nhiệm vụ trước thì thắng ván.
// Số gián điệp chính thức: 5p→2, 6p→2, 7p→3, 8p→3, 9p→3, 10p→4.
// Cỡ đội chính thức: 5p [2,3,2,3,3], 6p [2,3,4,3,4], 7p [2,3,3,4,4],
// 8p [3,4,4,5,5], 9p [3,4,4,5,5], 10p [3,4,4,5,5].
// Nhiệm vụ 4 trong ván 7+ người cần 2 Thất bại mới thất bại.
// Chơi đơn: bạn LUÔN là Kháng chiến; engine tự thêm 4 máy (5 người,
// 2 gián điệp trong số máy). Đấu máy: bạn + máy, vai trò chia ngẫu
// nhiên theo bảng chính thức (bạn có thể là Gián điệp).
// LCG trong state giữ cho các lần rút vai trò giống hệt nhau ở mọi
// máy cùng áp 1 hành động — dùng Math.random() thì 2 máy lệch nhau.
// Quyết định luật (ghi rõ để parent hiệu chuẩn thành tích):
// - KHÔNG có hòa: endReason không bao giờ là 'draw' (ván luôn có phe
//   thắng — 5 nhiệm vụ, phe nào thắng 3 trước thì thắng).
// - Xin thua = ĐẦU HÀNG cả phe: người xin thua THUA, toàn bộ phe của
//   họ cũng thua, phe còn lại thắng ngay (theo pattern Bắn Tàu/Ma Sói).
//   Không có luật "người xin thua rời ván, ván tiếp tục" — vì cỡ đội
//   và số gián điệp gắn chặt với số người chơi.
// - Phiếu bầu là CÔNG KHAI (ai cũng thấy ai bỏ phiếu gì) — đúng luật
//   gốc. Lựa chọn Thành công/Thất bại trong nhiệm vụ là BÍ MẬT tuyệt
//   đối: chỉ công bố số Thất bại, không lộ từng người.
// - Vai trò: Kháng chiến chỉ thấy vai trò của mình; Gián điệp thấy
//   hết đồng đội gián điệp của mình.
// - "Phiếu đúng" (votesCorrect): phiếu Đồng ý cho đội sau đó thành
//   công, hoặc phiếu Từ chối cho đội sau đó thất bại — chỉ tính khi
//   nhiệm vụ đã diễn ra.
import { MISSIONS, BOT_NAMES } from './words.js?v=1';

export const SPY_COUNT = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };
export const TEAM_SIZES = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};
export const MAX_MISSIONS = 5;
export const WIN_MISSIONS = 3; /* phe nào thắng 3 nhiệm vụ trước thì thắng ván */
export const MAX_REJECTS = 5; /* 5 lần từ chối liên tiếp → Gián điệp thắng ngay */

/* cỡ đội của nhiệm vụ thứ m (1-based) trong ván n người */
export function teamSizeFor(n, m) { return TEAM_SIZES[n][m - 1]; }
/* số Thất bại cần để nhiệm vụ thất bại (2 ở nhiệm vụ 4, ván 7+ người) */
export function failsNeededFor(n, m) { return (n >= 7 && m === 4) ? 2 : 1; }
/* số gián điệp trong ván n người */
export function spyCountFor(n) { return SPY_COUNT[n]; }

/* bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32) */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/* LCG lưu trong state — mọi lần rút số đều qua đây để 2 máy đồng bộ */
function nextRand(s) {
  s.seed = (s.seed * 1103515245 + 12345) % 2147483648;
  return s.seed / 2147483648;
}

const pOf = (s, id) => s.players.find(p => p.id === id);
const pushLog = (s, text, kind = '') => { s.log.push({ text, kind }); if (s.log.length > 40) s.log.shift(); };

/* xáo vai trò bằng LCG: chọn spyCount người làm gián điệp */
function dealRoles(s) {
  const n = s.players.length;
  const k = SPY_COUNT[n];
  const idx = s.players.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(s) * (i + 1));
    const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
  }
  const spies = new Set(idx.slice(0, k));
  s.players.forEach((p, i) => { s.prog[p.id].side = spies.has(i) ? 'spy' : 'resistance'; });
}

export function createGame(players, opts = {}) {
  if (!players || players.length < 1 || players.length > 10) throw new Error('The Resistance chơi 1–10 người (chơi đơn = 1, đấu máy/online/chuyền tay = 5–10).');
  const seed = (opts.seed >>> 0) || (Math.floor(Math.random() * 2147483647) + 1);
  const solo = players.length === 1;
  const botLevel = opts.botLevel === 'hard' ? 'hard' : 'easy';
  /* chơi đơn: engine tự thêm 4 máy để đủ 5 người (2 gián điệp trong số máy) */
  let all = players.map(p => ({ id: p.id, name: p.name, isBot: !!p.isBot, local: !!p.local, level: p.level || null }));
  if (solo) {
    for (let i = 0; i < 4; i++) all.push({ id: 'bot' + (i + 1), name: BOT_NAMES[i], isBot: true, local: false, level: botLevel });
  }
  if (all.length < 5 || all.length > 10) throw new Error('The Resistance cần 5–10 người trong ván (chơi đơn tự thêm máy).');
  /* người đi đầu: host truyền firstIdx để xoay lượt qua các ván (ván sau =
     ghế sau ván trước); không có thì bốc thăm theo seed — ván đầu ngẫu nhiên,
     không còn cố định ghế 0 mọi ván mới */
  const firstIdx = Number.isInteger(opts.firstIdx) && opts.firstIdx >= 0 && opts.firstIdx < all.length
    ? opts.firstIdx : seed % all.length;
  const s = {
    gid: Math.random().toString(36).slice(2, 9), seq: 0,
    seed, /* hạt giống LCG — mọi lần rút số trong ván đều qua nextRand(s) */
    phase: 'playing', /* 'playing' | 'ended' */
    solo,
    players: all,
    prog: {},
    mission: 1, /* nhiệm vụ hiện tại 1..5 */
    stage: 'propose', /* 'propose' | 'vote' | 'mission' | 'reveal' */
    leaderIdx: firstIdx,
    firstIdx, /* ghế Thủ lĩnh đầu tiên của ván — để xoay lượt qua các ván + hiện ở phòng chờ */
    rejects: 0, /* số lần từ chối liên tiếp trong nhiệm vụ hiện tại */
    proposal: null, /* {leader, team:[pids], votes:{pid:'approve'|'reject'}} */
    current: null, /* {team:[pids], actions:{pid:'success'|'fail'}, failsNeeded} */
    history: [], /* {mission, team, fails, required, result:'success'|'fail'} */
    winsRes: 0, winsSpy: 0,
    winner: null, /* phe thắng: 'resistance' | 'spy' */
    winnerIds: [],
    losers: [],
    endReason: null, /* 'missions' | 'rejects' | 'resign' — không bao giờ 'draw' */
    startedAt: Date.now(), endedAt: null,
    log: [],
  };
  for (const p of s.players) s.prog[p.id] = {
    side: null, resigned: false,
    missionsOn: 0, failsCaused: 0,
    votesApprove: 0, votesReject: 0, votesCorrect: 0,
    proposals: 0, proposalsApproved: 0, leaderCount: 0,
  };
  dealRoles(s);
  /* chơi đơn: người chơi luôn là Kháng chiến — nếu LCG chia bạn làm
     gián điệp thì đổi vai với máy đầu tiên là Kháng chiến */
  if (solo) {
    const me = s.players[0];
    if (s.prog[me.id].side === 'spy') {
      const swap = s.players.find(p => p.isBot && s.prog[p.id].side === 'resistance');
      s.prog[me.id].side = 'resistance';
      s.prog[swap.id].side = 'spy';
    }
  }
  s.prog[s.players[firstIdx].id].leaderCount = 1;
  pushLog(s, `🛡️ Ván The Resistance mới — ${s.players.length} người, ${SPY_COUNT[s.players.length]} gián điệp trà trộn! ${s.players[firstIdx].name} làm Thủ lĩnh đầu tiên. Nhiệm vụ 1 cần đội ${TEAM_SIZES[s.players.length][0]} người.`);
  return s;
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }
export const serialize = s => JSON.stringify(s);
export function deserialize(json) {
  const s = typeof json === 'string' ? JSON.parse(json) : json;
  if (!s || !Array.isArray(s.players) || s.players.length < 5 || s.players.length > 10
    || typeof s.phase !== 'string' || !s.prog || !s.history
    || !['propose', 'vote', 'mission', 'reveal'].includes(s.stage)
    || typeof s.mission !== 'number' || s.mission < 1 || s.mission > 5) {
    throw new Error('Trạng thái The Resistance không hợp lệ.');
  }
  if (typeof s.firstIdx !== 'number') s.firstIdx = s.leaderIdx || 0; /* save cũ chưa có firstIdx */
  return s;
}

/* Thủ lĩnh hiện tại */
export function leaderId(s) { return s.players[s.leaderIdx] ? s.players[s.leaderIdx].id : null; }
/* ai đang phải hành động */
export function actors(s) {
  if (s.phase !== 'playing') return [];
  if (s.stage === 'propose') return [leaderId(s)];
  if (s.stage === 'vote') {
    const v = (s.proposal && s.proposal.votes) || {};
    return s.players.filter(p => !(p.id in v)).map(p => p.id);
  }
  if (s.stage === 'mission') {
    const a = (s.current && s.current.actions) || {};
    return (s.current ? s.current.team : []).filter(pid => !(pid in a));
  }
  if (s.stage === 'reveal') return s.players.map(p => p.id); /* ai cũng được bấm Tiếp theo */
  return [];
}

function finishSummary(s) {
  const out = {};
  for (const p of s.players) {
    const pr = s.prog[p.id];
    out[p.id] = {
      side: pr.side,
      missionsWon: pr.side === 'resistance' ? s.winsRes : s.winsSpy,
      missionsPlayed: pr.missionsOn,
      votesCorrect: pr.votesCorrect,
      missionsFailed: pr.failsCaused,
      proposalsApproved: pr.proposalsApproved,
      isLeaderCount: pr.leaderCount,
    };
  }
  return out;
}

function endGame(s, side, reason) {
  if (s.phase !== 'playing') return;
  s.phase = 'ended'; s.endedAt = Date.now(); s.seq++;
  s.winner = side;
  s.winnerIds = s.players.filter(p => s.prog[p.id].side === side).map(p => p.id);
  s.losers = s.players.filter(p => s.prog[p.id].side !== side).map(p => p.id);
  s.endReason = reason;
  s.final = { summary: finishSummary(s) };
  const names = side === 'resistance' ? 'Kháng chiến' : 'Gián điệp';
  pushLog(s, reason === 'rejects'
    ? `🚨 5 lần từ chối liên tiếp — Gián điệp thắng ván!`
    : reason === 'resign'
      ? `🏳️ Có người xin thua — cả phe thua, ${names} thắng ván!`
      : `🏆 ${names} thắng 3 nhiệm vụ — ${names} thắng ván!`,
    side === 'resistance' ? 'good' : 'bad');
}

/* sang nhiệm vụ tiếp theo, hoặc kết thúc ván khi đủ 3 nhiệm vụ thắng */
function advanceMission(s) {
  if (s.winsRes >= WIN_MISSIONS) { endGame(s, 'resistance', 'missions'); return; }
  if (s.winsSpy >= WIN_MISSIONS) { endGame(s, 'spy', 'missions'); return; }
  if (s.mission >= MAX_MISSIONS) { /* 5 nhiệm vụ xong thì chắc chắn có phe đủ 3 */
    endGame(s, s.winsRes > s.winsSpy ? 'resistance' : 'spy', 'missions'); return;
  }
  s.mission++;
  s.leaderIdx = (s.leaderIdx + 1) % s.players.length;
  s.prog[leaderId(s)].leaderCount++;
  s.rejects = 0;
  s.proposal = null; s.current = null;
  s.stage = 'propose'; s.seq++;
  const n = s.players.length;
  pushLog(s, `🎯 Nhiệm vụ ${s.mission} (${MISSIONS[s.mission - 1].name}) — cần đội ${TEAM_SIZES[n][s.mission - 1]} người, ${cleanName(pOf(s, leaderId(s)).name)} làm Thủ lĩnh.`);
}

/* Thủ lĩnh đề cử đội */
export function applyPropose(s, pid, team) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'propose') return { ok: false, reason: 'Chưa tới lúc đề cử đội.' };
  if (pid !== leaderId(s)) return { ok: false, reason: 'Chỉ Thủ lĩnh mới được đề cử đội.' };
  const need = TEAM_SIZES[s.players.length][s.mission - 1];
  if (!Array.isArray(team) || team.length !== need) return { ok: false, reason: `Đội nhiệm vụ ${s.mission} cần đúng ${need} người.` };
  if (new Set(team).size !== team.length) return { ok: false, reason: 'Đội không được trùng người.' };
  for (const t of team) if (!pOf(s, t)) return { ok: false, reason: 'Đội có người không tồn tại.' };
  s.proposal = { leader: pid, team: team.slice(), votes: {} };
  s.prog[pid].proposals++;
  s.stage = 'vote'; s.seq++;
  pushLog(s, `📋 ${cleanName(pOf(s, pid).name)} đề cử đội: ${team.map(t => cleanName(pOf(s, t).name)).join(', ')} — cả bàn bỏ phiếu!`);
  return { ok: true };
}

/* bỏ phiếu Đồng ý / Từ chối (công khai) */
export function applyVote(s, pid, choice) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'vote') return { ok: false, reason: 'Chưa tới lúc bỏ phiếu.' };
  if (!s.proposal) return { ok: false, reason: 'Chưa có đội được đề cử.' };
  if (!(choice === 'approve' || choice === 'reject')) return { ok: false, reason: 'Phiếu phải là Đồng ý hoặc Từ chối.' };
  if (pid in s.proposal.votes) return { ok: false, reason: 'Bạn đã bỏ phiếu rồi.' };
  s.proposal.votes[pid] = choice;
  if (choice === 'approve') s.prog[pid].votesApprove++;
  else s.prog[pid].votesReject++;
  s.seq++;
  const votes = s.proposal.votes;
  const n = s.players.length;
  if (Object.keys(votes).length < n) return { ok: true, waiting: n - Object.keys(votes).length };
  /* đủ phiếu → đa số Đồng ý thì nhiệm vụ diễn ra */
  const approve = Object.values(votes).filter(v => v === 'approve').length;
  if (approve > n / 2) {
    s.prog[s.proposal.leader].proposalsApproved++;
    s.rejects = 0;
    const need = failsNeededFor(n, s.mission);
    s.current = { team: s.proposal.team.slice(), actions: {}, failsNeeded: need };
    s.stage = 'mission'; s.seq++;
    pushLog(s, `✅ Đội được chấp thuận ${approve}/${n} phiếu — nhiệm vụ ${s.mission} bắt đầu!${need === 2 ? ' (Nhiệm vụ này cần 2 Thất bại mới thất bại.)' : ''}`);
    return { ok: true, approved: true };
  }
  s.rejects++;
  pushLog(s, `❌ Đội bị từ chối ${approve}/${n} phiếu Đồng ý — từ chối liên tiếp lần ${s.rejects}/5.`);
  if (s.rejects >= MAX_REJECTS) { endGame(s, 'spy', 'rejects'); return { ok: true, approved: false, ended: true }; }
  s.leaderIdx = (s.leaderIdx + 1) % s.players.length;
  s.prog[leaderId(s)].leaderCount++;
  s.proposal = null;
  s.stage = 'propose'; s.seq++;
  pushLog(s, `🔄 Quyền Thủ lĩnh chuyển sang ${cleanName(pOf(s, leaderId(s)).name)}.`);
  return { ok: true, approved: false };
}

/* thành viên trong đội bí mật chọn Thành công / Thất bại */
export function applyMission(s, pid, choice) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'mission') return { ok: false, reason: 'Chưa tới lúc làm nhiệm vụ.' };
  if (!s.current || !s.current.team.includes(pid)) return { ok: false, reason: 'Bạn không có trong đội nhiệm vụ này.' };
  if (!(choice === 'success' || choice === 'fail')) return { ok: false, reason: 'Chỉ được chọn Thành công hoặc Thất bại.' };
  if (pid in s.current.actions) return { ok: false, reason: 'Bạn đã chọn rồi.' };
  /* Kháng chiến BẮT BUỘC Thành công */
  if (s.prog[pid].side === 'resistance' && choice === 'fail') return { ok: false, reason: 'Kháng chiến chỉ được chọn Thành công.' };
  s.current.actions[pid] = choice;
  if (choice === 'fail') s.prog[pid].failsCaused++;
  s.prog[pid].missionsOn++;
  s.seq++;
  const team = s.current.team;
  if (Object.keys(s.current.actions).length < team.length) return { ok: true, waiting: team.length - Object.keys(s.current.actions).length };
  doReveal(s);
  return { ok: true, revealed: true };
}

/* lật bài nhiệm vụ: chỉ công bố SỐ Thất bại, không lộ ai chọn gì */
function doReveal(s) {
  const cur = s.current;
  const fails = Object.values(cur.actions).filter(a => a === 'fail').length;
  const ok = fails < cur.failsNeeded;
  if (ok) s.winsRes++; else s.winsSpy++;
  s.history.push({ mission: s.mission, team: cur.team.slice(), fails, required: cur.failsNeeded, result: ok ? 'success' : 'fail' });
  /* phiếu đúng: Đồng ý cho đội thành công, hoặc Từ chối cho đội thất bại */
  if (s.proposal) {
    for (const [pid, v] of Object.entries(s.proposal.votes)) {
      if ((v === 'approve' && ok) || (v === 'reject' && !ok)) s.prog[pid].votesCorrect++;
    }
  }
  pushLog(s, ok
    ? `🎉 Nhiệm vụ ${s.mission} THÀNH CÔNG (${fails} Thất bại) — Kháng chiến ${s.winsRes} · Gián điệp ${s.winsSpy}.`
    : `💥 Nhiệm vụ ${s.mission} THẤT BẠI (${fails} Thất bại) — Kháng chiến ${s.winsRes} · Gián điệp ${s.winsSpy}.`,
    ok ? 'good' : 'bad');
  s.stage = 'reveal'; s.seq++;
}

/* xem kết quả lật bài xong → sang nhiệm vụ tiếp theo */
export function applyNext(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  if (s.stage !== 'reveal') return { ok: false, reason: 'Chưa lật bài xong.' };
  advanceMission(s);
  return { ok: true };
}

/* xin thua = đầu hàng cả phe: phe mình thua ngay, phe kia thắng */
export function applyResign(s, pid) {
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const pr = s.prog[pid];
  if (!pr) return { ok: false, reason: 'Người chơi không tồn tại.' };
  if (pr.resigned) return { ok: false, reason: 'Bạn đã xin thua rồi.' };
  pr.resigned = true;
  s.seq++;
  pushLog(s, `🏳️ ${cleanName(pOf(s, pid).name)} xin thua — cả phe đầu hàng.`);
  endGame(s, pr.side === 'resistance' ? 'spy' : 'resistance', 'resign');
  return { ok: true, ended: true };
}

/* Adapter cho phòng online (simplenet): action { type, team?, choice? } */
export function applyAction(s, pid, a, ctx) {
  if (!a || typeof a.type !== 'string') return { ok: false, reason: 'Hành động không hợp lệ.' };
  switch (a.type) {
    case 'propose': return applyPropose(s, pid, a.team);
    case 'vote': return applyVote(s, pid, a.choice);
    case 'action': return applyMission(s, pid, a.choice);
    case 'next': return applyNext(s, pid);
    case 'resign': return applyResign(s, pid);
    default: return { ok: false, reason: 'Hành động không hợp lệ.' };
  }
}

/* viewFor: che vai trò + lựa chọn bí mật — chỉ lộ những gì luật cho phép */
export function viewFor(s, pid) {
  const me = s.prog[pid] || {};
  const mySide = me.side;
  const isSpy = mySide === 'spy';
  const spyIds = isSpy ? s.players.filter(p => s.prog[p.id].side === 'spy').map(p => p.id) : [];
  const myAction = s.current && s.current.actions ? (s.current.actions[pid] || null) : null;
  const proposal = s.proposal ? {
    leader: s.proposal.leader,
    team: s.proposal.team.slice(),
    votes: Object.assign({}, s.proposal.votes), /* phiếu bầu công khai */
  } : null;
  const current = s.current ? {
    team: s.current.team.slice(),
    failsNeeded: s.current.failsNeeded,
    actedCount: Object.keys(s.current.actions).length,
    acted: s.current.team.map(t => Object.prototype.hasOwnProperty.call(s.current.actions, t)),
    myAction, /* chỉ lựa chọn của chính mình */
    revealed: s.stage === 'reveal',
  } : null;
  const last = s.history.length ? s.history[s.history.length - 1] : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase,
    startedAt: s.startedAt, endedAt: s.endedAt,
    winner: s.winner, winnerIds: (s.winnerIds || []).slice(), losers: (s.losers || []).slice(), endReason: s.endReason,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    solo: s.solo, mission: s.mission, stage: s.stage,
    leader: leaderId(s), firstIdx: s.firstIdx,
    rejects: s.rejects,
    teamSize: TEAM_SIZES[s.players.length][s.mission - 1],
    failsNeeded: failsNeededFor(s.players.length, s.mission),
    winsRes: s.winsRes, winsSpy: s.winsSpy,
    proposal, current,
    history: s.history.map(h => ({ mission: h.mission, team: h.team.slice(), fails: h.fails, required: h.required, result: h.result })),
    lastReveal: s.stage === 'reveal' && last ? { mission: last.mission, team: last.team.slice(), fails: last.fails, required: last.required, result: last.result } : null,
    mySide, spyIds, /* gián điệp thấy đồng đội; kháng chiến thấy spyIds = [] */
    players: s.players.map(p => {
      const q = s.prog[p.id] || {};
      const showSide = (p.id === pid) || (isSpy && q.side === 'spy');
      return {
        id: p.id, name: p.name, isBot: !!p.isBot, level: p.level || null,
        side: showSide ? q.side : null, /* che vai trò của người khác */
        isLeader: p.id === leaderId(s),
        onTeam: (s.proposal ? s.proposal.team.includes(p.id) : false) || (s.current ? s.current.team.includes(p.id) : false),
        voted: s.proposal ? (p.id in s.proposal.votes) : false,
        vote: s.proposal ? (s.proposal.votes[p.id] || null) : null,
        acted: s.current ? Object.prototype.hasOwnProperty.call(s.current.actions, p.id) : false,
        resigned: !!q.resigned,
        points: (q.side === 'resistance' ? s.winsRes : s.winsSpy),
      };
    }),
    log: s.log.slice(-20),
    me: pid,
  };
}

function cleanName(n) { return String(n == null ? '' : n).trim().slice(0, 24); }

export default { createGame, applyAction, viewFor, actors, serialize, deserialize, mulberry32, teamSizeFor, failsNeededFor, spyCountFor };
