export type StageId = 'x4' | 'x5' | 'x6';
export type Platform = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: 'lift' | 'belt';
  travel?: number;
};
export type Hazard = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'spikes' | 'laser' | 'vent';
  offset?: number;
};
export type Stage = {
  id: StageId;
  title: string;
  subtitle: string;
  sector: string;
  bossName: string;
  accent: string;
  sky: string;
  far: string;
  metal: string;
  light: string;
  end: number;
  arena: number;
  floor: number;
  gravity: number;
  airDash: boolean;
  platforms: Platform[];
  hazards: Hazard[];
  enemies: { x: number; y: number; kind: 'walker' | 'turret' | 'drone' }[];
  capsules: { x: number; y: number; kind: 'health' | 'rescue' | 'core' }[];
  checkpoints: number[];
};
const floor = 320;
const ground = (x: number, end: number): Platform => ({
  x,
  y: floor,
  w: end - x,
  h: 160,
});
export const stages: Record<StageId, Stage> = {
  x4: {
    id: 'x4',
    title: 'NEON RECLAIMER',
    subtitle: '네온 회수 작전',
    sector: 'RAINLINE / FREIGHT DISTRICT',
    bossName: 'VOLT MANTIS',
    accent: '#56e6d3',
    sky: '#101e35',
    far: '#223c53',
    metal: '#405671',
    light: '#ffc66d',
    end: 3520,
    arena: 2920,
    floor,
    gravity: 1050,
    airDash: false,
    platforms: [
      ground(0, 770),
      ground(890, 1760),
      ground(1890, 3520),
      { x: 390, y: 266, w: 110, h: 54 },
      { x: 1100, y: 181, w: 100, h: 139 },
      { x: 1390, y: 245, w: 140, h: 20 },
      { x: 2130, y: 257, w: 130, h: 63 },
      { x: 2510, y: 207, w: 120, h: 113 },
    ],
    hazards: [
      { x: 1610, y: 306, w: 75, h: 14, kind: 'spikes' },
      { x: 2310, y: 227, w: 22, h: 93, kind: 'laser', offset: 0.8 },
    ],
    enemies: [
      { x: 580, y: floor, kind: 'walker' },
      { x: 997, y: floor, kind: 'turret' },
      { x: 1460, y: 245, kind: 'turret' },
      { x: 2010, y: 246, kind: 'drone' },
      { x: 2420, y: floor, kind: 'walker' },
      { x: 2750, y: floor, kind: 'turret' },
    ],
    capsules: [
      { x: 455, y: 244, kind: 'core' },
      { x: 1210, y: 288, kind: 'health' },
      { x: 1460, y: 211, kind: 'rescue' },
      { x: 2630, y: 285, kind: 'health' },
    ],
    checkpoints: [1270, 2840],
  },
  x5: {
    id: 'x5',
    title: 'ORBITAL AFTERBURN',
    subtitle: '궤도 잔광',
    sector: 'APOGEE / ORBITAL DOCK',
    bossName: 'ORBIT NAUTILUS',
    accent: '#8dcaff',
    sky: '#12132d',
    far: '#343051',
    metal: '#55557b',
    light: '#d3ff85',
    end: 3710,
    arena: 3110,
    floor,
    gravity: 850,
    airDash: true,
    platforms: [
      ground(0, 670),
      ground(820, 1500),
      ground(1710, 2250),
      ground(2390, 3710),
      { x: 390, y: 252, w: 90, h: 68 },
      { x: 1080, y: 181, w: 105, h: 139 },
      { x: 1510, y: 265, w: 135, h: 16, kind: 'lift', travel: 64 },
      { x: 1950, y: 249, w: 120, h: 71 },
      { x: 2660, y: 201, w: 110, h: 119 },
    ],
    hazards: [
      { x: 1310, y: 306, w: 80, h: 14, kind: 'spikes' },
      { x: 2500, y: 227, w: 22, h: 93, kind: 'laser', offset: 2 },
    ],
    enemies: [
      { x: 560, y: floor, kind: 'turret' },
      { x: 930, y: 246, kind: 'drone' },
      { x: 1240, y: floor, kind: 'walker' },
      { x: 1880, y: 238, kind: 'drone' },
      { x: 2210, y: floor, kind: 'turret' },
      { x: 2870, y: floor, kind: 'walker' },
    ],
    capsules: [
      { x: 431, y: 224, kind: 'core' },
      { x: 1170, y: 151, kind: 'rescue' },
      { x: 1760, y: 290, kind: 'health' },
      { x: 2840, y: 290, kind: 'health' },
    ],
    checkpoints: [1210, 3000],
  },
  x6: {
    id: 'x6',
    title: 'ECLIPSE FOUNDRY',
    subtitle: '식의 용광로',
    sector: 'ASHFALL / REACTOR SHAFT',
    bossName: 'CINDER JACKAL',
    accent: '#ffbd69',
    sky: '#211b2a',
    far: '#49333c',
    metal: '#635457',
    light: '#8bead8',
    end: 3620,
    arena: 3020,
    floor,
    gravity: 1100,
    airDash: true,
    platforms: [
      ground(0, 730),
      ground(865, 1650),
      ground(1830, 2350),
      ground(2460, 3620),
      { x: 410, y: 261, w: 145, h: 59, kind: 'belt' },
      { x: 1120, y: 176, w: 95, h: 144 },
      { x: 1450, y: 252, w: 120, h: 68, kind: 'belt' },
      { x: 1660, y: 268, w: 120, h: 17, kind: 'lift', travel: 45 },
      { x: 2050, y: 246, w: 110, h: 74 },
      { x: 2670, y: 201, w: 110, h: 119 },
    ],
    hazards: [
      { x: 940, y: 215, w: 24, h: 105, kind: 'vent', offset: 0.6 },
      { x: 2250, y: 213, w: 24, h: 107, kind: 'vent', offset: 2 },
      { x: 2520, y: 203, w: 22, h: 117, kind: 'laser', offset: 1.4 },
    ],
    enemies: [
      { x: 630, y: floor, kind: 'walker' },
      { x: 1020, y: floor, kind: 'turret' },
      { x: 1380, y: 245, kind: 'drone' },
      { x: 1940, y: floor, kind: 'turret' },
      { x: 2450, y: 240, kind: 'drone' },
      { x: 2860, y: floor, kind: 'walker' },
    ],
    capsules: [
      { x: 505, y: 232, kind: 'core' },
      { x: 1210, y: 147, kind: 'rescue' },
      { x: 1880, y: 288, kind: 'health' },
      { x: 2815, y: 288, kind: 'health' },
    ],
    checkpoints: [1290, 2930],
  },
};
export function platformAt(platform: Platform, time: number): Platform {
  return platform.kind === 'lift'
    ? {
        ...platform,
        x: platform.x + Math.sin(time * 1.3) * (platform.travel || 0),
      }
    : platform;
}
export function hazardPhase(
  hazard: Hazard,
  time: number,
): 'off' | 'warning' | 'active' {
  if (hazard.kind === 'spikes') return 'active';
  const phase = (time + (hazard.offset || 0)) % 3.6;
  return phase < 1.65 ? 'off' : phase < 2.25 ? 'warning' : 'active';
}
