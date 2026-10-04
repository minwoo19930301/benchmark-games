import {
  idleInput,
  idlePointer,
  type Input,
  type PointerInput,
  type RetroSimulation,
  type RetroSnapshot,
} from '../types.ts';
import {
  angleDifference,
  canStand,
  OBJECTIVE,
  obstacleDistance,
  rayBox,
  SPAWN,
  visible,
  type Point3,
} from './world.ts';

export const LOOK_SENSITIVITY = 0.0024;
export const MAGAZINE = 25;
export const VISOR_DURATION = 6;
export const HELIX_COOLDOWN = 8;
export const BIOTIC_RADIUS = 4.5;
export type AimPointer = PointerInput;
export type WatchpointInput = Input;
export interface Bot {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  yaw: number;
  walk: number;
  windup: number;
  cooldown: number;
  target: Point3;
  flash: number;
  dead: number;
  elite: boolean;
}
export interface Ally {
  x: number;
  z: number;
  hp: number;
  yaw: number;
  walk: number;
  cooldown: number;
  flash: number;
}
export interface Trace {
  from: Point3;
  to: Point3;
  life: number;
  hit: boolean;
  friendly: boolean;
}
export interface Bolt {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}
export type Rocket = Bolt;
export interface Blast extends Point3 {
  life: number;
  radius: number;
}
export interface Beacon {
  x: number;
  z: number;
  life: number;
}

/** Pure FPS simulation. Mouse look, hitscan, collision and objective all use the same world. */
export class WatchpointSimulation implements RetroSimulation {
  phase: RetroSnapshot['phase'] = 'playing';
  time = 0;
  score = 0;
  player = {
    x: SPAWN.x,
    z: SPAWN.z,
    y: 0,
    vy: 0,
    yaw: 0,
    pitch: 0,
    hp: 200,
    ammo: MAGAZINE,
    reserve: 225,
    reload: 0,
    fire: 0,
    recoil: 0,
    sprinting: false,
    sprintRecovery: 0,
    helixCooldown: 0,
    helixFlash: 0,
    visorTarget: -1,
    moving: false,
    walk: 0,
    healCooldown: 0,
    ultimate: 0,
    visor: 0,
    invulnerable: 2,
    hurt: 0,
    hit: 0,
    kills: 0,
    deaths: 0,
    respawn: 0,
  };
  bots: Bot[] = [];
  allies: Ally[] = [
    { x: -2.7, z: 12, hp: 160, yaw: 0, walk: 0, cooldown: 1, flash: 0 },
    { x: 2.8, z: 5, hp: 160, yaw: 0, walk: 0, cooldown: 1.5, flash: 0 },
  ];
  traces: Trace[] = [];
  bolts: Bolt[] = [];
  rockets: Rocket[] = [];
  blasts: Blast[] = [];
  helixShots = 0;
  visorHits = 0;
  beacon: Beacon | null = null;
  capture = 0;
  enemyCapture = 0;
  contested = false;
  onPoint = false;
  shots = 0;
  headshots = 0;
  audioCues = {
    shot: 0,
    hit: 0,
    jump: 0,
    dash: 0,
    pickup: 0,
    explosion: 0,
    ability: 0,
  };
  wave = 0;
  message = 'SOLDIER: 76 · WATCHPOINT: GIBRALTAR';
  messageTime = 5;
  private nextBotId = 0;
  private held = { jump: false, helix: false, heal: false, ultimate: false };

  constructor() {
    this.spawnWave();
  }

  snapshot(): RetroSnapshot {
    return {
      phase: this.phase,
      time: this.time,
      score: this.score,
      progress: this.capture / 100,
      objective:
        this.phase === 'won'
          ? '거점 확보! WATCHPOINT: GIBRALTAR 작전 완료.'
          : this.phase === 'lost'
            ? '작전 실패 · 다시 출격하세요.'
            : this.player.respawn > 0
              ? `재출격까지 ${Math.ceil(this.player.respawn)}초 · 남은 출격 ${3 - this.player.deaths}`
              : this.contested
                ? '거점 경합 중! 붉은 경비 로봇을 제압하세요.'
                : this.onPoint
                  ? `업링크 점령 ${Math.floor(this.capture)}% · 거점 안에서 방어하세요!`
                  : 'WASD 이동 · 마우스 조준 · 중앙 A 거점으로! R 재장전 · E 회복 장치',
      stats: [
        { label: 'HP', value: Math.ceil(this.player.hp) },
        { label: 'AMMO', value: `${this.player.ammo}/${this.player.reserve}` },
        { label: 'UPLINK', value: `${Math.floor(this.capture)}%` },
        { label: 'ULT', value: `${Math.floor(this.player.ultimate)}%` },
        { label: 'KILLS', value: this.player.kills },
      ],
    };
  }

  step(delta: number, input: WatchpointInput): void {
    if (this.phase !== 'playing' || !Number.isFinite(delta) || delta <= 0)
      return;
    const dt = Math.min(delta, 1 / 30);
    this.time += dt;
    this.messageTime = Math.max(0, this.messageTime - dt);
    this.traces.forEach((trace) => {
      trace.life -= dt;
    });
    this.traces = this.traces.filter((trace) => trace.life > 0);
    const p = this.player;
    for (const key of [
      'fire',
      'recoil',
      'sprintRecovery',
      'helixCooldown',
      'helixFlash',
      'healCooldown',
      'visor',
      'invulnerable',
      'hurt',
      'hit',
    ] as const)
      p[key] = Math.max(0, p[key] - dt);
    const next = {
      jump: input.jump,
      helix: !!(
        input.guard ||
        input.pointer?.secondary ||
        input.pointer?.secondaryPressed
      ),
      heal: input.interact,
      ultimate: !!input.ultimate,
    };
    if (p.respawn > 0) {
      p.sprinting = false;
      p.visor = 0;
      p.visorTarget = -1;
      p.respawn = Math.max(0, p.respawn - dt);
      if (!p.respawn) {
        p.x = SPAWN.x;
        p.z = SPAWN.z;
        p.y = 0;
        p.vy = 0;
        p.hp = 200;
        p.ammo = MAGAZINE;
        p.reserve = Math.max(96, p.reserve);
        p.reload = 0;
        p.yaw = 0;
        p.pitch = 0;
        p.invulnerable = 3;
      }
    } else {
      const pointer = input.pointer;
      if (
        pointer &&
        Number.isFinite(pointer.dx) &&
        Number.isFinite(pointer.dy)
      ) {
        p.yaw += Math.max(-1500, Math.min(1500, pointer.dx)) * LOOK_SENSITIVITY;
        p.pitch = Math.max(
          -1.25,
          Math.min(
            1.25,
            p.pitch -
              Math.max(-900, Math.min(900, pointer.dy)) * LOOK_SENSITIVITY,
          ),
        );
      }
      const wasSprinting = p.sprinting;
      p.sprinting =
        input.special &&
        input.up &&
        !input.down &&
        !p.reload &&
        !input.interact &&
        !input.ultimate;
      if (wasSprinting && !p.sprinting) p.sprintRecovery = 0.18;
      if (p.sprinting && !wasSprinting) this.audioCues.dash++;
      p.visorTarget = p.visor > 0 ? (this.visorTarget()?.id ?? -1) : -1;
      if (input.jump && !this.held.jump && p.y === 0) {
        p.vy = 7.4;
        this.audioCues.jump++;
      }
      if (input.interact && !this.held.heal && !p.healCooldown) {
        this.beacon = { x: p.x, z: p.z, life: 5 };
        p.healCooldown = 15;
        this.audioCues.ability++;
        this.say('생체장 전개 · 노란 원 안에서 자신과 아군 회복');
      }
      if (input.ultimate && !this.held.ultimate && p.ultimate >= 100) {
        p.ultimate = 0;
        p.visor = VISOR_DURATION;
        p.ammo = MAGAZINE;
        p.reload = 0;
        this.audioCues.ability++;
        this.say('전술 조준경 가동 · 시야 안의 적 자동 조준 · 6초');
      }
      this.move(dt, input);
      if (
        next.helix &&
        !this.held.helix &&
        !p.helixCooldown &&
        !p.sprinting &&
        !p.sprintRecovery &&
        !p.reload
      )
        this.launchHelix();
      if (p.reload > 0) {
        p.reload = Math.max(0, p.reload - dt);
        if (p.reload === 0) {
          const count = Math.min(MAGAZINE - p.ammo, p.reserve);
          p.ammo += count;
          p.reserve -= count;
        }
      } else if (input.reload && p.ammo < MAGAZINE && p.reserve > 0)
        p.reload = 1.65;
      else if (
        !p.sprinting &&
        !p.sprintRecovery &&
        (input.attack || pointer?.primary || pointer?.primaryPressed)
      ) {
        if (p.ammo > 0 && p.fire === 0) this.shoot();
        else if (p.ammo === 0 && p.reserve > 0) p.reload = 1.65;
      }
    }
    this.held = next;
    this.updateBots(dt);
    this.updateAllies(dt);
    this.updateBolts(dt);
    this.updateRockets(dt);
    this.blasts.forEach((blast) => {
      blast.life -= dt;
    });
    this.blasts = this.blasts.filter((blast) => blast.life > 0);
    if (this.phase !== 'playing') return;
    if (this.beacon) {
      this.beacon.life -= dt;
      if (this.beacon.life <= 0) this.beacon = null;
      else {
        if (
          Math.hypot(p.x - this.beacon.x, p.z - this.beacon.z) <
            BIOTIC_RADIUS &&
          p.respawn === 0
        )
          p.hp = Math.min(200, p.hp + 35 * dt);
        for (const ally of this.allies)
          if (
            ally.hp > 0 &&
            Math.hypot(ally.x - this.beacon.x, ally.z - this.beacon.z) <
              BIOTIC_RADIUS
          )
            ally.hp = Math.min(160, ally.hp + 35 * dt);
      }
    }
    if (
      (this.time >= 10 && this.wave === 1) ||
      (this.time >= 19 && this.wave === 2) ||
      (this.time >= 26 && this.wave === 3)
    )
      this.spawnWave();
    this.onPoint =
      p.respawn === 0 &&
      Math.hypot(p.x - OBJECTIVE.x, p.z - OBJECTIVE.z) < OBJECTIVE.radius;
    const enemies = this.bots.some(
      (bot) =>
        bot.hp > 0 &&
        Math.hypot(bot.x - OBJECTIVE.x, bot.z - OBJECTIVE.z) < OBJECTIVE.radius,
    );
    this.contested = this.onPoint && enemies;
    if (this.onPoint && !enemies) {
      this.capture = Math.min(100, this.capture + dt * 3.5);
      p.ultimate = Math.min(100, p.ultimate + dt * 1.1);
    } else if (enemies && !this.onPoint)
      this.enemyCapture = Math.min(100, this.enemyCapture + dt * 1.2);
    if (this.capture >= 100) {
      this.phase = 'won';
      this.score += 3000;
      this.say('VICTORY · WATCHPOINT SECURED');
    } else if (this.enemyCapture >= 100 || this.time >= 150) {
      this.phase = 'lost';
      this.say('업링크를 빼앗겼습니다. 다시 출격하세요.');
    }
  }

  private say(message: string): void {
    this.message = message;
    this.messageTime = 4;
  }
  private move(dt: number, input: WatchpointInput): void {
    const p = this.player;
    let forward = Number(input.up) - Number(input.down),
      side = Number(input.right) - Number(input.left);
    const amount = Math.hypot(forward, side);
    if (amount) {
      forward /= amount;
      side /= amount;
    }
    const speed = p.sprinting ? 9.3 : 6.2;
    const dx =
      (Math.sin(p.yaw) * forward + Math.cos(p.yaw) * side) * speed * dt;
    const dz =
      (-Math.cos(p.yaw) * forward + Math.sin(p.yaw) * side) * speed * dt;
    p.moving = amount > 0;
    if (canStand(p.x + dx, p.z, 0.38, p.y)) p.x += dx;
    if (canStand(p.x, p.z + dz, 0.38, p.y)) p.z += dz;
    p.walk += Math.hypot(dx, dz);
    if (p.y > 0 || p.vy > 0) {
      p.vy -= 21 * dt;
      p.y = Math.max(0, p.y + p.vy * dt);
      if (!p.y) p.vy = 0;
    }
  }

  private shoot(): void {
    const p = this.player;
    p.ammo--;
    p.fire = 0.1;
    p.recoil = 0.115;
    this.shots++;
    this.audioCues.shot++;
    const spread = p.moving ? 0.008 : 0.003;
    let yaw = p.yaw + Math.sin(this.shots * 7.31) * spread;
    let pitch = p.pitch + Math.cos(this.shots * 4.73) * spread;
    const assisted = p.visor > 0 ? this.visorTarget() : null;
    if (assisted) {
      yaw = Math.atan2(assisted.x - p.x, -(assisted.z - p.z));
      pitch = Math.atan2(
        1.15 - p.y - 1.62,
        Math.hypot(assisted.x - p.x, assisted.z - p.z),
      );
      p.visorTarget = assisted.id;
    }
    const direction = {
      x: Math.sin(yaw) * Math.cos(pitch),
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch),
    };
    const from = { x: p.x, y: p.y + 1.62, z: p.z };
    let closest = Math.min(70, obstacleDistance(from, direction));
    let hit: Bot | null = null,
      headshot = false;
    for (const bot of this.bots) {
      if (bot.hp <= 0) continue;
      const body = rayBox(
        from,
        direction,
        { x: bot.x - 0.39, y: 0.35, z: bot.z - 0.32 },
        { x: bot.x + 0.39, y: 1.48, z: bot.z + 0.32 },
      );
      const head = rayBox(
        from,
        direction,
        { x: bot.x - 0.25, y: 1.48, z: bot.z - 0.25 },
        { x: bot.x + 0.25, y: 1.97, z: bot.z + 0.25 },
      );
      const distance = Math.min(body, head);
      if (distance < closest) {
        closest = distance;
        hit = bot;
        headshot = head <= body;
      }
    }
    this.traces.push({
      from,
      to: {
        x: from.x + direction.x * closest,
        y: from.y + direction.y * closest,
        z: from.z + direction.z * closest,
      },
      life: 0.09,
      hit: !!hit,
      friendly: true,
    });
    if (hit) {
      const damage = headshot ? 40 : 20;
      this.damageBot(hit, damage, headshot);
      if (assisted) this.visorHits++;
    }
    p.pitch = Math.min(1.25, p.pitch + 0.006);
  }

  private visorTarget(): Bot | null {
    const p = this.player,
      eye = { x: p.x, y: p.y + 1.62, z: p.z };
    let best: Bot | null = null,
      bestAngle = Infinity;
    for (const bot of this.bots) {
      if (bot.hp <= 0) continue;
      const distance = Math.hypot(bot.x - p.x, bot.z - p.z);
      const yaw = Math.atan2(bot.x - p.x, -(bot.z - p.z));
      const pitch = Math.atan2(1.15 - eye.y, distance);
      const dx = Math.abs(angleDifference(yaw, p.yaw)),
        dy = Math.abs(pitch - p.pitch);
      if (
        distance > 60 ||
        dx > 0.55 ||
        dy > 0.42 ||
        !visible(eye, { x: bot.x, y: 1.15, z: bot.z })
      )
        continue;
      const angle = Math.hypot(dx, dy);
      if (angle < bestAngle) {
        best = bot;
        bestAngle = angle;
      }
    }
    return best;
  }

  private damageBot(bot: Bot, damage: number, headshot = false): void {
    const p = this.player,
      actual = Math.min(bot.hp, damage);
    if (actual <= 0) return;
    bot.hp = Math.max(0, bot.hp - damage);
    bot.flash = 0.16;
    p.hit = 0.14;
    this.audioCues.hit++;
    if (headshot) this.headshots++;
    if (!p.visor) p.ultimate = Math.min(100, p.ultimate + actual * 0.16);
    this.score += headshot ? 30 : 10;
    if (bot.hp === 0) {
      p.kills++;
      this.score += 300;
      this.audioCues.explosion++;
      this.say(`ELIMINATED · TRAINING BOT ${p.kills}`);
    }
  }

  private launchHelix(): void {
    const p = this.player;
    const direction = {
      x: Math.sin(p.yaw) * Math.cos(p.pitch),
      y: Math.sin(p.pitch),
      z: -Math.cos(p.yaw) * Math.cos(p.pitch),
    };
    this.rockets.push({
      x: p.x,
      y: p.y + 1.5,
      z: p.z,
      vx: direction.x * 35,
      vy: direction.y * 35,
      vz: direction.z * 35,
      life: 2.2,
    });
    p.helixCooldown = HELIX_COOLDOWN;
    p.helixFlash = 0.22;
    p.fire = Math.max(p.fire, 0.25);
    this.helixShots++;
    this.audioCues.ability++;
  }

  private updateRockets(dt: number): void {
    for (const rocket of this.rockets) {
      const from = { x: rocket.x, y: rocket.y, z: rocket.z };
      const speed = Math.hypot(rocket.vx, rocket.vy, rocket.vz);
      const direction = {
        x: rocket.vx / speed,
        y: rocket.vy / speed,
        z: rocket.vz / speed,
      };
      const travel = speed * dt;
      let nearest = obstacleDistance(from, direction),
        direct: Bot | null = null;
      for (const bot of this.bots) {
        if (bot.hp <= 0) continue;
        const hit = rayBox(
          from,
          direction,
          { x: bot.x - 0.4, y: 0.2, z: bot.z - 0.35 },
          { x: bot.x + 0.4, y: 1.98, z: bot.z + 0.35 },
        );
        if (hit < nearest) {
          nearest = hit;
          direct = bot;
        }
      }
      const amount = Math.min(travel, nearest);
      rocket.x += direction.x * amount;
      rocket.y += direction.y * amount;
      rocket.z += direction.z * amount;
      rocket.life -= dt;
      if (nearest <= travel) {
        rocket.life = 0;
        const impact = {
          x: rocket.x - direction.x * 0.04,
          y: rocket.y - direction.y * 0.04,
          z: rocket.z - direction.z * 0.04,
        };
        this.blasts.push({ ...impact, life: 0.35, radius: 3 });
        this.audioCues.explosion++;
        for (const bot of this.bots) {
          if (bot.hp <= 0) continue;
          const center = { x: bot.x, y: 1.1, z: bot.z };
          const distance = Math.hypot(
            center.x - impact.x,
            center.y - impact.y,
            center.z - impact.z,
          );
          if (bot === direct) this.damageBot(bot, 120);
          else if (distance < 3 && visible(impact, center))
            this.damageBot(bot, Math.round(80 * (1 - distance / 3)));
        }
      }
    }
    this.rockets = this.rockets.filter((rocket) => rocket.life > 0);
  }

  private spawnWave(): void {
    const positions =
      this.wave === 0
        ? [
            [-4.5, -12],
            [4.5, -11],
            [6, -4],
          ]
        : this.wave === 1
          ? [
              [-4, -22],
              [4, -22],
            ]
          : this.wave === 2
            ? [
                [-16, -8],
                [16, -8],
              ]
            : [
                [-3, -23],
                [3, -23],
              ];
    for (const [x, z] of positions) {
      const id = this.nextBotId++,
        elite = this.wave >= 2;
      this.bots.push({
        id,
        x,
        z,
        hp: elite ? 145 : 110,
        maxHp: elite ? 145 : 110,
        yaw: Math.PI,
        walk: 0,
        windup: 0,
        cooldown: 1 + id * 0.11,
        target: { x: 0, y: 1.2, z: 20 },
        flash: 0,
        dead: 0,
        elite,
      });
    }
    this.wave++;
    if (this.wave > 1)
      this.say(`경비 증원 ${this.wave - 1} · 붉은 조준선을 피하세요!`);
  }

  private updateBots(dt: number): void {
    const p = this.player;
    for (const bot of this.bots) {
      bot.flash = Math.max(0, bot.flash - dt);
      if (bot.hp <= 0) {
        bot.dead += dt;
        continue;
      }
      const pointDistance = Math.hypot(
        bot.x - OBJECTIVE.x,
        bot.z - OBJECTIVE.z,
      );
      if (pointDistance > 3.7) {
        const dx = ((OBJECTIVE.x - bot.x) / pointDistance) * dt * 1.9;
        const dz = ((OBJECTIVE.z - bot.z) / pointDistance) * dt * 1.9;
        let moved = false;
        if (canStand(bot.x + dx, bot.z, 0.4)) {
          bot.x += dx;
          moved = true;
        }
        if (canStand(bot.x, bot.z + dz, 0.4)) {
          bot.z += dz;
          moved = true;
        }
        if (!moved || !canStand(bot.x + dx, bot.z + dz, 0.4)) {
          const sidestep = bot.x < 0 ? -1 : 1;
          if (canStand(bot.x + sidestep * dt * 1.9, bot.z, 0.4))
            bot.x += sidestep * dt * 1.9;
        }
        bot.walk += dt * 4;
      }
      bot.yaw = Math.atan2(p.x - bot.x, -(p.z - bot.z));
      if (p.respawn > 0) {
        bot.windup = 0;
        continue;
      }
      const origin = { x: bot.x, y: 1.35, z: bot.z };
      if (bot.windup > 0) {
        bot.windup = Math.max(0, bot.windup - dt);
        if (bot.windup === 0) {
          const distance = Math.hypot(
            bot.target.x - bot.x,
            bot.target.y - 1.35,
            bot.target.z - bot.z,
          );
          this.bolts.push({
            ...origin,
            vx: ((bot.target.x - bot.x) / distance) * 16,
            vy: ((bot.target.y - 1.35) / distance) * 16,
            vz: ((bot.target.z - bot.z) / distance) * 16,
            life: 3.5,
          });
          bot.cooldown = bot.elite ? 1.35 : 1.7;
        }
      } else {
        bot.cooldown = Math.max(0, bot.cooldown - dt);
        const target = { x: p.x, y: p.y + 1.05, z: p.z };
        if (
          !bot.cooldown &&
          Math.hypot(bot.x - p.x, bot.z - p.z) < 30 &&
          visible(origin, target)
        ) {
          bot.windup = 0.7;
          bot.target = target;
        }
      }
    }
  }

  private updateAllies(dt: number): void {
    for (const [index, ally] of this.allies.entries()) {
      if (ally.hp <= 0) continue;
      ally.flash = Math.max(0, ally.flash - dt);
      const goal = { x: index ? 4 : -4, z: -2 };
      const distance = Math.hypot(goal.x - ally.x, goal.z - ally.z);
      if (distance > 0.3) {
        const dx = ((goal.x - ally.x) / distance) * dt * 2.5,
          dz = ((goal.z - ally.z) / distance) * dt * 2.5;
        if (canStand(ally.x + dx, ally.z, 0.4)) ally.x += dx;
        if (canStand(ally.x, ally.z + dz, 0.4)) ally.z += dz;
        ally.walk += dt * 5;
      }
      ally.cooldown -= dt;
      if (ally.cooldown <= 0) {
        const target = this.bots.find(
          (bot) =>
            bot.hp > 0 &&
            visible(
              { x: ally.x, y: 1.4, z: ally.z },
              { x: bot.x, y: 1.2, z: bot.z },
            ),
        );
        if (target) {
          ally.yaw = Math.atan2(target.x - ally.x, -(target.z - ally.z));
          ally.flash = 0.13;
          ally.cooldown = 0.8;
          target.hp = Math.max(0, target.hp - 4);
          this.traces.push({
            from: { x: ally.x, y: 1.4, z: ally.z },
            to: { x: target.x, y: 1.2, z: target.z },
            life: 0.08,
            hit: true,
            friendly: true,
          });
        }
      }
    }
  }

  private updateBolts(dt: number): void {
    const p = this.player;
    for (const bolt of this.bolts) {
      const from = { x: bolt.x, y: bolt.y, z: bolt.z };
      const next = {
        x: bolt.x + bolt.vx * dt,
        y: bolt.y + bolt.vy * dt,
        z: bolt.z + bolt.vz * dt,
      };
      if (!visible(from, next)) {
        bolt.life = 0;
        continue;
      }
      bolt.x = next.x;
      bolt.y = next.y;
      bolt.z = next.z;
      bolt.life -= dt;
      if (
        p.respawn === 0 &&
        Math.hypot(p.x - bolt.x, p.z - bolt.z) < 0.5 &&
        bolt.y > p.y + 0.1 &&
        bolt.y < p.y + 1.85
      ) {
        bolt.life = 0;
        if (!p.invulnerable) {
          p.hp = Math.max(0, p.hp - 13);
          p.hurt = 0.3;
          if (!p.hp) {
            p.deaths++;
            this.capture = Math.max(0, this.capture - 12);
            if (p.deaths >= 3) {
              this.phase = 'lost';
              this.say('출격 기회를 모두 소진했습니다.');
            } else {
              p.respawn = 3;
              p.reload = 0;
              this.say('팀이 복귀를 준비합니다. 3초 후 재출격!');
            }
          }
        }
      }
      for (const ally of this.allies)
        if (
          ally.hp > 0 &&
          Math.hypot(ally.x - bolt.x, ally.z - bolt.z) < 0.4 &&
          bolt.y > 0.1 &&
          bolt.y < 1.8
        ) {
          bolt.life = 0;
          ally.hp = Math.max(0, ally.hp - 13);
          break;
        }
    }
    this.bolts = this.bolts.filter((bolt) => bolt.life > 0);
  }
}

/** Aim, movement, fire and abilities are ordinary inputs; no simulation state is written. */
export function watchpointBenchmark(
  simulation: RetroSimulation,
): WatchpointInput {
  const game = simulation as WatchpointSimulation,
    p = game.player;
  const input: WatchpointInput = { ...idleInput(), pointer: idlePointer() };
  if (game.phase !== 'playing' || p.respawn > 0) return input;
  const eye = { x: p.x, y: p.y + 1.62, z: p.z };
  const target = game.bots
    .filter((bot) => bot.hp > 0 && visible(eye, { x: bot.x, y: 1.7, z: bot.z }))
    .sort(
      (a, b) =>
        Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
    )[0];
  const hidden = game.bots.find((bot) => bot.hp > 0);
  const goal = {
    x: !target && hidden && game.onPoint ? (hidden.x < 0 ? -3.4 : 3.4) : 0,
    z: -4,
  };
  let desiredYaw: number,
    desiredPitch = 0;
  if (target) {
    desiredYaw = Math.atan2(target.x - p.x, -(target.z - p.z));
    desiredPitch = Math.atan2(
      1.7 - eye.y,
      Math.hypot(target.x - p.x, target.z - p.z),
    );
    if (
      p.helixCooldown === 0 &&
      Math.abs(angleDifference(desiredYaw, p.yaw)) < 0.04 &&
      Math.abs(desiredPitch - p.pitch) < 0.04
    )
      input.pointer!.secondary = true;
    if (
      Math.abs(angleDifference(desiredYaw, p.yaw)) < 0.04 &&
      Math.abs(desiredPitch - p.pitch) < 0.04
    )
      input.pointer!.primary = true;
  } else desiredYaw = Math.atan2(goal.x - p.x, -(goal.z - p.z));
  input.pointer!.dx = Math.max(
    -60,
    Math.min(60, angleDifference(desiredYaw, p.yaw) / LOOK_SENSITIVITY),
  );
  input.pointer!.dy = Math.max(
    -45,
    Math.min(45, (p.pitch - desiredPitch) / LOOK_SENSITIVITY),
  );
  if (Math.hypot(p.x - goal.x, p.z - goal.z) > 1.2) {
    const dx = goal.x - p.x,
      dz = goal.z - p.z;
    const front = Math.sin(p.yaw) * dx - Math.cos(p.yaw) * dz;
    const side = Math.cos(p.yaw) * dx + Math.sin(p.yaw) * dz;
    if (Math.abs(front) > 0.4) input[front > 0 ? 'up' : 'down'] = true;
    if (Math.abs(side) > 0.4) input[side > 0 ? 'right' : 'left'] = true;
    if (!target && Math.abs(angleDifference(desiredYaw, p.yaw)) < 0.2)
      input.special = true;
  }
  if (p.ammo <= 3 && !p.reload) input.reload = true;
  if (p.hp < 155 && !p.healCooldown) input.interact = true;
  if (p.ultimate >= 100 && target) input.ultimate = true;
  return input;
}
