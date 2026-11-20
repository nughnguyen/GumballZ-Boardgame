// Kiểm đồng bộ mạng Wordle (lockstep): 2 máy áp cùng hành động phải cho
// state giống hệt nhau từng byte — kể cả đua 4 người + xin thua.
// Chạy: node wordle/test/net.mjs
import * as E from '../js/engine.js';
import { botAction } from '../js/bot.js';

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${name}`); }
}

function playLockstep(players, actions, seed) {
  const a = E.createGame(players, { seed, answer: 'TRANG' });
  const b = E.createGame(players, { seed, answer: 'TRANG' });
  // gid ngẫu nhiên khác nhau là bình thường — đồng bộ hoá gid/startedAt rồi so
  b.gid = a.gid; b.startedAt = a.startedAt;
  for (const [pid, act] of actions) {
    const ra = E.applyAction(a, pid, act);
    const rb = E.applyAction(b, pid, act);
    if (JSON.stringify(ra) !== JSON.stringify(rb)) return { ok: false, why: 'kết quả action khác nhau', ra, rb };
  }
  // endedAt dùng Date.now() nên có thể lệch vài ms — đồng bộ hoá rồi so
  b.endedAt = a.endedAt;
  for (const p of players) {
    if (a.prog[p.id].finishedAt) b.prog[p.id].finishedAt = a.prog[p.id].finishedAt;
  }
  const sa = E.serialize(a), sb = E.serialize(b);
  return { ok: sa === sb, why: sa === sb ? '' : 'serialize khác nhau', sa, sb };
}

const P2 = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }];
const P4 = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }, { id: 'p3', name: 'C' }, { id: 'p4', name: 'D' }];

/* 1. đoán xen kẽ 2 người */
let r = playLockstep(P2, [
  ['p1', { type: 'guess', word: 'HOANG' }],
  ['p2', { type: 'guess', word: 'PHONG' }],
  ['p1', { type: 'guess', word: 'QUANG' }],
  ['p2', { type: 'guess', word: 'TRANG' }],
], 11);
t('lockstep 2 người, đoán xen kẽ', r.ok);

/* 2. đua 4 người: đoán + xin thua */
r = playLockstep(P4, [
  ['p1', { type: 'guess', word: 'HOANG' }],
  ['p2', { type: 'resign' }],
  ['p3', { type: 'guess', word: 'PHONG' }],
  ['p4', { type: 'guess', word: 'QUANG' }],
  ['p1', { type: 'guess', word: 'THANG' }],
  ['p3', { type: 'guess', word: 'TRANG' }],
], 23);
t('lockstep 4 người, có xin thua', r.ok);

/* 3. thua 6 lần ở cả 2 máy */
r = playLockstep(P2, [
  ['p1', { type: 'guess', word: 'HOANG' }],
  ['p1', { type: 'guess', word: 'PHONG' }],
  ['p1', { type: 'guess', word: 'QUANG' }],
  ['p1', { type: 'guess', word: 'THANG' }],
  ['p1', { type: 'guess', word: 'TRUNG' }],
  ['p1', { type: 'guess', word: 'GIANG' }],
  ['p2', { type: 'guess', word: 'TRANG' }],
], 31);
t('lockstep: 1 người thua 6 lần, người kia thắng', r.ok);

/* 4. bot đấu bot qua lockstep: 10 ván, mỗi ván 2 bot đoán xen kẽ */
let botOk = true;
for (let game = 0; game < 10; game++) {
  const players = [{ id: 'b1', name: 'Bot1', isBot: true, level: 'hard' }, { id: 'b2', name: 'Bot2', isBot: true, level: 'easy' }];
  const a = E.createGame(players, { seed: 100 + game });
  const b = E.createGame(players, { seed: 100 + game });
  b.gid = a.gid; b.startedAt = a.startedAt;
  let steps = 0;
  while (a.phase !== 'ended' && steps < 30) {
    const pid = E.actors(a)[0];
    if (!pid) break;
    const p = a.players.find(x => x.id === pid);
    const act = botAction(a, pid, p);
    if (!act) { botOk = false; console.log(`  ✗ ván bot ${game}: bot không ra hành động`); break; }
    E.applyAction(a, pid, act);
    E.applyAction(b, pid, act);
    steps++;
  }
  b.endedAt = a.endedAt;
  for (const p of players) if (a.prog[p.id].finishedAt) b.prog[p.id].finishedAt = a.prog[p.id].finishedAt;
  if (E.serialize(a) !== E.serialize(b)) { botOk = false; console.log(`  ✗ ván bot ${game}: serialize khác nhau`); }
}
t('lockstep 10 ván bot-vs-bot', botOk);

/* 5. cùng hạt giống → cùng đáp án ở 2 máy */
{
  const a = E.createGame(P2, { seed: 99 });
  const b = E.createGame(P2, { seed: 99 });
  t('cùng seed → cùng đáp án', a.answer === b.answer);
}

console.log(`\nNet Wordle: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
