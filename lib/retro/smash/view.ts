import * as THREE from 'three';
import type { RetroView } from '../types.ts';
import { SmashSimulation } from './simulation.ts';
import {
  animateFighter,
  createKirby,
  createMario,
  releasePaintCache,
} from './models.ts';
import { createDreamLand } from './stage.ts';

function portrait(
  c: CanvasRenderingContext2D,
  kirby: boolean,
  x: number,
  y: number,
  scale = 1,
): void {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  const oval = (
    color: string,
    px: number,
    py: number,
    rx: number,
    ry: number,
  ) => {
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  };
  if (kirby) {
    oval('#ca2459', -23, 28, 24, 11);
    oval('#ca2459', 23, 28, 24, 11);
    oval('#ff8fc2', 0, 0, 43, 37);
    oval('#ff8fc2', -44, 5, 14, 12);
    oval('#ff8fc2', 44, 5, 14, 12);
    for (const side of [-1, 1]) {
      oval('#202445', side * 12, -4, 6, 15);
      oval('#4a8edc', side * 12, 3, 3, 6);
      oval('#fff', side * 12, -11, 3, 5);
      oval('#f35893', side * 28, 10, 8, 4);
    }
    c.strokeStyle = '#8c365e';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 10, 7, 0.1, Math.PI - 0.1);
    c.stroke();
  } else {
    oval('#3c231c', 0, 6, 36, 40);
    oval('#ffc494', 0, 7, 31, 36);
    oval('#ffc494', -31, 8, 8, 13);
    oval('#ffc494', 31, 8, 8, 13);
    oval('#e82e37', 0, -24, 39, 25);
    oval('#e82e37', 0, -12, 44, 8);
    oval('#fff8e9', 0, -25, 14, 13);
    c.fillStyle = '#d82032';
    c.font = '900 23px Arial';
    c.textAlign = 'center';
    c.fillText('M', 0, -17);
    for (const side of [-1, 1]) {
      oval('#fff', side * 11, 2, 7, 12);
      oval('#267dbe', side * 11, 4, 4, 8);
      oval('#12273b', side * 11, 5, 2, 6);
    }
    for (let lobe = -2; lobe <= 2; lobe++)
      oval('#493023', lobe * 8, 21 - Math.abs(lobe), 8, 7);
    oval('#ffc494', 0, 12, 13, 10);
  }
  c.restore();
}
function drawHUD(c: CanvasRenderingContext2D, game: SmashSimulation): void {
  const w = c.canvas.width,
    h = c.canvas.height;
  c.clearRect(0, 0, w, h);
  const text = (
    message: string,
    x: number,
    y: number,
    size: number,
    color = '#fff',
    align: CanvasTextAlign = 'left',
  ) => {
    c.font = `900 ${size}px Arial, sans-serif`;
    c.textAlign = align;
    c.lineJoin = 'round';
    c.lineWidth = size > 36 ? 5 : 3;
    c.strokeStyle = 'rgba(30,40,52,.78)';
    c.strokeText(message, x, y);
    c.fillStyle = color;
    c.fillText(message, x, y);
  };
  c.fillStyle = 'rgba(249,250,232,.86)';
  c.beginPath();
  c.roundRect(24, 20, 200, 35, 4);
  c.fill();
  c.font = '800 17px Arial';
  c.fillStyle = '#335755';
  c.textAlign = 'left';
  c.fillText('DREAM LAND · 3 STOCK', 38, 43);
  const remain = Math.max(0, 180 - game.time),
    mins = Math.floor(remain / 60),
    secs = Math.floor(remain % 60);
  text(
    `${mins}:${String(secs).padStart(2, '0')}`,
    w - 30,
    62,
    46,
    '#fff',
    'right',
  );
  const panelW = Math.min(390, w * 0.32),
    gap = Math.min(80, w * 0.06),
    start = w / 2 - panelW - gap / 2;
  [game.player, game.opponent].forEach((body, index) => {
    const x = start + index * (panelW + gap),
      y = h - 112;
    const color = index ? '#326fd4' : '#d82943';
    c.fillStyle = 'rgba(246,247,235,.92)';
    c.beginPath();
    c.moveTo(x + 20, y + 5);
    c.lineTo(x + panelW, y + 5);
    c.lineTo(x + panelW - 20, y + 101);
    c.lineTo(x, y + 101);
    c.closePath();
    c.fill();
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x + 20, y + 5);
    c.lineTo(x + 116, y + 5);
    c.lineTo(x + 96, y + 101);
    c.lineTo(x, y + 101);
    c.closePath();
    c.fill();
    portrait(c, !!index, x + 57, y + 58, 0.95);
    const damageColor =
      body.percent >= 100
        ? '#d92c3c'
        : body.percent >= 60
          ? '#e47b29'
          : '#263340';
    c.font = '900 53px Arial';
    c.textAlign = 'left';
    c.fillStyle = damageColor;
    c.fillText(`${Math.floor(body.percent)}%`, x + 116, y + 58);
    c.font = '900 16px Arial';
    c.fillStyle = '#283d4b';
    c.fillText(body.character.toUpperCase(), x + 119, y + 82);
    c.fillStyle = color;
    c.font = '900 12px Arial';
    c.fillText(index ? 'CPU' : '1P', x + panelW - 45, y + 29);
    for (let stock = 0; stock < body.stocks; stock++)
      portrait(c, !!index, x + 247 + stock * 28, y + 76, 0.23);
    if (body.charging) {
      c.fillStyle = '#f0b52f';
      c.fillRect(x + 120, y + 90, ((panelW - 146) * body.charge) / 1.2, 4);
    }
  });
  if (game.time < 1.4)
    text(
      game.time < 0.65 ? 'READY' : 'GO!',
      w / 2,
      h * 0.44,
      75,
      game.time < 0.65 ? '#fff4ab' : '#ffce49',
      'center',
    );
  if (game.phase !== 'playing') {
    text('GAME!', w / 2, h * 0.42, 98, '#ffdd5a', 'center');
    text(
      game.phase === 'won' ? 'MARIO WINS!' : 'KIRBY WINS!',
      w / 2,
      h * 0.54,
      32,
      '#fff',
      'center',
    );
  }
}

export function mountSmash(
  canvas: HTMLCanvasElement,
  game: SmashSimulation,
): RetroView {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ac8df);
  scene.fog = new THREE.Fog(0xbde2de, 42, 95);
  const camera = new THREE.OrthographicCamera(-20, 20, 8, -8, 0.1, 160);
  const sky = new THREE.HemisphereLight(0xfffbef, 0x698b63, 2.2);
  scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffe9bc, 2.2);
  sun.position.set(-10, 23, 17);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -10;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  createDreamLand(scene);
  const models = [createMario(scene), createKirby(scene)];
  const ballGeometry = new THREE.SphereGeometry(0.3, 12, 8),
    ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff972e });
  const balls = Array.from({ length: 12 }, () => {
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.visible = false;
    scene.add(ball);
    return ball;
  });
  const impactGeometry = new THREE.RingGeometry(0.38, 0.67, 10),
    impactMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff8af,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
    });
  const impactMeshes = Array.from({ length: 20 }, () => {
    const object = new THREE.Mesh(impactGeometry, impactMaterial.clone());
    object.visible = false;
    scene.add(object);
    return object;
  });
  const smokeGeometry = new THREE.SphereGeometry(0.15, 8, 5),
    smokeMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff9ef,
      transparent: true,
      opacity: 0.6,
    });
  const trails = Array.from({ length: 20 }, () => {
    const m = new THREE.Mesh(smokeGeometry, smokeMaterial);
    m.visible = false;
    scene.add(m);
    return m;
  });
  const markerGeometry = new THREE.ConeGeometry(0.2, 0.33, 3),
    markers = [0xe32c48, 0x317aea].map((color) => {
      const marker = new THREE.Mesh(
        markerGeometry,
        new THREE.MeshBasicMaterial({ color }),
      );
      marker.rotation.z = Math.PI;
      scene.add(marker);
      return marker;
    });
  const hudCanvas = document.createElement('canvas');
  hudCanvas.width = 1600;
  hudCanvas.height = 640;
  const hudContext = hudCanvas.getContext('2d')!,
    hudTexture = new THREE.CanvasTexture(hudCanvas);
  hudTexture.colorSpace = THREE.SRGBColorSpace;
  const hudScene = new THREE.Scene(),
    hudCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  const hudMaterial = new THREE.MeshBasicMaterial({
    map: hudTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const hudPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hudMaterial);
  hudPlane.position.z = -1;
  hudScene.add(hudPlane);
  let width = 0,
    height = 0,
    lookX = 0,
    lookY = 3.5,
    halfHeight = 7.8,
    lastTime = 0,
    hudKey = '',
    drawCalls = 0;
  return {
    render(nextWidth, nextHeight) {
      if (width !== nextWidth || height !== nextHeight) {
        width = nextWidth;
        height = nextHeight;
        renderer.setSize(width, height, false);
        const hudWidth = width / Math.max(1, height) < 1.3 ? 920 : 1600;
        hudCanvas.width = hudWidth;
        hudCanvas.height = 640;
        hudKey = '';
      }
      const bodies = [game.player, game.opponent];
      bodies.forEach((body, index) => {
        animateFighter(models[index], body, game.time);
        markers[index].position.set(body.x, body.y + (index ? 2.5 : 3.8), 0.5);
        markers[index].visible = body.stocks > 0;
        for (let i = 0; i < 10; i++) {
          const puff = trails[index * 10 + i];
          puff.visible = body.stun > 0 && Math.abs(body.vx) > 10;
          puff.position.set(
            body.x - body.vx * i * 0.014,
            body.y + 1.1 - body.vy * i * 0.014,
            0.2,
          );
          puff.scale.setScalar(0.6 + i * 0.15);
        }
      });
      balls.forEach((ball, index) => {
        const data = game.fireballs[index];
        ball.visible = !!data;
        if (data) {
          ball.position.set(data.x, data.y, 0.35);
          ball.scale.setScalar(1 + Math.sin(game.time * 50) * 0.12);
        }
      });
      impactMeshes.forEach((object, index) => {
        const effect = game.impacts[index];
        object.visible = !!effect;
        if (effect) {
          object.position.set(effect.x, effect.y, 1.6);
          const big = effect.kind === 'ko';
          const scale = big
            ? 2 + (1 - effect.life / 0.7) * 6
            : 1 + (1 - effect.life / 0.3) * 2;
          object.scale.set(scale, big ? scale * 0.55 : scale, 1);
          object.rotation.z = game.time * 4;
          object.material.color.set(
            effect.kind === 'shield' ? 0x88caff : big ? 0xffd843 : 0xfff5c4,
          );
          object.material.opacity = Math.min(1, effect.life * 5);
        }
      });
      const minY =
        Math.min(
          0,
          ...bodies.filter((b) => b.stocks > 0).map((b) => Math.max(-8, b.y)),
        ) - 2.8;
      const maxY = Math.max(
        10,
        ...bodies
          .filter((b) => b.stocks > 0)
          .map((b) => Math.min(24, b.y + 3.5)),
      );
      const aspect = width / Math.max(1, height),
        desiredX = THREE.MathUtils.clamp(
          (game.player.x + game.opponent.x) / 2,
          -8,
          8,
        );
      const desiredHalf = Math.max(
        7.8,
        (maxY - minY) * 0.57,
        (Math.abs(game.player.x - game.opponent.x) + 11) / (2 * aspect),
      );
      const elapsed = Math.max(
          1 / 120,
          Math.min(0.1, game.time - lastTime || 1 / 60),
        ),
        smoothing = 1 - Math.exp(-elapsed * 5);
      lookX += (desiredX - lookX) * smoothing;
      lookY += ((minY + maxY) / 2 - lookY) * smoothing;
      halfHeight += (desiredHalf - halfHeight) * smoothing;
      lastTime = game.time;
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      const shake =
        game.flash > 0 && game.flash < 0.15
          ? Math.sin(game.time * 130) * game.flash * 1.3
          : 0;
      camera.position.set(lookX + shake, lookY + 3.3, 34);
      camera.lookAt(lookX, lookY, 0);
      const key = `${Math.floor(game.time * 10)}:${game.player.percent}:${game.opponent.percent}:${game.player.stocks}:${game.opponent.stocks}:${game.phase}`;
      if (key !== hudKey) {
        drawHUD(hudContext, game);
        hudTexture.needsUpdate = true;
        hudKey = key;
      }
      renderer.autoClear = true;
      renderer.render(scene, camera);
      drawCalls = renderer.info.render.calls;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(hudScene, hudCamera);
      drawCalls += renderer.info.render.calls;
      renderer.autoClear = true;
    },
    metrics: () => ({
      drawCalls,
      entities: 6 + game.fireballs.length + game.impacts.length,
    }),
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      for (const root of [scene, hudScene])
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            materials.add(material);
            const map = (material as THREE.MeshBasicMaterial).map;
            if (map) textures.add(map);
          }
        });
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      impactMaterial.dispose();
      sun.shadow.map?.dispose();
      sun.shadow.mapPass?.dispose();
      renderer.dispose();
      releasePaintCache();
    },
  };
}
