// 📖 Hướng dẫn Phi Tiêu — modal luật chơi (giống các game khác).
export const GUIDE_HTML = `
<h2>🎯 Phi Tiêu</h2>
<p><b>Mục tiêu:</b> ném phi tiêu vào bàn — trúng vòng treble ×3, vòng double ×2, bull trong 50 điểm, bull ngoài 25 điểm!</p>
<h3>🎮 Cách chơi</h3>
<ul>
<li><b>Bàn có 20 ô</b> theo thứ tự 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5 — ô 20 ở trên cùng. Chạm vào 1 điểm trên bàn để ngắm rồi ném, phi tiêu sẽ hơi lệch theo độ khéo tay.</li>
<li><b>Treble (vòng đỏ/xanh lá giữa):</b> ×3 điểm. <b>Double (vòng ngoài cùng):</b> ×2 điểm. <b>Bull trong:</b> 50 điểm. <b>Bull ngoài:</b> 25 điểm. Ngoài bàn: 0 điểm.</li>
<li><b>Lượt 180 điểm</b> là 3 phi tiêu đều vào treble 20 (60 + 60 + 60) — lượt cao nhất có thể!</li>
</ul>
<h3>🏆 Đấu 501</h3>
<ul>
<li>2 người xuất phát <b>501 điểm</b>, luân phiên mỗi lượt 3 phi tiêu, trừ dần điểm ném được. Ai về đúng <b>0 trước thì thắng</b>.</li>
<li><b>Phải về đích bằng double:</b> phi tiêu cuối phải vào vòng double (hoặc bull trong tính là double). Về 0 mà không phải double thì không tính!</li>
<li><b>BUST:</b> vượt quá 0, còn đúng 1 điểm, hoặc về 0 không phải double → lượt đó 0 điểm, điểm giữ nguyên, mất luôn các phi tiêu còn lại của lượt.</li>
<li>Đấu quá 40 lượt/người vẫn chưa xong thì hoà.</li>
</ul>
<h3>🧍 Chơi đơn (luyện tập)</h3>
<ul>
<li>Bạn ném <b>10 lượt × 3 phi tiêu = 30 phi tiêu</b>, tính tổng điểm.</li>
<li>Tổng <b>≥ 880 điểm thì thắng</b>. Ít hơn thì thua — tập lại nhé!</li>
</ul>
<h3>🤖 Máy chơi thế nào</h3>
<ul>
<li><b>Máy Khó:</b> ghi điểm thì ngắm treble 20; vào tầm checkout (≤ 170 điểm) thì tính nước về đích bằng double. Đi nhanh (400–600ms/lượt).</li>
<li><b>Máy Dễ:</b> thỉnh thoảng ném bừa, sai số lớn. Đi chậm (700–900ms/lượt).</li>
</ul>
<h3>🏳️ Xin thua</h3>
<ul>
<li>Xin thua là thua luôn ván đó.</li>
</ul>
<div class="btns"><button class="btn" id="m-close">Đóng</button></div>
`;
export default GUIDE_HTML;
