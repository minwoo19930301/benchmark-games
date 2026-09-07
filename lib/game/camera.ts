// Keep the entire character inside even a narrow portrait viewport.
export function followCamera(
  current: number,
  playerX: number,
  facing: number,
  aspect: number,
  dt: number,
) {
  const halfWidth = 7.3 * Math.max(0.1, aspect);
  const lead = Math.min(3, halfWidth * 0.35) * facing;
  const target = playerX + lead;
  const eased = current + (target - current) * (1 - Math.exp(-dt * 6));
  const safeRange = Math.max(0, halfWidth - 0.8);
  return Math.max(playerX - safeRange, Math.min(playerX + safeRange, eased));
}
