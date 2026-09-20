import type { Cartridge } from '../types.ts';
import { benchmarkColony, ColonySimulation } from './simulation.ts';
import { mountColony } from './view.ts';

const cartridge: Cartridge = {
  id: 'colony',
  title: 'StarCraft · Terran Command',
  subtitle: '테란 전초기지 · 배드랜드 작전',
  inspiration: 'StarCraft',
  description:
    'SCV의 채굴과 운반, 병영 생산, 벙커 방어, 부대 지휘가 맞물리는 실시간 전략 작전. 광물 지대를 확보하고 안개 속 적 커맨드 센터를 파괴하세요.',
  objective:
    '지휘 기지를 지키며 병영과 해병 부대를 준비하세요. 마린으로 벙커를 우클릭하면 탑승하고, 하단 내리기 버튼으로 하차합니다. 적 커맨드 센터를 파괴하면 승리합니다.',
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
    KeyV: 'left2',
    KeyH: 'right2',
    KeyS: 'jump2',
  },
  controls: [
    { action: 'ultimate', label: 'SCV 선택', key: 'Q' },
    { action: 'special', label: '병영 건설', key: 'B' },
    { action: 'guard', label: '벙커 건설', key: 'T' },
    { action: 'left2', label: '보급고 건설', key: 'V' },
    { action: 'right2', label: '위치 사수', key: 'H' },
    { action: 'jump2', label: '정지', key: 'S' },
    { action: 'interact', label: '해병 생산', key: 'M' },
    { action: 'reload', label: 'SCV 생산', key: 'R' },
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
