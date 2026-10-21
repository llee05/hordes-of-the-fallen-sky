/** Local, full-bleed story paintings; BASE_URL also resolves in offline Electron. */
export const INTRO_SLIDES = [
  {
    chapter: 'I · THE LIVING STEPPE',
    title: 'When the grass was gold.',
    text: 'We measured our wealth in horses, our home in the circle of our gers. Beneath the endless blue sky, the grass always grew again.',
    image: 'intro-steppe.png',
  },
  {
    chapter: 'II · THE FALLEN SKY',
    title: 'Then heaven fell silent.',
    text: 'The cities fell. A cold light split the clouds, and things without breath rode out of the dark. No wall could keep the calamity away.',
    image: 'intro-fallen-sky.png',
  },
  {
    chapter: 'III · THE BLUE BANNER',
    title: 'Carry your people home.',
    text: 'Now a small clan rides toward the sacred mountain, where a passage may yet open. Gather your people. Guard the wagons. Carry the blue banner into another dawn.',
    image: 'intro-caravan.png',
  },
] as const;

export function introImageUrl(image: string): string {
  return `${import.meta.env.BASE_URL}art/${image}`;
}
