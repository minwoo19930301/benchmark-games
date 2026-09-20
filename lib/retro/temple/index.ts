import type { Cartridge } from '../types.ts';
import { TempleSimulation, benchmarkTemple } from './simulation.ts';
import { mountTemple } from './view.ts';
export default {
  id: 'temple',
  title: 'Fireboy & Watergirl · Forest Temple',
  subtitle: '파이어보이와 워터걸 · 숲의 사원',
  inspiration: 'Fireboy and Watergirl',
  description:
    '파이어보이와 워터걸의 같은 키보드 협동 퍼즐을 세 개의 방으로 재구현했습니다. 파이어보이는 불을, 워터걸은 물을 지나갑니다. 발판을 밟아 동료를 통과시키고 건너편 레버로 문을 고정하세요. 혼자라면 F로 캐릭터를 바꿔도 됩니다.',
  objective:
    '각 방의 빨강·파랑 다이아몬드를 모으고 두 캐릭터를 같은 색 출구로 보내세요. 3개 방을 통과하면 클리어!',
  accent: '#b36b34',
  renderer: 'canvas',
  bindings: { KeyA: 'left2', KeyD: 'right2', KeyW: 'jump2' },
  inputHint:
    '방향키·Space 선택 캐릭터 / W A D 다른 캐릭터 · 같은 키보드로 2인 협동 가능',
  controls: [
    { action: 'jump', key: 'Space', label: '선택 캐릭터 점프' },
    { action: 'switch', key: 'F', label: '캐릭터 전환' },
    { action: 'interact', key: 'E', label: '레버 고정' },
    { action: 'reload', key: 'R', label: '방 다시 시작' },
  ],
  create: () => new TempleSimulation(),
  mount: (canvas, sim) => mountTemple(canvas, sim as TempleSimulation),
  benchmark: (sim) => benchmarkTemple(sim as TempleSimulation),
} satisfies Cartridge;
