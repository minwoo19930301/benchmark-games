/** Shared course geometry. Coordinates use x forward, y up; the player's y is its feet. */
export const LEVEL_END = 2400;
export const START_X = 12;
export const PLAYER_RADIUS = 1;

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Gentle, continuous hills with a level approach and floor beneath the loop. */
export function groundAt(x: number): number {
  const hills = 25 + 8 * Math.sin(x / 108) + 3.5 * Math.sin(x / 42);
  const flatBlend = smooth((x - 630) / 50) * (1 - smooth((x - 930) / 50));
  return hills * (1 - flatBlend) + 24 * flatBlend;
}

export function groundSlope(x: number): number {
  return (groundAt(x + 0.05) - groundAt(x - 0.05)) / 0.1;
}

export const LOOP = Object.freeze({
  x: 820,
  y: 42,
  radius: 18,
  entryX: 820,
  exitX: 820,
  minEntrySpeed: 60,
});

export interface Ring {
  x: number;
  y: number;
}
export interface Spring {
  x: number;
  y: number;
  power: number;
}
export interface Boost {
  x: number;
  y: number;
  width: number;
  speed: number;
}
export interface Hazard {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Enemy {
  x: number;
  y: number;
  range: number;
  speed: number;
}
export interface Checkpoint {
  x: number;
  y: number;
}

export const springs: Spring[] = [402, 1370, 1830].map((x) => ({
  x,
  y: groundAt(x),
  power: 36,
}));
export const boosts: Boost[] = [
  { x: 82, width: 13, speed: 54 },
  { x: 716, width: 42, speed: 74 },
  { x: 1940, width: 26, speed: 65 },
].map((boost) => ({ ...boost, y: groundAt(boost.x) }));
export const hazards: Hazard[] = [
  { x: 296, width: 9 },
  { x: 1110, width: 11 },
  { x: 1732, width: 11 },
  { x: 2170, width: 10 },
].map((hazard) => ({ ...hazard, y: groundAt(hazard.x), height: 1.65 }));
export const enemies: Enemy[] = [190, 530, 1045, 1520, 2070, 2310].map(
  (x, index) => ({
    x,
    y: groundAt(x),
    range: 8,
    speed: index % 2 ? 1.2 : 0.9,
  }),
);
export const checkpoints: Checkpoint[] = [620, 1280, 1890].map((x) => ({
  x,
  y: groundAt(x),
}));

const trail: Ring[] = [20, 24, 28].map((x) => ({ x, y: groundAt(x) + 1.45 }));
for (let x = 32; x < LEVEL_END - 22; x += 9) {
  // Leave breathing room around spikes and the launch pads.
  if (
    hazards.some(
      (hazard) => x >= hazard.x - 5 && x <= hazard.x + hazard.width + 5,
    )
  )
    continue;
  trail.push({ x, y: groundAt(x) + 1.45 });
}
for (const spring of springs) {
  for (let index = 1; index <= 9; index += 1) {
    const t = index * 0.18;
    trail.push({
      x: spring.x + 43 * t,
      y: spring.y + 36 * t - 18 * t * t + 1.5,
    });
  }
}
for (let index = 0; index < 24; index += 1) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 24;
  // The feet follow the outer track; the character and ring row sit inside it.
  const radius = LOOP.radius - 1.45;
  trail.push({
    x: LOOP.x + radius * Math.cos(angle),
    y: LOOP.y + radius * Math.sin(angle),
  });
}
export const rings: Ring[] = trail;
