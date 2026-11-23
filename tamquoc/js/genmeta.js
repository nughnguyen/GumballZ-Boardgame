// Thông tin chiến thuật từng tướng cho bảng cấm/chọn (thuần dữ liệu, không ảnh hưởng luật).

// ph: e = mạnh đầu game · l = mạnh cuối game · a = toàn diện

// st: atk Thiên công · def Thiên thủ · ctl Kiểm soát · dis Phá hoại · sup Hỗ trợ

// beats: tướng mình khắc (kỹ năng chặn đúng lối chơi của họ) · weak: tướng khắc mình · tip: combo / cách chơi cơ bản

export const PHASE = { e: ['🌅', 'Đầu game'], l: ['🌙', 'Cuối game'], a: ['⚖️', 'Toàn diện'] };

export const STYLE = { atk: ['⚔️', 'Thiên công'], def: ['🛡️', 'Thiên thủ'], ctl: ['🎯', 'Kiểm soát'], dis: ['💣', 'Phá hoại'], sup: ['💚', 'Hỗ trợ'] };

export const META = {

 caocao: { ph: 'a', st: ['def'], beats: ['zhangfei', 'yuanshao', 'xuchu'], weak: ['jiaxu', 'xusheng'], tip: 'Ăn đòn để nhặt lại lá: Vạn tiễn, Nam man, Quyết đấu đánh vào bạn là thành bài của bạn.' },

 simayi: { ph: 'a', st: ['def', 'ctl'], beats: ['zhangfei', 'xuchu', 'zhenji', 'machao'], weak: ['jiaxu', 'yujin'], tip: 'Giữ vài lá đỏ/đen trên tay để Quỷ tài đổi phán định (Lạc, Bát quái, Thiết kỵ của địch).' },

 xiahoudun: { ph: 'a', st: ['def'], beats: ['zhangfei', 'xuchu', 'guanping'], weak: ['xushu', 'jiaxu'], tip: 'Ai đánh bạn cũng phải trả giá: đứng hàng đầu hút đòn cho đồng đội.' },

 zhangliao: { ph: 'e', st: ['dis'], beats: ['zhugeliang', 'luxun', 'lusu'], weak: ['caoren', 'zhanghe'], tip: 'Lấy bài 2 người mỗi lượt: nhắm người đang giữ Né/Đào để mở đường cho đồng đội.' },

 xuchu: { ph: 'e', st: ['atk'], beats: ['huatuo', 'zhugeliang', 'diaochan'], weak: ['xiahoudun', 'caocao', 'liushan'], tip: 'Lỏa y + Rượu + Sát = 3 sát thương một phát. Đánh mạnh khi có sẵn Sát trên tay.' },

 guojia: { ph: 'l', st: ['def', 'sup'], beats: ['zhangfei', 'xuchu', 'yuanshao'], weak: ['jiaxu', 'xushu', 'xusheng'], tip: 'Càng bị đánh càng nhiều bài; nhường bài thừa cho đồng đội qua Lưu Bị / Lỗ Túc.' },

 zhenji: { ph: 'l', st: ['def'], beats: ['guanyu', 'zhangfei', 'zhaoyun'], weak: ['machao', 'huangzhong', 'lvbu', 'simayi'], tip: 'Lạc thần đầu lượt gom lá đen, mọi lá đen đều là Né – rất khó hạ bằng Sát.' },

 liubei: { ph: 'a', st: ['sup'], beats: ['lusu'], weak: ['jiaxu', 'xuchu', 'zhangliao'], tip: 'Tặng bài cho đồng đội tấn công (Trương Phi, Quan Vũ), tặng đủ 2 lá để hồi máu.' },

 guanyu: { ph: 'a', st: ['atk'], beats: ['lvmeng', 'daqiao'], weak: ['yujin', 'liushan', 'zhenji', 'zhangjiao'], tip: 'Mọi lá đỏ đều là Sát: giữ đỏ để đánh, đen để thủ. Hợp vũ khí tầm xa.' },

 zhangfei: { ph: 'e', st: ['atk'], beats: ['zhugeliang', 'huatuo', 'diaochan', 'xiaoqiao'], weak: ['liushan', 'xiahoudun', 'caopi', 'zhangjiao'], tip: 'Gom Sát rồi xả một lượt; Rượu + Sát chí mạng. Ghép Lưu Bị tặng bài là cực khoẻ.' },

 zhugeliang: { ph: 'l', st: ['def', 'ctl'], beats: ['lvbu', 'yanliang', 'diaochan'], weak: ['zhangliao', 'yuanshao', 'xuchu'], tip: 'Quan tinh xếp bài cho lượt sau; đánh hết bài để Không thành – Sát / Quyết đấu bó tay.' },

 zhaoyun: { ph: 'a', st: ['atk', 'def'], beats: ['xuchu', 'lvbu'], weak: ['machao', 'huangzhong'], tip: 'Sát và Né đổi qua lại – lúc nào cũng có đòn đáp trả. Dễ chơi cho người mới.' },

 machao: { ph: 'e', st: ['atk'], beats: ['zhenji', 'dengai', 'wolong', 'zhangjiao'], weak: ['liushan', 'caopi', 'xiahoudun'], tip: 'Tầm xa + Thiết kỵ phán đỏ là không né được: săn tướng 3 máu sống nhờ Né.' },

 huangyueying: { ph: 'l', st: ['ctl'], beats: ['zhugeliang', 'lvmeng'], weak: ['jiaxu', 'zhangliao', 'xuchu'], tip: 'Mỗi cẩm nang rút 1 lá: Vô trung sinh hữu, Thuận thủ khắp bàn nhờ Kỳ tài.' },

 sunquan: { ph: 'a', st: ['sup'], beats: [], weak: ['jiaxu'], tip: 'Chế hành đổi bài xấu lấy bài mới mỗi lượt – luôn có lá đúng lúc cần.' },

 ganning: { ph: 'e', st: ['dis'], beats: ['sunshangxiang', 'zhugeliang', 'huatuo'], weak: ['jiaxu', 'luxun'], tip: 'Lá đen nào cũng là Quá hà: phá giáp / ngựa / vũ khí trước khi đồng đội Sát.' },

 lvmeng: { ph: 'l', st: ['def'], beats: ['zhangliao'], weak: ['ganning', 'guanyu'], tip: 'Không Sát thì không phải bỏ bài: tích bài vài lượt rồi bùng nổ.' },

 huanggai: { ph: 'e', st: ['atk'], beats: [], weak: ['xuchu', 'jiaxu'], tip: 'Đổi máu lấy bài để xả một lượt; ghép Hoa Đà / Ngô Quốc Thái hồi máu là vòng lặp mạnh.' },

 zhouyu: { ph: 'a', st: ['ctl'], beats: ['zhugeliang', 'huatuo'], weak: ['jiaxu', 'zhangliao'], tip: 'Rút 3 lá mỗi lượt, Phản gián gây sát thương không cần Sát.' },

 daqiao: { ph: 'a', st: ['ctl', 'def'], beats: ['zhangfei', 'guanyu', 'lvbu'], weak: ['luxun', 'zhanghe', 'jiaxu'], tip: 'Rô = Lạc bất tư thục khoá lượt địch; Lưu ly đẩy Sát sang kẻ thù khác.' },

 luxun: { ph: 'l', st: ['def'], beats: ['daqiao', 'ganning', 'zhangliao'], weak: ['xuchu', 'machao'], tip: 'Đánh hết bài là rút lại: chơi nhanh, đánh lá cuối thật nhiều.' },

 sunshangxiang: { ph: 'a', st: ['sup'], beats: ['ganning', 'xusheng'], weak: ['jiaxu', 'zhangliao'], tip: 'Mất trang bị là rút 2: lắp – tháo trang bị liên tục, Kết nhân hồi máu cùng đồng đội nam.' },

 huatuo: { ph: 'l', st: ['sup'], beats: ['xuchu', 'huanggai'], weak: ['jiaxu', 'zhangfei', 'ganning'], tip: 'Lá đỏ thành Đào ngoài lượt; mỗi lượt hồi 1 máu cho người cần. Ưu tiên bảo vệ.' },

 lvbu: { ph: 'e', st: ['atk'], beats: ['dengai', 'zhenji', 'zhangjiao', 'wolong'], weak: ['zhugeliang', 'liushan', 'daqiao'], tip: 'Sát cần 2 Né mới thoát, Quyết đấu cần 2 Sát: đánh liên tục khi còn đầy máu.' },

 xiahouyuan: { ph: 'e', st: ['atk'], beats: ['zhugeliang', 'huatuo'], weak: ['liushan', 'zhenji'], tip: 'Bỏ pha rút để Sát bất kỳ ai: kết liễu tướng thấp máu xa tầm.' },

 caoren: { ph: 'l', st: ['def'], beats: ['zhangliao'], weak: ['zhangfei', 'lvbu'], tip: 'Cứ thủ rút 3 rồi nghỉ 1 lượt: dùng khi đã an toàn, đầy Né / Đào.' },

 dianwei: { ph: 'e', st: ['atk'], beats: ['zhugeliang', 'huatuo'], weak: ['caopi', 'xiahoudun'], tip: 'Đổi máu / vũ khí lấy 1 sát thương chắc chắn – không né được.' },

 xunyu: { ph: 'a', st: ['ctl', 'sup'], beats: ['dongzhuo', 'lvbu'], weak: ['jiaxu', 'xuchu'], tip: 'Khu hổ bắt tướng máu cao đánh nhau; bị đánh thì Tiết mệnh nạp bài cho đồng đội.' },

 huangzhong: { ph: 'e', st: ['atk'], beats: ['zhenji', 'dengai', 'zhangjiao', 'wolong'], weak: ['liushan', 'jiaxu'], tip: 'Sát nhắm người nhiều bài hoặc ở gần: không né được. Ghép vũ khí tầm xa.' },

 weiyan: { ph: 'a', st: ['atk'], beats: ['huanggai'], weak: ['zhenji', 'liushan'], tip: 'Đánh trúng người ở sát bên là hồi máu: lắp ngựa −1, đánh liên tục.' },

 pangtong: { ph: 'l', st: ['ctl'], beats: ['lvbu', 'zhangfei'], weak: ['jiaxu', 'xushu'], tip: 'Xích cả bàn bằng lá ♣ rồi Hỏa Sát / Hỏa công cháy dây chuyền; Niết bàn là mạng thứ hai.' },

 wolong: { ph: 'l', st: ['ctl', 'def'], beats: ['huangyueying', 'daqiao', 'diaochan'], weak: ['machao', 'huangzhong', 'lvbu', 'jiaxu'], tip: 'Đen = Vô giải chặn cẩm nang, đỏ = Hỏa công; không đeo giáp vẫn có Bát quái.' },

 xiaoqiao: { ph: 'a', st: ['def', 'ctl'], beats: ['xuchu', 'dianwei', 'lvbu'], weak: ['jiaxu', 'zhangliao'], tip: '♠ cũng là ♥: giữ ♥ để Thiên hương đẩy sát thương sang kẻ địch.' },

 zhanghe: { ph: 'a', st: ['def'], beats: ['daqiao', 'xuhuang'], weak: ['zhangfei', 'lvbu'], tip: 'Lạc / Binh lương đặt lên bạn là dẹp ngay: không sợ bị khoá lượt.' },

 dengai: { ph: 'l', st: ['def'], beats: ['zhangfei', 'guanping'], weak: ['machao', 'huangzhong', 'lvbu'], tip: 'Mỗi lần Né ngoài lượt rút 1 lá: càng bị Sát càng giàu.' },

 jiangwei: { ph: 'a', st: ['ctl'], beats: ['zhugeliang', 'lvmeng'], weak: ['zhangfei', 'guanyu'], tip: 'Khiêu khích người không có Sát: họ mất bài; có Sát thì họ tốn Sát.' },

 liushan: { ph: 'a', st: ['def'], beats: ['zhangfei', 'guanping', 'machao', 'lvbu'], weak: ['diaochan', 'yuanshao'], tip: 'Ai Sát bạn cũng mất bài ngẫu nhiên: tướng Sát nhiều sợ bạn.' },

 menghuo: { ph: 'l', st: ['def'], beats: ['zhurong'], weak: ['zhangfei', 'xuchu'], tip: 'Mất máu thì rút ít nhưng hồi 1 máu mỗi lượt – rất lì cuối game.' },

 zhurong: { ph: 'e', st: ['atk', 'dis'], beats: ['zhugeliang', 'luxun'], weak: ['liushan', 'caopi'], tip: 'Sát trúng là cướp 1 lá: vừa gây sát thương vừa làm địch nghèo bài.' },

 sunjian: { ph: 'l', st: ['atk'], beats: [], weak: ['xuchu', 'lvbu'], tip: 'Càng mất máu càng rút nhiều: đừng vội hồi máu khi còn an toàn.' },

 lusu: { ph: 'a', st: ['sup'], beats: [], weak: ['zhangliao', 'ganning'], tip: 'Rút 4 lá mỗi lượt, dư thì chia cho đồng đội ít bài – xương sống của 2v2.' },

 sunce: { ph: 'a', st: ['atk'], beats: ['diaochan', 'yanliang'], weak: ['yujin', 'liushan'], tip: 'Quyết đấu / Sát đỏ (dùng hay bị nhắm) đều rút 1: Quyết đấu liên tục.' },

 dongzhuo: { ph: 'e', st: ['atk'], beats: [], weak: ['xunyu', 'diaochan', 'jiaxu'], tip: '8 máu, ♠ thành Rượu: Sát chí mạng mỗi lượt. Băng hoại làm tụt máu tối đa – đánh nhanh thắng nhanh.' },

 jiaxu: { ph: 'a', st: ['ctl'], beats: ['huatuo', 'wolong', 'huangyueying', 'ganning', 'yanliang'], weak: ['zhangfei', 'lvbu'], tip: 'Cẩm nang đen vô hiệu với bạn; trong lượt bạn chỉ có Đào của bạn cứu được – kết liễu chắc chắn.' },

 zhoutai: { ph: 'l', st: ['def'], beats: [], weak: ['jiaxu', 'masu'], tip: 'Hấp hối không chết ngay nhờ vết sẹo – hút đòn rất tốt.' },

 taishici: { ph: 'e', st: ['atk'], beats: ['zhugeliang'], weak: ['zhenji', 'liushan'], tip: 'Đọ bài thắng là được 2 Sát không cần tầm: giữ lá to để đọ.' },

 zhangjiao: { ph: 'a', st: ['ctl'], beats: ['zhangfei', 'guanyu', 'zhaoyun'], weak: ['machao', 'huangzhong', 'lvbu'], tip: 'Mỗi lần Né là gọi sét: ♠ = 2 sát thương. Ghép Bát quái / bảo vật Bát trận.' },

 yuanshao: { ph: 'e', st: ['atk'], beats: ['liushan', 'zhugeliang'], weak: ['xushu', 'caocao', 'guojia'], tip: '2 lá cùng chất = Vạn tiễn: dọn cả bàn mỗi lượt.' },

 diaochan: { ph: 'a', st: ['ctl'], beats: ['dongzhuo', 'lvbu', 'liushan'], weak: ['zhangfei', 'xuchu', 'wolong'], tip: 'Ly gián bắt 2 tướng nam Quyết đấu nhau – không ai Vô giải được.' },

 caopi: { ph: 'l', st: ['def', 'ctl'], beats: ['zhangfei', 'machao', 'dianwei'], weak: ['jiaxu', 'xushu'], tip: 'Ai gây sát thương cho bạn là mất lượt kế; có người chết thì hốt sạch bài.' },

 xuhuang: { ph: 'a', st: ['ctl'], beats: ['zhangliao', 'lusu'], weak: ['zhanghe'], tip: 'Lá đen cơ bản / trang bị thành Binh lương: khoá pha rút của địch từ xa 2.' },

 caozhi: { ph: 'l', st: ['sup'], beats: [], weak: ['zhangliao'], tip: 'Nhặt lá ♣ người khác bỏ; ♠ thành Rượu cho Sát chí mạng.' },

 yujin: { ph: 'a', st: ['def'], beats: ['guanyu', 'zhangfei', 'sunce'], weak: ['ganning', 'xusheng'], tip: 'Không đeo giáp thì Sát đen vô hiệu – đừng mang giáp.' },

 fazheng: { ph: 'a', st: ['def'], beats: ['xuchu', 'dianwei'], weak: ['jiaxu', 'xushu'], tip: 'Đánh bạn phải trả 1 lá ♥ hoặc 1 máu; ai cứu bạn thì được thưởng bài.' },

 xushu: { ph: 'a', st: ['def'], beats: ['yuanshao', 'diaochan', 'huangyueying', 'zhouyu'], weak: ['zhangfei', 'lvbu'], tip: 'Cẩm nang không gây sát thương cho bạn: miễn Vạn tiễn, Nam man, Quyết đấu, Hỏa công.' },

 masu: { ph: 'a', st: ['ctl'], beats: ['zhoutai'], weak: ['zhangliao', 'ganning'], tip: 'Ít bài thì rút thêm; ai giết bạn mất sạch bài – địch ngại kết liễu.' },

 guanping: { ph: 'e', st: ['atk'], beats: ['zhugeliang', 'huatuo'], weak: ['liushan', 'dengai'], tip: 'Sát đỏ không tính lượt và rút 1 khi trúng: đánh nhiều Sát đỏ.' },

 lingtong: { ph: 'a', st: ['dis'], beats: ['ganning', 'xusheng'], weak: ['jiaxu'], tip: 'Bị phá trang bị ngoài lượt thì người đang đánh mất 1 lá – lắp nhiều trang bị làm mồi.' },

 xusheng: { ph: 'e', st: ['atk', 'dis'], beats: ['yujin', 'zhenji', 'caocao'], weak: ['sunshangxiang', 'lingtong'], tip: 'Sát trúng là lột 1 trang bị: phá giáp / ngựa trước để đồng đội dễ đánh.' },

 wuguotai: { ph: 'l', st: ['sup'], beats: ['huanggai'], weak: ['jiaxu'], tip: 'Đồng đội hấp hối bỏ 1 lá cẩm nang/trang bị để sống; ghép Hoa Đà hồi máu + rút bài.' },

 chengpu: { ph: 'a', st: ['atk'], beats: ['zhangjiao', 'wolong'], weak: ['yujin', 'liushan'], tip: 'Sát nào cũng thành Hỏa Sát (phá Đằng giáp, cháy dây chuyền xích), trúng là rút 1.' },

 yuji: { ph: 'l', st: ['sup'], beats: [], weak: ['zhangliao', 'xuchu'], tip: 'Cuối lượt lật bài: ♥ hồi máu, ♦♣ nhận lá – càng sống lâu càng lời.' },

 yanliang: { ph: 'e', st: ['atk'], beats: ['zhugeliang', 'huatuo'], weak: ['jiaxu', 'xushu', 'wolong'], tip: 'Mỗi lượt 1 lá đen thành Quyết đấu: kéo người ít Sát vào đấu.' },

 pangde: { ph: 'e', st: ['atk', 'dis'], beats: ['zhenji', 'dengai'], weak: ['liushan', 'yujin'], tip: 'Tầm xa; bị Né vẫn làm địch mất 1 lá – Sát lúc nào cũng có lời.' },

 gongsunzan: { ph: 'e', st: ['atk'], beats: ['zhugeliang', 'huatuo'], weak: ['jiaxu', 'machao'], tip: 'Máu cao thì đánh xa (ngựa −1), máu thấp thì khó bị với tới (ngựa +1).' },

};

// mẹo chung cho bảng cấm/chọn

export const BP_TIPS = [

 'Cấm trước tướng khắc cứng tướng bạn định chọn, hoặc tướng bạn thấy khó chịu nhất trong bể.',

 'Chọn sau thì được đi trước: người chọn cuối đọc được đối thủ và chọn tướng khắc họ.',

 'Tướng ⚔️ Thiên công + 🌅 Đầu game hợp đánh nhanh; gặp tướng 🛡️ Thiên thủ + 🌙 Cuối game thì phải kết thúc sớm.',

 'Tướng 3 máu sống nhờ Né (Chân Cơ, Đặng Ngải, Trương Giác) rất sợ tướng làm Sát không né được (Mã Siêu, Hoàng Trung, Lữ Bố).',

];
