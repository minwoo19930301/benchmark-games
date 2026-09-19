import type { RetroView } from '../types.ts';
import {
  drawBuilding,
  drawMineral,
  drawUnit,
  isoBox,
  polygon,
  selectionEllipse,
} from './art.ts';
import { ColonySimulation, type Building, type Unit } from './simulation.ts';
import {
  BUTTONS,
  ENEMY_BASE,
  HUD_TOP,
  inRect,
  MAP_H,
  MAP_W,
  MINIMAP,
  minimapPoint,
  project,
  ROCK_CELLS,
  rockKeys,
  unproject,
  type Point,
} from './world.ts';

const names = {
  worker: '채굴 작업기',
  marine: '궤도 해병',
  raider: '습격자',
  headquarters: '식민지 지휘부',
  barracks: '해병 병영',
  turret: '쌍열 방어 포탑',
  core: '적 통신 핵',
};
const orders = {
  idle: '대기',
  move: '이동',
  attackMove: '공격 이동',
  attack: '교전',
  harvest: '광물 채취',
  build: '건설',
};
const noise = (x: number, y: number) =>
  ((x * 92821 + y * 68917 + x * y * 283) >>> 0) % 19;

/** Original procedural pixel art. The view owns no input or animation loop. */
export function mountColony(
  canvas: HTMLCanvasElement,
  simulation: ColonySimulation,
): RetroView {
  const raw = canvas.getContext('2d', { alpha: false });
  if (!raw) throw new Error('2D canvas is unavailable.');
  let disposed = false,
    calls = 0,
    entities = 0;
  const counted = new Set([
    'fillRect',
    'strokeRect',
    'fill',
    'stroke',
    'drawImage',
    'fillText',
    'strokeText',
    'clearRect',
  ]);
  const bound = new Map<PropertyKey, unknown>();
  const ctx = new Proxy(raw, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      if (typeof value !== 'function') return value;
      if (!bound.has(key))
        bound.set(key, (...args: unknown[]) => {
          if (counted.has(String(key))) calls += 1;
          return Reflect.apply(value, target, args);
        });
      return bound.get(key);
    },
    set(target, key, value) {
      return Reflect.set(target, key, value, target);
    },
  });
  let width = 1,
    height = 1,
    tile = 1,
    aspect = 1;
  const screen = (point: Point) => {
    const at = project(point, simulation.camera, aspect);
    return { x: at.x * width, y: at.y * height };
  };
  const text = (
    label: string,
    x: number,
    y: number,
    color = '#c1d7d8',
    size = 11,
    align: CanvasTextAlign = 'left',
  ) => {
    ctx.font = `${Math.round(size)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(label, Math.round(x), Math.round(y));
  };
  const panel = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#10232e';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#41616a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#1e3540';
    ctx.fillRect(x + 2, y + 2, w - 4, 3);
    ctx.fillStyle = '#7c9190';
    for (const cx of [x + 5, x + w - 7])
      for (const cy of [y + 5, y + h - 7]) ctx.fillRect(cx, cy, 2, 2);
  };
  const bar = (
    x: number,
    y: number,
    w: number,
    ratio: number,
    color: string,
    h = 4,
  ) => {
    ctx.fillStyle = '#06151e';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, Math.min(1, ratio)) * w, h);
    ctx.fillStyle = '#ffffff25';
    ctx.fillRect(x, y, w, 1);
  };

  function terrain() {
    ctx.fillStyle = '#09151e';
    ctx.fillRect(0, 0, width, height);
    // Faint stars in the unmapped void make the battlefield read as an orbital frontier.
    ctx.fillStyle = '#28434b';
    for (let i = 0; i < 55; i += 1)
      ctx.fillRect(
        (i * 179 + 43) % width,
        (i * 97 + 31) % (height * HUD_TOP),
        1,
        1,
      );
    for (let sum = 0; sum < MAP_W + MAP_H; sum += 1)
      for (let x = 0; x < MAP_W; x += 1) {
        const y = sum - x;
        if (y < 0 || y >= MAP_H) continue;
        const at = screen({ x: x + 0.5, y: y + 0.5 });
        if (
          at.x < -tile ||
          at.x > width + tile ||
          at.y < -tile ||
          at.y > height * HUD_TOP + tile
        )
          continue;
        const visible = simulation.visible[y * MAP_W + x],
          explored = simulation.explored[y * MAP_W + x];
        const seed = noise(x, y),
          road = Math.abs(x + y - 26) < 2.5 && x > 6 && x < 24;
        const colors = road
          ? ['#3d5356', '#3b4e52', '#42575a']
          : ['#293c43', '#2d4247', '#30454a', '#273b43'];
        const color = !explored
          ? seed % 2
            ? '#11232c'
            : '#13262e'
          : visible
            ? colors[seed % colors.length]
            : '#1c3039';
        polygon(
          ctx,
          [
            [at.x, at.y - tile / 2],
            [at.x + tile, at.y],
            [at.x, at.y + tile / 2],
            [at.x - tile, at.y],
          ],
          color,
        );
        if (!explored) continue;
        if (visible && road && seed % 3 === 0) {
          ctx.strokeStyle = '#8c8e6966';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(at.x - tile * 0.38, at.y + tile * 0.12);
          ctx.lineTo(at.x + tile * 0.1, at.y - tile * 0.12);
          ctx.stroke();
        } else if (seed % 3 === 0) {
          ctx.strokeStyle = visible ? '#4e626066' : '#30434b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(at.x - tile * 0.4, at.y);
          ctx.lineTo(at.x - tile * 0.05, at.y + tile * 0.13);
          ctx.lineTo(at.x + tile * 0.2, at.y + tile * 0.03);
          ctx.stroke();
        }
        if (visible && seed % 7 === 0 && !road && !rockKeys.has(`${x},${y}`)) {
          ctx.fillStyle = '#688077';
          ctx.fillRect(at.x + tile * 0.12, at.y - tile * 0.12, 2, 1);
          ctx.fillStyle = '#142c35';
          ctx.fillRect(at.x + tile * 0.15, at.y + tile * 0.15, 3, 2);
        }
      }
    // Permanent navigational beacons point toward the enemy without revealing their army.
    const target = screen(ENEMY_BASE);
    if (
      target.x > 20 &&
      target.x < width - 20 &&
      target.y > 25 &&
      target.y < height * HUD_TOP - 20 &&
      !simulation.isVisible(ENEMY_BASE)
    ) {
      ctx.setLineDash([3, 4]);
      selectionEllipse(ctx, target.x, target.y, tile * 1.8, '#b76a6488');
      ctx.setLineDash([]);
      text(
        '적 통신 신호',
        target.x,
        target.y - tile * 1.2,
        '#c18f87',
        10,
        'center',
      );
    }
  }

  function battlefield() {
    type Sprite = { depth: number; draw: () => void };
    const sprites: Sprite[] = [];
    for (const [x, y] of ROCK_CELLS) {
      const idx = y * MAP_W + x;
      if (!simulation.explored[idx]) continue;
      const at = screen({ x: x + 0.5, y: y + 0.5 });
      if (
        at.x < -tile * 2 ||
        at.x > width + tile * 2 ||
        at.y < -tile ||
        at.y > height * HUD_TOP + tile * 3
      )
        continue;
      sprites.push({
        depth: x + y + 1,
        draw: () => {
          ctx.globalAlpha = simulation.visible[idx] ? 1 : 0.42;
          const h = tile * (0.7 + noise(x, y) / 23);
          isoBox(
            ctx,
            at.x,
            at.y,
            0.93,
            0.93,
            h,
            tile * 2,
            '#667371',
            '#344950',
            '#42585c',
          );
          polygon(
            ctx,
            [
              [at.x - tile * 0.6, at.y - h - tile * 0.1],
              [at.x - tile * 0.08, at.y - h - tile * 0.35],
              [at.x + tile * 0.45, at.y - h - tile * 0.04],
              [at.x, at.y - h + tile * 0.15],
            ],
            '#7b8580',
          );
          ctx.globalAlpha = 1;
        },
      });
    }
    for (const deposit of simulation.deposits) {
      if (
        !simulation.explored[
          Math.floor(deposit.y) * MAP_W + Math.floor(deposit.x)
        ]
      )
        continue;
      const at = screen(deposit);
      sprites.push({
        depth: deposit.x + deposit.y,
        draw: () => {
          ctx.globalAlpha = simulation.isVisible(deposit) ? 1 : 0.4;
          drawMineral(ctx, at.x, at.y, tile / 22, deposit.amount === 0);
          ctx.globalAlpha = 1;
        },
      });
    }
    for (const building of simulation.buildings) {
      if (
        building.enemy &&
        !simulation.explored[
          Math.floor(building.y) * MAP_W + Math.floor(building.x)
        ]
      )
        continue;
      const at = screen(building);
      sprites.push({
        depth: building.x + building.y,
        draw: () => {
          const visible = simulation.isVisible(building);
          ctx.globalAlpha = visible || !building.enemy ? 1 : 0.34;
          if (building.hp <= 0) {
            for (let i = 0; i < 6; i += 1)
              isoBox(
                ctx,
                at.x + ((i % 3) - 1) * tile * 0.7,
                at.y + (Math.floor(i / 3) - 0.5) * tile * 0.45,
                0.55,
                0.4,
                ((i % 3) + 1) * tile * 0.18,
                tile,
                '#4f5151',
                '#283b43',
                '#38464a',
              );
          } else {
            if (simulation.selected.has(building.id))
              selectionEllipse(ctx, at.x, at.y, building.size * tile * 1.65);
            drawBuilding(ctx, building, at.x, at.y, tile, simulation.time);
            if (
              simulation.selected.has(building.id) ||
              building.hp < building.maxHp ||
              building.progress < 1
            ) {
              bar(
                at.x - tile,
                at.y + tile * building.size * 0.65,
                tile * 2,
                building.hp / building.maxHp,
                building.enemy ? '#ed817b' : '#79dba7',
              );
              if (building.progress < 1)
                bar(
                  at.x - tile,
                  at.y + tile * building.size * 0.65 + 7,
                  tile * 2,
                  building.progress,
                  '#e6bf73',
                  3,
                );
            }
          }
          ctx.globalAlpha = 1;
          entities += 1;
        },
      });
    }
    for (const unit of simulation.units) {
      if (unit.hp <= 0 || (unit.enemy && !simulation.isVisible(unit))) continue;
      const at = screen(unit);
      if (
        at.x < -50 ||
        at.x > width + 50 ||
        at.y < -10 ||
        at.y > height * HUD_TOP + 70
      )
        continue;
      sprites.push({
        depth: unit.x + unit.y + 0.12,
        draw: () => {
          if (simulation.selected.has(unit.id))
            selectionEllipse(ctx, at.x, at.y + 1, tile * 0.49);
          drawUnit(ctx, unit, at.x, at.y, tile / 22, simulation.time);
          if (simulation.selected.has(unit.id) || unit.hp < unit.maxHp)
            bar(
              at.x - tile * 0.45,
              at.y + tile * 0.24,
              tile * 0.9,
              unit.hp / unit.maxHp,
              unit.enemy ? '#ef8a80' : '#72daa7',
              3,
            );
          entities += 1;
        },
      });
    }
    sprites
      .sort((a, b) => a.depth - b.depth)
      .forEach((sprite) => sprite.draw());
    for (const projectile of simulation.projectiles) {
      if (!simulation.isVisible(projectile)) continue;
      const at = screen(projectile),
        from = screen({ x: projectile.fromX, y: projectile.fromY });
      const dx = at.x - from.x,
        dy = at.y - from.y,
        length = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = projectile.enemy ? '#ff997d' : '#cbfff0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(
        at.x - (dx / length) * 9,
        at.y - tile * 0.55 - (dy / length) * 9,
      );
      ctx.lineTo(at.x, at.y - tile * 0.55);
      ctx.stroke();
      ctx.fillStyle = '#fff3c1';
      ctx.fillRect(at.x - 1, at.y - tile * 0.55 - 1, 3, 3);
    }
    for (const effect of simulation.effects) {
      if (!simulation.isVisible(effect)) continue;
      const at = screen(effect);
      if (effect.type === 'command') {
        ctx.globalAlpha = effect.life / 0.42;
        selectionEllipse(
          ctx,
          at.x,
          at.y,
          tile * (1.4 - effect.life),
          '#a6f2bf',
        );
      } else if (effect.type === 'deposit') {
        ctx.globalAlpha = effect.life / 0.42;
        text(
          '+12',
          at.x,
          at.y - tile * 2.6 - (0.42 - effect.life) * 30,
          '#a2ffdc',
          12,
          'center',
        );
      } else {
        const blast = effect.type === 'blast',
          age = (blast ? 0.75 : 0.42) - effect.life;
        ctx.globalAlpha = Math.min(1, effect.life * 4);
        for (let i = 0; i < (blast ? 14 : 5); i += 1) {
          const angle = i * 2.4,
            radius = age * tile * (blast ? 3.2 : 1.5);
          const size = Math.max(1, tile * (blast ? 0.22 : 0.09) * effect.life);
          ctx.fillStyle =
            i % 3 === 0 ? '#fff3b6' : i % 3 === 1 ? '#efaf69' : '#d86b59';
          ctx.fillRect(
            at.x + Math.cos(angle) * radius,
            at.y - tile * 0.55 + Math.sin(angle) * radius * 0.65,
            size,
            size,
          );
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function overlays() {
    if (simulation.buildMode && simulation.pointer.y < HUD_TOP) {
      const world = unproject(simulation.pointer, simulation.camera, aspect);
      const spot = {
        x: Math.floor(world.x) + 0.5,
        y: Math.floor(world.y) + 0.5,
      };
      const at = screen(spot),
        size = simulation.buildMode === 'barracks' ? 1.05 : 0.62;
      const good = simulation.canBuild(simulation.buildMode, spot);
      ctx.globalAlpha = 0.55;
      polygon(
        ctx,
        [
          [at.x, at.y - size * tile],
          [at.x + size * tile * 2, at.y],
          [at.x, at.y + size * tile],
          [at.x - size * tile * 2, at.y],
        ],
        good ? '#75d6a8' : '#d96766',
        good ? '#b4ffe1' : '#ffc09d',
      );
      ctx.globalAlpha = 1;
      text(
        good ? '좌클릭: 건설' : '건설할 수 없는 위치',
        at.x,
        at.y - size * tile - 13,
        good ? '#beffe0' : '#ffb39e',
        11,
        'center',
      );
    }
    if (simulation.drag) {
      const { start, end } = simulation.drag;
      ctx.fillStyle = '#82ecad15';
      ctx.strokeStyle = '#9af0bb';
      ctx.lineWidth = 1;
      ctx.fillRect(
        start.x * width,
        start.y * height,
        (end.x - start.x) * width,
        (end.y - start.y) * height,
      );
      ctx.strokeRect(
        Math.round(start.x * width) + 0.5,
        Math.round(start.y * height) + 0.5,
        (end.x - start.x) * width,
        (end.y - start.y) * height,
      );
    }
    if (simulation.assaultMode) {
      const x = simulation.pointer.x * width,
        y = simulation.pointer.y * height;
      ctx.strokeStyle = '#f9bd76';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.lineTo(x + 9, y);
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y + 9);
      ctx.stroke();
    }
    const font = Math.max(9, Math.min(12, width / 88));
    ctx.fillStyle = '#081924de';
    ctx.fillRect(12, 11, Math.min(width - 24, 215), 29);
    text('ORBITAL / SECTOR 07', 22, 26, '#a7c8c8', font);
    const minerals = `◆ ${simulation.minerals}    ◉ ${simulation.friendlyUnits().length}/30`;
    ctx.fillStyle = '#081924de';
    ctx.fillRect(width - 204, 11, 191, 29);
    text(minerals, width - 25, 26, '#9ee8da', font + 1, 'right');
    if (simulation.messageTime > 0) {
      const label = simulation.message;
      ctx.font = `${font}px ui-monospace, monospace`;
      const mw = Math.min(width - 36, ctx.measureText(label).width + 24);
      ctx.fillStyle = '#081924e6';
      ctx.fillRect((width - mw) / 2, height * HUD_TOP - 34, mw, 24);
      text(label, width / 2, height * HUD_TOP - 22, '#d8e2bd', font, 'center');
    }
  }

  function minimap() {
    const box = {
      x: MINIMAP.x * width,
      y: MINIMAP.y * height,
      w: MINIMAP.w * width,
      h: MINIMAP.h * height,
    };
    panel(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
    const cw = box.w / MAP_W,
      ch = box.h / MAP_H;
    for (let y = 0; y < MAP_H; y += 1)
      for (let x = 0; x < MAP_W; x += 1) {
        const index = y * MAP_W + x;
        ctx.fillStyle = simulation.visible[index]
          ? rockKeys.has(`${x},${y}`)
            ? '#647778'
            : '#2d5051'
          : simulation.explored[index]
            ? '#20383f'
            : '#0b1f2a';
        ctx.fillRect(box.x + x * cw, box.y + y * ch, cw + 0.5, ch + 0.5);
      }
    for (const deposit of simulation.deposits)
      if (
        deposit.amount > 0 &&
        simulation.explored[
          Math.floor(deposit.y) * MAP_W + Math.floor(deposit.x)
        ]
      ) {
        const at = minimapPoint(deposit);
        ctx.fillStyle = '#69dfea';
        ctx.fillRect(at.x * width - 2, at.y * height - 2, 4, 4);
      }
    for (const building of simulation.buildings)
      if (building.hp > 0) {
        const at = minimapPoint(building);
        ctx.fillStyle = building.enemy ? '#ec827c' : '#91e6c3';
        ctx.fillRect(at.x * width - 3, at.y * height - 3, 6, 6);
      }
    for (const unit of simulation.units)
      if (unit.hp > 0 && (!unit.enemy || simulation.isVisible(unit))) {
        const at = minimapPoint(unit);
        ctx.fillStyle = unit.enemy ? '#ff9a78' : '#bef5cc';
        ctx.fillRect(at.x * width - 1, at.y * height - 1, 2, 2);
      }
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.strokeStyle = '#cce7bda0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: HUD_TOP },
      { x: 0, y: HUD_TOP },
    ].forEach((point, index) => {
      const at = minimapPoint(unproject(point, simulation.camera, aspect));
      if (index) ctx.lineTo(at.x * width, at.y * height);
      else ctx.moveTo(at.x * width, at.y * height);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function selectionPanel() {
    const x = width * 0.214,
      y = height * 0.805,
      w = width * 0.24,
      h = height * 0.172;
    panel(x, y, w, h);
    const selected = [...simulation.selected]
      .map((id) => simulation.entity(id))
      .filter((entry): entry is Unit | Building => Boolean(entry));
    const font = Math.max(8, Math.min(12, width / 90));
    if (!selected.length) {
      text('작전 명령', x + 10, y + h * 0.2, '#e4d7ad', font + 1);
      text('좌클릭 / 드래그: 선택', x + 10, y + h * 0.43, '#9fb9bf', font);
      text('우클릭: 이동·채굴·공격', x + 10, y + h * 0.64, '#9fb9bf', font);
      text('미니맵: 시점 이동', x + 10, y + h * 0.84, '#688c9b', font - 1);
      return;
    }
    if (selected.length > 1) {
      text(
        `${selected.length}개 유닛 선택`,
        x + 10,
        y + h * 0.19,
        '#cbe7d0',
        font + 1,
      );
      selected.slice(0, 12).forEach((unit, index) => {
        const px = x + 13 + ((index % 6) * (w - 22)) / 6,
          py = y + h * 0.45 + Math.floor(index / 6) * h * 0.3;
        ctx.fillStyle = unit.kind === 'worker' ? '#bba16c' : '#71adba';
        ctx.fillRect(px, py, (w - 30) / 6 - 3, h * 0.17);
        bar(
          px,
          py + h * 0.17 + 2,
          (w - 30) / 6 - 3,
          unit.hp / unit.maxHp,
          '#91d3ac',
          2,
        );
      });
      return;
    }
    const unit = selected[0];
    const portraitW = Math.min(w * 0.32, h * 0.85);
    ctx.fillStyle = '#183844';
    ctx.fillRect(x + 7, y + 9, portraitW, h - 18);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 7, y + 9, portraitW, h - 18);
    ctx.clip();
    if ('size' in unit)
      drawBuilding(
        ctx,
        unit,
        x + 7 + portraitW / 2,
        y + h * 0.82,
        portraitW * 0.27,
        simulation.time,
      );
    else
      drawUnit(
        ctx,
        unit,
        x + 7 + portraitW / 2,
        y + h * 0.82,
        portraitW / 31,
        simulation.time,
      );
    ctx.restore();
    const tx = x + portraitW + 14;
    text(names[unit.kind], tx, y + h * 0.2, '#cee2d4', font);
    text(
      `${Math.ceil(unit.hp)} / ${unit.maxHp}`,
      tx,
      y + h * 0.42,
      '#7ed6ab',
      font - 1,
    );
    if ('size' in unit) {
      text(
        unit.progress < 1
          ? `건설 ${Math.floor(unit.progress * 100)}%`
          : unit.queue.length
            ? `생산 대기 ${unit.queue.length}`
            : '우클릭: 집결지',
        tx,
        y + h * 0.64,
        '#a0b6be',
        font - 1,
      );
      if (unit.queue.length)
        bar(
          tx,
          y + h * 0.81,
          Math.max(12, w - portraitW - 29),
          unit.trainTime / (unit.queue[0] === 'marine' ? 2.4 : 3),
          '#e2bb74',
          4,
        );
    } else {
      text(orders[unit.order.kind], tx, y + h * 0.64, '#a0b6be', font - 1);
      if (unit.cargo)
        text(`광물 ${unit.cargo}`, tx, y + h * 0.83, '#8cddd8', font - 1);
    }
  }

  function commandPanel() {
    const font = Math.max(8, Math.min(12, width / 91));
    for (const button of BUTTONS) {
      const x = button.x * width,
        y = button.y * height,
        w = button.w * width,
        h = button.h * height;
      const hover = inRect(simulation.pointer, button);
      const active =
        simulation.buildMode === button.command ||
        (simulation.assaultMode && button.command === 'assault');
      const afford = simulation.minerals >= button.cost;
      ctx.fillStyle = active ? '#385c59' : hover ? '#2a4752' : '#1b3442';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = active ? '#a9dca7' : '#486271';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = '#0d2533';
      ctx.fillRect(x + 3, y + 3, Math.min(21, w * 0.22), h - 6);
      text(
        button.key,
        x + Math.min(14, w * 0.14),
        y + h / 2,
        active ? '#e2e6ab' : '#d0ded3',
        font + 1,
        'center',
      );
      text(
        button.label,
        x + w * 0.56,
        y + h * (button.cost ? 0.36 : 0.5),
        afford ? '#c7dad8' : '#768994',
        font,
        'center',
      );
      if (button.cost)
        text(
          `◆ ${button.cost}`,
          x + w * 0.56,
          y + h * 0.74,
          afford ? '#7ed7cf' : '#cd8a7e',
          font - 2,
          'center',
        );
    }
  }

  function hud() {
    ctx.fillStyle = '#091a25';
    ctx.fillRect(0, height * HUD_TOP, width, height * (1 - HUD_TOP));
    ctx.fillStyle = '#637a7b';
    ctx.fillRect(0, height * HUD_TOP, width, 2);
    ctx.fillStyle = '#233e4a';
    ctx.fillRect(0, height * HUD_TOP + 3, width, 4);
    for (let x = 12; x < width; x += 52) {
      ctx.fillStyle = '#8c956c';
      ctx.fillRect(x, height * HUD_TOP + 3, 18, 3);
    }
    minimap();
    selectionPanel();
    commandPanel();
  }

  return {
    render(w, h) {
      if (disposed || w <= 0 || h <= 0) return;
      width = w;
      height = h;
      aspect = width / height;
      const dpr = Math.min(1.5, Math.max(1, globalThis.devicePixelRatio || 1));
      const pixelW = Math.round(width * dpr),
        pixelH = Math.round(height * dpr);
      if (canvas.width !== pixelW || canvas.height !== pixelH) {
        canvas.width = pixelW;
        canvas.height = pixelH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      calls = 0;
      entities = 0;
      tile = (width * simulation.camera.zoom) / 35;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, height * HUD_TOP);
      ctx.clip();
      terrain();
      battlefield();
      overlays();
      ctx.restore();
      hud();
    },
    metrics: () => ({ drawCalls: calls, entities }),
    dispose() {
      if (disposed) return;
      disposed = true;
      bound.clear();
      raw.setTransform(1, 0, 0, 1, 0, 0);
      raw.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
