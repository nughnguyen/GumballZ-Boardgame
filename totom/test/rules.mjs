// 🀄 Test luật Tổ Tôm — chạy: node totom/test/rules.mjs (từ thư mục gốc của repo)
//
// NGUỒN LUẬT (đã tra cứu trước khi code — xem engine.js):
// - Wikipedia "Tổ tôm": bộ 120 lá (30 loại × 4), 4–5 người, mỗi người 20 lá,
//   nọc 20 lá (5 người), phu dọc / phu bí / phu yêu / trùng tam / thiên khai,
//   lưng, ù, chíu, ăn, tôm/lèo/thập điều/bạch định/kính cụ/chi nảy/ù suông.
// - hocchoi.org "Tổ Tôm": phu yêu = Nhất Vạn + Nhất Văn + Nhất Sách +
//   Chi Chi + Thang Thang + Ông Cụ; 6 phu đặc biệt 3 lá.
// - to-tom.com / zowin.co: luật ù (21 lá, lưng), chíu, ăn, nọc, số người.
import {
  createGame, applyAction, viewFor, legalMoves, actors, serialize, deserialize,
  typeOf, rankOf, suitOf, isYeuType, isRedType, isRedCard, typeName, cardName,
  isPhu, isTom, isLeo, isSpecialTriple, isLung, candidatePhu, partition21, canUu,
  greedyCover, eatPairs, canPairWith, computeCuoc, CUOC_NAMES,
  MIN_PLAYERS, MAX_PLAYERS, HAND_SIZE, WIN_SIZE, NOCOL_5, NOCOL_4, SUITS,
} from '../js/engine.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n); } };
const eq = (n, a, b) => t(n, JSON.stringify(a) === JSON.stringify(b));
const mkPlayers = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'Người ' + (i + 1) }));

/* ---------- 0. bộ bài ---------- */
{
  const s = createGame(mkPlayers(5), { seed: 20261120 });
  const all = s.players.flatMap(p => p.hand).concat(s.nocol);
  t('bộ bài đủ 120 lá', all.length === 120);
  const byType = {};
  for (const c of all) byType[typeOf(c)] = (byType[typeOf(c)] || 0) + 1;
  t('30 loại quân', Object.keys(byType).length === 30);
  t('mỗi loại đúng 4 lá', Object.values(byType).every(n => n === 4));
  t('28 lá đỏ', all.filter(isRedCard).length === 28);
  t('92 lá đen', all.filter(c => !isRedCard(c)).length === 92);
  t('3 chất × số 1–9 = 27 loại + 3 quân yêu', SUITS.length === 3 && Object.keys(byType).filter(k => ['CC', 'TT', 'OC'].includes(k)).length === 3);
  t('7 loại lá đỏ: CC, TT, OC, V8, V9, S8, S9', ['CC', 'TT', 'OC', 'V8', 'V9', 'S8', 'S9'].every(isRedType) && !isRedType('W9') && !isRedType('V1'));
}

/* ---------- 1. chia bài ---------- */
{
  const s5 = createGame(mkPlayers(5), { seed: 7 });
  eq('5 người: tay 21/20/20/20/20', s5.players.map(p => p.hand.length), [21, 20, 20, 20, 20]);
  t('5 người: nọc 19 lá', s5.nocol.length === NOCOL_5);
  t('5 người: người cái đi trước, bước đầu là đánh bài', s5.turnIdx === 0 && s5.step === 'discard');
  const s4 = createGame(mkPlayers(4), { seed: 7 });
  eq('4 người: tay 21/20/20/20', s4.players.map(p => p.hand.length), [21, 20, 20, 20]);
  t('4 người: nọc 39 lá', s4.nocol.length === NOCOL_4);
  let threw = false;
  try { createGame(mkPlayers(3), { seed: 1 }); } catch (e) { threw = true; }
  t('3 người thì báo lỗi', threw);
  threw = false;
  try { createGame(mkPlayers(6), { seed: 1 }); } catch (e) { threw = true; }
  t('6 người thì báo lỗi', threw);
  t('MIN/MAX người là 4/5', MIN_PLAYERS === 4 && MAX_PLAYERS === 5);
  t('mỗi người 20 lá, ù cần 21 lá', HAND_SIZE === 20 && WIN_SIZE === 21);
}

/* ---------- 2. nhận mặt quân bài ---------- */
{
  t('typeOf/rankOf/suitOf Tam Vạn', typeOf('V3-2') === 'V3' && rankOf('V3') === 3 && suitOf('V3') === 'V');
  t('Chi Chi không có chất, số 0', suitOf('CC') === null && rankOf('CC') === 0);
  t('Thang Thang / Ông Cụ không có chất', suitOf('TT') === null && suitOf('OC') === null);
  t('tên quân: Nhất Vạn / Chi Chi / Thang Thang / Ông Cụ',
    typeName('V1') === 'Nhất Vạn' && typeName('CC') === 'Chi Chi' && typeName('TT') === 'Thang Thang' && typeName('OC') === 'Ông Cụ');
  t('tên lá có bản: Cửu Sách', cardName('S9-2') === 'Cửu Sách');
  t('6 lá yêu: V1, W1, S1, CC, TT, OC', ['V1', 'W1', 'S1', 'CC', 'TT', 'OC'].every(isYeuType) && !isYeuType('V2'));
}

/* ---------- 3. phu dọc ---------- */
{
  t('phu dọc 3 lá cùng chất liên tiếp', isPhu(['V3-1', 'V4-2', 'V5-3']));
  t('phu dọc 4 lá', isPhu(['W2-1', 'W3-2', 'W4-3', 'W5-4']));
  t('phu dọc 5 lá', isPhu(['S1-1', 'S2-2', 'S3-3', 'S4-4', 'S5-1']));
  t('không phải phu dọc: thiếu 1 lá', !isPhu(['V3-1', 'V4-2']));
  t('không phải phu dọc: số không liên tiếp', !isPhu(['V3-1', 'V4-2', 'V6-3']));
  t('không phải phu dọc: khác chất', !isPhu(['V3-1', 'W4-2', 'S5-3']));
}

/* ---------- 4. phu bí + trùng tam + thiên khai ---------- */
{
  t('phu bí: cùng số, 3 chất khác nhau', isPhu(['V3-1', 'W3-2', 'S3-3']));
  t('không phải phu bí: 2 lá cùng chất', !isPhu(['V3-1', 'W3-2', 'V3-3']));
  t('trùng tam: 3 lá giống hệt', isPhu(['V3-1', 'V3-2', 'V3-3']));
  t('thiên khai: 4 lá giống hệt', isPhu(['V3-1', 'V3-2', 'V3-3', 'V3-4']));
  t('không phải phu: 2 lá giống + 1 lá khác', !isPhu(['V3-1', 'V3-2', 'V4-3']));
}

/* ---------- 5. phu yêu + phu đặc biệt ---------- */
{
  t('phu yêu: 3 lá Nhất (cũng là phu bí)', isPhu(['V1-1', 'W1-2', 'S1-3']));
  t('phu yêu: Chi Chi + Thang Thang + Ông Cụ', isPhu(['CC-1', 'TT-2', 'OC-3']));
  t('phu yêu: Nhất Vạn + Chi Chi + Thang Thang', isPhu(['V1-1', 'CC-2', 'TT-3']));
  t('phu yêu 4 lá', isPhu(['V1-1', 'W1-2', 'CC-3', 'OC-4']));
  t('không phải phu yêu: có lá thường', !isPhu(['V1-1', 'CC-2', 'V2-3']));
  t('tôm: Thất Văn + Tam Sách + Tam Vạn', isPhu(['W7-1', 'S3-2', 'V3-3']) && isTom(['W7-1', 'S3-2', 'V3-3']));
  t('lèo: Chi Chi + Bát Sách + Cửu Vạn', isPhu(['CC-1', 'S8-2', 'V9-3']) && isLeo(['CC-1', 'S8-2', 'V9-3']));
  t('phu đặc biệt: Cửu Văn + Nhất Sách + Nhất Vạn', isPhu(['W9-1', 'S1-2', 'V1-3']) && isSpecialTriple(['W9-1', 'S1-2', 'V1-3']));
  t('phu đặc biệt: Bát Văn + Nhị Sách + Nhị Vạn', isPhu(['W8-1', 'S2-2', 'V2-3']) && isSpecialTriple(['W8-1', 'S2-2', 'V2-3']));
  t('phu đặc biệt: Thang Thang + Cửu Sách + Cửu Vạn', isPhu(['TT-1', 'S9-2', 'V9-3']) && isSpecialTriple(['TT-1', 'S9-2', 'V9-3']));
  t('phu đặc biệt: Thang Thang + Cửu Sách + Ông Cụ', isPhu(['TT-1', 'S9-2', 'OC-3']) && isSpecialTriple(['TT-1', 'S9-2', 'OC-3']));
  t('không phải phu: 3 lá rời rạc', !isPhu(['V3-1', 'W4-2', 'S5-3']));
}

/* ---------- 6. lưng ---------- */
{
  t('lưng: trùng tam', isLung(['V3-1', 'V3-2', 'V3-3']));
  t('lưng: thiên khai', isLung(['V3-1', 'V3-2', 'V3-3', 'V3-4']));
  t('lưng: phu 1-2-3 Văn', isLung(['W1-1', 'W2-2', 'W3-3']));
  t('lưng: tôm', isLung(['W7-1', 'S3-2', 'V3-3']));
  t('lưng: lèo', isLung(['CC-1', 'S8-2', 'V9-3']));
  t('không phải lưng: phu dọc thường', !isLung(['V3-1', 'V4-2', 'V5-3']));
  t('không phải lưng: phu bí thường', !isLung(['V3-1', 'W3-2', 'S3-3']));
  t('không phải lưng: phu yêu thường', !isLung(['CC-1', 'TT-2', 'OC-3']));
}

/* ---------- 7. chia phu + ù ---------- */
{
  /* 21 lá = 7 phu, có lưng (trùng tam V3 + 1-2-3 Văn) */
  const uuHand = [
    'V3-1', 'V3-2', 'V3-3',
    'V4-1', 'V5-1', 'V6-1',
    'W7-1', 'S7-1', 'V7-1',
    'W1-1', 'W2-1', 'W3-1',
    'CC-1', 'TT-1', 'OC-1',
    'S1-1', 'S2-1', 'S3-1',
    'S4-1', 'S5-1', 'S6-1',
  ];
  const part = partition21(uuHand);
  t('chia được 21 lá thành 7 phu', !!part && part.phu.length === 7);
  t('21 lá có lưng thì ù được', canUu(uuHand));
  t('mỗi phu trong phép chia đều hợp lệ', !!part && part.phu.every(isPhu));
  t('phép chia có ít nhất 1 lưng', !!part && part.phu.some(isLung));
  /* 21 lá = 7 phu nhưng KHÔNG có lưng nào (mỗi loại tối đa 2 bản, không
     có lá của 6 phu đặc biệt, không có W1/W2/W3) */
  const noLung = [
    'V4-1', 'V5-1', 'V6-1', 'V4-2', 'V5-2', 'V6-2',
    'W4-1', 'W5-1', 'W6-1', 'W4-2', 'W5-2', 'W6-2',
    'S4-1', 'S5-1', 'S6-1', 'S4-2', 'S5-2', 'S6-2',
    'V7-1', 'V8-1', 'V9-1',
  ];
  const part2 = partition21(noLung);
  t('21 lá không lưng vẫn chia được thành phu', !!part2 && part2.phu.length === 7);
  t('21 lá không lưng thì KHÔNG ù được', !canUu(noLung));
  t('20 lá thì không ù được', !canUu(uuHand.slice(0, 20)));
  t('22 lá thì không ù được', !canUu(uuHand.concat(['V8-1'])));
  /* ù bằng tôm: 6 phu thường + tôm */
  const tomHand = [
    'V4-1', 'V5-1', 'V6-1', 'W4-1', 'W5-1', 'W6-1',
    'S4-1', 'S5-1', 'S6-1', 'V7-1', 'V8-1', 'V9-1',
    'W7-1', 'S3-1', 'V3-1',
    'W1-1', 'W2-1', 'W3-1',
    'S7-1', 'S8-1', 'S9-1',
  ];
  t('bài có tôm thì ù được', canUu(tomHand));
  const part3 = partition21(tomHand);
  t('phép chia bài tôm có chứa phu tôm', !!part3 && part3.phu.some(isTom));
  /* greedyCover: tay 3 chạy dài (V3–V9, W4–W9, S4–S9) + 1 què — greedy ưu
     tiên phu dài nên gộp 3 chạy thành 3 phu dài thay vì nhiều phu 3 lá */
  const gc = greedyCover(['V4-1', 'V5-1', 'V6-1', 'W4-1', 'W5-1', 'W6-1', 'S4-1', 'S5-1', 'S6-1', 'V7-1', 'V8-1', 'V9-1', 'W7-1', 'W8-1', 'W9-1', 'S7-1', 'S8-1', 'S9-1', 'V3-1', 'V3-2']);
  t('greedyCover tách được 3 phu dài, còn 1 què', gc.phu.length === 3 && gc.que.length === 1);
  t('mọi phu trong greedyCover đều hợp lệ', gc.phu.every(isPhu));
}

/* ---------- 8. ăn: tìm cặp ghép phu ---------- */
{
  const hand = ['V3-1', 'V4-1', 'W5-1', 'S5-1', 'V8-1'];
  const pairs = eatPairs(hand, 'V5-1');
  t('ăn V5 bằng V3+V4 (dọc) và W5+S5 (bí): tìm được 2 cặp',
    pairs.length === 2 && pairs.some(p => p.includes('V3-1') && p.includes('V4-1')) && pairs.some(p => p.includes('W5-1') && p.includes('S5-1')));
  t('không có cặp nào ghép được với V9', eatPairs(hand, 'V9-1').length === 0);
  t('canPairWith: V3 ghép được với V5', canPairWith('V5-1', 'V3-1', hand));
  t('canPairWith: W5 ghép được với V5', canPairWith('V5-1', 'W5-1', hand));
  t('canPairWith: V8 không ghép được với V5', !canPairWith('V5-1', 'V8-1', hand));
  /* loại trùng: 2 bản V3 giống nhau chỉ tính 1 cặp */
  const dup = eatPairs(['V3-1', 'V3-2', 'V4-1'], 'V5-1');
  t('2 bản V3 giống nhau chỉ tính 1 cặp ăn', dup.length === 1);
}

/* ---------- 9. cước khi ù ---------- */
{
  const part = { phu: [['V3-1', 'V3-2', 'V3-3'], ['V4-1', 'V5-1', 'V6-1']] };
  const cards21 = [
    'V3-1', 'V3-2', 'V3-3', 'V4-1', 'V5-1', 'V6-1',
    'W4-1', 'W5-1', 'W6-1', 'S4-1', 'S5-1', 'S6-1',
    'V7-1', 'V8-1', 'V9-1', 'W7-1', 'W8-1', 'W9-1',
    'S7-1', 'S8-1', 'S9-1',
  ];
  /* 4 lá đỏ (V8, V9, S8, S9) + trùng tam → khàn + ù suông */
  const cuoc = computeCuoc(cards21, part, 'V3-3', 'draw', { chiuCount: 0 });
  t('ù có trùng tam thì có cước khàn', cuoc.includes('khan'));
  t('ù thường không có cước đặc biệt thì là ù suông', cuoc.includes('suong'));
  t('tên cước có đủ: Thiên ù, Tôm, Lèo, Thập điều, Bạch định, Kính cụ, Chi nảy, Khàn, Ù suông',
    CUOC_NAMES.thien === 'Thiên ù' && CUOC_NAMES.tom === 'Tôm' && CUOC_NAMES.leo === 'Lèo'
    && CUOC_NAMES.thapdo === 'Thập điều' && CUOC_NAMES.bachdinh === 'Bạch định'
    && CUOC_NAMES.kinhcu === 'Kính cụ' && CUOC_NAMES.chinay === 'Chi nảy'
    && CUOC_NAMES.khan === 'Khàn' && CUOC_NAMES.suong === 'Ù suông');
  /* thập điều: 10 lá đỏ trở lên */
  const red10 = ['CC-1', 'TT-1', 'OC-1', 'V8-1', 'V9-1', 'S8-1', 'S9-1', 'CC-2', 'TT-2', 'OC-2',
    'V3-1', 'V3-2', 'V3-3', 'V4-1', 'V5-1', 'V6-1', 'W4-1', 'W5-1', 'W6-1', 'S4-1', 'S5-1'];
  const cuocRed = computeCuoc(red10, part, 'V3-3', 'draw', { chiuCount: 0 });
  t('ù với ≥ 10 lá đỏ thì có thập điều', cuocRed.includes('thapdo'));
  /* bạch định: 0 lá đỏ */
  const noRed = cards21.filter(c => !isRedCard(c));
  t('bộ test bạch định đủ 21 lá đen', noRed.length === 17);
  const black21 = ['V1-1', 'V2-1', 'V3-1', 'V4-1', 'V5-1', 'V6-1', 'V7-1',
    'W1-1', 'W2-1', 'W3-1', 'W4-1', 'W5-1', 'W6-1', 'W7-1',
    'S1-1', 'S2-1', 'S3-1', 'S4-1', 'S5-1', 'S6-1', 'S7-1'];
  const cuocBlack = computeCuoc(black21, part, 'V3-3', 'draw', { chiuCount: 0 });
  t('ù với 0 lá đỏ thì có bạch định', cuocBlack.includes('bachdinh'));
  /* kính cụ: đúng 1 lá đỏ và là Ông Cụ */
  const oneOc = black21.slice(0, 20).concat(['OC-1']);
  const cuocOc = computeCuoc(oneOc, part, 'V3-3', 'draw', { chiuCount: 0 });
  t('ù với đúng 1 lá đỏ là Ông Cụ thì có kính cụ', cuocOc.includes('kinhcu'));
  /* chi nảy: ù bằng Chi Chi */
  const cuocCc = computeCuoc(cards21, part, 'CC-1', 'draw', { chiuCount: 0 });
  t('ù bằng lá Chi Chi thì có chi nảy', cuocCc.includes('chinay'));
  /* thiên ù */
  const cuocThien = computeCuoc(cards21, part, null, 'thien', { chiuCount: 0 });
  t('thiên ù thì có cước thiên ù', cuocThien.includes('thien'));
  /* đã chíu trong ván thì có khàn */
  const cuocChiu = computeCuoc(cards21, part, 'V4-1', 'draw', { chiuCount: 1 });
  t('đã chíu trong ván thì có cước khàn', cuocChiu.includes('khan'));
}

/* ---------- 10. ù thật bằng nước bốc ---------- */
{
  /* tay 20 lá = 6 phu + 2 què V3; bốc thêm V3-3 → trùng tam → ù */
  const s = createGame(mkPlayers(4), { seed: 99 });
  const hand20 = [
    'V4-1', 'V5-1', 'V6-1', 'W4-1', 'W5-1', 'W6-1',
    'S4-1', 'S5-1', 'S6-1', 'V7-1', 'V8-1', 'V9-1',
    'W7-1', 'W8-1', 'W9-1', 'S7-1', 'S8-1', 'S9-1',
    'V3-1', 'V3-2',
  ];
  s.players[0].hand = hand20.slice();
  s.nocol = ['V3-3'];
  s.step = 'draw-or-eat';
  s.turnIdx = 0;
  const r = applyAction(s, 'p0', { type: 'draw' });
  t('bốc lá hoàn thành trùng tam thì ù', r.ok && s.phase === 'ended' && s.winner === 'p0');
  t('người ù có cước khàn (trùng tam)', s.cuoc.includes('khan'));
  t('người ù có cước ù suông', s.cuoc.includes('suong'));
  t('lá ù là V3-3', s.winCard === 'V3-3');
  t('lý do kết thúc là ù', s.endReason === 'match' && s.endCause === 'uu');
  t('người thua là 3 người còn lại', s.losers.length === 3 && !s.losers.includes('p0'));
}

/* ---------- 11. ăn lá ở cửa ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 5 });
  /* p0 có V3+V4 trên tay, cửa có V5 → ăn thành phu dọc */
  s.players[0].hand = ['V3-1', 'V4-1', 'W4-1', 'W5-1', 'W6-1', 'S4-1', 'S5-1', 'S6-1',
    'V7-1', 'V8-1', 'V9-1', 'W7-1', 'W8-1', 'W9-1', 'S7-1', 'S8-1', 'S9-1', 'V1-1', 'V2-1', 'V6-1'];
  s.gate = { card: 'V5-1', by: 'p3' };
  s.step = 'draw-or-eat';
  s.turnIdx = 0;
  const moves = legalMoves(s, 'p0');
  t('legalMoves có nước ăn lá ở cửa', moves.some(m => m.type === 'eat-gate'));
  const r = applyAction(s, 'p0', { type: 'eat-gate', with: ['V3-1', 'V4-1'] });
  t('ăn lá ở cửa thành công', r.ok);
  t('sau khi ăn, tay còn 18 lá + 1 phu 3 lá', s.players[0].hand.length === 18 && s.players[0].melds.length === 1 && s.players[0].melds[0].length === 3);
  t('sau khi ăn thì phải đánh 1 lá', s.step === 'discard');
  t('cửa đã trống sau khi ăn', s.gate === null);
  /* ăn sai: 2 lá không thành phu với lá ở cửa */
  const s2 = createGame(mkPlayers(4), { seed: 5 });
  s2.players[0].hand = ['V3-1', 'V4-1', 'W4-1', 'W5-1', 'W6-1', 'S4-1', 'S5-1', 'S6-1',
    'V7-1', 'V8-1', 'V9-1', 'W7-1', 'W8-1', 'W9-1', 'S7-1', 'S8-1', 'S9-1', 'V1-1', 'V2-1', 'V6-1'];
  s2.gate = { card: 'V5-1', by: 'p3' };
  s2.step = 'draw-or-eat';
  s2.turnIdx = 0;
  const rBad = applyAction(s2, 'p0', { type: 'eat-gate', with: ['V3-1', 'W4-1'] });
  t('ăn 2 lá không thành phu thì bị từ chối', !rBad.ok);
  const rNotHand = applyAction(s2, 'p0', { type: 'eat-gate', with: ['V3-1', 'CC-1'] });
  t('ăn bằng lá không có trên tay thì bị từ chối', !rNotHand.ok);
}

/* ---------- 12. chíu ---------- */
{
  /* p1 giữ 3 lá V5; p0 đánh 1 lá không phải V5 → không ai chíu, lượt đi tiếp */
  const s = createGame(mkPlayers(4), { seed: 11 });
  s.players[1].hand = ['V5-1', 'V5-2', 'V5-3'].concat(s.players[1].hand.slice(3));
  s.step = 'discard';
  s.turnIdx = 0;
  /* chọn lá đánh mà không người nào khác giữ 3 lá giống (để chắc chắn
     không có chíu) */
  const safe = s.players[0].hand.find(c => {
    const ty = typeOf(c);
    return s.players.slice(1).every(p => p.hand.filter(x => typeOf(x) === ty).length < 3);
  });
  const rDisc = applyAction(s, 'p0', { type: 'discard', card: safe });
  t('đánh 1 lá bình thường thì ok', rDisc.ok);
  t('không ai chíu thì lượt sang người tiếp theo', s.step === 'draw-or-eat' && s.turnIdx === 1);
  /* ván 2: p0 đánh đúng lá V5-4 */
  const s2 = createGame(mkPlayers(4), { seed: 11 });
  s2.players[1].hand = ['V5-1', 'V5-2', 'V5-3'].concat(s2.players[1].hand.slice(3));
  /* đưa lá V5-4 vào tay p0 rồi đánh nó */
  s2.players[0].hand[0] = 'V5-4';
  s2.step = 'discard';
  s2.turnIdx = 0;
  const r2 = applyAction(s2, 'p0', { type: 'discard', card: 'V5-4' });
  t('đánh lá thứ 4 thì rao chíu', r2.ok && s2.step === 'chiu' && s2.chiuOffer && s2.chiuOffer.candidate === 'p1');
  t('người được hành động lúc chíu là người được mời', actors(s2).length === 1 && actors(s2)[0] === 'p1');
  const rChiu = applyAction(s2, 'p1', { type: 'chiu' });
  t('chíu thành công', rChiu.ok);
  t('sau khi chíu, người chíu có 1 phu 4 lá', s2.players[1].melds.length === 1 && s2.players[1].melds[0].length === 4);
  t('sau khi chíu, lượt tiếp tục từ người chíu và phải đánh bài', s2.turnIdx === 1 && s2.step === 'discard');
  t('số lần chíu của người chíu tăng lên 1', s2.players[1].chiuCount === 1);
  /* từ chối chíu: lượt về người tiếp theo sau người đánh */
  const s3 = createGame(mkPlayers(4), { seed: 11 });
  s3.players[1].hand = ['V5-1', 'V5-2', 'V5-3'].concat(s3.players[1].hand.slice(3));
  s3.players[0].hand[0] = 'V5-4';
  s3.step = 'discard';
  s3.turnIdx = 0;
  applyAction(s3, 'p0', { type: 'discard', card: 'V5-4' });
  const rPass = applyAction(s3, 'p1', { type: 'chiu-pass' });
  t('từ chối chíu thì ok', rPass.ok);
  t('từ chối chíu thì lượt sang người sau người đánh', s3.turnIdx === 1 && s3.step === 'draw-or-eat');
  t('người không được mời chíu thì không chíu được', !applyAction(s3, 'p2', { type: 'chiu' }).ok);
}

/* ---------- 13. xin thua + nước bất hợp lệ ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 21 });
  const r = applyAction(s, 'p1', { type: 'resign' });
  t('xin thua kết thúc trận ngay', r.ok && s.phase === 'ended' && s.endReason === 'resign');
  t('người xin thua không bao giờ thắng', s.winner !== 'p1' && s.losers.includes('p1'));
  t('người thắng là 1 trong 3 người còn lại', ['p0', 'p2', 'p3'].includes(s.winner));
  t('hành động sau khi ván kết thúc thì bị từ chối', !applyAction(s, 'p0', { type: 'draw' }).ok);
  const s2 = createGame(mkPlayers(4), { seed: 21 });
  t('đánh lá không có trên tay thì bị từ chối', !applyAction(s2, 'p0', { type: 'discard', card: 'CC-9' }).ok);
  t('người chưa tới lượt thì không bốc được', !applyAction(s2, 'p1', { type: 'draw' }).ok);
  t('nước đi không rõ loại thì bị từ chối', !applyAction(s2, 'p0', { type: 'bay' }).ok);
  t('nước đi rỗng thì bị từ chối', !applyAction(s2, 'p0', null).ok);
}

/* ---------- 14. viewFor che bài + serialize ---------- */
{
  const s = createGame(mkPlayers(5), { seed: 33 });
  const v0 = viewFor(s, 'p0');
  t('viewFor: bài mình lộ, bài người khác giấu', Array.isArray(v0.players[0].hand) && v0.players.slice(1).every(p => p.hand === null));
  t('viewFor: không có trường you', !('you' in v0));
  t('viewFor: có trường me', v0.me === 'p0');
  t('viewFor: không lộ nọc', !('nocol' in v0) && typeof v0.nocolCount === 'number');
  t('viewFor: có đủ trường kết thúc', 'winner' in v0 && 'losers' in v0 && 'endReason' in v0 && 'cuoc' in v0);
  const json = serialize(s);
  const back = deserialize(json);
  t('serialize/deserialize vòng lại giống hệt', serialize(back) === json);
  let threw = false;
  try { deserialize('{"x":1}'); } catch (e) { threw = true; }
  t('deserialize dữ liệu hỏng thì báo lỗi', threw);
}

console.log(`\nLuật Tổ Tôm: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
