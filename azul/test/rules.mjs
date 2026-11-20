// 🎨 Test luật Azul — chạy: node test/rules.mjs
// Luật chuẩn (đã đối chiếu therulebook.com + officialgamerules.org):
// - 100 gạch (20 gạch mỗi màu B/Y/R/K/W); 5/7/9 xưởng (2/3/4 người), mỗi xưởng 4 gạch.
// - Lượt: lấy TẤT CẢ gạch 1 màu ở 1 xưởng (gạch còn lại ra trung tâm) hoặc ở trung tâm;
//   ai lấy ở trung tâm đầu tiên thì lấy luôn dấu "1" (đi đầu vòng sau, tính 1 ô sàn).
// - Đặt vào 1 hàng mẫu (1–5 gạch, 1 hàng chỉ 1 màu, không đặt màu mà ô tường của hàng
//   đó đã có); gạch thừa xuống hàng sàn (tối đa 7 ô, thừa nữa vào nắp hộp).
// - Ốp tường cuối vòng: hàng đầy -> 1 gạch lên tường, điểm = 1 + số gạch kề ngang +
//   số gạch kề dọc (mỗi hướng chỉ tính khi có gạch kề); hàng sàn trừ -1,-1,-2,-2,-2,-3,-3.
// - Ván kết thúc sau vòng có người hoàn thành 1 hàng ngang trên tường; cuối ván
//   +2/hàng đủ, +7/cột đủ, +10/màu đủ 5 gạch; hòa -> nhiều hàng đủ hơn, rồi nhiều màu đủ hơn.
// QUY ƯỚC ENGINE (giống Carcassonne/Tổ Tôm): applyAction MUTATE state tại chỗ và
// trả { ok: true } / { ok: false, reason }; nước sai KHÔNG throw mà trả ok:false.
import {
  createGame, applyAction, legalMoves, legalMovesFromView, canPlaceLine,
  wallScore, wallStats, wallCol, floorPenalty, viewFor, serialize, deserialize,
  WALL, COLORS, LINE_CAP, FLOOR_PENALTIES, mulberry32,
} from '../js/engine.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; }
  else { fail++; console.log(`FAIL: ${name} ${extra}`); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function clone(s) { return JSON.parse(JSON.stringify(s)); }
function illegal(s, pid, action) { return applyAction(clone(s), pid, action).ok === false; }

/* ---------- 1. Khởi tạo theo số người ---------- */
for (const [n, nf, bagN] of [[2, 5, 80], [3, 7, 72], [4, 9, 64]]) {
  const names = ['An', 'Bình', 'Cúc', 'Dũng'].slice(0, n);
  const s = createGame(names, { seed: 42 });
  check(`setup ${n}p: ${nf} xưởng`, s.factories.length === nf);
  check(`setup ${n}p: mỗi xưởng 4 gạch`, s.factories.every(f => f.length === 4));
  check(`setup ${n}p: túi còn ${bagN} gạch`, s.bag.length === bagN);
  check(`setup ${n}p: tổng 100 gạch`, s.bag.length + s.factories.flat().length === 100);
  const counts = {};
  for (const t of [...s.bag, ...s.factories.flat()]) counts[t] = (counts[t] || 0) + 1;
  check(`setup ${n}p: mỗi màu đúng 20 gạch`, COLORS.every(c => counts[c] === 20), JSON.stringify(counts));
  check(`setup ${n}p: trung tâm trống, dấu "1" ở trung tâm`, s.centre.length === 0 && s.markerInCentre);
  check(`setup ${n}p: ${n} bàn chơi, mỗi bàn 5 hàng mẫu + tường 5×5 trống`, s.players.length === n
    && s.players.every(p => p.lines.length === 5 && p.lines.every(l => l.count === 0)
      && p.wall.every(r => r.every(c => !c)) && p.floor.length === 0 && p.score === 0));
  check(`setup ${n}p: người đầu tiên là An`, s.turn === s.players[0].id);
}

/* ---------- 2. Mẫu tường: mỗi màu 1 lần mỗi hàng VÀ mỗi cột ---------- */
for (let r = 0; r < 5; r++) check(`tường hàng ${r + 1} đủ 5 màu`, new Set(WALL[r]).size === 5);
for (let c = 0; c < 5; c++) check(`tường cột ${c + 1} đủ 5 màu`, new Set(WALL.map(r => r[c])).size === 5);
check('wallCol: hàng 1 màu B ở cột 0', wallCol(0, 'B') === 0);
check('wallCol: hàng 2 màu B ở cột 1', wallCol(1, 'B') === 1);
check('wallCol: hàng 5 màu W ở cột 3', wallCol(4, 'W') === 3);
check('wallCol: hàng 5 màu B ở cột 4', wallCol(4, 'B') === 4);

/* ---------- 3. Lấy gạch ở xưởng ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  s.factories = [['B', 'B', 'Y', 'R'], ['K', 'K', 'K', 'W'], [], [], []];
  s.centre = [];
  const me = s.players[0].id;
  const r = applyAction(s, me, { type: 'take', from: 'factory', source: 0, color: 'B', line: 1 });
  check('lấy xưởng: nước hợp lệ', r.ok === true, JSON.stringify(r));
  check('lấy xưởng: xưởng trống', s.factories[0].length === 0);
  check('lấy xưởng: gạch còn lại ra trung tâm', eq(s.centre.sort(), ['R', 'Y']));
  check('lấy xưởng: 2 gạch B vào hàng mẫu 2 (chứa 2)', s.players[0].lines[1].color === 'B' && s.players[0].lines[1].count === 2);
  check('lấy xưởng: lượt chuyển sang người 2', s.turn === s.players[1].id);
  check('lấy xưởng: chưa có dấu "1"', s.markerInCentre && !s.players[0].marker);
}

/* ---------- 4. Lấy ở trung tâm + dấu "1" ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  s.factories = [[], ['K', 'K', 'K', 'W'], [], [], []];
  s.centre = ['Y', 'Y', 'R'];
  const me = s.players[0].id;
  const r = applyAction(s, me, { type: 'take', from: 'centre', source: -1, color: 'Y', line: 1 });
  check('lấy trung tâm: nước hợp lệ', r.ok === true, JSON.stringify(r));
  check('lấy trung tâm: trung tâm chỉ còn R', eq(s.centre, ['R']));
  check('lấy trung tâm: người đầu tiên lấy được dấu "1"', !s.markerInCentre && s.players[0].marker);
  check('lấy trung tâm: 2 gạch Y vào hàng 2', s.players[0].lines[1].color === 'Y' && s.players[0].lines[1].count === 2);
  check('lấy trung tâm: dấu "1" làm người giữ đi đầu vòng sau', s.players[0].marker === true);
  /* người thứ 2 lấy ở trung tâm thì không còn dấu (vòng chưa hết vì xưởng 2 còn gạch) */
  const r2 = applyAction(s, s.players[1].id, { type: 'take', from: 'centre', source: -1, color: 'R', line: 0 });
  check('lấy trung tâm lần 2: nước hợp lệ', r2.ok === true, JSON.stringify(r2));
  check('lấy trung tâm lần 2: không còn dấu "1" (An vẫn giữ)', !s.players[1].marker && !s.markerInCentre);
  check('lấy trung tâm lần 2: 1 gạch R vào hàng 1', s.players[1].lines[0].color === 'R' && s.players[1].lines[0].count === 1);
}

/* ---------- 5. Hàng mẫu: tràn xuống sàn, sàn đầy vào nắp hộp ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  s.factories = [['B', 'B', 'B', 'B'], ['K', 'K', 'K', 'W'], [], [], []];
  s.centre = [];
  const me = s.players[0].id;
  /* hàng 1 chỉ chứa 1 gạch -> 3 gạch thừa xuống sàn (xưởng 2 còn gạch nên vòng chưa hết) */
  const r = applyAction(s, me, { type: 'take', from: 'factory', source: 0, color: 'B', line: 0 });
  check('tràn sàn: nước hợp lệ', r.ok === true, JSON.stringify(r));
  check('tràn sàn: hàng 1 đầy 1 gạch B', s.players[0].lines[0].count === 1);
  check('tràn sàn: 3 gạch thừa xuống sàn', s.players[0].floor.length === 3);
  check('tràn sàn: sàn toàn gạch B', s.players[0].floor.every(c => c === 'B'));
  /* sàn đã 6 ô, lấy thêm 3 gạch vào sàn trực tiếp -> 7 ô, 2 gạch thừa vào nắp hộp */
  const s3 = clone(s);
  s3.players[0].floor = ['B', 'B', 'B', 'B', 'B', 'B'];
  s3.factories = [['Y', 'Y', 'Y', 'R'], ['K', 'K', 'K', 'W'], [], [], []];
  s3.centre = [];
  s3.turnIdx = 0; s3.turn = me;
  const r3 = applyAction(s3, me, { type: 'take', from: 'factory', source: 0, color: 'Y', line: -1 });
  check('sàn đầy: nước hợp lệ', r3.ok === true, JSON.stringify(r3));
  check('sàn đầy: sàn tối đa 7 ô', s3.players[0].floor.length === 7);
  check('sàn đầy: gạch thừa vào nắp hộp', s3.lid.length === 2);
  check('sàn đầy: nắp hộp chứa gạch Y thừa', s3.lid.every(c => c === 'Y'));
}

/* ---------- 6. canPlaceLine: các trường hợp cấm ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  const p = s.players[0];
  check('canPlace: hàng trống nhận mọi màu', canPlaceLine(p, 0, 'B') && canPlaceLine(p, 4, 'W'));
  p.lines[1] = { color: 'B', count: 1 }; /* hàng 2 chứa 2, đang có 1 gạch B */
  check('canPlace: hàng đã có màu B thì không nhận Y', !canPlaceLine(p, 1, 'Y') && canPlaceLine(p, 1, 'B'));
  p.lines[1] = { color: 'Y', count: 2 };
  check('canPlace: hàng đầy thì không nhận thêm', !canPlaceLine(p, 1, 'Y'));
  p.wall[2][wallCol(2, 'R')] = true; /* tường hàng 3 đã có R */
  check('canPlace: tường hàng đó đã có màu R thì không đặt R', !canPlaceLine(p, 2, 'R') && canPlaceLine(p, 2, 'B'));
  check('canPlace: hàng sàn (-1) luôn đặt được', canPlaceLine(p, -1, 'K'));
  check('canPlace: hàng 5 (vượt) không hợp lệ', !canPlaceLine(p, 5, 'B'));
}

/* ---------- 7. Điểm ốp tường (kề ngang/dọc) ---------- */
{
  const empty = () => Array.from({ length: 5 }, () => Array(5).fill(false));
  const w0 = empty();
  check('điểm tường: gạch lẻ = 1', wallScore(w0, 2, 2) === 1);
  const w1 = empty(); w1[2][1] = true;
  check('điểm tường: kề ngang 1 gạch = 2', wallScore(w1, 2, 2) === 2);
  const w2 = empty(); w2[2][1] = true; w2[2][3] = true;
  check('điểm tường: kề ngang cả 2 bên = 3', wallScore(w2, 2, 2) === 3);
  const w3 = empty(); w3[1][2] = true; w3[3][2] = true;
  check('điểm tường: kề dọc cả 2 bên = 3', wallScore(w3, 2, 2) === 3);
  const w4 = empty(); w4[2][1] = true; w4[2][3] = true; w4[1][2] = true; w4[3][2] = true;
  check('điểm tường: kề cả ngang lẫn dọc = 6 (3 ngang + 3 dọc, gạch này tính trong cả 2 nhóm)', wallScore(w4, 2, 2) === 6);
  const w5 = empty(); w5[2][0] = true; w5[2][1] = true;
  check('điểm tường: hàng ngang 3 gạch = 3', wallScore(w5, 2, 2) === 3);
  /* wallStats: thưởng hàng/cột/màu */
  const w6 = empty(); w6[0] = [true, true, true, true, true];
  check('wallStats: 1 hàng đủ -> bonus 2', eq(wallStats(w6), { rows: 1, cols: 0, colours: 0, bonus: 2 }));
  const w7 = empty(); for (let r = 0; r < 5; r++) w7[r][3] = true;
  check('wallStats: 1 cột đủ -> bonus 7', eq(wallStats(w7), { rows: 0, cols: 1, colours: 0, bonus: 7 }));
  const w8 = empty(); for (let r = 0; r < 5; r++) w8[r][wallCol(r, 'B')] = true;
  check('wallStats: 1 màu đủ 5 gạch (đường chéo B) -> bonus 10', eq(wallStats(w8), { rows: 0, cols: 0, colours: 1, bonus: 10 }));
  const w9 = empty(); w9[0] = [true, true, true, true, true]; for (let r = 0; r < 5; r++) w9[r][0] = true;
  check('wallStats: 1 hàng + 1 cột -> bonus 9', eq(wallStats(w9), { rows: 1, cols: 1, colours: 0, bonus: 9 }));
}

/* ---------- 8. Trừ điểm hàng sàn ---------- */
check('điểm sàn: 0 ô = 0', floorPenalty(0) === 0);
check('điểm sàn: 1 ô = 1', floorPenalty(1) === 1);
check('điểm sàn: 2 ô = 2', floorPenalty(2) === 2);
check('điểm sàn: 3 ô = 4', floorPenalty(3) === 4);
check('điểm sàn: 5 ô = 8', floorPenalty(5) === 8);
check('điểm sàn: 7 ô = 14', floorPenalty(7) === 14);
check('điểm sàn: 8 ô = 17 (thừa 1 ô +3)', floorPenalty(8) === 17);
check('điểm sàn: bảng FLOOR_PENALTIES đúng', eq(FLOOR_PENALTIES, [-1, -1, -2, -2, -2, -3, -3]));

/* ---------- 9. Kết thúc vòng: ốp tường, giữ hàng chưa đầy, trừ sàn, dấu về trung tâm ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  s.factories = [[], [], [], [], []];
  s.centre = ['B'];
  const p0 = s.players[0];
  p0.lines[4] = { color: 'B', count: 4 }; /* hàng 5 cần 1 gạch B nữa -> đầy */
  p0.lines[1] = { color: 'Y', count: 1 }; /* hàng 2 chưa đầy -> giữ nguyên */
  p0.floor = ['R', 'R']; /* trừ 2 điểm cuối vòng */
  p0.score = 10;
  p0.marker = true; s.markerInCentre = false;
  const r = applyAction(s, p0.id, { type: 'take', from: 'centre', source: -1, color: 'B', line: 4 });
  check('kết vòng: nước hợp lệ', r.ok === true, JSON.stringify(r));
  check('kết vòng: vòng tăng lên 2', s.round === 2, `round=${s.round}`);
  check('kết vòng: gạch B đã ốp lên tường hàng 5', s.players[0].wall[4][wallCol(4, 'B')] === true);
  check('kết vòng: hàng 5 đầy đã trống lại', s.players[0].lines[4].count === 0 && s.players[0].lines[4].color === null);
  check('kết vòng: hàng 2 chưa đầy được giữ nguyên', s.players[0].lines[1].color === 'Y' && s.players[0].lines[1].count === 1);
  check('kết vòng: điểm = 10 + 1 (gạch lẻ) - 4 (sàn 2 ô + dấu "1" = 3 ô) = 7', s.players[0].score === 7, `score=${s.players[0].score}`);
  check('kết vòng: sàn đã trống', s.players[0].floor.length === 0);
  check('kết vòng: dấu "1" về lại trung tâm', s.markerInCentre && !s.players[0].marker);
  check('kết vòng: người giữ dấu đi đầu vòng sau', s.turn === p0.id);
  check('kết vòng: xưởng chia lại 5×4 gạch', s.factories.length === 5 && s.factories.every(f => f.length === 4));
  check('kết vòng: túi còn 80 - 20 = 60 gạch', s.bag.length === 60, `bag=${s.bag.length}`);
  check('kết vòng: gạch thừa vào nắp hộp (4 B hàng đầy + 2 R sàn)', s.lid.length === 6 && s.lid.filter(c => c === 'B').length === 4 && s.lid.filter(c => c === 'R').length === 2, JSON.stringify(s.lid));
}

/* ---------- 10. Túi hết thì đổ nắp hộp vào xào lại ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  s.factories = [[], [], [], [], []];
  s.centre = ['B'];
  s.bag = ['B', 'Y'];
  s.lid = ['R', 'K', 'W', 'B', 'Y', 'R', 'K', 'W', 'B', 'Y', 'R', 'K', 'W', 'B', 'Y', 'R', 'K', 'W'];
  const p0 = s.players[0];
  p0.lines[4] = { color: 'B', count: 4 };
  const r = applyAction(s, p0.id, { type: 'take', from: 'centre', source: -1, color: 'B', line: 4 });
  check('xào lại: nước hợp lệ', r.ok === true, JSON.stringify(r));
  check('xào lại: xưởng chia đủ 20 gạch', s.factories.flat().length === 20);
  check('xào lại: nắp hộp đã trống', s.lid.length === 0);
  check('xào lại: túi còn 24 - 20 = 4 gạch (2 túi + 18 nắp + 4 thừa hàng đầy)', s.bag.length === 4, `bag=${s.bag.length}`);
}

/* ---------- 11. Kết thúc ván: hoàn thành 1 hàng ngang + thưởng cuối ván ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  s.factories = [[], [], [], [], []];
  s.centre = ['B'];
  const p0 = s.players[0], p1 = s.players[1];
  /* tường hàng 5 của An: đã có Y,R,K,W (cột 0-3), thiếu B ở cột 4 */
  p0.wall[4] = [true, true, true, true, false];
  p0.lines[4] = { color: 'B', count: 4 };
  p0.score = 5;
  /* Bình: đường chéo B đủ 5 gạch (1 màu đủ), không hàng/cột nào đủ.
     Bình giữ dấu "1" từ trước (trừ 1 điểm sàn cuối vòng) nên điểm 3 - 1 + 10 = 12 */
  for (let r = 0; r < 5; r++) p1.wall[r][wallCol(r, 'B')] = true;
  p1.score = 3;
  p1.marker = true; s.markerInCentre = false;
  const r = applyAction(s, p0.id, { type: 'take', from: 'centre', source: -1, color: 'B', line: 4 });
  check('kết ván: nước hợp lệ', r.ok === true, JSON.stringify(r));
  check('kết ván: phase ended', s.phase === 'ended');
  check('kết ván: endReason match', s.endReason === 'match');
  check('kết ván: An ốp gạch cuối hoàn thành hàng 5', s.players[0].wall[4][4] === true);
  check('kết ván: An = 5 + 5 (hàng ngang 5 gạch) + 2 (thưởng hàng) = 12', s.players[0].score === 12, `score=${s.players[0].score}`);
  check('kết ván: Bình = 2 + 10 (thưởng 1 màu đủ) = 12', s.players[1].score === 12, `score=${s.players[1].score}`);
  check('kết ván: hòa điểm -> An thắng vì nhiều hàng đủ hơn (1 vs 0)', s.winner === p0.id);
  check('kết ván: final.summary có đủ hàng/cột/màu mỗi người', s.final.summary[p0.id].rows === 1 && s.final.summary[p1.id].colours === 1);
  check('kết ván: final.walls có tường mỗi người', !!s.final.walls[p0.id] && !!s.final.walls[p1.id]);
  check('kết ván: losers chứa Bình', s.losers.includes(p1.id));
}

/* ---------- 12. Hòa điểm, bằng hàng -> nhiều màu đủ hơn thắng ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  s.factories = [[], [], [], [], []];
  s.centre = ['B'];
  const p0 = s.players[0], p1 = s.players[1];
  p0.wall[4] = [true, true, true, true, false];
  p0.lines[4] = { color: 'B', count: 4 };
  p0.score = 5;
  /* Bình: hàng 2 đủ + đường chéo B đủ -> 1 hàng + 1 màu.
     Bình giữ dấu "1" từ trước (trừ 1 điểm sàn cuối vòng) nên điểm 1 - 1 + 12 = 12 */
  p1.wall[1] = [true, true, true, true, true];
  for (let r = 0; r < 5; r++) if (r !== 1) p1.wall[r][wallCol(r, 'B')] = true;
  p1.score = 1;
  p1.marker = true; s.markerInCentre = false;
  const r = applyAction(s, p0.id, { type: 'take', from: 'centre', source: -1, color: 'B', line: 4 });
  check('hòa 2 lớp: nước hợp lệ', r.ok === true, JSON.stringify(r));
  /* An: 5 + 5 + 2 = 12 (1 hàng, 0 màu). Bình: 1 - 1 (dấu "1") + 2 (hàng) + 10 (màu) = 12 (1 hàng, 1 màu) */
  check('hòa 2 lớp: cả 2 đều 12 điểm', s.players[0].score === 12 && s.players[1].score === 12, `${s.players[0].score} vs ${s.players[1].score}`);
  check('hòa 2 lớp: bằng hàng (1 vs 1) -> Bình thắng vì nhiều màu đủ hơn (1 vs 0)', s.winner === p1.id);
}

/* ---------- 13. Xin thua: kết thúc trận ngay, người cao điểm nhất thắng ---------- */
{
  const s = createGame(['An', 'Bình', 'Cúc'], { seed: 7 });
  const p0 = s.players[0], p1 = s.players[1], p2 = s.players[2];
  p0.score = 20; p1.score = 12; p2.score = 8;
  p0.floor = ['R', 'R']; /* trừ 2 khi xin thua */
  const r = applyAction(s, p0.id, { type: 'resign' });
  check('xin thua: nước hợp lệ', r.ok === true, JSON.stringify(r));
  check('xin thua: phase ended', s.phase === 'ended');
  check('xin thua: endReason resign', s.endReason === 'resign');
  check('xin thua: người xin thua bị trừ điểm sàn (20 - 2 = 18)', s.players[0].score === 18, `score=${s.players[0].score}`);
  check('xin thua: người cao điểm nhất còn lại thắng (Bình 12)', s.winner === p1.id);
  check('xin thua: losers chứa An và Cúc', s.losers.includes(p0.id) && s.losers.includes(p2.id));
}

/* ---------- 14. Nước không hợp lệ bị từ chối (ok:false, không throw) ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  const [a, b] = s.players.map(p => p.id);
  check('illegal: không tới lượt', illegal(s, b, { type: 'take', from: 'centre', source: -1, color: 'B', line: 0 }));
  check('illegal: lấy màu không có ở xưởng', illegal(s, a, { type: 'take', from: 'factory', source: 0, color: 'Z', line: 0 }));
  check('illegal: lấy ở xưởng trống', (() => {
    const t = clone(s); t.factories = [[], [], [], [], []]; t.centre = [];
    return applyAction(t, a, { type: 'take', from: 'factory', source: 0, color: 'B', line: 0 }).ok === false;
  })());
  check('illegal: lấy ở trung tâm trống', illegal(s, a, { type: 'take', from: 'centre', source: -1, color: 'B', line: 0 }));
  check('illegal: đặt vào hàng sai màu', (() => {
    const t = clone(s);
    t.players[0].lines[0] = { color: 'B', count: 1 };
    t.factories = [['Y', 'Y', 'R', 'R'], [], [], [], []];
    return applyAction(t, a, { type: 'take', from: 'factory', source: 0, color: 'Y', line: 0 }).ok === false;
  })());
  check('illegal: đặt vào hàng đã có màu trên tường', (() => {
    const t = clone(s);
    t.players[0].wall[0][wallCol(0, 'R')] = true;
    t.factories = [['R', 'R', 'Y', 'Y'], [], [], [], []];
    return applyAction(t, a, { type: 'take', from: 'factory', source: 0, color: 'R', line: 0 }).ok === false;
  })());
  check('illegal: hành động lạ', illegal(s, a, { type: 'nhay' }));
  check('illegal: ván đã kết thúc thì không đi được', (() => {
    const t = clone(s); t.phase = 'ended';
    return applyAction(t, a, { type: 'take', from: 'centre', source: -1, color: 'B', line: 0 }).ok === false;
  })());
  check('illegal: xin thua 2 lần', (() => {
    const t = clone(s); t.phase = 'ended';
    return applyAction(t, a, { type: 'resign' }).ok === false;
  })());
}

/* ---------- 15. Điểm không xuống dưới 0 ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  s.factories = [[], [], [], [], []];
  s.centre = ['B'];
  const p0 = s.players[0];
  p0.lines[4] = { color: 'B', count: 4 };
  p0.floor = ['R', 'R', 'R', 'R', 'R', 'R', 'R']; /* -14 */
  p0.score = 3;
  const r = applyAction(s, p0.id, { type: 'take', from: 'centre', source: -1, color: 'B', line: 4 });
  check('điểm sàn: nước hợp lệ', r.ok === true, JSON.stringify(r));
  check('điểm sàn: 3 + 1 - 14 -> kẹp ở 0', s.players[0].score === 0, `score=${s.players[0].score}`);
}

/* ---------- 16. viewFor: giấu thứ tự túi/nắp, không có trường you ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  const v = viewFor(s, s.players[0].id);
  check('view: không có trường you', !('you' in v));
  check('view: có me', v.me === s.players[0].id);
  check('view: túi chỉ có số lượng, không có thứ tự', v.bagCount === s.bag.length && !('bag' in v));
  check('view: nắp hộp chỉ có số lượng', v.lidCount === s.lid.length && !('lid' in v));
  check('view: xưởng + trung tâm công khai', eq(v.factories, s.factories) && eq(v.centre, s.centre));
  check('view: bàn mọi người công khai', v.players.length === 2 && v.players.every(p => p.lines && p.wall && p.floor));
  check('view: không lộ seed', !('seed' in v));
}

/* ---------- 17. legalMovesFromView: chỉ nước hợp lệ, có cả lựa chọn sàn ---------- */
{
  const s = createGame(['An', 'Bình'], { seed: 7 });
  s.factories = [['B', 'B', 'Y', 'R'], [], [], [], []];
  s.centre = ['K'];
  const v = viewFor(s, s.players[0].id);
  const moves = legalMovesFromView(v, s.players[0].id);
  check('legalMoves: có nước lấy B/Y/R ở xưởng 0', ['B', 'Y', 'R'].every(c => moves.some(m => m.from === 'factory' && m.color === c)));
  check('legalMoves: có nước lấy K ở trung tâm', moves.some(m => m.from === 'centre' && m.color === 'K'));
  check('legalMoves: mỗi màu đều có lựa chọn sàn (line -1)', moves.some(m => m.color === 'B' && m.line === -1));
  check('legalMoves: không có nước lấy màu không tồn tại', !moves.some(m => m.color === 'W'));
  check('legalMoves: mọi nước đều hợp lệ theo engine', moves.every(m => applyAction(clone(s), s.players[0].id, m).ok === true));
  check('legalMoves: khớp với legalMoves trên state', eq(legalMoves(s, s.players[0].id), moves));
}

console.log(`\nLuật Azul: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
