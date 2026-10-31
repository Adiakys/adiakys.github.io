// The cars: the trofeo hatch everyone starts with, and the three Feeling Lucky
// gives away. Each is drawn from behind, the way the race shows it, on the
// same 640 × 300 frame, with where its brake lights are.
//
// `top` is in km/h, `accel` the seconds from 0 to its own top speed on the
// flat, `slide` how much a corner pushes it wide (less is more grip). The
// gearbox: what each gear does at the shift point, the revs; the last gear
// reaches the limiter at top speed. First and second are short, the middle
// ones medium, the top ones long. `climb` is how fast the dash creeps up the
// last tenth of top speed, as a share of the real acceleration: the car is
// already flat out there, but the needle and the revs run to the limiter
// around the middle of the main straight. `engine` is what the sound is made
// of: cylinders, and how bright it gets (0..1).
const FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';

export const CARS = {
  trofeo: {
    name: 'Trofeo hatch', short: 'Trofeo',
    top: 190, accel: 6, slide: 0.62, climb: 0.07,
    gears: [0, 50, 85, 125, 160, 190], idle: 1000, shift: 6800, limiter: 7200,
    engine: { cylinders: 4, bright: 0.5 },
    lights: [[112, 150, 58, 30], [470, 150, 58, 30]],
    draw: trofeo,
  },
  superturismo: {
    name: 'Superturismo', short: 'ST',
    top: 245, accel: 5.5, slide: 0.56, climb: 0.1,
    gears: [0, 60, 100, 140, 182, 216, 245], idle: 1200, shift: 8300, limiter: 8600,
    engine: { cylinders: 6, bright: 0.65 },
    lights: [[80, 142, 480, 20]],
    draw: superturismo,
  },
  gt3: {
    name: 'GT3', short: 'GT3',
    top: 282, accel: 5.2, slide: 0.52, climb: 0.115,
    gears: [0, 70, 115, 162, 207, 248, 282], idle: 1500, shift: 8800, limiter: 9200,
    engine: { cylinders: 8, bright: 0.75 },
    lights: [[70, 164, 160, 12], [410, 164, 160, 12]],
    draw: gt3,
  },
  f1: {
    name: 'Formula 1', short: 'F1',
    top: 320, accel: 5, slide: 0.5, climb: 0.135,
    gears: [0, 85, 125, 162, 196, 228, 262, 294, 320], idle: 4000, shift: 12000, limiter: 12200,
    engine: { cylinders: 6, bright: 1 },
    lights: [[304, 214, 32, 16]],
    draw: formula,
  },
};

// Slowest to fastest: a new car is driven only if it beats the one you have.
export const RANK = ['trofeo', 'superturismo', 'gt3', 'f1'];

export function drawCar(id) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 300;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath();
  g.ellipse(320, 278, 300, 22, 0, 0, Math.PI * 2);
  g.fill();
  CARS[id].draw(g);
  return c;
}

function tyre(g, x, y, w, h) {
  g.fillStyle = '#0b0b0d';
  g.beginPath();
  g.roundRect(x, y, w, h, 16);
  g.fill();
  g.fillStyle = '#1e1f23';
  for (let ty = y + 10; ty < y + h - 8; ty += 14) g.fillRect(x + 8, ty, w - 16, 4);
}

function poly(g, color, pts) {
  g.fillStyle = color;
  g.beginPath();
  pts.forEach(([x, y]) => g.lineTo(x, y));
  g.closePath();
  g.fill();
}

function label(g, text, x, y, size, color) {
  g.fillStyle = color;
  g.font = `800 ${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, y);
}

function lights(g, rects, color) {
  g.fillStyle = color;
  for (const [x, y, w, h] of rects) g.fillRect(x, y, w, h);
}

// A small hatch from a one-make trofeo: white with Italian stripes, roll cage
// behind the glass, a number on the bumper, a red tow hook.
function trofeo(g) {
  tyre(g, 118, 196, 74, 84);
  tyre(g, 448, 196, 74, 84);
  // Cabin and glass, the cage behind it.
  poly(g, '#e9e7e1', [[168, 146], [206, 38], [434, 38], [472, 146]]);
  g.fillStyle = '#26303b';
  g.beginPath(); g.roundRect(212, 56, 216, 80, 8); g.fill();
  g.strokeStyle = '#8a9099';
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(226, 136); g.lineTo(226, 70); g.lineTo(414, 70); g.lineTo(414, 136); g.moveTo(226, 72); g.lineTo(414, 134); g.stroke();
  g.fillStyle = '#121316';
  g.fillRect(212, 56, 216, 18);
  label(g, 'ADIAKYS', 320, 66, 18, '#f2f0ea');
  // Roof spoiler.
  g.fillStyle = '#2b2d31';
  g.fillRect(196, 30, 248, 12);
  // Body.
  g.fillStyle = '#f2f0ea';
  g.beginPath(); g.roundRect(100, 140, 440, 112, 26); g.fill();
  // Tricolore down the middle.
  g.fillStyle = '#2e8b57'; g.fillRect(288, 140, 18, 112); g.fillRect(288, 30, 18, 12);
  g.fillStyle = '#c8102e'; g.fillRect(334, 140, 18, 112); g.fillRect(334, 30, 18, 12);
  lights(g, CARS.trofeo.lights, '#7a1d1a');
  // Bumper, number, hook, exhaust.
  g.fillStyle = '#3a3c41';
  g.beginPath(); g.roundRect(104, 224, 432, 30, 12); g.fill();
  g.fillStyle = '#f2f0ea';
  g.fillRect(286, 188, 68, 36);
  label(g, '05', 320, 207, 30, '#121316');
  g.fillStyle = '#d63a2f';
  g.fillRect(372, 248, 18, 14);
  g.fillStyle = '#6b6e74';
  g.beginPath(); g.arc(468, 246, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#121316';
  g.beginPath(); g.arc(468, 246, 5, 0, Math.PI * 2); g.fill();
}

// A 1990s supertouring saloon, after the Italian ones that won in the BTCC
// and the DTM: boxy, red, a full-width tail lamp, a tall wing on two posts.
function superturismo(g) {
  tyre(g, 72, 178, 100, 102);
  tyre(g, 468, 178, 100, 102);
  // Cabin and rear glass.
  poly(g, '#a8121c', [[150, 132], [204, 50], [436, 50], [490, 132]]);
  g.fillStyle = '#222a33';
  poly(g, '#222a33', [[178, 126], [218, 62], [422, 62], [462, 126]]);
  // Body with flared arches.
  g.fillStyle = '#b8141f';
  g.beginPath(); g.roundRect(58, 128, 524, 124, 10); g.fill();
  g.fillStyle = '#9e111a';
  g.fillRect(58, 128, 524, 8);
  // White livery stripe.
  g.fillStyle = '#f2f0ea';
  g.fillRect(58, 192, 524, 12);
  lights(g, CARS.superturismo.lights, '#6d1414');
  // Wing on its posts.
  g.fillStyle = '#121316';
  g.fillRect(226, 96, 12, 34);
  g.fillRect(402, 96, 12, 34);
  g.fillRect(104, 78, 432, 26);
  label(g, 'ADIAKYS', 320, 92, 24, '#f2f0ea');
  g.fillRect(100, 70, 10, 42);
  g.fillRect(530, 70, 10, 42);
  // Bumper and exhausts.
  g.fillStyle = '#2b2d31';
  g.fillRect(70, 230, 500, 24);
  g.fillStyle = '#6b6e74';
  for (const x of [452, 482]) { g.beginPath(); g.arc(x, 242, 9, 0, Math.PI * 2); g.fill(); }
}

// A GT3: wide and low, a swan-neck wing, a big diffuser.
function gt3(g) {
  tyre(g, 40, 168, 128, 112);
  tyre(g, 472, 168, 128, 112);
  // Cabin, small glass.
  poly(g, '#1d3f8f', [[196, 142], [244, 80], [396, 80], [444, 142]]);
  poly(g, '#222a33', [[222, 136], [258, 92], [382, 92], [418, 136]]);
  // Wide haunches over the rear wheels.
  g.fillStyle = '#1d3f8f';
  g.beginPath(); g.roundRect(30, 132, 580, 120, [56, 56, 14, 14]); g.fill();
  g.fillStyle = '#f2f0ea';
  g.fillRect(298, 80, 44, 170);
  lights(g, CARS.gt3.lights, '#5a1414');
  // Diffuser.
  g.fillStyle = '#16171a';
  g.fillRect(120, 214, 400, 42);
  g.fillStyle = '#2b2d31';
  for (let x = 140; x < 510; x += 40) g.fillRect(x, 214, 6, 42);
  g.fillStyle = '#6b6e74';
  for (const x of [300, 340]) { g.beginPath(); g.arc(x, 234, 10, 0, Math.PI * 2); g.fill(); }
  // Swan-neck wing: the posts hang it from above.
  g.strokeStyle = '#121316';
  g.lineWidth = 10;
  for (const x of [250, 390]) { g.beginPath(); g.moveTo(x, 140); g.quadraticCurveTo(x, 70, x + (x < 320 ? -20 : 20), 46); g.stroke(); }
  g.fillStyle = '#121316';
  g.fillRect(60, 30, 520, 30);
  g.fillRect(56, 18, 12, 70);
  g.fillRect(572, 18, 12, 70);
  label(g, 'ADIAKYS', 320, 46, 26, '#f2f0ea');
}

// The F1 car: what this site started with.
function formula(g) {
  const black = '#121316', orange = '#ff5a1f';
  tyre(g, 30, 150, 130, 130);
  tyre(g, 480, 150, 130, 130);
  poly(g, black, [[150, 260], [190, 150], [270, 110], [370, 110], [450, 150], [490, 260]]);
  poly(g, orange, [[300, 110], [340, 110], [356, 260], [284, 260]]);
  g.fillStyle = '#26282d';
  g.fillRect(190, 236, 260, 26);
  g.fillStyle = black;
  for (let x = 214; x < 440; x += 36) g.fillRect(x, 236, 6, 26);
  g.fillRect(70, 30, 18, 110);
  g.fillRect(552, 30, 18, 110);
  g.fillRect(300, 70, 12, 60);
  g.fillRect(328, 70, 12, 60);
  g.fillStyle = orange;
  g.fillRect(70, 40, 500, 52);
  label(g, 'ADIAKYS', 320, 68, 50, black);
  lights(g, CARS.f1.lights, '#3a1210');
}
