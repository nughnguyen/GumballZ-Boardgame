// Kiểm luật Wordle: màu xanh/vàng/xám (kể cả chữ trùng), kiểm tra từ,
// thắng/thua, viewFor không lộ đáp án, serialize roundtrip.
// Chạy: node wordle/test/rules.mjs
import * as E from '../js/engine.js';
import { WORDS, VALID } from '../js/words.js';

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ ${name}`); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const P1 = [{ id: 'p1', name: 'A' }];
const P2 = [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }];

/* 1. computeMarks cơ bản */
t('toàn xanh', eq(E.computeMarks('TRANG', 'TRANG'), ['green', 'green', 'green', 'green', 'green']));
t('xám trừ 2 chữ trùng vị trí (N, G)', eq(E.computeMarks('TRANG', 'PHONG'), ['gray', 'gray', 'gray', 'green', 'green']));
t('vàng sai chỗ', eq(E.computeMarks('TRANG', 'RATNG'), ['yellow', 'yellow', 'yellow', 'green', 'green']));
/* chữ trùng: đáp án AABCD, đoán AACAA → xanh,xanh,vàng,xám,xám */
t('chữ trùng: xanh trước', eq(E.computeMarks('AABCD', 'AACAA'), ['green', 'green', 'yellow', 'gray', 'gray']));
/* chữ trùng: đoán nhiều hơn đáp án có — đáp án TRANG (A×2), đoán ANANA */
t('chữ trùng: A chỉ có 1 lần trong đáp án, đã xanh ở vị trí 2 nên các A khác xám', eq(E.computeMarks('TRANG', 'ANANA'), ['gray', 'gray', 'green', 'green', 'gray']));

/* 2. tạo ván + đáp án cố định */
const s0 = E.createGame(P1, { answer: 'TRANG', seed: 42 });
t('tạo ván: phase playing', s0.phase === 'playing');
t('tạo ván: đáp án cố định', s0.answer === 'TRANG');
t('tạo ván: 1 người chơi', s0.players.length === 1);
const sSeed = E.createGame(P1, { seed: 7 });
t('tạo ván: đáp án theo hạt giống có trong bank', WORDS.includes(sSeed.answer));
const sSeed2 = E.createGame(P1, { seed: 7 });
t('tạo ván: cùng hạt giống → cùng đáp án', sSeed.answer === sSeed2.answer);
t('bank đủ lớn', WORDS.length >= 400);
t('bank: mọi từ 5 chữ A–Z', WORDS.every(w => /^[A-Z]{5}$/.test(w)));
t('bank: không trùng', new Set(WORDS).size === WORDS.length);
t('VALID chứa WORDS', WORDS.every(w => VALID.has(w)));

/* 3. đoán: kiểm tra từ */
let s = E.createGame(P1, { answer: 'TRANG', seed: 1 });
let r = E.applyAction(s, 'p1', { type: 'guess', word: 'TRA' });
t('từ ngắn bị từ chối, không tính lượt', !r.ok && s.prog.p1.guesses.length === 0);
r = E.applyAction(s, 'p1', { type: 'guess', word: 'ZZZZZ' });
t('từ ngoài từ điển bị từ chối, không tính lượt', !r.ok && s.prog.p1.guesses.length === 0);
r = E.applyAction(s, 'p1', { type: 'guess', word: 'trang' });
t('đoán chữ thường vẫn nhận (tự viết hoa)', r.ok && s.prog.p1.guesses.length === 1);
r = E.applyAction(s, 'p1', { type: 'guess', word: 'TRANG' });
t('đoán trùng bị từ chối', !r.ok && s.prog.p1.guesses.length === 1);

/* 4. thắng */
s = E.createGame(P1, { answer: 'TRANG', seed: 1 });
r = E.applyAction(s, 'p1', { type: 'guess', word: 'HOANG' });
t('đoán sai vẫn ok, chưa thắng', r.ok && !r.solved && s.phase === 'playing');
t('đoán sai ghi đúng màu', eq(s.prog.p1.guesses[0].marks, E.computeMarks('TRANG', 'HOANG')));
r = E.applyAction(s, 'p1', { type: 'guess', word: 'TRANG' });
t('đoán đúng → thắng', r.ok && r.solved && s.phase === 'ended' && s.winner === 'p1');
t('sau khi thắng không đoán nữa', !E.applyAction(s, 'p1', { type: 'guess', word: 'HOANG' }).ok);

/* 5. thua sau 6 lần */
s = E.createGame(P1, { answer: 'TRANG', seed: 1 });
for (const w of ['HOANG', 'PHONG', 'QUANG', 'THANG', 'TRUNG', 'GIANG']) {
  r = E.applyAction(s, 'p1', { type: 'guess', word: w });
}
t('sai 6 lần → bị loại, ván kết thúc không ai thắng', s.prog.p1.failed && s.phase === 'ended' && s.winner === null && s.endReason === 'allfail');
t('sau khi thua không đoán nữa', !E.applyAction(s, 'p1', { type: 'guess', word: 'TRANG' }).ok);

/* 6. xin thua */
s = E.createGame(P1, { answer: 'TRANG', seed: 1 });
r = E.applyAction(s, 'p1', { type: 'resign' });
t('chơi đơn xin thua → ván kết thúc', r.ok && s.phase === 'ended' && s.endReason === 'resign');
s = E.createGame(P2, { answer: 'TRANG', seed: 1 });
r = E.applyAction(s, 'p1', { type: 'resign' });
t('đua 2 người: 1 người xin thua, ván vẫn tiếp tục', r.ok && s.phase === 'playing' && s.prog.p1.failed);
r = E.applyAction(s, 'p2', { type: 'guess', word: 'TRANG' });
t('người còn lại đoán đúng vẫn thắng', r.ok && r.solved && s.winner === 'p2');

/* 7. viewFor: không lộ đáp án khi đang chơi, lộ khi kết thúc */
s = E.createGame(P2, { answer: 'TRANG', seed: 1 });
E.applyAction(s, 'p1', { type: 'guess', word: 'HOANG' });
let v = E.viewFor(s, 'p2');
t('viewFor: chưa lộ đáp án khi đang chơi', v.answer === null);
t('viewFor: không thấy từ đã đoán của người khác', !JSON.stringify(v).includes('HOANG'));
t('viewFor: thấy số lượt đã đoán của người khác', v.players.find(p => p.id === 'p1').attempts === 1);
t('viewFor: thấy lượt đoán của mình', v.you.guesses.length === 0);
E.applyAction(s, 'p2', { type: 'guess', word: 'TRANG' });
v = E.viewFor(s, 'p1');
t('viewFor: lộ đáp án khi ván kết thúc', v.answer === 'TRANG');

/* 8. serialize roundtrip + dữ liệu xấu */
s = E.createGame(P2, { answer: 'TRANG', seed: 3 });
E.applyAction(s, 'p1', { type: 'guess', word: 'HOANG' });
const s2 = E.deserialize(E.serialize(s));
t('serialize roundtrip giữ nguyên state', E.serialize(s2) === E.serialize(s));
let threw = false;
try { E.deserialize('{"answer":"XXXXX","players":[],"phase":"playing","prog":{}}'); } catch (e) { threw = true; }
t('deserialize dữ liệu xấu phải throw', threw);

/* 9. actors */
s = E.createGame(P2, { answer: 'TRANG', seed: 1 });
t('actors: cả 2 người lúc đầu', eq(E.actors(s), ['p1', 'p2']));
E.applyAction(s, 'p1', { type: 'resign' });
t('actors: người xin thua không còn trong actors', eq(E.actors(s), ['p2']));

console.log(`\nLuật Wordle: ${pass} pass, ${fail} fail.`);
if (fail) process.exit(1);
