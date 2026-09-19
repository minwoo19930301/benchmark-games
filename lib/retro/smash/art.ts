import * as THREE from 'three';

export const material = (
  color: THREE.ColorRepresentation,
  roughness = 0.7,
  metalness = 0,
) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
export function mesh(
  geometry: THREE.BufferGeometry,
  surface: THREE.Material,
  parent: THREE.Object3D,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, surface);
  result.position.set(x, y, z);
  result.castShadow = true;
  result.receiveShadow = true;
  parent.add(result);
  return result;
}
export function box(
  parent: THREE.Object3D,
  surface: THREE.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
): THREE.Mesh {
  return mesh(new THREE.BoxGeometry(w, h, d), surface, parent, x, y, z);
}
export function label(
  text: string,
  color = '#ffffff',
  background = '#162031',
  width = 5,
  height = 1,
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = '900 66px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 384, 86, 730);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false }),
  );
  sprite.scale.set(width, height, 1);
  return sprite;
}
export interface Figure {
  root: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  parcel: THREE.Group;
  umbrella: THREE.Group;
  shield: THREE.Mesh;
}
export function createFigure(
  kind: 'raccoon' | 'courier',
  color: number,
  parent: THREE.Object3D,
): Figure {
  const root = new THREE.Group();
  parent.add(root);
  const fabric = material(color);
  const dark = material(0x192535);
  const white = material(0xfff3dd);
  const skin = material(kind === 'raccoon' ? 0x969b9c : 0xecc2a0);
  const gold = material(0xffbd42, 0.45, 0.15);
  const torso = mesh(
    new THREE.CapsuleGeometry(0.48, 0.7, 4, 10),
    fabric,
    root,
    0,
    1.45,
    0,
  );
  torso.scale.z = 0.85;
  box(root, white, 0.44, 1.65, 0, 0.08, 0.17, 0.72);
  box(root, gold, 0.5, 1.35, 0, 0.08, 0.27, 0.28);
  // Every fighter carries a padded delivery bag, with straps and a printed patch.
  box(root, material(0x314858), -0.55, 1.55, 0, 0.55, 0.95, 0.9);
  box(root, gold, -0.86, 1.58, 0, 0.04, 0.25, 0.55);
  const head = new THREE.Group();
  head.position.y = 2.43;
  root.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.5, 12, 10), skin, head);
  skull.scale.set(1.05, 1, 0.95);
  if (kind === 'raccoon') {
    for (const z of [-0.3, 0.3]) {
      const ear = mesh(
        new THREE.ConeGeometry(0.22, 0.48, 4),
        dark,
        head,
        -0.05,
        0.44,
        z,
      );
      ear.rotation.x = z;
      mesh(
        new THREE.SphereGeometry(0.18, 10, 8),
        dark,
        head,
        0.39,
        0.1,
        z * 0.86,
      );
      mesh(
        new THREE.SphereGeometry(0.07, 8, 6),
        white,
        head,
        0.53,
        0.11,
        z * 0.86,
      );
      mesh(
        new THREE.SphereGeometry(0.036, 8, 6),
        dark,
        head,
        0.58,
        0.11,
        z * 0.86,
      );
    }
    const muzzle = mesh(
      new THREE.SphereGeometry(0.25, 10, 8),
      white,
      head,
      0.43,
      -0.13,
      0,
    );
    muzzle.scale.set(1.2, 0.7, 1);
    mesh(new THREE.SphereGeometry(0.105, 8, 6), dark, head, 0.68, -0.09, 0);
    for (let i = 0; i < 6; i += 1) {
      const tail = mesh(
        new THREE.SphereGeometry(0.28 - i * 0.015, 8, 6),
        i % 2 ? dark : skin,
        root,
        -0.65 - i * 0.2,
        0.85 - i * 0.09,
        0,
      );
      tail.scale.x = 1.15;
    }
    const cap = mesh(
      new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      fabric,
      head,
      0,
      0.18,
      0,
    );
    cap.scale.y = 0.65;
  } else {
    const helmet = mesh(
      new THREE.SphereGeometry(0.54, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.64),
      fabric,
      head,
      -0.02,
      0.05,
      0,
    );
    helmet.scale.z = 1.02;
    const visor = mesh(
      new THREE.SphereGeometry(0.4, 10, 8),
      material(0x13374b, 0.12, 0.4),
      head,
      0.27,
      0.06,
      0,
    );
    visor.scale.set(0.8, 0.38, 1.2);
    box(head, gold, -0.06, 0.55, 0, 0.2, 0.05, 0.93);
  }
  function arm(z: number): THREE.Group {
    const pivot = new THREE.Group();
    pivot.position.set(0, 1.94, z);
    root.add(pivot);
    mesh(
      new THREE.CapsuleGeometry(0.15, 0.52, 3, 8),
      fabric,
      pivot,
      0,
      -0.4,
      0,
    );
    const glove = mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      white,
      pivot,
      0,
      -0.8,
      0,
    );
    glove.scale.set(1.15, 1.05, 1);
    return pivot;
  }
  function leg(z: number): THREE.Group {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.96, z);
    root.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.19, 0.5, 3, 8), dark, pivot, 0, -0.36, 0);
    const shoe = mesh(
      new THREE.SphereGeometry(0.25, 10, 6),
      fabric,
      pivot,
      0.14,
      -0.82,
      0,
    );
    shoe.scale.set(1.7, 0.55, 1);
    box(pivot, white, 0.13, -0.96, 0, 0.6, 0.06, 0.43);
    return pivot;
  }
  const leftArm = arm(-0.48);
  const rightArm = arm(0.48);
  const leftLeg = leg(-0.24);
  const rightLeg = leg(0.24);
  const parcel = new THREE.Group();
  parcel.position.set(0.05, -0.85, 0);
  rightArm.add(parcel);
  box(parcel, material(0xcb9460), 0, 0, 0, 0.65, 0.55, 0.65);
  box(parcel, gold, 0, 0.29, 0, 0.18, 0.025, 0.68);
  parcel.visible = false;
  const umbrella = new THREE.Group();
  umbrella.position.set(0, 2.9, 0);
  root.add(umbrella);
  mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8),
    dark,
    umbrella,
    0,
    0.1,
    0,
  );
  mesh(new THREE.ConeGeometry(1.4, 0.5, 10), fabric, umbrella, 0, 1, 0);
  umbrella.visible = false;
  const shield = mesh(
    new THREE.SphereGeometry(1.85, 20, 12),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
    }),
    root,
    0,
    1.5,
    0,
  );
  shield.visible = false;
  return {
    root,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    parcel,
    umbrella,
    shield,
  };
}

export function animateFigure(
  figure: Figure,
  time: number,
  speed: number,
  attack: number,
  kick = false,
): void {
  const stride = Math.sin(time * 12) * Math.min(0.55, Math.abs(speed) * 0.075);
  figure.leftLeg.rotation.z = stride;
  figure.rightLeg.rotation.z = -stride;
  figure.leftArm.rotation.z = -stride * 0.7;
  figure.rightArm.rotation.z = stride * 0.7;
  const swing =
    attack > 0 ? Math.sin((Math.min(1, attack / 0.3) * Math.PI) / 2) : 0;
  if (kick) {
    figure.rightLeg.rotation.z = swing * 1.45;
    figure.leftArm.rotation.z = 0.9;
    figure.rightArm.rotation.z = 1.1;
  } else figure.rightArm.rotation.z += swing * 1.7;
  figure.head.rotation.z = Math.sin(time * 2) * 0.025;
}

export function disposeScene(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) geometries.add(object.geometry);
    if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
      for (const surface of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(surface);
        for (const value of Object.values(surface))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  geometries.forEach((value) => value.dispose());
  materials.forEach((value) => value.dispose());
  textures.forEach((value) => value.dispose());
  renderer.dispose();
}
