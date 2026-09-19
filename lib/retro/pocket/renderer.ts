import type { RetroView } from '../types.ts';
import {
  CLINIC,
  MAP_HEIGHT,
  MAP_WIDTH,
  PocketSimulation,
  RIVAL,
  species,
  terrainAt,
  type SpeciesId,
} from './simulation.ts';

const colors = {
  ink: '#293b42',
  paper: '#fff3d2',
  pale: '#e9e7b5',
  grass: '#b8ce87',
  leaf: '#679f68',
  darkLeaf: '#3c705c',
  lightLeaf: '#a4ce80',
  sand: '#dfc889',
  sandLight: '#ecdba8',
  water: '#78bbc0',
  waterDark: '#448caa',
  waterLight: '#b5e0d2',
  roof: '#b95e61',
  roofDark: '#854552',
  roofLight: '#e18b7a',
  wood: '#9c805e',
  cream: '#f9dfa2',
  orange: '#eaa156',
  orangeDark: '#be664d',
  teal: '#579daa',
};

// Every character and creature is an original, hand-placed pixel drawing.
const sprites: Record<SpeciesId, string[]> = {
  tangerex: [
    '..........GG............',
    '.........GgGG...........',
    '........GGggG...........',
    '........DDD.............',
    '......DDoooDD...........',
    '.....DoooooooD..........',
    '....DoooooooooD.........',
    '....DooWkoWkooD.........',
    '....DooWkoWkooD.........',
    '....DoooooooooD......DD.',
    '.....DoCCCCCoD.....DooD.',
    '......DCCkCCD.....DoooD.',
    '......DCCCCCD.....DooD..',
    '.....DoooooooD...DooD...',
    '....DooCCCCoooDDDooD....',
    '...DooDCCCCDooooooD.....',
    '...DDDCCCCCCDDoooD......',
    '.....DCCCCCCD.DDD.......',
    '.....DCCCCCCD...........',
    '.....DooooooD...........',
    '....DoooDDoooD..........',
    '...DCCCCDDCCCCD.........',
    '....DDDD..DDDD..........',
  ],
  dokkaebud: [
    '..........G.............',
    '.....GG..GgG............',
    '....GggGGggG.GGG........',
    '.....GgggggGGgggG.......',
    '......GGggggggGG........',
    '........DgggDD..........',
    '.....Y.DDggggDD.Y.......',
    '....DYDggggggggDYD......',
    '...DggggggggggggggD.....',
    '...DggWWgggggWWgggD.....',
    '...DggWkgggggWkgggD.....',
    '...DggggggggggggggD.....',
    '....DggCggkkggCggD......',
    '.....DggggggggggD.......',
    '...DDgggCCCCCCgggDD.....',
    '..DggDgCCCCCCCCgDggD....',
    '..DgDDgCCCYCCCggDDgD....',
    '...D.DgCCCCCCCggD.D.....',
    '.....DggCCCCCgggD.......',
    '......DggggggggD........',
    '......DggDDggggD........',
    '.....DgggD.DggggD.......',
    '......DDD...DDDD........',
  ],
  puddleot: [
    '.....DDD.......DDD......',
    '....DtttD.....DtttD.....',
    '....DtCtDDDDDDtCtD......',
    '.....DttttttttttD.......',
    '....DttttttttttttD......',
    '...DttttttttttttttD.....',
    '...DtttWkttttWktttD.....',
    '...DtttWkttttWktttD.....',
    '..DCCCCttCCttCCCCCCD....',
    '..DCCCCCkkkCCCCCCCD.....',
    '...DDCCCCkCCCCCDD.......',
    '..k..DCCCCCCCCD..k......',
    '.....DttttttttD.........',
    '....DttCCCCCCttD........',
    '...DtttCCCCCCtttD.......',
    '..DttDtCCCCCCtDttD......',
    '..DDDttCCCCCCttDDD......',
    '.....DtCCCCCCttD..DDD...',
    '.....DttCCCCtttDDDtttD..',
    '.....DttttttttttttttD...',
    '....DttttDDttttDDDDD....',
    '...DCCCCD..DCCCCD.......',
    '....DDDD....DDDD........',
  ],
};

const spritePalette: Record<string, string> = {
  D: colors.ink,
  k: colors.ink,
  W: colors.paper,
  C: colors.cream,
  o: colors.orange,
  g: colors.leaf,
  G: colors.darkLeaf,
  Y: colors.sand,
  t: colors.teal,
};

export function mountPocket(
  canvas: HTMLCanvasElement,
  game: PocketSimulation,
): RetroView {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Pocket Pals needs a 2D canvas.');
  const ctx = context;
  let disposed = false;
  let calls = 0;

  function rect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
    calls++;
  }
  function text(
    value: string,
    x: number,
    y: number,
    color = colors.ink,
    size = 8,
  ): void {
    ctx.font = `bold ${size}px monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.fillText(value, Math.round(x), Math.round(y));
    calls++;
  }
  function box(x: number, y: number, w: number, h: number): void {
    rect(x, y, w, h, colors.ink);
    rect(x + 2, y + 2, w - 4, h - 4, colors.paper);
    rect(x + 4, y + 4, w - 8, h - 8, colors.ink);
    rect(x + 5, y + 5, w - 10, h - 10, colors.paper);
  }
  function paragraph(
    value: string,
    x: number,
    y: number,
    maxChars: number,
    lines: number,
    spacing = 10,
  ): void {
    let line = '',
      row = 0;
    for (const word of value.split(' ')) {
      if (line.length && line.length + word.length + 1 > maxChars) {
        text(line, x, y + row * spacing);
        if (++row === lines) return;
        line = word;
      } else line += `${line ? ' ' : ''}${word}`;
    }
    if (row < lines) text(line, x, y + row * spacing);
  }
  function orb(x: number, y: number, caught = true): void {
    rect(x + 2, y, 6, 10, colors.ink);
    rect(x, y + 2, 10, 6, colors.ink);
    rect(x + 2, y + 2, 6, 3, caught ? colors.roof : colors.wood);
    rect(x + 2, y + 6, 6, 2, colors.paper);
    rect(x + 4, y + 4, 2, 2, colors.paper);
  }
  function creature(
    id: SpeciesId,
    cx: number,
    bottom: number,
    scale: number,
    mirror = false,
  ): void {
    const pixels = sprites[id];
    const x = cx - 12 * scale,
      y = bottom - pixels.length * scale;
    for (let row = 0; row < pixels.length; row++) {
      for (let col = 0; col < pixels[row].length; col++) {
        const color = spritePalette[pixels[row][col]];
        if (color)
          rect(
            x + (mirror ? 23 - col : col) * scale,
            y + row * scale,
            scale,
            scale,
            color,
          );
      }
    }
  }
  function trainer(
    x: number,
    y: number,
    role: 'player' | 'nurse' | 'rival',
    facing = 'down',
    walk = 0,
  ): void {
    const px = Math.round(x - 7),
      py = Math.round(y - 15);
    const shirt =
      role === 'nurse'
        ? colors.paper
        : role === 'rival'
          ? colors.leaf
          : colors.waterDark;
    const cap = role === 'rival' ? colors.orangeDark : colors.roof;
    rect(px + 3, py + 16, 10, 2, colors.darkLeaf);
    rect(px + 3, py + 11, 9, 5, colors.ink);
    const stride = Math.floor(walk * 5) % 2;
    rect(px + 2, py + 15 + stride, 4, 2, colors.ink);
    rect(px + 9, py + 16 - stride, 4, 2, colors.ink);
    rect(px + 2, py + 9, 11, 5, shirt);
    rect(px, py + 10, 3, 4, colors.cream);
    rect(px + 12, py + 10, 3, 4, colors.cream);
    rect(px + 3, py + 1, 9, 9, colors.ink);
    rect(px + 4, py + 4, 8, 5, colors.cream);
    rect(px + 3, py, 9, 4, role === 'nurse' ? colors.paper : cap);
    rect(px + 2, py + 3, 12, 2, role === 'nurse' ? colors.paper : cap);
    if (role === 'nurse') {
      rect(px + 7, py, 2, 4, colors.roof);
      rect(px + 6, py + 1, 4, 2, colors.roof);
    }
    if (facing === 'up') {
      rect(px + 3, py + 5, 9, 4, colors.wood);
      rect(px + 5, py + 10, 5, 5, colors.orange);
      rect(px + 6, py + 11, 3, 2, colors.cream);
    } else {
      if (facing !== 'left') rect(px + 10, py + 5, 1, 2, colors.ink);
      if (facing !== 'right') rect(px + 5, py + 5, 1, 2, colors.ink);
    }
  }
  function tree(x: number, y: number): void {
    rect(x + 6, y + 10, 5, 6, colors.wood);
    rect(x + 3, y + 12, 10, 2, colors.darkLeaf);
    rect(x + 2, y + 5, 13, 7, colors.darkLeaf);
    rect(x + 4, y + 1, 9, 12, colors.darkLeaf);
    rect(x + 4, y + 4, 8, 7, colors.leaf);
    rect(x + 6, y + 2, 4, 4, colors.lightLeaf);
    rect(x + 2, y + 8, 5, 2, colors.leaf);
    rect(x + 10, y + 8, 4, 2, colors.leaf);
  }
  function house(x: number, y: number, width: number, clinic: boolean): void {
    rect(x + 3, y + 10, width - 6, 37, colors.ink);
    rect(x + 5, y + 13, width - 10, 31, colors.cream);
    rect(x, y + 4, width, 14, colors.roofDark);
    rect(x + 4, y, width - 8, 15, colors.roof);
    for (let row = 3; row < 15; row += 5) {
      rect(x + 5, y + row, width - 10, 1, colors.roofLight);
      for (let col = 8; col < width - 5; col += 13)
        rect(x + col + (row % 2) * 3, y + row, 1, 5, colors.roofDark);
    }
    rect(x + width / 2 - 6, y + 29, 12, 17, colors.wood);
    rect(x + width / 2 - 4, y + 31, 8, 15, colors.ink);
    rect(x + width / 2 + 1, y + 38, 2, 2, colors.cream);
    for (const dx of [12, width - 22]) {
      rect(x + dx - 1, y + 24, 11, 11, colors.wood);
      rect(x + dx, y + 25, 9, 8, colors.water);
      rect(x + dx + 4, y + 25, 1, 8, colors.paper);
      rect(x + dx, y + 28, 9, 1, colors.paper);
    }
    if (clinic) {
      rect(x + width / 2 - 7, y + 7, 14, 14, colors.paper);
      rect(x + width / 2 - 2, y + 9, 4, 10, colors.roof);
      rect(x + width / 2 - 5, y + 12, 10, 4, colors.roof);
    }
  }
  function world(): void {
    rect(0, 0, 320, 240, colors.grass);
    for (let row = 0; row < MAP_HEIGHT; row++) {
      for (let col = 0; col < MAP_WIDTH; col++) {
        const x = col * 16,
          y = row * 16,
          tile = terrainAt(col, row);
        if (tile === 'tree') tree(x, y);
        else if (tile === 'path') {
          rect(x, y, 16, 16, colors.sandLight);
          rect(x + ((row * 3 + col * 7) % 11), y + 4, 2, 1, colors.sand);
          rect(x + 10, y + 11, 2, 1, colors.sand);
        } else if (tile === 'water') {
          rect(x, y, 16, 16, colors.water);
          if (col === 14 || row === 5) rect(x, y, 16, 2, colors.waterDark);
          const wave = (col + Math.floor(game.time * 1.8)) % 3;
          rect(x + 2 + wave, y + 5, 7, 1, colors.waterLight);
          rect(x + 8 - wave, y + 11, 5, 1, colors.waterDark);
        } else if (tile === 'grass') {
          rect(x, y, 16, 16, colors.lightLeaf);
          for (const offset of [0, 8]) {
            rect(x + offset + 1, y + 3, 1, 4, colors.darkLeaf);
            rect(x + offset + 2, y + 5, 2, 4, colors.leaf);
            rect(x + offset + 4, y + 2, 1, 6, colors.darkLeaf);
            rect(x + offset + 5, y + 4, 2, 4, colors.leaf);
            rect(x + offset, y + 13, 7, 1, colors.leaf);
            rect(x + offset + 2, y + 10, 1, 3, colors.darkLeaf);
            rect(x + offset + 5, y + 9, 1, 4, colors.darkLeaf);
          }
        } else if (tile === 'lawn') {
          rect(x + 3, y + 10, 2, 2, colors.lightLeaf);
          if ((col * 5 + row * 7) % 9 === 0) {
            rect(x + 9, y + 5, 2, 5, colors.leaf);
            rect(x + 7, y + 3, 6, 3, colors.paper);
            rect(x + 9, y + 2, 2, 5, colors.paper);
            rect(x + 9, y + 3, 2, 2, colors.roofLight);
          }
        }
      }
    }
    // Deliberate landmark silhouettes keep the little route legible at a glance.
    house(16, 128, 80, true);
    house(224, 159, 64, false);
    for (let x = 24; x < 92; x += 12) {
      rect(x, 106, 3, 18, colors.wood);
      rect(x - 2, 110, 14, 2, colors.cream);
      rect(x - 2, 117, 14, 2, colors.cream);
    }
    rect(194, 59, 3, 13, colors.wood);
    rect(185, 57, 21, 10, colors.ink);
    rect(186, 58, 19, 8, colors.cream);
    text('R1', 190, 58, colors.wood, 7);
    trainer(CLINIC.x * 16, CLINIC.y * 16, 'nurse');
    trainer(RIVAL.x * 16, RIVAL.y * 16, 'rival');
    text('MISO', RIVAL.x * 16 - 10, 18, colors.ink, 6);
    const { player } = game;
    trainer(
      player.x * 16,
      player.y * 16,
      'player',
      player.facing,
      player.moving ? player.walk : 0,
    );
    if (terrainAt(player.x, player.y) === 'grass') {
      for (let i = -5; i <= 5; i += 3)
        rect(player.x * 16 + i, player.y * 16 - 1, 2, 4, colors.leaf);
    }
    box(6, 3, 149, 18);
    text('CITRUS TOWN / ROUTE 1', 13, 8, colors.ink, 7);
    box(252, 3, 62, 18);
    orb(258, 7);
    text(`${game.caught.length}/2`, 277, 8);
    box(2, 207, 316, 32);
    paragraph(
      game.messageTime > 0
        ? game.message
        : 'J / E: talk   Grass: wild pals   Clinic: free healing',
      10,
      215,
      60,
      2,
      10,
    );
  }
  function health(
    x: number,
    y: number,
    hp: number,
    maxHp: number,
    width: number,
  ): void {
    text('HP', x, y, colors.wood, 6);
    rect(x + 15, y, width, 6, colors.ink);
    rect(x + 16, y + 1, width - 2, 4, colors.pale);
    rect(
      x + 16,
      y + 1,
      Math.max(0, Math.round(((width - 2) * hp) / maxHp)),
      4,
      hp / maxHp > 0.45
        ? colors.leaf
        : hp / maxHp > 0.2
          ? colors.orange
          : colors.roof,
    );
  }
  function battle(): void {
    const foe = game.battle;
    if (!foe) return;
    rect(0, 0, 320, 240, colors.paper);
    rect(0, 65, 320, 2, colors.pale);
    rect(0, 69, 320, 1, colors.pale);
    // Stepped pixel islands, as if the battle were taking place on a folded field map.
    rect(194, 108, 100, 8, colors.pale);
    rect(207, 105, 76, 14, colors.pale);
    rect(14, 143, 114, 7, colors.pale);
    rect(27, 140, 89, 13, colors.pale);
    const bob = Math.floor(game.time * 2) % 2;
    if (foe.outcome === 'caught') orb(239, 99);
    else creature(foe.id, 242 + (foe.flash > 0 ? 2 : 0), 111 + bob, 3);
    creature(game.pal.id, 68, 148 + bob, 3, true);
    box(7, 7, 155, 46);
    text(species[foe.id].name, 15, 14);
    text(foe.kind === 'rival' ? 'Lv9' : 'Lv5', 132, 14, colors.wood, 7);
    health(15, 28, foe.hp, foe.maxHp, 87);
    text(
      `${foe.hp}/${foe.maxHp}  ${species[foe.id].element.toUpperCase()}`,
      15,
      39,
      colors.wood,
      6,
    );
    text(
      foe.kind === 'rival' ? 'MISO WANTS TO BATTLE!' : 'WILD PAL / ROUTE 1',
      12,
      61,
      colors.wood,
      6,
    );
    text('YOUR TEAM', 12, 75, colors.wood, 6);
    game.party.forEach((pal, index) => {
      orb(14 + index * 15, 87, pal.hp > 0);
      if (index === game.active) rect(14 + index * 15, 99, 10, 2, colors.ink);
    });
    box(151, 107, 163, 45);
    text(species[game.pal.id].name, 160, 114);
    text('Lv5', 283, 114, colors.wood, 7);
    health(160, 127, game.pal.hp, species[game.pal.id].maxHp, 108);
    text(
      `${game.pal.hp}/${species[game.pal.id].maxHp} HP`,
      160,
      138,
      colors.wood,
      7,
    );
    text('< > SWITCH', 257, 139, colors.wood, 6);
    box(3, 155, 314, 43);
    paragraph(game.message, 12, 163, 59, 3, 10);
    box(3, 200, 314, 39);
    rect(163, 206, 1, 26, colors.sand);
    text('J QUICK BUMP', 13, 207, colors.ink, 7);
    text(`K ${species[game.pal.id].move}`, 173, 207, colors.ink, 7);
    text(`L CATCH ORB x${game.balls}`, 13, 222, colors.ink, 7);
    text(`E RICE CAKE x${game.cakes}`, 173, 222, colors.ink, 7);
  }

  return {
    render(width: number, height: number): void {
      if (
        disposed ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      )
        return;
      const dpr = Math.min(1.5, Math.max(1, globalThis.devicePixelRatio || 1));
      const physicalWidth = Math.max(1, Math.round(width * dpr));
      const physicalHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
      }
      calls = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      rect(0, 0, physicalWidth, physicalHeight, colors.ink);
      const scale = Math.min(physicalWidth / 320, physicalHeight / 240);
      ctx.setTransform(
        scale,
        0,
        0,
        scale,
        Math.round((physicalWidth - 320 * scale) / 2),
        Math.round((physicalHeight - 240 * scale) / 2),
      );
      ctx.imageSmoothingEnabled = false;
      if (game.mode === 'world') world();
      else battle();
    },
    dispose(): void {
      disposed = true;
    },
    metrics: () => ({
      drawCalls: calls,
      entities:
        game.mode === 'world'
          ? MAP_WIDTH * MAP_HEIGHT + 3
          : game.party.length + 1,
    }),
  };
}
