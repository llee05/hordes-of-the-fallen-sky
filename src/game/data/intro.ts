/** Canonical short telling from lore.md; paintings resolve locally in offline Electron. */
export type IntroSceneId = 'steppe' | 'iron-vow' | 'fallen-sky' | 'hearth' | 'caravan';
export type IntroCameraPan = 'pan-east' | 'rise-throne' | 'surge-west' | 'pull-hearth' | 'pan-pass';

export interface IntroSlide {
  readonly id: IntroSceneId;
  readonly chapter: string;
  readonly title: string;
  readonly text: string;
  readonly image: string;
  readonly backgroundImage: string;
  readonly foregroundImage: string;
  readonly camera: IntroCameraPan;
  readonly focalPoint: readonly [number, number];
}

export const INTRO_SLIDES: readonly IntroSlide[] = [
  {
    id: 'steppe',
    chapter: 'I · HEAVEN AND EARTH',
    title: 'Beneath Eternal Heaven.',
    text: 'Tengri, Eternal Heaven, was the sky over our heads. Etügen, Mother Earth, was the grass under our hooves. We lived between them, following the herds, greeting each spring before we drank, and speaking the names of those who rode before us.',
    image: 'intro-steppe.png',
    backgroundImage: 'intro-steppe-background.webp',
    foregroundImage: 'intro-steppe-foreground.webp',
    camera: 'pan-east',
    focalPoint: [50, 42],
  },
  {
    id: 'iron-vow',
    chapter: 'II · THE IRON VOW',
    title: 'A vow that broke the world.',
    text: "The rulers of the Last Court wanted Heaven's favor chained to their throne forever. They raised a standard of iron and spoke their vow, and at its last word the sky split open. We call that night the Sundering.",
    image: 'intro-iron-vow.png',
    backgroundImage: 'intro-iron-vow-background.webp',
    foregroundImage: 'intro-iron-vow-foreground.webp',
    camera: 'rise-throne',
    focalPoint: [50, 38],
  },
  {
    id: 'fallen-sky',
    chapter: 'III · THE UNRETURNED',
    title: 'The unreturned ride.',
    text: 'Through the wound came riders who did not breathe, wolves with no warmth, and voices that borrowed the names of our dead. Snow drifted across summer rivers. Cities fell. The roads between the living and our ancestors were lost.',
    image: 'intro-fallen-sky.png',
    backgroundImage: 'intro-fallen-sky-background.webp',
    foregroundImage: 'intro-fallen-sky-foreground.webp',
    camera: 'surge-west',
    focalPoint: [48, 40],
  },
  {
    id: 'hearth',
    chapter: 'IV · THE LIVING HEARTH',
    title: 'Keep the hearth alive.',
    text: 'Eight of us remained, with three horses and a length of blue cloth for a banner. Our hearthkeeper carried the last embers. You took up the bow. We meant to gather the scattered families and carry the hearth somewhere the darkness could not follow.',
    image: 'intro-hearth.png',
    backgroundImage: 'intro-hearth-background.webp',
    foregroundImage: 'intro-hearth-foreground.webp',
    camera: 'pull-hearth',
    focalPoint: [50, 44],
  },
  {
    id: 'caravan',
    chapter: 'V · THE HEART OF THE STEPPE',
    title: 'A road beneath the sky.',
    text: 'East, past the broken country, the elders remember a sheltered valley at the Heart of the Steppe, where the sky has not torn. Lead us to the sacred mountain. Guard the wagons until the passage opens. Let our children see another dawn.',
    image: 'intro-caravan.png',
    backgroundImage: 'intro-caravan-background.webp',
    foregroundImage: 'intro-caravan-foreground.webp',
    camera: 'pan-pass',
    focalPoint: [52, 40],
  },
] as const;

export function introImageUrl(image: string): string {
  return `${import.meta.env.BASE_URL}art/${image}`;
}
