// 🌈 Wavelength — ngân hàng thang đo + gợi ý.
// 20 thang đo, mỗi thang 4 gợi ý viết tay (tổng 80 gợi ý). Mỗi gợi ý có
// 1 vị trí đích (target 0–100) trên thang: 0 = đầu trái, 100 = đầu phải.
// Ví dụ thang "Nóng ↔ Lạnh": "Nước sôi" ở 5 (rất nóng, gần đầu trái),
// "Kem que" ở 95 (rất lạnh, gần đầu phải).
export const SPECTRUMS = [
  { left: 'Nóng', right: 'Lạnh', clues: [
    { clue: 'Nước sôi', target: 5 },
    { clue: 'Cà phê nóng', target: 22 },
    { clue: 'Nước ấm tắm', target: 40 },
    { clue: 'Kem que', target: 95 },
  ] },
  { left: 'Ngọt', right: 'Chua', clues: [
    { clue: 'Kẹo đường', target: 6 },
    { clue: 'Bánh kem', target: 25 },
    { clue: 'Cam sành', target: 65 },
    { clue: 'Chanh tươi', target: 94 },
  ] },
  { left: 'Nhanh', right: 'Chậm', clues: [
    { clue: 'Tên lửa', target: 4 },
    { clue: 'Xe đua F1', target: 18 },
    { clue: 'Đi bộ thư giãn', target: 70 },
    { clue: 'Ốc sên', target: 96 },
  ] },
  { left: 'Cổ điển', right: 'Hiện đại', clues: [
    { clue: 'Áo dài truyền thống', target: 10 },
    { clue: 'Đàn tranh', target: 28 },
    { clue: 'Smartphone', target: 88 },
    { clue: 'Robot AI', target: 96 },
  ] },
  { left: 'Sang trọng', right: 'Bình dân', clues: [
    { clue: 'Khách sạn 5 sao', target: 7 },
    { clue: 'Nhà hàng fine dining', target: 24 },
    { clue: 'Quán cơm bình dân', target: 72 },
    { clue: 'Vỉa hè ngồi xổm', target: 92 },
  ] },
  { left: 'Ồn ào', right: 'Yên tĩnh', clues: [
    { clue: 'Quán bar đêm', target: 6 },
    { clue: 'Chợ Tết', target: 30 },
    { clue: 'Thư viện', target: 82 },
    { clue: 'Rừng sâu lúc nửa đêm', target: 95 },
  ] },
  { left: 'Sáng', right: 'Tối', clues: [
    { clue: 'Đèn pha ô tô', target: 7 },
    { clue: 'Nắng trưa hè', target: 20 },
    { clue: 'Hoàng hôn', target: 58 },
    { clue: 'Hang động không đèn', target: 97 },
  ] },
  { left: 'Mạnh', right: 'Yếu', clues: [
    { clue: 'Vận động viên cử tạ', target: 6 },
    { clue: 'Bão cấp 12', target: 15 },
    { clue: 'Gió nhẹ buổi chiều', target: 75 },
    { clue: 'Em bé mới sinh', target: 94 },
  ] },
  { left: 'Giàu', right: 'Nghèo', clues: [
    { clue: 'Tỉ phú', target: 5 },
    { clue: 'Giám đốc công ty lớn', target: 22 },
    { clue: 'Sinh viên làm thêm', target: 70 },
    { clue: 'Ăn xin', target: 96 },
  ] },
  { left: 'Vui', right: 'Buồn', clues: [
    { clue: 'Trúng số độc đắc', target: 4 },
    { clue: 'Đám cưới bạn thân', target: 20 },
    { clue: 'Ngày mưa không ô', target: 72 },
    { clue: 'Mất ví', target: 92 },
  ] },
  { left: 'Nặng', right: 'Nhẹ', clues: [
    { clue: 'Con voi', target: 6 },
    { clue: 'Xe tải', target: 22 },
    { clue: 'Quyển sách', target: 70 },
    { clue: 'Lông vũ', target: 97 },
  ] },
  { left: 'Cao', right: 'Thấp', clues: [
    { clue: 'Tòa nhà Landmark 81', target: 5 },
    { clue: 'Cây dừa', target: 30 },
    { clue: 'Bàn học', target: 75 },
    { clue: 'Kiến bò', target: 96 },
  ] },
  { left: 'Cay', right: 'Nhạt', clues: [
    { clue: 'Ớt hiểm', target: 4 },
    { clue: 'Lẩu Thái', target: 20 },
    { clue: 'Canh rau', target: 72 },
    { clue: 'Nước lọc', target: 95 },
  ] },
  { left: 'Đắt', right: 'Rẻ', clues: [
    { clue: 'Siêu xe', target: 5 },
    { clue: 'iPhone mới', target: 25 },
    { clue: 'Bánh mì', target: 80 },
    { clue: 'Miễn phí', target: 98 },
  ] },
  { left: 'Khó', right: 'Dễ', clues: [
    { clue: 'Giải toán Olympic', target: 7 },
    { clue: 'Lái xe giờ cao điểm', target: 32 },
    { clue: 'Nấu mì gói', target: 78 },
    { clue: 'Ngủ', target: 96 },
  ] },
  { left: 'Sạch', right: 'Bẩn', clues: [
    { clue: 'Bệnh viện', target: 10 },
    { clue: 'Nhà mới lau', target: 28 },
    { clue: 'Áo mặc 2 ngày', target: 70 },
    { clue: 'Bãi rác', target: 97 },
  ] },
  { left: 'Thông minh', right: 'Ngốc nghếch', clues: [
    { clue: 'Thần đồng', target: 6 },
    { clue: 'Học sinh giỏi', target: 25 },
    { clue: 'Quên chìa khóa ở nhà', target: 70 },
    { clue: 'Đi ngược chiều', target: 92 },
  ] },
  { left: 'Dũng cảm', right: 'Nhút nhát', clues: [
    { clue: 'Lính cứu hỏa', target: 8 },
    { clue: 'Nhảy bungee', target: 22 },
    { clue: 'Sợ bóng tối', target: 75 },
    { clue: 'Trốn trong chăn', target: 94 },
  ] },
  { left: 'Thật', right: 'Giả', clues: [
    { clue: 'Kim cương thật', target: 5 },
    { clue: 'Hàng hiệu auth', target: 22 },
    { clue: 'Đồ nhái loại 1', target: 70 },
    { clue: 'Tiền giả', target: 98 },
  ] },
  { left: 'Yêu', right: 'Ghét', clues: [
    { clue: 'Người yêu', target: 5 },
    { clue: 'Món ăn yêu thích', target: 20 },
    { clue: 'Kẹt xe giờ tan tầm', target: 75 },
    { clue: 'Kẻ trộm', target: 95 },
  ] },
];

/* danh sách gợi ý phẳng: {spectrum, left, right, clue, target} — cho
   chơi đơn (bốc không trùng) và cho bot tra cứu gợi ý theo chữ */
export const CLUES = [];
SPECTRUMS.forEach((sp, i) => {
  for (const c of sp.clues) CLUES.push({ spectrum: i, left: sp.left, right: sp.right, clue: c.clue, target: c.target });
});

export default SPECTRUMS;
