import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RetroView } from '../types.ts';
import { OcarinaSimulation } from './simulation.ts';
import { GATE_Z, MELODY_STONES, POND, ROCKS, SHRINE, WORLD } from './world.ts';

const random = (value: number) => {
  const number = Math.sin(value * 14.391 + 29.137) * 18451.345;
  return number - Math.floor(number);
};

/** An original low-poly forest temple, with no downloaded models or textures. */
export function mountOcarina(
  canvas: HTMLCanvasElement,
  simulation: OcarinaSimulation,
): RetroView {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = false;
  const scene = new T.Scene();
  scene.background = new T.Color('#476b69');
  scene.fog = new T.Fog('#617f72', 34, 77);
  const camera = new T.PerspectiveCamera(47, 1, 0.1, 130);
  scene.add(new T.HemisphereLight('#d5e6d1', '#283528', 2.15));
  const sun = new T.DirectionalLight('#ffe4aa', 2.65);
  sun.position.set(-12, 26, 14);
  scene.add(sun);

  const materials = new Map<string, T.Material>();
  function mat(
    color: string,
    glow = false,
    opacity = 1,
  ): T.MeshStandardMaterial {
    const key = `${color}:${glow}:${opacity}`;
    let value = materials.get(key) as T.MeshStandardMaterial | undefined;
    if (!value) {
      value = new T.MeshStandardMaterial({
        color,
        roughness: 0.88,
        flatShading: true,
        emissive: glow ? color : '#000000',
        emissiveIntensity: glow ? 0.85 : 0,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity === 1,
      });
      materials.set(key, value);
    }
    return value;
  }
  const shapes = {
    box: new T.BoxGeometry(1, 1, 1),
    ball: new T.IcosahedronGeometry(1, 1),
    smoothBall: new T.SphereGeometry(1, 12, 8),
    rock: new T.DodecahedronGeometry(1, 0),
    cylinder: new T.CylinderGeometry(1, 1, 1, 8),
    cone: new T.ConeGeometry(1, 1, 8),
    circle: new T.CircleGeometry(1, 28),
    ring: new T.TorusGeometry(1, 0.055, 5, 32),
  };
  function object(
    shape: T.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: T.Object3D = scene,
  ) {
    const mesh = new T.Mesh(shape, mat(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }
  const box = (
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: T.Object3D = scene,
  ) => object(shapes.box, color, x, y, z, sx, sy, sz, parent);
  const ball = (
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: T.Object3D = scene,
  ) => object(shapes.ball, color, x, y, z, sx, sy, sz, parent);
  const cylinder = (
    color: string,
    x: number,
    y: number,
    z: number,
    r: number,
    height: number,
    parent: T.Object3D = scene,
  ) => object(shapes.cylinder, color, x, y, z, r, height, r, parent);
  function connector(
    parent: T.Object3D,
    start: T.Vector3,
    end: T.Vector3,
    radius: number,
    color: string,
  ) {
    const delta = end.clone().sub(start);
    const part = cylinder(color, 0, 0, 0, radius, delta.length(), parent);
    part.position.copy(start).addScaledVector(delta, 0.5);
    part.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return part;
  }
  function glyph(parent: T.Object3D, color: string, scale = 1) {
    // A four-petal hour flower: an original forest emblem, not a game logo.
    const group = new T.Group();
    group.scale.setScalar(scale);
    parent.add(group);
    for (let index = 0; index < 4; index += 1) {
      const petal = object(
        shapes.rock,
        color,
        Math.sin((index * Math.PI) / 2) * 0.3,
        Math.cos((index * Math.PI) / 2) * 0.3,
        0,
        0.12,
        0.27,
        0.065,
        group,
      );
      petal.rotation.z = (-index * Math.PI) / 2;
      petal.material = mat(color, true);
    }
    const center = object(
      shapes.rock,
      color,
      0,
      0,
      0.025,
      0.13,
      0.13,
      0.08,
      group,
    );
    center.material = mat(color, true);
    return group;
  }
  function blob(parent: T.Object3D, size: number) {
    const shadow = new T.Mesh(
      shapes.circle,
      new T.MeshBasicMaterial({
        color: '#132721',
        transparent: true,
        opacity: 0.23,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.034;
    shadow.scale.setScalar(size);
    parent.add(shadow);
    return shadow;
  }

  box(
    '#496943',
    (WORLD.left + WORLD.right) / 2,
    -0.36,
    (WORLD.far + WORLD.near) / 2,
    WORLD.right - WORLD.left + 9,
    0.7,
    WORLD.near - WORLD.far + 11,
  );
  const dirt = mat('#aa9363');
  function pathSegment(
    ax: number,
    az: number,
    bx: number,
    bz: number,
    width: number,
  ) {
    const length = Math.hypot(bx - ax, bz - az);
    const road = new T.Mesh(shapes.box, dirt);
    road.position.set((ax + bx) / 2, 0.025, (az + bz) / 2);
    road.scale.set(width, 0.055, length + width * 0.4);
    road.rotation.y = Math.atan2(bx - ax, bz - az);
    scene.add(road);
  }
  for (const [ax, az, bx, bz, width] of [
    [0, 18, 0, 8, 3.6],
    [0, 8, -9, 7, 3],
    [-9, 7, 2, 4, 3],
    [2, 4, 9, 0.5, 3],
    [9, 0.5, 0, -3, 3],
    [0, -3, -6.5, -10, 3],
    [-6.5, -10, 0, -13, 3],
    [0, -13, 0, -31, 4.9],
  ])
    pathSegment(ax, az, bx, bz, width);
  for (const stone of MELODY_STONES) {
    const clearing = object(
      shapes.cylinder,
      '#a89976',
      stone.x,
      0.03,
      stone.z,
      2.3,
      0.07,
      2.3,
    );
    clearing.rotation.y = 0.25;
  }
  for (let index = 0; index < 110; index += 1) {
    const x = -16 + random(index * 3) * 32;
    const z = -33 + random(index * 3 + 1) * 50;
    if (
      Math.abs(x) < 3 ||
      MELODY_STONES.some((stone) => Math.hypot(stone.x - x, stone.z - z) < 3)
    )
      continue;
    const patch = object(
      shapes.rock,
      index % 3 ? '#56784b' : '#637d4b',
      x,
      0.025,
      z,
      0.5 + random(index + 5),
      0.08,
      0.5 + random(index + 6),
    );
    patch.rotation.y = random(index) * Math.PI;
  }

  // Pond and a scalloped, mossy bank; the simulation uses the same ellipse.
  const bank = object(
    shapes.cylinder,
    '#849170',
    POND.x,
    0.06,
    POND.z,
    POND.radiusX + 0.5,
    0.17,
    POND.radiusZ + 0.5,
  );
  bank.geometry = new T.CylinderGeometry(1, 1.08, 1, 18);
  const water = object(
    shapes.circle,
    '#418e9b',
    POND.x,
    0.17,
    POND.z,
    POND.radiusX,
    POND.radiusZ,
    1,
  );
  water.rotation.x = -Math.PI / 2;
  water.material = new T.MeshStandardMaterial({
    color: '#438b96',
    roughness: 0.25,
    metalness: 0.12,
    transparent: true,
    opacity: 0.92,
  });
  const ripples: T.Mesh[] = [];
  for (let index = 0; index < 3; index += 1) {
    const ripple = new T.Mesh(shapes.ring, mat('#99c7bc', false, 0.43));
    ripple.position.set(POND.x + (index - 1) * 0.7, 0.19, POND.z);
    ripple.rotation.x = -Math.PI / 2;
    scene.add(ripple);
    ripples.push(ripple);
  }
  for (let index = 0; index < 7; index += 1) {
    const angle = index * 2.4;
    const lily = object(
      shapes.circle,
      '#7aa864',
      POND.x + Math.sin(angle) * 2.3,
      0.22,
      POND.z + Math.cos(angle) * 1.55,
      0.35,
      0.3,
      1,
    );
    lily.rotation.x = -Math.PI / 2;
    if (index % 2)
      ball('#e0b1b0', lily.position.x, 0.33, lily.position.z, 0.11, 0.11, 0.11);
  }

  // A thick woodland frame, built from shared low-poly geometry.
  const treePositions: [number, number][] = [];
  for (let index = 0; index < 12; index += 1) {
    treePositions.push([-18 + random(index) * 1.3, 16 - index * 4.4]);
    treePositions.push([18 - random(index + 20) * 1.3, 17 - index * 4.4]);
  }
  for (let index = 0; index < 9; index += 1)
    treePositions.push([-18 + index * 4.5, -36]);
  treePositions.push([-13.4, 3], [13, 12], [12.8, -4], [-12.8, -14], [12, -20]);
  const trunkGeometry = new T.CylinderGeometry(0.43, 0.72, 1, 7);
  const treeTrunks = new T.InstancedMesh(
    trunkGeometry,
    mat('#645443'),
    treePositions.length,
  );
  const crowns = new T.InstancedMesh(
    shapes.rock,
    mat('#2e6044'),
    treePositions.length * 4,
  );
  const highlights = new T.InstancedMesh(
    shapes.rock,
    mat('#648346'),
    treePositions.length * 2,
  );
  const treeHeights: number[] = [];
  const dummy = new T.Object3D();
  treePositions.forEach(([x, z], index) => {
    const height = 5.5 + random(index + 23) * 3;
    treeHeights.push(height + 0.9);
    dummy.position.set(x, height / 2, z);
    dummy.scale.set(1, height, 1);
    dummy.rotation.set(0, index, random(index + 6) * 0.09 - 0.04);
    dummy.updateMatrix();
    treeTrunks.setMatrixAt(index, dummy.matrix);
    for (let branch = 0; branch < 4; branch += 1) {
      dummy.position.set(
        x + Math.sin(branch * 1.7 + index) * 1.15,
        height + (branch % 2) * 0.85,
        z + Math.cos(branch * 1.7 + index) * 1.15,
      );
      dummy.scale.set(2.25, 1.75, 2.25);
      dummy.rotation.set(0.1, index + branch, 0.1);
      dummy.updateMatrix();
      crowns.setMatrixAt(index * 4 + branch, dummy.matrix);
    }
    for (let branch = 0; branch < 2; branch += 1) {
      dummy.position.set(x + branch * 0.7, height + 1.7, z + branch * 0.4);
      dummy.scale.set(1.8, 1.35, 1.7);
      dummy.updateMatrix();
      highlights.setMatrixAt(index * 2 + branch, dummy.matrix);
    }
    for (let root = 0; root < 3; root += 1) {
      const angle = (root * Math.PI * 2) / 3 + index;
      connector(
        scene,
        new T.Vector3(x, 0.7, z),
        new T.Vector3(
          x + Math.sin(angle) * 1.3,
          0.07,
          z + Math.cos(angle) * 1.3,
        ),
        0.18,
        '#645443',
      );
    }
  });
  scene.add(treeTrunks, crowns, highlights);
  const originalCrowns = Array.from({ length: crowns.count }, (_, index) => {
    const matrix = new T.Matrix4();
    crowns.getMatrixAt(index, matrix);
    return matrix;
  });
  const originalHighlights = Array.from(
    { length: highlights.count },
    (_, index) => {
      const matrix = new T.Matrix4();
      highlights.getMatrixAt(index, matrix);
      return matrix;
    },
  );
  const hiddenTrees = treePositions.map(() => false);
  const hiddenMatrix = new T.Matrix4();
  const zeroScale = new T.Vector3(0, 0, 0);
  for (const rock of ROCKS) {
    const shape = object(
      shapes.rock,
      '#859080',
      rock.x,
      rock.radius * 0.55,
      rock.z,
      rock.radius,
      rock.radius * 0.9,
      rock.radius,
    );
    shape.rotation.y = rock.x;
    ball(
      '#5d794a',
      rock.x - 0.1,
      rock.radius,
      rock.z - 0.1,
      rock.radius * 0.75,
      0.15,
      rock.radius * 0.7,
    );
  }
  for (let index = 0; index < 32; index += 1) {
    const x = index % 2 ? -14 + random(index) * 2 : 13 + random(index) * 2;
    const z = -30 + random(index + 50) * 44;
    cylinder('#537645', x, 0.3, z, 0.035, 0.6);
    ball(index % 3 ? '#e8c574' : '#b89ac1', x, 0.62, z, 0.16, 0.1, 0.16);
  }

  // Masonry wall and hinged barred doors share the simulation's actual opening.
  for (const side of [-1, 1]) {
    box('#626e60', side * 10.2, 1.55, GATE_Z, 13.6, 3.1, 1.3);
    box('#84917a', side * 10.2, 3.18, GATE_Z, 13.8, 0.32, 1.7);
    for (let row = 0; row < 3; row += 1) {
      for (let block = 0; block < 5; block += 1) {
        const x = side * (4.2 + block * 2.7);
        const masonry = box(
          row % 2 ? '#78836e' : '#858d79',
          x,
          0.55 + row * 0.96,
          GATE_Z + 0.72,
          2.45,
          0.78,
          0.16,
        );
        masonry.rotation.z = (random(row * 5 + block) - 0.5) * 0.025;
      }
    }
    cylinder('#919987', side * 3.6, 2.35, GATE_Z, 0.73, 4.7);
    cylinder('#a6ad95', side * 3.6, 0.23, GATE_Z, 1.0, 0.46);
    cylinder('#a6ad95', side * 3.6, 4.5, GATE_Z, 0.95, 0.38);
    box('#97a18c', side * 3.6, 4.88, GATE_Z, 1.6, 0.5, 1.8);
    ball('#4e7448', side * 3.6, 5.23, GATE_Z, 0.95, 0.25, 0.95);
  }
  box('#929a85', 0, 5.2, GATE_Z, 8.8, 0.64, 1.55);
  const gateEmblem = new T.Group();
  gateEmblem.position.set(0, 5.35, GATE_Z + 0.82);
  scene.add(gateEmblem);
  glyph(gateEmblem, '#e4c475', 1.25);
  const doors: T.Group[] = [];
  for (const side of [-1, 1]) {
    const hinge = new T.Group();
    hinge.position.set(side * 3.3, 0, GATE_Z);
    scene.add(hinge);
    for (let index = 0; index < 5; index += 1)
      box(
        '#776141',
        -side * (0.28 + index * 0.64),
        2.1,
        0,
        0.35,
        4.2,
        0.35,
        hinge,
      );
    box('#655a43', -side * 1.65, 0.85, 0.04, 3.3, 0.26, 0.45, hinge);
    box('#655a43', -side * 1.65, 3.25, 0.04, 3.3, 0.26, 0.45, hinge);
    doors.push(hinge);
  }

  // Ordered song stones each carry a different color, number and flower glyph.
  const stoneGlows: {
    halo: T.Mesh;
    flower: T.Group;
    beam: T.Mesh;
    gem: T.Mesh;
  }[] = [];
  MELODY_STONES.forEach((stone, index) => {
    cylinder('#6d7b72', stone.x, 0.19, stone.z, 1.05, 0.38);
    cylinder('#909b86', stone.x, 0.45, stone.z, 0.78, 0.22);
    const pillar = object(
      shapes.rock,
      '#8b9d89',
      stone.x,
      1.1,
      stone.z,
      0.73,
      0.88,
      0.67,
    );
    pillar.rotation.y = 0.5 + index;
    const flower = new T.Group();
    flower.position.set(stone.x, 1.3, stone.z + 0.66);
    scene.add(flower);
    glyph(flower, stone.color, 0.8);
    const gem = object(
      shapes.rock,
      stone.color,
      stone.x,
      2.35,
      stone.z,
      0.38,
      0.55,
      0.38,
    );
    gem.material = mat(stone.color, true);
    const halo = new T.Mesh(
      new T.TorusGeometry(1.35, 0.055, 5, 32),
      mat(stone.color, true, 0.65),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(stone.x, 0.12, stone.z);
    scene.add(halo);
    const beam = new T.Mesh(
      new T.CylinderGeometry(0.23, 0.7, 5, 12, 1, true),
      mat(stone.color, true, 0.085),
    );
    beam.position.set(stone.x, 3, stone.z);
    scene.add(beam);
    for (let notch = 0; notch <= index; notch += 1)
      ball(
        '#ecdfb0',
        stone.x - index * 0.19 + notch * 0.38,
        0.73,
        stone.z + 0.66,
        0.075,
        0.075,
        0.05,
      );
    stoneGlows.push({ halo, flower, beam, gem });
  });

  const flames: T.Group[] = [];
  for (const [x, z] of [
    [-4.8, GATE_Z + 2],
    [4.8, GATE_Z + 2],
    [-4.8, -27],
    [4.8, -27],
    [3.3, 12.5],
  ]) {
    cylinder('#65543f', x, 0.95, z, 0.13, 1.9);
    cylinder('#b79d64', x, 1.8, z, 0.26, 0.3);
    const flame = new T.Group();
    flame.position.set(x, 2.13, z);
    scene.add(flame);
    const outer = object(
      shapes.cone,
      '#ed9940',
      0,
      0,
      0,
      0.22,
      0.66,
      0.22,
      flame,
    );
    outer.material = mat('#ed9940', true);
    const inner = object(
      shapes.cone,
      '#ffe0a0',
      0,
      -0.11,
      0.04,
      0.13,
      0.38,
      0.13,
      flame,
    );
    inner.material = mat('#ffe0a0', true);
    flames.push(flame);
  }
  // Shrine courtyard: stone paving, broken pillars, and a suspended time flower.
  box('#808675', 0, 0.09, -25.4, 13.5, 0.18, 14.2);
  for (let row = 0; row < 6; row += 1)
    for (let column = 0; column < 5; column += 1) {
      const tile = box(
        (row + column) % 3 ? '#929681' : '#a4a18a',
        -5.5 + column * 2.75,
        0.205,
        -19.7 - row * 2.3,
        2.54,
        0.065,
        2.12,
      );
      tile.rotation.y = (random(row * 7 + column) - 0.5) * 0.02;
    }
  for (const side of [-1, 1])
    for (const z of [-20, -28.4]) {
      const height = z === -20 ? 3.6 : 5.4;
      cylinder('#9ca18a', side * 7.3, height / 2, z, 0.65, height);
      cylinder('#b0b198', side * 7.3, 0.24, z, 0.95, 0.48);
      ball('#4d704b', side * 7.3, height, z, 0.84, 0.3, 0.86);
    }
  cylinder('#788675', SHRINE.x, 0.27, SHRINE.z, 2.2, 0.54);
  cylinder('#a8ad90', SHRINE.x, 0.64, SHRINE.z, 1.7, 0.25);
  cylinder('#a8ad90', SHRINE.x, 1.1, SHRINE.z, 0.72, 0.8);
  cylinder('#d7c895', SHRINE.x, 1.55, SHRINE.z, 1.1, 0.18);
  const shrineFlower = new T.Group();
  shrineFlower.position.set(SHRINE.x, 2.7, SHRINE.z);
  scene.add(shrineFlower);
  glyph(shrineFlower, '#f8d88d', 1.8);

  function adventurer() {
    const root = new T.Group();
    const figure = new T.Group();
    root.add(figure);
    blob(root, 0.65);
    const torso = object(
      shapes.cone,
      '#487641',
      0,
      0.96,
      0,
      0.44,
      0.76,
      0.37,
      figure,
    );
    torso.geometry = new T.CylinderGeometry(0.26, 0.47, 0.76, 7);
    torso.scale.set(1, 1, 1);
    box('#644833', 0, 0.82, 0.02, 0.7, 0.13, 0.53, figure);
    box('#d7b35d', 0, 0.82, 0.305, 0.16, 0.15, 0.055, figure);
    ball('#e0b98b', 0, 1.52, 0.02, 0.36, 0.39, 0.32, figure);
    const hair = ball('#c69d47', 0, 1.7, -0.025, 0.38, 0.23, 0.34, figure);
    hair.rotation.y = 0.2;
    for (const side of [-1, 1]) {
      const ear = object(
        shapes.cone,
        '#e0b98b',
        side * 0.38,
        1.5,
        0,
        0.11,
        0.4,
        0.08,
        figure,
      );
      ear.rotation.z = -side * 1.2;
      ball('#293c35', side * 0.13, 1.55, 0.302, 0.036, 0.05, 0.023, figure);
      const bang = object(
        shapes.cone,
        '#c69d47',
        side * 0.12,
        1.72,
        0.295,
        0.1,
        0.27,
        0.07,
        figure,
      );
      bang.rotation.z = side * 0.3 + Math.PI;
    }
    const cap = object(
      shapes.cone,
      '#46723d',
      0,
      1.92,
      -0.15,
      0.37,
      0.8,
      0.34,
      figure,
    );
    cap.rotation.x = -0.65;
    const capTail = object(
      shapes.cone,
      '#386936',
      0,
      1.9,
      -0.56,
      0.22,
      0.62,
      0.2,
      figure,
    );
    capTail.rotation.x = -1.45;
    const legs: T.Group[] = [];
    const arms: T.Group[] = [];
    for (const side of [-1, 1]) {
      const leg = new T.Group();
      leg.position.set(side * 0.19, 0.68, 0);
      figure.add(leg);
      cylinder('#ddd0a3', 0, -0.18, 0, 0.12, 0.36, leg);
      cylinder('#68472f', 0, -0.44, 0, 0.15, 0.36, leg);
      box('#68472f', 0, -0.56, 0.1, 0.29, 0.17, 0.46, leg);
      legs.push(leg);
      const arm = new T.Group();
      arm.position.set(side * 0.35, 1.2, 0);
      figure.add(arm);
      cylinder('#537e42', 0, -0.13, 0, 0.15, 0.28, arm);
      cylinder('#d7b17d', 0, -0.34, 0, 0.11, 0.21, arm);
      ball('#bf975f', 0, -0.47, 0, 0.13, 0.13, 0.12, arm);
      arms.push(arm);
    }
    const shield = new T.Group();
    shield.position.set(-0.09, -0.29, 0.2);
    arms[0].add(shield);
    const shieldFace = object(
      shapes.cylinder,
      '#977146',
      0,
      0,
      0,
      0.39,
      0.09,
      0.51,
      shield,
    );
    shieldFace.rotation.x = Math.PI / 2;
    const shieldRim = new T.Mesh(
      new T.TorusGeometry(0.4, 0.045, 5, 8),
      mat('#c6af77'),
    );
    shieldRim.scale.y = 1.2;
    shieldRim.position.z = 0.045;
    shield.add(shieldRim);
    const shieldFlower = glyph(shield, '#94b074', 0.52);
    shieldFlower.position.z = 0.07;
    const sword = new T.Group();
    sword.position.set(0, -0.42, 0.1);
    arms[1].add(sword);
    cylinder('#665039', 0, 0, 0, 0.055, 0.23, sword);
    box('#d4b66b', 0, 0.13, 0, 0.37, 0.09, 0.12, sword);
    box('#d7bd81', 0, 0.67, 0, 0.13, 0.98, 0.085, sword);
    const tip = object(
      shapes.cone,
      '#e1c78d',
      0,
      1.25,
      0,
      0.075,
      0.26,
      0.048,
      sword,
    );
    tip.rotation.y = Math.PI / 4;
    sword.rotation.x = Math.PI / 2;
    const flute = object(
      shapes.smoothBall,
      '#69a3ab',
      0,
      1.25,
      0.46,
      0.23,
      0.11,
      0.14,
      figure,
    );
    for (let hole = 0; hole < 3; hole += 1)
      ball(
        '#294749',
        -0.1 + hole * 0.1,
        1.32,
        0.5,
        0.025,
        0.019,
        0.025,
        figure,
      );
    flute.visible = false;
    const slash = new T.Mesh(
      new T.TorusGeometry(1.45, 0.05, 4, 18, 2.1),
      mat('#fff0b4', true, 0.65),
    );
    slash.rotation.x = Math.PI / 2;
    slash.position.set(0, 0.9, 0.4);
    slash.visible = false;
    figure.add(slash);
    scene.add(root);
    return { root, figure, arms, legs, flute, slash, shield };
  }
  const hero = adventurer();

  const foes = simulation.enemies.map((enemy) => {
    const root = new T.Group();
    const model = new T.Group();
    root.add(model);
    scene.add(root);
    const scale = enemy.boss ? 1.55 : 0.9;
    model.scale.setScalar(scale);
    blob(root, enemy.boss ? 1.3 : 0.8);
    const bodyColor = enemy.boss ? '#777e6b' : '#856544';
    const armor = enemy.boss ? '#a5a78a' : '#789052';
    object(shapes.cylinder, bodyColor, 0, 0.95, 0, 0.57, 1.1, 0.43, model);
    for (const side of [-1, 1]) {
      box('#514b3d', side * 0.31, 0.22, 0.1, 0.35, 0.38, 0.55, model);
      ball(armor, side * 0.66, 1.1, 0, 0.35, 0.33, 0.35, model);
      connector(
        model,
        new T.Vector3(side * 0.68, 1.02, 0),
        new T.Vector3(side * 0.8, 0.55, 0.15),
        0.15,
        bodyColor,
      );
    }
    const mask = ball(armor, 0, 1.68, 0, 0.53, 0.46, 0.43, model);
    mask.rotation.y = 0.22;
    for (const side of [-1, 1]) {
      const eye = box(
        '#f3ca79',
        side * 0.2,
        1.73,
        0.409,
        0.13,
        0.12,
        0.05,
        model,
      );
      eye.material = mat('#f3ca79', true);
    }
    box('#464c3b', 0, 1.45, 0.4, 0.23, 0.08, 0.08, model);
    if (enemy.boss) {
      for (const side of [-1, 1]) {
        connector(
          model,
          new T.Vector3(side * 0.3, 1.98, 0),
          new T.Vector3(side * 0.75, 2.63, -0.15),
          0.09,
          '#c4bea0',
        );
        connector(
          model,
          new T.Vector3(side * 0.57, 2.35, -0.1),
          new T.Vector3(side * 1.01, 2.45, -0.12),
          0.065,
          '#c4bea0',
        );
      }
      const chest = new T.Group();
      chest.position.set(0, 1.02, 0.45);
      model.add(chest);
      glyph(chest, '#de9b63', 0.67);
      ball('#527b47', -0.25, 2.02, -0.2, 0.32, 0.19, 0.32, model);
    } else {
      for (let leaf = 0; leaf < 3; leaf += 1) {
        const sprout = object(
          shapes.cone,
          '#75964f',
          (leaf - 1) * 0.2,
          2.1,
          0,
          0.24,
          0.68,
          0.13,
          model,
        );
        sprout.rotation.z = (leaf - 1) * -0.35;
      }
    }
    const club = cylinder('#67543c', 0.88, 0.92, 0.32, 0.105, 0.85, model);
    club.rotation.x = -0.4;
    ball(
      enemy.boss ? '#a3a78d' : '#7d684c',
      0.88,
      1.41,
      0.14,
      0.27,
      0.35,
      0.27,
      model,
    );
    const warning = new T.Mesh(
      new T.RingGeometry(enemy.boss ? 2.65 : 1.9, enemy.boss ? 2.85 : 2.08, 32),
      mat('#efa460', true, 0.55),
    );
    warning.rotation.x = -Math.PI / 2;
    warning.position.y = 0.065;
    root.add(warning);
    return { root, model, warning };
  });

  // Small floating motes and note flowers make active interactions legible.
  const motes = new T.InstancedMesh(
    shapes.rock,
    mat('#dfd19b', true, 0.45),
    40,
  );
  scene.add(motes);
  const notes = Array.from({ length: 7 }, () => {
    const note = new T.Group();
    glyph(note, '#d4f1cb', 0.18);
    note.visible = false;
    scene.add(note);
    return note;
  });
  const objectiveArrow = new T.Group();
  const arrowDiamond = object(
    shapes.rock,
    '#f4d18a',
    0,
    0,
    0,
    0.28,
    0.4,
    0.28,
    objectiveArrow,
  );
  arrowDiamond.material = mat('#f4d18a', true);
  const pointer = object(
    shapes.cone,
    '#f4d18a',
    0,
    -0.53,
    0,
    0.18,
    0.32,
    0.18,
    objectiveArrow,
  );
  pointer.rotation.z = Math.PI;
  pointer.material = mat('#f4d18a', true);
  scene.add(objectiveArrow);
  // Most of the ruins and undergrowth never move. Batch those meshes by their
  // shared material while keeping every interactive object independent.
  const retiredGeometry = new Set<T.BufferGeometry>();
  const movingMeshes = new Set<T.Object3D>([
    ...ripples,
    ...stoneGlows.flatMap((stone) => [stone.halo, stone.beam, stone.gem]),
  ]);
  const batches = new Map<T.Material, T.Mesh[]>();
  scene.updateMatrixWorld(true);
  for (const child of scene.children) {
    if (
      !(child instanceof T.Mesh) ||
      child instanceof T.InstancedMesh ||
      movingMeshes.has(child) ||
      Array.isArray(child.material)
    )
      continue;
    const batch = batches.get(child.material) ?? [];
    batch.push(child);
    batches.set(child.material, batch);
  }
  for (const [material, batch] of batches) {
    if (batch.length < 2) continue;
    const parts = batch.map((part) => {
      const shape = part.geometry.index
        ? part.geometry.toNonIndexed()
        : part.geometry.clone();
      shape.applyMatrix4(part.matrixWorld);
      return shape;
    });
    const combined = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    if (combined) {
      batch.forEach((part) => {
        retiredGeometry.add(part.geometry);
        scene.remove(part);
      });
      scene.add(new T.Mesh(combined, material));
    }
  }
  let lastWidth = 0;
  let lastHeight = 0;
  let lastTime = -1;
  let disposed = false;
  let gateAngle = 0;
  const focus = new T.Vector3();
  const desiredFocus = new T.Vector3();
  const desiredCamera = new T.Vector3();
  let entityCount = 0;
  scene.traverse((child) => {
    if (child instanceof T.Mesh)
      entityCount += child instanceof T.InstancedMesh ? child.count : 1;
  });

  function render(width: number, height: number) {
    if (disposed) return;
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    if (lastWidth !== safeWidth || lastHeight !== safeHeight) {
      renderer.setSize(safeWidth, safeHeight, false);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
      lastWidth = safeWidth;
      lastHeight = safeHeight;
    }
    const p = simulation.player;
    const time = simulation.time;
    const delta =
      lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - lastTime));
    const first = lastTime < 0;
    lastTime = time;
    const portrait = camera.aspect < 1;
    const distanceFactor = portrait ? 0.84 : 1;
    desiredFocus.set(p.x, 0.8, p.z - 3);
    desiredCamera.set(
      p.x + 5 * distanceFactor,
      10.5 * distanceFactor,
      p.z + 12 * distanceFactor,
    );
    if (first) {
      focus.copy(desiredFocus);
      camera.position.copy(desiredCamera);
    } else {
      const blend = 1 - Math.exp(-delta * 5);
      focus.lerp(desiredFocus, blend);
      camera.position.lerp(desiredCamera, blend);
    }
    camera.lookAt(focus);
    // The closer third-person camera must never become a view from inside a
    // nearby canopy. Hide only obstructing crowns; trunks keep the forest legible.
    const cameraDX = camera.position.x - p.x;
    const cameraDZ = camera.position.z - p.z;
    const cameraLength = Math.max(
      0.01,
      cameraDX * cameraDX + cameraDZ * cameraDZ,
    );
    let canopyChanged = false;
    treePositions.forEach(([x, z], index) => {
      const along =
        ((x - p.x) * cameraDX + (z - p.z) * cameraDZ) / cameraLength;
      const pathX = p.x + cameraDX * along;
      const pathZ = p.z + cameraDZ * along;
      const eyeLine = 1.4 + (camera.position.y - 1.4) * along;
      const hidden =
        along > 0.12 &&
        along < 1.3 &&
        Math.hypot(x - pathX, z - pathZ) < 3.4 &&
        Math.abs(treeHeights[index] - eyeLine) < 4.2;
      if (hidden === hiddenTrees[index]) return;
      hiddenTrees[index] = hidden;
      canopyChanged = true;
      for (let branch = 0; branch < 4; branch += 1) {
        const slot = index * 4 + branch;
        hiddenMatrix.copy(originalCrowns[slot]);
        if (hidden) hiddenMatrix.scale(zeroScale);
        crowns.setMatrixAt(slot, hiddenMatrix);
      }
      for (let branch = 0; branch < 2; branch += 1) {
        const slot = index * 2 + branch;
        hiddenMatrix.copy(originalHighlights[slot]);
        if (hidden) hiddenMatrix.scale(zeroScale);
        highlights.setMatrixAt(slot, hiddenMatrix);
      }
    });
    if (canopyChanged) {
      crowns.instanceMatrix.needsUpdate = true;
      highlights.instanceMatrix.needsUpdate = true;
    }

    hero.root.position.set(p.x, p.height, p.z);
    hero.root.rotation.y = p.facing;
    hero.figure.visible =
      p.invulnerable === 0 || Math.floor(time * 16) % 2 === 0;
    const gait = Math.sin(time * 11.5) * Math.min(p.speed / 5.6, 1);
    hero.legs[0].rotation.x = gait * 0.72;
    hero.legs[1].rotation.x = -gait * 0.72;
    hero.arms[0].rotation.x = p.guard ? -1.05 : -gait * 0.5;
    hero.arms[1].rotation.x =
      p.attack > 0 ? -1.45 + (0.25 - p.attack) * 9 : gait * 0.5 - 0.12;
    hero.arms[1].rotation.z = p.attack > 0 ? -0.85 + (0.25 - p.attack) * 5 : 0;
    hero.shield.rotation.y = p.guard ? 0.2 : -0.23;
    hero.figure.rotation.x =
      p.roll > 0 ? ((0.42 - p.roll) / 0.42) * Math.PI * 2 : 0;
    hero.figure.position.y = p.roll > 0 ? 0.6 : Math.abs(gait) * 0.035;
    hero.flute.visible = p.playing > 0;
    if (p.playing > 0) {
      hero.arms[0].rotation.x = -1.3;
      hero.arms[1].rotation.x = -1.3;
      hero.arms[1].rotation.z = 0.25;
    }
    hero.slash.visible = p.attack > 0;
    hero.slash.rotation.z = (0.25 - p.attack) * 12;
    const openTarget = simulation.gateOpen ? 1.65 : 0;
    gateAngle = first
      ? openTarget
      : T.MathUtils.lerp(gateAngle, openTarget, 1 - Math.exp(-delta * 2.5));
    doors[0].rotation.y = -gateAngle;
    doors[1].rotation.y = gateAngle;
    stoneGlows.forEach((stone, index) => {
      const activated = index < simulation.melodies;
      const current = index === simulation.melodies;
      stone.beam.visible = current;
      stone.halo.visible = current || activated;
      stone.gem.position.y = 2.25 + Math.sin(time * 1.8 + index) * 0.16;
      stone.gem.rotation.y = time * 0.8;
      stone.gem.scale.setScalar(activated ? 0.4 : current ? 0.5 : 0.3);
      stone.flower.visible = activated || current;
      stone.halo.rotation.z = time * 0.4;
    });
    const objective =
      simulation.melodies < 3
        ? MELODY_STONES[simulation.melodies]
        : (simulation.enemies.find((enemy) => enemy.boss && enemy.alive) ??
          SHRINE);
    objectiveArrow.position.set(
      objective.x,
      ('boss' in objective ? 4.7 : 3.8) + Math.sin(time * 2) * 0.16,
      objective.z,
    );
    objectiveArrow.visible = simulation.phase === 'playing';
    objectiveArrow.rotation.y = time * 0.7;
    foes.forEach((foe, index) => {
      const enemy = simulation.enemies[index];
      foe.root.visible = enemy.alive;
      foe.root.position.set(enemy.x, 0, enemy.z);
      foe.root.rotation.y = enemy.facing;
      foe.model.position.y =
        enemy.mode === 'chase' ? Math.abs(Math.sin(time * 8)) * 0.08 : 0;
      foe.model.rotation.x =
        enemy.mode === 'windup' ? -0.18 : enemy.hurt > 0 ? 0.14 : 0;
      foe.warning.visible = enemy.mode === 'windup';
      foe.warning.scale.setScalar(0.87 + Math.sin(time * 18) * 0.04);
    });
    ripples.forEach((ripple, index) => {
      ripple.scale.setScalar(0.6 + ((time * 0.23 + index * 0.37) % 1) * 1.4);
    });
    flames.forEach((flame, index) => {
      flame.scale.set(
        1 + Math.sin(time * 13 + index) * 0.08,
        1 + Math.sin(time * 16 + index) * 0.12,
        1,
      );
    });
    shrineFlower.rotation.y = time * 0.35;
    shrineFlower.position.y = 2.75 + Math.sin(time * 1.4) * 0.18;
    for (let index = 0; index < 40; index += 1) {
      dummy.position.set(
        -15 + random(index + 90) * 30 + Math.sin(time * 0.3 + index) * 0.5,
        0.6 + random(index + 23) * 4 + Math.sin(time + index) * 0.14,
        p.z - 15 + random(index + 32) * 30,
      );
      dummy.rotation.set(time * 0.4, index, 0);
      dummy.scale.setScalar(0.035 + random(index) * 0.035);
      dummy.updateMatrix();
      motes.setMatrixAt(index, dummy.matrix);
    }
    motes.instanceMatrix.needsUpdate = true;
    motes.frustumCulled = false;
    notes.forEach((note, index) => {
      note.visible = p.playing > 0 || simulation.phase === 'won';
      const angle = time * 3 + (index * Math.PI * 2) / notes.length;
      note.position.set(
        p.x + Math.sin(angle) * 1.2,
        1.3 + (index / notes.length) * 1.8,
        p.z + Math.cos(angle) * 1.2,
      );
      note.rotation.y = -angle;
    });
    renderer.render(scene, camera);
  }

  return {
    render,
    metrics: () => ({
      drawCalls: renderer.info.render.calls,
      entities: entityCount,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set<T.BufferGeometry>([
        ...Object.values(shapes),
        ...retiredGeometry,
      ]);
      const materialSet = new Set<T.Material>(materials.values());
      scene.traverse((child) => {
        if (child instanceof T.Mesh) {
          geometries.add(child.geometry);
          (Array.isArray(child.material)
            ? child.material
            : [child.material]
          ).forEach((value) => materialSet.add(value));
        }
      });
      geometries.forEach((value) => value.dispose());
      materialSet.forEach((value) => value.dispose());
      scene.clear();
      renderer.dispose();
    },
  };
}
