// The circuit: a short, hilly track in the Langhe, after Imola and Mugello.
// It is drawn as a closed polygon of corners, each rounded with its radius,
// so the minimap is the track you drive and the lap always closes.
export const SEG = 200;              // segment length, world units
export const ROAD_W = 2000;          // half the road width, world units
const M = 1.2;                       // metres per segment
const UNITS = SEG / M;               // world units per metre
const RUMBLE = 3;                    // segments per kerb stripe
const START_BEFORE_T1 = 600;         // metres from the start line to turn 1

// Corners in metres (x east, z north), with the radius that rounds each one.
// A named corner owns the unnamed ones after it.
const CORNERS = [
  [-170, 0, 85, 'Curvone Vision', 'vision'],
  [660, 0, 10, 'Tornante SimRig', 'simrig'],
  [690, 55, 10],
  [600, 70, 40],
  [520, 120, 55, 'Esse OpenMediatR', 'mediatr'],
  [430, 120, 35],
  [400, 175, 18, 'Curva del Borgo'],
  [330, 190, 9, 'Variante OTLP', 'otlp'],
  [310, 210, 9],
  [285, 210, 9],
  [265, 190, 9],
  [170, 190, 100, 'Dosso Feeling Lucky', 'lucky'],
  [60, 120, 18, 'La Fontana'],
  [20, 150, 40],
  [10, 270, 8, 'Variante LimitedInput', 'gauth'],
  [-12, 290, 8],
  [-40, 280, 8],
  [-70, 300, 22, 'Le Due Sinistre'],
  [-150, 290, 22],
  [-200, 160, 90],
];

// Height in metres where each named corner begins; eased in between.
const HEIGHTS = {
  'Curvone Vision': 6,
  'Tornante SimRig': 0,
  'Esse OpenMediatR': 10,
  'Curva del Borgo': 16,
  'Variante OTLP': 21,
  'Dosso Feeling Lucky': 27,
  'La Fontana': 7,
  'Variante LimitedInput': 31,
  'Le Due Sinistre': 17,
};

export const TOP = 31 * UNITS;

// Where the barriers stand, in half road widths, and how tall they are.
export const ARMCO = { at: 2.7, h: 110 };
export const PIT_WALL = { at: 1.6, h: 260 };

// A bay is a lay-by next to a project's billboard: stop in it to read about
// the project. It widens the road by BAY_W half road widths on one side.
export const BAY_W = 1.4;
const BAY_LEN = 40;                  // segments, about 48 m
const BAY_TAPER = 8;                 // segments to widen and narrow again

// How much a corner of radius r bends the road on screen. True to the radius
// the hairpin would whip off the screen; this keeps slow corners slow and readable.
const bend = (r) => 26 / Math.sqrt(r);

export function buildTrack() {
  const pieces = layout();
  const total = pieces.reduce((s, p) => s + p.length, 0);
  const t1 = pieces.findIndex((p) => p.corner?.name === 'Tornante SimRig');
  const lapStart = pieces.slice(0, t1).reduce((s, p) => s + p.length, 0) - START_BEFORE_T1;

  // Distance from the start line where each named corner begins.
  const named = [];
  let at = 0;
  for (const p of pieces) {
    if (p.corner?.name) named.push({ ...p.corner, from: (at - lapStart + total) % total });
    at += p.length;
  }
  named.sort((a, b) => a.from - b.from);
  named.forEach((c, i) => (c.number = i + 1));

  const count = Math.round(total / M);
  const segments = [];
  const map = [];
  let piece = 0, inPiece = 0;
  // Walk from the start line, piece by piece.
  ({ piece, inPiece } = locate(pieces, lapStart));
  let { x, z, heading } = pointAt(pieces[piece], inPiece);

  for (let n = 0; n < count; n++) {
    const p = pieces[piece];
    const d = n * M;
    segments.push({
      index: n,
      p1: { world: { y: 0, z: n * SEG }, camera: {}, screen: {} },
      p2: { world: { y: 0, z: (n + 1) * SEG }, camera: {}, screen: {} },
      curve: p.k ? Math.sign(p.k) * bend(1 / Math.abs(p.k)) : 0,
      radius: p.k ? 1 / Math.abs(p.k) : Infinity,
      gravel: !!p.k && 1 / Math.abs(p.k) < 45,
      straight: p.main,
      bay: null,
      corner: named.find((c) => d >= c.from - 70 && d < c.from + 40) ?? null,
      dark: Math.floor(n / RUMBLE) % 2 === 1,
      sprites: [],
      clip: 0,
      visible: false,
    });
    map.push({ x, z });

    heading += (p.k || 0) * M;
    x += Math.sin(heading) * M;
    z += Math.cos(heading) * M;
    inPiece += M;
    while (inPiece >= pieces[piece].length) {
      inPiece -= pieces[piece].length;
      piece = (piece + 1) % pieces.length;
    }
  }

  smoothCurves(segments);
  heights(segments, named, total);
  const bays = layBays(segments, named);
  scenery(segments, named, bays);

  return { segments, corners: named, bays, length: count * SEG, metres: total, map };
}

// The polygon as straights and arcs, starting with the first corner's arc.
function layout() {
  const n = CORNERS.length;
  const c = CORNERS.map(([x, z, r, name, id], i) => {
    const [x0, z0] = CORNERS[(i - 1 + n) % n];
    const [x2, z2] = CORNERS[(i + 1) % n];
    const a = Math.atan2(x - x0, z - z0);
    const b = Math.atan2(x2 - x, z2 - z);
    const turn = ((b - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return { x, z, r, name, id, a, turn, t: r * Math.tan(Math.abs(turn) / 2) };
  });
  const pieces = [];
  c.forEach((k, i) => {
    const next = c[(i + 1) % n];
    const sx = k.x + Math.sin(k.a + k.turn) * k.t, sz = k.z + Math.cos(k.a + k.turn) * k.t;
    pieces.push({ length: Math.abs(k.turn) * k.r, k: Math.sign(k.turn) / k.r, corner: k, sx: k.x - Math.sin(k.a) * k.t, sz: k.z - Math.cos(k.a) * k.t, h: k.a });
    const len = Math.hypot(next.x - k.x, next.z - k.z) - k.t - next.t;
    pieces.push({ length: len, k: 0, sx, sz, h: k.a + k.turn, main: i === 0 });
  });
  return pieces;
}

function locate(pieces, d) {
  let piece = 0;
  while (d >= pieces[piece].length) d -= pieces[piece++].length;
  return { piece, inPiece: d };
}

function pointAt(p, d) {
  if (!p.k) return { x: p.sx + Math.sin(p.h) * d, z: p.sz + Math.cos(p.h) * d, heading: p.h };
  // Walk the arc in small steps; it is only done once.
  let x = p.sx, z = p.sz, h = p.h;
  for (let s = 0; s < d; s += 0.5) { h += p.k * 0.5; x += Math.sin(h) * 0.5; z += Math.cos(h) * 0.5; }
  return { x, z, heading: h };
}

// Arcs start at full bend; ease them in and out over a few metres.
function smoothCurves(segments) {
  const raw = segments.map((s) => s.curve);
  const w = 2;
  segments.forEach((s, i) => {
    let sum = 0;
    for (let j = -w; j <= w; j++) sum += raw[(i + j + raw.length) % raw.length];
    s.curve = sum / (2 * w + 1);
  });
}

function heights(segments, named, total) {
  // Repeat the first and last corner around the lap so the ease wraps.
  const keys = named.map((c) => [c.from, HEIGHTS[c.name]]);
  const first = keys[0], last = keys[keys.length - 1];
  keys.unshift([last[0] - total, last[1]]);
  keys.push([first[0] + total, first[1]]);
  const at = (d) => {
    let i = 1;
    while (keys[i][0] < d) i++;
    const [a, ya] = keys[i - 1], [b, yb] = keys[i];
    const t = (d - a) / (b - a);
    return ya + (yb - ya) * (0.5 - Math.cos(t * Math.PI) / 2);
  };
  segments.forEach((s, n) => {
    s.p1.world.y = at(n * M) * UNITS;
    s.p2.world.y = at((n + 1) * M) * UNITS;
  });
}

// A seeded random, so the scenery is the same on every visit.
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

// One bay per project corner, on the nearest stretch that stays straight
// for the whole bay, outside the corner. On the main straight it goes right,
// away from the pit wall.
function layBays(segments, named) {
  const n = segments.length;
  const taken = new Set();
  const bays = [];
  for (const c of named.filter((c) => c.id)) {
    const at = Math.round(c.from / M);
    let best = null;
    for (let d = 0; d < 160 && !best; d++) {
      for (const start of [at + d, at - d - BAY_LEN]) {
        const window = Array.from({ length: BAY_LEN + 4 }, (_, i) => (start - 2 + i + n) % n);
        // Straight, or bending so gently that a lay-by still looks right.
        if (window.some((i) => Math.abs(segments[i].curve) > 0.5 || taken.has(i))) continue;
        best = (start + n) % n;
        break;
      }
    }
    if (best === null) continue;
    const straight = segments[best].straight;
    const side = straight ? 1 : -Math.sign(c.turn) || 1;
    // Cars stop in the box near the end, after rolling in along the bay.
    const bay = { id: c.id, corner: c, from: best, to: best + BAY_LEN, mid: best + BAY_LEN / 2, stop: best + 26, board: (best + 46) % n, side };
    for (let i = 0; i < BAY_LEN; i++) {
      const s = segments[(best + i) % n];
      s.bay = { ...bay, open: Math.min(1, i / BAY_TAPER, (BAY_LEN - 1 - i) / BAY_TAPER) };
      taken.add(s.index);
    }
    bays.push(bay);
  }
  return bays;
}

const PROJECT_IDS = CORNERS.filter((c) => c[4]).map((c) => c[4]);

function scenery(segments, named, bays) {
  const r = rng(11);
  const n = segments.length;
  const add = (i, kind, offset, extra = {}) => segments[(i + n) % n].sprites.push({ kind, offset, ...extra });
  const out = ARMCO.at + 0.4;
  const byBay = new Set(bays.flatMap((b) => Array.from({ length: BAY_LEN }, (_, i) => (b.from + i) % n)));
  // Keep the billboard free: no stands or buildings right around a bay.
  const nearBay = new Set(bays.flatMap((b) => Array.from({ length: BAY_LEN + 80 }, (_, i) => (b.from - 40 + i + n) % n)));

  segments.forEach((s, i) => {
    // Hoardings along the barriers, the sponsors taking turns.
    if (i % 18 === 9 && !byBay.has(i)) {
      const side = s.straight ? 1 : i % 36 === 9 ? 1 : -1;
      add(i, 'hoarding', side * (ARMCO.at - 0.02), { id: PROJECT_IDS[(i / 18 | 0) % PROJECT_IDS.length] });
    }
    // Tyre walls on the outside of the slow corners.
    if (s.gravel && i % 2 === 0) add(i, 'tyres', -Math.sign(s.curve) * (ARMCO.at - 0.05));
    // Marshal posts every 250 m or so.
    if (i % 210 === 100) add(i, 'marshal', (i % 420 === 100 ? 1 : -1) * (ARMCO.at + 0.25));

    if (s.straight) {
      // Garages behind the pit wall, the main grandstand across the track.
      if (i % 34 === 0) add(i, 'garage', -(PIT_WALL.at + 0.15));
      if (i % 48 === 0 && !nearBay.has(i)) add(i, 'stand', ARMCO.at + 0.35);
      return;
    }
    if (byBay.has(i)) return;
    if (i % 7 === 0) add(i, 'vines', (r() < 0.5 ? -1 : 1) * (out + 1.5 + r() * 4));
    if (i % 23 === 5) add(i, r() < 0.4 ? 'cypress' : 'tree', (r() < 0.5 ? -1 : 1) * (out + 0.8 + r() * 5));
    if (i % 157 === 60) add(i, 'farm', (r() < 0.5 ? -1 : 1) * (out + 5 + r() * 6));
  });

  // The bridge over the main straight.
  add(150, 'bridge', 0, { center: true });

  // Each bay has its project's billboard just past it, so it stands in front
  // of you once you have stopped. It is also the one you can click.
  for (const b of bays) add(b.board, 'board', b.side * (ARMCO.at + 0.3), { id: b.id, big: true });

  // Braking boards before the slow corners: 150, 100, 50 m.
  for (const c of named) {
    const at = Math.round(c.from / M);
    if (!segments[(at + 3) % n].gravel) continue;
    const outside = -Math.sign(segments[(at + 3) % n].curve) || 1;
    for (const m of [150, 100, 50]) {
      const i = at - Math.round(m / M);
      // Never between a bay and its billboard: there they go across the track.
      const bay = bays.find((b) => i >= b.from && i <= b.stop + 24);
      const side = bay && bay.side === outside ? -outside : outside;
      add(i, 'brake' + m, side * (ARMCO.at - 0.25));
    }
  }

  // A grandstand looking down into the hairpin, ending before its bay so the
  // billboard stays clear; people on the bank at the Fontana.
  for (const c of named) {
    const at = Math.round(c.from / M);
    const side = -Math.sign(segments[(at + 3) % n].curve) || 1;
    const bay = bays.find((b) => b.id === c.id);
    if (c.name === 'Tornante SimRig') for (let i = 1; i <= 2; i++) add((bay ? bay.from : at) - 20 * i, 'stand', side * (ARMCO.at + 0.5));
    if (c.name === 'La Fontana') for (let i = -40; i <= 30; i += 5) add(at + i, 'crowd', (i % 10 ? 1 : -1) * (out + 0.3 + r() * 1.5));
  }

  // The village and its tower watch over the Curva del Borgo.
  const borgo = named.find((c) => c.name === 'Curva del Borgo');
  if (borgo) add(Math.round(borgo.from / M) - 120, 'tower', 14);
}
