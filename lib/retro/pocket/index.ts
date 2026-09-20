import type { Cartridge } from '../types.ts';
import { PocketSimulation, benchmarkInput } from './simulation.ts';
import { mountPocket } from './renderer.ts';

const pocket: Cartridge = {
  id: 'pocket',
  title: 'Pokémon Red / Blue',
  subtitle: 'PALLET TOWN / ROUTE 1',
  inspiration: 'Pokémon Red / Blue (1996)',
  description:
    '레드와 파이리가 태초마을에서 1번 도로로 출발합니다. 풀숲의 구구와 꼬렛을 만나고, 몬스터볼로 포획한 뒤 라이벌 그린에게 도전하세요.',
  objective:
    '야생 포켓몬 2종 포획 후 라이벌전 승리. 배틀은 방향키로 메뉴 선택 → Space 결정 · F 뒤로. J 공격 · K 속성 기술 · L 몬스터볼 · E 상처약 단축키도 사용할 수 있습니다.',
  renderer: 'canvas',
  inputHint:
    '방향키 이동·메뉴 선택 / Space 결정 / F 뒤로 / J·K 공격 / L 몬스터볼 / E 상처약·대화',
  accent: '#b8ce87',
  controls: [
    { action: 'jump', label: '메뉴 결정', key: 'Space' },
    { action: 'switch', label: '뒤로', key: 'F' },
    { action: 'left', label: '이동 / 배틀 메뉴', key: '← / A' },
    { action: 'right', label: '이동 / 배틀 메뉴', key: '→ / D' },
    { action: 'up', label: '북쪽으로 이동', key: '↑ / W' },
    { action: 'down', label: '남쪽으로 이동', key: '↓ / S' },
    { action: 'attack', label: '몸통박치기 / 대화', key: 'J' },
    { action: 'special', label: '속성 기술', key: 'K' },
    { action: 'guard', label: '몬스터볼', key: 'L' },
    { action: 'interact', label: '대화 / 상처약', key: 'E' },
  ],
  create: () => new PocketSimulation(),
  mount: (canvas, simulation) =>
    mountPocket(canvas, simulation as PocketSimulation),
  benchmark: (simulation) => benchmarkInput(simulation as PocketSimulation),
};

export default pocket;
