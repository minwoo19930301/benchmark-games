import * as THREE from 'three';
import type { RetroView } from '../types.ts';
import { IronSimulation } from './simulation.ts';
import { box, disposeScene, material, mesh } from '../smash/art.ts';
import { createFighter, poseFighter } from './art.ts';

export function mountIron(
  canvas: HTMLCanvasElement,
  game: IronSimulation,
): RetroView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaca190);
  scene.fog = new THREE.Fog(0xaca190, 22, 75);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 110);
  scene.add(new THREE.HemisphereLight(0xffefcf, 0x444153, 2));
  const sun = new THREE.DirectionalLight(0xffe7bc, 3.1);
  sun.position.set(-7, 15, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -15,
    right: 15,
    top: 13,
    bottom: -13,
    near: 0.5,
    far: 45,
  });
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xb4c4ec, 1.4);
  rim.position.set(4, 6, -7);
  scene.add(rim);
  const stone = material(0x807b70),
    darkStone = material(0x484d4b),
    roof = material(0x383d3d);
  const red = material(0x693c32),
    gold = material(0xb89a59),
    wood = material(0x42372e);
  box(scene, stone, 0, -0.45, 0, 45, 0.7, 24);
  const tileGeometry = new THREE.BoxGeometry(1.98, 0.12, 1.98);
  const tiles = new THREE.InstancedMesh(
    tileGeometry,
    material(0xb0a68e),
    23 * 12,
  );
  const transform = new THREE.Object3D();
  let tile = 0;
  for (let x = -11; x <= 11; x++)
    for (let z = -5; z <= 6; z++) {
      transform.position.set(x * 2, -0.07, z * 2);
      transform.updateMatrix();
      tiles.setMatrixAt(tile, transform.matrix);
      tiles.setColorAt(
        tile++,
        new THREE.Color((x + z) % 2 ? 0x9b947f : 0xbbb199),
      );
    }
  tiles.receiveShadow = true;
  scene.add(tiles);
  // Low stone parapet and a tiled temple gate establish the late-90s courtyard view.
  box(scene, darkStone, 0, 0.7, -8.5, 44, 1.4, 1);
  box(scene, stone, 0, 1.44, -8.5, 44, 0.17, 1.25);
  for (let x = -20; x <= 20; x += 4) {
    box(scene, stone, x, 1, -8.15, 0.58, 2, 0.7);
    mesh(
      new THREE.ConeGeometry(0.5, 0.4, 4),
      gold,
      scene,
      x,
      2.15,
      -8.15,
    ).rotation.y = Math.PI / 4;
  }
  for (const x of [-6.5, 6.5]) {
    box(scene, stone, x, 0.37, -11.4, 2.4, 0.75, 2.4);
    box(scene, red, x, 3.1, -11.4, 0.76, 5.2, 0.76);
    for (const y of [1, 5.2]) box(scene, gold, x, y, -11.4, 0.98, 0.22, 0.98);
  }
  box(scene, wood, 0, 5.55, -11.4, 14.7, 0.7, 1.2);
  box(scene, red, 0, 4.8, -11.4, 13.7, 0.22, 0.7);
  for (const side of [-1, 1]) {
    const eave = box(scene, roof, 0, 6.6, -11.4 + side * 1.35, 17, 0.27, 3.05);
    eave.rotation.x = side * 0.28;
    for (let x = -8; x <= 8; x += 0.5) {
      const ridge = box(
        scene,
        darkStone,
        x,
        6.76,
        -11.4 + side * 1.35,
        0.055,
        0.075,
        3.1,
      );
      ridge.rotation.x = side * 0.28;
    }
    const edge = box(scene, roof, side * 8.4, 6.73, -11.4, 0.65, 0.28, 5.8);
    edge.rotation.z = side * 0.25;
  }
  box(scene, gold, 0, 7.18, -11.4, 16, 0.14, 0.18);
  for (const x of [-3.8, 0, 3.8]) {
    box(scene, red, x, 3.55, -15.3, 3.5, 6.2, 0.5);
    for (let j = -1; j <= 1; j++)
      box(scene, wood, x + j * 0.9, 3.4, -14.98, 0.06, 4.8, 0.08);
  }
  // Secondary pagoda roofs, layered mountains and pines stay behind the fight plane.
  for (const x of [-22, 22]) {
    for (let level = 0; level < 3; level++) {
      const y = 2.8 + level * 3.1,
        width = 8 - level * 1.3;
      box(scene, red, x, y, -24, width - 2.5, 2.5, width - 2.5);
      const canopy = mesh(
        new THREE.ConeGeometry(width * 0.7, 2.2, 4),
        roof,
        scene,
        x,
        y + 2,
        -24,
      );
      canopy.rotation.y = Math.PI / 4;
    }
  }
  for (let i = 0; i < 12; i++) {
    const x = -58 + i * 11;
    const peak = mesh(
      new THREE.ConeGeometry(11 + (i % 4), 15 + (i % 5) * 2, 5),
      material(i % 2 ? 0x777f7b : 0x8b9186),
      scene,
      x,
      5,
      -48 - (i % 3) * 4,
    );
    peak.scale.z = 0.65;
  }
  for (let i = 0; i < 12; i++) {
    const x = -29 + i * 5.5,
      z = -17 - (i % 3) * 3;
    mesh(new THREE.CylinderGeometry(0.2, 0.35, 7, 7), wood, scene, x, 3, z);
    for (let layer = 0; layer < 3; layer++)
      mesh(
        new THREE.ConeGeometry(2.6 - layer * 0.45, 3.9, 7),
        material(0x3e5048),
        scene,
        x,
        5 + layer * 1.6,
        z,
      );
  }
  const figures = [
    createFighter('jin', scene),
    createFighter('hwoarang', scene),
  ];
  const impact = new THREE.Group();
  scene.add(impact);
  const sparks = Array.from({ length: 13 }, (_, index) => {
    const shard = mesh(
      new THREE.PlaneGeometry(0.05, 0.48),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0xffd850 : 0xfff5c8,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      impact,
    );
    return shard;
  });
  const halo = mesh(
    new THREE.RingGeometry(0.22, 0.29, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffc737,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    impact,
  );
  const hudCanvas = document.createElement('canvas');
  hudCanvas.width = 1600;
  hudCanvas.height = 900;
  const ctx = hudCanvas.getContext('2d')!;
  const hudTexture = new THREE.CanvasTexture(hudCanvas);
  hudTexture.colorSpace = THREE.SRGBColorSpace;
  const hudScene = new THREE.Scene(),
    hudCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const hudMaterial = new THREE.MeshBasicMaterial({
    map: hudTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const hudPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hudMaterial);
  hudScene.add(hudPlane);
  let width = 0,
    height = 0,
    calls = 0;

  function text(
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = 'left',
  ): void {
    ctx.textAlign = align;
    ctx.font = `italic 900 ${size}px Arial, sans-serif`;
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.strokeStyle = '#141515';
    ctx.strokeText(value, x, y);
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
  function hud(): void {
    const w = hudCanvas.width,
      h = hudCanvas.height,
      scale = Math.min(1, w / 1100);
    ctx.clearRect(0, 0, w, h);
    const margin = 30,
      gap = 91,
      barWidth = w / 2 - margin - gap,
      top = 43,
      barHeight = 35;
    const gradient = ctx.createLinearGradient(0, top, 0, top + barHeight);
    gradient.addColorStop(0, '#fff2bb');
    gradient.addColorStop(0.42, '#efd562');
    gradient.addColorStop(1, '#b8711a');
    [game.player, game.opponent].forEach((fighter, index) => {
      const x = index ? w / 2 + gap : margin,
        ratio = fighter.health / 100;
      ctx.fillStyle = '#171b1d';
      ctx.fillRect(x - 4, top - 4, barWidth + 8, barHeight + 8);
      ctx.strokeStyle = '#d0d3ca';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 5, top - 5, barWidth + 10, barHeight + 10);
      ctx.fillStyle = '#6b2a20';
      ctx.fillRect(x, top, barWidth, barHeight);
      ctx.fillStyle = ratio < 0.25 ? '#e36935' : gradient;
      ctx.fillRect(
        index ? x + barWidth * (1 - ratio) : x,
        top,
        barWidth * ratio,
        barHeight,
      );
      text(
        index ? 'HWOARANG' : 'JIN KAZAMA',
        index ? w - margin : margin,
        114,
        28 * scale,
        '#ffffff',
        index ? 'right' : 'left',
      );
      text(
        index ? 'CPU' : '1P',
        index ? w - margin : margin,
        30,
        20,
        index ? '#ffc26a' : '#f7eed0',
        index ? 'right' : 'left',
      );
      const rounds = index ? game.opponentRounds : game.playerRounds;
      for (let pip = 0; pip < 2; pip++) {
        ctx.beginPath();
        const px = index ? w / 2 + 108 + pip * 27 : w / 2 - 108 - pip * 27;
        ctx.arc(px, 106, 8, 0, Math.PI * 2);
        ctx.fillStyle = rounds > pip ? '#ef652b' : '#302d26';
        ctx.fill();
        ctx.strokeStyle = rounds > pip ? '#ffe7b8' : '#a5a49b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    text(
      String(Math.ceil(game.roundTime)).padStart(2, '0'),
      w / 2,
      87,
      73,
      '#fff7d5',
      'center',
    );
    text(`ROUND ${game.round}`, w / 2, 119, 16, '#e1d6b8', 'center');
    if (game.player.combo > 1 && game.player.comboTimer > 0.2) {
      text(`${game.player.combo} HIT COMBO`, 38, h * 0.33, 32, '#ffcd61');
      text(
        `${game.player.comboDamage} DAMAGE`,
        40,
        h * 0.33 + 28,
        19,
        '#f2ede2',
      );
    }
    const call = game.announcement;
    if (call) {
      const size = call === 'READY' || call === 'FIGHT' ? 105 : 127;
      const glow = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.59);
      glow.addColorStop(0, '#fffbc7');
      glow.addColorStop(0.46, '#ffe365');
      glow.addColorStop(1, '#e06520');
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `italic 900 ${Math.min(size, w / 6)}px Arial, sans-serif`;
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#3c170b';
      ctx.strokeText(call, w / 2, h * 0.53);
      ctx.fillStyle = glow;
      ctx.fillText(call, w / 2, h * 0.53);
      ctx.restore();
      if (game.phase !== 'playing' || game.roundBreak)
        text(
          `${game.player.health >= game.opponent.health ? 'JIN KAZAMA' : 'HWOARANG'} WINS`,
          w / 2,
          h * 0.63,
          36,
          '#fff2c4',
          'center',
        );
    }
    if (!call) text(game.notice, w / 2, h - 50, 18, '#f5dfb5', 'center');
    text('J 1    K 2    U 3    I 4', margin, h - 21, 17, '#ded7c7');
    text('TEMPLE COURTYARD', w - margin, h - 21, 15, '#d2cbb9', 'right');
    hudTexture.needsUpdate = true;
  }

  return {
    render(nextWidth, nextHeight) {
      if (width !== nextWidth || height !== nextHeight) {
        width = nextWidth;
        height = nextHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
        hudCanvas.height = Math.round(1600 / camera.aspect);
      }
      poseFighter(figures[0], game.player, game.time);
      poseFighter(figures[1], game.opponent, game.time);
      const center = (game.player.x + game.opponent.x) / 2,
        depth = (game.player.z + game.opponent.z) / 2;
      const spread = Math.abs(game.opponent.x - game.player.x);
      const distance = Math.max(
        10.3,
        (spread + 5.3) /
          (2 *
            Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
            camera.aspect),
      );
      camera.position.set(
        center + 0.25,
        3.55 + Math.max(0, distance - 12) * 0.08,
        depth + distance,
      );
      camera.lookAt(center, 1.58, depth);
      impact.visible = !!game.lastHit && game.flash > 0;
      if (game.lastHit && impact.visible) {
        const hit = game.lastHit,
          progress = 1 - game.flash / 0.16;
        impact.position.set(hit.x, hit.y, hit.z + 0.45);
        impact.quaternion.copy(camera.quaternion);
        sparks.forEach((spark, index) => {
          const angle = (index * Math.PI * 2) / sparks.length;
          spark.position.set(
            Math.cos(angle) * (0.1 + progress * 0.62),
            Math.sin(angle) * (0.1 + progress * 0.62),
            0,
          );
          spark.rotation.z = angle - Math.PI / 2;
          spark.scale.y = 1 - progress * 0.6;
          const surface = spark.material as THREE.MeshBasicMaterial;
          surface.opacity = 1 - progress;
          surface.color.setHex(
            hit.blocked ? 0xd4e8f2 : hit.counter ? 0xff8a2e : 0xffd654,
          );
        });
        halo.scale.setScalar(0.7 + progress * 1.8);
        (halo.material as THREE.MeshBasicMaterial).opacity =
          (1 - progress) * 0.85;
      }
      hud();
      renderer.autoClear = true;
      renderer.render(scene, camera);
      calls = renderer.info.render.calls;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(hudScene, hudCamera);
      calls += renderer.info.render.calls;
    },
    metrics: () => ({ drawCalls: calls, entities: 2 }),
    dispose() {
      hudPlane.geometry.dispose();
      hudMaterial.dispose();
      hudTexture.dispose();
      disposeScene(scene, renderer);
    },
  };
}
