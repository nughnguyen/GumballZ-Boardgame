// 🏅 Thống kê + thành tích của người chơi (lưu trên máy này – localStorage 'gumballz-stats'; ai đăng nhập thì shared/ui/sync.js đồng bộ thêm lên tài khoản).
// Mỗi net.js bọc handlers: this.h = watch(GAME, handlers, () => this.id) → tự đếm ván đã chơi / thắng khi ván kết thúc.
// Thêm game mới: thêm 1 dòng vào bảng OVER bên dưới (trả null khi ván CHƯA xong; { won: true/false/null } khi xong).
import { questWin } from '../js/daily.js?v=3'; /* 📅 Thử thách hôm nay: ghi ván thắng vào 2 việc thắng-ván của ngày */
import { earnGame, addXu } from './wallet.js?v=7'; /* 💰 Ví xu chung toàn web: thắng +10 xu, chơi +2 xu; thành tựu mở khoá +10/25/50/100 xu (xem shared/ui/wallet.js) */
import { LOCKED_PARTS, itemLabel } from '../js/avatar-rewards.js?v=4'; /* 🧸 Linh kiện mở theo cấp: lên cấp thì tự mở (xem record() bên dưới) */
import { gameXp, xpAdjOf } from '../titles.js'; /* XP cân theo game: poker/xidach/bacao ¼, catte ½ · ✏️ xpAdj: XP do Quản trị sửa tay (patch -167) */
const KEY = 'gumballz-stats';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
export const GAME_NAMES = { bang: 'CÀ ĐÙNG!', uno: 'UNÔ', typhu: 'Cờ Tỷ Phú', scribble: 'Scribble it!', meono: 'Mèo Nổ', tamquoc: 'Tam Quốc Sát', masoi: 'Ma Sói', camel: 'Đua Lạc Đà', cangua: 'Cờ cá ngựa', tienlen: 'Tiến Lên', catte: 'Cát tê', bacao: 'Ba Cào', xidach: 'Xì dách', poker: 'Poker', solitaire: 'Xếp bài', cotuong: 'Cờ tướng', thathaythach: 'Thật hay Thách', baitan: 'Bài Tấn', loto: 'Lô tô', covua: 'Cờ vua', tala: 'Tá lả', cholon: 'Chợ Lớn', tusac: 'Tứ sắc', bantau: 'Bắn Tàu', oanquan: 'Ô Ăn Quan', caro: 'Cờ Caro', tictactoe: 'TicTacToe', memory: 'Memory', covay: 'Cờ Vây', cothu: 'Cờ Thú', ranvathang: 'Rắn và Thang', sam: 'Sâm lốc', baucua: 'Bầu cua', noitu: 'Nối từ', xuyenviet: 'Tàu Xuyên Việt', khaihoang: 'Đảo Khai Hoang', daochinh: 'Đảo Chính', cuuho: 'Đội Cứu Hộ', xiecthu: 'Gánh Xiếc Thú', giandiep: 'Ai là Gián Điệp', codam: 'Cờ Đam', lieng: 'Liêng', maubinh: 'Mậu Binh', xito: 'Xì Tố', colat: 'Cờ Lật', domino: 'Domino', connect4: 'Connect 4', matthu: 'Mật Thư', avalon: 'Avalon', spyfall: 'Spyfall', sudoku: 'Sudoku', wordle: 'Wordle', domi: 'Dò Mìn', s2048: '2048', matchu: 'Mạt Chược', loveletter: 'Love Letter', sushigo: 'Sushi Go', lay6: 'Lấy 6', saboteur: 'Saboteur', skull: 'Skull', hanabi: 'Hanabi', chan: 'Chắn', totom: 'Tổ Tôm', carcassonne: 'Carcassonne', azul: 'Azul', splendor: 'Splendor', conhay: 'Cờ Nhảy', backgammon: 'Backgammon', rummikub: 'Rummikub', quoridor: 'Quoridor', blokus: 'Blokus', scrabble: 'Scrabble', mastermind: 'Mastermind', ailatrieuphu: 'Ai Là Triệu Phú', haithat1gia: '2 Thật 1 Giả', doanhdong: 'Đoán Hành Động', wavelength: 'Wavelength', resistance: 'The Resistance', vetruyentin: 'Vẽ Truyền Tin', tetris: 'Tetris', ransanmoi: 'Rắn Săn Mồi', xepkeo: 'Xếp Kẹo', banbong: 'Bắn Bóng', nonogram: 'Nonogram', ghephinh: 'Ghép Hình', nhen: 'Nhện', bida8: 'Bida 8-ball', dapenalty: 'Đá Penalty', phitieu: 'Phi Tiêu', keobuabao: 'Kéo Búa Bao', dovui: 'Đố Vui', hoisanquai: 'Hội Săn Quái', lansau: 'Lặn Sâu', vuatiengviet: 'Vua Tiếng Việt', doannhac: 'Đoán Nhạc', honkem: 'Hơn Hay Kém' };
const byId = (v, id) => (v.players || []).find(p => p.id === id);
const isMe = (v, me) => id => id === me;
const SIDE = { bang: { law: ['sheriff', 'deputy'], outlaw: ['outlaw'], renegade: ['renegade'] }, tamquoc: { lord: ['lord', 'loyal'], rebel: ['rebel'], spy: ['spy'] } };
const team = g => (v, me) => v.phase === 'ended' ? { won: (SIDE[g][v.winner] || []).includes((byId(v, me) || {}).role) } : null;
const single = (...ph) => (v, me) => ph.includes(v.phase) ? { won: v.winner === me } : null;
const chip = (v, me) => { if (v.phase !== 'end') return null; const r = (byId(v, me) || {}).res; return { won: r ? (r.delta > 0 ? true : r.delta < 0 ? false : null) : null }; };
const OVER = {
  bang: team('bang'), tamquoc: team('tamquoc'),
  uno: single('ended'), meono: single('ended'), tienlen: single('ended'), typhu: (v, me) => v.phase === 'over' ? { won: v.winTeam != null ? ((v.players || []).find(p => p.id === me) || {}).team === v.winTeam : v.winner === me } : null, /* chơi theo đội: cả đội cùng thắng */ cangua: single('over'),
  masoi: (v, me) => v.phase === 'ended' ? { won: !!(v.winner && (v.winner.ids || []).includes(me)) } : null,
  poker: (v, me) => v.phase === 'handover' || v.phase === 'over' ? { won: !!(v.result && v.result.won && v.result.won[me] > 0) } : null,
  xidach: chip, bacao: chip,
  catte: (v, me) => v.phase === 'handEnd' ? { won: !!(v.result && v.result.winner === me) } : null,
  camel: (v, me) => v.phase === 'ended' ? { won: !!(v.result && (v.result.winners || []).includes(me)) } : null,
  covua: (v, me) => v.phase === 'ended' && !v.puzzle ? { won: v.winner ? v.winner === me : null } : null,
  cotuong: (v, me) => v.phase === 'ended' && !v.puzzle ? { won: v.winner ? v.winner === me : null } : null, // hoà: không tính thắng thua
  cholon: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  tusac: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  tala: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  loto: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null,
  baitan: (v, me) => v.phase === 'ended' ? { won: v.opts && v.opts.team ? (v.winTeam == null ? null : ((v.players || []).find(p => p.id === me) || {}).team === v.winTeam) : (v.loser ? v.winner === me : null) } : null, /* cá nhân: về nhất mới tính thắng */
  thathaythach: v => v.phase === 'ended' ? { won: null } : null, // game vui, không có thắng thua
  bantau: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  oanquan: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null, /* online: watch() tự record khi ván kết thúc; local: main.js tự record() */
  caro: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* hoà (bàn đầy, không ai đủ 5 quân): không tính thắng thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  tictactoe: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* hoà (bàn đầy 9 ô): không tính thắng thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  memory: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* hoà (bằng cặp): không tính thắng thua; chế độ mạng do watch() tự record, chơi đơn do main.js tự record() (không qua mạng) */
  covay: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* komi 7,5 nên không hòa; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  cothu: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* không hòa; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  ranvathang: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* luôn có người về đúng ô 100 (hoặc xin thua); mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  sam: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  baucua: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  noitu: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  xuyenviet: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null,
  khaihoang: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null,
  daochinh: (v, me) => v.phase === 'ended' ? { won: v.winner === me } : null,
  xiecthu: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null,
  cuuho: v => v.phase === 'ended' ? { won: !!(v.result && v.result.win) } : null, /* chơi chung: cả đội cùng thắng / thua */
  scribble: (v, me) => v.phase === 'end' ? { won: ((v.players || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0] || {}).id === me } : null,
  giandiep: (v, me) => v.phase === 'ended' ? { won: (v.winnerIds || []).includes(me) } : null, /* mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  codam: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* có hòa; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  lieng: (v, me) => v.phase === 'ended' ? { won: (v.winnerIds || []).includes(me) } : null, /* thắng = có tên trong winnerIds; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  maubinh: (v, me) => v.phase === 'ended' ? { won: (v.winnerIds || []).includes(me) } : null, /* thắng = có tên trong winnerIds; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  xito: (v, me) => v.phase === 'ended' ? { won: (v.winnerIds || []).includes(me) } : null, /* thắng = có tên trong winnerIds; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  colat: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* có hòa; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  domino: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* có hòa (khóa ván hòa nút); mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  connect4: (v, me) => v.phase === 'ended' ? { won: v.winner ? v.winner === me : null } : null, /* có hòa; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  matthu: (v, me) => v.phase === 'ended' ? { won: (v.winnerIds || []).includes(me) } : null, /* thắng = đội mình thắng; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  avalon: (v, me) => v.phase === 'ended' ? { won: (v.winnerIds || []).includes(me) } : null, /* thắng = phe mình thắng; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  spyfall: (v, me) => v.phase === 'ended' ? { won: (v.winnerIds || []).includes(me) } : null, /* thắng = thắng trận (đủ số ván mục tiêu); mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  sudoku: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = giải xong trước / chơi đơn giải xong; thua = bị loại hoặc đối thủ về đích trước; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  wordle: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = đoán đúng trước / chơi đơn đoán đúng; thua = hết 6 lượt, xin thua, hoặc đối thủ đoán đúng trước; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  domi: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = mở hết ô an toàn trước / chơi đơn mở hết; thua = chạm mìn, xin thua, hoặc đối thủ về đích trước; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  s2048: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = đạt ô 2048 trước / chơi đơn đạt ô 2048; thua = kẹt lưới, xin thua, hoặc đối thủ đạt 2048/điểm cao hơn trước; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  matchu: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = gỡ hết 144 quân trước / chơi đơn gỡ hết; thua = kẹt hết lượt xào, xin thua, hoặc đối thủ gỡ hết/nhiều hơn trước; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  loveletter: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = đủ dấu Yêu trước / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  sushigo: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = nhiều điểm nhất / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  lay6: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = ít đầu bò nhất / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  saboteur: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = nhiều vàng nhất sau 3 vòng / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  skull: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = đủ 2 điểm hoặc là người sống sót cuối cùng / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  hanabi: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null, /* thắng cả đội khi ≥20 điểm; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  chan: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* ù = 6 chắn + 4 cạ (hoặc thập thành); mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  totom: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* ù = 21 lá thành phu + ≥1 lưng; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  carcassonne: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = nhiều điểm nhất khi hết chồng lá / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  azul: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = nhiều điểm nhất khi có người đủ 1 hàng ngang trên tường / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  splendor: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = nhiều điểm nhất khi có người đạt 15 điểm trở lên (hòa thì ít thẻ đã mua hơn) / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  conhay: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = đưa cả 10 bi về nhà đích trước tiên / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  backgammon: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = ra hết 15 quân trước tiên (gammon ×2 / backgammon ×3 / đối thủ từ chối gấp đôi) / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  rummikub: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = hết bài trên tay trước tiên, hoặc ít điểm bài nhất khi hết chồng / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  quoridor: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = tới hàng đích đối diện trước tiên / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  blokus: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = tổng điểm cao nhất khi tất cả hết nước đặt / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  scrabble: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = điểm cao nhất khi hết túi + 1 khay hết / mọi người đều bỏ lượt 2 vòng / đối thủ xin thua; mọi chế độ đều qua simplenet nên watch() tự record, main.js KHÔNG gọi record() tay */
  mastermind: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = đoán ra mã trước / hơn lượt tốt nhất khi cả 2 hết 10 lượt / đối thủ xin thua; hòa (cả 2 hết lượt mà bằng nhau) trả null — không tính thắng/thua */
  ailatrieuphu: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = 150 triệu (chơi đơn) / hơn tiền đối thủ (đua) / đối thủ xin thua; hòa đua trả null — không tính thắng/thua; chơi đơn trả lời sai thì losers có mình → thua */
  haithat1gia: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = nhiều điểm nhất (hòa điểm thì nhiều câu đoán đúng hơn, rồi ghế trước) / đối thủ xin thua; hòa trả null — không tính thắng/thua; chơi đơn dưới 8/10 thì losers có mình → thua */
  doanhdong: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = nhiều điểm nhất (hòa điểm và số câu đúng thì hòa) / đối thủ xin thua; hòa trả null — không tính thắng/thua; chơi đơn dưới 8/10 thì losers có mình → thua */
  wavelength: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = đạt 10đ trước hoặc nhiều điểm nhất (hòa điểm rồi số lần 4đ thì hòa) / đối thủ xin thua; hòa trả null — không tính thắng/thua; chơi đơn dưới 25/40 thì losers có mình → thua */
  resistance: (v, me) => v.phase === 'ended' ? { won: (v.winnerIds || []).includes(me) } : null, /* thắng = phe mình thắng (Kháng chiến thắng 3 nhiệm vụ, hoặc Gián điệp thắng 3 / 5 lần từ chối); không có hòa; xin thua = cả phe thua */
  vetruyentin: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = giữ từ ≥3/5 (chơi đơn) / hơn từ giữ được (đua) / nhiều điểm nhất (nhiều người); hòa trả null — không tính thắng/thua; chơi đơn giữ <3 thì losers có mình → thua */
  tetris: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = xoá đủ 100 hàng (chơi đơn) / xoá đủ 40 hàng trước (đua); hòa (cùng về đích, bằng điểm) trả null — không tính thắng/thua; chơi đơn chết trước 100 hàng thì losers có mình → thua */
  ransanmoi: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = dài 20 (chơi đơn) / dài 15 trước (đua); hòa (cùng về đích, bằng điểm/dài) trả null — không tính thắng/thua; chơi đơn chết trước dài 20 thì losers có mình → thua */
  xepkeo: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = đạt 10000 điểm trong 30 lượt (chơi đơn) / nhiều điểm nhất khi hết 30 lượt (đua); hòa (bằng điểm khi hết lượt) trả null — không tính thắng/thua; chơi đơn hết lượt chưa đủ 10000 thì losers có mình → thua */
  banbong: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = phá hết 60 gạch (chơi đơn) / phá hết trước hoặc nhiều điểm nhất sau 180s (đua); hòa (bằng điểm sau 180s) trả null — không tính thắng/thua; chơi đơn hết 3 mạng thì losers có mình → thua */
  nonogram: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = tô đủ hết ô đen (chơi đơn) / tô đủ trước hoặc % hoàn thành cao nhất sau 180s (đua); hòa (bằng % và bằng số lỗi) trả null — không tính thắng/thua; chơi đơn hết 3 mạng thì losers có mình → thua */
  ghephinh: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = ghép đủ cả bức tranh (chơi đơn) / ghép đủ trước hoặc nhiều mảnh đúng nhất sau 180s (đua); hòa (bằng số mảnh đúng) trả null — không tính thắng/thua; chơi đơn không có thua do hết giờ, chỉ xin thua */
  nhen: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = thu đủ 8 dãy K→A (chơi đơn) / thu đủ trước hoặc nhiều dãy hơn rồi nhiều điểm hơn sau 180s (đua); hòa (bằng dãy và bằng điểm) trả null — không tính thắng/thua; chơi đơn không có thua do hết giờ, chỉ xin thua */
  bida8: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null,
  dapenalty: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = ghi nhiều bàn hơn sau 5 vòng / thắng loạt luân lưu (đấu) / đủ 7/10 bàn (chơi đơn); hòa (quá 10 vòng luân lưu vẫn hòa) trả null; thua solo (dưới 7 bàn) có winner null + losers chứa mình nên trả false */ phitieu: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = về 0 trước bằng double-out (đấu) / đủ 880 điểm sau 30 phi (chơi đơn); hòa (quá 40 lượt/người) trả null; thua solo (dưới 880) có winner null + losers chứa mình nên trả false */ keobuabao: (v, me) => v.phase === 'ended' ? { won: v.winner === me ? true : (v.losers || []).includes(me) ? false : null } : null, /* thắng = thắng 3 vòng trước (đấu) / thắng best-of-5 trước máy (chơi đơn); không có hòa trận (vòng hòa đá lại); thua solo có winner là máy + losers chứa mình nên trả false */ dovui: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) ? true : false } : null, /* thắng = điểm cao nhất phòng (hòa điểm cao nhất → nhiều người cùng thắng); cả phòng 0 điểm thì winners=[] nên ai cũng thua */ hoisanquai: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) ? true : false } : null, lansau: (v, me) => v.phase === 'ended' ? { won: v.draw ? null : (v.winners || []).includes(me) } : null, /* Lặn Sâu: thắng = điểm cao nhất phòng; hòa (mọi người bằng điểm nhau ở đỉnh, điểm >0) trả null — vẫn tính 1 ván */ vuatiengviet: (v, me) => v.phase === 'ended' ? { won: v.draw ? null : (v.winners || []).includes(me) } : null, /* Vua Tiếng Việt: thắng = điểm cao nhất phòng; hòa (mọi người bằng điểm nhau ở đỉnh, điểm >0) trả null — vẫn tính 1 ván */ doannhac: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null, /* Đoán Nhạc: thắng = điểm cao nhất phòng; không ai ghi điểm thì không ai thắng */ honkem: (v, me) => v.phase === 'ended' ? { won: (v.winners || []).includes(me) } : null, /* Hơn Hay Kém: thắng = điểm cao nhất phòng; không ai ghi điểm thì không ai thắng */ /* winners luôn có ≥1 người khi kết thúc — không có hòa */ /* thắng = vào bi 8 cuối sau khi hết nhóm (đấu) / vào hết 15 bi + bi 8 (chơi đơn); hòa (hết 10 phút bằng bi và bằng lỗi, hoặc quá 150 cú) trả null */
};

export function load() { let s = null; try { s = JSON.parse(ls.get(KEY)); } catch (e) {} s = s && typeof s === 'object' ? s : {}; s.g = s.g || {}; s.ach = s.ach || {}; /* patch -103: trùng id rs-solo-win (The Resistance + Rắn Săn Mồi) — id của Rắn Săn Mồi đổi thành rsm-solo-win; ai đã mở id cũ bằng Rắn Săn Mồi (có thắng ở ransanmoi) được cấp lại id mới, giữ nguyên thời gian mở; ai mở bằng The Resistance thì giữ nguyên id cũ */ if (s.ach['rs-solo-win'] && (s.g.ransanmoi?.w || 0) > 0 && !s.ach['rsm-solo-win']) s.ach['rsm-solo-win'] = s.ach['rs-solo-win']; s.days = s.days || []; s.streak = s.streak || 0; s.best = s.best || 0; s.ev = s.ev || {}; s.dd = s.dd || { d: '', n: 0, k: [], w: [] }; s.ls = s.ls || 0; s.marks = s.marks || {}; s.cnt = s.cnt || {}; return s; }
const save = s => ls.set(KEY, JSON.stringify(s));
export function totals(s = load()) { let p = 0, w = 0, xp = 0, kinds = 0, top = 0; for (const g in s.g) { p += s.g[g].p || 0; w += s.g[g].w || 0; xp += gameXp(g, s.g[g].p || 0, Math.min(s.g[g].p || 0, s.g[g].w || 0)); if (s.g[g].p) kinds++; top = Math.max(top, s.g[g].w || 0); } xp = Math.max(0, xp + xpAdjOf(s)); /* ✏️ XP do Quản trị sửa tay (patch -167) — sync.js kéo về từ hồ sơ máy chủ */ let dl = null; try { dl = JSON.parse(ls.get('gumballz-login')); } catch (e) {} return { p, w, xp, kinds, top, days: s.days.length, streak: s.streak, best: s.best, night: !!s.night, g: s.g || {}, ev: s.ev || {}, dd: s.dd || { n: 0, k: [], w: [] }, ls: s.ls || 0, marks: s.marks || {}, dlStreak: Math.max(0, Math.floor(+((dl || {}).streak) || 0)), dlTotal: Math.max(0, Math.floor(+((dl || {}).total) || 0)) }; } /* 🎁 điểm danh: chuỗi + tổng ngày điểm danh (localStorage 'gumballz-login', máy chủ ghi đè khi đồng bộ) để xét thành tích dl-7 / dl-30 */
/* ---- ☁️ Hồ sơ máy chủ: tổng gộp (mốc cũ + đã xác minh + ván local đã đồng bộ), sync.js tải về từ /auth/profile ----
   P.g = mốc cũ (legacy, đóng băng) + ván đã xác minh + ván local do client gửi (từ bản nới lỏng 18/11/2026:
   đấu máy/chơi đơn được tính lại vào máy chủ, có giới hạn tốc độ) — dùng cho hồ sơ/bảng xếp hạng; P.v = riêng phần đã xác minh.
   Hồ sơ trên máy này (totals()) vẫn giữ mọi ván; khi hiện cần phân biệt: serverTotals() = số máy chủ công nhận,
   verifiedTotals() = chỉ phần máy chủ thấy tận mắt (ván online do máy chủ giữ),
   còn totals() - serverTotals() ≈ phần chỉ có trên máy này (chưa đồng bộ). */
const SRV_KEY = 'gumballz-stats-server';
export function saveServerSnapshot(P) { try { if (P && typeof P === 'object') ls.set(SRV_KEY, JSON.stringify({ ...P, _at: Date.now() })); } catch (e) {} }
export function loadServer() { let s = null; try { s = JSON.parse(ls.get(SRV_KEY)); } catch (e) {} return s && typeof s === 'object' ? s : null; }
export function serverTotals(P = loadServer()) {
  if (!P) return null;
  let p = 0, w = 0, xp = 0, kinds = 0, top = 0; const g = P.g || {};
  for (const k in g) { const gp = Math.max(0, Math.floor(+g[k].p || 0)), gw = Math.min(gp, Math.max(0, Math.floor(+g[k].w || 0))); p += gp; w += gw; xp += gameXp(k, gp, gw); if (gp) kinds++; top = Math.max(top, gw); }
  xp = Math.max(0, xp + xpAdjOf(P)); /* ✏️ XP do Quản trị sửa tay (patch -167) */
  const days = new Set([...(Array.isArray(P.days) ? P.days : []), ...((P.v && Array.isArray(P.v.days)) ? P.v.days : [])]).size;
  return { p, w, xp, kinds, top, days, best: Math.min(w, Math.max(0, Math.floor(+P.best || 0))), night: !!P.night, g, legacy: P.legacy || null, at: P._at || 0 };
}
export function verifiedTotals(P = loadServer()) {
  if (!P || !P.v) return null;
  const V = P.v; let p = 0, w = 0, kinds = 0, top = 0; const g = V.g || {};
  for (const k in g) { const gp = Math.max(0, Math.floor(+g[k].p || 0)), gw = Math.min(gp, Math.max(0, Math.floor(+g[k].w || 0))); p += gp; w += gw; if (gp) kinds++; top = Math.max(top, gw); }
  return { p, w, kinds, top, days: (V.days || []).length, best: Math.min(w, V.best || 0), night: !!V.night, g, plays: V.plays || 0 };
}
/* thành tích: máy chủ công nhận (mốc cũ + đã xác minh + ván local đã đồng bộ) và riêng phần đã xác minh;
   thành tích trong hồ sơ máy mà không nằm trong 2 danh sách này thì chỉ là local-only (chưa đồng bộ). */
export function serverAch(P = loadServer()) { if (!P) return []; return [...new Set([...Object.keys(P.ach || {}), ...Object.keys((P.v && P.v.ach) || {})])]; }
export function verifiedAch(P = loadServer()) { return P && P.v ? Object.keys(P.v.ach || {}) : []; }
export const ACHS = [
  { id: 'first', icon: '🎲', name: 'Ván Đầu Tiên', desc: 'Chơi xong 1 ván', xu: 10, ok: t => t.p >= 1 },
  { id: 'p10', icon: '🎮', name: 'Dân Chơi', desc: 'Chơi 10 ván', xu: 25, ok: t => t.p >= 10, of: t => [t.p, 10] },
  { id: 'p50', icon: '🔥', name: 'Cày Cuốc', desc: 'Chơi 50 ván', xu: 50, ok: t => t.p >= 50, of: t => [t.p, 50] },
  { id: 'p200', icon: '👑', name: 'Huyền Thoại Sảnh', desc: 'Chơi 200 ván', xu: 50, ok: t => t.p >= 200, of: t => [t.p, 200] },
  { id: 'w1', icon: '🏆', name: 'Thắng Đầu Tay', desc: 'Thắng 1 ván', xu: 10, ok: t => t.w >= 1 },
  { id: 'w10', icon: '🥇', name: 'Cao Thủ', desc: 'Thắng 10 ván', xu: 25, ok: t => t.w >= 10, of: t => [t.w, 10] },
  { id: 'w50', icon: '💎', name: 'Trùm Cuối', desc: 'Thắng 50 ván', xu: 50, ok: t => t.w >= 50, of: t => [t.w, 50] },
  { id: 's3', icon: '⚡', name: 'Vào Guồng', desc: 'Thắng 3 ván liên tiếp', xu: 10, ok: t => t.best >= 3, of: t => [t.best, 3] },
  { id: 's5', icon: '🚀', name: 'Không Thể Cản', desc: 'Thắng 5 ván liên tiếp', xu: 25, ok: t => t.best >= 5, of: t => [t.best, 5] },
  { id: 'k5', icon: '🧭', name: 'Thử Cho Biết', desc: 'Chơi 5 game khác nhau', xu: 10, ok: t => t.kinds >= 5, of: t => [t.kinds, 5] },
  { id: 'k10', icon: '🍱', name: 'Nếm Đủ Vị', desc: 'Chơi 10 game khác nhau', xu: 25, ok: t => t.kinds >= 10, of: t => [t.kinds, 10] },
  { id: 'k15', icon: '🗂️', name: 'Sưu Tầm', desc: 'Chơi 15 game khác nhau', xu: 25, ok: t => t.kinds >= 15, of: t => [t.kinds, 15] },
  { id: 'm10', icon: '🎓', name: 'Chuyên Gia', desc: 'Thắng 10 ván cùng một game', xu: 25, ok: t => t.top >= 10, of: t => [t.top, 10] },
  { id: 'd3', icon: '☕', name: 'Khách Quen', desc: 'Chơi vào 3 ngày khác nhau', xu: 10, ok: t => t.days >= 3, of: t => [t.days, 3] },
  { id: 'd7', icon: '🏠', name: 'Người Nhà', desc: 'Chơi vào 7 ngày khác nhau', xu: 25, ok: t => t.days >= 7, of: t => [t.days, 7] },
  { id: 'night', icon: '🦉', name: 'Cú Đêm', desc: 'Chơi xong một ván lúc nửa đêm (0h–5h)', xu: 10, ok: t => t.night },
  /* --- thêm 20261116-14: mở rộng thành tựu --- */
  { id: 'p25', icon: '🕹️', name: 'Quen Tay', desc: 'Chơi 25 ván', xu: 25, ok: t => t.p >= 25, of: t => [t.p, 25] },
  { id: 'p100', icon: '💯', name: 'Trăm Ván', desc: 'Chơi 100 ván', xu: 50, ok: t => t.p >= 100, of: t => [t.p, 100] },
  { id: 'w25', icon: '🎖️', name: 'Thắng 25 Ván Sảnh', desc: 'Thắng 25 ván', xu: 50, ok: t => t.w >= 25, of: t => [t.w, 25] },
  { id: 'w100', icon: '💠', name: 'Thắng 100 Ván Sảnh', desc: 'Thắng 100 ván', xu: 100, ok: t => t.w >= 100, of: t => [t.w, 100] },
  { id: 's7', icon: '🌪️', name: 'Chuỗi 7', desc: 'Thắng 7 ván liên tiếp', xu: 50, ok: t => t.best >= 7, of: t => [t.best, 7] },
  { id: 's10', icon: '💥', name: 'Chuỗi 10', desc: 'Thắng 10 ván liên tiếp', xu: 50, ok: t => t.best >= 10, of: t => [t.best, 10] },
  { id: 'k20', icon: '🧳', name: 'Đi Khắp Sảnh', desc: 'Chơi 20 game khác nhau', xu: 25, ok: t => t.kinds >= 20, of: t => [t.kinds, 20] },
  { id: 'k24', icon: '🌍', name: 'Chơi Hết Mọi Game Sảnh', desc: 'Chơi cả 24 game', xu: 50, ok: t => t.kinds >= 24, of: t => [t.kinds, 24] },
  { id: 'k25', icon: '🪀', name: 'Đủ 25 Game Sảnh', desc: 'Chơi cả 25 game', xu: 50, ok: t => t.kinds >= 25, of: t => [t.kinds, 25] },
  { id: 'd14', icon: '📅', name: 'Nửa Tháng Sảnh', desc: 'Chơi vào 14 ngày khác nhau', xu: 25, ok: t => t.days >= 14, of: t => [t.days, 14] },
  { id: 'd30', icon: '🗓️', name: 'Cả Tháng Sảnh', desc: 'Chơi vào 30 ngày khác nhau', xu: 50, ok: t => t.days >= 30, of: t => [t.days, 30] },
  { id: 'lv5', icon: '⭐', name: 'Cấp 5 Sảnh', desc: 'Đạt cấp 5', xu: 25, ok: t => level(t).lv >= 5, of: t => [level(t).lv, 5] },
  { id: 'lv10', icon: '🌟', name: 'Cấp 10 Sảnh', desc: 'Đạt cấp 10', xu: 50, ok: t => level(t).lv >= 10, of: t => [level(t).lv, 10] },
  /* Bắn Tàu: mở khóa từ sự kiện trong ván (recordEvent), xem totals().ev.bt */
  { id: 'bt_sink1', icon: '🚢', name: 'Thợ Săn Tàu', desc: 'Đánh chìm tàu đầu tiên ở Bắn Tàu', xu: 10, ok: t => (t.ev.bt?.sinks || 0) >= 1, of: t => [t.ev.bt?.sinks || 0, 1] },
  { id: 'bt_sink2', icon: '💥', name: 'Song Sát', desc: 'Đánh chìm 2 tàu trong 1 ván Bắn Tàu', xu: 25, ok: t => (t.ev.bt?.sinkMax || 0) >= 2, of: t => [t.ev.bt?.sinkMax || 0, 2] },
  { id: 'bt_sink5', icon: '🌊', name: 'Làm Chủ Mặt Biển', desc: 'Đánh chìm cả 5 tàu trong 1 ván Bắn Tàu', xu: 50, ok: t => (t.ev.bt?.sinkMax || 0) >= 5, of: t => [t.ev.bt?.sinkMax || 0, 5] },
  { id: 'bt_streak3', icon: '🎯', name: 'Bắn Đâu Trúng Đó', desc: 'Chuỗi 3 phát trúng liên tiếp ở Bắn Tàu', xu: 10, ok: t => (t.ev.bt?.hitStreak || 0) >= 3, of: t => [t.ev.bt?.hitStreak || 0, 3] },
  { id: 'bt_streak5', icon: '🧨', name: 'Xạ Thủ Cừ Khôi', desc: 'Chuỗi 5 phát trúng liên tiếp ở Bắn Tàu', xu: 25, ok: t => (t.ev.bt?.hitStreak || 0) >= 5, of: t => [t.ev.bt?.hitStreak || 0, 5] },
  { id: 'bt_items', icon: '🎒', name: 'Đủ Đồ Chơi', desc: 'Dùng đủ 3 loại vật phẩm ở Bắn Tàu (Bẫy, Radar, Bom)', xu: 25, ok: t => ['trap', 'radar', 'nuke'].every(k => t.ev.bt?.items?.[k]), of: t => [['trap', 'radar', 'nuke'].filter(k => t.ev.bt?.items?.[k]).length, 3] },
  { id: 'bt_flawless', icon: '🛡️', name: 'Hạm Đội Bất Bại', desc: 'Thắng 1 ván Bắn Tàu mà không mất tàu nào', xu: 50, ok: t => (t.ev.bt?.flawless || 0) >= 1 },
  { id: 'bt_trap', icon: '🪤', name: 'Bẫy Sập', desc: 'Bẫy của bạn vô hiệu hoá 1 phát bắn của địch', xu: 10, ok: t => (t.ev.bt?.trap || 0) >= 1 },
  { id: 'bt_radar', icon: '📡', name: 'Radar Bắt Sóng', desc: 'Radar quét trúng vùng có tàu', xu: 10, ok: t => (t.ev.bt?.radarHit || 0) >= 1 },
  { id: 'bt_nukesink', icon: '☢️', name: 'Bom Chìm Tàu', desc: 'Bom hạt nhân đánh chìm 1 tàu', xu: 25, ok: t => (t.ev.bt?.nukeSink || 0) >= 1 },
  /* Ô Ăn Quan: mở khóa từ sự kiện trong ván (recordEvent), xem totals().ev.oq */
  { id: 'oq_quan1', icon: '👑', name: 'Ăn Quan Đầu Tiên', desc: 'Ăn 1 quân Quan ở Ô Ăn Quan', xu: 10, ok: t => (t.ev.oq?.quan || 0) >= 1, of: t => [t.ev.oq?.quan || 0, 1] },
  { id: 'oq_chain3', icon: '🔗', name: 'Ăn Dây 3 Ô', desc: 'Ăn dây 3 ô trở lên trong 1 nước ở Ô Ăn Quan', xu: 25, ok: t => (t.ev.oq?.chainMax || 0) >= 3, of: t => [t.ev.oq?.chainMax || 0, 3] },
  { id: 'oq_rescue', icon: '🛟', name: 'Cứu Dân Thành Công', desc: 'Cứu dân 1 lần ở Ô Ăn Quan', xu: 10, ok: t => (t.ev.oq?.rescues || 0) >= 1, of: t => [t.ev.oq?.rescues || 0, 1] },
  { id: 'oq_flawless', icon: '🛡️', name: 'Toàn Vẹn Đôi Quan', desc: 'Thắng 1 ván Ô Ăn Quan mà đối phương không ăn được Quan nào', xu: 50, ok: t => (t.ev.oq?.flawless || 0) >= 1 },
  { id: 'oq_bothquan', icon: '👑', name: 'Ăn Cả 2 Quan', desc: 'Ăn cả 2 quân Quan trong 1 ván Ô Ăn Quan', xu: 50, ok: t => (t.ev.oq?.bothQuan || 0) >= 1 },
  { id: 'oq_comeback', icon: '🌊', name: 'Lội Ngược Dòng', desc: 'Thắng 1 ván Ô Ăn Quan sau khi đã phải cứu dân', xu: 25, ok: t => (t.ev.oq?.comeback || 0) >= 1 },
  /* Cờ Caro: chuỗi thắng theo từng game (record() giữ g.st) + thắng nhanh (recordEvent 'end', data.moves) */
  { id: 'caro_streak3', icon: '✖️', name: 'Chuỗi Caro', desc: 'Thắng 3 ván Cờ Caro liên tiếp', xu: 10, ok: t => (t.g.caro?.st || 0) >= 3, of: t => [t.g.caro?.st || 0, 3] },
  { id: 'caro_win_fast', icon: '⚡', name: 'Thắng Nhanh', desc: 'Thắng 1 ván Cờ Caro dưới 30 nước', xu: 25, ok: t => (t.ev.cr?.fast || 0) >= 1 },
  /* TicTacToe: chuỗi thắng theo từng game (record() giữ g.st) + hòa máy Khó (recordEvent 'end') */
  { id: 'tictactoe_streak3', icon: '❌', name: 'Chuỗi TicTacToe', desc: 'Thắng 3 ván TicTacToe liên tiếp', xu: 10, ok: t => (t.g.tictactoe?.st || 0) >= 3, of: t => [t.g.tictactoe?.st || 0, 3] },
  { id: 'tictactoe_draw_hard', icon: '🤝', name: 'Hoà Máy Khó', desc: 'Hòa 1 ván TicTacToe với Máy Khó (minimax không thể thắng được)', xu: 50, ok: t => (t.ev.tt?.drawHard || 0) >= 1 },
  /* Memory: chuỗi thắng theo từng game (record() giữ g.st) + hoàn hảo / xong nhanh ở chơi đơn mức Vừa (recordEvent 'end', data.solo) */
  { id: 'memory_streak3', icon: '🃏', name: 'Chuỗi Memory', desc: 'Thắng 3 ván Memory liên tiếp', xu: 10, ok: t => (t.g.memory?.st || 0) >= 3, of: t => [t.g.memory?.st || 0, 3] },
  { id: 'memory_perfect', icon: '🧠', name: 'Trí Nhớ Hoàn Hảo', desc: 'Thắng chơi đơn Memory mức Vừa mà không lật trượt lần nào', xu: 50, ok: t => (t.ev.mm?.perfect || 0) >= 1 },
  { id: 'memory_fast', icon: '⏱️', name: 'Nhớ Siêu Tốc', desc: 'Xong bàn Memory 16 lá (mức Vừa) dưới 60 giây ở chơi đơn', xu: 25, ok: t => (t.ev.mm?.fast || 0) >= 1 },
  /* Cờ Vây: chuỗi thắng theo từng game (record() giữ g.st) + thắng bàn 19×19 / thắng cách biệt 20 điểm (recordEvent 'end', data.size/margin) */
  { id: 'covay_streak3', icon: '⚫', name: 'Chuỗi Cờ Vây', desc: 'Thắng 3 ván Cờ Vây liên tiếp', xu: 10, ok: t => (t.g.covay?.st || 0) >= 3, of: t => [t.g.covay?.st || 0, 3] },
  { id: 'covay_win19', icon: '🏯', name: 'Đại Bàn 19×19', desc: 'Thắng 1 ván Cờ Vây bàn 19×19', xu: 50, ok: t => (t.ev.cv?.win19 || 0) >= 1 },
  { id: 'covay_bigwin', icon: '🌊', name: 'Thắng Áp Đảo', desc: 'Thắng 1 ván Cờ Vây cách biệt từ 20 điểm trở lên', xu: 50, ok: t => (t.ev.cv?.bigwin || 0) >= 1 },
  /* Cờ Thú: chuỗi thắng theo từng game (record() giữ g.st) + Chuột ăn Voi / thắng bằng vào hang (recordEvent) */
  { id: 'cothu_streak3', icon: '🦁', name: 'Chuỗi Cờ Thú', desc: 'Thắng 3 ván Cờ Thú liên tiếp', xu: 10, ok: t => (t.g.cothu?.st || 0) >= 3, of: t => [t.g.cothu?.st || 0, 3] },
  { id: 'cothu_rat_elephant', icon: '🐀', name: 'Chuột Ăn Voi', desc: 'Dùng Chuột ăn được Voi ở Cờ Thú', xu: 25, ok: t => (t.ev.ct?.ratElephant || 0) >= 1 },
  { id: 'cothu_den_win', icon: '🚩', name: 'Vào Hang Thắng', desc: 'Thắng 1 ván Cờ Thú bằng cách vào hang địch', xu: 25, ok: t => (t.ev.ct?.denWin || 0) >= 1 },
  /* Rắn và Thang: chuỗi thắng theo từng game (record() giữ g.st) + leo thang lớn / trượt rắn lớn (recordEvent) */
  { id: 'rt_streak3', icon: '🎲', name: 'Chuỗi Rắn Và Thang', desc: 'Thắng 3 ván Rắn và Thang liên tiếp', xu: 10, ok: t => (t.g.ranvathang?.st || 0) >= 3, of: t => [t.g.ranvathang?.st || 0, 3] },
  { id: 'rt_ladder28', icon: '🪜', name: 'Thang Lớn 28→84', desc: 'Leo thang từ ô 28 lên ô 84 ở Rắn và Thang', xu: 25, ok: t => (t.ev.rt?.ladder28 || 0) >= 1 },
  { id: 'rt_snake87', icon: '🐍', name: 'Trượt Rắn', desc: 'Trượt rắn từ ô 87 xuống ô 24 ở Rắn và Thang', xu: 10, ok: t => (t.ev.rt?.snake87 || 0) >= 1 },
  /* --- thêm 20261118: thành tựu chung vui (tên/mô tả giữ nguyên, thương hiệu cũ → GumballZ Boardgame) ---
     Bỏ qua 5 cái: c-friend / c-friends5 (repo này không có danh sách bạn lưu local để đối chiếu), c-dress10 (không có bộ đếm đổi avatar),
     c-days30 (trùng điều kiện với d30 'Cả tháng' đã có), c-streak10 (trùng điều kiện với s10 'Chuỗi 10' đã có). */
  { id: 'c-lose5', icon: '🥲', name: 'Mai Thắng Bù', desc: 'Thua 5 ván liên tiếp', xu: 10, ok: t => (t.ls || 0) >= 5, of: t => [Math.min(t.ls || 0, 5), 5] },
  { id: 'c-comeback', icon: '🏆', name: 'Lội Ngược Dòng', desc: 'Thắng ngay sau chuỗi thua 5 ván', xu: 25, ok: t => !!(t.marks || {})['c-comeback'] },
  { id: 'c-day20', icon: '🧟', name: 'Cày Cả Ngày', desc: 'Chơi 20 ván trong một ngày', xu: 25, ok: t => (t.dd.n || 0) >= 20, of: t => [Math.min(t.dd.n || 0, 20), 20] },
  { id: 'c-day3g', icon: '🍠', name: 'Lang Thang', desc: 'Chơi 3 game khác nhau trong một ngày', xu: 10, ok: t => (t.dd.k || []).length >= 3, of: t => [Math.min((t.dd.k || []).length, 3), 3] },
  { id: 'c-dawn', icon: '🦉', name: 'Thức Khuya', desc: 'Thắng một ván lúc 0h–5h', xu: 10, ok: t => !!(t.marks || {})['c-dawn'] },
  { id: 'c-lose100', icon: '🎰', name: 'Thua 100 Ván Vẫn Cười', desc: 'Thua tổng cộng 100 ván', xu: 25, ok: t => Object.values(t.g).reduce((n, x) => n + (x.l || 0), 0) >= 100, of: t => [Math.min(Object.values(t.g).reduce((n, x) => n + (x.l || 0), 0), 100), 100] },
  { id: 'c-allgames', icon: '🧭', name: 'Nhà Thám Hiểm Sảnh', desc: 'Chơi đủ mọi game của GumballZ Boardgame', xu: 100, ok: t => t.kinds >= Object.keys(GAME_NAMES).length, of: t => [t.kinds, Object.keys(GAME_NAMES).length] },
  { id: 'c-win3g', icon: '🎯', name: 'Đa Năng', desc: 'Thắng 3 game khác nhau trong một ngày', xu: 10, ok: t => (t.dd.w || []).length >= 3, of: t => [Math.min((t.dd.w || []).length, 3), 3] },
  { id: 'c-play500', icon: '🎖️', name: 'Cày 500 Ván Sảnh', desc: 'Chơi tổng cộng 500 ván', xu: 50, ok: t => t.p >= 500, of: t => [t.p, 500] },
  { id: 'c-back', icon: '👋', name: 'Trở Lại', desc: 'Quay lại chơi sau 30 ngày vắng mặt', xu: 25, ok: t => !!(t.marks || {})['c-back'] },
  { id: 'c-weekend', icon: '🛋️', name: 'Cuối Tuần', desc: 'Chơi cả thứ Bảy lẫn Chủ nhật trong cùng một tuần', xu: 10, ok: t => !!(t.marks || {})['c-weekend'] },
  { id: 'c-quick', icon: '⚡', name: 'Tia Chớp Sảnh', desc: 'Thắng một ván chưa tới 2 phút', xu: 10, ok: t => !!(t.marks || {})['c-quick'] },
  { id: 'c-long', icon: '🕰️', name: 'Ván Dài Nhất Sảnh', desc: 'Một ván kéo dài hơn 1 tiếng', xu: 25, ok: t => !!(t.marks || {})['c-long'] },
  { id: 'c-crowd', icon: '🎪', name: 'Phòng Đông', desc: 'Chơi trong phòng từ 8 người trở lên', xu: 25, ok: t => !!(t.marks || {})['c-crowd'] },
  { id: 'c-firstloss', icon: '🫠', name: 'Khởi Đầu Hơi Xui', desc: 'Thua ván đầu tiên trên GumballZ Boardgame', xu: 10, ok: t => !!(t.marks || {})['c-firstloss'] },
  { id: 'c-w50', icon: '🥇', name: 'Trùm Cuối', desc: 'Thắng 50 ván một game bất kỳ', xu: 50, ok: t => t.top >= 50, of: t => [t.top, 50] },
  { id: 'c-win10g', icon: '🌈', name: 'Vạn Năng', desc: 'Thắng ít nhất 1 ván ở 10 game khác nhau', xu: 25, ok: t => Object.values(t.g).filter(x => (x.w || 0) >= 1).length >= 10, of: t => [Object.values(t.g).filter(x => (x.w || 0) >= 1).length, 10] },
  { id: 'c-newyear', icon: '🎆', name: 'Giao Thừa', desc: 'Chơi lúc đúng giao thừa (0h ngày 1/1)', xu: 25, ok: t => !!(t.marks || {})['c-newyear'] },
  /* --- thêm 20261118-17: bậc khó hơn (Nguyễn: thêm thành tựu + nâng độ khó; CHỈ THÊM id mới, không đổi ngưỡng
     cũ nên không thu hồi unlock nào — ai đã đủ điều kiện thì lần chơi/đồng bộ sau tự mở) --- */
  { id: 'p1000', icon: '🏯', name: 'Cày 1000 Ván Sảnh', desc: 'Chơi 1000 ván', xu: 100, ok: t => t.p >= 1000, of: t => [t.p, 1000] },
  { id: 'w200', icon: '🏆', name: 'Thắng 200 Ván Sảnh', desc: 'Thắng 200 ván', xu: 100, ok: t => t.w >= 200, of: t => [t.w, 200] },
  { id: 'w500', icon: '👑', name: 'Thắng 500 Ván Sảnh', desc: 'Thắng 500 ván', xu: 100, ok: t => t.w >= 500, of: t => [t.w, 500] },
  { id: 's15', icon: '🔥', name: 'Chuỗi 15', desc: 'Thắng 15 ván liên tiếp', xu: 100, ok: t => t.best >= 15, of: t => [t.best, 15] },
  { id: 's20', icon: '🌋', name: 'Chuỗi 20', desc: 'Thắng 20 ván liên tiếp', xu: 100, ok: t => t.best >= 20, of: t => [t.best, 20] },
  { id: 'k30', icon: '🗺️', name: 'Khám Phá 30 Game', desc: 'Chơi 30 game khác nhau', xu: 50, ok: t => t.kinds >= 30, of: t => [t.kinds, 30] },
  { id: 'k35', icon: '🧭', name: 'Khám Phá 35 Game', desc: 'Chơi 35 game khác nhau', xu: 50, ok: t => t.kinds >= 35, of: t => [t.kinds, 35] },
  { id: 'd60', icon: '🗓️', name: '60 Ngày Sảnh', desc: 'Chơi vào 60 ngày khác nhau', xu: 50, ok: t => t.days >= 60, of: t => [t.days, 60] },
  { id: 'd100', icon: '📆', name: '100 Ngày Sảnh', desc: 'Chơi vào 100 ngày khác nhau', xu: 100, ok: t => t.days >= 100, of: t => [t.days, 100] },
  { id: 'm25', icon: '🎖️', name: 'Thắng 25 Ván Một Game', desc: 'Thắng 25 ván cùng một game', xu: 50, ok: t => t.top >= 25, of: t => [t.top, 25] },
  { id: 'c-play1000', icon: '🏰', name: 'Ở Luôn Sảnh', desc: 'Chơi tổng cộng 1000 ván', xu: 100, ok: t => t.p >= 1000, of: t => [t.p, 1000] },
  { id: 'c-day50', icon: '🤖', name: 'Cày 50 Ván Một Ngày', desc: 'Chơi 50 ván trong một ngày', xu: 50, ok: t => (t.dd.n || 0) >= 50, of: t => [Math.min(t.dd.n || 0, 50), 50] },
  { id: 'c-win25g', icon: '🌟', name: 'Đa Năng Toàn Diện', desc: 'Thắng ít nhất 1 ván ở 25 game khác nhau', xu: 50, ok: t => Object.values(t.g).filter(x => (x.w || 0) >= 1).length >= 25, of: t => [Object.values(t.g).filter(x => (x.w || 0) >= 1).length, 25] },
  { id: 'c-lose500', icon: '🎲', name: 'Thua 500 Ván Vẫn Cười', desc: 'Thua tổng cộng 500 ván', xu: 50, ok: t => Object.values(t.g).reduce((n, x) => n + (x.l || 0), 0) >= 500, of: t => [Math.min(Object.values(t.g).reduce((n, x) => n + (x.l || 0), 0), 500), 500] },
];
/* thành tích theo từng game: thắng đầu tiên + 10 ván thắng; game không tính thắng thua thì chơi đầu tiên + 10 ván */
export const GAME_ICON = { bang: '🤠', uno: '🃏', typhu: '🏙️', scribble: '🎨', meono: '💣', tamquoc: '⚔️', masoi: '🐺', camel: '🐪', cangua: '🐴', tienlen: '🐷', catte: '🂡', bacao: '👑', xidach: '🃏', poker: '♠️', solitaire: '🃏', cotuong: '♟️', thathaythach: '🎯', baitan: '🃏', loto: '🎪', covua: '♟️', tala: '🀄', cholon: '🏮', tusac: '🀄', bantau: '🚢', oanquan: '🪨', caro: '✖️', tictactoe: '❌', memory: '🃏', covay: '⚫', cothu: '🦁', ranvathang: '🐍', sam: '🃏', baucua: '🎲', noitu: '🔤', xuyenviet: '🚂', khaihoang: '🏝️', daochinh: '🎭', cuuho: '🦸', xiecthu: '🎪', giandiep: '🕵️', codam: '🔴', lieng: '🎴', maubinh: '🀄', xito: '♣️', colat: '🔄', domino: '🎲', connect4: '🔴', matthu: '🔐', avalon: '🛡️', spyfall: '🕵️', sudoku: '🔢', wordle: '🟩', domi: '🧨', s2048: '2️⃣', matchu: '🀅', loveletter: '💌', sushigo: '🍣', lay6: '🐂', saboteur: '⛏️', skull: '💀', hanabi: '🎆', chan: '🀄', totom: '👴', carcassonne: '🏰', azul: '🎨', splendor: '💎', conhay: '⭐', backgammon: '🎲', rummikub: '🧩', quoridor: '🧱', blokus: '🟦', scrabble: '🔤', mastermind: '🧠', ailatrieuphu: '💰', haithat1gia: '🤥', doanhdong: '🎭', wavelength: '🌈', resistance: '🕶️', vetruyentin: '🖌️', tetris: '🟪', ransanmoi: '🍎', xepkeo: '🍬', banbong: '🏓', nonogram: '⬛', ghephinh: '🖼️', nhen: '🕷️', bida8: '🎱', dapenalty: '⚽', phitieu: '🎯', keobuabao: '✌️', dovui: '❓', hoisanquai: '🐾', lansau: '🤿', vuatiengviet: '👑', doannhac: '🎧', honkem: '📊' };
for (const [g, name] of Object.entries(GAME_NAMES)) {
  const ic = GAME_ICON[g] || '🎲';
  if (g === 'thathaythach') {
    ACHS.push({ id: 'p1_' + g, icon: ic, name, desc: `Chơi ván đầu tiên ở ${name}`, xu: 10, ok: t => (t.g[g]?.p || 0) >= 1 });
    ACHS.push({ id: 'p10_' + g, icon: ic, name, desc: `Chơi 10 ván ở ${name}`, xu: 25, ok: t => (t.g[g]?.p || 0) >= 10, of: t => [t.g[g]?.p || 0, 10] });
  } else {
    ACHS.push({ id: 'w1_' + g, icon: ic, name, desc: `Thắng ván đầu tiên ở ${name}`, xu: 10, ok: t => (t.g[g]?.w || 0) >= 1 });
    ACHS.push({ id: 'w10_' + g, icon: ic, name, desc: `Thắng 10 ván ở ${name}`, xu: 25, ok: t => (t.g[g]?.w || 0) >= 10, of: t => [t.g[g]?.w || 0, 10] });
  }
}
/* --- thêm 20261118: mẫu thành tựu theo từng game (5 mẫu × mỗi game; tên hiện = tên mẫu + tên game) ---
   Thêm 20261118-17: 3 mẫu bậc khó (g-w50, g-w100, g-p50) — Nguyễn: thêm thành tựu + nâng độ khó.
   Thật hay Thách không có thắng thua nên chỉ lấy mẫu không cần thắng (nw: 1); các mẫu còn lại không bao giờ mở được ở game đó nên không thêm (tránh thẻ khóa vĩnh viễn). */
const TPL = [
  { id: 'g-first', icon: '🎮', name: 'Khởi Đầu Huyền Thoại', desc: 'Chơi xong ván đầu tiên', xu: 10, ok: g => g.p >= 1, nw: 1 },
  { id: 'g-w5', icon: '😆', name: 'Ngũ Liên Thắng', desc: 'Thắng 5 ván', xu: 25, ok: g => g.w >= 5, of: g => [g.w, 5] },
  { id: 'g-w25', icon: '📈', name: 'Thăng Cấp Thần Tốc', desc: 'Thắng 25 ván', xu: 50, ok: g => g.w >= 25, of: g => [g.w, 25] },
  { id: 'g-w50', icon: '🏆', name: 'Cao Thủ Sảnh', desc: 'Thắng 50 ván', xu: 50, ok: g => g.w >= 50, of: g => [g.w, 50] },
  { id: 'g-w100', icon: '👑', name: 'Vô Địch', desc: 'Thắng 100 ván', xu: 100, ok: g => g.w >= 100, of: g => [g.w, 100] },
  { id: 'g-l10', icon: '💀', name: 'Thập Tử Nhất Sinh', desc: 'Thua 10 ván (vẫn chơi tiếp)', xu: 25, ok: g => (g.l || 0) >= 10, of: g => [g.l || 0, 10] },
  { id: 'g-s3', icon: '🔥', name: 'Tam Liên Thắng', desc: 'Thắng 3 ván liên tiếp', xu: 10, ok: g => (g.bs || 0) >= 3, of: g => [g.bs || 0, 3] },
  { id: 'g-p50', icon: '🕹️', name: 'Chơi Hoài Không Chán', desc: 'Chơi 50 ván', xu: 50, ok: g => g.p >= 50, of: g => [g.p, 50], nw: 1 },
];
for (const [g, name] of Object.entries(GAME_NAMES)) {
  const ts = g === 'thathaythach' ? TPL.filter(t => t.nw) : TPL;
  for (const tp of ts) ACHS.push({ id: `${tp.id}-${g}`, icon: tp.icon, name: `${tp.name} ${name}`, desc: tp.desc, xu: tp.xu, ok: t => tp.ok(t.g[g] || {}), ...(tp.of ? { of: t => tp.of(t.g[g] || {}) } : {}) });
}
/* --- thêm 20261118: thành tựu riêng từng game (chỉ những cái phát hiện được từ dữ liệu/view) ---
   ok: () => false = không suy ra được từ tổng, chỉ mở khóa trực tiếp lúc hết ván qua SP.end/tick bên dưới (SPECIAL không nằm trong ACHS mà mở bằng id).
   KHÔNG thêm: 59 cái còn để soon:true (chưa có cách phát hiện), tamquoc-kill2 (event chết của repo này không ghi kẻ giết),
   caro-hard / caro-block (view Caro của repo này không có opts.level/block). */
const SPECIAL = [
  { id: 'bang-sheriff', icon: '⭐', name: 'Lưới Trời Lồng Lộng', desc: 'Thắng khi là Cảnh sát trưởng', ok: () => false },
  { id: 'bang-renegade', icon: '🐺', name: 'Kẻ Phản Bội', desc: 'Thắng khi là Kẻ phản bội', ok: () => false },
  { id: 'bang-firstdie', icon: '⚰️', name: 'Yểu Mệnh', desc: 'Chết đầu tiên trong ván', ok: () => false },
  { id: 'bang-deputy', icon: '🤠', name: 'Nhân Vật Phụ', desc: 'Thắng khi là Phó cảnh sát', ok: () => false },
  { id: 'uno-plus4', icon: '😈', name: 'Tàn Nhẫn', desc: 'Đánh +4 khi người kế chỉ còn 1 lá', ok: () => false },
  { id: 'uno-draw10', icon: '🃏', name: 'Bốc 10 Lá', desc: 'Bốc từ 10 lá trở lên trong một lượt', ok: () => false },
  { id: 'uno-perfect', icon: '🍀', name: 'UNO', desc: 'Thắng khi chưa phải bốc lá nào ngoài lượt', ok: () => false },
  { id: 'uno-stack', icon: '📚', name: 'Cộng Minh', desc: 'Đánh 3 lá +2 / +4 liên tiếp dồn cho người khác', ok: () => false },
  { id: 'uno-forgot', icon: '🙊', name: 'Não Cá Vàng', desc: 'Quên hô UNÔ và bị phạt', ok: () => false },
  { id: 'typhu-jail3', icon: '⛓️', name: '3 Năm 6 Tháng Có Là Chi', desc: 'Vào tù 3 lần trong một ván', ok: () => false },
  { id: 'typhu-hotel', icon: '🏨', name: 'Khách Sạn 5 Sao', desc: 'Xây khách sạn đầu tiên', ok: () => false },
  { id: 'typhu-bankrupt', icon: '💼', name: 'Phân Lô Bán Nền Muôn Đời Thịnh', desc: 'Làm người khác phá sản', ok: () => false },
  { id: 'typhu-rent', icon: '💰', name: 'Thuê Khủng 2000', desc: 'Thu tiền thuê từ 2.000 trở lên một lần', ok: () => false },
  { id: 'typhu-broke1', icon: '📉', name: 'Đa Cấp Lỏ', desc: 'Phá sản đầu tiên', ok: () => false },
  { id: 'meo-defuse3', icon: '🧯', name: 'Gỡ Bom 3 Lần', desc: 'Gỡ bom 3 lần trong một ván', ok: () => false },
  { id: 'meo-firstboom', icon: '💥', name: 'Nổ Đầu Tiên', desc: 'Nổ đầu tiên trong ván', ok: () => false },
  { id: 'meo-last2', icon: '😸', name: 'Ấn E Để Gỡ Bom', desc: 'Thắng khi chỉ còn 2 người và chồng bài còn bom', ok: () => false },
  { id: 'meono-nope3', icon: '🙅', name: 'Biến Mày', desc: 'Đánh HUỶ KÈO! 3 lần trong một ván', ok: () => false },
  { id: 'tqs-lord', icon: '👑', name: 'Muôn Tâu Bệ Hạ', desc: 'Thắng khi là Chúa công', ok: () => false },
  { id: 'tqs-spy', icon: '🗡️', name: 'Giặc Ở Sau Lưng Ngài Kìa', desc: 'Thắng khi là Nội gián', ok: () => false },
  { id: 'tqs-firstdie', icon: '🪦', name: 'Kiếp Sau Làm Lại', desc: 'Chết đầu tiên trong ván', ok: () => false },
  { id: 'tamquoc-loyal', icon: '🛡️', name: 'Bệ Hạ Vạn Tuế', desc: 'Thắng khi là Trung thần', ok: () => false },
  { id: 'tamquoc-rebel', icon: '🔥', name: 'Phản Tặc', desc: 'Thắng khi là Phản tặc', ok: () => false },
  { id: 'ms-villager', icon: '🧑‍🌾', name: 'Ủa Ai Biết Gì Đâu', desc: 'Sống sót tới cuối khi là Dân làng', ok: () => false },
  { id: 'ms-wolfwin', icon: '🐺', name: 'Sói Cô Độc', desc: 'Thắng khi là Sói', ok: () => false },
  { id: 'ms-night1', icon: '🌙', name: 'Hoàng Hôn', desc: 'Bị cắn ngay đêm đầu', ok: () => false },
  { id: 'gd-spywin', icon: '🕵️', name: 'Gián Điệp Hoàn Hảo', desc: 'Thắng khi là Gián điệp', ok: () => false },
  { id: 'gd-firstvote', icon: '🎯', name: 'Mắt Thần', desc: 'Bắt đúng gián điệp ngay vòng bỏ phiếu đầu', ok: () => false },
  { id: 'gd-survive3', icon: '🛡️', name: 'Sống Sót Kỳ Cựu', desc: 'Sống sót qua 3 vòng bỏ phiếu', ok: () => false },
  { id: 'gd-perfect', icon: '✨', name: 'Trong Sạch Tuyệt Đối', desc: 'Dân thường thắng mà không ai bị loại oan', ok: () => false },
  { id: 'cd-blockwin', icon: '🧱', name: 'Bít Cửa', desc: 'Thắng bằng cách chặn đối thủ hết nước đi ở Cờ Đam', ok: () => false },
  { id: 'cd-kings3', icon: '👑', name: 'Tam Vương', desc: 'Phong 3 Vua trong 1 ván Cờ Đam', ok: () => false },
  { id: 'cd-jump3', icon: '🔁', name: 'Nhảy 3 Lần', desc: 'Ăn 3 quân trong 1 lượt ở Cờ Đam', ok: () => false },
  { id: 'cd-endgame3', icon: '⚔️', name: 'Tàn Cuộc 3 Quân', desc: 'Thắng 1 ván Cờ Đam khi chỉ còn 3 quân', ok: () => false },
  { id: 'lg-sap', icon: '🃏', name: 'Sáp Là Vua', desc: 'Thắng 1 ván Liêng bằng Sáp', ok: () => false },
  { id: 'lg-lieng', icon: '🌉', name: 'Liêng Đẹp Như Mơ', desc: 'Thắng 1 ván Liêng bằng Liêng', ok: () => false },
  { id: 'lg-anh', icon: '🎭', name: 'Ba Tây Oai Phong', desc: 'Thắng 1 ván Liêng bằng Ảnh', ok: () => false },
  { id: 'lg-noshow', icon: '🙈', name: 'Ăn Gà Không Cần Lật', desc: 'Thắng 1 ván Liêng vì mọi người khác đều Bỏ', ok: () => false },
  { id: 'mb-dragon', icon: '🐉', name: 'Sảnh Rồng', desc: 'Thắng 1 ván Mậu Binh bằng Sảnh rồng', ok: () => false },
  { id: 'mb-sweep', icon: '🧹', name: 'Quét Sạch', desc: 'Thắng cả 3 chi trước 1 đối thủ ở Mậu Binh', ok: () => false },
  { id: 'mb-quads', icon: '💎', name: 'Tứ Quý Cuối', desc: 'Thắng 1 ván Mậu Binh với Tứ quý ở chi Cuối', ok: () => false },
  { id: 'mb-special', icon: '🌟', name: 'Bài Đặc Biệt', desc: 'Thắng 1 ván Mậu Binh bằng bài đặc biệt', ok: () => false },
  { id: 'xt-sf', icon: '🌊', name: 'Thùng Phá Sảnh', desc: 'Thắng 1 ván Xì Tố bằng Thùng phá sảnh', ok: () => false },
  { id: 'xt-quads', icon: '💎', name: 'Tứ Quý Oai Phong', desc: 'Thắng 1 ván Xì Tố bằng Tứ quý', ok: () => false },
  { id: 'xt-allin', icon: '🔥', name: 'Tất Tay Thắng Lớn', desc: 'Thắng 1 ván Xì Tố khi đã Tất tay', ok: () => false },
  { id: 'xt-noshow', icon: '😎', name: 'Dọa Chạy Cả Bàn', desc: 'Thắng 1 ván Xì Tố vì mọi người khác đều Bỏ', ok: () => false },
  { id: 'cl-margin40', icon: '💪', name: 'Áp Đảo', desc: 'Thắng 1 ván Cờ Lật cách biệt 40 quân trở lên', ok: () => false },
  { id: 'cl-corners', icon: '👑', name: 'Bốn Góc Vàng', desc: 'Thắng 1 ván Cờ Lật khi giữ cả 4 góc bàn', ok: () => false },
  { id: 'cl-comeback', icon: '🌪️', name: 'Lật Ngược Thế Cờ', desc: 'Thắng 1 ván Cờ Lật sau khi bị dẫn 20 quân trở lên', ok: () => false },
  { id: 'cl-flip8', icon: '🌊', name: 'Lật Sóng Thần', desc: 'Lật 8 quân trở lên trong 1 nước ở Cờ Lật', ok: () => false },
  { id: 'dm-double6', icon: '🀄', name: 'Chốt Sáu Đôi', desc: 'Thắng 1 ván Domino bằng quân [6|6] cuối cùng', ok: () => false },
  { id: 'dm-block', icon: '🧱', name: 'Đóng Cửa', desc: 'Thắng 1 ván Domino khi ván bị khóa (ít nút nhất)', ok: () => false },
  { id: 'dm-sweep', icon: '💥', name: 'Quét Sạch', desc: 'Thắng 1 ván Domino được 40 điểm trở lên', ok: () => false },
  { id: 'dm-comeback', icon: '⚡', name: 'Lật Kèo', desc: 'Thắng 1 trận Domino sau khi từng bị dẫn 30 điểm trở lên', ok: () => false },
  { id: 'cf-fast', icon: '⚡', name: 'Thắng Chớp Nhoáng', desc: 'Thắng 1 ván Connect 4 trong 10 nước trở xuống', ok: () => false },
  { id: 'cf-vert', icon: '🧱', name: 'Cột Thép', desc: 'Thắng 1 ván Connect 4 bằng 4 quân dọc', ok: () => false },
  { id: 'cf-diag', icon: '📐', name: 'Chéo Thần Thánh', desc: 'Thắng 1 ván Connect 4 bằng 4 quân chéo', ok: () => false },
  { id: 'cf-block3', icon: '🛡️', name: 'Bức Tường Thép', desc: 'Chặn 3 nước thắng của đối thủ trong 1 ván Connect 4', ok: () => false },
  { id: 'mt-clue5', icon: '🎯', name: 'Gợi Ý Thần Sầu', desc: 'Thắng 1 ván Mật Thư bằng gợi ý 5 lá trở lên', ok: () => false },
  { id: 'mt-clean', icon: '✨', name: 'Sạch Bong', desc: 'Thắng 1 ván Mật Thư mà đội mình không đoán sai lá nào', ok: () => false },
  { id: 'mt-lastcard', icon: '🃏', name: 'Lá Cuối Định Mệnh', desc: 'Thắng 1 ván Mật Thư bằng cách đoán trúng lá điệp viên cuối cùng khi sát thủ còn ẩn', ok: () => false },
  { id: 'mt-comeback', icon: '🌪️', name: 'Lật Kèo Mật Thư', desc: 'Thắng 1 ván Mật Thư sau khi đội mình từng bị dẫn 4 lá trở lên', ok: () => false },
  { id: 'av-merlin', icon: '🧙', name: 'Merlin Bất Khả Xâm Phạm', desc: 'Thắng 1 ván Avalon với vai Merlin mà không bị ám sát', ok: () => false },
  { id: 'av-assassin', icon: '🗡️', name: 'Sát Thủ Bách Phát', desc: 'Thắng 1 ván Avalon với vai Sát thủ bằng cách đoán đúng Merlin', ok: () => false },
  { id: 'av-q4', icon: '⚔️', name: 'Nhiệm Vụ 4 Sinh Tử', desc: 'Thắng 1 ván Avalon từ 7 người trở lên (nhiệm vụ 4 cần 2 lần thất bại mới hỏng)', ok: () => false },
  { id: 'av-oberon', icon: '👤', name: 'Bóng Ma Oberon', desc: 'Thắng 1 ván Avalon với vai Oberon', ok: () => false },
  { id: 'sf-spyguess', icon: '🕵️', name: 'Đoán Đâu Trúng Đó', desc: 'Thắng 1 ván Spyfall khi là gián điệp bằng cách đoán đúng địa điểm', ok: () => false },
  { id: 'sf-survive', icon: '🥷', name: 'Ẩn Mình Hoàn Hảo', desc: 'Thắng 1 ván Spyfall khi là gián điệp mà không bị bắt (buộc tội nhầm người khác hoặc hòa phiếu)', ok: () => false },
  { id: 'sf-firstvote', icon: '🎯', name: 'Thám Tử Tài Ba', desc: 'Bỏ phiếu đúng gián điệp, gián điệp bị buộc tội rồi đoán sai địa điểm', ok: () => false },
  { id: 'sf-ghost', icon: '👻', name: 'Bóng Ma', desc: 'Thắng 1 ván Spyfall khi là người thường mà không ai bỏ phiếu cho mình', ok: () => false },
  { id: 'su-clean', icon: '🧹', name: 'Sạch Bong Không Tì Vết', desc: 'Giải xong 1 ván Sudoku Dễ mà không sai lần nào', ok: () => false },
  { id: 'su-hard', icon: '💪', name: 'Khó Cũng Xong', desc: 'Giải xong 1 ván Sudoku Khó', ok: () => false },
  { id: 'su-expert', icon: '🧠', name: 'Bậc Thầy Sudoku', desc: 'Giải xong 1 ván Sudoku Chuyên gia', ok: () => false },
  { id: 'su-nohint', icon: '🔍', name: 'Tự Lực Cánh Sinh', desc: 'Giải xong 1 ván Sudoku mà không dùng gợi ý nào', ok: () => false },
  { id: 'wd-quick', icon: '⚡', name: 'Đoán Thần Tốc', desc: 'Đoán đúng từ Wordle chỉ sau 1–2 lượt', ok: () => false },
  { id: 'wd-clean', icon: '✨', name: 'Không Một Ô Xám', desc: 'Thắng 1 ván Wordle mà không có chữ nào bị tô xám', ok: () => false },
  { id: 'wd-last', icon: '😅', name: 'Cân Não Phút Chót', desc: 'Đoán đúng từ Wordle ở lượt thứ 6 cuối cùng', ok: () => false },
  { id: 'wd-streak3', icon: '🔥', name: 'Chuỗi 3 Ván Thắng', desc: 'Thắng 3 ván Wordle liên tiếp', ok: () => false },
  { id: 'dm-clean', icon: '🧹', name: 'Dò Mìn Tay Không', desc: 'Thắng 1 ván Dò Mìn Dễ mà không cắm cờ lần nào', ok: () => false },
  { id: 'dm-medium', icon: '💪', name: 'Thợ Dò Trung Cấp', desc: 'Thắng 1 ván Dò Mìn Vừa', ok: () => false },
  { id: 'dm-hard', icon: '🧠', name: 'Bậc Thầy Gỡ Mìn', desc: 'Thắng 1 ván Dò Mìn Khó', ok: () => false },
  { id: 'dm-fast', icon: '⚡', name: 'Thần Tốc Gỡ Mìn', desc: 'Thắng 1 ván Dò Mìn Dễ trong chưa đầy 60 giây', ok: () => false },
  { id: 't4-512', icon: '🟧', name: 'Ô 512 Đầu Tiên', desc: 'Đạt ô 512 trong 1 ván 2048', ok: () => false },
  { id: 't4-1024', icon: '🟨', name: 'Ô 1024 Đầu Tiên', desc: 'Đạt ô 1024 trong 1 ván 2048', ok: () => false },
  { id: 't4-2048', icon: '👑', name: 'Chạm Tới 2048', desc: 'Đạt ô 2048 và thắng 1 ván 2048', ok: () => false },
  { id: 't4-score', icon: '💯', name: 'Điểm Cao 5000', desc: 'Đạt 5000 điểm trở lên trong 1 ván 2048', ok: () => false },
  { id: 'mc-clean', icon: '🧹', name: 'Mắt Tinh Tay Nhanh', desc: 'Thắng 1 ván Mạt Chược mà không dùng gợi ý lần nào', ok: () => false },
  { id: 'mc-noshuffle', icon: '🔀', name: 'Không Cần Xào Bài', desc: 'Thắng 1 ván Mạt Chược mà không xào bài lần nào', ok: () => false },
  { id: 'mc-fast', icon: '⚡', name: 'Gỡ Bài Thần Tốc', desc: 'Thắng 1 ván Mạt Chược trong chưa đầy 5 phút', ok: () => false },
  { id: 'mc-noundo', icon: '↩️', name: 'Một Mạch Tới Đích', desc: 'Thắng 1 ván Mạt Chược mà không hoàn tác lần nào', ok: () => false },
  { id: 'll-princess', icon: '👸', name: 'Công Chúa Trong Tay', desc: 'Thắng 1 ván Love Letter khi đang cầm Công chúa', ok: () => false },
  { id: 'll-sweep', icon: '🧹', name: 'Toàn Thắng', desc: 'Thắng 1 trận Love Letter mà thắng mọi vòng', ok: () => false },
  { id: 'll-countess', icon: '🎀', name: 'Nữ Bá Tước Khôn Ngoan', desc: 'Thắng 1 ván Love Letter sau khi đã bỏ Nữ bá tước', ok: () => false },
  { id: 'll-duel', icon: '⚔️', name: 'Đấu Tay Đôi', desc: 'Thắng 1 trận Love Letter 2 người', ok: () => false },
  { id: 'sg-sashimi', icon: '🍣', name: 'Bộ Ba Sashimi', desc: 'Thắng 1 ván Sushi Go khi đã đủ bộ 3 Sashimi', ok: () => false },
  { id: 'sg-tempura', icon: '🍤', name: 'Cặp Tempura', desc: 'Thắng 1 ván Sushi Go khi đã đủ cặp Tempura', ok: () => false },
  { id: 'sg-wasabi', icon: '🌶️', name: 'Wasabi Cay Nồng', desc: 'Thắng 1 ván Sushi Go khi đã ăn Nigiri trên Wasabi (nhân 3 điểm)', ok: () => false },
  { id: 'sg-pudding', icon: '🍮', name: 'Vua Pudding', desc: 'Thắng 1 ván Sushi Go khi có nhiều Pudding nhất', ok: () => false },
  { id: 'l6-clean', icon: '🧼', name: 'Sạch Bong', desc: 'Thắng 1 ván Lấy 6 mà không ăn lá phạt nào', ok: () => false },
  { id: 'l6-taker', icon: '🐂', name: 'Ôm Cả Dãy', desc: 'Thắng 1 ván Lấy 6 dù đã ôm trọn 1 dãy (5 lá phạt trở lên)', ok: () => false },
  { id: 'l6-crowd', icon: '👥', name: 'Đông Vui', desc: 'Thắng 1 ván Lấy 6 với 10 người chơi', ok: () => false },
  { id: 'l6-tight', icon: '🎯', name: 'Sít Sao', desc: 'Thắng 1 ván Lấy 6 với tối đa 3 đầu bò', ok: () => false },
  { id: 'sb-sab', icon: '😈', name: 'Kẻ Phá Hoại', desc: 'Thắng 1 trận Saboteur khi là kẻ phá hoại', ok: () => false },
  { id: 'sb-digger', icon: '⛏️', name: 'Thợ Đào Vàng', desc: 'Thắng 1 trận Saboteur khi là thợ đào vàng', ok: () => false },
  { id: 'sb-rich', icon: '💰', name: 'Đại Gia Vàng', desc: 'Thắng 1 trận Saboteur với ít nhất 8 cục vàng', ok: () => false },
  { id: 'sb-crowd', icon: '👥', name: 'Đông Vui', desc: 'Thắng 1 trận Saboteur với 10 người chơi', ok: () => false },
  { id: 'sk-clean', icon: '🌹', name: 'Tay Sạch', desc: 'Thắng 1 trận Skull mà không mất đĩa nào', ok: () => false },
  { id: 'sk-survivor', icon: '💀', name: 'Người Sống Sót', desc: 'Thắng 1 trận Skull khi là người sống sót cuối cùng', ok: () => false },
  { id: 'sk-comeback', icon: '💪', name: 'Lật Kèo', desc: 'Thắng 1 trận Skull dù đã mất ít nhất 1 đĩa', ok: () => false },
  { id: 'sk-crowd', icon: '👥', name: 'Đông Vui', desc: 'Thắng 1 trận Skull với 6 người chơi', ok: () => false },
  { id: 'hb-perfect', icon: '🎆', name: 'Pháo Hoa Hoàn Hảo', desc: 'Thắng 1 trận Hanabi với 25/25 điểm', ok: () => false },
  { id: 'hb-clean', icon: '✨', name: 'Không Một Vết Xước', desc: 'Thắng 1 trận Hanabi mà không mất ngòi nổ nào', ok: () => false },
  { id: 'hb-clutch', icon: '💪', name: 'Thắng Trong Gang Tấc', desc: 'Thắng 1 trận Hanabi khi chỉ còn 1 ngòi nổ', ok: () => false },
  { id: 'hb-crowd', icon: '👥', name: 'Đông Vui', desc: 'Thắng 1 trận Hanabi với 5 người chơi', ok: () => false },
  { id: 'ch-uu', icon: '🏆', name: 'Ù Chắn', desc: 'Thắng 1 trận Chắn bằng cách ù', ok: () => false },
  { id: 'ch-chiu', icon: '✋', name: 'Chíu Thần Sầu', desc: 'Thắng 1 trận Chắn có chíu', ok: () => false },
  { id: 'ch-thap', icon: '🔟', name: 'Thập Thành', desc: 'Thắng 1 trận Chắn với ù thập thành (10 chắn)', ok: () => false },
  { id: 'ch-crowd', icon: '👥', name: 'Bàn Đông Đủ', desc: 'Thắng 1 trận Chắn 4 người', ok: () => false },
  { id: 'tt-uu', icon: '🏆', name: 'Ù Tổ Tôm', desc: 'Thắng 1 trận Tổ Tôm bằng cách ù', ok: () => false },
  { id: 'tt-phu', icon: '🎴', name: 'Phu Đặc Biệt', desc: 'Thắng 1 trận Tổ Tôm có phu tôm hoặc phu lèo', ok: () => false },
  { id: 'tt-khanh', icon: '✋', name: 'Khàn Chíu', desc: 'Thắng 1 trận Tổ Tôm có khàn hoặc chíu', ok: () => false },
  { id: 'tt-crowd', icon: '👥', name: 'Bàn Đông Đủ', desc: 'Thắng 1 trận Tổ Tôm 5 người', ok: () => false },
  { id: 'ca-city', icon: '🏰', name: 'Thành Phố Lớn', desc: 'Thắng 1 trận Carcassonne với 1 thành phố hoàn thành từ 10 điểm trở lên', ok: () => false },
  { id: 'ca-monk', icon: '⛪', name: 'Tu Sĩ Tận Tâm', desc: 'Thắng 1 trận Carcassonne có hoàn thành 1 tu viện', ok: () => false },
  { id: 'ca-farm', icon: '🌾', name: 'Chúa Ruộng', desc: 'Thắng 1 trận Carcassonne với nhiều điểm ruộng nhất cuối ván', ok: () => false },
  { id: 'ca-crowd', icon: '👥', name: 'Bàn Đông Đủ', desc: 'Thắng 1 trận Carcassonne 5 người', ok: () => false },
  { id: 'az-row', icon: '➖', name: 'Một Hàng Ngang', desc: 'Thắng 1 trận Azul với 1 hàng ngang đủ trên tường', ok: () => false },
  { id: 'az-col', icon: '↕️', name: 'Một Cột Dọc', desc: 'Thắng 1 trận Azul với 1 cột dọc đủ trên tường', ok: () => false },
  { id: 'az-color', icon: '🌈', name: 'Đủ 5 Màu', desc: 'Thắng 1 trận Azul với đủ 5 gạch 1 màu trên tường', ok: () => false },
  { id: 'az-crowd', icon: '👥', name: 'Bàn Đông Đủ', desc: 'Thắng 1 trận Azul 4 người', ok: () => false },
  { id: 'sp-noble', icon: '👑', name: 'Quý Tộc Ghé Thăm', desc: 'Thắng 1 trận Splendor với ít nhất 1 quý tộc ghé thăm', ok: () => false },
  { id: 'sp-gold', icon: '🪙', name: 'Vàng Trong Tay', desc: 'Thắng 1 trận Splendor khi còn giữ ít nhất 1 vàng lúc kết thúc', ok: () => false },
  { id: 'sp-rich', icon: '💰', name: 'Đại Gia 20 Điểm', desc: 'Thắng 1 trận Splendor với 20 điểm trở lên', ok: () => false },
  { id: 'sp-crowd', icon: '👥', name: 'Bàn Đông Đủ', desc: 'Thắng 1 trận Splendor 4 người', ok: () => false },
  { id: 'chn-first', icon: '🥇', name: 'Về Nhà Đầu Tiên', desc: 'Thắng 1 trận Cờ Nhảy — đưa cả 10 bi về nhà đích trước tiên', ok: () => false },
  { id: 'chn-jump', icon: '🐇', name: 'Chuỗi Nhảy Dài', desc: 'Thắng 1 trận Cờ Nhảy với 1 chuỗi nhảy 4 bi trở lên trong 1 lượt', ok: () => false },
  { id: 'chn-fast', icon: '⚡', name: 'Về Nhà Thần Tốc', desc: 'Thắng 1 trận Cờ Nhảy trong chưa đầy 25 lượt đi của mình', ok: () => false },
  { id: 'chn-crowd', icon: '🌟', name: 'Ngôi Sao 6 Cánh', desc: 'Thắng 1 trận Cờ Nhảy 6 người', ok: () => false },
  { id: 'bg-gammon', icon: '🏆', name: 'Gammon', desc: 'Thắng 1 trận Backgammon kiểu Gammon (đối thủ chưa ra được quân nào)', ok: () => false },
  { id: 'bg-backgammon', icon: '💥', name: 'Backgammon', desc: 'Thắng 1 trận Backgammon kiểu Backgammon (đối thủ còn quân trên vạch hoặc trong sân nhà mình)', ok: () => false },
  { id: 'bg-hitter', icon: '🎯', name: 'Kẻ Đánh Trúng', desc: 'Đánh trúng 3 blot trở lên trong 1 trận Backgammon', ok: () => false },
  { id: 'bg-cuber', icon: '📈', name: 'Bậc Thầy Gấp Đôi', desc: 'Thắng 1 trận Backgammon có dùng cube gấp đôi (hoặc đối thủ từ chối gấp đôi)', ok: () => false },
  { id: 'rk-joker', icon: '🃏', name: 'Joker Thần Thánh', desc: 'Thắng 1 trận Rummikub mà đã đánh ít nhất 1 joker', ok: () => false },
  { id: 'rk-empty', icon: '🏆', name: 'Hết Bài', desc: 'Thắng 1 trận Rummikub bằng cách hết bài trên tay', ok: () => false },
  { id: 'rk-rush', icon: '⚡', name: 'Xếp Bài Thần Tốc', desc: 'Thắng 1 trận Rummikub trong 20 lượt đi của mình trở xuống', ok: () => false },
  { id: 'rk-sweep', icon: '💯', name: 'Trăm Điểm', desc: 'Thắng 1 trận Rummikub với 100 điểm trở lên', ok: () => false },
  { id: 'qd-fast', icon: '⚡', name: 'Chạy Nước Rút', desc: 'Thắng 1 trận Quoridor trong 10 lượt đi của mình trở xuống', ok: () => false },
  { id: 'qd-saver', icon: '🧱', name: 'Tiết Kiệm Tường', desc: 'Thắng 1 trận Quoridor mà còn ít nhất 5 tường', ok: () => false },
  { id: 'qd-close', icon: '😱', name: 'Sát Nút', desc: 'Thắng 1 trận Quoridor khi có đối thủ chỉ còn cách đích 1 ô', ok: () => false },
  { id: 'qd-spent', icon: '💥', name: 'Dùng Hết Tường', desc: 'Thắng 1 trận Quoridor mà đã dùng hết tường', ok: () => false },
  { id: 'bk-perfect', icon: '🌟', name: 'Hoàn Hảo', desc: 'Thắng 1 trận Blokus với tổng thưởng từ 20 trở lên', ok: () => false },
  { id: 'bk-full', icon: '🧩', name: 'Hết Mảnh Một Màu', desc: 'Thắng 1 trận Blokus mà đặt hết 21 mảnh của ít nhất 1 màu', ok: () => false },
  { id: 'bk-clean', icon: '✨', name: 'Sạch Bàn', desc: 'Thắng 1 trận Blokus mà chỉ còn 10 ô trở xuống chưa đặt', ok: () => false },
  { id: 'bk-quick', icon: '⚡', name: 'Nhanh Tay', desc: 'Thắng 1 trận Blokus 2 người mà chỉ đặt 35 mảnh trở xuống', ok: () => false },
  { id: 'sc-bingo', icon: '🎯', name: 'Bingo', desc: 'Thắng 1 trận Scrabble mà dùng hết 7 chữ trên khay trong 1 lượt (+50)', ok: () => false },
  { id: 'sc-wordy', icon: '📖', name: 'Mọt Chữ', desc: 'Thắng 1 trận Scrabble mà đặt được từ 10 từ trở lên', ok: () => false },
  { id: 'sc-big', icon: '🏆', name: 'Ván Lớn', desc: 'Thắng 1 trận Scrabble với từ 200 điểm trở lên', ok: () => false },
  { id: 'sc-crowd', icon: '👥', name: 'Đông Vui', desc: 'Thắng 1 trận Scrabble 4 người', ok: () => false },
  { id: 'mm-fast', icon: '⚡', name: 'Thần Đồng', desc: 'Thắng 1 trận Mastermind mà đoán ra mã chỉ trong 2 lượt đầu', ok: () => false },
  { id: 'mm-sharp', icon: '🔍', name: 'Đọc Mã', desc: 'Thắng 1 trận Mastermind mà đoán ra mã trong 4 lượt', ok: () => false },
  { id: 'mm-comeback', icon: '🔄', name: 'Lội Ngược Dòng', desc: 'Thắng 1 trận Mastermind khi đối thủ đã đoán được 3 chốt đen', ok: () => false },
  { id: 'mm-last', icon: '⏳', name: 'Tới Hơi Thở Cuối', desc: 'Thắng 1 trận Mastermind mà cả 2 đều hết 10 lượt đoán', ok: () => false },
  { id: 'al-150', icon: '💰', name: 'Triệu Phú', desc: 'Thắng 150 triệu — trả lời đúng cả 15 câu trong 1 ván Ai Là Triệu Phú', ok: () => false },
  { id: 'al-safe10', icon: '🛡️', name: 'Mốc An Toàn', desc: 'Lên tới câu 10 (mốc an toàn 14 triệu) trong 1 ván Ai Là Triệu Phú', ok: () => false },
  { id: 'al-streak', icon: '🔥', name: 'Chuỗi Nóng', desc: 'Trả lời đúng 5 câu liên tiếp trong 1 ván Ai Là Triệu Phú', ok: () => false },
  { id: 'al-race', icon: '🏁', name: 'Vượt Mặt Máy Khó', desc: 'Thắng 1 ván đua Ai Là Triệu Phú với máy Khó', ok: () => false },
  { id: 'ht-perfect', icon: '🎯', name: 'Hoàn Hảo', desc: 'Chơi đơn 2 Thật 1 Giả đoán đúng cả 10 bộ', ok: () => false },
  { id: 'ht-streak5', icon: '🔍', name: 'Chuỗi Thám Tử', desc: 'Đoán đúng câu giả 5 bộ liên tiếp trong 1 ván 2 Thật 1 Giả', ok: () => false },
  { id: 'ht-win4', icon: '👥', name: 'Đông Mà Vẫn Thắng', desc: 'Thắng 1 ván 2 Thật 1 Giả từ 4 người trở lên', ok: () => false },
  { id: 'ht-uncaught', icon: '🫥', name: 'Không Ai Bắt Được', desc: 'Thắng 1 ván 2 Thật 1 Giả nhiều người mà không bộ nào của mình bị bắt bài', ok: () => false },
  { id: 'dd-solo-win', icon: '🎭', name: 'Diễn Viên Solo', desc: 'Thắng 1 ván chơi đơn Đoán Hành Động (đoán đúng từ 8/10 từ)', ok: () => false },
  { id: 'dd-streak3', icon: '🔥', name: 'Chuỗi Đoán Đúng', desc: 'Đoán đúng 3 từ liên tiếp trong 1 ván Đoán Hành Động (cần thắng ván đó)', ok: () => false },
  { id: 'dd-actor', icon: '🎬', name: 'Diễn Viên Xuất Sắc', desc: 'Thắng 1 ván Đoán Hành Động 4+ người mà cả 3 từ mình diễn đều được đoán trúng', ok: () => false },
  { id: 'dd-win4', icon: '👥', name: 'Đông Mà Vẫn Thắng', desc: 'Thắng 1 ván Đoán Hành Động từ 4 người trở lên', ok: () => false },
  { id: 'wl-solo-win', icon: '🌈', name: 'Cân Bằng Hoàn Hảo', desc: 'Thắng 1 ván chơi đơn Wavelength (đạt từ 25/40 điểm)', ok: () => false },
  { id: 'wl-sharp', icon: '🎯', name: 'Đo Chính Xác', desc: 'Đạt 4 điểm ít nhất 2 lần trong 1 ván Wavelength nhiều người thắng', ok: () => false },
  { id: 'wl-win4', icon: '👥', name: 'Đông Mà Vẫn Thắng', desc: 'Thắng 1 ván Wavelength từ 4 người trở lên', ok: () => false },
  { id: 'wl-master', icon: '🏆', name: 'Bậc Thầy Thang Đo', desc: 'Thắng 1 ván chơi đơn Wavelength với từ 30 điểm trở lên', ok: () => false },
  { id: 'rs-solo-win', icon: '🛡️', name: 'Kháng Chiến Solo', desc: 'Thắng 1 ván chơi đơn The Resistance (phe Kháng chiến thắng 3 nhiệm vụ)', ok: () => false },
  { id: 'rs-spy-win', icon: '🕶️', name: 'Gián Điệp Xuất Sắc', desc: 'Thắng 1 ván The Resistance khi được chia vai Gián điệp', ok: () => false },
  { id: 'rs-win7', icon: '👥', name: 'Đông Mà Vẫn Thắng', desc: 'Thắng 1 ván The Resistance từ 7 người trở lên', ok: () => false },
  { id: 'rs-clean', icon: '✨', name: 'Thắng Sạch 3–0', desc: 'Thắng 1 ván The Resistance với phe Kháng chiến mà Gián điệp không thắng nhiệm vụ nào', ok: () => false },
  { id: 'vt-solo-win', icon: '🖌️', name: 'Vẽ Cho Máy Hiểu', desc: 'Thắng 1 ván chơi đơn Vẽ Truyền Tin (giữ được từ ≥3/5 lần)', ok: () => false },
  { id: 'vt-keep5', icon: '✨', name: 'Giữ Từ Trọn Vẹn', desc: 'Giữ nguyên được từ qua cả 5 lượt vẽ trong 1 ván thắng (chơi đơn hoặc đấu máy)', ok: () => false },
  { id: 'vt-win4', icon: '👥', name: 'Đông Mà Vẫn Thắng', desc: 'Thắng 1 ván Vẽ Truyền Tin từ 4 người trở lên', ok: () => false },
  { id: 'vt-guess3', icon: '👁️', name: 'Mắt Thần Đoán Tranh', desc: 'Đoán đúng 3 bức tranh trong 1 ván thắng Vẽ Truyền Tin (nhiều người)', ok: () => false },
  { id: 'tt-solo-win', icon: '🏆', name: 'Xếp Đủ 100 Hàng', desc: 'Thắng 1 ván chơi đơn Tetris (xoá đủ 100 hàng)', ok: () => false },
  { id: 'tt-tetris', icon: '💥', name: 'Tetris', desc: 'Xoá 4 hàng cùng lúc (Tetris) trong 1 ván thắng', ok: () => false },
  { id: 'tt-tetris2', icon: '🌟', name: 'Tetris Đôi', desc: 'Xoá 4 hàng cùng lúc 2 lần trong 1 ván thắng', ok: () => false },
  { id: 'tt-sprint-win', icon: '⚡', name: 'Về Đích Đầu Tiên', desc: 'Thắng 1 ván đua Tetris 40 hàng', ok: () => false },
  { id: 'rsm-solo-win', icon: '🐍', name: 'Mãng Xà 20', desc: 'Thắng 1 ván chơi đơn Rắn Săn Mồi (rắn dài 20)', ok: () => false },
  { id: 'rs-race-win', icon: '🏁', name: 'Vua Săn Mồi', desc: 'Thắng 1 ván đua Rắn Săn Mồi (dài 15 trước)', ok: () => false },
  { id: 'rs-fast', icon: '⚡', name: 'Tốc Độ Ánh Sáng', desc: 'Thắng 1 ván đua Rắn Săn Mồi dưới 45 giây', ok: () => false },
  { id: 'rs-win4', icon: '👥', name: 'Đông Mà Vẫn Thắng', desc: 'Thắng 1 ván đua Rắn Săn Mồi từ 4 người trở lên', ok: () => false },
  { id: 'xc-solo-win', icon: '🍬', name: 'Ngọt Lịm', desc: 'Thắng 1 ván chơi đơn Xếp Kẹo (đạt 10000 điểm trong 30 lượt)', ok: () => false },
  { id: 'xc-big-move', icon: '💥', name: 'Một Nước Bùng Nổ', desc: 'Đạt 5000 điểm trở lên trong 1 nước đổi trong 1 ván thắng Xếp Kẹo', ok: () => false },
  { id: 'xc-cascade10', icon: '✨', name: 'Dây Chuyền Vàng', desc: 'Dây chuyền nổ ×10 trở lên trong 1 ván thắng Xếp Kẹo', ok: () => false },
  { id: 'xc-race-win', icon: '🏁', name: 'Vua Tốc Độ', desc: 'Thắng 1 ván đua Xếp Kẹo (nhiều điểm nhất khi hết 30 lượt)', ok: () => false },
  { id: 'bb-solo-win', icon: '🏓', name: 'Phá Sạch Gạch', desc: 'Thắng 1 ván chơi đơn Bắn Bóng (phá hết 60 gạch)', ok: () => false },
  { id: 'bb-clean', icon: '✨', name: 'Không Rơi Bóng Nào', desc: 'Thắng 1 ván chơi đơn Bắn Bóng mà không mất mạng nào', ok: () => false },
  { id: 'bb-race-win', icon: '🏁', name: 'Tay Vợt Xuất Sắc', desc: 'Thắng 1 ván đua Bắn Bóng', ok: () => false },
  { id: 'bb-score500', icon: '💥', name: '500 Điểm Đua', desc: 'Thắng 1 ván đua Bắn Bóng với từ 500 điểm trở lên', ok: () => false },
  { id: 'ng-solo-win', icon: '⬛', name: 'Bức Tranh Hoàn Thành', desc: 'Thắng 1 ván chơi đơn Nonogram (tô đủ hết ô đen)', ok: () => false },
  { id: 'ng-clean', icon: '✨', name: 'Không Tô Sai Ô Nào', desc: 'Thắng 1 ván chơi đơn Nonogram mà không tô sai ô nào', ok: () => false },
  { id: 'ng-hard15', icon: '🏆', name: 'Bậc Thầy 15×15', desc: 'Thắng 1 ván chơi đơn Nonogram bảng Khó 15×15', ok: () => false },
  { id: 'ng-race-win', icon: '🏁', name: 'Tay Tô Nhanh Nhất', desc: 'Thắng 1 ván đua Nonogram', ok: () => false },
  { id: 'gh-solo-win', icon: '🖼️', name: 'Bức Tranh Hoàn Thành', desc: 'Thắng 1 ván chơi đơn Ghép Hình (ghép đủ cả bức tranh)', ok: () => false },
  { id: 'gh-fast5', icon: '⚡', name: 'Tay Nhanh Mắt Tinh', desc: 'Thắng 1 ván chơi đơn Ghép Hình bảng Khó 5×5 trong dưới 60 giây', ok: () => false },
  { id: 'gh-nopeek', icon: '🧠', name: 'Nhớ Như In', desc: 'Thắng 1 ván chơi đơn Ghép Hình mà không dùng lần xem mẫu nào', ok: () => false },
  { id: 'gh-race-win', icon: '🏁', name: 'Ghép Nhanh Nhất', desc: 'Thắng 1 ván đua Ghép Hình', ok: () => false },
  { id: 'nh-solo-win', icon: '🕷️', name: 'Nhện Bắt Đủ 8 Dãy', desc: 'Thắng 1 ván chơi đơn Nhện (thu đủ 8 dãy K→A)', ok: () => false },
  { id: 'nh-hard4', icon: '👑', name: 'Bậc Thầy 4 Chất', desc: 'Thắng 1 ván chơi đơn Nhện Khó 4 chất', ok: () => false },
  { id: 'nh-noundo', icon: '🧠', name: 'Không Cần Hoàn Tác', desc: 'Thắng 1 ván chơi đơn Nhện mà không dùng lần hoàn tác nào', ok: () => false },
  { id: 'nh-race-win', icon: '🏁', name: 'Nhện Nhanh Nhất', desc: 'Thắng 1 ván đua Nhện', ok: () => false },
  { id: 'bd-solo-win', icon: '🎱', name: 'Dọn Sạch Bàn', desc: 'Thắng 1 ván chơi đơn Bida 8-ball (vào hết 15 bi + bi 8)', ok: () => false },
  { id: 'bd-race-win', icon: '🏁', name: 'Vô Địch Bida', desc: 'Thắng 1 ván đấu Bida 8-ball', ok: () => false },
  { id: 'bd-clean', icon: '✨', name: 'Không Phạm Lỗi', desc: 'Thắng 1 ván Bida 8-ball mà không phạm lỗi nào', ok: () => false },
  { id: 'bd-sharp', icon: '🎯', name: 'Cú Đánh Sắc Bén', desc: 'Thắng 1 ván đấu Bida 8-ball chỉ sau tối đa 10 cú bắn', ok: () => false },
  { id: 'dp-solo-win', icon: '⚽', name: 'Vua Sút Phạt', desc: 'Thắng 1 ván chơi đơn Đá Penalty (ghi đủ 7/10 bàn)', ok: () => false },
  { id: 'dp-clean5', icon: '🧤', name: 'Tường Thành', desc: 'Thắng 1 ván đấu Đá Penalty chỉ lọt lưới tối đa 1 bàn', ok: () => false },
  { id: 'dp-comeback', icon: '🔥', name: 'Lội Ngược Dòng', desc: 'Thắng 1 ván đấu Đá Penalty sau khi từng bị dẫn', ok: () => false },
  { id: 'dp-streak5', icon: '🎯', name: 'Chuỗi 5 Bàn', desc: 'Thắng 1 ván đấu Đá Penalty với chuỗi ghi 5 bàn liên tiếp', ok: () => false },
  { id: 'ph-solo-win', icon: '🎯', name: 'Cao Thủ Phi Tiêu', desc: 'Thắng 1 ván chơi đơn Phi Tiêu (đủ 880 điểm sau 30 phi tiêu)', ok: () => false },
  { id: 'ph-180', icon: '💯', name: '180 Điểm', desc: 'Ném được 1 lượt 180 điểm (3 phi tiêu đều vào treble 20)', ok: () => false },
  { id: 'ph-match-win', icon: '🏆', name: 'Vô Địch Phi Tiêu', desc: 'Thắng 1 trận đấu Phi Tiêu (về 0 trước bằng double-out)', ok: () => false },
  { id: 'ph-ton3', icon: '🔥', name: 'Ba Lượt Trăm Điểm', desc: 'Thắng 1 trận đấu Phi Tiêu với ít nhất 3 lượt đạt 100 điểm trở lên', ok: () => false },
  { id: 'kbb-solo-win', icon: '✌️', name: 'Cao Thủ Oẳn Tù Tì', desc: 'Thắng 1 ván chơi đơn Kéo Búa Bao (best-of-5 trước máy)', ok: () => false },
  { id: 'kbb-match-win', icon: '🏆', name: 'Vô Địch Oẳn Tù Tì', desc: 'Thắng 1 trận đấu Kéo Búa Bao (thắng 3 vòng trước)', ok: () => false },
  { id: 'kbb-comeback', icon: '🔥', name: 'Lội Ngược Dòng', desc: 'Thắng 1 trận đấu Kéo Búa Bao sau khi từng bị dẫn 0–2 vòng', ok: () => false },
  { id: 'kbb-streak3', icon: '⚡', name: 'Thắng Trắng 3–0', desc: 'Thắng 1 trận đấu Kéo Búa Bao với chuỗi thắng 3 vòng liên tiếp', ok: () => false },
  { id: 'dv-solo-win', icon: '🎓', name: 'Cao Thủ Đố Vui', desc: 'Thắng 1 ván chơi đơn Đố Vui (1 người + 3 máy)', ok: () => false },
  { id: 'dv-perfect', icon: '💯', name: 'Không Sai Câu Nào', desc: 'Thắng 1 ván Đố Vui và trả lời đúng hết mọi câu', ok: () => false },
  { id: 'dv-streak5', icon: '🔥', name: 'Chuỗi 5 Câu Đúng', desc: 'Thắng 1 ván Đố Vui với chuỗi đúng liên tiếp ít nhất 5 câu', ok: () => false },
  { id: 'dv-champ', icon: '👑', name: 'Vô Địch Phòng Đông', desc: 'Thắng 1 ván Đố Vui có từ 8 người trở lên', ok: () => false },
  { id: 'ls-solo-win', icon: '🤿', name: 'Thợ Lặn Đơn Độc', desc: 'Thắng 1 ván Lặn Sâu chơi đơn với máy', ok: () => false },
  { id: 'ls-perfect', icon: '🌊', name: 'Chạm Đáy Rãnh', desc: 'Ghi đủ 700 điểm trong 1 ván Lặn Sâu (lặn sâu 7.000m)', ok: () => false },
  { id: 'ls-rare', icon: '💎', name: 'Thợ Săn Đáp Án Hiếm', desc: 'Thắng 1 ván Lặn Sâu với từ 3 đáp án 85 điểm trở lên', ok: () => false },
  { id: 'ls-deep', icon: '🧜', name: 'Kình Ngư Biển Sâu', desc: 'Thắng 1 ván Lặn Sâu với từ 500 điểm trở lên', ok: () => false },
  { id: 'vtv-solo-win', icon: '👑', name: 'Vua Một Mình', desc: 'Thắng 1 ván Vua Tiếng Việt chơi đơn với máy', ok: () => false },
  { id: 'vtv-perfect', icon: '💯', name: 'Trọn Vẹn 150', desc: 'Ghi đủ 150 điểm trong 1 ván Vua Tiếng Việt (đúng cả 7 vòng)', ok: () => false },
  { id: 'vtv-streak', icon: '🔥', name: 'Chuỗi Vàng', desc: 'Thắng 5 vòng liên tiếp trong 1 ván Vua Tiếng Việt', ok: () => false },
  { id: 'vtv-champ', icon: '🏆', name: 'Vua Cả Phòng', desc: 'Thắng 1 ván Vua Tiếng Việt trong phòng từ 8 người trở lên', ok: () => false },
  { id: 'dn-solo-win', icon: '🎧', name: 'Tai Nghe Vàng', desc: 'Thắng 1 ván Đoán Nhạc chơi đơn với máy', ok: () => false },
  { id: 'dn-score500', icon: '🎵', name: 'Tai Thính', desc: 'Ghi từ 500 điểm trở lên trong 1 ván Đoán Nhạc', ok: () => false },
  { id: 'dn-perfect', icon: '💯', name: 'Thuộc Lòng', desc: 'Đoán đúng tất cả các bài trong 1 ván Đoán Nhạc', ok: () => false },
  { id: 'dn-champ', icon: '🏆', name: 'Quán Quân Phòng Nhạc', desc: 'Thắng 1 ván Đoán Nhạc trong phòng từ 8 người trở lên', ok: () => false },
  { id: 'hk-solo-win', icon: '🎯', name: 'Đoán Chuẩn', desc: 'Thắng 1 ván Hơn Hay Kém chơi đơn', ok: () => false },
  { id: 'hk-streak10', icon: '🔥', name: 'Chuỗi Lửa', desc: 'Đoán đúng 10 câu liên tiếp trong 1 ván Hơn Hay Kém', ok: () => false },
  { id: 'hk-perfect', icon: '💯', name: 'Không Trượt Phát Nào', desc: 'Đoán đúng tất cả các câu trong 1 ván Hơn Hay Kém', ok: () => false },
  { id: 'hk-champ', icon: '🏆', name: 'Quán Quân Số Liệu', desc: 'Thắng 1 ván Hơn Hay Kém trong phòng từ 8 người trở lên', ok: () => false },
  { id: 'hsq-slayer', icon: '⚔️', name: 'Thợ Săn Quái', desc: 'Thắng 1 ván Hội Săn Quái bằng cách diệt đủ 3 quái vật', ok: () => false },
  { id: 'hsq-rainbow', icon: '🌈', name: 'Đội Đủ 6 Hệ', desc: 'Thắng 1 ván Hội Săn Quái bằng cách tập hợp đủ 6 hệ anh hùng', ok: () => false },
  { id: 'hsq-win4', icon: '👑', name: 'Vô Địch Hội Đông', desc: 'Thắng 1 ván Hội Săn Quái có từ 4 người trở lên', ok: () => false },
  { id: 'hsq-flawless', icon: '💎', name: 'Săn Quái Hoàn Hảo', desc: 'Thắng 1 ván Hội Săn Quái bằng diệt quái khi đội đã đủ ít nhất 4 hệ', ok: () => false },
  { id: 'tl-trang', icon: '🙏', name: 'Ơn Trên Phù Hộ', desc: 'Thắng trắng (tới trắng)', ok: () => false },
  { id: 'tl-chop', icon: '🐷', name: 'Chặt Heo', desc: 'Chặt heo', ok: () => false },
  { id: 'tl-cong', icon: '🥶', name: 'Thua Cóng', desc: 'Thua cóng', ok: () => false },
  { id: 'tienlen-3doi', icon: '💥', name: 'Khoan', desc: 'Chặt 3 đôi thông', ok: () => false },
  { id: 'tienlen-quad', icon: '🃏', name: 'Chặt Tứ Quý', desc: 'Chặt tứ quý', ok: () => false },
  { id: 'tienlen-chopped', icon: '🐽', name: 'Bị Chặt Heo', desc: 'Bị chặt heo', ok: () => false },
  { id: 'catte-win3', icon: '🔥', name: 'Tới 3 Ván', desc: 'Tới 3 ván liên tiếp', ok: t => (t.g.catte?.st || 0) >= 3, of: t => [t.g.catte?.st || 0, 3] },
  { id: 'bacao-3tay', icon: '🤴', name: 'Ba Tây', desc: 'Được Ba Tây (3 lá mặt người)', ok: () => false },
  { id: 'bacao-bu', icon: '🙈', name: 'Mắt 0 Thấy Tim 0 Đau', desc: 'Bị bù (0 nút)', ok: () => false },
  { id: 'bacao-sap', icon: '🎴', name: 'Ba Con Y Chang', desc: 'Được Sáp (3 lá giống nhau)', ok: () => false },
  { id: 'bacao-nine3', icon: '9️⃣', name: 'Chín Nút Chín Nút Chín Nút', desc: 'Được 9 nút 3 ván liên tiếp', ok: () => false },
  { id: 'bacao-lose5', icon: '😵', name: 'Hôm Nay Không Phải Ngày Của Tui', desc: 'Thua 5 ván liên tiếp', ok: t => (t.g.bacao?.lst || 0) >= 5, of: t => [t.g.bacao?.lst || 0, 5] },
  { id: 'xd-xiban', icon: '🂡', name: 'Xì Bàn', desc: 'Xì bàn (2 lá Át)', ok: () => false },
  { id: 'xd-ngulinh', icon: '⛰️', name: 'Ngũ Hành Sơn', desc: 'Ngũ linh (5 lá chưa quá 21)', ok: () => false },
  { id: 'xd-quac', icon: '💣', name: 'Bốc Tiếp Đi', desc: 'Quắc (quá 21)', ok: () => false },
  { id: 'xidach-bj', icon: '🂫', name: 'Xì Dách', desc: 'Xì dách (Át + lá 10/mặt người)', ok: () => false },
  { id: 'xidach-21', icon: '🎯', name: 'Tính Toán Chuẩn Chỉ', desc: 'Đúng 21 bằng 3 lá trở lên', ok: () => false },
  { id: 'xidach-16', icon: '😏', name: 'Dằn 16 Vẫn Thắng', desc: 'Dằn (dừng ở 16) mà vẫn thắng', ok: () => false },
  { id: 'solitaire-win5', icon: '🃏', name: 'Kiên Nhẫn', desc: 'Thắng 5 ván liên tiếp', ok: t => (t.g.solitaire?.st || 0) >= 5, of: t => [t.g.solitaire?.st || 0, 5] },
  { id: 'ct-fast', icon: '♟️', name: 'Mấy Chú Đánh Đầu Ngõ', desc: 'Chiếu bí dưới 20 nước', ok: () => false },
  { id: 'cotuong-horse', icon: '🐴', name: 'Mã Đáo Thành Công', desc: 'Chiếu bí bằng Mã', ok: () => false },
  { id: 'cotuong-rook', icon: '🚗', name: 'Xe Bất Bại', desc: 'Thắng mà không mất Xe nào', ok: () => false },
  { id: 'tht-dare10', icon: '🔥', name: 'Thách 10 Lần', desc: 'Chọn Thách 10 lần', ok: () => false },
  { id: 'tht-truth10', icon: '🎩', name: 'Thật 10 Lần', desc: 'Chọn Thật 10 lần', ok: () => false },
  { id: 'thathaythach-skip3', icon: '🏃', name: 'Nhùng', desc: 'Bỏ qua (từ chối) 3 câu trong một ván', ok: () => false },
  { id: 'thathaythach-party8', icon: '🎉', name: 'Nghi Thức Triệu Hồi', desc: 'Chơi một ván từ 8 người trở lên', ok: () => false },
  { id: 'thathaythach-ai', icon: '✨', name: 'AI Là Người Hỏi', desc: 'Chơi với bộ câu tự thêm theo chủ đề', ok: () => false },
  { id: 'bt-team', icon: '🤜', name: 'Đồng Đội Tuyệt Vời', desc: 'Thắng khi chơi chéo cánh', ok: () => false },
  { id: 'bt-last', icon: '🐢', name: 'Đội Sổ', desc: 'Về bét', ok: () => false },
  { id: 'baitan-win3', icon: '🏆', name: 'Tấn Công Liên Hoàn', desc: 'Về nhất 3 ván liên tiếp', ok: t => (t.g.baitan?.st || 0) >= 3, of: t => [t.g.baitan?.st || 0, 3] },
  { id: 'baitan-solo4', icon: '🥇', name: 'Một Mình Cân Ba', desc: 'Về nhất khi chơi cá nhân 4 người', ok: () => false },
  { id: 'loto-fast', icon: '🎉', name: 'Kinh Nhanh', desc: 'Kinh khi mới ra dưới 20 số', ok: () => false },
  { id: 'loto-wait', icon: '⏳', name: 'Chờ Hoài Một Số', desc: 'Chờ 1 số cuối mà người khác kinh trước', ok: () => false },
  { id: 'cv-fast', icon: '♞', name: 'Chiếu Hết Nhanh', desc: 'Chiếu hết dưới 20 nước', ok: () => false },
  { id: 'covua-knight', icon: '🐴', name: 'Chiếu Hết Bằng Mã', desc: 'Chiếu hết bằng Mã', ok: () => false },
  { id: 'covua-promote', icon: '👸', name: 'Nàng Ơi...', desc: 'Phong cấp Hậu', ok: () => false },
  { id: 'covua-stalemate', icon: '🤝', name: 'Biết Chơi Game Không', desc: 'Hoà vì hết nước đi (pat)', ok: () => false },
  { id: 'tala-u', icon: '🀄', name: 'Ù Bất Ngờ', desc: 'Ù', ok: () => false },
  { id: 'tala-mom', icon: '🫥', name: 'Móm Toàn Tập', desc: 'Móm (không có phỏm nào)', ok: () => false },
  { id: 'ts-quan', icon: '🎋', name: 'Tới Có Quằn', desc: 'Tới có quằn', ok: () => false },
  { id: 'tusac-win3', icon: '🔥', name: 'Tới Tới Tới', desc: 'Tới 3 ván liên tiếp', ok: t => (t.g.tusac?.st || 0) >= 3, of: t => [t.g.tusac?.st || 0, 3] },
  { id: 'bantau-fast', icon: '🎯', name: 'Thuỷ Thủ Thần Sầu', desc: 'Bắn chìm cả hạm đội dưới 40 phát', ok: () => false },
  { id: 'bantau-carrier', icon: '🚢', name: 'Hạ Tàu Sân Bay', desc: 'Đánh chìm tàu 5 ô đầu tiên', ok: () => false },
  { id: 'bantau-miss10', icon: '🌊', name: 'Trượt 10 Phát', desc: 'Bắn trượt 10 phát liên tiếp', ok: () => false },
  { id: 'oaq-borrow', icon: '🤲', name: 'Vay Dân', desc: 'Phải vay dân để rải', ok: () => false },
  { id: 'oanquan-big', icon: '🏆', name: 'Thắng Đậm', desc: 'Thắng hơn 20 điểm', ok: () => false },
  { id: 'oanquan-noquan', icon: '🙁', name: 'Quan Đâu Hết Rồi', desc: 'Thua mà không ăn được quan nào', ok: () => false },
  { id: 'caro-fast', icon: '⭕', name: 'Năm Con Một Mạch', desc: 'Thắng dưới 10 nước', ok: t => (t.ev.cr?.fast19 || 0) >= 1 },
  { id: 'caro-fastloss', icon: '🫣', name: 'Thua Nhanh Như Chớp', desc: 'Thua dưới 10 nước', ok: t => (t.ev.cr?.fastloss || 0) >= 1 },
  { id: 'cothu-flawless', icon: '🦁', name: 'Không Sứt Mẻ', desc: 'Thắng mà không mất con nào', ok: () => false },
  { id: 'cothu-jump', icon: '🐯', name: 'Vượt Sông', desc: 'Sư tử / Hổ nhảy sông ăn quân', ok: () => false },
  { id: 'cothu-elephant', icon: '🐘', name: 'Voi To Xác', desc: 'Voi bị Chuột ăn', ok: () => false },
  /* --- thêm 20261118: 8 game mới (Sâm lốc, Bầu cua, Nối từ, Tàu Xuyên Việt, Đảo Khai Hoang, Đảo Chính, Đội Cứu Hộ, Gánh Xiếc Thú) – (42 id).
     soon: true = chưa có cách phát hiện (hiện "sắp có"); chỉ ghi lại cho đủ bộ, chưa mở khóa được. */
  { id: 'sam-bao', icon: '📢', name: 'Sâm Là Phải Chất', desc: 'Báo Sâm thành công', ok: () => false },
  { id: 'sam-trang', icon: '✨', name: 'Trời Cho Ăn Trắng', desc: 'Ăn trắng', ok: () => false },
  { id: 'sam-chan', icon: '🚫', name: 'Báo Sâm Bị Chặn', desc: 'Báo Sâm bị chặn', ok: () => false },
  { id: 'sam-quad', icon: '💥', name: 'Bốn Con Chặt Heo', desc: 'Chặt 2 bằng tứ quý', ok: () => false, soon: true },
  { id: 'sam-win3', icon: '🏆', name: 'Sâm Không Nghỉ', desc: 'Về nhất 3 ván liên tiếp', ok: t => (t.g.sam?.st || 0) >= 3, of: t => [t.g.sam?.st || 0, 3] },
  { id: 'sam-thoi2', icon: '🤢', name: 'Ôm Hai Về Nhà', desc: 'Bị thối 2', ok: () => false, soon: true },
  { id: 'bc-triple', icon: '🎲', name: 'Ba Con Một Ô', desc: 'Đặt trúng ô ra cả 3 con', ok: () => false },
  { id: 'bc-broke', icon: '🔥', name: 'Cháy Túi Về Quê', desc: 'Cháy túi', ok: () => false },
  { id: 'baucua-double', icon: '💰', name: 'Nhân Đôi Tài Sản', desc: 'Thắng với hơn gấp đôi số xu ban đầu', ok: () => false, soon: true },
  { id: 'baucua-allin', icon: '🎰', name: 'Được Ăn Cả', desc: 'Đặt hết vào một ô và trúng', ok: () => false, soon: true },
  { id: 'baucua-broke2', icon: '🔥', name: 'Cháy Túi Lần Hai', desc: 'Cháy túi 2 lần trong một ván', ok: () => false },
  { id: 'nt-stump', icon: '💥', name: 'Đòn Chí Mạng', desc: 'Đưa từ bí làm người kế mất mạng', ok: () => false },
  { id: 'nt-vote', icon: '📚', name: 'Từ Mới Được Nhận', desc: 'Từ mới được cả bàn bỏ phiếu nhận', ok: () => false },
  { id: 'nt-timeout', icon: '🤯', name: 'Có Chắc Đang Nói Tiếng Việt Không', desc: 'Hết giờ 3 lần trong một ván', ok: () => false },
  { id: 'noitu-last5', icon: '🏅', name: 'Vua Tiếng Việt', desc: 'Sống sót tới cuối khi bàn có từ 5 người', ok: () => false },
  { id: 'noitu-chain20', icon: '🔗', name: 'Từ Điển Sống', desc: 'Nối 20 từ trong một ván', ok: () => false },
  { id: 'noitu-out1', icon: '🥀', name: 'Cần Đọc Thêm Sách', desc: 'Bị loại đầu tiên', ok: () => false },
  { id: 'xv-long', icon: '🚂', name: 'Xuyên Việt Một Mạch', desc: 'Có tuyến liên tục dài nhất', ok: () => false },
  { id: 'xv-fail', icon: '🎫', name: 'Lỡ Chuyến Tàu', desc: 'Không hoàn thành vé đích nào', ok: () => false },
  { id: 'xuyenviet-ticket5', icon: '🎟️', name: 'Đi Khắp Mọi Miền', desc: 'Hoàn thành 5 vé đích', ok: () => false },
  { id: 'xuyenviet-six', icon: '🚃', name: 'Tàu Dài Sáu Toa', desc: 'Chiếm tuyến 6 toa', ok: () => false, soon: true },
  { id: 'xuyenviet-out', icon: '🏁', name: 'Về Ga Sớm Nhất', desc: 'Hết toa trước tiên', ok: () => false, soon: true },
  { id: 'kh-both', icon: '🏝️', name: 'Chúa Đảo Toàn Năng', desc: 'Có cả Đường dài nhất và Đội quân lớn nhất', ok: () => false },
  { id: 'kh-robbed', icon: '🏴‍☠️', name: 'Bị Cướp 3 Lần', desc: 'Bị cướp 3 lần trong một ván', ok: () => false },
  { id: 'khaihoang-city4', icon: '🏙️', name: 'Đô Thị Hoá', desc: 'Thắng với 4 thành phố', ok: () => false, soon: true },
  { id: 'khaihoang-mono5', icon: '🃏', name: 'Độc Quyền Thị Trường', desc: 'Dùng thẻ Độc quyền vét được 5 lá trở lên', ok: () => false, soon: true },
  { id: 'khaihoang-storm', icon: '🏴‍☠️', name: 'Ổ Cướp Trước Nhà', desc: 'Bị cướp đặt lên ô của mình cả ván', ok: () => false, soon: true },
  { id: 'dc-bluff3', icon: '🎭', name: 'Diễn Viên Gạo Cội', desc: 'Bịp thành công 3 lần trong một ván', ok: () => false },
  { id: 'dc-caught', icon: '🫣', name: 'Bị Bóc Phốt', desc: 'Bị nghi đúng khi đang bịp', ok: () => false },
  { id: 'daochinh-clean', icon: '👑', name: 'Không Mất Một Sợi Lông', desc: 'Thắng mà chưa mất lá nào', ok: () => false },
  { id: 'daochinh-catch3', icon: '🕵️', name: 'Thám Tử Lừng Danh', desc: 'Nghi đúng 3 lần trong một ván', ok: () => false },
  { id: 'daochinh-assassin', icon: '🗡️', name: 'Bị Ám Sát 2 Lần', desc: 'Bị Sát thủ hạ 2 lần trong một ván', ok: () => false },
  { id: 'ch-hard', icon: '🦸', name: 'Thắng Mức Khó', desc: 'Thắng mức Khó', ok: () => false },
  { id: 'ch-close', icon: '🌊', name: 'Chỉ Mành Treo Chuông', desc: 'Thắng khi đã vỡ đê 7 lần', ok: () => false },
  { id: 'cuuho-cure4', icon: '🌍', name: 'Cứu Cả Đất Nước', desc: 'Khắc phục cả 4 thiên tai', ok: () => false },
  { id: 'cuuho-nobreak', icon: '🧱', name: 'Đê Vững Như Bàn Thạch', desc: 'Thắng mà chưa vỡ đê lần nào', ok: () => false },
  { id: 'cuuho-nocard', icon: '📭', name: 'Hết Phép Cứu Hộ', desc: 'Thua vì hết thẻ cứu hộ', ok: () => false },
  { id: 'xt-critic', icon: '📰', name: 'Được Báo Khen', desc: 'Được Nhà phê bình +3', ok: () => false },
  { id: 'xt-skunk', icon: '🦨', name: 'Gánh Xiếc Bốc Mùi', desc: 'Bị Chồn hôi trừ điểm 3 đêm liền', ok: () => false, soon: true },
  { id: 'xiecthu-big15', icon: '🎪', name: 'Đêm Diễn Để Đời', desc: 'Ghi 15 điểm trở lên trong một đêm', ok: () => false, soon: true },
  { id: 'xiecthu-star', icon: '🌟', name: 'Ngôi Sao Sân Khấu', desc: 'Thuê thú giá 9 đầu tiên', ok: () => false, soon: true },
  { id: 'xiecthu-worm', icon: '🐛', name: 'Đuổi Sâu Khỏi Gánh', desc: 'Mời ra cả 2 Sâu khỏi gánh', ok: () => false, soon: true },
  { id: 'dl-7', icon: '🎁', name: 'Điểm Danh 7 Ngày', desc: 'Điểm danh 7 ngày liên tiếp', ok: t => (t.dlStreak || 0) >= 7, of: t => [t.dlStreak || 0, 7] },
  { id: 'dl-30', icon: '📅', name: 'Điểm Danh 30 Ngày', desc: 'Điểm danh tổng cộng 30 ngày', ok: t => (t.dlTotal || 0) >= 30, of: t => [t.dlTotal || 0, 30] },
];
/* 💰 thưởng xu thành tựu (patch -191): SPECIAL mặc định 25 xu; feat hiếm/hoàn hảo/dọn sạch/điểm tối đa/ván đông người = 50 xu;
   feat dễ/trivial (thua/chết đầu tiên, bị chặt, móm…) = 10 xu. Thành tựu soon:true vẫn có bậc xu (để Hồ sơ hiện thưởng) nhưng không bao giờ được trả (record() chặn + ok() luôn false). */
const SPECIAL_HARD = new Set('uno-perfect meo-last2 tqs-spy ms-wolfwin gd-spywin gd-perfect cd-kings3 cd-endgame3 lg-sap mb-dragon mb-sweep mb-quads mb-special xt-sf xt-quads cl-margin40 cl-corners cl-comeback dm-double6 dm-sweep dm-comeback mt-clean mt-lastcard mt-comeback av-merlin av-assassin av-q4 sf-spyguess sf-survive su-clean su-hard su-expert su-nohint wd-quick wd-clean dm-clean dm-medium dm-hard t4-1024 t4-2048 t4-score mc-clean mc-noshuffle mc-noundo ll-sweep l6-clean l6-crowd l6-tight sb-rich sb-crowd sk-clean sk-survivor hb-perfect hb-clean ch-thap tt-phu az-color sp-rich chn-jump chn-fast chn-crowd bg-backgammon rk-rush rk-sweep qd-fast qd-saver qd-spent bk-perfect bk-full bk-clean sc-bingo sc-big mm-fast mm-sharp mm-comeback al-150 al-race ht-perfect ht-streak5 ht-uncaught dd-actor wl-master rs-spy-win rs-win7 rs-clean vt-keep5 vt-guess3 tt-tetris2 tt-sprint-win rs-fast xc-big-move xc-cascade10 bb-clean bb-score500 ng-clean ng-hard15 gh-fast5 gh-nopeek nh-hard4 nh-noundo bd-clean bd-sharp dp-clean5 dp-comeback dp-streak5 ph-180 ph-ton3 kbb-comeback dv-perfect dv-champ ls-perfect ls-rare ls-deep vtv-perfect vtv-champ hsq-rainbow hsq-win4 hsq-flawless tl-trang bacao-sap bacao-nine3 xd-xiban xd-ngulinh xidach-bj ct-fast cotuong-horse cotuong-rook thathaythach-party8 baitan-solo4 cv-fast covua-knight bantau-fast oanquan-big cothu-flawless sam-trang sam-quad bc-triple baucua-double baucua-allin noitu-last5 noitu-chain20 xv-long xuyenviet-ticket5 xuyenviet-six kh-both khaihoang-city4 khaihoang-mono5 dc-bluff3 daochinh-clean daochinh-catch3 ch-hard ch-close cuuho-nobreak xiecthu-big15 dl-30 dn-perfect dn-champ hk-perfect hk-champ'.split(' '));
const SPECIAL_EASY = new Set('bang-firstdie uno-forgot typhu-broke1 meo-firstboom tqs-firstdie ms-night1 tl-cong tienlen-chopped bacao-bu bacao-lose5 xd-quac thathaythach-skip3 bt-last loto-wait covua-stalemate tala-mom bantau-miss10 oaq-borrow oanquan-noquan caro-fastloss cothu-elephant sam-chan sam-thoi2 bc-broke nt-timeout noitu-out1 xv-fail dc-caught cuuho-nocard catte-win3 baitan-win3 tusac-win3 sam-win3 dn-solo-win hk-solo-win'.split(' '));
for (const a of SPECIAL) ACHS.push({ ...a, xu: SPECIAL_HARD.has(a.id) ? 50 : SPECIAL_EASY.has(a.id) ? 10 : 25 });
const ACH_BY_ID = new Map(ACHS.map(a => [a.id, a]));
// cấp độ: mỗi ván +10 điểm, thắng +20 nữa
export const LEVELS = ['Tân binh', 'Tập sự', 'Dân chơi', 'Tay chơi', 'Cao thủ', 'Đại cao thủ', 'Bậc thầy', 'Tông sư', 'Huyền thoại', 'Truyền kỳ'];
export function level(t = totals()) { const xp = t.xp != null ? t.xp : t.p * 10 + t.w * 20, lv = Math.min(LEVELS.length, Math.floor(Math.sqrt(xp / 50)) + 1), need = n => 50 * (n - 1) * (n - 1); return { xp, lv, name: LEVELS[lv - 1], from: need(lv), to: lv >= LEVELS.length ? null : need(lv + 1) }; }

/* kiểm tra thành tích mới từ tổng hiện tại, ghi dấu mở khóa, trả về danh sách mới mở */
/* 💰 thưởng xu thành tựu (patch -191): chỉ trả khi id vừa chuyển khoá → mở; id đã mở từ trước KHÔNG trả lại, không trả bù
   (ai đã mở thành tựu trước patch này thì không nhận xu cho các thành tựu đó — tránh phát 1 cục lớn ngày đầu).
   Dùng chung cho cả 3 đường mở: checkFresh (record/recordEvent), record() extra (SPECIAL) và sync merge (sync.js gọi mergeAch). */
export function awardAch(a) { try { if (a && a.xu > 0) { addXu(a.xu); return a.xu; } } catch (e) {} return 0; }
/* mở mọi thành tựu vừa đủ điều kiện trong 1 object stats + thưởng xu 1 lần cho mỗi id mới mở; award=false thì chỉ ghi mở, không trả xu
   (sync.js dùng award=false khi ở chế độ replace — đổi tài khoản / lần đồng bộ đầu sau bản nới lỏng — để xu của tài khoản cũ không rò sang). */
export function mergeAch(out, award = true) {
  const t = totals(out), fresh = [];
  for (const a of ACHS) if (!out.ach[a.id] && a.ok(t)) { out.ach[a.id] = Date.now(); fresh.push(a); if (award) awardAch(a); }
  return fresh;
}
const checkFresh = s => mergeAch(s);
/* bộ đếm cộng dồn giữa các ván (vd. số lần chọn Thách, số ván 9 nút liên tiếp) */
function counter(s) { s.cnt = s.cnt || {}; return (k, add) => { if (add != null) s.cnt[k] = (s.cnt[k] || 0) + add; return s.cnt[k] || 0; }; }
const dayAfter = x => { const dt = new Date(x + 'T12:00:00'); dt.setDate(dt.getDate() + 1); return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'); };
/* phát hiện thành tựu riêng từng game từ view lúc chơi (chỉnh theo view thật – xem ghi chú từng game).
   tick(v, me, m): chạy mỗi lần nhận view mới khi ván đang diễn ra (kể cả view cuối). end(v, me, m, won, cnt): chạy lúc ván kết thúc, trả về id thành tựu mở. */
const spBy = (v, me) => (v.players || []).find(p => p.id === me) || {};
/* đếm một sự kiện "last" mới (theo seq) cho mình */
const spOnce = (m, v, key) => { const k = key + ':' + (v.seq ?? JSON.stringify(v.last)); if (m[k]) return false; m[k] = 1; return true; };
const spFx = (v, m) => { const out = (v.fx || []).filter(e => e && e.id > (m.fxSeen || 0)); if (out.length) m.fxSeen = Math.max(...out.map(e => e.id)); return out; };
const SP = {
  bang: {
    tick(v, me, m) { if (!m.first) { const d = (v.players || []).filter(p => p.alive === false); if (d.length) m.first = d.length === 1 ? d[0].id : '?'; } },
    end(v, me, m, w) { const r = spBy(v, me).role, out = []; if (w && r === 'sheriff') out.push('bang-sheriff'); if (w && r === 'renegade') out.push('bang-renegade'); if (w && r === 'deputy') out.push('bang-deputy'); if (m.first === me) out.push('bang-firstdie'); return out; } },
  uno: {
    tick(v, me, m) {
      const hc = Object.fromEntries((v.players || []).map(p => [p.id, p.handCount])), mine = hc[me];
      if (m.hc && m.hc[me] != null && mine - m.hc[me] >= 10) m.d10 = 1;
      for (const e of spFx(v, m)) {
        if ((e.k === 'plus' || e.k === 'aim') && e.from === me) { if (e.n === 4 && m.hc && m.hc[e.to] === 1) m.p4 = 1; m.run = (m.run || 0) + 1; if (m.run >= 3) m.stack = 1; }
        if (e.to === me && ['plus', 'aim', 'catch', 'dq', 'tornado', 'nou'].includes(e.k)) { m.hit = 1; m.run = 0; }
        if (e.k === 'catch' && e.to === me) m.forgot = 1;
      }
      m.hc = hc;
    },
    end(v, me, m, w) { const o = []; if (m.p4) o.push('uno-plus4'); if (m.d10) o.push('uno-draw10'); if (w && !m.hit) o.push('uno-perfect'); if (m.stack) o.push('uno-stack'); if (m.forgot) o.push('uno-forgot'); return o; } },
  typhu: {
    tick(v, me, m) {
      for (const e of v.ev || []) { if (!e || e.n <= (m.evN || 0)) continue; m.evN = e.n;
        if (e.t === 'jail' && e.pid === me) m.jail = (m.jail || 0) + 1;
        if (e.t === 'build' && e.pid === me && e.h === 5) m.hotel = 1;
        if (e.t === 'bankrupt') { if (e.to === me) m.bk = 1; if (!m.firstBk) m.firstBk = e.pid; }
        if (e.t === 'pay' && e.to === me && e.why === 'rent' && e.amt >= 2000) m.rent = 1; }
    },
    end(v, me, m) { const o = []; if ((m.jail || 0) >= 3) o.push('typhu-jail3'); if (m.hotel) o.push('typhu-hotel'); if (m.bk) o.push('typhu-bankrupt'); if (m.firstBk === me) o.push('typhu-broke1'); if (m.rent) o.push('typhu-rent'); return o; } },
  meono: {
    tick(v, me, m) { const alive = (v.players || []).filter(p => !p.out).length; if (alive === 2 && (v.bombsLeft || 0) > 0) m.duo = 1; },
    end(v, me, m, w) { const out = [], st = (v.stats || {})[me] || {}, n = (v.players || []).length, p = spBy(v, me); if ((st.defused || 0) >= 3) out.push('meo-defuse3'); if (p.out && p.place === n) out.push('meo-firstboom'); if (w && m.duo) out.push('meo-last2'); if ((st.nopes || 0) >= 3) out.push('meono-nope3'); return out; } },
  tamquoc: {
    tick(v, me, m) { if (!m.first) { const d = (v.players || []).filter(p => p.alive === false); if (d.length) m.first = d.length === 1 ? d[0].id : '?'; } },
    end(v, me, m, w) { const r = spBy(v, me).role, out = []; if (w && r === 'lord') out.push('tqs-lord'); if (w && r === 'spy') out.push('tqs-spy'); if (w && r === 'loyal') out.push('tamquoc-loyal'); if (w && r === 'rebel') out.push('tamquoc-rebel'); if (m.first === me) out.push('tqs-firstdie'); return out; } },
  masoi: {
    tick(v, me, m) { if (v.me && v.me.role) m.role = v.me.role; const p = spBy(v, me); if (p.alive === false && p.diedDay != null && m.dd == null) m.dd = p.diedDay; },
    end(v, me, m, w) { const out = [], role = (v.me && v.me.role) || m.role, alive = v.me ? v.me.alive : spBy(v, me).alive; if (role === 'villager' && alive && w) out.push('ms-villager'); if (w && ['wolf', 'alpha', 'cub'].includes(role)) out.push('ms-wolfwin'); if (m.dd != null && m.dd <= 1 && !alive) out.push('ms-night1'); return out; } },
  giandiep: {
    tick(v, me, m) { if (v.you && v.you.role) m.role = v.you.role; },
    end(v, me, m, w) { const out = [], role = (v.you && v.you.role) || m.role, you = v.you || {};
      if (w && role === 'spy') out.push('gd-spywin');
      if ((v.firstVoteCatchers || []).includes(me)) out.push('gd-firstvote');
      if ((you.survived || 0) >= 3) out.push('gd-survive3');
      if (w && v.winSide === 'civ' && (v.civLost || 0) === 0) out.push('gd-perfect');
      return out; } },
  codam: {
    tick(v, me, m) { const l = v.lastMove; if (!l || l.n === m.lmn) return; m.lmn = l.n;
      if (l.by !== me) return;
      if (l.captured && l.captured.length) {
        if (m.chainTurn !== v.turnNo) { m.chain = 0; m.chainTurn = v.turnNo; }
        m.chain = (m.chain || 0) + l.captured.length; }
      if (l.crowned) m.crowns = (m.crowns || 0) + 1; },
    end(v, me, m, w) { const out = [];
      if (w && v.endReason === 'blocked') out.push('cd-blockwin');
      if ((m.crowns || 0) >= 3) out.push('cd-kings3');
      if ((m.chain || 0) >= 3) out.push('cd-jump3');
      if (w) { const sd = (v.players || []).find(p => p.id === me); let n = 0;
        for (const c of v.cells || []) if (c !== 0 && (c > 0) === (sd && sd.side === 'R')) n++;
        if (n <= 3) out.push('cd-endgame3'); }
      return out; } },
  lieng: {
    tick(v, me, m) { const you = v.you || {}; if (you.info) m.info = you.info; },
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      const meP = (v.players || []).find(p => p.id === me) || {};
      const kind = (m.info && m.info.kind) || (meP.info && meP.info.kind);
      if (kind === 'sap') out.push('lg-sap');
      if (kind === 'lieng') out.push('lg-lieng');
      if (kind === 'anh') out.push('lg-anh');
      if (v.endReason === 'foldwin') out.push('lg-noshow');
      return out; } },
  maubinh: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      const meP = (v.players || []).find(p => p.id === me) || {};
      const r = meP.res || {};
      if (r.special === 'dragon') out.push('mb-dragon');
      if (r.special) out.push('mb-special');
      if (r.quadsBot) out.push('mb-quads');
      for (const k in (r.vs || {})) { const a = r.vs[k]; if (a && a[0] === 1 && a[1] === 1 && a[2] === 1) { out.push('mb-sweep'); break; } }
      return out; } },
  xito: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      const meP = (v.players || []).find(p => p.id === me) || {};
      const r = meP.res || {};
      if (r.handCat === 9) out.push('xt-sf');
      if (r.handCat === 8) out.push('xt-quads');
      if (r.allin) out.push('xt-allin');
      if (v.endReason === 'foldwin') out.push('xt-noshow');
      return out; } },
  colat: {
    tick(v, me, m) { const l = v.lastMove; if (!l || l.n === m.lmn) return; m.lmn = l.n;
      if (l.by !== me) return;
      const c = v.counts || {};
      const sd = (v.players || []).find(p => p.id === me) || {};
      const mine = sd.side === 'B' ? c.B : c.W;
      const theirs = sd.side === 'B' ? c.W : c.B;
      const def = (theirs || 0) - (mine || 0);
      if (def > (m.maxDef || 0)) m.maxDef = def;
      if ((l.flipped || []).length > (m.maxFlip || 0)) m.maxFlip = l.flipped.length; },
    end(v, me, m, w) { const out = [];
      if ((m.maxFlip || 0) >= 8) out.push('cl-flip8');
      if (!w) return out;
      const c = v.counts || {};
      const sd = (v.players || []).find(p => p.id === me) || {};
      const mine = sd.side === 'B' ? c.B : c.W;
      const theirs = sd.side === 'B' ? c.W : c.B;
      if ((mine || 0) - (theirs || 0) >= 40) out.push('cl-margin40');
      if ((m.maxDef || 0) >= 20) out.push('cl-comeback');
      let corners = 0;
      for (const [x, y] of [[0, 0], [7, 0], [0, 7], [7, 7]]) {
        const cell = (v.cells || [])[y * 8 + x];
        if (cell !== 0 && (cell === 1) === (sd.side === 'B')) corners++;
      }
      if (corners === 4) out.push('cl-corners');
      return out; } },
  domino: {
    tick(v, me, m) {
      /* chênh lệch điểm lớn nhất từng bị dẫn (tính từ điểm trận hiện tại) */
      const ps = v.players || [];
      const mine = (ps.find(p => p.id === me) || {}).score || 0;
      let mx = 0; for (const p of ps) mx = Math.max(mx, p.score || 0);
      if (mx - mine > (m.maxDef || 0)) m.maxDef = mx - mine;
      /* nước đặt quân mới: thắng ván bằng [6|6] cuối cùng (tile 27) */
      const l = v.lastPlay;
      if (l && l.n !== m.lpn) { m.lpn = l.n;
        if (l.by === me && l.tile === 27 && l.left === 0) m.d6 = 1; }
      /* ván vừa kết thúc: khóa ván / quét 40+ điểm (khóa theo ván số + lý do) */
      const h = v.handEnd;
      if (h) { const key = v.handNo + '|' + h.reason + '|' + (h.winnerId || '');
        if (m.hek !== key) { m.hek = key;
          if (h.winnerId === me && h.reason === 'blocked') m.blockedWin = 1;
          if (h.winnerId === me && h.reason === 'domino' && (h.points || 0) >= 40) m.sweep = 1; } } },
    end(v, me, m, w) { const out = [];
      if (m.d6) out.push('dm-double6');
      if (m.blockedWin) out.push('dm-block');
      if (m.sweep) out.push('dm-sweep');
      if (w && (m.maxDef || 0) >= 30) out.push('dm-comeback');
      return out; } },
  connect4: {
    tick(v, me, m) { const l = v.lastMove; if (!l || l.n === m.lmn) return; m.lmn = l.n;
      /* đếm số lần mình chặn nước thắng của đối thủ trong ván này */
      if (l.by === me && l.blocked) m.blocks = (m.blocks || 0) + 1; },
    end(v, me, m, w) { const out = [];
      if ((m.blocks || 0) >= 3) out.push('cf-block3');
      if (!w) return out;
      /* thắng trong 10 nước trở xuống = tổng quân trên bàn lúc kết thúc ≤ 10 */
      if ((v.counts || {}).total <= 10) out.push('cf-fast');
      const d = (v.lastMove || {}).winDir;
      if (d === 'v') out.push('cf-vert');
      if (d === 'd') out.push('cf-diag');
      return out; } },
  matthu: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      if ((v.winClueNum || 0) >= 5) out.push('mt-clue5');
      if (((v.wrong || {})[v.myTeam] || 0) === 0) out.push('mt-clean');
      if (v.winLastCard) out.push('mt-lastcard');
      if (((v.deficit || {})[v.myTeam] || 0) >= 4) out.push('mt-comeback');
      return out; } },
  avalon: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      if (v.myRole === 'merlin' && v.endReason !== 'assassin') out.push('av-merlin');
      if (v.myRole === 'assassin' && v.endReason === 'assassin') out.push('av-assassin');
      if (v.q4Double) out.push('av-q4');
      if (v.myRole === 'oberon') out.push('av-oberon');
      return out; } },
  spyfall: {
    /* mỗi ván ghi cờ 1 lần (tick chạy nhiều lần trên cùng 1 view): ván thắng
       với vai trò gì, bằng cách nào — end() chỉ mở khi thắng cả trận */
    tick(v, me, m) {
      if (v.phase !== 'roundover' && v.phase !== 'ended') return;
      const key = 'sf' + v.roundNo;
      if (m[key]) return; m[key] = 1;
      if (!(v.roundWinnerIds || []).includes(me)) return;
      if (v.amSpy) {
        if (v.endReason === 'spy-guess' || v.endReason === 'spy-early-guess') m.spyguess = 1;
        else if (v.endReason === 'wrong-accuse' || v.endReason === 'tie') m.survive = 1;
      } else {
        if (v.endReason === 'spy-guess-wrong' && v.myVote === v.spyId) m.firstvote = 1;
        if ((v.votesAgainstMe || 0) === 0) m.ghost = 1;
      }
    },
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      if (m.spyguess) out.push('sf-spyguess');
      if (m.survive) out.push('sf-survive');
      if (m.firstvote) out.push('sf-firstvote');
      if (m.ghost) out.push('sf-ghost');
      return out; } },
  sudoku: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      if (v.difficulty === 'easy' && (v.you?.mistakes || 0) === 0) out.push('su-clean');
      if (v.difficulty === 'hard') out.push('su-hard');
      if (v.difficulty === 'expert') out.push('su-expert');
      if ((v.you?.hintsUsed || 0) === 0) out.push('su-nohint');
      return out; } },
  wordle: {
    end(v, me, m, w, cnt) { const out = [];
      if (w) {
        const gs = v.you?.guesses || [];
        if (gs.length >= 1 && gs.length <= 2) out.push('wd-quick');
        if (gs.length > 0 && gs.every(g => (g.marks || []).every(x => x !== 'gray'))) out.push('wd-clean');
        if (gs.length === 6) out.push('wd-last');
        cnt('wdstreak', 1);
      } else cnt('wdstreak', -cnt('wdstreak'));
      if (cnt('wdstreak') >= 3) out.push('wd-streak3');
      return out; } },
  domi: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      if (v.difficulty === 'easy' && (v.you?.flags || []).length === 0) out.push('dm-clean');
      if (v.difficulty === 'medium') out.push('dm-medium');
      if (v.difficulty === 'hard') out.push('dm-hard');
      if (v.difficulty === 'easy' && v.startedAt && v.endedAt && (v.endedAt - v.startedAt) < 60000) out.push('dm-fast');
      return out; } },
  s2048: {
    end(v, me, m, w) { const out = [];
      const mt = v.you?.maxTile || 0, sc = v.you?.score || 0;
      if (mt >= 512) out.push('t4-512');
      if (mt >= 1024) out.push('t4-1024');
      if (sc >= 5000) out.push('t4-score');
      if (w && mt >= 2048) out.push('t4-2048');
      return out; } },
  matchu: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      if ((v.you?.hintsUsed || 0) === 0) out.push('mc-clean');
      if ((v.you?.shufflesUsed || 0) === 0) out.push('mc-noshuffle');
      if (v.startedAt && v.endedAt && (v.endedAt - v.startedAt) < 300000) out.push('mc-fast');
      if ((v.you?.undosLeft ?? 0) === 5) out.push('mc-noundo');
      return out; } },
  loveletter: {
    end(v, me, m, w) { const out = [], p = spBy(v, me);
      if (!w) return out;
      if ((p.hand || []).some(c => String(c).startsWith('princess'))) out.push('ll-princess');
      if (p.tokens && v.round && p.tokens === v.round) out.push('ll-sweep');
      if ((p.discards || []).some(c => String(c).startsWith('countess'))) out.push('ll-countess');
      if ((v.players || []).length === 2) out.push('ll-duel');
      return out; } },
  sushigo: {
    end(v, me, m, w) { const out = [], p = spBy(v, me), played = p.played || [];
      if (!w) return out;
      const n = k => played.filter(e => e.kind === k).length;
      if (n('sashimi') >= 3) out.push('sg-sashimi');
      if (n('tempura') >= 2) out.push('sg-tempura');
      if (played.some(e => e.wasabi)) out.push('sg-wasabi');
      const maxPud = Math.max(...(v.players || []).map(x => x.puddings || 0));
      if ((p.puddings || 0) > 0 && (p.puddings || 0) >= maxPud) out.push('sg-pudding');
      return out; } },
  lay6: {
    end(v, me, m, w) { const out = [], p = spBy(v, me);
      if (!w) return out;
      if ((p.bullheads || 0) === 0) out.push('l6-clean');
      if ((p.taken || 0) >= 5) out.push('l6-taker');
      if ((v.players || []).length === 10) out.push('l6-crowd');
      if ((p.bullheads || 0) <= 3) out.push('l6-tight');
      return out; } },
  saboteur: {
    end(v, me, m, w) { const out = [], p = spBy(v, me);
      if (!w) return out;
      if (p.role === 'saboteur') out.push('sb-sab');
      if (p.role === 'digger') out.push('sb-digger');
      if ((p.gold || 0) >= 8) out.push('sb-rich');
      if ((v.players || []).length === 10) out.push('sb-crowd');
      return out; } },
  skull: {
    end(v, me, m, w) { const out = [], p = spBy(v, me);
      if (!w) return out;
      if ((p.lostCount || 0) === 0) out.push('sk-clean');
      if (v.endReason === 'match' && (p.points || 0) < 2) out.push('sk-survivor');
      if ((p.lostCount || 0) >= 1) out.push('sk-comeback');
      if ((v.players || []).length === 6) out.push('sk-crowd');
      return out; } },
  hanabi: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      if ((v.score || 0) >= 25) out.push('hb-perfect');
      if ((v.fuses || 0) === 3) out.push('hb-clean');
      if ((v.fuses || 0) === 1) out.push('hb-clutch');
      if ((v.players || []).length === 5) out.push('hb-crowd');
      return out; } },
  chan: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      out.push('ch-uu');
      if ((v.cuoc || []).includes('chiu')) out.push('ch-chiu');
      if ((v.cuoc || []).includes('thap')) out.push('ch-thap');
      if ((v.players || []).length === 4) out.push('ch-crowd');
      return out; } },
  totom: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      out.push('tt-uu');
      if ((v.cuoc || []).includes('tom') || (v.cuoc || []).includes('leo')) out.push('tt-phu');
      if ((v.cuoc || []).includes('khan')) out.push('tt-khanh');
      if ((v.players || []).length === 5) out.push('tt-crowd');
      return out; } },
  carcassonne: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      const comp = ((v.final || {}).completed || []);
      if (comp.some(e => e.kind === 'city' && (e.owners || []).includes(me) && (e.points || 0) >= 10)) out.push('ca-city');
      if (comp.some(e => e.kind === 'cloister' && (e.owners || []).includes(me))) out.push('ca-monk');
      const fields = ((v.final || {}).fields || []);
      const totals = {};
      for (const f of fields) for (const pid of (f.owners || [])) totals[pid] = (totals[pid] || 0) + (f.points || 0);
      const myField = totals[me] || 0;
      if (myField > 0 && Object.values(totals).every(t => t <= myField)) out.push('ca-farm');
      if ((v.players || []).length === 5) out.push('ca-crowd');
      return out; } },
  azul: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      const sum = ((v.final || {}).summary || {})[me] || {};
      if ((sum.rows || 0) >= 1) out.push('az-row');
      if ((sum.cols || 0) >= 1) out.push('az-col');
      if ((sum.colours || 0) >= 1) out.push('az-color');
      if ((v.players || []).length === 4) out.push('az-crowd');
      return out; } },
  splendor: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      const sum = ((v.final || {}).summary || {})[me] || {};
      if ((sum.nobles || 0) >= 1) out.push('sp-noble');
      if ((sum.gold || 0) >= 1) out.push('sp-gold');
      if ((sum.score || 0) >= 20) out.push('sp-rich');
      if ((v.players || []).length === 4) out.push('sp-crowd');
      return out; } },
  conhay: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      const sum = ((v.final || {}).summary || {})[me] || {};
      out.push('chn-first');
      if ((sum.jumpChainMax || 0) >= 4) out.push('chn-jump');
      if ((sum.turns || 0) < 25) out.push('chn-fast');
      if ((v.players || []).length === 6) out.push('chn-crowd');
      return out; } },
  backgammon: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if ((sum.hits || 0) >= 3) out.push('bg-hitter'); /* thắng hay thua đều tính — hits đếm cả ván */
      if (!w) return out;
      if (sum.winType === 'gammon') out.push('bg-gammon');
      if (sum.winType === 'backgammon') out.push('bg-backgammon');
      if (sum.cubeUsed === true || sum.winType === 'double') out.push('bg-cuber');
      return out; } },
  rummikub: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if ((sum.jokersPlayed || 0) >= 1) out.push('rk-joker');
      if (v.endCause === 'empty-hand') out.push('rk-empty');
      if ((sum.turns || 99) <= 20) out.push('rk-rush');
      if ((sum.score || 0) >= 100) out.push('rk-sweep');
      return out; } },
  quoridor: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if ((sum.turns || 99) <= 10) out.push('qd-fast');
      if ((sum.wallsLeft || 0) >= 5) out.push('qd-saver');
      if (Object.entries(((v.final || {}).summary || {})).some(([pid, s]) => pid !== me && (s.dist || 99) <= 1)) out.push('qd-close');
      if (sum.wallsLeft === 0) out.push('qd-spent');
      return out; } },
  blokus: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if ((sum.bonus || 0) >= 20) out.push('bk-perfect');
      if ((sum.bonus || 0) >= 15) out.push('bk-full');
      if ((sum.squaresLeft || 99) <= 10) out.push('bk-clean');
      if ((v.players || []).length === 2 && (sum.turns || 99) <= 35) out.push('bk-quick');
      return out; } },
  scrabble: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if ((sum.bingoCount || 0) >= 1) out.push('sc-bingo');
      if ((sum.wordsPlayed || 0) >= 10) out.push('sc-wordy');
      if ((sum.score || 0) >= 200) out.push('sc-big');
      if ((v.players || []).length === 4) out.push('sc-crowd');
      return out; } },
  mastermind: {
    end(v, me, m, w) { const out = [];
      const all = (v.final || {}).summary || {};
      const sum = all[me] || {};
      const opp = Object.entries(all).find(([id]) => id !== me);
      const osum = (opp && opp[1]) || {};
      if (!w) return out;
      if (sum.cracked && (sum.guesses || 99) <= 2) out.push('mm-fast');
      if (sum.cracked && (sum.guesses || 99) <= 4) out.push('mm-sharp');
      if ((osum.bestBlack || 0) >= 3) out.push('mm-comeback');
      if (!sum.cracked && (sum.guesses || 0) >= 10 && (osum.guesses || 0) >= 10) out.push('mm-last');
      return out; } },
  ailatrieuphu: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if ((sum.level || 0) >= 15) out.push('al-150');
      if ((sum.level || 0) >= 10) out.push('al-safe10');
      if ((sum.bestStreak || 0) >= 5) out.push('al-streak');
      const opp = (v.players || []).find(p => p.id !== me);
      if ((v.players || []).length === 2 && opp && opp.isBot && opp.level === 'hard') out.push('al-race');
      return out; } },
  haithat1gia: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo && (sum.correctGuesses || 0) >= 10) out.push('ht-perfect');
      if ((sum.bestStreak || 0) >= 5) out.push('ht-streak5');
      if (!v.solo && (v.players || []).length >= 4) out.push('ht-win4');
      if (!v.solo && (sum.caughtSets || 0) === 0 && (sum.setsPresented || 0) === 3) out.push('ht-uncaught');
      return out; } },
  doanhdong: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('dd-solo-win');
      if ((sum.bestStreak || 0) >= 3) out.push('dd-streak3');
      if (!v.solo && (v.players || []).length >= 4 && (sum.actedWords || 0) === 3 && (sum.actedGuessed || 0) === 3) out.push('dd-actor');
      if (!v.solo && (v.players || []).length >= 4) out.push('dd-win4');
      return out; } },
  wavelength: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('wl-solo-win');
      if (!v.solo && (sum.exactCount || 0) >= 2) out.push('wl-sharp');
      if (!v.solo && (v.players || []).length >= 4) out.push('wl-win4');
      if (v.solo && (sum.points || 0) >= 30) out.push('wl-master');
      return out; } },
  resistance: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('rs-solo-win');
      if (!v.solo && (sum.side || '') === 'spy') out.push('rs-spy-win');
      if (!v.solo && (v.players || []).length >= 7) out.push('rs-win7');
      if ((sum.side || '') === 'resistance' && (v.winsSpy || 0) === 0) out.push('rs-clean');
      return out; } },
  vetruyentin: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('vt-solo-win');
      if ((sum.wordsKept || 0) >= 5) out.push('vt-keep5');
      if (!v.solo && !v.race && (v.players || []).length >= 4) out.push('vt-win4');
      if (!v.solo && !v.race && (sum.correctGuesses || 0) >= 3) out.push('vt-guess3');
      return out; } },
  tetris: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('tt-solo-win');
      if ((sum.tetrisCount || 0) >= 1) out.push('tt-tetris');
      if ((sum.tetrisCount || 0) >= 2) out.push('tt-tetris2');
      if (v.race) out.push('tt-sprint-win');
      return out; } },
  ransanmoi: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('rsm-solo-win');
      if (v.race) out.push('rs-race-win');
      if (v.race && (sum.timeMs || 0) > 0 && (sum.timeMs || 0) < 45000) out.push('rs-fast');
      if (v.race && (v.players || []).length >= 4) out.push('rs-win4');
      return out; } },
  xepkeo: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('xc-solo-win');
      if ((sum.bestMoveScore || 0) >= 5000) out.push('xc-big-move');
      if ((sum.maxCascade || 0) >= 10) out.push('xc-cascade10');
      if (v.race) out.push('xc-race-win');
      return out; } },
  banbong: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('bb-solo-win');
      if (v.solo && (sum.ballsLost || 0) === 0) out.push('bb-clean');
      if (v.race) out.push('bb-race-win');
      if (v.race && (sum.score || 0) >= 500) out.push('bb-score500');
      return out; } },
  nonogram: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('ng-solo-win');
      if (v.solo && (sum.mistakes || 0) === 0) out.push('ng-clean');
      if (v.solo && v.size === 15) out.push('ng-hard15');
      if (v.race) out.push('ng-race-win');
      return out; } },
  ghephinh: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('gh-solo-win');
      if (v.solo && v.size === 5 && (sum.timeMs || 0) < 60000) out.push('gh-fast5');
      if (v.solo && (sum.peeks || 0) === 0) out.push('gh-nopeek');
      if (v.race) out.push('gh-race-win');
      return out; } },
  nhen: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('nh-solo-win');
      if (v.solo && v.suits === 4) out.push('nh-hard4');
      if (v.solo && (sum.undosUsed || 0) === 0) out.push('nh-noundo');
      if (v.race) out.push('nh-race-win');
      return out; } },
  bida8: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('bd-solo-win');
      if (v.race) out.push('bd-race-win');
      if ((sum.fouls || 0) === 0) out.push('bd-clean');
      if (v.race && (sum.shots || 0) <= 10) out.push('bd-sharp');
      return out; } },
  dapenalty: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('dp-solo-win');
      if (!v.solo && (sum.conceded || 0) <= 1) out.push('dp-clean5');
      if (!v.solo && sum.trailed === true) out.push('dp-comeback');
      if (!v.solo && (sum.maxStreak || 0) >= 5) out.push('dp-streak5');
      return out; } },
  phitieu: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if ((sum.maxVisit || 0) >= 180) out.push('ph-180');
      if (!w) return out;
      if (v.solo) out.push('ph-solo-win');
      if (!v.solo) out.push('ph-match-win');
      if (!v.solo && (sum.tons || 0) >= 3) out.push('ph-ton3');
      return out; } },
  keobuabao: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('kbb-solo-win');
      if (!v.solo) out.push('kbb-match-win');
      if (!v.solo && sum.trailed02 === true) out.push('kbb-comeback');
      if (!v.solo && (sum.maxStreak || 0) >= 3) out.push('kbb-streak3');
      return out; } },
  dovui: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('dv-solo-win');
      if (sum.right === v.total && (v.total || 0) > 0) out.push('dv-perfect');
      if ((sum.best || 0) >= 5) out.push('dv-streak5');
      if (!v.solo && (v.players || []).length >= 8) out.push('dv-champ');
      return out; } },
  lansau: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('ls-solo-win');
      if ((sum.score || 0) >= 700) out.push('ls-perfect');
      if ((sum.rare || 0) >= 3) out.push('ls-rare');
      if ((sum.score || 0) >= 500) out.push('ls-deep');
      return out; } },
  vuatiengviet: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if (v.solo) out.push('vtv-solo-win');
      if ((sum.score || 0) >= 150) out.push('vtv-perfect');
      if ((sum.best || 0) >= 5) out.push('vtv-streak');
      if ((v.players || []).length >= 8) out.push('vtv-champ');
      return out; } },
  doannhac: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      const p = spBy(v, me);
      if (v.solo) out.push('dn-solo-win');
      if ((p.pts || 0) >= 500) out.push('dn-score500');
      if ((p.ok || 0) >= (v.total || 0) && (v.total || 0) > 0) out.push('dn-perfect');
      if (!v.solo && (v.players || []).length >= 8) out.push('dn-champ');
      return out; } },
  honkem: {
    end(v, me, m, w) { const out = [];
      if (!w) return out;
      const p = spBy(v, me);
      if (v.solo) out.push('hk-solo-win');
      if ((p.best || 0) >= 10) out.push('hk-streak10');
      if ((p.ok || 0) >= (v.rounds || 0) && (v.rounds || 0) > 0) out.push('hk-perfect');
      if (!v.solo && (v.players || []).length >= 8) out.push('hk-champ');
      return out; } },
  hoisanquai: {
    end(v, me, m, w) { const out = [];
      const sum = ((v.final || {}).summary || {})[me] || {};
      if (!w) return out;
      if ((sum.slain || 0) >= 3) out.push('hsq-slayer');
      if ((sum.classes || 0) >= 6) out.push('hsq-rainbow');
      if ((v.players || []).length >= 4) out.push('hsq-win4');
      if ((sum.slain || 0) >= 3 && (sum.classes || 0) >= 4) out.push('hsq-flawless');
      return out; } },
  tienlen: {
    tick(v, me, m) { for (const e of spFx(v, m)) {
      if (e.k === 'toitrang' && e.from === me) m.trang = 1;
      if (e.k === 'cong' && e.from === me) m.cong = 1;
      if (e.k === 'chop' && e.from === me) { if (e.heo) m.chop = 1; if (/đôi thông/.test(e.by || '') && +String(e.by).trim()[0] >= 3) m.d3 = 1; if (/^Tứ quý/.test(e.by || '')) m.quad = 1; }
      if (e.k === 'chop' && e.to === me && e.heo) m.chopped = 1; } },
    end(v, me, m) { const o = []; for (const [k, id] of [['trang', 'tl-trang'], ['chop', 'tl-chop'], ['cong', 'tl-cong'], ['d3', 'tienlen-3doi'], ['quad', 'tienlen-quad'], ['chopped', 'tienlen-chopped']]) if (m[k]) o.push(id); return o; } },
  xidach: {
    end(v, me) { const p = spBy(v, me), r = p.res || null, c = p.cards || [], o = []; if (!r) return o;
      if (r.kind === 'xiban') o.push('xd-xiban'); if (r.kind === 'xidach') o.push('xidach-bj'); if (r.kind === 'ngulinh') o.push('xd-ngulinh'); if (r.kind === 'quac') o.push('xd-quac');
      if (r.kind !== 'quac' && r.pts === 21 && c.length >= 3) o.push('xidach-21'); if (r.r === 'win' && r.pts === 16) o.push('xidach-16'); return o; } },
  bacao: {
    end(v, me, m, w, cnt) { const r = (spBy(v, me) || {}).res || null, o = []; if (!r) return o;
      if (r.kind === 'batay') o.push('bacao-3tay'); if (r.kind === 'sap') o.push('bacao-sap'); if (r.kind === 'diem' && r.pts === 0) o.push('bacao-bu');
      if (r.kind === 'diem' && r.pts === 9) cnt('bc9', 1); else cnt('bc9', -cnt('bc9')); if (cnt('bc9') >= 3) o.push('bacao-nine3'); return o; } },
  cotuong: {
    end(v, me, m, w) { const r = v.result || {}, sd = (spBy(v, me) || {}).side, mv = v.moves || [], last = mv[mv.length - 1] || {}, o = [], opp = sd === 'r' ? 'b' : 'r';
      if (w && r.kind === 'mate' && (v.nMoves || 99) <= 39) o.push('ct-fast'); if (w && r.kind === 'mate' && String(last.piece).toUpperCase() === 'H') o.push('cotuong-horse');
      if (w && v.caps && !(v.caps[opp] || []).some(c => String(c).toUpperCase() === 'R')) o.push('cotuong-rook'); return o; } },
  thathaythach: {
    end(v, me, m, w, cnt) { const p = spBy(v, me); cnt('tht-d', +p.d || 0); cnt('tht-t', +p.t || 0); const out = []; if (cnt('tht-d') >= 10) out.push('tht-dare10'); if (cnt('tht-t') >= 10) out.push('tht-truth10');
      if ((+p.skip || 0) >= 3) out.push('thathaythach-skip3'); if ((v.players || []).length >= 8) out.push('thathaythach-party8'); if (v.opts && (v.opts.custom || []).length) out.push('thathaythach-ai'); return out; } },
  baitan: {
    end(v, me, m, w) { const out = []; if (w && v.opts && v.opts.team) out.push('bt-team'); if (v.loser === me) out.push('bt-last'); if (w && (v.players || []).length === 4 && !(v.opts && v.opts.team)) out.push('baitan-solo4'); return out; } },
  loto: {
    end(v, me, m, w) { const out = []; if (w && (v.called || []).length < 20) out.push('loto-fast'); if (!w && spBy(v, me).best === 4) out.push('loto-wait'); return out; } },
  covua: {
    end(v, me, m, w) { const r = v.result || {}, sd = (spBy(v, me) || {}).side, mv = v.moves || [], last = mv[mv.length - 1] || {}, o = [];
      if (w && r.kind === 'mate' && (v.nMoves || 99) <= 39) o.push('cv-fast'); if (w && r.kind === 'mate' && String(last.piece).toUpperCase() === 'N') o.push('covua-knight');
      if (mv.some(x => x.side === sd && x.promo === 'q')) o.push('covua-promote'); if (r.kind === 'stale') o.push('covua-stalemate'); return o; } },
  tala: {
    end(v, me) { const out = []; if (v.u === me) out.push('tala-u'); if (v.done && v.done[me] && v.done[me].mom) out.push('tala-mom'); return out; } },
  tusac: {
    end(v, me, m, w) { const ms = (v.result && v.result.hand && v.result.hand.melds) || []; return w && JSON.stringify(ms).includes('quan') ? ['ts-quan'] : []; } },
  bantau: {
    tick(v, me, m) { const l = v.lastShot; if (!l || l.by !== me) return; const k = l.cell + '|' + l.n + '|' + l.res; if (m.lk === k) return; m.lk = k;
      if (l.res === 'miss') m.miss = (m.miss || 0) + 1; else if (l.res === 'hit' || l.res === 'sink') m.miss = 0;
      if ((m.miss || 0) >= 10) m.m10 = 1; },
    end(v, me, m, w) { const o = [], shots = (v.you && v.you.shots) || {}; if (w && Object.keys(shots).length < 40) o.push('bantau-fast'); if (((v.you && v.you.sunk) || [])[0] === 'carrier') o.push('bantau-carrier'); if (m.m10) o.push('bantau-miss10'); return o; } },
  oanquan: {
    end(v, me, m, w) { const idx = (v.players || []).findIndex(p => p.id === me); if (idx < 0) return []; const sc = v.scores || [], my = sc[idx], fo = sc[1 - idx]; if (!my || !fo) return []; const o = [];
      if ((my.debt || 0) > 0) o.push('oaq-borrow'); if (w && my.total - fo.total > 20) o.push('oanquan-big'); if (!w && !v.draw && (my.bag || {}).q === 0) o.push('oanquan-noquan'); return o; } },
  cothu: {
    tick(v, me, m) { const l = v.lastMove; if (!l || m.lmn === l.n) return; m.lmn = l.n;
      const atk = Math.abs(((v.cells || [])[l.to.y * 7 + l.to.x]) || 0);
      if (l.by === me && l.jump && [6, 7].includes(atk)) m.jump = 1;
      if (l.by !== me && l.captured === 1 && atk === 8) m.eleph = 1; },
    end(v, me, m, w) { const o = [], foe = (v.players || []).find(p => p.id !== me);
      if (w && foe && !((v.captured || {})[foe.id] || []).length) o.push('cothu-flawless');
      if (m.jump) o.push('cothu-jump'); if (m.eleph) o.push('cothu-elephant'); return o; } },
  /* --- thêm 20261118: 8 game mới (tick/end gộp 2 đợt) --- */
  sam: {
    end(v, me, m, w) { const r = v.result || {}, out = []; if (r.sam === me && w) out.push('sam-bao'); if (r.white && w) out.push('sam-trang'); if (r.sam === me && r.block) out.push('sam-chan'); return out; } },
  baucua: {
    tick(v, me, m) { const d = v.dice; if (Array.isArray(d) && d.length === 3 && d[0] === d[1] && d[1] === d[2] && spOnce(m, v, 'tri') && ((v.bets || {})[me] || {})[d[0]]) m.tri = 1; if ((v.relief || []).includes(me)) m.broke = 1; if ((v.relief || []).includes(me) && m.rr !== v.round) { m.rr = v.round; m.nb = (m.nb || 0) + 1; } },
    end(v, me, m) { const out = []; if (m.tri) out.push('bc-triple'); if (m.broke) out.push('bc-broke'); if ((m.nb || 0) >= 2) out.push('baucua-broke2'); return out; } },
  noitu: {
    tick(v, me, m) { const l = v.last; if (!l) return;
      if (spOnce(m, v, 'nt')) { if (l.t === 'ok') { m.prevMine = l.by === me; if (l.by === me && l.voted) m.vote = 1; } else if (l.t === 'miss') { if (m.prevMine && l.by !== me && !l.hint) m.stump = 1; if (l.by === me && l.why === 'time') m.to = (m.to || 0) + 1; m.prevMine = false; } }
      if (spOnce(m, v, 'n2')) { if (l.t === 'ok' && l.by === me) m.ok = (m.ok || 0) + 1; if (l.t === 'miss' && l.out && m.out1 == null) m.out1 = l.by; } },
    end(v, me, m, w) { const out = []; if (m.stump) out.push('nt-stump'); if (m.vote) out.push('nt-vote'); if ((m.to || 0) >= 3) out.push('nt-timeout'); if (w && (v.players || []).length >= 5) out.push('noitu-last5'); if ((m.ok || 0) >= 20) out.push('noitu-chain20'); if (m.out1 === me) out.push('noitu-out1'); return out; } },
  xuyenviet: {
    end(v, me) { const r = (v.result || []).find(x => x.id === me), out = []; if (!r) return out; if (r.bonus > 0) out.push('xv-long'); const t = Array.isArray(r.tickets) ? r.tickets : []; if (t.length && !t.some(x => x.ok)) out.push('xv-fail'); if (t.filter(x => x.ok).length >= 5) out.push('xuyenviet-ticket5'); return out; } },
  khaihoang: {
    tick(v, me, m) { const nm = spBy(v, me).name; if (!nm) return; m.seen = m.seen || {}; for (const line of v.log || []) if (line.startsWith('🫳') && line.endsWith(`của ${nm}.`) && !m.seen[line + v.seq]) { m.seen[line + v.seq] = 1; m.rob = (m.rob || 0) + 1; } },
    end(v, me, m) { const out = []; if (v.longest === me && v.army === me) out.push('kh-both'); if ((m.rob || 0) >= 3) out.push('kh-robbed'); return out; } },
  daochinh: {
    tick(v, me, m) { const l = v.last; if (!l) return;
      const ROLE = { tax: 'duke', assassinate: 'assassin', steal: 'captain', exchange: 'ambassador' };
      if (spOnce(m, v, 'dc')) { const mine = (spBy(v, me).cards || []).filter(c => !c.dead).map(c => c.r);
        if (l.t === 'act' && l.by === me && ROLE[l.act] && !mine.includes(ROLE[l.act])) m.bluff = (m.bluff || 0) + 1;
        if (l.t === 'block' && l.by === me && !mine.includes(l.role)) m.bluff = (m.bluff || 0) + 1;
        if (l.t === 'reveal' && l.who === me && l.ok === false) m.caught = (m.caught || 0) + 1; }
      if (spOnce(m, v, 'd2')) { if (l.t === 'reveal' && l.by === me && l.ok === false) m.catch = (m.catch || 0) + 1; if (l.t === 'act') m.lastAct = l; if (l.t === 'lost' && l.who === me && m.lastAct && m.lastAct.act === 'assassinate' && m.lastAct.target === me) m.ass = (m.ass || 0) + 1; } },
    end(v, me, m, w) { const out = []; if ((m.bluff || 0) - (m.caught || 0) >= 3) out.push('dc-bluff3'); if (m.caught) out.push('dc-caught'); if (w && !(spBy(v, me).cards || []).some(c => c.dead)) out.push('daochinh-clean'); if ((m.catch || 0) >= 3) out.push('daochinh-catch3'); if ((m.ass || 0) >= 2) out.push('daochinh-assassin'); return out; } },
  cuuho: {
    end(v, me, m, w) { const r = v.result || {}, out = []; if (r.win) out.push('cuuho-cure4'); if (r.win && !(v.outbreaks || 0)) out.push('cuuho-nobreak'); if (!r.win && /thẻ cứu hộ/.test(r.why || '')) out.push('cuuho-nocard'); if (r.win && v.opts && v.opts.epi === 6) out.push('ch-hard'); if (r.win && (v.outbreaks || 0) >= 7) out.push('ch-close'); return out; } },
  xiecthu: {
    tick(v, me, m) { if (v.critic === me) m.critic = 1; },
    end(v, me, m) { return m.critic || v.critic === me ? ['xt-critic'] : []; } },
};
export function record(game, won, extra = [], info = {}) {
  const s = load(), g = s.g[game] = s.g[game] || { p: 0, w: 0 }, d = new Date(), day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') /* ngày theo giờ máy, không phải UTC */, before = level(totals(s)).lv;
  const wasFirst = Object.values(s.g).reduce((n, x) => n + (x.p || 0), 0) === 0; /* ván đầu tiên trên máy này (cho c-firstloss) */
  const ls0 = s.ls || 0; /* chuỗi thua trước ván này (cho c-comeback) */
  const prevT = Math.max(0, ...Object.values(s.g).map(x => x.last || 0)); /* lần chơi gần nhất trước ván này (cho c-back) */
  g.p++; g.last = Date.now(); s.first = s.first || Date.now();
  if (won === true) { try { questWin(game); } catch (e) {} /* 📅 Thử thách hôm nay */ g.w++; s.streak++; s.best = Math.max(s.best, s.streak); g.st = (g.st || 0) + 1; g.bs = Math.max(g.bs || 0, g.st); g.lst = 0; s.ls = 0; } else if (won === false) { s.streak = 0; g.st = 0; g.lst = (g.lst || 0) + 1; g.l = (g.l || 0) + 1; s.ls = ls0 + 1; }
  if (!s.days.includes(day)) { s.days.push(day); if (s.days.length > 400) s.days.shift(); }
  if (d.getHours() < 5) s.night = 1;
  if (!s.dd || s.dd.d !== day) s.dd = { d: day, n: 0, k: [], w: [] }; s.dd.n++; if (!s.dd.k.includes(game)) s.dd.k.push(game); if (won === true && !s.dd.w.includes(game)) s.dd.w.push(game);
  /* dấu mốc vui: chỉ ghi khi điều kiện xảy ra, ok() trong ACHS đọc lại từ totals().marks */
  const mk = id => { s.marks[id] = 1; };
  if (won === true && d.getHours() < 5) mk('c-dawn');
  if (d.getMonth() === 0 && d.getDate() === 1 && d.getHours() === 0) mk('c-newyear');
  if (won === false && wasFirst) mk('c-firstloss');
  if (won === true && ls0 >= 5) mk('c-comeback');
  if (prevT && Date.now() - prevT >= 30 * 864e5) mk('c-back');
  if (won === true && info.dur && info.dur < 120000) mk('c-quick');
  if (info.dur && info.dur > 3600000) mk('c-long');
  if ((info.n || 0) >= 8) mk('c-crowd');
  if (s.days.some(x => { const dt = new Date(x + 'T12:00:00'); return dt.getDay() === 6 && s.days.includes(dayAfter(x)); })) mk('c-weekend');
  const t = totals(s), fresh = checkFresh(s);
  for (const id of extra || []) { const a = ACH_BY_ID.get(id); if (a && a.soon) continue; /* thành tựu soon:true (chưa có cách phát hiện) không được record */ if (!s.ach[id]) { s.ach[id] = Date.now(); if (a) { awardAch(a); fresh.push({ ...a, id }); } } } /* thành tựu riêng từng game do SP.end/tick phát hiện */
  save(s);
  let xuEarned = 0; try { xuEarned = earnGame(won); } catch (e) {} /* 💰 ví xu chung toàn web */
  try { dispatchEvent(new CustomEvent('gumballz-stats', { detail: { game, won, fresh } })); } catch (e) {}
  const up = level(t); const achXu = fresh.reduce((n, a) => n + (a.xu || 0), 0); /* 💰 tổng xu thành tựu vừa mở ở ván này (đã trả trong checkFresh/extra ở trên) */ const msgs = []; if (up.lv > before) { msgs.push(`⭐ Lên cấp ${up.lv}: ${up.name}`); for (const p of LOCKED_PARTS.filter(x => x.lv > before && x.lv <= up.lv)) msgs.push(`🔓 Mở khóa ${itemLabel(p.k, p.v)}`); } /* 🧸 linh kiện mở theo cấp: cấp suy ra từ XP nên không cần lưu riêng — đủ cấp là mở, kể cả khi lên nhiều cấp cùng lúc */
  if (xuEarned > 0 || achXu > 0) msgs.push(`🪙 +${xuEarned + achXu} xu vào ví${achXu > 0 ? ` (gồm +${achXu} xu thành tựu)` : ''}`);
  if (fresh.length) setTimeout(() => import('./achpop.js?v=2').then(m => m.achPopup(fresh)).catch(() => {}), 1600); /* popup mở khoá thành tựu */
  if (msgs.length) import('./dialog.js?v=10').then(m => msgs.forEach((x, i) => setTimeout(() => m.toast(x, 3600), 1800 + i * 3800))).catch(() => {});
  return fresh;
}
/* ghi sự kiện trong ván (Bắn Tàu, Ô Ăn Quan, Cờ Caro, TicTacToe và Memory dùng): chìm tàu, chuỗi trúng, dùng vật phẩm, ăn Quan, ăn dây, cứu dân, thắng nhanh… – không đổi số ván/thắng */
export function recordEvent(game, type, data = {}) {
  if (game !== 'bantau' && game !== 'oanquan' && game !== 'caro' && game !== 'tictactoe' && game !== 'memory' && game !== 'covay' && game !== 'cothu' && game !== 'ranvathang') return [];
  const s = load(), ev = s.ev = s.ev || {};
  if (game === 'tictactoe') {
    const tt = ev.tt = ev.tt || { drawHard: 0 };
    if (type === 'end') { if (data.draw && data.foeBot && data.foeLevel === 'hard') tt.drawHard++; }
    else return [];
  } else if (game === 'memory') {
    const mm = ev.mm = ev.mm || { perfect: 0, fast: 0 };
    if (type === 'end') {
      if (data.solo && data.level === 'medium' && data.won !== false && (data.misses || 0) === 0) mm.perfect++;
      if (data.solo && data.level === 'medium' && (data.seconds || 0) < 60) mm.fast++;
    } else return [];
  } else if (game === 'cothu') {
    const ct = ev.ct = ev.ct || { ratElephant: 0, denWin: 0 };
    if (type === 'capture') { if (data.attacker === 'rat' && data.victim === 'elephant') ct.ratElephant++; }
    else if (type === 'end') { if (data.won && data.byDen) ct.denWin++; }
    else return [];
  } else if (game === 'ranvathang') {
    const rt = ev.rt = ev.rt || { ladder28: 0, snake87: 0 };
    if (type === 'climb') { if (data.from === 28) rt.ladder28++; }
    else if (type === 'slide') { if (data.from === 87) rt.snake87++; }
    else return [];
  } else if (game === 'covay') {
    const cv = ev.cv = ev.cv || { win19: 0, bigwin: 0 };
    if (type === 'end') { if (data.won) { if (data.size === 19) cv.win19++; if ((data.margin || 0) >= 20) cv.bigwin++; } }
    else return [];
  } else if (game === 'caro') {
    const cr = ev.cr = ev.cr || {}; cr.fast = cr.fast || 0; cr.fast19 = cr.fast19 || 0; cr.fastloss = cr.fastloss || 0; /* fast19/fastloss thêm 20261118 cho caro-fast / caro-fastloss (thắng/thua dưới 10 nước) */
    if (type === 'end') { if (data.won && (data.moves || 0) < 30) cr.fast++; if (data.won && (data.moves || 0) <= 19) cr.fast19++; if (!data.won && (data.moves || 0) <= 19) cr.fastloss++; /* hòa là bàn đầy 900 nước nên không lọt vào đây */ }
    else return [];
  } else if (game === 'oanquan') {
    const oq = ev.oq = ev.oq || { quan: 0, chainMax: 0, rescues: 0, flawless: 0, bothQuan: 0, comeback: 0 };
    if (type === 'eat') { oq.quan += data.q || 0; oq.chainMax = Math.max(oq.chainMax, data.chain || 0); }
    else if (type === 'chain') oq.chainMax = Math.max(oq.chainMax, data.chain || 0);
    else if (type === 'rescue') oq.rescues++;
    else if (type === 'end') {
      if ((data.quanEaten || 0) >= 2) oq.bothQuan++;
      if (data.won && (data.oppQuan || 0) === 0) oq.flawless++; /* thắng mà đối phương không ăn được Quan nào */
      if (data.won && (data.rescues || 0) >= 1) oq.comeback++;
    } else return [];
  } else {
    const bt = ev.bt = ev.bt || { sinks: 0, sinkGame: { gid: '', n: 0 }, sinkMax: 0, hitStreak: 0, items: {}, itemsUsed: 0, flawless: 0, trap: 0, radarHit: 0, nukeSink: 0 };
    if (type === 'sink') {
      bt.sinks++;
      if (!bt.sinkGame || bt.sinkGame.gid !== data.gid) bt.sinkGame = { gid: data.gid || '', n: 1 };
      else bt.sinkGame.n++;
      bt.sinkMax = Math.max(bt.sinkMax, bt.sinkGame.n);
    } else if (type === 'hit') bt.hitStreak = Math.max(bt.hitStreak, +data.streak || 0);
    else if (type === 'item' && data.item) { if (!bt.items[data.item]) bt.items[data.item] = 1; bt.itemsUsed++; }
    else if (type === 'flawless') bt.flawless++;
    else if (type === 'traptrigger') bt.trap++;
    else if (type === 'radarhit') bt.radarHit++;
    else if (type === 'nukesink') bt.nukeSink++;
    else return [];
  }
  const fresh = checkFresh(s);
  save(s);
  try { dispatchEvent(new CustomEvent('gumballz-stats', { detail: { game, won: null, fresh } })); } catch (e) {}
  if (fresh.length) setTimeout(() => import('./achpop.js?v=2').then(m => m.achPopup(fresh)).catch(() => {}), 1600); /* popup mở khoá thành tựu */
  return fresh;
}
const live = {};
export function observe(game, view, me) {
  try {
    const st = live[game] = live[game] || { active: false };
    if (!view) { st.active = false; return; }
    if (view.spec || !OVER[game]) return;
    const id = view.me != null && typeof view.me !== 'object' ? view.me : (Array.isArray(view.controlled) && view.controlled[0]) || me;
    const r = OVER[game](view, id), sp = SP[game];
    if (!r) {
      if (!st.active) { st.m = {}; st.t0 = Date.now(); st.n = 0; }
      st.active = true;
      st.n = Math.max(st.n || 0, (view.players || []).length, (window.__gumballzPeers || []).length || 0);
      if (sp && sp.tick) try { sp.tick(view, id, st.m || (st.m = {})); } catch (e) {}
      return;
    }
    if (st.active) {
      st.active = false;
      if (sp && sp.tick) try { sp.tick(view, id, st.m || (st.m = {})); } catch (e) {} /* tick nốt view cuối: nước cuối vẫn có thể mở thành tựu */
      let extra = [];
      if (sp && sp.end) try { const s0 = load(), cnt = counter(s0); extra = sp.end(view, id, st.m || {}, r.won === true, cnt) || []; if (s0.cnt) save(s0); } catch (e) {}
      record(game, r.won, extra, { dur: st.t0 ? Date.now() - st.t0 : 0, n: st.n || 0 });
      st.n = 0;
    }
  } catch (e) {}
}
// bọc handlers của net.js: giữ nguyên mọi hàm khác, chỉ nghe lén onState
export function watch(game, handlers, getId) {
  if (!handlers || typeof handlers.onState !== 'function') return handlers;
  const w = Object.create(handlers);
  w.onState = function (view, ...rest) { observe(game, view, getId ? getId() : null); return handlers.onState.call(handlers, view, ...rest); };
  return w;
}
// ☁️ có đăng nhập thì nạp phần đồng bộ hồ sơ theo tài khoản (khách không nạp gì thêm)
const hasAuth = () => { try { return !!JSON.parse(ls.get('gumballz-auth') || 'null'); } catch (e) { return false; } };
let syncOn = false; const startSync = () => { if (syncOn || !hasAuth()) return; syncOn = true; import('./sync.js?v=51').catch(() => { syncOn = false; }); };
try { startSync(); addEventListener('gumballz-auth', startSync); } catch (e) {}
// 📸 nút "Khoe kết quả" sau ván thắng (shared/ui/brag.js)
try { if (typeof document !== 'undefined') import('./brag.js?v=36').catch(() => {}); } catch (e) {}
// 🎉 hiệu ứng khi thắng ván (shared/ui/winfx.js, chọn ở Hồ sơ → 🎉 Khi thắng)
try { if (typeof document !== 'undefined') import('./winfx.js?v=1').catch(() => {}); } catch (e) {}
