/* Kéo Búa Bao rules tests — luật thuần, không DOM. */
import {
  createGame, applyAction, actors, viewFor, serialize, deserialize,
  mulberry32, CHOICES, ROUNDS_TO_WIN, beats, choiceName, choiceIcon,
} from '../js/engine.js?v=1';
import { botAction } from '../js/bot.js?v=1';

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? ' — ' + extra : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}
const P = (l1 = 'hard', l2 = 'hard') => [
  { id: 'p1', name: 'P1', isBot: false, level: l1 },
  { id: 'p2', name: 'P2', isBot: true, level: l2 },
];
function mk(seed, mode = 'match', l1 = 'hard', l2 = 'hard') {
  Math.random = mulberry32(seed);
  return createGame(P(l1, l2), { seed, kbbMode: mode });
}
/* 1 ván: áp 1 dãy pick (p1, p2, p1, p2, ...) tới khi kết thúc */
function playPicks(s, seq) {
  let i = 0;
  while (s.phase === 'playing' && i < seq.length) {
    const pid = s.players[i % 2].id;
    const r = applyAction(s, pid, { type: 'pick', choice: seq[i] });
    if (!r.ok) return { ok: false, why: r.reason };
    i++;
  }
  return { ok: s.phase === 'ended', why: s.phase };
}

console.log('Kéo Búa Bao rules:');

// 1. create
{
  const s = mk(1);
  check('create: phase playing, 2 người chơi', s.phase === 'playing' && s.players.length === 2);
  check('create: solo=false ở đấu thường', s.solo === false && s.race === true);
  check('create: vòng 1, tỉ số 0-0', s.prog.round === 1 && s.prog.roundWins.p1 === 0 && s.prog.roundWins.p2 === 0);
  check('create: actors = cả 2 chưa chọn', JSON.stringify(actors(s)) === JSON.stringify(['p1', 'p2']));
  const solo = mk(2, 'solo');
  check('create: solo=true ở chơi đơn', solo.solo === true);
}

// 2. beats — đủ 9 cặp
{
  const M = [
    ['keo', 'bao', true], ['keo', 'bua', false], ['keo', 'keo', false],
    ['bua', 'keo', true], ['bua', 'bao', false], ['bua', 'bua', false],
    ['bao', 'bua', true], ['bao', 'keo', false], ['bao', 'bao', false],
  ];
  let ok = true;
  for (const [a, b, w] of M) if (beats(a, b) !== w) ok = false;
  check('beats: đúng cả 9 cặp Kéo/Búa/Bao', ok);
  check('beats: lựa chọn lạ trả false', beats('keo', 'dao') === false && beats('dao', 'keo') === false);
  check('choiceName/choiceIcon: đủ 3 tay', choiceName('keo') === 'Kéo' && choiceIcon('bua') === '✊' && choiceIcon('bao') === '✋');
  check('ROUNDS_TO_WIN = 3', ROUNDS_TO_WIN === 3);
}

// 3. pick validation
{
  const s = mk(3);
  check('pick: lựa chọn lạ bị từ chối', applyAction(s, 'p1', { type: 'pick', choice: 'dao' }).ok === false);
  check('pick: người không trong ván bị từ chối', applyAction(s, 'px', { type: 'pick', choice: 'keo' }).ok === false);
  check('pick: p1 chọn keo OK', applyAction(s, 'p1', { type: 'pick', choice: 'keo' }).ok === true);
  check('pick: p1 chọn lần 2 bị từ chối', applyAction(s, 'p1', { type: 'pick', choice: 'bua' }).ok === false);
  check('pick: actors sau p1 chọn chỉ còn p2', JSON.stringify(actors(s)) === JSON.stringify(['p2']));
  check('pick: action lạ bị từ chối', applyAction(s, 'p2', { type: 'jump' }).ok === false);
  check('pick: action rỗng bị từ chối', applyAction(s, 'p2', null).ok === false);
}

// 4. hidden picks trong viewFor
{
  const s = mk(4);
  applyAction(s, 'p1', { type: 'pick', choice: 'keo' });
  const v1 = viewFor(s, 'p1');
  const v2 = viewFor(s, 'p2');
  check('viewFor: mình thấy lựa chọn của mình', v1.myPick === 'keo');
  check('viewFor: mình biết đối thủ đã chọn', v1.oppPicked === false);
  check('viewFor: đối thủ KHÔNG thấy lựa chọn của mình', v2.myPick === null && v2.oppPicked === true);
  check('viewFor: lựa chọn đối thủ không lộ trong view', JSON.stringify(v2).includes('"keo"') === false);
  applyAction(s, 'p2', { type: 'pick', choice: 'bao' });
  const v3 = viewFor(s, 'p1');
  check('viewFor: sau lật bài cả 2 tay đều thấy', v3.lastRound && v3.lastRound.picks.p1 === 'keo' && v3.lastRound.picks.p2 === 'bao');
  check('viewFor: Kéo thắng Bao → p1 thắng vòng', v3.lastRound.winner === 'p1' && v3.roundWins.p1 === 1);
}

// 5. tie replay
{
  const s = mk(5);
  applyAction(s, 'p1', { type: 'pick', choice: 'bua' });
  applyAction(s, 'p2', { type: 'pick', choice: 'bua' });
  check('tie: cùng Búa → hoà vòng, không ai ghi điểm', s.prog.ties === 1 && s.prog.roundWins.p1 === 0 && s.prog.roundWins.p2 === 0);
  check('tie: ván vẫn đang chơi sau vòng hoà', s.phase === 'playing');
  check('tie: lịch sử ghi vòng hoà', s.prog.rounds.length === 1 && s.prog.rounds[0].tie === true);
  const v = viewFor(s, 'p1');
  check('tie: summary ties = 1', v.rounds[0].tie === true && v.ties === 1);
}

// 6. first-to-3 win (p1 ra Kéo, p2 ra Bao → p1 thắng 3-0)
{
  const s = mk(6);
  const r = playPicks(s, ['keo', 'bao', 'keo', 'bao', 'keo', 'bao']);
  check('win 3-0: ván kết thúc sau 3 vòng thắng', r.ok === true, r.why);
  check('win 3-0: p1 là người thắng', s.winner === 'p1' && s.winnerIds[0] === 'p1');
  check('win 3-0: losers = [p2]', JSON.stringify(s.losers) === JSON.stringify(['p2']));
  check('win 3-0: endReason win', s.endReason === 'win');
  check('win 3-0: summary roundWins 3–0', s.final.summary.p1.roundWins === 3 && s.final.summary.p2.roundWins === 0);
  check('win 3-0: summary rounds = 3', s.final.summary.p1.rounds === 3);
  check('win 3-0: không nhận action sau khi kết thúc', applyAction(s, 'p1', { type: 'pick', choice: 'keo' }).ok === false);
}

// 7. match dài có hoà vòng + lội ngược (p2 dẫn 2-0 rồi p1 thắng 3-2)
{
  const s = mk(7);
  /* vòng 1: p1 Bao vs p2 Kéo → p2 thắng; vòng 2: p1 Bao vs p2 Kéo → p2 thắng (0-2);
     vòng 3: p1 Kéo vs p2 Bao → p1 thắng; vòng 4: p1 Búa vs p2 Kéo → p1 thắng;
     vòng 5: p1 Bao vs p2 Búa → p1 thắng 3-2 */
  const r = playPicks(s, ['bao', 'keo', 'bao', 'keo', 'keo', 'bao', 'bua', 'keo', 'bao', 'bua']);
  check('comeback 3-2: ván kết thúc', r.ok === true, r.why);
  check('comeback 3-2: p1 thắng dù từng bị dẫn 0-2', s.winner === 'p1');
  check('comeback 3-2: summary trailed02 = true cho p1', s.final.summary.p1.trailed02 === true);
  check('comeback 3-2: summary trailed02 = false cho p2', s.final.summary.p2.trailed02 === false);
  check('comeback 3-2: maxStreak p1 = 3', s.final.summary.p1.maxStreak === 3);
}

// 8. solo win/loss bằng bot
{
  function driveSolo(seed, lvl) {
    Math.random = mulberry32(seed);
    const s = createGame(P(lvl, lvl), { seed, kbbMode: 'solo' });
    let steps = 0;
    while (s.phase === 'playing' && steps < 100) {
      for (const pid of actors(s)) {
        if (s.phase !== 'playing') break;
        const a = botAction(s, pid);
        if (!a) return s;
        const r = applyAction(s, pid, a);
        if (!r.ok) return s;
        steps++;
      }
    }
    return s;
  }
  const w = driveSolo(11, 'hard');
  check('solo: ván bot-vs-bot kết thúc', w.phase === 'ended', w.phase);
  check('solo: có người thắng (không hoà)', w.winner !== null);
  const s2 = mk(12, 'solo');
  check('solo: viewFor solo có solo=true', viewFor(s2, 'p1').solo === true);
}

// 9. resign
{
  const s = mk(13);
  applyAction(s, 'p1', { type: 'pick', choice: 'keo' });
  const r = applyAction(s, 'p2', { type: 'resign' });
  check('resign: đấu thường, đối thủ thắng', r.ok === true && s.winner === 'p1' && s.endReason === 'resign');
  check('resign: losers = người xin thua', JSON.stringify(s.losers) === JSON.stringify(['p2']));
  const solo = mk(14, 'solo');
  applyAction(solo, 'p1', { type: 'resign' });
  check('resign: chơi đơn, winner null + losers=[p1]', solo.winner === null && JSON.stringify(solo.losers) === JSON.stringify(['p1']));
}

// 10. viewFor/serialize
{
  const s = mk(15);
  applyAction(s, 'p1', { type: 'pick', choice: 'keo' });
  applyAction(s, 'p2', { type: 'pick', choice: 'bao' });
  const snap = serialize(s);
  const s2 = deserialize(snap);
  check('serialize: round-trip giữ nguyên tỉ số', s2.prog.roundWins.p1 === 1 && s2.prog.rounds.length === 1);
  const r1 = playPicks(s, ['bua', 'keo', 'bua', 'keo']);
  const r2 = playPicks(s2, ['bua', 'keo', 'bua', 'keo']);
  check('serialize: tiếp tục từ bản sao → cùng kết quả', r1.ok === true && r2.ok === true && s.winner === s2.winner && JSON.stringify(s.final) === JSON.stringify(s2.final));
  check('serialize: final.summary có đủ trường', ['roundWins', 'rounds', 'ties', 'maxStreak', 'timeMs'].every(k => k in s.final.summary.p1));
}

// 11. gid duy nhất 200 ván (dù seed Math.random)
{
  Math.random = mulberry32(99);
  const gids = new Set();
  for (let i = 0; i < 200; i++) gids.add(createGame(P(), { seed: 42 }).gid);
  check('gid: 200 ván cùng seed vẫn duy nhất', gids.size === 200, 'size ' + gids.size);
}

// 12. cùng seed → cùng kết quả (2 lần)
{
  function run(seed) {
    Math.random = mulberry32(seed);
    const s = createGame(P(), { seed });
    const seq = ['keo', 'bao', 'bua', 'bua', 'bao', 'keo', 'keo', 'bao'];
    playPicks(s, seq);
    const { gid, startedAt, endedAt, seed: _seed, rng, rngState, ...rest } = s;
    for (const k of Object.keys(rest.final ? rest.final.summary : {})) rest.final.summary[k].timeMs = 0;
    return JSON.stringify(rest);
  }
  check('cùng seed → cùng kết quả (2 lần)', run(21) === run(21));
  check('khác seed → vẫn cùng kết quả (không RNG trong engine)', run(21) === run(22));
}

console.log(`\nKéo Búa Bao rules: ${pass} pass, ${fail} fail.`);
