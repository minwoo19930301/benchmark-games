import type { Cartridge } from './types';
export const catalog = [
  {
    id: 'smash',
    number: '03',
    title: 'ROOFTOP RUMBLE',
    korean: '옥상 대난투',
    reference: 'Super Smash Bros.',
    year: '1999',
    genre: '발판 난투 · 2.5D',
    description:
      '배달이 끝나면 옥상이 링이 된다. 데미지를 쌓고 상대를 화면 밖으로!',
    accent: '#ec623b',
    load: () => import('./smash/index').then((m) => m.default),
  },
  {
    id: 'ocarina',
    number: '04',
    title: 'OCARINA OF OVERTIME',
    korean: '야근의 오카리나',
    reference: 'Zelda: Ocarina of Time',
    year: '1998',
    genre: '숲 신전 모험 · 3D',
    description: '세 개의 선율을 깨우고, 숲 신전의 야근 수호자를 물리쳐라.',
    accent: '#548b42',
    load: () => import('./ocarina/index').then((m) => m.default),
  },
  {
    id: 'commando',
    number: '05',
    title: 'TIN COMMANDO',
    korean: '깡통 특공대',
    reference: 'Metal Slug',
    year: '1996',
    genre: '횡스크롤 사격 · PIXEL',
    description:
      '시장 골목을 뚫고 동료를 구출하라. 마지막 골목엔 고철 탱크가 기다린다.',
    accent: '#a95a21',
    load: () => import('./commando/index').then((m) => m.default),
  },
  {
    id: 'iron',
    number: '06',
    title: 'IRON FIST DELIVERY',
    korean: '철권 택배',
    reference: 'Tekken',
    year: '1994',
    genre: '입체 대전 · 3D',
    description: '주먹, 발차기, 가드, 횡이동. 오늘의 마지막 배송은 한판 승부.',
    accent: '#bc3549',
    load: () => import('./iron/index').then((m) => m.default),
  },
  {
    id: 'pocket',
    number: '07',
    title: 'POCKET PALS',
    korean: '첫 번째 모험',
    reference: 'Pokémon · 1세대',
    year: '1996',
    genre: '탐험·포획 · PIXEL RPG',
    description:
      '풀숲에서 새 친구를 만나고, 동료를 모아 첫 라이벌에게 도전하자.',
    accent: '#4175bd',
    load: () => import('./pocket/index').then((m) => m.default),
  },
  {
    id: 'x4',
    number: '08',
    title: 'NEON RECLAIMER',
    korean: '네온 회수 작전 · X4',
    reference: 'Mega Man X4',
    year: '1997',
    genre: '대시·벽차기 액션 · PIXEL',
    description:
      '도시를 가르는 고속 대시, 벽차기, 차지샷. 반란 기계의 첫 번째 공장을 돌파하라.',
    accent: '#266baa',
    load: () => import('./reploid/index').then((m) => m.x4),
  },
  {
    id: 'x5',
    number: '09',
    title: 'ORBITAL AFTERBURN',
    korean: '궤도 잔광 · X5',
    reference: 'Mega Man X5',
    year: '2000',
    genre: '공중 대시 액션 · PIXEL',
    description:
      '공중 대시로 위험 구간을 건너고 궤도 시설의 수호 기체와 싸워라.',
    accent: '#387f82',
    load: () => import('./reploid/index').then((m) => m.x5),
  },
  {
    id: 'x6',
    number: '10',
    title: 'ECLIPSE FOUNDRY',
    korean: '식의 용광로 · X6',
    reference: 'Mega Man X6',
    year: '2001',
    genre: '폐허 돌파 액션 · PIXEL',
    description:
      '붕괴한 시설의 함정과 적을 돌파하라. 버스터와 세이버, 두 무기를 함께 다룬다.',
    accent: '#995582',
    load: () => import('./reploid/index').then((m) => m.x6),
  },
  {
    id: 'colony',
    number: '11',
    title: 'COLONY COMMAND',
    korean: '콜로니 커맨드',
    reference: 'StarCraft',
    year: '1998',
    genre: '채집·건설·부대 지휘 · RTS',
    description:
      '일꾼에게 광물을 맡기고 병영을 세워라. 부대를 드래그해 선택하고 우클릭으로 전장을 지휘한다.',
    accent: '#947347',
    load: () => import('./colony/index').then((m) => m.default),
  },
  {
    id: 'watchpoint',
    number: '12',
    title: 'WATCHPOINT / SUNWARD PATROL',
    korean: '워치포인트: 항만 수호대',
    reference: 'Overwatch',
    year: '2016',
    genre: '영웅 전투·거점 점령 · FPS',
    description:
      '해안 도시의 통신 거점을 확보하라. 소총, 대시, 치유 장치, 궁극기를 쓰는 1인칭 전투.',
    accent: '#d77724',
    load: () => import('./watchpoint/index').then((m) => m.default),
  },
  {
    id: 'temple',
    number: '13',
    title: 'EMBER & TIDE',
    korean: '불꽃과 물방울',
    reference: 'Fireboy and Watergirl · Flash',
    year: '2009',
    genre: '한 키보드 2인 협동 · PUZZLE',
    description:
      '같은 색은 안전, 초록은 둘 다 위험! 발판과 레버를 함께 풀어 세 개의 신전 방을 빠져나가자.',
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
