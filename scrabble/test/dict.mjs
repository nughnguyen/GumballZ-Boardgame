// Từ điển mở rộng Scrabble (patch 20261119-50): nạp kho từ Nối từ rồi
// kiểm tra kích thước từ điển + chơi thử bot-vs-bot với từ điển mở rộng.
// QUAN TRỌNG: import words.js kèm '?v=1' giống engine.js, để cùng 1
// instance module — import không kèm '?v=1' sẽ ra 1 bản sao từ điển
// riêng, addWords() thêm vào bản sao đó còn engine vẫn dùng từ điển gốc.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DICT, WORDS_BY_LEN, DICT_VERSION, MAX_WORD_LEN, wordsFromNoituText, addWords } from '../js/words.js?v=1';
import { createGame, applyAction, actors, mulberry32, legalMoves } from '../js/engine.js';
import { botAction } from '../js/bot.js';

/* gieo hạt cho Math.random để bot cho kết quả ổn định — seed: 20261120 */
const _rng = mulberry32(20261120);
Math.random = () => _rng();

let pass = 0, fail = 0;
const t = (n, c, extra = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n, extra); } };

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let added = 0;
for (const f of ['words.txt', 'words-wikt.txt', 'words-gumballz.txt', 'words-uts.txt']) {
  added += addWords(wordsFromNoituText(readFileSync(join(root, 'noitu', f), 'utf8')));
}
console.log(`  (nạp thêm ${added} từ, tổng từ điển ${DICT.size}, DICT_VERSION ${DICT_VERSION})`);
t('nạp thêm hơn 40.000 từ mới', added > 40000, 'thêm ' + added);
t('tổng từ điển hơn 44.000 từ', DICT.size > 44000, 'tổng ' + DICT.size);
t('từ ghép ANHEM / BANBE / TRUONGHOC / BANHMI đều có',
  ['ANHEM', 'BANBE', 'TRUONGHOC', 'BANHMI'].every(w => DICT.has(w)));
t('âm tiết đơn CHAU / DANG / KHAU đều có',
  ['CHAU', 'DANG', 'KHAU'].every(w => DICT.has(w)));
t('từ 2 chữ mở rộng: hơn 100 từ', (WORDS_BY_LEN[2] || []).length > 100, (WORDS_BY_LEN[2] || []).length + ' từ');
t('từ 3 chữ mở rộng: hơn 500 từ', (WORDS_BY_LEN[3] || []).length > 500, (WORDS_BY_LEN[3] || []).length + ' từ');
t('DICT_VERSION tăng sau khi nạp', DICT_VERSION >= 1, 'v' + DICT_VERSION);
t('từ dài nhất vẫn trong giới hạn bàn', MAX_WORD_LEN >= 10 && MAX_WORD_LEN <= 15, 'max ' + MAX_WORD_LEN);

/* ---------- bot-vs-bot với từ điển mở rộng: vẫn kết thúc, 0 sai luật ---------- */
function playMatch(seed) {
  const s = createGame(
    [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B', isBot: true, level: 'hard' }], { seed });
  s.players[0].isBot = true; s.players[0].level = 'hard';
  let guard = 0, illegal = 0, lmMs = 0, lmCalls = 0;
  while (s.phase === 'playing' && guard++ < 300) {
    const pid = actors(s)[0];
    if (!pid) break;
    const t0 = Date.now();
    legalMoves(s, pid);
    lmMs += Date.now() - t0; lmCalls++;
    const act = botAction(s, pid, 'hard');
    if (!act) { illegal++; break; }
    const r = applyAction(s, pid, act);
    if (!r.ok) { illegal++; console.log('  (nước bot bị từ chối:', JSON.stringify(act), r.reason, 'seed', seed, ')'); break; }
  }
  const words = s.final ? Object.values(s.final.summary).reduce((a, x) => a + x.wordsPlayed, 0) : 0;
  console.log(`  (ván seed ${seed}: ${guard} lượt, ${words} từ, túi còn ${s.bag.length}, kết thúc: ${s.endCause}, legalMoves TB ${(lmMs / Math.max(1, lmCalls)).toFixed(1)}ms)`);
  return { s, illegal, finished: s.phase === 'ended', turns: guard };
}
const m1 = playMatch(1001);
const m2 = playMatch(1002);
t('mở rộng: ván 1 kết thúc', m1.finished);
t('mở rộng: ván 1 0 nước sai luật', m1.illegal === 0);
t('mở rộng: ván 2 kết thúc', m2.finished);
t('mở rộng: ván 2 0 nước sai luật', m2.illegal === 0);
t('mở rộng: không ván nào quá 200 lượt', m1.turns < 200 && m2.turns < 200);

console.log(`\nTừ điển mở rộng Scrabble: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
