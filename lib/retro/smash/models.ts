import * as THREE from 'three';
import type { Brawler } from './simulation.ts';

const surfaces = new Map<number, THREE.MeshStandardMaterial>();
export function paint(color: number): THREE.MeshStandardMaterial {
  let found = surfaces.get(color);
  if (!found) {
    found = new THREE.MeshStandardMaterial({ color, roughness: 0.76 });
    surfaces.set(color, found);
  }
  return found;
}
export function sphere(
  parent: THREE.Object3D,
  color: number,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy = sx,
  sz = sx,
  segments = 18,
): THREE.Mesh {
  const part = new THREE.Mesh(
    new THREE.SphereGeometry(1, segments, 12),
    paint(color),
  );
  part.position.set(x, y, z);
  part.scale.set(sx, sy, sz);
  part.castShadow = part.receiveShadow = true;
  parent.add(part);
  return part;
}
export function block(
  parent: THREE.Object3D,
  color: number,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
): THREE.Mesh {
  const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color));
  part.position.set(x, y, z);
  part.castShadow = part.receiveShadow = true;
  parent.add(part);
  return part;
}
function joint(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
): THREE.Group {
  const item = new THREE.Group();
  item.position.set(x, y, z);
  parent.add(item);
  return item;
}
function badge(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#fff8e8';
  c.beginPath();
  c.ellipse(64, 64, 53, 49, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#cf1c2d';
  c.font = '900 86px Arial';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('M', 64, 71);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export interface FighterModel {
  root: THREE.Group;
  pose: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  arms: THREE.Group[];
  legs: THREE.Group[];
  shield: THREE.Mesh;
  cape: THREE.Mesh;
  charge: THREE.Mesh;
  mouth?: THREE.Mesh;
}
function rig(scene: THREE.Scene, color: number): FighterModel {
  const root = new THREE.Group();
  scene.add(root);
  const pose = joint(root, 0, 0, 0);
  const torso = joint(pose, 0, 1.3, 0),
    head = joint(torso, 0, 1.08, 0);
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      roughness: 0.16,
      metalness: 0.1,
      side: THREE.DoubleSide,
    }),
  );
  root.add(shield);
  shield.position.y = 1.4;
  shield.scale.set(1.85, 1.85, 1.85);
  shield.visible = false;
  const cape = new THREE.Mesh(
    new THREE.SphereGeometry(1, 18, 12, 0, Math.PI),
    paint(0xffd936),
  );
  pose.add(cape);
  cape.position.set(1.5, 1.5, 0);
  cape.scale.set(1.4, 1.4, 0.18);
  cape.visible = false;
  const charge = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.065, 8, 48),
    new THREE.MeshBasicMaterial({
      color: 0xfff1a3,
      transparent: true,
      opacity: 0.8,
    }),
  );
  pose.add(charge);
  charge.position.y = 1.45;
  charge.visible = false;
  return { root, pose, torso, head, arms: [], legs: [], shield, cape, charge };
}
export function createMario(scene: THREE.Scene): FighterModel {
  const model = rig(scene, 0xff314b),
    { torso, head, pose } = model;
  const red = 0xe22732,
    blue = 0x2358b5,
    skin = 0xffc08c,
    brown = 0x4c241b;
  sphere(torso, red, 0, 0.24, 0, 0.62, 0.68, 0.41);
  sphere(torso, blue, 0, -0.2, 0.02, 0.65, 0.44, 0.45);
  block(torso, blue, 0, 0.17, 0.35, 0.68, 0.64, 0.15);
  for (const side of [-1, 1]) {
    const strap = block(torso, blue, side * 0.37, 0.52, 0.27, 0.17, 0.48, 0.19);
    strap.rotation.z = side * -0.08;
    sphere(torso, 0xffd543, side * 0.35, 0.35, 0.467, 0.075, 0.075, 0.035);
    const arm = joint(torso, side * 0.59, 0.56, 0);
    model.arms.push(arm);
    sphere(arm, red, side * 0.11, -0.2, 0, 0.27, 0.39, 0.28);
    sphere(arm, red, side * 0.16, -0.57, 0.06, 0.225, 0.27, 0.24);
    sphere(arm, 0xfff9eb, side * 0.16, -0.81, 0.09, 0.3, 0.3, 0.26);
    sphere(arm, 0xfff9eb, side * -0.07, -0.74, 0.25, 0.115, 0.16, 0.13);
    for (let finger = 0; finger < 3; finger++) {
      const seam = block(
        arm,
        0xd3cabb,
        side * (0.02 + finger * 0.1),
        -0.84,
        0.335,
        0.014,
        0.14,
        0.015,
      );
      seam.rotation.z = -0.09;
    }
    const leg = joint(pose, side * 0.34, 1.07, 0.02);
    model.legs.push(leg);
    sphere(leg, blue, 0, -0.32, 0, 0.29, 0.43, 0.32);
    sphere(leg, brown, 0, -0.79, 0.16, 0.35, 0.25, 0.53);
    sphere(leg, 0x9a6243, 0, -0.83, 0.3, 0.35, 0.12, 0.48);
    sphere(head, skin, side * 0.59, 0.03, 0.03, 0.17, 0.26, 0.17);
    sphere(head, 0xda8764, side * 0.68, 0.03, 0.1, 0.065, 0.14, 0.07);
    sphere(head, brown, side * 0.5, 0.16, 0.15, 0.095, 0.33, 0.15);
  }
  sphere(head, skin, 0, 0.03, 0.03, 0.61, 0.62, 0.51);
  sphere(head, brown, 0, 0.15, -0.24, 0.58, 0.57, 0.38);
  for (const side of [-1, 1]) {
    sphere(head, 0xfffdf7, side * 0.22, 0.19, 0.477, 0.18, 0.255, 0.078);
    sphere(head, 0x307bc2, side * 0.19, 0.18, 0.55, 0.094, 0.168, 0.037);
    sphere(head, 0x10253b, side * 0.183, 0.175, 0.58, 0.044, 0.118, 0.025);
    sphere(
      head,
      0xffffff,
      side * 0.19 - 0.026,
      0.236,
      0.602,
      0.026,
      0.047,
      0.017,
    );
    const brow = sphere(
      head,
      brown,
      side * 0.23,
      0.434,
      0.468,
      0.21,
      0.06,
      0.07,
    );
    brow.rotation.z = side * -0.12;
  }
  sphere(head, skin, 0, -0.018, 0.62, 0.24, 0.21, 0.28);
  for (let index = -2; index <= 2; index++)
    sphere(
      head,
      brown,
      index * 0.115,
      -0.22 + Math.abs(index) * 0.018,
      0.486,
      0.12,
      0.105,
      0.088,
    );
  sphere(head, 0x8d302f, 0, -0.346, 0.439, 0.16, 0.055, 0.028);
  sphere(head, red, 0, 0.5, -0.015, 0.67, 0.35, 0.55);
  sphere(head, red, 0, 0.34, 0.38, 0.65, 0.085, 0.48);
  const emblem = new THREE.Mesh(
    new THREE.PlaneGeometry(0.47, 0.45),
    new THREE.MeshBasicMaterial({ map: badge(), transparent: true }),
  );
  emblem.position.set(0, 0.55, 0.52);
  head.add(emblem);
  return model;
}
export function createKirby(scene: THREE.Scene): FighterModel {
  const model = rig(scene, 0x5f94ff),
    { torso, pose, head } = model;
  torso.position.y = 1.05;
  head.position.set(0, 0, 0);
  sphere(torso, 0xff91bd, 0, 0, 0, 1.05, 0.99, 0.83, 28);
  sphere(torso, 0xffa8cc, -0.27, 0.28, 0.62, 0.36, 0.32, 0.12);
  for (const side of [-1, 1]) {
    const arm = joint(torso, side * 0.88, -0.03, 0);
    model.arms.push(arm);
    const hand = sphere(
      arm,
      0xff8bbb,
      side * 0.25,
      -0.03,
      0.01,
      0.44,
      0.31,
      0.34,
    );
    hand.rotation.z = side * 0.42;
    const leg = joint(pose, side * 0.5, 0.3, 0.06);
    model.legs.push(leg);
    sphere(leg, 0xd72f64, side * 0.12, 0, 0.26, 0.59, 0.29, 0.66);
    sphere(leg, 0xf04b7c, side * 0.19, 0.1, 0.4, 0.36, 0.11, 0.31);
    sphere(head, 0x172145, side * 0.26, 0.2, 0.785, 0.13, 0.31, 0.033);
    sphere(head, 0x2b72cf, side * 0.26, 0.055, 0.813, 0.083, 0.13, 0.02);
    sphere(head, 0xffffff, side * 0.26, 0.325, 0.822, 0.062, 0.111, 0.015);
    sphere(head, 0xff538b, side * 0.61, -0.105, 0.672, 0.2, 0.095, 0.025);
  }
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.13, -0.25, 0.81),
    new THREE.Vector3(0, -0.41, 0.87),
    new THREE.Vector3(0.13, -0.25, 0.81),
  );
  const smile = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 12, 0.025, 5, false),
    paint(0x822d57),
  );
  head.add(smile);
  model.mouth = sphere(head, 0x552340, 0, -0.18, 0.831, 0.27, 0.3, 0.04);
  model.mouth.visible = false;
  return model;
}

export function animateFighter(
  model: FighterModel,
  body: Brawler,
  time: number,
): void {
  const mario = body.character === 'mario';
  const running = Math.abs(body.vx) > 0.7 && body.grounded;
  const stride = Math.sin(time * 16) * Math.min(1, Math.abs(body.vx) / 8);
  model.root.position.set(body.x, body.y, 0.35);
  model.root.rotation.y = body.facing * (mario ? 0.64 : 0.42);
  model.pose.scale.set(body.facing, 1, 1);
  model.pose.rotation.z = body.stun > 0 ? -body.vx * 0.016 : 0;
  model.torso.rotation.set(0, 0, running ? -0.07 : Math.sin(time * 3) * 0.012);
  model.head.rotation.set(0, 0, 0);
  model.torso.position.y =
    (mario ? 1.3 : 1.05) +
    (running ? Math.abs(stride) * 0.075 : Math.sin(time * 3) * 0.018);
  model.arms.forEach((arm, index) => {
    arm.rotation.set(
      running ? stride * (index ? -0.7 : 0.7) : 0,
      0,
      mario ? (index ? -0.16 : 0.16) : index ? -0.08 : 0.08,
    );
  });
  model.legs.forEach((leg, index) =>
    leg.rotation.set(running ? stride * (index ? 1 : -1) : 0, 0, 0),
  );
  if (!body.grounded) {
    model.arms[0].rotation.z = mario ? 0.6 : 0.65;
    model.arms[1].rotation.z = mario ? -0.5 : -0.65;
    model.legs[0].rotation.x = -0.5;
    model.legs[1].rotation.x = 0.6;
    if (!mario) model.torso.scale.set(1.02, 1.04, 1);
  } else model.torso.scale.set(1, 1, 1);
  if (body.guarding) {
    model.arms[0].rotation.x = -1;
    model.arms[1].rotation.x = -1;
    model.arms[0].rotation.z = -0.35;
    model.arms[1].rotation.z = 0.35;
    model.torso.position.y -= 0.15;
  }
  if (body.charging) {
    model.torso.rotation.z = 0.18;
    model.arms[1].rotation.z = -0.5;
    model.arms[1].rotation.y = -0.7;
    model.arms[0].rotation.x = -0.7;
    model.legs[0].rotation.z = 0.18;
    model.torso.position.y -= 0.15;
  }
  if (body.attack > 0) {
    const t = body.moveElapsed;
    const punch = Math.sin(Math.min(1, t / 0.17) * Math.PI) * 0.6 + 0.6;
    const move = body.attackKind;
    if (
      ['jab', 'smash', 'tilt', 'fireball', 'fair', 'grab', 'throw'].includes(
        move,
      )
    ) {
      const arm =
        body.combo === 2 && move === 'jab' ? model.arms[0] : model.arms[1];
      arm.rotation.z = 1.35 * punch;
      arm.rotation.x = -0.4;
      model.torso.rotation.z = -0.16;
      if (move === 'fair')
        model.arms[1].rotation.z = 0.5 + Math.min(1, t / 0.3) * 2.5;
      if (move === 'tilt') {
        model.legs[1].rotation.z = 1.25;
        model.legs[1].rotation.x = -0.2;
      }
    }
    if (['upTilt', 'upSmash', 'uair', 'recovery'].includes(move)) {
      model.arms[1].rotation.z = 2.75;
      model.arms[0].rotation.z = 0.7;
      model.torso.rotation.z = -0.13;
      model.legs[0].rotation.x = -0.7;
      model.legs[1].rotation.x = 0.65;
      if (move === 'uair') {
        model.pose.rotation.z = body.facing * -0.6;
        model.legs[1].rotation.z = 2;
      }
    }
    if (['downTilt', 'downSmash', 'dair', 'tornado', 'nair'].includes(move)) {
      model.legs[1].rotation.z = move === 'dair' ? -0.2 : 1.4;
      model.legs[0].rotation.z = move === 'downSmash' ? -1.35 : -0.2;
      model.arms[0].rotation.z = -1;
      model.arms[1].rotation.z = 1;
      model.torso.position.y -= body.grounded ? 0.35 : 0;
      if (move === 'tornado' || move === 'dair')
        model.root.rotation.y += t * 24;
    }
  }
  if (body.roll > 0) {
    model.pose.rotation.z =
      body.rollDirection * (1 - body.roll / 0.3) * Math.PI * 2;
    model.pose.position.y = 0.2;
  } else model.pose.position.y = 0;
  if (body.ledge) {
    model.arms[1].rotation.z = 2.5;
    model.arms[0].rotation.z = 0.4;
  }
  model.shield.visible = body.guarding;
  model.shield.scale.setScalar(
    (mario ? 1.8 : 1.5) * (0.45 + body.shield * 0.55),
  );
  model.shield.position.y = mario ? 1.4 : 1;
  model.cape.visible = body.attack > 0 && body.attackKind === 'cape';
  model.cape.rotation.y = body.moveElapsed * 9;
  model.charge.visible =
    body.charging || (body.attack > 0 && body.attackKind === 'recovery');
  model.charge.rotation.z = time * 7;
  model.charge.scale.setScalar(
    0.8 + Math.sin(time * 30) * 0.08 + body.charge * 0.3,
  );
  if (model.mouth)
    model.mouth.visible =
      body.grabbing > 0 || (body.attack > 0 && body.attackKind === 'grab');
  model.root.visible =
    body.stocks > 0 &&
    !(
      time > 0 &&
      body.invulnerable > 0 &&
      body.stun <= 0 &&
      Math.floor(time * 16) % 3 === 0
    );
}

/** Materials are shared inside one mount, released together with the scene. */
export function releasePaintCache(): void {
  surfaces.clear();
}
