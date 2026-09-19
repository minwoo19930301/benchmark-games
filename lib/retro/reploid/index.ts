import type { Cartridge } from '../types.ts';
import { ReploidSimulation, benchmarkReploid } from './simulation.ts';
import { mountReploid } from './view.ts';
import { stages, type StageId } from './world.ts';

export function createReploidCartridge(id: StageId): Cartridge {
  const stage = stages[id];
  return {
    id,
    renderer: 'canvas',
    title: stage.title,
    subtitle: stage.subtitle,
    inspiration: `Mega Man ${id.toUpperCase()}`,
    description:
      id === 'x4'
        ? '비 내리는 화물 도시를 돌파하는 정밀 메카 액션. 대시 점프와 벽차기로 길을 열고, 차지 버스터와 세이버로 볼트 맨티스를 격파하세요.'
        : id === 'x5'
          ? '저중력 궤도 기지의 움직이는 발판을 건너세요. 공중 대시로 낙하를 회복하고, 궤도 수호자의 탄막을 돌파합니다.'
          : '재와 용광로 사이, 컨베이어와 증기 분출을 넘어 반응로에 진입하세요. 경고 신호를 읽고 신더 재칼의 과열 돌진을 피하세요.',
    objective:
      '체크포인트를 확보하고 2단계 수호자를 격파하세요. 동료 구조는 선택 목표입니다.',
    accent: stage.accent,
    controls: [
      { action: 'jump', label: '점프 / 벽차기', key: 'SPACE' },
      { action: 'attack', label: '버스터 (길게 눌러 차지)', key: 'J' },
      { action: 'special', label: '세이버 / 탄환 베기', key: 'K' },
      {
        action: 'guard',
        label: id === 'x4' ? '대시' : '대시 / 공중 대시',
        key: 'L',
      },
      { action: 'interact', label: '동료 구조', key: 'E' },
    ],
    create: () => new ReploidSimulation(id),
    mount: (canvas, simulation) =>
      mountReploid(canvas, simulation as ReploidSimulation),
    benchmark: (simulation) =>
      benchmarkReploid(simulation as ReploidSimulation),
  };
}
export const x4 = createReploidCartridge('x4');
export const x5 = createReploidCartridge('x5');
export const x6 = createReploidCartridge('x6');
export default x4;
