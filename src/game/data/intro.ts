/** Canonical short telling from lore.md; paintings resolve locally in offline Electron. */
export const INTRO_SLIDES = [
  {
    chapter: 'I · HEAVEN AND EARTH',
    title: 'Beneath Eternal Heaven.',
    text: 'Tengri, Eternal Heaven, was the sky over our heads. Etügen, Mother Earth, was the grass under our hooves. We lived between them, following the herds, greeting each spring before we drank, and speaking the names of those who rode before us.',
    image: 'intro-steppe.png',
  },
  {
    chapter: 'II · THE IRON VOW',
    title: 'A vow that broke the world.',
    text: "The rulers of the Last Court wanted Heaven's favor chained to their throne forever. They raised a standard of iron and spoke their vow, and at its last word the sky split open. We call that night the Sundering.",
    image: 'intro-iron-vow.png',
  },
  {
    chapter: 'III · THE UNRETURNED',
    title: 'The unreturned ride.',
    text: 'Through the wound came riders who did not breathe, wolves with no warmth, and voices that borrowed the names of our dead. Snow drifted across summer rivers. Cities fell. The roads between the living and our ancestors were lost.',
    image: 'intro-fallen-sky.png',
  },
  {
    chapter: 'IV · THE LIVING HEARTH',
    title: 'Keep the hearth alive.',
    text: 'Eight of us remained, with three horses and a length of blue cloth for a banner. Our hearthkeeper carried the last embers. You took up the bow. We meant to gather the scattered families and carry the hearth somewhere the darkness could not follow.',
    image: 'intro-hearth.png',
  },
  {
    chapter: 'V · THE HEART OF THE STEPPE',
    title: 'A road beneath the sky.',
    text: 'East, past the broken country, the elders remember a sheltered valley at the Heart of the Steppe, where the sky has not torn. Lead us to the sacred mountain. Guard the wagons until the passage opens. Let our children see another dawn.',
    image: 'intro-caravan.png',
  },
] as const;

export function introImageUrl(image: string): string {
  return `${import.meta.env.BASE_URL}art/${image}`;
}
