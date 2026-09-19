export const MAP_W = 30;
export const MAP_H = 24;
export const HUD_TOP = 0.78;
export const BASE = { x: 6, y: 17 };
export const ENEMY_BASE = { x: 25, y: 5 };
export const MINERALS = [
  { x: 2.8, y: 13.8 },
  { x: 2.4, y: 16.4 },
  { x: 4.2, y: 11.8 },
  { x: 18.3, y: 17.8 },
  { x: 20.5, y: 18.3 },
];
export const ROCK_CELLS: readonly [number, number][] = [
  [13, 6],
  [14, 6],
  [15, 6],
  [13, 7],
  [14, 7],
  [15, 7],
  [12, 11],
  [13, 11],
  [14, 11],
  [12, 12],
  [13, 12],
  [14, 12],
  [12, 13],
  [13, 13],
  [14, 13],
  [12, 14],
  [13, 14],
  [17, 11],
  [18, 11],
  [19, 11],
  [18, 12],
  [19, 12],
  [7, 6],
  [8, 6],
  [8, 7],
  [23, 14],
  [24, 14],
  [25, 14],
  [5, 21],
  [6, 21],
  [23, 2],
  [24, 2],
];
export const rockKeys = new Set(ROCK_CELLS.map(([x, y]) => `${x},${y}`));
export type Camera = { x: number; y: number; zoom: number };
export type Point = { x: number; y: number };
export function project(point: Point, camera: Camera, aspect: number): Point {
  const scale = camera.zoom / 35;
  return {
    x: 0.5 + (point.x - camera.x - (point.y - camera.y)) * scale,
    y:
      0.35 +
      (point.x - camera.x + (point.y - camera.y)) *
        scale *
        Math.max(0.5, aspect) *
        0.5,
  };
}
export function unproject(point: Point, camera: Camera, aspect: number): Point {
  const scale = camera.zoom / 35;
  const a = (point.x - 0.5) / scale;
  const b = (point.y - 0.35) / (scale * Math.max(0.5, aspect) * 0.5);
  return { x: camera.x + (a + b) / 2, y: camera.y + (b - a) / 2 };
}
export type Command =
  | 'barracks'
  | 'turret'
  | 'marine'
  | 'worker'
  | 'army'
  | 'workers'
  | 'assault'
  | 'stop';
export const BUTTONS: {
  command: Command;
  label: string;
  key: string;
  cost: number;
  x: number;
  y: number;
  w: number;
  h: number;
}[] = [
  ['barracks', '병영', 'B', 100],
  ['turret', '포탑', 'T', 80],
  ['marine', '해병', 'M', 35],
  ['worker', '일꾼', 'R', 45],
  ['army', '전투병 선택', 'F', 0],
  ['workers', '일꾼 선택', 'Q', 0],
  ['assault', '공격 이동', 'A', 0],
  ['stop', '정지', '■', 0],
].map(([command, label, key, cost], index) => ({
  command: command as Command,
  label: String(label),
  key: String(key),
  cost: Number(cost),
  x: 0.47 + (index % 4) * 0.128,
  y: 0.81 + Math.floor(index / 4) * 0.085,
  w: 0.119,
  h: 0.073,
}));
export const MINIMAP = { x: 0.016, y: 0.805, w: 0.183, h: 0.172 };
export function inRect(
  point: Point,
  rect: { x: number; y: number; w: number; h: number },
) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}
export function minimapPoint(point: Point): Point {
  return {
    x: MINIMAP.x + (point.x / MAP_W) * MINIMAP.w,
    y: MINIMAP.y + (point.y / MAP_H) * MINIMAP.h,
  };
}
