import type { RetroView } from '../types.ts';
import { pixelArt } from './art.ts';
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
  const g = pixelArt(ctx),
    stage = sim.stage;
  let disposed = false;
  const hash = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const gear = (
    x: number,
    y: number,
    radius: number,
    time: number,
    color: string,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      g.rect(radius - 3, -5, 12, 10, color);
    }
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = stage.sky;
    ctx.fill();
    g.rect(-4, -4, 8, 8, stage.metal);
    ctx.restore();
  };
  function background(vw: number, camX: number, camY: number) {
    g.rect(0, 0, vw, 360, stage.sky);
    if (stage.id === 'x5') {
      for (let i = 0; i < 100; i++) {
        const x = (hash(i + 1) * 1800 - camX * 0.04 + 1800) % 1800;
        g.rect(
          x,
          hash(i + 501) * 220,
          i % 7 ? 1 : 2,
          i % 7 ? 1 : 2,
          i % 3 ? '#707aaf' : '#dbe9ef',
        );
      }
      ctx.beginPath();
      ctx.arc(vw * 0.77 - camX * 0.035, 112, 102, 0, Math.PI * 2);
      ctx.fillStyle = '#373969';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(vw * 0.77 - camX * 0.035 + 14, 91, 94, 0, Math.PI * 2);
      ctx.fillStyle = '#181a3a';
      ctx.fill();
      for (let i = 0; i < 4; i++)
        g.line(
          [
            vw * 0.77 - camX * 0.035 - 99,
            140 + i * 3,
            vw * 0.77 - camX * 0.035 + 98,
            68 + i * 3,
          ],
          i % 2 ? '#565477' : '#8b7695',
          2,
        );
    } else if (stage.id === 'x4') {
      g.rect(0, 76, vw, 70, '#20364c');
      g.rect(0, 123, vw, 34, '#36515e');
      for (let i = 0; i < 22; i++) {
        const x = i * 92 - ((camX * 0.12) % 92),
          h = 45 + hash(i) * 99;
        g.rect(x, 220 - h, 69, h, '#1b2b43');
        g.rect(x + 7, 213 - h, 42, 7, '#1c3349');
        for (let row = 0; row < 8; row++)
          for (let col = 0; col < 4; col++)
            if (hash(i * 41 + row * 5 + col) > 0.35)
              g.rect(
                x + 10 + col * 13,
                230 - h + row * 12,
                5,
                3,
                col % 2 ? '#436a72' : '#806861',
              );
        g.rect(x + 20, 200 - h, 2, 15, '#58727b');
      }
    } else {
      g.rect(0, 119, vw, 150, '#3d2832');
      for (let i = 0; i < 13; i++) {
        const x = i * 160 - ((camX * 0.13) % 160);
        g.poly(
          [x - 30, 200, x + 15, 78, x + 67, 115, x + 98, 200],
          '#352b36',
          '',
        );
        g.rect(x + 18, 169, 23, 80, '#834a3c');
        g.rect(x + 25, 170, 5, 81, '#c56e49');
        g.rect(x + 29, 170, 3, 80, '#e49b61');
      }
    }
    // A second, closer structural layer has its own parallax, not a flat backdrop.
    for (let i = 0; i < 14; i++) {
      const x = i * 230 - ((camX * 0.36) % 230),
        top = 113 - camY * 0.15;
      g.rect(x, top, 18, 180, '#26384b');
      g.rect(x + 4, top, 3, 178, stage.far);
      g.rect(x - 12, top + 12, 205, 10, stage.far);
      g.line([x + 18, top + 23, x + 189, top + 94], stage.far, 5);
      g.rect(x + 43, top + 30, 122, 72, '#192c3d');
      for (let j = 0; j < 5; j++)
        g.rect(x + 49, top + 36 + j * 12, 110, 3, stage.far);
      if (stage.id === 'x5') {
        g.line([x + 170, top + 25, x + 182, top + 150], '#51637b', 3);
        g.rect(x + 153, top + 121, 58, 8, '#69849a');
      }
      if (stage.id === 'x6')
        gear(x + 107, top + 63, 35, sim.time * 0.2, '#53404a');
    }
  }
  function platform(x: number, y: number, w: number, h: number, kind?: string) {
    g.rect(x, y, w, h, '#1a2a39');
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
    for (let x = 170; x < stage.end; x += 350) {
      if (x < camX - 100 || x > camX + vw + 100) continue;
      g.rect(x, 64, 7, 208, '#263b4b');
      g.rect(x + 2, 69, 2, 185, stage.metal);
      g.line([x, 95, x + 85, 107, x + 175, 90], '#52687a', 2);
      g.rect(x - 16, 135, 44, 26, '#163044');
      g.rect(x - 13, 138, 38, 20, '#386879');
      g.text(`${Math.floor(x / 350) + 1}:SYS`, x - 10, 151, 8, stage.accent);
    }
    for (const s of stage.platforms) {
      const at = platformAt(s, sim.time);
      if (at.x + at.w >= camX && at.x <= camX + vw)
        platform(at.x, at.y, at.w, at.h, at.kind);
    }
    // The arena's physical end is a sealed reactor bulkhead, including the
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
      g.text('REACTOR / SEALED', x + 106, 103, 9, stage.light, 'center');
      g.rect(x + 62, 202, 89, 28, '#102631');
      g.text(
        'CORE ' + stage.id.toUpperCase(),
        x + 106,
        220,
        11,
        stage.accent,
        'center',
      );
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
      [170, 'HOLD J / CHARGE'],
      [610, 'L + SPACE / DASH JUMP'],
      [1025, 'WALL KICK / SPACE'],
      [stage.arena - 160, 'REACTOR ACCESS'],
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
    // Foreground rain, orbital dust or embers makes each location move differently.
    for (let i = 0; i < 34; i++) {
      const x =
        (hash(i + 900) * vw -
          sim.time * (stage.id === 'x4' ? 70 : 10) +
          99999) %
        vw;
      const y =
        (hash(i + 1900) * 360 +
          sim.time * (stage.id === 'x4' ? 240 : stage.id === 'x6' ? -23 : 8) +
          99999) %
        360;
      if (stage.id === 'x4') g.line([x, y, x - 3, y + 9], '#668a9b', 1);
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
    g.text(stage.id.toUpperCase() + ' / ' + stage.title, 46, 26, 11, '#d4e8e4');
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
        'RECLAIMER UNIT 07 // SYSTEM ONLINE',
        vw / 2,
        331,
        10,
        stage.accent,
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
