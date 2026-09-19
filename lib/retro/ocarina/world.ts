export const WORLD = { left: -17, right: 17, near: 18, far: -34 } as const;
export const START = { x: 0, z: 13 } as const;
export const GATE_Z = -16;
export const GATE_HALF_WIDTH = 3.4;
export const POND = {
  x: -10.4,
  z: -2.9,
  radiusX: 3.55,
  radiusZ: 2.65,
} as const;
export const SHRINE = { x: 0, z: -30 } as const;
export const MELODY_STONES = [
  { x: -9, z: 7, name: 'Dew', color: '#70ddd0', glyph: 'drop' },
  { x: 9, z: 0.5, name: 'Root', color: '#f5cd66', glyph: 'leaf' },
  { x: -6.5, z: -10, name: 'Dawn', color: '#c0a0fc', glyph: 'star' },
] as const;
export const ENEMY_SPAWNS = [
  { x: 1.5, z: 5.5, boss: false },
  { x: 5.5, z: -6.5, boss: false },
  { x: 0, z: -24, boss: true },
] as const;
export const ROCKS = [
  { x: 13.9, z: 8.5, radius: 1.1 },
  { x: -13.7, z: 12.9, radius: 1.25 },
  { x: 12.5, z: -12.7, radius: 1.1 },
  { x: -11.5, z: -25, radius: 1.5 },
  { x: 11.7, z: -29, radius: 1.2 },
] as const;
