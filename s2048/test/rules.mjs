// Luật 2048: trượt/gộp 4 hướng, không gộp đôi, mọc ô 90/10, thắng 2048,
// thua khi kẹt, hoàn tác, viewFor, serialize/deserialize.
import { createGame, applyAction, applyMove, applyUndo, applyResign, viewFor, serialize, deserialize, actors, slideLine, slideBoard, canMove, validDirs, SIZE, TARGET, MAX_UNDOS } from '../js/engine.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const mk = (grid, seed = 12345) => {
  const s = createGame([{ id: 'me', name: 'A' }], { seed });
  s.prog.me.grid = grid.slice();
  s.prog.me.score = 0; s.prog.me.moves = 0;
  return s;
};

/* slideLine: gộp đúng, mỗi ô chỉ gộp 1 lần */
t('slideLine [2,2,2,2] -> [4,4,0,0] (không gộp đôi)', eq(slideLine([2, 2, 2, 2]).line, [4, 4, 0, 0]) && slideLine([2, 2, 2, 2]).gained === 8);
t('slideLine [4,4,8,0] -> [8,8,0,0]', eq(slideLine([4, 4, 8, 0]).line, [8, 8, 0, 0]) && slideLine([4, 4, 8, 0]).gained === 8);
t('slideLine [2,0,2,4] -> [4,4,0,0]', eq(slideLine([2, 0, 2, 4]).line, [4, 4, 0, 0]));
t('slideLine [2,4,8,16] không đổi', eq(slideLine([2, 4, 8, 16]).line, [2, 4, 8, 16]) && !slideLine([2, 4, 8, 16]).changed);
t('slideLine [0,0,0,0] trống', eq(slideLine([0, 0, 0, 0]).line, [0, 0, 0, 0]) && !slideLine([0, 0, 0, 0]).changed);

/* slideBoard 4 hướng */
t('slide trái gộp đúng hàng', (() => {
  const r = slideBoard([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'left');
  return eq(r.grid.slice(0, 4), [4, 0, 0, 0]) && r.gained === 4 && r.changed;
})());
t('slide phải gộp về phải', (() => {
  const r = slideBoard([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'right');
  return eq(r.grid.slice(0, 4), [0, 0, 0, 4]) && r.changed;
})());
t('slide lên gộp đúng cột', (() => {
  const g = new Array(16).fill(0); g[0] = 2; g[4] = 2;
  const r = slideBoard(g, 'up');
  return r.grid[0] === 4 && r.grid[4] === 0 && r.gained === 4;
})());
t('slide xuống gộp về dưới', (() => {
  const g = new Array(16).fill(0); g[0] = 2; g[4] = 2;
  const r = slideBoard(g, 'down');
  return r.grid[12] === 4 && r.grid[0] === 0 && r.grid[4] === 0;
})());
t('slide không đổi thì changed=false', !slideBoard([2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32, 64], 'left').changed);

/* canMove / validDirs */
t('canMove: còn ô trống', canMove([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
t('canMove: đầy nhưng còn cặp kề', canMove([2, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32]));
t('canMove: đầy và không cặp nào kề -> false', !canMove([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]));
t('validDirs chỉ liệt kê hướng làm thay đổi (lên không đổi, xuống dồn xuống đáy)', (() => {
  const d = validDirs([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  return d.includes('left') && d.includes('right') && d.includes('down') && !d.includes('up');
})());

/* createGame: 2 ô khởi đầu, cùng lưới cho mọi người */
t('ván mới có đúng 2 ô (2 hoặc 4)', (() => {
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { seed: 999 });
  const nz = s.prog.a.grid.filter(v => v).length;
  return nz === 2 && s.prog.a.grid.every(v => v === 0 || v === 2 || v === 4);
})());
t('2 người cùng lưới khởi đầu giống hệt', (() => {
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { seed: 999 });
  return eq(s.prog.a.grid, s.prog.b.grid);
})());
t('cùng seed thì lưới khởi đầu giống hệt', (() => {
  const a = createGame([{ id: 'x', name: 'X' }], { seed: 42 });
  const b = createGame([{ id: 'x', name: 'X' }], { seed: 42 });
  return eq(a.prog.x.grid, b.prog.x.grid);
})());
t('createGame sai số người thì throw', (() => { try { createGame([]); return false; } catch (e) { return true; } })());

/* applyMove: gộp + điểm + mọc ô mới */
t('nước đi hợp lệ: gộp, cộng điểm, mọc thêm 1 ô', (() => {
  const s = mk([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const r = applyMove(s, 'me', 'left');
  const nz = s.prog.me.grid.filter(v => v).length;
  return r.ok && s.prog.me.score === 4 && s.prog.me.moves === 1 && nz === 2 && s.prog.me.grid[0] === 4;
})());
t('nước đi không đổi thì bị từ chối, không mọc ô', (() => {
  const s = mk([2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const before = s.prog.me.grid.slice();
  const r = applyMove(s, 'me', 'left');
  return !r.ok && s.prog.me.moves === 0 && eq(s.prog.me.grid, before);
})());
t('hướng sai thì bị từ chối', !applyMove(mk(new Array(16).fill(0)), 'me', 'diagonal').ok);
t('người không có trong ván thì bị từ chối', !applyMove(mk(new Array(16).fill(0)), 'ghost', 'left').ok);

/* mọc ô: phân bố 90% số 2 / 10% số 4 trên nhiều seed */
t('mọc ô: tỉ lệ số 4 khoảng 10% (1000 lần mọc)', (() => {
  let four = 0, total = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const s = createGame([{ id: 'me', name: 'A' }], { seed });
    // chơi 5 nước trượt trái/phải xen kẽ để mọc thêm ô
    for (let k = 0; k < 5; k++) {
      const g = s.prog.me.grid;
      const before = g.filter(v => v).length;
      applyMove(s, 'me', k % 2 ? 'right' : 'left');
      const after = s.prog.me.grid.filter(v => v).length;
      if (after === before + 1) {
        total++;
        const sp = s.lastSpawn;
        if (sp && sp.value === 4) four++;
      }
      if (s.phase !== 'playing') break;
    }
  }
  const ratio = total ? four / total : 0;
  console.log(`    (mọc ${total} ô, số 4: ${four} = ${(ratio * 100).toFixed(1)}%)`);
  return total > 500 && ratio > 0.05 && ratio < 0.18;
})());

/* thắng ở 2048 */
t('đạt ô 2048 thì thắng ngay', (() => {
  const g = new Array(16).fill(0); g[0] = 1024; g[1] = 1024;
  const s = mk(g);
  const r = applyMove(s, 'me', 'left');
  return r.ok && r.won && s.phase === 'ended' && s.winner === 'me' && s.endReason === 'win';
})());
t('ván đã kết thúc thì không đi tiếp được', (() => {
  const g = new Array(16).fill(0); g[0] = 1024; g[1] = 1024;
  const s = mk(g);
  applyMove(s, 'me', 'left');
  return !applyMove(s, 'me', 'left').ok;
})());

/* thua khi kẹt */
t('kẹt (đầy + không gộp được) thì thua, chơi đơn ván kết thúc', (() => {
  // 15 ô, 1 ô trống cuối lưới, không có cặp kề nào bằng nhau; trượt phải
  // chỉ dồn hàng cuối sang phải (không gộp), ô mới mọc lấp ô trống cuối
  // và vẫn không tạo cặp kề nào -> kẹt
  const g = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32, 0];
  const s = mk(g);
  const r = applyMove(s, 'me', 'right');
  return r.ok && r.stuck && s.phase === 'ended' && s.winner === null && s.endReason === 'stuck';
})());
t('đầy nhưng còn cặp kề thì chưa kẹt', (() => {
  const g = [2, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2, 4, 8, 16, 32];
  const s = mk(g);
  applyMove(s, 'me', 'left');
  return s.phase === 'playing' && !s.prog.me.failed;
})());

/* hoàn tác */
t('hoàn tác khôi phục đúng lưới + điểm', (() => {
  const s = mk([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const before = s.prog.me.grid.slice();
  applyMove(s, 'me', 'left');
  const r = applyUndo(s, 'me');
  return r.ok && eq(s.prog.me.grid, before) && s.prog.me.score === 0 && s.prog.me.moves === 0 && s.prog.me.undosLeft === MAX_UNDOS - 1;
})());
t('hoàn tác tối đa 5 lần / ván', (() => {
  const s = mk([2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
  let ok = 0;
  for (let k = 0; k < 8; k++) {
    applyMove(s, 'me', k % 2 ? 'right' : 'left');
    if (applyUndo(s, 'me').ok) ok++;
    else break;
  }
  return ok === 5 && !applyUndo(s, 'me').ok;
})());
t('đang đua (2 người) thì không hoàn tác được', (() => {
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { seed: 7 });
  applyMove(s, 'a', 'left');
  return !applyUndo(s, 'a').ok;
})());
t('chưa có nước nào thì hoàn tác bị từ chối', !applyUndo(mk(new Array(16).fill(0)), 'me').ok);

/* xin thua */
t('chơi đơn xin thua thì ván kết thúc', (() => {
  const s = mk(new Array(16).fill(0));
  const r = applyResign(s, 'me');
  return r.ok && s.phase === 'ended' && s.endReason === 'resign' && s.winner === null;
})());

/* viewFor: không lộ lưới người khác, chỉ lộ tiến độ */
t('viewFor: mình thấy lưới mình, người khác chỉ thấy điểm/ô lớn nhất', (() => {
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { seed: 7 });
  applyMove(s, 'a', 'left');
  const v = viewFor(s, 'a');
  const other = v.players.find(p => p.id === 'b');
  return Array.isArray(v.you.grid) && v.you.grid.length === 16 && other && !('grid' in other) && typeof other.score === 'number' && typeof other.maxTile === 'number';
})());
t('viewFor: target 2048 + winner/losers có sẵn', (() => {
  const v = viewFor(mk(new Array(16).fill(0)), 'me');
  return v.target === TARGET && v.winner === null && Array.isArray(v.losers);
})());

/* actors */
t('actors: chỉ liệt kê người chưa xong', (() => {
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { seed: 7 });
  applyResign(s, 'a');
  return eq(actors(s), ['b']);
})());
t('actors: ván kết thúc thì rỗng', (() => {
  const g = new Array(16).fill(0); g[0] = 1024; g[1] = 1024;
  const s = mk(g);
  applyMove(s, 'me', 'left');
  return actors(s).length === 0;
})());

/* serialize / deserialize */
t('serialize roundtrip giữ nguyên state', (() => {
  const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { seed: 77 });
  applyMove(s, 'a', 'left'); applyMove(s, 'b', 'up');
  const s2 = deserialize(serialize(s));
  return eq(s2, s);
})());
t('deserialize dữ liệu xấu thì throw', (() => {
  let n = 0;
  for (const bad of ['not json', '{}', '{"players":[]}', '{"players":[{"id":"a"}],"seed":1,"phase":"playing","prog":{}}']) {
    try { deserialize(bad); } catch (e) { n++; }
  }
  return n === 4;
})());
t('applyAction qua adapter: move/undo/resign + hành động lạ bị từ chối', (() => {
  const s = mk([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const a = applyAction(s, 'me', { type: 'move', dir: 'left' });
  const b = applyAction(s, 'me', { type: 'undo' });
  const c = applyAction(s, 'me', { type: 'resign' });
  const d = applyAction(s, 'me', { type: 'fly' });
  const e = applyAction(s, 'me', null);
  return a.ok && b.ok && c.ok && !d.ok && !e.ok;
})());

console.log(`\nLuật 2048: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
