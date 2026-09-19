import type { Cartridge } from '../types.ts';
import { SmashSimulation, smashBenchmark } from './simulation.ts';
import { mountSmash } from './view.ts';
const cartridge: Cartridge = {
  id: 'smash',
  title: 'Rooftop Rumble',
  subtitle: '옥상 배송 대난투',
  inspiration: 'Platform fighter',
  accent: '#ffb74d',
  description:
    '퇴근 전 마지막 한 판. 너구리 택배 기사들이 석양의 옥상에서 박스와 우산으로 벌이는 3스톡 대난투.',
  objective:
    '피해를 쌓고 상대를 옥상 밖으로 3번 밀어내세요. 떨어지면 더블 점프와 K 우산으로 복귀하세요.',
  controls: [
    { action: 'left', label: '왼쪽', key: '←' },
    { action: 'right', label: '오른쪽', key: '→' },
    { action: 'jump', label: '더블 점프', key: 'Space' },
    { action: 'attack', label: '택배 펀치', key: 'J' },
    { action: 'special', label: '박스 타격 / 우산 복귀', key: 'K' },
    { action: 'guard', label: '방패', key: 'L' },
  ],
  create: () => new SmashSimulation(),
  mount: (canvas, simulation) =>
    mountSmash(canvas, simulation as SmashSimulation),
  benchmark: smashBenchmark,
};
export default cartridge;
