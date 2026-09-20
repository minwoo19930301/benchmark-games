import type { Cartridge } from '../types.ts';
import { benchmarkOcarina, OcarinaSimulation } from './simulation.ts';
import { mountOcarina } from './view.ts';

// Nintendo reference: targeting, strafing, sword charge, shield and ocarina controls.
// https://www.nintendo.com/eu/media/downloads/games_8/quick_start_guide/QuickStartGuide_3DS_TheLegendOfZeldaOcarinaOfTime3D_EN.pdf
// All geometry and painted textures are implemented locally; no game assets are loaded.
const cartridge: Cartridge = {
  id: 'ocarina',
  title: 'The Legend of Zelda: Ocarina of Time',
  subtitle: '코키리 숲 · 데크 나무의 저주',
  inspiration: 'The Legend of Zelda: Ocarina of Time',
  description:
    '링크와 나비가 코키리 숲에서 세 선율을 연주하고 데크 나무 안의 고마에 맞서는 짧은 3D 모험. 뒤따르는 카메라, Z 주시, 검 연속 공격·회전베기, 데크 방패를 직접 조작합니다.',
  objective:
    '세 선율석 가까이에서 E를 누르고 표시된 방향키 선율을 연주하세요. 열린 데크 나무 안에서 고마를 물리친 뒤 제단에서 E로 저주를 풉니다.',
  accent: '#96bf6b',
  renderer: 'webgl',
  pointerMode: 'cursor',
  bindings: { KeyZ: 'switch' },
  inputHint:
    'WASD 이동 · Z를 누르고 있으면 적 주시와 횡이동 · 마우스 오른쪽 드래그로 카메라 회전 · J 짧게 검, 길게 눌렀다 떼면 회전베기',
  controls: [
    { action: 'up', label: '이동 · 연주 중 음 선택', key: 'WASD / 방향키' },
    { action: 'attack', label: '검 · 길게 누른 뒤 떼면 회전베기', key: 'J' },
    { action: 'special', label: '구르기 · 회피', key: 'K' },
    { action: 'guard', label: '정면 방패', key: 'L' },
    { action: 'interact', label: '오카리나 · 확인 · 연주 취소', key: 'E' },
    { action: 'jump', label: '뛰기', key: 'Space' },
    { action: 'switch', label: '누르고 주시 · 카메라 정렬', key: 'Z' },
  ],
  create: () => new OcarinaSimulation(),
  mount: (canvas, simulation) =>
    mountOcarina(canvas, simulation as OcarinaSimulation),
  benchmark: (simulation) => benchmarkOcarina(simulation as OcarinaSimulation),
};
export default cartridge;
