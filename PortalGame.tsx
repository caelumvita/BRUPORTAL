"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

type PortalColor = "blue" | "red";

type PortalSurface = THREE.Mesh<THREE.PlaneGeometry, THREE.Material> & {
  userData: {
    portalWidth: number;
    portalHeight: number;
  };
};

type Portal = {
  group: THREE.Group;
  normal: THREE.Vector3;
  material: THREE.ShaderMaterial;
};

const EYE_HEIGHT = 1.62;
const PORTAL_WIDTH = 1.25;
const PORTAL_HEIGHT = 2.12;
const ROOM_WIDTH = 16;
const ROOM_DEPTH = 20;
const ROOM_HEIGHT = 6.5;

const ASSETS = {
  model: "/models/PortalGun.obj",
  gunTexture: "/textures/bruportal.png",
  bluePortal:
    "/textures/blue-portal-portal-2-orange-portal-11563105547ekp6yyo75z.png",
  redPortal:
    "/textures/red-portal-portal-2-orange-portal-11563105547ekp6yyo75z%20(1).png",
  shotSound: "/sounds/portal-gun-ice.mp3",
};

function makePanelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#d7d9d6";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#9da29f";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 500);
  ctx.strokeStyle = "rgba(255,255,255,.8)";
  ctx.lineWidth = 3;
  ctx.strokeRect(13, 13, 486, 486);

  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, "rgba(255,255,255,.18)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0)");
  gradient.addColorStop(1, "rgba(25,35,40,.12)");
  ctx.fillStyle = gradient;
  ctx.fillRect(16, 16, 480, 480);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function makePortalMaterial(color: PortalColor) {
  const isBlue = color === "blue";
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uInner: {
        value: new THREE.Color(isBlue ? "#061a36" : "#300706"),
      },
      uGlow: {
        value: new THREE.Color(isBlue ? "#36b9ff" : "#ff4f2e"),
      },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uInner;
      uniform vec3 uGlow;

      void main() {
        vec2 p = vUv - .5;
        p.y *= 1.02;
        float r = length(p) * 2.0;
        float a = atan(p.y, p.x);
        float ribbons = sin(a * 6.0 - uTime * 2.6 + r * 18.0) * .5 + .5;
        float fog = smoothstep(1.0, .05, r);
        float edge = smoothstep(1.0, .67, r);
        vec3 swirl = mix(uInner * .4, uGlow * .56, ribbons * .55);
        vec3 color = mix(swirl, uInner, smoothstep(.48, .95, r));
        color += uGlow * edge * .34;
        float alpha = fog * .98;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
}

function buildFallbackGun() {
  const gun = new THREE.Group();
  gun.name = "FallbackPortalGun";

  const white = new THREE.MeshStandardMaterial({
    color: "#e6ebe8",
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
    new THREE.CylinderGeometry(0.19, 0.29, 0.86, 24, 1, false),
    white,
  );
  shell.rotation.x = Math.PI / 2;
  shell.position.z = -0.06;
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

  for (const side of [-1, 1]) {
    const claw = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.035, 0.62, 5, 10),
      black,
    );
    claw.rotation.x = Math.PI / 2;
    claw.rotation.z = side * 0.26;
    claw.position.set(side * 0.21, 0.02, -0.68);
    gun.add(claw);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.28, 12),
      black,
    );
    tip.rotation.x = -Math.PI / 2;
    tip.rotation.z = side * 0.18;
    tip.position.set(side * 0.29, 0.02, -1.05);
    gun.add(tip);
  }

  gun.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.renderOrder = 20;
    }
  });
  return gun;
}

function synthShot(color: PortalColor) {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(color === "blue" ? 245 : 190, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    color === "blue" ? 72 : 55,
    context.currentTime + 0.22,
  );
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, context.currentTime);
  filter.frequency.exponentialRampToValueAtTime(260, context.currentTime + 0.25);
  gain.gain.setValueAtTime(0.1, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);

  oscillator.connect(filter).connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.29);
  oscillator.addEventListener("ended", () => void context.close());
}

export default function PortalGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const cooldownRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [blueReady, setBlueReady] = useState(false);
  const [redReady, setRedReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#9da6a8");
    scene.fog = new THREE.Fog("#9da6a8", 12, 31);

    const camera = new THREE.PerspectiveCamera(
      74,
      mount.clientWidth / mount.clientHeight,
      0.025,
      70,
    );
    camera.position.set(0, EYE_HEIGHT, 7.2);
    camera.rotation.order = "YXZ";
    scene.add(camera);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      queueMicrotask(() => {
        setLoaded(true);
        setWebglError(true);
      });
      return;
    }
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight("#dff7ff", "#3e4648", 2.05);
    scene.add(ambient);

    const ceilingLight = new THREE.DirectionalLight("#f5fbff", 2.55);
    ceilingLight.position.set(-3, 6.2, 4);
    ceilingLight.castShadow = true;
    ceilingLight.shadow.mapSize.set(1024, 1024);
    ceilingLight.shadow.camera.left = -12;
    ceilingLight.shadow.camera.right = 12;
    ceilingLight.shadow.camera.top = 12;
    ceilingLight.shadow.camera.bottom = -12;
    scene.add(ceilingLight);

    const panelTexture = makePanelTexture();
    panelTexture.repeat.set(4, 5);
    const panelMaterial = new THREE.MeshStandardMaterial({
      map: panelTexture,
      color: "#d9dcda",
      roughness: 0.72,
      metalness: 0.04,
      side: THREE.FrontSide,
    });

    const floorTexture = panelTexture.clone();
    floorTexture.needsUpdate = true;
    floorTexture.repeat.set(4, 5);
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      color: "#c8cdca",
      roughness: 0.82,
      metalness: 0.03,
    });

    const surfaces: PortalSurface[] = [];
    const addSurface = (
      width: number,
      height: number,
      position: THREE.Vector3,
      rotation: THREE.Euler,
      material: THREE.Material,
    ) => {
      const surface = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        material,
      ) as PortalSurface;
      surface.position.copy(position);
      surface.rotation.copy(rotation);
      surface.receiveShadow = true;
      surface.userData.portalWidth = width;
      surface.userData.portalHeight = height;
      scene.add(surface);
      surfaces.push(surface);
      return surface;
    };

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

    const lightPanelMaterial = new THREE.MeshStandardMaterial({
      color: "#f8ffff",
      emissive: "#d6f5ff",
      emissiveIntensity: 1.7,
      roughness: 0.22,
    });
    for (const x of [-4.6, 0, 4.6]) {
      const lightPanel = new THREE.Mesh(
        new THREE.BoxGeometry(2.65, 0.08, 0.78),
        lightPanelMaterial,
      );
      lightPanel.position.set(x, ROOM_HEIGHT - 0.08, 0);
      scene.add(lightPanel);
    }

    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: "#293133",
      roughness: 0.55,
    });
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.035, 0.82),
      stripeMaterial,
    );
    stripe.position.set(0, 0.025, -4.2);
    stripe.receiveShadow = true;
    scene.add(stripe);

    const signCanvas = document.createElement("canvas");
    signCanvas.width = 512;
    signCanvas.height = 160;
    const signCtx = signCanvas.getContext("2d")!;
    signCtx.fillStyle = "#f3f5f2";
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

    const gunRig = new THREE.Group();
    gunRig.position.set(0.63, -0.52, -1.18);
    gunRig.rotation.set(-0.04, -0.08, -0.02);
    camera.add(gunRig);

    let gunVisual = buildFallbackGun();
    gunVisual.rotation.y = Math.PI;
    gunVisual.scale.setScalar(0.76);
    gunRig.add(gunVisual);

    const muzzleLight = new THREE.PointLight("#4bc7ff", 0, 4.5, 2);
    muzzleLight.position.set(0, 0, -1.12);
    gunRig.add(muzzleLight);

    const textureLoader = new THREE.TextureLoader();
    let loadedGunTexture: THREE.Texture | null = null;
    const applyGunTexture = (root: THREE.Object3D, texture: THREE.Texture) => {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.42,
          metalness: 0.2,
        });
      });
    };
    textureLoader.load(
      ASSETS.gunTexture,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        loadedGunTexture = texture;
        applyGunTexture(gunVisual, texture);
      },
      undefined,
      () => undefined,
    );

    const objLoader = new OBJLoader();
    objLoader.load(
      ASSETS.model,
      (object) => {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        const largest = Math.max(size.x, size.y, size.z) || 1;
        object.scale.setScalar(1.15 / largest);
        object.rotation.set(0, Math.PI, 0);
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.castShadow = true;
          child.renderOrder = 20;
          if (!child.material) {
            child.material = new THREE.MeshStandardMaterial({
              color: "#e7ece8",
              roughness: 0.4,
            });
          }
        });
        if (loadedGunTexture) {
          applyGunTexture(object, loadedGunTexture);
        }
        gunRig.remove(gunVisual);
        gunVisual = object;
        gunRig.add(gunVisual);
      },
      undefined,
      () => undefined,
    );

    const raycaster = new THREE.Raycaster();
    const keys = new Set<string>();
    const portals: Record<PortalColor, Portal | null> = {
      blue: null,
      red: null,
    };
    const mouseImpulse = new THREE.Vector2();
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
    let teleportLock = 0;
    let noticeTimer = 0;
    let elapsed = 0;
    let gamepadBlueDown = false;
    let gamepadRedDown = false;

    const showNotice = (message: string, danger = false) => {
      if (!noticeRef.current) return;
      noticeRef.current.textContent = message;
      noticeRef.current.dataset.danger = danger ? "true" : "false";
      noticeRef.current.classList.add("visible");
      window.clearTimeout(noticeTimer);
      noticeTimer = window.setTimeout(() => {
        noticeRef.current?.classList.remove("visible");
      }, 1250);
    };

    const playShot = (color: PortalColor) => {
      const audio = new Audio(ASSETS.shotSound);
      audio.volume = 0.42;
      audio.play().catch(() => synthShot(color));
    };

    const createPortal = (
      color: PortalColor,
      hit: THREE.Intersection<THREE.Object3D>,
    ) => {
      const surface = hit.object as PortalSurface;
      const uv = hit.uv;
      if (!uv) return false;

      const marginU = PORTAL_WIDTH / 2 / surface.userData.portalWidth + 0.018;
      const marginV = PORTAL_HEIGHT / 2 / surface.userData.portalHeight + 0.018;
      if (
        uv.x < marginU ||
        uv.x > 1 - marginU ||
        uv.y < marginV ||
        uv.y > 1 - marginV
      ) {
        showNotice("Занадто близько до краю", true);
        return false;
      }

      if (portals[color]) {
        scene.remove(portals[color]!.group);
        portals[color]!.material.dispose();
      }

      const group = new THREE.Group();
      group.position.copy(hit.point);
      group.quaternion.copy(surface.getWorldQuaternion(new THREE.Quaternion()));
      group.translateZ(0.026);

      const material = makePortalMaterial(color);
      const center = new THREE.Mesh(
        new THREE.CircleGeometry(PORTAL_WIDTH / 2 - 0.065, 64),
        material,
      );
      center.scale.y = PORTAL_HEIGHT / PORTAL_WIDTH;
      group.add(center);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(
          PORTAL_WIDTH / 2 - 0.035,
          PORTAL_WIDTH / 2 + 0.055,
          72,
        ),
        new THREE.MeshBasicMaterial({
          color: color === "blue" ? "#3bc5ff" : "#ff5233",
          transparent: true,
          opacity: 0.96,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.scale.y = PORTAL_HEIGHT / PORTAL_WIDTH;
      ring.position.z = 0.008;
      group.add(ring);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(
          PORTAL_WIDTH / 2 + 0.04,
          PORTAL_WIDTH / 2 + 0.13,
          72,
        ),
        new THREE.MeshBasicMaterial({
          color: color === "blue" ? "#1e9fff" : "#ff321c",
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      halo.scale.y = PORTAL_HEIGHT / PORTAL_WIDTH;
      halo.position.z = -0.002;
      group.add(halo);

      const artworkMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
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
        () => undefined,
      );

      const normal = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(group.quaternion)
        .normalize();
      portals[color] = { group, normal, material };
      scene.add(group);
      if (color === "blue") {
        setBlueReady(true);
      } else {
        setRedReady(true);
      }
      return true;
    };

    const shoot = (color: PortalColor) => {
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

      const placed = createPortal(color, hits[0]);
      if (placed) {
        playShot(color);
        showNotice(color === "blue" ? "Синій портал створено" : "Червоний портал створено");
      } else {
        synthShot(color);
      }
    };

    const tryTeleport = () => {
      if (teleportLock > 0 || !portals.blue || !portals.red) return;

      const pairs: [Portal, Portal][] = [
        [portals.blue, portals.red],
        [portals.red, portals.blue],
      ];

      for (const [source, destination] of pairs) {
        const verticalSurface = Math.abs(source.normal.y) < 0.7;
        const probe = camera.position
          .clone()
          .addScaledVector(source.normal, verticalSurface ? -0.28 : -1.08);
        const sourceLocal = source.group.worldToLocal(probe);
        const ellipse =
          (sourceLocal.x / (PORTAL_WIDTH * 0.48)) ** 2 +
          (sourceLocal.y / (PORTAL_HEIGHT * 0.48)) ** 2;

        if (sourceLocal.z < -0.1 || sourceLocal.z > 0.62 || ellipse > 1) {
          continue;
        }

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
          -sourceLocal.x,
          sourceLocal.y,
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
        camera.rotation.set(pitch, yaw, 0);
        teleportLock = 0.55;
        showNotice("Прохід завершено");
        return;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      const dx = event.movementX * 0.00225;
      const dy = event.movementY * 0.00225;
      yaw -= dx;
      pitch -= dy;
      pitch = THREE.MathUtils.clamp(pitch, -1.48, 1.48);
      mouseImpulse.x = THREE.MathUtils.clamp(mouseImpulse.x + dx, -0.12, 0.12);
      mouseImpulse.y = THREE.MathUtils.clamp(mouseImpulse.y + dy, -0.12, 0.12);
    };

    const handlePointerLock = () => {
      setLocked(document.pointerLockElement === renderer.domElement);
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
        return;
      }
      if (event.button === 0) shoot("blue");
      if (event.button === 2) shoot("red");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      keys.add(event.code);
      if (event.code === "Space" && grounded) {
        verticalVelocity = 5.2;
        grounded = false;
      }
      if (event.code === "KeyR") {
        for (const color of ["blue", "red"] as PortalColor[]) {
          if (portals[color]) scene.remove(portals[color]!.group);
          portals[color] = null;
        }
        setBlueReady(false);
        setRedReady(false);
        showNotice("Портали очищено");
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const blockContextMenu = (event: MouseEvent) => event.preventDefault();

    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    };

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handlePointerLock);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", handleResize);

    queueMicrotask(() => setLoaded(true));

    let animationFrame = 0;
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.033);
      elapsed += delta;
      teleportLock = Math.max(0, teleportLock - delta);

      const gamepad = navigator.getGamepads?.()[0];
      let moveX =
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
        (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
      let moveZ =
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
        (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);

      if (gamepad) {
        const deadzone = (value: number) => (Math.abs(value) > 0.14 ? value : 0);
        moveX += deadzone(gamepad.axes[0] ?? 0);
        moveZ += -deadzone(gamepad.axes[1] ?? 0);
        yaw -= deadzone(gamepad.axes[2] ?? 0) * delta * 2.25;
        pitch -= deadzone(gamepad.axes[3] ?? 0) * delta * 1.8;
        pitch = THREE.MathUtils.clamp(pitch, -1.48, 1.48);

        const bluePressed = Boolean(gamepad.buttons[7]?.pressed);
        const redPressed = Boolean(gamepad.buttons[6]?.pressed);
        if (bluePressed && !gamepadBlueDown) shoot("blue");
        if (redPressed && !gamepadRedDown) shoot("red");
        gamepadBlueDown = bluePressed;
        gamepadRedDown = redPressed;
        if (gamepad.buttons[0]?.pressed && grounded) {
          verticalVelocity = 5.2;
          grounded = false;
        }
      }

      camera.rotation.set(pitch, yaw, 0);
      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
      right.crossVectors(forward, up).normalize();
      const wish = new THREE.Vector3()
        .addScaledVector(forward, moveZ)
        .addScaledVector(right, moveX);
      if (wish.lengthSq() > 1) wish.normalize();
      wish.multiplyScalar(keys.has("ShiftLeft") ? 6.3 : 4.45);

      const acceleration = grounded ? 12 : 5;
      velocity.x = THREE.MathUtils.damp(velocity.x, wish.x, acceleration, delta);
      velocity.z = THREE.MathUtils.damp(velocity.z, wish.z, acceleration, delta);
      verticalVelocity -= 12.8 * delta;
      velocity.y = verticalVelocity;

      camera.position.addScaledVector(velocity, delta);
      tryTeleport();

      const minimumY = EYE_HEIGHT;
      if (camera.position.y <= minimumY) {
        camera.position.y = minimumY;
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
      const bob = grounded ? Math.sin(elapsed * (7.5 + speed * 0.35)) * Math.min(speed / 4, 1) : 0;
      recoil = THREE.MathUtils.damp(recoil, 0, 12, delta);
      mouseImpulse.multiplyScalar(Math.pow(0.015, delta));
      gunRig.position.set(
        0.63 + mouseImpulse.x * 0.75,
        -0.52 + bob * 0.018 - mouseImpulse.y * 0.42,
        -1.18 + recoil * 0.15,
      );
      gunRig.rotation.set(
        -0.04 + bob * 0.014 - recoil * 0.11,
        -0.08 + mouseImpulse.x * 0.65,
        -0.02 - moveX * 0.025,
      );
      muzzleLight.intensity = THREE.MathUtils.damp(
        muzzleLight.intensity,
        0,
        18,
        delta,
      );

      for (const color of ["blue", "red"] as PortalColor[]) {
        const portal = portals[color];
        if (!portal) continue;
        portal.material.uniforms.uTime.value = elapsed;
        const halo = portal.group.children[2];
        halo.scale.x = 1 + Math.sin(elapsed * 3.1) * 0.035;
      }

      if (cooldownRef.current) {
        const remaining = Math.max(0, nextShotAt - performance.now());
        cooldownRef.current.style.setProperty(
          "--charge",
          String(1 - remaining / 1000),
        );
        cooldownRef.current.dataset.ready = remaining <= 0 ? "true" : "false";
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(noticeTimer);
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      renderer.domElement.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handlePointerLock);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }
      renderer.dispose();
      panelTexture.dispose();
      floorTexture.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const enterGame = () => {
    const canvas = mountRef.current?.querySelector("canvas");
    canvas?.requestPointerLock();
  };

  const fireTouch = (color: PortalColor) => {
    const canvas = mountRef.current?.querySelector("canvas");
    canvas?.dispatchEvent(
      new MouseEvent("mousedown", {
        button: color === "blue" ? 0 : 2,
        bubbles: true,
      }),
    );
  };

  return (
    <main className="game-shell">
      <div ref={mountRef} className="game-canvas" aria-label="BRU Portal Lab" />

      <div className="vignette" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      <header className="lab-header">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <strong>BRU PORTAL LAB</strong>
          <small>TEST CHAMBER 01</small>
        </div>
        <div className="system-online">
          <span />
          ONLINE
        </div>
      </header>

      <div ref={noticeRef} className="notice" role="status" />

      <div className="crosshair" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <span />
      </div>

      <aside className="portal-status" aria-label="Стан порталів">
        <div className={blueReady ? "portal-chip active blue" : "portal-chip blue"}>
          <span />
          <div>
            <small>ЛІВА КНОПКА</small>
            <strong>СИНІЙ</strong>
          </div>
        </div>
        <div className={redReady ? "portal-chip active red" : "portal-chip red"}>
          <span />
          <div>
            <small>ПРАВА КНОПКА</small>
            <strong>ЧЕРВОНИЙ</strong>
          </div>
        </div>
      </aside>

      <div ref={cooldownRef} className="charge-meter" data-ready="true">
        <span />
        <small>CHARGE</small>
      </div>

      <footer className="controls">
        <span><kbd>WASD</kbd> рух</span>
        <span><kbd>SPACE</kbd> стрибок</span>
        <span><kbd>R</kbd> очистити</span>
        <span><kbd>ESC</kbd> пауза</span>
      </footer>

      <div className="touch-fire" aria-label="Сенсорні кнопки порталів">
        <button className="blue" onPointerDown={() => fireTouch("blue")}>
          BLUE
        </button>
        <button className="red" onPointerDown={() => fireTouch("red")}>
          RED
        </button>
      </div>

      {(!locked || !loaded) && (
        <section className="start-screen">
          <div className="start-card">
            <p className="eyebrow">BUILDER RESEARCH UNIT</p>
            <h1>PORTAL<br />LAB</h1>
            <p className={webglError ? "intro error-copy" : "intro"}>
              {webglError
                ? "Цей браузер вимкнув WebGL. Увімкни апаратне прискорення або відкрий гру в Chrome, Edge чи Firefox."
                : "Постав два портали на стінах, підлозі або стелі та пройди крізь простір."}
            </p>
            <button onClick={enterGame} disabled={!loaded || webglError}>
              <span>
                {webglError
                  ? "3D НЕДОСТУПНЕ"
                  : loaded
                    ? "ПОЧАТИ ТЕСТ"
                    : "ЗАВАНТАЖЕННЯ…"}
              </span>
              <b>→</b>
            </button>
            <p className="microcopy">
              Натискання захопить курсор. Права кнопка миші не відкриватиме меню.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
