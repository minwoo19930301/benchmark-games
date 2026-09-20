import type { Cartridge } from '../types.ts';
import { IronSimulation, ironBenchmark } from './simulation.ts';
import { mountIron } from './view.ts';
const cartridge: Cartridge = {
  id: 'iron',
  title: 'Tekken 3 · Jin vs Hwoarang',
  subtitle: '진 카자마 vs 화랑 · 철권 3 벤치마크',
  inspiration: 'Tekken 3 (1997)',
  accent: '#edb85b',
  renderer: 'webgl',
  description:
    '진의 미시마류 펀치와 화랑의 태권도 발차기. 직접 만든 두 캐릭터로 상·중·하단 방어, 횡이동, 공중 콤보와 2선승 대전을 재구현했습니다.',
  objective:
    '2라운드 선승. 뒤로 가드, 아래+뒤로 하단 가드. J·J·K 연계와 ↘+K 띄우기 후 추가 타격을 활용하세요.',
  bindings: {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    KeyJ: 'attack',
    KeyK: 'interact',
    KeyU: 'special',
    KeyI: 'ultimate',
    Space: 'jump',
  },
  inputHint:
    'J 왼손 · K 오른손 · U 왼발 · I 오른발 · 뒤로 가드 · ↓ 웅크리기 · ↑/Space 횡이동 · →→ 대시',
  controls: [
    { action: 'left', label: '뒤로 / 서서 가드', key: '←' },
    { action: 'right', label: '앞으로 / 두 번 대시', key: '→' },
    { action: 'down', label: '웅크리기 / 하단 공격', key: '↓' },
    { action: 'up', label: '화면 안쪽 횡이동', key: '↑' },
    { action: 'jump', label: '화면 바깥쪽 횡이동', key: 'Space' },
    { action: 'attack', label: '1 · 왼손', key: 'J' },
    { action: 'interact', label: '2 · 오른손', key: 'K' },
    { action: 'special', label: '3 · 왼발', key: 'U' },
    { action: 'ultimate', label: '4 · 오른발', key: 'I' },
  ],
  create: () => new IronSimulation(),
  mount: (canvas, simulation) =>
    mountIron(canvas, simulation as IronSimulation),
  benchmark: ironBenchmark,
};
export default cartridge;
