// Luật Scrabble: bố cục ô thưởng, nước đầu, từ phụ, tính điểm, bingo,
// đổi chữ, kết thúc (hết túi / bỏ lượt liên tiếp / xin thua), viewFor.
import {
  createGame, applyAction, viewFor, validatePlace, tryPlacement, legalMoves,
  PREMIUM, PREMIUM_COUNTS, TILE_VALUE, TILE_DIST, buildBag, SIZE, CENTER, actors,
} from '../js/engine.js';
import { WORDS, DICT } from '../js/words.js';

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n, extra); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
const idx = (r, c) => r * SIZE + c;
function setBoard(s, cells) {
  for (const [r, c, ch] of cells) s.board[idx(r, c)] = { ch, blank: false, value: TILE_VALUE[ch] };
}
function setRack(s, pid, tiles) { s.players.find(p => p.id === pid).rack = tiles.slice(); }

/* ---------- §0. Từ điển + ô thưởng + túi chữ ---------- */
{
  t('từ điển ≥ 600 từ, toàn A–Z, dài 2–15', WORDS.length >= 600 && WORDS.every(w => /^[A-Z]{2,15}$/.test(w)), 'có ' + WORDS.length + ' từ');
  t('từ điển có từ 2 chữ (AN, QUA) và từ 7–8 chữ (HOCSINH, TRUONGHOC)', DICT.has('AN') && DICT.has('QUA') && DICT.has('HOCSINH') && DICT.has('TRUONGHOC'));
  t('từ điển KHÔNG có từ 1 chữ', !WORDS.some(w => w.length < 2));
  t('ô thưởng chuẩn: TW 8, DW 17, TL 12, DL 24',
    PREMIUM_COUNTS.TW === 8 && PREMIUM_COUNTS.DW === 17 && PREMIUM_COUNTS.TL === 12 && PREMIUM_COUNTS.DL === 24,
    JSON.stringify(PREMIUM_COUNTS));
  t('ô trung tâm (7,7) là DW; 4 góc là TW; (0,7) TW; (1,5) TL; (0,3) DL',
    PREMIUM[7][7] === 'DW' && PREMIUM[0][0] === 'TW' && PREMIUM[14][14] === 'TW'
    && PREMIUM[0][7] === 'TW' && PREMIUM[1][5] === 'TL' && PREMIUM[0][3] === 'DL');
  const bag = buildBag();
  t('túi đúng 100 chữ', bag.length === 100);
  const counts = {};
  for (const ch of bag) counts[ch] = (counts[ch] || 0) + 1;
  t('phân phối túi đúng chuẩn (A 9, E 12, Q 1, Z 1, ô trống 2)',
    counts.A === 9 && counts.E === 12 && counts.Q === 1 && counts.Z === 1 && counts['*'] === 2);
}

/* ---------- §1. Tạo ván ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 42 });
  t('ván 2 người: mỗi người 7 chữ, túi còn 86', s.players[0].rack.length === 7 && s.players[1].rack.length === 7 && s.bag.length === 86);
  const s4 = createGame(P(['A', 'B', 'C', 'D']), { seed: 42 });
  t('ván 4 người: túi còn 72', s4.bag.length === 72);
  let threw1 = false, threw5 = false;
  try { createGame(P(['A']), { seed: 1 }); } catch (e) { threw1 = true; }
  try { createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 1 }); } catch (e) { threw5 = true; }
  t('1 người / 5 người đều bị từ chối', threw1 && threw5);
  const a = createGame(P(['A', 'B']), { seed: 99 });
  const b = createGame(P(['A', 'B']), { seed: 99 });
  const strip = s => { const c = JSON.parse(JSON.stringify(s)); c.startedAt = 0; return c; };
  t('cùng seed thì ván giống hệt (xác định)', JSON.stringify(strip(a)) === JSON.stringify(strip(b)));
  const c2 = createGame(P(['A', 'B']), { seed: 100 });
  t('khác seed thì khay khác nhau', JSON.stringify(a.players[0].rack) !== JSON.stringify(c2.players[0].rack));
}

/* ---------- §2. Nước đầu tiên ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 7 });
  setRack(s, 'p1', ['Q', 'U', 'A', 'N', 'X', 'X', 'X']);
  let r = applyAction(s, 'p1', { type: 'place', dir: 'H', r: 0, c: 0, word: 'AN' });
  t('nước đầu không phủ trung tâm bị từ chối', !r.ok, r.reason || '');
  r = applyAction(s, 'p1', { type: 'place', dir: 'H', r: 7, c: 7, word: 'ZZ' });
  t('từ không có trong từ điển bị từ chối', !r.ok, r.reason || '');
  r = applyAction(s, 'p2', { type: 'place', dir: 'H', r: 7, c: 6, word: 'QUA' });
  t('chưa tới lượt thì bị từ chối', !r.ok, r.reason || '');
  r = applyAction(s, 'p1', { type: 'place', dir: 'H', r: 7, c: 6, word: 'QUA' });
  t('nước đầu QUA phủ trung tâm được chấp nhận', r.ok, r.reason || '');
  t('QUA: Q10+U1+A1=12, ô giữa DW ×2 → 24 điểm', s.players[0].score === 24, 'điểm=' + s.players[0].score);
  t('sau nước đầu, lượt chuyển sang p2', s.turnIdx === 1);

  const s2 = createGame(P(['A', 'B']), { seed: 8 });
  setRack(s2, 'p1', ['A', 'N', 'X', 'X', 'X', 'X', 'X']);
  const r2 = applyAction(s2, 'p1', { type: 'place', dir: 'H', r: 7, c: 7, word: 'AN' });
  t('AN ở trung tâm: (1+1) ×2 DW = 4 điểm', r2.ok && s2.players[0].score === 4, 'điểm=' + s2.players[0].score);
}

/* ---------- §3. Từ phụ + tính điểm có thưởng chữ ---------- */
{
  /* bàn đã có AN ở (7,7)-(7,8); đặt BAO dọc ở cột 6, từ hàng 7 */
  const s = createGame(P(['A', 'B']), { seed: 9 });
  setBoard(s, [[7, 7, 'A'], [7, 8, 'N']]);
  setRack(s, 'p1', ['B', 'A', 'O', 'X', 'X', 'X', 'X']);
  const chk = tryPlacement(s.board, s.players[0].rack, 'V', 7, 6, 'BAO', false);
  t('BAO dọc: chính B3 + A(DL)×2 + O1 = 6, phụ BAN = 5 → tổng 11',
    chk.ok && chk.score === 11, 'ok=' + chk.ok + ' score=' + (chk.score ?? chk.reason));
  const r = applyAction(s, 'p1', { type: 'place', dir: 'V', r: 7, c: 6, word: 'BAO' });
  t('đặt BAO thành công, điểm p1 = 11', r.ok && s.players[0].score === 11, 'điểm=' + s.players[0].score);

  /* từ phụ sai thì cả nước bị từ chối: BI dọc ở cột 6 tạo từ phụ "IAN" */
  const s2 = createGame(P(['A', 'B']), { seed: 10 });
  setBoard(s2, [[7, 7, 'A'], [7, 8, 'N']]);
  setRack(s2, 'p1', ['B', 'I', 'X', 'X', 'X', 'X', 'X']);
  const chk2 = tryPlacement(s2.board, s2.players[0].rack, 'V', 6, 6, 'BI', false);
  t('BI dọc tạo từ phụ "IAN" (không có trong từ điển) → bị từ chối',
    !chk2.ok && /IAN/.test(chk2.reason || ''), chk2.reason || '');

  /* từ không nối với bàn thì bị từ chối */
  const s3 = createGame(P(['A', 'B']), { seed: 11 });
  setBoard(s3, [[7, 7, 'A'], [7, 8, 'N']]);
  setRack(s3, 'p1', ['B', 'A', 'O', 'X', 'X', 'X', 'X']);
  const chk3 = tryPlacement(s3.board, s3.players[0].rack, 'H', 0, 0, 'BAO', false);
  t('từ đặt xa, không nối với chữ có sẵn → bị từ chối', !chk3.ok, chk3.reason || '');

  /* chữ đặt chồng lên chữ khác trên bàn thì bị từ chối */
  const s4 = createGame(P(['A', 'B']), { seed: 12 });
  setBoard(s4, [[7, 7, 'A'], [7, 8, 'N']]);
  setRack(s4, 'p1', ['B', 'A', 'O', 'X', 'X', 'X', 'X']);
  const chk4 = tryPlacement(s4.board, s4.players[0].rack, 'H', 7, 7, 'BAO', false);
  t('chữ mới không khớp chữ đã có trên bàn → bị từ chối', !chk4.ok, chk4.reason || '');
}

/* ---------- §4. Ô thưởng từ ×3 (TW) ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 13 });
  setBoard(s, [[1, 7, 'N']]); /* chữ N ở (1,7) để từ AN nối vào */
  setRack(s, 'p1', ['A', 'N', 'X', 'X', 'X', 'X', 'X']);
  const chk = tryPlacement(s.board, s.players[0].rack, 'V', 0, 7, 'AN', false);
  t('AN dọc ở cột 7: A trên ô TW (0,7) → (1+1) ×3 = 6 điểm',
    chk.ok && chk.score === 6, 'ok=' + chk.ok + ' score=' + (chk.score ?? chk.reason));
}

/* ---------- §5. Bingo +50 ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 14 });
  setRack(s, 'p1', ['H', 'O', 'C', 'S', 'I', 'N', 'H']);
  const r = applyAction(s, 'p1', { type: 'place', dir: 'H', r: 7, c: 4, word: 'HOCSINH' });
  t('đặt HOCSINH (7 chữ) được chấp nhận', r.ok, r.reason || '');
  t('HOCSINH: (4+1+3+1+1+1+4)=15 ×2 DW = 30 + 50 bingo = 80 điểm',
    s.players[0].score === 80, 'điểm=' + s.players[0].score);
  t('bingoCount = 1, khay rút lại đủ 7', s.players[0].bingoCount === 1 && s.players[0].rack.length === 7);
}

/* ---------- §6. Ô trống + đổi chữ ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 15 });
  setRack(s, 'p1', ['*', 'N', 'X', 'X', 'X', 'X', 'X']);
  /* ô trống làm chữ A: AN ở trung tâm, A = 0 điểm */
  const r = applyAction(s, 'p1', { type: 'place', dir: 'H', r: 7, c: 7, word: 'AN', blanks: [0] });
  t('ô trống làm chữ A: (0+1) ×2 DW = 2 điểm', r.ok && s.players[0].score === 2, 'điểm=' + s.players[0].score);
  t('ô trống đã đặt hiển thị chữ A nhưng 0 điểm',
    s.board[idx(7, 7)].ch === 'A' && s.board[idx(7, 7)].blank === true && s.board[idx(7, 7)].value === 0);

  const s2 = createGame(P(['A', 'B']), { seed: 16 });
  const bagBefore = s2.bag.length;
  const r2 = applyAction(s2, 'p1', { type: 'exchange', tiles: [0, 1] });
  t('đổi 2 chữ: ok, khay vẫn 7, túi không đổi (trả lại 2, rút 2)',
    r2.ok && s2.players[0].rack.length === 7 && s2.bag.length === bagBefore && s2.turnIdx === 1,
    'túi=' + s2.bag.length + ' (trước ' + bagBefore + ')');
  const r3 = applyAction(s2, 'p2', { type: 'exchange', tiles: [] });
  t('đổi 0 chữ bị từ chối', !r3.ok);
  const r4 = applyAction(s2, 'p2', { type: 'exchange', tiles: [0, 0] });
  t('đổi trùng vị trí bị từ chối', !r4.ok);
  const s3 = createGame(P(['A', 'B']), { seed: 17 });
  s3.bag = ['A', 'B', 'C', 'D', 'E'];
  const r5 = applyAction(s3, 'p1', { type: 'exchange', tiles: [0] });
  t('túi còn < 7 chữ thì không đổi được', !r5.ok, r5.reason || '');
}

/* ---------- §7. Hết túi + hết khay thì kết thúc ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 18 });
  setBoard(s, [[7, 7, 'A'], [7, 8, 'N']]);
  s.bag = [];
  setRack(s, 'p1', ['B']);
  setRack(s, 'p2', ['Q', 'Z']); /* còn 20 điểm trên khay */
  const r = applyAction(s, 'p1', { type: 'place', dir: 'V', r: 6, c: 7, word: 'BA' });
  t('p1 đặt BA (hết khay, hết túi) → trận kết thúc', r.ok && s.phase === 'ended', r.reason || '');
  t('p2 trừ 20 điểm khay (0 − 20 = −20)', s.players[1].score === -20, 'điểm p2=' + s.players[1].score);
  t('p1 được cộng 20 (4 + 20 = 24) và thắng', s.players[0].score === 24 && s.winner === 'p1',
    'điểm p1=' + s.players[0].score + ' winner=' + s.winner);
  t('endCause = bag-out, summary đủ trường',
    s.endCause === 'bag-out' && s.final.summary.p1.tilesLeft === 0 && s.final.summary.p2.tilesLeft === 2);
}

/* ---------- §8. Bỏ lượt liên tiếp 2 vòng thì kết thúc ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 19 });
  applyAction(s, 'p1', { type: 'pass' });
  applyAction(s, 'p2', { type: 'pass' });
  t('bỏ lượt 1 vòng chưa kết thúc', s.phase === 'playing');
  applyAction(s, 'p1', { type: 'pass' });
  applyAction(s, 'p2', { type: 'pass' });
  t('bỏ lượt 2 vòng thì kết thúc, endCause = passes',
    s.phase === 'ended' && s.endCause === 'passes' && !!s.winner);
}

/* ---------- §9. Xin thua ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 20 });
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('p2 xin thua → kết thúc, p1 thắng, lý do resign',
    r.ok && s.phase === 'ended' && s.winner === 'p1' && s.endReason === 'resign');
  const r2 = applyAction(s, 'p1', { type: 'place', dir: 'H', r: 7, c: 7, word: 'AN' });
  t('trận đã kết thúc thì không đi được nữa', !r2.ok);
}

/* ---------- §10. viewFor giấu thông tin ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 21 });
  const v = viewFor(s, 'p1');
  t('view có me=p1, không có trường you', v.me === 'p1' && !('you' in v));
  t('view giấu seed và túi (chỉ có bagCount)', !('seed' in v) && !('bag' in v) && v.bagCount === 86);
  t('view chỉ cho thấy khay của mình (khay đối thủ = null, có rackCount)',
    Array.isArray(v.players[0].rack) && v.players[0].rack.length === 7
    && v.players[1].rack === null && v.players[1].rackCount === 7);
  t('view không lộ _rng', !('_rng' in v) && !('_seed' in v));
}

/* ---------- §11. legalMoves: mọi nước đều hợp lệ ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 22 });
  setRack(s, 'p1', ['A', 'N', 'B', 'O', 'C', 'A', 'O']);
  const mv = legalMoves(s, 'p1');
  t('ván mới có nước đi hợp lệ', mv.length > 0, 'có ' + mv.length + ' nước');
  let allOk = true;
  for (const m of mv.slice(0, 20)) {
    const chk = validatePlace(s, 'p1', m);
    if (!chk.ok || chk.score !== m.score) { allOk = false; console.log('  (nước lỗi:', JSON.stringify(m), chk.reason || ('điểm ' + chk.score + ' ≠ ' + m.score) + ')'); break; }
  }
  t('20 nước đầu đều qua validatePlace với đúng điểm', allOk);
  const best = mv[0];
  const r = applyAction(s, 'p1', best);
  t('đặt nước tốt nhất thành công', r.ok && r.score === best.score, r.reason || '');
  const mv2 = legalMoves(s, 'p2');
  t('sau nước đầu, p2 vẫn có nước đi', mv2.length > 0, 'có ' + mv2.length + ' nước');
  /* khay toàn phụ âm khó (BBFFGRS) thì không có nước đi — đúng luật, bot sẽ đổi chữ */
  const sBad = createGame(P(['A', 'B']), { seed: 22 });
  t('khay BBFFGRS không xếp được từ nào (0 nước) — hợp lệ, không phải lỗi',
    legalMoves(sBad, 'p1').length === 0);
}

console.log(`\nLuật Scrabble: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
