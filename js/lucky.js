// Feeling Lucky, the casino room from the feeling-lucky project, loaded from
// the CDN the first time someone presses the button on its billboard. The
// prize is a faster car: the room's small win is the Superturismo, the big
// one the GT3, the jackpot the F1.
import { CARS, drawCar } from './cars.js';

const LIBRARY = 'https://cdn.jsdelivr.net/npm/@adiakys/feeling-lucky@0.3.0/dist/feeling-lucky.js';
let lucky = null;

// The room lives in a <feeling-lucky> element while it is open.
export const luckyOpen = () => !!document.querySelector('feeling-lucky');

export async function openLucky(from, onCar) {
  if (!lucky) {
    const { createFeelingLucky } = await import(LIBRARY);
    lucky = createFeelingLucky({
      locale: 'en',
      messages: { en: { cert: { claim: 'Drive it now', claimed: 'In your garage' } } },
      prizes: [{
        id: 'car',
        name: 'A faster car',
        icon: drawCar('gt3').toDataURL(),
        color: '#d4af5a',
        variants: [variant('small', 'superturismo', 'ST'), variant('big', 'gt3', 'GT3'), variant('jackpot', 'f1', 'F1')],
      }],
      onWin: (win) => onCar(win.variant.car),
      onClaim: async () => lucky.close(),
    });
  }
  lucky.open({ from });
}

function variant(tier, car, short) {
  const c = CARS[car];
  return {
    tier,
    label: c.name,
    short,
    car,
    details: [
      { label: 'Top speed', value: `${c.top} km/h` },
      { label: 'Gears', value: String(c.gears.length - 1) },
    ],
  };
}
