// The circuit, loosely after the Lingotto in Turin: a lap on the ground,
// up the spiral ramp, two laps' worth of banking on the roof, down the other ramp.
export const SEG = 200;          // segment length, world units
export const ROAD_W = 2000;      // half the road width, world units
export const ROOF = 5200;        // roof height, world units
const RUMBLE = 3;                // segments per kerb stripe

// Per zone: where the barrier stands (in half road widths) and how tall it is.
export const WALLS = {
  ground: { at: 1.45, h: 260 },
  ramp: { at: 1.22, h: 3000 },
  roof: { at: 1.5, h: 420 },
};

const easeIn = (a, b, t) => a + (b - a) * t * t;
const easeInOut = (a, b, t) => a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5);

export function buildTrack() {
  const segments = [];
  const zones = [];
  const lastY = () => (segments.length ? segments[segments.length - 1].p2.world.y : 0);

  function add(curve, y, zone) {
    const n = segments.length;
    segments.push({
      index: n,
      p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} },
      p2: { world: { y, z: (n + 1) * SEG }, camera: {}, screen: {} },
      curve,
      zone,
      dark: Math.floor(n / RUMBLE) % 2 === 1,
      sprites: [],
      clip: 0,
      visible: false,
    });
  }

  function road(enter, hold, leave, curve, dy, zone) {
    const y0 = lastY();
    const total = enter + hold + leave;
    let i = 0;
    const y = () => easeInOut(y0, y0 + dy, ++i / total);
    for (let n = 0; n < enter; n++) add(easeIn(0, curve, n / enter), y(), zone);
    for (let n = 0; n < hold; n++) add(curve, y(), zone);
    for (let n = 0; n < leave; n++) add(easeInOut(curve, 0, n / leave), y(), zone);
  }

  function sponsor(id, from, to) {
    zones.push({ id, from, to });
    for (let n = from, i = 0; n < to; n += 20, i++) {
      const side = i % 2 ? 1 : -1;
      sprite(n, 'board', side * (WALLS[segments[n].zone].at + 0.5), id);
    }
  }

  function sprite(n, kind, offset, id) {
    segments[n].sprites.push({ kind, offset, id });
  }

  const mark = () => segments.length;
  let a;

  road(0, 50, 0, 0, 0, 'ground');                   // start, finish
  a = mark(); road(20, 40, 20, -2.5, 0, 'ground');  // Via Nizza kink
  sponsor('mediatr', a - 30, mark());
  road(0, 40, 0, 0, 0, 'ground');
  a = mark(); road(15, 230, 15, 3.4, ROOF, 'ramp'); // south ramp, up
  road(0, 30, 0, 0, 0, 'roof');
  a = mark(); road(0, 120, 0, 0, 0, 'roof');
  sponsor('simrig', a, mark());
  a = mark(); road(30, 90, 30, 4.5, 0, 'roof');     // south banking
  sponsor('otlp', a, mark());
  a = mark(); road(0, 120, 0, 0, 0, 'roof');
  sponsor('lucky', a, mark());
  a = mark(); road(30, 90, 30, 4.5, 0, 'roof');     // north banking
  sponsor('simrig', a, mark());
  road(0, 60, 0, 0, 0, 'roof');
  a = mark(); road(15, 230, 15, -3.4, -ROOF, 'ramp'); // north ramp, down
  a = mark(); road(20, 40, 20, 2.5, 0, 'ground');
  sponsor('gauth', a, mark());
  a = mark(); road(0, 60, 0, 0, 0, 'ground');
  sponsor('vision', a, a + 40);

  // Scenery off the road.
  for (const s of segments) {
    const w = WALLS[s.zone].at;
    if (s.zone === 'ground' && s.index % 6 === 3) {
      sprite(s.index, 'tree', -(w + 1.2 + (s.index % 5) * 0.4), null);
      sprite(s.index, 'tree', w + 1.4 + (s.index % 7) * 0.3, null);
    }
    if (s.zone === 'roof' && s.index % 24 === 0 && !s.sprites.length) {
      sprite(s.index, 'lamp', -(w + 0.15), null);
      sprite(s.index, 'lamp', w + 0.15, null);
    }
  }

  return { segments, zones, length: segments.length * SEG, map: layout(segments) };
}

// A plan view for the minimap: integrate the curves into a heading, then
// spread the error that keeps the line from closing over the whole lap.
function layout(segments) {
  const pts = [];
  let x = 0, z = 0, heading = 0;
  for (const s of segments) {
    heading += s.curve * 0.0062;
    x += Math.sin(heading);
    z -= Math.cos(heading);
    pts.push({ x, z, zone: s.zone });
  }
  const ex = pts[pts.length - 1].x, ez = pts[pts.length - 1].z;
  pts.forEach((p, i) => {
    const t = (i + 1) / pts.length;
    p.x -= ex * t;
    p.z -= ez * t;
  });
  return pts;
}
