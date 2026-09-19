export const actions = [
  'left',
  'right',
  'up',
  'down',
  'jump',
  'attack',
  'special',
  'guard',
  'interact',
] as const;
export type Action = (typeof actions)[number];
export type Input = Record<Action, boolean>;
export const idleInput = (): Input => ({
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  attack: false,
  special: false,
  guard: false,
  interact: false,
});
export type RetroSnapshot = {
  phase: 'playing' | 'won' | 'lost';
  time: number;
  score: number;
  progress: number;
  objective: string;
  stats: { label: string; value: string | number }[];
};
export interface RetroSimulation {
  step(dt: number, input: Input): void;
  snapshot(): RetroSnapshot;
}
export interface RetroView {
  render(width: number, height: number): void;
  dispose(): void;
  metrics(): { drawCalls: number; entities: number };
}
export interface Cartridge {
  id: string;
  title: string;
  subtitle: string;
  inspiration: string;
  description: string;
  objective: string;
  accent: string;
  controls: { action: Action; label: string; key: string }[];
  create(): RetroSimulation;
  mount(canvas: HTMLCanvasElement, simulation: RetroSimulation): RetroView;
  benchmark(simulation: RetroSimulation): Input;
}
export const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
