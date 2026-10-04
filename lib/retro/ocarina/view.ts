import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RetroView } from '../types.ts';
import { OcarinaSimulation, melodyNames } from './simulation.ts';
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
  renderer.toneMappingExposure = 1.0;
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color('#779b91');
  scene.fog = new T.Fog('#6d8b79', 23, 74);
  const camera = new T.PerspectiveCamera(61, 1, 0.08, 130);
  scene.add(new T.HemisphereLight('#d9eccb', '#243d2b', 1.3));
  const sun = new T.DirectionalLight('#ffe4aa', 2.25);
  sun.position.set(-12, 26, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -26,
    right: 26,
    top: 35,
    bottom: -32,
    near: 1,
    far: 95,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.08;
  scene.add(sun);

  const materials = new Map<string, T.Material>();
  const textures = new Set<T.Texture>();
  function paintedTexture(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): T.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d')!);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    textures.add(texture);
    return texture;
  }
  const barkTexture = paintedTexture(128, 256, (ctx) => {
    ctx.fillStyle = '#795b39';
    ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 35; i++) {
      ctx.strokeStyle = i % 3 ? '#503e2a' : '#a28252';
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      ctx.moveTo((i * 23) % 128, 0);
      for (let y = 0; y < 260; y += 16)
        ctx.lineTo(((i * 23) % 128) + Math.sin(y / 38 + i) * 7, y);
      ctx.stroke();
    }
    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = '#597444';
      ctx.fillRect((i * 37) % 128, 150 + ((i * 29) % 100), 3, 19);
    }
  });
  const grassTexture = paintedTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#688447';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = i % 2 ? '#759553' : '#536f3c';
      ctx.fillRect((i * 47) % 128, (i * 71) % 128, 2 + (i % 4), 1 + (i % 3));
    }
  });
  grassTexture.wrapS = grassTexture.wrapT = T.RepeatWrapping;
  grassTexture.repeat.set(22, 30);

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
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
    const group = new T.Group();
    group.scale.setScalar(scale);
    parent.add(group);
    const triangle = new T.Shape();
    triangle.moveTo(0, 0.29);
    triangle.lineTo(-0.25, -0.145);
    triangle.lineTo(0.25, -0.145);
    triangle.closePath();
    const shape = new T.ExtrudeGeometry(triangle, {
      depth: 0.055,
      bevelEnabled: false,
    });
    for (const [x, y] of [
      [0, 0.38],
      [-0.255, -0.06],
      [0.255, -0.06],
    ])
      object(shape, color, x, y, 0, 1, 1, 1, group).material = mat(color, true);
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
    '#789559',
    (WORLD.left + WORLD.right) / 2,
    -0.36,
    (WORLD.far + WORLD.near) / 2,
    WORLD.right - WORLD.left + 9,
    0.7,
    WORLD.near - WORLD.far + 11,
  );
  mat('#789559').map = grassTexture;
  mat('#789559').needsUpdate = true;
  const dirt = mat('#a89566');
  const bark = mat('#8b714d');
  bark.map = barkTexture;
  bark.needsUpdate = true;
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
    bark,
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
  treeTrunks.castShadow = true;
  treeTrunks.receiveShadow = true;
  crowns.castShadow = true;
  highlights.castShadow = true;
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

  // Kokiri stump homes share the existing solid rock footprints.
  for (const home of ROCKS.filter((rock) => rock.z > 8)) {
    const trunk = cylinder('#8b714d', home.x, 1.45, home.z, home.radius, 2.9);
    trunk.material = bark;
    cylinder('#c4a069', home.x, 2.95, home.z, home.radius * 1.1, 0.22);
    for (let root = 0; root < 4; root++) {
      const angle = (root * Math.PI) / 2;
      connector(
        scene,
        new T.Vector3(home.x, 0.5, home.z),
        new T.Vector3(
          home.x + Math.sin(angle) * home.radius,
          0.07,
          home.z + Math.cos(angle) * home.radius,
        ),
        0.16,
        '#76583b',
      );
    }
    object(
      shapes.smoothBall,
      '#293627',
      home.x,
      0.93,
      home.z + home.radius * 0.94,
      home.radius * 0.4,
      0.87,
      0.075,
    );
    box(
      '#bf9d62',
      home.x,
      0.06,
      home.z + home.radius,
      home.radius * 0.8,
      0.1,
      0.38,
    );
    ball(
      '#72a453',
      home.x - home.radius * 0.4,
      3.2,
      home.z,
      home.radius,
      0.33,
      home.radius * 0.9,
    );
    const window = object(
      shapes.circle,
      '#e3ca7d',
      home.x + home.radius * 0.5,
      1.83,
      home.z + home.radius * 0.88,
      0.22,
      0.22,
      1,
    );
    window.material = mat('#e3ca7d', true);
  }

  // The Great Deku Tree: a huge furrowed face over the walkable mouth opening.
  for (const side of [-1, 1]) {
    const trunk = object(
      shapes.cylinder,
      '#8b714d',
      side * 5,
      5.6,
      GATE_Z - 1.9,
      3.2,
      11.2,
      3.2,
    );
    trunk.material = bark;
    for (let root = 0; root < 4; root++)
      connector(
        scene,
        new T.Vector3(side * 5, 1.4, GATE_Z - 1.1),
        new T.Vector3(side * (6 + root * 2.5), 0.2, GATE_Z + 0.4),
        0.65,
        '#755737',
      );
    const cheek = ball(
      '#8b714d',
      side * 2.8,
      6.3,
      GATE_Z + 0.3,
      2.25,
      2.5,
      1.6,
    );
    cheek.material = bark;
    ball('#382d21', side * 2.15, 8.15, GATE_Z + 1.45, 1.1, 0.31, 0.15);
    const brow = ball(
      '#8b714d',
      side * 2.1,
      8.62,
      GATE_Z + 1.52,
      1.32,
      0.3,
      0.24,
    );
    brow.material = bark;
    brow.rotation.z = -side * 0.13;
    for (let beard = 0; beard < 4; beard++)
      connector(
        scene,
        new T.Vector3(side * (0.5 + beard * 0.35), 5.3, GATE_Z + 1.6),
        new T.Vector3(side * (1.5 + beard * 0.4), 3.4, GATE_Z + 1.25),
        0.26,
        '#765936',
      );
  }
  const forehead = box('#8b714d', 0, 10.05, GATE_Z - 1.65, 8, 4.5, 5.9);
  forehead.material = bark;
  const nose = object(
    shapes.rock,
    '#8b714d',
    0,
    7.2,
    GATE_Z + 1.7,
    0.83,
    1.57,
    0.98,
  );
  nose.material = bark;
  for (let crown = 0; crown < 12; crown++) {
    const angle = (crown * Math.PI * 2) / 12;
    object(
      shapes.rock,
      crown % 2 ? '#476d3f' : '#375b34',
      Math.sin(angle) * 7,
      12.5 + (crown % 3) * 1.3,
      GATE_Z - 3 + Math.cos(angle) * 5,
      5.8,
      3.3,
      5.4,
    );
  }

  // Masonry wall and hinged barred doors share the simulation's actual opening.
  for (const side of [-1, 1]) {
    box('#695b40', side * 10.2, 1.55, GATE_Z, 13.6, 3.1, 1.3);
    box('#806d48', side * 10.2, 3.18, GATE_Z, 13.8, 0.32, 1.7);
    for (let row = 0; row < 3; row += 1) {
      for (let block = 0; block < 5; block += 1) {
        const x = side * (4.2 + block * 2.7);
        const masonry = box(
          row % 2 ? '#837047' : '#766344',
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
    cylinder('#826b43', side * 3.6, 2.35, GATE_Z, 0.73, 4.7);
    cylinder('#9a8050', side * 3.6, 0.23, GATE_Z, 1.0, 0.46);
    cylinder('#9a8050', side * 3.6, 4.5, GATE_Z, 0.95, 0.38);
    box('#7c683f', side * 3.6, 4.88, GATE_Z, 1.6, 0.5, 1.8);
    ball('#4e7448', side * 3.6, 5.23, GATE_Z, 0.95, 0.25, 0.95);
  }
  box('#8b714d', 0, 5.2, GATE_Z, 8.8, 0.64, 1.55);
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

  // Ordered song stones each carry a different color, number and Triforce emblem.
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
  // Inner chamber: stone paving, broken pillars and a suspended Triforce.
  const innerFloor = box('#786142', 0, 0.09, -25.4, 33.8, 0.18, 17.8);
  innerFloor.material = bark;
  for (let row = 0; row < 6; row += 1)
    for (let column = 0; column < 5; column += 1) {
      const tile = box(
        (row + column) % 3 ? '#96754c' : '#866740',
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
      const innerRoot = cylinder(
        '#8b714d',
        side * 18,
        height / 2,
        z,
        1.15,
        height,
      );
      innerRoot.material = bark;
      cylinder('#826744', side * 18, 0.24, z, 1.4, 0.48);
      ball('#4d704b', side * 18, height, z, 1.3, 0.3, 1.1);
    }
  // The inner arena is a hollow wooden chamber, not a second open forest.
  // Its enclosing trunks lie outside the same movement bounds as the simulation.
  for (const side of [-1, 1]) {
    const wall = box('#8b714d', side * 18, 5, -25.5, 2, 10, 19);
    wall.material = bark;
    for (let rib = 0; rib < 5; rib++) {
      const root = cylinder(
        '#8b714d',
        side * 17.75,
        4.5,
        -17.7 - rib * 3.6,
        0.7,
        9,
      );
      root.material = bark;
      connector(
        scene,
        new T.Vector3(side * 17.6, 7, -17.7 - rib * 3.6),
        new T.Vector3(side * 11, 10, -17.7 - rib * 3.6),
        0.5,
        '#685338',
      );
    }
  }
  const chamberBack = box('#8b714d', 0, 5, -35, 36, 10, 2);
  chamberBack.material = bark;
  const chamberRoof = box('#8b714d', 0, 10.2, -25.8, 36, 0.7, 18.6);
  chamberRoof.material = bark;
  const webPoints: number[] = [];
  const webCenter = new T.Vector3(9.8, 5.9, -33.88);
  for (let spoke = 0; spoke < 10; spoke++) {
    const angle = (spoke * Math.PI * 2) / 10;
    webPoints.push(
      webCenter.x,
      webCenter.y,
      webCenter.z,
      webCenter.x + Math.cos(angle) * 4,
      webCenter.y + Math.sin(angle) * 3.1,
      webCenter.z,
    );
    for (let ring = 1; ring <= 4; ring++) {
      const next = angle + (Math.PI * 2) / 10;
      webPoints.push(
        webCenter.x + Math.cos(angle) * ring,
        webCenter.y + Math.sin(angle) * ring * 0.775,
        webCenter.z,
        webCenter.x + Math.cos(next) * ring,
        webCenter.y + Math.sin(next) * ring * 0.775,
        webCenter.z,
      );
    }
  }
  const webGeometry = new T.BufferGeometry();
  webGeometry.setAttribute(
    'position',
    new T.Float32BufferAttribute(webPoints, 3),
  );
  const webMaterial = new T.LineBasicMaterial({
    color: '#d6d1ae',
    transparent: true,
    opacity: 0.37,
  });
  scene.add(new T.LineSegments(webGeometry, webMaterial));
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
      '#28743d',
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
      '#2f7839',
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
      '#266535',
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
      cylinder('#d6af80', 0, -0.18, 0, 0.12, 0.36, leg);
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
    figure.add(shield);
    const shieldOutline = new T.Shape();
    shieldOutline.moveTo(-0.34, 0.43);
    shieldOutline.lineTo(0.34, 0.43);
    shieldOutline.lineTo(0.41, 0.13);
    shieldOutline.lineTo(0.24, -0.35);
    shieldOutline.lineTo(0, -0.54);
    shieldOutline.lineTo(-0.24, -0.35);
    shieldOutline.lineTo(-0.41, 0.13);
    shieldOutline.closePath();
    const shieldShape = new T.ExtrudeGeometry(shieldOutline, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 1,
    });
    object(shieldShape, '#87603c', 0, 0, 0, 1, 1, 1, shield);
    const shieldTexture = paintedTexture(256, 320, (ctx) => {
      ctx.clearRect(0, 0, 256, 320);
      ctx.fillStyle = '#a27b4c';
      ctx.beginPath();
      ctx.moveTo(28, 16);
      ctx.lineTo(228, 16);
      ctx.lineTo(248, 100);
      ctx.lineTo(195, 250);
      ctx.lineTo(128, 307);
      ctx.lineTo(60, 250);
      ctx.lineTo(8, 100);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      for (let i = 0; i < 16; i++) {
        ctx.strokeStyle = i % 2 ? '#74532e' : '#bb945d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(i * 19, 0);
        ctx.bezierCurveTo(i * 19 - 15, 90, i * 19 + 13, 200, i * 19 - 6, 330);
        ctx.stroke();
      }
      ctx.strokeStyle = '#b72c29';
      ctx.lineWidth = 17;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(128, 253);
      ctx.lineTo(127, 198);
      ctx.bezierCurveTo(58, 209, 53, 107, 116, 102);
      ctx.bezierCurveTo(182, 96, 183, 180, 130, 174);
      ctx.bezierCurveTo(104, 171, 105, 139, 132, 139);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(128, 84);
      ctx.lineTo(128, 46);
      ctx.moveTo(128, 65);
      ctx.lineTo(83, 42);
      ctx.moveTo(128, 65);
      ctx.lineTo(173, 42);
      ctx.stroke();
      ctx.restore();
    });
    const shieldMat = new T.MeshBasicMaterial({
      map: shieldTexture,
      transparent: true,
      side: T.DoubleSide,
    });
    const shieldDecal = new T.Mesh(new T.PlaneGeometry(0.82, 1.02), shieldMat);
    shieldDecal.position.set(0, -0.03, 0.14);
    shield.add(shieldDecal);
    const sword = new T.Group();
    sword.position.set(0, -0.42, 0.1);
    arms[0].add(sword);
    cylinder('#665039', 0, 0, 0, 0.055, 0.23, sword);
    box('#3e6091', 0, 0.13, 0, 0.37, 0.09, 0.12, sword);
    box('#cbd8dd', 0, 0.67, 0, 0.13, 0.98, 0.085, sword);
    const tip = object(
      shapes.cone,
      '#e4eff1',
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
    return { root, figure, arms, legs, flute, slash, shield, sword };
  }
  const hero = adventurer();

  const foes = simulation.enemies.map((enemy) => {
    const root = new T.Group(),
      model = new T.Group();
    root.add(model);
    scene.add(root);
    const boss = enemy.boss;
    model.scale.setScalar(boss ? 1.45 : 0.75);
    blob(root, boss ? 2.0 : 0.9);
    const legs: T.Group[] = [];
    ball(
      boss ? '#695c44' : '#6b6251',
      0,
      0.9,
      -0.25,
      boss ? 0.88 : 0.6,
      0.53,
      0.86,
      model,
    );
    ball(boss ? '#866846' : '#e3d4a8', 0, 1.08, 0.37, 0.62, 0.65, 0.4, model);
    if (boss) {
      ball('#321f27', 0, 1.18, 0.718, 0.43, 0.39, 0.105, model);
      ball('#e0af3f', 0, 1.18, 0.79, 0.31, 0.29, 0.067, model).material = mat(
        '#e0af3f',
        true,
      );
      ball('#152723', 0, 1.18, 0.847, 0.071, 0.24, 0.03, model);
      for (const side of [-1, 1])
        connector(
          model,
          new T.Vector3(side * 0.27, 0.72, 0.62),
          new T.Vector3(side * 0.43, 0.31, 0.99),
          0.1,
          '#d5bf8b',
        );
    } else {
      for (const side of [-1, 1]) {
        ball('#342f29', side * 0.22, 1.22, 0.704, 0.14, 0.17, 0.065, model);
        ball('#ba4733', side * 0.22, 1.22, 0.764, 0.045, 0.065, 0.025, model);
      }
      box('#746c53', 0, 0.95, 0.747, 0.12, 0.18, 0.05, model);
      for (let tooth = -2; tooth <= 2; tooth++)
        box('#e9dcba', tooth * 0.092, 0.83, 0.727, 0.056, 0.15, 0.07, model);
    }
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const leg = new T.Group();
        leg.position.set(side * 0.42, 0.89, -0.65 + i * 0.4);
        model.add(leg);
        const spread = 0.95 + (i % 2) * 0.27;
        connector(
          leg,
          new T.Vector3(0, 0, 0),
          new T.Vector3(side * spread, 0.36, (i - 1.5) * 0.43),
          boss ? 0.12 : 0.095,
          '#6b5e3f',
        );
        connector(
          leg,
          new T.Vector3(side * spread, 0.36, (i - 1.5) * 0.43),
          new T.Vector3(side * (spread + 0.32), -0.83, (i - 1.5) * 0.54),
          0.065,
          '#b19a68',
        );
        legs.push(leg);
      }
    const warning = new T.Mesh(
      new T.RingGeometry(boss ? 2.65 : 1.9, boss ? 2.85 : 2.08, 32),
      mat('#d77144', true, 0.45),
    );
    warning.rotation.x = -Math.PI / 2;
    warning.position.y = 0.065;
    root.add(warning);
    return { root, model, warning, legs };
  });

  const navi = new T.Group();
  scene.add(navi);
  ball('#c3f6ff', 0, 0, 0, 0.105, 0.105, 0.105, navi).material = mat(
    '#aff1ff',
    true,
  );
  const naviWings: T.Mesh[] = [];
  for (const side of [-1, 1])
    for (const row of [-1, 1]) {
      const wing = object(
        shapes.smoothBall,
        '#e1fdff',
        side * 0.16,
        row * 0.09,
        0,
        0.14,
        row > 0 ? 0.22 : 0.14,
        0.018,
        navi,
      );
      wing.rotation.z = -side * row * 0.6;
      wing.material = mat('#e1fdff', true, 0.66);
      naviWings.push(wing);
    }
  const targetMarker = new T.Group();
  scene.add(targetMarker);
  const markerTip = object(
    shapes.cone,
    '#f6d45a',
    0,
    0,
    0,
    0.24,
    0.45,
    0.12,
    targetMarker,
  );
  markerTip.rotation.z = Math.PI;
  markerTip.material = mat('#f6d45a', true);
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
      const mergedMesh = new T.Mesh(combined, material);
      mergedMesh.castShadow = true;
      mergedMesh.receiveShadow = true;
      scene.add(mergedMesh);
    }
  }
  const hudCanvas = document.createElement('canvas');
  hudCanvas.width = 1280;
  hudCanvas.height = 720;
  const hud = hudCanvas.getContext('2d')!;
  const hudTexture = new T.CanvasTexture(hudCanvas);
  hudTexture.colorSpace = T.SRGBColorSpace;
  textures.add(hudTexture);
  const hudMaterial = new T.MeshBasicMaterial({
    map: hudTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const hudGeometry = new T.PlaneGeometry(2, 2);
  const hudScene = new T.Scene(),
    hudCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  const hudPlane = new T.Mesh(hudGeometry, hudMaterial);
  hudPlane.position.z = -1;
  hudScene.add(hudPlane);
  function hudText(
    value: string,
    x: number,
    y: number,
    size = 20,
    color = '#fff7df',
    align: CanvasTextAlign = 'left',
  ) {
    hud.font = `bold ${size}px Georgia, serif`;
    hud.textAlign = align;
    hud.textBaseline = 'middle';
    hud.shadowColor = '#142820';
    hud.shadowBlur = 3;
    hud.shadowOffsetY = 2;
    hud.fillStyle = color;
    hud.fillText(value, x, y);
    hud.shadowBlur = 0;
    hud.shadowOffsetY = 0;
  }
  function heart(x: number, y: number, filled: boolean) {
    hud.beginPath();
    hud.moveTo(x, y + 7);
    hud.bezierCurveTo(x - 23, y - 8, x - 18, y - 24, x, y - 12);
    hud.bezierCurveTo(x + 18, y - 24, x + 23, y - 8, x, y + 7);
    hud.closePath();
    hud.fillStyle = filled ? '#d93c38' : '#493736';
    hud.fill();
    hud.lineWidth = 2;
    hud.strokeStyle = filled ? '#f2a08a' : '#92725b';
    hud.stroke();
  }
  const arrowText: Record<string, string> = {
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
  };
  function drawHud() {
    hud.clearRect(0, 0, 1280, 720);
    for (let i = 0; i < 5; i++) heart(48 + i * 35, 49, i < simulation.hearts);
    hud.fillStyle = '#263b2b';
    hud.fillRect(30, 76, 171, 15);
    hud.fillStyle = '#65b96b';
    hud.fillRect(33, 79, (165 * simulation.magic) / 100, 9);
    if (simulation.player.charging > 0.2)
      hudText(
        simulation.player.charging >= 0.65
          ? 'SPIN READY — RELEASE J'
          : 'CHARGING…',
        30,
        111,
        16,
        '#b4edcf',
      );
    const action =
      simulation.playingSong !== null
        ? 'Stop'
        : simulation.melodies < 3
          ? 'Ocarina'
          : 'Check';
    for (const [x, y, r, color, key, label] of [
      [975, 47, 27, '#399b50', 'J', 'Attack'],
      [1050, 79, 30, '#3979c7', 'K', 'Roll'],
      [1130, 40, 23, '#d6b247', 'E', action],
      [1203, 80, 23, '#bda34e', 'L', 'Defend'],
    ] as const) {
      hud.beginPath();
      hud.arc(x, y, r, 0, Math.PI * 2);
      hud.fillStyle = color;
      hud.fill();
      hud.strokeStyle = '#eee6a7';
      hud.lineWidth = 2;
      hud.stroke();
      hudText(key, x, y, 23, '#fffadf', 'center');
      hudText(label, x, y + r + 18, 15, '#fff4cd', 'center');
    }
    hudText(
      'Z  TARGET',
      1162,
      151,
      17,
      simulation.targetIndex === null ? '#e2dcba' : '#ffe55f',
      'center',
    );
    hud.fillStyle = '#37b274';
    hud.beginPath();
    hud.moveTo(41, 631);
    hud.lineTo(52, 650);
    hud.lineTo(41, 673);
    hud.lineTo(30, 650);
    hud.closePath();
    hud.fill();
    hud.strokeStyle = '#b9eab0';
    hud.stroke();
    hudText(String(simulation.rupees).padStart(3, '0'), 65, 650, 30, '#e8f6d5');
    hud.fillStyle = 'rgba(22,49,37,.56)';
    hud.fillRect(1103, 536, 144, 155);
    hud.strokeStyle = '#b8bf86';
    hud.lineWidth = 2;
    hud.strokeRect(1103, 536, 144, 155);
    hud.strokeStyle = '#819f65';
    hud.strokeRect(1114, 545, 123, 134);
    const mapX = (x: number) =>
      1114 + ((x - WORLD.left) / (WORLD.right - WORLD.left)) * 123;
    const mapZ = (z: number) =>
      545 + ((z - WORLD.far) / (WORLD.near - WORLD.far)) * 134;
    hud.fillStyle = '#6992a1';
    hud.fillRect(mapX(POND.x) - 9, mapZ(POND.z) - 5, 18, 10);
    MELODY_STONES.forEach((stone, i) => {
      hud.fillStyle =
        i < simulation.melodies
          ? '#8eca70'
          : i === simulation.melodies
            ? '#ffe35f'
            : '#ada775';
      hud.fillRect(mapX(stone.x) - 2, mapZ(stone.z) - 2, 5, 5);
    });
    hud.fillStyle = '#f8ee72';
    hud.beginPath();
    hud.arc(
      mapX(simulation.player.x),
      mapZ(simulation.player.z),
      3.5,
      0,
      Math.PI * 2,
    );
    hud.fill();
    hudText('KOKIRI / DEKU TREE', 1175, 707, 11, '#dfdfba', 'center');
    if (simulation.playingSong !== null) {
      const song = MELODY_STONES[simulation.playingSong];
      hud.fillStyle = 'rgba(18,31,34,.91)';
      hud.fillRect(247, 505, 786, 164);
      hud.strokeStyle = '#ab9b6f';
      hud.strokeRect(253, 511, 774, 152);
      hudText(
        melodyNames[simulation.playingSong],
        640,
        541,
        27,
        '#ede7cf',
        'center',
      );
      song.notes.forEach((note, i) => {
        hud.beginPath();
        hud.arc(410 + i * 92, 590, 24, 0, Math.PI * 2);
        hud.fillStyle =
          i < simulation.songCursor
            ? '#489265'
            : i === simulation.songCursor
              ? '#d4b951'
              : '#686552';
        hud.fill();
        hudText(arrowText[note], 410 + i * 92, 590, 30, '#fff8d5', 'center');
      });
      hudText(
        '방향키로 연주 · 틀리면 처음부터 · E 취소',
        640,
        639,
        17,
        '#d6d7c4',
        'center',
      );
    } else if (simulation.messageTime > 0) {
      hud.fillStyle = 'rgba(22,39,35,.81)';
      hud.fillRect(252, 604, 776, 65);
      hudText(simulation.message, 640, 637, 18, '#f0ebd5', 'center');
    }
    const boss = simulation.enemies.find((enemy) => enemy.boss && enemy.alive);
    if (
      boss &&
      simulation.gateOpen &&
      Math.hypot(boss.x - simulation.player.x, boss.z - simulation.player.z) <
        13 &&
      simulation.playingSong === null
    ) {
      hudText('PARASITIC ARMORED ARACHNID', 640, 33, 14, '#dedbb6', 'center');
      hudText('QUEEN GOHMA', 640, 58, 25, '#f1dec2', 'center');
      hud.fillStyle = '#382f2b';
      hud.fillRect(455, 83, 370, 9);
      hud.fillStyle = '#c66b44';
      hud.fillRect(457, 85, (366 * boss.hp) / boss.maxHp, 5);
    }
    hudTexture.needsUpdate = true;
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
    const yaw = simulation.cameraYaw;
    const distanceFactor = portrait
      ? 9.5
      : simulation.targetIndex !== null
        ? 7.3
        : 7.9;
    desiredFocus.set(
      p.x + Math.sin(yaw) * 2.2,
      p.height + 1.25,
      p.z + Math.cos(yaw) * 2.2,
    );
    desiredCamera.set(
      p.x - Math.sin(yaw) * distanceFactor - Math.cos(yaw) * 0.6,
      p.height + 1.25 + Math.sin(simulation.cameraPitch) * distanceFactor,
      p.z - Math.cos(yaw) * distanceFactor + Math.sin(yaw) * 0.6,
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
    const swing = p.attack > 0 ? (0.25 - Math.min(p.attack, 0.25)) / 0.25 : 0;
    hero.arms[0].rotation.x =
      p.attack > 0 ? -1.4 + swing * 2.2 : p.charging > 0.2 ? -0.6 : -gait * 0.5;
    hero.arms[0].rotation.z =
      p.attack > 0
        ? p.combo === 2
          ? -0.2
          : 0.95 - swing * 2.4
        : p.charging > 0.2
          ? 0.8
          : 0;
    hero.arms[1].rotation.x = p.guard ? -1.1 : gait * 0.5 - 0.12;
    hero.arms[1].rotation.z = 0;
    if (p.guard) {
      hero.arms[1].add(hero.shield);
      hero.shield.position.set(0.07, -0.29, 0.2);
      // Cancel the raised arm pitch so the shield faces the guarded direction.
      hero.shield.rotation.set(1.1, -0.2, 0);
    } else {
      hero.figure.add(hero.shield);
      hero.shield.position.set(0, 1.04, -0.31);
      hero.shield.rotation.set(0, Math.PI, 0.04);
    }
    hero.figure.rotation.x =
      p.roll > 0 ? ((0.42 - p.roll) / 0.42) * Math.PI * 2 : 0;
    hero.figure.rotation.y =
      p.spin > 0 ? ((0.48 - p.spin) / 0.48) * Math.PI * 2 : 0;
    hero.figure.position.y = p.roll > 0 ? 0.6 : Math.abs(gait) * 0.035;
    hero.flute.visible = p.playing > 0;
    hero.sword.visible = p.playing === 0;
    if (p.playing > 0) {
      hero.arms[0].rotation.x = -1.3;
      hero.arms[1].rotation.x = -1.3;
      hero.arms[0].rotation.z = -0.25;
      hero.arms[1].rotation.z = 0.25;
    }
    hero.slash.visible = p.attack > 0 || p.charging > 0.65;
    hero.slash.scale.setScalar(p.spin > 0 ? 1.8 : p.charging > 0.65 ? 0.65 : 1);
    hero.slash.rotation.z =
      p.spin > 0 ? simulation.time * 22 : (0.25 - p.attack) * 12;
    const locked =
      simulation.targetIndex === null
        ? null
        : simulation.enemies[simulation.targetIndex];
    navi.position.set(
      locked ? locked.x + 0.7 : p.x + Math.sin(time * 1.9) * 0.4 + 0.85,
      locked
        ? locked.boss
          ? 3.1
          : 2.2
        : p.height + 1.9 + Math.sin(time * 2.8) * 0.16,
      locked ? locked.z : p.z + Math.cos(time * 1.4) * 0.35,
    );
    navi.rotation.y = -time * 0.5;
    naviWings.forEach((wing, index) => {
      wing.rotation.y = Math.sin(time * 25) * (index % 2 ? 0.75 : -0.75);
    });
    targetMarker.visible = !!locked;
    if (locked)
      targetMarker.position.set(locked.x, locked.boss ? 3.5 : 2.8, locked.z);
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
      foe.legs.forEach((leg, legIndex) => {
        leg.rotation.z =
          Math.sin(time * 9 + legIndex * 1.6) *
          (enemy.mode === 'chase' ? 0.18 : 0.025);
      });
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
    drawHud();
    renderer.info.reset();
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(hudScene, hudCamera);
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
      textures.forEach((texture) => texture.dispose());
      webGeometry.dispose();
      webMaterial.dispose();
      hudMaterial.dispose();
      hudGeometry.dispose();
      sun.shadow.dispose();
      renderer.dispose();
    },
  };
}
