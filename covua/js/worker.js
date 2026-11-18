// Luồng phụ: tính thanh đánh giá + gợi ý nước đi mà không làm giật giao diện.
import { fromFen, mFrom, mTo, mPromo, PROMO } from './engine.js?v=1';
import { think, mateIn, MATE } from './ai.js?v=1';
onmessage = e => {
  const { id, fen, depth = 4, ms = 700, mate = 0 } = e.data; let out = { id };
  try {
    const P = fromFen(fen); let m = mate ? mateIn(P, mate) : null, r = null;
    if (m == null) { r = think(P, { depth, ms }); m = r.move; }
    const sc = r ? r.score : MATE - 1, white = P.t === 'w' ? sc : -sc; /* điểm quy về phía Trắng */
    out = { id, score: white, mate: Math.abs(sc) > MATE - 100 ? Math.ceil((MATE - Math.abs(sc)) / 2) * Math.sign(white) : 0, depth: r ? r.depth : 0, best: m == null ? null : { from: mFrom(m), to: mTo(m), promo: PROMO[mPromo(m)] } };
  } catch (err) { out.error = String(err && err.message || err); }
  postMessage(out);
};
