import type { Cartridge } from './types';
export const catalog = [
  {
    id: 'smash',
    number: '03',
    title: 'SUPER SMASH BROS.',
    korean: '슈퍼 스매시브라더스',
    reference: 'Super Smash Bros.',
    year: '1999',
    genre: '발판 난투 · 2.5D',
    description: '마리오와 커비. 피해율을 쌓고 장외로 날리는 3스톡 대전.',
    accent: '#ec623b',
    load: () => import('./smash/index').then((m) => m.default),
  },
  {
    id: 'ocarina',
    number: '04',
    title: 'THE LEGEND OF ZELDA',
    korean: '젤다의 전설: 시간의 오카리나',
    reference: 'Zelda: Ocarina of Time',
    year: '1998',
    genre: '숲 신전 모험 · 3D',
    description:
      '링크와 나비가 코키리 숲에서 데크나무 안으로. 주목 전투와 오카리나.',
    accent: '#548b42',
    load: () => import('./ocarina/index').then((m) => m.default),
  },
  {
    id: 'commando',
    number: '05',
    title: 'METAL SLUG',
    korean: '메탈슬러그',
    reference: 'Metal Slug',
    year: '1996',
    genre: '횡스크롤 사격 · PIXEL',
    description: '마르코의 적진 돌파. 사격과 수류탄, 포로 구출과 슬러그 탑승.',
    accent: '#a95a21',
    load: () => import('./commando/index').then((m) => m.default),
  },
  {
    id: 'iron',
    number: '06',
    title: 'TEKKEN 3',
    korean: '철권 3',
    reference: 'Tekken 3',
    year: '1997',
    genre: '입체 대전 · 3D',
    description:
      '진 카자마와 화랑. 네 개의 공격 버튼, 뒤로 가드, 횡이동과 공중 콤보.',
    accent: '#bc3549',
    load: () => import('./iron/index').then((m) => m.default),
  },
  {
    id: 'pocket',
    number: '07',
    title: 'POKÉMON RED / BLUE',
    korean: '포켓몬스터 1세대',
    reference: 'Pokémon · 1세대',
    year: '1996',
    genre: '탐험·포획 · PIXEL RPG',
    description:
      '태초마을에서 1번 도로로. 야생 포켓몬을 만나고 몬스터볼로 포획한다.',
    accent: '#4175bd',
    load: () => import('./pocket/index').then((m) => m.default),
  },
  {
    id: 'x4',
    number: '08',
    title: 'MEGA MAN X4',
    korean: '록맨 X4',
    reference: 'Mega Man X4',
    year: '1997',
    genre: '대시·벽차기 액션 · PIXEL',
    description: '대시 점프와 차지 버스터로 무너지는 스카이 라군을 돌파한다.',
    accent: '#266baa',
    load: () => import('./reploid/index').then((m) => m.x4),
  },
  {
    id: 'x5',
    number: '09',
    title: 'MEGA MAN X5',
    korean: '록맨 X5',
    reference: 'Mega Man X5',
    year: '2000',
    genre: '공중 대시 액션 · PIXEL',
    description:
      '저중력 천문대에서 벽차기와 차지샷으로 다크 네크로뱃에 맞선다.',
    accent: '#387f82',
    load: () => import('./reploid/index').then((m) => m.x5),
  },
  {
    id: 'x6',
    number: '10',
    title: 'MEGA MAN X6',
    korean: '록맨 X6',
    reference: 'Mega Man X6',
    year: '2001',
    genre: '폐허 돌파 액션 · PIXEL',
    description:
      '마그마 에어리어에서 버스터와 Z 세이버로 블레이즈 히트닉스에 맞선다.',
    accent: '#995582',
    load: () => import('./reploid/index').then((m) => m.x6),
  },
  {
    id: 'colony',
    number: '11',
    title: 'STARCRAFT',
    korean: '스타크래프트',
    reference: 'StarCraft',
    year: '1998',
    genre: '채집·건설·부대 지휘 · RTS',
    description:
      '테란 기지를 건설하고 SCV로 자원을 채집하며 해병 부대를 지휘한다.',
    accent: '#947347',
    load: () => import('./colony/index').then((m) => m.default),
  },
  {
    id: 'watchpoint',
    number: '12',
    title: 'OVERWATCH',
    korean: '오버워치',
    reference: 'Overwatch',
    year: '2016',
    genre: '영웅 전투·거점 점령 · FPS',
    description:
      '솔저: 76의 소총, 질주, 생체장과 나선 로켓으로 거점을 확보한다.',
    accent: '#d77724',
    load: () => import('./watchpoint/index').then((m) => m.default),
  },
  {
    id: 'temple',
    number: '13',
    title: 'FIREBOY & WATERGIRL',
    korean: '불소년과 물소녀',
    reference: 'Fireboy and Watergirl · Flash',
    year: '2009',
    genre: '한 키보드 2인 협동 · PUZZLE',
    description:
      '숲의 신전에서 두 캐릭터를 조작해 원소 함정과 발판 퍼즐을 해결한다.',
    accent: '#b36b34',
    load: () => import('./temple/index').then((m) => m.default),
  },
] satisfies {
  id: string;
  number: string;
  title: string;
  korean: string;
  reference: string;
  year: string;
  genre: string;
  description: string;
  accent: string;
  load: () => Promise<Cartridge>;
}[];
export type CatalogEntry = (typeof catalog)[number];
export const findGame = (id: string) => catalog.find((game) => game.id === id);
