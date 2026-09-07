import * as T from 'three';
import {
  platforms,
  coins,
  enemySpawns,
  GOAL_X,
  PLAYER_HEIGHT,
  type Platform,
} from './world';
import { followCamera } from './camera';
import { FrameClock } from './frame-clock';
import { GameControls, createKeyboardHandlers, type GameAction } from './input';
import { Simulation, type GameSnapshot } from './simulation';
export type { GameSnapshot } from './simulation';
export type GameHandle = {
  start: () => void;
  togglePause: () => void;
  getSnapshot: () => GameSnapshot;
  setTouchRun: (enabled: boolean) => void;
  input: (action: GameAction, held: boolean, source?: string) => void;
  dispose: () => void;
};
export function createGame(
  host: HTMLElement,
  onChange: (s: GameSnapshot) => void,
): GameHandle {
  const scene = new T.Scene();
  scene.background = new T.Color('#68c7ed');
  scene.fog = new T.Fog('#9cdded', 35, 85);
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    'aria-label',
    '좌우 방향키로 이동, 스페이스로 점프, Shift로 달리기, Escape로 일시정지',
  );
  host.appendChild(renderer.domElement);
  const camera = new T.OrthographicCamera(-13, 13, 8, -8, 0.1, 160);
  scene.add(new T.HemisphereLight('#f1fbff', '#70984d', 2.2));
  const sun = new T.DirectionalLight('#fff0ce', 3.4);
  sun.position.set(-10, 23, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -25,
    right: 25,
    top: 15,
    bottom: -15,
  });
  scene.add(sun, sun.target);
  const materials = new Map<string, T.MeshStandardMaterial>();
  function mat(c: string) {
    if (!materials.has(c))
      materials.set(
        c,
        new T.MeshStandardMaterial({ color: c, roughness: 0.68 }),
      );
    return materials.get(c)!;
  }
  function box(
    w: number,
    h: number,
    d: number,
    c: string,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = scene,
  ) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function ball(
    r: number,
    c: string,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = scene,
    s: [number, number, number] = [1, 1, 1],
  ) {
    const m = new T.Mesh(new T.SphereGeometry(r, 20, 14), mat(c));
    m.position.set(x, y, z);
    m.scale.set(...s);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function cylinder(
    rt: number,
    rb: number,
    h: number,
    c: string,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = scene,
  ) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, 24), mat(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const questionMeshes = new Map<Platform, T.Mesh>();
  for (const p of platforms) {
    if (p.kind === 'pipe') {
      cylinder(
        p.w * 0.5,
        p.w * 0.5,
        p.h,
        '#168343',
        p.x + p.w / 2,
        p.y + p.h / 2,
        0,
      );
      cylinder(
        p.w * 0.6,
        p.w * 0.6,
        0.35,
        '#31b957',
        p.x + p.w / 2,
        p.y + p.h - 0.1,
        0,
      );
      cylinder(
        p.w * 0.44,
        p.w * 0.44,
        0.01,
        '#094a2d',
        p.x + p.w / 2,
        p.y + p.h + 0.08,
        0,
      );
      continue;
    }
    const m = box(
      p.w,
      p.h,
      2.8,
      p.kind === 'ground'
        ? '#b56b39'
        : p.kind === 'question'
          ? '#ffc62c'
          : '#c77b49',
      p.x + p.w / 2,
      p.y + p.h / 2,
      0,
    );
    if (p.kind === 'ground') {
      box(p.w, 0.22, 3.05, '#67bd43', p.x + p.w / 2, p.y + p.h + 0.02, 0);
      for (let x = p.x + 1; x < p.x + p.w; x += 2.1)
        box(0.09, p.h, 0.04, '#965331', x, p.y + p.h / 2, 1.425);
    }
    if (p.kind === 'brick')
      for (let x = p.x + 0.5; x < p.x + p.w; x++)
        box(0.05, p.h, 0.04, '#995b35', x, p.y + p.h / 2, 1.43);
    if (p.kind === 'question') {
      questionMeshes.set(p, m);
      box(0.18, 0.18, 0.06, '#fff6c7', p.x + 0.5, p.y + 0.23, 1.46);
      box(0.32, 0.12, 0.06, '#fff6c7', p.x + 0.5, p.y + 0.78, 1.46);
      box(0.12, 0.3, 0.06, '#fff6c7', p.x + 0.63, p.y + 0.65, 1.46);
      box(0.2, 0.12, 0.06, '#fff6c7', p.x + 0.55, p.y + 0.49, 1.46);
    }
  }
  for (let x = -20; x < 130; x += 12) {
    ball(7, '#53ab73', x, -1, -16, scene, [1.1, 1.2, 0.55]);
    ball(5, '#94cf69', x + 8, -1, -10, scene, [1, 1.1, 0.5]);
    for (let j = 0; j < 3; j++)
      ball(1.25, '#ffffff', x + j * 1.4, 10 + (x % 7) * 0.12, -19);
  }
  const simulation = new Simulation(),
    player = simulation.player,
    mario = new T.Group();
  scene.add(mario);
  // Original 3D fan model; no extracted Nintendo models or textures.
  const body = box(0.54, 0.54, 0.39, '#1558bc', 0, 0.66, 0, mario);
  ball(0.33, '#f6ba8b', 0, 1.15, 0, mario, [0.85, 1, 0.85]);
  ball(0.35, '#e7322d', 0, PLAYER_HEIGHT - 0.35 * 0.55, 0, mario, [1, 0.55, 1]);
  box(0.5, 0.07, 0.4, '#e7322d', 0.13, 1.38, 0.1, mario);
  ball(0.12, '#f6ba8b', 0.29, 1.17, 0.1, mario);
  box(0.22, 0.075, 0.29, '#4a271c', 0.21, 1.07, 0.12, mario);
  for (const s of [-1, 1]) {
    box(0.1, 0.38, 0.07, '#1b5dbb', s * 0.17, 0.91, 0.23, mario);
    ball(0.045, '#ffcc33', s * 0.17, 0.79, 0.28, mario);
    ball(0.14, '#fff8e9', s * 0.4, 0.72, 0.04, mario);
  }
  ball(0.17, '#e7322d', -0.3, 0.9, 0, mario, [0.9, 1.3, 1]);
  ball(0.17, '#e7322d', 0.3, 0.9, 0, mario, [0.9, 1.3, 1]);
  ball(0.095, '#fff9e9', 0.16, 1.24, 0.22, mario, [0.55, 1, 0.5]);
  ball(0.045, '#235292', 0.18, 1.24, 0.265, mario);
  ball(0.045, '#31251d', 0.1, 1.09, 0.29, mario);
  ball(0.045, '#31251d', 0.18, 1.08, 0.29, mario);
  ball(0.045, '#31251d', 0.25, 1.09, 0.25, mario);
  const feet = [
    box(0.3, 0.18, 0.48, '#6c3926', -0.18, 0.09, 0.08, mario),
    box(0.3, 0.18, 0.48, '#6c3926', 0.18, 0.09, 0.08, mario),
  ];
  const coinMeshes = coins.map((c) => {
    const m = cylinder(0.21, 0.21, 0.08, '#ffce34', c.x, c.y, 0);
    m.rotation.x = Math.PI / 2;
    return m;
  });
  const enemies = enemySpawns.map((x, i) => {
    const g = new T.Group();
    g.position.set(x, 0, 0);
    scene.add(g);
    ball(0.48, '#99542e', 0, 0.48, 0, g, [1, 0.82, 0.8]);
    ball(0.3, '#dcb686', 0, 0.23, 0, g, [0.8, 0.8, 0.7]);
    for (const s of [-1, 1]) {
      ball(0.1, '#fffdf0', s * 0.16, 0.57, 0.31, g);
      ball(0.043, '#2b231e', s * 0.16, 0.56, 0.39, g);
      box(0.24, 0.13, 0.35, '#553120', s * 0.25, 0.06, 0.05, g);
    }
    return { mesh: g, x, start: x, dir: i % 2 ? 1 : -1, alive: true };
  });
  cylinder(0.05, 0.05, 9, '#ece6cc', GOAL_X, 4.5, 0);
  ball(0.15, '#ffd04b', GOAL_X, 9.1, 0);
  const flag = box(1.5, 0.9, 0.06, '#e53632', GOAL_X + 0.78, 8.3, 0);
  box(4, 4, 4, '#e1ae7a', 105, 2, -1);
  for (const x of [103, 105, 107]) box(0.65, 0.6, 4.1, '#b97b51', x, 4.2, -1);
  box(1.2, 2.4, 0.08, '#523929', 105, 1.2, 1.05);
  const state = simulation.state,
    frameClock = new FrameClock(),
    controls = new GameControls();
  let frame = 0,
    elapsed = 0,
    lastNotify = 0,
    cameraX = 4;
  function clearInput() {
    controls.clear();
  }
  function snapshot() {
    onChange(simulation.snapshot());
  }
  function togglePause() {
    frameClock.reset();
    if (state.phase === 'playing') {
      simulation.pause();
      clearInput();
    } else if (state.phase === 'paused') {
      simulation.resume();
      renderer.domElement.focus();
    }
    snapshot();
  }
  const { keydown, keyup } = createKeyboardHandlers(
    controls,
    () => state.phase === 'playing',
    togglePause,
  );
  const blur = () => {
    clearInput();
    frameClock.reset();
    simulation.pause();
    snapshot();
  };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', blur);
  const hidden = () => {
    if (document.hidden) blur();
  };
  document.addEventListener('visibilitychange', hidden);
  function resize() {
    const w = host.clientWidth,
      h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    camera.left = (-7.3 * w) / h;
    camera.right = (7.3 * w) / h;
    camera.top = 7.3;
    camera.bottom = -7.3;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  function step(dt: number) {
    const beforeLives = state.lives;
    simulation.advance(dt, controls.sample());
    if (beforeLives !== state.lives) cameraX = 4;
    coinMeshes.forEach((m, i) => (m.visible = !simulation.collected.has(i)));
    questionMeshes.forEach(
      (m, p) =>
        (m.material = mat(
          simulation.usedBlocks.has(p) ? '#967c58' : '#ffc62c',
        )),
    );
    enemies.forEach((e, i) => {
      e.mesh.position.x = simulation.enemies[i].x;
      e.mesh.visible = simulation.enemies[i].alive;
    });
  }
  function render(now: number) {
    frame = requestAnimationFrame(render);
    if (document.hidden) frameClock.reset();
    const dt = document.hidden ? 0 : frameClock.tick(now);
    elapsed += dt;
    step(dt);
    mario.position.set(player.x, player.y, 0);
    mario.rotation.y = player.facing > 0 ? 0 : Math.PI;
    mario.visible =
      simulation.invincible <= 0 || Math.floor(elapsed * 12) % 2 === 0;
    const walk = player.grounded
      ? Math.sin(elapsed * 14) * Math.min(Math.abs(player.vx) * 0.08, 0.28)
      : 0;
    feet[0].position.y = 0.1 + Math.max(0, walk);
    feet[1].position.y = 0.1 + Math.max(0, -walk);
    body.rotation.z = player.vx * 0.008;
    cameraX = followCamera(
      cameraX,
      player.x,
      player.facing,
      host.clientWidth / Math.max(1, host.clientHeight),
      dt,
    );
    camera.position.set(cameraX, 7.7, 20);
    camera.lookAt(cameraX, 3.2, 0);
    sun.position.x = cameraX - 10;
    sun.target.position.x = cameraX;
    coinMeshes.forEach((m) => {
      m.rotation.z = elapsed * 2;
    });
    if (state.phase === 'won')
      flag.position.y = Math.max(0.8, flag.position.y - dt * 3);
    renderer.render(scene, camera);
    if (now - lastNotify > 100) {
      snapshot();
      lastNotify = now;
    }
  }
  frame = requestAnimationFrame(render);
  snapshot();
  return {
    start() {
      simulation.start();
      frameClock.reset();
      flag.position.y = 8.3;
      cameraX = 4;
      clearInput();
      renderer.domElement.focus();
      snapshot();
    },
    togglePause,
    getSnapshot: () => simulation.snapshot(),
    setTouchRun: (enabled) => controls.setRunToggle(enabled),
    input(action, pressed, source = 'touch') {
      if (!pressed || state.phase === 'playing')
        controls.set(action, source, pressed);
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
      scene.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
