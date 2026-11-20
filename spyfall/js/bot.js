// 🤖 Bot Spyfall — thuần logic, chơi được cả trên server (Node) lẫn trình duyệt.
// Bot chỉ dùng bài của chính nó + câu hỏi/trả lời công khai trên bàn.
// Người biết địa điểm (không phải gián điệp) trả lời 3 kiểu: nhắc từ khóa
// đặc trưng ("Ở đây … lúc nào cũng có"), trả lời mơ hồ ("Chỗ này rộng rãi
// lắm" — đúng ở mọi nơi, không lộ địa điểm), hoặc trả lời chung chung.
// Nhắc từ khóa là manh mối cho cả bàn, nhưng cũng là cách gián điệp đoán
// địa điểm — nên bot chỉ nhắc từ khóa chừng mực, giống người thật.
// Gián điệp chỉ trả lời chung chung (không biết địa điểm nên không dám nhắc
// từ nào). Máy Khó ghi điểm nghi ngờ: ai trả lời chung chung nhiều, hỏi chung
// chung nhiều thì đáng nghi; gián điệp Khó chỉ đoán sớm/đoán chắc khi tín hiệu
// rõ (≥4 từ khóa, hơn hẳn địa điểm nhì), không thì khoanh vài ứng viên rồi
// đoán bừa trong đó như người thật. Máy Dễ hỏi/trả lời/bỏ phiếu gần như
// ngẫu nhiên.
// KHÔNG đọc trộm: bot không bao giờ nhìn s.spyId / s.locationId của người
// khác — gián điệp chỉ biết mình là gián điệp, người thường chỉ biết thẻ
// của mình (địa điểm + vai của mình lấy từ state thô của host).
import { LOCATIONS, GENERIC_QUESTIONS, GENERIC_ANSWERS, VAGUE_WORDS, VAGUE_ANSWER_TEMPLATES } from './locations.js?v=1';

const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const locById = id => LOCATIONS.find(l => l.id === id) || null;

/* câu trả lời nhắc 1 từ khóa của địa điểm (người biết địa điểm mới dám nói) */
const KW_ANSWER_TEMPLATES = [
  k => `Ở đây ${k} lúc nào cũng có.`,
  k => `Tôi tới đây vì ${k}.`,
  k => `Chỗ này nổi tiếng về ${k}.`,
  k => `Tôi hay thấy ${k} ở đây.`,
  k => `Không có ${k} thì chỗ này chán lắm.`,
];
const kwAnswer = loc => rnd(KW_ANSWER_TEMPLATES)(rnd(loc.kw));
/* câu trả lời mơ hồ: đúng ở mọi địa điểm, không lộ gì cho gián điệp */
const vagueAnswer = () => rnd(VAGUE_ANSWER_TEMPLATES)(rnd(VAGUE_WORDS));

/* chấm điểm từng địa điểm theo từ khóa xuất hiện trong hỏi đáp công khai */
export function scoreLocations(qa) {
  const text = (qa || []).map(x => (x.q || '') + ' ' + (x.a || '')).join(' ').toLowerCase();
  const scores = {};
  for (const loc of LOCATIONS) {
    let sc = 0;
    for (const k of loc.kw) { if (text.includes(k.toLowerCase())) sc++; }
    scores[loc.id] = sc;
  }
  return scores;
}
function bestLocation(qa) {
  const scores = scoreLocations(qa);
  let best = 0, cands = [];
  for (const [id, sc] of Object.entries(scores)) {
    if (sc > best) { best = sc; cands = [id]; }
    else if (sc === best) cands.push(id);
  }
  return { id: cands.length ? rnd(cands) : null, score: best, second: (() => { const s = Object.values(scores).sort((a, b) => b - a); return s[1] || 0; })() };
}

/* hồ sơ nghi ngờ của 1 người (góc nhìn của bot không phải gián điệp):
   - score: trả lời chung chung +3, nhắc từ khóa −2, hỏi chung chung +1,
     hỏi câu đặc trưng địa điểm −1; câu trả lời mơ hồ thì 0.
   - demos: số lần "chứng tỏ biết địa điểm" (trả lời nhắc từ khóa / hỏi câu
     đặc trưng). Gián điệp KHÔNG BAO GIỜ chứng tỏ được — ai bị hỏi/được hỏi
     ≥2 lần mà demos = 0 thì rất đáng nghi.
   - samples: số lần xuất hiện trong hỏi đáp (mẫu càng nhiều càng chắc). */
function profile(s, pid, myLoc) {
  let sc = 0, demos = 0, samples = 0;
  for (const x of s.qa || []) {
    if (x.from === pid) {
      samples++;
      if (GENERIC_QUESTIONS.includes(x.q)) sc += 1;
      else if (myLoc && myLoc.qs.includes(x.q)) { sc -= 1; demos++; }
    }
    if (x.to === pid && x.a) {
      samples++;
      if (GENERIC_ANSWERS.includes(x.a)) sc += 3;
      else if (myLoc && myLoc.kw.some(k => x.a.toLowerCase().includes(k.toLowerCase()))) { sc -= 2; demos++; }
    }
  }
  if (samples >= 2 && demos === 0) sc += 4; /* chưa từng chứng tỏ biết chỗ */
  return { score: sc, demos, samples };
}
function suspicion(s, pid, myLoc) { return profile(s, pid, myLoc).score; }

function pickAsk(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const hard = level === 'hard';
  const others = s.players.filter(p => p.id !== pid);
  const to = rnd(others).id;
  /* gián điệp đoán sớm khi nghe ĐỦ từ khóa (chỉ Máy Khó): cần ≥4 từ khóa
     và hơn hẳn địa điểm thứ hai — đoán sau 1–2 câu thì may rủi quá cao */
  if (me.isSpy && hard) {
    const b = bestLocation(s.qa);
    if (b.id && b.score >= 4 && b.score >= b.second + 2) return { type: 'spyguess', location: b.id };
  }
  /* đã hỏi đủ 1 vòng quanh bàn thì thỉnh thoảng hô bỏ phiếu (không chờ tới giới hạn cứng của engine) */
  if (s.qa.length >= s.n + 1 && Math.random() < (hard ? 0.4 : 0.15)) return { type: 'callvote' };
  if (!me.isSpy) {
    const loc = locById(s.locationId);
    /* hỏi câu đặc trưng địa điểm: vừa chứng tỏ mình biết chỗ, vừa có nguy cơ
       lộ từ khóa cho gián điệp — Máy Khó hỏi ít, Máy Dễ càng ít */
    if (loc && (hard ? Math.random() < 0.15 : Math.random() < 0.1)) {
      return { type: 'ask', to, text: rnd(loc.qs) };
    }
  }
  return { type: 'ask', to, text: rnd(GENERIC_QUESTIONS) };
}

function pickAnswer(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const hard = level === 'hard';
  if (!me.isSpy) {
    const loc = locById(s.locationId);
    if (loc) {
      /* Máy Khó: 35% nhắc từ khóa, 35% trả lời mơ hồ, 30% chung chung.
         Máy Dễ: 20% từ khóa, 30% mơ hồ, 50% chung chung (trả lời chung
         chung nhiều thì bị nghi — đó là cách đội bắt gián điệp). */
      const r = Math.random();
      const kwRate = hard ? 0.35 : 0.2;
      const vagueRate = hard ? 0.35 : 0.3;
      if (r < kwRate) return { type: 'answer', text: kwAnswer(loc) };
      if (r < kwRate + vagueRate) return { type: 'answer', text: vagueAnswer() };
    }
  }
  return { type: 'answer', text: rnd(GENERIC_ANSWERS) };
}

function pickVote(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  const hard = level === 'hard';
  const others = s.players.filter(p => p.id !== pid);
  if (!hard) return { type: 'vote', target: rnd(others).id };
  if (me.isSpy) return { type: 'vote', target: rnd(others).id }; /* gián điệp đánh lạc hướng: bầu bừa 1 người thường */
  const loc = locById(s.locationId);
  let best = -1e9, cands = [];
  for (const p of others) {
    const sc = suspicion(s, p.id, loc);
    if (sc > best) { best = sc; cands = [p.id]; }
    else if (sc === best) cands.push(p.id);
  }
  return { type: 'vote', target: rnd(cands) };
}

function pickGuess(s, pid, level = 'easy') {
  const me = s.players.find(p => p.id === pid);
  if (!me) return null;
  if (level !== 'hard') return { type: 'guess', location: rnd(LOCATIONS).id };
  const b = bestLocation(s.qa);
  /* tín hiệu rõ (≥4 từ khóa, hơn hẳn địa điểm nhì) thì đoán chắc;
     không thì chỉ khoanh được vài ứng viên — đoán bừa trong đó như người thật */
  if (b.id && b.score >= 4 && b.score >= b.second + 2) return { type: 'guess', location: b.id };
  const scores = scoreLocations(s.qa);
  const ranked = Object.entries(scores).sort((a, z) => z[1] - a[1]);
  /* ứng viên = những địa điểm suýt soát điểm cao nhất; chưa đủ 3 thì thêm
     bừa vài địa điểm chưa từng được nhắc — gián điệp không chắc thì đoán mò */
  const cands = ranked.filter(([, sc]) => sc >= Math.max(1, b.score - 1)).map(([id]) => id);
  const rest = shuffle(LOCATIONS.map(l => l.id).filter(id => !cands.includes(id)));
  while (cands.length < 3 && rest.length) cands.push(rest.pop());
  return { type: 'guess', location: rnd(cands) };
}

/* Bot hành động 1 lượt theo pha hiện tại. */
export function botAction(s, pid, p) {
  if (!s || s.phase === 'ended' || s.phase === 'roundover') return null;
  const me = s.players.find(pp => pp.id === pid);
  if (!me) return null;
  const level = (p && p.level) || 'easy';
  if (s.phase === 'ask') {
    if (s.pendingQ) {
      if (s.pendingQ.to !== pid) return null;
      return pickAnswer(s, pid, level);
    }
    if (s.askerId !== pid) return null;
    return pickAsk(s, pid, level);
  }
  if (s.phase === 'vote') {
    if (pid in s.votes) return null;
    return pickVote(s, pid, level);
  }
  if (s.phase === 'guess') {
    if (pid !== s.spyId) return null;
    return pickGuess(s, pid, level);
  }
  return null;
}
export { pickAsk, pickAnswer, pickVote, pickGuess };
