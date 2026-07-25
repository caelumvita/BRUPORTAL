/* global THREE */

(() => {
  "use strict";

  const sceneHolder = document.querySelector("#scene");
  const startScreen = document.querySelector("#start-screen");
  const startButton = document.querySelector("#start-button");
  const startMessage = document.querySelector("#start-message");
  const notice = document.querySelector("#notice");
  const chargeBar = document.querySelector("#charge-bar");
  const crosshair = document.querySelector(".crosshair");

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
  const FRONT_Z = 10;
  const DIVIDER_Z = -10;
  const BACK_Z = -22;
  const ROOM_DEPTH = FRONT_Z - BACK_Z;
  const ROOM_HEIGHT = 6.5;
  const PORTAL_WIDTH = 1.25;
  const PORTAL_HEIGHT = 2.12;
  const PORTAL_SEPARATION = 2.25;
  const DOOR_HALF_WIDTH = 1.55;
  const TURRET_CENTER_HEIGHT = 0.64;

  const ASSETS = {
    gunModel: "models/PortalGun.obj",
    turretModel: "models/portalturret.obj",
    buttonModel: "models/portalbutton.obj",

    gunTexture: "textures/bruportal.png",
    wallTexture: "textures/imagewall.png",
    floorTexture: "textures/imagefloor.png",
    turretTexture: "textures/Turret_01.png",
    buttonTexture: "textures/Button.png",

    bluePortal:
      "textures/blue-portal-portal-2-orange-portal-11563105547ekp6yyo75z.png",

    redPortal:
      "textures/red-portal-portal-2-orange-portal-11563105547ekp6yyo75z (1).png",

    shotSound: "sounds/portal-gun-ice.mp3",
    turretHello: "sounds/Hellofriend.mp3",
    menuMusic: "sounds/Still Alive (Radio Mix Clean).mp3",
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.76;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  sceneHolder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#151c1e");
  scene.fog = new THREE.Fog("#151c1e", 14, 38);

  const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.025,
    70,
  );

  camera.position.set(0, EYE_HEIGHT, 6.8);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  scene.add(
    new THREE.HemisphereLight("#a9c0c2", "#111718", 0.58),
  );

  const mainLight = new THREE.DirectionalLight("#dceced", 0.82);
  mainLight.position.set(-4, 7, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  scene.add(mainLight);

  function makePanelTexture(isFloor = false) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = isFloor ? "#606767" : "#707877";
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = isFloor ? "#343a3b" : "#3d4545";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 502);

    ctx.strokeStyle = "rgba(225,240,236,.13)";
    ctx.lineWidth = 3;
    ctx.strokeRect(13, 13, 486, 486);

    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, "rgba(255,255,255,.09)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(0,8,10,.22)");

    ctx.fillStyle = gradient;
    ctx.fillRect(16, 16, 480, 480);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 8);

    return texture;
  }

  const panelMaterial = new THREE.MeshStandardMaterial({
    map: makePanelTexture(false),
    color: "#88908e",
    roughness: 0.78,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: makePanelTexture(true),
    color: "#777e7d",
    roughness: 0.86,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const ceilingMaterial = floorMaterial.clone();
  ceilingMaterial.color.set("#4c5454");

  const textureLoader = new THREE.TextureLoader();

  function loadRoomTexture(
    path,
    material,
    repeatX,
    repeatY,
    color,
  ) {
    textureLoader.load(
      path,

      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.anisotropy =
          renderer.capabilities.getMaxAnisotropy();

        material.map = texture;
        material.color.set(color);
        material.needsUpdate = true;
      },

      undefined,
      () => {},
    );
  }

  loadRoomTexture(
    ASSETS.wallTexture,
    panelMaterial,
    5,
    4,
    "#ffffff",
  );

  loadRoomTexture(
    ASSETS.floorTexture,
    floorMaterial,
    5,
    9,
    "#d0d2cf",
  );

  loadRoomTexture(
    ASSETS.floorTexture,
    ceilingMaterial,
    5,
    9,
    "#8b8f8d",
  );

  const surfaces = [];

  function addSurface(
    width,
    height,
    position,
    rotation,
    material,
  ) {
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

    return mesh;
  }

  addSurface(
    ROOM_WIDTH,
    ROOM_DEPTH,
    new THREE.Vector3(
      0,
      0,
      (FRONT_Z + BACK_Z) / 2,
    ),
    new THREE.Euler(-Math.PI / 2, 0, 0),
    floorMaterial,
  );

  addSurface(
    ROOM_WIDTH,
    ROOM_DEPTH,
    new THREE.Vector3(
      0,
      ROOM_HEIGHT,
      (FRONT_Z + BACK_Z) / 2,
    ),
    new THREE.Euler(Math.PI / 2, 0, 0),
    ceilingMaterial,
  );

  addSurface(
    ROOM_WIDTH,
    ROOM_HEIGHT,
    new THREE.Vector3(
      0,
      ROOM_HEIGHT / 2,
      BACK_Z,
    ),
    new THREE.Euler(0, 0, 0),
    panelMaterial,
  );

  addSurface(
    ROOM_WIDTH,
    ROOM_HEIGHT,
    new THREE.Vector3(
      0,
      ROOM_HEIGHT / 2,
      FRONT_Z,
    ),
    new THREE.Euler(0, Math.PI, 0),
    panelMaterial,
  );

  addSurface(
    ROOM_DEPTH,
    ROOM_HEIGHT,
    new THREE.Vector3(
      -ROOM_WIDTH / 2,
      ROOM_HEIGHT / 2,
      (FRONT_Z + BACK_Z) / 2,
    ),
    new THREE.Euler(0, Math.PI / 2, 0),
    panelMaterial,
  );

  addSurface(
    ROOM_DEPTH,
    ROOM_HEIGHT,
    new THREE.Vector3(
      ROOM_WIDTH / 2,
      ROOM_HEIGHT / 2,
      (FRONT_Z + BACK_Z) / 2,
    ),
    new THREE.Euler(0, -Math.PI / 2, 0),
    panelMaterial,
  );

  const dividerSideWidth =
    (ROOM_WIDTH - DOOR_HALF_WIDTH * 2) / 2;

  const dividerSideX =
    DOOR_HALF_WIDTH + dividerSideWidth / 2;

  addSurface(
    dividerSideWidth,
    ROOM_HEIGHT,
    new THREE.Vector3(
      -dividerSideX,
      ROOM_HEIGHT / 2,
      DIVIDER_Z,
    ),
    new THREE.Euler(0, 0, 0),
    panelMaterial,
  );

  addSurface(
    dividerSideWidth,
    ROOM_HEIGHT,
    new THREE.Vector3(
      dividerSideX,
      ROOM_HEIGHT / 2,
      DIVIDER_Z,
    ),
    new THREE.Euler(0, 0, 0),
    panelMaterial,
  );

  addSurface(
    DOOR_HALF_WIDTH * 2,
    1.55,
    new THREE.Vector3(
      0,
      ROOM_HEIGHT - 0.775,
      DIVIDER_Z,
    ),
    new THREE.Euler(0, 0, 0),
    panelMaterial,
  );

  const ceilingPanelMaterial =
    new THREE.MeshStandardMaterial({
      color: "#dce6e3",
      emissive: "#bed4d0",
      emissiveIntensity: 0.55,
      roughness: 0.32,
    });

  [-1, -6, -15.5].forEach((z, index) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.08, 0.88),
      ceilingPanelMaterial,
    );

    panel.position.set(
      index === 1 ? -3.2 : index === 2 ? 2.8 : 0,
      ROOM_HEIGHT - 0.08,
      z,
    );

    scene.add(panel);

    const light = new THREE.PointLight(
      "#d8efed",
      index === 2 ? 0.72 : 0.92,
      11,
      2,
    );

    light.position
      .copy(panel.position)
      .add(new THREE.Vector3(0, -0.25, 0));

    scene.add(light);
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

  const signTexture =
    new THREE.CanvasTexture(signCanvas);

  signTexture.colorSpace = THREE.SRGBColorSpace;

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 1.03),
    new THREE.MeshStandardMaterial({
      map: signTexture,
      roughness: 0.55,
    }),
  );

  sign.position.set(
    -4.4,
    3.65,
    DIVIDER_Z + 0.018,
  );

  scene.add(sign);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(
      DOOR_HALF_WIDTH * 2 - 0.12,
      4.72,
      0.28,
    ),

    new THREE.MeshStandardMaterial({
      color: "#20282a",
      roughness: 0.42,
      metalness: 0.58,
      emissive: "#071012",
      emissiveIntensity: 0.32,
    }),
  );

  door.position.set(
    0,
    2.36,
    DIVIDER_Z + 0.03,
  );

  door.castShadow = true;
  scene.add(door);

  [-1, 1].forEach((side) => {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 3.9, 0.04),
      new THREE.MeshBasicMaterial({
        color: "#ef9f4c",
      }),
    );

    light.position.set(
      side * (DOOR_HALF_WIDTH - 0.13),
      0,
      0.165,
    );

    door.add(light);
  });

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

    const glow = new THREE.MeshBasicMaterial({
      color: "#4dc8ff",
    });

    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.19,
        0.29,
        0.86,
        24,
      ),
      white,
    );

    shell.rotation.x = Math.PI / 2;
    shell.scale.x = 1.18;
    gun.add(shell);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.13,
        0.13,
        0.72,
        20,
      ),
      black,
    );

    core.rotation.x = Math.PI / 2;
    core.position.z = -0.44;
    gun.add(core);

    const energy = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.105,
        20,
        12,
      ),
      glow,
    );

    energy.position.z = -0.79;
    energy.scale.z = 1.45;
    gun.add(energy);

    [-1, 1].forEach((side) => {
      const claw = new THREE.Mesh(
        new THREE.CapsuleGeometry(
          0.035,
          0.62,
          5,
          10,
        ),
        black,
      );

      claw.rotation.x = Math.PI / 2;
      claw.rotation.z = side * 0.26;
      claw.position.set(
        side * 0.21,
        0.02,
        -0.68,
      );

      gun.add(claw);
    });

    return gun;
  }

  function buildFallbackTurret() {
    const visual = new THREE.Group();

    const white = new THREE.MeshStandardMaterial({
      color: "#d7ddda",
      roughness: 0.4,
      metalness: 0.18,
    });

    const dark = new THREE.MeshStandardMaterial({
      color: "#171d1f",
      roughness: 0.5,
      metalness: 0.42,
    });

    const eyeMaterial =
      new THREE.MeshStandardMaterial({
        color: "#ff5540",
        emissive: "#ff1800",
        emissiveIntensity: 2.6,
      });

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.38,
        24,
        16,
      ),
      white,
    );

    body.scale.set(0.82, 1.32, 0.72);
    body.position.y = 0.22;
    visual.add(body);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.29,
        20,
        14,
      ),
      dark,
    );

    core.scale.set(0.72, 1.05, 0.8);
    core.position.set(0, 0.22, -0.19);
    visual.add(core);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.075,
        16,
        10,
      ),
      eyeMaterial,
    );

    eye.position.set(0, 0.25, -0.46);
    visual.add(eye);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(
          0.035,
          0.74,
          4,
          8,
        ),
        dark,
      );

      leg.position.set(
        side * 0.25,
        -0.38,
        0.03,
      );

      leg.rotation.z = side * 0.32;
      visual.add(leg);
    });

    return visual;
  }

  function buildFallbackButton() {
    const visual = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(
        1.05,
        1.18,
        0.18,
        48,
      ),

      new THREE.MeshStandardMaterial({
        color: "#242b2d",
        roughness: 0.38,
        metalness: 0.5,
      }),
    );

    visual.add(base);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.86,
        0.98,
        0.17,
        48,
      ),

      new THREE.MeshStandardMaterial({
        color: "#d1d7d4",
        roughness: 0.36,
        metalness: 0.22,
      }),
    );

    rim.position.y = 0.12;
    visual.add(rim);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.67,
        0.73,
        0.16,
        48,
      ),

      new THREE.MeshStandardMaterial({
        color: "#de6b42",
        emissive: "#7a1908",
        emissiveIntensity: 0.9,
        roughness: 0.38,
      }),
    );

    top.name = "ButtonTop";
    top.position.y = 0.24;
    visual.add(top);

    return visual;
  }

  const buttonRoot = new THREE.Group();
  buttonRoot.position.set(3.1, 0.09, -5.6);
  scene.add(buttonRoot);

  const buttonVisual = new THREE.Group();
  buttonVisual.add(buildFallbackButton());
  buttonRoot.add(buttonVisual);

  let buttonTop =
    buttonVisual.getObjectByName("ButtonTop") ||
    buttonVisual;

  let buttonTopRestY =
    buttonTop.position.y;

  const turretRoot = new THREE.Group();
  turretRoot.position.set(
    -3.2,
    TURRET_CENTER_HEIGHT,
    -1.5,
  );

  scene.add(turretRoot);

  const turretVisual = new THREE.Group();
  turretVisual.add(buildFallbackTurret());
  turretRoot.add(turretVisual);

  const turret = {
    root: turretRoot,
    visual: turretVisual,
    velocity: new THREE.Vector3(),
    angularVelocity: new THREE.Vector3(),
    radius: 0.46,
    held: false,
    teleportCooldown: 0,
  };

  const gunRig = new THREE.Group();
  gunRig.position.set(0.49, -0.48, -0.93);
  gunRig.rotation.set(-0.08, -0.16, 0.035);
  camera.add(gunRig);

  let gunVisual = buildFallbackGun();
  gunVisual.rotation.y = Math.PI;
  gunVisual.scale.setScalar(0.56);
  gunRig.add(gunVisual);

  const muzzleLight = new THREE.PointLight(
    "#4bc7ff",
    0,
    3.2,
    2,
  );

  muzzleLight.position.set(
    -0.02,
    0.02,
    -0.86,
  );

  gunRig.add(muzzleLight);

  let gunTexture = null;
  let turretTexture = null;
  let buttonTexture = null;

  function applyTexture(object, texture) {
    object.traverse((child) => {
      if (!child.isMesh) return;

      child.material =
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.42,
          metalness: 0.2,
        });
    });
  }

  function normalizeModel(
    object,
    targetSize,
    rotation,
  ) {
    const box =
      new THREE.Box3().setFromObject(object);

    const size =
      box.getSize(new THREE.Vector3());

    const center =
      box.getCenter(new THREE.Vector3());

    object.position.sub(center);

    object.scale.setScalar(
      targetSize /
        (Math.max(size.x, size.y, size.z) || 1),
    );

    if (rotation) {
      object.rotation.copy(rotation);
    }

    object.traverse((child) => {
      if (!child.isMesh) return;

      child.castShadow = true;
      child.receiveShadow = true;
    });
  }

  async function loadSimpleObj(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("OBJ model was not found");
    }

    const text = await response.text();

    const vertices = [[0, 0, 0]];
    const normals = [[0, 0, 1]];
    const uvs = [[0, 0]];

    const outputVertices = [];
    const outputNormals = [];
    const outputUvs = [];

    let hasNormals = false;
    let hasUvs = false;

    function resolveIndex(
      value,
      arrayLength,
    ) {
      const index = Number(value || 0);

      return index < 0
        ? arrayLength + index
        : index;
    }

    function appendPoint(token) {
      const [
        vertexPart,
        uvPart,
        normalPart,
      ] = token.split("/");

      const vertex =
        vertices[
          resolveIndex(
            vertexPart,
            vertices.length,
          )
        ] || vertices[0];

      outputVertices.push(
        vertex[0],
        vertex[1],
        vertex[2],
      );

      if (uvPart) {
        const uv =
          uvs[
            resolveIndex(
              uvPart,
              uvs.length,
            )
          ] || uvs[0];

        outputUvs.push(uv[0], uv[1]);
        hasUvs = true;
      } else {
        outputUvs.push(0, 0);
      }

      if (normalPart) {
        const normal =
          normals[
            resolveIndex(
              normalPart,
              normals.length,
            )
          ] || normals[0];

        outputNormals.push(
          normal[0],
          normal[1],
          normal[2],
        );

        hasNormals = true;
      } else {
        outputNormals.push(0, 0, 1);
      }
    }

    text
      .split(/\r?\n/)
      .forEach((rawLine) => {
        const line = rawLine.trim();

        if (
          !line ||
          line.startsWith("#")
        ) {
          return;
        }

        const parts = line.split(/\s+/);
        const type = parts.shift();

        if (type === "v") {
          vertices.push(
            parts.slice(0, 3).map(Number),
          );
        } else if (type === "vn") {
          normals.push(
            parts.slice(0, 3).map(Number),
          );
        } else if (type === "vt") {
          uvs.push(
            parts.slice(0, 2).map(Number),
          );
        } else if (
          type === "f" &&
          parts.length >= 3
        ) {
          for (
            let index = 1;
            index < parts.length - 1;
            index += 1
          ) {
            appendPoint(parts[0]);
            appendPoint(parts[index]);
            appendPoint(parts[index + 1]);
          }
        }
      });

    if (!outputVertices.length) {
      throw new Error(
        "OBJ has no faces",
      );
    }

    const geometry =
      new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        outputVertices,
        3,
      ),
    );

    if (hasUvs) {
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          outputUvs,
          2,
        ),
      );
    }

    if (hasNormals) {
      geometry.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(
          outputNormals,
          3,
        ),
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
      texture.colorSpace =
        THREE.SRGBColorSpace;

      gunTexture = texture;
      applyTexture(gunVisual, texture);
    },

    undefined,
    () => {},
  );

  loadSimpleObj(ASSETS.gunModel)
    .then((object) => {
      normalizeModel(
        object,
        0.72,
        new THREE.Euler(
          0,
          Math.PI,
          0,
        ),
      );

      if (gunTexture) {
        applyTexture(
          object,
          gunTexture,
        );
      }

      gunRig.remove(gunVisual);
      gunVisual = object;
      gunRig.add(gunVisual);
    })
    .catch(() => {});

  textureLoader.load(
    ASSETS.turretTexture,

    (texture) => {
      texture.colorSpace =
        THREE.SRGBColorSpace;

      turretTexture = texture;
      applyTexture(
        turretVisual,
        texture,
      );
    },

    undefined,
    () => {},
  );

  textureLoader.load(
    ASSETS.buttonTexture,

    (texture) => {
      texture.colorSpace =
        THREE.SRGBColorSpace;

      buttonTexture = texture;
      applyTexture(
        buttonVisual,
        texture,
      );
    },

    undefined,
    () => {},
  );

  loadSimpleObj(ASSETS.turretModel)
    .then((object) => {
      normalizeModel(object, 1.38);

      if (turretTexture) {
        applyTexture(
          object,
          turretTexture,
        );
      }

      turretVisual.clear();
      turretVisual.add(object);
    })
    .catch(() => {});

  loadSimpleObj(ASSETS.buttonModel)
    .then((object) => {
      normalizeModel(object, 2.25);

      if (buttonTexture) {
        applyTexture(
          object,
          buttonTexture,
        );
      }

      buttonVisual.clear();
      buttonVisual.add(object);

      buttonTop = buttonVisual;
      buttonTopRestY = 0;
    })
    .catch(() => {});

  const menuMusic =
    new Audio(ASSETS.menuMusic);

  menuMusic.loop = true;
  menuMusic.volume = 0.22;

  function startMenuMusic() {
    if (
      document.pointerLockElement !==
      renderer.domElement
    ) {
      menuMusic
        .play()
        .catch(() => {});
    }
  }

  function stopMenuMusic() {
    menuMusic.pause();
    menuMusic.currentTime = 0;
  }

  menuMusic.play().catch(() => {});

  document.addEventListener(
    "pointerdown",
    startMenuMusic,
  );

  const keys = new Set();
  const raycaster = new THREE.Raycaster();

  const portals = {
    blue: null,
    red: null,
  };

  const velocity = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const clock = new THREE.Clock();

  const rotation180 =
    new THREE.Quaternion().setFromAxisAngle(
      up,
      Math.PI,
    );

  let yaw = 0;
  let pitch = 0;
  let verticalVelocity = 0;
  let grounded = true;
  let nextShotAt = 0;
  let recoil = 0;
  let elapsed = 0;
  let teleportLock = 0;
  let noticeTimer = 0;
  let doorOpen = 0;
  let buttonPressed = false;
  let crosshairFlashUntil = 0;

  function setCrosshair(state) {
    crosshair.className =
      `crosshair${state ? ` ${state}` : ""}`;
  }

  function showNotice(
    message,
    isError = false,
  ) {
    notice.textContent = message;

    notice.className =
      isError
        ? "visible error"
        : "visible";

    setCrosshair(
      isError
        ? "invalid"
        : "success",
    );

    crosshairFlashUntil =
      performance.now() + 420;

    clearTimeout(noticeTimer);

    noticeTimer = setTimeout(() => {
      notice.className = "";

      setCrosshair(
        turret.held
          ? "holding"
          : "",
      );
    }, 1250);
  }

  function synthShot(color) {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) return;

    const context =
      new AudioContextClass();

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = "sawtooth";

    oscillator.frequency.setValueAtTime(
      color === "blue" ? 245 : 190,
      context.currentTime,
    );

    oscillator.frequency
      .exponentialRampToValueAtTime(
        color === "blue" ? 72 : 55,
        context.currentTime + 0.22,
      );

    gain.gain.setValueAtTime(
      0.08,
      context.currentTime,
    );

    gain.gain
      .exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.28,
      );

    oscillator
      .connect(gain)
      .connect(context.destination);

    oscillator.start();

    oscillator.stop(
      context.currentTime + 0.29,
    );
  }

  function playShot(color) {
    const audio =
      new Audio(ASSETS.shotSound);

    audio.volume = 0.42;

    audio
      .play()
      .catch(() => synthShot(color));
  }

  function createPortal(color, hit) {
    const surface = hit.object;
    const uv = hit.uv;

    const marginU =
      PORTAL_WIDTH /
        2 /
        surface.userData.portalWidth +
      0.018;

    const marginV =
      PORTAL_HEIGHT /
        2 /
        surface.userData.portalHeight +
      0.018;

    if (
      !uv ||
      uv.x < marginU ||
      uv.x > 1 - marginU ||
      uv.y < marginV ||
      uv.y > 1 - marginV
    ) {
      showNotice(
        "Занадто близько до краю",
        true,
      );

      return false;
    }

    const otherColor =
      color === "blue"
        ? "red"
        : "blue";

    if (
      portals[otherColor] &&
      portals[
        otherColor
      ].group.position.distanceTo(
        hit.point,
      ) < PORTAL_SEPARATION
    ) {
      showNotice(
        "Портали мають бути трохи далі один від одного",
        true,
      );

      return false;
    }

    if (portals[color]) {
      scene.remove(
        portals[color].group,
      );
    }

    const group =
      new THREE.Group();

    group.position.copy(hit.point);

    group.quaternion.copy(
      surface.getWorldQuaternion(
        new THREE.Quaternion(),
      ),
    );

    group.translateZ(0.026);

    const artworkMaterial =
      new THREE.MeshBasicMaterial({
        color:
          color === "blue"
            ? "#5bd3ff"
            : "#ff765c",

        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
      });

    const artwork = new THREE.Mesh(
      new THREE.CircleGeometry(
        PORTAL_WIDTH / 2,
        64,
      ),

      artworkMaterial,
    );

    artwork.scale.y =
      PORTAL_HEIGHT /
      PORTAL_WIDTH;

    group.add(artwork);

    textureLoader.load(
      color === "blue"
        ? ASSETS.bluePortal
        : ASSETS.redPortal,

      (texture) => {
        texture.colorSpace =
          THREE.SRGBColorSpace;

        artworkMaterial.map =
          texture;

        artworkMaterial.color.set(
          "#ffffff",
        );

        artworkMaterial.opacity =
          0.96;

        artworkMaterial.blending =
          THREE.NormalBlending;

        artworkMaterial.needsUpdate =
          true;
      },

      undefined,
      () => {},
    );

    const normal =
      new THREE.Vector3(0, 0, 1)
        .applyQuaternion(
          group.quaternion,
        )
        .normalize();

    const portalLight =
      new THREE.PointLight(
        color === "blue"
          ? "#34bfff"
          : "#ff4d32",

        1.15,
        3.8,
        2,
      );

    portalLight.position.z = 0.28;
    group.add(portalLight);

    portals[color] = {
      group,
      normal,
      surface,
    };

    scene.add(group);
    return true;
  }

  function shoot(color) {
    const now = performance.now();

    if (now < nextShotAt) {
      showNotice(
        "Portal Gun заряджається…",
      );

      return;
    }

    nextShotAt = now + 1000;
    recoil = 1;

    muzzleLight.color.set(
      color === "blue"
        ? "#48c7ff"
        : "#ff5031",
    );

    muzzleLight.intensity = 7;

    raycaster.setFromCamera(
      new THREE.Vector2(0, 0),
      camera,
    );

    const hits =
      raycaster.intersectObjects(
        surfaces,
        false,
      );

    if (!hits.length) {
      showNotice(
        "Поверхню не знайдено",
        true,
      );

      synthShot(color);
      return;
    }

    if (
      createPortal(
        color,
        hits[0],
      )
    ) {
      playShot(color);

      showNotice(
        color === "blue"
          ? "Синій портал створено"
          : "Червоний портал створено",
      );
    } else {
      synthShot(color);
    }
  }

  function tryTeleport() {
    if (
      teleportLock > 0 ||
      !portals.blue ||
      !portals.red
    ) {
      return;
    }

    const pairs = [
      [portals.blue, portals.red],
      [portals.red, portals.blue],
    ];

    for (
      const [
        source,
        destination,
      ] of pairs
    ) {
      const verticalSurface =
        Math.abs(source.normal.y) <
        0.7;

      const probe =
        camera.position
          .clone()
          .addScaledVector(
            source.normal,

            verticalSurface
              ? -0.28
              : -1.08,
          );

      const local =
        source.group.worldToLocal(
          probe,
        );

      const ellipse =
        (
          local.x /
          (PORTAL_WIDTH * 0.48)
        ) ** 2 +
        (
          local.y /
          (PORTAL_HEIGHT * 0.48)
        ) ** 2;

      if (
        local.z < -0.1 ||
        local.z > 0.62 ||
        ellipse > 1
      ) {
        continue;
      }

      const sourceQ =
        source.group
          .getWorldQuaternion(
            new THREE.Quaternion(),
          );

      const destinationQ =
        destination.group
          .getWorldQuaternion(
            new THREE.Quaternion(),
          );

      const transferQ =
        destinationQ
          .clone()
          .multiply(rotation180)
          .multiply(
            sourceQ
              .clone()
              .invert(),
          );

      const exitDistance =
        Math.abs(
          destination.normal.y,
        ) > 0.7
          ? EYE_HEIGHT + 0.22
          : 0.82;

      const destinationLocal =
        new THREE.Vector3(
          -local.x,
          local.y,
          exitDistance,
        );

      camera.position.copy(
        destination.group.localToWorld(
          destinationLocal,
        ),
      );

      velocity.applyQuaternion(
        transferQ,
      );

      verticalVelocity =
        velocity.y;

      if (velocity.length() < 2.4) {
        velocity.addScaledVector(
          destination.normal,
          3.2,
        );

        verticalVelocity =
          velocity.y;
      }

      const look =
        new THREE.Vector3();

      camera.getWorldDirection(look);

      look
        .applyQuaternion(transferQ)
        .normalize();

      pitch = Math.asin(
        THREE.MathUtils.clamp(
          look.y,
          -0.98,
          0.98,
        ),
      );

      yaw = Math.atan2(
        -look.x,
        -look.z,
      );

      teleportLock = 0.55;

      showNotice(
        "Прохід завершено",
      );

      return;
    }
  }

  function tryTeleportTurret() {
    if (
      turret.held ||
      turret.teleportCooldown > 0 ||
      !portals.blue ||
      !portals.red
    ) {
      return;
    }

    const pairs = [
      [portals.blue, portals.red],
      [portals.red, portals.blue],
    ];

    for (
      const [
        source,
        destination,
      ] of pairs
    ) {
      const local =
        source.group.worldToLocal(
          turret.root.position.clone(),
        );

      const ellipse =
        (
          local.x /
          (PORTAL_WIDTH * 0.5)
        ) ** 2 +
        (
          local.y /
          (PORTAL_HEIGHT * 0.5)
        ) ** 2;

      if (
        local.z < -0.32 ||
        local.z > 0.9 ||
        ellipse > 1
      ) {
        continue;
      }

      const sourceQ =
        source.group
          .getWorldQuaternion(
            new THREE.Quaternion(),
          );

      const destinationQ =
        destination.group
          .getWorldQuaternion(
            new THREE.Quaternion(),
          );

      const transferQ =
        destinationQ
          .clone()
          .multiply(rotation180)
          .multiply(
            sourceQ
              .clone()
              .invert(),
          );

      const exitLocal =
        new THREE.Vector3(
          -local.x,
          local.y,
          0.72,
        );

      turret.root.position.copy(
        destination.group.localToWorld(
          exitLocal,
        ),
      );

      turret.velocity
        .applyQuaternion(transferQ);

      if (
        turret.velocity.length() <
        2
      ) {
        turret.velocity
          .addScaledVector(
            destination.normal,
            2.8,
          );
      }

      turret.root.quaternion
        .premultiply(transferQ);

      turret.teleportCooldown =
        0.55;

      return;
    }
  }

  function playTurretHello() {
    const audio =
      new Audio(
        ASSETS.turretHello,
      );

    audio.volume = 0.55;

    audio
      .play()
      .catch(() => {});
  }

  function useTurret() {
    if (turret.held) {
      const direction =
        new THREE.Vector3();

      camera.getWorldDirection(
        direction,
      );

      turret.held = false;

      turret.velocity.copy(
        direction.multiplyScalar(1.2),
      );

      turret.velocity.y += 0.35;

      gunRig.visible = true;
      setCrosshair("");

      return;
    }

    if (
      camera.position.distanceTo(
        turret.root.position,
      ) > 2.25
    ) {
      return;
    }

    turret.held = true;
    turret.velocity.set(0, 0, 0);
    turret.angularVelocity.set(0, 0, 0);

    gunRig.visible = false;
    setCrosshair("holding");

    playTurretHello();
  }

  function throwTurret() {
    if (!turret.held) {
      return false;
    }

    const direction =
      new THREE.Vector3();

    camera.getWorldDirection(
      direction,
    );

    turret.held = false;

    turret.velocity.copy(
      direction.multiplyScalar(7.8),
    );

    turret.velocity.y += 1.2;

    turret.angularVelocity.set(
      2.4,
      0.8,
      -1.7,
    );

    gunRig.visible = true;
    setCrosshair("");

    return true;
  }

  startButton.addEventListener(
    "click",
    () => {
      renderer.domElement
        .requestPointerLock();
    },
  );

  document.addEventListener(
    "pointerlockchange",
    () => {
      const playing =
        document.pointerLockElement ===
        renderer.domElement;

      startScreen.classList.toggle(
        "hidden",
        playing,
      );

      if (playing) {
        stopMenuMusic();
      } else {
        startMenuMusic();
      }
    },
  );

  document.addEventListener(
    "mousemove",
    (event) => {
      if (
        document.pointerLockElement !==
        renderer.domElement
      ) {
        return;
      }

      yaw -=
        event.movementX * 0.00225;

      pitch -=
        event.movementY * 0.00225;

      pitch =
        THREE.MathUtils.clamp(
          pitch,
          -1.48,
          1.48,
        );
    },
  );

  renderer.domElement.addEventListener(
    "mousedown",
    (event) => {
      if (
        document.pointerLockElement !==
        renderer.domElement
      ) {
        renderer.domElement
          .requestPointerLock();

        return;
      }

      if (
        event.button === 0 &&
        !throwTurret()
      ) {
        shoot("blue");
      }

      if (event.button === 2) {
        if (turret.held) {
          useTurret();
        } else {
          shoot("red");
        }
      }
    },
  );

  renderer.domElement.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
    },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      keys.add(event.code);

      if (
        event.code === "Space" &&
        grounded
      ) {
        verticalVelocity = 5.2;
        grounded = false;
      }

      if (
        event.code === "KeyE" &&
        !event.repeat
      ) {
        useTurret();
      }

      if (event.code === "KeyR") {
        ["blue", "red"].forEach(
          (color) => {
            if (portals[color]) {
              scene.remove(
                portals[color].group,
              );
            }

            portals[color] = null;
          },
        );

        showNotice(
          "Портали очищено",
        );
      }
    },
  );

  document.addEventListener(
    "keyup",
    (event) => {
      keys.delete(event.code);
    },
  );

  window.addEventListener(
    "resize",
    () => {
      camera.aspect =
        window.innerWidth /
        window.innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight,
      );

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio,
          1.7,
        ),
      );
    },
  );

  function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(
      clock.getDelta(),
      0.033,
    );

    elapsed += delta;

    teleportLock = Math.max(
      0,
      teleportLock - delta,
    );

    turret.teleportCooldown =
      Math.max(
        0,
        turret.teleportCooldown -
          delta,
      );

    const moveX =
      (
        keys.has("KeyD") ||
        keys.has("ArrowRight")
          ? 1
          : 0
      ) -
      (
        keys.has("KeyA") ||
        keys.has("ArrowLeft")
          ? 1
          : 0
      );

    const moveZ =
      (
        keys.has("KeyW") ||
        keys.has("ArrowUp")
          ? 1
          : 0
      ) -
      (
        keys.has("KeyS") ||
        keys.has("ArrowDown")
          ? 1
          : 0
      );

    camera.rotation.set(
      pitch,
      yaw,
      0,
    );

    forward
      .set(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw),
      )
      .normalize();

    right
      .crossVectors(forward, up)
      .normalize();

    const wish =
      new THREE.Vector3()
        .addScaledVector(
          forward,
          moveZ,
        )
        .addScaledVector(
          right,
          moveX,
        );

    if (wish.lengthSq() > 1) {
      wish.normalize();
    }

    wish.multiplyScalar(
      keys.has("ShiftLeft")
        ? 6.3
        : 4.45,
    );

    velocity.x =
      THREE.MathUtils.damp(
        velocity.x,
        wish.x,
        grounded ? 12 : 5,
        delta,
      );

    velocity.z =
      THREE.MathUtils.damp(
        velocity.z,
        wish.z,
        grounded ? 12 : 5,
        delta,
      );

    verticalVelocity -=
      12.8 * delta;

    velocity.y =
      verticalVelocity;

    const playerPrevious =
      camera.position.clone();

    camera.position.addScaledVector(
      velocity,
      delta,
    );

    tryTeleport();

    if (
      camera.position.y <=
      EYE_HEIGHT
    ) {
      camera.position.y =
        EYE_HEIGHT;

      verticalVelocity = 0;
      velocity.y = 0;
      grounded = true;
    }

    camera.position.y = Math.min(
      camera.position.y,
      ROOM_HEIGHT - 0.22,
    );

    camera.position.x =
      THREE.MathUtils.clamp(
        camera.position.x,
        -ROOM_WIDTH / 2 + 0.31,
        ROOM_WIDTH / 2 - 0.31,
      );

    camera.position.z =
      THREE.MathUtils.clamp(
        camera.position.z,
        BACK_Z + 0.31,
        FRONT_Z - 0.31,
      );

    const crossedDivider =
      (
        playerPrevious.z -
        DIVIDER_Z
      ) *
        (
          camera.position.z -
          DIVIDER_Z
        ) <=
        0 &&
      Math.abs(
        playerPrevious.z -
          camera.position.z,
      ) > 0.001;

    const openPassage =
      Math.abs(camera.position.x) <
        DOOR_HALF_WIDTH - 0.2 &&
      doorOpen > 0.82;

    if (
      crossedDivider &&
      !openPassage
    ) {
      camera.position.z =
        playerPrevious.z;

      velocity.z = 0;
    }

    if (turret.held) {
      const heldPosition =
        camera.localToWorld(
          new THREE.Vector3(
            0,
            -0.22,
            -1.78,
          ),
        );

      turret.root.position.lerp(
        heldPosition,
        1 -
          Math.exp(-18 * delta),
      );

      const faceCamera =
        camera.quaternion.clone();

      turret.root.quaternion.slerp(
        faceCamera,
        1 -
          Math.exp(-9 * delta),
      );

      turret.velocity.set(0, 0, 0);
    } else {
      const turretPrevious =
        turret.root.position.clone();

      turret.velocity.y -=
        13.2 * delta;

      turret.root.position
        .addScaledVector(
          turret.velocity,
          delta,
        );

      turret.root.rotation.x +=
        turret.angularVelocity.x *
        delta;

      turret.root.rotation.y +=
        turret.angularVelocity.y *
        delta;

      turret.root.rotation.z +=
        turret.angularVelocity.z *
        delta;

      turret.angularVelocity
        .multiplyScalar(
          Math.exp(
            -1.45 * delta,
          ),
        );

      turret.velocity.x *=
        Math.exp(
          -0.58 * delta,
        );

      turret.velocity.z *=
        Math.exp(
          -0.58 * delta,
        );

      if (
        turret.root.position.y <
        TURRET_CENTER_HEIGHT
      ) {
        turret.root.position.y =
          TURRET_CENTER_HEIGHT;

        if (
          Math.abs(
            turret.velocity.y,
          ) > 0.8
        ) {
          turret.velocity.y *=
            -0.28;

          turret.angularVelocity.x +=
            turret.velocity.z * 0.09;

          turret.angularVelocity.z -=
            turret.velocity.x * 0.09;
        } else {
          turret.velocity.y = 0;
        }
      }

      turret.root.position.y =
        Math.min(
          turret.root.position.y,
          ROOM_HEIGHT -
            turret.radius,
        );

      turret.root.position.x =
        THREE.MathUtils.clamp(
          turret.root.position.x,

          -ROOM_WIDTH / 2 +
            turret.radius,

          ROOM_WIDTH / 2 -
            turret.radius,
        );

      turret.root.position.z =
        THREE.MathUtils.clamp(
          turret.root.position.z,

          BACK_Z +
            turret.radius,

          FRONT_Z -
            turret.radius,
        );

      const turretCrossedDivider =
        (
          turretPrevious.z -
          DIVIDER_Z
        ) *
          (
            turret.root.position.z -
            DIVIDER_Z
          ) <=
          0 &&
        Math.abs(
          turretPrevious.z -
            turret.root.position.z,
        ) > 0.001;

      const turretPassage =
        Math.abs(
          turret.root.position.x,
        ) <
          DOOR_HALF_WIDTH -
            turret.radius &&
        doorOpen > 0.82;

      if (
        turretCrossedDivider &&
        !turretPassage
      ) {
        turret.root.position.z =
          turretPrevious.z;

        turret.velocity.z *=
          -0.2;
      }

      const playerDistance =
        new THREE.Vector2(
          camera.position.x,
          camera.position.z,
        ).distanceTo(
          new THREE.Vector2(
            turret.root.position.x,
            turret.root.position.z,
          ),
        );

      if (playerDistance < 0.78) {
        const push =
          turret.root.position
            .clone()
            .sub(camera.position)
            .setY(0);

        if (
          push.lengthSq() >
          0.0001
        ) {
          push.normalize();

          turret.velocity
            .addScaledVector(
              push,

              (
                0.78 -
                playerDistance
              ) * 5.2,
            );

          turret.angularVelocity.x +=
            push.z * 0.75;

          turret.angularVelocity.z -=
            push.x * 0.75;
        }
      }

      tryTeleportTurret();
    }

    const playerOnButton =
      new THREE.Vector2(
        camera.position.x,
        camera.position.z,
      ).distanceTo(
        new THREE.Vector2(
          buttonRoot.position.x,
          buttonRoot.position.z,
        ),
      ) < 0.82;

    const turretOnButton =
      !turret.held &&
      turret.root.position.y <
        1.25 &&
      new THREE.Vector2(
        turret.root.position.x,
        turret.root.position.z,
      ).distanceTo(
        new THREE.Vector2(
          buttonRoot.position.x,
          buttonRoot.position.z,
        ),
      ) < 0.92;

    buttonPressed =
      playerOnButton ||
      turretOnButton;

    doorOpen =
      THREE.MathUtils.damp(
        doorOpen,

        buttonPressed
          ? 1
          : 0,

        buttonPressed
          ? 4.8
          : 2.8,

        delta,
      );

    door.position.y =
      2.36 +
      doorOpen * 5.15;

    buttonTop.position.y =
      THREE.MathUtils.damp(
        buttonTop.position.y,

        buttonPressed
          ? buttonTopRestY - 0.1
          : buttonTopRestY,

        8,
        delta,
      );

    const speed = Math.hypot(
      velocity.x,
      velocity.z,
    );

    const movementAmount =
      Math.min(
        speed / 4.35,
        1,
      );

    const gentleBob =
      grounded &&
      movementAmount > 0.03
        ? Math.sin(
            elapsed * 6.2,
          ) *
          0.006 *
          movementAmount
        : Math.sin(
            elapsed * 1.45,
          ) * 0.0015;

    recoil =
      THREE.MathUtils.damp(
        recoil,
        0,
        15,
        delta,
      );

    gunRig.position.set(
      0.49 +
        Math.cos(
          elapsed * 3.1,
        ) *
          0.0025 *
          movementAmount,

      -0.48 + gentleBob,

      -0.93 +
        recoil * 0.045,
    );

    gunRig.rotation.set(
      -0.08 -
        recoil * 0.035,

      -0.16,

      0.035 +
        gentleBob * 0.3,
    );

    muzzleLight.intensity =
      THREE.MathUtils.damp(
        muzzleLight.intensity,
        0,
        22,
        delta,
      );

    const remaining =
      Math.max(
        0,

        nextShotAt -
          performance.now(),
      );

    if (chargeBar) {
      chargeBar.style.transform =
        `scaleX(${
          1 -
          remaining / 1000
        })`;
    }

    if (
      performance.now() >
      crosshairFlashUntil
    ) {
      const canUseTurret =
        turret.held ||
        camera.position.distanceTo(
          turret.root.position,
        ) < 2.25;

      setCrosshair(
        turret.held
          ? "holding"
          : canUseTurret
            ? "interact"
            : "",
      );
    }

    renderer.render(
      scene,
      camera,
    );
  }

  animate();
})();
