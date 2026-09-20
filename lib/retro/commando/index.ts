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
  const assets = new Map<string, HTMLImageElement>();
  if (typeof Image !== 'undefined')
    for (const name of [
      'marco',
      'rifle-soldier',
      'pow',
      'jungle',
      'mission-1',
      'tetsuyuki',
      'sv001-idle',
      'sv001-move',
      'crouch',
      'jump',
      'up',
      'throw',
      ...Array.from({ length: 8 }, (_, i) => `knife-${i}`),
      ...Array.from({ length: 8 }, (_, i) => `fire-${i}`),
      ...Array.from({ length: 20 }, (_, i) => `blast-${i}`),
    ]) {
      const img = new Image();
      img.src = new URL(`assets/metalslug/${name}.png`, document.baseURI).href;
      assets.set(name, img);
    }
  const loaded = (name: string) => {
    const img = assets.get(name);
    return img?.complete && img.naturalWidth > 0 ? img : undefined;
  };
  const marcoFrames = [
    [0, 0, 48, 38],
    [0, 170, 42, 41],
    [0, 84, 43, 41],
    [0, 127, 43, 41],
    [45, 84, 41, 42],
    [44, 170, 42, 38],
    [48, 40, 39, 41],
    [44, 210, 41, 41],
    [0, 213, 42, 41],
    [0, 40, 46, 42],
    [88, 83, 29, 47],
    [88, 132, 29, 46],
    [87, 210, 33, 42],
    [50, 0, 38, 38],
  ];
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
    ctx.strokeStyle = '#2b3124';
    ctx.lineWidth = 2;
    ctx.strokeText(value, Math.round(x), Math.round(y));
    ctx.fillText(value, Math.round(x), Math.round(y));
    ctx.textAlign = 'left';
  }
  function soldier(x: number, y: number, enemy = false, rescue = false) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    const p = sim.player;
    const facing = enemy ? (p.x > camera + x ? 1 : -1) : rescue ? 1 : p.facing;
    ctx.scale(facing, 1);
    const sprite = loaded(rescue ? 'pow' : enemy ? 'rifle-soldier' : 'marco');
    if (sprite) {
      if (rescue) {
        const f = Math.floor(sim.time * 5) % 5;
        ctx.drawImage(sprite, 10 + f * 43, 21, 43, 35, -21, -35, 43, 35);
      } else if (enemy) {
        // Source soldier faces left; mirror it into the simulation's facing direction.
        ctx.scale(-1, 1);
        const f = Math.floor(sim.time * 7) % 12;
        ctx.drawImage(sprite, f * 35, 42, 35, 42, -17, -42, 35, 42);
      } else {
        const pose =
          p.knife > 0
            ? loaded(`knife-${Math.min(7, Math.floor((0.2 - p.knife) * 40))}`)
            : p.aimUp
              ? loaded('up')
              : p.crouch
                ? loaded('crouch')
                : p.grenade > 0.5
                  ? loaded('throw')
                  : !p.grounded
                    ? loaded('jump')
                    : p.shoot > 0.01 && !p.vx
                      ? loaded(`fire-${Math.floor(sim.time * 20) % 8}`)
                      : undefined;
        if (pose) {
          ctx.drawImage(
            pose,
            -pose.naturalWidth / 2,
            -pose.naturalHeight,
            pose.naturalWidth,
            pose.naturalHeight,
          );
        } else {
          const f = p.vx
            ? Math.floor(sim.time * 13) % 10
            : 10 + (Math.floor(sim.time * 6) % 4);
          const [sx, sy, sw, sh] = marcoFrames[f]!;
          ctx.drawImage(sprite, sx, sy, sw, sh, -sw / 2, -sh, sw, sh);
          if (p.shoot > 0.05) {
            rect(23, -sh + 16, 10, 5, '#e9ba56');
            rect(29, -sh + 17, 11, 2, '#fff5c0');
          }
        }
      }
      ctx.restore();
      return;
    }

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
      enemy ? '#717d52' : '#b5a888',
    );
    rect(
      2,
      -13 + crouch / 2,
      6,
      12 - crouch / 2,
      enemy ? '#56604a' : '#85785e',
    );
    rect(-9 + walk, -4, 9, 4, '#202e34');
    rect(2 - walk, -4, 10, 4, '#202e34');
    rect(
      -8,
      -27 + crouch,
      17,
      16 - crouch / 2,
      enemy ? '#69764c' : rescue ? '#bc9269' : '#a93327',
    );
    rect(
      -6,
      -25 + crouch,
      5,
      10,
      enemy ? '#9da065' : rescue ? '#d6b387' : '#e1633f',
    );
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
      rect(-5, -42 + crouch, 11, 4, rescue ? '#d9d2b5' : '#efc95b');
      rect(-7, -40 + crouch, 6, 7, rescue ? '#b9b197' : '#c59834');
      rect(4, -35 + crouch, 2, 2, '#252c29');
      if (!rescue) {
        rect(-13, -36 + crouch, 8, 3, '#e76343');
        rect(-16, -34 + crouch, 7, 2, '#e76343');
      }
    }
    if (rescue) {
      rect(-4, -32, 12, 13, '#e3ddbd');
      rect(0, -24, 7, 8, '#b8b097');
      rect(-12, -25, 5, 15, '#e9ad75');
      rect(8, -28, 5, 15, '#e9ad75');
      rect(-8, -16, 18, 3, '#6e5945');
    } else {
      rect(7, -25 + crouch, 12, 6, '#e4ad74');
      rect(
        12,
        -26 + crouch,
        20,
        5,
        !enemy && p.knife > 0 ? '#dae3d0' : '#263839',
      );
      if (!enemy && p.weapon === 'heavy')
        rect(13, -28 + crouch, 19, 3, '#7c887e');
      rect(17, -28 + crouch, 8, 2, '#8b977c');
      rect(29, -25 + crouch, 6, 3, '#111f27');
      if (!enemy && p.shoot > 0.07) {
        rect(34, -28 + crouch, 11, 8, '#ffcd57');
        rect(37, -25 + crouch, 13, 3, '#fff5a4');
      }
    }
    ctx.restore();
  }
  // Source sheets face right. Uneven moving-frame crops avoid clipped tracks and drift.
  const slugIdleFrames = [
    [0, 60],
    [65, 60],
    [130, 60],
  ] as const;
  const slugMoveFrames = [
    [0, 60],
    [65, 60],
    [130, 61],
    [196, 61],
    [262, 59],
    [326, 61],
    [392, 62],
    [459, 62],
    [526, 61],
    [592, 62],
  ] as const;
  function tank(x: number, y: number, boss = false, occupied = false) {
    if (!boss) {
      const movingSheet =
        occupied && Math.abs(sim.player.vx) > 0.01
          ? loaded('sv001-move')
          : undefined;
      const sprite = movingSheet || loaded('sv001-idle');
      if (sprite) {
        const frames = movingSheet ? slugMoveFrames : slugIdleFrames;
        const [sx, sw] =
          frames[
            Math.floor(sim.time * (movingSheet ? 10 : 3)) % frames.length
          ]!;
        const scale = 1.55;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(x), Math.round(y));
        ctx.scale(occupied ? sim.player.facing : 1, 1);
        ctx.drawImage(
          sprite,
          sx,
          0,
          sw,
          56,
          (-sw * scale) / 2,
          -56 * scale,
          sw * scale,
          56 * scale,
        );
        ctx.restore();
        return;
      }
    }

    const bossSprite = boss ? loaded('tetsuyuki') : undefined;
    if (bossSprite) {
      const damageFrame = sim.boss.hp > 43 ? 0 : sim.boss.hp > 22 ? 1 : 2;
      ctx.drawImage(
        bossSprite,
        damageFrame * 394,
        0,
        394,
        237,
        x - 85,
        y - 195,
        324,
        195,
      );
      return;
    }

    const color = boss ? '#7c8b70' : '#85948a';
    ctx.save();
    if (boss) {
      ctx.translate(x, y);
      ctx.scale(1.75, 1.55);
      x = 0;
      y = 0;
    }
    rect(x - 45, y - 19, 91, 18, '#283b3c');
    rect(x - 41, y - 17, 83, 13, '#576050');
    for (let i = 0; i < 7; i++) {
      rect(x - 38 + i * 12, y - 15, 10, 10, '#202e32');
      rect(x - 35 + i * 12, y - 12, 4, 4, '#a6a36d');
    }
    rect(x - 39, y - 39, 81, 21, color);
    rect(x - 32, y - 44, 68, 7, color);
    rect(x - 23, y - 55, 41, 13, boss ? '#8f9f7e' : '#b3bba5');
    rect(x - 20, y - 59, 34, 5, '#374c40');
    rect(x - 35, y - 36, 12, 5, '#fff0a0');
    rect(x + 21, y - 36, 13, 5, '#c96537');
    rect(x - 15, y - 34, 28, 10, '#455541');
    if (boss) {
      rect(x - 88, y - 51, 69, 8, '#52664e');
      rect(x - 91, y - 53, 11, 12, '#384b43');
      rect(x - 7, y - 53, 6, 6, '#ed7456');
    } else {
      rect(x + 12, y - 50, 54, 7, '#5b7167');
      rect(x + 62, y - 52, 9, 11, '#374a41');
    }
    rect(x - 31, y - 28, 60, 3, '#293b32');
    for (let i = 0; i < 4; i++) rect(x - 25 + i * 15, y - 25, 3, 3, '#bcc188');
    rect(x - 24, y - 45, 13, 8, '#293f37');
    rect(x - 22, y - 44, 9, 3, '#b6d0c3');
    ctx.restore();
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
    const vw = Math.round(Math.max(400, Math.min(720, (width / height) * 300)));
    if (buffer.width !== vw) {
      buffer.width = vw;
      buffer.height = 300;
    }
    camera = Math.max(0, Math.min(END - vw + 140, sim.player.x - vw * 0.3));
    rect(0, 0, vw, 360, '#bfc2a4');
    const jungle = loaded('jungle'),
      mission = loaded('mission-1');
    // Opaque stage assets cover the fallback scenery; skip that work after loading.
    if (!mission && !jungle) {
      // Mission 1: layered jungle, ruined military structures and a bridge approach.
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 18; i++) {
          const spacing = 105 + layer * 25;
          const x = i * spacing - ((camera * (0.12 + layer * 0.15)) % spacing);
          const top = 90 + layer * 20 + Math.sin(i * 3.7) * 26;
          const colors = ['#8caa91', '#607f68', '#3f614a'];
          for (let leaf = 0; leaf < 7; leaf++) {
            rect(
              x - 18 + leaf * 8,
              top + Math.abs(leaf - 3) * 7,
              39,
              25,
              colors[layer]!,
            );
            rect(x - 8 + leaf * 7, top + 35, 31, 45, colors[layer]!);
          }
          rect(
            x + 25,
            top + 35,
            12,
            FLOOR - top - 35,
            layer === 2 ? '#58614a' : '#809480',
          );
          rect(x + 28, top + 44, 3, FLOOR - top - 44, '#879279');
        }
      }
      for (let i = 0; i < 11; i++) {
        const worldX = i * 285 + 160,
          x = worldX - camera;
        if (x < -300 || x > vw + 50) continue;
        if (i % 3 === 1) {
          rect(x, 183, 155, 87, '#7a7e6a');
          rect(x - 9, 175, 172, 13, '#a4a287');
          rect(x + 23, 218, 76, 52, '#323f37');
          rect(x + 28, 213, 67, 9, '#485044');
          for (let row = 0; row < 6; row++)
            for (let col = 0; col < 6; col++) {
              const bx = x + col * 26 + (row % 2) * 12;
              if (bx < x + 150) rect(bx, 189 + row * 13, 19, 2, '#b3af91');
            }
          rect(x + 113, 192, 21, 26, '#9e4b37');
          text('M', x + 119, 210, 16, '#dfc393');
        } else {
          rect(x + 19, 158, 17, 112, '#646955');
          rect(x + 89, 166, 16, 104, '#606650');
          rect(x + 15, 150, 95, 14, '#94977b');
          rect(x + 22, 157, 10, 104, '#a6a489');
          for (let vine = 0; vine < 7; vine++)
            rect(
              x + 12 + vine * 14,
              144 + (vine % 3) * 9,
              5,
              35 + (vine % 2) * 18,
              '#3e5a38',
            );
          rect(x - 5, 250, 146, 20, '#74705a');
          for (let sand = 0; sand < 8; sand++)
            rect(
              x + sand * 17,
              251 + (sand % 2) * 9,
              21,
              8,
              sand % 2 ? '#aaa07a' : '#c0b087',
            );
        }
      }
    }
    if (!mission) {
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
    }
    if (jungle && !mission) {
      const bw = jungle.naturalWidth * (FLOOR / jungle.naturalHeight);
      for (let bx = -((camera * 0.2) % bw); bx < vw; bx += bw)
        ctx.drawImage(jungle, bx, 0, bw, FLOOR);
    }
    if (mission) {
      // Reuse a flat-ground portion of the original stage art; platforms remain physical geometry.
      const tileWidth = 950;
      for (let bx = -(camera % tileWidth); bx < vw; bx += tileWidth) {
        ctx.drawImage(
          mission,
          1850,
          114,
          tileWidth,
          222,
          Math.floor(bx),
          0,
          tileWidth,
          FLOOR + 16,
        );
      }
      for (let bx = -(camera % 100); bx < vw; bx += 100)
        ctx.drawImage(
          mission,
          2120,
          316,
          100,
          20,
          Math.floor(bx),
          FLOOR,
          100,
          35,
        );
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
        text('HELP!', x - 16, FLOOR - 51, 8, '#fff2b7');
      } else {
        text('THANKS!', x - 21, FLOOR - 51, 8, '#f9df71');
      }
    }
    if (sim.tankAvailable) {
      tank(1210 - camera, FLOOR);
      text('BOARD [E]', 1182 - camera, FLOOR - 94, 9);
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
        text('TETSUYUKI', vw / 2, 80, 11, '#f8e2a5', 'center');
      }
    }
    const p = sim.player;
    if (p.invulnerable <= 0 || Math.floor(sim.time * 14) % 2 === 0) {
      if (p.tank) tank(p.x - camera, p.y, false, true);
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
      const fire = loaded(
        `blast-${Math.min(19, Math.floor((1 - Math.max(0, blast.life) / (blast.size > 90 ? 1.5 : 0.45)) * 20))}`,
      );
      if (fire) {
        const size = Math.max(40, blast.size * 1.2);
        ctx.drawImage(
          fire,
          blast.x - camera - size / 2,
          blast.y - size * 0.85,
          size,
          size,
        );
        continue;
      }
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
    text('1P', 12, 18, 12, '#e8b346');
    text(String(sim.score).padStart(7, '0'), 34, 18, 14, '#fff4bd');
    text('ARMS', vw * 0.38, 13, 9, '#ffeb99');
    text(
      p.tank ? 'VULCAN' : p.weapon === 'heavy' ? 'H ' + p.ammo : '∞',
      vw * 0.38,
      29,
      14,
      '#fff4d0',
    );
    text('BOMB', vw * 0.57, 13, 9, '#ffeb99');
    text(String(p.grenades).padStart(2, '0'), vw * 0.57, 29, 14, '#fff4d0');
    text(
      String(Math.max(0, 180 - Math.floor(sim.time))).padStart(2, '0'),
      vw * 0.79,
      27,
      23,
      '#e9bf56',
      'center',
    );
    text('LIFE ' + p.lives, 12, 34, 10, '#fff0c0');
    text('CREDIT 00', vw - 12, 291, 10, '#d3c6a1', 'right');
    text(
      'POW ' + sim.prisoners.filter((prisoner) => prisoner.rescued).length,
      12,
      291,
      10,
      '#d3c6a1',
    );
    if (p.tank) {
      text('ARMOR', 12, 48, 8, '#fff0c0');
      for (let armor = 0; armor < 3; armor++)
        rect(
          49 + armor * 14,
          41,
          11,
          7,
          armor < p.armor ? '#e7bc51' : '#515546',
        );
    }
    if (sim.time < 2.6) {
      text('MISSION 1', vw / 2 + 2, 107, 27, '#344e3d', 'center');
      text('MISSION 1', vw / 2, 105, 27, '#f7e1a2', 'center');
      text('START!', vw / 2, 132, 18, '#d77637', 'center');
    }
    target.setTransform(dpr, 0, 0, dpr, 0, 0);
    target.imageSmoothingEnabled = false;
    target.fillStyle = '#40574f';
    target.fillRect(0, 0, width, height);
    const scale = Math.min(width / vw, height / 300);
    target.drawImage(
      buffer,
      (width - vw * scale) / 2,
      (height - 300 * scale) / 2,
      vw * scale,
      300 * scale,
    );
  }
  return {
    render,
    dispose() {
      assets.clear();
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
  title: 'METAL SLUG',
  subtitle: '메탈슬러그',
  inspiration: 'Metal Slug',
  description:
    '마르코로 모덴군을 돌파합니다. 근접 칼, 헤비 머신건, 수류탄과 SV-001 슬러그를 사용하는 짧은 미션입니다.',
  objective: '포로 구출 · 슬러그 탑승 · 테츠유키 격파 → 오른쪽 집결',
  accent: '#a95a21',
  controls: [
    { action: 'attack', label: '사격', key: 'J' },
    { action: 'special', label: '수류탄', key: 'K' },
    { action: 'jump', label: '점프', key: 'SPACE' },
    { action: 'guard', label: '앉기', key: 'L' },
    { action: 'interact', label: '슬러그 탑승', key: 'E' },
  ],
  create: () => new CommandoSimulation(),
  mount,
  benchmark: (simulation) =>
    benchmarkCommando(simulation as CommandoSimulation),
};
export default cartridge;
