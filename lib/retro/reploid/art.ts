import type { Enemy, ReploidSimulation } from './simulation.ts';

// All silhouettes, armor plates and animation poses are drawn here; no extracted game assets.
export function pixelArt(ctx: CanvasRenderingContext2D) {
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
      accent = sim.stage.accent;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(p.facing, 1);
    const running = p.grounded && Math.abs(p.vx) > 25;
    const stride = running ? Math.sin(sim.time * 22) * 8 : 0;
    const airborne = !p.grounded,
      dash = p.dash > 0;
    const lean = dash ? 10 : p.wall ? -4 : running ? 2 : 0;
    const lift = dash ? 8 : airborne ? 0 : Math.abs(stride) * -0.16;
    if (ghost) ctx.globalAlpha = 0.2;
    ctx.translate(lean, lift);
    const dark = '#172537',
      mid =
        sim.stage.id === 'x6'
          ? '#bd6b48'
          : sim.stage.id === 'x5'
            ? '#627ab0'
            : '#397c8d',
      bright = '#d5e3df';
    // Far leg, articulated knee and angular greave.
    const back = dash ? -18 : airborne ? -9 : -stride;
    line([-6, -21, back - 4, -12, back - 7, -2], dark, 7);
    poly(
      [back - 12, -12, back - 2, -14, back + 1, -3, back + 5, 0, back - 12, 0],
      mid,
    );
    rect(back - 9, -10, 4, 7, '#82b6be');
    const front = dash ? 4 : airborne ? 6 : stride;
    line([4, -22, front + 2, -13, front + 5, -1], dark, 8);
    poly(
      [
        front - 1,
        -15,
        front + 8,
        -13,
        front + 11,
        -3,
        front + 16,
        -2,
        front + 16,
        2,
        front,
        2,
      ],
      bright,
    );
    rect(front + 2, -11, 5, 6, accent);
    rect(front + 3, -1, 13, 3, '#587080');
    // Waist, asymmetric torso plates, glowing reactor and thruster pack.
    poly([-11, -33, 8, -34, 11, -21, 5, -17, -8, -20], dark);
    poly([-9, -37, 7, -36, 11, -28, 5, -23, -10, -27], mid);
    poly([-4, -36, 7, -35, 9, -29, 2, -27, -4, -30], bright);
    poly([-1, -32, 3, -34, 7, -31, 5, -27, 1, -28], '#ffce78');
    poly([-17, -34, -11, -38, -8, -25, -14, -20, -18, -22], '#314858');
    rect(-18, -29, 4, 8, accent);
    if (dash || (airborne && p.vy < -100)) {
      const flame = 16 + Math.sin(sim.time * 80) * 8;
      poly([-18, -29, -18 - flame, -22, -22, -20], accent, '');
      poly([-18, -27, -28, -23, -18, -22], '#f2ffee', '');
    }
    // Helmet: offset antenna and a single horizontal amber sensor, original armor silhouette.
    poly(
      [-8, -47, -2, -53, 9, -50, 13, -42, 8, -35, -6, -36, -11, -41],
      bright,
    );
    poly([-9, -46, -5, -52, -6, -60, -1, -54, 2, -48], mid);
    poly([0, -49, 8, -48, 11, -43, 8, -40, 0, -41], dark);
    rect(3, -45, 8, 3, '#ffbe5e');
    rect(-9, -43, 5, 6, accent);
    rect(-5, -37, 12, 3, '#718594');
    if (p.wall) {
      line([6, -33, 17, -38, 19, -47], bright, 7);
      rect(17, -50, 5, 9, mid);
    } else {
      // Rear gauntlet and front buster are separate pieces, preserving a readable aim pose.
      line([-9, -31, -16, -23, -12, -17], mid, 7);
      poly([3, -35, 11, -37, 17, -31, 15, -25, 7, -25], bright);
      poly([13, -29, 23, -31, 28, -28, 28, -21, 15, -20], mid);
      rect(19, -29, 7, 3, accent);
      rect(25, -27, 5, 7, dark);
      rect(29, -26, 2, 5, p.charge >= 1 ? '#ffffff' : '#65b7c8');
      if (p.shoot > 0.085)
        poly([30, -28, 43, -30, 37, -24, 43, -19, 30, -21], '#ffffc2', '');
    }
    if (p.charge > 0.1 && !ghost) {
      ctx.strokeStyle = p.charge >= 1 ? '#c7ffdc' : '#8ed8ff';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const angle = sim.time * 10 + (i * Math.PI) / 2,
          r = 7 + p.charge * 10;
        rect(
          25 + Math.cos(angle) * r,
          -24 + Math.sin(angle) * r,
          3,
          3,
          ctx.strokeStyle,
        );
      }
      if (p.charge >= 1) {
        ctx.beginPath();
        ctx.arc(27, -24, 11 + Math.sin(sim.time * 18) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (p.saber > 0 && !ghost) {
      const swing = 1 - p.saber / 0.23;
      ctx.save();
      ctx.translate(12, -28);
      ctx.rotate(-1.25 + swing * 2.5);
      poly([0, -3, 48, -7, 70, 0, 47, 5, 0, 3], '#9fffe1', '');
      poly([1, -1, 60, 0, 0, 2], '#f1fffa', '');
      rect(-6, -5, 10, 10, '#ffce78');
      ctx.restore();
      ctx.strokeStyle = '#64e8c0';
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
    const b = sim.boss;
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    ctx.scale(b.facing, 1);
    const a = b.flash ? '#fff7d2' : sim.stage.accent,
      mid = b.flash ? '#dce9d8' : sim.stage.metal,
      dark = '#172333';
    const tell = b.mode === 'tell',
      phase2 = b.phase === 2;
    if (sim.stage.id === 'x4') {
      // Tall mantis freight-loader: blade arms and four reverse-jointed struts.
      for (const i of [-1, 1]) {
        line([i * 13, -31, i * 29, -17, i * 35, 0], dark, 10);
        line([i * 14, -31, i * 29, -18], a, 5);
        poly([i * 34, -7, i * 45, 0, i * 22, 0], mid);
      }
      poly([-26, -65, -13, -79, 17, -74, 28, -52, 15, -29, -15, -30], mid);
      poly([-13, -69, 12, -67, 19, -49, 3, -39, -16, -49], a);
      poly([-12, -80, 1, -91, 19, -82, 17, -72, -7, -73], '#d8e8d8');
      rect(3, -80, 17, 4, phase2 ? '#ff776c' : '#ffc76b');
      for (const side of [-1, 1]) {
        const lift = tell ? -16 : 0;
        line(
          [side * 23, -63, side * 45, -48 + lift, side * 35, -22 + lift],
          mid,
          11,
        );
        poly(
          [
            side * 37,
            -31 + lift,
            side * 55,
            -51 + lift,
            side * 43,
            -4 + lift,
            side * 27,
            -13 + lift,
          ],
          '#d8f5e1',
        );
      }
      rect(-5, -59, 12, 15, '#182d3c');
      rect(-2, -55, 6, 7, '#ffd27b');
    } else if (sim.stage.id === 'x5') {
      // Orbital shell guardian, with radial armor and visible engine rings.
      const bob = Math.sin(sim.time * 3) * 3;
      ctx.translate(0, bob);
      poly(
        [-40, -28, -46, -62, -27, -87, 6, -95, 33, -77, 40, -47, 24, -26],
        mid,
      );
      for (let i = 0; i < 7; i++) {
        const angle = i * 0.65;
        line(
          [
            Math.cos(angle) * 13 - 3,
            Math.sin(angle) * 15 - 59,
            Math.cos(angle) * 37 - 3,
            Math.sin(angle) * 31 - 59,
          ],
          a,
          4,
        );
      }
      ctx.beginPath();
      ctx.arc(-3, -59, 16, 0, Math.PI * 2);
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.strokeStyle = '#e0e8de';
      ctx.lineWidth = 4;
      ctx.stroke();
      rect(-11, -65, 18, 11, phase2 ? '#ff956b' : '#c9edff');
      for (let i = 0; i < 4; i++)
        line(
          [
            -23 + i * 15,
            -28,
            -26 + i * 16,
            -12,
            -18 + i * 15 + Math.sin(sim.time * 5 + i) * 7,
            -3,
          ],
          a,
          6,
        );
      poly([29, -61, 49, -53, 48, -42, 26, -39], '#c6d9dc');
      rect(40, -52, 14, 5, dark);
    } else {
      // Long-snouted furnace jackal with twin exhaust horns and clawed boots.
      line([-17, -30, -27, -14, -31, -2], dark, 13);
      line([15, -28, 24, -15, 26, -2], dark, 13);
      poly([-40, -8, -21, -11, -16, 0, -43, 0], mid);
      poly([15, -10, 33, -9, 42, 0, 13, 0], a);
      poly([-30, -55, -15, -75, 16, -67, 29, -46, 17, -27, -20, -29], mid);
      poly([-18, -68, 13, -62, 18, -42, 0, -35, -19, -45], '#d6cfb4');
      poly(
        [
          -13, -77, -19, -99, -2, -86, 13, -88, 29, -75, 39, -72, 39, -62, 16,
          -61, -8, -65,
        ],
        a,
      );
      rect(13, -77, 14, 4, '#ff624a');
      line([23, -64, 38, -64], dark, 3);
      for (const side of [-1, 1]) {
        line([side * 25, -55, side * 42, tell ? -58 : -32], mid, 12);
        poly(
          [
            side * 40,
            tell ? -59 : -34,
            side * 51,
            -61,
            side * 49,
            -12,
            side * 35,
            -21,
          ],
          '#e5e5c9',
        );
      }
      for (let i = 0; i < 3; i++)
        rect(-11 + i * 9, -53, 5, 16, phase2 ? '#ff684c' : '#ffa858');
      poly([-28, -52, -45, -66, -38, -36, -27, -31], '#564953');
    }
    if (tell) {
      text('!', 0, -110, 22, '#ff8e78', 'center');
    }
    ctx.restore();
  };
  return { rect, poly, line, text, mech, enemy, boss };
}
