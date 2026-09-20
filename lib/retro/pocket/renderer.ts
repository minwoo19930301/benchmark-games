import { pokemonPixels } from './sprites.ts';
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
  ink: '#172d25',
  paper: '#f0f1d1',
  pale: '#d3ddad',
  grass: '#d3ddad',
  leaf: '#a3b58a',
  darkLeaf: '#526b4f',
  lightLeaf: '#d3ddad',
  sand: '#a3b58a',
  sandLight: '#f0f1d1',
  water: '#a3b58a',
  waterDark: '#526b4f',
  waterLight: '#f0f1d1',
  roof: '#526b4f',
  roofDark: '#172d25',
  roofLight: '#a3b58a',
  wood: '#526b4f',
  cream: '#f0f1d1',
  orange: '#a3b58a',
  orangeDark: '#526b4f',
  teal: '#a3b58a',
};

const frontSprites = Object.fromEntries(
  Object.keys(species).map((id) => [id, pokemonPixels(id as SpeciesId)]),
);
const backSprites = Object.fromEntries(
  Object.keys(species).map((id) => [id, pokemonPixels(id as SpeciesId, true)]),
);
const shades = ['', '#f0f1d1', '#a3b58a', '#526b4f', '#172d25'];

export function mountPocket(
  canvas: HTMLCanvasElement,
  game: PocketSimulation,
): RetroView {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Pokémon needs a 2D canvas.');
  const ctx = context;
  const referenceSprites = new Map<string, HTMLImageElement>();
  if (typeof Image !== 'undefined') {
    for (const id of Object.keys(species))
      for (const side of ['front', 'back']) {
        const image = new Image();
        image.src = new URL(
          `assets/pokemon/${id}-${side}.png`,
          document.baseURI,
        ).href;
        referenceSprites.set(`${id}-${side}`, image);
      }
  }
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
    const reference = referenceSprites.get(
      `${id}-${mirror ? 'back' : 'front'}`,
    );
    if (reference?.complete && reference.naturalWidth > 0) {
      const size = mirror ? 136 : 146;
      if (mirror)
        ctx.drawImage(reference, cx - size / 2, bottom - size, size, size);
      else
        ctx.drawImage(
          reference,
          20,
          20,
          60,
          60,
          cx - size / 2,
          bottom - size,
          size,
          size,
        );
      calls++;
      return;
    }
    const pixels = (mirror ? backSprites : frontSprites)[id];
    const pixelScale = scale * 0.55;
    const x = cx - 32 * pixelScale,
      y = bottom - 64 * pixelScale;
    for (let row = 0; row < 64; row++)
      for (let col = 0; col < 64; col++) {
        const color = shades[pixels[row][col]];
        if (color)
          rect(
            x + col * pixelScale,
            y + row * pixelScale,
            Math.ceil(pixelScale),
            Math.ceil(pixelScale),
            color,
          );
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
    rect(0, 0, 320, 288, colors.grass);
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
    text('BLUE', RIVAL.x * 16 - 10, 18, colors.ink, 6);
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
    text('PALLET TOWN / ROUTE 1', 13, 8, colors.ink, 7);
    box(252, 3, 62, 18);
    orb(258, 7);
    text(`${game.caught.length}/2`, 277, 8);
    box(2, 207, 316, 80);
    paragraph(
      game.messageTime > 0
        ? game.message
        : 'J / E: talk   Grass: POKEMON   CENTER: heal',
      10,
      215,
      36,
      4,
      16,
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
    rect(0, 0, 320, 288, '#ffffff');
    // A front-facing opponent and a distinct back sprite, with the original diagonal battle layout.
    if (foe.outcome === 'caught') orb(243, 115);
    else creature(foe.id, 245 + (foe.flash > 0 ? 3 : 0), 128, 2.8);
    creature(game.pal.id, 75 - (foe.flash > 0 ? 2 : 0), 202, 3.3, true);
    text(species[foe.id].name, 20, 20, colors.ink, 12);
    text(foe.kind === 'rival' ? ':L12' : ':L5', 97, 35, colors.ink, 10);
    health(22, 51, foe.hp, foe.maxHp, 101);
    rect(17, 64, 148, 2, colors.ink);
    rect(15, 42, 2, 24, colors.ink);
    rect(162, 60, 5, 6, colors.ink);
    text(species[game.pal.id].name, 174, 140, colors.ink, 12);
    text(':L9', 267, 154, colors.ink, 10);
    health(178, 173, game.pal.hp, species[game.pal.id].maxHp, 111);
    text(
      `${game.pal.hp} / ${species[game.pal.id].maxHp}`,
      230,
      185,
      colors.ink,
      12,
    );
    rect(171, 204, 143, 2, colors.ink);
    rect(313, 167, 2, 39, colors.ink);
    box(2, 211, 316, 76);
    const canChoose = foe.cooldown <= 0 && !foe.outcome;
    if (canChoose) {
      if (foe.menu === 'main') {
        paragraph(
          `What will ${species[game.pal.id].name} do?`,
          13,
          225,
          20,
          3,
          15,
        );
        box(161, 211, 157, 76);
        ['FIGHT', 'PKMN', 'ITEM', 'RUN'].forEach((label, i) => {
          const x = 180 + (i % 2) * 70,
            y = 228 + Math.floor(i / 2) * 30;
          if (i === foe.cursor) text('▶', x - 12, y, colors.ink, 10);
          text(label, x, y, colors.ink, 11);
        });
      } else if (foe.menu === 'moves') {
        text('TYPE', 15, 224, colors.ink, 10);
        text(
          foe.cursor === 0
            ? 'NORMAL'
            : species[game.pal.id].element.toUpperCase(),
          15,
          243,
          colors.ink,
          10,
        );
        [
          game.pal.id === 'charmander' ? 'SCRATCH' : 'TACKLE',
          species[game.pal.id].move,
        ].forEach((label, i) => {
          text(
            `${i === foe.cursor ? '▶' : ' '} ${label}`,
            151,
            227 + i * 24,
            colors.ink,
            11,
          );
        });
      } else if (foe.menu === 'items') {
        [`POKE BALL  ×${game.balls}`, `POTION     ×${game.cakes}`].forEach(
          (label, i) =>
            text(
              `${i === foe.cursor ? '▶' : ' '} ${label}`,
              20,
              227 + i * 25,
              colors.ink,
              12,
            ),
        );
      } else {
        game.party.forEach((pal, i) =>
          text(
            `${i === foe.cursor ? '▶' : ' '} ${species[pal.id].name}  ${pal.hp}/${species[pal.id].maxHp}`,
            15,
            220 + i * 19,
            colors.ink,
            10,
          ),
        );
      }
    } else paragraph(game.message, 14, 225, 36, 3, 16);
    if (foe.transition > 0) {
      const band = Math.floor(foe.transition * 12) % 2;
      if (band) {
        rect(0, 0, 320, 288, colors.ink);
        text('WILD POKEMON!', 70, 130, colors.paper, 16);
      }
    }
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
      const scale = Math.min(physicalWidth / 320, physicalHeight / 288);
      ctx.setTransform(
        scale,
        0,
        0,
        scale,
        Math.round((physicalWidth - 320 * scale) / 2),
        Math.round((physicalHeight - 288 * scale) / 2),
      );
      ctx.imageSmoothingEnabled = false;
      if (game.mode === 'world') world();
      else battle();
    },
    dispose(): void {
      disposed = true;
      referenceSprites.clear();
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
