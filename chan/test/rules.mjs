// 🀄 Test luật Chắn — chạy: node chan/test/rules.mjs (từ thư mục gốc của repo)
import {
  createGame, applyAction, viewFor, legalMoves, actors, serialize, deserialize,
  typeOf, rankOf, suitOf, isRedType, isRedCard, typeName, cardName,
  isChan, isCa, pairsWith, partition20, canUu, countChan, isQue, computeCuoc,
  MIN_PLAYERS, MAX_PLAYERS, HAND_SIZE, MIN_CHAN, SUITS,
} from '../js/engine.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n); } };
const eq = (n, a, b) => t(n, JSON.stringify(a) === JSON.stringify(b));
const mkPlayers = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'Người ' + (i + 1) }));

/* ---------- 1. bộ bài ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 20261120 });
  const all = s.players.flatMap(p => p.hand).concat(s.nocol);
  t('bộ bài đủ 100 lá', all.length === 100);
  const byType = {};
  for (const c of all) byType[typeOf(c)] = (byType[typeOf(c)] || 0) + 1;
  t('25 loại quân', Object.keys(byType).length === 25);
  t('mỗi loại đúng 4 lá', Object.values(byType).every(n => n === 4));
  t('20 lá đỏ', all.filter(isRedCard).length === 20);
  t('80 lá đen', all.filter(c => !isRedCard(c)).length === 80);
  t('Chi Chi là loại duy nhất số 1', Object.keys(byType).filter(k => rankOf(k) === 1).length === 1);
  t('3 chất × số 2–9', SUITS.length === 3 && Object.keys(byType).filter(k => k !== 'CC').length === 24);
}

/* ---------- 2. chia bài ---------- */
{
  const s4 = createGame(mkPlayers(4), { seed: 7 });
  eq('4 người: tay 20/19/19/19', s4.players.map(p => p.hand.length), [20, 19, 19, 19]);
  t('4 người: nọc 23 lá', s4.nocol.length === 23);
  t('4 người: người cái đi trước, bước đầu là đánh bài', s4.turnIdx === 0 && s4.step === 'discard');
  const s3 = createGame(mkPlayers(3), { seed: 7 });
  eq('3 người: tay 20/19/19', s3.players.map(p => p.hand.length), [20, 19, 19]);
  t('3 người: nọc 42 lá', s3.nocol.length === 42);
  const s2 = createGame(mkPlayers(2), { seed: 7 });
  eq('2 người: tay 20/19', s2.players.map(p => p.hand.length), [20, 19]);
  t('2 người: nọc 61 lá', s2.nocol.length === 61);
  let threw = false;
  try { createGame(mkPlayers(1), { seed: 1 }); } catch (e) { threw = true; }
  t('1 người thì báo lỗi', threw);
  threw = false;
  try { createGame(mkPlayers(5), { seed: 1 }); } catch (e) { threw = true; }
  t('5 người thì báo lỗi', threw);
  t('MIN/MAX người là 2/4', MIN_PLAYERS === 2 && MAX_PLAYERS === 4);
}

/* ---------- 3. nhận mặt quân bài ---------- */
{
  t('typeOf/rankOf/suitOf Nhị Vạn', typeOf('V2-3') === 'V2' && rankOf('V2') === 2 && suitOf('V2') === 'V');
  t('Chi Chi không có chất, số 1', suitOf('CC') === null && rankOf('CC') === 1);
  t('tên quân: Nhị Vạn / Chi Chi', typeName('V2') === 'Nhị Vạn' && typeName('CC') === 'Chi Chi');
  t('tên lá có bản: Cửu Sách', cardName('S9-2') === 'Cửu Sách');
  t('lá đỏ: Chi Chi, Cửu Vạn, Cửu Sách, Bát Vạn, Bát Sách', ['CC', 'V9', 'S9', 'V8', 'S8'].every(isRedType));
  t('Cửu Văn không đỏ', !isRedType('W9'));
  t('chắn: 2 lá giống hệt', isChan('V2-1', 'V2-4') && !isChan('V2-1', 'W2-1'));
  t('cạ: cùng số khác chất', isCa('V2-1', 'W2-3') && isCa('V2-1', 'S2-2') && !isCa('V2-1', 'V3-1'));
  t('Chi Chi không ghép cạ', !isCa('CC-1', 'CC-2') && isChan('CC-1', 'CC-2'));
  t('pairsWith = chắn hoặc cạ', pairsWith('V2-1', 'V2-2') && pairsWith('V2-1', 'S2-1') && !pairsWith('V2-1', 'V3-1'));
}

/* ---------- 4. xếp 20 lá thành chắn/cạ ---------- */
/* 6 chắn + 4 cạ (20 lá) — bài ù chuẩn */
const UU6 = [
  'V2-1', 'V2-2', 'W3-1', 'W3-2', 'S4-1', 'S4-2', 'V5-1', 'V5-2', 'W6-1', 'W6-2', 'S7-1', 'S7-2',
  'V8-1', 'W8-1', 'V9-1', 'S9-1', 'W2-1', 'S2-1', 'W5-1', 'S5-1',
];
{
  const p = partition20(UU6);
  t('xếp được 6 chắn + 4 cạ', !!p && p.pairs.length === 10);
  t('đếm đúng 6 chắn', p && p.chan === 6);
  t('canUu chấp nhận 6 chắn', !!canUu(UU6));
  t('countChan đếm nhanh đúng 6', countChan(UU6) === 6);
}
/* 5 chắn + 5 cạ: xếp được nhưng thiếu chắn → không ù */
const UU5 = [
  'V2-1', 'V2-2', 'W3-1', 'W3-2', 'S4-1', 'S4-2', 'V5-1', 'V5-2', 'W6-1', 'W6-2',
  'V7-1', 'W7-1', 'V8-1', 'S8-1', 'V9-1', 'W9-1', 'W2-1', 'S2-1', 'W5-1', 'S5-1',
];
{
  const p = partition20(UU5);
  t('5 chắn + 5 cạ vẫn xếp hết', !!p && p.pairs.length === 10);
  t('nhưng chỉ có 5 chắn', p && p.chan === 5);
  t('canUu từ chối 5 chắn', !canUu(UU5));
}
/* 2 lá què không ghép được → không xếp hết */
const QUE2 = [
  'V2-1', 'V2-2', 'W3-1', 'W3-2', 'S4-1', 'S4-2', 'V5-1', 'V5-2', 'W6-1', 'W6-2', 'S7-1', 'S7-2',
  'V8-1', 'W8-1', 'W2-1', 'S2-1', 'W5-1', 'S5-1', 'CC-1', 'V9-1',
];
{
  t('2 lá què (Chi Chi + Cửu Vạn lẻ) thì không xếp hết', partition20(QUE2) === null);
  t('canUu từ chối bài có què', !canUu(QUE2));
  t('isQue nhận ra lá lẻ', isQue('CC-1', QUE2) && isQue('V9-1', QUE2) && !isQue('V2-1', QUE2));
}
/* thập thành: 10 chắn */
const THAP = ['V2-1', 'V2-2', 'W2-1', 'W2-2', 'S2-1', 'S2-2', 'V3-1', 'V3-2', 'W3-1', 'W3-2',
  'S3-1', 'S3-2', 'V4-1', 'V4-2', 'W4-1', 'W4-2', 'S4-1', 'S4-2', 'V5-1', 'V5-2'];
{
  const p = partition20(THAP);
  t('thập thành xếp được 10 chắn', !!p && p.chan === 10);
  t('canUu chấp nhận thập thành', !!canUu(THAP));
}

/* ---------- 5. cước ---------- */
{
  const c1 = computeCuoc(UU6, 'V2-1', 'draw');
  t('bạch thủ: 6 chắn + lá ù là chắn', c1.includes('bachtu'));
  t('chì: ù bằng lá tự bốc', c1.includes('chi'));
  /* ù rộng: lá ù ghép thành cạ, đi bằng lá ở cửa */
  const RONG19 = [
    'V2-1', 'V2-2', 'W3-1', 'W3-2', 'S4-1', 'S4-2', 'V5-1', 'V5-2', 'W6-1', 'W6-2', 'S7-1', 'S7-2',
    'V9-1', 'S9-1', 'W2-1', 'S2-1', 'W5-1', 'S5-1', 'W8-1',
  ];
  const c2 = computeCuoc(RONG19.concat(['V8-1']), 'V8-1', 'gate');
  t('ù rộng: lá ù ghép thành cạ', c2.includes('rong'));
  t('xuông: ù rộng không có cước khác', c2.includes('xuong'));
  t('ù ở cửa người khác thì không chì', !c2.includes('chi'));
  const c3 = computeCuoc(THAP, 'V2-1', 'draw');
  t('thập thành được tính', c3.includes('thap'));
  t('thập thành toàn đen thì bạch định', c3.includes('bachdin'));
  t('thập thành không xuông', !c3.includes('xuong'));
  /* tám đỏ: 8 lá đỏ trong bài ù */
  const TAMDO = [
    'CC-1', 'CC-2', 'V8-1', 'V8-2', 'V9-1', 'V9-2', 'S8-1', 'S8-2',
    'W2-1', 'W2-2', 'S3-1', 'S3-2',
    'V4-1', 'W4-1', 'V5-1', 'S5-1', 'W6-1', 'S6-1', 'V7-1', 'W7-1',
  ];
  const c4 = computeCuoc(TAMDO, 'V8-1', 'draw');
  t('tám đỏ: 8 lá đỏ được tính', c4.includes('tamdo'));
  /* bạch định: 0 lá đỏ */
  const BACHDINH = [
    'V2-1', 'V2-2', 'W3-1', 'W3-2', 'S4-1', 'S4-2', 'V5-1', 'V5-2', 'W6-1', 'W6-2', 'S7-1', 'S7-2',
    'W2-1', 'S2-1', 'V3-1', 'S3-1', 'V4-1', 'W4-1', 'W5-1', 'S5-1',
  ];
  const c5 = computeCuoc(BACHDINH, 'V2-1', 'gate');
  t('bạch định: 0 lá đỏ được tính', c5.includes('bachdin'));
  /* tôm: chắn Thất Văn + Tam Sách + Tam Vạn */
  const TOM = [
    'W7-1', 'W7-2', 'S3-1', 'S3-2', 'V3-1', 'V3-2',
    'V2-1', 'V2-2', 'W4-1', 'W4-2', 'S5-1', 'S5-2',
    'V6-1', 'W6-1', 'V8-1', 'W8-1', 'S2-1', 'W2-1', 'V9-1', 'S9-1',
  ];
  const c6 = computeCuoc(TOM, 'W7-1', 'draw');
  t('tôm: đủ 3 chắn Thất Văn + Tam Sách + Tam Vạn', c6.includes('tom'));
  /* lèo: chắn Chi Chi + Cửu Vạn + Bát Sách */
  const LEO = [
    'CC-1', 'CC-2', 'V9-1', 'V9-2', 'S8-1', 'S8-2',
    'V2-1', 'V2-2', 'W3-1', 'W3-2', 'S4-1', 'S4-2',
    'V5-1', 'W5-1', 'V6-1', 'S6-1', 'W7-1', 'S7-1', 'V8-1', 'W8-1',
  ];
  const c7 = computeCuoc(LEO, 'CC-1', 'gate');
  t('lèo: đủ 3 chắn Chi Chi + Cửu Vạn + Bát Sách', c7.includes('leo'));
  const c8 = computeCuoc(UU6, 'V2-1', 'chiu');
  t('chíu ù được tính', c8.includes('chiu'));
  const c9 = computeCuoc(UU6, 'V2-1', 'thien');
  t('thiên ù được tính', c9.includes('thien'));
}

/* ---------- 6. diễn biến ván (dùng bài đã chia, seed cố định) ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 20261120 });
  t('ván mới ở trạng thái playing', s.phase === 'playing');
  t('người tới lượt là người cái', actors(s).length === 1 && actors(s)[0] === 'p0');
  /* người cái đánh 1 lá mở đầu */
  const first = s.players[0].hand[0];
  let r = applyAction(s, 'p0', { type: 'discard', card: first });
  t('người cái đánh lá mở đầu được', r.ok === true);
  t('lá đánh ra nằm ở cửa', s.gate && s.gate.card === first && s.gate.by === 'p0');
  t('tới lượt người tiếp theo', s.turnIdx === 1 && s.step === 'draw-or-eat');
  t('tay người cái còn 19 lá', s.players[0].hand.length === 19);
  /* người 2 bốc bài */
  const nocolBefore = s.nocol.length;
  r = applyAction(s, 'p1', { type: 'draw' });
  t('người tới lượt bốc được 1 lá', r.ok === true && s.drawn !== null);
  t('nọc giảm 1 lá', s.nocol.length === nocolBefore - 1);
  t('sau khi bốc thì chờ quyết định ăn hay bỏ', s.step === 'decide' || s.step === 'chiu');
  if (s.step === 'decide') {
    r = applyAction(s, 'p1', { type: 'leave' });
    t('không ăn thì để lá ở cửa', r.ok === true && s.gate && s.gate.card !== null);
    t('tới lượt người tiếp theo', s.turnIdx === 2 && s.step === 'draw-or-eat');
  }
  /* nước đi sai bị từ chối: đánh khi chưa tới bước đánh */
  r = applyAction(s, 'p2', { type: 'discard', card: s.players[2].hand[0] });
  t('đánh bài khi đang ở bước bốc/ăn thì bị từ chối', r.ok === false);
  /* bốc khi chưa tới lượt thì bị từ chối */
  r = applyAction(s, 'p3', { type: 'draw' });
  t('bốc khi chưa tới lượt thì bị từ chối', r.ok === false);
}

/* ---------- 7. ăn lá ở cửa ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 11 });
  /* dàn xếp: người cái đánh ra 1 lá, người 2 có lá ghép được với nó */
  const dealer = s.players[0];
  const p1 = s.players[1];
  const gateCard = dealer.hand[0];
  /* cho người 2 một lá cùng loại với lá ở cửa (để ăn thành chắn);
     đồng thời gỡ hết lá cùng loại còn lại trên tay người 2 để không
     vô tình mở lời chíu (3 lá cùng loại) làm lệch bước đi */
  const twin = gateCard.split('-')[0] + '-4';
  const gt = typeOf(gateCard);
  const repl = gt === 'V2' ? 'W2-1' : 'V2-1'; /* lá thay thế, chắc chắn khác loại với lá ở cửa */
  for (let i = 0; i < p1.hand.length; i++) {
    if (p1.hand[i] === twin) continue;
    if (typeOf(p1.hand[i]) === gt) p1.hand[i] = repl;
  }
  p1.hand[0] = twin;
  s.nocol = s.nocol.filter(c => c !== twin);
  let r = applyAction(s, 'p0', { type: 'discard', card: gateCard });
  t('dàn xếp: người cái đánh lá mở đầu', r.ok === true);
  r = applyAction(s, 'p1', { type: 'eat-gate', with: twin });
  t('ăn lá ở cửa thành chắn được', r.ok === true);
  t('ăn xong thì bài đã ăn có 1 chắn', p1.melds.length === 1 && isChan(p1.melds[0][0], p1.melds[0][1]));
  t('ăn xong thì phải đánh ra 1 lá', s.step === 'discard');
  t('tay người ăn giảm 2 lá (1 ghép + 1 sắp đánh)', p1.hand.length === 18);
  r = applyAction(s, 'p1', { type: 'discard', card: p1.hand[0] });
  t('đánh ra sau khi ăn xong', r.ok === true);
  t('tới lượt người tiếp theo', s.turnIdx === 2);
}

/* ---------- 8. ăn lá vừa bốc ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 12 });
  const p1 = s.players[1];
  /* dàn xếp: lá trên cùng của nọc ghép được với 1 lá trên tay người 2
     (nọc bốc từ cuối nên đặt lá cần bốc ở cuối) */
  const twin = p1.hand[0].split('-')[0] + '-4';
  s.nocol = s.nocol.filter(c => c !== twin).concat([twin]);
  applyAction(s, 'p0', { type: 'discard', card: s.players[0].hand[0] });
  let r = applyAction(s, 'p1', { type: 'draw' });
  t('dàn xếp: bốc được lá ghép với tay', r.ok === true && s.drawn === twin);
  r = applyAction(s, 'p1', { type: 'eat-drawn', with: p1.hand[0] });
  t('ăn lá vừa bốc thành chắn được', r.ok === true);
  t('ăn lá vừa bốc xong thì phải đánh ra', s.step === 'discard');
  /* ăn lá không ghép được thì bị từ chối */
  const s2 = createGame(mkPlayers(4), { seed: 13 });
  applyAction(s2, 'p0', { type: 'discard', card: s2.players[0].hand[0] });
  applyAction(s2, 'p1', { type: 'draw' });
  const drawn = s2.drawn;
  const bad = s2.players[1].hand.find(c => !pairsWith(drawn, c));
  if (bad) {
    const rr = applyAction(s2, 'p1', { type: 'eat-drawn', with: bad });
    t('ăn lá vừa bốc bằng lá không ghép được thì bị từ chối', rr.ok === false);
  } else {
    t('ăn lá vừa bốc bằng lá không ghép được thì bị từ chối', true);
  }
}

/* ---------- 9. ù bằng lá bốc (dàn xếp) ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 21 });
  /* người 2: 19 lá = 6 chắn + 3 cạ + 1 què (W8), lá thắng là V8 (ghép cạ) */
  const hand19 = [
    'V2-1', 'V2-2', 'W3-1', 'W3-2', 'S4-1', 'S4-2', 'V5-1', 'V5-2', 'W6-1', 'W6-2', 'S7-1', 'S7-2',
    'V9-1', 'S9-1', 'W2-1', 'S2-1', 'W5-1', 'S5-1', 'W8-1',
  ];
  s.players[1].hand = hand19.slice();
  s.nocol = ['V8-1'];
  s.turnIdx = 1; s.step = 'draw-or-eat'; s.gate = null;
  const r = applyAction(s, 'p1', { type: 'draw' });
  t('bốc được lá ù thì thắng luôn', r.ok === true && s.phase === 'ended');
  t('người ù là người bốc', s.winner === 'p1');
  t('cước có ù rộng', s.cuoc.includes('rong'));
  t('người thua là 3 người còn lại', s.losers.length === 3 && !s.losers.includes('p1'));
  t('lý do kết thúc là match/uu', s.endReason === 'match' && s.endCause === 'uu');
}

/* ---------- 10. ù bằng lá ăn ở cửa (dàn xếp) ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 22 });
  const hand19 = [
    'V2-1', 'V2-2', 'W3-1', 'W3-2', 'S4-1', 'S4-2', 'V5-1', 'V5-2', 'W6-1', 'W6-2', 'S7-1', 'S7-2',
    'V9-1', 'S9-1', 'W2-1', 'S2-1', 'W5-1', 'S5-1', 'W8-1',
  ];
  s.players[1].hand = hand19.slice();
  s.gate = { card: 'V8-1', by: 'p0' };
  s.turnIdx = 1; s.step = 'draw-or-eat';
  const r = applyAction(s, 'p1', { type: 'eat-gate', with: 'W8-1' });
  t('ăn lá ở cửa để ù thì thắng luôn', r.ok === true && s.phase === 'ended' && s.winner === 'p1');
  t('ù ở cửa người khác thì không chì', !s.cuoc.includes('chi'));
}

/* ---------- 11. chíu ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 31 });
  /* người 1 giữ 3 lá V7 (khàn); người cái đánh ra lá V7 thứ 4 */
  const p0 = s.players[0];
  const p1 = s.players[1];
  p1.hand[0] = 'V7-1'; p1.hand[1] = 'V7-2'; p1.hand[2] = 'V7-3';
  const fourth = 'V7-4';
  p0.hand[0] = fourth;
  s.nocol = s.nocol.filter(c => c !== fourth && !['V7-1', 'V7-2', 'V7-3'].includes(c));
  let r = applyAction(s, 'p0', { type: 'discard', card: fourth });
  t('đánh ra lá thứ 4 thì mở lời chíu', r.ok === true && s.step === 'chiu');
  t('người được mời chíu là người giữ 3 lá', s.chiuOffer && s.chiuOffer.candidate === 'p1');
  t('chỉ người được mời chíu mới là actor', actors(s).length === 1 && actors(s)[0] === 'p1');
  r = applyAction(s, 'p0', { type: 'chiu' });
  t('người khác chíu hộ thì bị từ chối', r.ok === false);
  r = applyAction(s, 'p1', { type: 'chiu' });
  t('chíu thành công', r.ok === true);
  t('chíu hạ thành 2 chắn', p1.melds.length === 2 && p1.melds.every(pr => isChan(pr[0], pr[1])));
  t('chíu xong thì đánh dấu đã chíu', p1.chiu === true && p1.chiuCount === 1);
  t('chíu xong thì tay giảm 3 lá', p1.hand.length === 16);
  t('chíu xong thì tới lượt người chíu đánh bài', s.step === 'discard' && s.turnIdx === 1);
  t('lá chíu không còn ở cửa', s.gate === null);
  r = applyAction(s, 'p1', { type: 'discard', card: p1.hand[0] });
  t('người chíu đánh xong thì tới lượt người sau họ', r.ok === true && s.turnIdx === 2);
  /* từ chối chíu: ván tiếp tục như thường */
  const s2 = createGame(mkPlayers(4), { seed: 32 });
  s2.players[1].hand[0] = 'V7-1'; s2.players[1].hand[1] = 'V7-2'; s2.players[1].hand[2] = 'V7-3';
  s2.players[0].hand[0] = 'V7-4';
  s2.nocol = s2.nocol.filter(c => c !== 'V7-4' && !['V7-1', 'V7-2', 'V7-3'].includes(c));
  applyAction(s2, 'p0', { type: 'discard', card: 'V7-4' });
  r = applyAction(s2, 'p1', { type: 'chiu-pass' });
  t('từ chối chíu được', r.ok === true);
  t('từ chối chíu thì tới lượt người sau người đánh', s2.turnIdx === 1 && s2.step === 'draw-or-eat');
  t('lá bị từ chối chíu vẫn ở cửa cho người sau ăn', s2.gate && s2.gate.card === 'V7-4');
}

/* ---------- 12. chíu ù ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 33 });
  /* người 1: 3 lá V7 (khàn) + 4 chắn + 4 cạ = 19 lá; lá V7 thứ 4 chíu xong
     thì đủ 20 lá: 6 chắn + 4 cạ → ù bằng chíu */
  const p1 = s.players[1];
  p1.hand = [
    'V7-1', 'V7-2', 'V7-3',
    'V2-1', 'V2-2', 'W3-1', 'W3-2', 'S4-1', 'S4-2', 'V5-1', 'V5-2',
    'V9-1', 'S9-1', 'W2-1', 'S2-1', 'W5-1', 'S5-1', 'V6-1', 'W6-1',
  ];
  t('dàn xếp chíu ù: tay đủ 19 lá', p1.hand.length === 19);
  s.players[0].hand[0] = 'V7-4';
  s.nocol = s.nocol.filter(c => c !== 'V7-4');
  applyAction(s, 'p0', { type: 'discard', card: 'V7-4' });
  const r = applyAction(s, 'p1', { type: 'chiu' });
  t('chíu để ù thì thắng luôn', r.ok === true && s.phase === 'ended' && s.winner === 'p1');
  t('cước có chíu ù', s.cuoc.includes('chiu'));
}

/* ---------- 13. xin thua ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 41 });
  /* cho người xin thua bài mạnh nhất — vẫn phải thua */
  s.players[2].hand = UU6.slice(0, 19);
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('xin thua kết thúc trận ngay', r.ok === true && s.phase === 'ended');
  t('người xin thua không thắng dù bài mạnh nhất', s.winner !== 'p2' && s.losers.includes('p2'));
  t('lý do kết thúc là resign', s.endReason === 'resign');
  /* xin thua khi trận đã kết thúc thì bị từ chối */
  const r2 = applyAction(s, 'p0', { type: 'resign' });
  t('xin thua khi trận đã kết thúc thì bị từ chối', r2.ok === false);
}

/* ---------- 14. hết nọc thì hòa ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 51 });
  applyAction(s, 'p0', { type: 'discard', card: s.players[0].hand[0] });
  s.nocol = [];
  s.gate = null;
  const r = applyAction(s, 'p1', { type: 'draw' });
  t('hết nọc mà bốc thì hòa', r.ok === true && s.phase === 'ended' && s.winner === null);
  t('hòa thì không ai thắng', s.winners.length === 0 && s.losers.length === 4);
  t('lý do kết thúc là draw', s.endReason === 'match' && s.endCause === 'draw');
}

/* ---------- 15. viewFor giấu bài ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 61 });
  const v = viewFor(s, 'p1');
  t('viewFor: thấy bài của mình', Array.isArray(v.players[1].hand) && v.players[1].hand.length === 19);
  t('viewFor: không thấy bài người khác', v.players[0].hand === null && v.players[2].hand === null);
  t('viewFor: thấy số lá trên tay người khác', v.players[0].handCount === 20);
  t('viewFor: thấy nọc còn bao nhiêu lá', v.nocolCount === 23);
  t('viewFor: không có trường you', !('you' in v));
  t('viewFor: có me', v.me === 'p1');
  /* hết trận thì lộ hết bài */
  applyAction(s, 'p2', { type: 'resign' });
  const v2 = viewFor(s, 'p1');
  t('hết trận thì lộ hết bài mọi người', v2.players.every(p => Array.isArray(p.hand)));
  t('viewFor: thấy người thắng', v2.winner !== null && v2.winners.length === 1);
}

/* ---------- 16. serialize / deserialize ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 71 });
  applyAction(s, 'p0', { type: 'discard', card: s.players[0].hand[0] });
  const json = serialize(s);
  const s2 = deserialize(json);
  t('serialize/deserialize giữ nguyên trạng thái', JSON.stringify(s2) === JSON.stringify(s));
  let threw = false;
  try { deserialize('{"players":[]}'); } catch (e) { threw = true; }
  t('deserialize trạng thái sai thì báo lỗi', threw);
  threw = false;
  try { deserialize('không phải json'); } catch (e) { threw = true; }
  t('deserialize chuỗi không phải JSON thì báo lỗi', threw);
}

/* ---------- 17. legalMoves ---------- */
{
  const s = createGame(mkPlayers(4), { seed: 81 });
  const m0 = legalMoves(s, 'p0');
  t('người cái lúc đầu chỉ được đánh bài', m0.length === 20 && m0.every(m => m.type === 'discard'));
  t('người chưa tới lượt thì không có nước đi', legalMoves(s, 'p1').length === 0);
  applyAction(s, 'p0', { type: 'discard', card: s.players[0].hand[0] });
  const m1 = legalMoves(s, 'p1');
  t('tới lượt thì có nước bốc', m1.some(m => m.type === 'draw'));
  t('hết trận thì không còn nước đi', (() => {
    applyAction(s, 'p1', { type: 'resign' });
    return legalMoves(s, 'p1').length === 0 && actors(s).length === 0;
  })());
}

console.log(`\nChắn rules: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
