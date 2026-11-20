// 🤖 Bot Ghép Hình — chỉ đọc BẢNG CỦA MÌNH + trạng thái công khai
// (không đọc bảng đối thủ, không đọc RNG của engine).
// Khó: "nhìn hình mẫu" — mỗi nước đổi 1 mảnh sai về đúng vị trí của
// nó (tìm vị trí đang giữ mảnh cần về đó rồi đổi), nên mỗi nước đặt
// đúng ít nhất 1 mảnh (2 mảnh nếu gặp chu trình 2). Đi nhanh
// (300–500ms/nước).
// Dễ: đổi chỗ ngẫu nhiên 2 mảnh đang sai vị trí, đi chậm
// (900–1300ms/nước) — thỉnh thoảng vô tình đặt đúng 1 mảnh nhưng
// thường phải đi rất nhiều nước mới xong.

export const BOT_NAMES = ['Kẹo', 'Xôi', 'Gấu Bông', 'Đậu', 'Nấm', 'Sữa', 'Mochi', 'Pudding'];

/* Các vị trí đang sai: tiles[pos] !== pos. */
function wrongPositions(tiles) {
  const out = [];
  for (let i = 0; i < tiles.length; i++) if (tiles[i] !== i) out.push(i);
  return out;
}

export function botAction(s, pid) {
  const prog = s.prog && s.prog[pid];
  if (!prog || prog.status !== 'playing' || !prog.tiles) return null;
  const p = s.players.find(x => x.id === pid);
  const hard = p && p.level === 'hard';
  const wrong = wrongPositions(prog.tiles);
  if (!wrong.length) return null;
  if (hard) {
    /* Đổi 1 mảnh sai về đúng vị trí của nó: mảnh cần về vị trí a
       đang nằm ở vị trí b nào đó (tiles[b] === a). */
    const a = wrong[Math.floor(Math.random() * wrong.length)];
    const b = prog.tiles.indexOf(a);
    if (b < 0 || b === a) return null;
    return { type: 'swap', a, b };
  }
  /* Dễ: đổi ngẫu nhiên 2 mảnh sai vị trí. */
  if (wrong.length < 2) {
    /* Chỉ còn 1 mảnh sai (không xảy ra ở hoán vị hợp lệ trừ khi ván
       sắp xong — vẫn xử lý cho an toàn: đổi mảnh sai với 1 mảnh bất kỳ). */
    const a = wrong[0];
    const others = prog.tiles.map((_, i) => i).filter(i => i !== a);
    const b = others[Math.floor(Math.random() * others.length)];
    return { type: 'swap', a, b };
  }
  const i = Math.floor(Math.random() * wrong.length);
  let j = Math.floor(Math.random() * wrong.length);
  while (j === i) j = Math.floor(Math.random() * wrong.length);
  return { type: 'swap', a: wrong[i], b: wrong[j] };
}
export function botDelay(s, pid) {
  const p = s.players.find(x => x.id === pid);
  if (p && p.level === 'hard') return 300 + Math.random() * 200;
  return 900 + Math.random() * 400;
}
export default botAction;
