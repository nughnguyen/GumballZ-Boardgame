// 🃏 Xì Tố — vẽ bài (dùng bộ bài vẽ chung shared/ui/deck/deck.js).
import { faceSVG, backSVG } from '../../shared/ui/deck/deck.js?v=5';
import { RANK_SHORT } from './engine.js';

export function cardHTML(c) {
  if (!c) return '<span class="pc mini back" aria-hidden="true">' + backSVG() + '</span>';
  return '<span class="pc ' + (c.s === 'D' || c.s === 'H' ? 'red' : 'black') + '">' + faceSVG(c.r, c.s) + '</span>';
}
export function cardBackHTML() { return '<span class="pc mini back" aria-hidden="true">' + backSVG() + '</span>'; }
/* lật bài chung: ô nào chưa lật thì hiện lưng bài (mờ). */
export function communityHTML(community) {
  let out = '';
  for (let i = 0; i < 5; i++) {
    const c = community[i];
    out += c ? cardHTML(c) : '<span class="pc slot" aria-hidden="true"></span>';
  }
  return out;
}
/* lá tẩy mini của người khác (úp): 2 lưng bài xếp chéo. */
export function oppCardsHTML(n = 2) {
  let out = '';
  for (let i = 0; i < n; i++) out += cardBackHTML();
  return out;
}
export { RANK_SHORT };
