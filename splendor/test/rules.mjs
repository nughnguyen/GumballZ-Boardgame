// 💎 Test luật Splendor — chạy: node test/rules.mjs
// Seed Math.random không cần ở đây (engine dùng LCG riêng, test chỉ
// dùng seed cố định qua opts.seed).
//
// §0. NGUỒN LUẬT (đã tra cứu trước khi code — xem engine.js):
// - Luật gốc Space Cowboys 2014 (rulebook, via Scribd "Rules Splendor
//   US" + bản PDF 1jour-1jeu): 2–4 người; đá mỗi màu 7 (4 người) / 5
//   (3 người) / 4 (2 người); vàng LUÔN 5; 90 thẻ (40/30/20); 4 thẻ
//   ngửa mỗi cấp; quý tộc = số người + 1 trong 10 thẻ (5 thẻ "4+4",
//   5 thẻ "3+3+3"), mỗi quý tộc +3 điểm; mỗi lượt làm ĐÚNG 1 việc
//   (lấy 3 đá khác màu / lấy 2 đá cùng màu khi còn ≥ 4 đá / giữ thẻ +
//   1 vàng / mua thẻ); giữ tối đa 3 thẻ; cuối lượt tối đa 10 đá; thẻ
//   đã mua cho giảm giá vĩnh viễn; vàng thay mọi màu; quý tộc đến thăm
//   tự động cuối lượt khi đủ điều kiện (tối đa 1/lượt, không được từ
//   chối, đủ điều kiện nhiều quý tộc thì NGƯỜI CHƠI ĐƯỢC CHỌN); đạt
//   15+ điểm thì hết vòng rồi tính điểm; hòa điểm thì ÍT THẺ HƠN
//   thắng (luật gốc — tie-break giải đấu "nhiều quý tộc hơn" KHÔNG
//   dùng, xem NamuWiki/Wikipedia).
// - officialgamerules.org / dicebreaker.com / boardgamemate.com /
//   geekyhobbies.com / overrules.mobi / therulebook.com / Wikipedia
//   "Splendor (game)": xác nhận lại toàn bộ các số trên.
// - BỘ THẺ: phân bố chuẩn đối xứng theo màu (40/30/20; 8/6/4 thẻ mỗi
//   màu thưởng; giá cấp 1: 3–5 đá, cấp 2: 5–8 đá, cấp 3: 7–14 đá;
//   điểm cấp 1: 0–1, cấp 2: 1–3, cấp 3: 3–5) — xem §1. Danh sách
//   90 thẻ chính xác từng lá của bản vật lý không lấy được từ nguồn
//   mở nào trong lúc nghiên cứu (BGG wiki trống, repo BGA 404,
//   NamuWiki trích xuất lỗi), nên bộ thẻ dùng phân bố chuẩn đối xứng
//   (mọi bất biến đã kiểm chứng ở §1) thay vì sao chép từng lá.
import {
  createGame, applyAction, viewFor, actors, legalMoves,
  CARDS, NOBLES, cardById, nobleById, paymentFor, canAfford,
  bonusCounts, prestige, tokenCount,
  COLORS, GOLD, TOKENS_BY_PLAYERS, MAX_RESERVED, MAX_TOKENS, WIN_SCORE,
} from '../js/engine.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; }
  else { fail++; console.log(`FAIL: ${name} ${extra}`); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function mk(names, seed = 11) { return createGame(names, { seed }); }
/* đặt đá cho người chơi đúng bằng số tiền phải trả cho 1 thẻ
   (tính theo giá sau giảm giá — không phụ thuộc đá đang cầm, vì
   paymentFor trả null khi người chơi chưa đủ tiền) */
function giveExactCost(s, pid, card) {
  const p = s.players.find(x => x.id === pid);
  const bonuses = bonusCounts(p);
  p.tokens = { W: 0, B: 0, G: 0, R: 0, K: 0, gold: 0 };
  for (const c of COLORS) {
    const need = Math.max(0, (card.cost[c] || 0) - (bonuses[c] || 0));
    if (need) p.tokens[c] = need;
  }
}

/* ---------- §1. Bộ thẻ + quý tộc ---------- */
{
  const all = Object.values(CARDS);
  check('§1 deck: 90 thẻ', all.length === 90, `n=${all.length}`);
  for (const lvl of [1, 2, 3]) {
    const n = all.filter(c => c.level === lvl).length;
    check(`§1 deck: cấp ${lvl} có ${lvl === 1 ? 40 : lvl === 2 ? 30 : 20} thẻ`, n === (lvl === 1 ? 40 : lvl === 2 ? 30 : 20), `n=${n}`);
    for (const b of COLORS) {
      const k = all.filter(c => c.level === lvl && c.bonus === b).length;
      check(`§1 deck: cấp ${lvl} màu ${b} có ${lvl === 1 ? 8 : lvl === 2 ? 6 : 4} thẻ`, k === (lvl === 1 ? 8 : lvl === 2 ? 6 : 4), `k=${k}`);
    }
  }
  const costTotal = c => Object.values(c.cost).reduce((a, n) => a + n, 0);
  check('§1 deck: cấp 1 giá 3–5 đá', all.filter(c => c.level === 1).every(c => costTotal(c) >= 3 && costTotal(c) <= 5));
  check('§1 deck: cấp 2 giá 5–8 đá', all.filter(c => c.level === 2).every(c => costTotal(c) >= 5 && costTotal(c) <= 8));
  check('§1 deck: cấp 3 giá 7–14 đá', all.filter(c => c.level === 3).every(c => costTotal(c) >= 7 && costTotal(c) <= 14));
  check('§1 deck: cấp 1 điểm 0–1', all.filter(c => c.level === 1).every(c => c.pts >= 0 && c.pts <= 1));
  check('§1 deck: cấp 2 điểm 1–3', all.filter(c => c.level === 2).every(c => c.pts >= 1 && c.pts <= 3));
  check('§1 deck: cấp 3 điểm 3–5', all.filter(c => c.level === 3).every(c => c.pts >= 3 && c.pts <= 5));
  check('§1 deck: cấp 1 có đúng 10 thẻ 1 điểm', all.filter(c => c.level === 1 && c.pts === 1).length === 10);
  check('§1 deck: không có 2 thẻ trùng id', new Set(all.map(c => c.id)).size === 90);
  /* vài lá cụ thể (ghim cách sinh chi phí xoay vòng theo màu) */
  check('§1 deck: 1W3 giá {K:2,W:2} điểm 0', eq(cardById('1W3').cost, { K: 2, W: 2 }) && cardById('1W3').pts === 0);
  check('§1 deck: 1W6 giá {G:2,R:2} điểm 1', eq(cardById('1W6').cost, { G: 2, R: 2 }) && cardById('1W6').pts === 1);
  check('§1 deck: 3W0 giá {B:5,G:5} điểm 5', eq(cardById('3W0').cost, { B: 5, G: 5 }) && cardById('3W0').pts === 5);
  check('§1 deck: 3G1 giá {K:7} điểm 4', eq(cardById('3G1').cost, { K: 7 }) && cardById('3G1').pts === 4);
  check('§1 nobles: 10 thẻ quý tộc', NOBLES.length === 10);
  check('§1 nobles: 5 thẻ dạng 4+4', NOBLES.filter(n => Object.keys(n.req).length === 2 && Object.values(n.req).every(v => v === 4)).length === 5);
  check('§1 nobles: 5 thẻ dạng 3+3+3', NOBLES.filter(n => Object.keys(n.req).length === 3 && Object.values(n.req).every(v => v === 3)).length === 5);
  check('§1 nobles: có quý tộc {G:4,B:4}', NOBLES.some(n => eq(n.req, { G: 4, B: 4 })));
  check('§1 nobles: có quý tộc {W:3,B:3,K:3}', NOBLES.some(n => eq(n.req, { W: 3, B: 3, K: 3 })));
}

/* ---------- §2. Khởi tạo theo số người ---------- */
{
  const s2 = mk(['An', 'Bình'], 21);
  check('§2 setup 2p: 4 đá mỗi màu', COLORS.every(c => s2.tokens[c] === 4), JSON.stringify(s2.tokens));
  check('§2 setup 2p: luôn 5 vàng', s2.tokens.gold === 5);
  check('§2 setup 2p: 3 quý tộc', s2.nobles.length === 3);
  check('§2 setup 2p: 4 thẻ ngửa mỗi cấp', [1, 2, 3].every(l => s2.table[l].length === 4 && s2.table[l].every(Boolean)));
  check('§2 setup 2p: chồng còn 36/26/16 thẻ', s2.decks[1].length === 36 && s2.decks[2].length === 26 && s2.decks[3].length === 16, `${s2.decks[1].length}/${s2.decks[2].length}/${s2.decks[3].length}`);
  check('§2 setup 2p: người đầu đi trước', s2.turn === s2.players[0].id && s2.step === 'act');
  const s3 = mk(['An', 'Bình', 'Cúc'], 22);
  check('§2 setup 3p: 5 đá mỗi màu, 4 quý tộc', COLORS.every(c => s3.tokens[c] === 5) && s3.nobles.length === 4);
  const s4 = mk(['An', 'Bình', 'Cúc', 'Dũng'], 23);
  check('§2 setup 4p: 7 đá mỗi màu, 5 quý tộc', COLORS.every(c => s4.tokens[c] === 7) && s4.nobles.length === 5);
  let threw1 = false, threw5 = false;
  try { createGame(['An'], { seed: 1 }); } catch (e) { threw1 = true; }
  try { createGame(['A', 'B', 'C', 'D', 'E'], { seed: 1 }); } catch (e) { threw5 = true; }
  check('§2 setup: 1 người / 5 người đều bị từ chối', threw1 && threw5);
  check('§2 setup: TOKENS_BY_PLAYERS = {2:4, 3:5, 4:7}', eq(TOKENS_BY_PLAYERS, { 2: 4, 3: 5, 4: 7 }));
}

/* ---------- §3. Lấy đá: take3 / take2 ---------- */
{
  const s = mk(['An', 'Bình'], 31);
  const p0 = s.players[0].id;
  let r = applyAction(s, p0, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§3 take3: lấy 3 đá khác màu ok', r.ok && s.players[0].tokens.W === 1 && s.players[0].tokens.B === 1 && s.players[0].tokens.G === 1);
  check('§3 take3: ngân hàng trừ đúng', s.tokens.W === 3 && s.tokens.B === 3 && s.tokens.G === 3 && s.tokens.R === 4);
  check('§3 take3: hết lượt thì đổi người', s.turn === s.players[1].id);
  /* nước sai */
  const s2 = mk(['An', 'Bình'], 32);
  const q0 = s2.players[0].id;
  check('§3 take3: trùng màu bị từ chối', !applyAction(s2, q0, { type: 'take3', colors: ['W', 'W', 'B'] }).ok);
  check('§3 take3: thiếu số lượng bị từ chối (còn đủ 3 màu mà chỉ lấy 2)', !applyAction(s2, q0, { type: 'take3', colors: ['W', 'B'] }).ok);
  check('§3 take3: màu không có trong ngân hàng bị từ chối', (() => { s2.tokens.R = 0; return !applyAction(s2, q0, { type: 'take3', colors: ['W', 'B', 'R'] }).ok; })());
  check('§3 take3: người khác lượt bị từ chối', !applyAction(s2, s2.players[1].id, { type: 'take3', colors: ['W', 'B', 'G'] }).ok);
  /* chỉ còn 2 màu thì lấy đúng 2 */
  const s3 = mk(['An', 'Bình'], 33);
  s3.tokens = { W: 1, B: 1, G: 0, R: 0, K: 0, gold: 5 };
  const r3 = applyAction(s3, s3.players[0].id, { type: 'take3', colors: ['W', 'B'] });
  check('§3 take3: chỉ còn 2 màu thì lấy 2 đá ok', r3.ok && s3.players[0].tokens.W === 1 && s3.players[0].tokens.B === 1);
  check('§3 take3: chỉ còn 2 màu mà xin 3 màu bị từ chối', (() => { const s4 = mk(['An', 'Bình'], 34); s4.tokens = { W: 1, B: 1, G: 0, R: 0, K: 0, gold: 5 }; return !applyAction(s4, s4.players[0].id, { type: 'take3', colors: ['W', 'B', 'G'] }).ok; })());
  /* take2 */
  const s5 = mk(['An', 'Bình'], 35);
  s5.tokens.B = 4;
  const r5 = applyAction(s5, s5.players[0].id, { type: 'take2', color: 'B' });
  check('§3 take2: còn ≥ 4 đá thì lấy 2 ok', r5.ok && s5.players[0].tokens.B === 2 && s5.tokens.B === 2);
  const s6 = mk(['An', 'Bình'], 36);
  s6.tokens.R = 3;
  check('§3 take2: chỉ còn 3 đá thì bị từ chối', !applyAction(s6, s6.players[0].id, { type: 'take2', color: 'R' }).ok);
  check('§3 take2: lấy vàng bằng take2 bị từ chối', !applyAction(mk(['An', 'Bình'], 37), 'p0', { type: 'take2', color: 'gold' }).ok);
}

/* ---------- §4. Giữ thẻ (reserve) ---------- */
{
  const s = mk(['An', 'Bình'], 41);
  const p0 = s.players[0];
  const firstCard = s.table[1][0];
  let r = applyAction(s, p0.id, { type: 'reserve', from: 'table', level: 1, slot: 0 });
  check('§4 reserve bàn: ok, thẻ vào tay giữ', r.ok && p0.reserved.length === 1 && p0.reserved[0] === firstCard);
  check('§4 reserve bàn: ô trống được lấp lại từ chồng', s.table[1][0] !== firstCard && s.table[1][0] !== null);
  check('§4 reserve bàn: chồng cấp 1 trừ 1', s.decks[1].length === 35);
  check('§4 reserve bàn: được +1 vàng', p0.tokens.gold === 1 && s.tokens.gold === 4);
  /* giữ úp từ chồng */
  r = applyAction(s, s.players[1].id, { type: 'reserve', from: 'deck', level: 2 });
  check('§4 reserve úp: ok, chồng cấp 2 trừ 1', r.ok && s.decks[2].length === 25 && s.players[1].reserved.length === 1);
  check('§4 reserve úp: cũng được +1 vàng', s.players[1].tokens.gold === 1);
  /* giữ đủ 3 thì thẻ thứ 4 bị từ chối */
  const s2 = mk(['An', 'Bình'], 42);
  const q0 = s2.players[0];
  applyAction(s2, q0.id, { type: 'reserve', from: 'table', level: 1, slot: 0 });
  applyAction(s2, s2.players[1].id, { type: 'take3', colors: ['W', 'B', 'G'] });
  applyAction(s2, q0.id, { type: 'reserve', from: 'table', level: 2, slot: 0 });
  applyAction(s2, s2.players[1].id, { type: 'take3', colors: ['W', 'B', 'G'] });
  applyAction(s2, q0.id, { type: 'reserve', from: 'table', level: 3, slot: 0 });
  check('§4 reserve: giữ được 3 thẻ', q0.reserved.length === 3, `n=${q0.reserved.length}`);
  applyAction(s2, s2.players[1].id, { type: 'take3', colors: ['W', 'B', 'G'] });
  const r4 = applyAction(s2, q0.id, { type: 'reserve', from: 'table', level: 1, slot: 1 });
  check('§4 reserve: thẻ thứ 4 bị từ chối (tối đa 3)', !r4.ok && r4.reason === 'reserve-full');
  /* hết vàng thì vẫn giữ được, chỉ không có vàng */
  const s3 = mk(['An', 'Bình'], 43);
  s3.tokens.gold = 0;
  const r5 = applyAction(s3, s3.players[0].id, { type: 'reserve', from: 'table', level: 1, slot: 0 });
  check('§4 reserve: hết vàng vẫn giữ được, không có vàng', r5.ok && s3.players[0].tokens.gold === 0 && s3.players[0].reserved.length === 1);
  /* giữ úp khi chồng hết */
  const s4 = mk(['An', 'Bình'], 44);
  s4.decks[3] = [];
  check('§4 reserve: giữ úp ở chồng hết bị từ chối', !applyAction(s4, s4.players[0].id, { type: 'reserve', from: 'deck', level: 3 }).ok);
  check('§4 reserve: giữ ô trống bị từ chối', (() => { const s5 = mk(['An', 'Bình'], 45); s5.table[1][2] = null; return !applyAction(s5, s5.players[0].id, { type: 'reserve', from: 'table', level: 1, slot: 2 }).ok; })());
}

/* ---------- §5. Mua thẻ: giảm giá + vàng hoang dã ---------- */
{
  /* paymentFor: giảm giá theo màu thẻ đã mua */
  const s = mk(['An', 'Bình'], 51);
  const p0 = s.players[0];
  p0.cards = ['1W0', '1W1']; /* 2 thẻ trắng -> giảm 2 đá trắng */
  p0.tokens = { W: 0, B: 0, G: 0, R: 0, K: 2, gold: 0 };
  check('§5 buy: paymentFor trừ giảm giá (1W3 giá K2+W2 -> chỉ trả K2)', eq(paymentFor(p0, cardById('1W3')), { K: 2 }), JSON.stringify(paymentFor(p0, cardById('1W3'))));
  p0.tokens = { W: 0, B: 0, G: 0, R: 0, K: 1, gold: 1 };
  check('§5 buy: vàng bù phần thiếu (K1 + vàng 1)', eq(paymentFor(p0, cardById('1W3')), { K: 1, gold: 1 }), JSON.stringify(paymentFor(p0, cardById('1W3'))));
  p0.tokens = { W: 0, B: 0, G: 0, R: 0, K: 1, gold: 0 };
  check('§5 buy: không đủ (kể cả vàng) thì không mua được', paymentFor(p0, cardById('1W3')) === null && !canAfford(p0, cardById('1W3')));
  /* mua thật từ bàn */
  const s2 = mk(['An', 'Bình'], 52);
  const q0 = s2.players[0];
  q0.cards = ['1W0', '1W1'];
  q0.tokens = { W: 0, B: 0, G: 0, R: 0, K: 2, gold: 0 };
  s2.table[1][0] = '1W3';
  const r = applyAction(s2, q0.id, { type: 'buy', from: 'table', level: 1, slot: 0, cardId: '1W3' });
  check('§5 buy: mua từ bàn ok, chỉ trả 2K (đã giảm giá trắng)', r.ok && q0.tokens.K === 0 && q0.cards.includes('1W3'));
  check('§5 buy: ô bàn được lấp lại, chồng trừ 1', s2.table[1][0] !== '1W3' && s2.table[1][0] !== null && s2.decks[1].length === 35);
  check('§5 buy: điểm cập nhật (1W3 = 0đ)', q0.score === 0);
  /* mua bằng vàng */
  const s3 = mk(['An', 'Bình'], 53);
  const w0 = s3.players[0];
  w0.cards = ['1W0', '1W1'];
  w0.tokens = { W: 0, B: 0, G: 0, R: 0, K: 1, gold: 1 };
  s3.table[1][0] = '1W3';
  const r3 = applyAction(s3, w0.id, { type: 'buy', from: 'table', level: 1, slot: 0, cardId: '1W3' });
  check('§5 buy: mua bằng 1K + 1 vàng ok', r3.ok && w0.tokens.K === 0 && w0.tokens.gold === 0);
  /* không đủ tiền thì bị từ chối */
  const s4 = mk(['An', 'Bình'], 54);
  const z0 = s4.players[0];
  z0.tokens = { W: 0, B: 0, G: 0, R: 0, K: 1, gold: 0 };
  s4.table[1][0] = '1W3';
  check('§5 buy: không đủ tiền bị từ chối', !applyAction(s4, z0.id, { type: 'buy', from: 'table', level: 1, slot: 0, cardId: '1W3' }).ok);
  /* mua thẻ đã giữ */
  const s5 = mk(['An', 'Bình'], 55);
  const y0 = s5.players[0];
  y0.cards = ['1W0', '1W1']; /* giảm 2 đá trắng -> 1W3 (K2+W2) chỉ còn trả K2 */
  y0.reserved = ['1W3'];
  y0.tokens = { W: 0, B: 0, G: 0, R: 0, K: 2, gold: 0 };
  const r5 = applyAction(s5, y0.id, { type: 'buy', from: 'reserved', cardId: '1W3' });
  check('§5 buy: mua thẻ đã giữ ok, thẻ rời tay giữ', r5.ok && y0.reserved.length === 0 && y0.cards.includes('1W3'));
  check('§5 buy: mua thẻ không có trong tay giữ bị từ chối', (() => { const s6 = mk(['An', 'Bình'], 56); return !applyAction(s6, s6.players[0].id, { type: 'buy', from: 'reserved', cardId: '1W3' }).ok; })());
  /* hết chồng thì ô trống luôn */
  const s7 = mk(['An', 'Bình'], 57);
  const t0 = s7.players[0];
  s7.decks[1] = [];
  s7.table[1][0] = '1W3';
  giveExactCost(s7, t0.id, cardById('1W3'));
  const r7 = applyAction(s7, t0.id, { type: 'buy', from: 'table', level: 1, slot: 0, cardId: '1W3' });
  check('§5 buy: hết chồng thì ô bàn trống luôn (null)', r7.ok && s7.table[1][0] === null);
  /* điểm thẻ cộng đúng */
  const s8 = mk(['An', 'Bình'], 58);
  const u0 = s8.players[0];
  s8.table[3][0] = '3W0';
  giveExactCost(s8, u0.id, cardById('3W0'));
  const r8 = applyAction(s8, u0.id, { type: 'buy', from: 'table', level: 3, slot: 0, cardId: '3W0' });
  check('§5 buy: mua thẻ 5 điểm thì score = 5', r8.ok && u0.score === 5, `score=${u0.score}`);
}

/* ---------- §6. Giới hạn 10 đá ---------- */
{
  const s = mk(['An', 'Bình'], 61);
  const p0 = s.players[0];
  p0.tokens = { W: 5, B: 5, G: 0, R: 0, K: 0, gold: 0 };
  const r = applyAction(s, p0.id, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§6 limit: cầm 13 đá thì vào bước discard', r.ok && s.step === 'discard' && tokenCount(p0) === 13, `step=${s.step} tokens=${tokenCount(p0)}`);
  check('§6 limit: bước discard thì actor vẫn là mình', actors(s)[0] === p0.id);
  check('§6 limit: trả sai số lượng bị từ chối', !applyAction(s, p0.id, { type: 'discard', colors: ['W', 'B'] }).ok);
  check('§6 limit: trả màu không có bị từ chối', !applyAction(s, p0.id, { type: 'discard', colors: ['R', 'R', 'R'] }).ok);
  check('§6 limit: hành động khác ở bước discard bị từ chối', !applyAction(s, p0.id, { type: 'take3', colors: ['W', 'B', 'G'] }).ok);
  const goldBefore = s.tokens.gold;
  const r2 = applyAction(s, p0.id, { type: 'discard', colors: ['W', 'B', 'G'] });
  check('§6 limit: trả đúng 3 đá thì hết lượt', r2.ok && tokenCount(p0) === 10 && s.step === 'act' && s.turn === s.players[1].id);
  check('§6 limit: đá trả về ngân hàng', s.tokens.W === 4 && s.tokens.B === 4 && s.tokens.G === 4 && s.tokens.gold === goldBefore);
  /* cầm 8 đá rồi lấy 2 -> đúng 10 đá thì không phải trả */
  const s2 = mk(['An', 'Bình'], 62);
  const q0 = s2.players[0];
  q0.tokens = { W: 4, B: 4, G: 0, R: 0, K: 0, gold: 0 };
  const r3 = applyAction(s2, q0.id, { type: 'take2', color: 'R' });
  check('§6 limit: cầm đúng 10 đá sau lượt thì không vào discard', r3.ok && s2.step === 'act', `step=${s2.step}`);
}

/* ---------- §7. Quý tộc ---------- */
{
  /* đủ điều kiện đúng 1 quý tộc -> tự đến */
  const s = mk(['An', 'Bình'], 71);
  s.nobles = ['n0', 'n1', 'n3'];
  const p0 = s.players[0];
  p0.cards = ['1G0', '1G1', '1G2', '1G3', '1B0', '1B1', '1B2', '1B3'];
  const r = applyAction(s, p0.id, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§7 noble: đủ điều kiện 1 quý tộc thì tự đến', r.ok && p0.nobles.includes('n0') && !s.nobles.includes('n0'));
  check('§7 noble: quý tộc +3 điểm', p0.score === 3, `score=${p0.score}`);
  check('§7 noble: quý tộc khác vẫn ở trên bàn', s.nobles.length === 2 && s.nobles.includes('n1'));
  /* đủ điều kiện nhiều quý tộc -> được chọn */
  const s2 = mk(['An', 'Bình'], 72);
  s2.nobles = ['n0', 'n2', 'n5'];
  const q0 = s2.players[0];
  q0.cards = ['1G0', '1G1', '1G2', '1G3', '1B0', '1B1', '1B2', '1B3', '1W0', '1W1', '1W2', '1W3'];
  const r2 = applyAction(s2, q0.id, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§7 noble: đủ điều kiện nhiều quý tộc thì vào bước chọn', r2.ok && s2.step === 'noble' && s2.nobleChoices.length === 3, `step=${s2.step} choices=${s2.nobleChoices}`);
  check('§7 noble: chọn quý tộc không đủ điều kiện bị từ chối', !applyAction(s2, q0.id, { type: 'noble', noble: 'n1' }).ok);
  const r3 = applyAction(s2, q0.id, { type: 'noble', noble: 'n2' });
  check('§7 noble: chọn 1 quý tộc thì quý tộc đó đến, còn lại ở bàn', r3.ok && q0.nobles.includes('n2') && s2.nobles.includes('n0') && s2.nobles.includes('n5') && !s2.nobles.includes('n2'));
  check('§7 noble: tối đa 1 quý tộc/lượt (điểm chỉ +3)', q0.score === 3 && q0.nobles.length === 1, `score=${q0.score} nobles=${q0.nobles.length}`);
  /* chỉ tính MÀU THẺ đã mua, không tính đá đang cầm */
  const s3 = mk(['An', 'Bình'], 73);
  s3.nobles = ['n0', 'n1', 'n3'];
  const w0 = s3.players[0];
  w0.tokens = { W: 0, B: 4, G: 4, R: 0, K: 0, gold: 0 };
  const r4 = applyAction(s3, w0.id, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§7 noble: cầm nhiều đá nhưng không có thẻ thì không đón quý tộc', r4.ok && w0.nobles.length === 0 && s3.nobles.length === 3);
  /* quý tộc đến sau khi MUA thẻ (không chỉ sau khi lấy đá) */
  const s4 = mk(['An', 'Bình'], 74);
  s4.nobles = ['n5', 'n1', 'n3'];
  const z0 = s4.players[0];
  z0.cards = ['1G0', '1G1', '1G2', '1B0', '1B1', '1B2', '1W0', '1W1'];
  s4.table[1][0] = '1W2';
  giveExactCost(s4, z0.id, cardById('1W2'));
  const r5 = applyAction(s4, z0.id, { type: 'buy', from: 'table', level: 1, slot: 0, cardId: '1W2' });
  check('§7 noble: mua thẻ mà đủ điều kiện quý tộc thì quý tộc đến ngay', r5.ok && z0.nobles.includes('n5'), `nobles=${z0.nobles}`);
}

/* ---------- §8. Kết thúc ván: 15 điểm + vòng cuối + tie-break ---------- */
{
  /* đạt 15 thì hết vòng rồi mới kết thúc */
  const s = mk(['An', 'Bình'], 81);
  const p0 = s.players[0];
  p0.cards = ['3W0', '3B0', '2W5', '1B6']; /* 5+5+3+1 = 14 điểm, 4 thẻ */
  p0.score = prestige(p0);
  s.table[1][0] = '1W6'; /* 1 điểm, giá G2+R2 */
  giveExactCost(s, p0.id, cardById('1W6'));
  const r = applyAction(s, p0.id, { type: 'buy', from: 'table', level: 1, slot: 0, cardId: '1W6' });
  check('§8 end: mua lên 15 điểm thì bật cờ vòng cuối nhưng ván chưa hết', r.ok && p0.score === 15 && s.endTriggered && s.phase === 'playing' && s.turn === s.players[1].id, `score=${p0.score} endTriggered=${s.endTriggered} phase=${s.phase}`);
  const r2 = applyAction(s, s.players[1].id, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§8 end: hết vòng thì ván kết thúc, người 15 điểm thắng', r2.ok && s.phase === 'ended' && s.winner === p0.id, `phase=${s.phase} winner=${s.winner}`);
  check('§8 end: endReason = match', s.endReason === 'match' && s.endCause === 'match');
  check('§8 end: final.summary có đủ dữ liệu achievement', !!s.final && !!s.final.summary[p0.id]
    && s.final.summary[p0.id].score === 15 && s.final.summary[p0.id].cards === 5
    && s.final.summary[p0.id].nobles === 0 && s.final.summary[p0.id].gold === 0);
  /* hòa điểm thì ít thẻ hơn thắng */
  const s2 = mk(['An', 'Bình'], 82);
  const a0 = s2.players[0];
  a0.cards = ['3W0', '3B0', '3G1']; /* 5+5+4 = 14 điểm, 3 thẻ */
  a0.score = prestige(a0);
  const a1 = s2.players[1];
  a1.cards = ['2W4', '2B4', '2G4', '2R4', '2K4']; /* 5×3 = 15 điểm, 5 thẻ */
  a1.score = prestige(a1);
  s2.table[1][0] = '1W6';
  giveExactCost(s2, a0.id, cardById('1W6'));
  applyAction(s2, a0.id, { type: 'buy', from: 'table', level: 1, slot: 0, cardId: '1W6' });
  applyAction(s2, a1.id, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§8 end: hòa 15-15 thì người ít thẻ hơn (4 < 5) thắng', s2.phase === 'ended' && s2.winner === a0.id && s2.winners.length === 1, `winner=${s2.winner} winners=${s2.winners}`);
  /* vẫn hòa (điểm + số thẻ) thì cùng thắng */
  const s3 = mk(['An', 'Bình'], 83);
  const b0 = s3.players[0];
  b0.cards = ['3W0', '3B0', '2W5', '1B6']; /* 14 điểm, 4 thẻ */
  b0.score = prestige(b0);
  const b1 = s3.players[1];
  b1.cards = ['2W4', '2B4', '2G4', '2R4', '2K4']; /* 15 điểm, 5 thẻ */
  b1.score = prestige(b1);
  s3.table[1][0] = '1W6';
  giveExactCost(s3, b0.id, cardById('1W6'));
  applyAction(s3, b0.id, { type: 'buy', from: 'table', level: 1, slot: 0, cardId: '1W6' });
  applyAction(s3, b1.id, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§8 end: hòa cả điểm lẫn số thẻ thì cùng thắng', s3.phase === 'ended' && s3.winners.length === 2 && s3.winners.includes(b0.id) && s3.winners.includes(b1.id), `winners=${s3.winners}`);
  check('§8 end: losers trống khi cùng thắng', s3.losers.length === 0);
}

/* ---------- §9. Xin thua ---------- */
{
  const s = mk(['An', 'Bình'], 91);
  const r = applyAction(s, s.players[0].id, { type: 'resign' });
  check('§9 resign: xin thua thì trận hết ngay', r.ok && s.phase === 'ended' && s.endReason === 'resign');
  check('§9 resign: người còn lại thắng', s.winner === s.players[1].id && s.losers.includes(s.players[0].id));
  /* 3 người: người xin thua thua, người cao điểm nhất trong số còn lại thắng */
  const s2 = mk(['An', 'Bình', 'Cúc'], 92);
  const p1 = s2.players[1];
  const p2 = s2.players[2];
  p1.cards = ['3W0']; /* 5 điểm */
  p2.cards = ['3B0', '3G0']; /* 5 + 5 = 10 điểm */
  p1.score = prestige(p1);
  p2.score = prestige(p2);
  applyAction(s2, s2.players[0].id, { type: 'resign' });
  check('§9 resign: 3 người, người cao điểm nhất còn lại thắng', s2.winner === p2.id, `winner=${s2.winner}`);
  /* xin thua ở bước discard cũng được */
  const s3 = mk(['An', 'Bình'], 93);
  const q0 = s3.players[0];
  q0.tokens = { W: 5, B: 5, G: 0, R: 0, K: 0, gold: 0 };
  applyAction(s3, q0.id, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§9 resign: đang ở bước discard vẫn xin thua được', s3.step === 'discard' && applyAction(s3, q0.id, { type: 'resign' }).ok && s3.phase === 'ended');
}

/* ---------- §10. Nước sai + van an toàn pass ---------- */
{
  const s = mk(['An', 'Bình'], 101);
  check('§10 illegal: action không có type bị từ chối', !applyAction(s, s.players[0].id, {}).ok);
  check('§10 illegal: action lạ bị từ chối', !applyAction(s, s.players[0].id, { type: 'fly' }).ok);
  check('§10 illegal: người chơi không tồn tại bị từ chối', !applyAction(s, 'nobody', { type: 'take3', colors: ['W', 'B', 'G'] }).ok);
  check('§10 illegal: pass khi còn nước khác bị từ chối', !applyAction(s, s.players[0].id, { type: 'pass' }).ok);
  check('§10 illegal: ván đã hết thì không đi được nữa', (() => { const s2 = mk(['An', 'Bình'], 102); applyAction(s2, s2.players[0].id, { type: 'resign' }); return !applyAction(s2, s2.players[1].id, { type: 'take3', colors: ['W', 'B', 'G'] }).ok; })());
  /* van an toàn: không còn nước nào thì pass được */
  const s3 = mk(['An', 'Bình'], 103);
  s3.tokens = { W: 0, B: 0, G: 0, R: 0, K: 0, gold: 5 }; /* hết đá màu */
  const p0 = s3.players[0];
  p0.tokens = { W: 0, B: 0, G: 0, R: 0, K: 0, gold: 0 };
  p0.reserved = ['3W3', '3B3', '3G3']; /* giữ đủ 3, không mua nổi */
  s3.table = { 1: ['3W2', '3B2', '3G2', '3R2'], 2: ['3W1', '3B1', '3G1', '3R1'], 3: ['3W0', '3B0', '3G0', '3R0'] };
  const moves = legalMoves(s3, p0.id);
  check('§10 pass: không còn nước nào thì legalMoves chỉ còn pass', moves.length === 1 && moves[0].type === 'pass', JSON.stringify(moves));
  const r = applyAction(s3, p0.id, { type: 'pass' });
  check('§10 pass: pass được chấp nhận, lượt chuyển sang người sau', r.ok && s3.turn === s3.players[1].id);
  /* bế tắc (luật nhà): cả 2 người liên tiếp chỉ bỏ lượt thì ván hết */
  const s4 = mk(['An', 'Bình'], 104);
  s4.tokens = { W: 0, B: 0, G: 0, R: 0, K: 0, gold: 5 }; /* hết đá màu */
  const d0 = s4.players[0];
  const d1 = s4.players[1];
  d0.tokens = { W: 0, B: 0, G: 0, R: 0, K: 0, gold: 0 };
  d0.reserved = ['3W3', '3B3', '3G3']; /* giữ đủ 3, không mua nổi */
  d0.cards = ['3W0']; /* 5 điểm */
  d0.score = 5;
  d1.tokens = { W: 0, B: 0, G: 0, R: 0, K: 0, gold: 0 };
  d1.reserved = ['3W2', '3B2', '3G2'];
  d1.cards = ['3B0', '3G0']; /* 10 điểm */
  d1.score = 10;
  s4.table = { 1: ['3W2', '3B2', '3G2', '3R2'], 2: ['3W1', '3B1', '3G1', '3R1'], 3: ['3W0', '3B0', '3G0', '3R0'] };
  const r4a = applyAction(s4, d0.id, { type: 'pass' });
  check('§10 stalemate: 1 người bỏ lượt thì ván chưa hết', r4a.ok && s4.phase === 'playing' && s4.passStreak === 1, `phase=${s4.phase} streak=${s4.passStreak}`);
  const r4b = applyAction(s4, d1.id, { type: 'pass' });
  check('§10 stalemate: cả 2 bỏ lượt liên tiếp thì ván hết', r4b.ok && s4.phase === 'ended' && s4.endCause === 'stalemate' && s4.endReason === 'match', `phase=${s4.phase} cause=${s4.endCause}`);
  check('§10 stalemate: người nhiều điểm hơn thắng', s4.winner === d1.id, `winner=${s4.winner}`);
  /* hành động thật thì reset chuỗi bỏ lượt */
  const s5 = mk(['An', 'Bình'], 105);
  s5.passStreak = 1;
  const r5 = applyAction(s5, s5.players[0].id, { type: 'take3', colors: ['W', 'B', 'G'] });
  check('§10 stalemate: hành động thật reset chuỗi bỏ lượt', r5.ok && s5.passStreak === 0);
}

/* ---------- §11. Hàm phụ ---------- */
{
  const s = mk(['An', 'Bình'], 111);
  const p0 = s.players[0];
  p0.cards = ['1W0', '1W1', '2B4', '3G1'];
  check('§11 helpers: bonusCounts đếm đúng', eq(bonusCounts(p0), { W: 2, B: 1, G: 1, R: 0, K: 0 }), JSON.stringify(bonusCounts(p0)));
  check('§11 helpers: prestige = điểm thẻ + 3×quý tộc', prestige(p0) === 0 + 0 + 3 + 4, `prestige=${prestige(p0)}`);
  p0.nobles = ['n0'];
  check('§11 helpers: prestige cộng 3 điểm mỗi quý tộc', prestige(p0) === 10, `prestige=${prestige(p0)}`);
  p0.tokens = { W: 2, B: 1, G: 0, R: 3, K: 0, gold: 2 };
  check('§11 helpers: tokenCount đếm cả vàng', tokenCount(p0) === 8, `n=${tokenCount(p0)}`);
  check('§11 helpers: viewFor có me, không có you', (() => { const v = viewFor(s, p0.id); return v.me === p0.id && !('you' in v); })());
  check('§11 helpers: WIN_SCORE = 15, MAX_TOKENS = 10, MAX_RESERVED = 3', WIN_SCORE === 15 && MAX_TOKENS === 10 && MAX_RESERVED === 3);
}

console.log(`\nLuật Splendor: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
