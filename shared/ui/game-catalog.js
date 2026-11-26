// 📚 Danh mục game cho "Đổi game trong phòng" (patch goto).
//   import { GAME_CATALOG, gameById, fitting, tooSmall, tooBig } from './game-catalog.js?v=4'
// Nguồn min/max (đọc từ code ở origin/main -187, KHÔNG đoán):
//   • makeNet({min, max}) trong <game>/js/main.js — 62 game.
//   • makeNet KHÔNG khai min/max → mặc định của simplenet (MIN = cfg.min || 2,
//     MAX = cfg.max || 8): giandiep, lieng, maubinh, xito, domino.
//   • <game>/js/def.js {game, min, max, bot} — 12 game: sam, baucua, noitu,
//     xuyenviet, khaihoang, daochinh, cuuho, xiecthu, dovui, hoisanquai,
//     lansau, vuatiengviet.
//   • net riêng (js/net.js + js/host.js + engine): bang 4–7 ("Cần 4–7 người chơi"),
//     uno 2–10 (MAX = 10, "Cần ít nhất 2"), typhu 2–8 (MAX = 8),
//     tamquoc 2–9 (MAX = 9, MIN = 2), meono 2–8 (MAX = 8),
//     masoi 5–16 (MIN_PLAYERS = 5, MAX_PLAYERS = 16), tienlen 2–4,
//     poker 2–9 (MAX_PLAYERS = 9), xidach 2–8, catte 2–6, bacao 2–8,
//     cangua 2–4 (MAX = 4), camel 2–8 (MIN/MAX_PLAYERS = 2/8),
//     scribble 2–12 (MAX_NORMAL = 12; chế độ Đông vui tới 30 —
//     catalog lấy 12 của chế độ thường; min 2 suy ra: cần người vẽ +
//     người đoán, trong code không có kiểm tra min).
// Tên hiển thị: shared/ui/stats.js GAME_NAMES (93/93 game trong GAMES đều có).
// Danh sách game: server/src/lobby.js GAMES (93 game — KHÔNG gồm 'solitaire'
// vì nó chỉ có trong GAME_NAMES chứ không mở phòng được).
// hasBot: true ở mọi game trừ scribble (không có bot.js / addBot).
// KHÔNG sửa đăng ký game hay số lượng game — file này chỉ đọc.
export const GAME_CATALOG = [
  { id: 'bang', name: 'CÀ ĐÙNG!', min: 4, max: 7, hasBot: true },
  { id: 'uno', name: 'UNÔ', min: 2, max: 10, hasBot: true },
  { id: 'typhu', name: 'Cờ Tỷ Phú', min: 2, max: 8, hasBot: true },
  { id: 'tamquoc', name: 'Tam Quốc Sát', min: 2, max: 9, hasBot: true },
  { id: 'meono', name: 'Mèo Nổ', min: 2, max: 8, hasBot: true },
  { id: 'masoi', name: 'Ma Sói', min: 5, max: 16, hasBot: true },
  { id: 'scribble', name: 'Scribble it!', min: 2, max: 12, hasBot: false },
  { id: 'tienlen', name: 'Tiến Lên', min: 2, max: 4, hasBot: true },
  { id: 'poker', name: 'Poker', min: 2, max: 9, hasBot: true },
  { id: 'xidach', name: 'Xì dách', min: 2, max: 8, hasBot: true },
  { id: 'catte', name: 'Cát tê', min: 2, max: 6, hasBot: true },
  { id: 'bacao', name: 'Ba Cào', min: 2, max: 8, hasBot: true },
  { id: 'cangua', name: 'Cờ cá ngựa', min: 2, max: 4, hasBot: true },
  { id: 'camel', name: 'Đua Lạc Đà', min: 2, max: 8, hasBot: true },
  { id: 'cotuong', name: 'Cờ tướng', min: 2, max: 2, hasBot: true },
  { id: 'thathaythach', name: 'Thật hay Thách', min: 2, max: 12, hasBot: true },
  { id: 'bantau', name: 'Bắn Tàu', min: 2, max: 2, hasBot: true },
  { id: 'baitan', name: 'Bài Tấn', min: 2, max: 6, hasBot: true },
  { id: 'loto', name: 'Lô tô', min: 2, max: 16, hasBot: true },
  { id: 'covua', name: 'Cờ vua', min: 2, max: 2, hasBot: true },
  { id: 'tala', name: 'Tá lả', min: 2, max: 4, hasBot: true },
  { id: 'cholon', name: 'Chợ Lớn', min: 3, max: 5, hasBot: true },
  { id: 'tusac', name: 'Tứ sắc', min: 2, max: 4, hasBot: true },
  { id: 'oanquan', name: 'Ô Ăn Quan', min: 2, max: 2, hasBot: true },
  { id: 'caro', name: 'Cờ Caro', min: 2, max: 2, hasBot: true },
  { id: 'tictactoe', name: 'TicTacToe', min: 2, max: 2, hasBot: true },
  { id: 'memory', name: 'Memory', min: 2, max: 2, hasBot: true },
  { id: 'covay', name: 'Cờ Vây', min: 2, max: 2, hasBot: true },
  { id: 'cothu', name: 'Cờ Thú', min: 2, max: 2, hasBot: true },
  { id: 'ranvathang', name: 'Rắn và Thang', min: 2, max: 4, hasBot: true },
  { id: 'sam', name: 'Sâm lốc', min: 2, max: 5, hasBot: true },
  { id: 'baucua', name: 'Bầu cua', min: 1, max: 8, hasBot: true },
  { id: 'noitu', name: 'Nối từ', min: 2, max: 8, hasBot: true },
  { id: 'xuyenviet', name: 'Tàu Xuyên Việt', min: 2, max: 5, hasBot: true },
  { id: 'khaihoang', name: 'Đảo Khai Hoang', min: 2, max: 4, hasBot: true },
  { id: 'daochinh', name: 'Đảo Chính', min: 2, max: 6, hasBot: true },
  { id: 'cuuho', name: 'Đội Cứu Hộ', min: 2, max: 4, hasBot: true },
  { id: 'xiecthu', name: 'Gánh Xiếc Thú', min: 2, max: 5, hasBot: true },
  { id: 'giandiep', name: 'Ai là Gián Điệp', min: 2, max: 8, hasBot: true },
  { id: 'codam', name: 'Cờ Đam', min: 2, max: 2, hasBot: true },
  { id: 'lieng', name: 'Liêng', min: 2, max: 8, hasBot: true },
  { id: 'maubinh', name: 'Mậu Binh', min: 2, max: 8, hasBot: true },
  { id: 'xito', name: 'Xì Tố', min: 2, max: 8, hasBot: true },
  { id: 'colat', name: 'Cờ Lật', min: 2, max: 2, hasBot: true },
  { id: 'domino', name: 'Domino', min: 2, max: 8, hasBot: true },
  { id: 'connect4', name: 'Connect 4', min: 2, max: 2, hasBot: true },
  { id: 'matthu', name: 'Mật Thư', min: 2, max: 8, hasBot: true },
  { id: 'avalon', name: 'Avalon', min: 5, max: 10, hasBot: true },
  { id: 'spyfall', name: 'Spyfall', min: 3, max: 8, hasBot: true },
  { id: 'sudoku', name: 'Sudoku', min: 1, max: 4, hasBot: true },
  { id: 'wordle', name: 'Wordle', min: 1, max: 4, hasBot: true },
  { id: 'domi', name: 'Dò Mìn', min: 1, max: 4, hasBot: true },
  { id: 's2048', name: '2048', min: 1, max: 4, hasBot: true },
  { id: 'matchu', name: 'Mạt Chược', min: 1, max: 4, hasBot: true },
  { id: 'loveletter', name: 'Love Letter', min: 2, max: 4, hasBot: true },
  { id: 'sushigo', name: 'Sushi Go', min: 2, max: 5, hasBot: true },
  { id: 'lay6', name: 'Lấy 6', min: 2, max: 10, hasBot: true },
  { id: 'saboteur', name: 'Saboteur', min: 3, max: 10, hasBot: true },
  { id: 'skull', name: 'Skull', min: 3, max: 6, hasBot: true },
  { id: 'hanabi', name: 'Hanabi', min: 2, max: 5, hasBot: true },
  { id: 'chan', name: 'Chắn', min: 2, max: 4, hasBot: true },
  { id: 'totom', name: 'Tổ Tôm', min: 4, max: 5, hasBot: true },
  { id: 'carcassonne', name: 'Carcassonne', min: 2, max: 5, hasBot: true },
  { id: 'azul', name: 'Azul', min: 2, max: 4, hasBot: true },
  { id: 'splendor', name: 'Splendor', min: 2, max: 4, hasBot: true },
  { id: 'conhay', name: 'Cờ Nhảy', min: 2, max: 6, hasBot: true },
  { id: 'backgammon', name: 'Backgammon', min: 2, max: 2, hasBot: true },
  { id: 'rummikub', name: 'Rummikub', min: 2, max: 4, hasBot: true },
  { id: 'quoridor', name: 'Quoridor', min: 2, max: 4, hasBot: true },
  { id: 'blokus', name: 'Blokus', min: 2, max: 4, hasBot: true },
  { id: 'scrabble', name: 'Scrabble', min: 2, max: 4, hasBot: true },
  { id: 'mastermind', name: 'Mastermind', min: 2, max: 2, hasBot: true },
  { id: 'ailatrieuphu', name: 'Ai Là Triệu Phú', min: 1, max: 2, hasBot: true },
  { id: 'haithat1gia', name: '2 Thật 1 Giả', min: 1, max: 6, hasBot: true },
  { id: 'doanhdong', name: 'Đoán Hành Động', min: 1, max: 6, hasBot: true },
  { id: 'wavelength', name: 'Wavelength', min: 1, max: 6, hasBot: true },
  { id: 'resistance', name: 'The Resistance', min: 1, max: 10, hasBot: true },
  { id: 'vetruyentin', name: 'Vẽ Truyền Tin', min: 1, max: 8, hasBot: true },
  { id: 'tetris', name: 'Tetris', min: 1, max: 4, hasBot: true },
  { id: 'ransanmoi', name: 'Rắn Săn Mồi', min: 1, max: 4, hasBot: true },
  { id: 'xepkeo', name: 'Xếp Kẹo', min: 1, max: 4, hasBot: true },
  { id: 'banbong', name: 'Bắn Bóng', min: 1, max: 4, hasBot: true },
  { id: 'nonogram', name: 'Nonogram', min: 1, max: 4, hasBot: true },
  { id: 'ghephinh', name: 'Ghép Hình', min: 1, max: 4, hasBot: true },
  { id: 'nhen', name: 'Nhện', min: 1, max: 4, hasBot: true },
  { id: 'bida8', name: 'Bida 8-ball', min: 1, max: 2, hasBot: true },
  { id: 'dapenalty', name: 'Đá Penalty', min: 2, max: 2, hasBot: true },
  { id: 'phitieu', name: 'Phi Tiêu', min: 2, max: 2, hasBot: true },
  { id: 'keobuabao', name: 'Kéo Búa Bao', min: 2, max: 2, hasBot: true },
  { id: 'dovui', name: 'Đố Vui', min: 1, max: 16, hasBot: true },
  { id: 'hoisanquai', name: 'Hội Săn Quái', min: 2, max: 6, hasBot: true },
  { id: 'lansau', name: 'Lặn Sâu', min: 1, max: 16, hasBot: true },
  { id: 'vuatiengviet', name: 'Vua Tiếng Việt', min: 1, max: 16, hasBot: true },
  { id: 'doannhac', name: 'Đoán Nhạc', min: 1, max: 16, hasBot: true },
  { id: 'honkem', name: 'Hơn Hay Kém', min: 1, max: 16, hasBot: true },
  { id: 'nganha', name: 'Săn Thú Ngân Hà', min: 2, max: 6, hasBot: true },
];

export const gameById = id => GAME_CATALOG.find(g => g.id === id) || null;
/** Game chứa được đúng n người (tính cả bot). */
export const fitting = n => GAME_CATALOG.filter(g => g.min <= n && n <= g.max);
/** Game cần thêm người: n < min (cần thêm min − n người nữa mới chơi được). */
export const tooSmall = n => GAME_CATALOG.filter(g => n < g.min);
/** Game bị thừa người: n > max (thừa n − max người — người thừa thành người xem). */
export const tooBig = n => GAME_CATALOG.filter(g => n > g.max);
/** Thiếu bao nhiêu người để chơi được game g với n người (0 nếu đủ). */
export const needFor = (g, n) => Math.max(0, g.min - n);
/** Thừa bao nhiêu người nếu chơi game g với n người (0 nếu vừa). */
export const extraFor = (g, n) => Math.max(0, n - g.max);
/** Chia cả danh mục theo n người hiện tại: { fit, need, extra }. */
export const classify = n => ({ fit: fitting(n), need: tooSmall(n), extra: tooBig(n) });
