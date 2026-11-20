// Luật Mastermind: phản hồi đen/trắng (cả trùng màu), đặt mã, đoán,
// thắng ngay, hết 10 lượt, xin thua, viewFor che mã bí mật.
import {
  createGame, applyAction, actors, viewFor, serialize, deserialize,
  feedback, consistent, allCodes, legalGuesses, validateGuess,
  CODE_LEN, COLOR_COUNT, MAX_GUESSES,
} from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

/* ---------- 0. phản hồi ---------- */
{
  const f1 = feedback([0, 1, 2, 3], [0, 1, 2, 3]);
  t('đoán đúng cả 4 → 4 đen 0 trắng', f1.black === 4 && f1.white === 0);
  const f2 = feedback([0, 1, 2, 3], [3, 2, 1, 0]);
  t('đảo ngược hết → 0 đen 4 trắng', f2.black === 0 && f2.white === 4);
  const f3 = feedback([0, 1, 2, 3], [0, 2, 1, 5]);
  t('1 đúng chỗ + 2 đúng màu sai chỗ → 1 đen 2 trắng', f3.black === 1 && f3.white === 2);
  const f4 = feedback([0, 1, 2, 3], [4, 4, 5, 5]);
  t('không khớp màu nào → 0 đen 0 trắng', f4.black === 0 && f4.white === 0);
  /* trùng lặp: mã chỉ có 1 chốt đỏ, đoán 2 chốt đỏ → tối đa 1 được tính */
  const f5 = feedback([0, 1, 2, 3], [0, 0, 4, 5]);
  t('mã có 1 đỏ, đoán 2 đỏ (1 đúng chỗ) → 1 đen 0 trắng', f5.black === 1 && f5.white === 0);
  const f6 = feedback([0, 1, 2, 3], [4, 0, 0, 5]);
  t('mã có 1 đỏ, đoán 2 đỏ (0 đúng chỗ) → 0 đen 1 trắng', f6.black === 0 && f6.white === 1);
  const f7 = feedback([0, 0, 1, 1], [0, 1, 0, 1]);
  t('mã 2 đỏ 2 vàng, đoán xen kẽ → 2 đen 2 trắng', f7.black === 2 && f7.white === 2);
  const f8 = feedback([0, 0, 0, 0], [0, 0, 0, 1]);
  t('mã 4 đỏ, đoán 3 đỏ + 1 vàng → 3 đen 0 trắng', f8.black === 3 && f8.white === 0);
  t('không bao giờ có phản hồi (3 đen, 1 trắng)', (() => {
    for (let i = 0; i < 200; i++) {
      const s = [0, 1, 2, 3].map(() => Math.floor(Math.random() * 6));
      const g = [0, 1, 2, 3].map(() => Math.floor(Math.random() * 6));
      const f = feedback(s, g);
      if (f.black === 3 && f.white === 1) return false;
    }
    return true;
  })());
}

/* ---------- 1. mọi mã có thể + khớp phản hồi ---------- */
{
  t('6^4 = 1296 mã có thể', allCodes().length === 1296);
  t('mã đúng luôn khớp phản hồi của chính nó', consistent([0, 1, 2, 3], [[0, 1, 2, 3]], [{ black: 4, white: 0 }]));
  t('mã khác bị loại khi phản hồi 4 đen', !consistent([0, 1, 2, 4], [[0, 1, 2, 3]], [{ black: 4, white: 0 }]));
  t('mã khớp phản hồi 0 đen 0 trắng khi không dùng màu đã đoán',
    consistent([4, 4, 5, 5], [[0, 1, 2, 3]], [{ black: 0, white: 0 }]));
  t('mã dùng màu đã loại thì không khớp 0-0',
    !consistent([0, 4, 5, 5], [[0, 1, 2, 3]], [{ black: 0, white: 0 }]));
}

/* ---------- 2. tạo ván ---------- */
{
  let threw = false;
  try { createGame(P(['A'])); } catch (e) { threw = true; }
  t('1 người thì từ chối tạo ván', threw);
  threw = false;
  try { createGame(P(['A', 'B', 'C'])); } catch (e) { threw = true; }
  t('3 người thì từ chối tạo ván', threw);
  const s = createGame(P(['A', 'B']), { seed: 1 });
  t('ván mới ở giai đoạn đặt mã', s.phase === 'setup');
  t('người đi trước là p1', actors(s)[0] === 'p1');
  t('chưa ai có mã bí mật', s.players[0].secret === null && s.players[1].secret === null);
}

/* ---------- 3. đặt mã ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 2 });
  const r1 = applyAction(s, 'p2', { type: 'setcode', code: [0, 1, 2, 3] });
  t('chưa tới lượt mà đặt mã thì bị từ chối', !r1.ok);
  const r2 = applyAction(s, 'p1', { type: 'setcode', code: [0, 1, 2] });
  t('mã thiếu chốt thì bị từ chối', !r2.ok);
  const r3 = applyAction(s, 'p1', { type: 'setcode', code: [0, 1, 2, 6] });
  t('mã có màu ngoài 0–5 thì bị từ chối', !r3.ok);
  const r4 = applyAction(s, 'p1', { type: 'setcode', code: [0, 0, 1, 1] });
  t('p1 đặt mã (màu được lặp) thì được', r4.ok);
  t('sau khi p1 đặt mã, tới lượt p2 đặt', actors(s)[0] === 'p2' && s.phase === 'setup');
  const r5 = applyAction(s, 'p2', { type: 'setcode', code: [2, 3, 4, 5] });
  t('p2 đặt mã thì vào giai đoạn đoán', r5.ok && s.phase === 'playing');
  t('vào giai đoạn đoán thì p1 đoán trước', actors(s)[0] === 'p1');
  const r6 = applyAction(s, 'p1', { type: 'setcode', code: [0, 0, 0, 0] });
  t('đã qua giai đoạn đặt mã thì không đặt lại được', !r6.ok);
}

/* ---------- 4. đoán + thắng ngay ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 3 });
  applyAction(s, 'p1', { type: 'setcode', code: [0, 1, 2, 3] });
  applyAction(s, 'p2', { type: 'setcode', code: [4, 5, 4, 5] });
  const r1 = applyAction(s, 'p2', { type: 'guess', guess: [4, 5, 4, 5] });
  t('chưa tới lượt mà đoán thì bị từ chối', !r1.ok);
  const r2 = applyAction(s, 'p1', { type: 'guess', guess: [0, 1] });
  t('đoán thiếu chốt thì bị từ chối', !r2.ok);
  const r3 = applyAction(s, 'p1', { type: 'guess', guess: [4, 5, 4, 5] });
  t('đoán đúng mã của đối thủ thì được', r3.ok);
  t('đoán đúng 4 vị trí thì thắng ngay', s.phase === 'ended' && s.winner === 'p1');
  t('người thắng có cracked = true', s.players[0].cracked === true);
  t('thắng ở lượt 1 thì điểm = 100', s.players[0].score === 100);
  t('summary ghi đúng số lượt + cracked', s.final.summary.p1.guesses === 1 && s.final.summary.p1.cracked === true);
  const r4 = applyAction(s, 'p2', { type: 'guess', guess: [0, 0, 0, 0] });
  t('hết ván thì không đoán nữa được', !r4.ok);
}

/* ---------- 5. phản hồi lưu đúng + lượt xen kẽ ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 4 });
  applyAction(s, 'p1', { type: 'setcode', code: [0, 1, 2, 3] });
  applyAction(s, 'p2', { type: 'setcode', code: [3, 3, 3, 3] });
  applyAction(s, 'p1', { type: 'guess', guess: [3, 2, 1, 0] });
  t('phản hồi lượt 1 của p1 là 1 đen 0 trắng', s.players[0].feedbacks[0].black === 1 && s.players[0].feedbacks[0].white === 0);
  t('sau lượt p1 thì tới lượt p2', actors(s)[0] === 'p2');
  applyAction(s, 'p2', { type: 'guess', guess: [0, 0, 0, 0] });
  t('phản hồi lượt 1 của p2 là 1 đen 0 trắng', s.players[1].feedbacks[0].black === 1 && s.players[1].feedbacks[0].white === 0);
  t('bestBlack/bestWhite cập nhật', s.players[1].bestBlack === 1 && s.players[1].bestWhite === 0);
  t('sau lượt p2 thì vòng tăng lên 2', s.round === 2 && actors(s)[0] === 'p1');
  t('legalGuesses sau 1 lượt còn ít hơn 1296', legalGuesses(s, 'p1').length < 1296 && legalGuesses(s, 'p1').length > 0);
  t('mã thật vẫn nằm trong legalGuesses', legalGuesses(s, 'p1').some(c => c.join() === [3, 3, 3, 3].join()));
}

/* ---------- 6. hết 10 lượt cả 2: so lượt tốt nhất / hòa ---------- */
{
  /* hòa: cả 2 đều 0 đen 0 trắng suốt 10 lượt */
  const s = createGame(P(['A', 'B']), { seed: 5 });
  applyAction(s, 'p1', { type: 'setcode', code: [0, 0, 0, 0] });
  applyAction(s, 'p2', { type: 'setcode', code: [1, 1, 1, 1] });
  for (let i = 0; i < 10; i++) {
    applyAction(s, 'p1', { type: 'guess', guess: [2, 2, 2, 2] });
    if (s.phase !== 'ended') applyAction(s, 'p2', { type: 'guess', guess: [2, 2, 2, 2] });
  }
  t('hết 10 lượt cả 2 mà không ai đoán ra thì hết ván', s.phase === 'ended');
  t('lượt tốt nhất hòa nhau thì hòa (không có người thắng)', s.winner === null && s.endReason === 'draw');
  t('hòa thì cả 2 đều không nằm trong losers', s.losers.length === 0);

  /* p1 tốt hơn: p1 luôn được 1 đen, p2 luôn 0 */
  const s2 = createGame(P(['A', 'B']), { seed: 6 });
  applyAction(s2, 'p1', { type: 'setcode', code: [0, 0, 0, 0] });
  applyAction(s2, 'p2', { type: 'setcode', code: [1, 1, 1, 1] });
  for (let i = 0; i < 10; i++) {
    applyAction(s2, 'p1', { type: 'guess', guess: [1, 2, 2, 2] }); /* 1 đen */
    if (s2.phase !== 'ended') applyAction(s2, 'p2', { type: 'guess', guess: [2, 2, 2, 2] }); /* 0 */
  }
  t('hết 10 lượt, p1 có lượt tốt hơn thì p1 thắng', s2.phase === 'ended' && s2.winner === 'p1' && s2.endReason === 'outofguesses');
  t('thắng do hết lượt thì điểm = (11 − số lượt) × 10', s2.players[0].score === 10);
}

/* ---------- 7. xin thua ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 7 });
  const r1 = applyAction(s, 'p1', { type: 'resign' });
  t('xin thua ngay ở giai đoạn đặt mã cũng được', r1.ok && s.phase === 'ended' && s.winner === 'p2' && s.endReason === 'resign');
  const s2 = createGame(P(['A', 'B']), { seed: 8 });
  applyAction(s2, 'p1', { type: 'setcode', code: [0, 1, 2, 3] });
  applyAction(s2, 'p2', { type: 'setcode', code: [4, 5, 4, 5] });
  applyAction(s2, 'p2', { type: 'resign' });
  t('xin thua giữa ván thì đối thủ thắng', s2.winner === 'p1');
  t('xin thua xong không đi nữa được', !applyAction(s2, 'p1', { type: 'guess', guess: [0, 0, 0, 0] }).ok);
}

/* ---------- 8. viewFor che mã bí mật ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 9 });
  applyAction(s, 'p1', { type: 'setcode', code: [0, 1, 2, 3] });
  const v2 = viewFor(s, 'p2');
  t('đối thủ không thấy mã của mình', v2.players[0].secret === null);
  t('mình thấy mã của mình', viewFor(s, 'p1').players[0].secret.join() === [0, 1, 2, 3].join());
  t('view không có trường you', !('you' in v2) && !JSON.stringify(v2).includes('"_seed"') && !JSON.stringify(v2).includes('"_rng"'));
  applyAction(s, 'p2', { type: 'setcode', code: [4, 4, 4, 4] });
  applyAction(s, 'p1', { type: 'guess', guess: [4, 4, 4, 4] });
  const vEnd = viewFor(s, 'p2');
  t('hết ván thì cả 2 thấy mã của nhau', vEnd.players[0].secret.join() === [0, 1, 2, 3].join() && vEnd.players[1].secret.join() === [4, 4, 4, 4].join());
  t('viewFor vẫn thấy lượt đoán + phản hồi của cả 2', vEnd.players[0].guesses.length === 1 && vEnd.players[0].feedbacks[0].black === 4);
}

/* ---------- 9. validateGuess + serialize ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 10 });
  applyAction(s, 'p1', { type: 'setcode', code: [0, 1, 2, 3] });
  applyAction(s, 'p2', { type: 'setcode', code: [4, 5, 4, 5] });
  t('validateGuess: đúng lượt + đủ 4 chốt thì ok', validateGuess(s, 'p1', [0, 0, 0, 0]).ok);
  t('validateGuess: sai lượt thì từ chối', !validateGuess(s, 'p2', [0, 0, 0, 0]).ok);
  t('validateGuess: thiếu chốt thì từ chối', !validateGuess(s, 'p1', [0, 0]).ok);
  const j = serialize(s);
  const s2 = deserialize(j);
  t('serialize/deserialize giữ nguyên state', JSON.stringify(s2) === JSON.stringify(s));
  let threw = false;
  try { deserialize('{"players":[]}'); } catch (e) { threw = true; }
  t('deserialize state sai thì ném lỗi', threw);
}

/* ---------- 10. bot chỉ dùng view (không đọc mã đối thủ) ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 11 });
  /* bot Dễ đặt mã: mã của bot không được lộ qua view của người */
  const act = botAction(s, 'p1', 'easy');
  t('bot trả nước đặt mã ở giai đoạn setup', act && act.type === 'setcode' && act.code.length === 4);
  applyAction(s, 'p1', act);
  const v2 = viewFor(s, 'p2');
  t('mã bot đặt không lộ qua view', v2.players[0].secret === null);
}

console.log(`\nLuật Mastermind: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
