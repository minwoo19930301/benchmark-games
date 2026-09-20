import type { Cartridge } from '../types.ts';
import { SmashSimulation, smashBenchmark } from './simulation.ts';
import { mountSmash } from './view.ts';
const cartridge: Cartridge = {
  id: 'smash',
  title: 'Super Smash Bros. · Dream Land',
  subtitle: '마리오 vs 커비 · 3스톡 대난투',
  inspiration: 'Super Smash Bros.',
  accent: '#ec364b',
  description:
    '마리오의 차지 스매시와 슈퍼 점프 펀치, 커비의 공중 점프. 드림랜드에서 피해를 쌓고 장외로 날려 보내는 3스톡 대전.',
  objective:
    '상대의 스톡 3개를 먼저 없애세요. J로 피해를 쌓고 Q를 모았다 놓아 마무리. 장외에서는 더블 점프와 ↑K로 복귀하세요.',
  renderer: 'webgl',
  inputHint:
    '← → 이동 · Space 점프 · J 공격 / 방향+J · Q 모아 스매시 · K 필살기 / ↑K 복귀 · L 방어 / 방향+L 구르기 · E 잡기 → 방향 던지기',
  controls: [
    { action: 'left', label: '왼쪽', key: '←' },
    { action: 'right', label: '오른쪽', key: '→' },
    { action: 'jump', label: '더블 점프', key: 'Space' },
    { action: 'attack', label: '일반 / 방향 / 공중 공격', key: 'J' },
    { action: 'ultimate', label: '모아 스매시', key: 'Q' },
    { action: 'special', label: '파이어볼 / ↑ 복귀', key: 'K' },
    { action: 'guard', label: '실드 / 방향 구르기', key: 'L' },
    { action: 'interact', label: '잡기 / 방향 던지기', key: 'E' },
  ],
  create: () => new SmashSimulation(),
  mount: (canvas, simulation) =>
    mountSmash(canvas, simulation as SmashSimulation),
  benchmark: smashBenchmark,
};
export default cartridge;
