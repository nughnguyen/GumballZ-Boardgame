// 🛡️ The Resistance — tên nhiệm vụ, tên máy, mô tả vai trò (tiếng Việt).
export const MISSIONS = [
  { name: 'Đột nhập kho vũ khí', desc: 'Lấy trộm vũ khí từ kho của Đế chế.' },
  { name: 'Phá đường dây liên lạc', desc: 'Cắt đứt liên lạc giữa các căn cứ địch.' },
  { name: 'Giải cứu tù nhân', desc: 'Đưa đồng đội bị bắt ra khỏi nhà tù.' },
  { name: 'Đánh bom cầu chiến lược', desc: 'Phá cây cầu vận chuyển quân của địch.' },
  { name: 'Tấn công tổng hành dinh', desc: 'Nhiệm vụ cuối cùng — quyết định số phận kháng chiến!' },
];

export const BOT_NAMES = ['Mochi', 'Bơ', 'Pudding', 'Xôi', 'Kẹo', 'Nấm', 'Sữa', 'Đậu', 'Bánh'];

export const ROLE_TEXT = {
  resistance: {
    short: 'Kháng chiến',
    icon: '🛡️',
    desc: 'Bạn là Kháng chiến. Mục tiêu: để 3 nhiệm vụ thành công. Bạn không biết ai là Gián điệp — hãy nghe họ nói, nhìn họ bỏ phiếu, và đoán!',
  },
  spy: {
    short: 'Gián điệp',
    icon: '🕵️',
    desc: 'Bạn là Gián điệp! Đồng đội gián điệp của bạn được hiện ở dưới. Mục tiêu: làm 3 nhiệm vụ thất bại (hoặc khiến bàn từ chối 5 đội liên tiếp). Trong nhiệm vụ, bạn được chọn Thất bại — nhưng đừng lộ liễu quá!',
  },
};

export const TIPS = [
  'Gián điệp thường bỏ phiếu Đồng ý cho đội có gián điệp — để ý ai ủng hộ đội thất bại.',
  'Nhiệm vụ thất bại mà đội chỉ có 2 người thì 1 trong 2 chắc chắn là gián điệp.',
  'Đừng vội kết tội người từ chối đội của bạn — có thể họ nghi đội có gián điệp.',
  'Thủ lĩnh nên đề cử đội có người từng ở nhiệm vụ thành công.',
  'Gián điệp khôn sẽ chọn Thành công ở nhiệm vụ đầu để lấy lòng tin.',
];

export default MISSIONS;
