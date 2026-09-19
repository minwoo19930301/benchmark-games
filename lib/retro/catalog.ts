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
