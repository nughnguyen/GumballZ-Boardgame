// Luật Mạt Chược: 144 quân, quân trống, ghép cặp, xào/gợi ý/hoàn tác, thắng/kẹt.
import {
  createGame, applyAction, applyRemove, applyHint, applyShuffle, applyUndo,
  viewFor, serialize, deserialize, actors, isFree, freeTiles, allPairs, findPair,
  matchKey, faceName, mulberry32, LAYOUT, TOTAL_TILES, MAX_HINTS, MAX_SHUFFLES, MAX_UNDOS,
  REGULAR_FACES, FLOWERS, SEASONS,
} from '../js/engine.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = [{ id: 'me', name: 'A' }];
const mk = (seed = 12345) => createGame(P, { seed });

/* ---------- 1. bàn + bộ quân ---------- */
{
  const s = mk();
  t('bàn có 144 vị trí', LAYOUT.length === 144);
  t('mỗi người có 144 quân', s.prog.me.tiles.length === 144);
  const faces = s.prog.me.tiles.map(x => x.face);
  const count = {};
  for (const f of faces) count[f] = (count[f] || 0) + 1;
  t('34 loại thường × 4 quân', REGULAR_FACES.every(f => count[f] === 4));
  t('4 Hoa × 1 quân', FLOWERS.every(f => count[f] === 1));
  t('4 Mùa × 1 quân', SEASONS.every(f => count[f] === 1));
  t('tổng 144 quân', faces.length === 144);
  t('mọi vị trí đúng bố cục', s.prog.me.tiles.every(x => LAYOUT.some(p => p.x === x.x && p.y === x.y && p.z === x.z)));
}

/* ---------- 2. quân trống ---------- */
{
  const s = mk();
  const tiles = s.prog.me.tiles;
  const byPos = (x, y, z) => tiles.find(o => o.x === x && o.y === y && o.z === z);
  t('quân nhô đầu trái trống', isFree(tiles, byPos(-2, 7, 0)));
  t('quân nhô đầu phải trống', isFree(tiles, byPos(24, 7, 0)));
  t('quân đỉnh tầng 4 trống', isFree(tiles, byPos(10, 7, 4)) && isFree(tiles, byPos(12, 7, 4)));
  t('quân giữa hàng bị chặn 2 bên thì không trống', !isFree(tiles, byPos(2, 0, 0)));
  t('quân bị đè (tầng 0 dưới tầng 1) thì không trống', !isFree(tiles, byPos(4, 2, 0)));
  t('quân đầu hàng chỉ bị chặn 1 bên thì trống', isFree(tiles, byPos(0, 0, 0)));
  t('lúc đầu có cặp gỡ được', allPairs(tiles).length > 0);
  t('mọi cặp tìm được đều là 2 quân trống cùng mặt', allPairs(tiles).every(([a, b]) => {
    const ta = tiles.find(x => x.id === a), tb = tiles.find(x => x.id === b);
    return isFree(tiles, ta) && isFree(tiles, tb) && matchKey(ta.face) === matchKey(tb.face);
  }));
}

/* ---------- 3. ghép cặp ---------- */
{
  t('Hoa ghép với Hoa', matchKey('F1') === matchKey('F3'));
  t('Mùa ghép với Mùa', matchKey('S2') === matchKey('S4'));
  t('Hoa không ghép với Mùa', matchKey('F1') !== matchKey('S1'));
  t('Gió Nam không phải Mùa', matchKey('S') !== matchKey('S1'));
  t('cùng mặt thì ghép được', matchKey('c5') === matchKey('c5'));
  t('khác mặt thì không', matchKey('c5') !== matchKey('c6'));
  t('tên mặt Hoa/Mùa đúng', faceName('F1') === 'Hoa Mai' && faceName('S3') === 'Mùa Thu');
}

/* ---------- 4. gỡ cặp ---------- */
{
  const s = mk();
  const pr = s.prog.me;
  const [a, b] = findPair(pr.tiles);
  const r = applyRemove(s, 'me', a, b);
  t('gỡ cặp trống cùng mặt thành công', r.ok === true && pr.removed === 2 && pr.moves === 1);
  t('quân đã gỡ thì removed=true', pr.tiles.find(x => x.id === a).removed && pr.tiles.find(x => x.id === b).removed);
  t('gỡ lại quân đã gỡ thì bị từ chối', applyRemove(s, 'me', a, b).ok === false);
  t('gỡ cùng 1 quân 2 lần thì bị từ chối', applyRemove(s, 'me', a, a).ok === false);
  // cặp khác mặt
  const s2 = mk();
  const free2 = freeTiles(s2.prog.me.tiles);
  const x = free2.find(o => free2.some(p => p.id !== o.id && matchKey(p.face) !== matchKey(o.face)));
  const y = free2.find(p => p.id !== x.id && matchKey(p.face) !== matchKey(x.face));
  t('gỡ 2 quân trống khác mặt thì bị từ chối', applyRemove(s2, 'me', x.id, y.id).ok === false);
  // quân chưa trống
  const s3 = mk();
  const blocked = s3.prog.me.tiles.find(o => !isFree(s3.prog.me.tiles, o));
  const free3 = freeTiles(s3.prog.me.tiles)[0];
  t('gỡ quân chưa trống thì bị từ chối', applyRemove(s3, 'me', blocked.id, free3.id).ok === false);
  // action lạ
  t('action lạ bị từ chối', applyAction(s3, 'me', { type: 'bay' }).ok === false);
  t('action không có type bị từ chối', applyAction(s3, 'me', {}).ok === false);
}

/* ---------- 5. gợi ý ---------- */
{
  const s = mk();
  const pr = s.prog.me;
  const r = applyHint(s, 'me');
  t('gợi ý trả về 1 cặp trống cùng mặt', r.ok === true && Array.isArray(r.pair) && r.pair.length === 2
    && isFree(pr.tiles, pr.tiles.find(x => x.id === r.pair[0]))
    && matchKey(pr.tiles.find(x => x.id === r.pair[0]).face) === matchKey(pr.tiles.find(x => x.id === r.pair[1]).face));
  t('gợi ý trừ 1 lượt', pr.hintsLeft === MAX_HINTS - 1 && pr.hintsUsed === 1);
  pr.hintsLeft = 0;
  t('hết lượt gợi ý thì bị từ chối', applyHint(s, 'me').ok === false);
}

/* ---------- 6. xào bài ---------- */
{
  // xào khi còn cặp thì bị từ chối
  const s = mk();
  t('còn cặp gỡ được thì chưa được xào', applyShuffle(s, 'me').ok === false);
  // tìm 1 ván gỡ bừa (cặp ngẫu nhiên) tới khi kẹt
  let s2 = null;
  for (let seed = 777; seed < 800 && !s2; seed++) {
    const g = mk(seed);
    const rng = mulberry32(seed);
    let guard = 0;
    while (guard++ < 500) {
      const pairs = allPairs(g.prog.me.tiles);
      if (!pairs.length) break;
      const [a, b] = pairs[Math.floor(rng() * pairs.length)];
      applyRemove(g, 'me', a, b);
      if (g.phase === 'ended') break;
    }
    if (g.phase === 'playing' && allPairs(g.prog.me.tiles).length === 0) s2 = g;
  }
  t('tìm được ván gỡ bừa tới khi kẹt', !!s2);
  if (!s2) { console.log('  (không tìm được ván kẹt trong 23 seed)'); }
  else {
    const pr2 = s2.prog.me;
    const before = pr2.tiles.filter(x => !x.removed).map(x => x.face).sort().join(',');
    const sh = applyShuffle(s2, 'me');
    const after = pr2.tiles.filter(x => !x.removed).map(x => x.face).sort().join(',');
    t('xào bài thành công khi kẹt', sh.ok === true);
    t('xào bài giữ nguyên bộ mặt còn lại', before === after);
    t('xào bài trừ 1 lượt', pr2.shufflesLeft === MAX_SHUFFLES - 1 && pr2.shufflesUsed === 1);
    t('sau khi xào lại có cặp gỡ được', allPairs(pr2.tiles).length > 0);
    pr2.shufflesLeft = 0;
    // gỡ tiếp tới khi hết cặp (hoặc thắng)
    let guard = 0;
    while (guard++ < 500) {
      const pair = findPair(pr2.tiles);
      if (!pair) break;
      applyRemove(s2, 'me', pair[0], pair[1]);
      if (s2.phase === 'ended') break;
    }
    t('hết lượt xào thì bị từ chối', applyShuffle(s2, 'me').ok === false);
  }
}

/* ---------- 7. hoàn tác ---------- */
{
  const s = mk();
  const pr = s.prog.me;
  const [a, b] = findPair(pr.tiles);
  applyRemove(s, 'me', a, b);
  t('sau khi gỡ thì removed=2', pr.removed === 2);
  const u = applyUndo(s, 'me');
  t('hoàn tác khôi phục lại cặp', u.ok === true && pr.removed === 0
    && !pr.tiles.find(x => x.id === a).removed && !pr.tiles.find(x => x.id === b).removed);
  t('hoàn tác trừ 1 lượt', pr.undosLeft === MAX_UNDOS - 1);
  t('hết lịch sử thì hoàn tác bị từ chối', applyUndo(s, 'me').ok === false);
  pr.undosLeft = 0;
  const [c, d] = findPair(pr.tiles);
  applyRemove(s, 'me', c, d);
  t('hết lượt hoàn tác thì bị từ chối', applyUndo(s, 'me').ok === false);
  // đua thì không hoàn tác
  const s2 = createGame([{ id: 'me', name: 'A' }, { id: 'bo', name: 'B' }], { seed: 5 });
  const [e, f] = findPair(s2.prog.me.tiles);
  applyRemove(s2, 'me', e, f);
  t('đang đua thì không hoàn tác được', applyUndo(s2, 'me').ok === false);
}

/* ---------- 8. thắng: gỡ theo thứ tự ngược lúc chia ---------- */
{
  const s = mk(999);
  const pr = s.prog.me;
  // cặp đặt sau (ord lớn) gỡ trước — thứ tự này luôn hợp lệ theo cách chia bài
  const pairsByOrd = {};
  for (const t of pr.tiles) { (pairsByOrd[t.ord] = pairsByOrd[t.ord] || []).push(t); }
  const ords = Object.keys(pairsByOrd).map(Number).sort((x, y) => y - x);
  let okAll = true;
  for (const o of ords) {
    const [a, b] = pairsByOrd[o];
    const r = applyRemove(s, 'me', a.id, b.id);
    if (!r.ok) { okAll = false; break; }
  }
  t('gỡ hết 144 quân theo thứ tự ngược lúc chia', okAll && pr.removed === 144);
  t('gỡ hết thì thắng, phase ended, winner là mình', s.phase === 'ended' && s.winner === 'me' && s.endReason === 'win');
  t('sau khi thắng thì gỡ nữa bị từ chối', applyRemove(s, 'me', 0, 1).ok === false);
}

/* ---------- 9. kẹt: hết cặp + hết lượt xào thì bị loại ---------- */
{
  const s = mk(4242);
  const pr = s.prog.me;
  const tiles = pr.tiles;
  const free = freeTiles(tiles);
  // tìm 1 cặp cùng mặt + 2 quân trống khác mặt nhau (để lại sau khi gỡ cặp)
  let pairA = null, leftovers = null;
  const pairs = allPairs(tiles);
  outer: for (const [a, b] of pairs) {
    const rest = free.filter(o => o.id !== a && o.id !== b);
    for (let i = 0; i < rest.length; i++) {
      for (let j = i + 1; j < rest.length; j++) {
        if (matchKey(rest[i].face) !== matchKey(rest[j].face)) { pairA = [a, b]; leftovers = [rest[i], rest[j]]; break outer; }
      }
    }
  }
  t('tìm được bàn test kẹt', !!pairA && !!leftovers);
  if (pairA) {
    const keep = new Set([...pairA, leftovers[0].id, leftovers[1].id]);
    for (const t of tiles) if (!keep.has(t.id)) t.removed = true;
    pr.removed = 140;
    pr.shufflesLeft = 0;
    const r = applyRemove(s, 'me', pairA[0], pairA[1]);
    t('gỡ cặp cuối còn lại thì ok', r.ok === true);
    t('còn 2 quân khác mặt + hết lượt xào → bị loại, ván kết thúc', pr.failed === true && s.phase === 'ended' && s.endReason === 'stuck' && s.winner === null);
  }
}

/* ---------- 10. viewFor / serialize / actors ---------- */
{
  const s = createGame([{ id: 'me', name: 'A' }, { id: 'bo', name: 'B' }], { seed: 11 });
  const v = viewFor(s, 'me');
  t('viewFor: mình thấy đủ 144 quân của mình', v.you.tiles.length === 144);
  t('viewFor: không lộ bàn của người khác', !('tiles' in v.players[1]) && v.players[1].removed === 0);
  t('viewFor: tiến độ mọi người chỉ có số quân đã gỡ', v.players.every(p => typeof p.removed === 'number'));
  t('actors lúc đầu gồm cả 2 người', actors(s).length === 2);
  const rt = deserialize(serialize(s));
  t('serialize roundtrip giữ nguyên state', JSON.stringify(rt) === JSON.stringify(s));
  const bad = ['', '{}', '{"players":[]}', '{"players":[{"id":"x"}],"seed":1,"phase":"playing","prog":{}}',
    JSON.stringify({ players: [{ id: 'x' }], seed: 1, phase: 'playing', prog: { x: { tiles: [], removed: 0 } } })];
  t('deserialize dữ liệu xấu đều throw', bad.every(j => { try { deserialize(j); return false; } catch (e) { return true; } }));
  t('createGame sai số người thì throw', (() => { try { createGame([]); return false; } catch (e) { return true; } })());
}

console.log(`\nLuật Mạt Chược: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
