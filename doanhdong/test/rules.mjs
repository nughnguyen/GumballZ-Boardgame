// Luật Đoán Hành Động: chuẩn hoá lượt đoán, tính điểm, hết giờ, bỏ qua,
// 3 vòng, chơi đơn, xin thua, viewFor che từ bí mật, serialize, hành động sai.
import { createGame, applyAction, actors, viewFor, serialize, deserialize, normalizeGuess, ROUNDS, SOLO_SETS, SOLO_WIN_CORRECT, GUESS_TIME, MAX_SKIPS } from '../js/engine.js';
import { WORDS, CATS } from '../js/words.js';
import { botAction } from '../js/bot.js';

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
   1 action rồi lấy lại actors (vì 'next' đổi stage, danh sách cũ hết hạn).
   Khi bot không còn hành động nào (mọi lượt đoán đã bị chấm sai) thì
   gửi 'timeout' thay vì tính là kẹt. */
function playMatch(seed, names, levels) {
  reseed();
  const s = createGame(P(names), { seed });
  const lv = {};
  names.forEach((_, i) => { lv['p' + (i + 1)] = levels[i]; });
  let guard = 0, illegal = 0, stuck = 0, actions = 0;
  while (s.phase !== 'ended' && guard++ < 2000) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    const pid = act[0];
    let a = botAction(s, pid, lv[pid]);
    if (!a) {
      if (s.stage === 'guess') a = { type: 'timeout' };
      else { stuck++; break; }
    }
    const r = applyAction(s, pid, a);
    if (!r.ok) { illegal++; break; }
    actions++;
  }
  return { s, illegal, stuck, actions, ended: s.phase === 'ended' };
}

/* chơi 1 ván đơn: bot chọn đúng với xác suất theo level */
function playSolo(seed, level, forceCorrect = null) {
  reseed();
  const s = createGame(P(['A']), { seed });
  let guard = 0, illegal = 0, stuck = 0;
  while (s.phase !== 'ended' && guard++ < 100) {
    if (s.stage === 'guess') {
      const set = s.soloSet;
      let idx;
      if (forceCorrect != null) {
        /* forceCorrect = số từ đúng đầu tiên, còn lại chọn sai */
        const done = set.index;
        idx = done < forceCorrect ? set.correctIdx : (set.correctIdx + 1) % 4;
      } else {
        const hit = Math.random() < (level === 'hard' ? 0.65 : 0.35);
        idx = hit ? set.correctIdx : (set.correctIdx + 1 + Math.floor(Math.random() * 3)) % 4;
      }
      const r = applyAction(s, 'p1', { type: 'guess', idx });
      if (!r.ok) { illegal++; break; }
    } else if (s.stage === 'reveal') {
      const r = applyAction(s, 'p1', { type: 'next' });
      if (!r.ok) { illegal++; break; }
    } else { stuck++; break; }
  }
  return { s, illegal, stuck, ended: s.phase === 'ended' };
}

/* ---- ngân hàng từ ---- */
t('ngân hàng có ≥ 150 từ', WORDS.length >= 150, 'có ' + WORDS.length + ' từ');
t('đủ 6 chủ đề, mỗi chủ đề 25 từ', CATS.length === 6 && CATS.every(c => WORDS.filter(w => w.cat === c).length === 25), CATS.join(', '));
t('mọi từ có word/cat/act là chuỗi không rỗng', WORDS.every(w =>
  typeof w.word === 'string' && w.word.trim().length > 0
  && typeof w.cat === 'string' && CATS.includes(w.cat)
  && typeof w.act === 'string' && w.act.trim().length > 0));
t('không có từ trùng nhau (chuẩn hoá)', new Set(WORDS.map(w => normalizeGuess(w.word))).size === WORDS.length);
t('không có khái niệm trừu tượng', !WORDS.some(w => ['tình yêu', 'hạnh phúc', 'niềm vui', 'buồn', 'tình bạn', 'ước mơ', 'tương lai', 'quá khứ', 'thời gian', 'tự do', 'công bằng', 'chân lý'].includes(normalizeGuess(w.word))));

/* ---- chuẩn hoá lượt đoán ---- */
t('chuẩn hoá: hoa/thường', normalizeGuess('Con Mèo') === 'con meo');
t('chuẩn hoá: bỏ dấu', normalizeGuess('bánh chưng') === 'banh chung');
t('chuẩn hoá: đ → d', normalizeGuess('ĐÀO') === 'dao');
t('chuẩn hoá: gọn khoảng trắng', normalizeGuess('  con   mèo ') === 'con meo');
t('chuẩn hoá: tên riêng có dấu', normalizeGuess('Tôn Ngộ Không') === 'ton ngo khong');
t('chuẩn hoá: bỏ ký tự lạ', normalizeGuess('bánh chưng!') === 'banh chung');

/* ---- hằng số ---- */
t('GUESS_TIME = 60 giây', GUESS_TIME === 60);
t('ROUNDS = 3', ROUNDS === 3);
t('SOLO_SETS = 10, SOLO_WIN_CORRECT = 8', SOLO_SETS === 10 && SOLO_WIN_CORRECT === 8);
t('MAX_SKIPS = 2', MAX_SKIPS === 2);

/* ---- tạo ván ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 1 });
  t('tạo ván 2 người: stage act, vòng 1, diễn viên là p1', s.stage === 'act' && s.round === 1 && s.players[0].id === 'p1' && !s.solo);
  t('actors lúc act chỉ có diễn viên', JSON.stringify(actors(s)) === JSON.stringify(['p1']));
  const s1 = createGame(P(['A']), { seed: 1 });
  t('tạo ván đơn: stage guess, 10 từ, soloSet index 0', s1.solo && s1.stage === 'guess' && s1.soloSet && s1.soloSet.index === 0);
  t('ván đơn có 4 phương án khác nhau, đúng 1 trong đó', s1.soloSet.options.length === 4 && new Set(s1.soloSet.options).size === 4 && s1.soloSet.options[s1.soloSet.correctIdx] === s1.soloSet.word);
  let threw = false;
  try { createGame([], { seed: 1 }); } catch (e) { threw = true; }
  t('tạo ván 0 người bị từ chối', threw);
  threw = false;
  try { createGame(P(['A', 'B', 'C', 'D', 'E', 'F', 'G']), { seed: 1 }); } catch (e) { threw = true; }
  t('tạo ván 7 người bị từ chối', threw);
  const s6 = createGame(P(['A', 'B', 'C', 'D', 'E', 'F']), { seed: 1 });
  t('tạo ván 6 người được', s6.players.length === 6);
}

/* ---- đoán đúng đầu tiên + tính điểm ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 7 });
  const word = s.current.word;
  t('ready: diễn viên bắt đầu diễn → stage guess', applyAction(s, 'p1', { type: 'ready' }).ok && s.stage === 'guess');
  const g2 = applyAction(s, 'p2', { type: 'guess', text: word });
  t('p2 đoán đúng từ (ghi lại để diễn viên chấm)', g2.ok && g2.guessId === 1);
  const g3 = applyAction(s, 'p3', { type: 'guess', text: word });
  t('p3 cũng đoán đúng từ trước khi diễn viên chấm (cùng chờ)', g3.ok && g3.guessId === 2);
  const c = applyAction(s, 'p1', { type: 'confirm', guessId: 1 });
  t('diễn viên chấm p2 đúng → từ kết thúc, stage reveal', c.ok && c.correct === true && s.stage === 'reveal');
  t('chỉ lượt đoán đầu tiên tính điểm: p2 +10, p1 +5, p3 0', s.prog.p2.points === 10 && s.prog.p1.points === 5 && s.prog.p3.points === 0);
  t('p2 correctGuesses 1, p3 correctGuesses 0', s.prog.p2.correctGuesses === 1 && s.prog.p3.correctGuesses === 0);
  t('diễn viên actedWords 1, actedGuessed 1', s.prog.p1.actedWords === 1 && s.prog.p1.actedGuessed === 1);
  t('lượt đoán của p3 vẫn chưa được chấm (không tự chấm)', s.current.guesses.find(g => g.id === 2).correct == null);
  t('next → sang diễn viên p2, stage act', applyAction(s, 'p2', { type: 'next' }).ok && s.stage === 'act' && s.current.actor === 'p2');
}

/* ---- đoán sai, đoán lại, diễn viên chấm sai ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 11 });
  applyAction(s, 'p1', { type: 'ready' });
  t('đoán rỗng bị từ chối', !applyAction(s, 'p2', { type: 'guess', text: '   ' }).ok);
  t('diễn viên không được đoán từ của mình', !applyAction(s, 'p1', { type: 'guess', text: 'x' }).ok);
  t('đoán sai 1 từ (không phải từ bí mật)', applyAction(s, 'p2', { type: 'guess', text: 'từ sai chắc chắn' }).ok);
  t('đoán lần 2 cho cùng 1 từ bị từ chối (mỗi người 1 lượt)', !applyAction(s, 'p2', { type: 'guess', text: 'từ khác' }).ok);
  const c = applyAction(s, 'p1', { type: 'confirm', guessId: 1 });
  t('diễn viên chấm lượt sai → từ vẫn tiếp tục', c.ok && c.correct === false && s.stage === 'guess');
  t('đoán sai: totalGuesses 1, correctGuesses 0, streak 0', s.prog.p2.totalGuesses === 1 && s.prog.p2.correctGuesses === 0 && s.prog.p2.streak === 0);
  t('chấm lại lượt đã chấm bị từ chối', !applyAction(s, 'p1', { type: 'confirm', guessId: 1 }).ok);
  t('chấm lượt không có bị từ chối', !applyAction(s, 'p1', { type: 'confirm', guessId: 99 }).ok);
  t('người đoán không được chấm', !applyAction(s, 'p3', { type: 'confirm', guessId: 1 }).ok);
  const word = s.current.word;
  applyAction(s, 'p3', { type: 'guess', text: '  ' + word.toUpperCase() + '  ' });
  const c2 = applyAction(s, 'p1', { type: 'confirm', guessId: 2 });
  t('đoán đúng dù viết hoa/thừa khoảng trắng (chuẩn hoá)', c2.ok && c2.correct === true && s.prog.p3.points === 10);
}

/* ---- hết giờ ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 21 });
  applyAction(s, 'p1', { type: 'ready' });
  applyAction(s, 'p2', { type: 'guess', text: 'sai' });
  const r = applyAction(s, 'p2', { type: 'timeout' });
  t('hết giờ → stage reveal, how timeout', r.ok && s.stage === 'reveal' && s.lastReveal.how === 'timeout');
  t('hết giờ: 0 điểm cho mọi người', s.prog.p1.points === 0 && s.prog.p2.points === 0);
  t('hết giờ: actedWords 1, actedGuessed 0', s.prog.p1.actedWords === 1 && s.prog.p1.actedGuessed === 0);
  t('hết giờ rồi thì timeout nữa bị từ chối', !applyAction(s, 'p2', { type: 'timeout' }).ok);
}

/* ---- bỏ qua ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 31 });
  const w1 = s.current.word;
  t('bỏ qua lúc act: bốc từ mới, skipsUsed 1', applyAction(s, 'p1', { type: 'skip' }).ok && s.current.word !== w1 && s.prog.p1.skipsUsed === 1 && s.stage === 'act');
  const w2 = s.current.word;
  t('bỏ qua lần 2 lúc act: bốc từ mới, skipsUsed 2', applyAction(s, 'p1', { type: 'skip' }).ok && s.current.word !== w2 && s.prog.p1.skipsUsed === 2);
  t('bỏ qua lần 3 bị từ chối (tối đa 2)', !applyAction(s, 'p1', { type: 'skip' }).ok);
  t('người đoán không được bỏ qua', !applyAction(s, 'p2', { type: 'skip' }).ok);
  applyAction(s, 'p1', { type: 'ready' });
  t('đã hết lượt bỏ qua thì bỏ qua lúc guess cũng bị từ chối', !applyAction(s, 'p1', { type: 'skip' }).ok);
}
{
  const s = createGame(P(['A', 'B']), { seed: 32 });
  applyAction(s, 'p1', { type: 'ready' });
  t('bỏ qua lúc guess: từ kết thúc, how skip, skipsUsed 1', applyAction(s, 'p1', { type: 'skip' }).ok && s.stage === 'reveal' && s.lastReveal.how === 'skip' && s.prog.p1.skipsUsed === 1);
}

/* ---- 3 vòng × mọi người diễn 1 lần ---- */
{
  const { s, illegal, stuck, ended } = playMatch(101, ['A', 'B'], ['hard', 'hard']);
  t('ván 2 người chơi tới cùng (bot Hard)', ended && illegal === 0 && stuck === 0, `ended=${ended} illegal=${illegal} stuck=${stuck}`);
  t('mỗi người diễn đúng 3 từ (3 vòng)', s.final.summary.p1.actedWords === 3 && s.final.summary.p2.actedWords === 3, `p1=${s.final.summary.p1.actedWords} p2=${s.final.summary.p2.actedWords}`);
  t('summary đủ 7 trường', ['points', 'correctGuesses', 'totalGuesses', 'actedWords', 'actedGuessed', 'bestStreak', 'skipsUsed'].every(k => k in s.final.summary.p1));
  t('ván kết thúc có winner hoặc hòa', s.winner != null || s.endReason === 'draw');
  t('endReason là done hoặc draw', ['done', 'draw'].includes(s.endReason));
  const { s: s4 } = playMatch(102, ['A', 'B', 'C', 'D'], ['easy', 'easy', 'easy', 'easy']);
  t('ván 4 người: mỗi người diễn đúng 3 từ', ['p1', 'p2', 'p3', 'p4'].every(pid => s4.final.summary[pid].actedWords === 3));
}

/* ---- chơi đơn: 10 từ, ngưỡng thắng 8/10 ---- */
{
  const win = playSolo(201, 'hard', 10);
  t('chơi đơn đoán đúng 10/10 → thắng', win.ended && win.s.winner === 'p1' && win.s.final.summary.p1.correctGuesses === 10);
  const win8 = playSolo(202, 'hard', 8);
  t('chơi đơn đoán đúng 8/10 → thắng (ngưỡng)', win8.ended && win8.s.winner === 'p1' && win8.s.final.summary.p1.correctGuesses === 8);
  const lose7 = playSolo(203, 'hard', 7);
  t('chơi đơn đoán đúng 7/10 → thua', lose7.ended && lose7.s.winner == null && lose7.s.losers.includes('p1'));
  const lose0 = playSolo(204, 'hard', 0);
  t('chơi đơn đoán đúng 0/10 → thua, 0 điểm', lose0.ended && lose0.s.final.summary.p1.points === 0);
  const s = createGame(P(['A']), { seed: 205 });
  t('chơi đơn: đoán bằng chuỗi bị từ chối (phải chọn phương án)', !applyAction(s, 'p1', { type: 'guess', text: 'con mèo' }).ok);
  t('chơi đơn: chọn phương án ngoài 0..3 bị từ chối', !applyAction(s, 'p1', { type: 'guess', idx: 4 }).ok);
  t('chơi đơn: ready/skip/confirm bị từ chối', !applyAction(s, 'p1', { type: 'ready' }).ok && !applyAction(s, 'p1', { type: 'skip' }).ok && !applyAction(s, 'p1', { type: 'confirm', guessId: 1 }).ok);
}

/* ---- xin thua ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 301 });
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('2 người xin thua → ván kết thúc ngay, người còn lại thắng', r.ok && r.ended === true && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'resign');
  t('xin thua rồi thì hành động khác bị từ chối', !applyAction(s, 'p1', { type: 'ready' }).ok);
}
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 302 });
  applyAction(s, 'p1', { type: 'ready' });
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('3 người: 1 người xin thua → ván vẫn tiếp tục', r.ok && r.ended === false && s.phase === 'playing');
  t('người xin thua bị đánh dấu resigned', s.prog.p2.resigned === true);
  /* chơi nốt ván bằng bot — p2 không còn trong actors */
  reseed();
  let guard = 0, illegal = 0, stuck = 0;
  const lv = { p1: 'hard', p2: 'hard', p3: 'hard' };
  while (s.phase !== 'ended' && guard++ < 2000) {
    const act = actors(s);
    if (!act.length) { stuck++; break; }
    if (act.includes('p2')) { stuck++; break; }
    const pid = act[0];
    let a = botAction(s, pid, lv[pid]);
    if (!a) {
      if (s.stage === 'guess') a = { type: 'timeout' };
      else { stuck++; break; }
    }
    const rr = applyAction(s, pid, a);
    if (!rr.ok) { illegal++; break; }
  }
  t('ván 3 người (1 xin thua) chơi tới cùng, p2 không bao giờ tới lượt', s.phase === 'ended' && illegal === 0 && stuck === 0);
  t('người xin thua không diễn từ nào', s.final.summary.p2.actedWords === 0);
  const s2 = createGame(P(['A', 'B', 'C']), { seed: 303 });
  applyAction(s2, 'p2', { type: 'resign' });
  const r2 = applyAction(s2, 'p3', { type: 'resign' });
  t('chỉ còn 1 người chưa thua → người đó thắng ngay', r2.ok && r2.ended === true && s2.phase === 'ended' && s2.winner === 'p1');
  const s3 = createGame(P(['A', 'B', 'C']), { seed: 304 });
  t('diễn viên xin thua lúc act → sang diễn viên tiếp theo', (() => {
    applyAction(s3, 'p1', { type: 'resign' });
    return s3.phase === 'playing' && s3.current.actor === 'p2' && s3.stage === 'act';
  })());
}

/* ---- viewFor che từ bí mật và lượt đoán ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 401 });
  const word = s.current.word;
  t('lúc act: diễn viên thấy từ, người đoán không thấy', viewFor(s, 'p1').current.word === word && viewFor(s, 'p2').current.word == null);
  applyAction(s, 'p1', { type: 'ready' });
  t('lúc guess: người đoán vẫn không thấy từ', viewFor(s, 'p2').current.word == null && viewFor(s, 'p3').current.word == null);
  t('lúc guess: diễn viên thấy từ', viewFor(s, 'p1').current.word === word);
  applyAction(s, 'p2', { type: 'guess', text: 'từ đoán của p2' });
  const vActor = viewFor(s, 'p1');
  const vP2 = viewFor(s, 'p2');
  const vP3 = viewFor(s, 'p3');
  t('diễn viên thấy nội dung lượt đoán', vActor.current.guesses[0].text === 'từ đoán của p2');
  t('người đoán thấy lượt của mình', vP2.current.guesses[0].text === 'từ đoán của p2');
  t('người đoán khác chỉ thấy "đã đoán", không thấy nội dung', vP3.current.guesses[0].text == null && vP3.current.guesses[0].pid === 'p2');
  applyAction(s, 'p1', { type: 'confirm', guessId: 1 });
  t('chấm lượt sai xong từ vẫn chưa lật bài (người khác vẫn đoán được)', viewFor(s, 'p3').current.word == null && s.stage === 'guess');
  applyAction(s, 'p3', { type: 'guess', text: word });
  applyAction(s, 'p1', { type: 'confirm', guessId: 2 });
  const vAfter = viewFor(s, 'p3');
  t('sau khi lật bài: mọi người thấy từ và lượt đoán', vAfter.current.word === word && vAfter.current.guesses[0].text === 'từ đoán của p2');
  t('viewFor chơi đơn không lộ từ trước khi chọn', (() => {
    const s1 = createGame(P(['A']), { seed: 402 });
    const v1 = viewFor(s1, 'p1');
    return v1.soloSet.word == null && v1.soloSet.correctIdx == null && v1.soloSet.options.length === 4;
  })());
}

/* ---- serialize / deserialize ---- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 501 });
  applyAction(s, 'p1', { type: 'ready' });
  applyAction(s, 'p2', { type: 'guess', text: 'sai' });
  const json = serialize(s);
  const s2 = deserialize(json);
  t('serialize/deserialize giữ nguyên state (byte-identical)', JSON.stringify(s2) === JSON.stringify(s));
  t('deserialize chuỗi không hợp lệ bị từ chối', (() => { try { deserialize('{"x":1}'); return false; } catch (e) { return true; } })());
  t('deserialize JSON hỏng bị từ chối', (() => { try { deserialize('{oops'); return false; } catch (e) { return true; } })());
}

/* ---- hành động sai ---- */
{
  const s = createGame(P(['A', 'B']), { seed: 601 });
  t('hành động không rõ loại bị từ chối', !applyAction(s, 'p1', { type: 'bay' }).ok);
  t('hành động null bị từ chối', !applyAction(s, 'p1', null).ok);
  t('ready khi chưa tới lượt bị từ chối', !applyAction(s, 'p2', { type: 'ready' }).ok);
  t('next trước khi lật bài bị từ chối', !applyAction(s, 'p1', { type: 'next' }).ok);
  t('timeout lúc act bị từ chối', !applyAction(s, 'p1', { type: 'timeout' }).ok);
  t('guess lúc act bị từ chối', !applyAction(s, 'p2', { type: 'guess', text: 'x' }).ok);
}

console.log(`\nRULES: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
