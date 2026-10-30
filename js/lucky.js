// Feeling Lucky, the casino room from the feeling-lucky project, loaded from
// the CDN the first time someone presses the button on its billboard. Its
// prizes are the cars you haven't won yet, each with its own chip; once the
// garage is full, fuel. The odds are generous: about four plays in ten win.
import { CARS, RANK, drawCar } from './cars.js';

const LIBRARY = 'https://cdn.jsdelivr.net/npm/@adiakys/feeling-lucky@0.4.0/dist/feeling-lucky.js';
const CHIP_COLORS = { superturismo: '#b8141f', gt3: '#1d3f8f', f1: '#ff5a1f' };
let lucky = null;

// The room lives in a <feeling-lucky> element while it is open.
export const luckyOpen = () => !!document.querySelector('feeling-lucky');

// `owned()` lists the cars in the garage; `onCar(id)` hands over a car won.
export async function openLucky(from, { owned, onCar }) {
  if (!lucky) {
    const { createFeelingLucky } = await import(LIBRARY);
    const prizes = () => {
      const locked = RANK.filter((id) => !owned().includes(id));
      return locked.length ? locked.map(carPrize) : [FUEL];
    };
    lucky = createFeelingLucky({
      locale: 'en',
      odds: { small: 1 / 4, big: 1 / 10, jackpot: 1 / 30 },
      messages: { en: { cert: { claim: 'Drive it now', claimed: 'In your garage' } } },
      prizes,
      onWin: (win) => {
        if (!CARS[win.prize.id]) return;
        onCar(win.prize.id);
        // The car just won leaves the prizes for the next play.
        lucky.update({ prizes });
      },
      onClaim: async () => lucky.close(),
    });
  }
  lucky.open({ from });
}

// A car is won whole, whatever the tier: every tier shows it on the boards.
function carPrize(id) {
  const car = CARS[id];
  const variant = (tier) => ({
    tier,
    label: car.name,
    short: car.short,
    details: [
      { label: 'Top speed', value: `${car.top} km/h` },
      { label: 'Gears', value: String(car.gears.length - 1) },
    ],
  });
  return {
    id,
    name: car.name,
    icon: drawCar(id).toDataURL(),
    color: CHIP_COLORS[id],
    variants: ['small', 'big', 'jackpot'].map(variant),
  };
}

// For a full garage: a jerry can, in three sizes.
const FUEL = {
  id: 'fuel',
  name: 'Fuel',
  icon: jerryCan(),
  color: '#e8c766',
  variants: [
    { tier: 'small', label: '10 litres', short: '10 L' },
    { tier: 'big', label: '40 litres', short: '40 L' },
    { tier: 'jackpot', label: 'A full tank', short: 'FULL' },
  ],
};

function jerryCan() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c8202a';
  g.beginPath(); g.roundRect(48, 64, 160, 176, 18); g.fill();
  // The handle along the top, with its two grips cut out.
  g.fillStyle = '#8f141b';
  g.beginPath(); g.roundRect(64, 40, 96, 40, 12); g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (const x of [76, 120]) { g.beginPath(); g.roundRect(x, 50, 30, 18, 6); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  // The spout and its cap.
  g.fillStyle = '#e8c766';
  g.beginPath(); g.roundRect(172, 30, 30, 46, 6); g.fill();
  // The cross pressed into the side.
  g.strokeStyle = '#a3171f';
  g.lineWidth = 10;
  g.beginPath(); g.moveTo(70, 90); g.lineTo(186, 216); g.moveTo(186, 90); g.lineTo(70, 216); g.stroke();
  return c.toDataURL();
}
