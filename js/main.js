import { buildTrack, SEG, ROAD_W, TOP, ARMCO, PIT_WALL, BAY_W } from './track.js';
import { repoStats } from './github.js';
import { makeArt } from './art.js';
import { CARS, RANK, drawCar as paintCar } from './cars.js';
import { openLucky, luckyOpen } from './lucky.js';
import { loadBrandImages, paintBoard, BOARD, LUCKY_BUTTON } from './brands.js';
import { createInput } from './input.js';
import { SPONSORS, readSponsorInfo } from './sponsors.js';

const canvas = document.getElementById('track');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');
const $ = (id) => document.getElementById(id);

// Camera and car.
const FOV = 100;
const CAM_H = 1000;
const CAM_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const DRAW = 300;
const PLAYER_Z = CAM_H * CAM_DEPTH;
// The world's speed scale: MAX_SPEED is 320 km/h, the fastest car's top speed.
const MAX_SPEED = SEG * 60;
const TOP_KMH = 320;
const PACE = 1.5;    // race seconds per real second
const BRAKING = -MAX_SPEED;
const DECEL = -MAX_SPEED / 5;
const OFFROAD_DECEL = -MAX_SPEED / 2;
const OFFROAD_LIMIT = MAX_SPEED / 4;
const GRAVEL_DECEL = -MAX_SPEED * 1.2;
const CAR_HALF = 0.16;    // half the car's width, in half road widths

// Late afternoon in the Langhe.
const COLORS = {
  grass: ['#6f8f3e', '#698838'],
  gravel: ['#d8c49a', '#d0bb90'],
  road: ['#4a4b4f', '#47484c'],
  kerb: ['#d63a2f', '#f2f0ea'],
  line: '#ecebe6',
  armco: ['#c3c6ca', '#b3b6ba'],
  pitWall: ['#e9e7e1', '#dddbd5'],
  runoff: ['#55575c', '#525459'],
  runoffStripe: ['#2f5fd0', '#c8382c'],
  sausage: '#f2c230',
  fog: [236, 214, 178],
};

const track = buildTrack();
const info = readSponsorInfo();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let art;

// ?at=600&x=1.5 starts the car at that segment and lateral position, to look
// at one part of the track.
const params = new URLSearchParams(location.search);
const startAt = Number(params.get('at')) || 0;
const car = { position: (startAt * SEG) % track.length, x: Number(params.get('x')) || 0, speed: 0, bump: 0 };
const lap = { n: 1, start: 0, last: null, best: readBest(), time: 0 };
let skyOffset = 0;
let W = 0, H = 0;

const input = createInput({
  canvas,
  onCalibrate(text) {
    $('cal').hidden = !text;
    if (text) $('cal-step').textContent = text;
  },
});
$('cal-skip').addEventListener('click', () => input.skipCalibration());

// ---- Zooming onto a billboard --------------------------------------------------
// Stopping in a bay, the tour, or a click on a billboard: the camera zooms onto
// the project's billboard until it fills the screen. Driving off, Esc or a click
// elsewhere zooms back out; Enter or a click on the billboard opens GitHub.
const ZOOM_S = 0.8;
const view = { bay: null, source: null, z: 0, dir: 0, rect: null, m: null, dismissed: null, still: 0 };
const hint = $('board-hint');
// Where the bay billboards were drawn in the last frame, in canvas pixels
// before the zoom.
let boardHits = [];
let zoomEase = 0;

function focus(bay, source) {
  if (view.bay?.id === bay.id && view.dir > 0) return;
  Object.assign(view, { bay, source, dir: 1 });
  const i = info[bay.id];
  hint.querySelector('.name').textContent = i.title;
  hint.querySelector('.open').href = i.href;
  hint.hidden = false;
  document.body.classList.add('zoomed');
}

function unfocus(source) {
  if (!view.bay || view.dir < 0 || (source && view.source !== source)) return;
  // Closed by hand (Esc, a click elsewhere) during a tour stop: move on now.
  if (!source && view.source === 'tour') tour.until = 0;
  view.dir = -1;
  hint.hidden = true;
  document.body.classList.remove('zoomed');
}

// The Feeling Lucky button: a real button laid over the one painted on its
// billboard, once the camera has zoomed in. It opens the casino room.
const luckyButton = $('lucky-button');
luckyButton.querySelector('.bulbs').innerHTML = Array.from({ length: 22 }, (_, i) => {
  // Around the edge: along the top, down the right, back along the bottom, up the left.
  const t = i / 22, p = t * 4, side = Math.floor(p), f = p - side;
  const [x, y] = [[f, 0], [1, f], [1 - f, 1], [0, 1 - f]][side];
  return `<i style="--i:${i};left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%"></i>`;
}).join('');
luckyButton.addEventListener('click', () => openLucky(luckyButton, { owned: () => garage.owned, onCar: winCar }));

// While the tour waits at a billboard, the hint shows how long is left.
function tourCountdown(now) {
  const waiting = !!tour.stop && view.source === 'tour';
  hint.querySelector('.stay').hidden = !waiting;
  hint.querySelector('.countdown').hidden = !waiting;
  if (waiting) {
    const left = clamp((tour.until - now) / TOUR_STOP_MS, 0, 1);
    hint.querySelector('.countdown i').style.transform = `scaleX(${left})`;
  }
}

function placeLuckyButton() {
  const r = view.rect, m = view.m;
  const show = view.bay?.id === 'lucky' && view.dir > 0 && zoomEase > 0.92 && r && m && !luckyOpen();
  luckyButton.hidden = !show;
  if (!show) return;
  const k = W / innerWidth;
  const x = (m.S * (r.x + (LUCKY_BUTTON.x / BOARD.w) * r.w) + m.tx) / k;
  const y = (m.S * (r.y + (LUCKY_BUTTON.y / BOARD.h) * r.full) + m.ty) / k;
  const w = (m.S * (LUCKY_BUTTON.w / BOARD.w) * r.w) / k;
  const h = (m.S * (LUCKY_BUTTON.h / BOARD.h) * r.full) / k;
  Object.assign(luckyButton.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, fontSize: `${h * 0.18}px` });
}

const openRepo = () => view.bay && window.open(info[view.bay.id].href, '_blank', 'noopener');
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// The camera move as a canvas transform: scale up around the billboard's panel
// while sliding it to the middle of the screen.
function zoomStep(dt) {
  view.z = clamp(view.z + (dt / ZOOM_S) * view.dir, 0, 1);
  if (view.z === 0 && view.dir < 0) Object.assign(view, { bay: null, dir: 0, rect: null });
  view.m = null;
  if (!view.bay) return 0;
  view.rect = boardHits.findLast((h) => h.bay?.id === view.bay.id) ?? view.rect;
  const r = view.rect;
  if (!r) return 0;
  const e = easeInOut(view.z);
  const ph = r.full * r.panel;
  const cx = r.x + r.w / 2, cy = r.y + ph / 2;
  const target = Math.min((0.92 * W) / r.w, (0.8 * H) / ph);
  const S = 1 + (target - 1) * e;
  const fx = lerp(cx, W / 2, e), fy = lerp(cy, H * 0.47, e);
  view.m = { S, tx: fx - S * cx, ty: fy - S * cy };
  return e;
}

// Canvas pixels of a mouse event, undoing the zoom.
function canvasPoint(e) {
  const k = W / innerWidth;
  let x = e.clientX * k, y = e.clientY * k;
  if (view.m) { x = (x - view.m.tx) / view.m.S; y = (y - view.m.ty) / view.m.S; }
  return { x, y };
}
const hitAt = ({ x, y }) => boardHits.findLast((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);

canvas.addEventListener('click', (e) => {
  const hit = hitAt(canvasPoint(e));
  if (view.bay && view.dir > 0) return hit?.bay.id === view.bay.id ? openRepo() : unfocus();
  if (hit) focus(hit.bay, 'click');
});
canvas.addEventListener('mousemove', (e) => {
  canvas.style.cursor = hitAt(canvasPoint(e)) ? 'pointer' : '';
});
addEventListener('keydown', (e) => {
  if (!view.bay || view.dir < 0 || luckyOpen()) return;
  // Esc is a clear "no thanks": that bay stays quiet until you leave it.
  if (e.key === 'Escape') {
    if (view.source === 'bay') view.dismissed = view.bay.id;
    unfocus();
  }
  if (e.key === 'Enter' && e.target === document.body) openRepo();
});
$('recal').addEventListener('click', () => input.recalibrate());

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  W = canvas.width = Math.round(innerWidth * dpr);
  H = canvas.height = Math.round(innerHeight * dpr);
  const m = mini.getBoundingClientRect();
  mini.width = Math.round(m.width * dpr);
  mini.height = Math.round(m.height * dpr);
}
addEventListener('resize', resize);

// ---- Driving ----------------------------------------------------------------

const segAt = (z) => track.segments[Math.floor(z / SEG) % track.segments.length];

// The car you drive, from your garage: the trofeo hatch to begin with, then
// whatever Feeling Lucky gives you. Kept in this browser.
const garage = readGarage();
let spec = CARS[garage.current];
let carImage = null;
const topSpeed = () => (MAX_SPEED * spec.top) / TOP_KMH;

function readGarage() {
  try {
    const g = JSON.parse(localStorage.getItem('garage'));
    if (g && CARS[g.current]) return g;
  } catch { /* no storage */ }
  return { owned: ['trofeo'], current: 'trofeo' };
}

// A car won: it joins the garage, and you drive it if it beats yours.
function winCar(id) {
  if (!garage.owned.includes(id)) garage.owned.push(id);
  if (RANK.indexOf(id) > RANK.indexOf(garage.current)) selectCar(id);
  else saveGarage();
}

function selectCar(id) {
  garage.current = id;
  spec = CARS[id];
  carImage = paintCar(id);
  gearbox.gear = Math.min(gearbox.gear, spec.gears.length - 1);
  saveGarage();
}

// Ctrl+Shift+G empties the garage back to the trofeo hatch, to try winning
// the cars again.
addEventListener('keydown', (e) => {
  if (!(e.ctrlKey && e.shiftKey && e.code === 'KeyG') || luckyOpen()) return;
  e.preventDefault();
  garage.owned = ['trofeo'];
  selectCar('trofeo');
  toast('Garage reset: back to the trofeo hatch.');
});

let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2500);
}

function saveGarage() {
  try { localStorage.setItem('garage', JSON.stringify(garage)); } catch { /* private mode */ }
  showGarage();
}

// The garage: the cars you own as icons you can pick; the others behind a
// closed garage door, with a word on where to win them.
const carIcons = {};
let closedDoor = null;

// A closed garage: a roof edge, a roller shutter, a padlock.
function paintDoor() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 300;
  const g = c.getContext('2d');
  g.fillStyle = '#e9e7e1';
  g.beginPath(); g.moveTo(130, 70); g.lineTo(320, 6); g.lineTo(510, 70); g.lineTo(510, 296); g.lineTo(130, 296); g.fill();
  g.fillStyle = '#5d6168';
  g.fillRect(172, 92, 296, 204);
  g.fillStyle = '#7b8087';
  for (let y = 100; y < 296; y += 22) g.fillRect(172, y, 296, 10);
  g.fillStyle = '#d4af5a';
  g.fillRect(296, 222, 48, 40);
  g.strokeStyle = '#d4af5a';
  g.lineWidth = 9;
  g.beginPath(); g.arc(320, 222, 16, Math.PI, 0); g.stroke();
  return c.toDataURL();
}

function showGarage() {
  const box = document.querySelector('.garage');
  const lucky = track.corners.find((c) => c.id === 'lucky');
  box.replaceChildren(...RANK.map((id) => {
    const owned = garage.owned.includes(id);
    const b = document.createElement('button');
    b.type = 'button';
    carIcons[id] ??= paintCar(id).toDataURL();
    closedDoor ??= paintDoor();
    const img = document.createElement('img');
    img.src = owned ? carIcons[id] : closedDoor;
    img.alt = '';
    b.append(img);
    b.setAttribute('aria-label', CARS[id].name);
    b.setAttribute('aria-pressed', String(id === garage.current));
    b.dataset.tip = owned
      ? (id === garage.current ? `${CARS[id].name}: driving` : `Drive the ${CARS[id].name}`)
      : `${CARS[id].name}: win it at Feeling Lucky, the billboard at T${lucky.number}`;
    if (!owned) b.setAttribute('aria-disabled', 'true');
    // Blur after the click, so the arrow keys go back to driving.
    b.addEventListener('click', () => {
      if (owned) selectCar(id);
      b.blur();
    });
    return b;
  }));
}

// The fastest a corner can be taken with the wheel at full lock, with a margin.
const cornerSpeed = (curve) => Math.min(topSpeed(), (0.92 * MAX_SPEED) / (Math.abs(curve) * spec.slide || 1e-6));

// When nobody drives, the autopilot gives a tour: it pulls into every bay,
// zooms onto the billboard for a while, then carries on. Once per lap.
const TOUR_STOP_MS = 5000;
// Moving the mouse while the tour waits at a billboard means someone is
// reading: the wait starts over.
addEventListener('pointermove', () => {
  if (tour.stop) tour.until = Math.max(tour.until, performance.now() + TOUR_STOP_MS);
});
const tour = { visited: new Set(), stop: null, until: 0 };

function nextBay(seg) {
  const n = track.segments.length;
  let best = null, bestDist = Infinity;
  for (const b of track.bays) {
    if (tour.visited.has(b.id)) continue;
    const d = (b.stop - seg.index + n) % n;
    if (d < bestDist && d < 260) { best = b; bestDist = d; }
  }
  return best && { bay: best, dist: bestDist };
}

// The autopilot drives like a person: the line it aims for moves gradually,
// the wheel turns at a human rate, throttle and brake are squeezed, not stamped.
const pilot = { aim: 0, steer: 0 };

function autopilot(seg, sp, now, dt) {
  const scroll = input.scroll();
  if (tour.stop) {
    pilot.aim = car.x;
    pilot.steer = approach(pilot.steer, 0, dt * 4);
    if (now < tour.until && scroll < 0.3) return { steer: pilot.steer, throttle: 0, brake: 1 };
    tour.visited.add(tour.stop.id);
    unfocus('tour');
    tour.stop = null;
  }
  const next = nextBay(seg);
  let aimX = 0;
  const cruise = reduceMotion && Math.abs(scroll) < 0.05 ? 0 : 0.95 + Math.max(0, scroll) * 0.05;
  // Brake in time for whatever is coming: v² = v_corner² + 2·a·distance.
  let target = topSpeed() * cruise;
  const n = track.segments.length;
  for (let i = 0; i < 160; i++) {
    const c = track.segments[(seg.index + i) % n].curve;
    if (Math.abs(c) < 0.3) continue;
    target = Math.min(target, Math.sqrt(cornerSpeed(c) ** 2 + 2 * (-BRAKING * 0.7) * i * SEG));
  }
  if (next && !reduceMotion) {
    const { bay, dist } = next;
    // Ease towards the middle of the bay and stop at its centre.
    // Hug the road edge on the way in, move over once the bay opens up, and
    // keep rolling until the car is right inside: steering needs some speed.
    const inside = seg.bay?.id === bay.id;
    if (dist < 160) aimX = bay.side * (inside ? 1 + BAY_W * 0.5 * seg.bay.open : 0.85);
    const floor = inside && Math.abs(aimX - car.x) > 0.15 ? 0.12 : 0.04;
    target = Math.min(target, Math.max(MAX_SPEED * floor, Math.sqrt(2 * (-BRAKING * 0.5) * dist * SEG)));
    if (dist < 3 || (seg.bay?.id === bay.id && dist > track.segments.length / 2)) {
      if (car.speed < MAX_SPEED * 0.05) {
        tour.stop = bay;
        tour.until = now + TOUR_STOP_MS;
        focus(bay, 'tour');
      }
      target = 0;
    }
  }
  pilot.aim = approach(pilot.aim, aimX, dt * 1.3);
  const want = clamp(sp * seg.curve * spec.slide + (pilot.aim - car.x) * 1.2, -1, 1);
  pilot.steer = approach(pilot.steer, want, dt * 4);
  const gap = target - car.speed;
  return {
    steer: pilot.steer,
    throttle: clamp(gap / (MAX_SPEED * 0.08), 0, 1),
    brake: target === 0 ? 0.6 : scroll < -0.3 ? 0.7 : clamp(-gap / (MAX_SPEED * 0.15), 0, 1),
  };
}

function update(dt, now) {
  input.update(dt);
  const seg = segAt(car.position + PLAYER_Z);
  const sp = car.speed / MAX_SPEED;
  const auto = input.idle();
  // Taking the wheel during a tour stop: the camera stays on the billboard
  // until you drive off, as if you had stopped there yourself.
  if (!auto && tour.stop) {
    tour.stop = null;
    if (view.source === 'tour') view.source = 'bay';
  }
  // A billboard you clicked holds the race until you zoom back out; any input does.
  if (view.bay && view.source === 'click') {
    const s = input.state;
    if (!auto && (s.throttle > 0.1 || s.brake > 0.1 || Math.abs(s.steer) > 0.3)) unfocus('click');
    return { seg, c: { steer: 0, throttle: 0, brake: 0 }, auto };
  }
  if (!auto) Object.assign(pilot, { aim: car.x, steer: input.state.steer });
  // Race time runs a bit quicker than the clock, so a lap doesn't drag.
  const t = dt * PACE;
  const c = auto ? autopilot(seg, sp, now, t) : input.state;

  const dx = t * 2 * sp;
  car.x += dx * c.steer;
  car.x -= dx * sp * seg.curve * spec.slide;

  if (c.throttle > 0) car.speed += (topSpeed() / spec.accel) * c.throttle * t;
  else car.speed += DECEL * t;
  car.speed += BRAKING * c.brake * t;
  // A bay widens the road on its side.
  const inBay = seg.bay && Math.sign(car.x) === seg.bay.side;
  const edge = inBay ? 1 + BAY_W * seg.bay.open : 1;
  if (Math.abs(car.x) > edge && car.speed > OFFROAD_LIMIT) car.speed += (seg.gravel ? GRAVEL_DECEL : OFFROAD_DECEL) * t;

  // Stopped in a bay: show its project. Driving off closes it.
  const kmh = sp * TOP_KMH;
  // Half a second standing still in a bay brings the camera onto its billboard,
  // also again after a touch of throttle; only Esc keeps that bay quiet.
  if (seg.bay?.id !== view.dismissed) view.dismissed = null;
  const still = !auto && inBay && Math.abs(car.x) > 1.05 && kmh < 3 && c.throttle < 0.1;
  view.still = still ? view.still + dt : 0;
  if (view.still > 0.5 && view.dismissed !== seg.bay.id) focus(seg.bay, 'bay');
  if (c.throttle > 0.1 || kmh > 20) unfocus('bay');

  const wall = (car.x < 0 ? barrier(seg, -1) : ARMCO).at - CAR_HALF;
  if (Math.abs(car.x) > wall) {
    car.x = Math.sign(car.x) * wall;
    car.speed *= 0.6;
    car.bump = 1;
  }
  car.speed = clamp(car.speed, 0, topSpeed());
  car.bump = Math.max(0, car.bump - dt * 3);

  const before = car.position;
  car.position = (car.position + t * car.speed) % track.length;
  skyOffset += t * 0.0012 * seg.curve * sp;

  lap.time += dt;
  if (car.position < before) {
    if (!auto && (lap.best === null || lap.time < lap.best)) saveBest((lap.best = lap.time));
    lap.last = lap.time;
    lap.time = 0;
    lap.n++;
    tour.visited.clear();
  }
  return { seg, c, auto };
}

// ---- Drawing ----------------------------------------------------------------

function project(p, camX, camY, camZ) {
  p.camera.x = (p.world.x || 0) - camX;
  p.camera.y = p.world.y - camY;
  p.camera.z = p.world.z - camZ;
  p.screen.scale = CAM_DEPTH / p.camera.z;
  p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * W / 2);
  p.screen.y = Math.round(H / 2 - p.screen.scale * p.camera.y * H / 2);
  p.screen.w = Math.round(p.screen.scale * ROAD_W * W / 2);
}

function quad(x1, y1, w1, x2, y2, w2, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x2 - w2, y2);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x1 + w1, y1);
  ctx.closePath();
  ctx.fill();
}

// Full-width fills reach this many screen widths past each edge, so the zoom
// never shows past the end of the world.
const SPAN = 3;

const fogAt = (n) => 1 - Math.exp(-((n / DRAW) ** 2) * 3.2);
const fogStyle = (a) => `rgba(${COLORS.fog.join(',')},${a.toFixed(3)})`;

function drawSky(playerY) {
  const sky = ctx.createLinearGradient(0, 0, 0, H / 2);
  sky.addColorStop(0, '#5f86b3');
  sky.addColorStop(0.55, '#b7c3cc');
  sky.addColorStop(1, '#f1cf9f');
  ctx.fillStyle = sky;
  ctx.fillRect(-SPAN * W, -SPAN * H, (2 * SPAN + 1) * W, (SPAN + 0.5) * H + 2);
  ctx.fillStyle = 'rgb(' + COLORS.fog.join(',') + ')';
  ctx.fillRect(-SPAN * W, H / 2, (2 * SPAN + 1) * W, (SPAN + 0.5) * H);

  // The higher the car, the lower the hills sit under the horizon.
  const lift = playerY / TOP;
  layer(art.alps, 0.3, H / 2 + lift * H * 0.01, H * 0.15);
  layer(art.hills, 0.8, H / 2 + H * 0.01 + lift * H * 0.04, H * 0.13);
}

function layer(img, speed, bottom, height) {
  const w = (img.width * height) / img.height;
  let x = -(((skyOffset * speed * W) % w) + w) % w - Math.ceil((SPAN * W) / w) * w;
  for (; x < (SPAN + 1) * W; x += w) ctx.drawImage(img, x, bottom - height, w + 1, height);
}

function drawRoad() {
  const base = segAt(car.position);
  const basePct = (car.position % SEG) / SEG;
  const player = segAt(car.position + PLAYER_Z);
  const playerPct = ((car.position + PLAYER_Z) % SEG) / SEG;
  const playerY = lerp(player.p1.world.y, player.p2.world.y, playerPct);

  drawSky(playerY);
  boardHits = [];

  let maxy = H;
  let x = 0;
  let dx = -(base.curve * basePct);
  const n = track.segments.length;

  for (let i = 0; i < DRAW; i++) {
    const s = track.segments[(base.index + i) % n];
    const looped = s.index < base.index ? track.length : 0;
    s.clip = maxy;
    s.fog = fogAt(i);
    project(s.p1, car.x * ROAD_W - x, playerY + CAM_H, car.position - looped);
    project(s.p2, car.x * ROAD_W - x - dx, playerY + CAM_H, car.position - looped);
    x += dx;
    dx += s.curve;
    s.visible = !(s.p1.camera.z <= CAM_DEPTH || s.p2.screen.y >= s.p1.screen.y || s.p2.screen.y >= maxy);
    if (!s.visible) continue;
    segment(s);
    maxy = s.p1.screen.y;
  }

  for (let i = DRAW - 1; i > 0; i--) {
    const s = track.segments[(base.index + i) % n];
    // Zoomed on a billboard, whatever stands between it and the camera fades away.
    const clear = view.bay && i < (view.bay.board - base.index + n) % n ? 1 - zoomEase : 1;
    for (const sp of s.sprites) if (clear > 0.02 || sp.big) sprite(s, sp, sp.big ? 1 : clear);
    if (s.visible) { wall(s, -1); wall(s, 1); }
  }
  return playerY;
}

function segment(s) {
  const { p1: { screen: a }, p2: { screen: b } } = s;
  const k = s.dark ? 1 : 0;

  ctx.fillStyle = COLORS.grass[k];
  ctx.fillRect(-SPAN * W, b.y, (2 * SPAN + 1) * W, a.y - b.y);
  // Gravel traps around the slow corners, out to the armco.
  if (s.gravel) quad(a.x, a.y, a.w * ARMCO.at, b.x, b.y, b.w * ARMCO.at, COLORS.gravel[k]);
  // Asphalt run-off with painted stripes around the fast ones.
  else if (Math.abs(s.curve) > 0.8) {
    quad(a.x, a.y, a.w * ARMCO.at, b.x, b.y, b.w * ARMCO.at, COLORS.runoff[k]);
    quad(a.x, a.y, a.w * 1.45, b.x, b.y, b.w * 1.45, COLORS.runoffStripe[k]);
  }
  if (s.bay) bay(s, a, b);

  quad(a.x, a.y, a.w, b.x, b.y, b.w, COLORS.road[k]);
  if (Math.abs(s.curve) > 0.8) {
    const r1 = a.w / 7, r2 = b.w / 7;
    quad(a.x - a.w - r1 / 2, a.y, r1 / 2, b.x - b.w - r2 / 2, b.y, r2 / 2, COLORS.kerb[k]);
    quad(a.x + a.w + r1 / 2, a.y, r1 / 2, b.x + b.w + r2 / 2, b.y, r2 / 2, COLORS.kerb[k]);
    // Sausage kerbs behind the chicane kerbs, to stop the cutting.
    if (s.radius <= 9) {
      const o1 = a.w + r1 + a.w / 30, o2 = b.w + r2 + b.w / 30;
      quad(a.x - o1, a.y, a.w / 30, b.x - o2, b.y, b.w / 30, COLORS.sausage);
      quad(a.x + o1, a.y, a.w / 30, b.x + o2, b.y, b.w / 30, COLORS.sausage);
    }
  } else {
    const l1 = a.w / 40, l2 = b.w / 40;
    quad(a.x - a.w + l1, a.y, l1, b.x - b.w + l2, b.y, l2, COLORS.line);
    quad(a.x + a.w - l1, a.y, l1, b.x + b.w - l2, b.y, l2, COLORS.line);
  }

  if (s.index < 3) {
    // Start line: a row of checks across the road.
    const cells = 16;
    for (let c = 0; c < cells; c++) {
      if ((c + s.index) % 2) continue;
      const t1 = -1 + (2 * c) / cells, t2 = -1 + (2 * (c + 1)) / cells;
      ctx.fillStyle = '#f2f0ea';
      ctx.beginPath();
      ctx.moveTo(a.x + a.w * t1, a.y);
      ctx.lineTo(b.x + b.w * t1, b.y);
      ctx.lineTo(b.x + b.w * t2, b.y);
      ctx.lineTo(a.x + a.w * t2, a.y);
      ctx.fill();
    }
  }

  if (s.fog > 0.01) {
    ctx.fillStyle = fogStyle(s.fog);
    ctx.fillRect(-SPAN * W, b.y, (2 * SPAN + 1) * W, a.y - b.y);
  }
}

// The bay: asphalt widening on one side, a dashed line where the track ends.
function bay(s, a, b) {
  const { side, open } = s.bay;
  const next = track.segments[(s.index + 1) % track.segments.length].bay;
  const open2 = next && next.id === s.bay.id ? next.open : 0;
  const k = s.dark ? 1 : 0;
  const ea = a.x + side * a.w, eb = b.x + side * b.w;
  const fa = a.x + side * a.w * (1 + BAY_W * open), fb = b.x + side * b.w * (1 + BAY_W * open2);
  ctx.fillStyle = COLORS.road[k];
  ctx.beginPath();
  ctx.moveTo(ea, a.y); ctx.lineTo(eb, b.y); ctx.lineTo(fb, b.y); ctx.lineTo(fa, a.y);
  ctx.fill();
  const l1 = a.w / 40, l2 = b.w / 40;
  // Dashed where you turn in, solid where the bay ends.
  if (!s.dark) quad(ea, a.y, l1, eb, b.y, l2, COLORS.line);
  quad(fa - side * l1, a.y, l1, fb - side * l2, b.y, l2, COLORS.line);
  // The stopping box, painted in the middle of the bay.
  const d = s.index - s.bay.stop;
  if (Math.abs(d) <= 6) {
    const c = 1.4, half = 0.36;   // where the tour actually stops
    for (const o of [c - half, c + half]) {
      const xa = a.x + side * a.w * o, xb = b.x + side * b.w * o;
      quad(xa, a.y, l1, xb, b.y, l2, COLORS.line);
    }
    if (Math.abs(d) === 6) {
      ctx.fillStyle = COLORS.line;
      ctx.beginPath();
      const p = [c - half, c + half].map((o) => [a.x + side * a.w * o, b.x + side * b.w * o]);
      ctx.moveTo(p[0][0], a.y); ctx.lineTo(p[0][1], b.y); ctx.lineTo(p[1][1], b.y); ctx.lineTo(p[1][0], a.y);
      ctx.fill();
    }
  }
}

// The pit wall runs along the left of the main straight; armco everywhere else.
const barrier = (s, side) => (side < 0 && s.straight ? PIT_WALL : ARMCO);

function wall(s, side) {
  const { at, h } = barrier(s, side);
  const a = s.p1.screen, b = s.p2.screen;
  if (s.p1.camera.z <= CAM_DEPTH) return;
  const xa = a.x + side * at * a.w, xb = b.x + side * at * b.w;
  const ha = h * a.scale * W / 2, hb = h * b.scale * W / 2;
  ctx.fillStyle = (barrier(s, side) === PIT_WALL ? COLORS.pitWall : COLORS.armco)[s.dark ? 1 : 0];
  ctx.beginPath();
  ctx.moveTo(xa, a.y);
  ctx.lineTo(xb, b.y);
  ctx.lineTo(xb, b.y - hb);
  ctx.lineTo(xa, a.y - ha);
  ctx.closePath();
  ctx.fill();
  if (s.fog > 0.01) { ctx.fillStyle = fogStyle(s.fog); ctx.fill(); }
}

function sprite(s, sp, alpha = 1) {
  const a = s.p1.screen;
  if (s.p1.camera.z <= CAM_DEPTH) return;
  const kind =
    sp.kind === 'board' ? art.bigBoards[sp.id]
    : sp.kind === 'hoarding' ? art.hoardings[sp.id]
    : art[sp.kind];
  const img = kind.img;
  const w = kind.w * a.scale * W / 2;
  const h = (w * img.height) / img.width;
  const x = a.x + sp.offset * a.w + (sp.center ? -w / 2 : sp.offset < 0 ? -w : 0);
  const y = a.y - h;
  const hidden = Math.max(0, y + h - s.clip);
  if (hidden >= h || w < 1) return;
  const srcH = img.height * (1 - hidden / h);
  // Fade into the haze; a fog rectangle would show around the transparent edges.
  ctx.globalAlpha = (1 - s.fog * 0.9) * alpha;
  ctx.drawImage(img, 0, 0, img.width, srcH, x, y, w, h - hidden);
  ctx.globalAlpha = 1;
  if (sp.big && w > 20) boardHits.push({ x, y, w, h: h - hidden, full: h, panel: kind.panel, bay: track.bays.find((b) => b.id === sp.id) });
}

function drawCar(c) {
  const img = carImage;
  const narrow = innerWidth <= 720;
  const w = narrow ? W * 0.5 : Math.min(W * 0.3, H * 0.62);
  const h = (w * img.height) / img.width;
  const sp = car.speed / MAX_SPEED;
  const shake = (Math.random() - 0.5) * (sp * 3 + car.bump * 14) * (W / 1400);
  const x = W / 2 + c.steer * w * 0.06;
  // On phones the dash and the project list sit along the bottom edge.
  const y = H - h * 0.55 - (narrow ? 180 * (W / innerWidth) : H * 0.03) + shake;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(c.steer * 0.05);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  if (c.brake > 0.1) {
    const k = w / img.width;
    ctx.fillStyle = '#ff2a1a';
    ctx.shadowColor = '#ff2a1a';
    ctx.shadowBlur = 30 * k * 3;
    for (const [lx, ly, lw, lh] of spec.lights) ctx.fillRect(-w / 2 + lx * k, -h / 2 + ly * k, lw * k, lh * k);
  }
  ctx.restore();
}

function drawMinimap() {
  const pts = track.map;
  const w = mini.width, h = mini.height;
  if (!w) return;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const pad = w * 0.1;
  const k = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / (maxZ - minZ));
  const ox = (w - (maxX - minX) * k) / 2, oz = (h - (maxZ - minZ) * k) / 2;
  const at = (p) => [ox + (p.x - minX) * k, oz + (maxZ - p.z) * k];

  mctx.clearRect(0, 0, w, h);
  mctx.lineCap = mctx.lineJoin = 'round';
  mctx.lineWidth = w * 0.03;
  mctx.strokeStyle = 'rgba(242,240,234,0.85)';
  mctx.beginPath();
  pts.forEach((p, i) => (i ? mctx.lineTo(...at(p)) : mctx.moveTo(...at(p))));
  mctx.closePath();
  mctx.stroke();

  const [cx, cz] = at(pts[Math.floor(car.position / SEG) % pts.length]);
  mctx.fillStyle = SPONSORS.simrig.accent;
  mctx.beginPath();
  mctx.arc(cx, cz, w * 0.045, 0, Math.PI * 2);
  mctx.fill();
}

// ---- HUD ----------------------------------------------------------------------

let shownCorner = null;
let cornerUntil = 0;

// The corner you are in, top centre; the ones named after a project link to it.
function cornerBanner(seg, now) {
  if (seg.corner) cornerUntil = now + 1500;
  const corner = seg.corner ?? (now < cornerUntil ? shownCorner : null);
  if (corner === shownCorner) return;
  shownCorner = corner;
  const box = $('corner');
  if (!corner) { box.classList.remove('on'); return; }
  const i = corner.id ? info[corner.id] : null;
  const link = box.querySelector('.sponsor');
  box.style.setProperty('--sponsor', corner.id ? SPONSORS[corner.id].accent : 'var(--ink)');
  box.querySelector('.number').textContent = `T${corner.number}`;
  box.querySelector('.name').textContent = corner.name;
  link.hidden = !i;
  if (i) {
    link.href = i.href;
    link.querySelector('.what').textContent = i.text;
    link.querySelector('.tech').textContent = i.tech;
  }
  box.classList.add('on');
}

// Each car's own gearbox (cars.js): shift up at its shift point, keep the
// revs high on the way down. The F1 has eight gears and a 15,000 limiter but
// shifts near 12,000, where the fuel-flow limit makes the power.
const gearbox = { gear: 0, rpm: 0 };

function shift(kmh, throttle) {
  const tops = spec.gears, last = tops.length - 1;
  let g = Math.min(gearbox.gear, last);
  if (g === 0 && (throttle > 0 || kmh > 1)) g = 1;
  if (g > 0 && g < last && kmh > tops[g]) g++;
  if (g > 1 && kmh < tops[g - 1] * 0.9) g--;
  if (kmh < 1 && throttle === 0) g = 0;
  gearbox.gear = g;
  gearbox.rpm = g ? clamp((spec.shift * kmh) / tops[g], spec.idle, spec.limiter) : spec.idle;
}

const revs = $('revs');
revs.innerHTML = '<i></i>'.repeat(15);
const fmt = (t) => (t === null ? '–:––.–' : `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`);
let hudTick = 0;

function hud(auto, c) {
  const kmh = (car.speed / MAX_SPEED) * TOP_KMH;
  shift(kmh, c.throttle);
  // Like the wheel's LEDs: they start a sixth below the shift point and are all lit at it.
  const from = spec.shift * 0.83;
  const lit = Math.round(clamp((gearbox.rpm - from) / (spec.shift * 0.98 - from), 0, 1) * 15);
  revs.classList.toggle('limit', gearbox.rpm >= spec.shift * 0.98 && gearbox.gear < spec.gears.length - 1);
  [...revs.children].forEach((led, i) => led.classList.toggle('on', i < lit));
  if (++hudTick % 4) return;
  $('gear').textContent = gearbox.gear || 'N';
  $('speed').textContent = Math.round(kmh);
  $('rpm').textContent = Math.round(gearbox.rpm / 100) * 100;
  $('lap').textContent = lap.n;
  $('lap-time').textContent = fmt(lap.time);
  $('lap-last').textContent = fmt(lap.last);
  $('lap-best').textContent = fmt(lap.best);
  const s = input.state;
  $('driver').textContent = auto ? 'Autopilot' : { keys: 'Keyboard', touch: 'Touch', pad: s.device, wheel: s.device }[s.source] ?? '';
  $('recal').hidden = !input.hasWheel();
}

function readBest() {
  try { return JSON.parse(localStorage.getItem('best-lap-langhe')); } catch { return null; }
}
function saveBest(t) {
  try { localStorage.setItem('best-lap-langhe', JSON.stringify(t)); } catch { /* private mode */ }
}

// ---- Loop -------------------------------------------------------------------

let last = performance.now();
// While the casino room is open the race stops altogether and the page under
// it is hidden, so the room has the machine to itself; a tour stop waits too.
let casinoSince = 0;

function frame(now) {
  if (luckyOpen()) {
    if (!casinoSince) {
      casinoSince = now;
      document.body.classList.add('casino');
      placeLuckyButton();
    }
    setTimeout(() => requestAnimationFrame(frame), 250);
    return;
  }
  if (casinoSince) {
    tour.until += now - casinoSince;
    casinoSince = 0;
    last = now;
    document.body.classList.remove('casino');
  }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const { seg, c, auto } = update(dt, now);
  const zoom = (zoomEase = zoomStep(dt));
  if (view.m) ctx.setTransform(view.m.S, 0, 0, view.m.S, view.m.tx, view.m.ty);
  drawRoad();
  if (zoom < 0.4) drawCar(c);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  placeLuckyButton();
  tourCountdown(now);
  drawMinimap();
  cornerBanner(seg, now);
  hud(auto, c);
  requestAnimationFrame(frame);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, step) => (v < t ? Math.min(t, v + step) : Math.max(t, v - step));
const lerp = (a, b, t) => a + (b - a) * t;

const fonts = ['800 100px "Barlow Condensed"', '700 40px "Barlow Condensed"', '500 40px Barlow', '800 40px Barlow',
  'italic 500 40px Barlow', '800 40px "JetBrains Mono"', '500 40px "JetBrains Mono"', '40px Limelight'];
Promise.all([loadBrandImages(), ...fonts.map((f) => document.fonts.load(f).catch(() => {}))]).then(([images]) => {
  art = makeArt(info, images);
  carImage = paintCar(garage.current);
  showGarage();
  // The billboards are painted with the page's text at once, then again with
  // the live numbers from GitHub when they come.
  for (const [id, board] of Object.entries(art.bigBoards))
    repoStats(info[id].href).then((stats) => stats && paintBoard(board.img, id, info[id], stats, images));
  if (innerWidth < 1100) document.querySelector('.sponsors').open = false;
  resize();
  document.body.classList.add('ready');
  requestAnimationFrame(frame);
});
