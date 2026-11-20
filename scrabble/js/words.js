// 📖 Từ điển Scrabble — tiếng Việt KHÔNG dấu, chữ A–Z.
// Nguồn:
//  - Từ 5 chữ: danh sách WORDS của game Wordle trong repo
//    (wordle/js/words.js — 427 từ do người làm web tự tay chọn, đã kiểm
//    chứng là từ thật; import trực tiếp để khỏi chép lại sai).
//  - Từ 2–4 và 6 chữ: tự biên từ các từ tiếng Việt thông dụng
//    (từ đơn và từ ghép 1 âm tiết ghép lại, vd ANHEM, BANBE...).
// Từ điển này là "luật nhà" của bản Scrabble này: chỉ cần từ có trong
// danh sách mới được đặt lên bàn. Ô trống (*) đại diện bất kỳ chữ nào.
import { WORDS as WORDLE_WORDS } from '../../wordle/js/words.js';

/* ---------- từ 2 chữ (rất quan trọng: từ phụ + nối bàn) ---------- */
const W2 = [
  'AI', 'AO', 'AM', 'AN', 'AP', 'AT', 'AU',
  'BA', 'BE', 'BI', 'BO', 'BU',
  'CA', 'CO', 'CU',
  'DA', 'DI', 'DO', 'DU',
  'EM', 'EP', 'EO',
  'GA', 'GO',
  'HA', 'HE', 'HO',
  'LA', 'LE', 'LO', 'LU',
  'MA', 'ME', 'MO', 'MU',
  'NA', 'NO', 'NU',
  'OA', 'OI', 'OM', 'ON', 'OP', 'OT',
  'RA', 'RE', 'RU',
  'SA', 'TA', 'TE', 'TI', 'TO', 'TU',
  'UA', 'UI', 'UP', 'UT', 'UY',
  'XA', 'XE', 'XO',
];

/* ---------- từ 3 chữ ---------- */
const W3 = [
  'ANH', 'BAN', 'BAO', 'BAY', 'BEN', 'BIN', 'BOI', 'BON', 'BUA', 'BUN',
  'CAM', 'CAN', 'CAO', 'CAP', 'CHA', 'CHE', 'CHI', 'CHO', 'CHU', 'COI', 'CON', 'CUA', 'CUN',
  'DAM', 'DAN', 'DAO', 'DAT', 'DAY', 'DEM', 'DEN', 'DOI', 'DON', 'DUA', 'DUC',
  'GAN', 'GIA', 'GIO',
  'HAI', 'HAN', 'HAO', 'HAT', 'HEN', 'HOA', 'HOI', 'HON', 'HUE',
  'KEO', 'KHA', 'KHO', 'KHU',
  'LAM', 'LAN', 'LAO', 'LEO', 'LOI', 'LON', 'LUA', 'LUC', 'LUN',
  'MAI', 'MAU', 'MAY', 'MEN', 'MEO', 'MOI', 'MUA', 'MUC',
  'NAM', 'NAO', 'NHA', 'NHO', 'NOI', 'NON', 'NUA',
  'ONG', 'PHA', 'PHI', 'PHO', 'PHU',
  'QUA', 'QUE', 'QUY',
  'RAU', 'RAY', 'RUA',
  'SAN', 'SAO', 'SAU', 'SEN', 'SON', 'SUA',
  'TAM', 'TAN', 'TAO', 'TEN', 'THO', 'THU', 'TI', 'TIA', 'TIN', 'TOI', 'TOM', 'TRA', 'TRE', 'TRI', 'TRU', 'TU',
  'VAN', 'VAT', 'VE', 'VO', 'VUI', 'VU',
  'XA', 'XAU', 'XAY', 'XIN', 'XU',
  'YEN', 'YEU',
];

/* ---------- từ 4 chữ ---------- */
const W4 = [
  'BANG', 'BANH', 'BINH', 'BONG', 'BUON', 'BUOC',
  'CHAC', 'CHAM', 'CHAN', 'CHAO', 'CHAY', 'CHIN', 'CHUA', 'CONG', 'CUNG', 'CUOC', 'CUOI',
  'DIEM', 'DOAN', 'DUOC',
  'GIAN', 'GIAO', 'GIEO',
  'HANG', 'HIEU',
  'KHOA',
  'LANG', 'LIEN', 'LIEU', 'LONG', 'LUAN',
  'MINH', 'MONG', 'MUON',
  'NANG', 'NGAN', 'NHAN', 'NHAT', 'NUOC',
  'PHAN', 'PHAT', 'PHUC',
  'QUAN',
  'RONG', 'RUNG',
  'SANG', 'SONG',
  'THOI', 'THUY', 'TIEN', 'TRAI', 'TRAM', 'TRAN', 'TRAO', 'TUAN',
  'VANG', 'VONG', 'VUNG', 'VUON',
  'XANH', 'XUAN',
];

/* ---------- từ 5 chữ bổ sung (ngoài danh sách Wordle) ---------- */
const W5X = [
  'HOANG', 'THANH', 'QUANG', 'TRUNG', 'CUONG', 'HUONG', 'TRANG', 'KHANH',
  'DUONG', 'GIANG', 'QUYEN', 'HUYEN',
];

/* ---------- từ 6 chữ ---------- */
const W6 = [
  'TRUONG', 'PHUONG', 'NGUYEN', 'THUONG',
];

/* ---------- từ 7–8 chữ (tên tỉnh, nghề nghiệp, địa điểm — để bingo
   dùng hết 7 chữ trên khay là khả thi) ---------- */
const W7 = [
  'DONGNAM', 'DONGBAC', 'HOABINH', 'BACNINH', 'LANGSON', 'CAOBANG', 'LAICHAU', 'HAGIANG',
  'HOCSINH', 'NONGDAN', 'CHUTICH', 'YEUNUOC', 'DONGBAO', 'QUOCGIA', 'HANGXOM', 'GIADINH',
  'VOCHONG', 'DONGHOC', 'CUAHANG', 'NHAHANG', 'SIEUTHI', 'TAUTHUY',
];
const W8 = [
  'THANHPHO', 'GIAOVIEN', 'SINHVIEN', 'TRUONGHOC', 'BENHVIEN', 'CHIENTRANH',
  'THANHNIEN', 'NONGTHON', 'CONGNHAN', 'THUTUONG', 'BOTRUONG', 'BACGIANG',
  'DIENBIEN', 'THAIBINH', 'QUANGBINH',
];

const _all = [...W2, ...W3, ...W4, ...W5X, ...W6, ...W7, ...W8, ...WORDLE_WORDS]
  .map(w => String(w).toUpperCase().replace(/[^A-Z]/g, ''))
  .filter(w => w.length >= 2 && w.length <= 15);
/* bỏ trùng + sắp xếp để tra cứu ổn định */
export const WORDS = [...new Set(_all)].sort();
export const DICT = new Set(WORDS);
export const WORDS_BY_LEN = {};
for (const w of WORDS) (WORDS_BY_LEN[w.length] || (WORDS_BY_LEN[w.length] = [])).push(w);
export const MAX_WORD_LEN = Math.max(...WORDS.map(w => w.length));
