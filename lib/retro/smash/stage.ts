import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { block, paint, sphere } from './models.ts';
import { platforms } from './simulation.ts';
function cylinder(
  parent: THREE.Object3D,
  color: number,
  x: number,
  y: number,
  z: number,
  r1: number,
  r2: number,
  height: number,
  segments = 14,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r2, height, segments),
    paint(color),
  );
  parent.add(mesh);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
function star(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  radius: number,
  color = 0xffe791,
): void {
  const shape = new THREE.Shape();
  for (let n = 0; n < 10; n++) {
    const a = (n * Math.PI) / 5 + Math.PI / 2,
      r = n % 2 ? radius * 0.45 : radius;
    const px = Math.cos(a) * r,
      py = Math.sin(a) * r;
    if (n) shape.lineTo(px, py);
    else shape.moveTo(px, py);
  }
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.03,
      bevelSegments: 1,
    }),
    paint(color),
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
}
function mergeStatic(group: THREE.Group): void {
  group.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material))
      return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    if (!geometry.getAttribute('uv'))
      geometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(
          new Float32Array(geometry.getAttribute('position').count * 2),
          2,
        ),
      );
    const current = batches.get(object.material) ?? [];
    current.push(geometry.index ? geometry.toNonIndexed() : geometry.clone());
    batches.set(object.material, current);
    geometry.dispose();
    object.geometry.dispose();
  });
  group.clear();
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    if (merged) {
      const mesh = new THREE.Mesh(merged, material);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
export function createDreamLand(scene: THREE.Scene): void {
  const stage = new THREE.Group();
  scene.add(stage);
  // The floating island has a grass lip, an ochre rock body and a faceted tapered underside.
  const island = cylinder(stage, 0xc6a16b, 0, -1.9, -0.65, 1, 0.78, 3.6, 20);
  island.scale.set(13.2, 1, 3.5);
  const underside = cylinder(
    stage,
    0xa5845c,
    -0.4,
    -4.1,
    -0.6,
    0.9,
    0.14,
    3.2,
    12,
  );
  underside.scale.set(11.4, 1, 3.1);
  const lip = cylinder(stage, 0x6cac50, 0, -0.16, -0.65, 1, 1.02, 0.35, 30);
  lip.scale.set(13.1, 1, 3.6);
  const turf = cylinder(stage, 0x8acb65, 0, -0.025, -0.65, 1, 1, 0.12, 30);
  turf.scale.set(13, 1, 3.48);
  // Colored strata and lichen keep the large front wall from becoming a blank box.
  for (let i = 0; i < 25; i++) {
    const x = -11.7 + (i % 13) * 1.87,
      y = -1.1 - Math.floor(i / 13) * 1.25;
    const rock = sphere(
      stage,
      i % 3 ? 0xdbbd83 : 0xb48a5d,
      x,
      y,
      2.08 + Math.sqrt(Math.max(0, 1 - (x * x) / 180)) * 0.52,
      0.65,
      0.43,
      0.1,
      8,
    );
    rock.rotation.z = i * 0.43;
  }
  for (let i = 0; i < 12; i++) {
    const grass = sphere(
      stage,
      0x73b458,
      -11.4 + i * 2.1,
      -0.35 - (i % 3) * 0.18,
      2.64,
      0.8,
      0.55,
      0.16,
      10,
    );
    grass.rotation.z = i * 0.6;
  }
  for (const platform of platforms.slice(1)) {
    const plank = cylinder(
      stage,
      0xc49867,
      platform.x,
      platform.y - 0.23,
      0,
      1,
      0.9,
      0.42,
      16,
    );
    plank.scale.set(platform.width / 2, 1, 0.82);
    const grass = cylinder(
      stage,
      0x8fd666,
      platform.x,
      platform.y - 0.02,
      0,
      1,
      1,
      0.12,
      16,
    );
    grass.scale.set(platform.width / 2, 1, 0.84);
    star(stage, platform.x, platform.y - 0.24, 0.76, 0.19, 0xffeeb4);
  }
  // Whispy Woods: bulbous trunk, branch arms, canopy tiers, eyes and its long nose.
  const trunk = cylinder(stage, 0xc38b58, 6.4, 3.65, -3.1, 1.1, 1.8, 7.3, 16);
  trunk.rotation.z = -0.035;
  for (const side of [-1, 1]) {
    const branch = cylinder(
      stage,
      0xc38b58,
      6.4 + side * 1.9,
      5.3,
      -3.3,
      0.35,
      0.6,
      3.8,
      10,
    );
    branch.rotation.z = side * -0.85;
    sphere(stage, 0x71573f, 6.4 + side * 0.52, 4.85, -1.94, 0.15, 0.38, 0.07);
    sphere(
      stage,
      0xfff0ca,
      6.4 + side * 0.53 - 0.03,
      4.99,
      -1.85,
      0.035,
      0.09,
      0.035,
    );
  }
  sphere(stage, 0x76583d, 6.4, 3.47, -1.82, 0.33, 0.26, 0.065);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 1.45, 10),
    paint(0xd19d68),
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(6.4, 4.27, -1.3);
  stage.add(nose);
  for (let i = 0; i < 13; i++) {
    const angle = i * 2.4,
      ring = i < 8 ? 2.8 : 1.6;
    sphere(
      stage,
      [0x73b847, 0x8dc854, 0x65a943][i % 3],
      6.2 + Math.sin(angle) * ring,
      7.2 + (i % 3) * 0.92,
      -3.4 + Math.cos(angle) * 1.25,
      2.3,
      1.6,
      1.5,
      14,
    );
  }
  // Distant rounded hills, cream paths and flower beds give the stage its N64 storybook palette.
  for (let i = 0; i < 8; i++) {
    const x = -42 + i * 12;
    sphere(
      stage,
      i % 2 ? 0x83bb90 : 0x73b4a3,
      x,
      -8,
      -24 - (i % 2) * 5,
      11,
      14 + (i % 3) * 2,
      7,
      20,
    );
    sphere(stage, 0xa0cf91, x - 3, -8, -16, 8, 9 + (i % 2) * 3, 5, 16);
  }
  for (let c = 0; c < 9; c++) {
    const x = -40 + c * 11,
      y = 13 + (c % 3) * 6,
      z = -24 - (c % 2) * 8;
    for (let j = 0; j < 4; j++)
      sphere(
        stage,
        0xfff8e9,
        x + j * 1.8,
        y + Math.sin(j * 2) * 0.8,
        z,
        2.4,
        1.2 + (j % 2) * 0.5,
        0.6,
        12,
      );
  }
  const sun = sphere(stage, 0xffeaae, -24, 17, -33, 4.5, 4.5, 0.7, 24);
  sun.material = new THREE.MeshBasicMaterial({ color: 0xffeaae });
  for (let i = 0; i < 14; i++) {
    const x = -11.4 + i * 1.66,
      z = -1.8 - (i % 2) * 0.3;
    const stem = block(stage, 0x4c9950, x, 0.26, z, 0.04, 0.5, 0.04);
    stem.rotation.z = Math.sin(i * 3) * 0.2;
    for (let petal = 0; petal < 5; petal++)
      sphere(
        stage,
        i % 2 ? 0xffd963 : 0xffd4e0,
        x + Math.sin(petal * 1.256) * 0.14,
        0.54 + Math.cos(petal * 1.256) * 0.14,
        z + 0.025,
        0.11,
        0.12,
        0.03,
        8,
      );
    sphere(stage, 0xffa83c, x, 0.54, z + 0.08, 0.075, 0.075, 0.03, 8);
  }
  for (let i = 0; i < 5; i++)
    star(stage, -10 + i * 5, -4.8 - (i % 2) * 0.9, -0.4, 0.25 + (i % 2) * 0.1);
  mergeStatic(stage);
}
