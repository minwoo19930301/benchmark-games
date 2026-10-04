import type { Cartridge } from '../types.ts';
import { ReploidSimulation, benchmarkReploid } from './simulation.ts';
import { mountReploid } from './view.ts';
import { stages, type StageId } from './world.ts';

// Reference: https://megaman.capcom.com/mmxlc.html (X/Zero, dash and wall-jump).
// Stage names: Capcom Sound Collections on Steam, app/906634, app/906635, app/906636.
// X/Zero frames are attributed Capcom artwork; see public/assets/reploid/SOURCES.json.
// Scenery, enemies and missing-pose fallbacks use local drawing code. No original game audio.
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
        ? '스카이 라군의 공중 도로와 무너진 도시를 넘어 에레기온에 맞서는 짧은 X4 스테이지. 파란 엑스의 차지 버스터와 빨간 제로의 Z 세이버를 F로 선택합니다.'
        : id === 'x5'
          ? '별자리와 행성이 투영되는 천체관의 저중력 발판 구간. 다크 네크로뱃의 박쥐 떼와 다크 홀드를 피하며 싸우는 짧은 X5 스테이지입니다.'
          : '용암과 현무암으로 둘러싸인 마그마 지대. 분출 화염을 지나 블레이즈 히트닉스의 불꽃 파도와 낙하 불꽃을 돌파하는 짧은 X6 스테이지입니다.',
    objective: `대시 점프와 벽차기로 체크포인트를 확보하고 ${stage.bossName}를 격파하세요. F로 엑스·제로를 선택합니다.`,
    inputHint:
      'A/D 이동 · SPACE 점프/벽차기 · L 대시 · F 엑스/제로 · 엑스 J 차지 버스터, 제로 J/K 세이버',
    accent: stage.accent,
    controls: [
      { action: 'jump', label: '점프 / 벽차기', key: 'SPACE' },
      { action: 'attack', label: '엑스 차지 버스터 · 제로 세이버', key: 'J' },
      {
        action: 'special',
        label:
          id === 'x6' ? 'Z 세이버 · 탄환 베기' : '제로 Z 세이버 · 탄환 베기',
        key: 'K',
      },
      {
        action: 'guard',
        label: id === 'x4' ? '대시' : '대시 / 공중 대시',
        key: 'L',
      },
      { action: 'interact', label: '레플리로이드 구조', key: 'E' },
      { action: 'switch', label: '엑스 / 제로 선택', key: 'F' },
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
