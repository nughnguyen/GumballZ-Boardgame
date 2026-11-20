// 🤖 Bot The Resistance.
//
// LƯU Ý QUAN TRỌNG (giống bot Ai Là Triệu Phú / 2 Thật 1 Giả / Đoán
// Hành Động / Wavelength): bot đọc vai trò của CHÍNH NÓ và trạng thái
// CÔNG KHAI (đội đề cử, phiếu bầu, lịch sử nhiệm vụ) từ state gốc CHỈ
// để giả lập cách chơi của nó — vì ngoài đời thật, bot "biết" vai trò
// của mình và nhớ ai từng ở đội thất bại. Bot KHÔNG BAO GIỜ đọc lựa
// chọn Thành công/Thất bại bí mật của người khác, không nhìn trộm vai
// trò của người không phải đồng đội gián điệp của nó. Trong một ván
// online thật, phía server/bot chỉ thấy viewFor của chính nó.
//
// - Bot làm Thủ lĩnh đề cử đội:
//   + Dễ: chọn ngẫu nhiên đủ số người (có thể có cả mình).
//   + Khó: ưu tiên người từng ở nhiệm vụ THÀNH CÔNG (đáng tin); gián
//     điệp thì luôn nhét ít nhất 1 gián điệp khác vào đội (nếu có),
//     còn lại chọn người từng ở nhiệm vụ thành công.
// - Bot bỏ phiếu:
//   + Dễ: Đồng ý với xác suất ~70% khi đội không đáng nghi, ~30% khi
//     đội có người từng ở nhiệm vụ thất bại (có trí nhớ cơ bản).
//   + Khó (Kháng chiến): Từ chối nếu đội có người từng ở nhiệm vụ
//     THẤT BẠI (nghi là gián điệp); nếu sắp đủ 5 lần từ chối liên
//     tiếp thì luôn Đồng ý (không để thua vì từ chối).
//   + Khó (Gián điệp): Đồng ý nếu đội có gián điệp (mình hoặc đồng
//     đội); Từ chối nếu đội toàn Kháng chiến — trừ khi sắp đủ 5 lần
//     từ chối thì Đồng ý.
// - Bot trong nhiệm vụ (chỉ khi có trong đội):
//   + Kháng chiến: bắt buộc Thành công (engine cũng chặn chọn Thất bại).
//   + Dễ (Gián điệp): Thất bại với xác suất ~50%.
//   + Khó (Gián điệp): Thất bại nếu có gián điệp khác cùng trong đội;
//     nếu chỉ có mình là gián điệp: nhiệm vụ 1–2 thì Chờ (chọn Thành
//     công, giữ vỏ bọc), nhiệm vụ 3+ thì Thất bại (phải thắng); riêng
//     nhiệm vụ cần 2 Thất bại (nhiệm vụ 4, ván 7+) mà chỉ có mình là
//     gián điệp thì Chờ — 1 Thất bại không đủ làm nhiệm vụ thất bại,
//     chỉ tổ lộ mình.
// - Lật bài xong: bot bấm Tiếp theo.
import { TEAM_SIZES, actors } from './engine.js?v=1';

/* simplenet gọi bot(s, pid, p) với p là object người chơi (có .level),
   còn test gọi botAction(s, pid, 'easy'|'hard') — chuẩn hoá cả hai */
function normLevel(x) {
  if (typeof x === 'string') return x === 'hard' ? 'hard' : 'easy';
  if (x && typeof x === 'object') return x.level === 'hard' ? 'hard' : 'easy';
  return 'easy';
}
const rnd = n => Math.floor(Math.random() * n);
function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); const t = r[i]; r[i] = r[j]; r[j] = t; }
  return r;
}
const mySide = (s, pid) => (s.prog[pid] || {}).side;
const spiesOf = (s, pid) => s.players.filter(p => (s.prog[p.id] || {}).side === 'spy').map(p => p.id);
/* những người từng ở ít nhất 1 nhiệm vụ thất bại (đáng nghi) */
function suspects(s) {
  const bad = new Set();
  for (const h of s.history) if (h.result === 'fail') for (const t of h.team) bad.add(t);
  return bad;
}
/* những người từng ở nhiệm vụ thành công (đáng tin) */
function trusted(s) {
  const good = new Set();
  for (const h of s.history) if (h.result === 'success') for (const t of h.team) good.add(t);
  return good;
}

/* ---- Thủ lĩnh đề cử đội ---- */
function botPropose(s, pid, level) {
  const size = TEAM_SIZES[s.players.length][s.mission - 1];
  const others = s.players.map(p => p.id);
  if (level === 'easy') {
    /* Dễ: chọn ngẫu nhiên, nhưng tránh người từng ở nhiệm vụ thất bại
       khi còn đủ người (trí nhớ cơ bản); thường tự cho mình vào đội. */
    const bad = suspects(s);
    const clean = shuffle(others.filter(id => id !== pid && !bad.has(id)));
    const dirty = shuffle(others.filter(id => id !== pid && bad.has(id)));
    const team = [pid];
    for (const id of [...clean, ...dirty]) {
      if (team.length >= size) break;
      team.push(id);
    }
    return { type: 'propose', team: team.slice(0, size) };
  }
  /* Khó: ưu tiên người đáng tin; gián điệp nhét thêm đồng đội */
  const good = trusted(s);
  const bad = suspects(s);
  const side = mySide(s, pid);
  const pool = shuffle(others.filter(id => id !== pid));
  pool.sort((a, b) => {
    const sa = good.has(a) ? 0 : (bad.has(a) ? 2 : 1);
    const sb = good.has(b) ? 0 : (bad.has(b) ? 2 : 1);
    return sa - sb;
  });
  const team = [pid];
  if (side === 'spy') {
    const mate = spiesOf(s, pid).find(id => id !== pid);
    if (mate) team.push(mate);
  }
  for (const id of pool) {
    if (team.length >= size) break;
    if (!team.includes(id)) team.push(id);
  }
  return { type: 'propose', team: team.slice(0, size) };
}

/* ---- Bỏ phiếu Đồng ý / Từ chối ---- */
function botVote(s, pid, level) {
  const team = (s.proposal && s.proposal.team) || [];
  if (level === 'easy') {
    /* Dễ: vẫn ngẫu nhiên, nhưng có trí nhớ cơ bản — đội có người từng
       ở nhiệm vụ thất bại thì thường từ chối, không thì thường đồng ý;
       càng nhiều lần từ chối liên tiếp thì càng dễ Đồng ý (không để
       ván kết thúc vì 5 lần từ chối — bản trước không có van này nên
       22–24/30 ván Dễ ở 7–10 người kết thúc vì từ chối liên tiếp). */
    const bad = suspects(s);
    const hasSuspect = team.some(t => bad.has(t));
    let p = hasSuspect ? 0.35 : 0.75;
    const rj = s.rejects || 0;
    if (rj >= 3) p = Math.min(0.9, p + (rj - 2) * 0.2);
    return { type: 'vote', choice: Math.random() < p ? 'approve' : 'reject' };
  }
  const side = mySide(s, pid);
  /* sắp đủ 5 lần từ chối → luôn Đồng ý để không thua vì từ chối */
  if ((s.rejects || 0) >= 4) return { type: 'vote', choice: 'approve' };
  if (side === 'resistance') {
    const bad = suspects(s);
    const hasSuspect = team.some(t => bad.has(t));
    return { type: 'vote', choice: hasSuspect ? 'reject' : 'approve' };
  }
  /* gián điệp: Đồng ý nếu đội có gián điệp, không thì Từ chối */
  const mine = new Set(spiesOf(s, pid));
  const hasSpy = team.some(t => mine.has(t));
  return { type: 'vote', choice: hasSpy ? 'approve' : 'reject' };
}

/* ---- Trong nhiệm vụ: Thành công / Thất bại ---- */
function botMission(s, pid, level) {
  const side = mySide(s, pid);
  if (side === 'resistance') return { type: 'action', choice: 'success' };
  if (level === 'easy') {
    return { type: 'action', choice: Math.random() < 0.5 ? 'fail' : 'success' };
  }
  const team = (s.current && s.current.team) || [];
  const mates = spiesOf(s, pid).filter(id => id !== pid && team.includes(id));
  const need = (s.current && s.current.failsNeeded) || 1;
  if (mates.length > 0) return { type: 'action', choice: 'fail' };
  if (need === 2) return { type: 'action', choice: 'success' }; /* 1 Thất bại không đủ — giữ vỏ bọc */
  if ((s.mission || 1) <= 2) return { type: 'action', choice: 'success' }; /* nhiệm vụ đầu: giữ vỏ bọc */
  return { type: 'action', choice: 'fail' }; /* nhiệm vụ 3+: phải thắng */
}

/* hành động tiếp theo của 1 bot */
export function botAction(s, pid, level = 'easy') {
  if (s.phase !== 'playing') return null;
  const lv = normLevel(level);
  if (s.stage === 'propose') {
    if ((s.players[s.leaderIdx] || {}).id !== pid) return null;
    return botPropose(s, pid, lv);
  }
  if (s.stage === 'vote') {
    if (!s.proposal || (pid in s.proposal.votes)) return null;
    return botVote(s, pid, lv);
  }
  if (s.stage === 'mission') {
    if (!s.current || !s.current.team.includes(pid)) return null;
    if (pid in s.current.actions) return null;
    return botMission(s, pid, lv);
  }
  if (s.stage === 'reveal') return { type: 'next' };
  return null;
}

export { actors };
export default botAction;
