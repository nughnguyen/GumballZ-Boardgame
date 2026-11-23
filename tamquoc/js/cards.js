// Dữ liệu Tam Quốc Sát (bản fan-made GumballZ): bài, tướng, kỹ năng, vai trò. Chữ do GumballZ tự viết.
export const SUIT_SYMBOL = { S: '♠', H: '♥', C: '♣', D: '♦' };
export const SUIT_NAME = { S: 'Bích', H: 'Cơ', C: 'Chuồn', D: 'Rô' };
export const isRed = c => !!c && (c.suit === 'H' || c.suit === 'D');
export const isBlack = c => !!c && (c.suit === 'S' || c.suit === 'C');
export function rankLabel(r) { return ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[r] || String(r); }

export const KINGDOMS = {
  wei: { name: 'Ngụy', han: '魏', color: '#3a6fd8', dark: '#1f3f86' },
  shu: { name: 'Thục', han: '蜀', color: '#d8423a', dark: '#8a1f1a' },
  wu: { name: 'Ngô', han: '吳', color: '#2f9e5b', dark: '#175c33' },
  qun: { name: 'Quần', han: '群', color: '#7d808c', dark: '#43454f' },
};

export const ROLES = {
  lord: { name: 'Chúa công', icon: '👑', color: '#d9a21b', desc: 'Lộ mặt từ đầu, +1 máu tối đa. Thắng khi diệt sạch Phản tặc và Nội gián.' },
  loyal: { name: 'Trung thần', icon: '🛡️', color: '#e0a23a', desc: 'Bảo vệ Chúa công tới hơi thở cuối. Thắng cùng Chúa công.' },
  rebel: { name: 'Phản tặc', icon: '🔥', color: '#c4382f', desc: 'Lật đổ Chúa công. Chúa công chết là cả hội Phản tặc thắng (kể cả người đã nằm).' },
  spy: { name: 'Nội gián', icon: '🎭', color: '#4a8a6a', desc: 'Cáo già: phải là người SỐNG SÓT CUỐI CÙNG. Giúp Chúa diệt Phản trước, xong rồi tính sổ cả bàn.' },
  /* ⚔️ Đối kháng 2v2: hai đội cố định, lộ từ đầu */
  red: { name: 'Phe Đỏ', icon: '🔴', color: '#c4382f', desc: 'Cùng đồng đội hạ cả 2 người phe Lam. Đồng đội ngã xuống thì bạn rút 1 lá.' },
  blue: { name: 'Phe Lam', icon: '🔵', color: '#2f6fc4', desc: 'Cùng đồng đội hạ cả 2 người phe Đỏ. Đồng đội ngã xuống thì bạn rút 1 lá.' },
  /* 🏯 Quốc Chiến: phe = thế lực của tướng, chỉ lộ khi lật tướng */
  wei: { name: 'Nguỵ', icon: '🔷', color: '#3a6fc4', desc: 'Phe Nguỵ: cùng các tướng Nguỵ dẹp mọi thế lực khác.' },
  shu: { name: 'Thục', icon: '🔶', color: '#d8423a', desc: 'Phe Thục: cùng các tướng Thục dẹp mọi thế lực khác.' },
  wu: { name: 'Ngô', icon: '🟩', color: '#2f9e5b', desc: 'Phe Ngô: cùng các tướng Ngô dẹp mọi thế lực khác.' },
  qun: { name: 'Quần', icon: '⬜', color: '#7d808c', desc: 'Phe Quần hùng: cùng các tướng Quần dẹp mọi thế lực khác.' },
  yexin: { name: 'Dã tâm gia', icon: '🐍', color: '#6a3d9a', desc: 'Thế lực đã quá nửa bàn nên bạn tách ra một mình: phải là người sống sót cuối cùng.' },
  an: { name: 'Chưa lật', icon: '🎴', color: '#8a7a5a', desc: 'Tướng còn úp: chưa dùng được kỹ năng, chưa ai biết bạn phe nào. Bấm "Lật tướng" khi muốn lộ diện.' },
};
/* 🏺 BẢO VẬT RIÊNG (bạn anh xin 21/11/2026 "mỗi tướng có item riêng để combo"): luật bật thêm opts.relic.
   Mỗi bảo vật gắn với đúng 1 tướng, không chiếm ô trang bị, không bị phá/lấy, cho thêm 1 kỹ năng có sẵn của bộ – chọn để ăn ý với kỹ năng gốc. */
export const RELICS = {
  caocao: { name: 'Ỷ Thiên Kiếm', han: '倚', emo: '⚔️', sk: 'baohao', combo: 'Gian hùng gom Sát về tay – Ỷ Thiên Kiếm cho chém Sát không giới hạn trong lượt.' },
  simayi: { name: 'Kính Bát Quái', han: '卦', emo: '☯️', sk: 'mathuat', combo: 'Với tới mọi người gần hơn để Phản đáp, Quỷ tài nắm cả bàn.' },
  xiahoudun: { name: 'Mũi Tên Mắt Trái', han: '眼', emo: '🏹', sk: 'khiemton', combo: 'Không ai Thuận thủ hay Lạc bất tư thục được – Cương liệt chờ sẵn kẻ dám đánh.' },
  zhangliao: { name: 'Cờ Hợp Phì', han: '旗', emo: '🚩', sk: 'kytai', combo: 'Thuận thủ và Binh lương vươn tới cả bàn, không giới hạn khoảng cách.' },
  xuchu: { name: 'Thiết Giáp Hổ Si', han: '虎', emo: '🐯', sk: 'vosong', combo: 'Lỏa y + Sát cần 2 Né mới thoát, Quyết đấu cần 2 Sát – mỗi đòn đều cực đau.' },
  guojia: { name: 'Túi Di Kế', han: '計', emo: '👝', sk: 'kytai', combo: 'Cẩm nang rút từ Di kế dùng tới cả bàn không giới hạn khoảng cách.' },
  zhenji: { name: 'Trâm Lạc Thần', han: '簪', emo: '🪮', sk: 'kytai', combo: 'Cẩm nang gom từ Lạc thần dùng khắp bàn không bị giới hạn khoảng cách.' },
  xiahouyuan: { name: 'Cung Thần Tốc', han: '迅', emo: '🏹', sk: 'lietnhan', combo: 'Thần tốc Sát bất ngờ, trúng là cướp luôn 1 lá trên tay.' },
  caoren: { name: 'Khiên Phàn Thành', han: '盾', emo: '🛡️', sk: 'nghitrong', combo: 'Không đeo giáp thì Sát đen vô dụng – Cứ thủ lật úp mà vẫn khó bị hạ.' },
  dianwei: { name: 'Song Thiết Kích', han: '戟', emo: '🔱', sk: 'manhtien', combo: 'Cường tập ép máu, Sát bị Né mục tiêu vẫn phải bỏ 1 lá.' },
  xunyu: { name: 'Hộp Cơm Rỗng', han: '盒', emo: '🍱', sk: 'nghiatong', combo: 'Máu > 2 với xa hơn để Khu hổ / công kích, máu ≤ 2 tự thủ như có ngựa +1.' },
  zhanghe: { name: 'Ngựa Tuyệt Ảnh', han: '影', emo: '🐎', sk: 'lietnhan', combo: 'Xảo biến áp sát, Sát trúng là cướp luôn 1 lá.' },
  dengai: { name: 'Bản Đồ Âm Bình', han: '圖', emo: '🗺️', sk: 'tamchien', combo: 'Đồn điền ôm Né, tay ít hơn máu thì pha rút bài rút thêm 1 lá.' },
  caopi: { name: 'Ngọc Ấn Thụ Thiện', han: '印', emo: '🟦', sk: 'manhtien', combo: 'Sát bị Né đối thủ vẫn mất 1 lá – ép bài đều khi địch ngại đánh Phóng trục.' },
  xuhuang: { name: 'Rìu Khai Sơn', han: '斧', emo: '🪓', sk: 'tamchien', combo: 'Đốt bài đen đặt Binh lương, tay ít hơn máu thì pha rút bài rút thêm 1 lá.' },
  caozhi: { name: 'Thơ Thất Bộ', han: '詩', emo: '📜', sk: 'tieudao', combo: 'Nhặt lá ♣ người khác bỏ, lượt nào không Sát thì cuối lượt rút 1 lá.' },
  yujin: { name: 'Lệnh Bài Thất Quân', han: '令', emo: '📯', sk: 'khiemton', combo: 'Nghị trọng chặn Sát đen, không ai Thuận thủ hay khoá lượt được.' },
  liubei: { name: 'Thư Hùng Song Kiếm', han: '雙', emo: '🗡️', sk: 'cohoac', combo: 'Cuối lượt lật lá trên cùng chồng bài: ♥ hồi máu, ♦♣ nhận lá – vừa Nhân đức vừa không hụt hơi khi tay đôi.' },
  guanyu: { name: 'Thanh Long Yển Nguyệt', han: '龍', emo: '🐉', sk: 'thietky', combo: 'Võ thánh biến lá đỏ thành Sát, Thiết kỵ khiến Sát khó né.' },
  zhangfei: { name: 'Bát Xà Mâu', han: '矛', emo: '🐍', sk: 'cuongcot', combo: 'Bào hao Sát liên tục, mỗi nhát đánh gần lại hồi máu.' },
  zhugeliang: { name: 'Bát Trận Đồ', han: '陣', emo: '☯️', sk: 'battran', combo: 'Không đeo giáp vẫn có Bát quái trận – Không thành + Bát trận, rất khó chạm tới.' },
  zhaoyun: { name: 'Thanh Cương Kiếm', han: '青', emo: '🗡️', sk: 'dondien', combo: 'Long đảm dùng Sát làm Né – ngoài lượt mỗi lần Né lại rút 1 lá.' },
  machao: { name: 'Ngựa Sư Tử Ngọc', han: '獅', emo: '🦁', sk: 'hoathu', combo: 'Nam man không làm gì được – Thiết kỵ cứ thế xông lên.' },
  huangyueying: { name: 'Mộc Ngưu Lưu Mã', han: '牛', emo: '🐂', sk: 'dondien', combo: 'Ngoài lượt Né là rút bài – thêm nguyên liệu cho Tập trí.' },
  huangzhong: { name: 'Bảo Cung Định Quân', han: '弓', emo: '🏹', sk: 'lietnhan', combo: 'Liệt cung khiến Sát không thể Né, trúng là Liệt nhận cướp luôn 1 lá trên tay.' },
  weiyan: { name: 'Đao Tý Ngọ', han: '刀', emo: '🗡️', sk: 'lietnhan', combo: 'Sát trúng vừa Cuồng cốt hồi máu khi đánh gần vừa cướp luôn 1 lá trên tay địch.' },
  pangtong: { name: 'Gò Lạc Phượng', han: '鳳', emo: '🪶', sk: 'xaobien', combo: 'Bỏ 1 lá dẹp Lạc / Binh lương đầu lượt để Liên hoàn không bị ngắt nhịp.' },
  wolong: { name: 'Đèn Thất Tinh', han: '燈', emo: '🏮', sk: 'tieudao', combo: 'Giữ bài đen chờ Vô giải, lượt nào không Sát thì cuối lượt rút 1 lá.' },
  jiangwei: { name: 'Kiếm Các', han: '閣', emo: '🏯', sk: 'battran', combo: 'Khiêu khích ép địch Sát mình – không đeo giáp vẫn có Bát quái trận tự đỡ.' },
  liushan: { name: 'Bánh Bao Thành Đô', han: '餅', emo: '🥟', sk: 'hoathu', combo: 'An lạc phạt kẻ Sát mình, Nam man cũng không chạm tới.' },
  menghuo: { name: 'Giáp Mây Nam Trung', han: '甲', emo: '🌿', sk: 'khiemton', combo: 'Không ai Thuận thủ hay Lạc bất tư thục được – Tái khởi hồi sức yên ổn.' },
  zhurong: { name: 'Phi Đao Hỏa Thần', han: '刃', emo: '🔪', sk: 'khiemton', combo: 'Không bị Thuận thủ / Lạc bất tư thục – Liệt nhận cứ thế cướp bài.' },
  fazheng: { name: 'Sổ Ân Oán', han: '簿', emo: '📒', sk: 'camlo', combo: 'Được hồi máu thì cả hai cùng rút bài (Ân oán + Cam lộ).' },
  xushu: { name: 'Áo Vải Kiếm Khách', han: '庶', emo: '🥋', sk: 'dondien', combo: 'Vô ngôn né cẩm nang, ngoài lượt Né là rút bài.' },
  masu: { name: 'Binh Thư Nhai Đình', han: '亭', emo: '📘', sk: 'khiemton', combo: 'Không bị Thuận thủ / khoá lượt – Tâm chiến giữ tay đủ bài.' },
  guanping: { name: 'Ấn Thọ Đình Hầu', han: '壽', emo: '🔴', sk: 'vothanh', combo: 'Võ thánh của cha: lá đỏ thành Sát – Long ngâm Sát đỏ không giới hạn, trúng là rút bài.' },
  sunquan: { name: 'Ngọc Tỷ Truyền Quốc', han: '璽', emo: '🟢', sk: 'cohoac', combo: 'Cuối lượt lật bài: ♥ hồi máu, ♦♣ nhận lá để lượt sau Chế hành lọc tiếp.' },
  ganning: { name: 'Chuông Đồng Cẩm Phàm', han: '鈴', emo: '🔔', sk: 'liendoanh', combo: 'Kỳ tập ném hết bài đen, mất lá cuối lại rút lá mới.' },
  lvmeng: { name: 'Áo Trắng Qua Sông', han: '渡', emo: '⛵', sk: 'benguyet', combo: 'Cuối lượt rút thêm 1 lá – kết hợp Khắc kỷ tích bài thật nhanh rồi bùng nổ.' },
  huanggai: { name: 'Thuyền Lửa', han: '火', emo: '🔥', sk: 'taikhoi', combo: 'Khổ nhục tự mất máu rút bài – mất từ 2 máu thì pha rút bài hồi lại 1 máu.' },
  zhouyu: { name: 'Cổ Cầm', han: '琴', emo: '🪕', sk: 'benguyet', combo: 'Anh tư rút thêm đầu lượt, Bế nguyệt cuối lượt rút thêm 1 lá – tay luôn đầy cho Phản gián.' },
  daqiao: { name: 'Gương Đồng Song Kiều', han: '鑑', emo: '🪞', sk: 'hongnhan', combo: 'Lá ♠ tính như ♥ – dễ thoát Lạc bất tư thục và thêm ♥ trên tay.' },
  luxun: { name: 'Quạt Lửa Di Lăng', han: '焰', emo: '🪭', sk: 'kytap', combo: 'Mọi lá đen thành Quá hà sách kiều – xả hết tay kích hoạt Liên doanh liên tục.' },
  sunshangxiang: { name: 'Cung Kiếm Phu Nhân', han: '劍', emo: '🏹', sk: 'benguyet', combo: 'Kiêu cơ rút bài khi mất trang bị, cuối lượt lại rút thêm 1 lá.' },
  xiaoqiao: { name: 'Đàn Tỳ Bà', han: '琶', emo: '🪕', sk: 'tamchien', combo: 'Thiên hương bỏ ♥ chuyển thương, tay ít hơn máu thì rút thêm 1 lá.' },
  sunjian: { name: 'Cổ Đĩnh Đao', han: '錠', emo: '🗡️', sk: 'hoansat', combo: 'Trong lượt Tôn Kiên chỉ Đào của anh hoặc nạn nhân mới cứu được – kết liễu dứt điểm.' },
  lusu: { name: 'Kho Lương Giang Đông', han: '糧', emo: '🌾', sk: 'dondien', combo: 'Hảo thí chia bài, ngoài lượt Né lại rút bù.' },
  sunce: { name: 'Thương Bá Vương', han: '霸', emo: '🔱', sk: 'mathuat', combo: 'Kích ngang với xa hơn – Sát đỏ / Quyết đấu ai cũng tới được.' },
  zhoutai: { name: 'Sẹo Chiến Trận', han: '疤', emo: '🩹', sk: 'hoathu', combo: 'Nam man không chạm được – Bất khuất gánh thương cho đồng đội.' },
  taishici: { name: 'Song Đoản Kích', han: '戟', emo: '🔱', sk: 'vosong', combo: 'Thiên nghĩa chém 2 người, Sát cần 2 Né mới thoát và Quyết đấu cần 2 Sát.' },
  lingtong: { name: 'Song Thiết Kích', han: '戟', emo: '🔱', sk: 'kieuco', combo: 'Mất trang bị rút 2 lá – mất ngoài lượt Toàn phong lại phạt kẻ đang đánh.' },
  xusheng: { name: 'Đại Đao Bạch Lang', han: '狼', emo: '🐺', sk: 'longngam', combo: 'Sát đỏ không tính lượt, trúng là rút 1 lá kèm Phá quân lột trang bị.' },
  wuguotai: { name: 'Chuỗi Ngọc Ngô Phủ', han: '珠', emo: '📿', sk: 'dondien', combo: 'Bổ ích cứu đồng đội, ngoài lượt Né lại rút bài.' },
  chengpu: { name: 'Thiết Tích Xà Mâu', han: '矛', emo: '🔥', sk: 'kichngang', combo: 'Hỏa Sát đỏ dùng hay bị nhắm đều rút thêm 1 lá.' },
  huatuo: { name: 'Thanh Nang Thư', han: '書', emo: '📜', sk: 'cuongcot', combo: 'Đánh trúng người kề bên là hồi 1 máu – thầy thuốc tự chữa giữa trận.' },
  lvbu: { name: 'Ngựa Xích Thố', han: '赤', emo: '🐎', sk: 'mathuat', combo: 'Vô song tầm xa hơn – ai cũng trong tầm Sát.' },
  diaochan: { name: 'Gương Bế Nguyệt', han: '鏡', emo: '🪞', sk: 'mathuat', combo: 'Với tới mọi người gần hơn để Ly gián chọn đúng người.' },
  zhangjiao: { name: 'Thái Bình Yếu Thuật', han: '符', emo: '📿', sk: 'battran', combo: 'Bát trận phán định ra Né – mỗi lần Né lại gọi sét Lôi kích.' },
  yuanshao: { name: 'Cờ Tứ Thế Tam Công', han: '旗', emo: '🚩', sk: 'anhtu', combo: 'Pha rút bài rút thêm 1 lá – luôn đủ bài cùng chất để xả Loạn kích.' },
  dongzhuo: { name: 'Thất Bảo Đao', han: '寶', emo: '🗡️', sk: 'vongon', combo: 'Cẩm nang (Quyết đấu, Hỏa công, Nam man, Vạn tiễn) không gây sát thương – yên tâm giữ thế.' },
  jiaxu: { name: 'Độc Kế Văn Hòa', han: '毒', emo: '🧪', sk: 'tieudao', combo: 'Lượt nào không Sát thì cuối lượt rút 1 lá – giữ tay dày chờ thời cơ Hoàn sát.' },
  yuji: { name: 'Bình Nước Thánh', han: '瓶', emo: '🏺', sk: 'camlo', combo: 'Cổ hoặc lật ♥ hồi máu – mỗi lần được hồi lại rút 1 lá.' },
  yanliang: { name: 'Song Hùng Đao', han: '雄', emo: '⚔️', sk: 'phaquan', combo: 'Sát trúng là phá 1 trang bị/lá, mở đường cho Song hùng Quyết đấu.' },
  pangde: { name: 'Quan Tài Phàn Thành', han: '棺', emo: '⚰️', sk: 'lietnhan', combo: 'Mãnh tiến Sát bị Né vẫn mất 1 lá, Sát trúng thì cướp thêm 1 lá.' },
  gongsunzan: { name: 'Bạch Mã Nghĩa Tòng', han: '白', emo: '🐴', sk: 'thietky', combo: 'Kỵ binh ngựa trắng: Sát phán định đỏ là không thể Né.' },
};
/* chế độ chơi: id = Thân phận (cũ), duo = Đối kháng 2v2, kd = Quốc Chiến */
export const MODES = {
  id: { name: 'Thân phận', icon: '🎭', min: 2, max: 8, desc: 'Chúa công, Trung thần, Phản tặc, Nội gián – vai bí mật, đoán phe qua cách đánh.' },
  duo: { name: 'Đối kháng', icon: '⚔️', min: 2, max: 6, need: '2, 4 hoặc 6 người', desc: '2 người = 🥊 tay đôi 1v1 có cấm/chọn tướng · 4 người = 2v2 · 6 người = 3v3 có ⭐ Chủ soái. Hai đội ngồi xen kẽ (Đỏ – Lam – Đỏ – Lam…). Hạ hết người đội kia (3v3: hạ Chủ soái đội kia) là thắng.' },
  solo: { hidden: true, name: 'Solo 1v1', icon: '🥊', min: 2, max: 2, desc: 'Tay đôi có cấm/chọn tướng: lật 10 tướng cho cả hai cùng xem, mỗi bên cấm 2 rồi chọn 1. Người chọn sau được đi trước.' },
  kd: { name: 'Quốc Chiến', icon: '🏯', min: 4, max: 9, desc: 'Tướng úp, phe = thế lực (Nguỵ / Thục / Ngô / Quần). Lật tướng mới lộ phe và dùng được kỹ năng. Thế lực nào lật quá nửa bàn thì người lật sau thành Dã tâm gia đánh một mình.' },
};
export function modeOk(n, mode) { if (mode === 'duo') return n === 2 || n === 4 || n === 6; const m = MODES[mode] || MODES.id; return n >= m.min && n <= m.max; }
/* gộp 1v1 + 2v2 thành "Đối kháng" (người chơi xin 21/11/2026): 2 người thì chạy luật Solo (cấm/chọn tướng) */
export const playMode = (n, mode) => mode === 'duo' && n === 2 ? 'solo' : mode;
export const modeNeed = mode => { const m = MODES[mode] || MODES.id; return m.need || (m.min === m.max ? `đúng ${m.min} người` : `${m.min}–${m.max} người`); };
// số vai theo số người
const ROLE_TABLE = {
  2: ['lord', 'rebel'],
  3: ['lord', 'rebel', 'spy'],
  4: ['lord', 'loyal', 'rebel', 'spy'],
  5: ['lord', 'loyal', 'rebel', 'rebel', 'spy'],
  6: ['lord', 'loyal', 'rebel', 'rebel', 'rebel', 'spy'],
  7: ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'spy'],
  8: ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'rebel', 'spy'],
};
export function rolesFor(n) { return ROLE_TABLE[n] ? [...ROLE_TABLE[n]] : null; }

// kind: basic | trick (cẩm nang dùng ngay) | delay (cẩm nang trì hoãn) | weapon | armor | plus (ngựa +1) | minus (ngựa −1)
export const CARD_INFO = {
  sat: { name: 'Sát', kind: 'basic', han: '殺', emo: '🗡️', short: 'Chém 1 người trong tầm', desc: 'Chọn 1 người trong tầm đánh. Họ phải đánh ra 1 Né, không thì mất 1 máu. Mỗi lượt chỉ dùng 1 Sát (trừ khi có Gia Cát liên nỏ/kỹ năng).' },
  ne: { name: 'Né', kind: 'basic', han: '閃', emo: '💨', short: 'Né 1 Sát / Vạn tiễn', desc: 'Thiểm – chỉ đánh ra khi bị Sát hoặc Vạn tiễn tề phát để huỷ đòn đó.' },
  dao: { name: 'Đào', kind: 'basic', han: '桃', emo: '🍑', short: 'Hồi 1 máu / cứu người', desc: 'Trong lượt mình: hồi 1 máu. Khi có ai hấp hối (0 máu): dùng để cứu họ 1 máu.' },
  jiu: { name: 'Rượu', kind: 'basic', han: '酒', emo: '🍶', short: 'Sát kế tiếp +1 / tự cứu', desc: 'Trong pha ra bài (1 lần/lượt): uống cho "say rượu" – lá Sát kế tiếp bạn dùng trong lượt gây thêm 1 sát thương. Khi chính bạn hấp hối: uống để hồi 1 máu (chỉ cứu được mình).' },
  hoasat: { name: 'Hỏa Sát', kind: 'basic', han: '火', emo: '🔥', exp: true, short: 'Sát gây sát thương lửa', desc: 'Một lá Sát mang lửa: gây sát thương lửa (Đằng giáp chịu thêm 1, lan qua người bị Thiết tác liên hoàn).' },
  loisat: { name: 'Lôi Sát', kind: 'basic', han: '雷', emo: '🌩️', exp: true, short: 'Sát gây sát thương sét', desc: 'Một lá Sát mang sấm: gây sát thương sét (lan qua người bị Thiết tác liên hoàn).' },
  wuzhong: { name: 'Vô trung sinh hữu', kind: 'trick', han: '無', emo: '✨', short: 'Rút 2 lá', desc: 'Từ cái không sinh ra cái có: rút 2 lá.' },
  guohe: { name: 'Quá hà sách kiều', kind: 'trick', han: '拆', emo: '🌉', short: 'Bỏ 1 lá của người khác', desc: 'Chọn 1 người khác, bỏ 1 lá của họ (trên tay – ngẫu nhiên, trang bị hoặc vùng phán định).' },
  shunshou: { name: 'Thuận thủ khiên dương', kind: 'trick', han: '順', emo: '🐑', short: 'Lấy 1 lá người cách 1', desc: 'Tiện tay dắt dê: lấy 1 lá (tay/trang bị/phán định) của người cách bạn 1.' },
  juedou: { name: 'Quyết đấu', kind: 'trick', han: '鬥', emo: '🤺', short: 'Thay phiên ra Sát', desc: 'Thách 1 người. Bắt đầu từ họ, hai bên lần lượt đánh Sát; ai không ra được thì mất 1 máu (do người kia gây).' },
  nanman: { name: 'Nam man xâm nhập', kind: 'trick', han: '蠻', emo: '🐘', short: 'Ai không ra Sát −1 máu', desc: 'Voi rừng phương Nam tràn vào: mọi người khác lần lượt phải đánh 1 Sát, không thì mất 1 máu.' },
  wanjian: { name: 'Vạn tiễn tề phát', kind: 'trick', han: '箭', emo: '🏹', short: 'Ai không ra Né −1 máu', desc: 'Mưa tên: mọi người khác lần lượt phải đánh 1 Né, không thì mất 1 máu.' },
  taoyuan: { name: 'Đào viên kết nghĩa', kind: 'trick', han: '園', emo: '🌸', short: 'Mọi người +1 máu', desc: 'Kết nghĩa vườn đào: tất cả mọi người (kể cả bạn) hồi 1 máu.' },
  wugu: { name: 'Ngũ cốc phong đăng', kind: 'trick', han: '穀', emo: '🌾', short: 'Lật bài, mỗi người chọn 1', desc: 'Được mùa: lật số lá bằng số người còn sống, bắt đầu từ bạn mỗi người chọn 1 lá.' },
  jiedao: { name: 'Tá đao sát nhân', kind: 'trick', han: '借', emo: '🔪', short: 'Mượn dao giết người', desc: 'Chọn người A có vũ khí và người B trong tầm của A. A phải Sát B, không thì đưa vũ khí cho bạn.' },
  wuxie: { name: 'Vô giải khả kích', kind: 'trick', han: '懈', emo: '🚫', short: 'Huỷ 1 cẩm nang', desc: 'Đánh ra khi một cẩm nang sắp có tác dụng lên một người: huỷ tác dụng đó. Có thể bị Vô giải khác huỷ lại (chồng được).' },
  huogong: { name: 'Hỏa công', kind: 'trick', han: '焚', emo: '🎇', exp: true, short: 'Lật bài, khớp chất → 1 lửa', desc: 'Chọn 1 người có bài trên tay (kể cả bạn). Họ lật cho xem 1 lá trên tay; bạn bỏ 1 lá trên tay cùng chất thì họ chịu 1 sát thương lửa.' },
  tiesuo: { name: 'Thiết tác liên hoàn', kind: 'trick', han: '鎖', emo: '⛓️', exp: true, short: 'Xích 1–2 người / đổi 1 lá', desc: 'Chọn 1–2 người: đổi trạng thái bị xích của họ. Người bị xích chịu sát thương lửa/sét thì sát thương lan sang mọi người đang bị xích khác. Hoặc bỏ lá này để rút 1 lá (trùng chú).' },
  lebu: { name: 'Lạc bất tư thục', kind: 'delay', han: '樂', emo: '🏮', short: 'Phán định ≠ ♥ → mất pha ra bài', desc: 'Đặt vào vùng phán định của 1 người khác. Đầu lượt họ phán định: không ra ♥ Cơ thì bỏ qua pha ra bài.' },
  shandian: { name: 'Thiểm điện', kind: 'delay', han: '電', emo: '⚡', short: 'Phán định ♠2–9 → −3 máu', desc: 'Đặt vào vùng phán định của bạn. Đầu lượt phán định: ra ♠ Bích 2–9 thì sét đánh mất 3 máu; không thì chuyền sang người kế tiếp.' },
  bingliang: { name: 'Binh lương thốn đoạn', kind: 'delay', han: '糧', emo: '🍚', exp: true, short: 'Phán định ≠ ♣ → mất pha rút', desc: 'Đặt vào vùng phán định của 1 người cách bạn 1. Đầu lượt họ phán định: không ra ♣ Chuồn thì bỏ qua pha rút bài.' },
  zhuge: { name: 'Gia Cát liên nỏ', kind: 'weapon', range: 1, han: '弩', emo: '🎯', short: 'Sát không giới hạn', desc: 'Tầm 1. Trong lượt, dùng Sát bao nhiêu lần cũng được.' },
  cixiong: { name: 'Thư hùng song kiếm', kind: 'weapon', range: 2, han: '雙', emo: '⚔️', short: 'Sát người khác giới', desc: 'Tầm 2. Khi Sát người khác giới tính: họ chọn bỏ 1 lá trên tay hoặc để bạn rút 1 lá.' },
  qinggang: { name: 'Thanh cương kiếm', kind: 'weapon', range: 2, han: '青', emo: '🗡️', short: 'Sát xuyên giáp', desc: 'Tầm 2. Sát của bạn bỏ qua giáp của mục tiêu.' },
  hanbing: { name: 'Băng phách kiếm', kind: 'weapon', range: 2, han: '冰', emo: '❄️', short: 'Đổi sát thương lấy 2 lá', desc: 'Tầm 2. Khi Sát trúng: có thể không gây sát thương mà bỏ 2 lá của mục tiêu.' },
  qinglong: { name: 'Thanh long đao', kind: 'weapon', range: 3, han: '龍', emo: '🐉', short: 'Bị né thì Sát tiếp', desc: 'Tầm 3. Sát bị Né thì có thể đánh thêm 1 Sát vào chính người đó.' },
  zhangba: { name: 'Trượng bát xà mâu', kind: 'weapon', range: 3, han: '矛', emo: '🐍', short: '2 lá bất kỳ = 1 Sát', desc: 'Tầm 3. Có thể dùng/đánh 2 lá trên tay như 1 Sát.' },
  guanshi: { name: 'Quán thạch phủ', kind: 'weapon', range: 3, han: '斧', emo: '🪓', short: 'Bỏ 2 lá: Sát vẫn trúng', desc: 'Tầm 3. Sát bị Né thì có thể bỏ 2 lá để Sát vẫn gây sát thương.' },
  fangtian: { name: 'Phương thiên hoạ kích', kind: 'weapon', range: 4, han: '戟', emo: '⚔️', short: 'Sát cuối: tới 3 người', desc: 'Tầm 4. Nếu Sát là lá cuối cùng trên tay, có thể chọn tới 3 mục tiêu.' },
  qilin: { name: 'Kỳ lân cung', kind: 'weapon', range: 5, han: '弓', emo: '🏹', short: 'Bắn rụng ngựa', desc: 'Tầm 5. Sát gây sát thương thì bỏ luôn 1 ngựa của mục tiêu.' },
  zhuque: { name: 'Chu tước vũ phiến', kind: 'weapon', range: 4, han: '扇', emo: '🪭', exp: true, short: 'Sát thường → Hỏa Sát', desc: 'Tầm 4. Có thể dùng lá Sát thường như Hỏa Sát.' },
  guding: { name: 'Cổ đĩnh đao', kind: 'weapon', range: 2, han: '錠', emo: '🗡️', exp: true, short: 'Địch hết bài: +1 sát thương', desc: 'Tầm 2. Sát của bạn gây thêm 1 sát thương nếu mục tiêu không còn lá trên tay.' },
  bagua: { name: 'Bát quái trận', kind: 'armor', han: '卦', emo: '☯️', short: 'Phán định đỏ = Né', desc: 'Khi cần đánh Né: có thể phán định, ra đỏ (♥/♦) thì coi như đã đánh Né.' },
  // ---- bản 🏯 Quốc Chiến (19/11/2026, bật/tắt bằng opts.exp2) ----
  yuanjiao: { name: 'Viễn giao cận công', kind: 'trick', han: '遠', emo: '🤝', exp2: true, short: 'Họ rút 1, bạn rút 3', desc: 'Chọn 1 người khác: họ rút 1 lá, rồi bạn rút 3 lá. Kết thân nơi xa để đánh gần.' },
  yiyi: { name: 'Dĩ dật đãi lao', kind: 'trick', han: '逸', emo: '🍵', exp2: true, short: 'Cả thế lực rút 1', desc: 'Bạn và mọi người cùng thế lực với bạn (Quốc Chiến: chỉ người đã lật tướng) mỗi người rút 1 lá.' },
  shuiyan: { name: 'Thủy yêm thất quân', kind: 'trick', han: '淹', emo: '🌊', exp2: true, short: 'Bỏ hết trang bị hoặc chịu 1', desc: 'Chọn 1 người khác: họ có trang bị thì nước cuốn trôi hết trang bị; không có trang bị thì chịu 1 sát thương.' },
  sanjian: { name: 'Tam tiêm lưỡng nhận đao', kind: 'weapon', range: 3, han: '刃', emo: '🔱', exp2: true, short: 'Sát trúng: phá thêm 1 lá', desc: 'Tầm 3. Mỗi khi Sát của bạn gây sát thương, người đó bỏ thêm ngẫu nhiên 1 lá trên tay.' },
  mingguang: { name: 'Minh quang khải', kind: 'armor', han: '鏡', emo: '🪞', exp2: true, short: 'Miễn lửa, không bị xích', desc: 'Bạn không chịu sát thương lửa và không thể bị Thiết tác liên hoàn xích lại.' },
  renwang: { name: 'Nhân vương thuẫn', kind: 'armor', han: '盾', emo: '🛡️', short: 'Sát đen vô hiệu', desc: 'Sát màu đen (♠/♣) không có tác dụng với bạn.' },
  tengjia: { name: 'Đằng giáp', kind: 'armor', han: '藤', emo: '🪵', exp: true, short: 'Miễn Sát thường & AoE, sợ lửa', desc: 'Nam man xâm nhập, Vạn tiễn tề phát và Sát thường không có tác dụng với bạn. Nhưng sát thương lửa lên bạn +1.' },
  baiyin: { name: 'Bạch ngân sư tử', kind: 'armor', han: '獅', emo: '🦁', exp: true, short: 'Sát thương tối đa 1', desc: 'Mỗi lần chịu sát thương nhiều hơn 1 thì chỉ mất 1 máu. Khi mất lá này khỏi ô giáp: hồi 1 máu.' },
  plus: { name: 'Ngựa +1', kind: 'plus', han: '駒', emo: '🐎', short: 'Người khác thấy bạn xa +1', desc: 'Ngựa phòng thủ: khoảng cách từ người khác tới bạn +1.' },
  minus: { name: 'Ngựa −1', kind: 'minus', han: '騎', emo: '🏇', short: 'Bạn thấy người khác gần −1', desc: 'Ngựa tấn công: khoảng cách từ bạn tới người khác −1.' },
};
export const HORSE_NAMES = { plus: ['Tuyệt ảnh', 'Đích lô', 'Trảo hoàng', 'Hoa lưu'], minus: ['Xích thố', 'Đại uyển', 'Tử tinh'] };
export const infoOf = c => (c && c.el ? CARD_INFO[c.el === 'fire' ? 'hoasat' : 'loisat'] : CARD_INFO[c.type]);
export const artKey = c => (c.el ? (c.el === 'fire' ? 'hoasat' : 'loisat') : c.type);
export function cardName(c) { if (!c) return '?'; return c.v || infoOf(c).name; }
export function cardLabel(c) { return c ? `${cardName(c)} ${SUIT_SYMBOL[c.suit]}${rankLabel(c.rank)}` : '?'; }
export const EQUIP_SLOT = { weapon: 'weapon', armor: 'armor', plus: 'plus', minus: 'minus' };

// Bộ bài 108 lá (phân bố chất/số do GumballZ tự xếp)
const DECK_BY_SUIT = {
  S: ['sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'juedou', 'guohe', 'guohe', 'guohe', 'shunshou', 'shunshou', 'shunshou', 'wuxie', 'nanman', 'nanman', 'lebu', 'shandian',
    'cixiong', 'qinggang', 'hanbing', 'qinglong', 'zhangba', 'bagua', 'plus:Tuyệt ảnh', 'minus:Tử tinh'],
  C: ['sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'juedou', 'guohe', 'guohe', 'wuxie', 'wuxie', 'nanman', 'jiedao', 'jiedao', 'lebu', 'zhuge',
    'bagua', 'renwang', 'plus:Đích lô'],
  H: ['sat', 'sat', 'sat', 'ne', 'ne', 'ne', 'ne', 'ne', 'dao', 'dao', 'dao', 'dao', 'dao', 'dao', 'dao', 'guohe', 'wuzhong', 'wuzhong', 'wuzhong', 'wuzhong', 'wuxie', 'wanjian', 'taoyuan',
    'wugu', 'wugu', 'lebu', 'shandian', 'qilin', 'plus:Trảo hoàng', 'minus:Xích thố'],
  D: ['sat', 'sat', 'sat', 'sat', 'sat', 'sat', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'ne', 'dao', 'juedou', 'shunshou', 'shunshou', 'zhuge', 'guanshi', 'fangtian', 'minus:Đại uyển'],
};
// Bản mở rộng Quân Tranh (GumballZ tự xếp chất/số): fire:/thunder: là Hỏa Sát / Lôi Sát
/* 8 lá bản Quốc Chiến */
const EXP2_BY_SUIT = { S: ['shuiyan', 'sanjian'], H: ['yuanjiao', 'yiyi'], C: ['shuiyan', 'yiyi'], D: ['yuanjiao', 'mingguang'] };
const EXP_BY_SUIT = {
  S: ['thunder', 'thunder', 'thunder', 'jiu', 'jiu', 'tiesuo', 'bingliang', 'guding', 'ne', 'wuxie'],
  C: ['thunder', 'thunder', 'jiu', 'tiesuo', 'tiesuo', 'bingliang', 'tengjia', 'baiyin', 'ne'],
  H: ['fire', 'fire', 'huogong', 'huogong', 'dao', 'ne', 'wuxie', 'zhuque', 'plus:Hoa lưu'],
  D: ['fire', 'fire', 'jiu', 'huogong', 'tiesuo', 'ne', 'dao'],
};
export const DECK_SIZE_BASE = Object.values(DECK_BY_SUIT).reduce((a, l) => a + l.length, 0);
export const DECK_SIZE_EXP = Object.values(EXP_BY_SUIT).reduce((a, l) => a + l.length, 0);
export const DECK_SIZE = DECK_SIZE_BASE; // tương thích cũ
export const DECK_SIZE_EXP2 = Object.values(EXP2_BY_SUIT).reduce((a, l) => a + l.length, 0);
export function deckSize(exp, exp2) { return DECK_SIZE_BASE + (exp ? DECK_SIZE_EXP : 0) + (exp2 ? DECK_SIZE_EXP2 : 0); }
export function buildDeck(exp = false, exp2 = false) {
  const out = []; let id = 0;
  const add = (table, off) => {
    for (const [suit, list] of Object.entries(table)) {
      // rải số 1–13 xen kẽ (bước 5 nguyên tố cùng 13 → đủ mọi số, lặp đều)
      list.forEach((t, i) => {
        let [type, v] = t.split(':'); let el = null;
        if (type === 'fire' || type === 'thunder') { el = type; type = 'sat'; }
        const rank = ((i * 5 + off + (suit.charCodeAt(0) % 7)) % 13) + 1;
        const c = { id: 'c' + (id++), type, suit, rank }; if (v) c.v = v; if (el) c.el = el;
        out.push(c);
      });
    }
  };
  add(DECK_BY_SUIT, 0); if (exp) add(EXP_BY_SUIT, 8); if (exp2) add(EXP2_BY_SUIT, 3);
  return out;
}

// ---------- Kỹ năng ----------
// auto: tự động; active: nút trong pha ra bài; conv: biến lá; lord: kỹ năng chúa (chỉ khi là Chúa công)
export const SKILLS = {
  hanhthuong: { name: 'Hành thương', desc: 'Khi một người khác chết: lấy hết bài trên tay và trang bị của họ.' },
  phongtruc: { name: 'Phóng trục', desc: 'Khi bị người khác gây sát thương: người đó rút 1 lá rồi lật úp tướng – bỏ lượt kế.' },
  doanluong: { name: 'Đoạn lương', desc: 'Lá đen là lá cơ bản hoặc trang bị dùng được như Binh lương thốn đoạn; Binh lương của bạn đặt được cho người cách ≤ 2.' },
  nghitrong: { name: 'Nghị trọng', desc: 'Khi không đeo giáp: Sát đen không có tác dụng với bạn.' },
  lacanh: { name: 'Lạc anh', desc: 'Lá ♣ người khác bỏ ở pha bỏ bài về tay bạn.' },
  anoan: { name: 'Ân oán', desc: 'Được người khác hồi máu: họ rút 1 lá. Bị người khác gây sát thương: họ phải bỏ 1 lá ♥ trên tay, không có thì mất 1 máu.' },
  vongon: { name: 'Vô ngôn', desc: 'Cẩm nang (Quyết đấu, Hỏa công, Nam man, Vạn tiễn…) không gây sát thương cho bạn.' },
  cuhien: { name: 'Cử hiền', desc: 'Pha kết thúc: nếu máu bạn thấp nhất bàn (tính cả bằng): rút 1 lá.' },
  tamchien: { name: 'Tâm chiến', desc: 'Pha rút bài: nếu bài trên tay ít hơn máu hiện tại: rút thêm 1 lá.' },
  huyle: { name: 'Huy lệ', desc: 'Khi bạn chết: người giết bạn phải bỏ hết bài trên tay và trang bị.' },
  longngam: { name: 'Long ngâm', desc: 'Sát đỏ của bạn không tính vào giới hạn 1 Sát mỗi lượt, gây sát thương thì rút 1 lá.' },
  toanphong: { name: 'Toàn phong', desc: 'Mỗi khi mất trang bị ngoài lượt mình: người đang tới lượt mất 1 lá ngẫu nhiên trên tay.' },
  phaquan: { name: 'Phá quân', desc: 'Sát của bạn gây sát thương: mục tiêu mất 1 trang bị ngẫu nhiên (không có thì 1 lá trên tay).' },
  boich: { name: 'Bổ ích', desc: 'Khi bạn hoặc đồng đội đã lộ diện hấp hối: họ bỏ 1 lá không phải cơ bản trên tay để hồi 1 máu.' },
  camlo: { name: 'Cam lộ', desc: 'Mỗi khi được hồi máu: rút 1 lá.' },
  lieuhoa: { name: 'Liệt hỏa', desc: 'Sát thường của bạn dùng được như Hỏa Sát; Hỏa Sát của bạn gây sát thương thì rút 1 lá.' },
  cohoac: { name: 'Cổ hoặc', desc: 'Pha kết thúc: lật lá trên cùng chồng bài – ♥ thì hồi 1 máu (máu đầy thì nhận lá), ♦ hoặc ♣ nhận lá đó, ♠ bỏ đi.' },
  songhung: { name: 'Song hùng', desc: 'Mỗi lượt 1 lần: dùng 1 lá đen (♠/♣) trên tay như Quyết đấu.' },
  manhtien: { name: 'Mãnh tiến', desc: 'Sát của bạn bị Né: mục tiêu vẫn mất 1 lá ngẫu nhiên (tay hoặc trang bị).' },
  nghiatong: { name: 'Nghĩa tòng', desc: 'Máu > 2: luôn như có ngựa −1. Máu ≤ 2: luôn như có ngựa +1.' },
  gianhung: { name: 'Gian hùng', desc: 'Khi bị gây sát thương: lấy lá bài đã gây sát thương đó về tay.' },
  hogia: { name: 'Hộ giá', lord: true, desc: 'Chúa công: khi cần đánh Né, có thể nhờ các tướng Ngụy lần lượt đánh Né hộ.' },
  phandap: { name: 'Phản đáp', desc: 'Khi bị gây sát thương: lấy 1 lá (tay/trang bị) của người gây sát thương.' },
  quytai: { name: 'Quỷ tài', desc: 'Trước khi một phán định có hiệu lực: có thể đánh 1 lá trên tay thay cho lá phán định.' },
  cuonglie: { name: 'Cương liệt', desc: 'Khi bị gây sát thương: phán định, không ra ♥ thì kẻ gây sát thương chọn bỏ 2 lá trên tay hoặc mất 1 máu.' },
  duttap: { name: 'Đột tập', desc: 'Pha rút bài: có thể không rút mà lấy 1 lá trên tay của tối đa 2 người khác.' },
  loay: { name: 'Lỏa y', desc: 'Pha rút bài: có thể rút ít đi 1 lá; lượt này Sát và Quyết đấu bạn dùng gây thêm 1 sát thương.' },
  thiendo: { name: 'Thiên đố', desc: 'Lá phán định của bạn sau khi có hiệu lực thì về tay bạn.' },
  dike: { name: 'Di kế', desc: 'Mỗi khi mất 1 máu do sát thương: rút 2 lá.' },
  khuynhquoc: { name: 'Khuynh quốc', desc: 'Có thể dùng lá đen (♠/♣) trên tay như Né.' },
  lacthan: { name: 'Lạc thần', desc: 'Đầu lượt: phán định liên tục, mỗi lá đen về tay, gặp lá đỏ thì dừng.' },
  nhanduc: { name: 'Nhân đức', desc: 'Pha ra bài: tặng lá trên tay cho người khác bao nhiêu cũng được. Tặng đủ 2 lá trong lượt thì hồi 1 máu (1 lần/lượt).' },
  kichtuong: { name: 'Kích tướng', lord: true, desc: 'Chúa công: khi cần đánh ra Sát để đáp trả, có thể nhờ các tướng Thục lần lượt đánh hộ.' },
  vothanh: { name: 'Võ thánh', desc: 'Có thể dùng lá đỏ (♥/♦) trên tay như Sát.' },
  baohao: { name: 'Bào hao', desc: 'Dùng Sát không giới hạn số lần trong lượt.' },
  khongthanh: { name: 'Không thành', desc: 'Khi không còn lá trên tay: không thể bị chọn làm mục tiêu của Sát hoặc Quyết đấu.' },
  quantinh: { name: 'Quan tinh', desc: 'Đầu lượt: xem X lá trên cùng chồng bài (X = số người còn sống, tối đa 5), sắp xếp lại trên/dưới tuỳ ý.' },
  longdam: { name: 'Long đảm', desc: 'Có thể dùng Sát như Né và Né như Sát.' },
  mathuat: { name: 'Mã thuật', desc: 'Luôn coi như có ngựa −1: khoảng cách từ bạn tới người khác −1.' },
  thietky: { name: 'Thiết kỵ', desc: 'Khi Sát chỉ định mục tiêu: phán định, ra đỏ thì mục tiêu không thể Né.' },
  taptri: { name: 'Tập trí', desc: 'Mỗi khi dùng một cẩm nang (không phải trì hoãn): rút 1 lá.' },
  kytai: { name: 'Kỳ tài', desc: 'Cẩm nang của bạn không bị giới hạn khoảng cách.' },
  chehanh: { name: 'Chế hành', desc: 'Pha ra bài (1 lần): bỏ bao nhiêu lá cũng được (tay/trang bị), rút lại bấy nhiêu lá.' },
  cuuvien: { name: 'Cứu viện', lord: true, desc: 'Chúa công: khi hấp hối, Đào của tướng Ngô khác hồi thêm 1 máu.' },
  kytap: { name: 'Kỳ tập', desc: 'Có thể dùng lá đen (♠/♣) trên tay như Quá hà sách kiều.' },
  khacky: { name: 'Khắc kỷ', desc: 'Nếu lượt này không dùng/đánh Sát: bỏ qua pha bỏ bài.' },
  khonhuc: { name: 'Khổ nhục', desc: 'Pha ra bài: tự mất 1 máu để rút 2 lá (bao nhiêu lần cũng được).' },
  anhtu: { name: 'Anh tư', desc: 'Pha rút bài: rút thêm 1 lá.' },
  phangian: { name: 'Phản gián', desc: 'Pha ra bài (1 lần): 1 người khác đoán 1 chất rồi rút ngẫu nhiên 1 lá trên tay bạn. Đoán sai chất thì mất 1 máu.' },
  quocsac: { name: 'Quốc sắc', desc: 'Có thể dùng lá ♦ Rô trên tay như Lạc bất tư thục.' },
  luuly: { name: 'Lưu ly', desc: 'Khi bị Sát: có thể bỏ 1 lá để chuyển Sát sang 1 người khác trong tầm đánh của bạn (không phải người Sát).' },
  khiemton: { name: 'Khiêm tốn', desc: 'Không thể bị chọn làm mục tiêu của Thuận thủ khiên dương và Lạc bất tư thục.' },
  liendoanh: { name: 'Liên doanh', desc: 'Mỗi khi mất lá cuối cùng trên tay: rút 1 lá.' },
  kieuco: { name: 'Kiêu cơ', desc: 'Mỗi khi mất 1 lá trang bị: rút 2 lá.' },
  ketnhan: { name: 'Kết nhân', desc: 'Pha ra bài (1 lần): bỏ 2 lá trên tay, chọn 1 nam đang mất máu: cả hai cùng hồi 1 máu.' },
  capcuu: { name: 'Cấp cứu', desc: 'Ngoài lượt của mình: có thể dùng lá đỏ như Đào.' },
  thanhnang: { name: 'Thanh nang', desc: 'Pha ra bài (1 lần): bỏ 1 lá trên tay để 1 người hồi 1 máu.' },
  vosong: { name: 'Vô song', desc: 'Sát của bạn cần 2 Né mới né được; trong Quyết đấu đối thủ mỗi lần phải ra 2 Sát.' },
  ligian: { name: 'Ly gián', desc: 'Pha ra bài (1 lần): bỏ 1 lá, chọn 2 tướng nam: người thứ nhất Quyết đấu người thứ hai (không thể bị Vô giải).' },
  benguyet: { name: 'Bế nguyệt', desc: 'Cuối lượt: rút 1 lá.' },
  // ---- mở rộng ----
  thantoc: { name: 'Thần tốc', desc: 'Đầu lượt: có thể bỏ qua pha Phán định và pha Rút bài để Sát 1 người bất kỳ (không cần tầm, không tính lượt Sát).' },
  cuthu: { name: 'Cứ thủ', desc: 'Pha kết thúc: có thể rút 3 lá rồi lật úp tướng (bỏ qua lượt kế tiếp của mình).' },
  lietcung: { name: 'Liệt cung', desc: 'Khi Sát chỉ định mục tiêu có số lá trên tay ≥ máu của bạn, hoặc ≤ tầm đánh của bạn: mục tiêu không thể Né.' },
  cuongcot: { name: 'Cuồng cốt', desc: 'Mỗi khi gây sát thương cho người cách bạn ≤ 1: hồi 1 máu.' },
  hongnhan: { name: 'Hồng nhan', desc: 'Lá ♠ của bạn (trên tay và khi bạn phán định) được coi là ♥.' },
  thienhuong: { name: 'Thiên hương', desc: 'Khi sắp chịu sát thương: có thể bỏ 1 lá ♥ trên tay để chuyển sát thương sang người khác; người đó sau đó rút số lá bằng số máu đã mất.' },
  loikich: { name: 'Lôi kích', desc: 'Mỗi khi dùng/đánh ra Né: có thể cho 1 người phán định, ra ♠ thì người đó chịu 2 sát thương sét.' },
  lienhoan: { name: 'Liên hoàn', desc: 'Có thể dùng lá ♣ trên tay như Thiết tác liên hoàn.' },
  nietban: { name: 'Niết bàn', desc: 'Một lần mỗi ván, khi hấp hối: bỏ hết bài, gỡ xích/lật lại, rút 3 lá và hồi về 3 máu.' },
  battran: { name: 'Bát trận', desc: 'Khi không đeo giáp: luôn coi như có Bát quái trận.' },
  hoake: { name: 'Hỏa kế', desc: 'Có thể dùng lá đỏ (♥/♦) trên tay như Hỏa công.' },
  khanpha: { name: 'Khán phá', desc: 'Có thể dùng lá đen (♠/♣) trên tay như Vô giải khả kích.' },
  cuongtap: { name: 'Cường tập', desc: 'Pha ra bài (1 lần): mất 1 máu hoặc bỏ 1 vũ khí, gây 1 sát thương cho 1 người trong tầm đánh.' },
  tietmenh: { name: 'Tiết mệnh', desc: 'Mỗi khi chịu 1 sát thương: có thể cho 1 người rút bài tới bằng máu tối đa của họ (tối đa 5 lá trên tay).' },
  khuho: { name: 'Khu hổ', desc: 'Pha ra bài (1 lần): đọ bài với 1 người nhiều máu hơn bạn. Thắng: họ gây 1 sát thương cho 1 người trong tầm của họ do bạn chọn. Thua: họ gây 1 sát thương cho bạn.' },
  thiennghia: { name: 'Thiên nghĩa', desc: 'Pha ra bài (1 lần): đọ bài với 1 người. Thắng: lượt này được dùng thêm 1 Sát và Sát không cần tầm. Thua: lượt này không được dùng Sát.' },
  loankich: { name: 'Loạn kích', desc: 'Có thể dùng 2 lá cùng chất trên tay như Vạn tiễn tề phát.' },
  // ---- Lâm – Sơn (19/11/2026, luật rút gọn cho hợp engine) ----
  xaobien: { name: 'Xảo biến', desc: 'Tự động, đầu pha Phán định: nếu trước mặt có Lạc bất tư thục hoặc Binh lương thốn đoạn, bỏ 1 lá trên tay để dẹp hết các lá đó (không dẹp Thiểm điện).' },
  dondien: { name: 'Đồn điền', desc: 'Ngoài lượt của bạn: mỗi lần bạn đánh ra Né, rút 1 lá.' },
  khieukhich: { name: 'Khiêu khích', desc: 'Pha ra bài (1 lần): chọn 1 người có bạn trong tầm đánh của họ. Họ phải Sát bạn; không Sát thì bạn phá 1 lá của họ.' },
  anlac: { name: 'An lạc', desc: 'Tự động: mỗi khi bị Sát nhắm vào, người dùng Sát phải bỏ ngẫu nhiên 1 lá trên tay; trên tay hết bài thì Sát đó vô hiệu.' },
  tieudao: { name: 'Tiêu dao', desc: 'Pha kết thúc: nếu lượt này bạn không dùng Sát, rút 1 lá.' },
  hoathu: { name: 'Họa thủ', desc: 'Tự động: Nam man xâm nhập không có tác dụng với bạn.' },
  taikhoi: { name: 'Tái khởi', desc: 'Tự động, pha rút bài: nếu đã mất từ 2 máu trở lên, chỉ rút 1 lá nhưng hồi 1 máu.' },
  lietnhan: { name: 'Liệt nhận', desc: 'Mỗi khi Sát của bạn gây sát thương: lấy ngẫu nhiên 1 lá trên tay người đó.' },
  anhhon: { name: 'Anh hồn', desc: 'Tự động, pha rút bài: rút thêm số lá bằng số máu đã mất (tối đa 2).' },
  haothi: { name: 'Hảo thí', desc: 'Tự động, pha rút bài: rút thêm 2 lá; nếu sau đó trên tay quá 5 lá thì tặng một nửa (làm tròn xuống) cho người ít bài nhất (2v2: tặng đồng đội; Solo: bỏ đi).' },
  kichngang: { name: 'Kích ngang', desc: 'Mỗi khi bạn dùng – hoặc trở thành mục tiêu của – Quyết đấu hay Sát đỏ: rút 1 lá.' },
  tuutri: { name: 'Tửu trì', desc: 'Có thể dùng lá ♠ trên tay như Rượu.' },
  banghoai: { name: 'Băng hoại', desc: 'Bắt buộc, pha kết thúc: nếu có người máu ít hơn bạn, bạn mất 1 máu tối đa (đang đầy máu thì mất 1 máu).' },
  hoansat: { name: 'Hoàn sát', desc: 'Trong lượt của bạn: người hấp hối chỉ được cứu bằng Đào của bạn hoặc của chính họ.' },
  duymac: { name: 'Duy mạc', desc: 'Không thể là mục tiêu của cẩm nang màu đen (♠/♣).' },
  batkhuat: { name: 'Bất khuất', desc: 'Tự động: khi hấp hối mà không ai cứu, lật lá trên cùng chồng bài làm "vết sẹo"; nếu số của nó khác mọi vết sẹo trước thì hồi về 1 máu và sống tiếp.' },
};

// ---------- Võ tướng ----------
// han: chữ Hán trên chân dung; emo: vật biểu tượng; tag: lời giới thiệu vui
export const GENERALS = {
  caocao: { name: 'Tào Tháo', kingdom: 'wei', hp: 4, gender: 'm', lord: true, han: '操', emo: '🏯', skills: ['gianhung', 'hogia'], tag: 'Thà ta phụ người, chứ không để người phụ ta' },
  simayi: { name: 'Tư Mã Ý', kingdom: 'wei', hp: 3, gender: 'm', han: '懿', emo: '🦊', skills: ['phandap', 'quytai'], tag: 'Kiên nhẫn là vũ khí' },
  xiahoudun: { name: 'Hạ Hầu Đôn', kingdom: 'wei', hp: 4, gender: 'm', han: '惇', emo: '👁️', skills: ['cuonglie'], tag: 'Đụng là cắn lại' },
  zhangliao: { name: 'Trương Liêu', kingdom: 'wei', hp: 4, gender: 'm', han: '遼', emo: '🐺', skills: ['duttap'], tag: 'Tám trăm kỵ phá vạn quân' },
  xuchu: { name: 'Hứa Chử', kingdom: 'wei', hp: 4, gender: 'm', han: '褚', emo: '💪', skills: ['loay'], tag: 'Cởi giáp đánh cho sướng' },
  guojia: { name: 'Quách Gia', kingdom: 'wei', hp: 3, gender: 'm', han: '嘉', emo: '🍷', skills: ['thiendo', 'dike'], tag: 'Quỷ tài yểu mệnh' },
  zhenji: { name: 'Chân Cơ', kingdom: 'wei', hp: 3, gender: 'f', han: '甄', emo: '🌊', skills: ['khuynhquoc', 'lacthan'], tag: 'Lạc thần trên sóng' },
  liubei: { name: 'Lưu Bị', kingdom: 'shu', hp: 4, gender: 'm', lord: true, han: '備', emo: '🤝', skills: ['nhanduc', 'kichtuong'], tag: 'Lấy nhân nghĩa thu lòng người' },
  guanyu: { name: 'Quan Vũ', kingdom: 'shu', hp: 4, gender: 'm', han: '羽', emo: '🐉', wpn: 'qinglong', skills: ['vothanh'], tag: 'Mặt đỏ, râu dài, đao lớn' },
  zhangfei: { name: 'Trương Phi', kingdom: 'shu', hp: 4, gender: 'm', han: '飛', emo: '🐯', wpn: 'zhangba', skills: ['baohao'], tag: 'Hét một tiếng cầu gãy' },
  zhugeliang: { name: 'Gia Cát Lượng', kingdom: 'shu', hp: 3, gender: 'm', han: '亮', emo: '🪶', skills: ['quantinh', 'khongthanh'], tag: 'Quạt lông, khăn là' },
  zhaoyun: { name: 'Triệu Vân', kingdom: 'shu', hp: 4, gender: 'm', han: '雲', emo: '🐲', skills: ['longdam'], tag: 'Toàn thân là gan' },
  machao: { name: 'Mã Siêu', kingdom: 'shu', hp: 4, gender: 'm', han: '超', emo: '🐎', skills: ['mathuat', 'thietky'], tag: 'Cẩm Mã Siêu' },
  huangyueying: { name: 'Hoàng Nguyệt Anh', kingdom: 'shu', hp: 3, gender: 'f', han: '英', emo: '⚙️', skills: ['taptri', 'kytai'], tag: 'Kỹ sư đời Hán' },
  sunquan: { name: 'Tôn Quyền', kingdom: 'wu', hp: 4, gender: 'm', lord: true, han: '權', emo: '⚖️', skills: ['chehanh', 'cuuvien'], tag: 'Sinh con phải như Tôn Trọng Mưu' },
  ganning: { name: 'Cam Ninh', kingdom: 'wu', hp: 4, gender: 'm', han: '寧', emo: '🔔', skills: ['kytap'], tag: 'Trăm kỵ cướp trại' },
  lvmeng: { name: 'Lữ Mông', kingdom: 'wu', hp: 4, gender: 'm', han: '蒙', emo: '📚', skills: ['khacky'], tag: 'Ba ngày không gặp, phải nhìn bằng con mắt khác' },
  huanggai: { name: 'Hoàng Cái', kingdom: 'wu', hp: 4, gender: 'm', han: '蓋', emo: '🔥', skills: ['khonhuc'], tag: 'Một người đánh, một người chịu' },
  zhouyu: { name: 'Chu Du', kingdom: 'wu', hp: 3, gender: 'm', han: '瑜', emo: '🎼', skills: ['anhtu', 'phangian'], tag: 'Đàn sai một nốt cũng ngoái nhìn' },
  daqiao: { name: 'Đại Kiều', kingdom: 'wu', hp: 3, gender: 'f', han: '喬', emo: '🌺', skills: ['quocsac', 'luuly'], tag: 'Nhan sắc khuynh thành' },
  luxun: { name: 'Lục Tốn', kingdom: 'wu', hp: 3, gender: 'm', han: '遜', emo: '📜', skills: ['khiemton', 'liendoanh'], tag: 'Thư sinh đốt liên doanh' },
  sunshangxiang: { name: 'Tôn Thượng Hương', kingdom: 'wu', hp: 3, gender: 'f', han: '香', emo: '🏹', skills: ['kieuco', 'ketnhan'], tag: 'Cung kiếm chẳng kém nam nhi' },
  huatuo: { name: 'Hoa Đà', kingdom: 'qun', hp: 3, gender: 'm', han: '佗', emo: '🌿', skills: ['capcuu', 'thanhnang'], tag: 'Thần y cạo xương' },
  lvbu: { name: 'Lữ Bố', kingdom: 'qun', hp: 4, gender: 'm', han: '布', emo: '⚔️', wpn: 'fangtian', skills: ['vosong'], tag: 'Người có Lữ Bố, ngựa có Xích Thố' },
  // ---- tướng mở rộng ----
  xiahouyuan: { name: 'Hạ Hầu Uyên', kingdom: 'wei', hp: 4, gender: 'm', exp: true, han: '淵', emo: '💨', skills: ['thantoc'], tag: 'Ba ngày năm trăm dặm' },
  caoren: { name: 'Tào Nhân', kingdom: 'wei', hp: 4, gender: 'm', exp: true, han: '仁', emo: '🏰', skills: ['cuthu'], tag: 'Thành còn người còn' },
  dianwei: { name: 'Điển Vi', kingdom: 'wei', hp: 4, gender: 'm', exp: true, han: '韋', emo: '🛡️', wpn: 'shuangji', skills: ['cuongtap'], tag: 'Cổ chi Ác Lai' },
  xunyu: { name: 'Tuân Úc', kingdom: 'wei', hp: 3, gender: 'm', exp: true, han: '彧', emo: '📜', skills: ['khuho', 'tietmenh'], tag: 'Vương tá chi tài' },
  huangzhong: { name: 'Hoàng Trung', kingdom: 'shu', hp: 4, gender: 'm', exp: true, han: '忠', emo: '🏹', skills: ['lietcung'], tag: 'Già mà gân' },
  weiyan: { name: 'Ngụy Diên', kingdom: 'shu', hp: 4, gender: 'm', exp: true, han: '延', emo: '🩸', skills: ['cuongcot'], tag: 'Ai dám giết ta?' },
  pangtong: { name: 'Bàng Thống', kingdom: 'shu', hp: 3, gender: 'm', exp: true, han: '統', emo: '🐦‍🔥', skills: ['lienhoan', 'nietban'], tag: 'Phượng sồ tiên sinh' },
  wolong: { name: 'Ngọa Long', kingdom: 'shu', hp: 3, gender: 'm', exp: true, han: '臥', emo: '🔥', skills: ['battran', 'hoake', 'khanpha'], tag: 'Mượn gió đông đốt Xích Bích' },
  xiaoqiao: { name: 'Tiểu Kiều', kingdom: 'wu', hp: 3, gender: 'f', exp: true, han: '嬌', emo: '🌸', skills: ['hongnhan', 'thienhuong'], tag: 'Hoa nhường nguyệt thẹn' },
  zhanghe: { name: 'Trương Cáp', kingdom: 'wei', hp: 4, gender: 'm', ls: true, han: '郃', emo: '🔀', skills: ['xaobien'], tag: 'Biến hoá khôn lường' },
  dengai: { name: 'Đặng Ngải', kingdom: 'wei', hp: 4, gender: 'm', ls: true, han: '艾', emo: '⛏️', skills: ['dondien'], tag: 'Cày ruộng nuôi quân, vượt núi Âm Bình' },
  jiangwei: { name: 'Khương Duy', kingdom: 'shu', hp: 4, gender: 'm', ls: true, han: '維', emo: '🗡️', skills: ['khieukhich'], tag: 'Truyền nhân của Gia Cát' },
  liushan: { name: 'Lưu Thiện', kingdom: 'shu', hp: 3, gender: 'm', ls: true, han: '禪', emo: '🍵', skills: ['anlac', 'tieudao'], tag: 'Vui ở đây, chẳng nhớ Thục' },
  menghuo: { name: 'Mạnh Hoạch', kingdom: 'shu', hp: 4, gender: 'm', ls: true, han: '獲', emo: '🐘', skills: ['hoathu', 'taikhoi'], tag: 'Bảy lần bắt, bảy lần tha' },
  zhurong: { name: 'Chúc Dung', kingdom: 'shu', hp: 4, gender: 'f', ls: true, han: '融', emo: '🪃', skills: ['hoathu', 'lietnhan'], tag: 'Nữ tướng phi đao Nam Man' },
  sunjian: { name: 'Tôn Kiên', kingdom: 'wu', hp: 4, gender: 'm', ls: true, han: '堅', emo: '🐅', skills: ['anhhon'], tag: 'Mãnh hổ Giang Đông' },
  lusu: { name: 'Lỗ Túc', kingdom: 'wu', hp: 3, gender: 'm', ls: true, han: '肅', emo: '🎁', skills: ['haothi'], tag: 'Chỉ kho thóc tặng bạn' },
  sunce: { name: 'Tôn Sách', kingdom: 'wu', hp: 4, gender: 'm', ls: true, han: '策', emo: '🦁', skills: ['kichngang'], tag: 'Tiểu Bá Vương' },
  dongzhuo: { name: 'Đổng Trác', kingdom: 'qun', hp: 8, gender: 'm', ls: true, han: '卓', emo: '🍖', skills: ['tuutri', 'banghoai'], tag: 'Ao rượu rừng thịt' },
  jiaxu: { name: 'Giả Hủ', kingdom: 'qun', hp: 3, gender: 'm', ls: true, han: '詡', emo: '☠️', skills: ['hoansat', 'duymac'], tag: 'Một kế loạn thiên hạ' },
  zhoutai: { name: 'Chu Thái', kingdom: 'wu', hp: 4, gender: 'm', exp: true, han: '泰', emo: '🩹', skills: ['batkhuat'], tag: 'Mười hai vết thương vì chủ' },
  taishici: { name: 'Thái Sử Từ', kingdom: 'wu', hp: 4, gender: 'm', exp: true, han: '慈', emo: '🎯', skills: ['thiennghia'], tag: 'Đại trượng phu sinh ra ở đời' },
  zhangjiao: { name: 'Trương Giác', kingdom: 'qun', hp: 3, gender: 'm', exp: true, han: '角', emo: '⚡', skills: ['loikich'], tag: 'Trời xanh đã chết' },
  yuanshao: { name: 'Viên Thiệu', kingdom: 'qun', hp: 4, gender: 'm', exp: true, han: '紹', emo: '🏹', skills: ['loankich'], tag: 'Bốn đời tam công' },
  diaochan: { name: 'Điêu Thuyền', kingdom: 'qun', hp: 3, gender: 'f', han: '蟬', emo: '🌙', skills: ['ligian', 'benguyet'], tag: 'Trăng cũng phải nấp' },
  caopi: { name: 'Tào Phi', kingdom: 'wei', hp: 4, gender: 'm', g3: true, han: '丕', emo: '👑', skills: ['hanhthuong', 'phongtruc'], tag: 'Ngụy Văn Đế, phế Hán lập Ngụy' },
  xuhuang: { name: 'Từ Hoảng', kingdom: 'wei', hp: 4, gender: 'm', g3: true, han: '晃', emo: '🪓', skills: ['doanluong'], tag: 'Danh tướng cắt đường lương' },
  caozhi: { name: 'Tào Thực', kingdom: 'wei', hp: 4, gender: 'm', g3: true, han: '植', emo: '🌸', skills: ['lacanh', 'tuutri'], tag: 'Bảy bước thành thơ' },
  yujin: { name: 'Vu Cấm', kingdom: 'wei', hp: 4, gender: 'm', g3: true, han: '禁', emo: '🛡️', skills: ['nghitrong'], tag: 'Nghiêm chỉnh quân luật' },
  fazheng: { name: 'Pháp Chính', kingdom: 'shu', hp: 3, gender: 'm', g3: true, han: '正', emo: '⚖️', skills: ['anoan'], tag: 'Ơn một bữa, oán một lườm đều trả' },
  xushu: { name: 'Từ Thứ', kingdom: 'shu', hp: 3, gender: 'm', g3: true, han: '庶', emo: '🤐', skills: ['vongon', 'cuhien'], tag: 'Vào Tào doanh không nói một lời' },
  masu: { name: 'Mã Tắc', kingdom: 'shu', hp: 4, gender: 'm', g3: true, han: '謖', emo: '😭', skills: ['tamchien', 'huyle'], tag: 'Mất Nhai Đình, Khổng Minh gạt lệ' },
  guanping: { name: 'Quan Bình', kingdom: 'shu', hp: 4, gender: 'm', g3: true, han: '平', emo: '🐲', skills: ['longngam'], tag: 'Con nuôi Quan Vũ' },
  lingtong: { name: 'Lăng Thống', kingdom: 'wu', hp: 4, gender: 'm', g3: true, han: '統', emo: '🌪️', skills: ['toanphong'], tag: 'Hổ tướng trẻ Đông Ngô' },
  xusheng: { name: 'Từ Thịnh', kingdom: 'wu', hp: 4, gender: 'm', g3: true, han: '盛', emo: '💥', skills: ['phaquan'], tag: 'Thành giả nghi binh dọa Ngụy' },
  wuguotai: { name: 'Ngô Quốc Thái', kingdom: 'wu', hp: 4, gender: 'f', g3: true, han: '吳', emo: '🌿', skills: ['boich', 'camlo'], tag: 'Mẹ của Tôn Quyền' },
  chengpu: { name: 'Trình Phổ', kingdom: 'wu', hp: 4, gender: 'm', g3: true, han: '普', emo: '🔥', skills: ['lieuhoa'], tag: 'Lão tướng ba đời nhà Tôn' },
  yuji: { name: 'Vu Cát', kingdom: 'qun', hp: 3, gender: 'm', g3: true, han: '吉', emo: '🔮', skills: ['cohoac'], tag: 'Đạo sĩ làm mưa' },
  yanliang: { name: 'Nhan Lương & Văn Sửu', kingdom: 'qun', hp: 4, gender: 'm', g3: true, han: '顏', emo: '⚔️', skills: ['songhung'], tag: 'Hai mãnh tướng Hà Bắc' },
  pangde: { name: 'Bàng Đức', kingdom: 'qun', hp: 4, gender: 'm', g3: true, han: '德', emo: '⚰️', skills: ['mathuat', 'manhtien'], tag: 'Khiêng quan tài ra trận' },
  gongsunzan: { name: 'Công Tôn Toản', kingdom: 'qun', hp: 4, gender: 'm', g3: true, han: '瓚', emo: '🐴', skills: ['nghiatong'], tag: 'Bạch Mã Nghĩa Tòng' },
};
export const LORD_IDS = Object.keys(GENERALS).filter(k => GENERALS[k].lord);
export const BASE_GENERALS = Object.keys(GENERALS).filter(k => !GENERALS[k].exp);
export const EXP_GENERALS = Object.keys(GENERALS).filter(k => GENERALS[k].exp);
// tất cả chữ Hán dùng cho font thư pháp (để tải font tối giản)
export const HAN_TEXT = [...new Set([...Object.values(GENERALS).map(g => g.han), ...Object.values(CARD_INFO).map(c => c.han), ...Object.values(KINGDOMS).map(k => k.han), '三國殺'].join(''))].join('');

/* kho tướng theo luật phòng: expGen = 13 tướng Quân Tranh, gen2 = 11 tướng Lâm – Sơn */
export function genPool(o, lords = true) { return Object.keys(GENERALS).filter(k => { const g = GENERALS[k]; return (lords || !g.lord) && (o.expGen || !g.exp) && (o.gen2 !== false || !g.ls) && (o.gen3 !== false || !g.g3); }); }
