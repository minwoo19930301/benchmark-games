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
        [0, -10],
        [9, -2],
        [6, 8],
        [-6, 8],
        [-9, -2],
      ],
      color,
      '#172e36',
    );
    path(
      [
        [0, -8],
        [-5, -1],
        [0, 4],
        [3, -1],
      ],
      '#ffffffaa',
    );
    c.restore();
  }
  function pillar(x: number) {
    rect(x, 82, 42, 350, '#263c3e');
    rect(x + 4, 90, 33, 366, '#58675b');
    rect(x + 9, 90, 8, 350, '#77816b');
    for (let y = 110; y < 447; y += 46) {
      rect(x + 4, y, 33, 2, '#263c3e');
      rect(x + 17, y + 4, 2, 38, '#394f49');
    }
    rect(x - 5, 76, 52, 16, '#7f8a70');
    rect(x - 9, 67, 60, 12, '#43584c');
    rect(x - 3, 438, 50, 20, '#697962');
  }
  function hero(h: Hero, index: number) {
    const moving = Math.abs(h.vx) > 30,
      cycle = Math.sin(sim.time * 13),
      color = h.element === 'ember' ? '#ff8c39' : '#52d8df';
    c.save();
    c.translate(h.x, h.y);
    c.globalAlpha = 0.22;
    c.beginPath();
    c.ellipse(0, 2, 18, 5, 0, 0, Math.PI * 2);
    c.fillStyle = '#071b20';
    c.fill();
    c.globalAlpha = 1;
    if (index === sim.active) {
      path(
        [
          [-5, -62],
          [5, -62],
          [0, -55],
        ],
        '#fff9c8',
      );
    }
    const step = moving ? cycle * 5 : 0;
    c.strokeStyle = '#153b40';
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-5, -11);
    c.lineTo(-7 - step, -3);
    c.moveTo(5, -11);
    c.lineTo(7 + step, -3);
    c.stroke();
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.stroke();
    c.strokeStyle = '#153b40';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(-11, -26);
    c.lineTo(-17 + step, -17);
    c.moveTo(11, -26);
    c.lineTo(17 - step, -18);
    c.stroke();
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.stroke();
    if (h.element === 'ember') {
      path(
        [
          [-12, -13],
          [-16, -28],
          [-10, -37],
          [-11, -46],
          [-2, -41],
          [5, -53],
          [9, -40],
          [16, -31],
          [12, -15],
          [4, -10],
        ],
        '#ed6530',
        '#203c3e',
        2.5,
      );
      path(
        [
          [-8, -20],
          [-8, -32],
          [-3, -35],
          [2, -44],
          [5, -34],
          [10, -29],
          [7, -17],
          [-1, -15],
        ],
        '#ffc966',
      );
    } else {
      c.beginPath();
      c.moveTo(1, -50);
      c.bezierCurveTo(-4, -37, -18, -30, -14, -20);
      c.bezierCurveTo(-11, -6, 13, -6, 15, -20);
      c.bezierCurveTo(19, -31, 7, -38, 1, -50);
      c.fillStyle = color;
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = '#203c3e';
      c.stroke();
      c.beginPath();
      c.moveTo(-9, -27);
      c.quadraticCurveTo(-9, -33, -2, -38);
      c.strokeStyle = '#c5ffff';
      c.lineWidth = 3;
      c.stroke();
    }
    circle(-5 + h.face * 2, -27, 4.5, '#fffbdc');
    circle(6 + h.face * 2, -27, 4.5, '#fffbdc');
    circle(-4 + h.face * 3, -27, 2, '#1b3540');
    circle(7 + h.face * 3, -27, 2, '#1b3540');
    c.strokeStyle = '#204449';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(2, -21, 4, 0.1, Math.PI - 0.1);
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
      rect(0, 0, width, height, '#152b31');
      const scale = Math.min(width / W, height / H);
      c.translate((width - W * scale) / 2, (height - H * scale) / 2);
      c.scale(scale, scale);
      c.save();
      c.beginPath();
      c.rect(0, 0, W, H);
      c.clip();
      const sky = c.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#142f3a');
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
            ['#314849', '#354c4b', '#2b4446', '#3c504c', '#304648'][shade],
          );
          rect(x + 3, y + 3, 64, 2, '#67807422');
          rect(x + 4, y + 48, 61, 2, '#0a272c33');
        }
      for (const x of [100, 383, 663]) {
        c.fillStyle = '#1c353c';
        c.beginPath();
        c.roundRect(x, 113, 155, 210, [76, 76, 0, 0]);
        c.fill();
        c.strokeStyle = '#617264';
        c.lineWidth = 9;
        c.stroke();
        c.strokeStyle = '#102c36';
        c.lineWidth = 3;
        c.stroke();
        rect(x + 11, 264, 133, 60, '#203b40');
        for (let j = 0; j < 5; j++)
          rect(x + 23 + j * 26, 159, 3, 154, '#3c5754');
        circle(x + 77, 183, 21, '#4b6460');
        gem(x + 77, 182, sim.room === 2 ? '#8fc3e8' : '#b9a67b', 1.1);
      }
      for (const x of [25, 285, 615, 938]) pillar(x - 20);
      c.strokeStyle = '#244b3e';
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
            '#537552',
          );
      }
      rect(0, 0, W, 43, '#14292ee8');
      text(`0${sim.room + 1}  /  ${sim.level.name}`, 27, 27, 15, '#d9dbc1');
      text('EMBER  &  TIDE', 933, 27, 15, '#8fc8c7', 'right');
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
      rect(0, FLOOR, W, 19, '#728376');
      rect(0, FLOOR + 19, W, 6, '#243e40');
      for (let x = 0; x < W; x += 42) {
        rect(x + 2, FLOOR + 2, 38, 4, '#a0ac8b');
        rect(x + 40, FLOOR + 3, 2, 15, '#435b55');
      }
      for (const p of sim.platforms) {
        rect(p.x, p.y, p.w, p.h, '#687e6d');
        rect(p.x, p.y, p.w, 4, '#9ba78a');
        for (let x = p.x + 5; x < p.x + p.w - 5; x += 17)
          rect(x, p.y + 8, 9, 3, '#405954');
        path(
          [
            [p.x + 8, p.y + 16],
            [p.x + 20, p.y + 36],
            [p.x + 25, p.y + 16],
          ],
          '#36534d',
        );
      }
      for (const pool of sim.level.pools) {
        const color =
          pool.element === 'ember'
            ? '#e96832'
            : pool.element === 'tide'
              ? '#36aebe'
              : '#92b14c';
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
            g.element === 'ember' ? '#ff9b43' : '#79e8ed',
          );
      });
      [873, 923].forEach((x, i) => {
        const color = i ? '#62cbd5' : '#e8a45d';
        c.beginPath();
        c.roundRect(x - 18, sim.exitY - 74, 36, 74, [18, 18, 0, 0]);
        c.fillStyle = '#122d35';
        c.fill();
        c.strokeStyle = color;
        c.lineWidth = 3;
        c.stroke();
        gem(x, sim.exitY - 47, color, 0.8);
        rect(x - 14, sim.exitY - 12, 28, 4, color);
        text(i ? 'II' : 'I', x, sim.exitY - 88, 12, color, 'center');
      });
      sim.heroes.forEach(hero);
      text('같은 색은 안전 · 초록은 모두 위험', 27, 524, 12, '#c1d1bb');
      text('발판 → 문 → E 레버 → 두 출구', 933, 524, 12, '#c1d1bb', 'right');
      if (sim.transition > 0) {
        rect(0, 0, W, H, '#142d3299');
        text('CHAMBER COMPLETE', W / 2, H / 2, 32, '#fff1bd', 'center');
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
