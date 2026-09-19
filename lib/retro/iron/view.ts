import * as THREE from 'three';
import type { RetroView } from '../types.ts';
import { IronSimulation } from './simulation.ts';
import {
  animateFigure,
  box,
  createFigure,
  disposeScene,
  label,
  material,
  mesh,
} from '../smash/art.ts';

export function mountIron(
  canvas: HTMLCanvasElement,
  game: IronSimulation,
): RetroView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111f3d);
  scene.fog = new THREE.Fog(0x111f3d, 30, 75);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(1, 4.8, 12);
  camera.lookAt(0, 1, 0);
  scene.add(new THREE.HemisphereLight(0x8dadff, 0x221d40, 2));
  const key = new THREE.DirectionalLight(0xbcdcff, 3);
  key.position.set(-8, 18, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  scene.add(key);
  const wood = material(0x453442);
  const warmWood = material(0x8c6260);
  const mat = material(0x455766);
  const gold = material(0xffc366);
  const red = material(0xb84254);
  mesh(new THREE.CylinderGeometry(10, 10.6, 0.8, 8), wood, scene, 0, -0.55, 0);
  for (let x = -8; x < 9; x += 2)
    for (let z = -4; z < 5; z += 2) {
      box(scene, mat, x, -0.07, z, 1.96, 0.14, 1.96);
      box(scene, warmWood, x, 0.015, z - 0.91, 1.95, 0.015, 0.06);
    }
  const ring = mesh(
    new THREE.TorusGeometry(4.2, 0.055, 6, 80),
    gold,
    scene,
    0,
    0.03,
    0,
  );
  ring.rotation.x = Math.PI / 2;
  for (const x of [-9, 9]) {
    for (const z of [-5, 5]) {
      mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 7.2, 10),
        wood,
        scene,
        x,
        3.3,
        z,
      );
      box(scene, gold, x, 5.9, z, 0.62, 0.24, 0.62);
    }
    box(scene, wood, x, 6.7, 0, 0.55, 0.6, 11);
  }
  box(scene, wood, 0, 6.7, -5, 18.5, 0.6, 0.5);
  for (let x = -8; x <= 8; x += 4) {
    box(scene, material(0x38405b), x, 3.1, -6, 3.8, 5.4, 0.2);
    for (let offset = -1.5; offset <= 1.5; offset += 0.75)
      box(scene, wood, x + offset, 3.1, -5.85, 0.07, 5.4, 0.07);
    for (let y = 0.8; y < 5.7; y += 0.85)
      box(scene, wood, x, y, -5.85, 3.8, 0.07, 0.07);
  }
  const banner = label('심야 배송 도장', '#ffdb8b', '#5c243e', 8, 1.7);
  banner.position.set(0, 7.7, -5.5);
  scene.add(banner);
  const calligraphy = label('철권보다 철야', '#ddded5', '#202e46', 5.5, 1.3);
  calligraphy.position.set(0, 4.2, -5.5);
  scene.add(calligraphy);
  for (const x of [-7, 7]) {
    const lamp = mesh(
      new THREE.SphereGeometry(0.65, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffb269,
        emissive: 0xff742f,
        emissiveIntensity: 1,
      }),
      scene,
      x,
      5.3,
      -4.4,
    );
    lamp.scale.y = 1.4;
    for (const y of [4.35, 6.2])
      mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12),
        gold,
        scene,
        x,
        y,
        -4.4,
      );
    const light = new THREE.PointLight(0xff773d, 15, 12);
    light.position.set(x, 4.6, -3);
    scene.add(light);
  }
  // Delivery lockers, training bag, benches and a small moon garden distinguish this arena.
  box(scene, red, -11, 1.55, -2, 2.1, 3.1, 1.2);
  for (const y of [0.6, 1.55, 2.5]) {
    box(scene, gold, -11, y, -1.35, 1.8, 0.8, 0.05);
    box(scene, wood, -10.35, y, -1.29, 0.09, 0.17, 0.05);
  }
  mesh(new THREE.CapsuleGeometry(0.6, 1.7, 4, 12), red, scene, 11, 2.6, -2);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 3, 6), gold, scene, 11, 5, -2);
  for (const x of [-7, 7]) {
    box(scene, warmWood, x, 0.6, 6.2, 3.1, 0.2, 0.9);
    for (const offset of [-1, 1])
      box(scene, wood, x + offset, 0.25, 6.2, 0.2, 0.5, 0.6);
  }
  const moon = mesh(
    new THREE.SphereGeometry(3, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xdde5ff }),
    scene,
    13,
    16,
    -32,
  );
  moon.castShadow = false;
  for (let i = 0; i < 8; i += 1) {
    const trunk = mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 10 + (i % 3), 6),
      material(0x29493f),
      scene,
      -18 + i * 5,
      4,
      -14 - (i % 2) * 6,
    );
    trunk.rotation.z = Math.sin(i) * 0.08;
    for (let j = 0; j < 3; j += 1) {
      const leaf = mesh(
        new THREE.ConeGeometry(1.2, 2.7, 5),
        material(0x26483f),
        scene,
        trunk.position.x + (j % 2 ? 0.7 : -0.7),
        5 + j * 1.8,
        trunk.position.z,
      );
      leaf.rotation.z = j % 2 ? -0.6 : 0.6;
    }
  }
  const figures = [
    createFigure('courier', 0x1bbdb1, scene),
    createFigure('courier', 0xdf557b, scene),
  ];
  const tells = figures.map(() => {
    const indicator = mesh(
      new THREE.TorusGeometry(0.7, 0.09, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xff5252 }),
      scene,
    );
    indicator.visible = false;
    return indicator;
  });
  const bars = figures.map(() => {
    const group = new THREE.Group();
    box(group, material(0x161c30), 0, 0, 0, 3.5, 0.24, 0.12);
    const fill = box(group, material(0x7cebba), 0, 0, 0.08, 3.35, 0.15, 0.04);
    scene.add(group);
    return { group, fill };
  });
  let width = 0;
  let height = 0;
  return {
    render(nextWidth, nextHeight) {
      if (width !== nextWidth || height !== nextHeight) {
        width = nextWidth;
        height = nextHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        const portrait = THREE.MathUtils.clamp(
          (1.35 - camera.aspect) / 0.35,
          0,
          1,
        );
        const fitDistance =
          18 /
          (2 *
            Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
            camera.aspect);
        camera.position.set(
          1,
          4.8 + portrait * 3.2,
          Math.max(12 + portrait * 19, fitDistance),
        );
        camera.updateProjectionMatrix();
      }
      const fighters = [game.player, game.opponent];
      fighters.forEach((fighter, index) => {
        const figure = figures[index];
        figure.root.position.set(fighter.x, 0, fighter.z);
        figure.root.rotation.y = fighter.facing < 0 ? Math.PI : 0;
        animateFigure(
          figure,
          game.time,
          fighter.attack > 0 || fighter.guard ? 0 : 2,
          fighter.attack,
          fighter.move === 'kick' || fighter.move === 'sweep',
        );
        if (fighter.guard) {
          figure.leftArm.rotation.z = 1.3;
          figure.rightArm.rotation.z = 1.45;
          figure.head.rotation.z = -0.12;
        }
        figure.root.rotation.z = fighter.stun > 0 ? -fighter.facing * 0.18 : 0;
        tells[index].visible = fighter.tell > 0;
        tells[index].position.set(fighter.x, 3.4, fighter.z);
        tells[index].scale.setScalar(1 + Math.sin(game.time * 25) * 0.15);
        (tells[index].material as THREE.MeshBasicMaterial).color.setHex(
          fighter.move === 'sweep' ? 0xffcb52 : 0xff526d,
        );
        // Keep both life bars readable when the fighters stand close together.
        bars[index].group.position.set(index === 0 ? -4.4 : 4.4, 4.15, 1.5);
        bars[index].fill.scale.x = Math.max(0.001, fighter.health / 100);
        bars[index].fill.position.x = -(1 - fighter.health / 100) * 1.675;
      });
      camera.lookAt(
        0,
        1.4 +
          (game.flash > 0 ? Math.sin(game.time * 110) * game.flash * 0.4 : 0),
        0,
      );
      renderer.render(scene, camera);
    },
    metrics: () => ({ drawCalls: renderer.info.render.calls, entities: 2 }),
    dispose: () => disposeScene(scene, renderer),
  };
}
