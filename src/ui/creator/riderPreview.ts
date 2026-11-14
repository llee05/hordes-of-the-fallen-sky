import type { CharacterClassId, CharacterGender } from '../../shared/characterProfile';

interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

export interface MotionAtlas {
  frames: Record<string, AtlasFrame>;
}

interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
  sx: number;
  sy: number;
}

export interface ClassMotionData {
  move: FrameRect[];
  attack: FrameRect[];
}

export interface RiderPreviewState {
  classId?: CharacterClassId;
  gender?: CharacterGender;
  mode: 'move' | 'attack';
  modeTime: number;
  runCycles: number;
}

interface MotionAsset {
  atlas: MotionAtlas;
  image: HTMLImageElement;
}

const CLASS_IDS: readonly CharacterClassId[] = [
  'mounted-archer',
  'lancer',
  'iron-pagoda',
  'spirit-caller',
];

let cachedMotionAsset: Promise<MotionAsset> | undefined;

export function createRiderPreviewState(): RiderPreviewState {
  return { mode: 'move', modeTime: 0, runCycles: 0 };
}

function frameRect(frame: AtlasFrame): FrameRect {
  return {
    ...frame.frame,
    sx: frame.spriteSourceSize.x,
    sy: frame.spriteSourceSize.y,
  };
}

/** Resolve registered motion frames from the shipped atlas instead of duplicating coordinates. */
export function classMotionFromAtlas(
  atlas: MotionAtlas,
  classId: CharacterClassId,
): ClassMotionData {
  const collect = (kind: 'move' | 'attack', count: number): FrameRect[] =>
    Array.from({ length: count }, (_, index) => {
      const frame = atlas.frames[`${classId}-${kind}-${index}`];
      if (!frame || frame.sourceSize.w !== 256 || frame.sourceSize.h !== 360) {
        throw new Error(`Invalid creator rider frame: ${classId}-${kind}-${index}`);
      }
      return frameRect(frame);
    });
  return { move: collect('move', 4), attack: collect('attack', 2) };
}

async function loadMotionAsset(_gender: CharacterGender): Promise<MotionAsset> {
  // Both genders use the shared atlas until the separately commissioned female atlas lands.
  if (!cachedMotionAsset) {
    cachedMotionAsset = (async () => {
      const response = await fetch(`${import.meta.env.BASE_URL}art/steppe-classes-motion.json`);
      if (!response.ok) throw new Error(`Unable to load creator rider atlas (${response.status})`);
      const atlas = (await response.json()) as MotionAtlas;
      for (const classId of CLASS_IDS) classMotionFromAtlas(atlas, classId);
      const image = new Image();
      image.src = `${import.meta.env.BASE_URL}art/steppe-classes-motion.png`;
      return { atlas, image };
    })();
  }
  return cachedMotionAsset;
}

/** Animates the selected rider on horseback inside the creator arched preview frame. */
export function startRiderPreview(
  canvas: HTMLCanvasElement,
  classId: CharacterClassId,
  gender: CharacterGender,
  state: RiderPreviewState = createRiderPreviewState(),
): () => void {
  if (typeof window === 'undefined' || !canvas.getContext) return () => {};

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const selectionChanged =
    state.classId !== undefined && (state.classId !== classId || state.gender !== gender);
  state.classId = classId;
  state.gender = gender;
  if (selectionChanged) {
    state.mode = 'attack';
    state.modeTime = 0;
    state.runCycles = 0;
  }

  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  ctx.setTransform(canvas.width / 512, 0, 0, canvas.height / 720, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = true;
  let rafId = 0;
  let lastTime = 0;
  let motion: ClassMotionData | undefined;
  let image: HTMLImageElement | undefined;

  const renderFrame = (frame: FrameRect) => {
    ctx.clearRect(0, 0, 512, 720);
    ctx.fillStyle = 'rgba(74, 50, 25, 0.28)';
    ctx.beginPath();
    ctx.ellipse(256, 595, 138, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!image?.complete || image.naturalWidth <= 0) return;
    const scale = 1.84;
    const offsetX = (512 - 256 * scale) / 2;
    const offsetY = -8;
    ctx.drawImage(
      image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      offsetX + frame.sx * scale,
      offsetY + frame.sy * scale,
      frame.w * scale,
      frame.h * scale,
    );
  };

  const currentFrame = (): FrameRect => {
    const readyMotion = motion!;
    if (preference.matches) return readyMotion.move[0]!;
    if (state.mode === 'attack') {
      return state.modeTime < 0.22
        ? (readyMotion.attack[0] ?? readyMotion.move[0]!)
        : (readyMotion.attack[1] ?? readyMotion.move[0]!);
    }
    const moveIndex = Math.max(0, Math.min(3, Math.floor((state.modeTime / 0.16) % 4)));
    return readyMotion.move[moveIndex] ?? readyMotion.move[0]!;
  };

  const loop = (now: number) => {
    if (!active || !motion) return;
    if (!canvas.isConnected) {
      active = false;
      return;
    }
    if (preference.matches) {
      renderFrame(motion.move[0]!);
      return;
    }

    const dt = lastTime > 0 ? Math.max(0, Math.min(0.1, (now - lastTime) / 1000)) : 0;
    lastTime = now;
    state.modeTime += dt;
    if (state.mode === 'move') {
      const completedCycles = Math.floor(state.modeTime / (0.16 * 4));
      if (completedCycles > state.runCycles) {
        state.runCycles = completedCycles;
        if (state.runCycles >= 4) {
          state.mode = 'attack';
          state.modeTime = 0;
          state.runCycles = 0;
        }
      }
    } else if (state.modeTime >= 0.5) {
      state.mode = 'move';
      state.modeTime = 0;
    }
    renderFrame(currentFrame());
    rafId = requestAnimationFrame(loop);
  };

  const restartForPreference = () => {
    cancelAnimationFrame(rafId);
    lastTime = 0;
    if (!active || !motion) return;
    if (preference.matches) renderFrame(motion.move[0]!);
    else rafId = requestAnimationFrame(loop);
  };
  preference.addEventListener('change', restartForPreference);

  void loadMotionAsset(gender)
    .then((asset) => {
      if (!active) return;
      motion = classMotionFromAtlas(asset.atlas, classId);
      image = asset.image;
      const redraw = () =>
        motion && renderFrame(preference.matches ? motion.move[0]! : currentFrame());
      if (!image.complete) image.addEventListener('load', redraw, { once: true });
      redraw();
      if (!preference.matches) rafId = requestAnimationFrame(loop);
    })
    .catch(() => {
      // A missing local asset leaves the decorative preview blank without blocking the form.
    });

  return () => {
    active = false;
    cancelAnimationFrame(rafId);
    preference.removeEventListener('change', restartForPreference);
  };
}
