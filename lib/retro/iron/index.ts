import type { Cartridge } from '../types.ts';
import { IronSimulation, ironBenchmark } from './simulation.ts';
import { mountIron } from './view.ts';
const cartridge: Cartridge = {
  id: 'iron',
  title: 'Iron Fist Delivery',
  subtitle: '철권보다 철야',
  inspiration: '3D martial-arts fighter',
  accent: '#5de4cf',
  description:
    '막차가 끊긴 심야 도장. 헬멧 쓴 배달 고수들이 거리와 타이밍, 옆걸음으로 승부를 겨룹니다.',
  objective:
    '먼저 2라운드를 이기세요. 빨간 공격 예고에는 가드, 세로 방향키로는 옆걸음. 빈틈에 펀치와 발차기!',
  controls: [
    { action: 'left', label: '왼쪽', key: '←' },
    { action: 'right', label: '오른쪽', key: '→' },
    { action: 'up', label: '뒤로 옆걸음', key: '↑' },
    { action: 'down', label: '앞으로 옆걸음', key: '↓' },
    { action: 'attack', label: '펀치 / 연속 타격', key: 'J' },
    { action: 'special', label: '긴 발차기', key: 'K' },
    { action: 'guard', label: '가드', key: 'L' },
    { action: 'jump', label: '회피 스텝', key: 'Space' },
  ],
  create: () => new IronSimulation(),
  mount: (canvas, simulation) =>
    mountIron(canvas, simulation as IronSimulation),
  benchmark: ironBenchmark,
};
export default cartridge;
