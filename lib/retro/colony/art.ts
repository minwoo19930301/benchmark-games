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
function oval(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  stroke?: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
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
  oval(ctx, 2, 2, unit.kind === 'worker' ? 15 : 11, 5, '#160f0d88');
  const facing = Math.cos(unit.facing) - Math.sin(unit.facing) >= 0 ? 1 : -1;
  ctx.scale(facing, 1);
  const stride = unit.moving ? Math.sin(time * 15 + unit.id) * 2.7 : 0;
  const blue = unit.flash > 0 ? '#fff0bd' : unit.enemy ? '#a72f31' : '#294cb0';
  const light = unit.enemy ? '#ee7163' : '#7294de';
  const dark = unit.enemy ? '#501e24' : '#152456';
  if (unit.kind === 'worker') {
    // SCV: two hydraulic legs, a rounded cockpit and asymmetric welding/claw arms.
    for (const side of [-1, 1]) {
      const shift = side * stride;
      polygon(
        ctx,
        [
          [side * 6, -8],
          [side * 11, -6 + shift],
          [side * 13, 1 + shift],
          [side * 5, 2 + shift],
          [side * 3, -5],
        ],
        '#59616b',
        '#17191e',
      );
      oval(ctx, side * 8, -5 + shift, 4, 4, '#a9adb1', '#34393e');
      polygon(
        ctx,
        [
          [side * 5, shift],
          [side * 15, shift],
          [side * 17, 4 + shift],
          [side * 6, 5 + shift],
        ],
        '#86888b',
        '#292a2e',
      );
    }
    polygon(
      ctx,
      [
        [-13, -12],
        [-12, -27],
        [-4, -31],
        [6, -25],
        [9, -10],
        [0, -5],
      ],
      '#a9a8a0',
      '#2b2c31',
    );
    polygon(
      ctx,
      [
        [-13, -23],
        [-20, -21],
        [-21, -10],
        [-13, -7],
      ],
      blue,
      '#242732',
    );
    for (let vent = 0; vent < 3; vent++) {
      ctx.fillStyle = '#303741';
      ctx.fillRect(-19, -19 + vent * 3, 5, 1);
    }
    oval(ctx, -1, -20, 11, 13, '#ceccc0', '#393b40');
    oval(ctx, 2, -22, 8, 9, blue, '#252c40');
    oval(ctx, 4, -24, 5.5, 6, '#344b52');
    polygon(
      ctx,
      [
        [0, -28],
        [7, -28],
        [8, -23],
        [2, -22],
      ],
      '#b5d5bb',
    );
    ctx.fillStyle = '#edf0cb';
    ctx.fillRect(2, -27, 4, 1);
    polygon(
      ctx,
      [
        [7, -18],
        [16, -20],
        [20, -15],
        [17, -10],
        [8, -10],
      ],
      '#7f8790',
      '#252c34',
    );
    oval(ctx, 14, -15, 4, 4, '#d2d1bf', '#40454c');
    polygon(
      ctx,
      [
        [17, -14],
        [26, -13],
        [28, -10],
        [23, -8],
        [19, -10],
      ],
      '#a9b1b9',
      '#242c36',
    );
    ctx.fillStyle = '#4f5661';
    ctx.fillRect(23, -13, 8, 3);
    polygon(
      ctx,
      [
        [30, -14],
        [34, -14],
        [33, -10],
        [28, -9],
      ],
      '#d0d3c8',
      '#41484e',
    );
    polygon(
      ctx,
      [
        [-12, -15],
        [-21, -13],
        [-25, -7],
        [-21, -2],
        [-16, -3],
        [-15, -8],
      ],
      '#878e93',
      '#292d35',
    );
    polygon(
      ctx,
      [
        [-23, -6],
        [-28, -1],
        [-24, 2],
        [-21, -1],
        [-16, 0],
        [-14, -4],
      ],
      '#bcc1be',
      '#333b42',
    );
    ctx.fillStyle = '#f2c640';
    ctx.fillRect(-13, -17, 4, 2);
    ctx.fillRect(7, -17, 4, 2);
    ctx.fillStyle = '#333c47';
    ctx.fillRect(-9, -37, 2, 10);
    ctx.fillStyle = '#e9b34e';
    ctx.fillRect(-10, -39, 4, 2);
    if (unit.cargo > 0) {
      polygon(
        ctx,
        [
          [-14, -28],
          [-14, -38],
          [-8, -44],
          [-3, -35],
          [-6, -28],
        ],
        '#3b83dc',
        '#1c395c',
      );
      polygon(
        ctx,
        [
          [-14, -38],
          [-8, -44],
          [-9, -33],
        ],
        '#b1dcff',
      );
    }
    if (unit.mineTime > 0) {
      ctx.strokeStyle = '#ffe997';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(31, -12);
      ctx.lineTo(37, -15 + Math.sin(time * 40) * 3);
      ctx.stroke();
      oval(ctx, 35, -12, 2, 2, '#fffbc9');
    }
  } else {
    // Marine CMC armor: round pauldron shells, integrated helmet, heavy boots and C-14 rifle.
    for (const side of [-1, 1]) {
      polygon(
        ctx,
        [
          [side * 2, -10],
          [side * 8, -10],
          [side * 9, -2 + side * stride],
          [side * 3, side * stride],
        ],
        dark,
        '#141725',
      );
      oval(ctx, side * 6, -7 + side * stride, 4, 5, blue, '#1b2336');
      polygon(
        ctx,
        [
          [side * 3, -2 + side * stride],
          [side * 11, -2 + side * stride],
          [side * 13, 2 + side * stride],
          [side * 3, 3 + side * stride],
        ],
        '#566581',
        '#1c2437',
      );
    }
    polygon(
      ctx,
      [
        [-9, -25],
        [-14, -23],
        [-14, -12],
        [-8, -9],
        [-4, -14],
      ],
      '#434c65',
      '#151a28',
    );
    ctx.fillStyle = '#8b8b7c';
    ctx.fillRect(-14, -22, 3, 8);
    oval(ctx, 0, -19, 10, 11, blue, '#1c243b');
    oval(ctx, 0, -20, 7, 8, light);
    oval(ctx, 0, -18, 6, 6, blue);
    polygon(
      ctx,
      [
        [-6, -16],
        [4, -15],
        [5, -10],
        [-5, -10],
      ],
      dark,
    );
    for (const side of [-1, 1]) {
      oval(ctx, side * 10, -23, 7, 8, dark, '#121c32');
      oval(ctx, side * 10, -25, 6, 5, blue);
      oval(ctx, side * 11 - 1, -27, 3.5, 2, light);
      oval(ctx, side * 11, -17, 4, 5, blue, '#1a2134');
    }
    oval(ctx, 0, -29, 7.2, 7.5, dark, '#172134');
    oval(ctx, 0, -31, 6, 5, blue);
    oval(ctx, -1, -33, 3.5, 1.6, light);
    polygon(
      ctx,
      [
        [0, -32],
        [6, -30],
        [6, -27],
        [0, -26],
        [-3, -28],
      ],
      '#a78948',
      '#292b2f',
    );
    ctx.fillStyle = '#f3c96f';
    ctx.fillRect(1, -30, 4, 1);
    ctx.fillStyle = '#26323d';
    ctx.fillRect(-1, -25, 7, 2);
    polygon(
      ctx,
      [
        [2, -19],
        [17, -20],
        [23, -18],
        [23, -14],
        [12, -13],
        [4, -15],
      ],
      '#5f6875',
      '#1b222c',
    );
    ctx.fillStyle = '#9ba3a8';
    ctx.fillRect(7, -19, 11, 2);
    ctx.fillStyle = '#262d37';
    ctx.fillRect(18, -19, 11, 3);
    ctx.fillRect(11, -14, 4, 6);
    ctx.fillStyle = '#b7bebd';
    ctx.fillRect(27, -19, 3, 3);
    oval(ctx, 9, -16, 3, 3, blue, '#202b42');
    if (unit.cooldown > (unit.kind === 'marine' ? 0.52 : 0.84))
      polygon(
        ctx,
        [
          [30, -19],
          [36, -22],
          [34, -18],
          [40, -16],
          [32, -14],
        ],
        '#fff2a8',
      );
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
    : ['#488ae1', '#b5deff', '#2558a1'];
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
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(s, s);
  const team = building.enemy ? '#ad3c3e' : '#345eae',
    shine = building.flash > 0 ? '#fff2ce' : '#c3c2af';
  oval(
    ctx,
    4,
    8,
    building.kind === 'turret' ? 35 : building.kind === 'depot' ? 43 : 68,
    building.kind === 'turret' ? 15 : 25,
    '#160f0da0',
  );
  if (building.progress < 1) {
    const radius = building.size * 42;
    polygon(
      ctx,
      [
        [-radius, 0],
        [0, -radius * 0.45],
        [radius, 0],
        [0, radius * 0.45],
      ],
      '#68645b',
      '#292923',
    );
    for (const side of [-1, 1]) {
      polygon(
        ctx,
        [
          [side * radius * 0.75, 3],
          [side * radius * 0.75, -42],
          [side * radius * 0.65, -43],
          [side * radius * 0.65, 0],
        ],
        '#d1a945',
        '#4b4130',
      );
      ctx.strokeStyle = '#948a69';
      ctx.beginPath();
      ctx.moveTo(side * radius * 0.7, -39);
      ctx.lineTo(-side * radius * 0.7, -11);
      ctx.stroke();
    }
    polygon(
      ctx,
      [
        [-radius * 0.65, -12],
        [0, -radius * 0.38 - 12],
        [radius * 0.65, -12],
        [0, radius * 0.35 - 12],
      ],
      '#a4a493',
      '#383e3e',
    );
    for (let i = 0; i < Math.floor(building.progress * 8); i++) {
      ctx.fillStyle = team;
      ctx.fillRect(-20 + i * 5, -24, 4, 10);
    }
    oval(ctx, Math.sin(time * 7) * 25, -16, 3, 3, '#ffe9a0');
    ctx.restore();
    return;
  }
  if (building.kind === 'headquarters' || building.kind === 'core') {
    // Octagonal Command Center, plated circular roof, control module, radar and loading ramp.
    polygon(
      ctx,
      [
        [-63, -9],
        [-33, -29],
        [30, -28],
        [62, -7],
        [62, 16],
        [33, 35],
        [-33, 35],
        [-63, 14],
      ],
      '#77766d',
      '#282c2b',
    );
    polygon(
      ctx,
      [
        [-58, -12],
        [-30, -34],
        [29, -33],
        [58, -12],
        [54, 10],
        [29, 25],
        [-32, 26],
        [-57, 9],
      ],
      '#b0afa0',
      '#454940',
    );
    polygon(
      ctx,
      [
        [-58, -12],
        [-57, 9],
        [-32, 26],
        [-30, 2],
      ],
      '#646962',
    );
    polygon(
      ctx,
      [
        [29, 3],
        [58, -12],
        [54, 10],
        [29, 25],
      ],
      '#555c57',
    );
    oval(ctx, 0, -23, 48, 25, '#494f4e', '#292f31');
    oval(ctx, 0, -29, 47, 24, shine, '#4b514e');
    oval(ctx, 0, -32, 37, 18, '#989c90', '#555b54');
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.strokeStyle = '#697168';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 15, -32 + Math.sin(a) * 7);
      ctx.lineTo(Math.cos(a) * 43, -29 + Math.sin(a) * 21);
      ctx.stroke();
    }
    polygon(
      ctx,
      [
        [-20, -43],
        [-3, -52],
        [21, -45],
        [22, -31],
        [4, -20],
        [-21, -31],
      ],
      '#a8ada1',
      '#424b47',
    );
    polygon(
      ctx,
      [
        [-20, -43],
        [-3, -52],
        [21, -45],
        [4, -35],
      ],
      '#dbd8bc',
      '#687167',
    );
    polygon(
      ctx,
      [
        [4, -35],
        [21, -45],
        [22, -31],
        [4, -20],
      ],
      team,
      '#324756',
    );
    polygon(
      ctx,
      [
        [-17, -39],
        [0, -32],
        [0, -26],
        [-17, -33],
      ],
      '#2a3638',
    );
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#9fc7b1';
      ctx.fillRect(-15 + i * 4, -36 + i * 1.3, 2, 3);
    }
    polygon(
      ctx,
      [
        [-54, -4],
        [-34, 7],
        [-35, 16],
        [-55, 5],
      ],
      team,
    );
    polygon(
      ctx,
      [
        [8, 11],
        [28, 2],
        [29, 22],
        [9, 30],
      ],
      '#252c2c',
      '#c0bda5',
    );
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = '#4d5855';
      ctx.beginPath();
      ctx.moveTo(10, 14 + i * 4);
      ctx.lineTo(26, 7 + i * 4);
      ctx.stroke();
    }
    polygon(
      ctx,
      [
        [8, 27],
        [28, 19],
        [37, 29],
        [14, 40],
      ],
      '#929787',
      '#414d43',
    );
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = '#3f4944';
      ctx.beginPath();
      ctx.moveTo(13 + i * 4, 28 - i * 1.6);
      ctx.lineTo(20 + i * 4, 36 - i * 1.6);
      ctx.stroke();
    }
    for (const side of [-1, 1]) {
      polygon(
        ctx,
        [
          [side * 43, -10],
          [side * 60, -5],
          [side * 66, 6],
          [side * 53, 13],
          [side * 40, 4],
        ],
        '#96998c',
        '#424b45',
      );
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#373f3c';
        ctx.fillRect(side * 51 - 6, -3 + i * 3, 10, 1);
      }
    }
    ctx.fillStyle = '#676f6a';
    ctx.fillRect(-27, -65, 4, 22);
    ctx.save();
    ctx.translate(-25, -65);
    ctx.rotate(-0.27 + Math.sin(time * 0.5) * 0.12);
    oval(ctx, 0, 0, 16, 8, '#d2d0b7', '#4a574f');
    oval(ctx, 0, -2, 13, 5, '#89978e');
    ctx.strokeStyle = '#e6dfbd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, 1);
    ctx.lineTo(7, -10);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#f0bd56';
    ctx.fillRect(-27, -76, 3, 3);
    ctx.fillStyle = '#a8b6a3';
    ctx.fillRect(34, -64, 2, 31);
    ctx.fillStyle = team;
    ctx.fillRect(36, -62, 11, 8);
  } else if (building.kind === 'barracks') {
    // Offset industrial production blocks, ribbed landing legs and a recessed hangar bay.
    polygon(
      ctx,
      [
        [-56, -10],
        [-13, -34],
        [54, -7],
        [55, 16],
        [14, 37],
        [-55, 10],
      ],
      '#626b65',
      '#303b37',
    );
    polygon(
      ctx,
      [
        [-50, -39],
        [-7, -61],
        [48, -35],
        [49, -4],
        [8, 20],
        [-50, -8],
      ],
      '#9b9e8e',
      '#37463e',
    );
    polygon(
      ctx,
      [
        [-50, -39],
        [-7, -61],
        [48, -35],
        [8, -13],
      ],
      shine,
      '#586458',
    );
    polygon(
      ctx,
      [
        [8, -13],
        [48, -35],
        [49, -4],
        [8, 20],
      ],
      '#676e66',
    );
    polygon(
      ctx,
      [
        [-50, -28],
        [8, -3],
        [8, 5],
        [-50, -20],
      ],
      team,
    );
    polygon(
      ctx,
      [
        [-41, -10],
        [-10, 3],
        [-10, -18],
        [-41, -32],
      ],
      '#283730',
      '#bac5a3',
    );
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = '#5c6b59';
      ctx.beginPath();
      ctx.moveTo(-38, -27 + i * 4);
      ctx.lineTo(-13, -16 + i * 4);
      ctx.stroke();
    }
    polygon(
      ctx,
      [
        [12, -12],
        [38, -26],
        [39, -5],
        [13, 10],
      ],
      '#202c28',
      '#acb4a2',
    );
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = '#55604f';
      ctx.beginPath();
      ctx.moveTo(15, -8 + i * 3);
      ctx.lineTo(35, -19 + i * 3);
      ctx.stroke();
    }
    polygon(
      ctx,
      [
        [-35, -44],
        [-15, -54],
        [-1, -47],
        [-22, -37],
      ],
      '#788478',
      '#3b4d40',
    );
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = '#3a4a3e';
      ctx.beginPath();
      ctx.moveTo(-32 + i * 4, -44 - i * 2);
      ctx.lineTo(-21 + i * 4, -39 - i * 2);
      ctx.stroke();
    }
    polygon(
      ctx,
      [
        [14, -41],
        [29, -48],
        [45, -40],
        [45, -53],
        [30, -62],
        [14, -54],
      ],
      '#8a9888',
      '#425343',
    );
    oval(ctx, 29, -55, 12, 6, '#c4c9b1', '#4b5c49');
    for (let n = 0; n < 6; n++) {
      const a = (n * Math.PI) / 3;
      ctx.strokeStyle = '#617661';
      ctx.beginPath();
      ctx.moveTo(29, -55);
      ctx.lineTo(29 + Math.cos(a) * 10, -55 + Math.sin(a) * 4);
      ctx.stroke();
    }
    for (const side of [-1, 1]) {
      polygon(
        ctx,
        [
          [side * 39, 2],
          [side * 52, 5],
          [side * 53, 21],
          [side * 41, 25],
        ],
        '#b4b79c',
        '#4c5b48',
      );
      ctx.fillStyle = '#4c5548';
      ctx.fillRect(side * 44 - 2, 6, 4, 12);
    }
    ctx.fillStyle = building.queue.length ? '#9edc70' : '#cdb968';
    ctx.fillRect(-47, -29, 6, 3);
  } else if (building.kind === 'depot') {
    polygon(
      ctx,
      [
        [-42, -9],
        [0, -31],
        [42, -10],
        [42, 9],
        [0, 32],
        [-42, 12],
      ],
      '#777f6c',
      '#334337',
    );
    polygon(
      ctx,
      [
        [-42, -20],
        [0, -42],
        [42, -21],
        [0, 1],
      ],
      shine,
      '#576650',
    );
    polygon(
      ctx,
      [
        [-42, -20],
        [0, 1],
        [0, 23],
        [-42, 2],
      ],
      '#7c856f',
    );
    polygon(
      ctx,
      [
        [0, 1],
        [42, -21],
        [42, 2],
        [0, 23],
      ],
      '#616d58',
    );
    for (const [px, py] of [
      [-22, -22],
      [0, -32],
      [20, -22],
      [0, -11],
    ]) {
      oval(ctx, px, py, 12, 6, '#687b69', '#3d513e');
      oval(ctx, px, py - 3, 11, 5, '#a4b3a0');
      ctx.fillStyle = '#526b53';
      ctx.fillRect(px - 3, py - 5, 6, 3);
    }
    polygon(
      ctx,
      [
        [-37, -10],
        [-6, 5],
        [-6, 14],
        [-37, -1],
      ],
      team,
    );
    for (let i = 0; i < 6; i++)
      polygon(
        ctx,
        [
          [7 + i * 5, 3 - i * 2.5],
          [10 + i * 5, 1.5 - i * 2.5],
          [10 + i * 5, 9 - i * 2.5],
          [7 + i * 5, 10.5 - i * 2.5],
        ],
        i % 2 ? '#252e28' : '#d8bb59',
      );
  } else {
    // A Bunker is a low concrete pillbox: only its actual embarked Marines can fire.
    polygon(
      ctx,
      [
        [-38, -1],
        [-20, -19],
        [18, -19],
        [38, -1],
        [32, 16],
        [0, 29],
        [-33, 15],
      ],
      '#858a76',
      '#3b4a3b',
    );
    oval(ctx, 0, -9, 33, 20, '#9da58d', '#425341');
    oval(ctx, -1, -16, 29, 15, shine);
    polygon(
      ctx,
      [
        [-28, -9],
        [-12, -2],
        [-12, 5],
        [-28, -2],
      ],
      '#182b22',
      '#657f62',
    );
    polygon(
      ctx,
      [
        [13, -2],
        [29, -10],
        [29, -2],
        [13, 6],
      ],
      '#182b22',
      '#657f62',
    );
    polygon(
      ctx,
      [
        [-5, 1],
        [5, 1],
        [5, 16],
        [-5, 16],
      ],
      '#25392a',
      '#8a9b79',
    );
    polygon(
      ctx,
      [
        [-32, -4],
        [-24, -0.5],
        [-24, 8],
        [-32, 4],
      ],
      team,
    );
    polygon(
      ctx,
      [
        [24, 0],
        [33, -4],
        [33, 3],
        [24, 7],
      ],
      team,
    );
    oval(ctx, -3, -21, 10, 5, '#7d8f74', '#4a5f44');
    ctx.fillStyle = '#4b6047';
    ctx.fillRect(-6, -24, 7, 2);
    if (building.cooldown > 0.5)
      for (const side of [-1, 1])
        polygon(
          ctx,
          [
            [side * 24, -6],
            [side * 35, -10],
            [side * 32, -3],
            [side * 40, 0],
            [side * 25, 1],
          ],
          '#fff0a2',
        );
  }
  ctx.restore();
}
