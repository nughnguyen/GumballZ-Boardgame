// 🤖 Bot Avalon — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Thủ lĩnh bot: Merlin né người mình biết là Ác; bot Ác nhét 1 phe mình vào
// đội để phá; người không biết gì thì chọn đội theo mức tin cậy (người đã
// chắc Thiện → người sạch → tối đa 1 ứng viên Merlin → nghi phạm).
// Suy luận: nghi phạm = từng ở đội bị phá; người chắc Thiện = từng ở đội
// thành công; điểm bỏ phiếu (bác đội bẩn/duyệt đội sạch → giống Merlin).
// Percival không bao giờ đưa cả 2 ứng viên Merlin vào cùng 1 đội.
// Bỏ phiếu: Thiện bác đội dính Ác đã biết; đội có ≥2 nghi phạm thì bác khi
// còn đủ người đáng tin để lập đội khác. Merlin Khó thỉnh thoảng duyệt đội
// bẩn để "hòa vào đám đông" (40%) — nếu không Sát thủ đọc được mình ngay.
// Nhiệm vụ: Thiện luôn thành công; Ác Khó chỉ phá khi đủ Ác trong đội để
// hỏng nhiệm vụ, thỉnh thoảng (15%) bỏ qua để "nằm vùng".
// Sát thủ Khó đoán Merlin theo dấu vết bỏ phiếu, nhưng 30% đoán bừa —
// người chơi thật cũng không theo dõi hết mọi lá phiếu.
import { ROLE_INFO } from './engine.js';

const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

function knownEvilIds(s, me) {
  const evil = s.players.filter(p => p.side === 'evil');
  if (me.role === 'merlin') return new Set(evil.filter(p => p.role !== 'mordred').map(p => p.id));
  if (me.side === 'evil' && me.role !== 'oberon') return new Set(evil.filter(p => p.id !== me.id && p.role !== 'oberon').map(p => p.id));
  return new Set();
}
function evilOnTeam(s, team) {
  return team.filter(id => { const p = s.players.find(x => x.id === id); return p && p.side === 'evil'; });
}

/* Người chơi bị nghi là Ác: từng ở trong đội của nhiệm vụ bị phá hỏng
   (trừ bản thân). Chỉ dùng kiến thức đúng vai, không nhìn trộm phe thật.
   Lưu ý: Percival thấy Merlin + Morgana nhưng KHÔNG biết ai là ai — cả 2
   đều không được coi là "biết chắc Thiện" (1 trong 2 là Morgana, phe Ác). */
function suspects(s, pid) {
  const sus = new Set();
  for (const q of s.quests) {
    if (q.result === 'fail') for (const id of q.team) {
      if (id !== pid) sus.add(id);
    }
  }
  return sus;
}

/* Cặp ứng viên Merlin mà Percival thấy (1 Thiện — Merlin, 1 Ác — Morgana).
   Đội chứa cả 2 ứng viên chắc chắn chứa Morgana, nên không bao giờ đưa cả
   2 vào cùng 1 đội trừ khi không còn cách nào khác. */
function merlinCandidates(s, me) {
  if (me.role !== 'percival') return new Set();
  return new Set(s.players.filter(p => p.role === 'merlin' || p.role === 'morgana').map(p => p.id));
}

/* Người đã chắc Thiện: từng ở trong đội của nhiệm vụ THÀNH CÔNG. (Ác Khó
   phá mọi nhiệm vụ phá được, nên nhiệm vụ thành công gần như chắc chắn toàn
   Thiện — trừ nhiệm vụ cần 2 lần thất bại mà chỉ có 1 Ác trong đội.) */
function confirmedGood(s) {
  const cg = new Set();
  for (const q of s.quests) {
    if (q.result === 'success') for (const id of q.team) cg.add(id);
  }
  return cg;
}

/* Điểm tin cậy từ lịch sử bỏ phiếu: bác đội sau này bị phá / duyệt đội sau
   này thành công → có vẻ Thiện; ngược lại → đáng ngờ. Merlin (biết Ác) nên
   có điểm cao nhất theo thời gian. */
function voteScore(s) {
  const score = {};
  for (const p of s.players) score[p.id] = 0;
  for (const q of s.quests) {
    if (!q.votes || !q.result) continue;
    for (const [vid, yes] of Object.entries(q.votes)) {
      if (!(vid in score)) continue;
      if (q.result === 'fail') score[vid] += yes ? -1 : 1;
      else score[vid] += yes ? 1 : -1;
    }
  }
  return score;
}

function pickTeam(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const size = s.questSizes[s.questNo];
  const ids = s.players.map(p => p.id);
  const hard = level === 'hard';
  if (!hard && Math.random() < 0.3) return { type: 'propose', team: shuffle(ids).slice(0, size) };
  const knownEvil = knownEvilIds(s, me);
  const evilIds = ids.filter(id => knownEvil.has(id) || (me.side === 'evil' && s.players.find(p => p.id === id).side === 'evil' && id !== me.id));
  let team = [];
  if (me.side === 'evil') {
    /* Ác: nhét đúng 1 phe mình vào đội (tốt nhất là chính mình), còn lại toàn Thiện */
    team.push(me.id);
    const goodPool = shuffle(ids.filter(id => id !== me.id && !evilIds.includes(id) && s.players.find(p => p.id === id).side === 'good'));
    while (team.length < size && goodPool.length) team.push(goodPool.pop());
    const rest = shuffle(ids.filter(id => !team.includes(id)));
    while (team.length < size && rest.length) team.push(rest.pop());
  } else {
    /* Thiện: xếp người theo mức tin cậy rồi lấy từ cao xuống thấp —
       1. người đã chắc Thiện (đội nhiệm vụ thành công) + mình,
       2. người sạch chưa bị nghi,
       3. tối đa 1 ứng viên Merlin (Percival: 1 trong 2 là Ác),
       4. nghi phạm từng ở đội bị phá (điểm bỏ phiếu cao trước),
       5. ứng viên Merlin còn lại. Người Dễ chọn bừa có thiên vị.
       Trong mỗi nhóm, điểm bỏ phiếu cao (giống Merlin) được ưu tiên. */
    const sus = hard ? suspects(s, pid) : new Set();
    const cand = hard ? merlinCandidates(s, me) : new Set();
    const cg = hard ? confirmedGood(s) : new Set();
    const vs = hard ? voteScore(s) : {};
    const byScore = list => shuffle(list).sort((a, b) => (vs[b] || 0) - (vs[a] || 0));
    const confirmed = byScore(ids.filter(id => cg.has(id) && !knownEvil.has(id)));
    const clean = byScore(ids.filter(id => !knownEvil.has(id) && !sus.has(id) && !cand.has(id) && !cg.has(id)));
    const candList = byScore(ids.filter(id => cand.has(id)));
    const susList = byScore(ids.filter(id => sus.has(id) && !knownEvil.has(id)));
    const team = [];
    const take = list => { for (const id of list) { if (team.length < size && !team.includes(id)) team.push(id); } };
    take([me.id]); take(confirmed); take(clean);
    if (team.length < size && candList.length) take([candList[0]]); /* tối đa 1 ứng viên */
    take(susList); take(candList.slice(1));
    const rest = shuffle(ids.filter(id => !team.includes(id)));
    while (team.length < size && rest.length) team.push(rest.pop());
    return { type: 'propose', team: shuffle(team).slice(0, size) };
  }
  return { type: 'propose', team: shuffle(team).slice(0, size) };
}

function pickVote(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const hard = level === 'hard';
  if (!hard && Math.random() < 0.4) return { type: 'vote', approve: Math.random() < 0.6 };
  const team = (s.proposal || {}).team || [];
  const knownEvil = knownEvilIds(s, me);
  const sus = (hard && me.side === 'good') ? suspects(s, pid) : new Set();
  const cand = (hard && me.side === 'good') ? merlinCandidates(s, me) : new Set();
  const bothCand = cand.size === 2 && team.filter(id => cand.has(id)).length === 2;
  const dirty = team.some(id => knownEvil.has(id)) || bothCand;
  if (me.side === 'good') {
    /* Merlin Khó thỉnh thoảng "hòa vào đám đông": duyệt cả đội bẩn để Sát
       thủ khỏi đọc được mình qua dấu vết bỏ phiếu (40%, không làm ở nhiệm
       vụ cuối — lúc đó mỗi nhiệm vụ đều quyết định). */
    if (hard && me.role === 'merlin' && dirty && s.questNo < 4 && Math.random() < 0.4) {
      return { type: 'vote', approve: true };
    }
    /* Bác đội dính Ác đã biết (hoặc chứa cả 2 ứng viên Merlin — chắc chắn
       có Morgana). Đội có 1 nghi phạm thì vẫn duyệt — ở bàn đông người,
       đội nào cũng phải dính 1 nghi phạm, bác mãi chỉ thua vì 5 lần bác.
       Chỉ bác khi đội có ≥2 nghi phạm mà còn đủ người đáng tin để lập
       đội khác. */
    const size = s.questSizes[s.questNo];
    const trusted = s.players.filter(p =>
      !knownEvil.has(p.id) && !sus.has(p.id) && !cand.has(p.id)).length;
    const susCount = team.filter(id => sus.has(id)).length;
    return { type: 'vote', approve: !dirty && !(susCount >= 2 && trusted >= size) };
  }
  /* Ác: đội có phe mình thì duyệt (để phá), đội toàn Thiện thì bác (câu giờ) */
  const hasEvil = evilOnTeam(s, team).length > 0;
  return { type: 'vote', approve: hasEvil };
}

function pickQuest(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  if (me.side === 'good') return { type: 'quest', choice: 'success' };
  const q = s.quests[s.questNo];
  const team = q.team;
  const nEvil = evilOnTeam(s, team).length;
  if (level !== 'hard') return { type: 'quest', choice: Math.random() < 0.5 ? 'fail' : 'success' };
  /* Khó: chỉ phá khi đủ Ác trong đội để hỏng nhiệm vụ; 1 mình ở nhiệm vụ
     cần 2 lần thất bại thì phá cũng vô ích mà còn lộ mặt. Thỉnh thoảng
     (15%) bỏ qua dù phá được — "nằm vùng" để được tin ở nhiệm vụ sau. */
  const useful = nEvil >= q.failsNeeded;
  if (!useful) return { type: 'quest', choice: 'success' };
  return { type: 'quest', choice: Math.random() < 0.15 ? 'success' : 'fail' };
}

function pickAssassin(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const good = s.players.filter(p => p.side === 'good');
  if (!good.length) return null;
  if (level !== 'hard') return { type: 'assassin', target: rnd(good).id };
  /* Khó: Merlin hay bác đội dính Ác và duyệt đội sạch — chấm điểm theo dấu vết bỏ phiếu */
  const knownEvil = new Set(s.players.filter(p => p.side === 'evil' && p.role !== 'oberon').map(p => p.id));
  const score = {};
  for (const p of good) score[p.id] = 0;
  for (const q of s.quests) {
    if (!q.votes || !q.team) continue;
    const dirty = q.team.some(id => knownEvil.has(id));
    for (const [vid, yes] of Object.entries(q.votes)) {
      if (!(vid in score)) continue;
      if (dirty && !yes) score[vid] += 1; /* bác đội dính Ác: giống Merlin */
      if (!dirty && yes) score[vid] += 1; /* duyệt đội sạch: giống Merlin */
      if (dirty && yes) score[vid] -= 1;
    }
  }
  let best = -1e9, cands = [];
  for (const [id, sc] of Object.entries(score)) {
    if (sc > best) { best = sc; cands = [id]; }
    else if (sc === best) cands.push(id);
  }
  /* Sát thủ không phải máy đọc suy nghĩ: 30% đoán bừa trong số phe Thiện
     (người chơi thật cũng không theo dõi hết mọi lá phiếu) — nếu không,
     Merlin nào bỏ phiếu chuẩn cũng bị bắt gần như chắc chắn. */
  if (Math.random() < 0.3) return { type: 'assassin', target: rnd(good).id };
  return { type: 'assassin', target: rnd(cands) };
}

/* Bot hành động 1 lượt theo pha hiện tại. */
export function botAction(s, pid, p) {
  if (!s || s.phase === 'ended') return null;
  const me = s.players.find(pp => pp.id === pid);
  if (!me) return null;
  const level = (p && p.level) || 'easy';
  if (s.phase === 'propose') {
    if (s.players[s.leader].id !== pid) return null;
    return pickTeam(s, pid, level);
  }
  if (s.phase === 'vote') {
    if (pid in s.votes) return null;
    return pickVote(s, pid, level);
  }
  if (s.phase === 'quest') {
    const q = s.quests[s.questNo];
    if (!q.team.includes(pid) || pid in s.questPicks) return null;
    return pickQuest(s, pid, level);
  }
  if (s.phase === 'assassin') {
    if (me.role !== 'assassin') return null;
    return pickAssassin(s, pid, level);
  }
  return null;
}
export { pickTeam, pickVote, pickQuest, pickAssassin };
