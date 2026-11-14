import type { CharacterClassId, CharacterGender } from '../../shared/characterProfile';

interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
  sx: number;
  sy: number;
}

interface ClassMotionData {
  move: FrameRect[];
  attack: FrameRect[];
}

/** Pre-extracted atlas coordinates for the four playable mounted classes from steppe-classes-motion.json. */
const CLASS_FRAMES: Record<CharacterClassId, ClassMotionData> = {
  'mounted-archer': {
    move: [
      { x: 10, y: 13, w: 239, h: 242, sx: 10, sy: 82 },
      { x: 265, y: 17, w: 239, h: 238, sx: 9, sy: 86 },
      { x: 518, y: 15, w: 239, h: 240, sx: 6, sy: 84 },
      { x: 771, y: 10, w: 246, h: 245, sx: 3, sy: 79 },
    ],
    attack: [
      { x: 1027, y: 1, w: 242, h: 254, sx: 3, sy: 70 },
      { x: 1283, y: 0, w: 244, h: 255, sx: 3, sy: 69 },
    ],
  },
  lancer: {
    move: [
      { x: 11, y: 257, w: 225, h: 235, sx: 11, sy: 89 },
      { x: 274, y: 261, w: 212, h: 236, sx: 18, sy: 88 },
      { x: 522, y: 259, w: 246, h: 231, sx: 10, sy: 93 },
      { x: 768, y: 264, w: 233, h: 228, sx: 0, sy: 96 },
    ],
    attack: [
      { x: 1037, y: 258, w: 212, h: 238, sx: 13, sy: 86 },
      { x: 1287, y: 274, w: 242, h: 220, sx: 7, sy: 104 },
    ],
  },
  'iron-pagoda': {
    move: [
      { x: 10, y: 519, w: 223, h: 233, sx: 10, sy: 91 },
      { x: 274, y: 522, w: 215, h: 234, sx: 18, sy: 90 },
      { x: 521, y: 523, w: 222, h: 229, sx: 9, sy: 95 },
      { x: 768, y: 524, w: 234, h: 227, sx: 0, sy: 97 },
    ],
    attack: [
      { x: 1037, y: 512, w: 219, h: 246, sx: 13, sy: 78 },
      { x: 1291, y: 527, w: 238, h: 230, sx: 11, sy: 94 },
    ],
  },
  'spirit-caller': {
    move: [
      { x: 9, y: 768, w: 235, h: 235, sx: 9, sy: 89 },
      { x: 266, y: 779, w: 229, h: 227, sx: 10, sy: 97 },
      { x: 518, y: 776, w: 230, h: 229, sx: 6, sy: 95 },
      { x: 768, y: 777, w: 238, h: 226, sx: 0, sy: 98 },
    ],
    attack: [
      { x: 1027, y: 768, w: 228, h: 237, sx: 3, sy: 87 },
      { x: 1283, y: 795, w: 246, h: 210, sx: 3, sy: 114 },
    ],
  },
};

let cachedMotionImage: HTMLImageElement | null = null;

function getMotionImage(): HTMLImageElement {
  if (!cachedMotionImage) {
    cachedMotionImage = new Image();
    cachedMotionImage.src = `${import.meta.env.BASE_URL}art/steppe-classes-motion.png`;
  }
  return cachedMotionImage;
}

/** Animates the selected rider on horseback inside the creator arched preview frame. */
export function startRiderPreview(
  canvas: HTMLCanvasElement,
  classId: CharacterClassId,
  _gender: CharacterGender,
): () => void {
  if (typeof window === 'undefined' || !canvas.getContext) {
    return () => {};
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const img = getMotionImage();
  const motion = CLASS_FRAMES[classId] ?? CLASS_FRAMES['mounted-archer'];

  let active = true;
  let rafId = 0;
  let lastTime = 0;
  let elapsed = 0;
  let mode: 'move' | 'attack' = 'move';
  let modeTime = 0;
  let runCycles = 0;

  const renderFrame = (frame?: FrameRect) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ground shadow beneath the horse
    ctx.fillStyle = 'rgba(74, 50, 25, 0.28)';
    ctx.beginPath();
    ctx.ellipse(256, 635, 150, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    const f = frame ?? motion.move[0]!;
    // Draw sprite scaled 2x to match 512x720 canvas
    if (img.complete && img.naturalWidth > 0 && f) {
      ctx.drawImage(img, f.x, f.y, f.w, f.h, f.sx * 2, f.sy * 2, f.w * 2, f.h * 2);
    }
  };

  const drawInitial = () => {
    renderFrame(motion.move[0]!);
  };

  if (!img.complete) {
    img.addEventListener('load', drawInitial, { once: true });
  } else {
    drawInitial();
  }

  const loop = (now: number) => {
    if (!active) return;
    if (!canvas.isConnected) {
      active = false;
      return;
    }

    const dt = lastTime > 0 ? Math.max(0, Math.min(0.1, (now - lastTime) / 1000)) : 0;
    lastTime = now;
    elapsed += dt;
    modeTime = Math.max(0, modeTime + dt);

    let currentFrame: FrameRect = motion.move[0]!;

    if (mode === 'move') {
      // 4 move frames at 0.16s each = 0.64s per cycle
      const frameDuration = 0.16;
      const moveIndex = Math.max(0, Math.min(3, Math.floor((modeTime / frameDuration) % 4)));
      currentFrame = motion.move[moveIndex] ?? motion.move[0]!;

      // Track completed gallop cycles
      const completedCycles = Math.floor(modeTime / (frameDuration * 4));
      if (completedCycles > runCycles) {
        runCycles = completedCycles;
        // After 4 gallop cycles, perform a weapon attack
        if (runCycles >= 4) {
          mode = 'attack';
          modeTime = 0;
          runCycles = 0;
        }
      }
    } else {
      // Attack animation: windup (0.22s) -> release (0.28s) -> back to move
      if (modeTime < 0.22) {
        currentFrame = motion.attack[0] ?? motion.move[0]!;
      } else if (modeTime < 0.5) {
        currentFrame = motion.attack[1] ?? motion.move[0]!;
      } else {
        mode = 'move';
        modeTime = 0;
        currentFrame = motion.move[0]!;
      }
    }

    renderFrame(currentFrame);
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);

  return () => {
    active = false;
    cancelAnimationFrame(rafId);
  };
}
