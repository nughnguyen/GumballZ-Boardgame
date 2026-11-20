// Kiểm tra kho câu hỏi + chơi thử: node dovui/test/sim.mjs [số ván]
import * as E from '../js/engine.js';
import { QS, CATS } from '../js/questions.js';
import { botAction } from '../js/bot.js';
import assert from 'assert';
const ids = new Set(), cats = new Set(CATS.map(c => c.id));
for (const q of QS) {
  assert.ok(!ids.has(q.id), 'trùng mã ' + q.id); ids.add(q.id);
  assert.ok(cats.has(q.c), 'chủ đề lạ ' + q.id); assert.ok([1, 2, 3, 4, 5].includes(q.d), 'độ khó ' + q.id);
  assert.equal(q.o.length, 4, '4 đáp án ' + q.id); assert.equal(new Set(q.o).size, 4, 'đáp án trùng ' + q.id);
  assert.ok(q.q.length > 8 && q.f && q.f.length > 10, 'thiếu câu / điều thú vị ' + q.id);
}
console.log(`📚 ${QS.length} câu hỏi:`, CATS.map(c => `${c.e}${QS.filter(q => q.c === c.id).length}`).join(' '), '· độ khó 1–5: ' + [1, 2, 3, 4, 5].map(d => QS.filter(q => q.d === d).length).join(' / '));
for (const c of CATS) for (const n of [10, 15, 20]) assert.equal(E.pickQs({ ...E.DEFAULT_OPTS, n, cats: [c.id] }).length, Math.min(n, QS.filter(q => q.c === c.id).length));
/* đủ mọi chủ đề: thang khó dần đúng từng bậc, không lặp câu */
for (const n of [10, 15, 20]) for (let k = 0; k < 50; k++) { const qs = E.pickQs({ ...E.DEFAULT_OPTS, n }); assert.equal(qs.length, n); assert.deepEqual(qs.map(q => q.d), E.ladder(n)); assert.equal(new Set(qs.map(q => q.id)).size, n); }
console.log('thang 15 câu:', E.ladder(15).join(' '));
/* luật cơ bản */
{ const s = E.createGame([{ id: 'host', name: 'A' }, { id: 'p1', name: 'B' }], { n: 10 });
  assert.equal(s.qs.length, 10); s.deadline = 1; E.applyAction(s, 'host', { type: 'timeout' }); assert.equal(s.phase, 'q');
  const v = E.viewFor(s, 'p1'); assert.equal(v.q.a, null, 'không lộ đáp án');
  assert.ok(E.applyAction(s, 'host', { type: 'fifty' }).ok); assert.equal(s.hid.host.length, 2); assert.ok(!s.hid.host.includes(s.qs[0].a));
  assert.equal(E.applyAction(s, 'host', { type: 'fifty' }).ok, false);
  assert.ok(E.applyAction(s, 'p1', { type: 'dbl' }).ok);
  E.applyAction(s, 'host', { type: 'ans', c: s.qs[0].a }); E.applyAction(s, 'p1', { type: 'ans', c: (s.qs[0].a + 1) % 4 });
  assert.equal(s.phase, 'rev'); assert.ok(s.gain.host.g >= 100); assert.ok(s.gain.p1.g < 0); assert.equal(s.players[1].score, 0);
  assert.ok(E.viewFor(s, 'p1').q.a !== null); }
/* hỏi khán giả: cộng đủ 100%, đáp án đã bị 50:50 bỏ đi thì 0%; gọi điện chỉ nói đáp án còn lại */
for (let k = 0; k < 300; k++) { const s = E.createGame([{ id: 'host', name: 'A' }], { n: 10 }); s.deadline = 1; E.applyAction(s, 'host', { type: 'timeout' });
  if (k % 2) E.applyAction(s, 'host', { type: 'fifty' }); assert.ok(E.applyAction(s, 'host', { type: 'aud' }).ok); assert.ok(E.applyAction(s, 'host', { type: 'call' }).ok);
  const a = s.aud.host, hid = s.hid.host || []; assert.equal(a.reduce((x, y) => x + y, 0), 100); assert.ok(a.every(x => x >= 0)); hid.forEach(i => assert.equal(a[i], 0)); assert.ok(!hid.includes(s.call.host.c));
  assert.equal(E.applyAction(s, 'host', { type: 'aud' }).ok, false); }
const N = +process.argv[2] || 200; let tot = { 1: 0, 2: 0, 3: 0 };
for (let g = 0; g < N; g++) {
  const lv = 1 + g % 3, s = E.createGame(Array.from({ length: 4 }, (_, i) => ({ id: 'bot' + i, name: 'B' + i, isBot: true })), { bot: lv, n: 15 });
  let k = 0; while (s.phase !== 'ended' && k++ < 500) { const a = E.actors(s); if (!a.length) { s.deadline = 1; E.applyAction(s, 'host', { type: 'timeout' }); continue; } for (const id of a) { const r = E.applyAction(s, id, botAction(s, id)); assert.ok(r.ok, r.reason); } }
  assert.equal(s.phase, 'ended'); tot[lv] += s.players.reduce((a, p) => a + p.right, 0) / 4;
}
console.log('máy đúng trung bình /15 câu:', Object.entries(tot).map(([l, t]) => `mức ${l}: ${(t / (N / 3)).toFixed(1)}`).join(' · '));
console.log('✅ ok');
