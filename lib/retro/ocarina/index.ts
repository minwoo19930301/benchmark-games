import type { Cartridge } from '../types.ts';
import { benchmarkOcarina, OcarinaSimulation } from './simulation.ts';
import { mountOcarina } from './view.ts';

const cartridge: Cartridge = {
  id: 'ocarina',
  title: 'Ocarina of Overtime',
  subtitle: '숲에도 퇴근 시간은 있다.',
  inspiration: 'Ocarina of Time',
  description:
    '각진 나무와 돌로 만든 작은 숲속 모험. 세 선율로 신전 문을 열고, 고대의 야근 수호자를 퇴근시키세요.',
  objective:
    '빛나는 선율석 세 개를 순서대로 연주하고, 야근 수호자를 물리친 뒤 제단 가까이에서 E를 누르세요.',
  accent: '#d7ca8b',
  controls: [
    { action: 'up', label: '이동', key: 'WASD / 방향키' },
    { action: 'attack', label: '나무검', key: 'J' },
    { action: 'special', label: '구르기', key: 'K' },
    { action: 'guard', label: '방패', key: 'L' },
    { action: 'interact', label: '연주 · 상호작용', key: 'E' },
    { action: 'jump', label: '점프', key: 'Space' },
  ],
  create: () => new OcarinaSimulation(),
  mount: (canvas, simulation) =>
    mountOcarina(canvas, simulation as OcarinaSimulation),
  benchmark: (simulation) => benchmarkOcarina(simulation as OcarinaSimulation),
};
export default cartridge;
