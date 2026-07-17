import * as THREE from "three";

// ---------- basic setup ----------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

const fog = new THREE.Fog(0x9fd8ff, 60, 400);
scene.fog = fog;

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(-50, 80, -30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);

// ---------- time-of-day presets (lighting only) ----------
const timePresets = {
  day:    { sky: 0x9fd8ff, fog: 0x9fd8ff, ambient: 0.6, sun: 1.0, sunColor: 0xffffff },
  sunset: { sky: 0xff9a5c, fog: 0xffb28a, ambient: 0.4, sun: 1.1, sunColor: 0xffcf9e },
  night:  { sky: 0x0a1029, fog: 0x0a1029, ambient: 0.15, sun: 0.2, sunColor: 0x88a2ff },
};

function applyPreset(name) {
  const p = timePresets[name];
  scene.background = new THREE.Color(p.sky);
  fog.color = new THREE.Color(p.fog);
  ambient.intensity = p.ambient;
  sun.intensity = p.sun;
  sun.color = new THREE.Color(p.sunColor);
}

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
  hills:  { label: "Coastal Hills", ground: 0x4a8f4a, tree: 0x2f7a3a, curveAmp1: 40, curveAmp2: 10, treeDensity: 6 },
  desert: { label: "Desert Dunes",  ground: 0xd8b06a, tree: 0x8a9c4c, curveAmp1: 65, curveAmp2: 5,  treeDensity: 2 },
  snow:   { label: "Snowy Pines",   ground: 0xf3f6fa, tree: 0x274a3a, curveAmp1: 28, curveAmp2: 16, treeDensity: 8 },
  canyon: { label: "Red Canyon",    ground: 0xb85c3c, tree: 0x6b5636, curveAmp1: 55, curveAmp2: 20, treeDensity: 3 },
};

let currentMap = MAPS.hills;

// ---------- procedural road ----------
const ROAD_WIDTH = 12;
const CHUNK_LENGTH = 40;
const CHUNKS_AHEAD = 14;
const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b2b30 });
const lineMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2 });

function roadCurveX(z) {
  return Math.sin(z * 0.0025) * currentMap.curveAmp1 + Math.sin(z * 0.008) * currentMap.curveAmp2;
}

function roadHeadingAt(z) {
  const delta = 1;
  const x1 = roadCurveX(z);
  const x2 = roadCurveX(z + delta);
  return Math.atan2(x2 - x1, delta);
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

function buildChunk(index) {
  const zStart = index * CHUNK_LENGTH;
  const segments = 8;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const z = zStart + (i / segments) * CHUNK_LENGTH;
    const cx = roadCurveX(z);
    positions.push(cx - ROAD_WIDTH / 2, 0.01, z, cx + ROAD_WIDTH / 2, 0.01, z);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const roadMesh = new THREE.Mesh(geo, roadMat);
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  const dashGroup = new THREE.Group();
  for (let i = 0; i < segments; i += 2) {
    const z = zStart + (i / segments) * CHUNK_LENGTH;
    const cx = roadCurveX(z);
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 3), lineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(cx, 0.02, z);
    dashGroup.add(dash);
  }
  scene.add(dashGroup);

  const trees = new THREE.Group();
  for (let i = 0; i < currentMap.treeDensity; i++) {
    const z = zStart + Math.random() * CHUNK_LENGTH;
    const cx = roadCurveX(z);
    const side = Math.random() < 0.5 ? -1 : 1;
    const dist = ROAD_WIDTH / 2 + 4 + Math.random() * 20;
    const tree = makeTree();
    tree.position.set(cx + side * dist, 0, z);
    trees.add(tree);
  }
  scene.add(trees);

  return { index, roadMesh, dashGroup, trees };
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
    scene.remove(old.roadMesh, old.dashGroup, old.trees);
  }
}

function rebuildWorld() {
  while (roadChunks.length) {
    const old = roadChunks.shift();
    scene.remove(old.roadMesh, old.dashGroup, old.trees);
  }
  ensureChunks(state.z);
}

function applyMap(key) {
  currentMap = MAPS[key];
  ground.material.color.set(currentMap.ground);
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

  if (state.running) {
    const forward = keys["w"] || keys["arrowup"];
    const backward = keys["s"] || keys["arrowdown"];
    const left = keys["a"] || keys["arrowleft"];
    const right = keys["d"] || keys["arrowright"];
    const manualSteer = left || right;
    const manualThrottle = forward || backward;

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

    wheels.forEach((w) => (w.rotation.x -= state.speed * dt * 0.8));
    ensureChunks(state.z);
  }

  car.position.set(state.x, 0, state.z);
  car.rotation.y = state.heading;

  const camDist = 9, camHeight = 4;
  const offsetX = -Math.sin(state.heading) * camDist;
  const offsetZ = -Math.cos(state.heading) * camDist;
  const camTarget = new THREE.Vector3(state.x + offsetX, camHeight, state.z + offsetZ);
  camera.position.lerp(camTarget, 1 - Math.pow(0.001, dt));
  camera.lookAt(state.x, 1.2, state.z);

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