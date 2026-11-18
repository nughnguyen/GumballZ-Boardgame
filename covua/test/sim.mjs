// node covua/test/sim.mjs – kiểm tra luật bằng perft (đếm số thế cờ) với các con số chuẩn + vài tình huống kết thúc ván.
import * as E from '../js/engine.js';
const perft = (P, d) => { if (!d) return 1; let n = 0; for (const m of E.legal(P)) n += perft(E.make(P, m), d - 1); return n; };
const T = [
  [E.START_FEN, 3, 8902], [E.START_FEN, 4, 197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862], /* Kiwipete: nhập thành, bắt tốt qua đường, ghim quân */
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3, 9467], /* phong cấp */
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
];
for (const [fen, d, want] of T) { const got = perft(E.fromFen(fen), d); if (got !== want) throw new Error(`perft sai: ${fen} d${d} = ${got}, đúng là ${want}`); if (E.toFen(E.fromFen(fen), +fen.split(' ')[5]) !== fen) throw new Error('FEN đọc/ghi lệch: ' + fen); }
const play = (sans, opts) => { const s = E.createGame([{ id: 'host', name: 'A' }, { id: 'p1', name: 'B' }], opts); for (const x of sans) { const P = s.pos, ms = E.legal(P), m = ms.find(m => E.san(P, m, ms) === x); if (m == null) throw new Error('không có nước ' + x + ' · có: ' + ms.map(m => E.san(P, m, ms)).join(' ')); const r = E.applyAction(s, E.pOf(s, P.t).id, { type: 'move', from: E.mFrom(m), to: E.mTo(m), promo: E.PROMO[E.mPromo(m)] }); if (!r.ok) throw new Error(r.reason); } return s; };
let s = play(['f3', 'e5', 'g4', 'Qh4#']); if (s.result.kind !== 'mate' || s.winner !== 'p1') throw new Error('chiếu bí sai');
s = play(['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']); if (s.result.kind !== 'repeat') throw new Error('lặp 3 lần sai');
s = play(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']); if (s.pos.b[62] !== 'K' || s.pos.b[61] !== 'R' || s.pos.c !== 'kq') throw new Error('nhập thành sai');
s = play(['e4', 'a6', 'e5', 'd5', 'exd6']); if (s.pos.b[E.sqOf('d5')] || s.caps.w[0] !== 'p') throw new Error('bắt tốt qua đường sai');
s = play(['Ra8#'], { setup: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1' }); if (s.result.kind !== 'mate') throw new Error('cờ thế sai');
s = play(['Qf7'], { setup: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1' }); if (s.result.kind !== 'stale' || s.winner) throw new Error('pat sai');
E.applyAction(s = play(['e4', 'e5']), 'host', { type: 'undo' }); if (s.moves.length) { E.applyAction(s, 'p1', { type: 'undoOk' }); } if (s.moves.length !== 0 && s.moves.length !== 2) throw new Error('đi lại sai');
console.log('✅ perft khớp 6 thế chuẩn; chiếu bí, pat, lặp thế, nhập thành, bắt tốt qua đường, cờ thế đều đúng');
