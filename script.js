import * as THREE from "three";

// ---------- basic setup ----------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const BASE_FOV = 58;
const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 2000);

const fog = new THREE.Fog(0x9fd8ff, 50, 480);
scene.fog = fog;

const hemi = new THREE.HemisphereLight(0x9fd8ff, 0x4a8f4a, 0.7);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1);
const SUN_OFFSET = new THREE.Vector3(-50, 80, -30);
sun.position.copy(SUN_OFFSET);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);
scene.add(sun.target);

// ---------- ground ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  new THREE.MeshStandardMaterial({ color: 0x4a8f4a })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------- vehicles & maps ----------
const VEHICLES = {
  coupe:   { label: "Coupe",   body: 0xd94a4a, cabin: 0x1c1c22, scale: 1.00, maxSpeed: 42, accel: 18, turnSpeed: 1.6 },
  cruiser: { label: "Cruiser", body: 0x4a7fd9, cabin: 0x161d2b, scale: 1.15, maxSpeed: 50, accel: 14, turnSpeed: 1.3 },
  rally:   { label: "Rally",   body: 0xf2c14e, cabin: 0x2a2a2a, scale: 0.92, maxSpeed: 38, accel: 24, turnSpeed: 2.0 },
  classic: { label: "Classic", body: 0xe8ddc7, cabin: 0x3a2f22, scale: 1.05, maxSpeed: 34, accel: 12, turnSpeed: 1.4 },
};

const MAPS = {
  hills:  { label: "Coastal Hills", ground: 0x4a8f4a, tree: 0x2f7a3a, mountainColor: 0x3c6b52, shoulder: 0x5c4a32, rock: 0x8a8a8a, curveAmp1: 40, curveAmp2: 10, treeDensity: 9 },
  desert: { label: "Desert Dunes",  ground: 0xd8b06a, tree: 0x8a9c4c, mountainColor: 0xc98a52, shoulder: 0xc2986a, rock: 0xb98a55, curveAmp1: 65, curveAmp2: 5,  treeDensity: 4 },
  snow:   { label: "Snowy Pines",   ground: 0xf3f6fa, tree: 0x274a3a, mountainColor: 0x8fa9c9, shoulder: 0xc9d3da, rock: 0xaab4bd, curveAmp1: 28, curveAmp2: 16, treeDensity: 12 },
  canyon: { label: "Red Canyon",    ground: 0xb85c3c, tree: 0x6b5636, mountainColor: 0x8a4a35, shoulder: 0x8f5236, rock: 0x7a4636, curveAmp1: 55, curveAmp2: 20, treeDensity: 5 },
};

let currentMap = MAPS.hills;

// ---------- atmosphere & sky ----------
function makeGlowTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function makeSkyDome() {
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const count = geo.attributes.position.count;
  geo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  return mesh;
}

function updateSkyGradient(horizonHex, zenithHex) {
  const horizon = new THREE.Color(horizonHex);
  const zenith = new THREE.Color(zenithHex);
  const pos = skyDome.geometry.attributes.position;
  const colorAttr = skyDome.geometry.attributes.color;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) + 120) / 900, 0, 1);
    c.lerpColors(horizon, zenith, t);
    colorAttr.setXYZ(i, c.r, c.g, c.b);
  }
  colorAttr.needsUpdate = true;
  scene.background = horizon;
}

function makeStars() {
  const count = 600;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    const r = 850;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false });
  const pts = new THREE.Points(geo, mat);
  pts.visible = false;
  return pts;
}

function makeMountainRing(material) {
  const group = new THREE.Group();
  const count = 22;
  const baseRadius = 240;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.15;
    const h = 50 + Math.random() * 90;
    const r = 35 + Math.random() * 45;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), material);
    const dist = baseRadius + Math.random() * 40;
    cone.position.set(Math.cos(angle) * dist, h / 2 - 6, Math.sin(angle) * dist);
    cone.rotation.y = Math.random() * Math.PI;
    group.add(cone);
  }
  return group;
}

const atmosphere = new THREE.Group();
scene.add(atmosphere);

const skyDome = makeSkyDome();
atmosphere.add(skyDome);

const stars = makeStars();
atmosphere.add(stars);

const glowTexture = makeGlowTexture();
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture, color: 0xfff6df, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
}));
const SUN_DIR = SUN_OFFSET.clone().normalize();
sunSprite.position.copy(SUN_DIR).multiplyScalar(650);
sunSprite.scale.set(130, 130, 1);
atmosphere.add(sunSprite);

const mountainMat = new THREE.MeshBasicMaterial({ color: currentMap.mountainColor });
const mountains = makeMountainRing(mountainMat);
atmosphere.add(mountains);

const CLOUD_COUNT = 16;
const clouds = [];
for (let i = 0; i < CLOUD_COUNT; i++) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture, color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
  const sprite = new THREE.Sprite(mat);
  const scale = 60 + Math.random() * 70;
  sprite.scale.set(scale, scale * 0.45, 1);
  const angle = Math.random() * Math.PI * 2;
  const dist = 90 + Math.random() * 200;
  sprite.position.set(Math.cos(angle) * dist, 90 + Math.random() * 40, Math.sin(angle) * dist);
  sprite.userData.drift = (Math.random() - 0.5) * 3.5;
  atmosphere.add(sprite);
  clouds.push(sprite);
}

// ---------- time-of-day presets ----------
const timePresets = {
  day: {
    fog: 0x9fd8ff, skyHorizon: 0xbfe4ff, skyZenith: 0x1e6fd9,
    hemiSky: 0x9fd8ff, hemiIntensity: 0.75, sun: 1.05, sunColor: 0xffffff,
    sunVisualColor: 0xfff6df, sunVisualScale: 130,
    cloudColor: 0xffffff, cloudOpacity: 0.85,
    headlight: 0, starsVisible: false,
  },
  sunset: {
    fog: 0xffb28a, skyHorizon: 0xffb073, skyZenith: 0x3c2f63,
    hemiSky: 0xffb073, hemiIntensity: 0.55, sun: 1.15, sunColor: 0xffcf9e,
    sunVisualColor: 0xff9a5c, sunVisualScale: 170,
    cloudColor: 0xffcaa0, cloudOpacity: 0.8,
    headlight: 0.5, starsVisible: false,
  },
  night: {
    fog: 0x0a1029, skyHorizon: 0x141b3d, skyZenith: 0x02040c,
    hemiSky: 0x223159, hemiIntensity: 0.25, sun: 0.15, sunColor: 0x88a2ff,
    sunVisualColor: 0xcfd8ff, sunVisualScale: 70,
    cloudColor: 0x333a5c, cloudOpacity: 0.4,
    headlight: 1.3, starsVisible: true,
  },
};

function applyPreset(name) {
  const p = timePresets[name];
  fog.color.set(p.fog);
  hemi.color.set(p.hemiSky);
  hemi.intensity = p.hemiIntensity;
  sun.intensity = p.sun;
  sun.color.set(p.sunColor);
  sunSprite.material.color.set(p.sunVisualColor);
  sunSprite.scale.set(p.sunVisualScale, p.sunVisualScale, 1);
  clouds.forEach((c) => {
    c.material.color.set(p.cloudColor);
    c.material.opacity = p.cloudOpacity;
  });
  headlight.intensity = p.headlight;
  reflectorMat.emissiveIntensity = p.headlight > 0 ? 1.1 : 0.15;
  stars.visible = p.starsVisible;
  updateSkyGradient(p.skyHorizon, p.skyZenith);
}

// ---------- procedural road ----------
const ROAD_WIDTH = 12;
const SHOULDER_WIDTH = 3.5; // gap strip between the asphalt and the roadside content
const CHUNK_LENGTH = 40;
const CHUNKS_AHEAD = 14;

const roadMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92, metalness: 0.05 });
const sheenMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.3, metalness: 0.2 });
const lineMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2 });
const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x5c4a32, roughness: 1 });
const bushMat = new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.9 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1 });
const postMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6 });
const reflectorMat = new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff8a3d, emissiveIntensity: 0.15 });

function roadCurveX(z) {
  return Math.sin(z * 0.0025) * currentMap.curveAmp1 + Math.sin(z * 0.008) * currentMap.curveAmp2;
}

function roadHeadingAt(z) {
  const delta = 1;
  const x1 = roadCurveX(z);
  const x2 = roadCurveX(z + delta);
  return Math.atan2(x2 - x1, delta);
}

function buildRibbon(zStart, widthFn, material, yOffset) {
  const segments = 8;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const z = zStart + (i / segments) * CHUNK_LENGTH;
    const [cx, w] = widthFn(z);
    positions.push(cx - w / 2, yOffset, z, cx + w / 2, yOffset, z);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function makeTree() {
  const g = new THREE.Group();
  const trunkH = 2 + Math.random() * 1.5;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.3, trunkH, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f })
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.6 + Math.random(), 3 + Math.random() * 1.5, 7),
    new THREE.MeshStandardMaterial({ color: currentMap.tree })
  );
  leaves.position.y = trunkH + 1.3;
  leaves.castShadow = true;
  g.add(trunk, leaves);
  return g;
}

function makeBush() {
  const g = new THREE.Group();
  const clusters = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < clusters; i++) {
    const r = 0.4 + Math.random() * 0.35;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), bushMat);
    sphere.position.set((Math.random() - 0.5) * 0.7, r * 0.75, (Math.random() - 0.5) * 0.7);
    sphere.castShadow = true;
    g.add(sphere);
  }
  return g;
}

function makeRock() {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.5, 0), rockMat);
  rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

function makeGuidePost() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), postMat);
  post.position.y = 0.5;
  post.castShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.04), reflectorMat);
  cap.position.y = 0.95;
  g.add(post, cap);
  return g;
}

function buildChunk(index) {
  const zStart = index * CHUNK_LENGTH;

  const roadMesh = buildRibbon(zStart, (z) => [roadCurveX(z), ROAD_WIDTH], roadMat, 0.01);
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  const sheen = buildRibbon(zStart, (z) => [roadCurveX(z), 2.2], sheenMat, 0.015);
  scene.add(sheen);

  const edgeInset = ROAD_WIDTH / 2 - 0.18;
  const leftEdge = buildRibbon(zStart, (z) => [roadCurveX(z) - edgeInset, 0.28], lineMat, 0.02);
  const rightEdge = buildRibbon(zStart, (z) => [roadCurveX(z) + edgeInset, 0.28], lineMat, 0.02);
  scene.add(leftEdge, rightEdge);

  const dashGroup = new THREE.Group();
  const segments = 8;
  for (let i = 0; i < segments; i += 2) {
    const z = zStart + (i / segments) * CHUNK_LENGTH;
    const cx = roadCurveX(z);
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 3), lineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(cx, 0.02, z);
    dashGroup.add(dash);
  }
  scene.add(dashGroup);

  // shoulder strip: the clear visual gap between the asphalt and the roadside
  const shoulderOffset = ROAD_WIDTH / 2 + SHOULDER_WIDTH / 2;
  const leftShoulder = buildRibbon(zStart, (z) => [roadCurveX(z) - shoulderOffset, SHOULDER_WIDTH], shoulderMat, 0.006);
  const rightShoulder = buildRibbon(zStart, (z) => [roadCurveX(z) + shoulderOffset, SHOULDER_WIDTH], shoulderMat, 0.006);
  leftShoulder.receiveShadow = true;
  rightShoulder.receiveShadow = true;
  scene.add(leftShoulder, rightShoulder);

  // guide posts mark the outer edge of the shoulder, reinforcing the boundary
  const guidePosts = new THREE.Group();
  const postOffset = ROAD_WIDTH / 2 + SHOULDER_WIDTH + 0.3;
  [2, 6].forEach((i) => {
    const z = zStart + (i / segments) * CHUNK_LENGTH;
    const cx = roadCurveX(z);
    [-1, 1].forEach((side) => {
      const post = makeGuidePost();
      post.position.set(cx + side * postOffset, 0, z);
      guidePosts.add(post);
    });
  });
  scene.add(guidePosts);

  // trees, bushes and rocks all start beyond the shoulder for a clean buffer
  const sideStart = ROAD_WIDTH / 2 + SHOULDER_WIDTH + 1.5;

  const trees = new THREE.Group();
  for (let i = 0; i < currentMap.treeDensity; i++) {
    const z = zStart + Math.random() * CHUNK_LENGTH;
    const cx = roadCurveX(z);
    const side = Math.random() < 0.5 ? -1 : 1;
    const dist = sideStart + Math.random() * 26;
    const tree = makeTree();
    tree.position.set(cx + side * dist, 0, z);
    trees.add(tree);
  }
  scene.add(trees);

  const bushes = new THREE.Group();
  const bushCount = Math.ceil(currentMap.treeDensity * 0.6);
  for (let i = 0; i < bushCount; i++) {
    const z = zStart + Math.random() * CHUNK_LENGTH;
    const cx = roadCurveX(z);
    const side = Math.random() < 0.5 ? -1 : 1;
    const dist = sideStart + Math.random() * 18;
    const bush = makeBush();
    bush.position.set(cx + side * dist, 0, z);
    bushes.add(bush);
  }
  scene.add(bushes);

  const rocks = new THREE.Group();
  const rockCount = Math.ceil(currentMap.treeDensity * 0.35);
  for (let i = 0; i < rockCount; i++) {
    const z = zStart + Math.random() * CHUNK_LENGTH;
    const cx = roadCurveX(z);
    const side = Math.random() < 0.5 ? -1 : 1;
    const dist = sideStart + Math.random() * 22;
    const rock = makeRock();
    rock.position.set(cx + side * dist, 0.15, z);
    rocks.add(rock);
  }
  scene.add(rocks);

  return { index, roadMesh, sheen, leftEdge, rightEdge, dashGroup, leftShoulder, rightShoulder, guidePosts, trees, bushes, rocks };
}

const roadChunks = [];

function ensureChunks(carZ) {
  const currentIndex = Math.floor(carZ / CHUNK_LENGTH);
  while (roadChunks.length === 0 || roadChunks[roadChunks.length - 1].index < currentIndex + CHUNKS_AHEAD) {
    const nextIndex = roadChunks.length === 0 ? currentIndex - 2 : roadChunks[roadChunks.length - 1].index + 1;
    roadChunks.push(buildChunk(nextIndex));
  }
  while (roadChunks.length && roadChunks[0].index < currentIndex - 3) {
    const old = roadChunks.shift();
    scene.remove(old.roadMesh, old.sheen, old.leftEdge, old.rightEdge, old.dashGroup, old.leftShoulder, old.rightShoulder, old.guidePosts, old.trees, old.bushes, old.rocks);
  }
}

function rebuildWorld() {
  while (roadChunks.length) {
    const old = roadChunks.shift();
    scene.remove(old.roadMesh, old.sheen, old.leftEdge, old.rightEdge, old.dashGroup, old.leftShoulder, old.rightShoulder, old.guidePosts, old.trees, old.bushes, old.rocks);
  }
  ensureChunks(state.z);
}

function applyMap(key) {
  currentMap = MAPS[key];
  ground.material.color.set(currentMap.ground);
  mountainMat.color.set(currentMap.mountainColor);
  hemi.groundColor.set(currentMap.ground);
  shoulderMat.color.set(currentMap.shoulder);
  bushMat.color.set(currentMap.tree);
  rockMat.color.set(currentMap.rock);
  rebuildWorld();
}

// ---------- car ----------
const car = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.BoxGeometry(2, 0.7, 4),
  new THREE.MeshStandardMaterial({ color: 0xd94a4a, metalness: 0.3, roughness: 0.4 })
);
body.position.y = 0.6;
body.castShadow = true;

const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 0.6, 2),
  new THREE.MeshStandardMaterial({ color: 0x1c1c22 })
);
cabin.position.set(0, 1.1, -0.2);
cabin.castShadow = true;
car.add(body, cabin);

const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 12);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const wheelPositions = [[-1, 0.4, 1.3], [1, 0.4, 1.3], [-1, 0.4, -1.3], [1, 0.4, -1.3]];
const wheels = wheelPositions.map(([x, y, z]) => {
  const w = new THREE.Mesh(wheelGeo, wheelMat);
  w.rotation.z = Math.PI / 2;
  w.position.set(x, y, z);
  w.castShadow = true;
  car.add(w);
  return w;
});

const lampGeo = new THREE.BoxGeometry(0.3, 0.15, 0.05);
const headlampMat = new THREE.MeshStandardMaterial({ color: 0xfff6df, emissive: 0xfff6df, emissiveIntensity: 1.2 });
const headlampL = new THREE.Mesh(lampGeo, headlampMat);
headlampL.position.set(-0.65, 0.65, -1.98);
const headlampR = headlampL.clone();
headlampR.position.x = 0.65;
car.add(headlampL, headlampR);

const tailMat = new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff3b3b, emissiveIntensity: 0.8 });
const tailL = new THREE.Mesh(lampGeo, tailMat);
tailL.position.set(-0.65, 0.65, 1.98);
const tailR = tailL.clone();
tailR.position.x = 0.65;
car.add(tailL, tailR);

const headlight = new THREE.SpotLight(0xfff3d0, 0, 45, Math.PI / 6.2, 0.5, 1.3);
headlight.position.set(0, 0.75, -2.1);
const headlightTarget = new THREE.Object3D();
headlightTarget.position.set(0, 0.2, -25);
car.add(headlight, headlightTarget);
headlight.target = headlightTarget;

scene.add(car);

function applyVehicle(key) {
  const v = VEHICLES[key];
  body.material.color.set(v.body);
  cabin.material.color.set(v.cabin);
  car.scale.setScalar(v.scale);
  state.maxSpeed = v.maxSpeed;
  state.accel = v.accel;
  state.turnSpeed = v.turnSpeed;
}

// ---------- driving state ----------
const state = {
  z: 0, x: 0, heading: 0, speed: 0,
  maxSpeed: 42, accel: 18, brake: 26, turnSpeed: 1.6,
  running: false, returning: false, autoDrive: false,
};

// ---------- UI wiring ----------
const overlay = document.getElementById("overlay");
const pauseHint = document.getElementById("pause-hint");
const autoBadge = document.getElementById("auto-badge");

function showOverlay() {
  overlay.classList.remove("hidden");
  pauseHint.classList.remove("visible");
  state.running = false;
}

function hideOverlayAndStart() {
  overlay.classList.add("hidden");
  state.running = true;
}

function togglePause() {
  state.running = !state.running;
  pauseHint.classList.toggle("visible", !state.running);
}

function setAutoDrive(on) {
  state.autoDrive = on;
  autoBadge.classList.toggle("active", on);
}

let selectedVehicleKey = "coupe";
let selectedMapKey = "hills";

function populatePicker(containerId, data, selectedKey, colorFn, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  Object.entries(data).forEach(([key, item]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "picker-option" + (key === selectedKey ? " active" : "");
    const hex = "#" + colorFn(item).toString(16).padStart(6, "0");
    btn.innerHTML = `<span class="swatch" style="background:${hex}"></span><span class="picker-label">${item.label}</span>`;
    btn.addEventListener("click", () => {
      container.querySelectorAll(".picker-option").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onSelect(key);
    });
    container.appendChild(btn);
  });
}

document.getElementById("start-btn").addEventListener("click", () => {
  applyMap(selectedMapKey);
  applyVehicle(selectedVehicleKey);
  state.z = 0;
  state.x = 0;
  state.heading = 0;
  state.speed = 0;
  state.returning = false;
  setAutoDrive(false);
  hideOverlayAndStart();
});

document.getElementById("menu-btn").addEventListener("click", () => {
  showOverlay();
});

document.querySelectorAll("#time-toggle button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#time-toggle button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    applyPreset(btn.dataset.time);
  });
});

// ---------- input ----------
const keys = {};
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (e.repeat) return;
  if (e.key === "Escape" && overlay.classList.contains("hidden")) togglePause();
  if (k === "f" && !state.autoDrive) state.returning = true;
  if (k === "r") {
    setAutoDrive(!state.autoDrive);
    if (state.autoDrive) state.returning = false;
  }
});
window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

// ---------- animation loop ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  let targetBank = 0;

  if (state.running) {
    const forward = keys["w"] || keys["arrowup"];
    const backward = keys["s"] || keys["arrowdown"];
    const left = keys["a"] || keys["arrowleft"];
    const right = keys["d"] || keys["arrowright"];
    const manualSteer = left || right;
    const manualThrottle = forward || backward;
    const prevHeading = state.heading;

    if (state.autoDrive && (manualSteer || manualThrottle)) {
      setAutoDrive(false);
    }

    if (state.autoDrive) {
      const cruiseSpeed = state.maxSpeed * 0.75;
      state.speed += (cruiseSpeed - state.speed) * Math.min(1, dt * 1.5);

      const lookAhead = 20;
      const targetX = roadCurveX(state.z + lookAhead);
      let diff = Math.atan2(targetX - state.x, lookAhead) - state.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const maxTurn = state.turnSpeed * dt;
      state.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));
    } else {
      if (forward) state.speed = Math.min(state.maxSpeed, state.speed + state.accel * dt);
      else if (backward) state.speed = Math.max(-state.maxSpeed * 0.4, state.speed - state.brake * dt);
      else state.speed *= Math.max(0, 1 - dt * 0.6);

      if (state.returning && !manualSteer) {
        const targetX = roadCurveX(state.z);
        const targetHeading = roadHeadingAt(state.z);
        const ease = 1 - Math.pow(0.001, dt);
        state.x += (targetX - state.x) * ease;
        let hDiff = targetHeading - state.heading;
        hDiff = Math.atan2(Math.sin(hDiff), Math.cos(hDiff));
        state.heading += hDiff * ease;
        if (Math.abs(targetX - state.x) < 0.05 && Math.abs(hDiff) < 0.01) {
          state.returning = false;
        }
      } else {
        state.returning = false;
        const steer = (left ? 1 : 0) - (right ? 1 : 0);
        state.heading += steer * state.turnSpeed * dt * (0.4 + 0.6 * (state.speed / state.maxSpeed));
      }
    }

    state.z += Math.cos(state.heading) * state.speed * dt;
    state.x += Math.sin(state.heading) * state.speed * dt;

    const headingRate = (state.heading - prevHeading) / dt;
    targetBank = THREE.MathUtils.clamp(-headingRate * 0.15, -0.3, 0.3);

    wheels.forEach((w) => (w.rotation.x -= state.speed * dt * 0.8));
    ensureChunks(state.z);
  }

  car.position.set(state.x, 0, state.z);
  car.rotation.y = state.heading;
  car.rotation.z += (targetBank - car.rotation.z) * Math.min(1, dt * 6);

  ground.position.set(state.x, 0, state.z);
  atmosphere.position.set(state.x, 0, state.z);
  sun.position.set(state.x + SUN_OFFSET.x, SUN_OFFSET.y, state.z + SUN_OFFSET.z);
  sun.target.position.set(state.x, 0, state.z);

  clouds.forEach((c) => {
    c.position.x += c.userData.drift * dt;
    c.position.z += c.userData.drift * 0.6 * dt;
    const dist = Math.hypot(c.position.x, c.position.z);
    if (dist > 300) {
      const angle = Math.atan2(c.position.z, c.position.x) + Math.PI;
      c.position.set(Math.cos(angle) * 95, c.position.y, Math.sin(angle) * 95);
    }
  });

  const speedT = Math.min(1, Math.abs(state.speed) / state.maxSpeed);
  const camDist = 9 + speedT * 2.5;
  const camHeight = 4 + speedT * 0.6;
  const offsetX = -Math.sin(state.heading) * camDist;
  const offsetZ = -Math.cos(state.heading) * camDist;
  const camTarget = new THREE.Vector3(state.x + offsetX, camHeight, state.z + offsetZ);
  camera.position.lerp(camTarget, 1 - Math.pow(0.001, dt));

  const lookAheadDist = 3 + speedT * 6;
  camera.lookAt(state.x + Math.sin(state.heading) * lookAheadDist, 1.2, state.z + Math.cos(state.heading) * lookAheadDist);

  const targetFov = BASE_FOV + speedT * 10;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
  camera.updateProjectionMatrix();

  document.getElementById("speed-value").textContent = Math.round(Math.abs(state.speed) * 3.2);

  renderer.render(scene, camera);
}

// ---------- initial setup ----------
applyPreset("day");
applyMap(selectedMapKey);
applyVehicle(selectedVehicleKey);
populatePicker("vehicle-picker", VEHICLES, selectedVehicleKey, (v) => v.body, (key) => { selectedVehicleKey = key; });
populatePicker("map-picker", MAPS, selectedMapKey, (m) => m.ground, (key) => { selectedMapKey = key; });
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
