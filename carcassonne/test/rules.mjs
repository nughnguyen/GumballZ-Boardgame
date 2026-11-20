// 🏰 Test luật Carcassonne — chạy: node carcassonne/test/rules.mjs (từ thư mục gốc của repo)
//
// NGUỒN LUẬT (đã tra cứu trước khi code — xem engine.js):
// - Wikipedia "Carcassonne (board game)": 2–5 người, 72 lá (1 lá khởi đầu
//   + 71 lá úp), 7 meeple/người, đặt lá khớp cạnh (thành phố–thành phố,
//   đường–đường, ruộng–ruộng), đặt 1 meeple lên nét của lá vừa đặt (không
//   được đặt lên nét đã có meeple), tính điểm nét hoàn thành (thành phố
//   2 điểm/ô + 2/khiên, đường 1 điểm/ô, tu viện 9 điểm khi đủ 8 lá kề),
//   hòa thì cùng được trọn điểm, cuối ván: thành phố dở 1/ô + 1/khiên,
//   đường dở 1/ô, tu viện dở 1/lá, ruộng 3 điểm mỗi thành phố hoàn thành
//   chạm tới. Luật bản 3 (hiện hành): KHÔNG còn ngoại lệ "thành phố 2 ô
//   chỉ tính 1 điểm/ô", KHÔNG còn tính ruộng 4 điểm theo góc thành phố.
// - Bảng phân bố 24 loại lá: Dan Becker / Northwestern CMSC 22001
//   (tiles page): CCCCS 1, CCFC 3, CCFCS 1, CCFF 2, CCRC 1, CCRCS 2,
//   CFCF 3, CFFC 3, CFFCS 2, CFFF 5, CFRR 3, CRFR 3+1 lá khởi đầu,
//   CRRC 3, CRRCS 2, CRRF 3, CRRR 3, FCFC 1, FCFCS 2, FFFFL 4,
//   FFRFL 2, FFRR 9, FRRR 4, RFRF 8, RRRR 1 (= 72 lá).
// - Lá không đặt được ở đâu thì loại khỏi ván, bốc lá khác
//   (Dan Becker / CMSC 22001 "Impossible Placements").
// - findtherules.com (đối chiếu rulebook Z-Man bản 3): thành phố 2 ô vẫn
//   tính 2 điểm/ô khi hoàn thành; tu viện 9 điểm; ruộng 3 điểm/thành phố.
import {
  createGame, applyAction, viewFor, legalMoves, actors, serialize, deserialize,
  computeFeatures, featPoints, majorityOwners, canPlaceAt, legalPlacementsFor,
  emptyAdjacentCells, rotEdges, tileShortName, buildDeck,
  TILE_TYPES, TILE_BY_ID, MIN_PLAYERS, MAX_PLAYERS, MEEPLES, START_TILE, TOTAL_TILES,
} from '../js/engine.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n); } };
const eq = (n, a, b) => t(n, JSON.stringify(a) === JSON.stringify(b));
const mkPlayers = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'Người ' + (i + 1) }));
const P = (s, i) => s.players[i];

/* đặt tay bài cho người tới lượt (ghi đè lá vừa bốc — để test kịch bản) */
function setHand(s, type) { s.hand = type; s.step = 'place'; }
/* 1 lượt đầy đủ: đặt lá rồi đặt meeple (hoặc bỏ qua) */
function playTurn(s, pid, x, y, rot, meeple) {
  const r1 = applyAction(s, pid, { type: 'place', x, y, rot });
  if (!r1.ok) return r1;
  return applyAction(s, pid, meeple || { type: 'skip' });
}

/* ---------- 0. bộ 72 lá ---------- */
{
  const total = TILE_TYPES.reduce((a, t) => a + t.n, 0);
  t('bộ bài đủ 72 lá', total === TOTAL_TILES && TOTAL_TILES === 72);
  t('đúng 24 loại lá', TILE_TYPES.filter(t => t.n > 0).length === 24);
  const byId = {};
  for (const tp of TILE_TYPES) byId[tp.id] = tp.n;
  const expect = {
    CCCCS: 1, CCFC: 3, CCFCS: 1, CCFF: 2, CCRC: 1, CCRCS: 2, CFCF: 3, CFFC: 3,
    CFFCS: 2, CFFF: 5, CFRR: 3, CRFR: 4, CRRC: 3, CRRCS: 2, CRRF: 3, CRRR: 3,
    FCFC: 1, FCFCS: 2, FFFFL: 4, FFRFL: 2, FFRR: 9, FRRR: 4, RFRF: 8, RRRR: 1,
  };
  t('số lá từng loại đúng bảng Dan Becker', Object.keys(expect).every(k => byId[k] === expect[k]));
  const deck = buildDeck();
  t('chồng lá sau khi trừ lá khởi đầu còn 71 lá', deck.length === 71);
  t('lá khởi đầu là CRFR', START_TILE === 'CRFR');
  const shields = TILE_TYPES.reduce((a, tp) => a + tp.n * tp.cities.filter(c => c.shield).length, 0);
  t('tổng cộng 10 khiên trong bộ bài', shields === 10);
  const cloisters = TILE_TYPES.reduce((a, tp) => a + (tp.cloister ? tp.n : 0), 0);
  t('tổng cộng 6 lá tu viện (4 không đường + 2 có đường)', cloisters === 6);
  t('tileShortName: CRFR là thành phố + đường', tileShortName('CRFR').includes('thành phố') && tileShortName('CRFR').includes('đường'));
}

/* ---------- 1. cấu trúc lá: mỗi cạnh thuộc đúng 1 đoạn ---------- */
{
  let ok = true, detail = '';
  for (const tp of TILE_TYPES.filter(x => x.n > 0)) {
    const cityEdges = tp.cities.flatMap(c => c.edges);
    const roadEdges = tp.roads.flatMap(r => r.edges);
    for (let e = 0; e < 4; e++) {
      const kind = tp.edges[e];
      const inCity = cityEdges.filter(x => x === e).length;
      const inRoad = roadEdges.filter(x => x === e).length;
      if (kind === 'C' && inCity !== 1) { ok = false; detail = tp.id + ' cạnh ' + e + ' (thành phố) trong ' + inCity + ' đoạn'; }
      if (kind === 'R' && inRoad !== 1) { ok = false; detail = tp.id + ' cạnh ' + e + ' (đường) trong ' + inRoad + ' đoạn'; }
      if (kind === 'F' && (inCity || inRoad)) { ok = false; detail = tp.id + ' cạnh ruộng ' + e + ' lại nằm trong đoạn thành phố/đường'; }
    }
    /* ruộng: mỗi nửa-cạnh của cạnh ruộng (2 nửa) và mỗi nửa của cạnh đường
       (1 nửa mỗi phía) thuộc đúng 1 đoạn ruộng; cạnh thành phố: 0 nửa */
    const halfCount = {};
    for (const f of tp.fields) for (const h of f.halves) halfCount[h] = (halfCount[h] || 0) + 1;
    for (let e = 0; e < 4; e++) {
      for (let side = 0; side < 2; side++) {
        const h = e * 2 + side;
        const c = halfCount[h] || 0;
        if (tp.edges[e] === 'F' && c !== 1) { ok = false; detail = tp.id + ' nửa ' + h + ' của cạnh ruộng thuộc ' + c + ' đoạn'; }
        if (tp.edges[e] === 'R' && c !== 1) { ok = false; detail = tp.id + ' nửa ' + h + ' của cạnh đường thuộc ' + c + ' đoạn'; }
        if (tp.edges[e] === 'C' && c !== 0) { ok = false; detail = tp.id + ' nửa ' + h + ' của cạnh thành phố lại là ruộng'; }
      }
    }
  }
  t('mọi lá: mỗi cạnh thành phố/đường thuộc đúng 1 đoạn, mỗi nửa-cạnh ruộng thuộc đúng 1 đoạn ruộng' + (ok ? '' : ' (' + detail + ')'), ok);
}

/* ---------- 2. xoay lá ---------- */
{
  eq('CRFR xoay 0: [C,R,F,R]', rotEdges('CRFR', 0), ['C', 'R', 'F', 'R']);
  eq('CRFR xoay 1: thành phố sang Đông', rotEdges('CRFR', 1), ['R', 'C', 'R', 'F']);
  eq('CRFR xoay 2: thành phố xuống Nam', rotEdges('CRFR', 2), ['F', 'R', 'C', 'R']);
  eq('CRFR xoay 3: thành phố sang Tây', rotEdges('CRFR', 3), ['R', 'F', 'R', 'C']);
  t('xoay 4 lần về như cũ', TILE_TYPES.filter(x => x.n > 0).every(tp => JSON.stringify(rotEdges(tp.id, 4 % 4)) === JSON.stringify(rotEdges(tp.id, 0))));
  t('RFRF xoay 2 lần giống hệt (đường thẳng đối xứng)', JSON.stringify(rotEdges('RFRF', 2)) === JSON.stringify(rotEdges('RFRF', 0)));
}

/* ---------- 3. tạo ván ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  t('2 người: bắt đầu ở lượt người 0, bước đặt lá', s.turnIdx === 0 && s.step === 'place');
  t('lá khởi đầu ở (0,0), xoay 0', s.board['0,0'] && s.board['0,0'].type === 'CRFR' && s.board['0,0'].rot === 0);
  t('chồng còn 70 lá sau khi bốc lá đầu (71 − 1)', s.stack.length === 70);
  t('người đầu đã bốc 1 lá trên tay', typeof s.hand === 'string' && !!TILE_BY_ID[s.hand]);
  t('mỗi người 7 meeple trong kho, 0 điểm', s.players.every(p => p.supply === MEEPLES && p.score === 0));
  eq('4 ô trống kề lá khởi đầu', emptyAdjacentCells(s.board).length, 4);
  const s5 = createGame(mkPlayers(5), { seed: 7 });
  t('5 người tạo được', s5.players.length === 5);
  let threw = false;
  try { createGame(mkPlayers(1), { seed: 1 }); } catch (e) { threw = true; }
  t('1 người thì báo lỗi', threw);
  threw = false;
  try { createGame(mkPlayers(6), { seed: 1 }); } catch (e) { threw = true; }
  t('6 người thì báo lỗi', threw);
  t('MIN/MAX người là 2/5', MIN_PLAYERS === 2 && MAX_PLAYERS === 5);
  t('actors() trả về người tới lượt', JSON.stringify(actors(s)) === JSON.stringify(['p0']));
}

/* ---------- 4. đặt lá: khớp cạnh + kề nhau ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  /* lá khởi đầu CRFR: Bắc=thành phố, Đông=đường, Nam=ruộng, Tây=đường */
  t('CFFF đặt ở Bắc (thành phố gặp thành phố) hợp lệ', canPlaceAt(s.board, 'CFFF', 0, -1, 2)); // thành phố xoay xuống Nam
  t('CFFF đặt ở Bắc mà thành phố không quay xuống thì không hợp lệ', !canPlaceAt(s.board, 'CFFF', 0, -1, 0));
  t('RFRF đặt ở Đông (đường gặp đường) hợp lệ', canPlaceAt(s.board, 'RFRF', 1, 0, 1)); // đường xoay sang Tây
  t('RFRF đặt ở Nam (ruộng gặp đường) không hợp lệ', !canPlaceAt(s.board, 'RFRF', 0, 1, 0));
  t('không đặt được lên ô đã có lá', !canPlaceAt(s.board, 'CFFF', 0, 0, 0));
  t('không đặt được ở ô không kề lá nào', !canPlaceAt(s.board, 'CFFF', 5, 5, 0));
  t('FFFFL (tu viện, toàn ruộng) đặt ở Nam hợp lệ', canPlaceAt(s.board, 'FFFFL', 0, 1, 0));
  t('FFFFL đặt ở Bắc (ruộng gặp thành phố) không hợp lệ', !canPlaceAt(s.board, 'FFFFL', 0, -1, 0));
  const placements = legalPlacementsFor(s.board, 'CFFF');
  t('CFFF có vị trí đặt hợp lệ trên bàn khởi đầu', placements.length > 0);
  t('mọi vị trí liệt kê đều hợp lệ', placements.every(p => canPlaceAt(s.board, 'CFFF', p.x, p.y, p.rot)));
}

/* ---------- 5. đặt lá + đặt meeple: luồng lượt cơ bản ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  setHand(s, 'CFFF');
  const r1 = applyAction(s, 'p0', { type: 'place', x: 0, y: -1, rot: 2 });
  t('đặt lá hợp lệ thì ok', r1.ok);
  t('sau khi đặt lá, bước chuyển sang đặt meeple, tay trống', s.step === 'meeple' && s.hand === null);
  t('lá đã nằm trên bàn', s.board['0,-1'] && s.board['0,-1'].type === 'CFFF');
  const rBad = applyAction(s, 'p0', { type: 'place', x: 1, y: -1, rot: 0 });
  t('đặt lá lần nữa trong bước đặt meeple thì bị từ chối', !rBad.ok);
  const r2 = applyAction(s, 'p0', { type: 'meeple', kind: 'city', seg: 0 });
  t('đặt hiệp sĩ lên thành phố của lá vừa đặt thì ok', r2.ok);
  t('thành phố 2 ô hoàn thành: +4 điểm (2 ô × 2, không khiên)', P(s, 0).score === 4);
  t('meeple về kho ngay sau khi tính điểm (cùng nước đi)', P(s, 0).supply === 7);
  t('sang lượt người 1, đã bốc lá mới', s.turnIdx === 1 && s.step === 'place' && typeof s.hand === 'string');
  /* nước đi không hợp lệ */
  const s2 = createGame(mkPlayers(2), { seed: 7 });
  setHand(s2, 'CFFF');
  t('chưa tới lượt thì không đặt được', !applyAction(s2, 'p1', { type: 'place', x: 0, y: -1, rot: 2 }).ok);
  t('đặt lá sai vị trí thì bị từ chối', !applyAction(s2, 'p0', { type: 'place', x: 0, y: -1, rot: 0 }).ok);
  t('đặt lá ra ô xa thì bị từ chối', !applyAction(s2, 'p0', { type: 'place', x: 9, y: 9, rot: 0 }).ok);
  t('nước đi không rõ loại thì bị từ chối', !applyAction(s2, 'p0', { type: 'nhay' }).ok);
}

/* ---------- 6. thành phố có khiên: 2 ô + 1 khiên = 6 điểm ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  /* FCFCS có 2 thành phố riêng (Đông có khiên, Tây không). Xoay 1 để
     thành phố có khiên quay xuống Nam, chạm thành phố lá khởi đầu. */
  setHand(s, 'FCFCS');
  const r = playTurn(s, 'p0', 0, -1, 1, { type: 'meeple', kind: 'city', seg: 0 });
  t('đặt lá FCFCS + hiệp sĩ lên thành phố có khiên thì ok', r.ok);
  t('thành phố 2 ô + 1 khiên hoàn thành: +6 điểm', P(s, 0).score === 6);
}

/* ---------- 7. đường hoàn thành: 3 ô = 3 điểm, meeple về kho ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  /* bịt đầu Tây của đường khởi đầu bằng CCRC (đường kết thúc ở thành phố) */
  setHand(s, 'CCRC');
  playTurn(s, 'p0', -1, 0, 3, { type: 'skip' }); // CCRC xoay 3: đường sang Đông, chạm đường khởi đầu
  t('đường vẫn dở (đầu Đông còn hở): chưa có điểm', P(s, 0).score === 0 && P(s, 1).score === 0);
  /* bịt đầu Đông bằng CCRC nữa, đặt kẻ cướp đường lên đó */
  setHand(s, 'CCRC');
  const r = playTurn(s, 'p1', 1, 0, 1, { type: 'meeple', kind: 'road', seg: 0 }); // CCRC xoay 1: đường sang Tây
  t('đặt lá bịt đầu Đông + kẻ cướp thì ok', r.ok);
  t('đường 3 ô hoàn thành: người đặt cướp +3 điểm', P(s, 1).score === 3);
  t('kẻ cướp về kho sau khi tính điểm', P(s, 1).supply === 7);
  t('người kia không được điểm đường', P(s, 0).score === 0);
}

/* ---------- 8. không được đặt meeple lên nét đã có meeple ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  setHand(s, 'RFRF');
  playTurn(s, 'p0', 1, 0, 1, { type: 'meeple', kind: 'road', seg: 0 }); // đường khởi đầu nối dài sang Đông
  t('người 0 đã đặt cướp trên đường (kho còn 6)', P(s, 0).supply === 6);
  setHand(s, 'RFRF');
  const r1 = applyAction(s, 'p1', { type: 'place', x: 2, y: 0, rot: 1 });
  t('người 1 nối dài đường thì ok', r1.ok);
  const r2 = applyAction(s, 'p1', { type: 'meeple', kind: 'road', seg: 0 });
  t('đặt cướp lên đường đã có cướp của người 0 thì bị từ chối (occupied)', !r2.ok && r2.reason === 'occupied');
  t('kho meeple của người 1 vẫn 7', P(s, 1).supply === 7);
  const r3 = applyAction(s, 'p1', { type: 'skip' });
  t('bỏ qua đặt meeple thì ok, sang lượt', r3.ok && s.turnIdx === 0);
}

/* ---------- 9. hòa điểm: 2 người cùng 1 meeple trên thành phố hoàn thành ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  /* Hòa điểm xảy ra khi 2 thành phố riêng (mỗi thành phố đã có 1 hiệp sĩ)
     được 1 lá nối lại thành 1 thành phố rồi hoàn thành cùng lúc. */
  /* người 0: CCFF ở Bắc, thành phố quay xuống Nam + Tây, đặt hiệp sĩ */
  setHand(s, 'CCFF');
  playTurn(s, 'p0', 0, -1, 2, { type: 'meeple', kind: 'city', seg: 0 });
  t('thành phố A (2 ô) vẫn dở (còn cạnh Tây hở): chưa có điểm', P(s, 0).score === 0);
  /* người 1: CRRF ở Tây, thành phố hướng Bắc (1 cạnh), đặt hiệp sĩ.
     Đường của nó nối vào đường lá khởi đầu, không ảnh hưởng thành phố. */
  setHand(s, 'CRRF');
  const r1 = playTurn(s, 'p1', -1, 0, 0, { type: 'meeple', kind: 'city', seg: 0 });
  t('người 1 đặt thành phố B riêng (1 ô) + hiệp sĩ thì ok', r1.ok);
  t('thành phố B vẫn dở: chưa có điểm', P(s, 1).score === 0);
  /* người 0: CCFF ở Tây-Bắc, thành phố quay sang Đông + Nam — nối A với B
     và khép kín cả 2 thành phố thành 1 thành phố 4 ô hoàn thành */
  setHand(s, 'CCFF');
  const r = playTurn(s, 'p0', -1, -1, 1, { type: 'skip' });
  t('người 0 đặt lá nối 2 thành phố thì ok', r.ok);
  t('thành phố 4 ô hoàn thành: cả 2 cùng +8 điểm (hòa, trọn điểm)', P(s, 0).score === 8 && P(s, 1).score === 8);
  t('cả 2 hiệp sĩ đều về kho', P(s, 0).supply === 7 && P(s, 1).supply === 7);
}

/* ---------- 10. tu viện hoàn thành: 9 điểm ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  /* vòng 8 lá quanh (3,0) — các cạnh kề nhau đã kiểm tra khớp nhau */
  const ring = [
    ['2,-1', 'CRRF', 0], ['3,-1', 'RFRF', 1], ['4,-1', 'CRRF', 2],
    ['2,0', 'RFRF', 0], ['4,0', 'CFFF', 0],
    ['2,1', 'CRRR', 3], ['3,1', 'RFRF', 1], ['4,1', 'RFRF', 1],
  ];
  for (const [key, type, rot] of ring) {
    const [x, y] = key.split(',').map(Number);
    s.board[key] = { type, rot, meeples: [] };
  }
  /* kiểm tra vòng khớp cạnh với nhau + với lá tu viện sắp đặt */
  let ringOk = true;
  for (const [key, type, rot] of ring) {
    const [x, y] = key.split(',').map(Number);
    for (let d = 0; d < 4; d++) {
      const nk = (x + (d === 1 ? 1 : d === 3 ? -1 : 0)) + ',' + (y + (d === 2 ? 1 : d === 0 ? -1 : 0));
      const nt = s.board[nk];
      if (!nt) continue;
      if (rotEdges(type, rot)[d] !== rotEdges(nt.type, nt.rot)[(d + 2) % 4]) ringOk = false;
    }
  }
  t('vòng 8 lá quanh tu viện khớp cạnh nhau', ringOk);
  t('tu viện đặt vào giữa vòng thì hợp lệ', canPlaceAt(s.board, 'FFFFL', 3, 0, 0));
  setHand(s, 'FFFFL');
  const r = playTurn(s, 'p0', 3, 0, 0, { type: 'meeple', kind: 'monastery', seg: 0 });
  t('đặt tu viện + tu sĩ thì ok', r.ok);
  t('tu viện đủ 8 lá kề: +9 điểm', P(s, 0).score === 9);
  t('tu sĩ về kho sau khi tính điểm', P(s, 0).supply === 7);
  /* tu viện dở cuối ván: 1 điểm/lá (lá tu viện + lá kề) */
  const s2 = createGame(mkPlayers(2), { seed: 7 });
  setHand(s2, 'FFFFL');
  playTurn(s2, 'p0', 0, 1, 0, { type: 'meeple', kind: 'monastery', seg: 0 }); // tu viện ở Nam, 1 lá kề (lá khởi đầu)
  t('tu viện dở (1 lá kề): chưa có điểm trong ván', P(s2, 0).score === 0);
  s2.stack = [];
  setHand(s2, 'CFFF');
  playTurn(s2, 'p1', 0, -1, 2, { type: 'skip' }); // hết chồng lá -> tính điểm cuối ván
  t('ván kết thúc khi hết chồng lá', s2.phase === 'ended');
  t('tu viện dở cuối ván: 1 (lá tu viện) + 1 (lá kề) = 2 điểm', P(s2, 0).score === 2);
}

/* ---------- 11. ruộng: 3 điểm mỗi thành phố hoàn thành chạm tới ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  setHand(s, 'CFFF');
  /* đặt CFFF ở Bắc (thành phố quay xuống Nam): thành phố 2 ô hoàn thành,
     nhưng đặt nông dân lên ruộng của lá đó thay vì hiệp sĩ */
  const r = playTurn(s, 'p0', 0, -1, 2, { type: 'meeple', kind: 'field', seg: 0 });
  t('đặt lá + nông dân thì ok', r.ok);
  t('thành phố hoàn thành nhưng không có hiệp sĩ: 0 điểm trong ván', P(s, 0).score === 0);
  t('ván chưa kết thúc (còn lá trong chồng)', s.phase === 'playing');
  t('nông dân vẫn ở trên ruộng tới cuối ván (kho còn 6)', P(s, 0).supply === 6);
  /* người 1 đặt 1 lá rồi ván hết (chồng đã trống từ trước) -> tính điểm cuối ván */
  s.stack = [];
  setHand(s, 'RFRF');
  playTurn(s, 'p1', 1, 0, 1, { type: 'skip' });
  t('ván đã kết thúc (hết chồng lá)', s.phase === 'ended');
  t('ruộng chạm 1 thành phố hoàn thành: +3 điểm cuối ván', P(s, 0).score === 3);
  t('người 0 thắng (3 điểm, người 1 có 0)', s.winner === 'p0' && s.winners.length === 1);
  t('lý do kết thúc là hết lá (match/tiles)', s.endReason === 'match' && s.endCause === 'tiles');
}

/* ---------- 12. điểm cuối ván: thành phố dở 1 điểm/ô, đường dở 1 điểm/ô ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  s.stack = [];
  setHand(s, 'CFFF');
  /* thành phố 2 ô hoàn thành ngay (đặt hiệp sĩ) -> +4, không phải điểm cuối ván */
  playTurn(s, 'p0', 0, -1, 2, { type: 'meeple', kind: 'city', seg: 0 });
  t('thành phố hoàn thành trong ván: +4', P(s, 0).score === 4);
  /* ván kết thúc luôn vì chồng lá đã trống (advanceTurn hết lá) */
  t('ván kết thúc', s.phase === 'ended');
  /* đường dở: người 1 đặt cướp lên đường khởi đầu rồi ván hết */
  const s2 = createGame(mkPlayers(2), { seed: 7 });
  s2.stack = [];
  setHand(s2, 'RFRF');
  playTurn(s2, 'p0', 1, 0, 1, { type: 'meeple', kind: 'road', seg: 0 }); // đường 2 ô, dở
  t('ván 2 kết thúc (hết lá)', s2.phase === 'ended');
  t('đường dở 2 ô cuối ván: +2 điểm', P(s2, 0).score === 2);
  t('kẻ cướp không về kho (ván đã hết)', P(s2, 0).supply === 6);
}

/* ---------- 13. lá không đặt được ở đâu thì bị loại, bốc lá khác ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  /* vòng thành phố quanh lá khởi đầu: mọi ô trống kề bàn đều chỉ lộ cạnh thành phố */
  s.board['0,-1'] = { type: 'CCCCS', rot: 0, meeples: [] }; // Bắc: 4 thành phố
  s.board['1,0'] = { type: 'CCRC', rot: 1, meeples: [] };  // Đông: Tây=đường (khớp), còn lại thành phố
  s.board['0,1'] = { type: 'CCFC', rot: 2, meeples: [] };  // Nam: Bắc=ruộng (khớp), còn lại thành phố
  s.board['-1,0'] = { type: 'CCRC', rot: 3, meeples: [] }; // Tây: Đông=đường (khớp), còn lại thành phố
  t('RFRF (không có cạnh thành phố) không đặt được ở đâu', legalPlacementsFor(s.board, 'RFRF').length === 0);
  t('CFFF (có thành phố) vẫn đặt được', legalPlacementsFor(s.board, 'CFFF').length > 0);
  s.stack = ['CFFF', 'RFRF']; // bốc RFRF trước (pop từ cuối), rồi CFFF
  setHand(s, 'CCCCS');
  /* đặt lá 4 thành phố ở (0,-2): mọi cạnh lộ ra đều là thành phố nên RFRF
     vẫn không đặt được ở đâu sau nước này */
  const r = playTurn(s, 'p0', 0, -2, 0, { type: 'skip' });
  t('đặt lá CCCCS ở (0,-2) thì ok', r.ok);
  t('RFRF đã bị loại khỏi ván', s.discarded.includes('RFRF'));
  t('sau khi loại lá, bốc được CFFF làm lá trên tay', s.hand === 'CFFF' && s.step === 'place');
}

/* ---------- 14. xin thua kết thúc trận ngay ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  setHand(s, 'CFFF');
  playTurn(s, 'p0', 0, -1, 2, { type: 'meeple', kind: 'city', seg: 0 }); // người 0 +4
  const r = applyAction(s, 'p1', { type: 'resign' });
  t('xin thua thì ok', r.ok);
  t('ván kết thúc ngay, lý do resign', s.phase === 'ended' && s.endReason === 'resign' && s.endCause === 'resign');
  t('người không xin thua có điểm cao nhất thắng', s.winner === 'p0');
  t('người xin thua không thắng dù có điểm', !s.winners.includes('p1'));
  t('nước đi sau khi ván kết thúc thì bị từ chối', !applyAction(s, 'p0', { type: 'skip' }).ok);
  t('actors() trống khi ván đã kết thúc', actors(s).length === 0);
}

/* ---------- 15. legalMoves theo bước ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  setHand(s, 'CFFF');
  const placeMoves = legalMoves(s, 'p0');
  t('bước đặt lá: legalMoves toàn nước place', placeMoves.length > 0 && placeMoves.every(m => m.type === 'place'));
  t('bước đặt lá: người chưa tới lượt không có nước đi', legalMoves(s, 'p1').length === 0);
  applyAction(s, 'p0', { type: 'place', x: 0, y: -1, rot: 2 });
  const meepleMoves = legalMoves(s, 'p0');
  t('bước đặt meeple: có nước meeple (thành phố + ruộng) và skip',
    meepleMoves.some(m => m.type === 'meeple' && m.kind === 'city')
    && meepleMoves.some(m => m.type === 'meeple' && m.kind === 'field')
    && meepleMoves.some(m => m.type === 'skip'));
  t('bước đặt meeple: không có nước place', meepleMoves.every(m => m.type !== 'place'));
  /* hết meeple trong kho thì chỉ còn skip */
  const s2 = createGame(mkPlayers(2), { seed: 7 });
  P(s2, 0).supply = 0;
  setHand(s2, 'CFFF');
  applyAction(s2, 'p0', { type: 'place', x: 0, y: -1, rot: 2 });
  const m2 = legalMoves(s2, 'p0');
  t('hết meeple thì chỉ còn nước skip', m2.length === 1 && m2[0].type === 'skip');
}

/* ---------- 16. viewFor che thông tin ẩn ---------- */
{
  const s = createGame(mkPlayers(2), { seed: 7 });
  const v0 = viewFor(s, 'p0');
  const v1 = viewFor(s, 'p1');
  t('người tới lượt thấy lá trên tay mình', v0.hand === s.hand);
  t('người chưa tới lượt không thấy lá trên tay', v1.hand === null);
  t('viewFor không lộ thứ tự chồng lá (chỉ có số lá còn)', v0.stackCount === s.stack.length && !('stack' in v0));
  t('viewFor lộ bàn cờ (công khai)', Object.keys(v0.board).length === 1 && v0.board['0,0'].type === 'CRFR');
  t('viewFor lộ kho meeple (công khai)', v0.players.every(p => typeof p.supply === 'number'));
  t('viewFor không có trường you', !('you' in v0));
  t('viewFor có trường me', v0.me === 'p0' && v1.me === 'p1');
}

/* ---------- 17. serialize / deserialize ---------- */
{
  const s = createGame(mkPlayers(3), { seed: 99 });
  setHand(s, 'RFRF');
  playTurn(s, 'p0', 1, 0, 1, { type: 'meeple', kind: 'road', seg: 0 });
  const json = serialize(s);
  const s2 = deserialize(json);
  t('deserialize vòng lại giống hệt', JSON.stringify(s2) === JSON.stringify(s));
  let threw = false;
  try { deserialize('{"x":1}'); } catch (e) { threw = true; }
  t('deserialize dữ liệu hỏng thì báo lỗi', threw);
}

/* ---------- 18. computeFeatures: thành phố/ruộng nối qua nhiều lá ---------- */
{
  /* ruộng 2 bên đường KHÔNG nối nhau: đường thẳng RFRF chia ruộng Đông/Tây */
  const board = {
    '0,0': { type: 'RFRF', rot: 0, meeples: [] },
    '0,1': { type: 'RFRF', rot: 0, meeples: [] },
  };
  const { features } = computeFeatures(board);
  const fields = features.filter(f => f.kind === 'field');
  t('2 lá đường thẳng: ruộng Đông và ruộng Tây là 2 nét riêng (đường chia cắt)', fields.length === 2);
  t('mỗi ruộng gồm 2 lá', fields.every(f => f.tiles.size === 2));
  /* đường nối qua 2 lá thành 1 nét */
  const roads = features.filter(f => f.kind === 'road');
  t('2 lá đường thẳng: đường là 1 nét duy nhất', roads.length === 1 && roads[0].tiles.size === 2);
  t('đường 2 ô dở: 2 điểm', featPoints(roads[0], false) === 2);
  /* thành phố nối qua 2 lá */
  const board2 = {
    '0,0': { type: 'CRFR', rot: 0, meeples: [] },
    '0,-1': { type: 'CFFF', rot: 2, meeples: [] },
  };
  const f2 = computeFeatures(board2);
  const cities = f2.features.filter(f => f.kind === 'city');
  t('thành phố khởi đầu + CFFF: 1 nét thành phố 2 ô', cities.length === 1 && cities[0].tiles.size === 2);
  t('thành phố 2 ô hoàn thành: 4 điểm', cities[0].complete && featPoints(cities[0], true) === 4);
  t('majorityOwners: không meeple thì không ai được điểm', majorityOwners(cities[0]).length === 0);
}

console.log(`\nLuật Carcassonne: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
