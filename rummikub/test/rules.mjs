// Luật Rummikub: bộ hợp lệ, mở bài ≥30, thao tác bàn, phạt rút 3,
// rút bài, thắng/hết bài, tính điểm, xin thua, chồng hết, viewFor.
// Chạy: node rummikub/test/rules.mjs
import {
  createGame, applyAction, viewFor, actors, meldInfo, validateTable,
  validatePlayTable, tileValue, handValue, mulberry32,
  MIN_PLAYERS, MAX_PLAYERS, HAND_CARDS, INITIAL_MIN, DECK_SIZE,
} from '../js/engine.js';

/* gieo hạt cho Math.random để mọi assert thống kê ổn định */
const _rng = mulberry32(20261120);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
/* ván mới rồi gán tay bài / bàn / chồng theo ý muốn (state là dữ liệu thuần) */
function rigged(hand0, table = [], deck = ['R1-0', 'R2-0', 'R3-0', 'B1-0', 'B2-0', 'B3-0', 'O1-0', 'O2-0', 'O3-0', 'K1-0']) {
  const s = createGame(P(['A', 'B', 'C', 'D']), { seed: 42 });
  s.players[0].hand = hand0.slice();
  s.table = table.map(m => m.slice());
  s.deck = deck.slice();
  s.turnIdx = 0;
  return s;
}

/* ---------- 0. bộ bài ---------- */
{
  const s = createGame(P(['A', 'B']), { seed: 7 });
  t('2 người: mỗi người 14 lá', s.players.every(p => p.hand.length === HAND_CARDS));
  t('106 lá: chồng còn 106 - 28 = 78 lá', s.deck.length === DECK_SIZE - 2 * HAND_CARDS);
  const all = s.players.flatMap(p => p.hand).concat(s.deck);
  t('đủ 106 lá, không trùng id', all.length === DECK_SIZE && new Set(all).size === DECK_SIZE);
  const s4 = createGame(P(['A', 'B', 'C', 'D']), { seed: 7 });
  t('4 người: chồng còn 106 - 56 = 50 lá', s4.deck.length === DECK_SIZE - 4 * HAND_CARDS);
  let threw = false;
  try { createGame(P(['A']), { seed: 1 }); } catch (e) { threw = true; }
  t('1 người thì từ chối tạo ván', threw);
  threw = false;
  try { createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 1 }); } catch (e) { threw = true; }
  t('5 người thì từ chối tạo ván', threw);
  t('MIN/MAX người chơi là 2/4', MIN_PLAYERS === 2 && MAX_PLAYERS === 4);
}

/* ---------- 1. meldInfo: dãy ---------- */
{
  t('dãy 3 lá cùng màu liên tiếp hợp lệ', meldInfo(['R5-0', 'R6-0', 'R7-0']).valid);
  t('dãy 5 lá hợp lệ, đúng loại run', meldInfo(['B9-0', 'B10-0', 'B11-0', 'B12-0', 'B13-0']).kind === 'run');
  t('dãy lệch màu không hợp lệ', !meldInfo(['R5-0', 'B6-0', 'R7-0']).valid);
  t('dãy thiếu số (5,7,8) không hợp lệ', !meldInfo(['R5-0', 'R7-0', 'R8-0']).valid);
  t('dãy trùng số không hợp lệ', !meldInfo(['R5-0', 'R5-1', 'R6-0']).valid);
  t('2 lá không thành bộ', !meldInfo(['R5-0', 'R6-0']).valid);
  t('dãy 13 lá (1–13) hợp lệ', meldInfo(Array.from({ length: 13 }, (_, i) => `K${i + 1}-0`)).valid);
  t('dãy 14 lá không hợp lệ (quá 13)', !meldInfo([...Array.from({ length: 13 }, (_, i) => `K${i + 1}-0`), 'K1-1']).valid);
  t('giá trị dãy 5+6+7 = 18', meldInfo(['R5-0', 'R6-0', 'R7-0']).value === 18);
}

/* ---------- 2. meldInfo: nhóm ---------- */
{
  t('nhóm 3 màu cùng số hợp lệ', meldInfo(['R5-0', 'B5-0', 'O5-0']).valid);
  t('nhóm 4 màu hợp lệ, đúng loại group', meldInfo(['R9-0', 'B9-0', 'O9-0', 'K9-0']).kind === 'group');
  t('nhóm 5 lá không hợp lệ (tối đa 4 màu)', !meldInfo(['R5-0', 'B5-0', 'O5-0', 'K5-0', 'R5-1']).valid);
  t('nhóm trùng màu không hợp lệ', !meldInfo(['R5-0', 'R5-1', 'B5-0']).valid);
  t('nhóm khác số không hợp lệ', !meldInfo(['R5-0', 'B6-0', 'O5-0']).valid);
  t('giá trị nhóm 9×3 = 27', meldInfo(['R9-0', 'B9-0', 'O9-0']).value === 27);
}

/* ---------- 3. meldInfo: joker ---------- */
{
  t('joker lấp giữa dãy (5, J, 7) hợp lệ', meldInfo(['R5-0', 'J-0', 'R7-0']).valid);
  t('joker nối dài dãy (11, 12, J) hợp lệ', meldInfo(['R11-0', 'R12-0', 'J-0']).valid);
  t('joker trong nhóm (5 đỏ, 5 xanh, J) hợp lệ', meldInfo(['R5-0', 'B5-0', 'J-0']).valid);
  t('2 joker + 1 lá thật hợp lệ', meldInfo(['R8-0', 'J-0', 'J-1']).valid);
  t('chỉ toàn joker không hợp lệ', !meldInfo(['J-0', 'J-1', 'J-0']).valid);
  t('joker + 1 lá thật không thành bộ', !meldInfo(['R5-0', 'J-0']).valid);
  t('joker trong dãy tính theo số còn thiếu cao nhất: 10+11+J=33', meldInfo(['R10-0', 'R11-0', 'J-0']).value === 33);
  t('joker ở dãy 9+10+J tính J=11 được 30 điểm', meldInfo(['R9-0', 'R10-0', 'J-0']).value === 30);
  t('joker trong nhóm tính theo số nhóm: 9×3=27', meldInfo(['R9-0', 'B9-0', 'J-0']).value === 27);
  t('joker không cứu được dãy lệch màu', !meldInfo(['R5-0', 'B6-0', 'J-0']).valid);
  t('giá trị joker khi tính điểm bài = 30', tileValue('J-0') === 30);
  t('tổng bài trên tay tính joker = 30', handValue(['R5-0', 'J-0']) === 35);
}

/* ---------- 4. mở bài ≥30 ---------- */
{
  const s = rigged(['R10-0', 'R11-0', 'R12-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0']);
  const r = applyAction(s, 'p1', { type: 'play', table: [['R10-0', 'R11-0', 'R12-0']] });
  t('mở bài dãy 10+11+12 = 33 điểm: được', r.ok && !r.penalized);
  t('mở bài xong thì melded = true', s.players[0].melded === true);
  t('đánh 3 lá xong tay còn 11 lá', s.players[0].hand.length === 11);
  t('lượt chuyển sang người tiếp theo', s.turnIdx === 1);
}
{
  const s = rigged(['R5-0', 'R6-0', 'R7-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0']);
  const before = s.players[0].hand.length;
  const r = applyAction(s, 'p1', { type: 'play', table: [['R5-0', 'R6-0', 'R7-0']] });
  t('mở bài dãy 5+6+7 = 18 điểm (< 30): bị phạt chứ không báo lỗi hành động', r.ok && r.penalized === true);
  t('phạt rút 3 lá: tay tăng 3 lá', s.players[0].hand.length === before + 3);
  t('bị phạt thì lượt vẫn chuyển đi', s.turnIdx === 1);
  t('bị phạt thì chưa được tính là mở bài', s.players[0].melded === false);
  t('lý do phạt nhắc tới 30 điểm', /30/.test(r.reason || ''));
}
{
  const s = rigged(['R10-0', 'R11-0', 'J-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0']);
  const r = applyAction(s, 'p1', { type: 'play', table: [['R10-0', 'R11-0', 'J-0']] });
  t('mở bài bằng joker 10+11+J(=12) = 33 điểm: được', r.ok && !r.penalized);
}
{
  /* chưa mở bài thì không được động vào bộ trên bàn:
     thêm B8 vào dãy xanh (hợp lệ) + mở dãy đỏ 33 điểm — vẫn sai vì
     đã động vào bộ cũ trước khi mở bài */
  const s = rigged(
    ['R10-0', 'R11-0', 'R12-0', 'B8-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0'],
    [['B5-0', 'B6-0', 'B7-0']],
  );
  const r = applyAction(s, 'p1', { type: 'play', table: [['B5-0', 'B6-0', 'B7-0', 'B8-0'], ['R10-0', 'R11-0', 'R12-0']] });
  t('chưa mở bài mà thêm lá vào bộ trên bàn: bị phạt', r.ok && r.penalized === true);
  t('lý do phạt là chưa được thao tác bộ trên bàn', /thao tác bộ trên bàn/.test(r.reason || ''));
}

/* ---------- 5. thao tác bàn sau khi mở bài ---------- */
{
  /* thêm lá vào dãy có sẵn */
  const s = rigged(['R8-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0', 'O5-0', 'K6-0'],
    [['R5-0', 'R6-0', 'R7-0']]);
  s.players[0].melded = true;
  const r = applyAction(s, 'p1', { type: 'play', table: [['R5-0', 'R6-0', 'R7-0', 'R8-0']] });
  t('đã mở bài: thêm lá vào dãy được', r.ok && !r.penalized);
  t('bàn có dãy 4 lá sau khi thêm', s.table[0].length === 4);
}
{
  /* tách dãy dài thành 2 dãy + thêm lá */
  const s = rigged(['R2-0', 'R9-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0', 'O5-0', 'K6-0'],
    [['R3-0', 'R4-0', 'R5-0', 'R6-0', 'R7-0', 'R8-0']]);
  s.players[0].melded = true;
  const r = applyAction(s, 'p1', { type: 'play', table: [['R2-0', 'R3-0', 'R4-0'], ['R5-0', 'R6-0', 'R7-0', 'R8-0', 'R9-0']] });
  t('tách dãy 6 lá thành 2 dãy hợp lệ được', r.ok && !r.penalized);
  t('sau khi tách bàn có 2 bộ', s.table.length === 2);
}
{
  /* chuyển lá giữa các bộ: R7 từ dãy đỏ sang nhóm 7, R3 nối dài dãy đỏ */
  const s = rigged(['R3-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'B4-0', 'O5-0', 'K6-0', 'O6-0'],
    [['R4-0', 'R5-0', 'R6-0', 'R7-0'], ['B7-0', 'O7-0', 'K7-0']]);
  s.players[0].melded = true;
  const r = applyAction(s, 'p1', { type: 'play', table: [['R3-0', 'R4-0', 'R5-0', 'R6-0'], ['B7-0', 'O7-0', 'K7-0', 'R7-0']] });
  t('chuyển R7 từ dãy sang nhóm + nối R3 vào dãy được', r.ok && !r.penalized);
}
{
  /* xếp bàn sai (bộ 2 lá) thì phạt rút 3 */
  const s = rigged(['R8-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0', 'O5-0', 'K6-0'],
    [['R5-0', 'R6-0', 'R7-0']]);
  s.players[0].melded = true;
  const before = s.players[0].hand.length;
  const r = applyAction(s, 'p1', { type: 'play', table: [['R5-0', 'R6-0'], ['R7-0', 'R8-0']] });
  t('xếp bàn sai (bộ 2 lá): bị phạt rút 3', r.ok && r.penalized === true && s.players[0].hand.length === before + 3);
  t('xếp bàn sai: bàn giữ nguyên', s.table.length === 1 && s.table[0].length === 3);
}
{
  /* lấy lá trên bàn về tay là sai */
  const s = rigged(['R8-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0', 'O5-0', 'K6-0'],
    [['R5-0', 'R6-0', 'R7-0']]);
  s.players[0].melded = true;
  const r = applyAction(s, 'p1', { type: 'play', table: [['R5-0', 'R6-0', 'R8-0']] });
  t('bỏ lá R7 khỏi bàn (lấy về tay): bị phạt', r.ok && r.penalized === true);
}
{
  /* đánh lá không có trên tay */
  const s = rigged(['R8-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0', 'O5-0', 'K6-0'],
    [['R5-0', 'R6-0', 'R7-0']]);
  s.players[0].melded = true;
  const r = applyAction(s, 'p1', { type: 'play', table: [['R5-0', 'R6-0', 'R7-0', 'R9-0']] });
  t('đánh lá không có trên tay: bị phạt', r.ok && r.penalized === true);
  t('không đánh lá nào (gửi bàn cũ nguyên): bị phạt', (() => {
    const r2 = applyAction(s, 'p2', { type: 'play', table: [['R5-0', 'R6-0', 'R7-0']] });
    return r2.ok && r2.penalized === true;
  })());
}

/* ---------- 6. rút bài ---------- */
{
  const s = rigged(['R8-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0', 'O5-0', 'K6-0']);
  const deckBefore = s.deck.length;
  const r = applyAction(s, 'p1', { type: 'draw' });
  t('rút 1 lá được', r.ok);
  t('rút xong tay 15 lá, chồng giảm 1', s.players[0].hand.length === 15 && s.deck.length === deckBefore - 1);
  t('rút xong chuyển lượt', s.turnIdx === 1);
  t('rút không tính là mở bài', s.players[0].melded === false);
  const r2 = applyAction(s, 'p1', { type: 'draw' });
  t('chưa tới lượt mà rút thì bị từ chối', !r2.ok);
}

/* ---------- 7. thắng khi hết bài + tính điểm ---------- */
{
  const s = rigged(['R10-0', 'R11-0', 'R12-0']);
  /* tay đối thủ: B còn R1+R2 (=3 điểm), C còn 1 joker (=30), D còn K13 (=13) */
  s.players[1].hand = ['R1-0', 'R2-0'];
  s.players[2].hand = ['J-0'];
  s.players[3].hand = ['K13-0'];
  const r = applyAction(s, 'p1', { type: 'play', table: [['R10-0', 'R11-0', 'R12-0']] });
  t('đánh hết bài thì thắng', r.ok && s.phase === 'ended' && s.winner === 'p1');
  t('endReason match, endCause empty-hand', s.endReason === 'match' && s.endCause === 'empty-hand');
  t('người thắng được 3+30+13 = 46 điểm', s.final.summary.p1.score === 46);
  t('người thua bị trừ đúng bài còn lại (B -3, C -30, D -13)',
    s.final.summary.p2.score === -3 && s.final.summary.p3.score === -30 && s.final.summary.p4.score === -13);
  t('summary có đủ 4 người với tilesLeft/score/meldsPlayed/jokersPlayed/turns',
    ['p1', 'p2', 'p3', 'p4'].every(id => {
      const x = s.final.summary[id];
      return x && typeof x.tilesLeft === 'number' && typeof x.score === 'number'
        && typeof x.meldsPlayed === 'number' && typeof x.jokersPlayed === 'number' && typeof x.turns === 'number';
    }));
  t('người thắng tilesLeft = 0, meldsPlayed = 3', s.final.summary.p1.tilesLeft === 0 && s.final.summary.p1.meldsPlayed === 3);
  t('final.scores xếp theo điểm giảm dần, đầu là người thắng', s.final.scores[0].id === 'p1' && s.final.scores[0].score === 46);
  t('trận xong thì mọi hành động đều bị từ chối', !applyAction(s, 'p2', { type: 'draw' }).ok);
}

/* ---------- 8. xin thua ---------- */
{
  const s = rigged(['R8-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0', 'O5-0', 'K6-0']);
  s.players[1].hand = ['R1-0']; /* B chỉ còn 1 điểm bài */
  s.players[2].hand = ['R5-0', 'R6-0']; /* C còn 11 điểm */
  s.players[3].hand = ['K13-0', 'K12-0']; /* D còn 25 điểm */
  const r = applyAction(s, 'p1', { type: 'resign' });
  t('xin thua kết thúc trận ngay', r.ok && s.phase === 'ended' && s.endReason === 'resign');
  t('người còn lại ít điểm bài nhất (B, 1 điểm) thắng', s.winner === 'p2');
  t('điểm thắng khi xin thua = tổng bài còn lại của mọi người khác (51+11+25=87)', s.final.summary.p2.score === 87);
}

/* ---------- 9. chồng hết ---------- */
{
  const s = rigged(['R8-0', 'B1-0', 'B2-0', 'O3-0', 'K4-0', 'R1-0', 'R2-0', 'B3-0', 'O4-0', 'K5-0', 'R3-0', 'B4-0', 'O5-0', 'K6-0'], [], []);
  s.players[1].hand = ['R1-0'];
  s.players[2].hand = ['R5-0', 'R6-0'];
  s.players[3].hand = ['K13-0'];
  const r = applyAction(s, 'p1', { type: 'draw' });
  t('chồng hết mà rút: trận kết thúc', r.ok && s.phase === 'ended');
  t('chồng hết: endCause pool-empty', s.endCause === 'pool-empty');
  t('chồng hết: người ít điểm bài nhất (B, 1 điểm) thắng', s.winner === 'p2');
}

/* ---------- 10. actors + viewFor ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 11 });
  t('actors chỉ có người tới lượt', actors(s).length === 1 && actors(s)[0] === 'p1');
  const v = viewFor(s, 'p1');
  t('viewFor: thấy bài của mình (14 lá)', v.players[0].hand.length === 14);
  t('viewFor: không thấy bài đối thủ (mảng rỗng)', v.players[1].hand.length === 0 && v.players[2].hand.length === 0);
  t('viewFor: chỉ thấy số lá còn trong chồng, không thấy thứ tự chồng', typeof v.deckCount === 'number' && !('deck' in v));
  t('viewFor: không lộ seed', !('seed' in v) && !('_seed' in v));
  t('viewFor: không có trường you', !('you' in v));
  t('viewFor: có trường me', v.me === 'p1');
  const vEnd = viewFor({ ...s, phase: 'ended' }, 'p1');
  t('viewFor: trận xong thì thấy hết bài mọi người', vEnd.players.every(p => p.hand.length > 0));
  const s2 = createGame(P(['A', 'B']), { seed: 11 });
  applyAction(s2, 'p1', { type: 'draw' });
  t('actors sau 1 lượt là người tiếp theo', actors(s2)[0] === 'p2');
  applyAction(s2, 'p2', { type: 'resign' });
  t('actors khi trận xong là rỗng', actors(s2).length === 0);
}

/* ---------- 11. validateTable ---------- */
{
  t('validateTable: bàn rỗng hợp lệ', validateTable([]));
  t('validateTable: 2 bộ hợp lệ thì hợp lệ', validateTable([['R5-0', 'R6-0', 'R7-0'], ['B9-0', 'O9-0', 'K9-0']]));
  t('validateTable: 1 bộ sai thì cả bàn sai', !validateTable([['R5-0', 'R6-0', 'R7-0'], ['B9-0', 'O9-0']]));
}

console.log(`\nLuật Rummikub: ${pass} pass, ${fail} fail.`);
process.exit(fail ? 1 : 0);
