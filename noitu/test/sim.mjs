// node noitu/test/sim.mjs – kiểm luật Nối từ + cho máy đấu máy.
import fs from 'fs'; import * as E from '../js/engine.js'; import { botAction } from '../js/bot.js';
let ok = 0, bad = 0; const t = (n, c) => { if (c) ok++; else { bad++; console.log('❌', n); } };
E.setDict((fs.readFileSync(new URL('../words.txt', import.meta.url), 'utf8') + '\n' + fs.readFileSync(new URL('../words-wikt.txt', import.meta.url), 'utf8') + '\n' + fs.readFileSync(new URL('../words-gumballz.txt', import.meta.url), 'utf8') + '\n' + fs.readFileSync(new URL('../words-uts.txt', import.meta.url), 'utf8')).split('\n'));
t('hoà = hòa, thuỷ = thủy', E.norm('Hòa bình') === E.norm('hoà bình') && E.hasWord('hòa bình') && E.hasWord('thủy thủ') && E.norm('của') === 'của' && E.norm('quý') === 'quý');
t('kho từ hơn 50.000 từ', E.dictSize() > 50000);
t('có tên kỹ năng Tam Quốc Sát', E.hasWord('lôi sát') && E.hasWord('hoả sát') && E.hasWord('hỏa sát') && E.hasWord('võ thánh') && E.hasWord('bão kiếm') && E.hasWord('thuỷ ngục') && E.hasWord('cà đùng'));
t('kho từ hơn 38.000 từ', E.dictSize() > 38000); t('có "gà mái", "bạn bè"', E.hasWord('gà mái') && E.hasWord('bạn bè')); t('chuẩn hoá chữ hoa + dấu câu', E.norm('  Gà   MÁI! ') === 'gà mái');
const P = [{ id: 'host', name: 'A' }, { id: 'p1', name: 'B' }, { id: 'bot1', name: 'C', isBot: true }];
let s = E.createGame(P, { time: 20, lives: 2 }, () => 0.01); t('có từ mở đầu 2 tiếng', s.word.split(' ').length === 2 && s.players[0].lives === 2);
s.turn = 0; s.word = 'đàn gà'; s.used = ['đàn gà'];
t('sai lượt', !E.applyAction(s, 'p1', { type: 'word', text: 'gà mái' }).ok);
t('không đúng âm đầu', !E.applyAction(s, 'host', { type: 'word', text: 'con vịt' }).ok && s.players[0].lives === 2);
t('3 tiếng bị từ chối', !E.applyAction(s, 'host', { type: 'word', text: 'gà mái tơ' }).ok);
t('nối đúng', E.applyAction(s, 'host', { type: 'word', text: 'Gà Mái' }).ok && s.word === 'gà mái' && E.curId(s) === 'p1');
t('từ dùng rồi bị từ chối', (s.word = 'đàn gà', s.used.push('gà mái'), !E.applyAction(s, 'p1', { type: 'word', text: 'gà mái' }).ok));
t('từ không có trong từ điển: không nhận, không mất mạng', !E.applyAction(s, 'p1', { type: 'word', text: 'gà zzz' }).ok && s.players[1].lives === 2);
t('chưa hết giờ thì không báo hết giờ được', !E.applyAction(s, 'host', { type: 'timeout' }).ok);
s.deadline = Date.now() - 5; const who = E.curId(s), l0 = s.players.find(p => p.id === who).lives; t('hết giờ mất mạng', E.applyAction(s, 'host', { type: 'timeout' }).ok && s.players.find(p => p.id === who).lives === l0 - 1);
s = E.createGame(P.slice(0, 2), { lives: 2 }, () => 0.5); s.players[1].lives = 1; s.turn = 1; E.applyAction(s, 'p1', { type: 'pass' }); t('hết mạng bị loại, còn 1 người là thắng', s.phase === 'ended' && s.winner === 'host');
let seed = 3; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; let turns = 0, dead = 0; const wins = {};
// từ điển chưa có → cả bàn bỏ phiếu
{ const q = E.createGame(P, { time: 20, lives: 2 }, () => 0.01); q.turn = 0; q.word = 'hành tỏi'; q.used = ['hành tỏi'];
  t('chưa có "tỏi phi" trong từ điển', !E.hasWord('tỏi phi'));
  t('tiếng lạ thì không nhận', !E.applyAction(q, 'host', { type: 'word', text: 'tỏi zzq' }).ok && q.phase === 'play');
  t('từ lạ → bỏ phiếu, chỉ người thật khác được bầu', E.applyAction(q, 'host', { type: 'word', text: 'tỏi phi' }).ok && q.phase === 'vote' && E.actors(q).join() === 'p1');
  t('người đưa từ không tự bầu', !E.applyAction(q, 'host', { type: 'vote', ok: true }).ok);
  t('đồng ý → nhận từ, sang lượt', E.applyAction(q, 'p1', { type: 'vote', ok: true }).ok && q.phase === 'play' && q.word === 'tỏi phi' && E.curId(q) === 'p1');
  q.turn = 0; q.word = 'hành tỏi';
  E.applyAction(q, 'host', { type: 'word', text: 'tỏi chiên' }); const ok0 = q.phase === 'vote';
  t('không đồng ý → không nhận, vẫn lượt người đó, không mất mạng', ok0 && E.applyAction(q, 'p1', { type: 'vote', ok: false }).ok && q.phase === 'play' && q.word === 'hành tỏi' && E.curId(q) === 'host' && q.players[0].lives === 2 && q.last.t === 'rej');
  const r = E.createGame([{ id: 'host', name: 'A' }, { id: 'bot1', name: 'B', isBot: true }], {}, () => 0.01); r.turn = 0; r.word = 'hành tỏi'; r.used = ['hành tỏi'];
  t('chơi với máy: tự nhận từ có tiếng thật', E.applyAction(r, 'host', { type: 'word', text: 'tỏi phi' }).ok && r.word === 'tỏi phi'); }
for (let g = 0; g < 40; g++) { s = E.createGame([{ id: 'a', name: 'A', isBot: true }, { id: 'b', name: 'B', isBot: true }, { id: 'c', name: 'C', isBot: true }], { level: 2 }, rnd); let n = 0;
  while (s.phase === 'play' && n++ < 3000) { const id = E.curId(s), a = botAction(s, id, null, rnd); const r = E.applyAction(s, id, a, rnd); if (!r.ok) { t('máy đi sai: ' + r.reason + ' ' + JSON.stringify(a), false); break; } if (s.last && s.last.dead) dead++; turns++; }
  t('ván máy kết thúc', s.phase === 'ended'); wins[s.winner] = (wins[s.winner] || 0) + 1; }
{ /* chế độ Tự do: nối cả cụm / câu, cả bàn bỏ phiếu */
  const f = E.createGame([{ id: 'host', name: 'H' }, { id: 'p1', name: 'P' }, { id: 'p2', name: 'Q' }], { free: 1 }); t('Tự do: lưu tuỳ chọn', f.opts.free === 1);
  let who = E.curId(f); const tail = E.tailOf(f.word);
  const sent = E.norm(tail + ' con mèo đang ngủ trưa'); E.applyAction(f, who, { type: 'word', text: sent });
  t('Tự do: câu lạ phải bỏ phiếu', f.phase === 'vote' && f.vote.w === sent);
  for (const id of f.vote.vs) E.applyAction(f, id, { type: 'vote', ok: true });
  t('Tự do: cả bàn nhận thì nối được', f.phase === 'play' && f.word === sent && E.tailOf(f.word) === 'trưa');
  who = E.curId(f); t('Tự do: câu sau phải bắt đầu bằng tiếng cuối', !E.applyAction(f, who, { type: 'word', text: 'mèo con' }).ok);
  E.applyAction(f, who, { type: 'word', text: 'trưa nay ăn cơm tấm' }); for (const id of f.vote.vs) E.applyAction(f, id, { type: 'vote', ok: false });
  t('Tự do: cả bàn không nhận thì trả lượt', f.phase === 'play' && f.word === sent && E.curId(f) === who);
  t('Tự do: quá 12 tiếng bị chặn', !E.applyAction(f, who, { type: 'word', text: 'trưa ' + 'một '.repeat(12) + 'hai' }).ok);
  const d = E.createGame([{ id: 'host', name: 'H' }, { id: 'p1', name: 'P' }], {}); t('Từ điển: câu dài không được', !E.applyAction(d, E.curId(d), { type: 'word', text: E.tailOf(d.word) + ' con mèo đang ngủ' }).ok);
}
console.log('40 ván máy đấu máy:', wins, 'tb', Math.round(turns / 40), 'lượt/ván, từ bí:', dead);
console.log(bad ? `❌ ${bad} lỗi` : `✅ ${ok} kiểm tra đều đúng`); process.exit(bad ? 1 : 0);
