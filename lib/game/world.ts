export type Platform = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: 'ground' | 'brick' | 'question' | 'pipe';
};
export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: number;
  coyote: number;
  jumpBuffer: number;
  jumpHeld: boolean;
};
export const platforms: Platform[] = [
  { x: -5, y: -3, w: 27, h: 3, kind: 'ground' },
  { x: 25, y: -3, w: 17, h: 3, kind: 'ground' },
  { x: 45, y: -3, w: 24, h: 3, kind: 'ground' },
  { x: 73, y: -3, w: 35, h: 3, kind: 'ground' },
  { x: 9, y: 3, w: 1, h: 1, kind: 'question' },
  { x: 10, y: 3, w: 1, h: 1, kind: 'brick' },
  { x: 11, y: 3, w: 1, h: 1, kind: 'question' },
  { x: 12, y: 3, w: 1, h: 1, kind: 'brick' },
  { x: 17, y: 0, w: 2, h: 2, kind: 'pipe' },
  { x: 28, y: 0, w: 2, h: 2.6, kind: 'pipe' },
  { x: 34, y: 3, w: 4, h: 1, kind: 'brick' },
  { x: 37, y: 6, w: 1, h: 1, kind: 'question' },
  { x: 48, y: 0, w: 2, h: 1, kind: 'brick' },
  { x: 50, y: 0, w: 2, h: 2, kind: 'brick' },
  { x: 52, y: 0, w: 2, h: 3, kind: 'brick' },
  { x: 54, y: 0, w: 2, h: 4, kind: 'brick' },
  { x: 62, y: 3, w: 3, h: 1, kind: 'brick' },
  { x: 77, y: 0, w: 2, h: 2, kind: 'pipe' },
  { x: 84, y: 0, w: 2, h: 1, kind: 'brick' },
  { x: 86, y: 0, w: 2, h: 2, kind: 'brick' },
  { x: 88, y: 0, w: 2, h: 3, kind: 'brick' },
  { x: 90, y: 0, w: 2, h: 4, kind: 'brick' },
];
export const coins = [
  6, 7, 8, 14, 20, 21, 26, 32, 35, 36, 37, 38, 46, 58, 59, 60, 63, 64, 74, 80,
  81, 82, 89, 90, 91,
].map((x, i) => ({
  x,
  y: [35, 36, 37, 38, 63, 64, 89, 90, 91].includes(x)
    ? 5.1
    : 1.8 + (i % 3) * 0.15,
}));
export const enemySpawns = [13.5, 31, 39, 57.5, 66, 79.8, 95];
export const GOAL_X = 99;
// Feet-to-cap outer height, also used to size the rendered character.
export const PLAYER_HEIGHT = 1.5625;
export function newPlayer(): Player {
  return {
    x: 1,
    y: 0,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: 1,
    coyote: 0.1,
    jumpBuffer: 0,
    jumpHeld: false,
  };
}
export function overlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  b: Platform,
) {
  // A side clamp can leave ~1e-14 of floating-point overlap. Treat touching
  // faces as contact, not penetration, so the vertical pass cannot mistake a
  // pipe wall for a ceiling and push the character under the ground.
  const epsilon = 1e-9;
  return (
    ax < b.x + b.w - epsilon &&
    ax + aw > b.x + epsilon &&
    ay < b.y + b.h - epsilon &&
    ay + ah > b.y + epsilon
  );
}
export function stepPlayer(
  p: Player,
  input: { left: boolean; right: boolean; jump: boolean; run: boolean },
  dt: number,
  terrain = platforms,
) {
  const hitBlocks: Platform[] = [],
    direction = Number(input.right) - Number(input.left),
    target = direction * (input.run ? 8.6 : 5.4),
    accel = (p.grounded ? 42 : 23) * dt;
  p.vx += Math.max(-accel, Math.min(accel, target - p.vx));
  if (direction) p.facing = direction;
  p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - dt);
  p.jumpBuffer =
    input.jump && !p.jumpHeld ? 0.12 : Math.max(0, p.jumpBuffer - dt);
  p.jumpHeld = input.jump;
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = 12.8;
    p.grounded = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
  }
  p.vy -= (input.jump && p.vy > 0 ? 25 : 37) * dt;
  p.x += p.vx * dt;
  for (const b of terrain)
    if (overlap(p.x - 0.32, p.y, 0.64, PLAYER_HEIGHT, b)) {
      p.x = p.vx > 0 ? b.x - 0.32 : b.x + b.w + 0.32;
      p.vx = 0;
    }
  p.y += p.vy * dt;
  p.grounded = false;
  for (const b of terrain)
    if (overlap(p.x - 0.32, p.y, 0.64, PLAYER_HEIGHT, b)) {
      if (p.vy <= 0) {
        p.y = b.y + b.h;
        p.grounded = true;
      } else {
        p.y = b.y - PLAYER_HEIGHT;
        hitBlocks.push(b);
      }
      p.vy = 0;
    }
  p.x = Math.max(-3, p.x);
  return hitBlocks;
}
