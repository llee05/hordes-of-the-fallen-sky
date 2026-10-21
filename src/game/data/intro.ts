/** Canonical short telling from lore.md; paintings resolve locally in offline Electron. */
export const INTRO_SLIDES = [
  {
    chapter: 'I · HEAVEN AND EARTH',
    title: 'Beneath Eternal Heaven.',
    text: 'Above us was Tengri, Eternal Heaven. Beneath our hooves, Etügen, Mother Earth. We lived between them: tending the herds, honoring the land, remembering those who rode before us.',
    image: 'intro-steppe.png',
  },
  {
    chapter: 'II · THE IRON VOW',
    title: 'A vow that broke the world.',
    text: "The rulers of the Last Court raised an iron standard to bind Heaven's favor to their throne. When their vow was spoken, the sky split. We named that night the Sundering.",
    image: 'intro-iron-vow.png',
  },
  {
    chapter: 'III · THE UNRETURNED',
    title: 'The unreturned ride.',
    text: 'Through the wound came riders without breath, wolves without warmth, and voices wearing the names of our dead. Winter crossed into summer. Cities fell. The roads between the living and the ancestors were lost.',
    image: 'intro-fallen-sky.png',
  },
  {
    chapter: 'IV · THE LIVING HEARTH',
    title: 'Keep the hearth alive.',
    text: 'Eight of us remained beneath a blue banner. Our hearthkeeper carried the last embers; you took up the bow. We would gather the scattered families and carry our hearth where the darkness could not follow.',
    image: 'intro-hearth.png',
  },
  {
    chapter: 'V · THE HEART OF THE STEPPE',
    title: 'A road beneath the sky.',
    text: 'East, at the Heart of the Steppe, the elders remember a sheltered valley beneath an unbroken sky. Lead us to the sacred mountain. Guard the wagons until the passage opens. Let our children see another dawn.',
    image: 'intro-caravan.png',
  },
] as const;

export function introImageUrl(image: string): string {
  return `${import.meta.env.BASE_URL}art/${image}`;
}
