import type { Cartridge, RetroSimulation, RetroView } from '../types';
import {
  CommandoSimulation,
  benchmarkCommando,
  END,
  FLOOR,
  platforms,
} from './simulation';

function mount(
  canvas: HTMLCanvasElement,
  simulation: RetroSimulation,
): RetroView {
  const sim = simulation as CommandoSimulation;
  const target = canvas.getContext('2d')!;
  if (!target) throw new Error('2D 화면을 열 수 없습니다.');
  const buffer = document.createElement('canvas'),
    ctx = buffer.getContext('2d')!;
  let camera = 0;
  function rect(x: number, y: number, w: number, h: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }
  function text(
    value: string,
    x: number,
    y: number,
    size = 10,
    color = '#fff2b7',
    align: CanvasTextAlign = 'left',
  ) {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px "Courier New",monospace`;
    ctx.textAlign = align;
    ctx.fillText(value, Math.round(x), Math.round(y));
    ctx.textAlign = 'left';
  }
  function soldier(x: number, y: number, enemy = false, rescue = false) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    const p = sim.player;
    const facing = enemy ? (p.x > camera + x ? 1 : -1) : rescue ? 1 : p.facing;
    ctx.scale(facing, 1);
    const walk = enemy
      ? 0
      : rescue
        ? Math.sin(sim.time * 5) * 1
        : Math.abs(p.vx) > 0
          ? Math.sin(sim.time * 18) * 4
          : 0;
    const crouch = !enemy && !rescue && p.crouch ? 10 : 0;
    rect(-11, -2, 23, 3, '#172d32');
    rect(
      -7,
      -13 + crouch / 2,
      6,
      12 - crouch / 2,
      enemy ? '#717d52' : '#46625b',
    );
    rect(
      2,
      -13 + crouch / 2,
      6,
      12 - crouch / 2,
      enemy ? '#56604a' : '#324846',
    );
    rect(-9 + walk, -4, 9, 4, '#202e34');
    rect(2 - walk, -4, 10, 4, '#202e34');
    rect(
      -8,
      -27 + crouch,
      17,
      16 - crouch / 2,
      enemy ? '#69764c' : rescue ? '#efdaa2' : '#50794d',
    );
    rect(-6, -25 + crouch, 5, 10, enemy ? '#9da065' : '#9daf68');
    rect(3, -25 + crouch, 3, 9, '#253b36');
    rect(-6, -39 + crouch, 14, 13, enemy ? '#70824f' : '#e9ad75');
    rect(
      -7,
      -40 + crouch,
      16,
      5,
      enemy ? '#4e6743' : rescue ? '#e6e1b5' : '#b03c35',
    );
    if (enemy) {
      rect(-9, -37 + crouch, 20, 5, '#879465');
      rect(1, -34 + crouch, 7, 3, '#dfbf58');
    } else {
      rect(-5, -42 + crouch, 11, 3, '#4e322b');
      rect(4, -35 + crouch, 2, 2, '#252c29');
      if (!rescue) {
        rect(-13, -36 + crouch, 8, 3, '#e76343');
        rect(-16, -34 + crouch, 7, 2, '#e76343');
      }
    }
    if (rescue) {
      rect(-12, -25, 5, 15, '#e9ad75');
      rect(8, -28, 5, 15, '#e9ad75');
      rect(-8, -16, 18, 3, '#6e5945');
    } else {
      rect(7, -25 + crouch, 12, 6, '#e4ad74');
      rect(12, -26 + crouch, 20, 5, '#263839');
      rect(17, -28 + crouch, 8, 2, '#8b977c');
      rect(29, -25 + crouch, 6, 3, '#111f27');
      if (!enemy && p.shoot > 0.07) {
        rect(34, -28 + crouch, 11, 8, '#ffcd57');
        rect(37, -25 + crouch, 13, 3, '#fff5a4');
      }
    }
    ctx.restore();
  }
  function tank(x: number, y: number, boss = false) {
    const color = boss ? '#7c8b70' : '#d7aa40';
    rect(x - 45, y - 19, 91, 18, '#283b3c');
    rect(x - 41, y - 17, 83, 13, '#576050');
    for (let i = 0; i < 7; i++) {
      rect(x - 38 + i * 12, y - 15, 10, 10, '#202e32');
      rect(x - 35 + i * 12, y - 12, 4, 4, '#a6a36d');
    }
    rect(x - 39, y - 39, 81, 21, color);
    rect(x - 32, y - 44, 68, 7, color);
    rect(x - 23, y - 55, 41, 13, boss ? '#8f9f7e' : '#f0c45c');
    rect(x - 20, y - 59, 34, 5, '#374c40');
    rect(x - 35, y - 36, 12, 5, '#fff0a0');
    rect(x + 21, y - 36, 13, 5, '#c96537');
    rect(x - 15, y - 34, 28, 10, '#455541');
    if (boss) {
      rect(x - 88, y - 51, 69, 8, '#52664e');
      rect(x - 91, y - 53, 11, 12, '#384b43');
      rect(x - 7, y - 53, 6, 6, '#ed7456');
    } else {
      rect(x + 12, y - 50, 54, 7, '#866c39');
      rect(x + 62, y - 52, 9, 11, '#594b32');
    }
    rect(x - 31, y - 28, 60, 3, '#293b32');
    for (let i = 0; i < 4; i++) rect(x - 25 + i * 15, y - 25, 3, 3, '#bcc188');
  }
  function render(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (
      canvas.width !== Math.round(width * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const vw = Math.round(Math.max(480, Math.min(960, (width / height) * 360)));
    if (buffer.width !== vw) {
      buffer.width = vw;
      buffer.height = 360;
    }
    camera = Math.max(0, Math.min(END - vw + 140, sim.player.x - vw * 0.3));
    rect(0, 0, vw, 360, '#b9c6aa');
    for (let i = 0; i < 12; i++) {
      const x = i * 150 - ((camera * 0.14) % 150);
      rect(x, 86 + (i % 3) * 16, 110, 125, '#95a599');
      rect(x + 13, 65 + (i % 3) * 16, 17, 35, '#7f9390');
      rect(x + 35, 75 + (i % 3) * 16, 6, 29, '#869993');
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 6; col++)
          rect(x + 10 + col * 15, 123 + row * 18, 7, 10, '#b4bd9e');
    }
    for (let i = 0; i < 9; i++) {
      const x = i * 230 - ((camera * 0.4) % 230);
      rect(x, 160, 186, 107, '#738881');
      rect(x + 8, 150, 170, 11, '#526e69');
      rect(x + 22, 174, 55, 61, '#3f5a58');
      rect(x + 85, 174, 83, 48, '#819384');
      for (let j = 0; j < 5; j++) rect(x + 91 + j * 15, 177, 3, 42, '#4b6460');
    }
    // Market storefronts, corrugated roofs, fabric awnings and hanging signs.
    for (let i = 0; i < 13; i++) {
      const worldX = i * 260 + 70,
        x = worldX - camera;
      if (x < -270 || x > vw + 50) continue;
      rect(x, 137, 211, 133, i % 2 ? '#bbaf85' : '#c7b98e');
      rect(x + 6, 145, 198, 113, '#9e9674');
      rect(x + 15, 175, 119, 84, '#59675b');
      rect(x + 25, 184, 42, 62, '#394e49');
      rect(x + 73, 184, 49, 62, '#71806a');
      for (let row = 0; row < 7; row++)
        rect(x + 78, 188 + row * 7, 41, 2, '#536559');
      rect(x - 9, 130, 231, 13, '#526f67');
      for (let col = 0; col < 23; col++)
        rect(x - 8 + col * 10, 128, 4, 14, '#94a58c');
      rect(x + 4, 148, 139, 23, i % 2 ? '#973f30' : '#385c66');
      text(i % 2 ? 'MARKET 198X' : 'SEOUL SUPPLY', x + 12, 163, 11, '#f7d48b');
      for (let col = 0; col < 10; col++) {
        rect(x + 4 + col * 14, 173, 14, 15, col % 2 ? '#d8c399' : '#b66047');
        rect(x + 4 + col * 14, 186, 14, 4, col % 2 ? '#b4a67e' : '#944534');
      }
      rect(x + 155, 165, 42, 15, '#ece0a8');
      text('OPEN', x + 159, 176, 9, '#a94d37');
      rect(x + 162, 190, 28, 48, '#4a605a');
      rect(x + 166, 192, 21, 4, '#8d9e82');
      rect(x + 171, 221, 4, 4, '#ead498');
      rect(x - 2, 145, 3, 122, '#3a5350');
      rect(x + 214, 139, 4, 128, '#3a5350');
      rect(x - 4, 122, 225, 2, '#2d4748');
    }
    rect(0, FLOOR, vw, 90, '#85795e');
    rect(0, FLOOR, vw, 4, '#ded3a5');
    rect(0, FLOOR + 4, vw, 4, '#526553');
    rect(0, FLOOR + 15, vw, 3, '#6b644f');
    for (let i = 0; i < vw / 34 + 2; i++) {
      const x = i * 34 - (camera % 34);
      rect(x, FLOOR + 8, 26, 3, '#b3a17b');
      rect(x + 6, FLOOR + 40, 16, 2, '#6c6450');
      rect(x + 20, FLOOR + 64, 7, 3, '#a1916c');
    }
    for (const platform of platforms) {
      const x = platform.x - camera;
      rect(x, platform.y, platform.w, FLOOR - platform.y, '#967948');
      rect(x, platform.y, platform.w, 5, '#d2ae65');
      for (let k = 0; k < platform.w; k += 25) {
        rect(x + k, platform.y + 5, 3, FLOOR - platform.y - 5, '#4d5c44');
        rect(x + k + 5, platform.y + 13, 15, 3, '#bda06a');
      }
      text('CARGO', x + 12, platform.y + 31, 10, '#e0c185');
    }
    for (const prisoner of sim.prisoners) {
      const x = prisoner.x - camera;
      if (!prisoner.rescued) {
        soldier(x, FLOOR, false, true);
        text('HELP! [E]', x - 23, FLOOR - 51, 8, '#fff2b7');
      } else {
        text('THANKS!', x - 21, FLOOR - 51, 8, '#f9df71');
      }
    }
    if (!sim.player.tank) {
      tank(1210 - camera, FLOOR);
      text('BOARD [E]', 1182 - camera, FLOOR - 68, 9);
    }
    for (const enemy of sim.enemies) {
      if (enemy.hp > 0 && enemy.x > camera - 50 && enemy.x < camera + vw + 50) {
        soldier(enemy.x - camera, enemy.y, true);
        if (enemy.flash > 0)
          rect(enemy.x - camera - 7, enemy.y - 30, 17, 10, '#fff4b0');
      }
    }
    if (sim.boss.hp > 0) {
      tank(sim.boss.x - camera, FLOOR, true);
      if (sim.player.x > 2380) {
        rect(vw / 2 - 100, 85, 200, 8, '#333e3c');
        rect(
          vw / 2 - 99,
          86,
          198 * Math.max(0, sim.boss.hp / 65),
          6,
          '#d25b3a',
        );
        text('SCRAP KING', vw / 2, 80, 11, '#f8e2a5', 'center');
      }
    }
    const p = sim.player;
    if (p.invulnerable <= 0 || Math.floor(sim.time * 14) % 2 === 0) {
      if (p.tank) tank(p.x - camera, p.y);
      else soldier(p.x - camera, p.y);
    }
    for (const shot of sim.shots) {
      if (shot.grenade) {
        rect(shot.x - camera - 3, shot.y - 4, 6, 8, '#3d593e');
        rect(shot.x - camera - 2, shot.y - 6, 4, 3, '#cab95d');
      } else {
        rect(
          shot.x - camera - 5,
          shot.y - 2,
          shot.enemy ? 7 : 13,
          4,
          shot.enemy ? '#e86639' : '#ffef99',
        );
        rect(shot.x - camera - 3, shot.y - 1, 5, 2, '#fff8d4');
      }
    }
    for (const blast of sim.explosions) {
      const radius = blast.size * (1 - Math.max(0, blast.life) / 1.5) * 0.6;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + sim.time;
        const x = blast.x - camera + Math.cos(angle) * radius,
          y = blast.y + Math.sin(angle) * radius;
        rect(x - 7, y - 9, 14, 18, i % 2 ? '#ea7539' : '#efb34e');
        rect(x - 3, y - 5, 7, 10, '#fff1a0');
      }
    }
    const exitX = END - camera;
    rect(exitX, 134, 9, 136, '#4a6559');
    rect(exitX - 50, 146, 105, 30, '#b84630');
    text('EXIT →', exitX + 2, 166, 15, '#ffecb4', 'center');
    text('1P', 13, 71, 13, '#e59c43');
    text(String(sim.score).padStart(7, '0'), 40, 71, 13, '#fff4bd');
    text('MISSION 01 / MARKET RESCUE', vw - 12, 71, 10, '#f9eed0', 'right');
    if (sim.time < 7) {
      rect(15, 305, Math.min(vw - 30, 350), 27, '#344e48');
      text('J FIRE   K GRENADE   E RESCUE / BOARD', 25, 323, 10, '#ffe3a0');
    }
    target.setTransform(dpr, 0, 0, dpr, 0, 0);
    target.imageSmoothingEnabled = false;
    target.fillStyle = '#40574f';
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
      buffer.width = 1;
      buffer.height = 1;
    },
    metrics: () => ({
      drawCalls: 1,
      entities:
        sim.enemies.filter((e) => e.hp > 0).length +
        sim.shots.length +
        sim.explosions.length +
        5,
    }),
  };
}
const cartridge: Cartridge = {
  id: 'commando',
  title: 'TIN COMMANDO',
  subtitle: '깡통 특공대',
  inspiration: 'Metal Slug',
  description:
    '시장 골목을 점령한 고철 부대를 뚫고 동료를 구출하세요. 노란 전차를 타면 마지막 보스에게 맞설 수 있습니다.',
  objective: '동료 3명 구출 → 고철 탱크 격파 → 오른쪽 탈출',
  accent: '#a95a21',
  controls: [
    { action: 'attack', label: '사격', key: 'J' },
    { action: 'special', label: '수류탄', key: 'K' },
    { action: 'jump', label: '점프', key: 'SPACE' },
    { action: 'guard', label: '앉기', key: 'L' },
    { action: 'interact', label: '구출/탑승', key: 'E' },
  ],
  create: () => new CommandoSimulation(),
  mount,
  benchmark: (simulation) =>
    benchmarkCommando(simulation as CommandoSimulation),
};
export default cartridge;
