import { EREGION_MOUTH } from './world.ts';
import type { HunterSprites } from './sprites.ts';
import type { Enemy, ReploidSimulation } from './simulation.ts';

// Local procedural scenery/enemies and fallback poses; hunter art loads attributed Capcom frames.
export function pixelArt(
  ctx: CanvasRenderingContext2D,
  sprites?: HunterSprites,
) {
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  };
  const poly = (points: number[], color: string, outline = '#101824') => {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2)
      ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'miter';
      ctx.stroke();
    }
  };
  const line = (points: number[], color: string, width = 2) => {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2)
      ctx.lineTo(points[i], points[i + 1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const text = (
    value: string,
    x: number,
    y: number,
    size = 10,
    color = '#e1f6f4',
    align: CanvasTextAlign = 'left',
  ) => {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.fillText(value, Math.round(x), Math.round(y));
    ctx.textAlign = 'left';
  };
  const mech = (
    sim: ReploidSimulation,
    x: number,
    y: number,
    ghost = false,
  ) => {
    const p = sim.player,
      zero = sim.character === 'zero';
    if (sprites?.draw(ctx, sim, x, y, ghost)) {
      // Charge sparks remain tied to actual charge state, independent of loaded pose art.
      if (!ghost && !zero && p.charge > 0.1) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.scale(p.facing, 1);
        for (let i = 0; i < 6; i++) {
          const angle = sim.time * 10 + (i * Math.PI) / 3,
            radius = 8 + p.charge * 12;
          rect(
            27 + Math.cos(angle) * radius,
            -24 + Math.sin(angle) * radius,
            3,
            3,
            p.charge >= 1 ? '#c0ffd9' : '#73dbff',
          );
        }
        ctx.restore();
      }
      return;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(p.facing, 1);
    if (ghost) ctx.globalAlpha = 0.19;
    const run = p.grounded && Math.abs(p.vx) > 25;
    const stride = run ? Math.sin(sim.time * 22) * 8 : 0;
    const airborne = !p.grounded,
      dash = p.dash > 0;
    ctx.translate(
      dash ? 8 : run ? 2 : 0,
      dash ? 8 : run ? -Math.abs(stride) * 0.15 : 0,
    );
    const deep = zero ? '#882534' : '#173eab';
    const armor = zero ? '#d92f43' : '#2784e8';
    const shine = zero ? '#ff7776' : '#86e8ff',
      light = '#d6eced';
    // Zero's long golden ponytail and X's distinct blue/light-blue armor.
    if (zero) {
      const flow = dash ? 14 : Math.sin(sim.time * 7) * 4;
      poly(
        [
          -9,
          -47,
          -22,
          -39,
          -30,
          -25 - flow,
          -40,
          -15 - flow,
          -22,
          -20,
          -12,
          -32,
          -4,
          -43,
        ],
        '#f5da5e',
      );
      line([-13, -42, -22, -31, -28, -22 - flow], '#fff3a0', 3);
    }
    const back = dash ? -20 : airborne ? -8 : -stride;
    line([-6, -25, back - 3, -16, back - 7, -3], zero ? light : '#87d5ec', 7);
    poly(
      [
        back - 13,
        -15,
        back - 3,
        -16,
        back + 1,
        -6,
        back + 5,
        -2,
        back + 5,
        1,
        back - 13,
        1,
      ],
      deep,
    );
    rect(back - 10, -13, 4, 9, armor);
    const front = dash ? 5 : airborne ? 6 : stride;
    line([5, -25, front + 3, -15, front + 6, -3], zero ? light : '#a0e7f4', 8);
    poly(
      [
        front - 1,
        -17,
        front + 9,
        -16,
        front + 13,
        -5,
        front + 18,
        -2,
        front + 18,
        2,
        front - 2,
        2,
      ],
      armor,
    );
    rect(front + 1, -14, 5, 10, shine);
    rect(front + 2, -1, 15, 3, deep);
    poly(
      [-10, -36, 8, -36, 12, -25, 5, -19, -9, -23],
      zero ? light : '#70c6f0',
    );
    poly(
      [-10, -37, -3, -39, 8, -37, 11, -29, 4, -27, -8, -29],
      zero ? armor : '#1e6cca',
    );
    rect(-8, -24, 16, 5, deep);
    rect(-2, -24, 5, 4, '#d5e4e9');
    if (zero) {
      for (const side of [-1, 1]) {
        poly(
          [
            side * 5 - 4,
            -35,
            side * 5,
            -38,
            side * 5 + 4,
            -35,
            side * 5 + 3,
            -31,
            side * 5 - 3,
            -31,
          ],
          '#48c6a1',
        );
      }
    }
    // Full open face, ear disks, domed blue helmet and unmistakable forehead gem.
    poly(
      [-10, -47, -6, -54, 5, -57, 12, -52, 15, -44, 10, -35, -5, -36, -12, -41],
      armor,
    );
    poly([-7, -46, -2, -48, 7, -47, 11, -42, 8, -36, -3, -37], '#efcaa4');
    poly([-8, -51, -1, -56, 7, -55, 11, -50, 3, -48, -5, -47], shine);
    poly(
      [2, -55, 7, -54, 9, -49, 6, -46, 2, -49],
      zero ? '#45dcba' : '#ed385c',
    );
    rect(2, -53, 3, 4, zero ? '#a6ffe2' : '#ffafa2');
    poly([-11, -46, -5, -47, -3, -42, -6, -38, -11, -39], deep);
    rect(-9, -44, 4, 5, zero ? '#ffbe58' : '#a1edff');
    rect(4, -43, 6, 2, '#fff6db');
    rect(8, -43, 2, 3, '#207b58');
    line([7, -38, 10, -38], '#994a47', 1);
    if (zero) {
      poly([-10, -48, -13, -61, -5, -54, -2, -49], light);
      poly([8, -51, 15, -59, 13, -46], light);
    }
    if (dash || (airborne && p.vy < -100)) {
      const flame = 17 + Math.sin(sim.time * 85) * 6;
      poly([-10, -5, -flame - 16, -1, -18, 3], '#84efff', '');
      poly([-10, -4, -24, -1, -12, 1], '#eefefe', '');
    }
    if (p.wall) {
      line([7, -34, 17, -38, 19, -48], zero ? light : '#8fd9f0', 6);
      rect(15, -52, 7, 10, armor);
    } else {
      line([-9, -32, -16, -25, -13, -17], zero ? light : '#82d8ee', 6);
      poly([-19, -26, -11, -26, -8, -17, -17, -14, -21, -19], deep);
      poly([3, -36, 10, -38, 17, -33, 15, -26, 7, -25], armor);
      rect(7, -35, 6, 3, shine);
      if (zero) {
        line([14, -29, 21, -22, 27, -23], light, 7);
        poly([22, -27, 30, -27, 33, -20, 23, -18], armor);
        // The saber hilt remains visible even between swings.
        line([30, -24, 35, -14], '#f2d970', 4);
      } else {
        poly([13, -30, 26, -32, 32, -28, 32, -20, 16, -19], armor);
        rect(18, -29, 9, 4, shine);
        rect(28, -28, 6, 8, deep);
        rect(32, -27, 2, 6, '#57ffdc');
        if (p.shoot > 0.085)
          poly([34, -30, 47, -32, 41, -24, 47, -18, 34, -19], '#ffffbc', '');
      }
    }
    if (p.charge > 0.1 && !ghost && !zero) {
      for (let i = 0; i < 6; i++) {
        const angle = sim.time * 10 + (i * Math.PI) / 3,
          radius = 8 + p.charge * 12;
        rect(
          27 + Math.cos(angle) * radius,
          -24 + Math.sin(angle) * radius,
          3,
          3,
          p.charge >= 1 ? '#c0ffd9' : '#73dbff',
        );
      }
      if (p.charge >= 1) {
        ctx.strokeStyle = '#c0ffad';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(29, -24, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (p.saber > 0 && !ghost) {
      const swing = 1 - p.saber / 0.23;
      ctx.save();
      ctx.translate(16, -28);
      ctx.rotate(-1.25 + swing * 2.5);
      poly([0, -3, 48, -7, 70, 0, 47, 5, 0, 3], '#80ffd4', '');
      poly([0, -1, 61, 0, 0, 2], '#f3fff2', '');
      rect(-6, -5, 10, 10, '#ecca53');
      ctx.restore();
      ctx.strokeStyle = '#61e7be';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(7, -27, 60, -1.4, 1.4);
      ctx.stroke();
    }
    ctx.restore();
  };
  const enemy = (e: Enemy, time: number, facing: number) => {
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    ctx.scale(facing, 1);
    const armor = e.flash ? '#fff7cf' : '#ab6370',
      dark = '#251e32';
    if (e.kind === 'drone') {
      line([-24, -28, -12, -24, 12, -24, 24, -28], '#465773', 5);
      rect(-32, -32, 18, 3, '#93c9d0');
      rect(16, -32, 18, 3, '#93c9d0');
      poly([-14, -26, -6, -34, 9, -31, 16, -21, 7, -13, -6, -13], armor);
      rect(-5, -24, 15, 5, dark);
      rect(4, -23, 6, 3, '#ffe58b');
      poly([-8, -12, -2, -5 - Math.sin(time * 20) * 2, 3, -12], '#6adcd6', '');
    } else if (e.kind === 'turret') {
      poly([-22, 0, -16, -13, 15, -13, 22, 0], '#444c65');
      rect(-13, -27, 25, 16, armor);
      poly([-12, -28, -6, -36, 14, -33, 18, -26], '#dae0c5');
      rect(6, -25, 27, 7, dark);
      rect(29, -27, 5, 11, armor);
      rect(-8, -24, 7, 6, '#fff398');
      rect(-15, -7, 29, 3, '#b08692');
    } else {
      for (const side of [-1, 1]) {
        const leg = Math.sin(time * 8 + side) * 4;
        line([side * 8, -17, side * 17, -10, side * 20 + leg, 0], '#323a4e', 6);
        rect(side * 20 + leg - 5, -3, 12, 4, '#89908c');
      }
      poly([-18, -24, -11, -34, 12, -33, 20, -22, 13, -13, -12, -14], armor);
      rect(-10, -29, 18, 4, '#e8b79c');
      rect(6, -26, 11, 6, dark);
      rect(12, -25, 4, 3, '#fff29e');
    }
    if (e.tell > 0) {
      rect(26, -29, 3, 12, '#fff39b');
      rect(22, -25, 11, 3, '#fff39b');
    }
    ctx.restore();
  };
  const boss = (sim: ReploidSimulation) => {
    const b = sim.boss,
      tell = b.mode === 'tell';
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    ctx.scale(b.facing, 1);
    const flash = b.flash > 0,
      edge = '#171b35';
    if (sim.stage.id === 'x4') {
      // Eregion: heavy mechanical dragon, membrane wings, segmented tail and jaws.
      const violet = flash ? '#fff6cc' : '#865390',
        plate = flash ? '#fff9dc' : '#b5a4c3';
      const flap = Math.sin(sim.time * (tell ? 12 : 5)) * 12;
      poly(
        [
          -25, -48, -72, -55, -111, -89, -147, -99, -123, -117, -85, -115, -50,
          -98,
        ],
        '#734b78',
      );
      for (let i = 0; i < 4; i++)
        poly(
          [
            -55 - i * 21,
            -73 - i * 6,
            -62 - i * 21,
            -93 - i * 7,
            -44 - i * 21,
            -83 - i * 7,
          ],
          '#be9ab4',
        );
      for (const side of [-1, 1]) {
        const w = side === 1 ? 1 : 0.8;
        poly(
          [
            -15,
            -70,
            -30 * w,
            -128 - flap,
            -82 * w,
            -155 - flap,
            -59 * w,
            -109,
            -93 * w,
            -79,
            -45 * w,
            -94,
            -35 * w,
            -60,
          ],
          '#544061',
        );
        poly(
          [
            -22,
            -75,
            -32 * w,
            -118 - flap,
            -69 * w,
            -142 - flap,
            -53 * w,
            -111,
            -76 * w,
            -87,
            -46 * w,
            -100,
          ],
          '#d98555',
        );
        line([-18, -71, -31 * w, -129 - flap, -82 * w, -155 - flap], plate, 5);
      }
      poly([-49, -64, -29, -83, 16, -76, 36, -54, 20, -27, -28, -24], violet);
      poly([-22, -68, 14, -66, 27, -48, 16, -29, -18, -33], plate);
      for (let i = 0; i < 3; i++)
        line([-17, -58 + i * 9, 18, -55 + i * 9], '#665078', 3);
      for (const side of [-1, 1]) {
        line([side * 20, -35, side * 36, -20, side * 34, -5], violet, 13);
        poly(
          [
            side * 34 - 10,
            -11,
            side * 34 + 11,
            -9,
            side * 34 + 21,
            1,
            side * 34 - 13,
            1,
          ],
          plate,
        );
        for (let claw = 0; claw < 3; claw++)
          poly(
            [
              side * 34 + 4 + claw * 7,
              -4,
              side * 34 + 11 + claw * 7,
              2,
              side * 34 + 2 + claw * 7,
              2,
            ],
            '#eee9d0',
          );
      }
      poly(
        [
          7, -72, 9, -103, 26, -113, 44, -102, 53, -86, 72, -84, 78, -73, 57,
          -61, 26, -67,
        ],
        violet,
      );
      poly([17, -100, 20, -118, 31, -104], plate);
      poly([35, -100, 44, -119, 46, -98], plate);
      poly([41, -87, 73, -84, 79, -74, 55, -70, 37, -77], plate);
      rect(37, -93, 15, 5, '#faf082');
      rect(45, -94, 3, 7, '#de4444');
      line([52, -74, 75, -76], edge, 3);
      poly([58, -71, 62, -62, 66, -73], '#fff2c9');
      if (tell && b.pattern > 0) {
        ctx.fillStyle = '#ffbb57';
        ctx.beginPath();
        ctx.arc(
          EREGION_MOUTH.x,
          EREGION_MOUTH.y,
          8 + Math.sin(sim.time * 35) * 3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    } else if (sim.stage.id === 'x5') {
      // Dark Necrobat (Dark Dizzy): bat wings, pointed ears, fangs and violet armor.
      const purple = flash ? '#f9f4cb' : '#866aaa',
        lilac = flash ? '#ffffff' : '#c8b2d2',
        flap = Math.sin(sim.time * 6) * 12;
      ctx.translate(0, Math.sin(sim.time * 3) * 3);
      for (const side of [-1, 1]) {
        poly(
          [
            side * 17,
            -60,
            side * 45,
            -88 - flap,
            side * 97,
            -110 - flap,
            side * 77,
            -68,
            side * 101,
            -44,
            side * 63,
            -52,
            side * 44,
            -30,
            side * 25,
            -45,
          ],
          purple,
        );
        poly(
          [
            side * 21,
            -59,
            side * 46,
            -79 - flap,
            side * 84,
            -96 - flap,
            side * 67,
            -67,
            side * 83,
            -51,
            side * 60,
            -60,
            side * 43,
            -40,
          ],
          '#423959',
        );
        line(
          [side * 18, -60, side * 45, -88 - flap, side * 97, -110 - flap],
          lilac,
          5,
        );
        line([side * 45, -85 - flap, side * 44, -37], lilac, 2);
        line([side * 45, -85 - flap, side * 76, -49], lilac, 2);
        line([side * 10, -30, side * 16, -14, side * 23, -7], purple, 10);
        poly(
          [
            side * 23 - 9,
            -12,
            side * 23 + 9,
            -11,
            side * 23 + 15,
            0,
            side * 23 - 12,
            0,
          ],
          lilac,
        );
      }
      poly([-22, -62, -10, -73, 11, -73, 23, -60, 18, -30, -16, -30], purple);
      poly([-13, -59, 12, -59, 15, -40, 0, -31, -14, -41], '#c1bf83');
      poly(
        [
          -20, -69, -23, -100, -10, -87, 0, -92, 13, -87, 23, -103, 21, -67, 8,
          -60, -11, -62,
        ],
        lilac,
      );
      poly(
        [-15, -74, -12, -86, 1, -83, 14, -87, 16, -71, 7, -63, -8, -65],
        '#62576e',
      );
      rect(-13, -79, 11, 4, '#ef555d');
      rect(4, -79, 11, 4, '#ef555d');
      poly([-7, -70, 0, -66, 8, -70, 5, -58, -4, -58], '#291e36');
      poly([-7, -69, -2, -61, 0, -69], '#ffffdf');
      poly([4, -68, 7, -61, 9, -70], '#ffffdf');
      if (tell && b.pattern === 2) {
        ctx.strokeStyle = '#de82fa';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -49, 54 + Math.sin(sim.time * 12) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Blaze Heatnix: a red/gold phoenix with layered wing feathers and talons.
      const red = flash ? '#fff5d2' : '#c1443e',
        gold = flash ? '#fffbd9' : '#e8ae55';
      const flap = Math.sin(sim.time * 7) * 9;
      for (const side of [-1, 1]) {
        line([side * 11, -35, side * 21, -16, side * 24, -5], gold, 10);
        for (let claw = 0; claw < 3; claw++)
          poly(
            [
              side * 24 - 8 + claw * 8,
              -8,
              side * 24 - 5 + claw * 8,
              1,
              side * 24 + 2 + claw * 8,
              1,
              side * 24 - 1 + claw * 8,
              -8,
            ],
            '#f4dfad',
          );
        poly(
          [
            side * 18,
            -65,
            side * 55,
            -96 - flap,
            side * 109,
            -106 - flap,
            side * 93,
            -69,
            side * 49,
            -35,
          ],
          red,
        );
        for (let feather = 0; feather < 5; feather++) {
          const base = 31 + feather * 12;
          poly(
            [
              side * base,
              -80 - flap + feather * 2,
              side * (base + 22),
              -91 - flap,
              side * (base + 7),
              -35 + feather * 2,
              side * (base - 3),
              -49,
            ],
            feather % 2 ? gold : '#f08343',
          );
        }
        line(
          [side * 19, -65, side * 52, -93 - flap, side * 106, -105 - flap],
          gold,
          5,
        );
      }
      poly([-23, -70, -9, -83, 12, -80, 28, -62, 16, -28, -13, -29], red);
      poly([-11, -68, 13, -69, 18, -48, 3, -33, -13, -47], gold);
      poly(
        [-13, -78, -5, -99, 9, -102, 23, -90, 27, -73, 13, -63, -3, -65],
        red,
      );
      poly([-5, -98, -12, -119, 2, -111, 9, -128, 17, -103], gold);
      poly([13, -88, 30, -82, 46, -71, 23, -72, 15, -66], gold);
      rect(9, -91, 12, 4, '#b6fb9b');
      rect(17, -91, 3, 4, '#25262b');
      line([25, -74, 40, -73], edge, 2);
      for (let i = 0; i < 4; i++)
        poly(
          [-9 + i * 6, -32, -26 + i * 10, -11, -18 + i * 10, -43],
          i % 2 ? red : '#ee7e38',
        );
      if (tell)
        for (let i = 0; i < 4; i++)
          poly(
            [
              -27 + i * 18,
              -65,
              -34 + i * 18,
              -86 - Math.sin(sim.time * 16 + i) * 9,
              -16 + i * 18,
              -67,
            ],
            '#ffb858',
            '',
          );
    }
    if (tell)
      text(
        b.pattern === 2 && sim.stage.id === 'x5' ? 'DARK HOLD' : '!',
        0,
        -146,
        16,
        '#fff4b4',
        'center',
      );
    ctx.restore();
  };
  return { rect, poly, line, text, mech, enemy, boss };
}
