// Sinh cờ thế Cờ vua: cho bot tự đấu, nhặt các thế mà bên tới lượt chiếu bí được trong 1–2 nước với NƯỚC ĐẦU DUY NHẤT.
// Chạy: node tools/covua/make-puzzles.mjs [số bài 1 nước=12] [số bài 2 nước=18]  → ghi covua/js/puzzles.js
import { writeFileSync } from 'fs';
import * as E from '../../covua/js/engine.js';
import { think, mateIn, botAction, MATE } from '../../covua/js/ai.js';
const want = { 1: +process.argv[2] || 12, 2: +process.argv[3] || 18 }, got = { 1: [], 2: [] }, seen = new Set(), t0 = Date.now();
const firstMoves = (P, n) => E.legal(P).filter(m => { const Q = E.make(P, m), rs = E.legal(Q); if (!rs.length) return E.inCheck(Q); return n > 1 && rs.every(r => mateIn(E.make(Q, r), n - 1) != null); });
while ((got[1].length < want[1] || got[2].length < want[2]) && Date.now() - t0 < 9 * 60e3) {
  const lv = ['easy', 'normal'], s = E.createGame([{ id: 'host', name: 'A', isBot: true, level: lv[Math.random() * 2 | 0] }, { id: 'p1', name: 'B', isBot: true, level: lv[Math.random() * 2 | 0] }], {}); let n = 0;
  while (s.phase === 'playing' && n++ < 160) {
    const P = s.pos, pieces = P.b.filter(Boolean).length;
    if (n > 14 && pieces >= 7 && pieces <= 24 && !seen.has(E.posKey(P))) {
      const r = think(P, { depth: 3, ms: 250 });
      if (r.score > MATE - 100) {
        const k = mateIn(P, 1) != null ? 1 : 2;
        if (got[k].length < want[k]) { const fm = firstMoves(P, k); if (fm.length === 1) { seen.add(E.posKey(P)); got[k].push({ id: `m${k}-${got[k].length + 1}`, n: k, fen: E.toFen(P), sol: E.san(P, fm[0]) }); console.log(k, got[k].length, E.toFen(P), E.san(P, fm[0])); } }
      }
    }
    const id = E.actors(s)[0]; E.applyAction(s, id, botAction(s, id));
  }
}
const all = [...got[1], ...got[2]];
writeFileSync(new URL('../../covua/js/puzzles.js', import.meta.url), `// 🧩 Cờ thế Cờ vua – sinh và kiểm chứng bằng tools/covua/make-puzzles.mjs (bên tới lượt chiếu bí trong n nước; sol = nước đầu đúng duy nhất)\nexport const PUZZLES = [\n${all.map(p => '  ' + JSON.stringify(p)).join(',\n')}\n];\n`);
console.log('đã ghi', all.length, 'bài');
