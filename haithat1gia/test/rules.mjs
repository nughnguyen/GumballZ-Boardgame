// Luật 2 Thật 1 Giả: nộp bộ, đoán, lật bài, tính điểm, 3 vòng, chơi đơn,
// hết giờ, xin thua, viewFor che câu giả, serialize, hành động sai.
import { createGame, applyAction, actors, viewFor, serialize, deserialize, ROUNDS, SOLO_SETS, SOLO_WIN_CORRECT, POINTS_CORRECT, POINTS_FOOL } from '../js/engine.js';
import { botAction } from '../js/bot.js';
import { SETS } from '../js/statements.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
function reseed() {
  _s = 20261120;
  Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
reseed();

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? ' — ' + extra : '')); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

/* chơi 1 ván nhiều người tới cùng bằng bot (mọi người đều là bot) — áp
   1 action rồi lấy lại actors (vì 'next' đổi stage, danh sách cũ hết hạn) */
function playMatch(seed, names, levels) {
  reseed();
  const s = createGame(P(names), { seed });
  const lv = {};
  names.forEach((_, i) => { lv['p' + (i + 1)] = levels[i]; });
  let guard = 0, illegal = 0, stuck = 0, actions = 0;
  while (s.phase !== 'ended' && guard++ < 500) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    const pid = act[0];
    const a = botAction(s, pid, lv[pid]);
    if (!a) { stuck++; break; }
    const r = applyAction(s, pid, a);
    if (!r.ok) { illegal++; break; }
    actions++;
  }
  return { s, illegal, stuck, actions, ended: s.phase === 'ended' };
}

/* chơi 1 ván đơn bằng bot — áp 1 action rồi lấy lại actors */
function playSolo(seed, level) {
  reseed();
  const s = createGame(P(['A']), { seed });
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase !== 'ended' && guard++ < 100) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    const pid = act[0];
    const a = botAction(s, pid, level);
    if (!a) { stuck++; break; }
    const r = applyAction(s, pid, a);
    if (!r.ok) { illegal++; break; }
  }
  return { s, illegal, stuck, ended: s.phase === 'ended' };
}

/* ---- ngân hàng câu ---- */
t('ngân hàng có ≥ 60 bộ', SETS.length >= 60, 'có ' + SETS.length + ' bộ');
t('mọi bộ có đúng 3 câu khác nhau, lie 0..2, có topic', SETS.every(x =>
  Array.isArray(x.statements) && x.statements.length === 3
  && new Set(x.statements).size === 3
  && x.statements.every(y => typeof y === 'string' && y.trim().length > 0)
  && Number.isInteger(x.lie) && x.lie >= 0 && x.lie <= 2
  && typeof x.topic === 'string' && x.topic.length > 0));
t('không có bộ trùng nhau', new Set(SETS.map(x => x.statements.join('|'))).size === SETS.length);

/* ---- tạo ván ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 1 });
  t('tạo ván 2 người: stage submit, vòng 1, người kể là p1', s.stage === 'submit' && s.round === 1 && s.players[0].id === 'p1' && !s.solo);
  t('actors lúc submit chỉ có người kể', JSON.stringify(actors(s)) === JSON.stringify(['p1']));
  const s1 = createGame(P(['A']), { seed: 1 });
  t('tạo ván đơn: stage guess, 10 bộ', s1.solo && s1.stage === 'guess' && s1.soloSet && s1.soloSet.index === 0);
  let threw = false;
  try { createGame([], { seed: 1 }); } catch (e) { threw = true; }
  t('tạo ván 0 người bị từ chối', threw);
  threw = false;
  try { createGame(P(['A', 'B', 'C', 'D', 'E', 'F', 'G']), { seed: 1 }); } catch (e) { threw = true; }
  t('tạo ván 7 người bị từ chối', threw);
}

/* ---- nộp bộ: kiểm tra đầu vào ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 2 });
  t('người không phải người kể không nộp được', !applyAction(s, 'p2', { type: 'submit', statements: ['a', 'b', 'c'], lie: 1 }).ok);
  t('nộp thiếu 3 câu bị từ chối', !applyAction(s, 'p1', { type: 'submit', statements: ['a', 'b'], lie: 0 }).ok);
  t('nộp câu trống bị từ chối', !applyAction(s, 'p1', { type: 'submit', statements: ['a', '', 'c'], lie: 0 }).ok);
  t('nộp 3 câu trùng nhau bị từ chối', !applyAction(s, 'p1', { type: 'submit', statements: ['a', 'a', 'a'], lie: 0 }).ok);
  t('nộp lie ngoài 0..2 bị từ chối', !applyAction(s, 'p1', { type: 'submit', statements: ['a', 'b', 'c'], lie: 5 }).ok);
  const r = applyAction(s, 'p1', { type: 'submit', statements: ['Tôi thích ăn phở.', 'Tôi biết bơi.', 'Tôi từng leo Fansipan.'], lie: 2 });
  t('nộp bộ hợp lệ được chấp nhận, sang stage guess', r.ok && s.stage === 'guess' && s.current.lie === 2 && s.current.source === 'custom');
  t('actors lúc guess là 2 người còn lại', JSON.stringify(actors(s).sort()) === JSON.stringify(['p2', 'p3']));
  t('người kể không được đoán bộ của mình', !applyAction(s, 'p1', { type: 'guess', idx: 0 }).ok);
  t('đoán ngoài 0..2 bị từ chối', !applyAction(s, 'p2', { type: 'guess', idx: 9 }).ok);
}

/* ---- lấy bộ có sẵn ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 3 });
  const r = applyAction(s, 'p1', { type: 'draw' });
  t('lấy bộ có sẵn được, source bank', r.ok && s.stage === 'guess' && s.current.source === 'bank' && s.current.statements.length === 3);
  t('2 ván cùng seed lấy cùng bộ đầu tiên', (() => {
    const a = createGame(P(['A', 'B']), { seed: 3 });
    const b = createGame(P(['A', 'B']), { seed: 3 });
    applyAction(a, 'p1', { type: 'draw' });
    applyAction(b, 'p1', { type: 'draw' });
    return JSON.stringify(a.current.statements) === JSON.stringify(b.current.statements);
  })());
}

/* ---- đoán + lật bài + tính điểm ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 4 });
  applyAction(s, 'p1', { type: 'submit', statements: ['Tôi thích ăn phở.', 'Tôi biết bơi.', 'Tôi từng leo Fansipan.'], lie: 2 });
  const r1 = applyAction(s, 'p2', { type: 'guess', idx: 2 });
  t('đoán đúng câu giả được chấp nhận', r1.ok);
  t('đoán 1 lần rồi không đoán lại được', !applyAction(s, 'p2', { type: 'guess', idx: 0 }).ok);
  t('chưa đủ người đoán thì chưa lật bài', s.stage === 'guess' && !s.current.revealed);
  applyAction(s, 'p3', { type: 'guess', idx: 0 });
  t('đủ người đoán thì tự lật bài, stage reveal', s.stage === 'reveal' && s.current.revealed);
  t('người đoán đúng +10 điểm', s.prog.p2.points === POINTS_CORRECT && s.prog.p2.correctGuesses === 1);
  t('người kể +5 cho mỗi người đoán sai (1 người sai)', s.prog.p1.points === POINTS_FOOL && s.prog.p1.fooled === 1);
  t('người đoán sai 0 điểm', s.prog.p3.points === 0 && s.prog.p3.correctGuesses === 0);
  t('người kể đã kể 1 bộ', s.prog.p1.setsPresented === 1);
  const r2 = applyAction(s, 'p2', { type: 'next' });
  t('bấm Tiếp tục sang người kể sau (p2)', r2.ok && s.stage === 'submit' && s.presenterIdx === 1);
}

/* ---- hết giờ đoán ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 5 });
  applyAction(s, 'p1', { type: 'submit', statements: ['a1', 'b1', 'c1'], lie: 0 });
  applyAction(s, 'p2', { type: 'timeout' });
  t('hết giờ: 0 điểm, totalGuesses không tăng', s.prog.p2.points === 0 && s.prog.p2.totalGuesses === 0);
  applyAction(s, 'p3', { type: 'guess', idx: 1 }); /* p3 đoán sai → người kể +5 */
  t('hết giờ không tính là bị lừa (người kể chỉ +5 cho người đoán sai, không cộng người hết giờ)', s.prog.p1.points === POINTS_FOOL && s.prog.p1.fooled === 1);
  t('hết giờ rồi không đoán lại được', !applyAction(s, 'p2', { type: 'guess', idx: 0 }).ok);
}

/* ---- 3 vòng × mọi người kể, hết ván ---- */
{
  const m = playMatch(10, ['A', 'B', 'C'], ['easy', 'easy', 'easy']);
  t('ván 3 người chơi tới cùng, 0 kẹt, 0 sai luật', m.ended && !m.stuck && !m.illegal, `ended=${m.ended} stuck=${m.stuck} illegal=${m.illegal} actions=${m.actions}`);
  t('hết ván ở vòng 3, endReason done', m.s.round === 4 || (m.s.phase === 'ended' && m.s.endReason === 'done'));
  t('mỗi người đã kể đúng 3 bộ', ['p1', 'p2', 'p3'].every(pid => m.s.prog[pid].setsPresented === ROUNDS));
  t('mỗi người đã đoán 6 lần (2 người × 3 vòng)', ['p1', 'p2', 'p3'].every(pid => m.s.prog[pid].totalGuesses === 6));
  t('có người thắng hoặc hòa', m.s.winner !== undefined && (m.s.winner || m.s.endReason === 'done'));
  t('final.summary đủ 8 trường cho mọi người', ['p1', 'p2', 'p3'].every(pid => {
    const sum = m.s.final.summary[pid];
    return sum && ['points', 'correctGuesses', 'totalGuesses', 'fooled', 'maxFooled', 'caughtSets', 'setsPresented', 'bestStreak'].every(k => typeof sum[k] === 'number');
  }));
}

/* ---- chơi đơn: 10 bộ, thắng từ 8 đúng ---- */
{
  const m = playSolo(20, 'easy');
  t('ván đơn chơi tới cùng, 0 kẹt, 0 sai luật', m.ended && !m.stuck && !m.illegal, `ended=${m.ended} stuck=${m.stuck} illegal=${m.illegal}`);
  t('ván đơn đoán đúng 10 lần', m.s.prog.p1.totalGuesses === SOLO_SETS, 'totalGuesses=' + m.s.prog.p1.totalGuesses);
  t('ván đơn: thắng ⟺ đoán đúng ≥ 8', (m.s.winner === 'p1') === (m.s.prog.p1.correctGuesses >= SOLO_WIN_CORRECT), `winner=${m.s.winner} correct=${m.s.prog.p1.correctGuesses}`);
  const s = createGame(P(['A']), { seed: 21 });
  t('chơi đơn không nộp bộ được', !applyAction(s, 'p1', { type: 'submit', statements: ['a', 'b', 'c'], lie: 0 }).ok);
  t('chơi đơn không lấy bộ có sẵn được', !applyAction(s, 'p1', { type: 'draw' }).ok);
  const s2 = createGame(P(['A']), { seed: 22 });
  const lie = s2.soloSet.lie;
  const r = applyAction(s2, 'p1', { type: 'guess', idx: lie });
  t('chơi đơn đoán đúng câu giả +10, sang reveal', r.ok && r.correct === true && s2.stage === 'reveal' && s2.prog.p1.points === POINTS_CORRECT);
  t('chơi đơn đoán xong không đoán lại được', !applyAction(s2, 'p1', { type: 'guess', idx: 0 }).ok);
  const r2 = applyAction(s2, 'p1', { type: 'next' });
  t('chơi đơn bấm Tiếp tục sang bộ 2', r2.ok && s2.stage === 'guess' && s2.soloSet.index === 1);
  const s3 = createGame(P(['A']), { seed: 23 });
  const wrong = [0, 1, 2].find(i => i !== s3.soloSet.lie);
  const r3 = applyAction(s3, 'p1', { type: 'guess', idx: wrong });
  t('chơi đơn đoán sai 0 điểm, streak reset', r3.ok && r3.correct === false && s3.prog.p1.points === 0 && s3.prog.p1.streak === 0);
}

/* ---- xin thua ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 30 });
  const r = applyAction(s, 'p1', { type: 'resign' });
  t('2 người: xin thua thì ván kết thúc, người còn lại thắng', r.ok && s.phase === 'ended' && s.winner === 'p2' && s.endReason === 'resign');
  const s2 = createGame(P(['A', 'B', 'C']), { seed: 31 });
  applyAction(s2, 'p1', { type: 'resign' });
  t('3 người: 1 người xin thua thì ván vẫn tiếp tục', s2.phase === 'playing');
  t('3 người: người xin thua bị bỏ qua khi xoay lượt kể', (() => {
    /* p1 xin thua lúc đang kể → sang p2 kể */
    return s2.stage === 'submit' && s2.presenterIdx === 1;
  })());
  const s3 = createGame(P(['A']), { seed: 32 });
  const r3 = applyAction(s3, 'p1', { type: 'resign' });
  t('chơi đơn xin thua: winner null, losers có mình, endReason resign', r3.ok && s3.phase === 'ended' && s3.winner === null && s3.losers.includes('p1') && s3.endReason === 'resign');
  t('ván đã kết thúc thì mọi hành động đều bị từ chối', !applyAction(s3, 'p1', { type: 'guess', idx: 0 }).ok && !applyAction(s3, 'p1', { type: 'resign' }).ok);
}

/* ---- viewFor che câu giả + che bộ chưa kể ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 40 });
  applyAction(s, 'p1', { type: 'submit', statements: ['Tôi thích ăn phở.', 'Tôi biết bơi.', 'Tôi từng leo Fansipan.'], lie: 2 });
  const vB = viewFor(s, 'p2');
  t('người đoán không thấy câu giả (lie null)', vB.current && vB.current.lie === null);
  t('người đoán thấy đủ 3 câu', vB.current && vB.current.statements.length === 3);
  t('người đoán không thấy lựa chọn đoán của người khác trước khi lật bài', vB.current && vB.current.guesses === null);
  const vA = viewFor(s, 'p1');
  t('người kể thấy câu giả của mình', vA.current && vA.current.lie === 2);
  applyAction(s, 'p2', { type: 'guess', idx: 1 });
  const vC = viewFor(s, 'p3');
  t('người chưa đoán thấy số người đã đoán (1/2), không thấy ai đoán gì', vC.current && vC.current.respondedCount === 1 && vC.current.guesses === null);
  applyAction(s, 'p3', { type: 'guess', idx: 2 });
  const vB2 = viewFor(s, 'p2');
  t('sau khi lật bài mọi người thấy câu giả + lựa chọn của nhau', vB2.current && vB2.current.lie === 2 && vB2.current.guesses && vB2.current.guesses.p2 === 1 && vB2.current.guesses.p3 === 2);
  const s1 = createGame(P(['A']), { seed: 41 });
  const v1 = viewFor(s1, 'p1');
  t('chơi đơn: view không lộ câu giả trước khi đoán', v1.soloSet && v1.soloSet.lie === null);
  applyAction(s1, 'p1', { type: 'guess', idx: 0 });
  const v12 = viewFor(s1, 'p1');
  t('chơi đơn: sau khi đoán thì lộ câu giả', v12.soloSet && v12.soloSet.lie != null);
}

/* ---- serialize / deserialize ---- */
{
  const a = createGame(P(['A', 'B', 'C']), { seed: 50 });
  applyAction(a, 'p1', { type: 'submit', statements: ['a1', 'b1', 'c1'], lie: 1 });
  applyAction(a, 'p2', { type: 'guess', idx: 1 });
  const json = serialize(a);
  const b = deserialize(json);
  t('deserialize giữ nguyên state (JSON giống hệt)', JSON.stringify(b) === JSON.stringify(a));
  t('chơi tiếp từ state deserialize vẫn đồng bộ', (() => {
    const a2 = JSON.parse(JSON.stringify(a));
    const b2 = JSON.parse(JSON.stringify(b));
    applyAction(a2, 'p3', { type: 'guess', idx: 0 });
    applyAction(b2, 'p3', { type: 'guess', idx: 0 });
    return JSON.stringify(a2) === JSON.stringify(b2);
  })());
  let threw = false;
  try { deserialize('{"players":[]}'); } catch (e) { threw = true; }
  t('deserialize state rác bị từ chối', threw);
}

/* ---- hành động sai ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 60 });
  t('action không có type bị từ chối', !applyAction(s, 'p1', {}).ok);
  t('action type lạ bị từ chối', !applyAction(s, 'p1', { type: 'bay' }).ok);
  t('người không có trong ván bị từ chối', !applyAction(s, 'p9', { type: 'draw' }).ok);
  t('đoán khi chưa có bộ để đoán bị từ chối', !applyAction(s, 'p2', { type: 'guess', idx: 0 }).ok);
  t('bấm Tiếp tục khi chưa lật bài bị từ chối', !applyAction(s, 'p1', { type: 'next' }).ok);
}

console.log(`\nLuật 2 Thật 1 Giả: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
