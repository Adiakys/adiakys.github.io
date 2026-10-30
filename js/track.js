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
      gravel: !!p.k && 1 / Math.abs(p.k) < 45,
      straight: p.main,
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
  scenery(segments);

  return { segments, corners: named, length: count * SEG, metres: total, map };
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

function scenery(segments) {
  const r = rng(11);
  const add = (s, kind, offset, id = null) => s.sprites.push({ kind, offset, id });

  segments.forEach((s, n) => {
    const out = ARMCO.at + 0.4;
    if (s.straight) {
      // Pit wall and grandstand on the left, a few trees on the right.
      if (n % 40 === 0) add(s, 'stand', -(PIT_WALL.at + 0.3));
      if (n % 30 === 15) add(s, 'tree', out + 1 + r() * 3);
      return;
    }
    if (s.corner?.id && n % 26 === 0) add(s, 'board', (s.curve > 0 ? -1 : 1) * out, s.corner.id);
    if (n % 7 === 0) add(s, 'vines', (r() < 0.5 ? -1 : 1) * (out + 1.5 + r() * 4));
    if (n % 23 === 5) add(s, r() < 0.4 ? 'cypress' : 'tree', (r() < 0.5 ? -1 : 1) * (out + 0.8 + r() * 5));
    if (n % 157 === 60) add(s, 'farm', (r() < 0.5 ? -1 : 1) * (out + 5 + r() * 6));
  });
  // The village and its tower watch over the Curva del Borgo.
  const borgo = segments.find((s) => s.corner?.name === 'Curva del Borgo');
  if (borgo) add(segments[borgo.index - 120], 'tower', 14);
}
