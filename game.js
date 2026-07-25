/* global THREE */

(() => {
  "use strict";

  const sceneHolder = document.querySelector("#scene");
  const startScreen = document.querySelector("#start-screen");
  const startButton = document.querySelector("#start-button");
  const startMessage = document.querySelector("#start-message");
  const notice = document.querySelector("#notice");
  const blueStatus = document.querySelector("#blue-status");
  const redStatus = document.querySelector("#red-status");
  const chargeBar = document.querySelector("#charge-bar");

  if (!window.THREE) {
    startMessage.textContent =
      "Не вдалося завантажити Three.js. Перевір інтернет і перезавантаж сторінку.";
    startMessage.classList.add("error");
    startButton.textContent = "НЕМАЄ З'ЄДНАННЯ";
    startButton.disabled = true;
    return;
  }

  const EYE_HEIGHT = 1.62;
  const ROOM_WIDTH = 16;
  const ROOM_DEPTH = 20;
  const ROOM_HEIGHT = 6.5;
  const PORTAL_WIDTH = 1.25;
  const PORTAL_HEIGHT = 2.12;

  const ASSETS = {
    gunModel: "models/PortalGun.obj",
    gunTexture: "textures/bruportal.png",
    bluePortal:
      "textures/blue-portal-portal-2-orange-portal-11563105547ekp6yyo75z.png",
    redPortal:
      "textures/red-portal-portal-2-orange-portal-11563105547ekp6yyo75z (1).png",
    shotSound: "sounds/portal-gun-ice.mp3",
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    startMessage.textContent =
      "У браузері вимкнено WebGL. Увімкни апаратне прискорення або відкрий гру в Chrome чи Edge.";
    startMessage.classList.add("error");
    startButton.textContent = "3D НЕДОСТУПНЕ";
    startButton.disabled = true;
    console.error(error);
    return;
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sceneHolder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#9da6a8");
  scene.fog = new THREE.Fog("#9da6a8", 12, 31);

  const camera = new THREE.PerspectiveCamera(
    74,
    window.innerWidth / window.innerHeight,
    0.025,
    70,
  );
  camera.position.set(0, EYE_HEIGHT, 7.2);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  scene.add(new THREE.HemisphereLight("#e0f7ff", "#3d4547", 2.05));

  const mainLight = new THREE.DirectionalLight("#f5fbff", 2.5);
  mainLight.position.set(-3, 6.2, 4);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  scene.add(mainLight);

  function makePanelTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#d7d9d6";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#9ca19e";
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 500);
    ctx.strokeStyle = "rgba(255,255,255,.78)";
    ctx.lineWidth = 3;
    ctx.strokeRect(13, 13, 486, 486);

    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, "rgba(255,255,255,.2)");
    gradient.addColorStop(1, "rgba(25,35,40,.12)");
    ctx.fillStyle = gradient;
    ctx.fillRect(16, 16, 480, 480);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 5);
    return texture;
  }

  const panelTexture = makePanelTexture();
  const panelMaterial = new THREE.MeshStandardMaterial({
    map: panelTexture,
    color: "#d9dcda",
    roughness: 0.74,
    metalness: 0.04,
  });
  const floorMaterial = panelMaterial.clone();
  floorMaterial.color.set("#c7ccca");

  const surfaces = [];

  function addSurface(width, height, position, rotation, material) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      material,
    );
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    mesh.receiveShadow = true;
    mesh.userData.portalWidth = width;
    mesh.userData.portalHeight = height;
    surfaces.push(mesh);
    scene.add(mesh);
  }

  addSurface(
    ROOM_WIDTH,
    ROOM_DEPTH,
    new THREE.Vector3(0, 0, 0),
    new THREE.Euler(-Math.PI / 2, 0, 0),
    floorMaterial,
  );
  addSurface(
    ROOM_WIDTH,
    ROOM_DEPTH,
    new THREE.Vector3(0, ROOM_HEIGHT, 0),
    new THREE.Euler(Math.PI / 2, 0, 0),
    panelMaterial,
  );
  addSurface(
    ROOM_WIDTH,
    ROOM_HEIGHT,
    new THREE.Vector3(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2),
    new THREE.Euler(0, 0, 0),
    panelMaterial,
  );
  addSurface(
    ROOM_WIDTH,
    ROOM_HEIGHT,
    new THREE.Vector3(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2),
    new THREE.Euler(0, Math.PI, 0),
    panelMaterial,
  );
  addSurface(
    ROOM_DEPTH,
    ROOM_HEIGHT,
    new THREE.Vector3(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0),
    new THREE.Euler(0, Math.PI / 2, 0),
    panelMaterial,
  );
  addSurface(
    ROOM_DEPTH,
    ROOM_HEIGHT,
    new THREE.Vector3(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0),
    new THREE.Euler(0, -Math.PI / 2, 0),
    panelMaterial,
  );

  const ceilingPanelMaterial = new THREE.MeshStandardMaterial({
    color: "#f8ffff",
    emissive: "#d6f5ff",
    emissiveIntensity: 1.65,
    roughness: 0.25,
  });

  [-4.6, 0, 4.6].forEach((x) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.65, 0.08, 0.78),
      ceilingPanelMaterial,
    );
    panel.position.set(x, ROOM_HEIGHT - 0.08, 0);
    scene.add(panel);
  });

  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 160;
  const signCtx = signCanvas.getContext("2d");
  signCtx.fillStyle = "#f4f6f3";
  signCtx.fillRect(0, 0, 512, 160);
  signCtx.fillStyle = "#1b2224";
  signCtx.font = "700 60px Arial";
  signCtx.textAlign = "center";
  signCtx.fillText("BRU // 01", 256, 101);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 1.03),
    new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.55 }),
  );
  sign.position.set(0, 3.65, -9.965);
  scene.add(sign);

  function buildFallbackGun() {
    const gun = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({
      color: "#e7ece9",
      roughness: 0.34,
      metalness: 0.18,
    });
    const black = new THREE.MeshStandardMaterial({
      color: "#151a1c",
      roughness: 0.55,
      metalness: 0.5,
    });
    const glow = new THREE.MeshBasicMaterial({ color: "#4dc8ff" });

    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.29, 0.86, 24),
      white,
    );
    shell.rotation.x = Math.PI / 2;
    shell.scale.x = 1.18;
    gun.add(shell);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.72, 20),
      black,
    );
    core.rotation.x = Math.PI / 2;
    core.position.z = -0.44;
    gun.add(core);

    const energy = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 20, 12),
      glow,
    );
    energy.position.z = -0.79;
    energy.scale.z = 1.45;
    gun.add(energy);

    [-1, 1].forEach((side) => {
      const claw = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.035, 0.62, 5, 10),
        black,
      );
      claw.rotation.x = Math.PI / 2;
      claw.rotation.z = side * 0.26;
      claw.position.set(side * 0.21, 0.02, -0.68);
      gun.add(claw);
    });

    return gun;
  }

  const gunRig = new THREE.Group();
  gunRig.position.set(0.63, -0.52, -1.18);
  camera.add(gunRig);

  let gunVisual = buildFallbackGun();
  gunVisual.rotation.y = Math.PI;
  gunVisual.scale.setScalar(0.76);
  gunRig.add(gunVisual);

  const muzzleLight = new THREE.PointLight("#4bc7ff", 0, 4.5, 2);
  muzzleLight.position.set(0, 0, -1.12);
  gunRig.add(muzzleLight);

  const textureLoader = new THREE.TextureLoader();
  let gunTexture = null;

  function applyGunTexture(object, texture) {
    object.traverse((child) => {
      if (!child.isMesh) return;
      child.material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.42,
        metalness: 0.2,
      });
    });
  }

  async function loadSimpleObj(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("OBJ model was not found");
    const text = await response.text();
    const vertices = [[0, 0, 0]];
    const normals = [[0, 0, 1]];
    const uvs = [[0, 0]];
    const outputVertices = [];
    const outputNormals = [];
    const outputUvs = [];
    let hasNormals = false;
    let hasUvs = false;

    function resolveIndex(value, arrayLength) {
      const index = Number(value || 0);
      return index < 0 ? arrayLength + index : index;
    }

    function appendPoint(token) {
      const [vertexPart, uvPart, normalPart] = token.split("/");
      const vertex =
        vertices[resolveIndex(vertexPart, vertices.length)] || vertices[0];
      outputVertices.push(vertex[0], vertex[1], vertex[2]);

      if (uvPart) {
        const uv = uvs[resolveIndex(uvPart, uvs.length)] || uvs[0];
        outputUvs.push(uv[0], uv[1]);
        hasUvs = true;
      } else {
        outputUvs.push(0, 0);
      }

      if (normalPart) {
        const normal =
          normals[resolveIndex(normalPart, normals.length)] || normals[0];
        outputNormals.push(normal[0], normal[1], normal[2]);
        hasNormals = true;
      } else {
        outputNormals.push(0, 0, 1);
      }
    }

    text.split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) return;
      const parts = line.split(/\s+/);
      const type = parts.shift();

      if (type === "v") {
        vertices.push(parts.slice(0, 3).map(Number));
      } else if (type === "vn") {
        normals.push(parts.slice(0, 3).map(Number));
      } else if (type === "vt") {
        uvs.push(parts.slice(0, 2).map(Number));
      } else if (type === "f" && parts.length >= 3) {
        for (let index = 1; index < parts.length - 1; index += 1) {
          appendPoint(parts[0]);
          appendPoint(parts[index]);
          appendPoint(parts[index + 1]);
        }
      }
    });

    if (!outputVertices.length) throw new Error("OBJ has no faces");

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(outputVertices, 3),
    );
    if (hasUvs) {
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(outputUvs, 2),
      );
    }
    if (hasNormals) {
      geometry.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(outputNormals, 3),
      );
    } else {
      geometry.computeVertexNormals();
    }
    geometry.computeBoundingBox();

    return new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: "#e7ece9",
        roughness: 0.42,
        metalness: 0.2,
      }),
    );
  }

  textureLoader.load(
    ASSETS.gunTexture,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      gunTexture = texture;
      applyGunTexture(gunVisual, texture);
    },
    undefined,
    () => {},
  );

  loadSimpleObj(ASSETS.gunModel)
    .then((object) => {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        object.scale.setScalar(1.15 / (Math.max(size.x, size.y, size.z) || 1));
        object.rotation.y = Math.PI;
        if (gunTexture) applyGunTexture(object, gunTexture);
        gunRig.remove(gunVisual);
        gunVisual = object;
        gunRig.add(gunVisual);
    })
    .catch(() => {});

  const keys = new Set();
  const raycaster = new THREE.Raycaster();
  const portals = { blue: null, red: null };
  const velocity = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const clock = new THREE.Clock();
  const rotation180 = new THREE.Quaternion().setFromAxisAngle(up, Math.PI);

  let yaw = 0;
  let pitch = 0;
  let verticalVelocity = 0;
  let grounded = true;
  let nextShotAt = 0;
  let recoil = 0;
  let elapsed = 0;
  let teleportLock = 0;
  let noticeTimer = 0;

  function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.className = isError ? "visible error" : "visible";
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice.className = "";
    }, 1250);
  }

  function synthShot(color) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(
      color === "blue" ? 245 : 190,
      context.currentTime,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      color === "blue" ? 72 : 55,
      context.currentTime + 0.22,
    );
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.29);
  }

  function playShot(color) {
    const audio = new Audio(ASSETS.shotSound);
    audio.volume = 0.42;
    audio.play().catch(() => synthShot(color));
  }

  function createPortal(color, hit) {
    const surface = hit.object;
    const uv = hit.uv;
    const marginU = PORTAL_WIDTH / 2 / surface.userData.portalWidth + 0.018;
    const marginV = PORTAL_HEIGHT / 2 / surface.userData.portalHeight + 0.018;

    if (
      !uv ||
      uv.x < marginU ||
      uv.x > 1 - marginU ||
      uv.y < marginV ||
      uv.y > 1 - marginV
    ) {
      showNotice("Занадто близько до краю", true);
      return false;
    }

    if (portals[color]) scene.remove(portals[color].group);

    const group = new THREE.Group();
    group.position.copy(hit.point);
    group.quaternion.copy(surface.getWorldQuaternion(new THREE.Quaternion()));
    group.translateZ(0.026);

    const portalColor = color === "blue" ? "#35bfff" : "#ff5132";
    const darkColor = color === "blue" ? "#061a36" : "#310705";

    const centerMaterial = new THREE.MeshBasicMaterial({
      color: darkColor,
      transparent: true,
      opacity: 0.97,
      side: THREE.DoubleSide,
    });
    const center = new THREE.Mesh(
      new THREE.CircleGeometry(PORTAL_WIDTH / 2 - 0.055, 64),
      centerMaterial,
    );
    center.scale.y = PORTAL_HEIGHT / PORTAL_WIDTH;
    group.add(center);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        PORTAL_WIDTH / 2 - 0.035,
        PORTAL_WIDTH / 2 + 0.06,
        72,
      ),
      new THREE.MeshBasicMaterial({
        color: portalColor,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.scale.y = PORTAL_HEIGHT / PORTAL_WIDTH;
    ring.position.z = 0.008;
    group.add(ring);

    const artworkMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const artwork = new THREE.Mesh(
      new THREE.CircleGeometry(PORTAL_WIDTH / 2 - 0.02, 64),
      artworkMaterial,
    );
    artwork.scale.y = PORTAL_HEIGHT / PORTAL_WIDTH;
    artwork.position.z = 0.014;
    group.add(artwork);

    textureLoader.load(
      color === "blue" ? ASSETS.bluePortal : ASSETS.redPortal,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        artworkMaterial.map = texture;
        artworkMaterial.opacity = 0.92;
        artworkMaterial.needsUpdate = true;
      },
      undefined,
      () => {},
    );

    const normal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(group.quaternion)
      .normalize();
    portals[color] = { group, normal };
    scene.add(group);

    (color === "blue" ? blueStatus : redStatus).classList.add("active");
    return true;
  }

  function shoot(color) {
    const now = performance.now();
    if (now < nextShotAt) {
      showNotice("Portal Gun заряджається…");
      return;
    }

    nextShotAt = now + 1000;
    recoil = 1;
    muzzleLight.color.set(color === "blue" ? "#48c7ff" : "#ff5031");
    muzzleLight.intensity = 7;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(surfaces, false);
    if (!hits.length) {
      showNotice("Поверхню не знайдено", true);
      synthShot(color);
      return;
    }

    if (createPortal(color, hits[0])) {
      playShot(color);
      showNotice(
        color === "blue" ? "Синій портал створено" : "Червоний портал створено",
      );
    } else {
      synthShot(color);
    }
  }

  function tryTeleport() {
    if (teleportLock > 0 || !portals.blue || !portals.red) return;

    const pairs = [
      [portals.blue, portals.red],
      [portals.red, portals.blue],
    ];

    for (const [source, destination] of pairs) {
      const verticalSurface = Math.abs(source.normal.y) < 0.7;
      const probe = camera.position
        .clone()
        .addScaledVector(source.normal, verticalSurface ? -0.28 : -1.08);
      const local = source.group.worldToLocal(probe);
      const ellipse =
        (local.x / (PORTAL_WIDTH * 0.48)) ** 2 +
        (local.y / (PORTAL_HEIGHT * 0.48)) ** 2;

      if (local.z < -0.1 || local.z > 0.62 || ellipse > 1) continue;

      const sourceQ = source.group.getWorldQuaternion(new THREE.Quaternion());
      const destinationQ = destination.group.getWorldQuaternion(
        new THREE.Quaternion(),
      );
      const transferQ = destinationQ
        .clone()
        .multiply(rotation180)
        .multiply(sourceQ.clone().invert());

      const exitDistance =
        Math.abs(destination.normal.y) > 0.7 ? EYE_HEIGHT + 0.22 : 0.82;
      const destinationLocal = new THREE.Vector3(
        -local.x,
        local.y,
        exitDistance,
      );
      camera.position.copy(destination.group.localToWorld(destinationLocal));

      velocity.applyQuaternion(transferQ);
      verticalVelocity = velocity.y;
      if (velocity.length() < 2.4) {
        velocity.addScaledVector(destination.normal, 3.2);
        verticalVelocity = velocity.y;
      }

      const look = new THREE.Vector3();
      camera.getWorldDirection(look);
      look.applyQuaternion(transferQ).normalize();
      pitch = Math.asin(THREE.MathUtils.clamp(look.y, -0.98, 0.98));
      yaw = Math.atan2(-look.x, -look.z);
      teleportLock = 0.55;
      showNotice("Прохід завершено");
      return;
    }
  }

  startButton.addEventListener("click", () => {
    renderer.domElement.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    const playing = document.pointerLockElement === renderer.domElement;
    startScreen.classList.toggle("hidden", playing);
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== renderer.domElement) return;
    yaw -= event.movementX * 0.00225;
    pitch -= event.movementY * 0.00225;
    pitch = THREE.MathUtils.clamp(pitch, -1.48, 1.48);
  });

  renderer.domElement.addEventListener("mousedown", (event) => {
    if (document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock();
      return;
    }
    if (event.button === 0) shoot("blue");
    if (event.button === 2) shoot("red");
  });

  renderer.domElement.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  document.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (event.code === "Space" && grounded) {
      verticalVelocity = 5.2;
      grounded = false;
    }
    if (event.code === "KeyR") {
      ["blue", "red"].forEach((color) => {
        if (portals[color]) scene.remove(portals[color].group);
        portals[color] = null;
      });
      blueStatus.classList.remove("active");
      redStatus.classList.remove("active");
      showNotice("Портали очищено");
    }
  });

  document.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  });

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.033);
    elapsed += delta;
    teleportLock = Math.max(0, teleportLock - delta);

    const moveX =
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const moveZ =
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);

    camera.rotation.set(pitch, yaw, 0);
    forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    right.crossVectors(forward, up).normalize();

    const wish = new THREE.Vector3()
      .addScaledVector(forward, moveZ)
      .addScaledVector(right, moveX);
    if (wish.lengthSq() > 1) wish.normalize();
    wish.multiplyScalar(keys.has("ShiftLeft") ? 6.3 : 4.45);

    velocity.x = THREE.MathUtils.damp(velocity.x, wish.x, grounded ? 12 : 5, delta);
    velocity.z = THREE.MathUtils.damp(velocity.z, wish.z, grounded ? 12 : 5, delta);
    verticalVelocity -= 12.8 * delta;
    velocity.y = verticalVelocity;

    camera.position.addScaledVector(velocity, delta);
    tryTeleport();

    if (camera.position.y <= EYE_HEIGHT) {
      camera.position.y = EYE_HEIGHT;
      verticalVelocity = 0;
      velocity.y = 0;
      grounded = true;
    }

    camera.position.y = Math.min(camera.position.y, ROOM_HEIGHT - 0.22);
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      -ROOM_WIDTH / 2 + 0.31,
      ROOM_WIDTH / 2 - 0.31,
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      -ROOM_DEPTH / 2 + 0.31,
      ROOM_DEPTH / 2 - 0.31,
    );

    const speed = Math.hypot(velocity.x, velocity.z);
    const bob =
      grounded &&
      Math.sin(elapsed * (7.5 + speed * 0.35)) * Math.min(speed / 4, 1);
    recoil = THREE.MathUtils.damp(recoil, 0, 12, delta);
    gunRig.position.set(0.63, -0.52 + bob * 0.018, -1.18 + recoil * 0.15);
    gunRig.rotation.set(-0.04 + bob * 0.014 - recoil * 0.11, -0.08, -moveX * 0.025);
    muzzleLight.intensity = THREE.MathUtils.damp(
      muzzleLight.intensity,
      0,
      18,
      delta,
    );

    ["blue", "red"].forEach((color) => {
      const portal = portals[color];
      if (!portal) return;
      portal.group.children[1].rotation.z +=
        delta * (color === "blue" ? 0.35 : -0.35);
    });

    const remaining = Math.max(0, nextShotAt - performance.now());
    chargeBar.style.transform = `scaleX(${1 - remaining / 1000})`;

    renderer.render(scene, camera);
  }

  animate();
})();
