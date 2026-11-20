// Test luật Mật Thư. Chạy: node matthu/test/rules.mjs
import assert from 'assert/strict';
import * as E from '../js/engine.js';
import { WORDS, THEMES } from '../js/words.js';
import { pickClue, pickGuess } from '../js/bot.js';

const P = (id, name) => ({ id, name });
const P4 = [P('p1', 'Đỏ1'), P('p2', 'Xanh1'), P('p3', 'Đỏ2'), P('p4', 'Xanh2')];
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('  ✓ ' + name); };
/* ván cố định để test xác định: từ w0..w24, màu sắp sẵn */
function fixedGame(players = P4) {
  const s = E.createGame(players);
  s.words = Array.from({ length: 25 }, (_, i) => 'w' + i);
  s.colors = [
    'R', 'R', 'R', 'R', 'R',
    'R', 'R', 'R', 'R', 'B',
    'B', 'B', 'B', 'B', 'B',
    'B', 'B', 'N', 'N', 'N',
    'N', 'N', 'N', 'N', 'A',
  ];
  return s;
}

test('kho từ: ≥200 từ duy nhất, mọi từ thuộc ≥1 chủ đề, gợi ý đều 1 từ', () => {
  assert.ok(WORDS.length >= 200, `kho có ${WORDS.length} từ`);
  assert.equal(new Set(WORDS).size, WORDS.length);
  for (const t of THEMES) assert.ok(!/\s/.test(t.clue), `gợi ý "${t.clue}" phải 1 từ`);
  const inTheme = new Set(THEMES.flatMap(t => t.words));
  for (const w of WORDS) assert.ok(inTheme.has(w), `từ "${w}" không thuộc chủ đề nào`);
});

test('chia bàn: 25 từ duy nhất, 9 Đỏ / 8 Xanh / 7 dân / 1 sát thủ, Đỏ đi trước', () => {
  const s = E.createGame(P4);
  assert.equal(s.words.length, 25);
  assert.equal(new Set(s.words).size, 25);
  const c = { R: 0, B: 0, N: 0, A: 0 };
  for (const x of s.colors) c[x]++;
  assert.deepEqual(c, { R: 9, B: 8, N: 7, A: 1 });
  assert.equal(s.phase, 'clue');
  assert.equal(s.turn, 'R');
  assert.equal(s.players[0].role, 'spy');
  assert.equal(s.players[0].team, 'R');
  assert.equal(s.players[1].role, 'spy');
  assert.equal(s.players[1].team, 'B');
  assert.equal(s.players[2].role, 'op');
  assert.equal(s.players[2].team, 'R');
  assert.equal(s.players[3].team, 'B');
});

test('2 người: mỗi người vừa mật vụ vừa điệp viên đội mình', () => {
  const s = E.createGame([P('a', 'A'), P('b', 'B')]);
  assert.equal(s.players[0].role, 'both');
  assert.equal(s.players[1].role, 'both');
  assert.equal(s.players[0].team, 'R');
  assert.equal(s.players[1].team, 'B');
});

test('mật vụ ra gợi ý hợp lệ: sang pha đoán, số lần đoán = số + 1', () => {
  const s = fixedGame();
  const r = E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 2 });
  assert.ok(r.ok);
  assert.equal(s.phase, 'guess');
  assert.equal(s.guessesLeft, 3);
  assert.equal(s.clue.word, 'BIỂN');
  assert.equal(s.clue.num, 2);
  assert.equal(s.clueNo, 1);
});

test('gợi ý sai bị từ chối: 2 từ, số ngoài 0–9, trùng từ còn úp, không phải mật vụ', () => {
  const s = fixedGame();
  assert.equal(E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN XANH', num: 2 }).ok, false);
  assert.equal(E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 10 }).ok, false);
  assert.equal(E.applyAction(s, 'p1', { type: 'clue', word: 'w3', num: 2 }).ok, false);
  assert.equal(E.applyAction(s, 'p1', { type: 'clue', word: 'W3', num: 2 }).ok, false);
  assert.equal(E.applyAction(s, 'p3', { type: 'clue', word: 'BIỂN', num: 2 }).ok, false); /* điệp viên không được gợi ý */
  assert.equal(E.applyAction(s, 'p2', { type: 'clue', word: 'BIỂN', num: 2 }).ok, false); /* mật vụ Xanh, chưa tới lượt */
  assert.equal(s.phase, 'clue');
});

test('đoán trúng điệp viên phe mình: lật lá, còn lượt đoán, hết số lần thì đổi lượt', () => {
  const s = fixedGame();
  E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 1 });
  let r = E.applyAction(s, 'p3', { type: 'guess', idx: 0 });
  assert.ok(r.ok && !r.ended && r.kind === 'own');
  assert.equal(s.revealed[0], true);
  assert.equal(s.guessesLeft, 1);
  assert.equal(s.phase, 'guess');
  assert.equal(E.revealedCount(s, 'R'), 1);
  r = E.applyAction(s, 'p3', { type: 'guess', idx: 1 });
  assert.ok(r.ok);
  assert.equal(s.phase, 'clue');
  assert.equal(s.turn, 'B');
  assert.equal(E.applyAction(s, 'p3', { type: 'guess', idx: 2 }).ok, false); /* đã hết lượt Đỏ */
});

test('đoán trúng dân thường thì hết lượt; đoán trúng lá địch thì hết lượt + tính sai', () => {
  const s = fixedGame();
  E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 2 });
  let r = E.applyAction(s, 'p3', { type: 'guess', idx: 17 }); /* N */
  assert.ok(r.ok && r.kind === 'bystander');
  assert.equal(s.phase, 'clue');
  assert.equal(s.turn, 'B');
  assert.equal(s.wrong.R, 1);
  const s2 = fixedGame();
  E.applyAction(s2, 'p1', { type: 'clue', word: 'BIỂN', num: 2 });
  r = E.applyAction(s2, 'p3', { type: 'guess', idx: 9 }); /* B */
  assert.ok(r.ok && r.kind === 'foe');
  assert.equal(s2.turn, 'B');
  assert.equal(s2.wrong.R, 1);
  assert.equal(s2.revealed[9], true);
});

test('đoán trúng sát thủ thì thua ngay, đội kia thắng', () => {
  const s = fixedGame();
  E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 2 });
  const r = E.applyAction(s, 'p3', { type: 'guess', idx: 24 }); /* A */
  assert.ok(r.ok && r.ended && r.kind === 'assassin');
  assert.equal(s.phase, 'ended');
  assert.equal(s.winner, 'B');
  assert.equal(s.endReason, 'assassin');
  assert.deepEqual(s.winnerIds, ['p2', 'p4']);
});

test('lộ hết điệp viên phe mình thì thắng; ghi số gợi ý lúc thắng', () => {
  const s = fixedGame();
  for (let i = 0; i < 8; i++) { s.revealed[i] = true; }
  E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 5 });
  const r = E.applyAction(s, 'p3', { type: 'guess', idx: 8 }); /* lá Đỏ cuối, sát thủ còn úp */
  assert.ok(r.ok && r.ended && r.win);
  assert.equal(s.winner, 'R');
  assert.equal(s.endReason, 'agents');
  assert.equal(s.winClueNum, 5);
  assert.equal(s.winLastCard, true); /* lá cuối + sát thủ còn úp */
  assert.deepEqual(s.winnerIds, ['p1', 'p3']);
});

test('bỏ lượt: điệp viên dừng đoán sớm, mật vụ bỏ qua lượt gợi ý', () => {
  const s = fixedGame();
  E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 2 });
  let r = E.applyAction(s, 'p3', { type: 'pass' });
  assert.ok(r.ok);
  assert.equal(s.turn, 'B');
  assert.equal(s.phase, 'clue');
  r = E.applyAction(s, 'p2', { type: 'pass' }); /* mật vụ Xanh bỏ gợi ý */
  assert.ok(r.ok);
  assert.equal(s.turn, 'R');
});

test('xin thua: đội mình thua, đội kia thắng', () => {
  const s = fixedGame();
  const r = E.applyAction(s, 'p3', { type: 'resign' });
  assert.ok(r.ok && r.ended);
  assert.equal(s.winner, 'B');
  assert.equal(s.endReason, 'resign');
  assert.equal(E.applyAction(s, 'p1', { type: 'clue', word: 'X', num: 1 }).ok, false); /* ván đã kết thúc */
});

test('viewFor: mật vụ thấy bản đồ mật, điệp viên chỉ thấy lá đã lật', () => {
  const s = fixedGame();
  s.revealed[0] = true;
  const vSpy = E.viewFor(s, 'p1'), vOp = E.viewFor(s, 'p3'), vFoe = E.viewFor(s, 'p2');
  assert.deepEqual(vSpy.key, s.colors);
  assert.equal(vOp.key, null);
  assert.deepEqual(vFoe.key, s.colors); /* mật vụ Xanh cũng thấy bản đồ */
  assert.equal(vOp.shown[0], 'R');
  assert.equal(vOp.shown[1], null);
  assert.equal(vSpy.myTeam, 'R');
  assert.equal(vOp.myRole, 'op');
});

test('view/serialize: 2 bên thấy cùng lá/lượt, khác bản đồ mật; serialize ổn định', () => {
  const s = fixedGame();
  E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 2 });
  E.applyAction(s, 'p3', { type: 'guess', idx: 0 });
  const s2 = E.deserialize(E.serialize(s));
  assert.deepEqual(E.serialize(s2), E.serialize(s));
  assert.deepEqual(E.viewFor(s2, 'p3').shown, E.viewFor(s, 'p3').shown);
});

test('bot mật vụ ra gợi ý hợp lệ (không trùng từ úp, số 1–9); bot điệp viên đoán lá liên quan', () => {
  const s = E.createGame([P('h', 'Người'), P('b', 'Máy')]);
  /* bot là mật vụ Xanh — cho Xanh đi trước bằng cách đổi lượt */
  s.turn = 'B';
  const c = pickClue(s, 'b', 'hard');
  assert.ok(c && c.type === 'clue');
  assert.ok(!/\s/.test(c.word));
  assert.ok(c.num >= 1 && c.num <= 9);
  assert.ok(!s.words.some((w, i) => !s.revealed[i] && w.toLowerCase() === c.word.toLowerCase()));
  const r = E.applyAction(s, 'b', c);
  assert.ok(r.ok);
  const g = pickGuess(s, 'b', 'hard');
  assert.ok(g && (g.type === 'guess' || g.type === 'pass'));
  if (g.type === 'guess') assert.ok(g.idx >= 0 && g.idx < 25 && !s.revealed[g.idx]);
});

test('đoán nhầm lá địch cuối cùng: đội đó thắng ngay', () => {
  const s = fixedGame();
  for (const i of [9, 10, 11, 12, 13, 14, 15]) s.revealed[i] = true; /* Xanh còn 1 lá (16) */
  E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 2 });
  const r = E.applyAction(s, 'p3', { type: 'guess', idx: 16 }); /* lá Xanh cuối */
  assert.ok(r.ok && r.ended && r.kind === 'foe');
  assert.equal(s.winner, 'B');
  assert.equal(s.endReason, 'agents');
  assert.deepEqual(s.winnerIds, ['p2', 'p4']);
});

test('bot không kẹt khi gợi ý chính trùng từ trên bàn (hồi quy ván kẹt)', () => {
  /* Đỏ còn 1 lá 'lâu đài' — gợi ý chủ đề duy nhất 'VUA' bị chặn vì 'vua'
     đang úp trên bàn (lá Xanh). Bot phải tìm được gợi ý khác, không được pass. */
  const s = E.createGame([P('a', 'A'), P('b', 'B')]);
  s.words = ['lâu đài', 'vua', 'yêu', 'bàn', 'ghế', 'sách', 'bút', 'cá', 'chim', 'hoa',
    'mây', 'mưa', 'nắng', 'gió', 'đá', 'cây', 'lá', 'xe', 'tàu', 'máy',
    'điện', 'nước', 'lửa', 'gạo', 'muối'];
  s.colors = ['R', 'B', 'B', 'N', 'N', 'N', 'N', 'N', 'N', 'N',
    'N', 'A', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'B',
    'B', 'B', 'B', 'B', 'B'];
  /* chỉ còn 3 lá chưa lật: lâu đài (Đỏ), vua + yêu (Xanh); còn lại đã lật */
  s.revealed = s.words.map((w, i) => !(['lâu đài', 'vua', 'yêu'].includes(w)));
  s.turn = 'R';
  const c = pickClue(s, 'a', 'hard');
  assert.ok(c && c.type === 'clue', 'bot mật vụ phải ra gợi ý, không được pass');
  assert.ok(!/\s/.test(c.word));
  assert.ok(c.num >= 1 && c.num <= 9);
  const r = E.applyAction(s, 'a', c);
  assert.ok(r.ok, 'gợi ý của bot phải hợp lệ: ' + (r.reason || ''));
  const g = pickGuess(s, 'a', 'hard');
  assert.ok(g && g.type === 'guess', 'bot điệp viên phải đoán được lá liên quan');
});

test('deficit: đội bị dẫn tối đa được ghi lại', () => {
  const s = fixedGame();
  /* Đỏ đoán sai ngay (dân thường) → Xanh đoán trúng 4 lá liền → Đỏ bị dẫn 4 */
  E.applyAction(s, 'p1', { type: 'clue', word: 'BIỂN', num: 1 });
  E.applyAction(s, 'p3', { type: 'guess', idx: 17 }); /* N: hết lượt Đỏ, Đỏ lộ 0 */
  assert.equal(s.deficit.R, 0);
  E.applyAction(s, 'p2', { type: 'clue', word: 'BIỂN', num: 4 });
  for (const i of [9, 10, 11, 12]) {
    const r = E.applyAction(s, 'p4', { type: 'guess', idx: i });
    assert.ok(r.ok);
  }
  assert.equal(s.deficit.R, 4);
  assert.equal(s.deficit.B, 0);
});

console.log(`\n${pass} test đạt.`);
