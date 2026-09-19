import type { Cartridge } from '../types.ts';
import { WatchpointSimulation, watchpointBenchmark } from './simulation.ts';
import { mountWatchpoint } from './view.ts';

// Kit reference: official hero page https://overwatch.blizzard.com/es-es/heroes/soldier-76/
// All hero names, arena, weapon art and mechanics below are this project's original parody.
const cartridge: Cartridge = {
  id: 'watchpoint',
  title: 'Watchpoint: Sunward Patrol',
  subtitle: '정오의 항만 수호대',
  inspiration: 'Overwatch hero FPS',
  accent: '#16b9de',
  renderer: 'webgl',
  pointerMode: 'lock',
  bindings: { ShiftLeft: 'special', ShiftRight: 'special' },
  inputHint:
    '게임 화면을 클릭해 마우스 조준을 고정하세요. 좌클릭 사격 · 우클릭 정밀 조준 · WASD 이동 · R 재장전 · Esc 해제/일시정지. 조준 고정이 지원되지 않으면 누른 채 드래그로 시선을 돌립니다.',
  description:
    '햇살 가득한 미래 항만에서 펼치는 1인칭 영웅 슈터. 태양 소총, 추진 대시, 회복 비콘과 과충전 궁극기로 아군과 함께 중앙 업링크를 확보하세요. 경비 로봇의 붉은 조준 예고를 보고 엄폐물 뒤로 피하세요.',
  objective:
    '중앙 A 거점 안에서 적을 제압하고 점령률 100%를 달성하세요. 적이 거점에 있으면 경합하며, 적 점령률 100%·시간 초과·세 번째 전투 불능이면 패배합니다.',
  controls: [
    { action: 'up', label: '이동', key: 'WASD' },
    { action: 'attack', label: '소총 사격', key: 'LMB / J' },
    { action: 'guard', label: '정밀 조준', key: 'RMB / L' },
    { action: 'jump', label: '점프', key: 'SPACE' },
    { action: 'special', label: '추진 대시', key: 'K / SHIFT' },
    { action: 'interact', label: '회복 비콘', key: 'E' },
    { action: 'reload', label: '재장전', key: 'R' },
    { action: 'ultimate', label: '태양 과충전', key: 'Q' },
  ],
  create: () => new WatchpointSimulation(),
  mount: (canvas, simulation) =>
    mountWatchpoint(canvas, simulation as WatchpointSimulation),
  benchmark: watchpointBenchmark,
};
export default cartridge;
