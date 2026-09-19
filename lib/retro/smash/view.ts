import * as THREE from 'three';
import type { RetroView } from '../types.ts';
import { platforms, SmashSimulation } from './simulation.ts';
import {
  animateFigure,
  box,
  createFigure,
  disposeScene,
  label,
  material,
  mesh,
} from './art.ts';

export function mountSmash(
  canvas: HTMLCanvasElement,
  game: SmashSimulation,
): RetroView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x66517a);
  scene.fog = new THREE.Fog(0x66517a, 45, 95);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 140);
  camera.position.set(1, 9, 24);
  camera.lookAt(0, 3, 0);
  scene.add(new THREE.HemisphereLight(0xffd9b6, 0x233449, 2.5));
  const sun = new THREE.DirectionalLight(0xffc589, 3);
  sun.position.set(-15, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -15;
  scene.add(sun);
  const brick = material(0x493f59);
  const concrete = material(0xa3a0ae);
  const blue = material(0x248eac);
  const amber = material(0xffba4e);
  const steel = material(0x26344a, 0.4, 0.5);
  box(scene, brick, 0, -7.2, -0.7, 26, 13.8, 7);
  for (const platform of platforms) {
    box(
      scene,
      concrete,
      platform.x,
      platform.y - 0.3,
      0,
      platform.width,
      0.6,
      platform.y ? 3 : 7,
    );
    box(
      scene,
      platform.y ? blue : amber,
      platform.x,
      platform.y - 0.12,
      1.6 + (platform.y ? 0 : 2),
      platform.width,
      0.15,
      0.12,
    );
    if (platform.y)
      for (const side of [-1, 1]) {
        const brace = box(
          scene,
          steel,
          platform.x + side * 1.3,
          platform.y - 1,
          0,
          0.16,
          2,
          0.16,
        );
        brace.rotation.z = side * 0.45;
      }
  }
  for (let x = -12; x <= 12; x += 2) {
    box(scene, steel, x, 0.9, -3, 0.09, 1.8, 0.09);
  }
  box(scene, steel, 0, 1.8, -3, 25, 0.09, 0.09);
  for (let x = -11; x < 12; x += 3.5)
    for (let y = -2; y > -13; y -= 3)
      box(scene, material(0xd99060), x, y, 2.87, 1.6, 1.25, 0.04);
  const tank = new THREE.Group();
  tank.position.set(-10, 0, -1.5);
  scene.add(tank);
  mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 2.5, 12),
    material(0x8396a2, 0.35, 0.5),
    tank,
    0,
    1.9,
    0,
  );
  mesh(new THREE.ConeGeometry(1.4, 0.6, 12), steel, tank, 0, 3.45, 0);
  for (const x of [-0.8, 0.8]) box(tank, steel, x, 0.55, 0, 0.15, 1.1, 0.15);
  const sign = label('옥상 배송 조합', '#ffe49c', '#1c344a', 9, 1.8);
  sign.position.set(0, 9.5, -5);
  scene.add(sign);
  const moon = mesh(
    new THREE.SphereGeometry(4, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffbfa0 }),
    scene,
    -19,
    20,
    -37,
  );
  moon.castShadow = false;
  const citySurface = material(0x32334e);
  const windowSurface = new THREE.MeshBasicMaterial({ color: 0xffd991 });
  for (let index = 0; index < 18; index += 1) {
    const x = -42 + index * 5;
    const height = 8 + ((index * 7) % 17);
    const z = -17 - (index % 3) * 7;
    box(scene, citySurface, x, height / 2 - 8, z, 3.8, height, 4);
    for (let y = -5; y < height - 9; y += 3)
      for (const offset of [-0.9, 0.9])
        box(scene, windowSurface, x + offset, y, z + 2.02, 0.45, 0.9, 0.04);
  }
  // Rooftop details: parcel stacks, a dish, and a glowing delivery beacon.
  for (let i = 0; i < 4; i += 1) {
    const parcel = box(
      scene,
      material(0xad795b),
      10 + (i % 2) * 0.8,
      0.4 + Math.floor(i / 2) * 0.7,
      -2,
      0.75,
      0.7,
      0.8,
    );
    parcel.rotation.y = i * 0.13;
  }
  const dish = mesh(
    new THREE.SphereGeometry(1, 14, 8, 0, Math.PI),
    concrete,
    scene,
    11,
    2.7,
    -2.2,
  );
  dish.scale.z = 0.3;
  dish.rotation.x = -0.5;
  const figures = [
    createFigure('raccoon', 0x19afd0, scene),
    createFigure('raccoon', 0xef7047, scene),
  ];
  const statusLabels = [
    label('0% · ●●●', '#baf4ff'),
    label('0% · ●●●', '#ffd7b3'),
  ];
  statusLabels.forEach((item) => {
    item.scale.set(4, 0.85, 1);
    scene.add(item);
  });
  const previousLabels = ['', ''];
  let width = 0;
  let height = 0;
  return {
    render(nextWidth, nextHeight) {
      if (nextWidth !== width || nextHeight !== height) {
        width = nextWidth;
        height = nextHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        const portrait = THREE.MathUtils.clamp(
          (1.35 - camera.aspect) / 0.35,
          0,
          1,
        );
        const stageWidth = 34 - portrait * 6;
        const fitDistance =
          stageWidth /
          (2 *
            Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
            camera.aspect);
        camera.position.set(
          1,
          9 + portrait * 3,
          Math.max(24 + portrait * 21, fitDistance),
        );
        camera.updateProjectionMatrix();
      }
      const bodies = [game.player, game.opponent];
      bodies.forEach((body, index) => {
        const figure = figures[index];
        figure.root.position.set(body.x, body.y, 0);
        figure.root.rotation.y = body.facing < 0 ? Math.PI : 0;
        figure.root.visible =
          body.stocks > 0 &&
          !(
            game.time > 0 &&
            body.invulnerable > 0 &&
            Math.floor(game.time * 12) % 2 === 0
          );
        animateFigure(figure, game.time, body.vx, body.attack);
        figure.shield.visible = body.guarding;
        figure.shield.scale.setScalar(0.75 + body.shield * 0.25);
        figure.parcel.visible = body.attack > 0 && body.attackKind === 'parcel';
        figure.umbrella.visible = body.recoveryUsed && !body.grounded;
        figure.head.rotation.z +=
          body.tell > 0 ? Math.sin(game.time * 40) * 0.1 : 0;
        const message = `${Math.round(body.percent)}% · ${'●'.repeat(Math.max(0, body.stocks))}`;
        if (message !== previousLabels[index]) {
          const replacement = label(message, index ? '#ffd7b3' : '#baf4ff');
          const old = statusLabels[index];
          old.material.map?.dispose();
          old.material.dispose();
          old.removeFromParent();
          statusLabels[index] = replacement;
          replacement.scale.set(4, 0.85, 1);
          scene.add(replacement);
          previousLabels[index] = message;
        }
        statusLabels[index].position.set(body.x, body.y + 4, 0);
        statusLabels[index].visible = body.stocks > 0;
      });
      camera.lookAt(
        0,
        3 + (game.flash > 0 ? Math.sin(game.time * 100) * game.flash * 0.2 : 0),
        0,
      );
      renderer.render(scene, camera);
    },
    metrics: () => ({
      drawCalls: renderer.info.render.calls,
      entities: 2 + platforms.length,
    }),
    dispose: () => disposeScene(scene, renderer),
  };
}
