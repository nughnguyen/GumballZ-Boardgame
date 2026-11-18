// node daochinh/test/sim.mjs – kiểm luật Đảo Chính + cho máy đấu máy.
import * as E from '../js/engine.js'; import { botAction } from '../js/bot.js';
let ok = 0, bad = 0; const t = (n, c) => { if (c) ok++; else { bad++; console.log('❌', n); } };
let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const mk = (n, o = {}) => E.createGame(Array.from({ length: n }, (_, i) => ({ id: i ? 'p' + i : 'host', name: 'ABCDEF'[i] })), { time: 0, ...o }, rnd);
const set = (s, i, a, b) => { s.players[i].cards = [{ r: a, dead: false }, { r: b, dead: false }]; };
let s = mk(3); const id = i => s.players[i].id, act = (i, a) => E.applyAction(s, id(i), a, rnd);
t('15 lá, chia 6, còn 9', s.deck.length === 9 && s.players.every(p => p.cards.length === 2 && p.coins === 2));
t('2 người: người đầu 1 xu', mk(2).players[0].coins === 1);
t('chưa tới lượt', !act(1, { type: 'act', act: 'income' }).ok);
t('thu thuế dân +1, sang lượt', act(0, { type: 'act', act: 'income' }).ok && s.players[0].coins === 3 && s.turn === 1);
t('đảo chính cần 7 xu', !act(1, { type: 'act', act: 'coup', target: id(2) }).ok);
// Công tước thật bị nghi
set(s, 1, 'duke', 'captain'); set(s, 2, 'contessa', 'assassin');
t('thu thuế (xưng Công tước) chờ nghi', act(1, { type: 'act', act: 'tax' }).ok && s.phase === 'respond' && E.actors(s).length === 2);
t('người xưng không tự nghi mình', !act(1, { type: 'challenge' }).ok);
t('nghi', act(2, { type: 'challenge' }).ok && s.phase === 'lose' && E.actors(s)[0] === id(2));
t('người xưng có thật đã đổi lá', s.players[1].cards.filter(c => !c.dead).length === 2 && s.deck.length === 9);
t('người nghi bỏ lá', act(2, { type: 'lose', i: 1 }).ok && s.players[2].cards[1].dead && s.players[1].coins === 5 && s.turn === 2);
// nói dối bị bắt
set(s, 2, 'contessa', 'assassin'); s.players[2].cards[1].dead = true; s.players[2].coins = 3;
set(s, 0, 'duke', 'duke');
t('Sát thủ bịp (chỉ có Nữ bá tước)', act(2, { type: 'act', act: 'assassinate', target: id(0) }).ok && s.players[2].coins === 0);
t('nghi → kẻ bịp mất lá cuối, bị loại, được trả xu', act(0, { type: 'challenge' }).ok && s.phase === 'lose' && E.actors(s)[0] === id(2));
act(2, { type: 'lose', i: 0 });
t('bị loại thì bỏ qua lượt', !E.alive(s.players[2]) && s.players[2].coins === 3 && s.turn === 0);
// luật nhà: nghi đúng +1 xu
{ const s2 = mk(3, { bonus: 1 }), A2 = (i, a) => E.applyAction(s2, s2.players[i].id, a, rnd);
  s2.players[0].cards = [{ r: 'contessa', dead: false }, { r: 'captain', dead: false }]; const c1 = s2.players[1].coins;
  A2(0, { type: 'act', act: 'tax' }); A2(1, { type: 'challenge' });
  t('bonus: nghi đúng +1 xu', s2.players[1].coins === c1 + 1);
  const s3 = mk(3); s3.players[0].cards = [{ r: 'contessa', dead: false }, { r: 'captain', dead: false }]; const c3 = s3.players[1].coins;
  E.applyAction(s3, s3.players[0].id, { type: 'act', act: 'tax' }, rnd); E.applyAction(s3, s3.players[1].id, { type: 'challenge' }, rnd);
  t('luật gốc: nghi đúng không thưởng', s3.players[1].coins === c3); }
// viện trợ bị chặn bằng Công tước, nghi lời chặn
set(s, 1, 'captain', 'ambassador');
t('xin viện trợ', act(0, { type: 'act', act: 'aid' }).ok && s.flow.step === 'block');
t('không nghi được viện trợ', !act(1, { type: 'challenge' }).ok);
t('chặn bằng Công tước (bịp)', act(1, { type: 'block', role: 'duke' }).ok && s.flow.step === 'bchal' && E.actors(s)[0] === id(0));
const c0 = s.players[0].coins;
t('nghi lời chặn → kẻ chặn mất lá, viện trợ thành công', act(0, { type: 'challenge' }).ok && act(1, { type: 'lose', i: 0 }).ok && s.players[0].coins === c0 + 2);
// chặn không ai nghi
s = mk(3); set(s, 0, 'captain', 'duke'); set(s, 1, 'captain', 'contessa'); s.players[1].coins = 4;
t('cướp', act(0, { type: 'act', act: 'steal', target: id(1) }).ok && s.flow.step === 'chal');
act(1, { type: 'pass' }); act(2, { type: 'pass' });
t('chỉ nạn nhân được chặn cướp', s.flow.step === 'block' && E.actors(s).join() === id(1));
t('chặn bằng sai vai thì không', !act(1, { type: 'block', role: 'duke' }).ok);
act(1, { type: 'block', role: 'captain' }); act(0, { type: 'pass' }); act(2, { type: 'pass' });
t('chặn đứng → không mất xu', s.players[1].coins === 4 && s.turn === 1);
// cướp thành công
act(1, { type: 'act', act: 'income' }); set(s, 2, 'captain', 'captain');
act(2, { type: 'act', act: 'steal', target: id(0) }); act(0, { type: 'pass' }); act(1, { type: 'pass' }); act(0, { type: 'pass' });
t('cướp 2 xu', s.players[2].coins === 4 && s.players[0].coins === 0);
// đổi vai
set(s, 0, 'ambassador', 'contessa'); act(0, { type: 'act', act: 'exchange' }); act(1, { type: 'pass' }); act(2, { type: 'pass' });
t('đổi vai: thấy 4 lá, giữ 2', s.phase === 'exchange' && s.ex.pool.length === 4 && s.ex.keep === 2);
t('giữ sai số lá thì không', !act(0, { type: 'keep', idx: [0] }).ok);
const pool = s.ex.pool.slice(); t('giữ 2', act(0, { type: 'keep', idx: [2, 3] }).ok && s.players[0].cards.map(c => c.r).join() === pool.slice(2).join() && s.deck.length === 9 && s.turn === 1);
// 10 xu bắt buộc đảo chính
s.players[1].coins = 10; t('10 xu phải đảo chính', !act(1, { type: 'act', act: 'income' }).ok && act(1, { type: 'act', act: 'coup', target: id(2) }).ok && s.players[1].coins === 3 && s.phase === 'lose');
// ám sát: Nữ bá tước chặn
s = mk(2); set(s, 0, 'assassin', 'duke'); set(s, 1, 'contessa', 'duke'); s.players[0].coins = 3;
act(0, { type: 'act', act: 'assassinate', target: id(1) }); act(1, { type: 'pass' });
t('ám sát: nạn nhân chặn bằng Nữ bá tước', act(1, { type: 'block', role: 'contessa' }).ok);
act(0, { type: 'pass' }); t('bị chặn vẫn mất 3 xu, không ai chết', s.players[0].coins === 0 && s.players.every(p => p.cards.every(c => !c.dead)));
// ám sát + nạn nhân nghi sai → mất cả 2 lá
s = mk(2); set(s, 0, 'assassin', 'duke'); set(s, 1, 'captain', 'duke'); s.players[0].coins = 3;
act(0, { type: 'act', act: 'assassinate', target: id(1) }); act(1, { type: 'challenge' }); act(1, { type: 'lose', i: 0 });
t('nạn nhân nghi sai, còn 1 lá: chết luôn nếu không chặn', s.phase === 'respond' && s.flow.step === 'block');
act(1, { type: 'pass' }); act(1, { type: 'lose', i: 1 });
t('hết lá → người kia thắng', s.phase === 'ended' && s.winner === id(0));
// hết giờ
s = mk(3, { time: 12 }); s.deadline = Date.now() - 1;
t('hết giờ lượt chính → thu thuế dân', act(1, { type: 'timeout' }).ok && s.players[0].coins === 3 && s.turn === 1);
t('chưa hết giờ thì không', !act(1, { type: 'timeout' }).ok);
// viewFor
const v = E.viewFor(s, id(0)); t('không thấy lá úp người khác', v.players[1].cards.every(c => c.r === null) && v.players[0].cards.every(c => c.r));
// máy đấu máy
const wins = {}; let stuck = 0, steps = 0;
for (let g = 0; g < 1200; g++) {
  const n = 2 + (g % 5); const q = mk(n, { level: 1 + (g % 3) });
  let k = 0; while (q.phase !== 'ended' && k++ < 2000) {
    const who = E.actors(q); if (!who.length) { stuck++; console.log("không ai đi", q.phase, JSON.stringify(q.flow), q.lose); break; }
    const pid = who[Math.floor(rnd() * who.length)]; const a = botAction(q, pid, null, rnd);
    const r = a ? E.applyAction(q, pid, a, rnd) : { ok: false };
    if (!r.ok) { stuck++; console.log('kẹt', q.phase, q.flow && q.flow.step, JSON.stringify(a), r.reason); break; }
    const tot = q.players.reduce((m, p) => m + p.cards.length, 0) + q.deck.length + (q.ex ? 2 : 0);
    if (tot !== 15) { stuck++; console.log('lệch số lá', tot); break; }
  }
  steps += k; if (q.phase === 'ended') { const i = q.players.findIndex(p => p.id === q.winner); const key = n + ':' + i; wins[key] = (wins[key] || 0) + 1; } else { stuck++; console.log("quá dài", q.phase, q.players.map(p=>p.coins+":"+p.cards.map(c=>c.r+(c.dead?"x":"")).join("|")).join(" ")); }
}
t('1200 ván máy đấu máy không kẹt', stuck === 0);
console.log('thắng theo ghế (số người:ghế):', JSON.stringify(wins), 'bước TB', Math.round(steps / 1200));
console.log(`✅ ${ok} đúng, ❌ ${bad} sai`); process.exit(bad ? 1 : 0);
