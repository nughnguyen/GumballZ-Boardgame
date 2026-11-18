// node covua/test/ai.mjs – máy phải tìm được chiếu bí đơn giản, không đi nước sai luật, và mức khó phải thắng mức dễ.
import * as E from '../js/engine.js';
import { think, bestMove, mateIn, botAction, MATE } from '../js/ai.js';
let r = think(E.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'), { depth: 2, ms: 500 }); if (E.san(E.fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'), r.move) !== 'Ra8#') throw new Error('không thấy chiếu bí 1 nước');
const m2 = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'; if (E.san(E.fromFen(m2), think(E.fromFen(m2), { depth: 2, ms: 800 }).move) !== 'Qxf7#') throw new Error('không thấy chiếu bí học trò');
if (mateIn(E.fromFen('k7/8/1K6/8/8/8/8/7R w - - 0 1'), 1) == null || mateIn(E.fromFen(E.START_FEN), 1) != null) throw new Error('mateIn sai');
const t0 = Date.now(); r = think(E.fromFen(E.START_FEN), { depth: 4, ms: 900 }); console.log('thế đầu: sâu', r.depth, 'điểm', r.score, 'nước', E.san(E.fromFen(E.START_FEN), r.move), Date.now() - t0, 'ms');
let w = { hard: 0, easy: 0, draw: 0 };
for (let g = 0; g < 6; g++) {
  const s = E.createGame([{ id: 'host', name: 'A', isBot: true, level: g % 2 ? 'hard' : 'easy' }, { id: 'p1', name: 'B', isBot: true, level: g % 2 ? 'easy' : 'hard' }], {}); let n = 0;
  while (s.phase === 'playing' && n++ < 300) { const id = E.actors(s)[0], a = botAction(s, id), res = E.applyAction(s, id, a); if (!res.ok) throw new Error('bot đi sai: ' + res.reason); }
  const win = s.winner ? s.players.find(p => p.id === s.winner).level : 'draw'; w[win]++;
}
console.log('khó đấu dễ 6 ván:', w); if (w.hard < 4) throw new Error('mức khó chưa đủ mạnh');
console.log('✅ máy tính cờ vua ổn');
