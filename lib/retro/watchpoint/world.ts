export interface Point3 {
  x: number;
  y: number;
  z: number;
}
export interface Cover {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  kind: 'planter' | 'kiosk' | 'crate' | 'uplink';
}
export const ARENA = { left: -20, right: 20, north: -26, south: 24 };
export const SPAWN = { x: 0, z: 20 };
export const OBJECTIVE = { x: 0, z: -7, radius: 6 };
export const covers: Cover[] = [
  { x: -6, z: 9, width: 5, depth: 3, height: 1.6, kind: 'planter' },
  { x: 6, z: 7, width: 4, depth: 3, height: 1.6, kind: 'planter' },
  { x: -11, z: 0, width: 4, depth: 6, height: 3.6, kind: 'kiosk' },
  { x: 11, z: -2, width: 4, depth: 5, height: 3.6, kind: 'kiosk' },
  { x: -7.5, z: -13, width: 3, depth: 2, height: 1.35, kind: 'crate' },
  { x: 7.5, z: -16, width: 4, depth: 2, height: 1.8, kind: 'crate' },
  { x: 0, z: -8, width: 1.4, depth: 1.4, height: 3.4, kind: 'uplink' },
];

/** Distance to the first ray/AABB intersection. Direction must be normalized. */
export function rayBox(
  origin: Point3,
  direction: Point3,
  min: Point3,
  max: Point3,
): number {
  let near = 0,
    far = Infinity;
  for (const axis of ['x', 'y', 'z'] as const) {
    if (Math.abs(direction[axis]) < 1e-9) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return Infinity;
    } else {
      const a = (min[axis] - origin[axis]) / direction[axis];
      const b = (max[axis] - origin[axis]) / direction[axis];
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (far < near) return Infinity;
    }
  }
  return near;
}
export function obstacleDistance(origin: Point3, direction: Point3): number {
  let distance = Infinity;
  for (const cover of covers)
    distance = Math.min(
      distance,
      rayBox(
        origin,
        direction,
        { x: cover.x - cover.width / 2, y: 0, z: cover.z - cover.depth / 2 },
        {
          x: cover.x + cover.width / 2,
          y: cover.height,
          z: cover.z + cover.depth / 2,
        },
      ),
    );
  if (direction.y < -0.0001)
    distance = Math.min(distance, -origin.y / direction.y);
  return distance;
}
export function visible(from: Point3, to: Point3): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  if (distance < 0.001) return true;
  const direction = {
    x: (to.x - from.x) / distance,
    y: (to.y - from.y) / distance,
    z: (to.z - from.z) / distance,
  };
  return obstacleDistance(from, direction) >= distance - 0.02;
}
export function canStand(
  x: number,
  z: number,
  radius = 0.38,
  feet = 0,
): boolean {
  if (
    x - radius < ARENA.left ||
    x + radius > ARENA.right ||
    z - radius < ARENA.north ||
    z + radius > ARENA.south
  )
    return false;
  return covers.every(
    (cover) =>
      feet >= cover.height - 0.02 ||
      x + radius <= cover.x - cover.width / 2 ||
      x - radius >= cover.x + cover.width / 2 ||
      z + radius <= cover.z - cover.depth / 2 ||
      z - radius >= cover.z + cover.depth / 2,
  );
}
export function angleDifference(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
