import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RetroView } from '../types.ts';
import { covers, OBJECTIVE } from './world.ts';
import { WatchpointSimulation, type Bot, type Ally } from './simulation.ts';

const palette = {
  white: '#eff4ef',
  stone: '#d8d6c2',
  ink: '#223448',
  blue: '#16b9de',
  coral: '#ec7151',
  dark: '#405764',
  gold: '#f0c35b',
};

/** Original Sunward Harbor geometry and hero equipment; no downloaded art assets. */
export function mountWatchpoint(
  canvas: HTMLCanvasElement,
  game: WatchpointSimulation,
): RetroView {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  const scene = new T.Scene();
  scene.background = new T.Color('#73bcd9');
  scene.fog = new T.Fog('#8ebfcb', 55, 125);
  const camera = new T.PerspectiveCamera(79, 1, 0.055, 155);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  scene.add(new T.HemisphereLight('#c9ecff', '#797c75', 1.05));
  const sun = new T.DirectionalLight('#ffe6b8', 2.55);
  sun.position.set(-23, 34, 20);
  sun.target.position.set(0, 0, -5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -31,
    right: 31,
    top: 40,
    bottom: -31,
    near: 1,
    far: 105,
  });
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.05;
  scene.add(sun.target);
  scene.add(sun);
  const rim = new T.DirectionalLight('#70c6e4', 0.45);
  rim.position.set(15, 8, -30);
  scene.add(rim);
  const world = new T.Group();
  scene.add(world);
  const geometries = new Set<T.BufferGeometry>();
  const textures = new Set<T.Texture>();
  const materials = new Map<string, T.MeshStandardMaterial>();
  const extras = new Set<T.Material>();
  const boxShape = new T.BoxGeometry(1, 1, 1),
    cylinder = new T.CylinderGeometry(1, 1, 1, 12);
  const sphere = new T.SphereGeometry(1, 12, 8),
    cone = new T.ConeGeometry(1, 1, 8);
  const torus = new T.TorusGeometry(1, 0.045, 6, 48),
    octa = new T.OctahedronGeometry(1);
  const circle = new T.CircleGeometry(1, 24);
  const bevelOutline = new T.Shape();
  bevelOutline.moveTo(-0.43, -0.5);
  bevelOutline.lineTo(0.43, -0.5);
  bevelOutline.lineTo(0.5, -0.43);
  bevelOutline.lineTo(0.5, 0.43);
  bevelOutline.lineTo(0.43, 0.5);
  bevelOutline.lineTo(-0.43, 0.5);
  bevelOutline.lineTo(-0.5, 0.43);
  bevelOutline.lineTo(-0.5, -0.43);
  bevelOutline.closePath();
  const bevel = new T.ExtrudeGeometry(bevelOutline, {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.045,
    bevelSegments: 1,
    steps: 1,
  });
  bevel.translate(0, 0, -0.5);
  const sightRing = new T.TorusGeometry(1, 0.125, 6, 12);
  [
    boxShape,
    cylinder,
    sphere,
    cone,
    torus,
    octa,
    circle,
    bevel,
    sightRing,
  ].forEach((shape) => geometries.add(shape));
  let disposed = false;
  let drawCalls = 0;

  function mat(
    color: string,
    glow = false,
    weapon = false,
  ): T.MeshStandardMaterial {
    const key = `${color}:${glow}:${weapon}`;
    let material = materials.get(key);
    if (!material) {
      material = new T.MeshStandardMaterial({
        color,
        roughness: weapon ? 0.62 : 0.8,
        metalness: weapon ? 0.25 : 0.02,
        emissive: glow ? color : '#000000',
        emissiveIntensity: glow ? 0.9 : 0,
        depthTest: !weapon,
        depthWrite: !weapon,
      });
      materials.set(key, material);
    }
    return material;
  }
  function mesh(
    shape: T.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: T.Object3D = world,
    glow = false,
    weapon = false,
  ): T.Mesh {
    const object = new T.Mesh(shape, mat(color, glow, weapon));
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    object.castShadow = !weapon && !glow;
    object.receiveShadow = !weapon && !glow;
    parent.add(object);
    if (weapon) object.renderOrder = 20;
    return object;
  }
  const box = (
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: T.Object3D = world,
    glow = false,
  ) => mesh(boxShape, color, x, y, z, sx, sy, sz, parent, glow);
  function link(
    parent: T.Object3D,
    a: T.Vector3,
    b: T.Vector3,
    radius: number,
    color: string,
    weapon = false,
  ): T.Mesh {
    const delta = b.clone().sub(a),
      object = mesh(
        cylinder,
        color,
        0,
        0,
        0,
        radius,
        delta.length(),
        radius,
        parent,
        false,
        weapon,
      );
    object.position.copy(a).addScaledVector(delta, 0.5);
    object.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return object;
  }
  function sign(
    value: string,
    width: number,
    height: number,
    fg: string,
    bg: string,
    x: number,
    y: number,
    z: number,
  ): T.Mesh {
    const surface = document.createElement('canvas');
    surface.width = 1024;
    surface.height = 256;
    const ctx = surface.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = fg;
    ctx.font = '900 115px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, 512, 135, 930);
    const texture = new T.CanvasTexture(surface);
    texture.colorSpace = T.SRGBColorSpace;
    textures.add(texture);
    const material = new T.MeshBasicMaterial({ map: texture });
    extras.add(material);
    const shape = new T.PlaneGeometry(width, height);
    geometries.add(shape);
    const result = new T.Mesh(shape, material);
    result.position.set(x, y, z);
    world.add(result);
    return result;
  }
  const shadowMat = new T.MeshBasicMaterial({
    color: '#425b65',
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  extras.add(shadowMat);
  function shadow(parent: T.Object3D, radius: number): T.Mesh {
    const object = new T.Mesh(circle, shadowMat);
    object.rotation.x = -Math.PI / 2;
    object.position.y = 0.025;
    object.scale.set(radius, radius * 0.6, 1);
    parent.add(object);
    return object;
  }

  // Warm concrete promenade, tram tracks and a turquoise harbor skyline.
  box('#d8d9c9', 0, -0.25, 0, 44, 0.5, 55);
  box('#a2c6c5', 0, -0.32, -55, 160, 0.25, 65);
  for (let z = -25; z < 25; z += 3) {
    box('#b8c4ba', 0, 0.008, z, 40, 0.012, 0.045);
    for (let x = -18; x < 20; x += 4)
      box(
        '#b8c4ba',
        x + (Math.floor(z / 3) % 2) * 2,
        0.008,
        z + 1.5,
        0.04,
        0.012,
        3,
      );
  }
  for (const side of [-1, 1]) {
    box('#b8baaa', side * 18, 0.075, 0, 4, 0.15, 52);
    box('#f8efc8', side * 15.7, 0.018, 0, 0.13, 0.018, 52);
    box('#879d9f', side * 1.6, 0.018, 12, 0.13, 0.018, 24);
    box('#eef4df', side * 1.35, 0.018, 12, 0.05, 0.018, 24);
    for (let z = -21; z <= 20; z += 10) {
      const height = 7 + ((z + 21) % 3) * 2.5,
        x = side * 25;
      const facade =
        (z + 21) % 20 === 0 ? '#d6d9c9' : side < 0 ? '#c88b6d' : '#739ba4';
      box(facade, x, height / 2, z, 10, height, 9.4);
      box(
        side < 0 ? '#e9aa77' : '#92bbc4',
        x - side * 0.1,
        height + 0.35,
        z,
        10.4,
        0.7,
        9.8,
      );
      box('#567783', x, 1.2, z, 10.5, 2.4, 9.9);
      box('#b6bfaf', side * 19.82, 2.47, z, 0.42, 0.18, 9.5);
      for (const edge of [-4.5, 4.5])
        box(
          '#e0dec8',
          side * 19.87,
          height * 0.55,
          z + edge,
          0.29,
          height * 0.85,
          0.33,
        );
      for (let floor = 3; floor < height; floor += 2.3)
        for (let window = -3; window <= 3; window += 3) {
          box('#234f65', side * 19.94, floor, z + window, 0.04, 1.4, 1.6);
          box(
            '#c9eff0',
            side * 19.9,
            floor + 0.55,
            z + window,
            0.055,
            0.09,
            1.6,
          );
          box(
            '#f2e7bc',
            side * 19.6,
            floor - 0.85,
            z + window,
            0.65,
            0.18,
            2.2,
          );
        }
      box('#df7355', side * 19.2, 2.9, z, 1.6, 0.2, 6.6);
      for (let i = -3; i <= 3; i += 1)
        box(
          i % 2 ? '#f7edd1' : '#db7153',
          side * 19.2,
          2.8,
          z + i,
          1.7,
          0.16,
          0.45,
        );
      box('#385866', side * 19.92, 1.1, z, 0.03, 2.2, 2.2);
      for (const gap of [-3, 3]) {
        box('#243f50', side * 19.65, 1.23, z + gap, 0.2, 1.3, 1.5);
        for (let vent = 0; vent < 5; vent++)
          box(
            '#71939e',
            side * 19.48,
            0.82 + vent * 0.2,
            z + gap,
            0.03,
            0.06,
            1.34,
          );
      }
    }
  }
  // Harbor pennants and painted route markings make the avenue feel inhabited.
  for (const side of [-1, 1]) {
    const banner = sign(
      side < 0 ? 'SUN / 24' : 'HARBOR A',
      2.2,
      4.2,
      '#fff2cf',
      side < 0 ? '#cf563b' : '#176d89',
      side * 18.2,
      5.2,
      6,
    );
    banner.rotation.y = -side * 0.28;
    box('#344f62', side * 18.2, 7.35, 6, 2.4, 0.15, 0.15);
    const route = sign(
      side < 0 ? 'NECTAR' : 'TRANSIT 03',
      4.3,
      0.85,
      '#fff0c9',
      side < 0 ? '#b85d48' : '#2a667b',
      side * 18.3,
      2.1,
      16,
    );
    route.rotation.y = -side * 0.42;
  }
  for (const z of [15, 11, 3, -2]) {
    box('#718f99', 0, 0.018, z, 1.1, 0.018, 1.7);
    const left = box('#f5e8b9', -0.25, 0.032, z - 0.3, 0.1, 0.012, 0.9);
    left.rotation.y = -0.55;
    const right = box('#f5e8b9', 0.25, 0.032, z - 0.3, 0.1, 0.012, 0.9);
    right.rotation.y = 0.55;
  }
  for (const x of [-8, -6.5, -5, -3.5, 3.5, 5, 6.5, 8])
    box('#e8debe', x, 0.02, 18, 0.65, 0.02, 3);
  box('#f4e2b9', 0, 6.5, -26.5, 41, 1.7, 3.3);
  box('#cd8d59', -18, 3.2, -26.5, 3.2, 6.4, 3.3);
  box('#cd8d59', 18, 3.2, -26.5, 3.2, 6.4, 3.3);
  box('#e9b56a', 0, 7.45, -26.5, 42, 0.3, 4);
  sign('SUNWARD HARBOR', 14, 2.9, '#fff5d5', '#315c70', 0, 6.6, -24.8);
  sign('03  /  SKYLINE TRANSIT', 8, 1.1, '#27586d', '#f2dfab', 0, 3.7, -26.4);
  for (const z of [-25.8, 23.8]) {
    box('#e8ebda', 0, 0.55, z, 39.6, 0.1, 0.18);
    box('#6f9ba6', 0, 1.05, z, 39.6, 0.12, 0.16);
    for (let x = -19; x <= 19; x += 3.8)
      box('#658c9b', x, 0.56, z, 0.13, 1.1, 0.14);
  }
  for (let i = 0; i < 8; i++) {
    const height = 13 + (i % 3) * 6,
      x = (i - 3.5) * 14;
    mesh(
      cylinder,
      i % 2 ? '#a0beca' : '#c8d8d5',
      x,
      height / 2,
      -48 - (i % 2) * 10,
      5,
      height,
      5,
    );
    mesh(cone, '#dce9df', x, height + 1.4, -48 - (i % 2) * 10, 5.2, 2.8, 5.2);
    box('#638d9a', x, height + 4, -48 - (i % 2) * 10, 0.35, 5.8, 0.35);
    for (let floor = 4; floor < height; floor += 3.4)
      mesh(cylinder, '#7aa4b0', x, floor, -48 - (i % 2) * 10, 5.05, 0.5, 5.05);
  }
  for (const [x, z] of [
    [-16, 16],
    [16, 16],
    [-16, -17],
    [16, -20],
    [-16, -4],
  ]) {
    mesh(cylinder, '#f1e4c7', x, 0.35, z, 1.4, 0.7, 1.4);
    mesh(cylinder, '#8a7760', x, 3.3, z, 0.22, 6, 0.22);
    for (let i = 0; i < 7; i++) {
      const leaf = mesh(
        sphere,
        i % 2 ? '#61a689' : '#438f79',
        x,
        6.3,
        z,
        0.45,
        0.14,
        2.7,
      );
      leaf.rotation.y = (i * Math.PI * 2) / 7;
      leaf.rotation.x = 0.22;
      leaf.position.x += Math.sin(leaf.rotation.y) * 1.1;
      leaf.position.z += Math.cos(leaf.rotation.y) * 1.1;
    }
  }
  for (const [x, z] of [
    [-14, 5],
    [14, 11],
    [-14, -18],
    [14, -12],
  ]) {
    box('#486b75', x, 2.5, z, 0.13, 5, 0.13);
    box('#486b75', x + 0.55, 5, z, 1.2, 0.13, 0.13);
    box('#e4f9ec', x + 0.65, 4.9, z, 0.8, 0.09, 0.35, world, true);
  }
  for (const cover of covers) {
    const { x, z, width: w, depth: d, height: h } = cover;
    if (cover.kind === 'uplink') continue;
    box(palette.white, x, h / 2, z, w, h, d);
    box('#77939a', x, 0.13, z, w + 0.15, 0.26, d + 0.15);
    if (cover.kind === 'planter') {
      box('#af8872', x, h - 0.04, z, w - 0.2, 0.1, d - 0.2);
      box(
        palette.blue,
        x,
        h * 0.42,
        z + d / 2 + 0.008,
        w * 0.6,
        0.08,
        0.018,
        world,
        true,
      );
      for (let i = 0; i < 5; i++) {
        const bush = mesh(
          sphere,
          i % 2 ? '#356d62' : '#508f70',
          x - w * 0.4 + i * w * 0.2,
          h + 0.22,
          z,
          w * 0.13,
          0.35,
          d * 0.34,
        );
        bush.rotation.y = i;
        mesh(
          octa,
          '#f3b38e',
          x - w * 0.4 + i * w * 0.2,
          h + 0.48,
          z + 0.2,
          0.12,
          0.14,
          0.12,
        );
      }
    } else if (cover.kind === 'kiosk') {
      box('#285b70', x, h * 0.58, z + d / 2 + 0.016, w * 0.86, h * 0.58, 0.03);
      box(palette.coral, x, h + 0.14, z, w + 0.6, 0.28, d + 0.6);
      sign(
        x < 0 ? 'NECTAR / 24' : 'METRO / A',
        w * 0.86,
        0.6,
        '#f9f2dc',
        '#315368',
        x,
        h - 0.3,
        z + d / 2 + 0.045,
      );
      box('#e5c572', x, 0.7, z + d / 2 + 0.12, w * 0.88, 0.14, 0.38);
    } else {
      for (const offset of [-0.3, 0.3])
        box('#518a9f', x + w * offset, h / 2, z, 0.18, h + 0.1, d + 0.08);
      box('#eab951', x, h * 0.7, z + d / 2 + 0.01, w * 0.24, 0.18, 0.03);
    }
  }
  // Static map geometry is merged by material; animated actors remain separate.
  world.updateMatrixWorld(true);
  const batches = new Map<T.Material, T.BufferGeometry[]>();
  const staticMeshes: T.Mesh[] = [];
  world.traverse((object) => {
    if (
      object instanceof T.Mesh &&
      !Array.isArray(object.material) &&
      object.material instanceof T.MeshStandardMaterial
    )
      staticMeshes.push(object);
  });
  for (const object of staticMeshes) {
    const material = object.material as T.Material;
    const shapes = batches.get(material) || [];
    shapes.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
    batches.set(material, shapes);
    object.removeFromParent();
  }
  for (const [material, shapes] of batches) {
    const merged = mergeGeometries(shapes, false);
    shapes.forEach((shape) => shape.dispose());
    if (merged) {
      geometries.add(merged);
      const batch = new T.Mesh(merged, material);
      batch.castShadow = true;
      batch.receiveShadow = true;
      scene.add(batch);
    }
  }

  const objective = new T.Group();
  objective.position.set(0, 0, -8);
  scene.add(objective);
  mesh(cylinder, '#f0e6cb', 0, 0.23, 0, 1.4, 0.46, 1.4, objective);
  mesh(cylinder, '#607d8e', 0, 1.3, 0, 0.38, 2.25, 0.38, objective);
  const crystal = mesh(
    octa,
    '#51daf2',
    0,
    2.55,
    0,
    0.6,
    0.9,
    0.6,
    objective,
    true,
  );
  const halo = mesh(
    torus,
    '#b7fbff',
    0,
    2.5,
    0,
    0.95,
    0.95,
    0.95,
    objective,
    true,
  );
  halo.rotation.x = Math.PI / 2;
  const ring = mesh(
    torus,
    '#4ee3f3',
    OBJECTIVE.x,
    0.055,
    OBJECTIVE.z,
    OBJECTIVE.radius,
    OBJECTIVE.radius,
    OBJECTIVE.radius,
    scene,
    true,
  );
  ring.rotation.x = Math.PI / 2;
  const beacon = new T.Group();
  scene.add(beacon);
  mesh(cylinder, '#d4efe1', 0, 0.16, 0, 0.34, 0.3, 0.34, beacon);
  mesh(sphere, '#81f5b0', 0, 0.37, 0, 0.25, 0.17, 0.25, beacon, true);
  const healRing = mesh(
    torus,
    '#89ffb1',
    0,
    0.055,
    0,
    4.2,
    4.2,
    4.2,
    beacon,
    true,
  );
  healRing.rotation.x = Math.PI / 2;

  type Actor = {
    root: T.Group;
    leftLeg: T.Group;
    rightLeg: T.Group;
    leftArm: T.Group;
    rightArm: T.Group;
    head: T.Group;
    hp: T.Mesh;
    halo: T.Mesh;
    flash: T.Mesh;
  };
  const actors = new Map<number, Actor>();
  function humanoid(friendly: boolean, elite: boolean): Actor {
    const root = new T.Group();
    scene.add(root);
    const armor = friendly ? '#1689a6' : elite ? '#a4384b' : '#ce5e43';
    const trim = friendly ? '#78e3e2' : '#ffb477';
    const dark = '#293d51';
    shadow(root, 0.65);
    mesh(bevel, dark, 0, 0.99, 0, 0.44, 0.23, 0.3, root);
    const chest = mesh(bevel, armor, 0, 1.3, 0, 0.67, 0.57, 0.35, root);
    chest.rotation.z = 0.02;
    mesh(
      bevel,
      friendly ? '#cee7df' : '#efae88',
      0,
      1.44,
      -0.2,
      0.44,
      0.13,
      0.055,
      root,
    );
    box(trim, 0, 1.28, -0.208, 0.08, 0.17, 0.035, root, true);
    mesh(bevel, dark, 0, 1.23, 0.22, 0.31, 0.42, 0.18, root);
    mesh(cylinder, trim, -0.23, 1.26, 0.24, 0.06, 0.33, 0.06, root);
    mesh(cylinder, trim, 0.23, 1.26, 0.24, 0.06, 0.33, 0.06, root);
    mesh(cylinder, dark, 0, 1.61, 0, 0.1, 0.13, 0.1, root);
    const head = new T.Group();
    head.position.y = 1.77;
    root.add(head);
    mesh(bevel, armor, 0, 0.015, 0, 0.4, 0.32, 0.35, head);
    mesh(bevel, dark, 0, -0.018, -0.18, 0.35, 0.13, 0.05, head);
    box(trim, 0, -0.015, -0.214, 0.28, 0.035, 0.02, head, true);
    mesh(bevel, '#cfcebe', 0, -0.13, -0.08, 0.25, 0.075, 0.2, head);
    mesh(cylinder, dark, -0.23, 0, 0, 0.073, 0.07, 0.073, head).rotation.z =
      Math.PI / 2;
    if (elite) mesh(bevel, '#edb858', 0, 0.19, 0.035, 0.08, 0.1, 0.31, head);
    function limb(side: number, leg: boolean): T.Group {
      const group = new T.Group();
      group.position.set(side * (leg ? 0.17 : 0.4), leg ? 0.95 : 1.44, 0);
      root.add(group);
      const length = leg ? 0.46 : 0.29;
      // Narrow undersuit cylinders, angular armor plates, and visible knees/elbows.
      mesh(
        cylinder,
        dark,
        0,
        -length / 2,
        0,
        leg ? 0.115 : 0.075,
        length,
        leg ? 0.115 : 0.075,
        group,
      );
      mesh(
        bevel,
        armor,
        side * 0.018,
        -length * 0.44,
        -0.025,
        leg ? 0.23 : 0.2,
        length * 0.72,
        leg ? 0.23 : 0.2,
        group,
      );
      if (!leg)
        mesh(bevel, armor, side * 0.025, 0.025, 0, 0.26, 0.2, 0.28, group);
      mesh(sphere, '#23374a', 0, -length, 0, 0.095, 0.09, 0.095, group);
      mesh(
        cylinder,
        dark,
        0,
        -length * 1.47,
        -0.03,
        0.075,
        length * 0.9,
        0.075,
        group,
      );
      mesh(
        bevel,
        armor,
        0,
        -length * 1.48,
        -0.045,
        leg ? 0.21 : 0.17,
        length * 0.72,
        0.19,
        group,
      );
      mesh(bevel, trim, 0, -length * 1.1, -0.11, 0.12, 0.085, 0.035, group);
      if (leg)
        mesh(bevel, dark, 0, -length * 1.9, -0.09, 0.25, 0.14, 0.36, group);
      else mesh(bevel, dark, 0, -length * 1.95, -0.1, 0.16, 0.13, 0.17, group);
      return group;
    }
    const leftLeg = limb(-1, true),
      rightLeg = limb(1, true),
      leftArm = limb(-1, false),
      rightArm = limb(1, false);
    rightArm.rotation.set(0.9, 0, -0.18);
    leftArm.rotation.set(1.05, -0.6, 0.3);
    const rifle = new T.Group();
    rifle.position.set(0.3, 1.3, -0.5);
    root.add(rifle);
    mesh(bevel, '#233b4d', 0, 0, -0.13, 0.13, 0.15, 0.58, rifle);
    mesh(bevel, armor, 0, 0.045, -0.16, 0.15, 0.06, 0.36, rifle);
    mesh(bevel, '#263e4d', 0, -0.12, 0.04, 0.075, 0.17, 0.085, rifle);
    box(trim, 0.072, 0.03, -0.08, 0.02, 0.035, 0.22, rifle, true);
    mesh(
      cylinder,
      '#22384b',
      0,
      0,
      -0.45,
      0.034,
      0.18,
      0.034,
      rifle,
    ).rotation.x = Math.PI / 2;
    const flash = mesh(
      octa,
      '#ffdfa0',
      0,
      0,
      -0.59,
      0.11,
      0.11,
      0.2,
      rifle,
      true,
    );
    const hp = box(trim, 0, 2.25, 0, 0.8, 0.055, 0.018, root, true);
    const haloMesh = mesh(
      torus,
      trim,
      0,
      2.05,
      0,
      0.27,
      0.27,
      0.27,
      root,
      true,
    );
    haloMesh.rotation.x = Math.PI / 2;
    return {
      root,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      head,
      hp,
      halo: haloMesh,
      flash,
    };
  }
  const allyActors = game.allies.map(() => humanoid(true, false));

  // First-person arms and a bespoke bullpup solar rifle with an offset holographic sight.
  const gun = new T.Group();
  camera.add(gun);
  const weaponPart = (
    shape: T.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    glow = false,
  ) => mesh(shape, color, x, y, z, sx, sy, sz, gun, glow, true);
  // Chamfered receiver, tapered barrel shroud, stock and a compact ring optic.
  weaponPart(bevel, '#254153', 0, 0, -0.22, 0.115, 0.135, 0.56);
  weaponPart(bevel, '#d3d9ca', 0, 0.047, -0.24, 0.126, 0.074, 0.42);
  weaponPart(bevel, '#b6603e', 0.065, 0.006, -0.18, 0.022, 0.09, 0.29);
  weaponPart(bevel, '#688791', 0, 0.017, -0.51, 0.096, 0.112, 0.16);
  weaponPart(
    cylinder,
    '#243e4c',
    0,
    0.02,
    -0.64,
    0.027,
    0.16,
    0.027,
  ).rotation.x = Math.PI / 2;
  weaponPart(
    cylinder,
    '#546f7b',
    0,
    0.02,
    -0.729,
    0.035,
    0.045,
    0.035,
  ).rotation.x = Math.PI / 2;
  weaponPart(
    bevel,
    '#253e4b',
    0,
    -0.105,
    0.014,
    0.065,
    0.18,
    0.095,
  ).rotation.x = -0.28;
  weaponPart(bevel, '#567887', 0, -0.018, 0.11, 0.08, 0.105, 0.17);
  weaponPart(bevel, '#223c4f', 0, -0.008, 0.214, 0.115, 0.145, 0.048);
  const magazine = weaponPart(
    bevel,
    '#55717c',
    0,
    -0.13,
    -0.15,
    0.08,
    0.18,
    0.13,
  );
  magazine.rotation.x = 0.12;
  weaponPart(
    boxShape,
    '#4edce5',
    0.076,
    0.055,
    -0.1,
    0.012,
    0.022,
    0.115,
    true,
  );
  for (let i = 0; i < 5; i++)
    weaponPart(
      bevel,
      '#29424e',
      0.064,
      0.039,
      -0.3 - i * 0.028,
      0.014,
      0.04,
      0.015,
    );
  weaponPart(bevel, '#244354', 0, 0.093, -0.24, 0.052, 0.042, 0.115);
  weaponPart(sightRing, '#1c3546', 0, 0.15, -0.24, 0.039, 0.039, 0.042);
  weaponPart(sightRing, '#547e8b', 0, 0.15, -0.26, 0.039, 0.039, 0.015);
  weaponPart(octa, '#79edf0', 0, 0.15, -0.267, 0.0026, 0.0026, 0.0026, true);
  // A right trigger hand and a left support hand: fingers wrap around the grips.
  link(
    gun,
    new T.Vector3(0.06, -0.15, 0.026),
    new T.Vector3(0.2, -0.3, 0.2),
    0.045,
    '#247f91',
    true,
  );
  weaponPart(bevel, '#c4d9d1', 0.135, -0.21, 0.11, 0.1, 0.15, 0.12).rotation.z =
    -0.45;
  weaponPart(bevel, '#1d424f', 0.028, -0.091, 0.005, 0.073, 0.083, 0.093);
  for (let finger = 0; finger < 3; finger++)
    weaponPart(
      bevel,
      '#315563',
      -0.012,
      -0.061 - finger * 0.018,
      -0.044,
      0.064,
      0.015,
      0.029,
    );
  link(
    gun,
    new T.Vector3(-0.027, -0.089, -0.35),
    new T.Vector3(-0.19, -0.25, 0.1),
    0.044,
    '#247f91',
    true,
  );
  weaponPart(
    bevel,
    '#c4d9d1',
    -0.133,
    -0.19,
    -0.035,
    0.105,
    0.12,
    0.19,
  ).rotation.z = 0.22;
  weaponPart(bevel, '#244552', -0.026, -0.067, -0.365, 0.09, 0.052, 0.11);
  for (let finger = 0; finger < 3; finger++)
    weaponPart(
      bevel,
      '#436874',
      -0.07,
      -0.033 + finger * 0.011,
      -0.394 + finger * 0.023,
      0.022,
      0.026,
      0.018,
    );
  weaponPart(bevel, '#39c7d5', 0.15, -0.21, 0.125, 0.067, 0.034, 0.085);
  const muzzle = weaponPart(
    octa,
    '#ffe4a4',
    0,
    0.02,
    -0.78,
    0.065,
    0.065,
    0.13,
    true,
  );

  const fx = new T.Group();
  scene.add(fx);
  const tracePool: T.Mesh[] = [],
    boltPool: T.Mesh[] = [];
  const bright = new T.MeshBasicMaterial({ color: '#ffe1a0' }),
    red = new T.MeshBasicMaterial({ color: '#ff6e57' });
  extras.add(bright);
  extras.add(red);
  function effect(
    pool: T.Mesh[],
    index: number,
    material: T.Material,
    shape: T.BufferGeometry,
  ): T.Mesh {
    if (!pool[index]) {
      const object = new T.Mesh(shape, material);
      pool.push(object);
      fx.add(object);
    }
    pool[index].visible = true;
    return pool[index];
  }

  const hudCanvas = document.createElement('canvas');
  hudCanvas.width = 1280;
  hudCanvas.height = 720;
  const ctx = hudCanvas.getContext('2d')!;
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
  extras.add(hudMaterial);
  const hudShape = new T.PlaneGeometry(2, 2);
  geometries.add(hudShape);
  const hudScene = new T.Scene(),
    hudCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  const hudPlane = new T.Mesh(hudShape, hudMaterial);
  hudPlane.position.z = -1;
  hudScene.add(hudPlane);
  function hudText(
    text: string,
    x: number,
    y: number,
    size = 20,
    color = '#ffffff',
    align: CanvasTextAlign = 'left',
  ): void {
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }
  function panel(
    x: number,
    y: number,
    w: number,
    h: number,
    fill = 'rgba(25,48,65,.8)',
  ): void {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 9);
    ctx.fill();
  }
  function drawHud(): void {
    const p = game.player;
    ctx.clearRect(0, 0, 1280, 720);
    if (p.hurt > 0) {
      ctx.fillStyle = `rgba(241,67,65,${p.hurt * 0.42})`;
      ctx.fillRect(0, 0, 1280, 720);
    }
    panel(456, 18, 368, 72);
    hudText('A', 486, 44, 26, '#70e5f2');
    hudText('SUNWARD UPLINK', 640, 40, 17, '#f6f3df', 'center');
    hudText(`${Math.floor(game.capture)}%`, 519, 68, 20, '#75e9f4');
    hudText(
      `${Math.floor(game.enemyCapture)}%`,
      797,
      68,
      20,
      '#ffa48c',
      'right',
    );
    ctx.fillStyle = '#65808a';
    ctx.fillRect(578, 64, 124, 7);
    ctx.fillStyle = game.contested ? '#ffc76e' : '#5ee0ef';
    ctx.fillRect(578, 64, (124 * game.capture) / 100, 7);
    hudText(
      game.contested
        ? 'CONTESTED'
        : game.onPoint
          ? 'CAPTURING'
          : `${Math.round(Math.hypot(p.x, p.z + 7))} m → OBJECTIVE`,
      640,
      109,
      18,
      game.contested ? '#ffe197' : '#f7f9e8',
      'center',
    );
    const gap = p.ads ? 4 : 7 + p.recoil * 45;
    ctx.strokeStyle = '#25424f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(640 - gap - 8, 360);
    ctx.lineTo(640 - gap, 360);
    ctx.moveTo(640 + gap, 360);
    ctx.lineTo(640 + gap + 8, 360);
    ctx.moveTo(640, 360 - gap - 8);
    ctx.lineTo(640, 360 - gap);
    ctx.moveTo(640, 360 + gap);
    ctx.lineTo(640, 360 + gap + 8);
    ctx.stroke();
    ctx.strokeStyle = p.hit > 0 ? '#ffc875' : '#e8fff9';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (p.hit > 0) {
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(640 + side * 11, 349);
        ctx.lineTo(640 + side * 17, 343);
        ctx.moveTo(640 + side * 11, 371);
        ctx.lineTo(640 + side * 17, 377);
      }
      ctx.stroke();
    }
    panel(26, 611, 297, 85);
    ctx.fillStyle = '#e9eee0';
    ctx.beginPath();
    ctx.moveTo(40, 622);
    ctx.lineTo(95, 622);
    ctx.lineTo(111, 653);
    ctx.lineTo(95, 683);
    ctx.lineTo(40, 683);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#df8c58';
    ctx.fillRect(48, 635, 41, 23);
    ctx.fillStyle = '#244a5f';
    ctx.fillRect(43, 628, 54, 13);
    ctx.fillStyle = '#6ce5e7';
    ctx.fillRect(47, 643, 43, 8);
    hudText('HANA / SUNWARD', 120, 629, 13, '#b8dbe1');
    hudText(String(Math.ceil(p.hp)), 120, 657, 32);
    hudText('/ 200', 182, 663, 15, '#bcdae0');
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle =
        p.hp > i * 20 ? (p.hp < 60 ? '#ffa28b' : '#f3f9e4') : '#4b6570';
      ctx.fillRect(122 + i * 17, 680, 14, 5);
    }
    panel(996, 617, 260, 79);
    hudText(p.reload ? 'RELOADING' : 'SOLAR RIFLE', 1020, 636, 13, '#bedde0');
    hudText(
      p.reload
        ? `${Math.ceil(p.reload * 10) / 10}s`
        : String(p.ammo).padStart(2, '0'),
      1020,
      670,
      34,
    );
    hudText(`/ ${p.reserve}`, 1090, 675, 18, '#bad7de');
    hudText('[R]', 1223, 674, 16, '#ffce80', 'right');
    const skills = [
      { x: 413, key: 'K', label: 'DASH', value: p.dashCooldown },
      { x: 535, key: 'E', label: 'HEAL FIELD', value: p.healCooldown },
      {
        x: 681,
        key: 'Q',
        label: 'OVERDRIVE',
        value: p.ultimate >= 100 || p.overdrive > 0 ? 0 : 100 - p.ultimate,
      },
    ];
    for (const skill of skills) {
      const ready = skill.value === 0;
      panel(
        skill.x,
        640,
        skill.key === 'Q' ? 154 : 111,
        54,
        ready ? 'rgba(29,79,90,.93)' : 'rgba(31,49,61,.85)',
      );
      hudText(skill.key, skill.x + 16, 657, 18, ready ? '#f6d38c' : '#9caeb5');
      hudText(
        skill.key === 'Q'
          ? p.overdrive > 0
            ? 'ACTIVE'
            : `${Math.floor(p.ultimate)}%`
          : ready
            ? 'READY'
            : `${Math.ceil(skill.value)}s`,
        skill.x + 42,
        657,
        15,
        ready ? '#e0fff4' : '#b4c9d2',
      );
      hudText(skill.label, skill.x + 12, 682, 10, '#c4dfe1');
    }
    if (p.overdrive > 0) {
      hudText('SOLAR OVERDRIVE', 640, 156, 27, '#ffe5a2', 'center');
    }
    if (game.messageTime > 0) {
      panel(327, 548, 626, 37, 'rgba(28,57,72,.75)');
      hudText(game.message, 640, 567, 17, '#edf4e8', 'center');
    }
    if (p.respawn > 0) {
      panel(385, 285, 510, 117);
      hudText('REDEPLOYING', 640, 326, 37, '#ffd6a3', 'center');
      hudText(
        `${Math.ceil(p.respawn)} · 팀이 엄호 중입니다`,
        640,
        374,
        21,
        '#e9f2e4',
        'center',
      );
    }
    if (game.time < 7)
      hudText(
        '마우스 클릭: 조준 고정  ·  좌클릭 사격  ·  우클릭 정밀 조준',
        640,
        596,
        14,
        '#f4ffe7',
        'center',
      );
    hudTexture.needsUpdate = true;
  }
  function updateActor(
    actor: Actor,
    entity: Bot | Ally,
    friendly: boolean,
  ): void {
    const dead = entity.hp <= 0;
    actor.root.position.set(
      entity.x,
      dead ? -Math.min('dead' in entity ? entity.dead : 0, 1) * 0.4 : 0,
      entity.z,
    );
    actor.root.rotation.y = -entity.yaw;
    actor.root.visible = !dead || ('dead' in entity && entity.dead < 2);
    actor.root.rotation.z = dead ? Math.PI / 2 : 0;
    const gait = Math.sin(entity.walk * 2.7) * 0.34;
    actor.leftLeg.rotation.x = gait;
    actor.rightLeg.rotation.x = -gait;
    actor.head.rotation.y = Math.sin(game.time * 0.8 + entity.x) * 0.045;
    actor.hp.scale.x = Math.max(
      0.01,
      (0.8 * entity.hp) / ('maxHp' in entity ? entity.maxHp : 160),
    );
    actor.hp.rotation.y = camera.rotation.y - actor.root.rotation.y;
    actor.hp.visible = !dead;
    actor.halo.visible = friendly || ('windup' in entity && entity.windup > 0);
    actor.halo.scale.setScalar(
      'windup' in entity && entity.windup > 0
        ? 0.3 + entity.windup * 0.15
        : 0.2,
    );
    actor.flash.visible = !dead && entity.flash > 0;
  }

  return {
    render(width, height) {
      if (disposed || width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const desiredFov = game.player.ads ? 56 : 79;
      camera.fov += (desiredFov - camera.fov) * 0.25;
      camera.updateProjectionMatrix();
      const p = game.player,
        bob = p.moving && !p.respawn ? Math.sin(p.walk * 2.9) * 0.026 : 0;
      camera.position.set(p.x, p.y + 1.62 + bob, p.z);
      camera.rotation.set(p.pitch, -p.yaw, p.dash > 0 ? -0.035 : 0, 'YXZ');
      gun.position.set(
        p.ads ? 0 : 0.24,
        (p.ads ? -0.15 : -0.25) + (p.ads ? 0 : bob * 0.4),
        -0.67 + p.recoil * 0.26,
      );
      gun.rotation.set(
        -p.recoil * 0.3 + (p.reload ? -0.35 : 0),
        p.reload ? -0.4 : 0,
        p.reload ? -0.65 : 0,
      );
      magazine.position.y =
        -0.13 - (p.reload > 0.5 && p.reload < 1.35 ? 0.15 : 0);
      muzzle.visible = p.recoil > 0.072 && !p.reload;
      muzzle.rotation.z = game.shots;
      gun.visible = p.respawn <= 0;
      ring.material = mat(
        game.contested ? '#ffc567' : game.onPoint ? '#72e7bd' : '#4ee3f3',
        true,
      );
      crystal.rotation.y = game.time * 0.55;
      halo.rotation.z = game.time * 0.4;
      beacon.visible = !!game.beacon;
      if (game.beacon) {
        beacon.position.set(game.beacon.x, 0, game.beacon.z);
        healRing.scale.setScalar(4.2 + Math.sin(game.time * 4) * 0.06);
      }
      for (const bot of game.bots) {
        if (!actors.has(bot.id)) actors.set(bot.id, humanoid(false, bot.elite));
        updateActor(actors.get(bot.id)!, bot, false);
      }
      game.allies.forEach((ally, i) => updateActor(allyActors[i], ally, true));
      tracePool.forEach((object) => {
        object.visible = false;
      });
      boltPool.forEach((object) => {
        object.visible = false;
      });
      let traceIndex = 0;
      const drawTrace = (
        from: T.Vector3,
        to: T.Vector3,
        material: T.Material,
        radius: number,
      ) => {
        const line = effect(tracePool, traceIndex++, material, cylinder),
          delta = to.clone().sub(from);
        line.material = material;
        line.position.copy(from).addScaledVector(delta, 0.5);
        line.scale.set(radius, delta.length(), radius);
        line.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          delta.normalize(),
        );
      };
      for (const trace of game.traces)
        drawTrace(
          new T.Vector3(trace.from.x, trace.from.y, trace.from.z),
          new T.Vector3(trace.to.x, trace.to.y, trace.to.z),
          bright,
          0.014,
        );
      for (const bot of game.bots)
        if (bot.hp > 0 && bot.windup > 0)
          drawTrace(
            new T.Vector3(bot.x, 1.37, bot.z),
            new T.Vector3(bot.target.x, bot.target.y, bot.target.z),
            red,
            0.01 + (0.7 - bot.windup) * 0.025,
          );
      game.bolts.forEach((bolt, i) => {
        const object = effect(boltPool, i, red, sphere);
        object.position.set(bolt.x, bolt.y, bolt.z);
        object.scale.setScalar(0.09);
      });
      drawHud();
      renderer.info.reset();
      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(hudScene, hudCamera);
      drawCalls = renderer.info.render.calls;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach((shape) => shape.dispose());
      materials.forEach((material) => material.dispose());
      extras.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      sun.shadow.dispose();
      renderer.dispose();
      hudCanvas.width = 1;
      hudCanvas.height = 1;
    },
    metrics: () => ({
      drawCalls,
      entities:
        game.bots.filter((bot) => bot.hp > 0).length +
        game.allies.filter((ally) => ally.hp > 0).length +
        game.bolts.length +
        covers.length +
        1,
    }),
  };
}
