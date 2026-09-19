import type { Cartridge } from '../types.ts';
import { benchmarkColony, ColonySimulation } from './simulation.ts';
import { mountColony } from './view.ts';

const cartridge: Cartridge = {
  id: 'colony',
  title: 'COLONY COMMAND',
  subtitle: '궤도 식민지의 마지막 근무',
  inspiration: 'StarCraft',
  description:
    '일꾼의 채굴과 운반, 병영 생산, 포탑 방어, 부대 지휘가 맞물리는 실시간 전략 작전. 광물 지대를 확보하고 안개 속 적 통신 핵을 파괴하세요.',
  objective:
    '지휘 기지를 지키며 병영과 해병 부대를 준비하세요. 적 통신 핵을 파괴하면 승리합니다.',
  accent: '#89d7c4',
  renderer: 'canvas',
  pointerMode: 'cursor',
  inputHint:
    '좌클릭·드래그 선택 / 우클릭 이동·채굴·공격 / 미니맵 이동 / 휠 확대',
  bindings: {
    KeyB: 'special',
    KeyT: 'guard',
    KeyM: 'interact',
    KeyA: 'attack',
    KeyF: 'switch',
    KeyQ: 'ultimate',
    KeyR: 'reload',
  },
  controls: [
    { action: 'ultimate', label: '일꾼 선택', key: 'Q' },
    { action: 'special', label: '병영 건설', key: 'B' },
    { action: 'guard', label: '포탑 건설', key: 'T' },
    { action: 'interact', label: '해병 생산', key: 'M' },
    { action: 'reload', label: '일꾼 생산', key: 'R' },
    { action: 'switch', label: '전투병 선택', key: 'F' },
    { action: 'attack', label: '공격 이동', key: 'A' },
    { action: 'jump', label: '기지로 보기', key: 'Space' },
  ],
  create: () => new ColonySimulation(),
  mount: (canvas, simulation) =>
    mountColony(canvas, simulation as ColonySimulation),
  benchmark: (simulation) => benchmarkColony(simulation as ColonySimulation),
};

export default cartridge;
