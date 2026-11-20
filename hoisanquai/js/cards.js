// 🐾 Hội Săn Quái – dữ liệu lá bài. Cơ chế kiểu Here to Slay (đội anh hùng, tung 2 xúc xắc dùng kỹ năng, Thách, lá Cộng/Trừ, diệt quái)
// nhưng tên, các anh hùng, quái vật, kỹ năng và hình đều tự nghĩ / tự vẽ. Thuần dữ liệu – engine.js đọc, bot.js và main.js dùng chung.

/* 6 hệ – mỗi hệ một con thú (hình ở css/art.css, lớp .px-<khoá>) */
export const CLS = {
  chien: { name: 'Chiến binh', icon: '⚔️', beast: 'Gấu', col: '#e8505b' },
  hove:  { name: 'Hộ vệ', icon: '🛡️', beast: 'Rùa', col: '#7c8b9c' },
  xa:    { name: 'Xạ thủ', icon: '🏹', beast: 'Cáo', col: '#2fa36b' },
  dao:   { name: 'Đạo chích', icon: '🗡️', beast: 'Mèo', col: '#6b5bd6' },
  phap:  { name: 'Pháp sư', icon: '🔮', beast: 'Cú', col: '#3f7fd8' },
  thi:   { name: 'Thi sĩ', icon: '🎵', beast: 'Thỏ', col: '#e88a2e' },
};
export const CLS_KEYS = Object.keys(CLS);

/* kỹ năng anh hùng / phép – mã → câu mô tả (engine.js làm theo mã) */
export const EFF = {
  destroy: 'Huỷ 1 anh hùng của người khác.',
  destroyDraw: 'Huỷ 1 anh hùng của người khác rồi rút 1 lá.',
  steal: 'Lấy 1 anh hùng của người khác về đội mình.',
  ret: 'Trả 1 anh hùng của người khác về tay chủ của nó.',
  draw1: 'Rút 1 lá.',
  draw2: 'Rút 2 lá.',
  drawAp: 'Rút 1 lá và được thêm 1 hành động.',
  drawItem: 'Rút 1 lá; nếu là Vật phẩm thì rút thêm 1 lá.',
  drawPlay: 'Rút 1 lá; nếu là Anh hùng thì đặt ngay vào đội (không tốn hành động).',
  ap: 'Được thêm 1 hành động lượt này.',
  ap2: 'Được thêm 2 hành động lượt này.',
  discAll: 'Mọi người khác bỏ ngẫu nhiên 1 lá trên tay.',
  pull1: 'Lấy ngẫu nhiên 1 lá trên tay một người khác.',
  pull2: 'Lấy ngẫu nhiên 2 lá trên tay một người khác.',
  pullAll: 'Lấy ngẫu nhiên 1 lá trên tay mỗi người khác.',
  trade: 'Đổi cả tay bài với một người khác.',
  grabItem: 'Lấy 1 Vật phẩm đang gắn trên anh hùng bất kỳ về tay.',
  digHero: 'Lấy 1 Anh hùng trong chồng bỏ về tay (không có thì rút 1 lá).',
  digItem: 'Lấy 1 Vật phẩm trong chồng bỏ về tay (không có thì rút 1 lá).',
  digMagic: 'Lấy 1 lá Phép trong chồng bỏ về tay (không có thì rút 1 lá).',
  digChal: 'Lấy 1 lá Thách trong chồng bỏ về tay (không có thì rút 1 lá).',
  digAny: 'Lấy 1 lá bất kỳ trong chồng bỏ về tay.',
  fetchMagic: 'Tìm lá Phép đầu tiên trong chồng rút, cho lên tay rồi xào lại chồng rút.',
  shield: 'Tới đầu lượt sau của bạn: anh hùng của bạn không bị huỷ, lấy mất hay trả về tay.',
  atkBuff: 'Lượt này tung để diệt quái được +2.',
  everyGive: 'Mỗi người khác đưa bạn ngẫu nhiên 1 lá.',
  wipeItems: 'Mọi Vật phẩm trên bàn về tay chủ của anh hùng đang mang nó.',
};
/* kỹ năng cần chọn mục tiêu sau khi tung thành công (trên đội người khác / người chơi / chồng bỏ…) */
export const PICK = { destroy: 'hero', destroyDraw: 'hero', steal: 'hero', ret: 'hero', pull1: 'player', pull2: 'player', trade: 'player', grabItem: 'item', digHero: 'dhero', digItem: 'ditem', digMagic: 'dmagic', digChal: 'dchal', digAny: 'dany' };

/* 48 anh hùng: [khoá, hệ, tên, điểm tung cần, kỹ năng, hình (biến thể)] */
const H = [
  ['g1', 'chien', 'Gấu Búa Tạ', 8, 'destroy'], ['g2', 'chien', 'Gấu Rìu Đôi', 9, 'destroyDraw'], ['g3', 'chien', 'Gấu Khiên Gai', 6, 'discAll'], ['g4', 'chien', 'Gấu Lửa', 7, 'ret'],
  ['g5', 'chien', 'Gấu Trận Mạc', 6, 'ap'], ['g6', 'chien', 'Gấu Gầm', 5, 'draw1'], ['g7', 'chien', 'Gấu Thép', 10, 'steal'], ['g8', 'chien', 'Gấu Khiêng Đá', 8, 'draw2'],
  ['r1', 'hove', 'Rùa Mai Sắt', 6, 'shield'], ['r2', 'hove', 'Rùa Gác Cổng', 5, 'digChal'], ['r3', 'hove', 'Rùa Trầm Tư', 7, 'draw2'], ['r4', 'hove', 'Rùa Lăn', 8, 'ret'],
  ['r5', 'hove', 'Rùa Ôm Khiên', 7, 'digAny'], ['r6', 'hove', 'Rùa Ngủ Đông', 5, 'draw1'], ['r7', 'hove', 'Rùa Đá Tảng', 9, 'destroy'], ['r8', 'hove', 'Rùa Già', 7, 'digHero'],
  ['c1', 'xa', 'Cáo Ná Thun', 6, 'grabItem'], ['c2', 'xa', 'Cáo Cung Dài', 8, 'destroy'], ['c3', 'xa', 'Cáo Trinh Sát', 5, 'drawItem'], ['c4', 'xa', 'Cáo Đặt Bẫy', 7, 'digItem'],
  ['c5', 'xa', 'Cáo Săn Mồi', 6, 'atkBuff'], ['c6', 'xa', 'Cáo Lẹ Chân', 6, 'ap'], ['c7', 'xa', 'Cáo Tên Lửa', 10, 'steal'], ['c8', 'xa', 'Cáo Mắt Tinh', 7, 'pull1'],
  ['m1', 'dao', 'Mèo Móc Túi', 6, 'pull1'], ['m2', 'dao', 'Mèo Đêm', 8, 'pull2'], ['m3', 'dao', 'Mèo Trộm Vặt', 5, 'draw1'], ['m4', 'dao', 'Mèo Bóng Tối', 10, 'steal'],
  ['m5', 'dao', 'Mèo Láu Cá', 7, 'trade'], ['m6', 'dao', 'Mèo Đuôi Dài', 9, 'pullAll'], ['m7', 'dao', 'Mèo Mặt Nạ', 6, 'grabItem'], ['m8', 'dao', 'Mèo Kẹo Ngọt', 7, 'discAll'],
  ['o1', 'phap', 'Cú Sao Băng', 7, 'draw2'], ['o2', 'phap', 'Cú Sách Cổ', 6, 'digMagic'], ['o3', 'phap', 'Cú Tiên Tri', 8, 'fetchMagic'], ['o4', 'phap', 'Cú Lốc Xoáy', 9, 'destroy'],
  ['o5', 'phap', 'Cú Trượng Lửa', 8, 'ret'], ['o6', 'phap', 'Cú Phù Thuỷ', 10, 'steal'], ['o7', 'phap', 'Cú Gương', 6, 'ap'], ['o8', 'phap', 'Cú Ngái Ngủ', 5, 'draw1'],
  ['t1', 'thi', 'Thỏ Đàn Tranh', 8, 'drawAp'], ['t2', 'thi', 'Thỏ Hát Ru', 7, 'discAll'], ['t3', 'thi', 'Thỏ Sáo Trúc', 5, 'draw1'], ['t4', 'thi', 'Thỏ Trống Cơm', 6, 'ap'],
  ['t5', 'thi', 'Thỏ Kể Chuyện', 7, 'digHero'], ['t6', 'thi', 'Thỏ Múa Lân', 8, 'drawPlay'], ['t7', 'thi', 'Thỏ Ca Trù', 9, 'pullAll'], ['t8', 'thi', 'Thỏ Nhạc Trưởng', 10, 'steal'],
];
/* hình: con thú của hệ + đạo cụ cầm tay (css/art.css: .px-b_<thú>, .px-p_<đạo cụ>) */
export const BEAST = { chien: 'gau', hove: 'rua', xa: 'cao', dao: 'meo', phap: 'cu', thi: 'tho' };
const PROP = { g1: 'hammer', g2: 'axe', g3: 'shield', g4: 'torch', g5: 'flag', g6: 'horn', g7: 'sword', g8: 'rock',
  r1: 'shield', r2: 'key', r3: 'book', r4: 'bomb', r5: 'sack', r6: 'candy', r7: 'rock', r8: 'scroll',
  c1: 'sling', c2: 'bow', c3: 'spy', c4: 'net', c5: 'dagger', c6: 'lantern', c7: 'arrow', c8: 'mirror',
  m1: 'sack', m2: 'dagger', m3: 'bell', m4: 'bomb', m5: 'scroll', m6: 'sling', m7: 'lantern', m8: 'candy',
  o1: 'wand', o2: 'book', o3: 'orb', o4: 'staff', o5: 'torch', o6: 'scroll', o7: 'mirror', o8: 'bell',
  t1: 'lute', t2: 'note', t3: 'flute', t4: 'drum', t5: 'scroll', t6: 'flag', t7: 'bell', t8: 'wand' };
export const HEROES = Object.fromEntries(H.map(([k, cls, name, roll, eff]) => [k, { k, t: 'hero', cls, name, roll, eff, prop: PROP[k] }]));

/* trưởng nhóm (mỗi người 1, chia ngẫu nhiên đầu ván) – tính là 1 hệ của đội, có nội tại */
export const LEADERS = {
  L_chien: { k: 'L_chien', t: 'leader', cls: 'chien', name: 'Gấu Đầu Đàn', fx: 'atk1', desc: '+1 khi bạn tung để diệt quái vật.' },
  L_hove:  { k: 'L_hove', t: 'leader', cls: 'hove', name: 'Rùa Trưởng Lão', fx: 'chal2', desc: '+2 khi bạn tung trong một lần Thách (thách người khác hay bị thách).' },
  L_xa:    { k: 'L_xa', t: 'leader', cls: 'xa', name: 'Cáo Thủ Lĩnh', fx: 'mod1', desc: 'Lá Cộng / Trừ bạn đánh ra mạnh thêm 1.' },
  L_dao:   { k: 'L_dao', t: 'leader', cls: 'dao', name: 'Mèo Đại Ca', fx: 'freeDraw', desc: 'Lần rút lá đầu tiên mỗi lượt không tốn hành động.' },
  L_phap:  { k: 'L_phap', t: 'leader', cls: 'phap', name: 'Cú Viện Trưởng', fx: 'magicDraw', desc: 'Mỗi lần bạn chơi được một lá Phép, rút 1 lá.' },
  L_thi:   { k: 'L_thi', t: 'leader', cls: 'thi', name: 'Thỏ Trưởng Đoàn', fx: 'use1', desc: '+1 khi bạn tung để dùng kỹ năng anh hùng.' },
};

/* vật phẩm: gắn lên anh hùng. own = gắn lên anh hùng của mình; curse = gắn lên anh hùng của người khác */
export const ITEMS = {
  i_luck:  { k: 'i_luck', t: 'item', name: 'Cỏ Bốn Lá', n: 2, own: true, use: 1, desc: 'Anh hùng mang nó +1 khi tung dùng kỹ năng.' },
  i_star:  { k: 'i_star', t: 'item', name: 'Ngôi Sao May', n: 1, own: true, use: 2, desc: 'Anh hùng mang nó +2 khi tung dùng kỹ năng.' },
  ...Object.fromEntries(CLS_KEYS.map(c => ['i_mask_' + c, { k: 'i_mask_' + c, t: 'item', name: 'Mặt Nạ ' + CLS[c].name, n: 1, own: true, mask: c, desc: `Anh hùng mang nó được tính là hệ ${CLS[c].name} (đủ hệ, điều kiện diệt quái).` }])),
  i_chain: { k: 'i_chain', t: 'item', name: 'Gông Nặng', n: 2, curse: true, use: -2, desc: 'Gắn lên anh hùng người khác: −2 khi nó tung dùng kỹ năng.' },
  i_sleep: { k: 'i_sleep', t: 'item', name: 'Bùa Ngủ', n: 1, curse: true, sleep: true, desc: 'Gắn lên anh hùng người khác: nó không dùng được kỹ năng.' },
};
/* phép: dùng một lần. need = cần chọn mục tiêu lúc đánh ra */
export const MAGIC = {
  x_bolt:  { k: 'x_bolt', t: 'magic', name: 'Sét Đánh', n: 2, eff: 'destroy', need: 'hero' },
  x_wind:  { k: 'x_wind', t: 'magic', name: 'Gió Cuốn', n: 1, eff: 'ret', need: 'hero' },
  x_book:  { k: 'x_book', t: 'magic', name: 'Sách Hay', n: 2, eff: 'draw2' },
  x_gift:  { k: 'x_gift', t: 'magic', name: 'Hội Chợ Quà', n: 1, eff: 'everyGive' },
  x_storm: { k: 'x_storm', t: 'magic', name: 'Bão Vật Phẩm', n: 1, eff: 'wipeItems' },
  x_soul:  { k: 'x_soul', t: 'magic', name: 'Gọi Hồn', n: 2, eff: 'digHero' },
  x_rush:  { k: 'x_rush', t: 'magic', name: 'Hăng Máu', n: 1, eff: 'ap2', desc: 'Được thêm 2 hành động lượt này.' },
  x_net:   { k: 'x_net', t: 'magic', name: 'Lưới Bắt', n: 1, eff: 'pull2', need: 'player' },
};
/* lá Cộng / Trừ: đánh vào bất kỳ lần tung nào (của ai cũng được), chọn một trong hai giá trị */
export const MODS = {
  p4:  { k: 'p4', t: 'mod', name: 'Cộng 4', vals: [4], n: 2 },
  p3:  { k: 'p3', t: 'mod', name: '+3 / −1', vals: [3, -1], n: 4 },
  p2:  { k: 'p2', t: 'mod', name: '+2 / −2', vals: [2, -2], n: 8 },
  p1:  { k: 'p1', t: 'mod', name: '+1 / −3', vals: [1, -3], n: 4 },
  m4:  { k: 'm4', t: 'mod', name: 'Trừ 4', vals: [-4], n: 2 },
};
export const CHAL = { ch: { k: 'ch', t: 'chal', name: 'Thách!', n: 12 } };

/* 15 quái vật: req = { n: số anh hùng trong đội, cls: hệ cần có (trưởng nhóm cũng tính) }, win = tung ≥ thì diệt được, lose = tung ≤ thì bị phạt */
export const MONSTERS = {
  q1:  { k: 'q1', name: 'Rồng Đất Sét', req: { n: 2 }, win: 8, lose: 4, pen: 'sac', fx: 'atk1', desc: '+1 khi bạn tung để diệt quái vật.' },
  q2:  { k: 'q2', name: 'Nhện Mắt Đỏ', req: { n: 2, cls: 'xa' }, win: 7, lose: 4, pen: 'disc2', fx: 'mod1', desc: 'Lá Cộng / Trừ bạn đánh ra mạnh thêm 1.' },
  q3:  { k: 'q3', name: 'Sên Nhầy Xanh', req: { n: 1 }, win: 7, lose: 3, pen: 'disc1', fx: 'draw1', desc: 'Đầu mỗi lượt của bạn rút thêm 1 lá.' },
  q4:  { k: 'q4', name: 'Sên Nhầy Đỏ', req: { n: 2, cls: 'chien' }, win: 8, lose: 4, pen: 'sac', fx: 'noDestroy', desc: 'Anh hùng của bạn không bị huỷ.' },
  q5:  { k: 'q5', name: 'Bóng Ma Đèn Lồng', req: { n: 2, cls: 'phap' }, win: 8, lose: 5, pen: 'disc2', fx: 'use1', desc: '+1 khi bạn tung để dùng kỹ năng anh hùng.' },
  q6:  { k: 'q6', name: 'Golem Rêu', req: { n: 3 }, win: 9, lose: 5, pen: 'sac', fx: 'noSteal', desc: 'Anh hùng của bạn không bị lấy mất.' },
  q7:  { k: 'q7', name: 'Dơi Hút Mật', req: { n: 2, cls: 'dao' }, win: 7, lose: 3, pen: 'disc1', fx: 'chal2', desc: '+2 khi bạn tung trong một lần Thách.' },
  q8:  { k: 'q8', name: 'Cua Gai Khổng Lồ', req: { n: 2, cls: 'hove' }, win: 8, lose: 4, pen: 'sac', fx: 'noRet', desc: 'Anh hùng của bạn không bị trả về tay.' },
  q9:  { k: 'q9', name: 'Nấm Độc Đi Bộ', req: { n: 1 }, win: 6, lose: 3, pen: 'disc2', fx: 'hand1', desc: 'Đầu mỗi lượt nếu tay dưới 3 lá thì rút thêm 1 lá.' },
  q10: { k: 'q10', name: 'Rắn Hai Đầu', req: { n: 3, cls: 'thi' }, win: 9, lose: 5, pen: 'sac', fx: 'ap1', desc: 'Mỗi lượt của bạn được thêm 1 hành động.' },
  q11: { k: 'q11', name: 'Đại Bàng Sấm', req: { n: 3, cls: 'xa' }, win: 9, lose: 4, pen: 'sac', fx: 'atk2', desc: '+2 khi bạn tung để diệt quái vật.' },
  q12: { k: 'q12', name: 'Hũ Mimic', req: { n: 2 }, win: 8, lose: 4, pen: 'disc2', fx: 'itemFree', desc: 'Chơi lá Vật phẩm không tốn hành động.' },
  q13: { k: 'q13', name: 'Bạch Tuộc Mực Tím', req: { n: 3, cls: 'phap' }, win: 10, lose: 5, pen: 'sac', fx: 'magicDraw', desc: 'Mỗi lần bạn chơi được một lá Phép, rút 1 lá.' },
  q14: { k: 'q14', name: 'Khủng Long Xương', req: { n: 3, cls: 'chien' }, win: 10, lose: 6, pen: 'sac', fx: 'heroFree', desc: 'Lá Anh hùng đầu tiên bạn chơi mỗi lượt không tốn hành động.' },
  q15: { k: 'q15', name: 'Hydra Ba Đầu', req: { n: 4 }, win: 11, lose: 6, pen: 'sac2', fx: 'use2', desc: '+2 khi bạn tung để dùng kỹ năng anh hùng.' },
};
export const PEN = { sac: 'Hy sinh 1 anh hùng của bạn.', sac2: 'Hy sinh 2 anh hùng của bạn.', disc1: 'Bỏ 1 lá trên tay.', disc2: 'Bỏ 2 lá trên tay.' };

export const ALL = { ...HEROES, ...LEADERS, ...ITEMS, ...MAGIC, ...MODS, ...CHAL, ...MONSTERS };
export const cardOf = k => ALL[k];
/* chồng rút: 48 anh hùng + vật phẩm + phép + cộng/trừ + thách */
export function deckKeys() {
  const out = Object.keys(HEROES);
  for (const T of [ITEMS, MAGIC, MODS, CHAL]) for (const c of Object.values(T)) for (let i = 0; i < (c.n || 1); i++) out.push(c.k);
  return out;
}
export const typeName = { hero: 'Anh hùng', leader: 'Trưởng nhóm', item: 'Vật phẩm', magic: 'Phép', mod: 'Cộng / Trừ', chal: 'Thách', monster: 'Quái vật' };
export function descOf(c) {
  if (!c) return '';
  if (c.t === 'hero') return `Tung ${c.roll}+: ${EFF[c.eff]}`;
  if (c.t === 'magic') return c.desc || EFF[c.eff];
  if (c.t === 'mod') return c.vals.length > 1 ? `Đánh vào lần tung bất kỳ: chọn ${c.vals.map(v => (v > 0 ? '+' : '−') + Math.abs(v)).join(' hoặc ')}.` : `Đánh vào lần tung bất kỳ: ${c.vals[0] > 0 ? '+' : '−'}${Math.abs(c.vals[0])}.`;
  if (c.t === 'chal') return 'Khi người khác chơi Anh hùng / Vật phẩm / Phép: hai bên cùng tung, bạn cao hơn thì lá đó bị bỏ.';
  if (c.req) return `Cần ${c.req.n} anh hùng${c.req.cls ? ' + 1 ' + CLS[c.req.cls].name : ''}. Tung ${c.win}+ diệt được · ${c.lose}− bị phạt: ${PEN[c.pen]} Diệt rồi: ${c.desc}`;
  return c.desc || '';
}
