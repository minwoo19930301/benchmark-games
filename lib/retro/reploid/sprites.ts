import type { ReploidSimulation } from './simulation.ts';

type Crop = readonly [number, number, number, number];
type Pose =
  | 'rest'
  | 'walk'
  | 'jump'
  | 'shoot'
  | 'hurt'
  | 'wall'
  | 'dash'
  | 'saber';
// Unchanged Capcom artwork mirrored by wabtytsai/Fakeman-X4 and surcae/MegaMan-X4.
// Per-file source URLs, pinned commits and SHA-256: public/assets/reploid/SOURCES.json.
// Cropping removes transparent padding at draw time; source files are untouched.
const xCrops: Partial<Record<Pose, readonly Crop[]>> = {
  rest: [
    [0, 0, 35, 46],
    [0, 1, 35, 45],
    [0, 2, 35, 44],
    [0, 2, 35, 44],
    [0, 2, 35, 44],
    [0, 2, 35, 44],
    [0, 2, 35, 44],
    [0, 1, 35, 45],
  ],
  walk: [
    [8, 1, 32, 46],
    [4, 1, 40, 44],
    [0, 2, 48, 43],
    [1, 3, 48, 43],
    [4, 2, 39, 44],
    [10, 1, 30, 45],
    [14, 1, 27, 46],
    [9, 1, 35, 45],
    [5, 1, 40, 45],
    [4, 2, 42, 44],
    [4, 3, 42, 44],
    [6, 2, 38, 45],
    [11, 1, 32, 46],
    [16, 0, 27, 47],
  ],
  jump: [
    [8, 5, 25, 48],
    [9, 5, 23, 51],
    [5, 8, 23, 53],
    [4, 5, 23, 57],
    [2, 8, 27, 53],
    [1, 7, 34, 50],
    [1, 7, 32, 52],
    [0, 4, 29, 54],
    [2, 6, 31, 51],
    [5, 9, 29, 47],
    [0, 9, 32, 43],
  ],
  shoot: [
    [0, 1, 49, 44],
    [0, 1, 48, 44],
    [0, 1, 49, 44],
    [0, 0, 49, 45],
    [0, 0, 40, 45],
    [0, 1, 41, 44],
    [0, 1, 38, 44],
    [0, 0, 34, 45],
  ],
  hurt: [
    [3, 7, 32, 48],
    [0, 1, 34, 55],
    [0, 7, 34, 48],
    [1, 7, 35, 52],
  ],
  wall: [
    [0, 0, 32, 58],
    [0, 5, 31, 53],
    [0, 5, 28, 54],
    [0, 5, 32, 51],
    [0, 3, 34, 57],
    [0, 5, 28, 54],
  ],
};
const zeroCrops: Partial<Record<Pose, readonly Crop[]>> = {
  rest: [
    [292, 104, 43, 47],
    [341, 104, 43, 47],
    [390, 103, 42, 48],
    [436, 104, 43, 47],
    [485, 104, 43, 47],
  ],
  walk: [
    [117, 324, 36, 45],
    [163, 323, 38, 46],
    [207, 323, 51, 44],
    [265, 324, 50, 45],
    [320, 323, 48, 46],
    [375, 322, 46, 47],
    [429, 320, 44, 48],
    [481, 320, 40, 48],
    [111, 385, 45, 47],
    [167, 386, 49, 45],
    [223, 387, 45, 46],
    [275, 386, 50, 47],
    [332, 385, 46, 48],
    [387, 384, 43, 49],
    [437, 384, 42, 49],
    [487, 385, 45, 48],
  ],
  jump: [
    [121, 167, 39, 48],
    [167, 164, 43, 57],
    [219, 166, 43, 56],
    [267, 166, 44, 64],
    [319, 165, 43, 57],
    [371, 169, 43, 56],
    [425, 170, 39, 52],
    [474, 175, 40, 55],
  ],
  dash: [
    [227, 1001, 58, 35],
    [293, 1000, 58, 35],
    [355, 1000, 58, 35],
  ],
  saber: [
    [66, 456, 39, 46],
    [111, 455, 39, 48],
    [158, 440, 49, 63],
    [215, 440, 78, 63],
    [300, 443, 87, 60],
    [391, 455, 91, 48],
    [491, 454, 83, 49],
  ],
};
/** A pure pose choice. Unsupported combinations intentionally retain the drawn fallback. */
export function spritePose(sim: ReploidSimulation): {
  pose: Pose;
  frame: number;
} {
  const p = sim.player;
  if (p.hurt > 0)
    return {
      pose: 'hurt',
      frame: Math.min(3, Math.floor(((0.22 - p.hurt) / 0.22) * 4)),
    };
  if (p.saber > 0)
    return {
      pose: 'saber',
      frame: Math.min(6, Math.floor(((0.23 - p.saber) / 0.23) * 7)),
    };
  if (p.dash > 0) return { pose: 'dash', frame: Math.floor(sim.time * 24) % 3 };
  if (p.wall && !p.grounded)
    return { pose: 'wall', frame: Math.floor(sim.time * 12) % 6 };
  if (!p.grounded) {
    const phase =
      p.vy < -230 ? 1 : p.vy < -55 ? 2 : p.vy < 65 ? 3 : p.vy < 185 ? 5 : 7;
    return {
      pose: 'jump',
      frame:
        sim.character === 'zero'
          ? phase
          : p.shoot > 0
            ? 10
            : Math.min(10, Math.round((phase * 10) / 7)),
    };
  }
  if (p.shoot > 0)
    return {
      pose: 'shoot',
      frame: Math.min(7, Math.floor(((0.13 - p.shoot) / 0.13) * 8)),
    };
  if (Math.abs(p.vx) > 25)
    return {
      pose: 'walk',
      frame: Math.floor(sim.time * 24) % (sim.character === 'x' ? 14 : 16),
    };
  return {
    pose: 'rest',
    frame: Math.floor(sim.time * 8) % (sim.character === 'x' ? 8 : 5),
  };
}

export function createHunterSprites() {
  const base = `${import.meta.env.BASE_URL}assets/reploid/`;
  const images = new Map<string, HTMLImageElement>();
  let disposed = false;
  function load(path: string) {
    const image = new Image();
    image.decoding = 'async';
    image.src = base + path;
    images.set(path, image);
  }
  for (const [pose, frames] of Object.entries(xCrops))
    frames!.forEach((_, index) => load(`x/${pose}-${index}.png`));
  load('zero-x4-sheet.gif');
  return {
    draw(
      ctx: CanvasRenderingContext2D,
      sim: ReploidSimulation,
      x: number,
      y: number,
      ghost = false,
    ): boolean {
      if (disposed) return false;
      const { pose, frame } = spritePose(sim);
      // The sheet supplies a standing saber only; the fallback has airborne sword poses.
      if (pose === 'saber' && (!sim.player.grounded || sim.character === 'x'))
        return false;
      const crops = (sim.character === 'x' ? xCrops : zeroCrops)[pose];
      if (!crops) return false;
      const index = Math.min(crops.length - 1, Math.max(0, frame)),
        crop = crops[index];
      const path =
        sim.character === 'x' ? `x/${pose}-${index}.png` : 'zero-x4-sheet.gif';
      const image = images.get(path);
      if (!image?.complete || image.naturalWidth === 0) return false;
      const [, , width, height] = crop;
      // Keep the feet at the collision position and leave long saber strokes forward.
      const pivotX =
        pose === 'saber'
          ? [19, 19, 25, 27, 29, 28, 26][index]
          : sim.character === 'x' && pose === 'shoot'
            ? 18
            : width / 2;
      const scale = 1.2;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(sim.player.facing, 1);
      if (ghost) ctx.globalAlpha *= 0.2;
      ctx.drawImage(
        image,
        ...crop,
        Math.round(-pivotX * scale),
        Math.round(-height * scale),
        Math.round(width * scale),
        Math.round(height * scale),
      );
      ctx.restore();
      return true;
    },
    dispose() {
      disposed = true;
      images.forEach((image) => {
        image.src = '';
      });
      images.clear();
    },
  };
}

export type HunterSprites = ReturnType<typeof createHunterSprites>;
