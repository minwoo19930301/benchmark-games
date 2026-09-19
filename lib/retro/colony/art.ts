import type { Building, Unit } from './simulation.ts';

type Ctx = CanvasRenderingContext2D;
export const palette = {
  ink: '#07151d',
  armor: '#b5cbd0',
  edge: '#e0eee8',
  blue: '#378da1',
  darkBlue: '#1a4b60',
  cyan: '#86eee4',
  gold: '#e4b86c',
  orange: '#b87542',
  red: '#c55559',
  darkRed: '#642f42',
};
export function polygon(
  ctx: Ctx,
  points: number[][],
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  points.forEach(([x, y], index) =>
    index
      ? ctx.lineTo(Math.round(x), Math.round(y))
      : ctx.moveTo(Math.round(x), Math.round(y)),
  );
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
export function isoBox(
  ctx: Ctx,
  x: number,
  y: number,
  wx: number,
  wy: number,
  height: number,
  tile: number,
  top: string,
  left: string,
  right: string,
) {
  const a = [x + ((-wx + wy) * tile) / 2, y + ((-wx - wy) * tile) / 4];
  const b = [x + ((wx + wy) * tile) / 2, y + ((wx - wy) * tile) / 4];
  const c = [x + ((wx - wy) * tile) / 2, y + ((wx + wy) * tile) / 4];
  const d = [x + ((-wx - wy) * tile) / 2, y + ((-wx + wy) * tile) / 4];
  polygon(
    ctx,
    [d, c, [c[0], c[1] - height], [d[0], d[1] - height]],
    left,
    '#142832',
  );
  polygon(
    ctx,
    [c, b, [b[0], b[1] - height], [c[0], c[1] - height]],
    right,
    '#142832',
  );
  polygon(
    ctx,
    [
      [a[0], a[1] - height],
      [b[0], b[1] - height],
      [c[0], c[1] - height],
      [d[0], d[1] - height],
    ],
    top,
    '#142832',
  );
}
export function selectionEllipse(
  ctx: Ctx,
  x: number,
  y: number,
  radius: number,
  color = '#79e9ad',
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.44, 0, 0, Math.PI * 2);
  ctx.stroke();
}
export function drawUnit(
  ctx: Ctx,
  unit: Unit,
  x: number,
  y: number,
  scale: number,
  time: number,
) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  ctx.fillStyle = '#07121b80';
  ctx.beginPath();
  ctx.ellipse(0, 1, unit.kind === 'worker' ? 12 : 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const direction = Math.cos(unit.facing) - Math.sin(unit.facing) >= 0 ? 1 : -1;
  ctx.scale(direction, 1);
  const stride = unit.moving ? Math.sin(time * 15 + unit.id) * 2 : 0;
  const flashing = unit.flash > 0;
  if (unit.kind === 'worker') {
    // Four articulated feet, brass tool pods, armored cab, and a cargo rack.
    for (const side of [-1, 1]) {
      const shift = side * stride;
      polygon(
        ctx,
        [
          [side * 5, -5],
          [side * 11, -2 + shift],
          [side * 14, 1 + shift],
          [side * 9, 3 + shift],
          [side * 7, -1],
        ],
        '#597077',
        '#0b1c25',
      );
      ctx.fillStyle = '#aac4c4';
      ctx.fillRect(side < 0 ? -14 : 8, shift, 7, 2);
    }
    polygon(
      ctx,
      [
        [-10, -7],
        [-10, -18],
        [-3, -23],
        [8, -19],
        [10, -7],
        [3, -3],
      ],
      flashing ? '#faf3c8' : '#9d7146',
      '#102732',
    );
    polygon(
      ctx,
      [
        [-10, -18],
        [-3, -23],
        [8, -19],
        [1, -14],
      ],
      '#ddbb79',
      '#102732',
    );
    ctx.fillStyle = '#28516a';
    ctx.fillRect(0, -17, 7, 6);
    ctx.fillStyle = '#80e9ec';
    ctx.fillRect(1, -16, 5, 2);
    ctx.fillStyle = '#3c454c';
    ctx.fillRect(-8, -13, 4, 7);
    ctx.fillStyle = '#ead4a0';
    ctx.fillRect(-9, -12, 2, 3);
    polygon(
      ctx,
      [
        [8, -11],
        [13, -14],
        [17, -10],
        [14, -6],
        [9, -6],
      ],
      '#82969a',
      '#102732',
    );
    ctx.fillStyle = '#4c6572';
    ctx.fillRect(13, -12, 8, 4);
    ctx.fillStyle = '#c7e3db';
    ctx.fillRect(19, -11, 3, 2);
    ctx.fillStyle = '#1d313d';
    ctx.fillRect(-6, -23, 2, -6);
    ctx.fillStyle = '#f6c966';
    ctx.fillRect(-7, -30, 4, 2);
    if (unit.cargo > 0) {
      polygon(
        ctx,
        [
          [-9, -22],
          [-8, -31],
          [-2, -35],
          [2, -28],
          [-1, -21],
        ],
        '#62e8e1',
        '#163b4b',
      );
      polygon(
        ctx,
        [
          [-8, -31],
          [-2, -35],
          [-3, -26],
          [-9, -22],
        ],
        '#b4fff0',
      );
    }
    if (unit.mineTime > 0) {
      ctx.strokeStyle = '#93fff2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(21, -10);
      ctx.lineTo(27 + Math.sin(time * 40) * 2, -12);
      ctx.stroke();
    }
  } else {
    const base = flashing ? '#fbe8b7' : unit.enemy ? '#ab525d' : '#3e8da2';
    const light = unit.enemy ? '#e9968c' : '#9fc7c9';
    const dark = unit.enemy ? '#5b3043' : '#21485f';
    // Oversized shoulder shells, separate boots/legs, backpack and a pulse rifle.
    ctx.fillStyle = '#142734';
    ctx.fillRect(-8, -8 + stride, 6, 8);
    ctx.fillRect(3, -8 - stride, 6, 8);
    ctx.fillStyle = light;
    ctx.fillRect(-8, -2 + stride, 8, 3);
    ctx.fillRect(3, -2 - stride, 8, 3);
    polygon(
      ctx,
      [
        [-8, -23],
        [-11, -17],
        [-9, -9],
        [6, -8],
        [9, -18],
        [5, -24],
      ],
      base,
      '#0d202d',
    );
    ctx.fillStyle = dark;
    ctx.fillRect(-10, -21, 4, 12);
    polygon(
      ctx,
      [
        [-5, -21],
        [4, -22],
        [7, -15],
        [-4, -13],
      ],
      light,
      '#193547',
    );
    ctx.fillStyle = '#1b3948';
    ctx.fillRect(-1, -18, 4, 3);
    polygon(
      ctx,
      [
        [-9, -25],
        [-13, -22],
        [-13, -16],
        [-6, -14],
        [-3, -18],
        [-4, -24],
      ],
      base,
      '#0b202c',
    );
    polygon(
      ctx,
      [
        [3, -25],
        [10, -23],
        [12, -16],
        [5, -14],
        [1, -18],
      ],
      base,
      '#0b202c',
    );
    ctx.fillStyle = light;
    ctx.fillRect(-11, -23, 5, 2);
    ctx.fillRect(5, -23, 5, 2);
    polygon(
      ctx,
      [
        [-5, -25],
        [-5, -31],
        [-1, -35],
        [5, -32],
        [7, -26],
        [3, -22],
      ],
      base,
      '#10212d',
    );
    ctx.fillStyle = '#13232c';
    ctx.fillRect(0, -29, 7, 4);
    ctx.fillStyle = unit.enemy ? '#ffb46d' : '#8bf0e8';
    ctx.fillRect(1, -29, 5, 2);
    ctx.fillStyle = '#bfd2cd';
    ctx.fillRect(-4, -32, 5, 2);
    ctx.fillStyle = '#172a37';
    ctx.fillRect(4, -18, 15, 5);
    ctx.fillRect(14, -19, 6, 3);
    ctx.fillStyle = '#89a4af';
    ctx.fillRect(6, -18, 10, 2);
    ctx.fillRect(9, -13, 4, 4);
    if (unit.enemy) {
      polygon(
        ctx,
        [
          [-5, -32],
          [-8, -39],
          [-1, -34],
        ],
        '#e3ac99',
        '#482636',
      );
      ctx.fillStyle = '#ed7b78';
      ctx.fillRect(-11, -19, 4, 2);
    }
    if (unit.cooldown > (unit.kind === 'marine' ? 0.52 : 0.84)) {
      polygon(
        ctx,
        [
          [21, -20],
          [30, -18],
          [24, -15],
          [31, -12],
          [20, -13],
        ],
        '#fff1a0',
      );
      ctx.fillStyle = '#fbaf58';
      ctx.fillRect(20, -17, 5, 3);
    }
  }
  ctx.restore();
}

export function drawMineral(
  ctx: Ctx,
  x: number,
  y: number,
  scale: number,
  depleted = false,
) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  ctx.fillStyle = '#072f3a88';
  ctx.beginPath();
  ctx.ellipse(0, 1, 21, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const facets = depleted
    ? ['#3b535c', '#576b70', '#263d47']
    : ['#57ccdc', '#bbfff2', '#2884b6'];
  for (const [cx, cy, size] of [
    [-11, 1, 0.75],
    [7, 1, 1],
    [0, -3, 1.25],
    [16, 4, 0.55],
  ]) {
    polygon(
      ctx,
      [
        [cx - 6 * size, cy],
        [cx - 8 * size, cy - 19 * size],
        [cx + 1 * size, cy - 30 * size],
        [cx + 7 * size, cy - 15 * size],
        [cx + 6 * size, cy],
      ],
      facets[0],
      '#124554',
    );
    polygon(
      ctx,
      [
        [cx - 8 * size, cy - 19 * size],
        [cx + 1 * size, cy - 30 * size],
        [cx, cy - 7 * size],
        [cx - 6 * size, cy],
      ],
      facets[1],
    );
    polygon(
      ctx,
      [
        [cx + 1 * size, cy - 30 * size],
        [cx + 7 * size, cy - 15 * size],
        [cx + 6 * size, cy],
        [cx, cy - 7 * size],
      ],
      facets[2],
    );
  }
  ctx.restore();
}

export function drawBuilding(
  ctx: Ctx,
  building: Building,
  x: number,
  y: number,
  tile: number,
  time: number,
) {
  const s = tile / 22;
  const progress = building.progress;
  ctx.save();
  ctx.fillStyle = '#09151e80';
  ctx.beginPath();
  ctx.ellipse(
    x,
    y + tile * 0.15,
    building.size * tile * 1.65,
    building.size * tile * 0.7,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  const roof =
    building.flash > 0 ? '#efddad' : building.enemy ? '#996571' : '#a3b3b1';
  isoBox(
    ctx,
    x,
    y,
    building.size * 2.25,
    building.size * 2.25,
    7 * s,
    tile,
    '#667a80',
    '#283c4a',
    '#3b5260',
  );
  if (progress < 1) {
    ctx.globalAlpha = 0.42 + progress * 0.58;
    isoBox(
      ctx,
      x,
      y - 7 * s,
      building.size * 1.9,
      building.size * 1.9,
      (8 + 20 * progress) * s,
      tile,
      '#6f9299',
      '#294d60',
      '#3d6a76',
    );
    ctx.globalAlpha = 1;
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#d8b86e';
      ctx.fillRect(
        x + side * building.size * tile - 2 * s,
        y - 42 * s,
        3 * s,
        40 * s,
      );
      ctx.fillStyle = '#586e78';
      ctx.fillRect(
        x + side * building.size * tile - 5 * s,
        y - 44 * s,
        9 * s,
        4 * s,
      );
    }
    ctx.strokeStyle = '#d6aa66';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x - building.size * tile, y - 37 * s);
    ctx.lineTo(x + building.size * tile, y - 37 * s);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (building.kind === 'headquarters') {
    isoBox(
      ctx,
      x,
      y - 6 * s,
      2.3,
      2.25,
      25 * s,
      tile,
      roof,
      '#3d6577',
      '#4c8490',
    );
    isoBox(
      ctx,
      x - 4 * s,
      y - 32 * s,
      1.2,
      1.45,
      13 * s,
      tile,
      '#c9d2bf',
      '#688a93',
      '#89aaab',
    );
    isoBox(
      ctx,
      x + 30 * s,
      y + 4 * s,
      0.65,
      0.7,
      22 * s,
      tile,
      '#92adaf',
      '#254b5e',
      '#3a7081',
    );
    ctx.fillStyle = '#172f40';
    ctx.fillRect(x - 14 * s, y - 26 * s, 21 * s, 13 * s);
    ctx.fillStyle = '#74d1dc';
    ctx.fillRect(x - 12 * s, y - 24 * s, 17 * s, 3 * s);
    ctx.fillStyle = '#d5e4d2';
    ctx.fillRect(x - 10 * s, y - 10 * s, 16 * s, 3 * s);
    for (let index = 0; index < 3; index += 1) {
      ctx.fillStyle = '#7bf1d2';
      ctx.fillRect(x - 37 * s + index * 5 * s, y - 25 * s, 3 * s, 4 * s);
    }
    ctx.fillStyle = '#324c5a';
    ctx.fillRect(x + 9 * s, y - 67 * s, 3 * s, 23 * s);
    ctx.save();
    ctx.translate(x + 10 * s, y - 64 * s);
    ctx.rotate(Math.sin(time * 0.65) * 0.3);
    polygon(
      ctx,
      [
        [-13 * s, -7 * s],
        [14 * s, -4 * s],
        [7 * s, 4 * s],
        [-7 * s, 2 * s],
      ],
      '#c3d6ce',
      '#334d5a',
    );
    ctx.strokeStyle = '#698994';
    ctx.beginPath();
    ctx.moveTo(-11 * s, -5 * s);
    ctx.lineTo(10 * s, -2 * s);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#eac971';
    ctx.fillRect(x + 9 * s, y - 73 * s, 4 * s, 3 * s);
  } else if (building.kind === 'barracks') {
    isoBox(
      ctx,
      x,
      y - 7 * s,
      1.9,
      1.85,
      25 * s,
      tile,
      roof,
      '#4b6171',
      '#3c7486',
    );
    isoBox(
      ctx,
      x - 16 * s,
      y - 32 * s,
      0.53,
      1.1,
      8 * s,
      tile,
      '#d0d5c1',
      '#667881',
      '#92a5a6',
    );
    isoBox(
      ctx,
      x + 9 * s,
      y - 34 * s,
      0.75,
      0.65,
      12 * s,
      tile,
      '#789399',
      '#335b6f',
      '#467287',
    );
    for (let index = 0; index < 4; index += 1) {
      ctx.fillStyle = '#293f4e';
      ctx.fillRect(x - 23 * s + index * 4 * s, y - 40 * s, 2 * s, 7 * s);
    }
    polygon(
      ctx,
      [
        [x, y - 14 * s],
        [x + 20 * s, y - 24 * s],
        [x + 20 * s, y - 3 * s],
        [x, y + 7 * s],
      ],
      '#152b3b',
      '#8ba5a2',
    );
    for (let index = 0; index < 4; index += 1) {
      ctx.strokeStyle = '#3c5967';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(x + 2 * s, y - 10 * s + index * 4 * s);
      ctx.lineTo(x + 18 * s, y - 18 * s + index * 4 * s);
      ctx.stroke();
    }
    ctx.fillStyle = building.queue.length ? '#c7ef90' : '#69c7d1';
    ctx.fillRect(x - 28 * s, y - 23 * s, 10 * s, 3 * s);
    ctx.fillStyle = '#e0b966';
    ctx.fillRect(x + 10 * s, y - 48 * s, 6 * s, 3 * s);
  } else if (building.kind === 'turret') {
    isoBox(
      ctx,
      x,
      y - 7 * s,
      0.95,
      0.95,
      14 * s,
      tile,
      roof,
      '#3a5a6a',
      '#548094',
    );
    isoBox(
      ctx,
      x,
      y - 25 * s,
      1.05,
      0.75,
      12 * s,
      tile,
      '#b7c9c3',
      '#477181',
      '#66949e',
    );
    ctx.save();
    ctx.translate(x + 4 * s, y - 35 * s);
    ctx.rotate(-0.5 + Math.sin(time * 0.5) * 0.3);
    ctx.fillStyle = '#1b3545';
    ctx.fillRect(0, -5 * s, 28 * s, 5 * s);
    ctx.fillRect(0, 2 * s, 28 * s, 5 * s);
    ctx.fillStyle = '#a0bbc0';
    ctx.fillRect(5 * s, -5 * s, 20 * s, 2 * s);
    ctx.fillRect(5 * s, 2 * s, 20 * s, 2 * s);
    if (building.cooldown > 0.61) {
      ctx.fillStyle = '#ffe299';
      ctx.fillRect(28 * s, -5 * s, 6 * s, 11 * s);
    }
    ctx.restore();
    ctx.fillStyle = '#83ecce';
    ctx.fillRect(x - 8 * s, y - 35 * s, 7 * s, 3 * s);
  } else {
    isoBox(
      ctx,
      x,
      y - 7 * s,
      2.4,
      2.4,
      25 * s,
      tile,
      roof,
      '#593b4f',
      '#825063',
    );
    for (const side of [-1, 1]) {
      isoBox(
        ctx,
        x + side * 31 * s,
        y - 18 * s,
        0.5,
        0.55,
        27 * s,
        tile,
        '#bf8e8c',
        '#613946',
        '#96515d',
      );
      ctx.fillStyle = '#ff9a72';
      ctx.fillRect(x + side * 31 * s - 3 * s, y - 55 * s, 5 * s, 11 * s);
    }
    const pulse = 1 + Math.sin(time * 2.5) * 0.03;
    polygon(
      ctx,
      [
        [x, y - 84 * s * pulse],
        [x + 18 * s, y - 55 * s],
        [x + 10 * s, y - 29 * s],
        [x - 12 * s, y - 28 * s],
        [x - 18 * s, y - 57 * s],
      ],
      '#d46a79',
      '#4d263e',
    );
    polygon(
      ctx,
      [
        [x, y - 84 * s * pulse],
        [x + 3 * s, y - 50 * s],
        [x - 12 * s, y - 28 * s],
        [x - 18 * s, y - 57 * s],
      ],
      '#ffbd9c',
    );
    polygon(
      ctx,
      [
        [x + 3 * s, y - 50 * s],
        [x + 18 * s, y - 55 * s],
        [x + 10 * s, y - 29 * s],
        [x - 12 * s, y - 28 * s],
      ],
      '#9f435c',
    );
    ctx.fillStyle = '#ffd6a0';
    ctx.fillRect(x - 3 * s, y - 61 * s, 6 * s, 20 * s);
  }
  ctx.restore();
}
