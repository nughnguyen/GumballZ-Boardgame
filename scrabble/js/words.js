// 📖 Từ điển Scrabble — tiếng Việt KHÔNG dấu, chữ A–Z.
// Nguồn:
//  - Từ 5 chữ: danh sách WORDS của game Wordle trong repo
//    (wordle/js/words.js — 427 từ do người làm web tự tay chọn, đã kiểm
//    chứng là từ thật; import trực tiếp để khỏi chép lại sai).
//  - Từ 2–4 và 6 chữ: tự biên từ các từ tiếng Việt thông dụng
//    (từ đơn và từ ghép 1 âm tiết ghép lại, vd ANHEM, BANBE...).
//  - Mở rộng (patch 20261119-50): kho từ của game Nối từ trong repo
//    (noitu/words*.txt — Hồ Ngọc Đức GPL + Wiktionary CC BY-SA +
//    cộng đồng): mỗi dòng là 1 từ ghép 2 âm tiết → nối lại thành 1 từ
//    (vd "anh em" → ANHEM, tối đa 10 chữ — bỏ các cụm dài kiểu ngoại lai
//    như APOSTERIORI), và mỗi âm tiết đơn cũng là 1 từ hợp lệ
//    (vd CHAU, DANG, KHAU — tối đa 7 chữ). Tổng ~45.000 từ.
//    Vì vậy từ điển này là "luật nhà" của bản Scrabble này: chỉ cần từ
//    có trong danh sách mới được đặt lên bàn. Ô trống (*) đại diện bất
//    kỳ chữ nào.
//  - Từ điển nạp thêm lúc chạy (loadExtraDict, main.js gọi trước khi mở
//    phòng): nếu không tải được (mất mạng/file://) thì vẫn chơi được
//    với 710 từ gốc. addWords() cập nhật cả DICT, WORDS, WORDS_BY_LEN
//    và tăng DICT_VERSION để bộ đệm chỉ mục trong engine.js hết hạn.
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
export let MAX_WORD_LEN = Math.max(...WORDS.map(w => w.length));
/* tăng mỗi lần addWords() thêm từ mới — engine.js dùng để hết hạn bộ đệm */
export let DICT_VERSION = 0;

/* bỏ dấu tiếng Việt + chỉ giữ A–Z, viết hoa */
export function normalizeWord(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toUpperCase().replace(/[^A-Z]/g, '');
}

/* thêm từ vào từ điển đang chạy (DICT + WORDS + WORDS_BY_LEN + MAX_WORD_LEN).
   Trả về số từ mới thêm được. Từ ngoài khoảng 2–15 chữ bị bỏ. */
export function addWords(list) {
  let added = 0;
  for (const raw of list || []) {
    const w = normalizeWord(raw);
    if (w.length < 2 || w.length > 15 || DICT.has(w)) continue;
    DICT.add(w);
    WORDS.push(w);
    (WORDS_BY_LEN[w.length] || (WORDS_BY_LEN[w.length] = [])).push(w);
    if (w.length > MAX_WORD_LEN) MAX_WORD_LEN = w.length;
    added++;
  }
  if (added) DICT_VERSION++;
  return added;
}

/* 1 file kho từ Nối từ → danh sách từ Scrabble: mỗi dòng 2 âm tiết cho
   1 từ ghép nối liền (≤10 chữ) + từng âm tiết đơn (2–7 chữ). */
export function wordsFromNoituText(text) {
  const out = [];
  for (const line of String(text || '').split('\n')) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    const joined = normalizeWord(parts.join(''));
    if (joined.length >= 2 && joined.length <= 10) out.push(joined);
    for (const p of parts) {
      const syl = normalizeWord(p);
      if (syl.length >= 2 && syl.length <= 7) out.push(syl);
    }
  }
  return out;
}

/* nạp kho từ Nối từ (4 file, cùng ?v= như noitu/js/main.js để dùng chung
   cache) rồi thêm vào từ điển. Trả về tổng số từ mới; lỗi mạng thì ném
   lỗi để phía gọi tự quyết (chơi tiếp với từ điển gốc). */
const NOITU_FILES = [
  ['words.txt', '?v=4'], ['words-wikt.txt', '?v=2'],
  ['words-gumballz.txt', '?v=1'], ['words-uts.txt', '?v=1'],
];
export async function loadExtraDict(base = '../noitu/') {
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
    ? AbortSignal.timeout(8000) : undefined;
  const texts = await Promise.all(NOITU_FILES.map(([f, v]) =>
    fetch(base + f + v, signal ? { signal } : {}).then(r => (r.ok ? r.text() : ''))));
  let added = 0;
  for (const t of texts) added += addWords(wordsFromNoituText(t));
  return added;
}
