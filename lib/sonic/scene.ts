import * as T from 'three';
import { createHedgehog } from './model';
import {
  boosts,
  checkpoints,
  enemies,
  groundAt,
  groundSlope,
  hazards,
  LEVEL_END,
  LOOP,
  rings,
  springs,
  START_X,
} from './world';
import type { SonicSimulation } from './simulation';

const PALETTE = {
  sky: '#72d6ee',
  haze: '#b3eafa',
  grass: '#70d627',
  grassDark: '#24a43d',
  emerald: '#179b61',
  sea: '#12b9ce',
  seaLight: '#70e2e9',
  gold: '#ffd34b',
  bark: '#b77638',
  sand: '#f4d6a0',
  coral: '#f34243',
  white: '#fffeeb',
};
const FRONT = 6;
const CHARACTER_Z = 7.4;
const WORLD_START = -100;
const WORLD_STOP = LEVEL_END + 120;
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(value, high));
const noise = (value: number) => {
  const sample = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return sample - Math.floor(sample);
};

/** Render-only view of the exact simulation course; never owns collision geometry. */
export function createSonicScene(renderer: T.WebGLRenderer) {
  const scene = new T.Scene();
  scene.background = new T.Color(PALETTE.sky);
  scene.fog = new T.Fog(PALETTE.haze, 130, 390);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.shadowMap.enabled = false;
  const camera = new T.OrthographicCamera(-25, 25, 14, -14, 0.1, 520);
  scene.add(new T.HemisphereLight('#e5fbff', '#377045', 2.5));
  const sunshine = new T.DirectionalLight('#fff5d8', 3.1);
  sunshine.position.set(-35, 75, 45);
  scene.add(sunshine);

  const materialCache = new Map<string, T.MeshStandardMaterial>();
  const textures = new Set<T.Texture>();
  function material(color: string, metalness = 0, roughness = 0.7) {
    const key = `${color}:${metalness}:${roughness}`;
    let value = materialCache.get(key);
    if (!value) {
      value = new T.MeshStandardMaterial({ color, metalness, roughness });
      materialCache.set(key, value);
    }
    return value;
  }
  const geometry = {
    box: new T.BoxGeometry(1, 1, 1),
    ball: new T.SphereGeometry(1, 14, 10),
    cone: new T.ConeGeometry(1, 1, 8),
    cylinder: new T.CylinderGeometry(1, 1, 1, 10),
    rock: new T.DodecahedronGeometry(1, 0),
    ring: new T.TorusGeometry(0.76, 0.155, 7, 20),
  };
  function mesh(
    shape: T.BufferGeometry,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    parent: T.Object3D = scene,
  ) {
    const object = new T.Mesh(shape, mat);
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    parent.add(object);
    return object;
  }
  function box(
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: T.Object3D = scene,
  ) {
    return mesh(geometry.box, material(color), x, y, z, sx, sy, sz, parent);
  }
  function ball(
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: T.Object3D = scene,
  ) {
    return mesh(geometry.ball, material(color), x, y, z, sx, sy, sz, parent);
  }
  const dummy = new T.Object3D();
  type Instance = {
    x: number;
    y: number;
    z: number;
    sx?: number;
    sy?: number;
    sz?: number;
    rx?: number;
    ry?: number;
    rz?: number;
  };
  function instanceMatrix(value: Instance) {
    dummy.position.set(value.x, value.y, value.z);
    dummy.scale.set(value.sx ?? 1, value.sy ?? 1, value.sz ?? 1);
    dummy.rotation.set(value.rx ?? 0, value.ry ?? 0, value.rz ?? 0);
    dummy.updateMatrix();
    return dummy.matrix;
  }
  function instances(
    shape: T.BufferGeometry,
    mat: T.Material,
    values: Instance[],
  ) {
    const object = new T.InstancedMesh(shape, mat, values.length);
    values.forEach((value, index) =>
      object.setMatrixAt(index, instanceMatrix(value)),
    );
    object.instanceMatrix.needsUpdate = true;
    object.computeBoundingSphere();
    scene.add(object);
    return object;
  }

  // A tiny hand-drawn tile texture gives the cliff its iconic checker relief.
  const checkerCanvas = document.createElement('canvas');
  checkerCanvas.width = checkerCanvas.height = 256;
  const paint = checkerCanvas.getContext('2d')!;
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const x = column * 128;
      const y = row * 128;
      paint.fillStyle = (row + column) % 2 ? '#ba692e' : '#e09b48';
      paint.fillRect(x, y, 128, 128);
      paint.fillStyle = (row + column) % 2 ? '#c47c39' : '#edac56';
      paint.fillRect(x + 4, y + 4, 120, 7);
      paint.fillStyle = '#8b512525';
      paint.fillRect(x + 120, y + 8, 8, 120);
      for (let speck = 0; speck < 18; speck += 1) {
        paint.fillStyle = speck % 2 ? '#ffd29017' : '#58361b13';
        paint.fillRect(
          x + noise(speck + row * 80) * 120,
          y + noise(speck + column * 90) * 120,
          3,
          7,
        );
      }
    }
  }
  const checkerTexture = new T.CanvasTexture(checkerCanvas);
  checkerTexture.wrapS = checkerTexture.wrapT = T.RepeatWrapping;
  checkerTexture.colorSpace = T.SRGBColorSpace;
  checkerTexture.anisotropy = Math.min(
    8,
    renderer.capabilities.getMaxAnisotropy(),
  );
  textures.add(checkerTexture);
  const checker = new T.MeshStandardMaterial({
    map: checkerTexture,
    roughness: 0.94,
    color: '#ffffff',
  });

  function ribbon(
    frontZ: number,
    backZ: number,
    upperOffset: number,
    lowerOffset: number | null,
    mat: T.Material,
  ) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indexes: number[] = [];
    let count = 0;
    for (let x = WORLD_START; x <= WORLD_STOP; x += 2) {
      const ground = groundAt(x);
      if (lowerOffset === null) {
        positions.push(
          x,
          ground + upperOffset,
          frontZ,
          x,
          ground + upperOffset,
          backZ,
        );
        uvs.push(x / 8, 0, x / 8, (backZ - frontZ) / 8);
      } else {
        const bottom = lowerOffset === -100 ? -3 : ground + lowerOffset;
        positions.push(x, ground + upperOffset, frontZ, x, bottom, backZ);
        uvs.push(x / 8, (ground + upperOffset) / 8, x / 8, bottom / 8);
      }
      if (count > 0)
        indexes.push(count - 2, count - 1, count, count, count - 1, count + 1);
      count += 2;
    }
    const shape = new T.BufferGeometry();
    shape.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    shape.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    shape.setIndex(indexes);
    shape.computeVertexNormals();
    const object = new T.Mesh(shape, mat);
    // Each ribbon's vertices face +z or +y consistently, but the grassy edge can
    // also be seen from behind on wide mobile aspect ratios.
    mat.side = T.DoubleSide;
    scene.add(object);
    return object;
  }
  ribbon(FRONT, FRONT, -0.55, -100, checker);
  ribbon(FRONT + 0.06, FRONT + 0.06, 0.04, -0.62, material(PALETTE.grass));
  ribbon(FRONT - 0.02, -9, 0, null, material('#63c931'));
  ribbon(-9, -9, -0.5, -100, material('#956639'));
  const grassTufts: Instance[] = [];
  for (let x = WORLD_START; x < WORLD_STOP; x += 2.2) {
    grassTufts.push({
      x,
      y: groundAt(x) - 0.49,
      z: FRONT + 0.08,
      sx: 0.3,
      sy: 0.48 + noise(x) * 0.35,
      sz: 0.05,
      rz: Math.PI,
    });
  }
  instances(geometry.cone, material(PALETTE.grass), grassTufts);

  // The real, full 360° loop: checkerboard wall outside the physics foot-track,
  // with an inward-facing grass road, not a decorative circle behind the path.
  const loopFace = new T.RingGeometry(LOOP.radius, LOOP.radius + 4.2, 96, 1);
  const loopPositions = loopFace.getAttribute('position');
  const loopUV = loopFace.getAttribute('uv');
  for (let index = 0; index < loopPositions.count; index += 1) {
    loopUV.setXY(
      index,
      (loopPositions.getX(index) + LOOP.x) / 8,
      (loopPositions.getY(index) + LOOP.y) / 8,
    );
  }
  mesh(loopFace, checker, LOOP.x, LOOP.y, FRONT + 0.14);
  const insideRoad = new T.Mesh(
    new T.CylinderGeometry(LOOP.radius, LOOP.radius, FRONT + 9, 96, 1, true),
    material(PALETTE.grassDark),
  );
  insideRoad.material.side = T.DoubleSide;
  insideRoad.rotation.x = Math.PI / 2;
  insideRoad.position.set(LOOP.x, LOOP.y, (FRONT - 9) / 2);
  scene.add(insideRoad);
  mesh(
    new T.RingGeometry(LOOP.radius, LOOP.radius + 0.62, 96),
    material(PALETTE.grass),
    LOOP.x,
    LOOP.y,
    FRONT + 0.2,
  );
  mesh(
    new T.RingGeometry(LOOP.radius + 3.75, LOOP.radius + 4.2, 96),
    material('#399847'),
    LOOP.x,
    LOOP.y,
    FRONT + 0.2,
  );

  // Bright water, foam strokes and geometric islands create a coastal depth
  // stack. The near course remains opaque and crisp against these soft layers.
  const sea = box(
    PALETTE.sea,
    LEVEL_END / 2,
    5.5,
    -92.5,
    LEVEL_END + 800,
    0.3,
    165,
  );
  sea.material = new T.MeshBasicMaterial({ color: '#08adc5' });
  const waveEntries: Instance[] = [];
  for (let index = 0; index < 300; index += 1) {
    waveEntries.push({
      x: WORLD_START + noise(index * 3.1) * (WORLD_STOP - WORLD_START),
      y: 5.72,
      z: -18 - noise(index * 2.4 + 3) * 153,
      sx: 2 + noise(index + 4) * 8,
      sy: 0.05,
      sz: 0.18 + noise(index) * 0.25,
    });
  }
  instances(geometry.box, material(PALETTE.seaLight), waveEntries);
  const farHills: Instance[] = [];
  const islandRocks: Instance[] = [];
  const islandCaps: Instance[] = [];
  for (let x = -100; x < WORLD_STOP + 150; x += 100) {
    farHills.push({
      x,
      y: 5,
      z: -173,
      sx: 34 + noise(x + 8) * 20,
      sy: 5 + noise(x + 9) * 3,
      sz: 8,
    });
    islandRocks.push({
      x: x + 32,
      y: 7.5,
      z: -123,
      sx: 13 + noise(x) * 5,
      sy: 4 + noise(x + 5) * 2,
      sz: 7,
      ry: noise(x + 1),
    });
    islandCaps.push({
      x: x + 32,
      y: 10.7 + noise(x + 5) * 1.5,
      z: -123,
      sx: 12 + noise(x) * 5,
      sy: 1.3,
      sz: 7,
    });
  }
  instances(geometry.rock, material('#60beb5'), farHills);
  instances(geometry.rock, material('#80ad87'), islandRocks);
  instances(geometry.rock, material('#50b06e'), islandCaps);

  const archShape = new T.Shape();
  archShape.moveTo(-11, -5);
  archShape.lineTo(-11, 0);
  archShape.absarc(0, 0, 11, Math.PI, 0, true);
  archShape.lineTo(11, -5);
  archShape.lineTo(6, -5);
  archShape.lineTo(6, 0);
  archShape.absarc(0, 0, 6, 0, Math.PI, false);
  archShape.lineTo(-6, -5);
  archShape.closePath();
  const archGeometry = new T.ExtrudeGeometry(archShape, {
    depth: 9,
    bevelEnabled: true,
    bevelSize: 0.45,
    bevelThickness: 0.45,
    bevelSegments: 1,
    curveSegments: 9,
  });
  for (let x = 35; x < WORLD_STOP; x += 270) {
    const arch = mesh(
      archGeometry,
      material('#5b9d87'),
      x,
      10,
      -123,
      0.65,
      0.65,
      0.65,
    );
    arch.rotation.y = -0.1;
    ball('#45ac60', x - 5.5, 13.5, -121, 2.4, 1.1, 3.6);
    ball('#45ac60', x + 5.5, 13.5, -121, 2.4, 1.1, 3.6);
  }

  // Palms are instanced in four batches, including curved segmented trunks.
  const leafGeometry = new T.BufferGeometry();
  leafGeometry.setAttribute(
    'position',
    new T.Float32BufferAttribute(
      [
        -0.12, 0, 0, 0.12, 0, 0, -0.8, 0.55, 1.45, 0.8, 0.55, 1.45, -0.43, 0.08,
        3.1, 0.43, 0.08, 3.1, 0, -0.8, 4.7,
      ],
      3,
    ),
  );
  leafGeometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);
  leafGeometry.computeVertexNormals();
  const palmTrunks: Instance[] = [];
  const palmBands: Instance[] = [];
  const palmLeaves: Instance[] = [];
  const palmLeavesLight: Instance[] = [];
  const coconuts: Instance[] = [];
  for (let index = -1; index < Math.ceil(LEVEL_END / 39) + 3; index += 1) {
    const x = index * 39 + 5 + noise(index) * 9;
    if (Math.abs(x - LOOP.x) < LOOP.radius + 11) continue;
    const z = -3 - noise(index + 6) * 4;
    const base = groundAt(x);
    const height = 7 + noise(index + 4) * 4;
    const lean = noise(index + 13) * 2 - 1;
    for (let section = 0; section < 7; section += 1) {
      const progress = (section + 0.5) / 7;
      const centerX = x + progress * progress * lean * 2;
      const radius = 0.47 - progress * 0.16;
      palmTrunks.push({
        x: centerX,
        y: base + progress * height,
        z,
        sx: radius,
        sy: height / 7 + 0.12,
        sz: radius,
        rz: -lean * progress * 0.32,
      });
      palmBands.push({
        x: centerX,
        y: base + progress * height + height / 14,
        z,
        sx: radius + 0.035,
        sy: 0.09,
        sz: radius + 0.035,
        rz: -lean * progress * 0.32,
      });
    }
    const crownX = x + lean * 2;
    for (let leaf = 0; leaf < 7; leaf += 1) {
      const values = {
        x: crownX,
        y: base + height,
        z,
        ry: (leaf * Math.PI * 2) / 7 + index,
        sx: 1.05,
        sy: 1.05,
        sz: 1.05,
      };
      (leaf % 2 ? palmLeaves : palmLeavesLight).push(values);
    }
    for (let fruit = 0; fruit < 3; fruit += 1)
      coconuts.push({
        x: crownX + Math.cos(fruit * 2) * 0.34,
        y: base + height - 0.35,
        z: z + Math.sin(fruit * 2) * 0.34,
        sx: 0.39,
        sy: 0.46,
        sz: 0.39,
      });
  }
  instances(geometry.cylinder, material(PALETTE.bark), palmTrunks);
  instances(geometry.cylinder, material('#e0a458'), palmBands);
  const leafMaterial = material('#21a850');
  const leafLightMaterial = material('#7acb32');
  leafMaterial.side = leafLightMaterial.side = T.DoubleSide;
  instances(leafGeometry, leafMaterial, palmLeaves);
  instances(leafGeometry, leafLightMaterial, palmLeavesLight);
  instances(geometry.ball, material('#905322'), coconuts);

  const flowerStems: Instance[] = [];
  const flowerPetals: Instance[] = [];
  const flowerCenters: Instance[] = [];
  for (let x = -8; x < WORLD_STOP; x += 26) {
    const height = 1.45 + noise(x + 4) * 0.9;
    const y = groundAt(x);
    const z = FRONT + 0.2;
    flowerStems.push({
      x,
      y: y + height / 2,
      z,
      sx: 0.07,
      sy: height,
      sz: 0.07,
    });
    flowerCenters.push({ x, y: y + height, z, sx: 0.31, sy: 0.31, sz: 0.12 });
    for (let petal = 0; petal < 8; petal += 1) {
      const angle = (petal * Math.PI) / 4;
      flowerPetals.push({
        x: x + Math.sin(angle) * 0.45,
        y: y + height + Math.cos(angle) * 0.45,
        z,
        sx: 0.19,
        sy: 0.32,
        sz: 0.085,
        rz: -angle,
      });
    }
  }
  instances(geometry.cylinder, material(PALETTE.emerald), flowerStems);
  instances(geometry.ball, material('#ffe052'), flowerPetals);
  instances(geometry.ball, material('#975226'), flowerCenters);

  const cloudEntries: Instance[] = [];
  for (let x = -100; x < WORLD_STOP + 200; x += 85) {
    const y = 24 + noise(x + 34) * 6;
    for (let puff = 0; puff < 5; puff += 1)
      cloudEntries.push({
        x: x + puff * 2.7,
        y: y + Math.sin(puff) * 0.9,
        z: -65,
        sx: 3 + noise(x + puff),
        sy: 1.2 + noise(puff) * 1.1,
        sz: 2.5,
      });
  }
  const cloudMaterial = new T.MeshBasicMaterial({ color: '#eefbfa' });
  const cloudMesh = instances(geometry.ball, cloudMaterial, cloudEntries);
  const sun = mesh(
    new T.CircleGeometry(3.7, 40),
    new T.MeshBasicMaterial({ color: '#fff0a6', fog: false }),
    START_X + 12,
    11,
    -150,
  );
  const sunHalo = mesh(
    new T.CircleGeometry(5.2, 40),
    new T.MeshBasicMaterial({
      color: '#fff7c9',
      transparent: true,
      opacity: 0.14,
      fog: false,
      depthWrite: false,
    }),
    START_X + 12,
    11,
    -150.1,
  );

  const ringMaterial = new T.MeshStandardMaterial({
    color: PALETTE.gold,
    metalness: 0.62,
    roughness: 0.21,
    emissive: '#965300',
    emissiveIntensity: 0.14,
  });
  const ringMesh = new T.InstancedMesh(
    geometry.ring,
    ringMaterial,
    rings.length,
  );
  ringMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  ringMesh.frustumCulled = false;
  scene.add(ringMesh);

  // Physics launch pads, springs, spikes and patrol robots share their exact
  // source coordinates with the simulation. Decorative geometry stays behind.
  for (const boost of boosts) {
    const group = new T.Group();
    group.position.set(boost.x, boost.y, CHARACTER_Z - 0.8);
    group.rotation.z = Math.atan(groundSlope(boost.x));
    scene.add(group);
    box('#d3442f', boost.width / 2, 0.11, 0, boost.width, 0.23, 2.3, group);
    box(
      '#ffe169',
      boost.width / 2,
      0.25,
      0,
      boost.width - 0.4,
      0.07,
      2.1,
      group,
    );
    for (let index = 0; index < boost.width - 1; index += 2.5) {
      const arrow = new T.Mesh(
        new T.ConeGeometry(0.65, 1.1, 3),
        material('#f0512a'),
      );
      arrow.position.set(index + 0.8, 0.35, 0.05);
      arrow.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
      group.add(arrow);
    }
  }
  const springHeads: T.Group[] = [];
  for (const spring of springs) {
    const group = new T.Group();
    group.position.set(spring.x, spring.y, CHARACTER_Z - 0.3);
    scene.add(group);
    box('#20465e', 0, 0.13, 0, 2.3, 0.26, 2, group);
    const coilPoints: T.Vector3[] = [];
    for (let index = 0; index < 60; index += 1) {
      const t = index / 59;
      coilPoints.push(
        new T.Vector3(
          Math.cos(t * Math.PI * 8) * 0.58,
          0.25 + t * 1.05,
          Math.sin(t * Math.PI * 8) * 0.58,
        ),
      );
    }
    const coil = new T.Mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(coilPoints), 60, 0.1, 5, false),
      material('#d7e5da', 0.6),
    );
    group.add(coil);
    const head = new T.Group();
    head.position.y = 1.43;
    group.add(head);
    box('#ec373c', 0, 0, 0, 2.4, 0.35, 2.2, head);
    box('#ffdb55', 0, 0.2, 0, 1.7, 0.05, 1.6, head);
    springHeads.push(head);
  }
  for (const hazard of hazards) {
    box(
      '#557284',
      hazard.x + hazard.width / 2,
      hazard.y + 0.11,
      CHARACTER_Z,
      hazard.width,
      0.22,
      1.7,
    );
    for (let x = 0.65; x < hazard.width; x += 1.2)
      mesh(
        geometry.cone,
        material('#e4f1f4', 0.38, 0.28),
        hazard.x + x,
        hazard.y + hazard.height / 2 + 0.18,
        CHARACTER_Z,
        0.5,
        hazard.height,
        0.5,
      );
  }
  const enemyMeshes = enemies.map(() => {
    const group = new T.Group();
    scene.add(group);
    ball('#de354b', 0, 0.73, 0, 1.28, 0.72, 0.85, group);
    box('#e3f2e9', 0.32, 0.72, 0.72, 1.3, 0.33, 0.13, group);
    for (const side of [-1, 1]) {
      const leg = box(
        '#344b62',
        side * 1.08,
        0.28,
        0.15,
        0.75,
        0.21,
        0.3,
        group,
      );
      leg.rotation.z = side * 0.4;
      ball('#f84051', side * 1.6, 0.96, 0.05, 0.46, 0.51, 0.4, group);
      box('#172f43', side * 0.36 + 0.1, 1.16, 0.55, 0.1, 0.7, 0.1, group);
      ball('#ffefa1', side * 0.36 + 0.1, 1.55, 0.55, 0.22, 0.22, 0.22, group);
      ball('#122b43', side * 0.36 + 0.1, 1.55, 0.74, 0.09, 0.11, 0.08, group);
    }
    return group;
  });

  const checkpointOrbs: T.Mesh[] = [];
  for (const checkpoint of checkpoints) {
    mesh(
      geometry.cylinder,
      material('#eef5e3'),
      checkpoint.x,
      checkpoint.y + 2,
      -0.3,
      0.18,
      4,
      0.18,
    );
    const orb = ball(
      '#d53c57',
      checkpoint.x,
      checkpoint.y + 4.1,
      -0.3,
      0.73,
      0.73,
      0.73,
    );
    checkpointOrbs.push(orb);
    mesh(
      new T.TorusGeometry(0.83, 0.085, 6, 20),
      ringMaterial,
      checkpoint.x,
      checkpoint.y + 4.1,
      -0.3,
    );
  }
  const goal = new T.Group();
  goal.position.set(LEVEL_END, groundAt(LEVEL_END), 1);
  scene.add(goal);
  box('#e0f2dc', 0, 3.1, 0, 0.28, 6.2, 0.3, goal);
  const goalBoard = new T.Group();
  goalBoard.position.y = 5.3;
  goal.add(goalBoard);
  box('#126dac', 0, 0, 0, 5.7, 3.7, 0.28, goalBoard);
  box('#ffdf68', 0, 0, 0.18, 5.4, 3.4, 0.1, goalBoard);
  ball('#2088e7', 0, 0, 0.26, 1.3, 1.3, 0.1, goalBoard);
  const emblem = createHedgehog();
  emblem.root.position.set(0.3, -1.55, 0.5);
  emblem.root.scale.setScalar(1.5);
  goalBoard.add(emblem.root);

  const hedgehog = createHedgehog();
  scene.add(hedgehog.root);
  const shadowMaterial = new T.MeshBasicMaterial({
    color: '#0b514c',
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const shadow = mesh(
    new T.CircleGeometry(1, 24),
    shadowMaterial,
    START_X,
    groundAt(START_X) + 0.07,
    CHARACTER_Z,
    1.15,
    0.5,
    1,
  );
  shadow.rotation.x = -Math.PI / 2;

  const trailMaterial = new T.MeshBasicMaterial({
    color: '#32aaf8',
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const speedTrail = Array.from({ length: 7 }, () => {
    const part = new T.Mesh(geometry.ball, trailMaterial);
    scene.add(part);
    return part;
  });
  const sparkleGeometry = new T.OctahedronGeometry(0.27);
  const sparkleMaterial = new T.MeshBasicMaterial({ color: '#fff59c' });
  const sparks = Array.from({ length: 24 }, () => {
    const object = new T.Mesh(sparkleGeometry, sparkleMaterial);
    object.visible = false;
    scene.add(object);
    return { object, life: 0, vx: 0, vy: 0 };
  });
  let nextSpark = 0;
  let collectedBefore = new Set<number>();
  let cameraX = START_X + 7;
  let cameraY = groundAt(START_X) + 5.5;
  let cameraHalfHeight = 14;
  let previousPlayerX = START_X;
  let initialized = false;
  let visualTime = 0;
  const cameraTarget = new T.Vector3();
  const lastTrail = new T.Vector3(START_X, groundAt(START_X) + 1, CHARACTER_Z);
  const smoothedTrail = speedTrail.map(() => lastTrail.clone());

  function update(simulation: SonicSimulation, dt: number, aspect: number) {
    const player = simulation.player;
    const elapsed = simulation.state.time;
    const paused = simulation.state.phase === 'paused';
    const ready = simulation.state.phase === 'ready';
    const safeAspect = Math.max(aspect, 0.4);
    const portrait = safeAspect < 1;
    const delta = paused ? 0 : Math.min(Math.max(dt, 0), 0.05);
    visualTime += delta;
    const speed = Math.abs(player.vx);
    const loopNear = 1 - clamp((Math.abs(player.x - LOOP.x) - 25) / 48, 0, 1);
    // Portrait play needs readable character scale and a bounded forward offset.
    // The complete loop briefly takes priority over that close framing.
    const minimumHalfWidth = portrait
      ? T.MathUtils.lerp(13.5, 24, loopNear)
      : 18;
    const visibleHalfWidth = Math.max(
      cameraHalfHeight * safeAspect,
      minimumHalfWidth,
    );
    const lookAheadLimit = portrait ? visibleHalfWidth * 0.34 : 21;
    const lookAhead =
      player.facing * Math.min(lookAheadLimit, 6 + speed * 0.18);
    const normalCameraX = player.x + lookAhead;
    const readyHalfHeight = Math.max(12, minimumHalfWidth / safeAspect);
    const targetX = ready
      ? player.x - readyHalfHeight * safeAspect * 0.2
      : T.MathUtils.lerp(
          normalCameraX,
          portrait ? LOOP.x : LOOP.x + 3,
          portrait ? loopNear : loopNear * 0.8,
        );
    const terrainY = groundAt(player.x);
    const normalCameraY = Math.max(terrainY + 5.5, player.y + 2.5);
    const targetY = ready
      ? terrainY + 4
      : T.MathUtils.lerp(normalCameraY, LOOP.y + 2.5, loopNear);
    const targetHeight = ready
      ? 12
      : T.MathUtils.lerp(14 + Math.min(speed * 0.055, 5), 26, loopNear);
    const smooth = 1 - Math.exp(-delta * 4.5);
    if (!initialized || ready || Math.abs(cameraX - targetX) > 110) {
      cameraX = targetX;
      cameraY = targetY;
      cameraHalfHeight = targetHeight;
      initialized = true;
      smoothedTrail.forEach((point) =>
        point.set(player.x, player.y + 1, CHARACTER_Z),
      );
    } else {
      if (portrait && delta > 0) {
        // Preserve the screen offset while moving fast; smoothing applies to the
        // look-ahead change rather than accumulating a full speed / damping lag.
        cameraX += (player.x - previousPlayerX) * (1 - loopNear);
      }
      cameraX += (targetX - cameraX) * smooth;
      cameraY += (targetY - cameraY) * smooth;
      cameraHalfHeight += (targetHeight - cameraHalfHeight) * smooth;
    }
    previousPlayerX = player.x;
    const halfHeight = Math.max(
      cameraHalfHeight,
      minimumHalfWidth / safeAspect,
    );
    camera.left = -halfHeight * safeAspect;
    camera.right = halfHeight * safeAspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    camera.position.set(cameraX, cameraY + 18, 87);
    cameraTarget.set(cameraX, cameraY, 0);
    camera.lookAt(cameraTarget);
    sun.position.x = cameraX + 12;
    sunHalo.position.x = cameraX + 12;
    cloudMesh.position.x = Math.sin(visualTime * 0.04) * 3;

    hedgehog.root.position.set(player.x, player.y, CHARACTER_Z);
    hedgehog.update(
      player.vx,
      elapsed,
      player.grounded,
      player.rolling,
      player.facing,
      player.angle,
      player.invulnerable,
    );
    const altitude = Math.max(0, player.y - terrainY);
    shadow.position.set(player.x, terrainY + 0.08, CHARACTER_Z - 0.08);
    shadow.rotation.set(-Math.PI / 2, Math.atan(groundSlope(player.x)), 0);
    shadow.scale.set(1.1 + altitude * 0.025, 0.5 + altitude * 0.01, 1);
    shadowMaterial.opacity = Math.max(0.06, 0.26 - altitude * 0.013);
    shadow.visible = player.loopProgress === null;

    rings.forEach((ring, index) => {
      const collected = simulation.collected[index];
      if (collected && !collectedBefore.has(index)) {
        for (let piece = 0; piece < 4; piece += 1) {
          const spark = sparks[nextSpark++ % sparks.length];
          spark.object.position.set(ring.x, ring.y, CHARACTER_Z);
          spark.life = 0.45;
          spark.vx = Math.cos((piece * Math.PI) / 2) * 4;
          spark.vy = Math.sin((piece * Math.PI) / 2) * 4 + 3;
        }
      }
      const scale = collected ? 0 : 1;
      ringMesh.setMatrixAt(
        index,
        instanceMatrix({
          x: ring.x,
          y: ring.y,
          z: CHARACTER_Z,
          sx: scale,
          sy: scale,
          sz: scale,
          ry: visualTime * 2.3 + index * 0.17,
        }),
      );
    });
    ringMesh.instanceMatrix.needsUpdate = true;
    collectedBefore = new Set(
      simulation.collected.flatMap((collected, index) =>
        collected ? [index] : [],
      ),
    );
    sparks.forEach((spark) => {
      spark.life = Math.max(0, spark.life - delta);
      spark.object.visible = spark.life > 0;
      if (spark.life > 0) {
        spark.object.position.x += spark.vx * delta;
        spark.object.position.y += spark.vy * delta;
        spark.vy -= delta * 11;
        spark.object.rotation.z += delta * 7;
        spark.object.scale.setScalar(spark.life / 0.45);
      }
    });
    enemyMeshes.forEach((enemy, index) => {
      const location = simulation.enemyPositions[index];
      enemy.visible = simulation.enemyAlive[index];
      enemy.position.set(
        location.x,
        location.y + Math.abs(Math.sin(elapsed * 7 + index)) * 0.08,
        CHARACTER_Z,
      );
    });
    checkpointOrbs.forEach((orb, index) => {
      orb.material = material(
        simulation.state.checkpoint >= checkpoints[index].x
          ? '#42ecb5'
          : '#d53c57',
      );
    });
    springHeads.forEach((head, index) => {
      const near = Math.abs(player.x - springs[index].x) < 3 && player.vy > 20;
      head.position.y = near ? 1.6 + Math.sin(elapsed * 40) * 0.2 : 1.43;
    });
    goalBoard.rotation.y =
      simulation.state.phase === 'won' ? Math.sin(visualTime * 2) * 0.5 : 0;
    const trailActive = speed > 35 || player.charging > 0.2;
    smoothedTrail.forEach((point, index) => {
      const previous =
        index === 0 ? hedgehog.root.position : smoothedTrail[index - 1];
      const target = lastTrail.copy(previous);
      if (index === 0) target.y += 0.85;
      point.lerp(target, 1 - Math.exp(-delta * 18));
      const part = speedTrail[index];
      part.visible = trailActive;
      part.position.copy(point);
      const size = (1 - index / 8) * 0.67;
      part.scale.set(size, size, size * 0.8);
    });
  }

  function dispose() {
    const geometries = new Set<T.BufferGeometry>();
    const materials = new Set<T.Material>();
    scene.traverse((object) => {
      if (object instanceof T.Mesh) {
        geometries.add(object.geometry);
        const values = Array.isArray(object.material)
          ? object.material
          : [object.material];
        values.forEach((value) => materials.add(value));
      }
    });
    materialCache.forEach((value) => materials.add(value));
    Object.values(geometry).forEach((value) => geometries.add(value));
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    textures.forEach((value) => value.dispose());
    scene.clear();
  }

  return { scene, camera, update, dispose };
}
