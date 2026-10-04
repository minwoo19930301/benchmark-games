import * as T from 'three';

/** Original, entirely geometric hedgehog. Its feet are at y=0; it faces +x. */
export function createHedgehog() {
  const root = new T.Group();
  const facing = new T.Group();
  const figure = new T.Group();
  root.add(facing);
  facing.add(figure);
  const sphere = new T.SphereGeometry(1, 20, 14);
  const cone = new T.ConeGeometry(1, 1, 7);
  const cylinder = new T.CylinderGeometry(1, 1, 1, 10);
  const materials = {
    blue: new T.MeshStandardMaterial({ color: '#0874ec', roughness: 0.4 }),
    darkBlue: new T.MeshStandardMaterial({ color: '#064db7', roughness: 0.42 }),
    tan: new T.MeshStandardMaterial({ color: '#ffd0a2', roughness: 0.76 }),
    white: new T.MeshStandardMaterial({ color: '#fffdf0', roughness: 0.44 }),
    red: new T.MeshStandardMaterial({ color: '#f13537', roughness: 0.34 }),
    black: new T.MeshStandardMaterial({ color: '#122e3e', roughness: 0.3 }),
    green: new T.MeshStandardMaterial({ color: '#05ac88', roughness: 0.3 }),
    gold: new T.MeshStandardMaterial({
      color: '#ffd553',
      roughness: 0.35,
      metalness: 0.25,
    }),
  };
  type Color = keyof typeof materials;
  function ellipsoid(
    parent: T.Object3D,
    color: Color,
    position: [number, number, number],
    scale: [number, number, number],
  ) {
    const mesh = new T.Mesh(sphere, materials[color]);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  function spike(
    parent: T.Object3D,
    start: T.Vector3,
    end: T.Vector3,
    radius: number,
    color: Color = 'blue',
  ) {
    const difference = end.clone().sub(start);
    const mesh = new T.Mesh(cone, materials[color]);
    mesh.position.copy(start).addScaledVector(difference, 0.5);
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      difference.clone().normalize(),
    );
    mesh.scale.set(radius, difference.length(), radius);
    parent.add(mesh);
    return mesh;
  }
  function limb(
    parent: T.Object3D,
    color: Color,
    x: number,
    y: number,
    z: number,
    length: number,
    radius: number,
  ) {
    const part = new T.Mesh(cylinder, materials[color]);
    part.position.set(x, y - length / 2, z);
    part.scale.set(radius, length, radius);
    parent.add(part);
    return part;
  }

  ellipsoid(figure, 'blue', [-0.08, 0.79, 0], [0.29, 0.43, 0.3]);
  ellipsoid(figure, 'tan', [0.155, 0.83, 0.05], [0.11, 0.265, 0.255]);
  ellipsoid(figure, 'blue', [-0.035, 1.3, 0], [0.455, 0.46, 0.415]);
  // The swept-back quill silhouette remains legible at the game's small scale.
  for (const [sx, sy, sz, ex, ey, ez, radius] of [
    [-0.23, 1.53, -0.02, -0.89, 1.56, -0.05, 0.32],
    [-0.3, 1.33, 0.06, -1.0, 1.09, 0.04, 0.31],
    [-0.25, 1.13, 0.08, -0.8, 0.73, 0.09, 0.29],
    [-0.22, 1.39, -0.22, -0.8, 1.18, -0.46, 0.23],
    [-0.16, 1.19, -0.2, -0.62, 0.84, -0.41, 0.23],
    [-0.21, 0.89, 0, -0.58, 0.62, 0, 0.2],
  ])
    spike(figure, new T.Vector3(sx, sy, sz), new T.Vector3(ex, ey, ez), radius);
  spike(
    figure,
    new T.Vector3(-0.13, 1.62, 0.27),
    new T.Vector3(-0.11, 1.97, 0.27),
    0.15,
  );
  spike(
    figure,
    new T.Vector3(0.12, 1.62, -0.18),
    new T.Vector3(0.18, 1.94, -0.19),
    0.145,
  );
  spike(
    figure,
    new T.Vector3(-0.11, 1.66, 0.295),
    new T.Vector3(-0.105, 1.87, 0.3),
    0.09,
    'tan',
  );
  spike(
    figure,
    new T.Vector3(0.145, 1.66, -0.17),
    new T.Vector3(0.175, 1.85, -0.17),
    0.085,
    'tan',
  );
  ellipsoid(figure, 'tan', [0.325, 1.14, 0.06], [0.315, 0.21, 0.33]);
  ellipsoid(figure, 'black', [0.605, 1.205, 0.035], [0.1, 0.08, 0.105]);
  // Two connected white eye panels, emerald pupils, and a tiny white glint.
  for (const z of [-0.265, 0.305]) {
    ellipsoid(figure, 'white', [0.23, 1.425, z], [0.22, 0.285, 0.105]);
    ellipsoid(
      figure,
      'green',
      [0.327, 1.421, z + Math.sign(z) * 0.078],
      [0.065, 0.15, 0.032],
    );
    ellipsoid(
      figure,
      'black',
      [0.343, 1.419, z + Math.sign(z) * 0.101],
      [0.026, 0.105, 0.018],
    );
    ellipsoid(
      figure,
      'white',
      [0.35, 1.49, z + Math.sign(z) * 0.115],
      [0.018, 0.032, 0.012],
    );
  }
  // A small curved smile on the camera-facing muzzle.
  const smile = new T.Mesh(
    new T.TorusGeometry(0.095, 0.012, 4, 12, 1.25),
    materials.black,
  );
  smile.position.set(0.33, 1.106, 0.361);
  smile.rotation.z = Math.PI + 0.25;
  figure.add(smile);

  const arms: T.Group[] = [];
  const legs: T.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(-0.025, 1.01, side * 0.29);
    arm.rotation.z = side * 0.13;
    figure.add(arm);
    limb(arm, 'tan', 0, 0, 0, 0.38, 0.074);
    ellipsoid(arm, 'white', [0.018, -0.355, 0], [0.12, 0.075, 0.12]);
    ellipsoid(arm, 'white', [0.03, -0.465, 0.025], [0.15, 0.15, 0.135]);
    ellipsoid(arm, 'white', [0.135, -0.43, side * 0.028], [0.07, 0.095, 0.075]);
    arms.push(arm);
    const leg = new T.Group();
    leg.position.set(-0.02, 0.49, side * 0.155);
    figure.add(leg);
    limb(leg, 'blue', 0, 0, 0, 0.31, 0.085);
    ellipsoid(leg, 'white', [0.035, -0.305, 0], [0.145, 0.1, 0.15]);
    ellipsoid(leg, 'white', [0.135, -0.426, 0.025], [0.325, 0.07, 0.2]);
    ellipsoid(leg, 'red', [0.14, -0.381, 0.025], [0.31, 0.125, 0.185]);
    ellipsoid(leg, 'white', [0.12, -0.3, 0.033], [0.075, 0.07, 0.19]);
    ellipsoid(leg, 'gold', [0.14, -0.315, side * 0.173], [0.072, 0.055, 0.022]);
    legs.push(leg);
  }

  const rolling = new T.Group();
  rolling.position.y = 0.8;
  facing.add(rolling);
  ellipsoid(rolling, 'blue', [0, 0, 0], [0.66, 0.66, 0.55]);
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    const start = new T.Vector3(
      Math.cos(angle) * 0.44,
      Math.sin(angle) * 0.44,
      0,
    );
    const end = new T.Vector3(
      Math.cos(angle + 0.45) * 0.8,
      Math.sin(angle + 0.45) * 0.8,
      0,
    );
    spike(rolling, start, end, 0.22, i % 2 ? 'blue' : 'darkBlue');
  }
  const rollStripe = new T.Mesh(
    new T.TorusGeometry(0.49, 0.07, 6, 30, 4.5),
    materials.white,
  );
  rollStripe.position.z = 0.4;
  rolling.add(rollStripe);
  rolling.visible = false;

  return {
    root,
    update(
      speed: number,
      elapsed: number,
      grounded: boolean,
      isRolling: boolean,
      direction: number,
      angle: number,
      invincible: number,
    ) {
      facing.rotation.y = direction < 0 ? Math.PI : 0;
      root.rotation.z = angle;
      root.visible = invincible <= 0 || Math.floor(elapsed * 16) % 2 === 0;
      figure.visible = !isRolling;
      rolling.visible = isRolling;
      rolling.rotation.z =
        -elapsed * (Math.abs(speed) + 7) * (direction < 0 ? -1 : 1);
      const run = Math.min(Math.abs(speed) / 9, 1);
      const stride = elapsed * (10 + Math.abs(speed) * 0.68);
      const wave = Math.sin(stride);
      figure.rotation.z = grounded ? -run * 0.16 : -0.16;
      figure.position.y = grounded
        ? Math.abs(Math.cos(stride)) * run * 0.055
        : 0;
      arms.forEach((arm, index) => {
        arm.rotation.z = grounded
          ? (index === 0 ? wave : -wave) * run * 0.85 - run * 0.55
          : index === 0
            ? 0.8
            : -0.8;
      });
      legs.forEach((leg, index) => {
        leg.rotation.z = grounded
          ? (index === 0 ? -wave : wave) * run * 1.05
          : index === 0
            ? -0.7
            : 0.65;
      });
    },
  };
}
