// 🤖 Bot Rắn và Thang — trò này hoàn toàn dựa vào may mắn nên bot chỉ tung
// xúc xắc công bằng như người chơi: mỗi lượt tung 1 số ngẫu nhiên 1–6.
// KHÔNG gian lận xúc xắc: Máy Dễ và Máy Khó chơi giống hệt nhau, chỉ khác
// tên gọi trên giao diện để đồng bộ với các game khác. Bot không bao giờ
// trả null khi tới lượt nên ván luôn kết thúc được.
export function rollDice() { return 1 + Math.floor(Math.random() * 6); }
export function chooseRoll(s, pid) {
  if (s.phase !== 'playing' || s.turn !== pid) return null;
  return { type: 'roll', value: rollDice() };
}
/* Adapter cho phòng online (simplenet cfg.bot): bot nhận thêm player p (có level).
   Cả 2 mức Dễ/Khó đều tung công bằng như nhau. */
export function botAction(s, pid, p) {
  if (s.phase !== 'playing') return null;
  return chooseRoll(s, pid);
}
export default { chooseRoll, botAction, rollDice };
