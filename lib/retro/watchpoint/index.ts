import type { Cartridge } from '../types.ts';
import { WatchpointSimulation, watchpointBenchmark } from './simulation.ts';
import { mountWatchpoint } from './view.ts';

// Kit reference: https://overwatch.blizzard.com/en-us/heroes/soldier-76/
const cartridge: Cartridge = {
  id: 'watchpoint',
  title: 'Overwatch · Soldier: 76',
  subtitle: '솔저: 76 · 감시 기지: 지브롤터',
  inspiration: 'Overwatch · Soldier: 76',
  accent: '#f3a92f',
  renderer: 'webgl',
  pointerMode: 'lock',
  bindings: { ShiftLeft: 'special', ShiftRight: 'special' },
  inputHint:
    '클릭해 마우스 조준 고정 · 좌클릭 펄스 소총 · 우클릭 나선 로켓 · WASD 이동 · Shift 질주 · E 생체장 · Q 전술 조준경 · R 재장전',
  description:
    '솔저: 76의 중거리 전투를 재구현했습니다. 25발 펄스 소총과 나선 로켓, 지속 질주, 생체장, 시야 안의 적을 조준하는 전술 조준경으로 항만 훈련 거점을 확보하세요.',
  objective:
    '중앙 A 거점 안의 적 훈련 로봇을 제압하고 점령률 100%를 달성하세요. 적 점령률 100%·시간 초과·세 번째 전투 불능이면 패배합니다.',
  controls: [
    { action: 'up', label: '이동', key: 'WASD' },
    { action: 'attack', label: '펄스 소총', key: 'LMB / J' },
    { action: 'guard', label: '나선 로켓', key: 'RMB / L' },
    { action: 'jump', label: '점프', key: 'SPACE' },
    { action: 'special', label: '앞으로 질주', key: 'K / SHIFT' },
    { action: 'interact', label: '생체장', key: 'E' },
    { action: 'reload', label: '재장전', key: 'R' },
    { action: 'ultimate', label: '전술 조준경', key: 'Q' },
  ],
  create: () => new WatchpointSimulation(),
  mount: (canvas, simulation) =>
    mountWatchpoint(canvas, simulation as WatchpointSimulation),
  benchmark: watchpointBenchmark,
};
export default cartridge;
