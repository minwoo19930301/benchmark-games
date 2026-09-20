import type { RetroView } from '../types.ts';
import { pixelArt } from './art.ts';
import { createHunterSprites } from './sprites.ts';
import { hazardPhase, platformAt } from './world.ts';
import type { ReploidSimulation } from './simulation.ts';

export function mountReploid(
  canvas: HTMLCanvasElement,
  sim: ReploidSimulation,
): RetroView {
  const target = canvas.getContext('2d')!;
  if (!target) throw new Error('2D 그래픽 화면을 열 수 없습니다.');
  const buffer = document.createElement('canvas');
  const ctx = buffer.getContext('2d')!;
  if (!ctx) throw new Error('픽셀 화면을 준비하지 못했습니다.');
  const sprites = createHunterSprites();
  const g = pixelArt(ctx, sprites),
    stage = sim.stage;
  let disposed = false;
  const hash = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  function background(vw: number, camX: number, camY: number) {
    g.rect(0, 0, vw, 360, stage.sky);
    if (stage.id === 'x4') {
      // Sky Lagoon's elevated, white-green city hangs over a vast cloud layer.
      const skyBands = ['#5c9bd0', '#71b1dc', '#91c9e6', '#b6dce9', '#d8ebeb'];
      skyBands.forEach((color, index) => g.rect(0, index * 50, vw, 51, color));
      for (let layer = 0; layer < 2; layer++)
        for (let i = 0; i < 12; i++) {
          const x = i * 150 - ((camX * (0.025 + layer * 0.025)) % 150),
            y = 135 + layer * 62 + (i % 3) * 12;
          g.poly(
            [
              x - 25,
              y + 20,
              x - 12,
              y + 8,
              x + 12,
              y + 8,
              x + 28,
              y - 7,
              x + 69,
              y - 7,
              x + 86,
              y + 5,
              x + 121,
              y + 8,
              x + 134,
              y + 24,
            ],
            layer ? '#eff9ef' : '#d9edf0',
            '',
          );
        }
      for (let i = 0; i < 13; i++) {
        const x = i * 130 - ((camX * 0.14) % 130),
          h = 48 + hash(i) * 86;
        g.rect(x, 205 - h, 63, h, '#81a9bc');
        g.rect(x + 5, 200 - h, 47, 6, '#b3d4db');
        g.rect(x + 23, 178 - h, 14, 24, '#8eb9cc');
        g.rect(x + 29, 165 - h, 3, 17, '#517d98');
        for (let row = 0; row < 8; row++)
          for (let col = 0; col < 4; col++)
            g.rect(x + 8 + col * 12, 214 - h + row * 10, 5, 4, '#588dab');
        g.rect(x - 14, 204, 89, 8, '#668da6');
        g.poly(
          [x - 8, 212, x + 18, 234, x + 49, 236, x + 73, 212],
          '#9fb8c6',
          '',
        );
      }
      for (let i = 0; i < 7; i++) {
        const x = i * 260 - ((camX * 0.34) % 260),
          y = 176 - camY * 0.12;
        g.rect(x, y, 146, 82, '#bed4cb');
        g.rect(x + 8, y + 9, 128, 59, '#689b9b');
        g.rect(x + 18, y + 18, 103, 14, '#487a8c');
        g.rect(x + 18, y + 39, 103, 13, '#7eb5b0');
        for (let col = 0; col < 5; col++)
          g.rect(x + 20 + col * 22, y + 19, 2, 30, '#a9d9d1');
        g.rect(x - 13, y + 69, 173, 12, '#d6e6d3');
        g.rect(x - 7, y + 79, 163, 14, '#8bb0ab');
        g.poly(
          [x + 146, y + 18, x + 189, y + 13, x + 183, y + 42, x + 150, y + 46],
          '#8eafad',
          '',
        );
        if (i % 2 === 0)
          g.poly(
            [
              x + 102,
              y - 4,
              x + 114,
              y + 15,
              x + 124,
              y + 6,
              x + 137,
              y + 30,
              x + 147,
              y + 16,
              x + 154,
              y - 4,
            ],
            '#426473',
            '',
          );
      }
    } else if (stage.id === 'x5') {
      // Planetarium: constellations, huge projection planets and a circular star dome.
      for (let i = 0; i < 125; i++) {
        const x = (hash(i + 1) * 1600 - camX * 0.04 + 1600) % 1600,
          y = hash(i + 501) * 262;
        g.rect(
          x,
          y,
          i % 8 ? 1 : 2,
          i % 8 ? 1 : 2,
          i % 3 ? '#8f94ce' : '#e5e3fc',
        );
      }
      const planetX = vw * 0.72 - camX * 0.022;
      ctx.fillStyle = '#394381';
      ctx.beginPath();
      ctx.arc(planetX, 115, 76, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#161d45';
      ctx.beginPath();
      ctx.arc(planetX + 24, 97, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a86b7';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(planetX, 117, 118, 18, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const x = i * 210 - ((camX * 0.12) % 210),
          y = 38 + (i % 3) * 22;
        g.line(
          [
            x,
            y,
            x + 29,
            y + 18,
            x + 53,
            y + 10,
            x + 83,
            y + 40,
            x + 105,
            y + 24,
          ],
          '#5f5684',
          1,
        );
        for (const [dx, dy] of [
          [0, 0],
          [29, 18],
          [53, 10],
          [83, 40],
          [105, 24],
        ])
          g.rect(x + dx - 1, y + dy - 1, 3, 3, '#b6c2e9');
      }
      for (let i = 0; i < 6; i++) {
        const x = i * 320 - ((camX * 0.33) % 320),
          top = 12 - camY * 0.1;
        ctx.strokeStyle = '#4c456f';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.ellipse(x + 150, top + 132, 147, 127, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        g.rect(x + 2, top + 130, 13, 180, '#3f405f');
        g.rect(x + 289, top + 130, 13, 180, '#3f405f');
        g.rect(x + 8, top + 142, 4, 140, '#8680a5');
        g.rect(x + 293, top + 142, 4, 140, '#8680a5');
        for (let mark = 0; mark < 10; mark++)
          g.rect(x + 25 + mark * 26, top + 267, 14, 4, '#7b67a0');
        g.poly(
          [
            x + 135,
            top + 228,
            x + 144,
            top + 203,
            x + 157,
            top + 203,
            x + 166,
            top + 228,
          ],
          '#777297',
        );
        g.rect(x + 129, top + 229, 43, 8, '#a8a4bb');
      }
    } else {
      // Magma Area is exposed basalt and molten rock rather than a recolored factory.
      for (let layer = 0; layer < 3; layer++) {
        const color = ['#362b36', '#573039', '#713c39'][layer],
          parallax = 0.08 + layer * 0.07;
        for (let i = 0; i < 10; i++) {
          const x = i * 160 - ((camX * parallax) % 160),
            base = 190 + layer * 31;
          g.poly(
            [
              x - 30,
              360,
              x - 12,
              base - 68,
              x + 20,
              base - 91,
              x + 37,
              base - 48,
              x + 75,
              base - 119,
              x + 130,
              base - 70,
              x + 170,
              360,
            ],
            color,
            '',
          );
          g.line(
            [
              x + 73,
              base - 109,
              x + 65,
              base - 51,
              x + 87,
              base - 15,
              x + 82,
              350,
            ],
            layer === 2 ? '#eb7844' : '#a9503c',
            layer === 2 ? 6 : 3,
          );
          if (layer === 2)
            g.line(
              [
                x + 72,
                base - 107,
                x + 64,
                base - 50,
                x + 86,
                base - 14,
                x + 81,
                350,
              ],
              '#ffd982',
              2,
            );
        }
      }
      g.rect(0, 304, vw, 56, '#bb4d32');
      g.rect(0, 306, vw, 9, '#ffb654');
      for (let i = 0; i < 25; i++) {
        const x = (i * 61 - camX * 0.23 + sim.time * 14) % vw,
          y = 318 + (i % 4) * 10;
        g.line([x, y, x + 25, y - 2, x + 43, y + 2], '#f08440', 3);
      }
      for (let i = 0; i < 10; i++) {
        const x = i * 170 - ((camX * 0.34) % 170);
        g.poly(
          [
            x - 30,
            0,
            x + 39,
            0,
            x + 27,
            40,
            x + 18,
            22,
            x + 6,
            57,
            x - 7,
            21,
            x - 21,
            47,
          ],
          '#30282d',
          '',
        );
      }
    }
  }
  function platform(x: number, y: number, w: number, h: number, kind?: string) {
    if (stage.id === 'x6' && h > 25) {
      g.rect(x, y, w, h, '#42323b');
      g.rect(x, y, w, 5, '#b17d63');
      g.rect(x, y + 5, w, 8, '#775349');
      for (let col = 0; col < w; col += 49) {
        const cw = Math.min(45, w - col);
        g.poly(
          [
            x + col,
            y + 17,
            x + col + cw,
            y + 13,
            x + col + cw - 3,
            y + 58,
            x + col + 8,
            y + 64,
          ],
          '#63434a',
        );
        g.line(
          [x + col + 8, y + 23, x + col + 20, y + 38, x + col + 14, y + 54],
          '#bd6b48',
          2,
        );
      }
      if (kind === 'belt') {
        g.rect(x, y, w, 6, '#887572');
        for (let col = 0; col < w; col += 16)
          g.rect(x + col + ((sim.time * 44) % 16), y + 1, 8, 3, '#ffd083');
      }
      return;
    }
    g.rect(x, y, w, h, stage.id === 'x4' ? '#4b747f' : '#28273e');
    g.rect(x, y, w, 5, '#d2dcd0');
    g.rect(x, y + 5, w, 7, stage.metal);
    g.rect(x, y + 12, w, 3, '#102231');
    for (let col = 0; col < w; col += 48) {
      const width = Math.min(45, w - col - 2);
      if (width <= 0) continue;
      g.rect(x + col + 1, y + 18, width, Math.min(34, h - 18), stage.metal);
      g.rect(x + col + 4, y + 21, width - 5, 2, '#6e8493');
      g.rect(x + col + 4, y + 26, 3, 3, '#172b3b');
      g.rect(x + col + width - 4, y + 45, 3, 3, '#a1b0ac');
      if (h > 59) {
        g.line(
          [x + col + 7, y + 65, x + col + width - 6, y + 85],
          '#344859',
          4,
        );
        g.line(
          [x + col + 7, y + 85, x + col + width - 6, y + 65],
          '#344859',
          4,
        );
      }
    }
    if (h < 25) {
      g.rect(x + 4, y + h - 4, w - 8, 4, '#9de6d7');
      g.rect(x + 16, y + h, 12, 5, '#233b4a');
    }
    if (kind === 'belt') {
      for (let k = -1; k < w / 15; k++) {
        const left = x + k * 15 + ((sim.time * 44) % 15);
        if (left > x && left + 10 < x + w)
          g.poly(
            [left, y + 2, left + 5, y + 2, left + 10, y + 7, left + 5, y + 7],
            '#f4c874',
            '',
          );
      }
    } else if (h > 25)
      for (let k = 0; k < w; k += 28)
        g.rect(x + k + 2, y + 7, Math.min(11, w - k - 2), 3, stage.light);
  }
  function render(width: number, height: number) {
    if (disposed) return;
    width = Math.max(1, width);
    height = Math.max(1, height);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (
      canvas.width !== Math.round(width * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const vw = Math.round(
      Math.max(460, Math.min(1000, (width / height) * 360)),
    );
    if (buffer.width !== vw) {
      buffer.width = vw;
      buffer.height = 360;
    }
    const p = sim.player,
      b = sim.boss;
    let camX = Math.max(0, Math.min(stage.end - vw, p.x - vw * 0.3));
    if (b.active && vw >= 600) camX = Math.max(0, stage.arena - (vw - 600) / 2);
    const camY = Math.max(-35, Math.min(64, p.y - 254));
    background(vw, camX, camY);
    ctx.save();
    const shake = sim.shake * 5;
    ctx.translate(
      Math.round(-camX + Math.sin(sim.time * 90) * shake),
      Math.round(-camY + Math.cos(sim.time * 74) * shake),
    );
    // Cables and powered strips frame the real collision geometry.
    for (let x = 170; stage.id === 'x5' && x < stage.end; x += 350) {
      if (x < camX - 100 || x > camX + vw + 100) continue;
      g.rect(x, 64, 7, 208, '#263b4b');
      g.rect(x + 2, 69, 2, 185, stage.metal);
      g.line([x, 95, x + 85, 107, x + 175, 90], '#52687a', 2);
      g.rect(x - 16, 135, 44, 26, '#163044');
      g.rect(x - 13, 138, 38, 20, '#386879');
      g.text(`${Math.floor(x / 350) + 1}:STAR`, x - 10, 151, 8, stage.accent);
    }
    for (const s of stage.platforms) {
      const at = platformAt(s, sim.time);
      if (at.x + at.w >= camX && at.x <= camX + vw)
        platform(at.x, at.y, at.w, at.h, at.kind);
    }
    // The arena's physical end is a sealed boss gate, including the
    // surrounding machinery exposed by the wider, centered boss framing.
    if (stage.end < camX + vw + 24) {
      const x = stage.end;
      const wallWidth = Math.max(240, camX + vw - x + 32);
      g.rect(x, -80, wallWidth, 610, '#182a39');
      g.rect(x + 3, -80, 18, 610, stage.metal);
      g.rect(x + 4, -80, 3, 610, '#a7bdb9');
      for (let y = -60; y < 460; y += 34) {
        g.rect(x + 10, y, 7, 16, stage.light);
        g.rect(x + 22, y, wallWidth - 22, 3, '#2c4152');
      }
      g.rect(x + 30, 116, 152, 204, '#0d202d');
      g.rect(x + 34, 120, 144, 192, stage.metal);
      for (let y = 127; y < 309; y += 19) {
        g.rect(x + 38, y, 136, 13, '#354b5c');
        g.rect(x + 38, y, 136, 2, '#82948f');
        g.rect(x + 42, y + 9, 128, 3, '#213541');
      }
      g.rect(x + 101, 124, 10, 187, '#233744');
      g.rect(x + 104, 154, 4, 123, stage.accent);
      g.rect(x + 27, 88, 158, 23, '#324959');
      g.text(
        stage.id === 'x4'
          ? 'SKY LAGOON'
          : stage.id === 'x5'
            ? 'PLANETARIUM'
            : 'MAGMA CHAMBER',
        x + 106,
        103,
        9,
        stage.light,
        'center',
      );
      g.rect(x + 62, 202, 89, 28, '#102631');
      g.text(stage.bossName, x + 106, 220, 11, stage.accent, 'center');
      for (let y = 38; y < 290; y += 64) {
        g.rect(x + 199, y, 17, 47, '#455b65');
        g.rect(x + 205, y + 4, 5, 39, '#809c9b');
      }
      platform(x, stage.floor, wallWidth, 180);
    }
    for (const hazard of stage.hazards) {
      if (hazard.x < camX - 100 || hazard.x > camX + vw) continue;
      const state = hazardPhase(hazard, sim.time);
      if (hazard.kind === 'spikes') {
        for (let k = 0; k < hazard.w; k += 12)
          g.poly(
            [
              hazard.x + k,
              hazard.y + hazard.h,
              hazard.x + k + 6,
              hazard.y - 3,
              hazard.x + k + 12,
              hazard.y + hazard.h,
            ],
            '#d7e4d9',
          );
      } else {
        g.rect(hazard.x - 5, hazard.y - 9, hazard.w + 10, 9, '#849792');
        g.rect(
          hazard.x - 5,
          hazard.y + hazard.h - 3,
          hazard.w + 10,
          8,
          '#849792',
        );
        const color = hazard.kind === 'vent' ? '#ffa964' : '#fb8493';
        if (state === 'active') {
          for (let k = 0; k < hazard.h; k += 9) {
            const jitter = Math.sin(sim.time * 32 + k) * 4;
            g.rect(
              hazard.x + 3 + jitter,
              hazard.y + k,
              hazard.w - 6,
              10,
              color,
            );
            g.rect(
              hazard.x + hazard.w / 2 + jitter - 2,
              hazard.y + k,
              4,
              10,
              '#ffffd5',
            );
          }
        } else if (state === 'warning') {
          for (let k = 0; k < hazard.h; k += 15)
            g.rect(hazard.x + hazard.w / 2, hazard.y + k, 2, 7, color);
          g.text(
            '!',
            hazard.x + hazard.w / 2,
            hazard.y - 16,
            16,
            color,
            'center',
          );
        } else g.rect(hazard.x + 3, hazard.y - 6, hazard.w - 6, 3, '#7ce6c0');
      }
    }
    stage.capsules.forEach((c, i) => {
      if (sim.collected[i] || c.x < camX - 30 || c.x > camX + vw + 30) return;
      const y = c.y + Math.sin(sim.time * 3 + i) * 3;
      if (c.kind === 'rescue') {
        g.poly(
          [
            c.x - 16,
            y + 16,
            c.x - 16,
            y - 20,
            c.x - 10,
            y - 28,
            c.x + 10,
            y - 28,
            c.x + 16,
            y - 20,
            c.x + 16,
            y + 16,
          ],
          '#254452',
        );
        g.rect(c.x - 11, y - 20, 22, 30, '#3d7980');
        g.rect(c.x - 5, y - 13, 10, 10, '#bfd4ba');
        g.rect(c.x - 7, y - 2, 14, 11, '#8199a3');
        g.rect(c.x - 18, y + 13, 36, 6, '#b7ccc3');
        g.text('E / RESCUE', c.x, y - 36, 8, '#bcead5', 'center');
      } else {
        g.poly(
          [
            c.x - 9,
            y - 11,
            c.x + 8,
            y - 11,
            c.x + 12,
            y - 5,
            c.x + 8,
            y + 11,
            c.x - 9,
            y + 11,
            c.x - 12,
            y + 4,
          ],
          '#263d4d',
        );
        g.rect(
          c.x - 7,
          y - 7,
          14,
          14,
          c.kind === 'health' ? '#a9edb0' : '#ffcf79',
        );
        g.rect(c.x - 2, y - 5, 4, 10, '#f0ffe4');
        g.rect(c.x - 5, y - 2, 10, 4, '#f0ffe4');
      }
    });
    stage.checkpoints.forEach((x, i) => {
      g.rect(x - 14, 265, 28, 55, '#203845');
      g.rect(
        x - 10,
        272,
        20,
        29,
        i <= sim.checkpointIndex ? '#65d6b8' : '#557c92',
      );
      g.rect(x - 3, 277, 6, 18, '#d6f1da');
      g.text(
        i <= sim.checkpointIndex ? 'SAVED' : 'CHECKPOINT',
        x,
        254,
        8,
        '#cde8cf',
        'center',
      );
    });
    for (const e of sim.enemies)
      if (e.hp > 0 && e.x > camX - 60 && e.x < camX + vw + 60)
        g.enemy(e, sim.time, p.x < e.x ? -1 : 1);
    if (b.hp > 0 && b.x > camX - 100 && b.x < camX + vw + 100) {
      if (b.mode === 'tell' && b.pattern === 0) {
        for (
          let x = Math.min(b.x, b.targetX);
          x < Math.max(b.x, b.targetX);
          x += 18
        )
          g.rect(x, stage.floor - 4, 10, 3, '#ff8579');
      }
      g.boss(sim);
    }
    if (p.dash > 0)
      for (let i = 3; i > 0; i--)
        g.mech(sim, p.x - p.facing * i * 16, p.y, true);
    if (p.invulnerable <= 0 || Math.floor(sim.time * 18) % 3 !== 0)
      g.mech(sim, p.x, p.y);
    for (const shot of sim.shots) {
      if (shot.kind === 'charge') {
        const side = Math.sign(shot.vx);
        g.poly(
          [
            shot.x - side * 35,
            shot.y,
            shot.x - side * 10,
            shot.y - shot.r,
            shot.x + side * 9,
            shot.y - shot.r * 0.7,
            shot.x + side * 17,
            shot.y,
            shot.x + side * 9,
            shot.y + shot.r * 0.7,
            shot.x - side * 10,
            shot.y + shot.r,
          ],
          shot.r > 7 ? '#6cffc7' : '#73b9ff',
          '',
        );
        g.rect(shot.x - 3, shot.y - shot.r * 0.5, 13, shot.r, '#edfff0');
      } else if (shot.kind === 'bat') {
        const wing = Math.sin(sim.time * 32 + shot.x) * 4;
        g.poly(
          [
            shot.x - 16,
            shot.y - 8 - wing,
            shot.x - 5,
            shot.y - 3,
            shot.x,
            shot.y - 6,
            shot.x + 5,
            shot.y - 3,
            shot.x + 16,
            shot.y - 8 - wing,
            shot.x + 10,
            shot.y + 5,
            shot.x,
            shot.y + 2,
            shot.x - 10,
            shot.y + 5,
          ],
          '#c7a4e3',
        );
        g.rect(shot.x - 3, shot.y - 2, 2, 2, '#ff777d');
        g.rect(shot.x + 2, shot.y - 2, 2, 2, '#ff777d');
      } else if (shot.enemy && shot.damage === 0) {
        ctx.strokeStyle = '#cf8bfd';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2);
        ctx.stroke();
        g.line(
          [shot.x, shot.y - 8, shot.x, shot.y, shot.x + 7, shot.y + 4],
          '#f1dcff',
          2,
        );
      } else if (shot.kind === 'flame') {
        g.poly(
          [
            shot.x - 15,
            shot.y + 11,
            shot.x - 10,
            shot.y - 7,
            shot.x,
            shot.y - 20,
            shot.x + 4,
            shot.y - 7,
            shot.x + 13,
            shot.y + 9,
          ],
          '#fa8858',
          '',
        );
        g.rect(shot.x - 4, shot.y - 4, 8, 12, '#ffefab');
      } else {
        g.rect(
          shot.x - shot.r,
          shot.y - shot.r,
          shot.r * 2 + 3,
          shot.r * 2,
          shot.enemy ? '#ef8791' : '#b5edfb',
        );
        g.rect(shot.x - 1, shot.y - 2, shot.r + 1, 4, '#fff4d2');
      }
    }
    for (const part of sim.particles) {
      ctx.globalAlpha = Math.min(1, (part.life / part.maxLife) * 1.7);
      g.rect(part.x, part.y, part.size, part.size, part.color);
    }
    ctx.globalAlpha = 1;
    const signs = [
      [170, sim.character === 'x' ? 'HOLD J / CHARGE' : 'J / K Z-SABER'],
      [610, 'L + SPACE / DASH JUMP'],
      [1025, 'WALL KICK / SPACE'],
      [stage.arena - 160, 'BOSS GATE'],
    ] as const;
    for (const [x, label] of signs) {
      if (x > camX - 120 && x < camX + vw + 120) {
        g.rect(x - 80, 158, 160, 23, '#102b3a');
        g.rect(x - 80, 158, 3, 23, stage.accent);
        g.text(label, x, 173, 9, '#a8c9cc', 'center');
      }
    }
    if (b.active) {
      g.rect(stage.arena, 145, 8, 175, '#627984');
      for (let y = 148; y < 320; y += 17)
        g.rect(stage.arena + 2, y, 4, 9, '#ffa777');
    }
    ctx.restore();
    // Drifting sky debris, orbital dust and rising embers distinguish the foregrounds.
    for (let i = 0; i < 34; i++) {
      const x =
        (hash(i + 900) * vw -
          sim.time * (stage.id === 'x4' ? 26 : 10) +
          99999) %
        vw;
      const y =
        (hash(i + 1900) * 360 +
          sim.time * (stage.id === 'x4' ? 12 : stage.id === 'x6' ? -23 : 8) +
          99999) %
        360;
      if (stage.id === 'x4') g.rect(x, y, 2, 2, '#e0f2ec');
      else
        g.rect(
          x,
          y,
          i % 5 ? 1 : 2,
          i % 5 ? 1 : 2,
          stage.id === 'x6' ? '#bf785b' : '#8296b1',
        );
    }
    if (sim.flash > 0) {
      ctx.globalAlpha = Math.min(0.27, sim.flash);
      g.rect(0, 0, vw, 360, '#ddf8f0');
      ctx.globalAlpha = 1;
    }
    // Compact in-world instrumentation supplements the common arcade HUD.
    g.rect(14, 15, 19, 117, '#101d2e');
    g.rect(17, 18, 13, 109, '#354d60');
    for (let i = 0; i < 24; i++)
      g.rect(
        19,
        122 - i * 4.3,
        9,
        3,
        i < p.hp ? (p.hp <= 6 ? '#ef8c7a' : stage.accent) : '#203346',
      );
    g.text('EN', 23, 145, 9, '#d7ede4', 'center');
    g.text(
      stage.title + ' / ' + (sim.character === 'x' ? 'X' : 'ZERO'),
      46,
      26,
      11,
      '#d4e8e4',
    );
    g.text(stage.sector, 46, 41, 8, '#81a1b2');
    if (p.charge > 0) {
      g.rect(46, 48, 60, 3, '#304b5d');
      g.rect(
        46,
        48,
        Math.min(60, p.charge * 60),
        3,
        p.charge >= 1 ? '#d0ffb5' : '#80d0ee',
      );
    }
    g.text(
      String(sim.score).padStart(6, '0'),
      vw - 16,
      25,
      12,
      stage.light,
      'right',
    );
    if (b.active) {
      const barWidth = Math.min(330, vw - 120),
        x = (vw - barWidth) / 2;
      g.rect(x - 5, 326, barWidth + 10, 20, '#162536');
      g.rect(x, 332, barWidth, 8, '#3b3d50');
      g.rect(
        x,
        332,
        Math.max(0, b.hp / b.maxHp) * barWidth,
        8,
        b.phase === 2 ? '#ed8a78' : stage.accent,
      );
      for (let i = 1; i < 16; i++)
        g.rect(x + (i * barWidth) / 16, 332, 1, 8, '#253748');
      g.text(
        stage.bossName + (b.phase === 2 ? ' / OVERDRIVE' : ''),
        vw / 2,
        320,
        10,
        '#e9e7ce',
        'center',
      );
      if (b.mode === 'intro') {
        g.rect(0, 130, vw, 54, '#362b3b');
        g.text(
          'WARNING // ' + stage.bossName,
          vw / 2,
          164,
          20,
          '#ffa480',
          'center',
        );
      }
    } else if (sim.time < 4.2) {
      g.rect(vw / 2 - 137, 314, 274, 28, '#152c3c');
      g.text(
        sim.character === 'x' ? 'MEGA MAN X // READY' : 'ZERO // READY',
        vw / 2,
        331,
        10,
        stage.accent,
        'center',
      );
    }
    if (sim.darkHold > 0) {
      g.rect(vw / 2 - 61, 77, 122, 19, '#3e2857');
      g.text(
        'DARK HOLD ' + sim.darkHold.toFixed(1),
        vw / 2,
        90,
        10,
        '#f2c9ff',
        'center',
      );
    }
    target.setTransform(dpr, 0, 0, dpr, 0, 0);
    target.imageSmoothingEnabled = false;
    target.fillStyle = stage.sky;
    target.fillRect(0, 0, width, height);
    const scale = Math.min(width / vw, height / 360);
    target.drawImage(
      buffer,
      (width - vw * scale) / 2,
      (height - 360 * scale) / 2,
      vw * scale,
      360 * scale,
    );
  }
  return {
    render,
    dispose() {
      disposed = true;
      sprites.dispose();
      buffer.width = 1;
      buffer.height = 1;
    },
    metrics: () => ({
      drawCalls: 1,
      entities:
        1 +
        sim.enemies.filter((e) => e.hp > 0).length +
        sim.shots.length +
        sim.particles.length +
        Number(sim.boss.active),
    }),
  };
}
