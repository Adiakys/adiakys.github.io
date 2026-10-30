// Everything drawn once at start-up onto offscreen canvases: the boards,
// the Langhe around the track, the skyline and the car.
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
    tree: { img: tree(), w: 1700 },
    cypress: { img: cypress(), w: 700 },
    vines: { img: vines(), w: 3200 },
    farm: { img: farm(), w: 5200 },
    stand: { img: stand(), w: 9000 },
    tower: { img: tower(), w: 9000 },
    alps: alps(),
    hills: hills(),
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
  g.fillStyle = '#4a3a2a';
  g.fillRect(118, 250, 20, 130);
  const blobs = [[128, 150, 100], [80, 200, 70], [178, 205, 72], [128, 90, 70]];
  g.fillStyle = '#3f5a2a';
  for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#5c7a35';
  for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x - r * 0.25, y - r * 0.3, r * 0.55, 0, Math.PI * 2); g.fill(); }
  return c;
}

function cypress() {
  const [c, g] = canvas(100, 420);
  g.fillStyle = '#4a3a2a';
  g.fillRect(45, 380, 10, 40);
  g.fillStyle = '#2c3f22';
  g.beginPath();
  g.moveTo(50, 0);
  g.bezierCurveTo(95, 120, 90, 300, 50, 390);
  g.bezierCurveTo(10, 300, 5, 120, 50, 0);
  g.fill();
  g.fillStyle = '#3d5530';
  g.beginPath();
  g.moveTo(50, 10);
  g.bezierCurveTo(30, 120, 28, 280, 48, 380);
  g.bezierCurveTo(20, 280, 18, 120, 50, 10);
  g.fill();
  return c;
}

// A row of vines on its posts, as seen along the row.
function vines() {
  const [c, g] = canvas(512, 120);
  g.fillStyle = '#6b5a44';
  for (let x = 20; x < 512; x += 120) g.fillRect(x, 20, 6, 100);
  g.fillStyle = '#4f6b2c';
  g.beginPath();
  g.roundRect(0, 26, 512, 64, 30);
  g.fill();
  g.fillStyle = '#6d8c3a';
  for (let x = 10; x < 500; x += 34) { g.beginPath(); g.arc(x, 40 + (x % 3) * 6, 18, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#7a3a4a';
  for (let x = 30; x < 500; x += 61) { g.beginPath(); g.arc(x, 82, 7, 0, Math.PI * 2); g.fill(); }
  return c;
}

// A cascina: ochre walls, terracotta roof, a lean-to.
function farm() {
  const [c, g] = canvas(520, 260);
  g.fillStyle = '#d8b07a';
  g.fillRect(40, 110, 300, 150);
  g.fillStyle = '#c99a62';
  g.fillRect(340, 150, 150, 110);
  g.fillStyle = '#a5502f';
  g.beginPath(); g.moveTo(20, 115); g.lineTo(190, 40); g.lineTo(360, 115); g.fill();
  g.beginPath(); g.moveTo(330, 155); g.lineTo(500, 130); g.lineTo(500, 155); g.fill();
  g.fillStyle = '#3b2c24';
  for (const x of [80, 150, 220, 290]) { g.fillRect(x, 150, 26, 34); g.fillRect(x, 210, 26, 40); }
  g.fillRect(380, 190, 70, 70);
  return c;
}

function stand() {
  const [c, g] = canvas(1024, 380);
  g.fillStyle = '#d9d6cf';
  g.fillRect(0, 40, 1024, 18);
  g.fillStyle = '#9da1a6';
  for (const x of [20, 500, 990]) g.fillRect(x, 58, 14, 322);
  const r = rng(5);
  const colors = ['#f2f0ea', '#ff5a1f', '#2f6bff', '#e8c547', '#c44', '#3a3f46'];
  for (let row = 0; row < 9; row++) {
    const y = 90 + row * 30;
    g.fillStyle = '#5d6168';
    g.fillRect(0, y + 18, 1024, 12);
    for (let x = 6; x < 1020; x += 13) {
      if (r() < 0.25) continue;
      g.fillStyle = colors[Math.floor(r() * colors.length)];
      g.fillRect(x, y + 4 - row * 0.5, 8, 14);
    }
  }
  return c;
}

// The village on its hill, with the tower that names the Curva del Borgo.
function tower() {
  const [c, g] = canvas(900, 560);
  g.fillStyle = '#6f8a48';
  g.beginPath();
  g.moveTo(0, 560);
  g.quadraticCurveTo(450, 180, 900, 560);
  g.fill();
  g.fillStyle = '#d3a873';
  const houses = [[250, 360, 90, 70], [330, 330, 80, 80], [520, 340, 110, 70], [600, 370, 80, 60], [180, 400, 80, 60]];
  for (const [x, y, w, h] of houses) g.fillRect(x, y, w, h);
  g.fillStyle = '#a5502f';
  for (const [x, y, w] of houses) { g.beginPath(); g.moveTo(x - 6, y + 4); g.lineTo(x + w / 2, y - 26); g.lineTo(x + w + 6, y + 4); g.fill(); }
  g.fillStyle = '#b98e5c';
  g.fillRect(420, 110, 70, 260);
  g.fillStyle = '#8f6a42';
  for (let x = 416; x < 490; x += 18) g.fillRect(x, 96, 12, 16);
  g.fillStyle = '#3b2c24';
  g.fillRect(446, 160, 18, 30);
  return c;
}

// A seeded random, so the scenery is the same on every visit.
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
  g.fillStyle = '#a3a7c0';
  g.fill();
  // Snow: the top of each peak, clipped to the ridge.
  g.save();
  g.clip();
  g.fillStyle = '#f4ece6';
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

// The Langhe: rolling hills, ridges striped with vineyards, a castle or two.
function hills() {
  const [c, g] = canvas(2400, 260);
  const r = rng(42);
  const ridge = (base, amp, color, seed) => {
    const pts = [];
    for (let x = 0; x <= 2400; x += 100) pts.push([x, base - amp * (0.5 + 0.5 * Math.sin(x / 260 + seed) * Math.cos(x / 410 + seed * 2))]);
    pts[pts.length - 1][1] = pts[0][1];
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 260);
    pts.forEach(([x, y], i) => {
      if (!i) return g.lineTo(x, y);
      const [px, py] = pts[i - 1];
      g.quadraticCurveTo(px + 50, py, (px + x) / 2 + 25, (py + y) / 2);
    });
    g.lineTo(2400, 260);
    g.fill();
    return pts;
  };
  ridge(150, 90, '#8c9a76', 1);
  const near = ridge(210, 110, '#6f8a48', 4);
  // Vineyard rows down the near hills.
  g.strokeStyle = 'rgba(60,80,30,0.35)';
  g.lineWidth = 3;
  for (let x = 10; x < 2400; x += 14) {
    const i = Math.min(near.length - 1, Math.floor(x / 100));
    const top = near[i][1] + 14;
    g.beginPath(); g.moveTo(x, top); g.lineTo(x - 30, 260); g.stroke();
  }
  // Castles on the ridges, like Barolo and Grinzane.
  g.fillStyle = '#c99a62';
  for (const x of [380, 1270, 1990]) {
    const i = Math.floor(x / 100);
    const y = Math.min(near[i][1], near[i + 1][1]) + 6;
    g.fillRect(x, y - 34, 60, 34);
    g.fillRect(x + 40, y - 62, 18, 30);
    g.fillStyle = '#a5502f';
    g.fillRect(x - 3, y - 38, 66, 6);
    g.fillStyle = '#c99a62';
  }
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
