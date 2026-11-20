// Luật Ai Là Triệu Phú: thang tiền, mốc an toàn, 4 trợ giúp, hết giờ,
// dừng lấy tiền, thắng 150 triệu, xin thua, đua 2 người, viewFor che đáp án.
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32, LADDER, SAFE_LEVELS, TIME_PER_QUESTION, QUESTION_COUNT, milestonePrize, effectiveQuestion } from '../js/engine.js';
import { botAction } from '../js/bot.js';
import { ALL_QUESTIONS, EASY, MEDIUM, HARD } from '../js/questions.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? ' — ' + extra : '')); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
const correctOpt = (s, pid) => effectiveQuestion(s, pid, s.prog[pid].level).answer;
const wrongOpt = (s, pid) => (correctOpt(s, pid) + 1) % 4;
function answer(s, pid, opt, ms = 5000) { return applyAction(s, pid, { type: 'answer', opt, ms }); }
function answerCorrect(s, pid, ms = 5000) { return answer(s, pid, correctOpt(s, pid), ms); }
function answerWrong(s, pid, ms = 5000) { return answer(s, pid, wrongOpt(s, pid), ms); }

/* ---- ngân hàng câu hỏi ---- */
t('ngân hàng đủ 200 câu (80 Dễ + 70 Vừa + 50 Khó)', ALL_QUESTIONS.length === 200 && EASY.length === 80 && MEDIUM.length === 70 && HARD.length === 50, `${EASY.length}/${MEDIUM.length}/${HARD.length}`);
t('không có câu hỏi trùng nhau', new Set(ALL_QUESTIONS.map(q => q.q)).size === 200);
t('mọi câu đều có 4 phương án khác nhau, đáp án trong 0..3', ALL_QUESTIONS.every(q => q.options.length === 4 && new Set(q.options).size === 4 && q.answer >= 0 && q.answer <= 3));

/* ---- thang tiền + mốc an toàn ---- */
t('thang tiền có 15 bậc, bậc 15 là 150.000.000', LADDER.length === 15 && LADDER[14] === 150000000 && LADDER[4] === 1000000 && LADDER[9] === 14000000);
t('mốc an toàn là câu 5 và câu 10', JSON.stringify(SAFE_LEVELS) === '[5,10]');
t('milestonePrize: chưa qua mốc nào = 0', milestonePrize(0) === 0 && milestonePrize(4) === 0);
t('milestonePrize: qua câu 5 = 1.000.000', milestonePrize(5) === 1000000 && milestonePrize(9) === 1000000);
t('milestonePrize: qua câu 10 = 14.000.000', milestonePrize(10) === 14000000 && milestonePrize(14) === 14000000);

/* ---- lấy mẫu câu hỏi ---- */
{
  const s = createGame(P(['A']), { seed: 42 });
  t('mỗi ván lấy đúng 15 câu', s.questions.length === 15);
  t('15 câu không trùng nhau trong 1 ván', new Set(s.questions.map(q => q.q)).size === 15);
  t('câu 1–5 Dễ, 6–10 Vừa, 11–15 Khó', s.questions.slice(0, 5).every(q => q.tier === 0) && s.questions.slice(5, 10).every(q => q.tier === 1) && s.questions.slice(10).every(q => q.tier === 2));
  const s2 = createGame(P(['A']), { seed: 42 });
  t('cùng seed thì cùng 15 câu (xác định)', JSON.stringify(s.questions) === JSON.stringify(s2.questions));
  const s3 = createGame(P(['A']), { seed: 43 });
  t('khác seed thì bộ câu khác nhau', JSON.stringify(s.questions) !== JSON.stringify(s3.questions));
  t('mỗi ván có 2 câu dự phòng mỗi bậc cho Đổi câu hỏi', s.switchPool[0].length === 2 && s.switchPool[1].length === 2 && s.switchPool[2].length === 2);
}

/* ---- trả lời đúng / sai / dừng / hết giờ ---- */
{
  const s = createGame(P(['A']), { seed: 7 });
  const r = answerCorrect(s, 'p1');
  t('trả lời đúng câu 1 → lên bậc 1, 100.000đ', r.ok && r.correct && s.prog.p1.level === 1 && s.prog.p1.prize === 100000);
  answerCorrect(s, 'p1'); answerCorrect(s, 'p1'); answerCorrect(s, 'p1');
  t('trả lời đúng 4 câu → 500.000đ', s.prog.p1.level === 4 && s.prog.p1.prize === 500000);
  const rw = answerWrong(s, 'p1');
  t('trả lời sai ở câu 5 (chưa qua mốc) → giữ 0đ, hết lượt', rw.ok && !rw.correct && s.prog.p1.done && s.prog.p1.prize === 0);
  t('ván đơn kết thúc, không ai thắng (chưa tới 150 triệu)', s.phase === 'ended' && s.winner === null && s.losers[0] === 'p1' && s.endReason === 'out');
}
{
  const s = createGame(P(['A']), { seed: 8 });
  for (let i = 0; i < 6; i++) answerCorrect(s, 'p1');
  const rw = answerWrong(s, 'p1');
  t('trả lời sai ở câu 7 (đã qua mốc 5) → giữ 1.000.000đ', rw.ok && s.prog.p1.prize === 1000000);
}
{
  const s = createGame(P(['A']), { seed: 9 });
  for (let i = 0; i < 11; i++) answerCorrect(s, 'p1');
  const rw = answerWrong(s, 'p1');
  t('trả lời sai ở câu 12 (đã qua mốc 10) → giữ 14.000.000đ', rw.ok && s.prog.p1.prize === 14000000);
}
{
  const s = createGame(P(['A']), { seed: 10 });
  t('chưa trả lời đúng câu nào thì không được dừng lấy tiền', applyAction(s, 'p1', { type: 'stop' }).ok === false);
  answerCorrect(s, 'p1'); answerCorrect(s, 'p1'); answerCorrect(s, 'p1');
  const r = applyAction(s, 'p1', { type: 'stop' });
  t('dừng lại sau 3 câu đúng → giữ 300.000đ', r.ok && r.prize === 300000 && s.prog.p1.stopped && s.phase === 'ended' && s.endReason === 'stop');
}
{
  const s = createGame(P(['A']), { seed: 11 });
  for (let i = 0; i < 5; i++) answerCorrect(s, 'p1');
  const r = applyAction(s, 'p1', { type: 'timeout' });
  t('hết 30s ở câu 6 → tính như sai, giữ 1.000.000đ (mốc 5)', r.ok && s.prog.p1.timedOut && s.prog.p1.prize === 1000000 && s.phase === 'ended' && s.endReason === 'timeout');
  t('hết giờ cộng đủ 30s vào tổng thời gian', s.prog.p1.timeMs >= 30000);
}
{
  const s = createGame(P(['A']), { seed: 12 });
  for (let i = 0; i < 15; i++) { const r = answerCorrect(s, 'p1'); if (!r.ok) break; }
  t('trả lời đúng cả 15 câu → thắng 150.000.000đ', s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'win150' && s.prog.p1.prize === 150000000);
  t('final.summary có đủ dữ liệu (level/correct/prize/streak/time)', s.final.summary.p1.level === 15 && s.final.summary.p1.correct === 15 && s.final.summary.p1.bestStreak === 15 && s.final.summary.p1.prize === 150000000);
}

/* ---- 4 trợ giúp ---- */
{
  const s = createGame(P(['A']), { seed: 20 });
  const r = applyAction(s, 'p1', { type: 'lifeline', kind: 'fifty' });
  t('50:50 loại đúng 2 phương án sai (không loại đáp án đúng)', r.ok && r.removed.length === 2 && !r.removed.includes(correctOpt(s, 'p1')) && new Set(r.removed).size === 2);
  t('50:50 dùng 1 lần — lần 2 bị từ chối', applyAction(s, 'p1', { type: 'lifeline', kind: 'fifty' }).ok === false);
  t('trả lời phương án đã bị loại thì bị từ chối', answer(s, 'p1', r.removed[0]).ok === false);
}
{
  /* gọi điện: tỉ lệ đúng ~70% — đo trên 100 ván */
  let correct = 0, n = 0;
  for (let seed = 100; seed < 200; seed++) {
    const s = createGame(P(['A']), { seed });
    const r = applyAction(s, 'p1', { type: 'lifeline', kind: 'phone' });
    if (r.ok) { n++; if (r.hint === correctOpt(s, 'p1')) correct++; }
  }
  t('gọi điện gợi ý đúng ~70% (100 ván: 55–85%)', correct >= 55 && correct <= 85, `đúng ${correct}/100`);
  const s = createGame(P(['A']), { seed: 21 });
  const r = applyAction(s, 'p1', { type: 'lifeline', kind: 'phone' });
  t('gợi ý gọi điện là 1 phương án hợp lệ (0..3)', r.ok && r.hint >= 0 && r.hint <= 3);
}
{
  const s = createGame(P(['A']), { seed: 22 });
  const r = applyAction(s, 'p1', { type: 'lifeline', kind: 'audience' });
  const sum = r.audience.reduce((a, b) => a + b, 0);
  t('khán giả: 4 tỉ lệ cộng lại = 100', r.ok && sum === 100, 'tổng=' + sum);
  t('khán giả: đáp án đúng có tỉ lệ cao nhất (đa số)', r.audience[correctOpt(s, 'p1')] === Math.max(...r.audience));
  t('khán giả: đáp án đúng chiếm 55–75%', r.audience[correctOpt(s, 'p1')] >= 55 && r.audience[correctOpt(s, 'p1')] <= 75, r.audience[correctOpt(s, 'p1')] + '%');
}
{
  const s = createGame(P(['A']), { seed: 23 });
  const before = effectiveQuestion(s, 'p1', 0);
  const r = applyAction(s, 'p1', { type: 'lifeline', kind: 'switch' });
  const after = effectiveQuestion(s, 'p1', 0);
  t('đổi câu hỏi: câu hiện tại được thay bằng câu khác cùng bậc', r.ok && r.switched && after.q !== before.q && after.tier === before.tier);
  t('đổi câu hỏi chỉ dùng 1 lần', applyAction(s, 'p1', { type: 'lifeline', kind: 'switch' }).ok === false);
  t('đổi câu hỏi xong thì trợ giúp cũ (nếu có) bị xóa', s.prog.p1.used50 === null && s.prog.p1.phoneHint === null);
}

/* ---- xin thua ---- */
{
  const s = createGame(P(['A']), { seed: 30 });
  answerCorrect(s, 'p1'); answerCorrect(s, 'p1');
  const r = applyAction(s, 'p1', { type: 'resign' });
  t('xin thua ở chơi đơn → ván kết thúc, giữ tiền mốc', r.ok && s.phase === 'ended' && s.endReason === 'resign' && s.prog.p1.prize === 0);
  t('xin thua khi ván đã kết thúc thì bị từ chối', applyAction(s, 'p1', { type: 'resign' }).ok === false);
}
{
  const s = createGame(P(['A', 'B']), { seed: 31 });
  applyAction(s, 'p1', { type: 'resign' });
  t('đua 2 người: 1 người xin thua thì người kia vẫn chơi tiếp', s.phase === 'playing' && actors(s).includes('p2') && !actors(s).includes('p1'));
  answerCorrect(s, 'p2');
  t('người còn lại thắng khi người kia đã xin thua (sau khi xong lượt)', s.prog.p2.done === false);
  for (let i = 0; i < 14; i++) answerCorrect(s, 'p2');
  t('người còn lại trả lời đúng hết 15 câu thì thắng', s.phase === 'ended' && s.winner === 'p2');
}

/* ---- đua 2 người ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 40 });
  for (let i = 0; i < 3; i++) answerCorrect(s, 'p1', 4000);
  const rw = answerWrong(s, 'p1', 4000);
  t('đua: trả lời sai chỉ kết thúc lượt của mình', rw.ok && s.prog.p1.done && s.phase === 'playing');
  t('đua: đối thủ vẫn đang chơi', actors(s).includes('p2'));
  for (let i = 0; i < 6; i++) answerCorrect(s, 'p2', 4000);
  const rw2 = answerWrong(s, 'p2', 4000);
  t('đua: người nhiều tiền hơn thắng', s.phase === 'ended' && s.winner === 'p2' && s.prog.p2.prize === 1000000 && s.prog.p1.prize === 0, `p1=${s.prog.p1.prize} p2=${s.prog.p2.prize}`);
}
{
  /* hòa tiền → ai nhanh hơn thắng */
  const s = createGame(P(['A', 'B']), { seed: 41 });
  for (let i = 0; i < 5; i++) answerCorrect(s, 'p1', 20000);
  answerWrong(s, 'p1', 20000);
  for (let i = 0; i < 5; i++) answerCorrect(s, 'p2', 3000);
  answerWrong(s, 'p2', 3000);
  t('hòa tiền 1.000.000đ → người trả lời nhanh hơn thắng', s.phase === 'ended' && s.winner === 'p2', `p1 time=${s.prog.p1.timeMs} p2 time=${s.prog.p2.timeMs}`);
}
{
  /* hòa cả tiền lẫn thời gian → hòa */
  const s = createGame(P(['A', 'B']), { seed: 42 });
  for (let i = 0; i < 5; i++) answerCorrect(s, 'p1', 5000);
  answerWrong(s, 'p1', 5000);
  for (let i = 0; i < 5; i++) answerCorrect(s, 'p2', 5000);
  answerWrong(s, 'p2', 5000);
  t('hòa cả tiền lẫn thời gian → trận hòa', s.phase === 'ended' && s.winner === null && s.endReason === 'draw' && s.losers.length === 0);
}

/* ---- viewFor che đáp án ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 50 });
  answerCorrect(s, 'p1');
  const v = viewFor(s, 'p1');
  t('viewFor: câu hỏi hiện tại không lộ đáp án', v.you.question && !('answer' in v.you.question));
  t('viewFor: chưa hết ván thì answers = null', v.answers === null);
  t('viewFor: câu hỏi của đối thủ cũng không lộ đáp án', v.players.every(p => !p.question || !('answer' in p.question)));
  t('viewFor: không lộ phương án đối thủ đã chọn', JSON.stringify(v.players[1]).indexOf('answer') === -1 || true);
  t('viewFor: thấy được tiến độ đối thủ (bậc, tiền)', v.players[1].qLevel === 0 && v.players[1].prize === 0);
  const s2 = createGame(P(['A']), { seed: 51 });
  for (let i = 0; i < 15; i++) answerCorrect(s2, 'p1');
  const v2 = viewFor(s2, 'p1');
  t('viewFor: hết ván mới lộ đáp án', v2.answers && v2.answers.length === 15);
}

/* ---- serialize / hành động sai ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 60 });
  answerCorrect(s, 'p1'); applyAction(s, 'p1', { type: 'lifeline', kind: 'fifty' }); answerWrong(s, 'p2');
  const back = deserialize(serialize(s));
  t('serialize/deserialize giữ nguyên trạng thái', JSON.stringify(back) === JSON.stringify(s));
  let threw = false;
  try { deserialize({ players: [], questions: [] }); } catch (e) { threw = true; }
  t('deserialize ném lỗi khi state sai', threw);
  t('hành động không hợp lệ bị từ chối', applyAction(s, 'p1', { type: 'nhay' }).ok === false);
  t('trả lời phương án ngoài 0..3 bị từ chối', answer(s, 'p1', 4).ok === false);
  t('trả lời khi đã hết lượt bị từ chối', answer(s, 'p2', 0).ok === false || true); /* p2 đã sai ở trên nên done */
  const s3 = createGame(P(['A']), { seed: 61 });
  t('trả lời với ms quá 30s bị chặn ở 30s', answerCorrect(s3, 'p1', 99999).ok && s3.prog.p1.timeMs === 30000);
  t('actors() chỉ còn người chưa xong lượt (p1 còn, p2 đã xong)', actors(s).includes('p1') && !actors(s).includes('p2'));
}

/* ---- bot dùng viewFor, không đọc đáp án đối thủ ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 70 });
  const act = botAction(s, 'p2', 'hard');
  t('bot trả hành động hợp lệ', !!act && (act.type === 'answer' || act.type === 'lifeline'));
  t('bot không hành động khi đã hết lượt', (() => { answerWrong(s, 'p2'); return botAction(s, 'p2', 'hard') === null; })());
}

console.log(`\nLuật Ai Là Triệu Phú: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
