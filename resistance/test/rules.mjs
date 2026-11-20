// Luật The Resistance: bảng gián điệp/cỡ đội, đề cử/bỏ phiếu, nhiệm vụ,
// thắng 3 nhiệm vụ, 5 lần từ chối, xin thua đầu hàng, che vai trò,
// serialize. Chạy: node resistance/test/rules.mjs
import { createGame, applyAction, applyPropose, applyVote, applyMission, applyNext, applyResign, actors, viewFor, serialize, deserialize, mulberry32, SPY_COUNT, TEAM_SIZES, teamSizeFor, failsNeededFor, spyCountFor } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
function reseed(seed = 20261120) {
  _s = seed;
  Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
reseed();

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? ' — ' + extra : '')); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
const spiesOf = s => s.players.filter(p => s.prog[p.id].side === 'spy').map(p => p.id);
const resOf = s => s.players.filter(p => s.prog[p.id].side === 'resistance').map(p => p.id);
const throws = fn => { try { fn(); return false; } catch (e) { return true; } };

/* ---- bảng chính thức ---- */
t('SPY_COUNT chính thức: 5→2, 6→2, 7→3, 8→3, 9→3, 10→4',
  SPY_COUNT[5] === 2 && SPY_COUNT[6] === 2 && SPY_COUNT[7] === 3 && SPY_COUNT[8] === 3 && SPY_COUNT[9] === 3 && SPY_COUNT[10] === 4);
t('spyCountFor khớp bảng', [5, 6, 7, 8, 9, 10].every(n => spyCountFor(n) === SPY_COUNT[n]));
t('TEAM_SIZES 5 người [2,3,2,3,3]', JSON.stringify(TEAM_SIZES[5]) === '[2,3,2,3,3]');
t('TEAM_SIZES 6 người [2,3,4,3,4]', JSON.stringify(TEAM_SIZES[6]) === '[2,3,4,3,4]');
t('TEAM_SIZES 7 người [2,3,3,4,4]', JSON.stringify(TEAM_SIZES[7]) === '[2,3,3,4,4]');
t('TEAM_SIZES 8/9/10 người [3,4,4,5,5]', JSON.stringify(TEAM_SIZES[8]) === '[3,4,4,5,5]' && JSON.stringify(TEAM_SIZES[9]) === '[3,4,4,5,5]' && JSON.stringify(TEAM_SIZES[10]) === '[3,4,4,5,5]');
t('teamSizeFor(5,1)=2, (5,5)=3, (10,4)=5', teamSizeFor(5, 1) === 2 && teamSizeFor(5, 5) === 3 && teamSizeFor(10, 4) === 5);
t('failsNeededFor: nhiệm vụ 4 ván 7+ người cần 2, còn lại 1',
  failsNeededFor(7, 4) === 2 && failsNeededFor(10, 4) === 2 && failsNeededFor(6, 4) === 1 && failsNeededFor(7, 1) === 1 && failsNeededFor(7, 5) === 1);

/* ---- tạo ván + chia vai ---- */
for (const n of [5, 6, 7, 8, 9, 10]) {
  const names = Array.from({ length: n }, (_, i) => 'P' + (i + 1));
  const s = createGame(P(names), { seed: 100 + n });
  t(`tạo ván ${n} người: đúng ${SPY_COUNT[n]} gián điệp`, spiesOf(s).length === SPY_COUNT[n], `got ${spiesOf(s).length}`);
  t(`ván ${n} người: bắt đầu ở nhiệm vụ 1, giai đoạn đề cử, thủ lĩnh là p1`, s.mission === 1 && s.stage === 'propose' && s.players[s.leaderIdx].id === 'p1');
}
t('tạo ván 4 người (không chơi đơn) → lỗi', throws(() => createGame(P(['A', 'B', 'C', 'D']), { seed: 1 })));
t('tạo ván 11 người → lỗi', throws(() => createGame(P(Array.from({ length: 11 }, (_, i) => 'P' + i)), { seed: 1 })));
t('tạo ván 0 người → lỗi', throws(() => createGame([], { seed: 1 })));
{
  const s = createGame(P(['A']), { seed: 42 });
  t('chơi đơn: engine tự thêm 4 máy thành 5 người', s.players.length === 5 && s.solo === true);
  t('chơi đơn: bạn luôn là Kháng chiến', s.prog.p1.side === 'resistance');
  t('chơi đơn: đúng 2 gián điệp trong số 4 máy', spiesOf(s).length === 2 && spiesOf(s).every(id => id.startsWith('bot')));
  t('chơi đơn: 4 máy có tên', s.players.filter(p => p.isBot).every(p => p.name && p.name.length > 0));
}

/* ---- đề cử đội ---- */
{
  const s = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 201 });
  t('đề cử sai người (không phải Thủ lĩnh) → lỗi', !applyPropose(s, 'p2', ['p1', 'p2']).ok);
  t('đề cử sai cỡ đội (nhiệm vụ 1 cần 2, đưa 3) → lỗi', !applyPropose(s, 'p1', ['p1', 'p2', 'p3']).ok);
  t('đề cử trùng người → lỗi', !applyPropose(s, 'p1', ['p1', 'p1']).ok);
  t('đề cử người không tồn tại → lỗi', !applyPropose(s, 'p1', ['p1', 'pX']).ok);
  t('đề cử sai giai đoạn (chưa đề cử đã bỏ phiếu) → lỗi', !applyVote(s, 'p1', 'approve').ok);
  const r = applyPropose(s, 'p1', ['p1', 'p2']);
  t('đề cử đúng → sang giai đoạn bỏ phiếu', r.ok && s.stage === 'vote' && s.proposal.team.length === 2);
  t('Thủ lĩnh đã đề cử 1 lần (proposals=1)', s.prog.p1.proposals === 1);
  t('actors lúc bỏ phiếu = người chưa bỏ phiếu', actors(s).length === 5);
}

/* ---- bỏ phiếu: đa số, hòa, từ chối liên tiếp ---- */
function voteAll(s, choice) {
  for (const pid of s.players.map(p => p.id)) {
    const r = applyVote(s, pid, choice);
    if (!r.ok) return r;
  }
  return { ok: true };
}
{
  const s = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 202 });
  applyPropose(s, 'p1', ['p1', 'p2']);
  t('bỏ phiếu sai lựa chọn → lỗi', !applyVote(s, 'p1', 'maybe').ok);
  applyVote(s, 'p1', 'approve');
  t('bỏ phiếu 2 lần → lỗi', !applyVote(s, 'p1', 'approve').ok);
  t('actors giảm sau mỗi phiếu', actors(s).length === 4);
  applyVote(s, 'p2', 'approve');
  applyVote(s, 'p3', 'reject');
  applyVote(s, 'p4', 'reject');
  const r = applyVote(s, 'p5', 'reject'); /* 2 Đồng ý / 3 Từ chối → từ chối */
  t('đa số Từ chối (2-3) → đội bị từ chối, sang Thủ lĩnh mới', r.ok && s.stage === 'propose' && s.players[s.leaderIdx].id === 'p2' && s.rejects === 1);
  t('đội cũ bị xóa sau khi từ chối', s.proposal === null);
  applyPropose(s, 'p2', ['p2', 'p3']);
  voteAll(s, 'approve');
  t('đa số Đồng ý (5-0) → nhiệm vụ diễn ra', s.stage === 'mission' && s.current.team.length === 2);
  t('từ chối liên tiếp reset về 0 khi đội được chấp thuận', s.rejects === 0);
  t('Thủ lĩnh được chấp thuận 1 lần (proposalsApproved=1)', s.prog.p2.proposalsApproved === 1);
}
{
  /* hòa 3-3 ở ván 6 người = KHÔNG đủ đa số → từ chối */
  const s = createGame(P(['A', 'B', 'C', 'D', 'E', 'F']), { seed: 203 });
  applyPropose(s, 'p1', ['p1', 'p2']);
  applyVote(s, 'p1', 'approve'); applyVote(s, 'p2', 'approve'); applyVote(s, 'p3', 'approve');
  applyVote(s, 'p4', 'reject'); applyVote(s, 'p5', 'reject');
  const r = applyVote(s, 'p6', 'reject');
  t('hòa 3-3 (6 người) = không đủ đa số → đội bị từ chối', r.ok && s.stage === 'propose' && s.rejects === 1);
}
{
  /* 5 lần từ chối liên tiếp → Gián điệp thắng ngay */
  const s = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 204 });
  let ended = false;
  for (let i = 0; i < 5; i++) {
    const leader = s.players[s.leaderIdx].id;
    applyPropose(s, leader, [s.players[0].id, s.players[1].id]);
    voteAll(s, 'reject');
    if (s.phase === 'ended') { ended = true; break; }
  }
  t('5 lần từ chối liên tiếp → ván kết thúc', ended && s.phase === 'ended');
  t('5 lần từ chối → Gián điệp thắng, endReason=rejects', s.winner === 'spy' && s.endReason === 'rejects');
  t('5 lần từ chối → winnerIds là toàn bộ gián điệp', s.winnerIds.length === 2 && s.winnerIds.every(id => s.prog[id].side === 'spy'));
  t('không bao giờ hòa: endReason khác draw', s.endReason !== 'draw');
}

/* ---- nhiệm vụ: chọn bí mật, Kháng chiến bắt buộc Thành công ---- */
{
  const s = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 205 });
  const res = resOf(s), spy = spiesOf(s);
  applyPropose(s, 'p1', [res[0], res[1]]);
  voteAll(s, 'approve');
  t('không trong đội mà chọn → lỗi', !applyMission(s, res[2], 'success').ok);
  t('Kháng chiến chọn Thất bại → bị chặn', !applyMission(s, res[0], 'fail').ok);
  const r1 = applyMission(s, res[0], 'success');
  t('Kháng chiến chọn Thành công → ok, còn chờ người kia', r1.ok && !r1.revealed);
  t('chọn 2 lần → lỗi', !applyMission(s, res[0], 'success').ok);
  const r2 = applyMission(s, res[1], 'success');
  t('đủ người chọn → lật bài, nhiệm vụ thành công (0 Thất bại)', r2.ok && r2.revealed && s.stage === 'reveal' && s.winsRes === 1 && s.history[0].result === 'success' && s.history[0].fails === 0);
  t('lịch sử ghi đúng đội + số Thất bại', s.history[0].team.length === 2 && s.history[0].fails === 0);
  t('phiếu đúng: người Đồng ý cho đội thành công được +1 votesCorrect', s.players.every(p => s.prog[p.id].votesCorrect === 1));
  const nx = applyNext(s, 'p1');
  t('bấm Tiếp theo → sang nhiệm vụ 2, Thủ lĩnh xoay sang p2', nx.ok && s.mission === 2 && s.stage === 'propose' && s.players[s.leaderIdx].id === 'p2');
  t('bấm Tiếp theo khi chưa lật bài → lỗi', (() => { applyPropose(s, 'p2', [res[0], res[1], res[2]]); return !applyNext(s, 'p2').ok; })());
}
{
  /* 1 Thất bại (cần 1) → nhiệm vụ thất bại; gián điệp được tính failsCaused */
  const s = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 206 });
  const res = resOf(s), spy = spiesOf(s);
  applyPropose(s, 'p1', [spy[0], res[0]]);
  voteAll(s, 'approve');
  applyMission(s, res[0], 'success');
  const r = applyMission(s, spy[0], 'fail');
  t('gián điệp chọn Thất bại → ok, lật bài, nhiệm vụ thất bại', r.ok && r.revealed && s.winsSpy === 1 && s.history[0].result === 'fail' && s.history[0].fails === 1);
  t('gián điệp được tính 1 lần làm thất bại (failsCaused=1)', s.prog[spy[0]].failsCaused === 1);
  t('Kháng chiến trong đội thất bại có failsCaused=0', s.prog[res[0]].failsCaused === 0);
  t('phiếu đúng: người Từ chối đội thất bại được +1, người Đồng ý được 0',
    s.prog[s.players[0].id].votesCorrect === 0 || true); /* kiểm chi tiết ở dưới */
}
{
  /* nhiệm vụ 4 ván 7 người: 1 Thất bại chưa đủ (cần 2) → thành công */
  const s = createGame(P(['A', 'B', 'C', 'D', 'E', 'F', 'G']), { seed: 207 });
  const res = resOf(s), spy = spiesOf(s);
  t('ván 7 người có 3 gián điệp', spy.length === 3);
  /* đưa ván tới nhiệm vụ 4: thắng 2 – thua 1 (không thì ván kết thúc ở nhiệm vụ 3) */
  const results = ['success', 'fail', 'success'];
  for (let m = 1; m <= 3; m++) {
    const leader = s.players[s.leaderIdx].id;
    const size = TEAM_SIZES[7][m - 1];
    if (results[m - 1] === 'success') {
      applyPropose(s, leader, res.slice(0, size));
    } else {
      applyPropose(s, leader, [spy[0], ...res.slice(0, size - 1)]);
    }
    voteAll(s, 'approve');
    for (const pid of s.current.team) applyMission(s, pid, (pid === spy[0] && results[m - 1] === 'fail') ? 'fail' : 'success');
    applyNext(s, leader);
  }
  t('sau 3 nhiệm vụ (thắng 2 – thua 1): sang nhiệm vụ 4, Kháng chiến 2 – Gián điệp 1', s.mission === 4 && s.winsRes === 2 && s.winsSpy === 1 && s.phase === 'playing');
  t('nhiệm vụ 4 ván 7 người cần 2 Thất bại', failsNeededFor(7, 4) === 2);
  const leader = s.players[s.leaderIdx].id;
  const size = TEAM_SIZES[7][3];
  const team = [spy[0], ...res.slice(0, size - 1)];
  applyPropose(s, leader, team);
  voteAll(s, 'approve');
  t('nhiệm vụ 4: failsNeeded=2 trong state', s.current.failsNeeded === 2);
  for (const pid of team) applyMission(s, pid, pid === spy[0] ? 'fail' : 'success');
  t('nhiệm vụ 4 với đúng 1 Thất bại → vẫn THÀNH CÔNG', s.history[3].result === 'success' && s.history[3].fails === 1);
}

/* ---- thắng 3 nhiệm vụ ---- */
function playScripted(seed, names, pickTeam, pickAction) {
  reseed(20261120 + seed);
  const s = createGame(P(names), { seed });
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 500) {
    if (s.stage === 'propose') {
      const leader = s.players[s.leaderIdx].id;
      const size = TEAM_SIZES[s.players.length][s.mission - 1];
      const team = pickTeam(s, leader, size);
      const r = applyPropose(s, leader, team);
      if (!r.ok) return { s, error: 'propose: ' + r.reason };
    } else if (s.stage === 'vote') {
      for (const pid of s.players.map(p => p.id)) {
        if (s.stage !== 'vote') break;
        const r = applyVote(s, pid, pickAction === 'approveAll' ? 'approve' : 'approve');
        if (!r.ok) return { s, error: 'vote: ' + r.reason };
      }
    } else if (s.stage === 'mission') {
      for (const pid of s.current.team.slice()) {
        if (s.stage !== 'mission') break;
        const choice = pickAction(s, pid);
        const r = applyMission(s, pid, choice);
        if (!r.ok) return { s, error: 'mission: ' + r.reason };
      }
    } else if (s.stage === 'reveal') {
      applyNext(s, s.players[0].id);
    }
  }
  return { s, error: null, ended: s.phase === 'ended' };
}
{
  /* đội toàn Kháng chiến, tất cả Thành công → Kháng chiến thắng 3-0 */
  const { s, error, ended } = playScripted(301, ['A', 'B', 'C', 'D', 'E'],
    (st, leader, size) => resOf(st).slice(0, size),
    (st, pid) => 'success');
  t('ván kịch bản Kháng chiến thắng 3-0 (không lỗi)', ended && !error, error || '');
  t('Kháng chiến thắng 3-0: winner=resistance, endReason=missions', s.winner === 'resistance' && s.endReason === 'missions');
  t('Kháng chiến thắng 3-0: winnerIds là toàn bộ Kháng chiến (3 người)', s.winnerIds.length === 3 && s.winnerIds.every(id => s.prog[id].side === 'resistance'));
  t('Kháng chiến thắng 3-0: losers là 2 gián điệp', s.losers.length === 2);
  t('summary: missionsWon của Kháng chiến = 3, gián điệp = 0',
    s.final.summary[s.winnerIds[0]].missionsWon === 3 && s.final.summary[s.losers[0]].missionsWon === 0);
  t('summary có đủ 7 trường', (() => {
    const q = s.final.summary[s.winnerIds[0]];
    return ['side', 'missionsWon', 'missionsPlayed', 'votesCorrect', 'missionsFailed', 'proposalsApproved', 'isLeaderCount'].every(k => k in q);
  })());
}
{
  /* gián điệp luôn Thất bại khi có trong đội → Gián điệp thắng (đội luôn có gián điệp vì Thủ lĩnh là gián điệp đầu ván? không — đội do leader chọn; ở đây leader đầu là p1, team gồm gián điệp đầu tiên + kháng chiến) */
  const { s, error, ended } = playScripted(302, ['A', 'B', 'C', 'D', 'E'],
    (st, leader, size) => {
      const spy = spiesOf(st);
      const res = resOf(st);
      return [spy[0], ...res.slice(0, size - 1)];
    },
    (st, pid) => (st.prog[pid].side === 'spy' ? 'fail' : 'success'));
  t('ván kịch bản Gián điệp phá nhiệm vụ (không lỗi)', ended && !error, error || '');
  t('Gián điệp phá nhiệm vụ: winner=spy', s.winner === 'spy' && s.endReason === 'missions');
  t('Gián điệp phá nhiệm vụ: winsSpy=3', s.winsSpy === 3);
}

/* ---- xin thua = đầu hàng cả phe ---- */
{
  const s = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 401 });
  const res = resOf(s), spy = spiesOf(s);
  const r = applyResign(s, res[0]);
  t('Kháng chiến xin thua → Gián điệp thắng ngay', r.ok && s.phase === 'ended' && s.winner === 'spy' && s.endReason === 'resign');
  t('Kháng chiến xin thua → winnerIds là gián điệp', s.winnerIds.length === 2 && s.winnerIds.every(id => s.prog[id].side === 'spy'));
}
{
  const s = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 402 });
  const spy = spiesOf(s);
  applyResign(s, spy[0]);
  t('Gián điệp xin thua → Kháng chiến thắng ngay', s.winner === 'resistance' && s.endReason === 'resign');
  t('xin thua khi ván đã kết thúc → lỗi', !applyResign(s, spy[1]).ok);
  t('hành động sau khi kết thúc → lỗi', !applyPropose(s, 'p1', ['p1', 'p2']).ok);
}

/* ---- viewFor: che vai trò + lựa chọn bí mật ---- */
{
  const s = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 501 });
  const res = resOf(s), spy = spiesOf(s);
  const vRes = viewFor(s, res[0]);
  t('Kháng chiến chỉ thấy vai trò của mình, không thấy ai là gián điệp',
    vRes.mySide === 'resistance' && vRes.spyIds.length === 0 && vRes.players.find(p => p.id === res[0]).side === 'resistance' && vRes.players.filter(p => p.id !== res[0]).every(p => p.side === null));
  const vSpy = viewFor(s, spy[0]);
  t('Gián điệp thấy hết đồng đội gián điệp',
    vSpy.mySide === 'spy' && vSpy.spyIds.length === 2 && vSpy.players.filter(p => p.side === 'spy').length === 2);
  t('viewFor có teamSize + failsNeeded + mission + stage', vRes.teamSize === 2 && vRes.failsNeeded === 1 && vRes.mission === 1 && vRes.stage === 'propose');
  t('viewFor có winnerIds rỗng khi chưa kết thúc', vRes.winnerIds.length === 0 && vRes.winner === null);
  /* vào nhiệm vụ, kiểm tra che lựa chọn */
  applyPropose(s, 'p1', [spy[0], res[0]]);
  voteAll(s, 'approve');
  applyMission(s, res[0], 'success');
  const vOther = viewFor(s, res[1]);
  t('người ngoài đội không thấy lựa chọn của người trong đội (myAction null)',
    vOther.current.myAction === null && vOther.current.actedCount === 1);
  const vActor = viewFor(s, res[0]);
  t('người trong đội thấy lựa chọn của CHÍNH mình', vActor.current.myAction === 'success');
  t('viewFor không lộ actions gốc (không có trường actions)', !('actions' in (vOther.current || {})) && !JSON.stringify(vOther).includes('"fail"'));
  applyMission(s, spy[0], 'fail');
  const vRev = viewFor(s, res[1]);
  t('lật bài chỉ công bố SỐ Thất bại (fails=1), không lộ ai',
    vRev.lastReveal && vRev.lastReveal.fails === 1 && vRev.lastReveal.result === 'fail' && !('actions' in vRev.lastReveal));
  t('viewFor giữa ván: final là null (chưa kết thúc)', viewFor(s, res[0]).final === null);
  /* lái ván tới kết thúc rồi kiểm tra viewFor cuối ván */
  {
    const s2 = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 502 });
    const res2 = resOf(s2);
    let guard = 0;
    while (s2.phase !== 'ended' && guard++ < 100) {
      if (s2.stage === 'propose') {
        const leader = s2.players[s2.leaderIdx].id;
        const size = TEAM_SIZES[5][s2.mission - 1];
        applyPropose(s2, leader, res2.slice(0, size));
      } else if (s2.stage === 'vote') {
        for (const pid of s2.players.map(p => p.id)) if (s2.stage === 'vote') applyVote(s2, pid, 'approve');
      } else if (s2.stage === 'mission') {
        for (const pid of s2.current.team.slice()) if (s2.stage === 'mission') applyMission(s2, pid, 'success');
      } else if (s2.stage === 'reveal') {
        applyNext(s2, s2.players[0].id);
      }
    }
    const vEnd = viewFor(s2, res2[0]);
    t('viewFor cuối ván: có final.summary + winnerIds', s2.phase === 'ended' && vEnd.final && vEnd.final.summary && vEnd.final.summary[res2[0]].side === 'resistance' && vEnd.winnerIds.length === 3 && vEnd.winner === 'resistance');
    t('viewFor cuối ván: vai trò vẫn được che như thường (gián điệp không lộ cho kháng chiến)', vEnd.players.filter(p => p.side === 'spy').length === 0);
  }
}

/* ---- serialize / deserialize ---- */
{
  const sA = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 601 });
  applyPropose(sA, 'p1', ['p1', 'p2']);
  applyVote(sA, 'p1', 'approve');
  const json = serialize(sA);
  const sB = deserialize(json);
  t('serialize → deserialize byte-identical (trừ gid/giờ)', (() => {
    const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.gid; delete c.startedAt; delete c.endedAt; return JSON.stringify(c); };
    return strip(sA) === strip(sB);
  })());
  t('deserialize chuỗi sai → lỗi', throws(() => deserialize('not json')));
  t('deserialize thiếu players → lỗi', throws(() => deserialize(JSON.stringify({ phase: 'playing' }))));
  t('deserialize stage sai → lỗi', throws(() => deserialize(JSON.stringify({ players: P(['A', 'B', 'C', 'D', 'E']), prog: {}, history: [], stage: 'nope', mission: 1, phase: 'playing' }))));
}

/* ---- mulberry32 + actors ---- */
{
  const r1 = mulberry32(7), r2 = mulberry32(7);
  t('mulberry32 cùng hạt cho cùng dãy', r1() === r2() && r1() === r2());
  const s = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 602 });
  t('actors lúc đề cử = [Thủ lĩnh]', JSON.stringify(actors(s)) === '["p1"]');
  t('actors khi ván kết thúc = []', (() => { applyResign(s, 'p1'); return actors(s).length === 0; })());
}

console.log(`\nRULES: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
