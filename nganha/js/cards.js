// 🌌 Săn Thú Ngân Hà – dữ liệu lá bài (tự nghĩ). Cơ chế kiểu Siêu Thú Ngân Hà (Board Game VN) nhưng nhân vật, quái thú, siêu thú, bảo bối, sự kiện và hình đều tự làm.
export const EL = {
  lua: { name: 'Lửa', icon: '🔥', col: '#ff6a3d', gift: 'chk', giftTxt: '+1 🍗' },
  nuoc: { name: 'Nước', icon: '💧', col: '#3fa9f5', gift: 'card', giftTxt: '+1 bảo bối' },
  khi: { name: 'Khí', icon: '💨', col: '#9b7bff', gift: 'boost', giftTxt: '+1 sức mạnh trận sau' },
  dat: { name: 'Đất', icon: '🌱', col: '#5cbf4a', gift: 'pt', giftTxt: '+1 điểm' },
};
export const EL_KEYS = Object.keys(EL);
/* quái thú: 4 dáng × 4 hệ. pw = sức mạnh cộng thêm của quái; số lá mỗi loại */
export const SHAPES = { nhay: { pw: 0, n: 3 }, doi: { pw: 1, n: 3 }, mat: { pw: 1, n: 2 }, quy: { pw: 2, n: 2 } };
const MNAME = {
  lua: { nhay: 'Nhầy Dung Nham', doi: 'Dơi Than Hồng', mat: 'Mắt Mặt Trời', quy: 'Quỷ Nhí Pháo Hoa' },
  nuoc: { nhay: 'Nhầy Bong Bóng', doi: 'Dơi Sương Băng', mat: 'Mắt Thuỷ Triều', quy: 'Quỷ Nhí San Hô' },
  khi: { nhay: 'Nhầy Mây Bông', doi: 'Dơi Sấm Sét', mat: 'Mắt Cầu Vồng', quy: 'Quỷ Nhí Lốc Xoáy' },
  dat: { nhay: 'Nhầy Rêu Xanh', doi: 'Dơi Đá Cuội', mat: 'Mắt Hang Động', quy: 'Quỷ Nhí Xương Rồng' },
};
export const MONS = {};
for (const e of EL_KEYS) for (const sh of Object.keys(SHAPES)) MONS[e + '_' + sh] = { k: e + '_' + sh, el: e, sh, pw: SHAPES[sh].pw, n: SHAPES[sh].n, name: MNAME[e][sh] };
export const monKeys = () => Object.values(MONS).flatMap(m => Array(m.n).fill(m.k));
/* 4 siêu thú cổ đại – mỗi con một hệ */
export const BEASTS = {
  lua: { k: 'b_lua', el: 'lua', name: 'Phượng Lửa Tinh Vân', pw: 3 },
  nuoc: { k: 'b_nuoc', el: 'nuoc', name: 'Cá Voi Ngân Hà', pw: 3 },
  khi: { k: 'b_khi', el: 'khi', name: 'Rồng Mây Bão', pw: 3 },
  dat: { k: 'b_dat', el: 'dat', name: 'Rùa Núi Thiên Thạch', pw: 3 },
};
export const BEAST_NEED = 3, BEAST_PTS = 8;
/* 12 chiến binh cung hoàng đạo (tự nghĩ) */
export const CHARS = {
  aries: { k: 'aries', sym: '♈', name: 'Bạch Dương', el: 'lua', fx: 'cave3', desc: '+1 sức mạnh khi vào hang 3 🍗.' },
  taurus: { k: 'taurus', sym: '♉', name: 'Kim Ngưu', el: 'dat', fx: 'rich', desc: 'Bắt đầu ván thêm 2 🍗. Đầu ngày mà hết sạch 🍗 thì nhận thêm 2 🍗.' },
  gemini: { k: 'gemini', sym: '♊', name: 'Song Tử', el: 'khi', fx: 'reroll', desc: 'Mỗi ngày 1 lần: đổ lại xúc xắc của mình miễn phí.' },
  cancer: { k: 'cancer', sym: '♋', name: 'Cự Giải', el: 'nuoc', fx: 'refund', desc: 'Thua quái thú thì được hoàn lại số 🍗 đã trả.' },
  leo: { k: 'leo', sym: '♌', name: 'Sư Tử', el: 'lua', fx: 'beast2', desc: '+2 sức mạnh khi đấu Siêu thú cổ đại.' },
  virgo: { k: 'virgo', sym: '♍', name: 'Xử Nữ', el: 'dat', fx: 'freeRef', desc: 'Làm mới hang không tốn 🍗, và +1 sức mạnh khi đấu quái hệ Đất.' },
  libra: { k: 'libra', sym: '♎', name: 'Thiên Bình', el: 'khi', fx: 'summon', desc: 'Triệu hồi: khi nộp quái để đấu Siêu thú, 1 quái khác hệ cũng được tính.' },
  scorpio: { k: 'scorpio', sym: '♏', name: 'Bọ Cạp', el: 'nuoc', fx: 'sting', desc: 'Lá Gió Ngược của bạn trừ 3 thay vì 2.' },
  sagittarius: { k: 'sagittarius', sym: '♐', name: 'Nhân Mã', el: 'lua', fx: 'cave1', desc: '+1 sức mạnh khi vào hang 1 hoặc 2 🍗.' },
  capricorn: { k: 'capricorn', sym: '♑', name: 'Ma Kết', el: 'dat', fx: 'climb', desc: 'Thắng ở hang 2 hoặc 3 🍗 thì +1 điểm.' },
  aquarius: { k: 'aquarius', sym: '♒', name: 'Bảo Bình', el: 'khi', fx: 'learn', desc: 'Thua quái thú thì rút 1 bảo bối.' },
  pisces: { k: 'pisces', sym: '♓', name: 'Song Ngư', el: 'nuoc', fx: 'slip', desc: 'Mỗi trận, lá Gió Ngược đầu tiên đánh vào bạn mất tác dụng.' },
};
export const CHAR_KEYS = Object.keys(CHARS);
/* bảo bối: red = chỉ trong lượt mình, green = lúc nào cũng được (cả trận của người khác) */
export const TREAS = {
  kiem: { k: 'kiem', name: 'Kiếm Sao Băng', col: 'red', n: 8, win: 'self', desc: 'Trong trận của bạn: +2 sức mạnh.' },
  giay: { k: 'giay', name: 'Giày Gió', col: 'red', n: 5, win: 'self', desc: 'Trong trận của bạn: đổ lại xúc xắc của bạn.' },
  tui: { k: 'tui', name: 'Túi Đùi Gà', col: 'red', n: 6, win: 'turn', desc: 'Trong lượt của bạn: nhận 2 🍗.' },
  sach: { k: 'sach', name: 'Sách Sao', col: 'red', n: 5, win: 'turn', desc: 'Trong lượt của bạn: rút 2 bảo bối.' },
  khien: { k: 'khien', name: 'Bùa Hộ Mệnh', col: 'green', n: 6, win: 'any', desc: 'Lúc nào cũng được: +1 sức mạnh cho người đang đánh.' },
  gio: { k: 'gio', name: 'Gió Ngược', col: 'green', n: 8, win: 'other', desc: 'Trong trận của người khác: −2 sức mạnh của họ.' },
  bom: { k: 'bom', name: 'Bom Khói', col: 'green', n: 5, win: 'any', desc: 'Trận của bạn: quái đổ lại xúc xắc. Trận của người khác: họ đổ lại.' },
  gay: { k: 'gay', name: 'Gậy Phản Phép', col: 'green', n: 5, win: 'any', desc: 'Huỷ lá cộng / trừ sức mạnh vừa được người khác đánh ra trong trận.' },
};
export const treasKeys = () => Object.values(TREAS).flatMap(t => Array(t.n).fill(t.k));
/* sự kiện đầu ngày: 11 loại × 2 lá */
export const EVENTS = {
  tiec: { k: 'tiec', name: 'Tiệc Gà Rán', desc: 'Mọi người nhận 1 🍗.' },
  mua: { k: 'mua', name: 'Mưa Sao Băng', desc: 'Mọi người rút 1 bảo bối.' },
  nhat: { k: 'nhat', name: 'Nhật Thực', desc: 'Hôm nay quái thú trong hang +1 sức mạnh.' },
  loc: { k: 'loc', name: 'Gió Lốc Ngân Hà', desc: 'Cả 5 hang thay quái thú mới.' },
  yen: { k: 'yen', name: 'Ngày Bình Yên', desc: 'Hôm nay không ai được đánh Gió Ngược hay Bom Khói vào người khác.' },
  sale: { k: 'sale', name: 'Chợ Sao Giảm Giá', desc: 'Hôm nay hang 3 🍗 chỉ tốn 2 🍗 (vẫn được 3 điểm).' },
  thue: { k: 'thue', name: 'Thuế Đùi Gà', desc: 'Ai có nhiều 🍗 nhất (từ 3 trở lên) mất 1 🍗.' },
  tron: { k: 'tron', name: 'Siêu Thú Trở Mình', desc: 'Hôm nay Siêu thú cổ đại +1 sức mạnh.' },
  quay: { k: 'quay', name: 'Vòng Quay Bảo Bối', desc: 'Mỗi người chuyền 1 bảo bối ngẫu nhiên cho người bên trái.' },
  sao: { k: 'sao', name: 'Sao May Mắn', desc: 'Hôm nay thắng quái thú được thêm 1 điểm.' },
  doi: { k: 'doi', name: 'Bụng Đói Meo', desc: 'Ai đang không có 🍗 nhận 2 🍗.' },
};
export const eventKeys = () => Object.keys(EVENTS).flatMap(k => [k, k]);
export const CAVES = [1, 1, 2, 2, 3]; /* giá vào cửa = điểm chiến công */
