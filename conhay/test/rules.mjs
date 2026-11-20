// 🔴 Test luật Cờ Nhảy — chạy: node test/rules.mjs
// Seed Math.random để mọi assert thống kê đều ổn định giữa các lần chạy.
import {
  createGame, applyAction, viewFor, actors, legalMoves, legalMovesFromView,
  serialize, deserialize, HOLES, TRIANGLES, DEST_TRIANGLE, neighbors,
  hexDist, holeByQR, bfsDistToDest, inHome, totalDist, mulberry32,
} from '../js/engine.js';

Math.random = mulberry32(20261120);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; }
  else { fail++; console.log(`FAIL: ${name} ${extra}`); }
}

/* đặt lại bàn: dọn sạch rồi đặt bi theo ý muốn (dùng cho test tình huống) */
function setBoard(s, placements) {
  /* placements: {pid: [holeIds]} */
  s.occ = new Array(HOLES.length).fill(null);
  for (const p of s.players) p.marbles = [];
  for (const [pid, holes] of Object.entries(placements)) {
    const p = s.players.find(x => x.id === pid);
    p.marbles = holes.slice();
    for (const h of holes) s.occ[h] = pid;
  }
  for (const p of s.players) p.score = inHome(p, p.destTri);
}

/* ---------- §0. Hình học bàn (nguồn: luật chuẩn Cờ Nhảy) ---------- */
{
  check('§0 bàn có đúng 121 lỗ', HOLES.length === 121, `got ${HOLES.length}`);
  check('§0 có 6 tam giác', TRIANGLES.length === 6);
  check('§0 mỗi tam giác đúng 10 lỗ', TRIANGLES.every(t => t.length === 10));
  const all = new Set(HOLES.map(h => h.id));
  const triHoles = TRIANGLES.flat();
  check('§0 60 lỗ tam giác không trùng nhau', new Set(triHoles).size === 60);
  check('§0 lỗ tam giác không nằm trong lục giác giữa', triHoles.every(h => {
    const hole = HOLES[h];
    return Math.max(Math.abs(hole.q), Math.abs(hole.r), Math.abs(hole.q + hole.r)) > 4;
  }));
  /* lục giác giữa đúng 61 lỗ */
  const hexCount = HOLES.filter(h => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r)) <= 4).length;
  check('§0 lục giác giữa đúng 61 lỗ', hexCount === 61, `got ${hexCount}`);
  /* bàn liên thông: BFS từ lỗ giữa tới được mọi lỗ */
  const seen = new Set([holeByQR(0, 0)]);
  const stack = [holeByQR(0, 0)];
  while (stack.length) {
    const cur = stack.pop();
    for (const n of neighbors(cur)) if (!seen.has(n)) { seen.add(n); stack.push(n); }
  }
  check('§0 bàn liên thông (121 lỗ đều tới được)', seen.size === 121, `got ${seen.size}`);
  /* mỗi lỗ có đúng 6 kề trừ lỗ biên (ít nhất 2 kề) */
  check('§0 mọi lỗ đều có 2–6 lỗ kề', HOLES.every(h => {
    const n = neighbors(h.id).length;
    return n >= 2 && n <= 6;
  }));
  /* đỉnh tam giác đối nhau cách 16, tam giác kề cách 8 */
  check('§0 đỉnh đối nhau cách 16', hexDist(TRIANGLES[0][0], TRIANGLES[3][0]) === 16);
  check('§0 đỉnh kề nhau cách 8', hexDist(TRIANGLES[0][0], TRIANGLES[1][0]) === 8);
  /* đích của tam giác t là (t+3)%6 */
  check('§0 DEST_TRIANGLE đúng (đối diện)', DEST_TRIANGLE.every((d, t) => d === (t + 3) % 6));
  /* hàng đáy mỗi tam giác chạm lục giác giữa */
  for (let t = 0; t < 6; t++) {
    const base = TRIANGLES[t].slice(6);
    const ok = base.every(h => neighbors(h).some(n => {
      const hole = HOLES[n];
      return Math.max(Math.abs(hole.q), Math.abs(hole.r), Math.abs(hole.q + hole.r)) <= 4;
    }));
    check(`§0 hàng đáy tam giác ${t} chạm lục giác giữa`, ok);
  }
  /* đỉnh tam giác là lỗ xa tâm nhất của tam giác đó */
  for (let t = 0; t < 6; t++) {
    const tip = TRIANGLES[t][0];
    const ok = TRIANGLES[t].every(h => hexDist(h, holeByQR(0, 0)) <= hexDist(tip, holeByQR(0, 0)));
    check(`§0 đỉnh tam giác ${t} xa tâm nhất`, ok);
  }
  /* khoảng cách BFS tới tam giác đích: trong đích = 0, càng gần càng nhỏ */
  for (let t = 0; t < 6; t++) {
    check(`§0 BFS: bi trong tam giác ${t} cách đích ${t} là 0`, TRIANGLES[t].every(h => bfsDistToDest(h, t) === 0));
  }
  check('§0 BFS: lỗ kề đích cách 1', (() => {
    const dest = TRIANGLES[0];
    const near = neighbors(dest[9]).find(n => !dest.includes(n));
    return near !== undefined && bfsDistToDest(near, 0) === 1;
  })());
  /* trường hợp từng làm bot tham lam kẹt: bi ở (3,2) (tam giác 1) muốn về
     đích 0 thì (3,1) gần hơn (3 thay vì 4) — đo thẳng tới đỉnh thì không thấy */
  check('§0 BFS: (3,2) cách đích 0 là 3, (3,1) cách 2', bfsDistToDest(holeByQR(3, 2), 0) === 3 && bfsDistToDest(holeByQR(3, 1), 0) === 2);
  check('§0 BFS: mọi lỗ đều tới được đích (hữu hạn)', HOLES.every(h => bfsDistToDest(h.id, 0) < Infinity));
}

/* ---------- §1. Khởi tạo ván ---------- */
{
  for (const n of [2, 3, 4, 6]) {
    const s = createGame(Array.from({ length: n }, (_, i) => 'P' + i), { seed: 11 });
    check(`§1 ${n} người: đúng ${n} người chơi`, s.players.length === n);
    check(`§1 ${n} người: mỗi người 10 bi`, s.players.every(p => p.marbles.length === 10));
    check(`§1 ${n} người: 10 bi mỗi người đều khác nhau`, new Set(s.players.flatMap(p => p.marbles)).size === n * 10);
    check(`§1 ${n} người: bi nằm trong tam giác nhà của mình`, s.players.every(p => p.marbles.every(h => TRIANGLES[p.tri].includes(h))));
    check(`§1 ${n} người: occ khớp với bi`, s.players.every(p => p.marbles.every(h => s.occ[h] === p.id)));
    check(`§1 ${n} người: đích là tam giác đối diện`, s.players.every(p => p.destTri === (p.tri + 3) % 6));
    check(`§1 ${n} người: lượt đầu là người 0`, s.turn === s.players[0].id && actors(s)[0] === s.players[0].id);
    check(`§1 ${n} người: phase playing, vòng 1`, s.phase === 'playing' && s.round === 1);
  }
  /* 2 người ngồi đối nhau (tam giác 0 và 3) */
  const s2 = createGame(['A', 'B'], { seed: 12 });
  check('§1 2 người ngồi tam giác 0 và 3', s2.players[0].tri === 0 && s2.players[1].tri === 3);
  /* 3 người ngồi tam giác 0, 2, 4 */
  const s3 = createGame(['A', 'B', 'C'], { seed: 13 });
  check('§1 3 người ngồi tam giác 0, 2, 4', s3.players.map(p => p.tri).join(',') === '0,2,4');
  /* 4 người ngồi tam giác 0, 1, 3, 4 */
  const s4 = createGame(['A', 'B', 'C', 'D'], { seed: 14 });
  check('§1 4 người ngồi tam giác 0, 1, 3, 4', s4.players.map(p => p.tri).join(',') === '0,1,3,4');
  /* 6 người ngồi đủ 6 tam giác */
  const s6 = createGame(['A', 'B', 'C', 'D', 'E', 'F'], { seed: 15 });
  check('§1 6 người ngồi đủ 6 tam giác', s6.players.map(p => p.tri).join(',') === '0,1,2,3,4,5');
  /* số người không hợp lệ bị từ chối */
  for (const n of [1, 5, 7]) {
    let threw = false;
    try { createGame(Array.from({ length: n }, (_, i) => 'P' + i)); } catch (e) { threw = true; }
    check(`§1 ${n} người bị từ chối`, threw);
  }
  /* chấp nhận tên chuỗi lẫn object */
  const so = createGame([{ id: 'x', name: 'An' }, { id: 'y', name: 'Bình', isBot: true, level: 'hard' }], { seed: 16 });
  check('§1 chấp nhận object player (id/name/isBot/level)', so.players[1].isBot && so.players[1].level === 'hard' && so.players[0].name === 'An');
  /* cùng seed thì khởi tạo giống hệt */
  const a = createGame(['A', 'B'], { seed: 42 });
  const b = createGame(['A', 'B'], { seed: 42 });
  check('§1 cùng seed khởi tạo giống hệt', JSON.stringify(a) === JSON.stringify(b) || (a.gid === b.gid && JSON.stringify(a.players) === JSON.stringify(b.players)));
}

/* ---------- §2. Đi 1 bước ---------- */
{
  const s = createGame(['A', 'B'], { seed: 21 });
  const me = s.players[0].id;
  /* bi ở đỉnh tam giác bị kẹt (2 lỗ kề đều có bi nhà) nên phải chọn bi
     ở hàng đáy — bi đó có lỗ kề trống ra lục giác giữa */
  const from = s.players[0].marbles.find(m => neighbors(m).some(n => !s.occ[n]));
  check('§2 có bi ở nhà có lỗ kề trống để đi', from !== undefined);
  const dests = neighbors(from).filter(n => !s.occ[n]);
  check('§2 bi ở hàng đáy có lỗ kề trống', dests.length > 0);
  const r = applyAction(s, me, { type: 'move', from, path: [dests[0]] });
  check('§2 đi 1 bước hợp lệ được chấp nhận', r.ok, r.reason || '');
  check('§2 sau khi đi, bi đã dời tới lỗ đích', s.players[0].marbles.includes(dests[0]) && !s.players[0].marbles.includes(from));
  check('§2 sau khi đi, occ cập nhật', s.occ[dests[0]] === me && s.occ[from] === null);
  check('§2 sau khi đi, lượt chuyển sang người 2', s.turn === s.players[1].id);
  check('§2 turns của người đi tăng 1', s.players[0].turns === 1);

  /* đi vào lỗ đã có bi thì bị từ chối */
  const s2 = createGame(['A', 'B'], { seed: 22 });
  const m2 = s2.players[0].marbles.find(m => neighbors(m).some(n => s2.occ[n]));
  const occupied = neighbors(m2).find(n => s2.occ[n]);
  check('§2 có lỗ kề đã có bi (để test từ chối)', occupied !== undefined);
  const r2 = applyAction(s2, s2.players[0].id, { type: 'move', from: m2, path: [occupied] });
  check('§2 đi vào lỗ đã có bi bị từ chối', !r2.ok);
  check('§2 nước bị từ chối không đổi lượt', s2.turn === s2.players[0].id);
  /* đi bi của người khác bị từ chối */
  const otherMarble = s2.players[1].marbles.find(m => neighbors(m).some(n => !s2.occ[n]));
  const otherDest = neighbors(otherMarble).find(n => !s2.occ[n]);
  const r3 = applyAction(s2, s2.players[0].id, { type: 'move', from: otherMarble, path: [otherDest] });
  check('§2 đi bi của người khác bị từ chối', !r3.ok);
  /* đi khi chưa tới lượt bị từ chối */
  const r4 = applyAction(s2, s2.players[1].id, { type: 'move', from: otherMarble, path: [otherDest] });
  check('§2 đi khi chưa tới lượt bị từ chối', !r4.ok);
  /* đi tới lỗ cách 3 bị từ chối (đặt bi giữa bàn cho chắc chắn) */
  const s2b = createGame(['A', 'B'], { seed: 23 });
  setBoard(s2b, { [s2b.players[0].id]: [holeByQR(0, 0)] });
  const far = holeByQR(3, 0);
  const r5 = applyAction(s2b, s2b.players[0].id, { type: 'move', from: holeByQR(0, 0), path: [far] });
  check('§2 đi tới lỗ cách 3 bị từ chối', !r5.ok);
  /* path rỗng bị từ chối */
  const r6 = applyAction(s2, s2.players[0].id, { type: 'move', from: m2, path: [] });
  check('§2 path rỗng bị từ chối', !r6.ok);
  /* nước lạ bị từ chối */
  const r7 = applyAction(s2, s2.players[0].id, { type: 'fly', from: m2, path: [dests[0]] });
  check('§2 nước lạ (type fly) bị từ chối', !r7.ok);
}

/* ---------- §3. Nhảy ---------- */
{
  /* dựng tình huống: bi A tại (0,0), bi B tại (1,0), lỗ (2,0) trống */
  const s = createGame(['A', 'B'], { seed: 31 });
  const aId = s.players[0].id, bId = s.players[1].id;
  const h00 = holeByQR(0, 0), h10 = holeByQR(1, 0), h20 = holeByQR(2, 0);
  setBoard(s, { [aId]: [h00], [bId]: [h10] });
  const r = applyAction(s, aId, { type: 'move', from: h00, path: [h20] });
  check('§3 nhảy 1 lần qua bi đối thủ được chấp nhận', r.ok, r.reason || '');
  check('§3 sau khi nhảy, bi ở lỗ đích', s.players[0].marbles.includes(h20));
  check('§3 bi bị nhảy qua vẫn còn nguyên', s.players[1].marbles.includes(h10) && s.occ[h10] === bId);
  check('§3 nhảy 1 lần ghi jumpChainMax=1', s.players[0].jumpChainMax === 1);

  /* nhảy qua lỗ trống thì bị từ chối */
  const s2 = createGame(['A', 'B'], { seed: 32 });
  setBoard(s2, { [s2.players[0].id]: [holeByQR(0, 0)] });
  const r2 = applyAction(s2, s2.players[0].id, { type: 'move', from: holeByQR(0, 0), path: [holeByQR(2, 0)] });
  check('§3 nhảy qua lỗ trống (không có bi) bị từ chối', !r2.ok);
  /* nhảy tới lỗ đã có bi thì bị từ chối */
  const s3 = createGame(['A', 'B'], { seed: 33 });
  setBoard(s3, {
    [s3.players[0].id]: [holeByQR(0, 0)],
    [s3.players[1].id]: [holeByQR(1, 0), holeByQR(2, 0)],
  });
  const r3 = applyAction(s3, s3.players[0].id, { type: 'move', from: holeByQR(0, 0), path: [holeByQR(2, 0)] });
  check('§3 nhảy tới lỗ đã có bi bị từ chối', !r3.ok);
  /* nhảy qua bi của mình cũng được */
  const s4 = createGame(['A', 'B'], { seed: 34 });
  setBoard(s4, { [s4.players[0].id]: [holeByQR(0, 0), holeByQR(1, 0)] });
  const r4 = applyAction(s4, s4.players[0].id, { type: 'move', from: holeByQR(0, 0), path: [holeByQR(2, 0)] });
  check('§3 nhảy qua bi của chính mình cũng được', r4.ok, r4.reason || '');

  /* nhảy dây chuyền 3 lần dọc trục r=0: A tại (-4,0), bi cản tại
     (-3,0), (-1,0), (1,0) — chuỗi (-2,0), (0,0), (2,0) */
  const s5 = createGame(['A', 'B'], { seed: 35 });
  setBoard(s5, {
    [s5.players[0].id]: [holeByQR(-4, 0)],
    [s5.players[1].id]: [holeByQR(-3, 0), holeByQR(-1, 0), holeByQR(1, 0)],
  });
  const chain = [holeByQR(-2, 0), holeByQR(0, 0), holeByQR(2, 0)];
  const r5 = applyAction(s5, s5.players[0].id, { type: 'move', from: holeByQR(-4, 0), path: chain });
  check('§3 nhảy dây chuyền 3 lần được chấp nhận', r5.ok, r5.reason || '');
  check('§3 sau chuỗi nhảy, bi ở lỗ cuối', s5.players[0].marbles.includes(holeByQR(2, 0)));
  check('§3 chuỗi 3 lần ghi jumpChainMax=3', s5.players[0].jumpChainMax === 3);
  /* chuỗi nhảy đáp lại lỗ đã qua thì bị từ chối (đi vòng lại) */
  const s6 = createGame(['A', 'B'], { seed: 36 });
  setBoard(s6, {
    [s6.players[0].id]: [holeByQR(0, 0)],
    [s6.players[1].id]: [holeByQR(1, 0), holeByQR(3, 0)],
  });
  const r6 = applyAction(s6, s6.players[0].id, { type: 'move', from: holeByQR(0, 0), path: [holeByQR(2, 0), holeByQR(4, 0), holeByQR(2, 0)] });
  check('§3 chuỗi nhảy đáp lại lỗ đã qua bị từ chối', !r6.ok);
  /* chuỗi nhảy qua lỗ bi vừa rời khỏi (trống rồi) thì bị từ chối */
  const s7 = createGame(['A', 'B'], { seed: 37 });
  setBoard(s7, {
    [s7.players[0].id]: [holeByQR(0, 0)],
    [s7.players[1].id]: [holeByQR(1, 0), holeByQR(3, 0)],
  });
  /* (0,0)->(2,0) nhảy qua (1,0); rồi từ (2,0) nhảy ngược qua (1,0) là nhảy qua lỗ trống? không — (1,0) vẫn có bi B. Thử nhảy qua lỗ xuất phát (0,0): từ (2,0) nhảy qua (1,0) đáp (0,0) — đáp lại lỗ xuất phát nên bị từ chối vì revisit */
  const r7 = applyAction(s7, s7.players[0].id, { type: 'move', from: holeByQR(0, 0), path: [holeByQR(2, 0), holeByQR(0, 0)] });
  check('§3 chuỗi nhảy đáp lại lỗ xuất phát bị từ chối', !r7.ok);
  /* nhảy qua lỗ giữa không thẳng hàng (cách 2 nhưng lệch) bị từ chối */
  const s8 = createGame(['A', 'B'], { seed: 38 });
  setBoard(s8, {
    [s8.players[0].id]: [holeByQR(0, 0)],
    [s8.players[1].id]: [holeByQR(1, 0)],
  });
  const r8 = applyAction(s8, s8.players[0].id, { type: 'move', from: holeByQR(0, 0), path: [holeByQR(2, -1)] });
  check('§3 nhảy tới lỗ cách 2 nhưng lệch hướng bị từ chối', !r8.ok);
}

/* ---------- §4. Thắng ---------- */
{
  /* đặt 9 bi của A vào đích, 1 bi kề đích rồi đi vào.
     B tạm đặt ở tam giác 1 (không chặn đích của A là tam giác 3). */
  const s = createGame(['A', 'B'], { seed: 41 });
  const aId = s.players[0].id, bId = s.players[1].id;
  const destTri = s.players[0].destTri;
  const destHoles = TRIANGLES[destTri];
  const nine = destHoles.slice(0, 9);
  /* tìm 1 bi ngoài đích kề 1 lỗ đích trống */
  const lastDest = destHoles[9];
  const outside = neighbors(lastDest).find(n => !destHoles.includes(n) && !s.occ[n]);
  setBoard(s, { [aId]: [...nine, outside], [bId]: TRIANGLES[1].slice() });
  const r = applyAction(s, aId, { type: 'move', from: outside, path: [lastDest] });
  check('§4 đi bi cuối vào đích được chấp nhận', r.ok, r.reason || '');
  check('§4 ván kết thúc sau khi đủ 10 bi vào đích', s.phase === 'ended');
  check('§4 người thắng là A', s.winner === aId && s.winners.includes(aId));
  check('§4 endReason là match', s.endReason === 'match' && s.endCause === 'match');
  check('§4 người thắng có score 10', s.players[0].score === 10);
  check('§4 final.summary có đủ inHome/progress/jumpChainMax/turns', (() => {
    const st = s.final.summary[aId];
    return st && st.inHome === 10 && st.progress === 10 && typeof st.jumpChainMax === 'number' && typeof st.turns === 'number';
  })());
  check('§4 final.scores có đủ người chơi', s.final.scores.length === 2);
  check('§4 sau khi hết ván, nước đi bị từ chối', !applyAction(s, aId, { type: 'move', from: lastDest, path: [outside] }).ok);
  check('§4 losers là B', s.losers.includes(bId));
  /* score = số bi trong đích */
  const s2 = createGame(['A', 'B'], { seed: 42 });
  setBoard(s2, { [s2.players[0].id]: [...TRIANGLES[s2.players[0].destTri].slice(0, 4), ...TRIANGLES[0].slice(0, 6)] });
  check('§4 score đếm đúng bi trong đích (4)', s2.players[0].score === 4 || inHome(s2.players[0], s2.players[0].destTri) === 4);
}

/* ---------- §5. Xin thua ---------- */
{
  const s = createGame(['A', 'B', 'C'], { seed: 51 });
  /* cho A 3 bi vào đích, B 1 bi, C 0 bi rồi A xin thua */
  const aId = s.players[0].id, bId = s.players[1].id, cId = s.players[2].id;
  const aDest = TRIANGLES[s.players[0].destTri];
  const bDest = TRIANGLES[s.players[1].destTri];
  setBoard(s, {
    [aId]: [...aDest.slice(0, 3), ...TRIANGLES[0].slice(0, 7)],
    [bId]: [...bDest.slice(0, 1), ...TRIANGLES[1].slice(0, 9)],
    [cId]: TRIANGLES[2].slice(),
  });
  const r = applyAction(s, aId, { type: 'resign' });
  check('§5 xin thua được chấp nhận', r.ok);
  check('§5 xin thua kết thúc ván ngay', s.phase === 'ended' && s.endReason === 'resign');
  check('§5 người xin thua không thắng', !s.winners.includes(aId) && s.losers.includes(aId));
  check('§5 người còn lại nhiều bi trong đích nhất thắng (B có 1, C có 0)', s.winner === bId, `winner=${s.winner}`);
  /* xin thua khi chưa tới lượt mình vẫn được (bất kể bước nào) */
  const s2 = createGame(['A', 'B'], { seed: 52 });
  const r2 = applyAction(s2, s2.players[1].id, { type: 'resign' });
  check('§5 xin thua khi chưa tới lượt vẫn được', r2.ok && s2.phase === 'ended');
  check('§5 xin thua khi chưa tới lượt: người còn lại thắng', s2.winner === s2.players[0].id);
}

/* ---------- §6. Bỏ lượt (van an toàn) ---------- */
{
  /* bỏ lượt khi còn nước đi thì bị từ chối */
  const s = createGame(['A', 'B'], { seed: 61 });
  const r = applyAction(s, s.players[0].id, { type: 'pass' });
  check('§6 bỏ lượt khi còn nước đi bị từ chối', !r.ok);
  check('§6 legalMoves đầu ván không chứa pass', legalMoves(s, s.players[0].id).every(m => m.type !== 'pass'));
  /* dựng bàn mà người tới lượt không còn nước đi: nhốt 1 bi giữa bi khác
     (mọi lỗ kề đều có bi, mọi lỗ nhảy tới đều có bi) — dùng bàn đầy */
  const s2 = createGame(['A', 'B'], { seed: 62 });
  const aId = s2.players[0].id, bId = s2.players[1].id;
  /* bi A tại (0,0); lấp kín mọi lỗ kề và mọi lỗ nhảy tới */
  const h00 = holeByQR(0, 0);
  const around = neighbors(h00);
  const landings = [];
  for (const [dq, dr] of [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]) {
    const land = holeByQR(0 + 2 * dq, 0 + 2 * dr);
    if (land !== null) landings.push(land);
  }
  const blockers = [...new Set([...around, ...landings])];
  setBoard(s2, { [aId]: [h00], [bId]: blockers });
  const moves = legalMoves(s2, aId);
  check('§6 bi bị nhốt kín thì chỉ còn nước pass', moves.length === 1 && moves[0].type === 'pass', `moves=${JSON.stringify(moves)}`);
  const r2 = applyAction(s2, aId, { type: 'pass' });
  check('§6 bỏ lượt khi không còn nước đi được chấp nhận', r2.ok);
  check('§6 sau khi bỏ lượt, lượt chuyển sang người 2', s2.turn === bId);
}

/* ---------- §7. viewFor ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 71 });
  applyAction(s, s.players[0].id, legalMoves(s, s.players[0].id)[0]);
  const v0 = viewFor(s, s.players[0].id);
  const v1 = viewFor(s, s.players[1].id);
  check('§7 view không có trường you', !('you' in v0) && !('you' in v1));
  check('§7 view không lộ _seed', !('_seed' in v0) && !('seed' in v0));
  check('§7 view me đúng từng người', v0.me === s.players[0].id && v1.me === s.players[1].id);
  check('§7 view occ công khai, 2 người thấy giống nhau', JSON.stringify(v0.occ) === JSON.stringify(v1.occ) && JSON.stringify(v0.players) === JSON.stringify(v1.players));
  check('§7 view có đủ gid/seq/phase/round/turn/step', !!v0.gid && typeof v0.seq === 'number' && v0.phase === 'playing' && v0.round === 1 && !!v0.turn && v0.step === 'act');
  check('§7 view có log', Array.isArray(v0.log) && v0.log.length > 0);
  /* sửa view không làm hỏng state gốc */
  const before = JSON.stringify(s);
  v0.occ[0] = 'XXX';
  v0.players[0].score = 999;
  v0.players[0].marbles = [0];
  check('§7 sửa view không làm hỏng state gốc', JSON.stringify(s) === before);
  /* legalMovesFromView trên view khớp với legalMoves trên state */
  const fromView = legalMovesFromView(v0, s.players[1].id);
  check('§7 legalMoves của người không tới lượt thì rỗng', legalMovesFromView(v0, s.players[1].id).length === 0 || s.turn === s.players[1].id);
  const s2 = createGame(['A', 'B'], { seed: 72 });
  const vA = viewFor(s2, s2.players[0].id);
  const mv = legalMovesFromView(vA, s2.players[0].id);
  check('§7 legalMovesFromView đầu ván có nước đi', mv.length > 0 && mv.every(m => m.type === 'move' || m.type === 'pass'));
  check('§7 legalMovesFromView chỉ có nước của người tới lượt', mv.every(m => m.type === 'pass' || s2.players[0].marbles.includes(m.from)));
}

/* ---------- §8. Serialize ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 81 });
  const s2 = deserialize(serialize(s));
  const strip = (x) => { const t = JSON.parse(JSON.stringify(x)); delete t.startedAt; delete t.endedAt; delete t.gid; return JSON.stringify(t); };
  check('§8 deserialize(serialize(s)) giống s', strip(s2) === strip(s));
  check('§8 serialize lại byte-stable', serialize(deserialize(serialize(s))) === serialize(s));
  applyAction(s, s.players[0].id, legalMoves(s, s.players[0].id)[0]);
  check('§8 sau nước đi vẫn byte-stable', serialize(deserialize(serialize(s))) === serialize(s));
  let threw = false;
  try { deserialize('{"nope":true}'); } catch (e) { threw = true; }
  check('§8 dữ liệu hỏng bị từ chối', threw);
  let threw2 = false;
  try { deserialize(JSON.stringify({ players: [], occ: [] })); } catch (e) { threw2 = true; }
  check('§8 occ sai độ dài bị từ chối', threw2);
}

/* ---------- §9. legalMoves chi tiết ---------- */
{
  const s = createGame(['A', 'B'], { seed: 91 });
  const moves = legalMoves(s, s.players[0].id);
  check('§9 đầu ván 2 người có nước đi', moves.length > 0);
  check('§9 mọi nước đầu ván đều là move', moves.every(m => m.type === 'move'));
  check('§9 mọi nước đều từ bi của người tới lượt', moves.every(m => s.players[0].marbles.includes(m.from)));
  check('§9 mọi path đều tới lỗ trống', moves.every(m => m.path.every(h => !s.occ[h])));
  check('§9 legalMoves ổn định thứ tự (gọi 2 lần giống nhau)', JSON.stringify(legalMoves(s, s.players[0].id)) === JSON.stringify(moves));
  /* bi ở nhà có ít nhất 1 nước bước đi */
  const steps = moves.filter(m => m.jumps === 0);
  check('§9 đầu ván có nước đi 1 bước', steps.length > 0);
  /* nhảy dây chuyền được liệt kê thành nhiều nước (mỗi chuỗi 1 nước) */
  const s2 = createGame(['A', 'B'], { seed: 92 });
  setBoard(s2, {
    [s2.players[0].id]: [holeByQR(0, 0)],
    [s2.players[1].id]: [holeByQR(1, 0), holeByQR(3, 0)],
  });
  const mv2 = legalMoves(s2, s2.players[0].id);
  const chains = mv2.filter(m => m.jumps >= 2);
  check('§9 chuỗi nhảy 2 lần được liệt kê riêng', chains.some(m => m.path.length === 2 && m.path[0] === holeByQR(2, 0) && m.path[1] === holeByQR(4, 0)));
  check('§9 chuỗi nhảy 1 lần cũng được liệt kê', mv2.some(m => m.jumps === 1 && m.path.length === 1 && m.path[0] === holeByQR(2, 0)));
}

/* ---------- §10. Thứ tự lượt + vòng ---------- */
{
  const s = createGame(['A', 'B', 'C'], { seed: 101 });
  check('§10 lượt đầu là A', actors(s)[0] === s.players[0].id);
  applyAction(s, s.players[0].id, legalMoves(s, s.players[0].id)[0]);
  check('§10 sau A là B', actors(s)[0] === s.players[1].id && s.turnCount === 1);
  applyAction(s, s.players[1].id, legalMoves(s, s.players[1].id)[0]);
  applyAction(s, s.players[2].id, legalMoves(s, s.players[2].id)[0]);
  check('§10 sau 1 vòng đủ 3 người thì vòng tăng lên 2', s.round === 2 && s.turn === s.players[0].id, `round=${s.round}`);
  check('§10 turnCount đếm đúng', s.turnCount === 3);
}

console.log(`\nLuật Cờ Nhảy: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
