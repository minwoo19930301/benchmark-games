import type { SpeciesId } from './simulation.ts';

// Hand-drawn geometry rasterised to a four-shade 64×64 sprite. No downloaded game assets.
export function pokemonPixels(id: SpeciesId, back = false): number[][] {
  const p = Array.from({ length: 64 }, () => Array<number>(64).fill(0));
  const dot = (x: number, y: number, c: number) => {
    if (x >= 0 && y >= 0 && x < 64 && y < 64) p[y][x] = c;
  };
  const poly = (points: number[][], c: number) => {
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [a, b] = points[i],
            [u, v] = points[j];
          if (b > y !== v > y && x < ((u - a) * (y - b)) / (v - b) + a)
            inside = !inside;
        }
        if (inside) dot(x, y, c);
      }
  };
  const oval = (cx: number, cy: number, rx: number, ry: number, c: number) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if ((x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry * ry) <= 1)
          dot(x, y, c);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, c: number) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= steps; i++)
      dot(
        Math.round(x1 + ((x2 - x1) * i) / steps),
        Math.round(y1 + ((y2 - y1) * i) / steps),
        c,
      );
  };
  const eye = (x: number, y: number) => {
    oval(x, y, 2, 4, 4);
    dot(x, y - 2, 1);
    dot(x, y - 1, 1);
  };
  if (id === 'charmander') {
    // Curving tail and flame sit behind a round snout, belly and splayed claws.
    poly(
      [
        [38, 44],
        [46, 47],
        [54, 39],
        [56, 24],
        [60, 24],
        [60, 43],
        [54, 54],
        [42, 56],
      ],
      3,
    );
    poly(
      [
        [54, 30],
        [51, 24],
        [54, 18],
        [54, 10],
        [59, 15],
        [62, 9],
        [62, 27],
        [58, 33],
      ],
      3,
    );
    poly(
      [
        [56, 28],
        [54, 22],
        [58, 17],
        [60, 23],
        [59, 29],
      ],
      1,
    );
    oval(32, 41, 12, 15, 2);
    oval(31, 43, 8, 12, 1);
    poly(
      [
        [22, 49],
        [17, 55],
        [17, 59],
        [29, 59],
        [30, 53],
      ],
      2,
    );
    poly(
      [
        [37, 50],
        [37, 58],
        [48, 58],
        [45, 54],
      ],
      2,
    );
    oval(30, 21, 12, 12, 2);
    oval(24, 25, 10, 7, 2);
    poly(
      [
        [22, 34],
        [15, 35],
        [11, 41],
        [18, 43],
        [25, 39],
      ],
      2,
    );
    poly(
      [
        [40, 34],
        [48, 36],
        [49, 42],
        [43, 44],
        [38, 40],
      ],
      2,
    );
    if (!back) {
      eye(23, 18);
      eye(35, 18);
      line(18, 28, 29, 29, 4);
      dot(18, 24, 4);
      dot(21, 30, 1);
    } else {
      oval(30, 21, 10, 9, 3);
      poly(
        [
          [25, 32],
          [25, 43],
          [31, 50],
          [40, 48],
          [43, 41],
          [36, 31],
        ],
        3,
      );
    }
    for (const x of [19, 23, 27, 39, 43, 46]) {
      dot(x, 58, 1);
      dot(x, 57, 1);
    }
  } else if (id === 'bulbasaur') {
    oval(35, 40, 21, 13, 2);
    for (const x of [20, 31, 43, 53]) {
      oval(x, 49, 5, 8, 2);
      line(x - 3, 55, x + 3, 55, 4);
      dot(x - 2, 54, 1);
      dot(x + 1, 54, 1);
    }
    poly(
      [
        [25, 30],
        [22, 18],
        [29, 20],
        [35, 8],
        [40, 19],
        [53, 14],
        [51, 29],
        [43, 37],
        [33, 36],
      ],
      3,
    );
    poly(
      [
        [28, 29],
        [30, 23],
        [35, 14],
        [37, 25],
        [35, 32],
      ],
      2,
    );
    line(41, 21, 42, 32, 4);
    line(46, 21, 43, 31, 2);
    oval(19, 37, 14, 13, 2);
    poly(
      [
        [6, 34],
        [5, 21],
        [15, 26],
      ],
      2,
    );
    poly(
      [
        [23, 26],
        [31, 22],
        [32, 37],
      ],
      2,
    );
    if (!back) {
      eye(11, 35);
      eye(24, 33);
      line(9, 43, 22, 43, 4);
      dot(11, 42, 1);
      dot(20, 42, 1);
    } else {
      poly(
        [
          [5, 31],
          [11, 25],
          [25, 26],
          [32, 34],
          [30, 44],
          [13, 47],
          [6, 42],
        ],
        3,
      );
    }
    for (const [x, y] of [
      [17, 28],
      [27, 39],
      [38, 42],
      [49, 35],
      [33, 51],
    ])
      poly(
        [
          [x, y],
          [x + 4, y - 2],
          [x + 5, y + 3],
          [x + 1, y + 3],
        ],
        3,
      );
  } else if (id === 'squirtle') {
    oval(50, 47, 8, 8, 2);
    oval(50, 47, 5, 5, 3);
    oval(49, 45, 3, 3, 1);
    oval(33, 40, 15, 16, 3);
    oval(31, 40, 11, 14, 1);
    poly(
      [
        [19, 32],
        [10, 34],
        [8, 40],
        [15, 44],
        [24, 39],
      ],
      2,
    );
    poly(
      [
        [43, 34],
        [52, 36],
        [53, 42],
        [46, 44],
        [41, 40],
      ],
      2,
    );
    oval(23, 54, 7, 5, 2);
    oval(40, 54, 7, 5, 2);
    oval(30, 20, 14, 13, 2);
    oval(26, 24, 11, 7, 2);
    if (!back) {
      eye(23, 17);
      eye(36, 17);
      line(20, 28, 32, 28, 4);
      line(21, 38, 40, 38, 3);
      line(21, 44, 40, 44, 3);
      line(29, 33, 29, 51, 3);
    } else {
      oval(32, 40, 13, 14, 3);
      poly(
        [
          [28, 29],
          [39, 32],
          [42, 43],
          [33, 51],
          [23, 44],
          [23, 34],
        ],
        2,
      );
      line(28, 29, 33, 38, 4);
      line(33, 38, 42, 43, 4);
      line(33, 38, 23, 44, 4);
      line(33, 38, 33, 51, 4);
    }
  } else if (id === 'pidgey') {
    poly(
      [
        [34, 40],
        [52, 38],
        [55, 45],
        [46, 54],
        [33, 49],
      ],
      3,
    );
    oval(30, 39, 17, 15, 2);
    oval(29, 43, 11, 11, 1);
    poly(
      [
        [36, 29],
        [48, 33],
        [43, 44],
        [35, 48],
        [28, 46],
      ],
      3,
    );
    line(38, 34, 43, 39, 4);
    line(35, 38, 40, 43, 4);
    line(32, 42, 36, 46, 4);
    oval(22, 22, 12, 12, 2);
    poly(
      [
        [14, 17],
        [15, 8],
        [21, 13],
        [24, 6],
        [28, 16],
      ],
      3,
    );
    poly(
      [
        [12, 21],
        [6, 24],
        [12, 28],
        [17, 26],
      ],
      1,
    );
    poly(
      [
        [17, 16],
        [22, 13],
        [29, 16],
        [30, 22],
        [21, 24],
      ],
      3,
    );
    if (!back) {
      eye(18, 20);
      line(11, 25, 16, 25, 4);
    } else oval(22, 21, 10, 9, 3);
    line(25, 52, 24, 59, 4);
    line(36, 52, 37, 59, 4);
    for (const x of [19, 23, 27, 33, 37, 41]) line(x, 60, x + 2, 58, 4);
  } else {
    poly(
      [
        [39, 39],
        [51, 39],
        [56, 33],
        [55, 26],
        [59, 25],
        [61, 34],
        [56, 44],
        [44, 47],
      ],
      3,
    );
    oval(34, 41, 18, 13, 3);
    oval(19, 38, 13, 11, 2);
    oval(15, 25, 7, 9, 3);
    oval(15, 25, 4, 5, 1);
    oval(29, 25, 7, 8, 3);
    oval(29, 25, 3, 5, 1);
    poly(
      [
        [9, 36],
        [3, 41],
        [10, 47],
        [19, 45],
      ],
      2,
    );
    oval(6, 39, 3, 2, 4);
    if (!back) {
      eye(14, 34);
      eye(27, 33);
      poly(
        [
          [10, 44],
          [16, 43],
          [16, 49],
          [12, 49],
        ],
        1,
      );
      line(16, 45, 16, 49, 4);
    } else {
      oval(20, 36, 10, 9, 3);
    }
    for (const [x, y] of [
      [17, 51],
      [31, 53],
      [45, 52],
    ]) {
      oval(x, y, 7, 4, 2);
      line(x - 4, y + 2, x + 4, y + 2, 4);
    }
    line(7, 40, 0, 36, 4);
    line(7, 43, 0, 45, 4);
    line(27, 40, 34, 37, 4);
  }
  // A one-pixel silhouette outline and selective checker shading evoke the original handheld sprites.
  const mask = p.map((row) => row.slice());
  for (let y = 1; y < 63; y++)
    for (let x = 1; x < 63; x++) {
      if (
        !mask[y][x] &&
        [mask[y - 1][x], mask[y + 1][x], mask[y][x - 1], mask[y][x + 1]].some(
          Boolean,
        )
      )
        p[y][x] = 4;
      if (mask[y][x] === 3 && (x + y) % 3 === 0) p[y][x] = 2;
    }
  return p;
}
