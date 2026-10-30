// Everything drawn once at start-up onto offscreen canvases: the boards,
// the scenery, the skyline and the car.
import { SPONSORS } from './sponsors.js';

const FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// World sizes are in the same units as the road.
export function makeArt() {
  const boards = {};
  for (const [id, s] of Object.entries(SPONSORS)) boards[id] = { img: board(s), w: 2600 };
  return {
    boards,
    tree: { img: tree(), w: 1500 },
    lamp: { img: lamp(), w: 260 },
    alps: alps(),
    city: city(),
    car: car(),
  };
}

function board(s) {
  const [c, g] = canvas(1024, 400);
  g.fillStyle = '#2b2d31';
  g.fillRect(150, 280, 26, 120);
  g.fillRect(848, 280, 26, 120);
  g.fillStyle = '#0c0d10';
  g.fillRect(0, 0, 1024, 290);
  g.fillStyle = s.bg;
  g.fillRect(10, 10, 1004, 270);

  let size = 210;
  g.font = `800 ${size}px ${FONT}`;
  while (g.measureText(s.name).width > 860 && size > 60) g.font = `800 ${(size -= 6)}px ${FONT}`;
  g.fillStyle = s.fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(s.name, 512, 152);

  g.font = `700 40px ${FONT}`;
  g.textAlign = 'right';
  g.globalAlpha = 0.7;
  g.fillText(s.tag, 990, 250);
  return c;
}

function tree() {
  const [c, g] = canvas(256, 380);
  g.fillStyle = '#2a211c';
  g.fillRect(118, 250, 20, 130);
  const blobs = [[128, 150, 100], [80, 200, 70], [178, 205, 72], [128, 90, 70]];
  g.fillStyle = '#18291f';
  for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#223a2b';
  for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x - r * 0.2, y - r * 0.25, r * 0.6, 0, Math.PI * 2); g.fill(); }
  return c;
}

function lamp() {
  const [c, g] = canvas(64, 640);
  g.fillStyle = '#2b2d31';
  g.fillRect(28, 40, 8, 600);
  const glow = g.createRadialGradient(32, 40, 2, 32, 40, 30);
  glow.addColorStop(0, 'rgba(255,222,160,1)');
  glow.addColorStop(1, 'rgba(255,222,160,0)');
  g.fillStyle = glow;
  g.fillRect(0, 10, 64, 60);
  return c;
}

// A seeded random, so the skyline is the same on every visit.
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function alps() {
  const [c, g] = canvas(2400, 300);
  const r = rng(7);
  const peaks = [];
  for (let x = 0; x <= 2400; x += 60 + r() * 80) peaks.push([x, 120 + r() * 120]);
  peaks.splice(8, 0, [peaks[7][0] + 50, 30]); // Monviso
  peaks.push([2400, peaks[0][1]]);
  g.beginPath();
  g.moveTo(0, 300);
  for (const [x, y] of peaks) g.lineTo(x, y);
  g.lineTo(2400, 300);
  g.fillStyle = '#3a3f58';
  g.fill();
  // Snow: the top of each peak, clipped to the ridge.
  g.save();
  g.clip();
  g.fillStyle = 'rgba(214,220,235,0.55)';
  for (const [x, y] of peaks) {
    g.beginPath();
    g.moveTo(x - 50, y + 46);
    g.lineTo(x, y);
    g.lineTo(x + 50, y + 46);
    g.fill();
  }
  g.restore();
  return c;
}

function city() {
  const [c, g] = canvas(2400, 260);
  const r = rng(42);
  g.fillStyle = '#141826';
  // Superga on its hill.
  g.beginPath();
  g.moveTo(1500, 260);
  g.quadraticCurveTo(1760, 60, 2040, 260);
  g.fill();
  g.fillRect(1745, 96, 30, 20);
  g.beginPath();
  g.arc(1760, 96, 15, Math.PI, 0);
  g.fill();

  const windows = [];
  for (let x = 0; x < 2400; ) {
    const w = 40 + r() * 90;
    const h = 40 + r() * 110;
    g.fillRect(x, 260 - h, w - 6, h);
    for (let wy = 260 - h + 10; wy < 250; wy += 14)
      for (let wx = x + 6; wx < x + w - 12; wx += 12) if (r() < 0.18) windows.push([wx, wy]);
    x += w;
  }
  // The Mole Antonelliana.
  const mx = 700;
  g.fillRect(mx - 60, 170, 120, 90);
  g.beginPath();
  g.moveTo(mx - 56, 172);
  g.quadraticCurveTo(mx - 30, 90, mx - 8, 60);
  g.lineTo(mx + 8, 60);
  g.quadraticCurveTo(mx + 30, 90, mx + 56, 172);
  g.fill();
  g.fillRect(mx - 9, 30, 18, 32);
  g.beginPath();
  g.moveTo(mx - 6, 30);
  g.lineTo(mx, -10);
  g.lineTo(mx + 6, 30);
  g.fill();

  g.fillStyle = '#ffcf7a';
  for (const [x, y] of windows) g.fillRect(x, y, 4, 5);
  return c;
}

function car() {
  const [c, g] = canvas(640, 300);
  const black = '#121316';
  const orange = SPONSORS.simrig.bg;

  // Shadow.
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath();
  g.ellipse(320, 278, 300, 22, 0, 0, Math.PI * 2);
  g.fill();

  // Tyres.
  const tyre = (x) => {
    g.fillStyle = '#0b0b0d';
    g.beginPath();
    g.roundRect(x, 150, 130, 130, 18);
    g.fill();
    g.fillStyle = '#1e1f23';
    for (let y = 160; y < 270; y += 14) g.fillRect(x + 10, y, 110, 4);
  };
  tyre(30);
  tyre(480);

  // Body and engine cover.
  g.fillStyle = black;
  g.beginPath();
  g.moveTo(150, 260);
  g.lineTo(190, 150);
  g.lineTo(270, 110);
  g.lineTo(370, 110);
  g.lineTo(450, 150);
  g.lineTo(490, 260);
  g.closePath();
  g.fill();
  g.fillStyle = orange;
  g.beginPath();
  g.moveTo(300, 110);
  g.lineTo(340, 110);
  g.lineTo(356, 260);
  g.lineTo(284, 260);
  g.closePath();
  g.fill();

  // Diffuser.
  g.fillStyle = '#26282d';
  g.fillRect(190, 236, 260, 26);
  g.fillStyle = black;
  for (let x = 214; x < 440; x += 36) g.fillRect(x, 236, 6, 26);

  // Rear wing: endplates, main plane, the sponsor on it.
  g.fillStyle = black;
  g.fillRect(70, 30, 18, 110);
  g.fillRect(552, 30, 18, 110);
  g.fillRect(300, 70, 12, 60);
  g.fillRect(328, 70, 12, 60);
  g.fillStyle = orange;
  g.fillRect(70, 40, 500, 52);
  g.fillStyle = black;
  g.font = `800 50px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('SIMRIG', 320, 68);

  // Rain light, off; the game draws it lit when braking.
  g.fillStyle = '#3a1210';
  g.fillRect(304, 214, 32, 16);
  return c;
}
