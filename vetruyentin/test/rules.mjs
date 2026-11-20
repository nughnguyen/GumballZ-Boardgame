// Luật Vẽ Truyền Tin: ngân hàng từ, chia sổ, luân chuyển sổ, xen kẽ
// vẽ/đoán, chuẩn hoá đoán, tính điểm, đổi từ khi đoán sai, hết giờ,
// xin thua, che sổ (viewFor), serialize. Chạy: node vetruyentin/test/rules.mjs
import { createGame, applyAction, actors, viewFor, serialize, deserialize, mulberry32, normalizeGuess, holderOf, heldBook, stepKind, sanitizeStrokes, SOLO_STEPS, SOLO_WIN_CORRECT, STEP_TIME } from '../js/engine.js';
import { WORDS, CATS, PALETTE, BRUSH_SIZES } from '../js/words.js';
import { botAction, botAcc } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
let _s = 20261120;
function reseed(seed = 20261120) {
  _s = seed;
  Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
reseed();

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? ' — ' + extra : '')); } };
const P = names => names.map((nm, i) => ({ id: 'p' + (i + 1), name: nm }));
const throws = fn => { try { fn(); return false; } catch (e) { return true; } };
/* vài nét nguệch ngoạc giả (dùng Math.random đã gieo hạt) */
const scribble = () => {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const pts = [];
    let x = 100 + Math.random() * 400, y = 100 + Math.random() * 200;
    for (let j = 0; j < 5; j++) { pts.push([Math.round(x), Math.round(y)]); x += 30; y += 20; }
    out.push({ color: PALETTE[i % PALETTE.length], width: BRUSH_SIZES[i % BRUSH_SIZES.length], pts });
  }
  return out;
};
const drawWordOf = (s, pid) => {
  const b = heldBook(s, pid);
  if (b < 0) return null;
  const book = s.books[b];
  const last = book.entries[book.entries.length - 1];
  return last && last.type === 'drawing' ? last.word : book.curWord;
};
/* lái 1 ván nhiều người tới hết: vẽ thì vẽ nguệch ngoạc, đoán thì đoán theo fn */
function driveMulti(s, guessFn, maxSteps = 500) {
  let n = 0;
  while (s.phase === 'playing' && n++ < maxSteps) {
    const acts = actors(s);
    if (!acts.length) throw new Error('kẹt: không còn ai hành động mà ván chưa kết thúc (step ' + s.step + ')');
    for (const pid of acts) {
      if (s.phase !== 'playing') break;
      if (stepKind(s.step) === 'draw') {
        const r = applyAction(s, pid, { type: 'draw', strokes: scribble() });
        if (!r.ok) throw new Error('draw lỗi: ' + r.reason);
      } else {
        const r = applyAction(s, pid, { type: 'guess', text: guessFn(s, pid) });
        if (!r.ok) throw new Error('guess lỗi: ' + r.reason);
      }
    }
  }
  return s;
}
const correctGuess = (s, pid) => drawWordOf(s, pid) || '';
const wrongGuess = (s, pid) => {
  const w = drawWordOf(s, pid);
  const other = WORDS.find(x => normalizeGuess(x.word) !== normalizeGuess(w || ''));
  return other.word;
};

/* ---- ngân hàng từ ---- */
t('ngân hàng đúng 120 từ', WORDS.length === 120, `got ${WORDS.length}`);
t('6 nhóm, mỗi nhóm đúng 20 từ', CATS.length === 6 && CATS.every(c => WORDS.filter(w => w.cat === c).length === 20));
t('không trùng từ (sau chuẩn hoá)', new Set(WORDS.map(w => normalizeGuess(w.word))).size === 120);
t('mọi entry đều có {word, cat} hợp lệ', WORDS.every(w => typeof w.word === 'string' && w.word.trim().length > 0 && CATS.includes(w.cat)));
t('bảng màu 6 màu, 3 cỡ cọ', PALETTE.length === 6 && BRUSH_SIZES.length === 3);

/* ---- chuẩn hoá đoán (giống Đoán Hành Động) ---- */
t('normalize: không phân biệt hoa thường', normalizeGuess('Con Chó') === normalizeGuess('con chó'));
t('normalize: bỏ dấu tiếng Việt', normalizeGuess('Cái Bàn') === normalizeGuess('cai ban'));
t('normalize: đ → d', normalizeGuess('Đi Học') === normalizeGuess('di hoc'));
t('normalize: gộp khoảng trắng + trim', normalizeGuess('  con   chó  ') === 'con cho');
t('normalize: bỏ dấu câu', normalizeGuess('Tom và Jerry!') === normalizeGuess('tom va jerry'));

/* ---- tạo ván ---- */
{
  const s = createGame(P(['An']), { seed: 42, vtMode: 'solo', botLevel: 'easy' });
  t('chơi đơn: engine tự thêm 1 máy (2 người)', s.players.length === 2 && s.players[1].id === 'bot1');
  t('chơi đơn: 1 sổ, 10 bước', s.books.length === 1 && s.totalSteps === SOLO_STEPS && SOLO_STEPS === 10);
  t('chơi đơn: sổ bắt đầu bằng 1 từ', s.books[0].entries.length === 1 && s.books[0].entries[0].type === 'word');
  t('chơi đơn: bước 0 là lượt vẽ', stepKind(0) === 'draw' && stepKind(1) === 'guess' && stepKind(2) === 'draw');
  t('chơi đơn: người vẽ bước 0, máy đoán bước 1', holderOf(s, 0, 0) === 'p1' && holderOf(s, 0, 1) === 'bot1');
}
{
  const s = createGame(P(['An', 'Bình']), { seed: 7, vtMode: 'race', botLevel: 'hard' });
  t('đấu máy: 2 sổ, 10 bước mỗi sổ', s.books.length === 2 && s.totalSteps === 10);
  t('đấu máy: sổ 1 của máy, sổ 0 của người', s.books[1].owner === 'p2' && s.books[0].owner === 'p1');
}
for (const n of [4, 5, 6, 7, 8]) {
  const s = createGame(P(Array.from({ length: n }, (_, i) => 'P' + (i + 1))), { seed: 100 + n, vtMode: 'multi' });
  t(`nhiều người ${n}: đúng ${n} sổ, ${n} bước`, s.books.length === n && s.totalSteps === n);
  t(`nhiều người ${n}: mỗi người cầm mỗi sổ đúng 1 lần`, (() => {
    for (let b = 0; b < n; b++) {
      const holders = new Set();
      for (let k = 0; k < n; k++) holders.add(holderOf(s, b, k));
      if (holders.size !== n) return false;
    }
    return true;
  })());
  t(`nhiều người ${n}: mỗi bước mỗi người cầm đúng 1 sổ`, (() => {
    for (let k = 0; k < n; k++) {
      const holders = new Set();
      for (let b = 0; b < n; b++) holders.add(holderOf(s, b, k));
      if (holders.size !== n) return false;
    }
    return true;
  })());
}
t('chia từ không trùng trong 1 ván (20 ván, đủ cỡ)', (() => {
  for (let seed = 1; seed <= 20; seed++) {
    for (const n of [4, 8]) {
      const s = createGame(P(Array.from({ length: n }, (_, i) => 'P' + (i + 1))), { seed, vtMode: 'multi' });
      const words = s.books.map(b => normalizeGuess(b.entries[0].word));
      if (new Set(words).size !== words.length) return false;
    }
  }
  return true;
})());
t('tạo ván sai: 3 người chơi nhiều người thì throw', throws(() => createGame(P(['A', 'B', 'C']), { seed: 1, vtMode: 'multi' })));
t('tạo ván sai: 9 người thì throw', throws(() => createGame(P(Array.from({ length: 9 }, (_, i) => 'P' + i)), { seed: 1, vtMode: 'multi' })));
t('tạo ván sai: đấu máy cần đúng 2 người', throws(() => createGame(P(['A', 'B', 'C']), { seed: 1, vtMode: 'race' })));

/* ---- xen kẽ vẽ/đoán + tính điểm (nhiều người, đoán đúng hết) ---- */
{
  const s = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 11, vtMode: 'multi' });
  t('bước 0: 4 người đều phải vẽ', actors(s).length === 4 && actors(s).every(pid => heldBook(s, pid) >= 0));
  /* bước 0: An vẽ sổ 0 */
  const r0 = applyAction(s, 'p1', { type: 'draw', strokes: scribble() });
  t('An vẽ được ở bước 0', r0.ok === true);
  t('sau khi An vẽ, An không còn trong actors', !actors(s).includes('p1'));
  t('đoán ở lượt vẽ thì bị từ chối', applyAction(s, 'p2', { type: 'guess', text: 'x' }).ok === false);
  /* 3 người còn lại vẽ xong → sang bước 1 (đoán) */
  for (const pid of ['p2', 'p3', 'p4']) applyAction(s, pid, { type: 'draw', strokes: scribble() });
  t('hết bước vẽ thì sang bước đoán', s.step === 1 && stepKind(s.step) === 'guess');
  /* An đoán đúng bức vẽ sổ mình cầm: An +10, người vẽ bức đó +5
     (3 người còn lại đoán SAI để đo đúng phần điểm tách riêng) */
  const before = JSON.parse(JSON.stringify(s.prog));
  const held = heldBook(s, 'p1');
  const drawer = s.books[held].entries[1].by;
  const r1 = applyAction(s, 'p1', { type: 'guess', text: correctGuess(s, 'p1') });
  t('đoán đúng từ của bức vẽ thì ok + correct', r1.ok === true && r1.correct === true);
  /* điểm chỉ cộng khi bước chấm xong (sau khi cả 4 người đoán) */
  for (const pid of ['p2', 'p3', 'p4']) applyAction(s, pid, { type: 'guess', text: wrongGuess(s, pid) });
  t('đoán đúng: người đoán +10', s.prog['p1'].points - before['p1'].points === 10, `got ${s.prog['p1'].points - before['p1'].points}`);
  t('đoán đúng: người vẽ bức đó +5', s.prog[drawer].points - before[drawer].points === 5, `drawer ${drawer} got ${s.prog[drawer].points - before[drawer].points}`);
  t('đoán sai: người đoán sai không được điểm (p2/p3 — p4 được +5 vì là người vẽ bức p1 đoán đúng, đã kiểm ở trên)', s.prog['p2'].points - before['p2'].points === 0 && s.prog['p3'].points - before['p3'].points === 0);
  t('đoán đúng: từ trong sổ được giữ (wordsKept +1 cho chủ sổ)', s.prog[s.books[held].owner].wordsKept === 1);
  driveMulti(s, correctGuess);
  t('ván nhiều người đoán đúng hết (trừ bước 1) thì kết thúc', s.phase === 'ended');
  t('người đoán đúng nhiều nhất thì thắng (không hoà)', s.winner != null && s.endReason === 'win', `winner=${s.winner}`);
  t('summary đủ 6 trường cho mọi người', s.players.every(p => {
    const q = s.final.summary[p.id];
    return q && ['points', 'correctGuesses', 'totalGuesses', 'drawingsMade', 'bestChain', 'wordsKept'].every(k => typeof q[k] === 'number');
  }));
}
{
  /* mọi người đều đoán đúng hết mọi lượt → hoà tuyệt đối (mỗi người 30đ: 2 lần đoán +10, 2 bức vẽ +5) */
  const s = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 25, vtMode: 'multi' });
  driveMulti(s, correctGuess);
  t('đoán đúng hết mọi lượt: ván hoà tuyệt đối', s.phase === 'ended' && s.winner === null && s.endReason === 'draw');
  t('đoán đúng hết: mỗi người 30 điểm, 2 lần đoán đúng', s.players.every(p => s.prog[p.id].points === 30 && s.prog[p.id].correctGuesses === 2));
}

/* ---- đoán sai thì từ đổi, đoán trống thì từ giữ nguyên ---- */
{
  const s = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 12, vtMode: 'multi' });
  for (const pid of ['p1', 'p2', 'p3', 'p4']) applyAction(s, pid, { type: 'draw', strokes: scribble() });
  const b = heldBook(s, 'p1');
  const oldWord = s.books[b].curWord;
  const wrong = wrongGuess(s, 'p1');
  const r = applyAction(s, 'p1', { type: 'guess', text: wrong });
  t('đoán sai thì ok nhưng correct=false', r.ok === true && r.correct === false);
  for (const pid of ['p2', 'p3', 'p4']) applyAction(s, pid, { type: 'guess', text: wrongGuess(s, pid) });
  t('đoán sai: từ trong sổ đổi thành từ vừa đoán', s.books[b].curWord === wrong && normalizeGuess(s.books[b].curWord) !== normalizeGuess(oldWord));
  t('đoán sai: không ai được điểm ở bước đó', s.prog['p1'].points === 0);
  /* bước 2 là vẽ: người cầm sổ p1 vẽ từ MỚI */
  const b2 = heldBook(s, 'p1');
  t('lượt vẽ sau: bức vẽ miêu tả từ mới', (() => {
    const rr = applyAction(s, 'p1', { type: 'draw', strokes: scribble() });
    return rr.ok && s.books[b2].entries[s.books[b2].entries.length - 1].word === wrong;
  })());
}
{
  /* đoán trống (hết giờ) thì từ giữ nguyên */
  const s = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 13, vtMode: 'multi' });
  for (const pid of ['p1', 'p2', 'p3', 'p4']) applyAction(s, pid, { type: 'draw', strokes: scribble() });
  const b = heldBook(s, 'p1');
  const oldWord = s.books[b].curWord;
  const r = applyAction(s, 'p1', { type: 'timeout' });
  t('hết giờ ở lượt đoán: nộp trống ok', r.ok === true);
  for (const pid of ['p2', 'p3', 'p4']) applyAction(s, pid, { type: 'guess', text: correctGuess(s, pid) });
  t('đoán trống: từ trong sổ giữ nguyên', s.books[b].curWord === oldWord);
  t('đoán trống: tính là sai (correct=false)', s.books[b].entries[s.books[b].entries.length - 1].correct === false || s.books[b].entries.some(e => e.type === 'guess' && e.text === ''));
}

/* ---- hoà: mọi người đều 0 điểm ---- */
{
  const s = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 14, vtMode: 'multi' });
  driveMulti(s, wrongGuess);
  t('đoán sai hết: ván hoà (winner null, endReason draw)', s.phase === 'ended' && s.winner === null && s.endReason === 'draw');
  t('hoà: không ai có điểm', s.players.every(p => s.prog[p.id].points === 0));
}

/* ---- xin thua ---- */
{
  const s = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 15, vtMode: 'multi' });
  const r = applyAction(s, 'p2', { type: 'resign' });
  t('xin thua: ok, người đó bị đánh dấu resigned', r.ok === true && s.prog['p2'].resigned === true);
  t('xin thua: ván vẫn tiếp tục (còn 3 người)', s.phase === 'playing');
  t('xin thua: người xin thua không còn trong actors', !actors(s).includes('p2'));
  /* lượt của người xin thua được tự nộp trắng → bước vẫn xong */
  driveMulti(s, correctGuess);
  t('ván có người xin thua vẫn kết thúc được', s.phase === 'ended');
  t('người xin thua không thắng', s.winner !== 'p2');
  /* xin thua tới còn 1 người thì người đó thắng ngay */
  const s2 = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 16, vtMode: 'multi' });
  applyAction(s2, 'p2', { type: 'resign' });
  applyAction(s2, 'p3', { type: 'resign' });
  const r2 = applyAction(s2, 'p4', { type: 'resign' });
  t('xin thua còn đúng 1 người: người đó thắng ngay, endReason resign', r2.ok === true && s2.phase === 'ended' && s2.winner === 'p1' && s2.endReason === 'resign');
  t('xin thua 2 lần thì bị từ chối', applyAction(s2, 'p2', { type: 'resign' }).ok === false);
}
{
  /* chơi đơn xin thua = thua ngay */
  const s = createGame(P(['An']), { seed: 17, vtMode: 'solo' });
  const r = applyAction(s, 'p1', { type: 'resign' });
  t('chơi đơn xin thua: thua ngay, winner null, endReason resign', r.ok === true && s.phase === 'ended' && s.winner === null && s.endReason === 'resign' && s.losers.includes('p1'));
}

/* ---- chơi đơn: ngưỡng thắng ≥3/5 (lái tay, không dùng bot) ---- */
{
  const s = createGame(P(['An']), { seed: 18, vtMode: 'solo', botLevel: 'easy' });
  /* người vẽ, máy đoán đúng 3 lần + sai 2 lần → thắng */
  let correct = 0;
  while (s.phase === 'playing') {
    const acts = actors(s);
    for (const pid of acts) {
      if (s.phase !== 'playing') break;
      if (stepKind(s.step) === 'draw') applyAction(s, pid, { type: 'draw', strokes: scribble() });
      else {
        const want = correct < 3;
        const r = applyAction(s, pid, { type: 'guess', text: want ? correctGuess(s, pid) : wrongGuess(s, pid) });
        if (want && r.correct) correct++;
      }
    }
  }
  t('chơi đơn: máy đoán đúng 3/5 thì người thắng', s.phase === 'ended' && s.winner === 'p1' && s.prog['p1'].wordsKept === 3, `wordsKept=${s.prog['p1'].wordsKept}`);
}
{
  const s = createGame(P(['An']), { seed: 19, vtMode: 'solo', botLevel: 'easy' });
  let correct = 0;
  while (s.phase === 'playing') {
    const acts = actors(s);
    for (const pid of acts) {
      if (s.phase !== 'playing') break;
      if (stepKind(s.step) === 'draw') applyAction(s, pid, { type: 'draw', strokes: scribble() });
      else {
        const want = correct < 2;
        const r = applyAction(s, pid, { type: 'guess', text: want ? correctGuess(s, pid) : wrongGuess(s, pid) });
        if (want && r.correct) correct++;
      }
    }
  }
  t('chơi đơn: máy đoán đúng 2/5 thì người thua (winner null)', s.phase === 'ended' && s.winner === null && s.prog['p1'].wordsKept === 2);
  t('ngưỡng thắng chơi đơn = 3', SOLO_WIN_CORRECT === 3);
}

/* ---- đấu máy: sổ của máy tự chơi, ván kết thúc ---- */
{
  reseed(20261120);
  const s = createGame([{ id: 'p1', name: 'An' }, { id: 'bot9', name: 'Mochi 🤖', isBot: true, level: 'hard' }], { seed: 21, vtMode: 'race', botLevel: 'hard' });
  let n = 0;
  while (s.phase === 'playing' && n++ < 500) {
    const acts = actors(s);
    if (!acts.length) throw new Error('đấu máy kẹt ở step ' + s.step);
    for (const pid of acts) {
      if (s.phase !== 'playing') break;
      if (stepKind(s.step) === 'draw') applyAction(s, pid, { type: 'draw', strokes: scribble() });
      else {
        const a = botAction(s, pid, 'hard');
        if (!a) throw new Error('bot không hành động');
        applyAction(s, pid, a);
      }
    }
  }
  t('đấu máy: ván kết thúc', s.phase === 'ended');
  t('đấu máy: sổ của máy có đủ 11 entry (từ gốc + 10 bước)', s.books[1].entries.length === 11);
  t('đấu máy: sổ của máy có nét vẽ mô phỏng (simulated)', s.books[1].entries.some(e => e.type === 'drawing' && e.simulated === true));
  t('đấu máy: cả 2 bên đều có wordsKept trong summary', typeof s.final.summary['p1'].wordsKept === 'number' && typeof s.final.summary['bot9'].wordsKept === 'number');
}

/* ---- viewFor: chỉ thấy entry cuối của sổ đang cầm ---- */
{
  const s = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 22, vtMode: 'multi' });
  const v = viewFor(s, 'p1');
  t('viewFor: đang chơi thì books = null (chưa lật sổ)', v.books === null);
  t('viewFor: held có từ cần vẽ (không lộ sổ khác)', v.held && v.held.kind === 'draw' && typeof v.held.word === 'string' && v.held.word.length > 0);
  t('viewFor: không lộ từ gốc của sổ khác', JSON.stringify(v).indexOf('"' + s.books[1].entries[0].word + '"') === -1);
  for (const pid of ['p1', 'p2', 'p3', 'p4']) applyAction(s, pid, { type: 'draw', strokes: scribble() });
  const v2 = viewFor(s, 'p1');
  t('viewFor lượt đoán: held có bức vẽ với strokes', v2.held && v2.held.kind === 'guess' && v2.held.drawing && Array.isArray(v2.held.drawing.strokes) && v2.held.drawing.strokes.length === 3);
  t('viewFor lượt đoán: KHÔNG lộ từ mà bức vẽ miêu tả (không có word/cat trong drawing)', v2.held && v2.held.drawing && !('word' in v2.held.drawing) && !('cat' in v2.held.drawing));
  driveMulti(s, correctGuess);
  const v3 = viewFor(s, 'p1');
  t('viewFor khi kết thúc: thấy đủ 4 sổ với chuỗi đầy đủ', v3.books && v3.books.length === 4 && v3.books.every(b => b.entries.length === 5));
  t('viewFor khi kết thúc: mỗi sổ bắt đầu bằng từ gốc', v3.books.every(b => b.entries[0].type === 'word'));
}

/* ---- serialize: byte-identical, nét vẽ còn nguyên ---- */
{
  const s = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 23, vtMode: 'multi' });
  for (const pid of ['p1', 'p2']) applyAction(s, pid, { type: 'draw', strokes: scribble() });
  const a = serialize(s);
  const b = serialize(deserialize(a));
  t('serialize → deserialize → serialize: byte-identical', a === b);
  t('deserialize: nét vẽ còn nguyên sau round-trip', (() => {
    const s2 = deserialize(a);
    return JSON.stringify(s2.books[0].entries[1].strokes) === JSON.stringify(s.books[0].entries[1].strokes);
  })());
  t('deserialize sai thì throw', throws(() => deserialize('{"players":[]}')));
  t('deserialize thiếu books thì throw', throws(() => deserialize(JSON.stringify({ players: P(['A']), mode: 'solo', phase: 'playing', prog: {}, step: 0, totalSteps: 10, books: [] }))));
}

/* ---- sanitize nét vẽ ---- */
{
  const bad = [
    { color: '#FF0000', width: 99, pts: [[-50, -10], [700, 500], [100, 100]] },
    { color: '#E5484D', width: 8, pts: [[10, 10]] },
    ...Array.from({ length: 70 }, (_, i) => ({ color: '#1B1425', width: 4, pts: [[i, i]] })),
  ];
  const clean = sanitizeStrokes(bad);
  t('sanitize: chặn tối đa 60 nét', clean.length === 60, `got ${clean.length}`);
  t('sanitize: màu lạ về màu mặc định, cỡ cọ lạ về 8', clean[0].color === '#1B1425' && clean[0].width === 8);
  t('sanitize: toạ độ kẹp trong 640×400', clean[0].pts[0][0] === 0 && clean[0].pts[0][1] === 0 && clean[0].pts[1][0] === 640 && clean[0].pts[1][1] === 400);
  t('sanitize: không phải mảng thì về []', JSON.stringify(sanitizeStrokes(null)) === '[]');
}

/* ---- hành động sai ---- */
{
  const s = createGame(P(['An', 'Bình', 'Chi', 'Dũng']), { seed: 24, vtMode: 'multi' });
  t('vẽ khi chưa tới lượt mình thì bị từ chối', (() => {
    /* p1 đã vẽ xong thì vẽ nữa là sai */
    applyAction(s, 'p1', { type: 'draw', strokes: scribble() });
    return applyAction(s, 'p1', { type: 'draw', strokes: scribble() }).ok === false;
  })());
  t('đoán ở lượt vẽ thì bị từ chối', applyAction(s, 'p2', { type: 'guess', text: 'x' }).ok === false);
  t('action không rõ loại thì bị từ chối', applyAction(s, 'p2', { type: 'nhay' }).ok === false);
  t('hết giờ khi chưa tới lượt thì bị từ chối', applyAction(s, 'p1', { type: 'timeout' }).ok === false);
  driveMulti(s, correctGuess);
  t('hành động sau khi ván kết thúc thì bị từ chối', applyAction(s, 'p1', { type: 'draw', strokes: [] }).ok === false);
  t('actors khi ván kết thúc = []', actors(s).length === 0);
}
t('đồng hồ mỗi lượt = 120s', STEP_TIME === 120);
t('botAcc: Dễ 0.35, Khó 0.65', botAcc('easy') === 0.35 && botAcc('hard') === 0.65);

console.log(`\nRULES: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
