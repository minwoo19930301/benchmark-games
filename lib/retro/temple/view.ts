import type { RetroView } from '../types.ts';
import { TempleSimulation, W, H, FLOOR, type Hero } from './simulation.ts';
export function mountTemple(
  canvas: HTMLCanvasElement,
  sim: TempleSimulation,
): RetroView {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D를 사용할 수 없습니다.');
  const c = ctx;
  let calls = 0;
  function rect(x: number, y: number, w: number, h: number, color: string) {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
    calls++;
  }
  function path(points: number[][], fill: string, stroke?: string, width = 2) {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = width;
      c.stroke();
    }
    calls++;
  }
  function circle(x: number, y: number, r: number, color: string) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
    calls++;
  }
  function text(
    s: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = 'left',
  ) {
    c.font = `bold ${size}px 'Trebuchet MS', sans-serif`;
    c.fillStyle = color;
    c.textAlign = align;
    c.fillText(s, x, y);
    calls++;
  }
  function gem(x: number, y: number, color: string, scale = 1) {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    path(
      [
        [-10, -5],
        [-6, -10],
        [6, -10],
        [10, -5],
        [0, 10],
      ],
      color,
      '#090d05',
      2.5,
    );
    path(
      [
        [-6, -8],
        [0, -8],
        [-3, -3],
        [0, 7],
        [-8, -4],
      ],
      '#ffffff77',
    );
    path(
      [
        [0, -8],
        [6, -8],
        [8, -4],
        [3, -3],
        [0, 7],
      ],
      '#00000018',
    );
    c.restore();
  }
  function pillar(x: number) {
    rect(x, 82, 42, 350, '#292d10');
    rect(x + 4, 90, 33, 366, '#767446');
    rect(x + 9, 90, 8, 350, '#8a8655');
    for (let y = 110; y < 447; y += 46) {
      rect(x + 4, y, 33, 2, '#292d10');
      rect(x + 17, y + 4, 2, 38, '#4c5127');
    }
    rect(x - 5, 76, 52, 16, '#938957');
    rect(x - 9, 67, 60, 12, '#595f2c');
    rect(x - 3, 438, 50, 20, '#7c8150');
  }
  function hero(h: Hero, index: number) {
    const fire = h.element === 'ember',
      moving = Math.abs(h.vx) > 30;
    const stride = moving ? Math.sin(sim.time * 13) * 4 : 0;
    const color = fire ? '#f2250b' : '#29bfea',
      outline = '#08130b';
    c.save();
    c.translate(h.x, h.y);
    const glow = c.createRadialGradient(0, -25, 8, 0, -25, 37);
    glow.addColorStop(0, fire ? '#ff4b2322' : '#30d6fa22');
    glow.addColorStop(1, '#00000000');
    c.fillStyle = glow;
    c.fillRect(-38, -63, 76, 76);
    if (index === sim.active)
      path(
        [
          [-4, -62],
          [4, -62],
          [0, -56],
        ],
        '#eed757',
        outline,
        1,
      );
    // Small bodies, thin limbs and a large element-shaped head match the original silhouettes.
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const limb = (points: number[][]) => {
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = outline;
      c.lineWidth = 5.5;
      c.stroke();
      c.strokeStyle = color;
      c.lineWidth = 3;
      c.stroke();
    };
    limb([
      [-4, -9],
      [-5 - stride, -1],
      [-8 - stride, -1],
    ]);
    limb([
      [4, -9],
      [5 + stride, -1],
      [8 + stride, -1],
    ]);
    limb([
      [-5, -19],
      [-10 + stride, -10],
    ]);
    limb([
      [5, -19],
      [10 - stride, -10],
    ]);
    path(
      [
        [-5, -21],
        [5, -21],
        [6, -7],
        [-5, -7],
      ],
      color,
      outline,
      2,
    );
    if (fire) {
      c.beginPath();
      c.moveTo(-13, -28);
      c.bezierCurveTo(-18, -38, -10, -43, -13, -51);
      c.bezierCurveTo(-5, -47, -9, -39, -5, -39);
      c.bezierCurveTo(0, -44, 0, -49, -2, -56);
      c.bezierCurveTo(7, -51, 4, -43, 8, -41);
      c.bezierCurveTo(12, -47, 10, -49, 10, -50);
      c.bezierCurveTo(14, -43, 18, -34, 14, -27);
      c.bezierCurveTo(10, -16, -10, -17, -13, -28);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = outline;
      c.lineWidth = 2;
      c.stroke();
      path(
        [
          [-11, -44],
          [-9, -49],
          [-7, -43],
          [-8, -36],
        ],
        '#ff9c18',
      );
      path(
        [
          [0, -51],
          [4, -46],
          [3, -37],
          [1, -40],
        ],
        '#ff8514',
      );
    } else {
      // Watergirl's swept watery fringe and curled droplet bun, not a featureless water blob.
      c.beginPath();
      c.ellipse(0, -31, 14, 13, 0, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = outline;
      c.lineWidth = 2;
      c.stroke();
      circle(-1, -48, 6.5, color);
      c.strokeStyle = outline;
      c.lineWidth = 1.8;
      c.stroke();
      c.beginPath();
      c.moveTo(-3, -44);
      c.bezierCurveTo(-6, -52, 3, -54, 2, -47);
      c.strokeStyle = outline;
      c.lineWidth = 1.6;
      c.stroke();
      path(
        [
          [-16, -35],
          [-9, -43],
          [0, -44],
          [-3, -36],
          [-9, -34],
        ],
        '#57d3f1',
        outline,
        1.6,
      );
      path(
        [
          [0, -44],
          [8, -42],
          [16, -35],
          [6, -35],
          [2, -37],
        ],
        '#5ed9f3',
        outline,
        1.6,
      );
      path(
        [
          [-12, -21],
          [-16, -19],
          [-13, -27],
        ],
        color,
        outline,
        1.4,
      );
      path(
        [
          [12, -21],
          [16, -19],
          [13, -27],
        ],
        color,
        outline,
        1.4,
      );
    }
    const eye = fire ? '#ffe937' : '#c8f7ff';
    for (const x of [-5.5, 5.5]) {
      c.beginPath();
      c.ellipse(x, -29, 3.6, 2.9, 0, 0, Math.PI * 2);
      c.fillStyle = eye;
      c.fill();
      c.strokeStyle = outline;
      c.lineWidth = 1.2;
      c.stroke();
      circle(x + h.face * 0.8, -29, 1.4, outline);
    }
    c.strokeStyle = outline;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-3, -23);
    c.quadraticCurveTo(0, -21, 4, -23);
    c.stroke();
    c.restore();
  }
  return {
    render(width, height) {
      calls = 0;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      if (
        canvas.width !== Math.round(width * ratio) ||
        canvas.height !== Math.round(height * ratio)
      ) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
      rect(0, 0, width, height, '#171b0c');
      const scale = Math.min(width / W, height / H);
      c.translate((width - W * scale) / 2, (height - H * scale) / 2);
      c.scale(scale, scale);
      c.save();
      c.beginPath();
      c.rect(0, 0, W, H);
      c.clip();
      const sky = c.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#262b0d');
      sky.addColorStop(1, sim.level.color);
      c.fillStyle = sky;
      c.fillRect(0, 0, W, H);
      // Hand-drawn stonework, recessed arches, roots, hanging lamps: the Flash-era temple silhouette.
      for (let row = 0; row < 9; row++)
        for (let col = 0; col < 15; col++) {
          const x = col * 70 - (row % 2) * 35,
            y = row * 54,
            shade = (row * 13 + col * 7) % 5;
          rect(
            x + 2,
            y + 2,
            66,
            50,
            ['#363a14', '#3c4018', '#30350f', '#41451b', '#343913'][shade],
          );
          rect(x + 3, y + 3, 64, 2, '#67807422');
          rect(x + 4, y + 48, 61, 2, '#0a272c33');
        }
      for (const x of [100, 383, 663]) {
        c.fillStyle = '#292e0d';
        c.beginPath();
        c.roundRect(x, 113, 155, 210, [76, 76, 0, 0]);
        c.fill();
        c.strokeStyle = '#676c36';
        c.lineWidth = 9;
        c.stroke();
        c.strokeStyle = '#202408';
        c.lineWidth = 3;
        c.stroke();
        rect(x + 11, 264, 133, 60, '#343b13');
        for (let j = 0; j < 5; j++)
          rect(x + 23 + j * 26, 159, 3, 154, '#4a5423');
        circle(x + 77, 183, 21, '#66713a');
        gem(x + 77, 182, sim.room === 2 ? '#8fc3e8' : '#b9a67b', 1.1);
      }
      for (const x of [25, 285, 615, 938]) pillar(x - 20);
      c.strokeStyle = '#2e5012';
      c.lineWidth = 7;
      c.lineCap = 'round';
      for (const x of [44, 305, 617, 907]) {
        c.beginPath();
        c.moveTo(x, 0);
        c.bezierCurveTo(x - 20, 43, x + 30, 84, x + 4, 148);
        c.stroke();
        for (let j = 0; j < 6; j++)
          path(
            [
              [x + 2, 25 + j * 20],
              [x + 17, 20 + j * 20],
              [x + 11, 36 + j * 20],
            ],
            '#437c1c',
          );
      }
      rect(0, 0, W, 43, '#23270eef');
      text('FIREBOY', 25, 26, 17, '#fc5431');
      text('&', 111, 26, 15, '#ded56e');
      text('WATERGIRL', 132, 26, 17, '#4bcbf0');
      const seconds = Math.floor(sim.time),
        timer = `${Math.floor(seconds / 60)
          .toString()
          .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      path(
        [
          [411, 0],
          [549, 0],
          [539, 42],
          [421, 42],
        ],
        '#24290d',
        '#8b8b4b',
        3,
      );
      text(timer, W / 2, 29, 27, '#f0df48', 'center');
      text(`FOREST TEMPLE  ${sim.room + 1}/3`, 931, 24, 14, '#d0cb91', 'right');
      const fireCount = sim.gems.filter(
        (g, i) => g.element === 'ember' && sim.collected.has(i),
      ).length;
      const waterCount = sim.gems.filter(
        (g, i) => g.element === 'tide' && sim.collected.has(i),
      ).length;
      gem(293, 21, '#f32c16', 0.68);
      text(`${fireCount}/2`, 309, 27, 16, '#e5ddaa');
      gem(605, 21, '#32c9ef', 0.68);
      text(`${waterCount}/2`, 621, 27, 16, '#e5ddaa');
      for (const x of [179, 709]) {
        rect(x - 2, 43, 4, 62, '#172e32');
        rect(x - 10, 100, 20, 6, '#ba9a5c');
        rect(x - 8, 106, 16, 25, '#ffe49e');
        rect(x - 12, 131, 24, 5, '#705c44');
        const glow = c.createRadialGradient(x, 119, 4, x, 119, 65);
        glow.addColorStop(0, '#ffda8733');
        glow.addColorStop(1, '#ffdc8100');
        c.fillStyle = glow;
        c.fillRect(x - 65, 54, 130, 130);
      }
      // Pressure-plate conduit shows exactly what it controls.
      c.strokeStyle = sim.plateHeld || sim.latched ? '#e9cb72' : '#566561';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(sim.level.plate, 474);
      c.lineTo(sim.level.plate, 498);
      c.lineTo(sim.level.gate, 498);
      c.lineTo(sim.level.gate, 455);
      c.stroke();
      rect(0, FLOOR, W, 19, '#7b7947');
      rect(0, FLOOR + 19, W, 6, '#272d11');
      for (let x = 0; x < W; x += 42) {
        rect(x + 2, FLOOR + 2, 38, 4, '#a5a16b');
        rect(x + 40, FLOOR + 3, 2, 15, '#5a6030');
      }
      for (const p of sim.platforms) {
        rect(p.x, p.y, p.w, p.h, '#838352');
        rect(p.x, p.y, p.w, 4, '#a5a26a');
        for (let x = p.x + 5; x < p.x + p.w - 5; x += 17)
          rect(x, p.y + 8, 9, 3, '#505626');
        path(
          [
            [p.x + 8, p.y + 16],
            [p.x + 20, p.y + 36],
            [p.x + 25, p.y + 16],
          ],
          '#3a4519',
        );
      }
      for (const pool of sim.level.pools) {
        const color =
          pool.element === 'ember'
            ? '#f1250a'
            : pool.element === 'tide'
              ? '#178ae1'
              : '#32bc20';
        rect(pool.x, FLOOR - 3, pool.w, 22, '#162f36');
        rect(pool.x + 3, FLOOR + 3, pool.w - 6, 14, color);
        c.beginPath();
        c.moveTo(pool.x + 3, FLOOR + 3);
        for (let x = 3; x < pool.w - 2; x += 3)
          c.lineTo(pool.x + x, FLOOR + Math.sin(x * 0.16 + sim.time * 4) * 2);
        c.lineTo(pool.x + pool.w - 3, FLOOR + 8);
        c.lineTo(pool.x + 3, FLOOR + 8);
        c.fillStyle =
          pool.element === 'ember'
            ? '#ffd671'
            : pool.element === 'tide'
              ? '#90eced'
              : '#c8e479';
        c.fill();
        for (let k = 0; k < 3; k++)
          circle(
            pool.x + 15 + k * 22,
            FLOOR + 10 + Math.sin(sim.time * 2 + k) * 2,
            2,
            '#ffffff55',
          );
        text(
          pool.element === 'poison'
            ? '×'
            : pool.element === 'ember'
              ? 'FIRE'
              : 'WATER',
          pool.x + pool.w / 2,
          FLOOR + 38,
          10,
          '#bdd0b7',
          'center',
        );
      }
      const plateDown = sim.plateHeld || sim.latched;
      rect(sim.level.plate - 23, FLOOR - 5, 46, 8, '#242f2e');
      rect(
        sim.level.plate - 21,
        FLOOR - (plateDown ? 4 : 10),
        42,
        6,
        plateDown ? '#eacc78' : '#b4925d',
      );
      for (let x = sim.level.gate - 17; x < sim.level.gate + 20; x += 10)
        rect(x, 278, 6, (FLOOR - 278) * (1 - sim.gateOpen), '#b4ab81');
      rect(sim.level.gate - 24, 268, 48, 14, '#5d6f5b');
      gem(sim.level.gate, 252, plateDown ? '#ffdb78' : '#617b70', 0.7);
      rect(sim.level.lever - 12, sim.leverY - 24, 24, 24, '#405957');
      c.strokeStyle = '#d8b67a';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(sim.level.lever, sim.leverY - 16);
      c.lineTo(sim.level.lever + (sim.latched ? 14 : -14), sim.leverY - 43);
      c.stroke();
      circle(
        sim.level.lever + (sim.latched ? 14 : -14),
        sim.leverY - 43,
        6,
        sim.latched ? '#91c37b' : '#edbd6f',
      );
      text('E', sim.level.lever, sim.leverY - 59, 12, '#f3e8b8', 'center');
      if (sim.room > 0) {
        const cycle = sim.roomTime % 4;
        rect(539, FLOOR - 2, 32, 5, '#a49575');
        if (cycle > 2.65 && cycle < 3.35) {
          for (let k = 0; k < 6; k++)
            circle(
              551 + Math.sin(k + sim.time * 22) * 7,
              FLOOR - 12 - k * 10,
              10 - k,
              '#c7eeeeaa',
            );
        } else if (cycle > 1.8) {
          text('!', 555, FLOOR - 16, 19, '#f0c56d', 'center');
        }
      }
      sim.gems.forEach((g, i) => {
        if (!sim.collected.has(i))
          gem(
            g.x,
            g.y + Math.sin(sim.time * 3 + i) * 3,
            g.element === 'ember' ? '#fc2816' : '#34c8f4',
          );
      });
      [873, 923].forEach((x, i) => {
        const color = i ? '#28bde6' : '#ef2712';
        const h = sim.heroes[i],
          ready = Math.abs(h.x - x) < 23 && Math.abs(h.y - sim.exitY) < 5;
        rect(x - 22, sim.exitY - 77, 44, 77, '#121a06');
        rect(x - 19, sim.exitY - 74, 38, 74, '#85804a');
        rect(x - 14, sim.exitY - 67, 28, 67, ready ? '#181e09' : '#626433');
        c.strokeStyle = '#20270b';
        c.lineWidth = 2;
        c.strokeRect(x - 15, sim.exitY - 68, 30, 68);
        // Original doors are identified with the red male and blue female symbols.
        c.strokeStyle = color;
        c.lineWidth = 2.3;
        c.beginPath();
        c.arc(x, sim.exitY - 40, 5.5, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        if (i) {
          c.moveTo(x, sim.exitY - 34);
          c.lineTo(x, sim.exitY - 23);
          c.moveTo(x - 4, sim.exitY - 27);
          c.lineTo(x + 4, sim.exitY - 27);
        } else {
          c.moveTo(x + 4, sim.exitY - 44);
          c.lineTo(x + 11, sim.exitY - 51);
          c.lineTo(x + 5, sim.exitY - 51);
          c.moveTo(x + 11, sim.exitY - 51);
          c.lineTo(x + 11, sim.exitY - 45);
        }
        c.stroke();
        if (ready) {
          c.globalAlpha = 0.2;
          rect(x - 14, sim.exitY - 66, 28, 66, color);
          c.globalAlpha = 1;
        }
      });
      sim.heroes.forEach(hero);
      text('같은 색은 안전 · 초록은 모두 위험', 27, 524, 12, '#c1d1bb');
      text('발판 → 문 → E 레버 → 두 출구', 933, 524, 12, '#c1d1bb', 'right');
      if (sim.transition > 0 || sim.phase === 'won') {
        rect(0, 0, W, H, '#142d3299');
        text(
          sim.phase === 'won' ? 'TEMPLE COMPLETE' : 'LEVEL COMPLETE',
          W / 2,
          H / 2,
          32,
          '#fff1bd',
          'center',
        );
        text(
          `${Math.floor(sim.time / 60)
            .toString()
            .padStart(2, '0')}:${Math.floor(sim.time % 60)
            .toString()
            .padStart(2, '0')}  ·  ${sim.collected.size}/4 DIAMONDS`,
          W / 2,
          H / 2 + 35,
          19,
          '#e0da95',
          'center',
        );
      }
      if (sim.flash > 0) {
        c.globalAlpha = sim.flash * 0.25;
        rect(0, 0, W, H, '#fff1c2');
        c.globalAlpha = 1;
      }
      c.restore();
    },
    metrics: () => ({
      drawCalls: calls,
      entities:
        sim.heroes.length +
        sim.gems.length -
        sim.collected.size +
        sim.platforms.length +
        sim.level.pools.length +
        4,
    }),
    dispose() {
      c.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
