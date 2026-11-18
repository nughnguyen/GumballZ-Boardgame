// Bảng lựa chọn + mẫu có sẵn của nhân vật chibi – tách khỏi avatar3d.js (file đó kéo theo three.js) để máy chủ cũng kiểm được cấu hình nhân vật mà không phải nạp three.js.
export const OPTIONS = {
  kind: [['human', 'Người'], ['cat', 'Mèo'], ['dog', 'Cún'], ['panda', 'Gấu trúc'], ['fox', 'Cáo'], ['frog', 'Ếch'], ['rabbit', 'Thỏ'], ['bear', 'Gấu']],
  skin: ['#ffe0c2', '#f6c9a0', '#e0a878', '#b97a4f', '#8a5634'],
  hair: [['short', 'Tóc ngắn'], ['spiky', 'Tóc dựng'], ['long', 'Tóc dài'], ['bun', 'Búi tóc'], ['bob', 'Tóc bob'], ['twintails', 'Hai bím'], ['curly', 'Tóc xoăn'], ['ponytail', 'Đuôi ngựa'], ['odango', 'Búi hai bên'], ['wavy', 'Dài gợn sóng'], ['quiff', 'Tóc vuốt'], ['bald', 'Trọc']],
  hairColor: ['#2b1d16', '#16161c', '#5a3a22', '#8a4b2a', '#c98b4a', '#e07a2e', '#a8432a', '#f0d27a', '#b8bcc8', '#ffffff', '#e85d75', '#ffb3cf', '#8e5bd6', '#5e7bff', '#9cc9ff', '#3fbfae', '#4caf50'], /* thêm màu 18/11/2026 (anh dặn) */
  hat: [['none', 'Không'], ['nonla', 'Nón lá'], ['helmet', 'Nón bảo hiểm'], ['pith', 'Mũ cối bộ đội'], ['cap', 'Nón kết'], ['beanie', 'Mũ len'], ['cowboy', 'Mũ cao bồi'], ['crown', 'Vương miện'], ['chef', 'Mũ đầu bếp'], ['maidband', 'Băng đô hầu gái'], ['catband', 'Bờm tai mèo'], ['flower', 'Kẹp hoa'], ['party', 'Mũ sinh nhật'], ['wizard', 'Mũ phù thuỷ'], ['santa', 'Mũ Noel'], ['halo', 'Hào quang'], ['beret', 'Mũ nồi'], ['gradcap', 'Mũ tốt nghiệp'], ['firehat', 'Mũ cứu hoả'], ['astro', 'Mũ phi hành gia'], ['pirate', 'Mũ cướp biển'], ['antlers', 'Bờm tuần lộc'], ['catphones', 'Tai nghe tai mèo']],
  outfit: [['tee', 'Áo thun'], ['aodai', 'Áo dài'], ['vest', 'Vest'], ['jersey', 'Áo đội bóng'], ['hoodie', 'Áo hoodie'], ['school', 'Đồng phục'], ['pajama', 'Đồ ngủ'], ['raincoat', 'Áo mưa'], ['apron', 'Tạp dề'], ['army', 'Quân phục'], ['maid', 'Đồ hầu gái'], ['ninja', 'Đồ ninja'], ['cape', 'Áo choàng siêu nhân'], ['santa', 'Đồ Noel'], ['sweater', 'Áo len'], ['overalls', 'Quần yếm'], ['doctor', 'Áo blouse bác sĩ'], ['firefighter', 'Đồ lính cứu hoả'], ['astronaut', 'Đồ phi hành gia'], ['karate', 'Võ phục'], ['aoba', 'Áo bà ba'], ['pirate', 'Đồ cướp biển'], ['knight', 'Giáp hiệp sĩ'], ['robe', 'Áo choàng pháp sư'], ['dino', 'Bộ đồ khủng long'], ['mecha', 'Giáp tương lai']],
  acc: [['none', 'Không'], ['glasses', 'Kính râm'], ['roundglasses', 'Kính cận'], ['mask', 'Khẩu trang'], ['bowtie', 'Nơ cổ'], ['scarf', 'Khăn rằn'], ['backpack', 'Ba lô'], ['moneybag', 'Túi tiền'], ['boba', 'Trà sữa'], ['balloon', 'Bong bóng'], ['guitar', 'Đàn guitar'], ['medal', 'Huy chương'], ['wings', 'Đôi cánh'], ['eyepatch', 'Bịt mắt'], ['lantern', 'Lồng đèn trung thu'], ['flag', 'Cờ đỏ sao vàng'], ['sword', 'Kiếm'], ['book', 'Sách'], ['gift', 'Hộp quà'], ['sack', 'Túi quà Noel'], ['phone', 'Điện thoại livestream'], ['visor', 'Kính chiến binh'], ['foxtails', 'Chín đuôi hồ ly']],
  horns: [['none', 'Không'], ['bull', 'Sừng trâu'], ['deer', 'Sừng hươu'], ['devil', 'Sừng quỷ']],
  color: ['#ff5a5f', '#3d8bff', '#2fc76f', '#ffb020', '#a259ff', '#ff7ac8', '#14c4c4', '#8d6e63'],
};
/* màu lông riêng cho từng loài thú (18/11/2026: ếch / thỏ… mang màu da người nhìn kì) – màu da người chọn cho thú thì tự đổi sang màu đầu tiên */
export const FUR = {
  cat: ['#f0a040', '#ffffff', '#8a8a96', '#3a3a44', '#e8c28e'], dog: ['#e8c28e', '#ffffff', '#a0704a', '#3a3a44', '#d9a066'],
  panda: ['#ffffff'], fox: ['#ff8a3d', '#f4f1ec', '#c9622f', '#9aa3b5'], frog: ['#6fd06a', '#9be15d', '#3fbf9a', '#f2b33a', '#7ec8ff', '#ff8fb6'],
  rabbit: ['#ffffff', '#f2d5b8', '#c9c2d6', '#ffd1dc', '#a0704a'], bear: ['#a0704a', '#7a5233', '#f4f1ec', '#3a3a44', '#e8c28e'],
};
export const furOf = cfg => { if (!cfg || cfg.kind === 'human' || !FUR[cfg.kind]) return cfg && cfg.skin; const v = String(cfg.skin || '').toLowerCase(); return !v || OPTIONS.skin.includes(v) ? FUR[cfg.kind][0] : cfg.skin; };
// mẫu dựng sẵn (thay cho emoji cũ)
export const PRESETS = [
  { name: 'Doanh nhân', kind: 'human', skin: '#f6c9a0', hair: 'short', hairColor: '#2b1d16', hat: 'none', outfit: 'vest', acc: 'none', color: '#3d8bff' },
  { name: 'Nữ doanh nhân', kind: 'human', skin: '#ffe0c2', hair: 'long', hairColor: '#2b1d16', hat: 'none', outfit: 'vest', acc: 'glasses', color: '#a259ff' },
  { name: 'Kỹ sư', kind: 'human', skin: '#e0a878', hair: 'short', hairColor: '#5a3a22', hat: 'helmet', outfit: 'tee', acc: 'none', color: '#ffb020' },
  { name: 'Đầu bếp', kind: 'human', skin: '#f6c9a0', hair: 'bun', hairColor: '#5a3a22', hat: 'chef', outfit: 'apron', acc: 'none', color: '#ff5a5f' },
  { name: 'Ca sĩ', kind: 'human', skin: '#ffe0c2', hair: 'spiky', hairColor: '#e85d75', hat: 'none', outfit: 'tee', acc: 'glasses', color: '#ff7ac8' },
  { name: 'Cô Ba Sài Gòn', kind: 'human', skin: '#ffe0c2', hair: 'long', hairColor: '#2b1d16', hat: 'nonla', outfit: 'aodai', acc: 'none', color: '#ff5a5f' },
  { name: 'Anh bộ đội', kind: 'human', skin: '#e0a878', hair: 'short', hairColor: '#2b1d16', hat: 'pith', outfit: 'army', acc: 'backpack', color: '#2fc76f' },
  { name: 'Cao bồi', kind: 'human', skin: '#b97a4f', hair: 'short', hairColor: '#2b1d16', hat: 'cowboy', outfit: 'tee', acc: 'scarf', color: '#8d6e63' },
  { name: 'Mèo', kind: 'cat', skin: '#f0a040', hair: 'bald', hairColor: '#2b1d16', hat: 'none', outfit: 'tee', acc: 'none', color: '#ffb020' },
  { name: 'Cún', kind: 'dog', skin: '#e8c28e', hair: 'bald', hairColor: '#2b1d16', hat: 'cap', outfit: 'jersey', acc: 'none', color: '#3d8bff' },
  { name: 'Gấu trúc', kind: 'panda', skin: '#ffffff', hair: 'bald', hairColor: '#2b1d16', hat: 'none', outfit: 'tee', acc: 'scarf', color: '#2fc76f' },
  { name: 'Cáo', kind: 'fox', skin: '#ff8a3d', hair: 'bald', hairColor: '#2b1d16', hat: 'none', outfit: 'vest', acc: 'glasses', color: '#ff5a5f' },
  { name: 'Ếch', kind: 'frog', skin: '#6fd06a', hair: 'bald', hairColor: '#2b1d16', hat: 'crown', outfit: 'hoodie', acc: 'boba', color: '#ffb020' },
  { name: 'Đại gia', kind: 'human', skin: '#f6c9a0', hair: 'bald', hairColor: '#2b1d16', hat: 'crown', outfit: 'vest', acc: 'moneybag', color: '#ffb020' },
  { name: 'Shipper', kind: 'human', skin: '#e0a878', hair: 'short', hairColor: '#2b1d16', hat: 'helmet', outfit: 'jersey', acc: 'backpack', color: '#2fc76f' },
  { name: 'Cầu thủ', kind: 'human', skin: '#b97a4f', hair: 'spiky', hairColor: '#f0d27a', hat: 'none', outfit: 'jersey', acc: 'none', color: '#ff5a5f' },
  { name: 'Hầu gái', kind: 'human', skin: '#ffe0c2', hair: 'long', hairColor: '#f0d27a', hat: 'maidband', outfit: 'maid', acc: 'none', color: '#ff7ac8' },
  { name: 'Học sinh', kind: 'human', skin: '#ffe0c2', hair: 'twintails', hairColor: '#2b1d16', hat: 'none', outfit: 'school', acc: 'none', color: '#3d8bff' },
  { name: 'Siêu nhân', kind: 'human', skin: '#f6c9a0', hair: 'short', hairColor: '#2b1d16', hat: 'none', outfit: 'cape', acc: 'none', color: '#3d8bff' },
  { name: 'Phù thuỷ', kind: 'human', skin: '#ffe0c2', hair: 'long', hairColor: '#ffffff', hat: 'wizard', outfit: 'hoodie', acc: 'roundglasses', color: '#a259ff' },
  { name: 'Ông già Noel', kind: 'human', skin: '#f6c9a0', hair: 'curly', hairColor: '#ffffff', hat: 'santa', outfit: 'santa', acc: 'none', color: '#ff5a5f' },
  { name: 'Ninja', kind: 'human', skin: '#e0a878', hair: 'short', hairColor: '#2b1d16', hat: 'none', outfit: 'ninja', acc: 'mask', color: '#8d6e63' },
  { name: 'Thỏ', kind: 'rabbit', skin: '#ffffff', hair: 'bald', hairColor: '#2b1d16', hat: 'flower', outfit: 'pajama', acc: 'boba', color: '#ff7ac8' },
  { name: 'Gấu', kind: 'bear', skin: '#a0704a', hair: 'bald', hairColor: '#2b1d16', hat: 'beanie', outfit: 'hoodie', acc: 'none', color: '#ffb020' },
  { name: 'Rocker', kind: 'human', skin: '#f6c9a0', hair: 'spiky', hairColor: '#5e7bff', hat: 'none', outfit: 'vest', acc: 'guitar', color: '#22222b' },
  /* nhân vật tự nghĩ, lấy cảm hứng từ kiểu nhân vật game (anh duyệt 17/11/2026 – không giống nhân vật có thật nào) */
  { name: 'Hồ ly chín đuôi', kind: 'fox', skin: '#f4f1ec', hair: 'bald', hairColor: '#2b1d16', hat: 'flower', outfit: 'aodai', acc: 'foxtails', color: '#ff7ac8' },
  { name: 'Kiếm sĩ', kind: 'human', skin: '#f6c9a0', hair: 'spiky', hairColor: '#ffffff', hat: 'none', outfit: 'knight', acc: 'sword', color: '#3d8bff' },
  { name: 'Chiến binh tương lai', kind: 'human', skin: '#ffe0c2', hair: 'long', hairColor: '#ffffff', hat: 'none', outfit: 'mecha', acc: 'visor', color: '#ff7ac8' },
  { name: 'Streamer', kind: 'human', skin: '#ffe0c2', hair: 'twintails', hairColor: '#e85d75', hat: 'catphones', outfit: 'hoodie', acc: 'phone', color: '#ff7ac8' },
  { name: 'Bé Noel', kind: 'human', skin: '#ffe0c2', hair: 'bun', hairColor: '#f0d27a', hat: 'antlers', outfit: 'santa', acc: 'sack', color: '#ff5a5f' },
  { name: 'Bị cắm sừng', kind: 'human', skin: '#f6c9a0', hair: 'short', hairColor: '#2b1d16', hat: 'none', outfit: 'tee', acc: 'none', horns: 'deer', color: '#8d6e63' },
];

// chỉ nhận cấu hình nhân vật hợp lệ (không tin dữ liệu từ máy khác) – dùng chung web, Cờ Tỷ Phú, máy chủ
export function cleanChar(a) {
  const base = { ...PRESETS[0] }, out = {}, hex = /^#[0-9a-f]{6}$/i;
  for (const k of Object.keys(OPTIONS)) {
    const list = OPTIONS[k], vals = list.map(o => Array.isArray(o) ? o[0] : o), colorField = !Array.isArray(list[0]);
    const v = a && a[k];
    out[k] = (colorField ? hex.test(v || '') : vals.includes(v)) ? v : (base[k] ?? vals[0]);
  }
  return out;
}
/* đồ chỉ chủ web được mặc (anh dặn 17/11/2026) – máy (bot) và mẫu ngẫu nhiên không lấy */
export const ADMIN_ONLY = { outfit: ['maid'], hat: ['maidband', 'antlers'], acc: ['gift', 'sack'] }; /* + bộ Giáng sinh riêng của anh (17/11/2026) */
export const adminOnly = cfg => !!cfg && Object.keys(ADMIN_ONLY).some(k => ADMIN_ONLY[k].includes(cfg[k]));
/* nhóm hiển thị trong bảng đổi đồ (anh dặn 17/11/2026: chia category) – món không có trong nhóm nào thì vào nhóm cuối */
export const GROUPS = {
  outfit: [['👕 Thường ngày', ['tee', 'hoodie', 'sweater', 'pajama', 'raincoat', 'overalls']], ['💼 Nghề nghiệp', ['vest', 'apron', 'doctor', 'firefighter', 'astronaut', 'army']], ['🎓 Học đường & thể thao', ['school', 'jersey', 'karate']], ['🇻🇳 Truyền thống', ['aodai', 'aoba']], ['🎭 Hoá trang', ['ninja', 'cape', 'pirate', 'knight', 'robe', 'mecha', 'dino', 'maid']], ['🎄 Giáng sinh', ['santa']]],
  hat: [['🧢 Hằng ngày', ['none', 'cap', 'beanie', 'beret', 'flower', 'catband', 'catphones', 'maidband']], ['🎄 Giáng sinh', ['santa', 'antlers']], ['💼 Nghề nghiệp', ['helmet', 'pith', 'chef', 'firehat', 'astro', 'gradcap']], ['🇻🇳 Truyền thống', ['nonla']], ['🎭 Hoá trang', ['cowboy', 'pirate', 'wizard', 'party', 'crown', 'halo']]],
  acc: [['👓 Trên mặt', ['none', 'glasses', 'roundglasses', 'visor', 'mask', 'eyepatch']], ['✋ Cầm tay', ['boba', 'phone', 'balloon', 'guitar', 'lantern', 'flag', 'sword', 'book', 'moneybag']], ['🎒 Trên người', ['bowtie', 'scarf', 'backpack', 'medal', 'wings', 'foxtails']], ['🎄 Giáng sinh', ['gift', 'sack']]],
};
