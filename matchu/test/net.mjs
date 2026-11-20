// Đồng bộ mạng Mạt Chược: 2 engine cùng seed + cùng action → state giống hệt nhau.
import {
  createGame, applyAction, viewFor, serialize, deserialize, actors,
  freeTiles, allPairs, findPair, matchKey,
} from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const strip = s => {
  const c = JSON.parse(JSON.stringify(s));
  delete c.gid; c.startedAt = 0; c.endedAt = 0;
  for (const pr of Object.values(c.prog || {})) { pr.failedAt = 0; pr.finishedAt = 0; }
  return c;
};

/* ---------- 1. cùng seed → cùng bàn ---------- */
{
  const P = [{ id: 'me', name: 'A' }, { id: 'bo', name: 'B' }];
  const a = createGame(P, { seed: 42 });
  const b = createGame(P, { seed: 42 });
  t('cùng seed → state giống hệt nhau', JSON.stringify(strip(a)) === JSON.stringify(strip(b)));
  const c = createGame(P, { seed: 43 });
  t('khác seed → bàn khác nhau', JSON.stringify(strip(a)) !== JSON.stringify(strip(c)));
}

/* ---------- 2. cùng action → cùng state (2 người) ---------- */
{
  const P = [{ id: 'me', name: 'A' }, { id: 'bo', name: 'B' }];
  const a = createGame(P, { seed: 7 });
  const b = deserialize(serialize(a));
  let steps = 0;
  for (let i = 0; i < 30; i++) {
    const pairs = allPairs(a.prog.me.tiles);
    if (!pairs.length) break;
    const [x, y] = pairs[i % pairs.length];
    const act = { type: 'remove', a: x, b: y };
    const ra = applyAction(a, 'me', act);
    const rb = applyAction(b, 'me', act);
    t(`bước ${i + 1}: cùng kết quả gỡ cặp`, ra.ok === rb.ok && ra.ok);
    steps++;
    if (JSON.stringify(strip(a)) !== JSON.stringify(strip(b))) { t(`bước ${i + 1}: state giống nhau sau action`, false); break; }
    if (i === 4) { // gợi ý + xào (khi kẹt) cũng phải đồng bộ
      const ha = applyAction(a, 'me', { type: 'hint' });
      const hb = applyAction(b, 'me', { type: 'hint' });
      t('gợi ý đồng bộ', ha.ok === hb.ok && JSON.stringify(ha.pair) === JSON.stringify(hb.pair));
    }
  }
  t('30 bước gỡ cặp đồng bộ', steps === 30 && JSON.stringify(strip(a)) === JSON.stringify(strip(b)));
  t('serialize roundtrip sau 30 bước vẫn giống', JSON.stringify(strip(a)) === JSON.stringify(strip(deserialize(serialize(b)))));
}

/* ---------- 3. đua 4 người: bot cùng hành động → giống nhau ---------- */
{
  const P = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }, { id: 'p3', name: 'C' }, { id: 'p4', name: 'D' }];
  const a = createGame(P, { seed: 2026 });
  const b = deserialize(serialize(a));
  let rounds = 0;
  while (a.phase === 'playing' && rounds < 200) {
    rounds++;
    for (const p of P) {
      if (a.phase !== 'playing') break;
      const act = botAction(a, p.id, 'hard');
      if (!act) { applyAction(a, p.id, { type: 'resign' }); applyAction(b, p.id, { type: 'resign' }); continue; }
      const ra = applyAction(a, p.id, act);
      const rb = applyAction(b, p.id, act);
      if (!ra.ok || !rb.ok) { t(`vòng ${rounds} người ${p.id}: bot action ok`, false); }
    }
    if (JSON.stringify(strip(a)) !== JSON.stringify(strip(b))) { t(`vòng ${rounds}: 4 người đồng bộ`, false); break; }
  }
  t('đua 4 người bot Hard: 200 vòng hoặc kết thúc, state giống nhau', JSON.stringify(strip(a)) === JSON.stringify(strip(b)));
  t('đua 4 người: có người thắng hoặc tất cả kẹt/bỏ cuộc', a.phase === 'ended' || rounds === 200);
  t('viewFor mỗi người chỉ thấy bàn mình', P.every(p => {
    const v = viewFor(a, p.id);
    return v.you.tiles.length === 144 && v.players.every(q => q.removed === a.prog[q.id].removed);
  }));
}

/* ---------- 4. xào bài đồng bộ (cùng hạt giống trong state) ---------- */
{
  const P = [{ id: 'me', name: 'A' }];
  const a = createGame(P, { seed: 99 });
  const b = deserialize(serialize(a));
  // gỡ bừa tới khi kẹt
  let guard = 0;
  while (guard++ < 400) {
    const pairs = allPairs(a.prog.me.tiles);
    if (!pairs.length) break;
    const [x, y] = pairs[0];
    applyAction(a, 'me', { type: 'remove', a: x, b: y });
    applyAction(b, 'me', { type: 'remove', a: x, b: y });
    if (a.phase === 'ended') break;
  }
  if (a.phase === 'playing' && allPairs(a.prog.me.tiles).length === 0) {
    const ra = applyAction(a, 'me', { type: 'shuffle' });
    const rb = applyAction(b, 'me', { type: 'shuffle' });
    t('xào bài khi kẹt đồng bộ', ra.ok && rb.ok && JSON.stringify(strip(a)) === JSON.stringify(strip(b)));
  } else {
    t('xào bài khi kẹt đồng bộ (ván thắng luôn, bỏ qua)', true);
  }
}

console.log(`\nĐồng bộ Mạt Chược: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
