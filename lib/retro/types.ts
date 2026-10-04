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
  'reload',
  'ultimate',
  'switch',
  'left2',
  'right2',
  'jump2',
] as const;
export type Action = (typeof actions)[number];
/** Coordinates are relative to the game canvas; deltas/edges last one physics step. */
export type PointerInput = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  primary: boolean;
  secondary: boolean;
  primaryPressed: boolean;
  primaryReleased: boolean;
  secondaryPressed: boolean;
  secondaryReleased: boolean;
  scroll: number;
  aspect: number;
};
export type Input = Record<Action, boolean> & { pointer?: PointerInput };
export const idlePointer = (): PointerInput => ({
  x: 0.5,
  y: 0.5,
  dx: 0,
  dy: 0,
  primary: false,
  secondary: false,
  primaryPressed: false,
  primaryReleased: false,
  secondaryPressed: false,
  secondaryReleased: false,
  scroll: 0,
  aspect: 16 / 9,
});
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
  reload: false,
  ultimate: false,
  switch: false,
  left2: false,
  right2: false,
  jump2: false,
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
  audioCues?: Partial<Record<SoundCue, number>>;
  clearInput?(): void;
  step(dt: number, input: Input): void;
  snapshot(): RetroSnapshot;
}
export type SoundCue =
  | 'shot'
  | 'hit'
  | 'jump'
  | 'dash'
  | 'pickup'
  | 'explosion'
  | 'ability';
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
  renderer?: 'canvas' | 'webgl';
  pointerMode?: 'cursor' | 'lock';
  bindings?: Record<string, Action>;
  inputHint?: string;
  controls: { action: Action; label: string; key: string }[];
  create(): RetroSimulation;
  mount(canvas: HTMLCanvasElement, simulation: RetroSimulation): RetroView;
  benchmark(simulation: RetroSimulation): Input;
}
export const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
