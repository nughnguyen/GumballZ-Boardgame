// Luật Saboteur: bảng vai trò, bộ bài, đặt lá, đích, lá hành động,
// chia vàng, 3 vòng, xin thua, che thông tin, serialize.
import {
  createGame, applyAction, viewFor, actors, legalMoves, canPlace,
  reachableGoals, frontierDist, saboteurCount, handSize,
  buildDeck, buildGoldDeck, cardKind, isDeadEnd, serialize, deserialize,
  mulberry32,
} from '../js/engine.js';

/* gieo hạt cho Math.random để kết quả ổn định — seed: 20261119 */
const _rng = mulberry32(20261119);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));

/* đặt lượt cho pid rồi đưa lá vào tay và đánh (dùng cho test đặt đường) */
function setTurn(s, pid) { s.turnIdx = s.players.findIndex(p => p.id === pid); }
function giveCard(s, pid, card) {
  const p = s.players.find(x => x.id === pid);
  if (!p.hand.includes(card)) p.hand.push(card);
  return p;
}
function placePath(s, pid, card, x, y, rotated = false) {
  setTurn(s, pid);
  giveCard(s, pid, card);
  return applyAction(s, pid, { type: 'play-path', card, x, y, rotated });
}
/* xây đường thẳng từ Bắt đầu tới đích giữa (-7,0): 6 lá EW/EWS/NEW */
function buildToMiddleGoal(s, pid) {
  const chain = [
    ['p-EW-0', -1, 0], ['p-EW-1', -2, 0], ['p-EW-2', -3, 0],
    ['p-EW-3', -4, 0], ['p-EWS-0', -5, 0], ['p-NEW-0', -6, 0],
  ];
  let ok = true;
  for (const [card, x, y] of chain) {
    const r = placePath(s, pid, card, x, y);
    if (!r.ok) { ok = false; console.log('    đặt lỗi', card, x, y, r.reason); }
  }
  return ok;
}

/* ---------- 1. bảng vai trò ---------- */
{
  const counts = {};
  for (const n of [3, 4, 5, 6, 7, 8, 9, 10]) counts[n] = saboteurCount(n);
  t('3–4 người: 1 kẻ phá hoại', counts[3] === 1 && counts[4] === 1);
  t('5–9 người: 2 kẻ phá hoại', counts[5] === 2 && counts[6] === 2 && counts[9] === 2);
  t('10 người: 3 kẻ phá hoại', counts[10] === 3);
  const s3 = createGame(P(['A', 'B', 'C']), { seed: 1 });
  const s10 = createGame(P(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']), { seed: 1 });
  t('ván 3 người chia đúng 1 kẻ phá hoại', s3.players.filter(p => p.role === 'saboteur').length === 1);
  t('ván 10 người chia đúng 3 kẻ phá hoại', s10.players.filter(p => p.role === 'saboteur').length === 3);
  t('mọi người đều có vai (thợ đào hoặc phá hoại)', s10.players.every(p => p.role === 'digger' || p.role === 'saboteur'));
}

/* ---------- 2. bộ bài ---------- */
{
  const d = buildDeck();
  const path = d.filter(c => c[0] === 'p');
  const act = d.filter(c => c[0] === 'a');
  t('bộ bài 71 lá (44 đường + 27 hành động)', d.length === 71 && path.length === 44 && act.length === 27);
  const kinds = {};
  for (const c of path) kinds[cardKind(c)] = (kinds[cardKind(c)] || 0) + 1;
  t('có đủ loại lá đường (thẳng, cong, ngã ba, ngã tư, cụt)',
    kinds.NS === 5 && kinds.EW === 4 && kinds.NE === 4 && kinds.NESW === 1 && kinds.N === 2);
  t('có 6 lá cụt (1 cửa ra)', path.filter(isDeadEnd).length === 6);
  const ak = {};
  for (const c of act) ak[cardKind(c)] = (ak[cardKind(c)] || 0) + 1;
  t('lá hành động đủ loại (bản đồ 3, đá rơi 3, phá 9, sửa 12)',
    ak.map === 3 && ak.rockfall === 3 && ak['break-pickaxe'] === 3 && ak['repair-pickaxe'] === 2 && ak['repair-pickaxe-lamp'] === 2);
  const g = buildGoldDeck();
  t('bộ vàng 28 lá (16×1, 8×2, 4×3)', g.length === 28
    && g.filter(c => cardKind(c) === '1').length === 16
    && g.filter(c => cardKind(c) === '2').length === 8
    && g.filter(c => cardKind(c) === '3').length === 4);
  t('tổng vàng trong bộ là 44 cốm', g.reduce((t, c) => t + (+cardKind(c)), 0) === 44);
}

/* ---------- 3. số lá trên tay ---------- */
{
  t('3–5 người: 6 lá', handSize(3) === 6 && handSize(5) === 6);
  t('6–7 người: 5 lá', handSize(6) === 5 && handSize(7) === 5);
  t('8–10 người: 4 lá', handSize(8) === 4 && handSize(10) === 4);
  const s5 = createGame(P(['A', 'B', 'C', 'D', 'E']), { seed: 2 });
  const s8 = createGame(P(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']), { seed: 2 });
  t('ván 5 người chia 6 lá mỗi người', s5.players.every(p => p.hand.length === 6));
  t('ván 8 người chia 4 lá mỗi người', s8.players.every(p => p.hand.length === 4));
  t('ván mới có 3 lá đích (1 vàng, 2 than)', s5.goals.length === 3
    && s5.goals.filter(g => g.kind === 'gold').length === 1
    && s5.goals.filter(g => g.kind === 'coal').length === 2);
}

/* ---------- 4. đặt lá đường ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 3 });
  t('lá EW đặt được ngay kề Bắt đầu (hướng Đông)', canPlace(s, 'p-EW-0', 1, 0, false));
  t('lá NS không đặt được kề Bắt đầu hướng Đông (thiếu cửa Tây)', !canPlace(s, 'p-NS-0', 1, 0, false));
  t('lá NE xoay 180° thành SW thì đặt được kề Bắt đầu', canPlace(s, 'p-NE-0', 1, 0, true));
  t('lá NE không xoay thì không đặt được kề Bắt đầu', !canPlace(s, 'p-NE-0', 1, 0, false));
  t('không đặt được xa mạng đường (ô 2,0 khi chưa có lá nào)', !canPlace(s, 'p-EW-0', 2, 0, false));
  t('không đặt được lên lá Bắt đầu', !canPlace(s, 'p-EW-0', 0, 0, false));
  t('không đặt được lên lá đích', !canPlace(s, 'p-EW-0', -7, 0, false));
  /* đích chỉ là điểm đến, không phải mạng đường: lá chỉ kề đích mà không
     kề mạng (ô -6,0 khi đường mới ở Bắt đầu) thì không đặt được */
  t('không đặt được lá chỉ kề đích vàng (mảnh rời, không kề mạng)', !canPlace(s, 'p-EW-0', -6, 0, false));
  /* xây đường tới (-5,0) rồi thì ô (-6,0) kề cả mạng lẫn đích: đặt được */
  for (const [card, x, y] of [['p-EW-2', -1, 0], ['p-EW-3', -2, 0], ['p-EWS-0', -3, 0], ['p-NEW-0', -4, 0], ['p-EWS-1', -5, 0]]) placePath(s, 'p1', card, x, y);
  t('ô kề đích đặt được khi đã kề mạng đường', canPlace(s, 'p-NEW-1', -6, 0, false));
  /* đặt 1 lá rồi kiểm tra mâu thuẫn */
  const r1 = placePath(s, 'p1', 'p-EW-0', 1, 0);
  t('đặt lá EW ở (1,0) thành công', r1.ok);
  t('lá NS không nối được sau lá EW (thiếu cửa Tây)', !canPlace(s, 'p-NS-0', 2, 0, false));
  t('lá EW nối tiếp được sau lá EW', canPlace(s, 'p-EW-1', 2, 0, false));
  /* lá cụt: đặt được ở cuối đường, không nối tiếp được nữa */
  const r2 = placePath(s, 'p1', 'p-NES-0', 0, 1);
  t('đặt lá NES ở (0,1) phía Nam Bắt đầu', r2.ok);
  t('lá cụt N đặt được ở (0,2) cuối đường Nam', canPlace(s, 'p-N-0', 0, 2, false));
  t('lá cụt N không đặt được kề Bắt đầu hướng Đông (thiếu cửa Tây)', !canPlace(s, 'p-N-0', 1, 0, false));
  /* đặt lá vào ô đã có lá thì không được */
  t('không đặt chồng lên lá đã có', !canPlace(s, 'p-EW-1', 1, 0, false));
}

/* ---------- 5. đích vàng / đích than ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 4 });
  s.goals[1].kind = 'gold'; s.goals[0].kind = 'coal'; s.goals[2].kind = 'coal';
  /* ghi lại vai trò vòng 1 trước khi thắng vòng (vòng 2 chia lại vai) */
  const diggers1 = s.players.filter(p => p.role === 'digger').map(p => p.id);
  const sabs1 = s.players.filter(p => p.role === 'saboteur').map(p => p.id);
  t('chưa đặt lá nào thì chưa tới đích nào', reachableGoals(s).length === 0);
  t('khoảng cách biên đường tới đích là 7', frontierDist(s) === 7);
  const ok = buildToMiddleGoal(s, 'p1');
  t('xây được đường thẳng tới đích giữa', ok);
  t('đào tới đích vàng thì thợ đào thắng vòng', s.roundWinners && s.roundWinners.side === 'diggers');
  t('thắng vòng thì sang vòng 2', s.round === 2 && s.phase === 'playing');
  t('thợ đào được chia vàng (tổng > 0)', diggers1.reduce((t, id) => t + s.players.find(p => p.id === id).gold, 0) > 0);
  t('kẻ phá hoại không được vàng vòng này', sabs1.every(id => s.players.find(p => p.id === id).gold === 0));
  t('vòng mới đặt lại bàn trống', Object.keys(s.board).length === 0);
}
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 5 });
  s.goals[1].kind = 'coal'; s.goals[0].kind = 'gold'; s.goals[2].kind = 'coal';
  buildToMiddleGoal(s, 'p1');
  t('đào tới đích than thì lá đích lộ ra', s.goals[1].revealed === true);
  t('đào tới than thì vòng vẫn tiếp tục', s.round === 1 && s.phase === 'playing');
  t('đào tới than thì chưa ai được vàng', s.players.every(p => p.gold === 0));
}

/* ---------- 6. lá hành động ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 6 });
  /* phá Cuốc của p2 */
  setTurn(s, 'p1'); giveCard(s, 'p1', 'a-break-pickaxe-0');
  const rb = applyAction(s, 'p1', { type: 'play-action', card: 'a-break-pickaxe-0', target: 'p2' });
  t('phá Cuốc thành công', rb.ok && s.players[1].tools.pickaxe === true);
  /* p2 không đặt được lá đường khi hỏng Cuốc */
  setTurn(s, 'p2'); giveCard(s, 'p2', 'p-EW-0');
  const rp = applyAction(s, 'p2', { type: 'play-path', card: 'p-EW-0', x: 1, y: 0, rotated: false });
  t('hỏng Cuốc thì không đặt được lá đường', !rp.ok);
  /* phá tiếp 1 dụng cụ đã hỏng thì bị từ chối */
  setTurn(s, 'p1'); giveCard(s, 'p1', 'a-break-pickaxe-1');
  const rb2 = applyAction(s, 'p1', { type: 'play-action', card: 'a-break-pickaxe-1', target: 'p2' });
  t('không phá được dụng cụ đã hỏng rồi', !rb2.ok);
  /* sửa Cuốc cho p2 */
  setTurn(s, 'p1'); giveCard(s, 'p1', 'a-repair-pickaxe-0');
  const rr = applyAction(s, 'p1', { type: 'play-action', card: 'a-repair-pickaxe-0', target: 'p2' });
  t('sửa Cuốc thành công', rr.ok && s.players[1].tools.pickaxe === false);
  /* sửa khi không hỏng gì thì bị từ chối */
  setTurn(s, 'p1'); giveCard(s, 'p1', 'a-repair-lamp-0');
  const rr2 = applyAction(s, 'p1', { type: 'play-action', card: 'a-repair-lamp-0', target: 'p2' });
  t('không sửa được khi không hỏng gì', !rr2.ok);
  /* sửa 2 dụng cụ cùng lúc */
  setTurn(s, 'p1'); giveCard(s, 'p1', 'a-break-lamp-0');
  applyAction(s, 'p1', { type: 'play-action', card: 'a-break-lamp-0', target: 'p2' });
  setTurn(s, 'p1'); giveCard(s, 'p1', 'a-break-cart-0');
  applyAction(s, 'p1', { type: 'play-action', card: 'a-break-cart-0', target: 'p2' });
  setTurn(s, 'p1'); giveCard(s, 'p1', 'a-repair-lamp-cart-0');
  const rr3 = applyAction(s, 'p1', { type: 'play-action', card: 'a-repair-lamp-cart-0', target: 'p2' });
  t('lá sửa đôi sửa cả Đèn lẫn Xe đẩy', rr3.ok && !s.players[1].tools.lamp && !s.players[1].tools.cart);
}
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 7 });
  /* Bản đồ: p1 xem đích 0 */
  setTurn(s, 'p1'); giveCard(s, 'p1', 'a-map-0');
  const rm = applyAction(s, 'p1', { type: 'play-action', card: 'a-map-0', goal: 0 });
  t('dùng Bản đồ thành công', rm.ok && s.players[0].peeked.includes(0));
  const v1 = viewFor(s, 'p1'), v2 = viewFor(s, 'p2');
  t('người xem Bản đồ biết thân phận đích đó', v1.goals[0].kind !== '?');
  t('người khác vẫn không biết thân phận đích đó', v2.goals[0].kind === '?');
  t('xem đích đã lộ thì bị từ chối', (() => {
    s.goals[1].revealed = true;
    setTurn(s, 'p1'); giveCard(s, 'p1', 'a-map-1');
    return !applyAction(s, 'p1', { type: 'play-action', card: 'a-map-1', goal: 1 }).ok;
  })());
}
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 8 });
  placePath(s, 'p1', 'p-EW-0', 1, 0);
  t('đã có 1 lá đường trên bàn', Object.keys(s.board).length === 1);
  setTurn(s, 'p2'); giveCard(s, 'p2', 'a-rockfall-0');
  const rf = applyAction(s, 'p2', { type: 'play-action', card: 'a-rockfall-0', x: 1, y: 0 });
  t('Đá rơi phá được lá đường trên bàn', rf.ok && Object.keys(s.board).length === 0);
  setTurn(s, 'p2'); giveCard(s, 'p2', 'a-rockfall-1');
  const rf2 = applyAction(s, 'p2', { type: 'play-action', card: 'a-rockfall-1', x: 1, y: 0 });
  t('Đá rơi vào ô trống thì bị từ chối', !rf2.ok);
  setTurn(s, 'p2'); giveCard(s, 'p2', 'a-rockfall-2');
  const rf3 = applyAction(s, 'p2', { type: 'play-action', card: 'a-rockfall-2', x: 0, y: 0 });
  t('Đá rơi không phá được lá Bắt đầu', !rf3.ok);
}

/* ---------- 7. hết bài thì kẻ phá hoại thắng vòng ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 9 });
  /* ghi lại kẻ phá hoại vòng 1 trước khi hết bài (vòng 2 chia lại vai) */
  const sab1 = s.players.find(p => p.role === 'saboteur').id;
  s.deck = [];
  s.players.forEach(p => { p.hand = []; });
  const cur = s.players[s.turnIdx];
  cur.hand = ['p-EW-0'];
  const r = applyAction(s, cur.id, { type: 'discard', card: 'p-EW-0' });
  t('bỏ lá cuối khi hết bài thì vòng kết thúc', r.ok && s.roundWinners && s.roundWinners.side === 'saboteurs');
  t('kẻ phá hoại được chia vàng vòng này', s.players.find(p => p.id === sab1).gold > 0);
}

/* ---------- 8. 3 vòng rồi kết thúc trận ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 10 });
  s.round = 3;
  s.goals[1].kind = 'gold'; s.goals[0].kind = 'coal'; s.goals[2].kind = 'coal';
  /* cho p2 nhiều vàng nhất từ trước để kiểm tra người thắng trận */
  s.players[1].gold = 9; s.players[1].goldCards = [3, 3, 3];
  s.players[0].gold = 2; s.players[0].goldCards = [2];
  s.players[2].gold = 4; s.players[2].goldCards = [2, 2];
  buildToMiddleGoal(s, 'p1');
  t('hết vòng 3 thì trận kết thúc', s.phase === 'ended' && s.endReason === 'match');
  t('người nhiều vàng nhất thắng trận', s.winner === 'p2');
  t('người thua nằm trong losers', s.losers.includes('p1') && s.losers.includes('p3'));
}

/* ---------- 9. xin thua ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 11 });
  s.players[1].gold = 5; s.players[1].goldCards = [3, 2];
  s.players[2].gold = 2; s.players[2].goldCards = [2];
  const r = applyAction(s, 'p1', { type: 'resign' });
  t('xin thua kết thúc trận ngay', r.ok && s.phase === 'ended' && s.endReason === 'resign');
  t('xin thua thì người còn lại nhiều vàng nhất thắng', s.winner === 'p2');
  t('không thể đi tiếp sau khi trận đã kết thúc', !applyAction(s, 'p2', { type: 'discard', card: 'x' }).ok);
}

/* ---------- 10. actors + legalMoves ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 12 });
  const cur = s.players[s.turnIdx].id;
  t('actors trả về đúng người tới lượt', JSON.stringify(actors(s)) === JSON.stringify([cur]));
  const moves = legalMoves(s, cur);
  t('người tới lượt có nước đi hợp lệ', moves.length > 0);
  t('mọi nước đi đều có thể bỏ lá', moves.some(m => m.type === 'discard'));
  t('người không tới lượt thì không có nước đi', legalMoves(s, s.players[(s.turnIdx + 1) % 3].id).length === 0);
  /* hỏng dụng cụ thì không còn nước đặt đường */
  const me = s.players[s.turnIdx];
  me.tools.pickaxe = true;
  const moves2 = legalMoves(s, cur);
  t('hỏng dụng cụ thì không còn nước đặt đường', !moves2.some(m => m.type === 'play-path'));
  t('hỏng dụng cụ vẫn bỏ được lá', moves2.some(m => m.type === 'discard'));
  me.tools.pickaxe = false;
  /* không tới lượt thì không được đi */
  const other = s.players[(s.turnIdx + 1) % 3];
  const r = applyAction(s, other.id, { type: 'discard', card: other.hand[0] });
  t('không tới lượt thì không được đi', !r.ok);
}

/* ---------- 11. viewFor che thông tin ---------- */
{
  const s = createGame(P(['A', 'B', 'C']), { seed: 13 });
  const v1 = viewFor(s, 'p1');
  t('chỉ mình biết vai trò của mình', v1.players[0].role !== null && v1.players[1].role === null && v1.players[2].role === null);
  t('chỉ mình thấy tay bài của mình', v1.players[0].hand.length === 6 && v1.players[1].hand.length === 0 && v1.players[1].handCount === 6);
  t('lá đích chưa lộ thì hiện dấu ?', v1.goals.every(g => g.kind === '?'));
  t('view không có trường you', !('you' in v1));
  /* hết trận thì lộ hết */
  applyAction(s, 'p1', { type: 'resign' });
  const ve = viewFor(s, 'p2');
  t('hết trận thì lộ vai trò mọi người', ve.players.every(p => p.role !== null));
  t('hết trận thì lộ tay bài mọi người', ve.players.every(p => p.hand.length === p.handCount));
}

/* ---------- 12. serialize roundtrip ---------- */
{
  const s = createGame(P(['A', 'B', 'C', 'D']), { seed: 14 });
  placePath(s, 'p1', 'p-EW-0', 1, 0);
  const back = deserialize(serialize(s));
  t('serialize rồi deserialize giống hệt', JSON.stringify(back) === JSON.stringify(s));
  t('deserialize chuỗi rác thì throw', (() => { try { deserialize('không phải json'); return false; } catch (e) { return true; } })());
  t('deserialize state thiếu goals thì throw', (() => { try { deserialize(JSON.stringify({ players: [], board: {} })); return false; } catch (e) { return true; } })());
}

console.log(`\nLuật Saboteur: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
