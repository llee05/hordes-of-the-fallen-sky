export interface AudioAsset {
  file: string;
  status: 'ready' | 'needed';
  description: string;
}
const clip = (file: string, description: string): AudioAsset => ({
  file,
  description,
  status: 'ready',
});
const needed = (file: string, description: string): AudioAsset => ({
  file,
  description,
  status: 'needed',
});
/** All paths are bundled, local assets. Pending recordings are never requested or synthesized. */
export const AUDIO_ASSETS = {
  bow1: clip('bow-01.ogg', 'Recorded Scythian recurve release, take 1'),
  bow2: clip('bow-02.ogg', 'Recorded recurve release, take 2'),
  bow3: clip('bow-03.ogg', 'Recorded recurve release, take 3'),
  bow4: clip('bow-04.ogg', 'Recorded recurve release, take 4'),
  feather: clip('feather-01.ogg', 'Real arrow fletching handling'),
  body1: clip('body-01.ogg', 'Cut fruit Foley, dry body contact'),
  body2: clip('body-02.ogg', 'Cut fruit Foley, contact 2'),
  body3: clip('body-03.ogg', 'Cut fruit Foley, contact 3'),
  wood1: clip('wood-01.ogg', 'Wooden bowl and spoon contact'),
  wood2: clip('wood-02.ogg', 'Wood contact 2'),
  wood3: clip('wood-03.ogg', 'Wood contact 3'),
  leather1: clip('leather-01.ogg', 'Leather quiver flex'),
  leather2: clip('leather-02.ogg', 'Leather flex 2'),
  paper1: clip('paper-01.ogg', 'Book page Foley'),
  paper2: clip('paper-02.ogg', 'Book page Foley 2'),
  twig1: clip('twig-01.ogg', 'Breaking real twigs'),
  twig2: clip('twig-02.ogg', 'Breaking twigs 2'),
  metal1: clip('metal-01.ogg', 'Hammer on metal, restrained contact'),
  metal2: clip('metal-02.ogg', 'Metal contact 2'),
  creak: clip('creak-01.ogg', 'Recorded floor timber creak; cart proxy'),
  woodChime: clip('wood-chime-01.ogg', 'Recorded wooden chime rattle'),
  drum1: clip('frame-drum-01.ogg', 'Real frame-drum strike'),
  drum2: clip('frame-drum-02.ogg', 'Frame-drum strike 2'),
  drum3: clip('frame-drum-03.ogg', 'Frame-drum strike 3'),
  hoof1: clip('hoof-01.ogg', 'Real horse contact on hard dry earth'),
  hoof2: clip('hoof-02.ogg', 'Horse contact 2'),
  hoof3: clip('hoof-03.ogg', 'Horse contact 3'),
  hoof4: clip('hoof-04.ogg', 'Horse contact 4'),
  hoof5: clip('hoof-05.ogg', 'Horse contact 5'),
  wind1: clip('wind-01.ogg', '32-second open-field wind recording'),
  wind2: clip('wind-02.ogg', 'Different 32-second wind passage'),
  wind3: clip('wind-03.ogg', 'Different 32-second wind passage'),
  river1: clip('river-01.ogg', '24-second flowing water field recording'),
  river2: clip('river-02.ogg', 'Different flowing water passage'),
  fire1: clip('fire-01.ogg', '24-second quiet campfire recording'),
  fire2: clip('fire-02.ogg', 'Different campfire passage'),
  horseBreath: needed('horse-breath.ogg', 'Close horse breathing/snorts without human speech'),
  horseVoice: needed('horse-whinny.ogg', 'Occasional distant horse vocalisation'),
  hoofGrass: needed('hoof-grass.ogg', 'Horse hoof contacts on grass, multiple takes'),
  hoofSnow: needed('hoof-snow.ogg', 'Horse contacts in snow and scree'),
  fabric: needed('felt-banner-flutter.ogg', 'Felt and banner flutter without microphone wind'),
  grass: needed('steppe-grass-rustle.ogg', 'Close dry grass and sage rustling'),
  birds: needed('steppe-distant-wildlife.ogg', 'Geographically appropriate distant wildlife'),
  stone: needed('stone-arrow-impact.ogg', 'Dedicated stone/rubble arrow impacts'),
  rope: needed('rope-lashing.ogg', 'Rope tightening and leather lashings'),
  breath: needed('spirit-breath.ogg', 'Performed nonverbal breath, performer release required'),
  thunder: needed('distant-thunder.ogg', 'Natural rolling thunder with restrained attack'),
  musicSteppe: needed('music-steppe.ogg', 'Commissioned recorded morin khuur exploration stem'),
  musicBattle: needed('music-battle.ogg', 'Recorded frame-drum and bowed-string combat stem'),
  musicCamp: needed(
    'music-camp.ogg',
    'Sparse recorded camp music; optional licensed vocal textures',
  ),
} as const satisfies Record<string, AudioAsset>;
export type AudioAssetId = keyof typeof AUDIO_ASSETS;
export function audioAssetUrl(asset: AudioAsset): string {
  return `${import.meta.env.BASE_URL}audio/${asset.file}`;
}
