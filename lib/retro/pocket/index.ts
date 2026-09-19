import type { Cartridge } from '../types.ts';
import { PocketSimulation, benchmarkInput } from './simulation.ts';
import { mountPocket } from './renderer.ts';

const pocket: Cartridge = {
  id: 'pocket',
  title: 'Pocket Pals: First Route',
  subtitle: '귤빛 마을에서 만나는 세 친구와 첫 번째 모험.',
  inspiration: 'Generation-one creature-catching RPGs',
  description:
    '귤빛 마을에서 출발하는 작은 컬러 휴대용 게임 모험. 풀숲에서 귤도마뱀, 도깨비싹, 물수달을 만나고 불꽃·풀·물의 속성 상성으로 전투하세요.',
  objective:
    '서로 다른 야생 친구 2종을 포획한 뒤 북쪽 길의 라이벌 미소를 이기세요. J·K로 야생 친구의 HP를 45% 이하로 낮춘 뒤 L로 포획합니다. 남서쪽 진료소에서 E를 누르면 무료 회복과 물품 보충이 가능합니다.',
  accent: '#b8ce87',
  controls: [
    { action: 'left', label: '이동 / 전투 중 친구 교체', key: '← / A' },
    { action: 'right', label: '이동 / 전투 중 친구 교체', key: '→ / D' },
    { action: 'up', label: '북쪽으로 이동', key: '↑ / W' },
    { action: 'down', label: '남쪽으로 이동', key: '↓ / S' },
    { action: 'attack', label: '기본 공격 / 대화', key: 'J' },
    { action: 'special', label: '속성 기술', key: 'K' },
    { action: 'guard', label: '포획 구슬', key: 'L' },
    { action: 'interact', label: '대화 / 회복 떡', key: 'E' },
  ],
  create: () => new PocketSimulation(),
  mount: (canvas, simulation) =>
    mountPocket(canvas, simulation as PocketSimulation),
  benchmark: (simulation) => benchmarkInput(simulation as PocketSimulation),
};

export default pocket;
