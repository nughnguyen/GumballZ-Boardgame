// Luật Blokus: 21 mảnh/màu, góc xuất phát, chạm chéo / chạm cạnh,
// xoay + lật, chồng ô, ngoài bàn, bỏ lượt, điểm + thưởng, xin thua.
import {
  createGame, applyAction, actors, viewFor, serialize, deserialize,
  validatePlacement, legalPlacements, orientCells, ORIENTS, PIECES,
  PIECE_IDS, TOTAL_SQUARES, SIZE, COLORS, CORNERS, scoreOfSeat, playerScore,
} from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

/* đặt tay 1 số ô lên bàn cho 1 màu (kèm cập nhật ghế cho test) */
function putCells(s, color, cells) {
  const seat = s.seats.find(se => se.color === color);
  for (const [r, c] of cells) s.board[r * SIZE + c] = color;
  seat.placed += 1;
  seat.squares += cells.length;
}

/* ---------- 0. bộ mảnh ---------- */
{
  t('21 mảnh/màu', PIECES.length === 21 && PIECE_IDS.length === 21);
  t('tổng 89 ô/màu', TOTAL_SQUARES === 89);
  t('1 mảnh 1 ô, 1 mảnh 2 ô, 2 mảnh 3 ô, 5 mảnh 4 ô, 12 mảnh 5 ô',
    PIECES.filter(p => p.size === 1).length === 1
    && PIECES.filter(p => p.size === 2).length === 1
    && PIECES.filter(p => p.size === 3).length === 2
    && PIECES.filter(p => p.size === 4).length === 5
    && PIECES.filter(p => p.size === 5).length === 12);
  t('mảnh 1 ô chỉ có 1 hướng', ORIENTS.p1.length === 1);
  t('mảnh O4 (2×2) chỉ có 1 hướng', ORIENTS.o4.length === 1);
  t('mảnh X chỉ có 1 hướng', ORIENTS.x.length === 1);
  t('mảnh 2 ô có 2 hướng', ORIENTS.p2.length === 2);
  t('mảnh I3 có 2 hướng', ORIENTS.i3.length === 2);
  t('mảnh F có 8 hướng', ORIENTS.f.length === 8);
  t('mọi hướng đều đủ số ô và không trùng ô', Object.values(ORIENTS).every(list =>
    list.every(o => o.cells.length > 0 && new Set(o.cells.map(c => c.join(','))).size === o.cells.length)));
}

/* ---------- 1. mảnh đầu tiên phải phủ góc ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 1 });
  const r1 = applyAction(s, 'p1', { type: 'place', color: 0, piece: 'p2', rot: 0, flip: false, r: 0, c: 1 });
  t('mảnh đầu không phủ góc thì bị từ chối', !r1.ok);
  const r2 = applyAction(s, 'p1', { type: 'place', color: 0, piece: 'p2', rot: 0, flip: false, r: 0, c: 0 });
  t('mảnh đầu phủ góc thì được đặt', r2.ok);
  t('sau khi đặt, ô góc thuộc màu đỏ', s.board[0] === 0);
  t('ghế đỏ còn 20 mảnh', s.seats[0].pieces.length === 20);
}

/* ---------- 2. chạm chéo được, chạm cạnh cùng màu bị cấm ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 2 });
  applyAction(s, 'p1', { type: 'place', color: 0, piece: 'p1', rot: 0, flip: false, r: 0, c: 0 });
  /* lượt xanh dương: mảnh đầu phải phủ góc (0,19) */
  const b1 = applyAction(s, 'p2', { type: 'place', color: 1, piece: 'p1', rot: 0, flip: false, r: 0, c: 19 });
  t('xanh dương đặt mảnh đầu ở góc của mình', b1.ok);
  /* lượt vàng (p1): mảnh đầu phải phủ góc (19,19) */
  const y1 = applyAction(s, 'p1', { type: 'place', color: 2, piece: 'p1', rot: 0, flip: false, r: 19, c: 19 });
  t('vàng đặt mảnh đầu ở góc của mình', y1.ok);
  /* lượt xanh lá (p2): mảnh đầu phải phủ góc (19,0) */
  const g1 = applyAction(s, 'p2', { type: 'place', color: 3, piece: 'p1', rot: 0, flip: false, r: 19, c: 0 });
  t('xanh lá đặt mảnh đầu ở góc của mình', g1.ok);
  /* lượt đỏ: đặt domino chạm CHÉO ô (0,0) tại (1,1)-(1,2) */
  const r2 = applyAction(s, 'p1', { type: 'place', color: 0, piece: 'p2', rot: 0, flip: false, r: 1, c: 1 });
  t('mảnh chạm chéo ô cùng màu thì được đặt', r2.ok);
  /* lượt xanh dương: đặt domino chạm CẠNH ô (0,19) tại (0,17)-(0,18) */
  const b2 = applyAction(s, 'p2', { type: 'place', color: 1, piece: 'p2', rot: 0, flip: false, r: 0, c: 17 });
  t('mảnh chạm cạnh ô cùng màu thì bị từ chối', !b2.ok);
}

/* ---------- 3. chạm cạnh màu khác thì được ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 3 });
  putCells(s, 0, [[5, 5]]);          /* đỏ ở (5,5) */
  putCells(s, 1, [[4, 8]]);          /* xanh dương ở (4,8) */
  /* đỏ đặt domino ở (4,6)-(4,7): (4,6) chạm chéo đỏ (5,5); (4,7) chạm
     cạnh xanh dương (4,8) — được phép vì khác màu */
  const chk = validatePlacement(s, 0, 'p2', 0, false, 4, 6);
  t('mảnh chạm cạnh màu khác nhưng chạm chéo cùng màu thì hợp lệ', chk.ok);
  const r = applyAction(s, 'p1', { type: 'place', color: 0, piece: 'p2', rot: 0, flip: false, r: 4, c: 6 });
  t('đặt được mảnh chạm cạnh màu khác', r.ok);
}

/* ---------- 4. xoay + lật ---------- */
{
  const l5a = orientCells('l5', 0, false);
  const l5b = orientCells('l5', 1, false);
  t('xoay 90° đổi hình dạng mảnh L5', JSON.stringify(l5a) !== JSON.stringify(l5b));
  t('xoay 4 lần về lại hình gốc', JSON.stringify(orientCells('l5', 4, false)) === JSON.stringify(l5a));
  const fa = orientCells('f', 0, false);
  const fb = orientCells('f', 0, true);
  t('lật mảnh F đổi hình dạng', JSON.stringify(fa) !== JSON.stringify(fb));
  t('mảnh sau xoay/lật vẫn đủ 5 ô', l5b.length === 5 && fb.length === 5);
  /* đặt L5 xoay 90° ở góc đỏ: hộp bao 2 hàng × 4 cột, phủ (0,0) */
  const s = createGame(P(['A', 'B']), { seed: 4 });
  const r = applyAction(s, 'p1', { type: 'place', color: 0, piece: 'l5', rot: 1, flip: false, r: 0, c: 0 });
  t('đặt được L5 đã xoay 90° ở góc', r.ok);
  /* đặt F đã lật ở góc xanh dương: tìm 1 nước F-lật phủ góc trong danh
     sách nước hợp lệ rồi đánh đúng nước đó */
  const fFlip = legalPlacements(s, 1).find(a => a.piece === 'f' && a.flip === true);
  t('có nước đặt F đã lật phủ góc xanh dương', !!fFlip);
  const r2 = fFlip ? applyAction(s, 'p2', { type: 'place', color: 1, piece: 'f', rot: fFlip.rot, flip: true, r: fFlip.r, c: fFlip.c }) : { ok: false };
  t('đặt được F đã lật ở góc xanh dương', r2.ok);
}

/* ---------- 5. chồng ô / ngoài bàn / dùng lại mảnh / sai màu / sai lượt ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 5 });
  applyAction(s, 'p1', { type: 'place', color: 0, piece: 'p1', rot: 0, flip: false, r: 0, c: 0 });
  applyAction(s, 'p2', { type: 'place', color: 1, piece: 'p1', rot: 0, flip: false, r: 0, c: 19 });
  applyAction(s, 'p1', { type: 'place', color: 2, piece: 'p1', rot: 0, flip: false, r: 19, c: 19 });
  applyAction(s, 'p2', { type: 'place', color: 3, piece: 'p1', rot: 0, flip: false, r: 19, c: 0 });
  /* tới lượt đỏ: đặt chồng lên ô (0,0) đã có quân */
  const o = applyAction(s, 'p1', { type: 'place', color: 0, piece: 'p2', rot: 0, flip: false, r: 0, c: 0 });
  t('đặt chồng lên ô đã có quân thì bị từ chối', !o.ok);
  /* đặt lòi ra ngoài bàn (hàng 17, mảnh I5 dọc dài 5 ô -> tới hàng 21) */
  const ob = validatePlacement(s, 0, 'i5', 1, false, 17, 5);
  t('đặt lòi ra ngoài bàn thì bị từ chối', !ob.ok);
  /* dùng lại mảnh p1 đã đặt rồi */
  const reuse = validatePlacement(s, 0, 'p1', 0, false, 1, 1);
  t('dùng lại mảnh đã đặt thì bị từ chối', !reuse.ok);
  /* đặt sai màu của lượt (lượt đỏ mà đặt màu xanh dương) */
  const wrong = applyAction(s, 'p1', { type: 'place', color: 1, piece: 'p2', rot: 0, flip: false, r: 1, c: 1 });
  t('đặt sai màu của lượt thì bị từ chối', !wrong.ok);
  /* người chưa tới lượt không được đi */
  const noturn = applyAction(s, 'p2', { type: 'place', color: 0, piece: 'p2', rot: 0, flip: false, r: 1, c: 1 });
  t('người chưa tới lượt không được đi', !noturn.ok);
}

/* ---------- 6. ghế 2 người: mỗi người 2 màu, luân phiên ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 6 });
  t('2 người có 4 ghế', s.seats.length === 4);
  t('p1 chơi màu đỏ + vàng', JSON.stringify(s.players[0].colors) === JSON.stringify([0, 2]));
  t('p2 chơi màu xanh dương + xanh lá', JSON.stringify(s.players[1].colors) === JSON.stringify([1, 3]));
  t('lượt đầu là p1 (màu đỏ)', actors(s)[0] === 'p1' && s.seats[s.turnSeat].color === 0);
  applyAction(s, 'p1', { type: 'place', color: 0, piece: 'p1', rot: 0, flip: false, r: 0, c: 0 });
  t('lượt 2 là p2 (màu xanh dương)', actors(s)[0] === 'p2' && s.seats[s.turnSeat].color === 1);
  applyAction(s, 'p2', { type: 'place', color: 1, piece: 'p1', rot: 0, flip: false, r: 0, c: 19 });
  t('lượt 3 lại là p1 nhưng màu vàng', actors(s)[0] === 'p1' && s.seats[s.turnSeat].color === 2);
  applyAction(s, 'p1', { type: 'place', color: 2, piece: 'p1', rot: 0, flip: false, r: 19, c: 19 });
  t('lượt 4 là p2 màu xanh lá', actors(s)[0] === 'p2' && s.seats[s.turnSeat].color === 3);
  const s3 = createGame(P(['A', 'B', 'C']), { seed: 6 });
  t('3 người có 3 ghế', s3.seats.length === 3);
  const s4 = createGame(P(['A', 'B', 'C', 'D']), { seed: 6 });
  t('4 người có 4 ghế, mỗi người 1 màu', s4.seats.length === 4 && s4.players.every(p => p.colors.length === 1));
}

/* ---------- 7. bỏ lượt + kết thúc khi mọi ghế đều bỏ ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 7 });
  /* hết mảnh ở mọi ghế -> không còn nước đặt nào */
  for (const seat of s.seats) seat.pieces = [];
  t('hết mảnh thì không còn nước đặt', legalPlacements(s, 0).length === 0);
  const p1 = applyAction(s, 'p1', { type: 'pass' });
  t('bỏ lượt được chấp nhận', p1.ok && s.phase === 'playing');
  applyAction(s, 'p2', { type: 'pass' });
  applyAction(s, 'p1', { type: 'pass' });
  const p4 = applyAction(s, 'p2', { type: 'pass' });
  t('4 ghế bỏ lượt liên tiếp thì trận kết thúc', p4.ok && s.phase === 'ended');
  t('lý do kết thúc là match', s.endReason === 'match' && s.endCause === 'match');
  t('có người thắng + người thua', !!s.winner && s.losers.length === 1);
  t('sau khi kết thúc không đi được nữa', !applyAction(s, 'p1', { type: 'pass' }).ok);
}

/* ---------- 8. điểm + thưởng ---------- */
{
  /* +15: đặt hết 21 mảnh, mảnh cuối không phải 1 ô */
  const s = createGame(P(['A', 'B']), { seed: 8 });
  const seat = s.seats[0];
  seat.pieces = ['i3'];
  seat.placed = 20;
  seat.squares = 86;
  putCells(s, 0, [[1, 1]]); /* đỏ đã có ô ở (1,1) để mảnh mới chạm chéo */
  seat.placed = 20; seat.squares = 86; /* putCells đã cộng, đặt lại cho chắc */
  const r = applyAction(s, 'p1', { type: 'place', color: 0, piece: 'i3', rot: 0, flip: false, r: 0, c: 2 });
  t('đặt mảnh cuối (I3) hợp lệ', r.ok);
  t('đặt hết 21 mảnh thì thưởng +15', seat.bonus === 15);
  t('điểm màu = 89 − 89 + 15 = 15', scoreOfSeat(seat) === 15);

  /* +20: mảnh cuối là mảnh 1 ô */
  const s2 = createGame(P(['A', 'B']), { seed: 8 });
  const seat2 = s2.seats[0];
  seat2.pieces = ['p1'];
  seat2.placed = 20;
  seat2.squares = 88;
  putCells(s2, 0, [[1, 1]]);
  seat2.placed = 20; seat2.squares = 88;
  const r2 = applyAction(s2, 'p1', { type: 'place', color: 0, piece: 'p1', rot: 0, flip: false, r: 0, c: 0 });
  t('đặt mảnh 1 ô cuối cùng hợp lệ', r2.ok);
  t('mảnh cuối là 1 ô thì thưởng +20', seat2.bonus === 20);
  t('điểm màu = 89 − 89 + 20 = 20', scoreOfSeat(seat2) === 20);

  /* điểm người chơi = tổng các màu; chưa đặt gì thì −89/màu */
  const s3 = createGame(P(['A', 'B']), { seed: 8 });
  t('chưa đặt gì: điểm p1 = −89 × 2 màu = −178', playerScore(s3, 'p1') === -178);
}

/* ---------- 9. xin thua ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 9 });
  applyAction(s, 'p1', { type: 'place', color: 0, piece: 'p1', rot: 0, flip: false, r: 0, c: 0 });
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('xin thua được chấp nhận', r.ok && s.phase === 'ended');
  t('lý do kết thúc là resign', s.endReason === 'resign' && s.endCause === 'resign');
  t('người xin thua không thắng', s.winner !== 'p2' && s.losers.includes('p2'));
  t('người thắng là người còn lại', ['p1', 'p3'].includes(s.winner));
}

/* ---------- 10. viewFor giấu seed, không có trường you ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 10 });
  const v = viewFor(s, 'p1');
  const json = JSON.stringify(v);
  t('viewFor không lộ _seed/_rng', !json.includes('_seed') && !json.includes('_rng') && !json.includes('20261120'));
  t('viewFor không có trường you', !('you' in v) && !json.includes('"you"'));
  t('viewFor có me', v.me === 'p1');
  t('viewFor có đủ 400 ô bàn', Array.isArray(v.board) && v.board.length === 400);
  t('viewFor có đủ ghế + mảnh còn lại', v.seats.length === 4 && v.seats[0].pieces.length === 21);
  const bad = deserialize(serialize(s));
  t('serialize/deserialize giữ nguyên bàn', JSON.stringify(bad.board) === JSON.stringify(s.board));
  let threw = false;
  try { deserialize({ players: [] }); } catch (e) { threw = true; }
  t('deserialize trạng thái hỏng thì ném lỗi', threw);
}

/* ---------- 11. legalPlacements: nước đầu chỉ phủ góc ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 11 });
  const list = legalPlacements(s, 0);
  t('màu đỏ mới vào có nước đặt', list.length > 0);
  t('mọi nước đầu đều phủ góc (0,0)', list.every(a => {
    const cells = orientCells(a.piece, a.rot, a.flip).map(([dr, dc]) => [a.r + dr, a.c + dc]);
    return cells.some(([r, c]) => r === 0 && c === 0);
  }));
  t('mọi nước liệt kê đều hợp lệ khi kiểm lại', list.every(a =>
    validatePlacement(s, a.color, a.piece, a.rot, a.flip, a.r, a.c).ok));
}

console.log(`\nLuật Blokus: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
