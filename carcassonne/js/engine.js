// 🏰 Carcassonne — engine thuần logic (seeded LCG, KHÔNG dùng Math.random).
//
// LUẬT CHUẨN ÁP DỤNG (bản 3 — Z-Man / Hans im Glück hiện hành; đã tra cứu
// trước khi code — xem test/rules.mjs §0 để biết nguồn từng luật):
// - 2–5 người, mỗi người 7 meeple (người thứ 8 làm mốc điểm, không mô hình).
// - Bộ 72 lá (kể cả lá khởi đầu): 24 loại theo bảng phân bố chuẩn của
//   Dan Becker / Northwestern (dùng trong khóa CMSC 22001) — xem
//   TILE_TYPES bên dưới; tổng số lá từng loại cộng lại = 72.
// - Lá khởi đầu CRFR (thành phố hướng Bắc, đường thẳng Đông–Tây) đặt ở
//   (0,0). 71 lá còn lại xào úp; mỗi lượt bốc 1 lá.
// - Đặt lá: ô trống kề ít nhất 1 lá đã đặt; mọi cạnh chạm nhau phải khớp
//   (thành phố–thành phố, đường–đường, ruộng–ruộng). Tu viện không nối
//   với gì nên chỉ cần khớp cạnh.
// - Sau khi đặt lá, được đặt TỐI ĐA 1 meeple lên 1 nét (feature) của lá
//   vừa đặt (đường / thành phố / ruộng / tu viện) — chỉ khi nét đó chưa
//   có meeple nào (của bất kỳ ai) và mình còn meeple trong kho.
// - Nét hoàn thành thì tính điểm ngay, meeple về kho: đường 1 điểm/ô
//   (hoàn thành khi 2 đầu đều kín — chạm thành phố / tu viện / ngã ba /
//   khép vòng); thành phố 2 điểm/ô + 2 điểm/khiên (hoàn thành khi tường
//   khép kín, không còn cạnh hở); tu viện 9 điểm khi 8 ô xung quanh đều
//   có lá. Nhiều người cùng nhiều meeple nhất trong 1 nét thì cùng được
//   trọn điểm (hòa chia đều, không chia nhỏ).
// - Ruộng không bao giờ tính điểm trong ván; meeple ruộng ở lại tới cuối
//   ván. Cuối ván: đường dở 1 điểm/ô; thành phố dở 1 điểm/ô + 1/khiên;
//   tu viện dở 1 điểm/lá (lá tu viện + mỗi lá kề có mặt); ruộng 3 điểm
//   cho mỗi thành phố ĐÃ HOÀN THÀNH mà ruộng đó chạm tới (mỗi thành phố
//   tính 1 lần cho 1 ruộng, nhưng 1 thành phố có thể được nhiều ruộng
//   cùng tính) — người có nhiều nông dân nhất trong ruộng được điểm,
//   hòa thì cùng được trọn điểm.
// - Hết chồng lá thì ván kết thúc, tính điểm cuối ván. Lá bốc lên mà
//   không đặt được ở đâu thì bị loại khỏi ván, bốc lá khác (theo luật
//   "tile is discarded and a new tile is chosen" — Dan Becker / CMSC
//   22001; Wikipedia ghi người chơi được chọn loại lá hoặc trả lại
//   chồng — bản này chọn loại lá rồi bốc tiếp cho gọn).
// - Xin thua kết thúc TRẬN ngay: tính điểm cuối ván như bình thường rồi
//   người có điểm cao nhất TRONG SỐ NGƯỜI KHÔNG XIN THUA thắng.
//
// MÔ HÌNH NÉT (feature) — quan trọng nhất của engine:
// - Mỗi lá có 4 cạnh (Bắc/Đông/Nam/Tây, quay theo chiều kim đồng hồ).
//   Mỗi cạnh là thành phố (C), đường (R) hoặc ruộng (F).
// - Thành phố / đường: mỗi "đoạn" (segment) là 1 tập cạnh trên lá;
//   2 đoạn ở 2 lá kề nhau nối nhau khi cùng chạm 1 cạnh chung.
// - Ruộng: mỗi "đoạn ruộng" là 1 tập NỬA-CẠNH. Mỗi cạnh có 2 nửa (nửa
//   0 = phía góc kề trước theo chiều kim đồng hồ, nửa 1 = phía góc kề
//   sau). Cạnh ruộng: cả 2 nửa đều là ruộng. Cạnh đường: mỗi nửa thuộc
//   về 1 phía của đường (ruộng 2 bên đường không nối nhau qua đường).
//   Cạnh thành phố: không nửa nào là ruộng. 2 đoạn ruộng ở 2 lá kề nhau
//   nối nhau khi cùng chạm 1 nửa của cạnh chung (nửa 0 của lá này gặp
//   nửa 1 của lá kia). Không có mô hình nửa-cạnh thì 2 ruộng 2 bên 1
//   con đường sẽ bị gộp sai thành 1 ruộng.
// - Mỗi đoạn ruộng còn ghi lại nó chạm những đoạn thành phố nào trên
//   cùng lá (để cuối ván tính ruộng chạm thành phố hoàn thành).
// - Ngã ba / ngã tư (3–4 đường gặp nhau giữa lá): mỗi đường là 1 đoạn
//   riêng, kết thúc ở ngã ba (ngã ba là điểm cuối của đường).
// - Đường 1 cạnh kết thúc trong lá (chạm thành phố / tu viện / ngã ba):
//   đoạn đó chỉ có 1 cạnh, đầu còn lại coi như kín.
//
// GIẢ ĐỊNH ĐÃ GHI CHÚ (ảnh hưởng nhỏ, không có trong luật chữ):
// - Khiên (pennant) trên lá FCFCS (2 thành phố riêng): khiên nằm ở thành
//   phố hướng Đông (đoạn thứ nhất). Chỉ ảnh hưởng khi đúng 1 trong 2
//   thành phố đó hoàn thành và được tính điểm (chênh 2 điểm).
// - Lá tu viện có đường (FFRFL): ruộng trên lá là 1 đoạn duy nhất quấn
//   quanh phía Bắc tu viện (đường + tu viện chỉ chắn phía Nam, ruộng 2
//   bên đường nối nhau ở phía Bắc tu viện).

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;
export const MEEPLES = 7;          // meeple mỗi người (được đặt trên bàn)
export const START_TILE = 'CRFR';  // lá khởi đầu
export const TOTAL_TILES = 72;

/* nửa-cạnh: N0=0 (góc Tây-Bắc), N1=1 (Đông-Bắc), E0=2 (Đông-Bắc),
   E1=3 (Đông-Nam), S0=4 (Đông-Nam), S1=5 (Tây-Nam), W0=6 (Tây-Nam),
   W1=7 (Tây-Bắc). Nửa = cạnh*2 + phía (0 = góc kề trước, 1 = góc kề sau
   theo chiều kim đồng hồ). */
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N,E,S,W

/* 24 loại lá chuẩn (bảng Dan Becker). edges: [Bắc,Đông,Nam,Tây].
   cities: [{edges:[...], shield}]; roads: [{edges:[...]}];
   fields: [{halves:[...], cities:[chỉ số đoạn thành phố kề]}];
   cloister: true/false. n = số lá loại này trong bộ 72. */
export const TILE_TYPES = [
  { id: 'CCCCS', n: 1, edges: ['C', 'C', 'C', 'C'], cities: [{ edges: [0, 1, 2, 3], shield: true }], roads: [], fields: [], cloister: false },
  { id: 'CCFC', n: 3, edges: ['C', 'C', 'F', 'C'], cities: [{ edges: [0, 1, 3], shield: false }], roads: [], fields: [{ halves: [4, 5], cities: [0] }], cloister: false },
  { id: 'CCFCS', n: 1, edges: ['C', 'C', 'F', 'C'], cities: [{ edges: [0, 1, 3], shield: true }], roads: [], fields: [{ halves: [4, 5], cities: [0] }], cloister: false },
  { id: 'CCFF', n: 2, edges: ['C', 'C', 'F', 'F'], cities: [{ edges: [0, 1], shield: false }], roads: [], fields: [{ halves: [4, 5, 6, 7], cities: [0] }], cloister: false },
  { id: 'CCRC', n: 1, edges: ['C', 'C', 'R', 'C'], cities: [{ edges: [0, 1, 3], shield: false }], roads: [{ edges: [2] }], fields: [{ halves: [4], cities: [0] }, { halves: [5], cities: [0] }], cloister: false },
  { id: 'CCRCS', n: 2, edges: ['C', 'C', 'R', 'C'], cities: [{ edges: [0, 1, 3], shield: true }], roads: [{ edges: [2] }], fields: [{ halves: [4], cities: [0] }, { halves: [5], cities: [0] }], cloister: false },
  { id: 'CFCF', n: 3, edges: ['C', 'F', 'C', 'F'], cities: [{ edges: [0], shield: false }, { edges: [2], shield: false }], roads: [], fields: [{ halves: [2, 3, 6, 7], cities: [0, 1] }], cloister: false },
  { id: 'CFFC', n: 3, edges: ['C', 'F', 'F', 'C'], cities: [{ edges: [0, 3], shield: false }], roads: [], fields: [{ halves: [2, 3, 4, 5], cities: [0] }], cloister: false },
  { id: 'CFFCS', n: 2, edges: ['C', 'F', 'F', 'C'], cities: [{ edges: [0, 3], shield: true }], roads: [], fields: [{ halves: [2, 3, 4, 5], cities: [0] }], cloister: false },
  { id: 'CFFF', n: 5, edges: ['C', 'F', 'F', 'F'], cities: [{ edges: [0], shield: false }], roads: [], fields: [{ halves: [2, 3, 4, 5, 6, 7], cities: [0] }], cloister: false },
  { id: 'CFRR', n: 3, edges: ['C', 'F', 'R', 'R'], cities: [{ edges: [0], shield: false }], roads: [{ edges: [2, 3] }], fields: [{ halves: [2, 3, 4, 7], cities: [0] }, { halves: [5, 6], cities: [] }], cloister: false },
  { id: 'CRFR', n: 4, edges: ['C', 'R', 'F', 'R'], cities: [{ edges: [0], shield: false }], roads: [{ edges: [1, 3] }], fields: [{ halves: [2, 7], cities: [0] }, { halves: [4, 5, 3, 6], cities: [] }], cloister: false },
  { id: 'CRRC', n: 3, edges: ['C', 'R', 'R', 'C'], cities: [{ edges: [0, 3], shield: false }], roads: [{ edges: [1, 2] }], fields: [{ halves: [2, 5], cities: [0] }, { halves: [3, 4], cities: [] }], cloister: false },
  { id: 'CRRCS', n: 2, edges: ['C', 'R', 'R', 'C'], cities: [{ edges: [0, 3], shield: true }], roads: [{ edges: [1, 2] }], fields: [{ halves: [2, 5], cities: [0] }, { halves: [3, 4], cities: [] }], cloister: false },
  { id: 'CRRF', n: 3, edges: ['C', 'R', 'R', 'F'], cities: [{ edges: [0], shield: false }], roads: [{ edges: [1, 2] }], fields: [{ halves: [6, 7, 2, 5], cities: [0] }, { halves: [3, 4], cities: [] }], cloister: false },
  { id: 'CRRR', n: 3, edges: ['C', 'R', 'R', 'R'], cities: [{ edges: [0], shield: false }], roads: [{ edges: [1] }, { edges: [2] }, { edges: [3] }], fields: [{ halves: [2], cities: [0] }, { halves: [3, 4], cities: [] }, { halves: [5, 6], cities: [] }, { halves: [7], cities: [0] }], cloister: false },
  { id: 'FCFC', n: 1, edges: ['F', 'C', 'F', 'C'], cities: [{ edges: [1], shield: false }, { edges: [3], shield: false }], roads: [], fields: [{ halves: [0, 1, 4, 5], cities: [0, 1] }], cloister: false },
  { id: 'FCFCS', n: 2, edges: ['F', 'C', 'F', 'C'], cities: [{ edges: [1], shield: true }, { edges: [3], shield: false }], roads: [], fields: [{ halves: [0, 1, 4, 5], cities: [0, 1] }], cloister: false },
  { id: 'FFFFL', n: 4, edges: ['F', 'F', 'F', 'F'], cities: [], roads: [], fields: [{ halves: [0, 1, 2, 3, 4, 5, 6, 7], cities: [] }], cloister: true },
  { id: 'FFRFL', n: 2, edges: ['F', 'F', 'R', 'F'], cities: [], roads: [{ edges: [2] }], fields: [{ halves: [0, 1, 2, 3, 4, 5, 6, 7], cities: [] }], cloister: true },
  { id: 'FFRR', n: 9, edges: ['F', 'F', 'R', 'R'], cities: [], roads: [{ edges: [2, 3] }], fields: [{ halves: [0, 1, 2, 3, 4, 7], cities: [] }, { halves: [5, 6], cities: [] }], cloister: false },
  { id: 'FRRR', n: 4, edges: ['F', 'R', 'R', 'R'], cities: [], roads: [{ edges: [1] }, { edges: [2] }, { edges: [3] }], fields: [{ halves: [0, 1, 2, 7], cities: [] }, { halves: [3, 4], cities: [] }, { halves: [5, 6], cities: [] }], cloister: false },
  { id: 'RFRF', n: 8, edges: ['R', 'F', 'R', 'F'], cities: [], roads: [{ edges: [0, 2] }], fields: [{ halves: [2, 3, 1, 4], cities: [] }, { halves: [6, 7, 0, 5], cities: [] }], cloister: false },
  { id: 'RRRR', n: 1, edges: ['R', 'R', 'R', 'R'], cities: [], roads: [{ edges: [0] }, { edges: [1] }, { edges: [2] }, { edges: [3] }], fields: [{ halves: [1, 2], cities: [] }, { halves: [3, 4], cities: [] }, { halves: [5, 6], cities: [] }, { halves: [7, 0], cities: [] }], cloister: false },
];
export const TILE_BY_ID = {};
for (const t of TILE_TYPES) if (t.n > 0) TILE_BY_ID[t.id] = t;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- xoay lá ---------- */
/* cạnh chỉ theo hướng d (0=Bắc..3=Tây) sau khi xoay rot (90° theo chiều
   kim đồng hồ mỗi nấc) là cạnh gốc (d - rot). */
export const rotEdges = (type, rot) => {
  const e = TILE_BY_ID[type].edges;
  return [0, 1, 2, 3].map(d => e[(d - rot + 4) % 4]);
};
const rotSegEdges = (edges, rot) => edges.map(e => (e + rot) % 4);
const rotHalves = (halves, rot) => halves.map(h => (((Math.floor(h / 2) + rot) % 4) * 2) + (h % 2));

/* ---------- chồng lá ---------- */
export function buildDeck() {
  const deck = [];
  for (const t of TILE_TYPES) {
    if (t.n <= 0) continue;
    if (t.id === START_TILE) {
      for (let k = 1; k < t.n; k++) deck.push(t.id); // lá khởi đầu (1 lá) đã đặt sẵn, còn lại vào chồng
    } else {
      for (let k = 0; k < t.n; k++) deck.push(t.id);
    }
  }
  return deck;
}

/* ---------- trạng thái ván ---------- */
function newPlayer(p, i) {
  return {
    id: p.id, name: p.name || ('Người ' + (i + 1)),
    isBot: !!p.isBot, local: !!p.local, level: p.level || null,
    score: 0, supply: MEEPLES,
  };
}
const keyOf = (x, y) => x + ',' + y;
const player = (s, pid) => s.players.find(p => p.id === pid);

function log(s, text, cls) {
  s.log.push({ text, kind: cls || '' });
  if (s.log.length > 120) s.log.splice(0, s.log.length - 120);
}

export function createGame(players, opts = {}) {
  if (!players || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('Carcassonne cần ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' người chơi');
  }
  const seed = opts.seed == null ? (Date.now() % 2147483647) : opts.seed;
  const rnd = mulberry32(seed);
  const s = {
    gid: 'ca-' + seed + '-' + Math.floor(rnd() * 1e9).toString(36),
    seq: 0, phase: 'playing', turnIdx: 0, turnCount: 0,
    step: 'place',             // 'place' | 'meeple'
    hand: null,                // lá vừa bốc của người tới lượt (riêng tư)
    stack: [], discarded: [],
    board: { '0,0': { type: START_TILE, rot: 0, meeples: [] } },
    lastPlaced: '0,0',
    players: players.map(newPlayer),
    lastScore: [], final: null, completed: [], /* mọi nét đã hoàn thành + điểm (để tính thành tựu ca-city/ca-monk) */
    winner: null, winners: [], losers: [], endReason: null, endCause: null,
    log: [], startedAt: Date.now(), endedAt: 0, _seed: seed,
  };
  const deck = buildDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  s.stack = deck;
  log(s, '🏰 Ván bắt đầu — lá khởi đầu đã đặt ở giữa bàn, còn ' + s.stack.length + ' lá trong chồng.', 'info');
  if (!drawForTurn(s)) endGame(s, 'tiles');
  return s;
}

/* ---------- tính nét trên bàn (union-find) ---------- */
/* Trả về { features, byNode }: features là mảng các nét
   {id, kind, tiles:Set, segments:[node], meeples:[{pid,kind,seg,key}],
    shields, complete, neighbors (tu viện), citySegs (ruộng: node id các
    đoạn thành phố kề)}; byNode: node id -> feature. */
export function computeFeatures(board) {
  const parent = new Map();
  const find = a => {
    let r = a;
    while (parent.get(r) !== r) r = parent.get(r);
    while (parent.get(a) !== r) { const n = parent.get(a); parent.set(a, r); a = n; }
    return r;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const nodes = [];
  const nodeById = new Map();
  for (const [key, t] of Object.entries(board)) {
    const [x, y] = key.split(',').map(Number);
    const def = TILE_BY_ID[t.type];
    const add = (kind, seg, extra) => {
      const id = key + ':' + kind + ':' + seg;
      const n = { id, key, x, y, kind, seg, ...(extra || {}) };
      nodes.push(n); nodeById.set(id, n); parent.set(id, id);
      return n;
    };
    def.cities.forEach((c, i) => add('city', i, { edges: c.edges, shield: c.shield }));
    def.roads.forEach((r, i) => add('road', i, { edges: r.edges }));
    def.fields.forEach((f, i) => add('field', i, { halves: f.halves, cities: f.cities }));
    if (def.cloister) add('cloister', 0, {});
  }
  /* đoạn thành phố/đường chứa hướng d của 1 lá (d = hướng thế giới) */
  const segContainingDir = (tile, kind, dir) => {
    const def = TILE_BY_ID[tile.type];
    const list = kind === 'city' ? def.cities : def.roads;
    const canon = (dir - tile.rot + 4) % 4;
    for (let i = 0; i < list.length; i++) if (list[i].edges.includes(canon)) return i;
    return -1;
  };
  /* đoạn ruộng chứa nửa (hướng d, phía side) của 1 lá */
  const fieldSegContainingDir = (tile, dir, side) => {
    const def = TILE_BY_ID[tile.type];
    const canonHalf = ((dir - tile.rot + 4) % 4) * 2 + side;
    for (let i = 0; i < def.fields.length; i++) if (def.fields[i].halves.includes(canonHalf)) return i;
    return -1;
  };
  for (const [key, t] of Object.entries(board)) {
    const [x, y] = key.split(',').map(Number);
    for (let d = 0; d < 4; d++) {
      const nk = keyOf(x + DIRS[d][0], y + DIRS[d][1]);
      const nt = board[nk];
      if (!nt) continue;
      const od = (d + 2) % 4;
      for (const kind of ['city', 'road']) {
        const a = segContainingDir(t, kind, d);
        const b = segContainingDir(nt, kind, od);
        if (a >= 0 && b >= 0) union(key + ':' + kind + ':' + a, nk + ':' + kind + ':' + b);
      }
      for (let side = 0; side < 2; side++) {
        const a = fieldSegContainingDir(t, d, side);
        const b = fieldSegContainingDir(nt, od, 1 - side);
        if (a >= 0 && b >= 0) union(key + ':field:' + a, nk + ':field:' + b);
      }
    }
  }
  const groups = new Map();
  for (const n of nodes) {
    const r = find(n.id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n);
  }
  const features = [];
  const byNode = new Map();
  let fi = 0;
  for (const segs of groups.values()) {
    const kind = segs[0].kind;
    const f = {
      id: fi++, kind, segments: segs,
      tiles: new Set(segs.map(n => n.key)),
      meeples: [], shields: 0, complete: false, neighbors: 0, citySegs: [],
    };
    for (const n of segs) {
      byNode.set(n.id, f);
      const t = board[n.key];
      for (const m of (t.meeples || [])) {
        if (m.kind === kind && m.seg === n.seg) f.meeples.push({ pid: m.pid, kind: m.kind, seg: m.seg, key: n.key });
      }
      if (kind === 'city' && n.shield) f.shields++;
      if (kind === 'field') {
        for (const ci of (n.cities || [])) f.citySegs.push(n.key + ':city:' + ci);
      }
    }
    if (kind === 'city' || kind === 'road') {
      f.complete = segs.every(n => {
        const t = board[n.key];
        return n.edges.every(e => {
          const d = (e + t.rot) % 4;
          return !!board[keyOf(n.x + DIRS[d][0], n.y + DIRS[d][1])];
        });
      });
    } else if (kind === 'cloister') {
      const n = segs[0];
      let cnt = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (board[keyOf(n.x + dx, n.y + dy)]) cnt++;
      }
      f.neighbors = cnt;
      f.complete = cnt === 8;
    }
    features.push(f);
  }
  return { features, byNode };
}

/* điểm của 1 nét (complete = true: tính đủ; false: tính điểm cuối ván) */
export function featPoints(feat, complete) {
  if (feat.kind === 'city') return complete ? feat.tiles.size * 2 + feat.shields * 2 : feat.tiles.size + feat.shields;
  if (feat.kind === 'road') return feat.tiles.size;
  if (feat.kind === 'cloister') return complete ? 9 : 1 + feat.neighbors;
  return 0;
}
/* những người có nhiều meeple nhất trong nét (hòa thì cùng được điểm) */
export function majorityOwners(feat) {
  const counts = {};
  for (const m of feat.meeples) counts[m.pid] = (counts[m.pid] || 0) + 1;
  let max = 0;
  for (const k in counts) if (counts[k] > max) max = counts[k];
  if (max === 0) return [];
  return Object.keys(counts).filter(k => counts[k] === max);
}
function returnMeeples(s, feat) {
  for (const m of feat.meeples) {
    const t = s.board[m.key];
    if (!t) continue;
    const idx = (t.meeples || []).findIndex(mm => mm.pid === m.pid && mm.kind === m.kind && mm.seg === m.seg);
    if (idx !== -1) t.meeples.splice(idx, 1);
    const p = player(s, m.pid);
    if (p) p.supply++;
  }
}
const KIND_NAME = { city: 'thành phố', road: 'con đường', field: 'ruộng', monastery: 'tu viện', cloister: 'tu viện' };

/* tính điểm các nét vừa hoàn thành nhờ lá mới đặt (chỉ những nét chứa
   1 đoạn của lá đó, cộng tu viện ở lá đó + 8 lá kề) */
function scoreCompleted(s) {
  const placedKey = s.lastPlaced;
  if (!placedKey || !s.board[placedKey]) return [];
  const { features, byNode } = computeFeatures(s.board);
  const events = [];
  const scored = new Set();
  const tryScore = feat => {
    if (!feat || !feat.complete || scored.has(feat.id)) return;
    scored.add(feat.id);
    const pts = featPoints(feat, true);
    const owners = majorityOwners(feat);
    if (owners.length && pts > 0) {
      for (const pid of owners) player(s, pid).score += pts;
      const names = owners.map(pid => player(s, pid).name).join(' + ');
      const extra = feat.kind === 'city'
        ? ` (${feat.tiles.size} ô${feat.shields ? ' + ' + feat.shields + ' khiên' : ''})`
        : feat.kind === 'road' ? ` (${feat.tiles.size} ô)` : '';
      log(s, `⭐ ${names} hoàn thành ${KIND_NAME[feat.kind]}${extra} +${pts} điểm!`, 'win');
      events.push({ kind: feat.kind, points: pts, owners: owners.slice(), tiles: feat.tiles.size, shields: feat.shields });
    }
    returnMeeples(s, feat);
  };
  const pt = s.board[placedKey];
  const def = TILE_BY_ID[pt.type];
  def.cities.forEach((c, i) => tryScore(byNode.get(placedKey + ':city:' + i)));
  def.roads.forEach((r, i) => tryScore(byNode.get(placedKey + ':road:' + i)));
  const [px, py] = placedKey.split(',').map(Number);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const k = keyOf(px + dx, py + dy);
    const t = s.board[k];
    if (!t || !TILE_BY_ID[t.type].cloister) continue;
    tryScore(byNode.get(k + ':cloister:0'));
  }
  return events;
}

/* ---------- đặt lá ---------- */
export function canPlaceAt(board, type, x, y, rot) {
  if (!board || !type || !TILE_BY_ID[type]) return false;
  if (board[keyOf(x, y)]) return false;
  const edges = rotEdges(type, rot);
  let adjacent = false;
  for (let d = 0; d < 4; d++) {
    const nt = board[keyOf(x + DIRS[d][0], y + DIRS[d][1])];
    if (!nt) continue;
    adjacent = true;
    if (edges[d] !== rotEdges(nt.type, nt.rot)[(d + 2) % 4]) return false;
  }
  return adjacent;
}
/* các ô trống kề lá đã đặt (nơi có thể đặt lá mới) */
export function emptyAdjacentCells(board) {
  const out = new Map();
  for (const key of Object.keys(board)) {
    const [x, y] = key.split(',').map(Number);
    for (let d = 0; d < 4; d++) {
      const k = keyOf(x + DIRS[d][0], y + DIRS[d][1]);
      if (!board[k]) out.set(k, [x + DIRS[d][0], y + DIRS[d][1]]);
    }
  }
  return [...out.values()];
}
/* mọi vị trí + góc xoay hợp lệ cho 1 loại lá trên bàn hiện tại (loại
   trùng: 2 góc xoay cho cùng cạnh + cùng nét thì chỉ giữ 1) */
export function legalPlacementsFor(board, type) {
  if (!type || !TILE_BY_ID[type]) return [];
  const def = TILE_BY_ID[type];
  const out = [];
  const seen = new Set();
  for (const [x, y] of emptyAdjacentCells(board)) {
    for (let rot = 0; rot < 4; rot++) {
      if (!canPlaceAt(board, type, x, y, rot)) continue;
      const sig = x + ',' + y + ':' + JSON.stringify({
        e: rotEdges(type, rot),
        c: def.cities.map(c => rotSegEdges(c.edges, rot).sort().join(',')),
        r: def.roads.map(r => rotSegEdges(r.edges, rot).sort().join(',')),
        f: def.fields.map(f => rotHalves(f.halves, rot).sort((a, b) => a - b).join(',')),
        m: def.cloister,
      });
      if (seen.has(sig)) continue;
      seen.add(sig);
      out.push({ x, y, rot });
    }
  }
  return out;
}
export const legalPlacements = s => legalPlacementsFor(s.board, s.hand);

/* bốc lá cho người tới lượt; lá không đặt được ở đâu thì loại khỏi ván
   rồi bốc tiếp. Hết chồng lá thì trả false (ván kết thúc). */
function drawForTurn(s) {
  while (s.stack.length > 0) {
    const type = s.stack.pop();
    if (legalPlacementsFor(s.board, type).length > 0) {
      s.hand = type;
      s.step = 'place';
      return true;
    }
    s.discarded.push(type);
    log(s, `🗑️ Lá ${tileShortName(type)} không đặt được ở đâu nên bị loại khỏi ván.`, 'info');
  }
  return false;
}
export function tileShortName(type) {
  const def = TILE_BY_ID[type];
  if (!def) return type;
  const parts = [];
  if (def.cities.length) parts.push(def.cities.length + ' thành phố');
  if (def.roads.length) parts.push(def.roads.length + ' đường');
  if (def.cloister) parts.push('tu viện');
  if (!parts.length) parts.push('ruộng');
  return parts.join(' + ');
}

function advanceTurn(s) {
  s.lastPlaced = null;
  s.lastScore = [];
  s.turnIdx = (s.turnIdx + 1) % s.players.length;
  s.turnCount++;
  if (!drawForTurn(s)) endGame(s, 'tiles');
}

/* ---------- kết thúc ván ---------- */
function endGame(s, cause, resignerId = null) {
  s.phase = 'ended';
  s.endReason = cause === 'resign' ? 'resign' : 'match';
  s.endCause = cause;
  const { features, byNode } = computeFeatures(s.board);
  const fieldResults = [];
  for (const feat of features) {
    if (feat.kind === 'field') {
      const cities = new Set();
      for (const nodeId of feat.citySegs) {
        const cf = byNode.get(nodeId);
        if (cf && cf.complete) cities.add(cf.id);
      }
      const pts = 3 * cities.size;
      const owners = majorityOwners(feat);
      if (owners.length && pts > 0) {
        for (const pid of owners) player(s, pid).score += pts;
        fieldResults.push({ owners: owners.slice(), points: pts, cities: cities.size, farmers: feat.meeples.length });
      }
      continue;
    }
    if (feat.kind === 'cloister' || feat.kind === 'city' || feat.kind === 'road') {
      const owners = majorityOwners(feat);
      if (!owners.length) continue;
      const pts = featPoints(feat, feat.complete);
      if (pts <= 0) continue;
      for (const pid of owners) player(s, pid).score += pts;
    }
  }
  s.final = {
    fields: fieldResults,
    completed: (s.completed || []).slice(),
    scores: s.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
  };
  let best = -Infinity;
  for (const p of s.players) {
    if (resignerId && p.id === resignerId) continue;
    if (p.score > best) best = p.score;
  }
  s.winners = s.players.filter(p => (!resignerId || p.id !== resignerId) && p.score === best).map(p => p.id);
  s.winner = s.winners[0] || null;
  s.losers = s.players.filter(p => !s.winners.includes(p.id)).map(p => p.id);
  s.endedAt = Date.now();
  if (s.winners.length) {
    const names = s.winners.map(id => player(s, id).name).join(' + ');
    log(s, `🏆 ${names} thắng với ${best} điểm!`, 'win');
  } else {
    log(s, '🤝 Ván kết thúc mà không có người thắng.', 'info');
  }
}

/* ---------- người được hành động ---------- */
export function actors(s) {
  if (!s || s.phase !== 'playing') return [];
  const p = s.players[s.turnIdx];
  return p ? [p.id] : [];
}

/* ---------- nước đi hợp lệ ---------- */
export function legalMoves(s, pid) {
  if (!s || s.phase !== 'playing') return [];
  if (actors(s)[0] !== pid) return [];
  if (s.step === 'place') {
    return legalPlacements(s).map(p => ({ type: 'place', x: p.x, y: p.y, rot: p.rot }));
  }
  if (s.step === 'meeple') {
    const moves = [];
    const p = player(s, pid);
    if (p && p.supply > 0 && s.lastPlaced && s.board[s.lastPlaced]) {
      const { byNode } = computeFeatures(s.board);
      const pt = s.board[s.lastPlaced];
      const def = TILE_BY_ID[pt.type];
      const add = (kind, seg) => {
        const f = byNode.get(s.lastPlaced + ':' + kind + ':' + seg);
        if (f && f.meeples.length === 0) moves.push({ type: 'meeple', kind, seg });
      };
      def.cities.forEach((c, i) => add('city', i));
      def.roads.forEach((r, i) => add('road', i));
      def.fields.forEach((fl, i) => add('field', i));
      if (def.cloister) add('cloister', 0);
    }
    moves.push({ type: 'skip' });
    return moves;
  }
  return [];
}

/* ---------- áp dụng 1 nước đi ---------- */
export function applyAction(s, pid, act) {
  if (!s || s.phase !== 'playing') return { ok: false, reason: 'ended' };
  if (!act || typeof act.type !== 'string') return { ok: false, reason: 'bad-action' };
  const p = player(s, pid);
  if (!p) return { ok: false, reason: 'no-player' };

  /* xin thua: kết thúc TRẬN ngay (tính điểm cuối ván rồi chọn người
     có điểm cao nhất trong số người không xin thua) */
  if (act.type === 'resign') {
    endGame(s, 'resign', pid);
    log(s, '🏳️ ' + p.name + ' xin thua — ván dừng lại ngay.', 'resign');
    s.seq++;
    return { ok: true };
  }

  if (actors(s)[0] !== pid) return { ok: false, reason: 'not-your-turn' };

  /* đặt lá vừa bốc */
  if (act.type === 'place' && s.step === 'place') {
    const { x, y, rot } = act;
    if (!Number.isInteger(x) || !Number.isInteger(y) || ![0, 1, 2, 3].includes(rot)) {
      return { ok: false, reason: 'bad-place' };
    }
    if (!s.hand) return { ok: false, reason: 'no-hand' };
    if (!canPlaceAt(s.board, s.hand, x, y, rot)) return { ok: false, reason: 'illegal-place' };
    s.board[keyOf(x, y)] = { type: s.hand, rot, meeples: [] };
    s.lastPlaced = keyOf(x, y);
    log(s, `🧱 ${p.name} đặt lá ${tileShortName(s.hand)} ở (${x}, ${y}).`);
    s.hand = null;
    s.step = 'meeple';
    s.seq++;
    return { ok: true };
  }

  /* đặt meeple lên lá vừa đặt (hoặc bỏ qua) rồi tính điểm + sang lượt */
  if (s.step === 'meeple' && (act.type === 'meeple' || act.type === 'skip')) {
    if (act.type === 'meeple') {
      if (!s.lastPlaced || !s.board[s.lastPlaced]) return { ok: false, reason: 'no-tile' };
      if (p.supply <= 0) return { ok: false, reason: 'no-meeple' };
      const pt = s.board[s.lastPlaced];
      const def = TILE_BY_ID[pt.type];
      const kind = act.kind, seg = act.seg;
      let valid = false;
      if (kind === 'city' && def.cities[seg]) valid = true;
      else if (kind === 'road' && def.roads[seg]) valid = true;
      else if (kind === 'field' && def.fields[seg]) valid = true;
      else if ((kind === 'monastery' || kind === 'cloister') && def.cloister && seg === 0) valid = true;
      if (!valid) return { ok: false, reason: 'bad-feature' };
      const { byNode } = computeFeatures(s.board);
      const featKind = (kind === 'monastery') ? 'cloister' : kind;
      const feat = byNode.get(s.lastPlaced + ':' + featKind + ':' + seg);
      if (!feat) return { ok: false, reason: 'bad-feature' };
      if (feat.meeples.length > 0) return { ok: false, reason: 'occupied' };
      pt.meeples.push({ pid, kind: featKind, seg });
      p.supply--;
      const role = featKind === 'city' ? 'hiệp sĩ' : featKind === 'road' ? 'kẻ cướp đường' : featKind === 'field' ? 'nông dân' : 'tu sĩ';
      log(s, `🧍 ${p.name} đặt ${role} lên lá vừa đặt.`);
    }
    const events = scoreCompleted(s);
    if (!s.completed) s.completed = [];
    for (const ev of events) s.completed.push(ev);
    s.lastScore = events;
    advanceTurn(s);
    s.seq++;
    return { ok: true };
  }

  return { ok: false, reason: 'illegal' };
}

/* ---------- góc nhìn của 1 người chơi ---------- */
/* Bàn cờ + meeple là thông tin công khai; chỉ giấu thứ tự chồng lá
   (chỉ lộ số lá còn lại) và lá trên tay người khác (chỉ người tới lượt
   thấy lá mình vừa bốc). Không có trường `you`. */
export function viewFor(s, pid) {
  const turnPid = s.players[s.turnIdx] ? s.players[s.turnIdx].id : null;
  return {
    gid: s.gid, seq: s.seq, phase: s.phase, turn: turnPid, turnCount: s.turnCount,
    step: s.step,
    hand: (pid === turnPid && s.phase === 'playing') ? s.hand : null,
    stackCount: s.stack.length,
    discarded: s.discarded.slice(),
    board: JSON.parse(JSON.stringify(s.board)),
    players: s.players.map(pl => ({
      id: pl.id, name: pl.name, isBot: pl.isBot, local: pl.local, level: pl.level,
      score: pl.score, supply: pl.supply,
    })),
    lastPlaced: s.lastPlaced,
    lastScore: (s.lastScore || []).slice(),
    winner: s.winner, winners: s.winners.slice(), losers: s.losers.slice(),
    endReason: s.endReason, endCause: s.endCause,
    final: s.final ? JSON.parse(JSON.stringify(s.final)) : null,
    log: s.log.slice(-40), startedAt: s.startedAt, endedAt: s.endedAt, me: pid,
  };
}

export function serialize(s) { return JSON.stringify(s); }
export function deserialize(json) {
  const s = JSON.parse(json);
  if (!s || !Array.isArray(s.players) || !s.board || !Array.isArray(s.stack)) throw new Error('bad save');
  return s;
}
export default { createGame, applyAction, viewFor, actors, legalMoves };
