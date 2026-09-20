import * as THREE from 'three';
import { box, material, mesh } from '../smash/art.ts';
import { moves } from './simulation.ts';
import type { MartialArtist } from './simulation.ts';

type Joint = { upper: THREE.Group; lower: THREE.Group };
export interface FighterRig {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  arms: [Joint, Joint];
  legs: [Joint, Joint];
  kind: 'jin' | 'hwoarang';
}
const joint = (parent: THREE.Object3D, x: number, y: number, z: number) => {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
};
function ellipsoid(
  parent: THREE.Object3D,
  surface: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
): THREE.Mesh {
  const body = mesh(
    new THREE.SphereGeometry(1, 10, 8),
    surface,
    parent,
    x,
    y,
    z,
  );
  body.scale.set(sx, sy, sz);
  return body;
}
function tapered(
  parent: THREE.Object3D,
  surface: THREE.Material,
  top: number,
  bottom: number,
  length: number,
  y: number,
  squash = 1,
): THREE.Mesh {
  const part = mesh(
    new THREE.CylinderGeometry(top, bottom, length, 8),
    surface,
    parent,
    0,
    y,
    0,
  );
  part.scale.x = squash;
  return part;
}
/** Contoured rings avoid toy cylinders while keeping the late-90s polygon budget. */
function contour(
  parent: THREE.Object3D,
  surface: THREE.Material,
  rings: [number, number, number][],
  folds = 0,
): THREE.Mesh {
  const vertices: number[] = [],
    indices: number[] = [],
    segments = 16;
  for (const [ring, [y, rx, rz]] of rings.entries()) {
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      const pleat = 1 + folds * Math.sin(angle * 5 + ring * 0.7);
      vertices.push(
        Math.cos(angle) * rx * pleat,
        y,
        Math.sin(angle) * rz * pleat,
      );
      if (ring < rings.length - 1 && j < segments) {
        const a = ring * (segments + 1) + j,
          b = a + segments + 1;
        if (rings[rings.length - 1][0] > rings[0][0])
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        else indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  for (const end of [0, rings.length - 1]) {
    const center = vertices.length / 3;
    vertices.push(0, rings[end][0], 0);
    const upper = rings[end][0] > rings[end === 0 ? rings.length - 1 : 0][0];
    for (let j = 0; j < segments; j++) {
      const a = end * (segments + 1) + j;
      if (upper) indices.push(center, a + 1, a);
      else indices.push(center, a, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return mesh(geometry, surface, parent);
}
function flame(
  parent: THREE.Object3D,
  z: number,
  color: number,
  scale = 1,
): void {
  const shape = new THREE.Shape();
  shape.moveTo(-0.13, -0.65);
  shape.lineTo(0.14, -0.65);
  shape.bezierCurveTo(0.17, -0.46, 0.13, -0.35, 0.19, -0.24);
  shape.bezierCurveTo(0.08, -0.29, 0.055, -0.31, 0.07, -0.47);
  shape.bezierCurveTo(-0.01, -0.36, 0.06, -0.12, -0.045, 0.13);
  shape.bezierCurveTo(-0.04, -0.1, -0.17, -0.19, -0.115, -0.37);
  shape.bezierCurveTo(-0.22, -0.23, -0.15, -0.11, -0.22, -0.04);
  shape.bezierCurveTo(-0.2, -0.3, -0.24, -0.4, -0.13, -0.65);
  shape.closePath();
  const decal = mesh(
    new THREE.ShapeGeometry(shape, 10),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
    parent,
    0,
    0.22,
    z,
  );
  decal.scale.set(scale * 0.75, scale, 1);
}
export function createFighter(
  kind: 'jin' | 'hwoarang',
  parent: THREE.Object3D,
): FighterRig {
  const root = joint(parent, 0, 0, 0),
    body = joint(root, 0, 0, 0);
  const torso = joint(body, 0, 1.52, 0);
  const skin = material(kind === 'jin' ? 0xd8a17e : 0xe7b28b, 0.78);
  const shade = material(kind === 'jin' ? 0xc08b6d : 0xd09b77, 0.83);
  const black = material(0x15161c),
    pants = material(kind === 'jin' ? 0x191a24 : 0xe6e2d4);
  const white = material(0xf1ede0),
    red = material(0xb82325),
    hair = material(kind === 'jin' ? 0x090a10 : 0x963e24);
  const jacket = kind === 'jin' ? skin : white;
  // A single torso surface carries the anatomy; no separate spherical muscle beads.
  const torsoMaterial = jacket.clone();
  const chest = contour(
    torso,
    torsoMaterial,
    [
      [0.16, 0.23, 0.32],
      [0.34, 0.245, 0.34],
      [0.5, 0.26, 0.385],
      [0.66, 0.295, 0.45],
      [0.81, 0.34, 0.49],
      [0.97, 0.315, 0.49],
      [1.08, 0.245, 0.43],
      [1.17, 0.15, 0.19],
    ],
    kind === 'hwoarang' ? 0.02 : 0,
  );
  if (kind === 'jin') {
    const positions = chest.geometry.getAttribute('position');
    const colors: number[] = [],
      base = new THREE.Color(0xd8a17e);
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const x = positions.getX(vertex),
        y = positions.getY(vertex),
        z = positions.getZ(vertex);
      // Shallow sternum/abdominal shading embedded into the surface, like a painted low-poly model.
      const sternum = x > 0.18 && Math.abs(z) < 0.09 ? 0.94 : 1;
      const band = x > 0.18 && y < 0.66 ? 0.975 + Math.sin(y * 39) * 0.025 : 1;
      const shade = base.clone().multiplyScalar(sternum * band);
      colors.push(shade.r, shade.g, shade.b);
    }
    chest.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3),
    );
    torsoMaterial.color.set(0xffffff);
    torsoMaterial.vertexColors = true;
  }
  contour(
    torso,
    pants,
    [
      [-0.15, 0.22, 0.25],
      [-0.02, 0.27, 0.33],
      [0.15, 0.245, 0.325],
      [0.24, 0.225, 0.3],
    ],
    0.015,
  );
  tapered(torso, skin, 0.128, 0.15, 0.135, 1.205);
  if (kind === 'jin') {
    // Jin's black upper-arm tattoo, red gauntlets and flamed black trousers.
    const tattoo = box(torso, black, 0.015, 0.97, 0.495, 0.16, 0.13, 0.008);
    tattoo.rotation.z = -0.5;
  } else {
    // Sleeveless taekwondo dobok: crossed black lapel and tied black belt.
    for (const sign of [-1, 1]) {
      const lapel = box(
        torso,
        black,
        0.325,
        0.85,
        sign * 0.135,
        0.035,
        0.65,
        0.072,
      );
      lapel.rotation.x = sign * 0.38;
    }
    box(torso, skin, 0.276, 1.065, 0, 0.025, 0.18, 0.2);
    box(torso, black, 0, 0.22, 0, 0.58, 0.115, 0.76);
    const belt = box(torso, black, 0.32, 0.015, 0.11, 0.065, 0.37, 0.095);
    belt.rotation.z = -0.2;
    const belt2 = box(torso, black, 0.32, 0.04, -0.04, 0.065, 0.3, 0.095);
    belt2.rotation.z = 0.32;
    const patch = box(
      torso,
      material(0xbc2228),
      0.315,
      0.91,
      0.27,
      0.02,
      0.11,
      0.09,
    );
    patch.rotation.x = 0.1;
  }
  const head = joint(torso, 0, 1.475, 0);
  // One angular skull and jaw: a flat face plane replaces the nose/cheek sphere cluster.
  const headRows: [number, number, number, number][] = [
    [-0.225, 0.09, 0.105, 0.1],
    [-0.17, 0.13, 0.17, 0.145],
    [-0.08, 0.17, 0.18, 0.175],
    [0.015, 0.185, 0.192, 0.18],
    [0.1, 0.18, 0.185, 0.177],
    [0.2, 0.145, 0.16, 0.158],
    [0.25, 0.07, 0.09, 0.09],
  ];
  const headPositions: number[] = [],
    headIndices: number[] = [];
  for (const [row, [y, back, front, width]] of headRows.entries()) {
    const ring = [
      [front, 0],
      [front * 0.965, width * 0.58],
      [0.025, width],
      [-back * 0.7, width * 0.79],
      [-back, 0],
      [-back * 0.7, -width * 0.79],
      [0.025, -width],
      [front * 0.965, -width * 0.58],
    ];
    for (const [x, z] of ring) headPositions.push(x, y, z);
    if (row < headRows.length - 1)
      for (let j = 0; j < 8; j++) {
        const a = row * 8 + j,
          b = row * 8 + ((j + 1) % 8);
        headIndices.push(a, a + 8, b, b, a + 8, b + 8);
      }
  }
  for (const row of [0, headRows.length - 1]) {
    const center = headPositions.length / 3;
    headPositions.push(0, headRows[row][0], 0);
    for (let j = 0; j < 8; j++) {
      const a = row * 8 + j,
        b = row * 8 + ((j + 1) % 8);
      if (row) headIndices.push(center, b, a);
      else headIndices.push(center, a, b);
    }
  }
  const headGeometry = new THREE.BufferGeometry();
  headGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(headPositions, 3),
  );
  headGeometry.setIndex(headIndices);
  headGeometry.computeVertexNormals();
  mesh(headGeometry, skin, head);
  const noseGeometry = new THREE.BufferGeometry();
  noseGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        0.189, 0.071, -0.015, 0.189, 0.071, 0.015, 0.215, -0.021, 0, 0.189,
        -0.057, -0.021, 0.189, -0.057, 0.021,
      ],
      3,
    ),
  );
  noseGeometry.setIndex([0, 2, 1, 0, 3, 2, 1, 2, 4, 3, 4, 2, 0, 1, 4, 0, 4, 3]);
  noseGeometry.computeVertexNormals();
  mesh(noseGeometry, skin, head);
  for (const side of [-1, 1]) {
    // Eyes sit inside the face plane instead of floating on the sides of a sphere.
    box(head, material(0xe9dfce), 0.19, 0.05, side * 0.071, 0.01, 0.019, 0.043);
    box(head, black, 0.198, 0.05, side * 0.07, 0.009, 0.019, 0.014);
    const brow = box(
      head,
      black,
      0.191,
      0.079,
      side * 0.073,
      0.012,
      0.016,
      0.062,
    );
    brow.rotation.x = side * 0.1;
    box(head, skin, -0.012, -0.027, side * 0.188, 0.04, 0.071, 0.02);
  }
  box(head, shade, 0.184, -0.11, 0, 0.008, 0.012, 0.063);
  const cap = ellipsoid(head, hair, -0.035, 0.165, 0, 0.205, 0.13, 0.189);
  cap.rotation.z = 0.12;
  if (kind === 'jin') {
    for (let i = 0; i < 9; i++) {
      const spike = mesh(
        new THREE.ConeGeometry(0.07, 0.205 + (i % 3) * 0.022, 4),
        hair,
        head,
        -0.17 + (i % 3) * 0.13,
        0.24,
        -0.135 + Math.floor(i / 3) * 0.135,
      );
      spike.rotation.z = 0.25 + (2 - (i % 3)) * 0.3;
    }
    for (const z of [-0.17, 0.17]) {
      const lock = box(head, hair, 0.03, 0.14, z, 0.065, 0.13, 0.035);
      lock.rotation.z = 0.22;
    }
  } else {
    box(head, white, 0.183, 0.139, 0, 0.019, 0.048, 0.25);
    for (let i = 0; i < 6; i++) {
      const lock = mesh(
        new THREE.ConeGeometry(0.082, 0.3, 5),
        hair,
        head,
        -0.2,
        0.12 - (i % 2) * 0.08,
        -0.18 + i * 0.07,
      );
      lock.rotation.z = 1.25;
    }
    const fringe = ellipsoid(
      head,
      hair,
      0.05,
      0.205,
      0.045,
      0.137,
      0.075,
      0.116,
    );
    fringe.rotation.z = 0.38;
    const tail = box(head, white, -0.26, -0.01, 0.13, 0.055, 0.3, 0.058);
    tail.rotation.z = -0.45;
  }
  function arm(z: number): Joint {
    const upper = joint(torso, 0, 1.03, z);
    contour(upper, skin, [
      [0.08, 0.09, 0.1],
      [0.025, 0.145, 0.145],
      [-0.1, 0.148, 0.155],
      [-0.24, 0.13, 0.135],
      [-0.4, 0.098, 0.105],
      [-0.48, 0.093, 0.098],
    ]);
    const lower = joint(upper, 0, -0.48, 0);
    contour(lower, skin, [
      [0.01, 0.092, 0.092],
      [-0.1, 0.109, 0.102],
      [-0.22, 0.1, 0.09],
      [-0.37, 0.076, 0.081],
    ]);
    if (kind === 'jin') {
      tapered(lower, red, 0.107, 0.114, 0.21, -0.33);
      for (let i = 0; i < 3; i++)
        box(
          lower,
          material(0xd6d2c5, 0.35, 0.4),
          0.111,
          -0.27 - i * 0.055,
          0,
          0.018,
          0.032,
          0.145,
        );
    } else {
      tapered(lower, white, 0.102, 0.105, 0.12, -0.37);
      box(upper, black, 0, -0.17, Math.sign(z) * 0.157, 0.16, 0.055, 0.014);
    }
    box(
      lower,
      kind === 'jin' ? red : skin,
      0.024,
      -0.457,
      0,
      0.18,
      0.205,
      0.178,
    );
    box(
      lower,
      kind === 'jin' ? red : skin,
      0.09,
      -0.444,
      0.055,
      0.065,
      0.11,
      0.06,
    );
    for (const z of [-0.052, 0, 0.052])
      box(lower, shade, 0.116, -0.445, z, 0.008, 0.05, 0.006);
    return { upper, lower };
  }
  function leg(z: number): Joint {
    const upper = joint(body, 0, 1.51, z);
    contour(
      upper,
      pants,
      [
        [0.02, 0.205, 0.215],
        [-0.12, 0.23, 0.237],
        [-0.32, 0.226, 0.215],
        [-0.53, 0.188, 0.183],
        [-0.68, 0.17, 0.18],
      ],
      0.045,
    );
    const lower = joint(upper, 0, -0.69, 0);
    ellipsoid(lower, pants, 0, 0, 0, 0.175, 0.175, 0.175);
    contour(
      lower,
      pants,
      [
        [0.02, 0.167, 0.17],
        [-0.16, 0.181, 0.18],
        [-0.37, 0.167, kind === 'jin' ? 0.16 : 0.185],
        [-0.53, kind === 'jin' ? 0.15 : 0.19, kind === 'jin' ? 0.147 : 0.19],
        [-0.63, kind === 'jin' ? 0.145 : 0.2, kind === 'jin' ? 0.145 : 0.203],
      ],
      0.055,
    );
    if (kind === 'jin') {
      for (const side of [-1, 1]) {
        flame(lower, side * 0.183, 0xcf2624);
        flame(lower, side * 0.186, 0xf3af29, 0.63);
      }
      const shoe = box(lower, black, 0.12, -0.665, 0, 0.47, 0.16, 0.29);
      shoe.rotation.z = -0.05;
      box(lower, material(0xb71d22), 0.15, -0.727, 0, 0.47, 0.035, 0.3);
    } else {
      box(lower, white, 0, -0.55, 0, 0.34, 0.06, 0.43);
      ellipsoid(lower, skin, 0.125, -0.685, 0, 0.27, 0.09, 0.145);
      for (let i = 0; i < 4; i++)
        box(lower, shade, 0.34, -0.687, -0.09 + i * 0.055, 0.025, 0.024, 0.012);
    }
    return { upper, lower };
  }
  const arms: [Joint, Joint] = [arm(0.48), arm(-0.48)];
  const legs: [Joint, Joint] = [leg(0.24), leg(-0.24)];
  return { root, body, torso, head, arms, legs, kind };
}
const lerp = THREE.MathUtils.lerp;
export function poseFighter(
  rig: FighterRig,
  fighter: MartialArtist,
  time: number,
): void {
  const { root, body, torso, head, arms, legs } = rig;
  root.position.set(fighter.x, fighter.y, fighter.z);
  root.rotation.set(0, fighter.facing < 0 ? Math.PI : 0, 0);
  body.position.set(0, 0, 0);
  body.rotation.set(0, 0, 0);
  torso.rotation.set(0, -0.34 * fighter.facing, -0.04);
  head.rotation.set(0, 0.11 * fighter.facing, 0.015);
  const breathing = Math.sin(time * 3.6) * 0.012;
  body.position.y = breathing;
  const walk =
    Math.sin(time * 11) * Math.min(0.16, Math.abs(fighter.walk) * 0.035);
  arms[0].upper.rotation.set(0, 0, 0.5);
  arms[0].lower.rotation.set(0, 0, 1.88);
  arms[1].upper.rotation.set(0, 0, -0.15);
  arms[1].lower.rotation.set(0, 0, 2.15);
  legs[0].upper.rotation.set(0, 0, 0.33 + walk);
  legs[0].lower.rotation.set(0, 0, -0.2);
  legs[1].upper.rotation.set(0, 0, -0.35 - walk);
  legs[1].lower.rotation.set(0, 0, 0.38);
  if (rig.kind === 'hwoarang') {
    arms[0].upper.rotation.z = 0.12;
    arms[0].lower.rotation.z = 1.9;
    torso.rotation.y = -0.45 * fighter.facing;
  }
  if (fighter.crouch) {
    body.position.y = -0.5;
    torso.rotation.z = -0.32;
    legs[0].upper.rotation.z = 1;
    legs[0].lower.rotation.z = -1.2;
    legs[1].upper.rotation.z = 0.65;
    legs[1].lower.rotation.z = -1.5;
  }
  if (fighter.guard) {
    arms[0].upper.rotation.z = 0.75;
    arms[0].lower.rotation.z = 1.9;
    arms[1].upper.rotation.z = 0.85;
    arms[1].lower.rotation.z = 1.8;
    torso.rotation.z = 0.08;
  }
  if (fighter.stepTime > 0) {
    body.rotation.x = fighter.stepDirection * 0.1;
    legs[0].upper.rotation.x = -0.22;
    legs[1].upper.rotation.x = 0.22;
  }
  if (fighter.attack > 0 && fighter.move !== 'idle') {
    const data = moves[fighter.move],
      t = fighter.attackTime;
    const extend =
      t < data.startup
        ? Math.pow(t / data.startup, 2.5)
        : t < data.startup + data.active
          ? 1
          : Math.max(0, 1 - (t - data.startup - data.active) / data.recovery);
    const armIndex = data.limb === 1 || data.limb === 3 ? 0 : 1;
    if (data.limb <= 2) {
      const striking = arms[armIndex];
      const uppercut = fighter.move === 'uppercut';
      striking.upper.rotation.z = lerp(
        striking.upper.rotation.z,
        uppercut ? 2.35 : 1.53,
        extend,
      );
      striking.lower.rotation.z = lerp(
        striking.lower.rotation.z,
        uppercut ? 0.5 : 0.05,
        extend,
      );
      torso.rotation.y += (armIndex ? 0.38 : -0.15) * extend;
      torso.rotation.z = -0.11 * extend;
      body.position.x = extend * 0.15;
      if (uppercut) body.position.y = -0.28 * (1 - extend);
    } else {
      const striking = legs[armIndex],
        low = data.level === 'low';
      const round = fighter.move === 'roundhouse';
      striking.upper.rotation.z = lerp(
        striking.upper.rotation.z,
        low ? 0.72 : round ? 2.03 : 1.62,
        extend,
      );
      striking.lower.rotation.z = lerp(
        -1.1 * Math.sin(Math.PI * Math.min(1, t / data.startup)),
        0.04,
        extend,
      );
      torso.rotation.z = (low ? -0.15 : 0.33) * extend;
      torso.rotation.y += (round ? 1.1 : 0.2) * extend;
      body.position.y += low ? -0.27 * extend : 0.08 * extend;
      if (fighter.move === 'sweep')
        body.rotation.y =
          -Math.PI * 1.8 * (t / (data.startup + data.active + data.recovery));
    }
  }
  if (fighter.stun > 0 && !fighter.guard) {
    torso.rotation.z = 0.28;
    head.rotation.z = 0.18;
    arms[0].upper.rotation.z = -0.4;
  }
  if (fighter.y > 0) {
    body.rotation.z = -1.1;
    torso.rotation.z = 0.22;
    legs[0].upper.rotation.z = 0.4;
    legs[1].upper.rotation.z = -0.45;
    arms[0].upper.rotation.z = -0.6;
    arms[1].upper.rotation.z = -1;
  }
  if (fighter.downTime > 0 || fighter.health <= 0 || fighter.getup > 0) {
    const down = fighter.getup > 0 ? fighter.getup / 0.3 : 1;
    body.rotation.z = (-Math.PI / 2) * down;
    body.position.y = 0.2 * down;
    body.position.x = -1.1 * down;
    torso.rotation.z = 0.06;
    arms[0].upper.rotation.z = 0.1;
    arms[1].upper.rotation.z = -0.7;
    legs[0].upper.rotation.z = 0.04;
    legs[1].upper.rotation.z = -0.15;
  }
}
