// 🔐 Mật Thư — kho từ + chủ đề gợi ý (thuần dữ liệu, không chạm DOM).
// Mỗi chủ đề = 1 từ gợi ý + các từ trên bàn thuộc chủ đề đó. Bot Mật Thư
// dùng bảng này để ra gợi ý (mật vụ) và đoán (điệp viên).
// Từ trên bàn là danh từ thường (cụm 1–2 từ, không tên riêng); từ gợi ý
// luôn là 1 từ duy nhất (luật: gợi ý chỉ được 1 từ).
// WORDS được suy ra từ THEMES nên mọi từ trên bàn đều có ít nhất 1 gợi ý.
export const THEMES = [
  { clue: 'BIỂN', words: ['biển', 'cá', 'thuyền', 'sóng', 'cát', 'đảo', 'mực', 'cua', 'tôm', 'sò', 'ốc', 'san hô'] },
  { clue: 'TRỜI', words: ['mây', 'mưa', 'nắng', 'gió', 'sấm', 'chớp', 'sao', 'trăng', 'mặt trời', 'bão', 'cầu vồng'] },
  { clue: 'RỪNG', words: ['cây', 'lá', 'rừng', 'hổ', 'khỉ', 'voi', 'gấu', 'chim', 'hoa', 'nấm', 'suối', 'đá'] },
  { clue: 'NHÀ', words: ['nhà', 'cửa', 'bàn', 'ghế', 'giường', 'bếp', 'tủ', 'đèn', 'gương', 'chén', 'đũa', 'nồi'] },
  { clue: 'ĂN', words: ['cơm', 'phở', 'bánh', 'thịt', 'rau', 'đường', 'muối', 'chè', 'kem', 'sữa', 'bún', 'mì'] },
  { clue: 'TRƯỜNG', words: ['trường', 'lớp', 'bảng', 'sách', 'bút', 'thước', 'cặp', 'thầy', 'trò', 'bài', 'thi', 'vở'] },
  { clue: 'BỆNH', words: ['bác sĩ', 'thuốc', 'bệnh', 'kim', 'băng', 'y tá', 'khám', 'sốt', 'ho', 'đau', 'viện', 'cấp cứu'] },
  { clue: 'ĐẤU', words: ['bóng', 'đá', 'chạy', 'bơi', 'nhảy', 'vợt', 'lưới', 'sân', 'gôn', 'đua', 'thắng', 'thua'] },
  { clue: 'NHẠC', words: ['nhạc', 'hát', 'đàn', 'trống', 'sáo', 'ca sĩ', 'loa', 'múa', 'nhảy', 'điệu'] },
  { clue: 'XE', words: ['xe', 'tàu', 'đường', 'cầu', 'bến', 'ga', 'lái', 'xăng', 'lốp', 'còi', 'kẹt'] },
  { clue: 'TIỀN', words: ['tiền', 'vàng', 'bạc', 'ngân hàng', 'ví', 'mua', 'bán', 'chợ', 'giá', 'nợ', 'lương', 'tiết kiệm'] },
  { clue: 'YÊU', words: ['yêu', 'hôn', 'cưới', 'nhẫn', 'tim', 'nhớ', 'thư', 'hẹn hò', 'đôi', 'tình'] },
  { clue: 'LÍNH', words: ['lính', 'súng', 'bom', 'đạn', 'trận', 'khiên', 'kiếm', 'giáp', 'thành', 'tướng', 'đánh', 'thắng'] },
  { clue: 'MA', words: ['ma', 'quỷ', 'hồn', 'đêm', 'mộ', 'phù thủy', 'sợ', 'la hét', 'bí mật', 'bóng tối'] },
  { clue: 'VUA', words: ['vua', 'hoàng hậu', 'cung điện', 'ngai vàng', 'vương miện', 'lâu đài', 'công chúa', 'triều đình'] },
  { clue: 'GẶT', words: ['nông dân', 'lúa', 'gà', 'vịt', 'bò', 'lợn', 'cừu', 'rơm', 'cày', 'ruộng', 'trứng', 'sữa'] },
  { clue: 'MÁY', words: ['máy tính', 'điện thoại', 'mạng', 'chuột', 'màn hình', 'robot', 'pin', 'sạc', 'phím', 'loa'] },
  { clue: 'THỜI', words: ['giờ', 'ngày', 'đêm', 'sáng', 'chiều', 'tối', 'tuần', 'tháng', 'năm', 'đồng hồ', 'lịch', 'mùa'] },
  { clue: 'MÀU', words: ['đỏ', 'xanh', 'vàng', 'trắng', 'đen', 'hồng', 'tím', 'cam', 'nâu', 'tím'] },
  { clue: 'NGƯỜI', words: ['đầu', 'tay', 'chân', 'mắt', 'tai', 'mũi', 'miệng', 'tóc', 'răng', 'tim', 'máu', 'da', 'xương'] },
  { clue: 'MẶC', words: ['áo', 'quần', 'váy', 'giày', 'dép', 'mũ', 'khăn', 'tất', 'túi', 'thắt lưng', 'áo dài'] },
  { clue: 'NÚI', words: ['núi', 'sông', 'hồ', 'suối', 'thác', 'sa mạc', 'đồng cỏ', 'hang', 'đảo', 'đá', 'đỉnh'] },
  { clue: 'THÚ', words: ['chó', 'mèo', 'chim', 'cá', 'hổ', 'voi', 'khỉ', 'gấu', 'rắn', 'ngựa', 'thỏ', 'cáo', 'sói', 'hươu', 'ong', 'bướm'] },
  { clue: 'QUẢ', words: ['táo', 'chuối', 'cam', 'nho', 'xoài', 'dưa', 'dâu', 'chanh', 'dừa', 'mít', 'vải', 'đào'] },
  { clue: 'RAU', words: ['rau', 'cải', 'cà chua', 'khoai', 'hành', 'tỏi', 'ớt', 'bắp', 'đậu', 'nấm', 'bí', 'dưa chuột'] },
  { clue: 'UỐNG', words: ['nước', 'trà', 'cà phê', 'sữa', 'bia', 'rượu', 'đá', 'đường', 'chanh', 'sinh tố'] },
  { clue: 'NGHỀ', words: ['bác sĩ', 'thầy', 'thợ', 'nông dân', 'công nhân', 'ca sĩ', 'diễn viên', 'phi công', 'cảnh sát', 'đầu bếp'] },
  { clue: 'TẾT', words: ['tết', 'sinh nhật', 'cưới', 'pháo', 'bánh chưng', 'lì xì', 'đèn lồng', 'hoa đào', 'múa lân', 'quà'] },
  { clue: 'CHƠI', words: ['cờ', 'bài', 'xúc xắc', 'bóng', 'dây', 'xếp hình', 'lego', 'búp bê', 'đồ chơi', 'vui', 'cười'] },
  { clue: 'SÁCH', words: ['sách', 'truyện', 'thơ', 'tiểu thuyết', 'tác giả', 'thư viện', 'đọc', 'trang', 'bìa', 'bút'] },
  { clue: 'PHIM', words: ['phim', 'diễn viên', 'đạo diễn', 'rạp', 'màn hình', 'kịch bản', 'hành động', 'hài', 'kinh dị', 'hoạt hình'] },
  { clue: 'NƯỚC', words: ['nước', 'sông', 'hồ', 'biển', 'mưa', 'suối', 'thác', 'giếng', 'ao', 'đầm', 'vòi', 'bình'] },
  { clue: 'LỬA', words: ['lửa', 'nến', 'diêm', 'than', 'khói', 'bếp', 'lò', 'đuốc', 'pháo', 'nóng', 'cháy'] },
  { clue: 'ĐÁ', words: ['đá', 'núi', 'sỏi', 'cát', 'kim cương', 'ngọc', 'hang', 'mỏ', 'tường', 'gạch'] },
  { clue: 'GỖ', words: ['gỗ', 'cây', 'rừng', 'bàn', 'ghế', 'cửa', 'tủ', 'thuyền', 'cầu', 'nhà sàn'] },
  { clue: 'KIM', words: ['sắt', 'thép', 'đồng', 'nhôm', 'vàng', 'bạc', 'dao', 'kéo', 'chìa khóa', 'đinh', 'ốc vít'] },
  { clue: 'ĐIỆN', words: ['điện', 'đèn', 'dây', 'bóng', 'pin', 'quạt', 'tủ lạnh', 'máy giặt', 'điều hòa', 'ổ cắm'] },
  { clue: 'BAY', words: ['chim', 'diều', 'bong bóng', 'phi công', 'cánh', 'mây', 'trời', 'gió', 'tên lửa', 'sao'] },
  { clue: 'BƠI', words: ['bơi', 'cá', 'thuyền', 'phao', 'hồ bơi', 'sóng', 'lặn', 'san hô', 'bãi biển', 'kính bơi'] },
  { clue: 'CHẠY', words: ['chạy', 'đua', 'giày', 'đường', 'sân', 'nhanh', 'mệt', 'đích', 'cầu thủ', 'marathon'] },
  { clue: 'NGỦ', words: ['ngủ', 'giường', 'gối', 'chăn', 'mơ', 'ác mộng', 'đêm', 'ngáp', 'buồn ngủ', 'báo thức'] },
  { clue: 'HỌC', words: ['học', 'sách', 'bài', 'thi', 'điểm', 'lớp', 'thầy', 'trò', 'bảng', 'vở', 'bút', 'cặp'] },
  { clue: 'LÀM', words: ['làm', 'việc', 'lương', 'công ty', 'văn phòng', 'sếp', 'họp', 'máy tính', 'hợp đồng', 'nghỉ'] },
  { clue: 'CƯỜI', words: ['cười', 'vui', 'hài', 'hề', 'xiếc', 'ảo thuật', 'bóng bay', 'kẹo', 'quà', 'sinh nhật'] },
  { clue: 'BUỒN', words: ['khóc', 'buồn', 'nước mắt', 'chia tay', 'nhớ', 'đau', 'ốm', 'thất bại', 'mưa', 'đêm'] },
  { clue: 'SỢ', words: ['sợ', 'ma', 'tối', 'sấm', 'rắn', 'nhện', 'cao', 'sâu', 'quỷ', 'ác mộng'] },
  { clue: 'GIẬN', words: ['giận', 'đánh', 'cãi', 'đỏ mặt', 'nắm đấm', 'la', 'hét', 'tức', 'bực', 'chiến tranh'] },
  { clue: 'ĐẸP', words: ['đẹp', 'hoa', 'gương', 'son', 'phấn', 'váy', 'tóc', 'ảnh', 'tranh', 'thời trang'] },
  { clue: 'BẨN', words: ['xấu', 'bẩn', 'rác', 'mùi', 'thối', 'cũ', 'rách', 'hỏng', 'gỉ', 'bụi'] },
  { clue: 'NHANH', words: ['nhanh', 'chạy', 'xe', 'gió', 'chớp', 'đua', 'bay', 'vội', 'gấp', 'tên lửa'] },
  { clue: 'CHẬM', words: ['chậm', 'rùa', 'ốc sên', 'lười', 'ngủ', 'chờ', 'tắc đường', 'già', 'nặng', 'bò'] },
  { clue: 'TO', words: ['to', 'voi', 'núi', 'khổng lồ', 'béo', 'lớn', 'rộng', 'cao', 'dài', 'chung cư'] },
  { clue: 'NHỎ', words: ['nhỏ', 'kiến', 'hạt', 'em bé', 'tí hon', 'lùn', 'hẹp', 'ngắn', 'bé', 'mini'] },
  { clue: 'NÓNG', words: ['nóng', 'lửa', 'nắng', 'sa mạc', 'ớt', 'sốt', 'mồ hôi', 'bếp', 'lò', 'hè'] },
  { clue: 'LẠNH', words: ['lạnh', 'tuyết', 'băng', 'đông', 'gió', 'áo ấm', 'kem', 'mưa đá', 'run', 'tủ lạnh'] },
  { clue: 'SÁNG', words: ['sáng', 'nắng', 'đèn', 'sao', 'trăng', 'lửa', 'kim cương', 'gương', 'mặt trời', 'bình minh'] },
  { clue: 'TỐI', words: ['tối', 'đêm', 'ma', 'bóng', 'trăng', 'sao', 'đèn', 'ngủ', 'mực', 'than'] },
  { clue: 'CAO', words: ['cao', 'núi', 'trời', 'chim', 'cây', 'cột', 'tháp', 'leo', 'chung cư', 'đỉnh'] },
  { clue: 'THẤP', words: ['thấp', 'lùn', 'hố', 'đáy', 'chìm', 'lặn', 'hầm', 'rễ', 'sâu', 'nặng'] },
  { clue: 'DÀI', words: ['dài', 'sông', 'đường', 'rắn', 'tóc', 'cầu', 'dây', 'tàu', 'năm', 'tháng'] },
  { clue: 'TRÒN', words: ['tròn', 'bóng', 'trăng', 'bánh', 'đồng xu', 'nhẫn', 'đĩa', 'vòng', 'mặt trời', 'bong bóng'] },
  { clue: 'VUÔNG', words: ['vuông', 'hộp', 'bàn', 'sách', 'cửa sổ', 'gạch', 'xúc xắc', 'khung', 'ảnh', 'ô'] },
  { clue: 'MỀM', words: ['mềm', 'gối', 'bông', 'mây', 'kem', 'bún', 'vải', 'lụa', 'đất sét', 'gấu bông'] },
  { clue: 'CỨNG', words: ['cứng', 'đá', 'sắt', 'kim cương', 'gỗ', 'xương', 'vỏ', 'gạch', 'thép', 'sọ'] },
  { clue: 'NGỌT', words: ['ngọt', 'đường', 'kẹo', 'bánh', 'mật', 'kem', 'chè', 'mứt', 'mía', 'xoài'] },
  { clue: 'CHUA', words: ['chua', 'chanh', 'giấm', 'me', 'khế', 'dưa chua', 'sữa chua', 'ổi', 'cóc', 'xoài xanh'] },
  { clue: 'CAY', words: ['cay', 'ớt', 'tiêu', 'gừng', 'mù tạt', 'nóng', 'sa tế', 'lẩu', 'phở', 'hắt hơi'] },
  { clue: 'MẶN', words: ['mặn', 'muối', 'biển', 'cá khô', 'nước mắm', 'dưa muối', 'mồ hôi', 'nước mắt'] },
  { clue: 'ĐẮNG', words: ['đắng', 'cà phê', 'thuốc', 'khổ qua', 'bia', 'lá', 'rễ', 'mứt'] },
  { clue: 'THƠM', words: ['thơm', 'hoa', 'nước hoa', 'trà', 'cà phê', 'bánh', 'cỏ', 'mưa', 'gió', 'nến'] },
  { clue: 'SẠCH', words: ['sạch', 'nước', 'xà phòng', 'khăn', 'gương', 'nhà', 'rửa', 'tắm', 'giặt', 'phơi'] },
  { clue: 'MỚI', words: ['mới', 'sinh nhật', 'quà', 'áo mới', 'nhà mới', 'năm mới', 'bé', 'non', 'xanh', 'tết'] },
  { clue: 'CŨ', words: ['cũ', 'cổ', 'xưa', 'rách', 'gỉ', 'bụi', 'ông bà', 'đồ cổ', 'sách cũ', 'nhà cũ'] },
];

/* Kho từ trên bàn = hợp nhất (duy nhất) mọi từ trong THEMES, xáo trộn lúc chia.
   Từ gợi ý cũng là 1 từ duy nhất (không dấu cách) để hợp lệ làm gợi ý. */
export const WORDS = [...new Set(THEMES.flatMap(t => t.words))];
/* Bản đồ gợi ý: mỗi từ khóa (gợi ý của chủ đề HOẶC 1 từ thành viên) → mọi từ
   trong các chủ đề chứa nó. Nhờ đó bot (và người chơi) có thể gợi ý bằng bất
   cứ từ nào liên quan, kể cả khi gợi ý chính của chủ đề trùng với 1 lá đang
   úp trên bàn — ván không bao giờ kẹt vì hết gợi ý. */
export const CLUE_MAP = new Map();
for (const t of THEMES) {
  const members = t.words.map(w => w.toLowerCase());
  const add = key => {
    const cur = CLUE_MAP.get(key) || new Set();
    for (const m of members) cur.add(m);
    CLUE_MAP.set(key, cur);
  };
  add(t.clue.toLowerCase());
  for (const m of members) add(m);
}
for (const [k, v] of CLUE_MAP) CLUE_MAP.set(k, [...v]);
