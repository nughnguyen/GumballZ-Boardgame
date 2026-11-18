// ♟️ Cờ vua – luật, thuần logic. Phòng/mạng dùng shared/net/simplenet.js.
// Ô 0..63: 0 = a8 (góc trên trái nhìn từ phía Trắng), 63 = h1. Quân Trắng viết HOA (KQRBNP), Đen viết thường.
// Thế cờ P = { b: [64], t: 'w'|'b', c: quyền nhập thành 'KQkq', ep: ô bắt tốt qua đường (-1 nếu không), h: số nửa nước chưa ăn quân/đi tốt }
// Nước đi là số: from | to << 6 | phong cấp << 12 (1 Q, 2 R, 3 B, 4 N) | cờ << 15 (1 bắt tốt qua đường, 2 nhập thành, 3 tốt đi 2 ô)
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const sideOf = p => !p ? null : (p === p.toUpperCase() ? 'w' : 'b');
export const other = s => s === 'w' ? 'b' : 'w';
export const mFrom = m => m & 63, mTo = m => (m >> 6) & 63, mPromo = m => (m >> 12) & 7, mFlag = m => (m >> 15) & 3;
export const PROMO = ['', 'q', 'r', 'b', 'n'];
export const sqName = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
export const sqOf = n => (8 - +n[1]) * 8 + 'abcdefgh'.indexOf(n[0]);

export function fromFen(fen) {
  const [rows, t = 'w', c = '-', ep = '-', h = '0'] = String(fen).trim().split(/\s+/), b = [];
  for (const ch of rows) { if (ch === '/') continue; if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push(''); else b.push(ch); }
  if (b.length !== 64) throw new Error('FEN sai');
  return { b, t: t === 'b' ? 'b' : 'w', c: c === '-' ? '' : c, ep: ep === '-' ? -1 : sqOf(ep), h: +h || 0 };
}
export function toFen(P, n = 1) {
  let s = ''; for (let r = 0; r < 8; r++) { let e = 0; for (let c = 0; c < 8; c++) { const p = P.b[r * 8 + c]; if (!p) e++; else { if (e) { s += e; e = 0; } s += p; } } if (e) s += e; if (r < 7) s += '/'; }
  return `${s} ${P.t} ${P.c || '-'} ${P.ep < 0 ? '-' : sqName(P.ep)} ${P.h} ${n}`;
}
const N_D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]], K_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const B_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]], R_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];
// ô sq có bị bên `by` tấn công không
export function attacked(b, sq, by) {
  const r = sq >> 3, c = sq & 7, W = by === 'w';
  const pr = r + (W ? 1 : -1), pawn = W ? 'P' : 'p'; /* tốt của bên tấn công đứng chéo phía sau ô này */
  if (pr >= 0 && pr < 8) { if (c > 0 && b[pr * 8 + c - 1] === pawn) return true; if (c < 7 && b[pr * 8 + c + 1] === pawn) return true; }
  const kn = W ? 'N' : 'n', kg = W ? 'K' : 'k', bq = W ? 'BQ' : 'bq', rq = W ? 'RQ' : 'rq';
  for (const [dr, dc] of N_D) { const R = r + dr, C = c + dc; if (R >= 0 && R < 8 && C >= 0 && C < 8 && b[R * 8 + C] === kn) return true; }
  for (const [dr, dc] of K_D) { const R = r + dr, C = c + dc; if (R >= 0 && R < 8 && C >= 0 && C < 8 && b[R * 8 + C] === kg) return true; }
  for (const [dr, dc] of B_D) { let R = r + dr, C = c + dc; while (R >= 0 && R < 8 && C >= 0 && C < 8) { const p = b[R * 8 + C]; if (p) { if (bq.includes(p)) return true; break; } R += dr; C += dc; } }
  for (const [dr, dc] of R_D) { let R = r + dr, C = c + dc; while (R >= 0 && R < 8 && C >= 0 && C < 8) { const p = b[R * 8 + C]; if (p) { if (rq.includes(p)) return true; break; } R += dr; C += dc; } }
  return false;
}
export const kingSq = (b, side) => b.indexOf(side === 'w' ? 'K' : 'k');
export const inCheck = (P, side = P.t) => { const k = kingSq(P.b, side); return k < 0 || attacked(P.b, k, other(side)); };
// nước đi "thô" (chưa kiểm tra tự để vua bị chiếu); capsOnly: chỉ nước ăn quân + phong cấp (cho máy tính)
export function pseudo(P, capsOnly = false, out = []) {
  const b = P.b, W = P.t === 'w', me = P.t;
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || (p === p.toUpperCase()) !== W) continue;
    const r = i >> 3, c = i & 7, k = p.toLowerCase();
    if (k === 'p') {
      const d = W ? -1 : 1, R = r + d, last = W ? 0 : 7, home = W ? 6 : 1; if (R < 0 || R > 7) continue;
      const add = (to, fl = 0) => { if (R === last) for (let q = 1; q <= 4; q++) out.push(i | to << 6 | q << 12 | fl << 15); else out.push(i | to << 6 | fl << 15); };
      if (!b[R * 8 + c] && (!capsOnly || R === last)) { add(R * 8 + c); if (r === home && !b[(R + d) * 8 + c] && !capsOnly) out.push(i | ((R + d) * 8 + c) << 6 | 3 << 15); }
      for (const dc of [-1, 1]) { const C = c + dc; if (C < 0 || C > 7) continue; const to = R * 8 + C, t = b[to]; if (t && sideOf(t) !== me) add(to); else if (to === P.ep && !t) out.push(i | to << 6 | 1 << 15); }
      continue;
    }
    const slide = k === 'b' ? B_D : k === 'r' ? R_D : k === 'q' ? K_D : null;
    if (slide) { for (const [dr, dc] of slide) { let R = r + dr, C = c + dc; while (R >= 0 && R < 8 && C >= 0 && C < 8) { const to = R * 8 + C, t = b[to]; if (!t) { if (!capsOnly) out.push(i | to << 6); } else { if (sideOf(t) !== me) out.push(i | to << 6); break; } R += dr; C += dc; } } continue; }
    for (const [dr, dc] of (k === 'n' ? N_D : K_D)) { const R = r + dr, C = c + dc; if (R < 0 || R > 7 || C < 0 || C > 7) continue; const to = R * 8 + C, t = b[to]; if (!t ? !capsOnly : sideOf(t) !== me) out.push(i | to << 6); }
    if (k === 'k' && !capsOnly) { /* nhập thành: còn quyền, đường trống, vua không bị chiếu và không đi qua ô bị chiếu */
      const row = W ? 7 : 0, en = other(me); if (i !== row * 8 + 4) continue;
      const can = (flag, rookC, empty, pass) => P.c.includes(flag) && b[row * 8 + rookC] === (W ? 'R' : 'r') && empty.every(x => !b[row * 8 + x]) && !attacked(b, i, en) && pass.every(x => !attacked(b, row * 8 + x, en));
      if (can(W ? 'K' : 'k', 7, [5, 6], [5, 6])) out.push(i | (row * 8 + 6) << 6 | 2 << 15);
      if (can(W ? 'Q' : 'q', 0, [1, 2, 3], [3, 2])) out.push(i | (row * 8 + 2) << 6 | 2 << 15);
    }
  }
  return out;
}
// đi một nước → thế cờ mới (không sửa thế cũ)
export function make(P, m) {
  const b = P.b.slice(), f = m & 63, to = (m >> 6) & 63, pr = (m >> 12) & 7, fl = (m >> 15) & 3, p = b[f], W = P.t === 'w', cap = b[to];
  b[to] = pr ? (W ? PROMO[pr].toUpperCase() : PROMO[pr]) : p; b[f] = '';
  let ep = -1;
  if (fl === 1) b[to + (W ? 8 : -8)] = ''; /* bắt tốt qua đường: quân bị ăn nằm cạnh, không nằm ở ô đến */
  else if (fl === 2) { const row = to >> 3; if ((to & 7) === 6) { b[row * 8 + 5] = b[row * 8 + 7]; b[row * 8 + 7] = ''; } else { b[row * 8 + 3] = b[row * 8]; b[row * 8] = ''; } }
  else if (fl === 3) ep = (f + to) >> 1;
  let c = P.c;
  if (c) { if (p === 'K') c = c.replace(/[KQ]/g, ''); else if (p === 'k') c = c.replace(/[kq]/g, '');
    for (const s of [f, to]) { if (s === 63) c = c.replace('K', ''); else if (s === 56) c = c.replace('Q', ''); else if (s === 7) c = c.replace('k', ''); else if (s === 0) c = c.replace('q', ''); } }
  return { b, t: W ? 'b' : 'w', c, ep, h: (cap || p === 'P' || p === 'p') ? 0 : P.h + 1 };
}
export function legal(P, from = -1) {
  const out = []; for (const m of pseudo(P)) { if (from >= 0 && (m & 63) !== from) continue; const Q = make(P, m); if (!inCheck(Q, P.t)) out.push(m); } return out;
}
export const posKey = P => P.b.map(p => p || '.').join('') + P.t + P.c + (P.ep < 0 ? '' : P.ep);
// ký hiệu nước đi kiểu quốc tế (Nf3, exd5, O-O, e8=Q+, Qh7#)
export function san(P, m, moves = legal(P)) {
  const f = m & 63, to = (m >> 6) & 63, pr = (m >> 12) & 7, fl = (m >> 15) & 3, p = P.b[f], k = p.toUpperCase(), cap = !!P.b[to] || fl === 1;
  let s;
  if (fl === 2) s = (to & 7) === 6 ? 'O-O' : 'O-O-O';
  else if (k === 'P') s = (cap ? 'abcdefgh'[f & 7] + 'x' : '') + sqName(to) + (pr ? '=' + PROMO[pr].toUpperCase() : '');
  else { const tw = moves.filter(x => x !== m && ((x >> 6) & 63) === to && P.b[x & 63] === p); let d = '';
    if (tw.length) { if (!tw.some(x => (x & 7) === (f & 7))) d = 'abcdefgh'[f & 7]; else if (!tw.some(x => ((x & 63) >> 3) === (f >> 3))) d = String(8 - (f >> 3)); else d = sqName(f); }
    s = k + d + (cap ? 'x' : '') + sqName(to); }
  const Q = make(P, m); if (inCheck(Q)) s += legal(Q).length ? '+' : '#';
  return s;
}
// không đủ quân chiếu bí: vua–vua, vua + 1 mã/tượng – vua
export function lacking(b) { const ps = b.filter(p => p && p.toLowerCase() !== 'k'); return !ps.length || (ps.length === 1 && 'bn'.includes(ps[0].toLowerCase())); }

// ================== ván chơi (cho simplenet) ==================
export const DEFAULT_OPTS = { first: 'host', level: 'normal', assist: false }; /* first: ai cầm Trắng đi trước · assist: cho phép gợi ý + thanh đánh giá khi hai người đấu nhau */
export const OPT_CHOICES = { first: ['host', 'guest', 'random'], level: ['easy', 'normal', 'hard'], assist: [false, true] };
export const optOk = (k, v) => k in OPT_CHOICES && OPT_CHOICES[k].includes(v);
export function createGame(players, opts = {}) {
  if (players.length < 2) throw new Error('Cờ vua cần đúng 2 người (thêm bot nếu chơi một mình).');
  const o = { ...DEFAULT_OPTS, ...opts }, two = players.slice(0, 2);
  const hostWhite = o.first === 'random' ? Math.random() < 0.5 : o.first !== 'guest';
  const ps = two.map((p, i) => ({ id: p.id, name: p.name, isBot: !!p.isBot, level: p.level || o.level, side: (i === 0) === hostWhite ? 'w' : 'b' }));
  let P = fromFen(START_FEN);
  if (typeof o.setup === 'string') { P = fromFen(o.setup); ps[0].side = P.t; ps[1].side = other(P.t); } /* cờ thế: chủ phòng cầm bên tới lượt */
  const s = { v: 1, opts: { ...o, setup: undefined, puzzle: undefined }, players: ps, pos: P, start: toFen(P), puzzle: o.puzzle || null, phase: 'playing', winner: null, result: null, moves: [], stack: [], check: inCheck(P), caps: { w: [], b: [] }, offer: null, undo: null, seq: 0, gid: Math.random().toString(36).slice(2, 8) };
  s.keys = [posKey(P)];
  return s;
}
export const pOf = (s, side) => s.players.find(p => p.side === side);
export const actors = s => s.phase === 'playing' ? [pOf(s, s.pos.t).id] : [];
function end(s, winnerSide, kind) { s.phase = 'ended'; s.winner = winnerSide ? pOf(s, winnerSide).id : null; s.result = { kind, side: winnerSide }; s.offer = null; s.undo = null; s.seq++; }
function takeBack(s, n) { for (let i = 0; i < n; i++) { const P = s.stack.pop(); if (!P) break; const m = s.moves.pop(); if (m.cap) s.caps[m.side].pop(); s.keys.pop(); s.pos = P; } s.check = inCheck(s.pos); s.offer = null; s.seq++; }
export function applyAction(s, pid, a) {
  const me = s.players.find(p => p.id === pid); if (!me) return { ok: false, reason: 'Bạn đang xem ván này.' };
  if (s.phase !== 'playing') return { ok: false, reason: 'Ván đã kết thúc.' };
  const opp = s.players.find(p => p !== me), P = s.pos;
  if (a.type === 'resign') { end(s, opp.side, 'resign'); return { ok: true }; }
  if (a.type === 'draw') { if (s.offer === me.side) return { ok: false, reason: 'Bạn đã cầu hoà rồi, chờ đối thủ trả lời.' }; if (s.offer === opp.side) { end(s, null, 'agree'); return { ok: true }; } s.offer = me.side; s.seq++; return { ok: true }; }
  if (a.type === 'drawNo') { if (s.offer !== opp.side) return { ok: false, reason: 'Không có lời cầu hoà nào.' }; s.offer = null; s.seq++; return { ok: true }; }
  if (a.type === 'undo') { /* xin đi lại: với bot thì được luôn, với người thì phải đối thủ đồng ý */
    const n = P.t === me.side ? 2 : 1; if (s.moves.length < n) return { ok: false, reason: 'Chưa có nước nào để đi lại.' };
    if (opp.isBot) { takeBack(s, n); return { ok: true }; }
    if (s.undo) return { ok: false, reason: 'Đang chờ trả lời xin đi lại.' }; s.undo = { by: me.side, n }; s.seq++; return { ok: true };
  }
  if (a.type === 'undoOk' || a.type === 'undoNo') { if (!s.undo || s.undo.by !== opp.side) return { ok: false, reason: 'Không có lời xin đi lại.' }; const n = s.undo.n; s.undo = null; if (a.type === 'undoOk' && s.moves.length >= n) takeBack(s, n); s.seq++; return { ok: true }; }
  if (a.type !== 'move') return { ok: false, reason: 'Hành động lạ.' };
  if (P.t !== me.side) return { ok: false, reason: 'Chưa tới lượt bạn.' };
  const from = a.from | 0, to = a.to | 0, pr = Math.max(0, PROMO.indexOf(String(a.promo || '')));
  const ms = legal(P), cand = ms.filter(m => (m & 63) === from && ((m >> 6) & 63) === to);
  const m = cand.find(x => mPromo(x) === (pr || 1)) || (cand.length === 1 ? cand[0] : null); /* phong cấp mà không chọn quân thì mặc định Hậu */
  if (m == null || !cand.includes(m)) return { ok: false, reason: inCheck(P) ? 'Đang bị chiếu – phải giải chiếu trước.' : 'Nước đi không hợp lệ.' };
  const text = san(P, m, ms), piece = P.b[from], cap = mFlag(m) === 1 ? (me.side === 'w' ? 'p' : 'P') : P.b[to];
  s.stack.push(P); s.pos = make(P, m); const Q = s.pos;
  if (cap) s.caps[me.side].push(cap);
  s.check = inCheck(Q); s.offer = null; s.undo = null; s.seq++;
  s.moves.push({ from, to, piece, cap: cap || '', promo: PROMO[mPromo(m)], flag: mFlag(m), side: me.side, check: s.check, text });
  const key = posKey(Q); s.keys.push(key);
  if (!legal(Q).length) { end(s, s.check ? me.side : null, s.check ? 'mate' : 'stale'); return { ok: true }; } /* hết nước: bị chiếu là thua, không bị chiếu là hoà (hết nước đi) */
  if (lacking(Q.b)) { end(s, null, 'lack'); return { ok: true }; }
  if (s.keys.filter(k => k === key).length >= 3) { end(s, null, 'repeat'); return { ok: true }; }
  if (Q.h >= 100) { end(s, null, 'fifty'); return { ok: true }; }
  return { ok: true };
}
export const RESULT_TEXT = { mate: 'Chiếu bí', stale: 'Hết nước đi (pat) – hoà', resign: 'Đối thủ xin thua', agree: 'Hai bên đồng ý hoà', repeat: 'Lặp lại thế cờ 3 lần – hoà', fifty: '50 nước không ăn quân, không đi tốt – hoà', lack: 'Không đủ quân để chiếu bí – hoà' };
export function viewFor(s, pid) {
  const me = s.players.find(p => p.id === pid), P = s.pos;
  return { v: s.v, gid: s.gid, opts: s.opts, players: s.players.map(p => ({ ...p })), board: P.b.slice(), turn: P.t, castle: P.c, ep: P.ep, half: P.h, fen: toFen(P, 1 + (s.moves.length >> 1)), phase: s.phase, winner: s.winner, result: s.result, puzzle: s.puzzle,
    moves: s.moves.slice(-300), nMoves: s.moves.length, check: s.check, caps: { w: s.caps.w.slice(), b: s.caps.b.slice() }, offer: s.offer, undo: s.undo, seq: s.seq, me: pid, mySide: me ? me.side : null };
}
