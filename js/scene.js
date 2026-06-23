const textureLoader = new THREE.TextureLoader();

const redonTextures = [
  'textures/redon1.jpg',
  'textures/redon2.jpg',
  'textures/redon3.jpg',
  'textures/redon4.jpg',
];

const loadedTextures = [];

redonTextures.forEach(path => {
  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  loadedTextures.push(tex);
});

let scene, camera, renderer, objects = [];

function noise(x, z, seed = 0) {
  return Math.sin(x * 0.3 + seed) * Math.cos(z * 0.2 + seed) +
         Math.sin(x * 0.7 + seed * 2) * Math.cos(z * 0.5 + seed) * 0.5 +
         Math.sin(x * 0.15 + seed * 0.5) * Math.cos(z * 0.1 + seed * 0.3) * 2 +
         Math.sin(x * 1.2 + seed * 3) * Math.cos(z * 0.9 + seed * 1.5) * 0.25;
}

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  document.body.appendChild(renderer.domElement);

  camera.position.set(0, 1.7, 8);
  camera.lookAt(0, 1.7, 0);

  window.pointLight = new THREE.PointLight(0xFF406B, 3, 60);
  window.pointLight.position.set(0, 10, 5);
  scene.add(window.pointLight);

  window.pointLight2 = new THREE.PointLight(0xDAC962, 2, 40);
  window.pointLight2.position.set(-8, 5, -5);
  scene.add(window.pointLight2);

  window.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
  window.sunLight.position.set(5, 20, 5);
  scene.add(window.sunLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  loadRoom(0);
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function getPathX(z, seed) {
  return Math.sin(z * 0.05 + seed * 0.5) * 3 +
         Math.sin(z * 0.02 + seed * 0.3) * 2;
}

function createTerrain(room) {
  const seed = room.seed || 0;
  const geo = new THREE.PlaneGeometry(120, 120, 40, 40);
  geo.rotateX(-Math.PI / 2);

  const positions = geo.attributes.position;
  const colors = [];

  const color1 = new THREE.Color(room.groundColor || 0x2d4a1e);
  const color2 = new THREE.Color(room.sphereColor);
  const color3 = new THREE.Color(room.secondColor);
  const color4 = new THREE.Color(room.groundColor2 || room.lightColor);
  const pathColor = new THREE.Color(room.pathColor || 0xc4a265);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);

    const h = noise(x, z, seed) * room.terrainScale +
              Math.sin(x * 0.05 + seed) * room.hillHeight +
              Math.cos(z * 0.08 + seed * 1.3) * room.hillHeight * 0.7;

    const px = getPathX(z, seed);
    const distFromPath = Math.abs(x - px);
    const pathWidth = 2.5;
    const pathEdge = 3.5;
    const onPath = distFromPath < pathWidth;
    const onEdge = distFromPath < pathEdge && !onPath;

    let finalY;
    if (onPath) {
      finalY = Math.max(-1.5, h * 0.1 - 0.8);
    } else if (onEdge) {
      const t = (distFromPath - pathWidth) / (pathEdge - pathWidth);
      finalY = h * t * room.terrainScale * 0.5 - 1.5 * (1 - t);
    } else {
      finalY = h * (room.terrainScale || 1) - 2;
    }

    positions.setY(i, finalY);

    const heightT = Math.max(0, Math.min(1, (finalY + 4) / 7));
    const mixedColor = new THREE.Color();

    if (onPath) {
      mixedColor.copy(pathColor);
      mixedColor.r += (Math.random() - 0.5) * 0.05;
      mixedColor.g += (Math.random() - 0.5) * 0.05;
    } else if (onEdge) {
      mixedColor.lerpColors(color1, color2, heightT);
    } else if (heightT < 0.25) {
      mixedColor.lerpColors(color1, color2, heightT / 0.25);
    } else if (heightT < 0.5) {
      mixedColor.lerpColors(color2, color3, (heightT - 0.25) / 0.25);
    } else if (heightT < 0.75) {
      mixedColor.lerpColors(color3, color4, (heightT - 0.5) / 0.25);
    } else {
      mixedColor.lerpColors(color4, new THREE.Color(0xffffff), (heightT - 0.75) / 0.25);
    }

    const lightHit = Math.max(0.4, Math.sin(x * 0.08 + (room.sunAngle || 0)) * 0.3 + 0.7);
    mixedColor.multiplyScalar(lightHit);
    mixedColor.r = Math.max(0, Math.min(1, mixedColor.r + (Math.random() - 0.5) * 0.05));
    mixedColor.g = Math.max(0, Math.min(1, mixedColor.g + (Math.random() - 0.5) * 0.05));
    mixedColor.b = Math.max(0, Math.min(1, mixedColor.b + (Math.random() - 0.5) * 0.05));

    colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  positions.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: loadedTextures[room.redonTexture || 0],
    roughness: 0.85,
    metalness: 0.05,
  });

  const terrain = new THREE.Mesh(geo, mat);
  scene.add(terrain);
  objects.push(terrain);
}



function createCloud(room) {
  const group = new THREE.Group();
  const count = Math.floor(Math.random() * 3) + 3;
  const cloudColor = room.cloudColor || 0xffffff;

  for (let i = 0; i < count; i++) {
    const size = Math.random() * 2 + 0.8;
    const geo = new THREE.SphereGeometry(size, 7, 6);
    geo.scale(1, 0.6, 0.8);
    const mat = new THREE.MeshStandardMaterial({
      color: cloudColor,
      transparent: true,
      opacity: Math.random() * 0.2 + 0.4,
      roughness: 1,
    });
    const blob = new THREE.Mesh(geo, mat);
    blob.position.set(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 4
    );
    group.add(blob);
  }
  return group;
}

function createSky(room) {
  const skyTex = loadedTextures[(room.redonTexture + 1) % loadedTextures.length];
  skyTex.wrapS = THREE.RepeatWrapping;
  skyTex.wrapT = THREE.RepeatWrapping;
  skyTex.repeat.set(2, 2);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 16, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide })
  );
  scene.add(sky);
  objects.push(sky);

  // Sun
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(room.sunSize || 2, 24),
    new THREE.MeshBasicMaterial({ color: room.sunColor || 0xFFFFCC, transparent: true, opacity: 0.95 })
  );
  sun.position.set(room.sunX || 15, room.sunY || 20, -50);
  scene.add(sun);
  objects.push(sun);

  // Sun glow
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry((room.sunSize || 2) * 3, 24),
    new THREE.MeshBasicMaterial({ color: room.sunColor || 0xFFFFCC, transparent: true, opacity: 0.1 })
  );
  glow.position.set(room.sunX || 15, room.sunY || 20, -49);
  scene.add(glow);
  objects.push(glow);

  // Clouds — fewer
  const cloudCount = Math.min(room.cloudCount || 5, 5);
  for (let i = 0; i < cloudCount; i++) {
    const cloud = createCloud(room);
    cloud.position.set(
      (Math.random() - 0.5) * 70,
      Math.random() * 15 + 8,
      (Math.random() - 0.5) * 70 - 10
    );
    cloud.userData.driftSpeed = Math.random() * 0.001 + 0.0002;
    cloud.userData.driftOffset = Math.random() * Math.PI * 2;
    scene.add(cloud);
    objects.push(cloud);
  }
}

function createStars() {
  const geo = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 300; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    const r = 80;
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) + 5,
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.4, transparent: true, opacity: 0.9
  }));
  scene.add(stars);
  objects.push(stars);
}

function createGrass(x, z, room) {
  const group = new THREE.Group();
  const bladeCount = Math.floor(Math.random() * 4) + 2;
  const grassColor = new THREE.Color(room.groundColor).lerp(new THREE.Color(0x4a8a2a), 0.5);

  for (let i = 0; i < bladeCount; i++) {
    const h = Math.random() * 0.4 + 0.15;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3((Math.random() - 0.5) * 0.2, h * 0.6, 0),
      new THREE.Vector3((Math.random() - 0.5) * 0.3, h, 0)
    );
    const geo = new THREE.TubeGeometry(curve, 4, 0.012, 3, false);
    const mat = new THREE.MeshStandardMaterial({ color: grassColor, roughness: 0.9 });
    const blade = new THREE.Mesh(geo, mat);
    blade.position.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
    group.add(blade);
  }

  group.position.set(x, -1.5, z);
  scene.add(group);
  objects.push(group);
}


function loadRoom(index) {
  objects.forEach(obj => scene.remove(obj));
  objects = [];

  const room = ROOMS[index];
  const seed = room.seed || 0;

  // Blur overlay
  const blurOverlay = document.getElementById('blur-overlay');
  if (room.isEntry) {
    if (blurOverlay) {
      blurOverlay.style.backdropFilter = 'blur(12px)';
      blurOverlay.style.webkitBackdropFilter = 'blur(12px)';
      blurOverlay.style.opacity = '1';
    }
  } else {
    if (blurOverlay) {
      gsap.to(blurOverlay, {
        opacity: 0,
        duration: 1.5,
        ease: "power2.out",
        onComplete: () => {
          blurOverlay.style.backdropFilter = 'none';
          blurOverlay.style.webkitBackdropFilter = 'none';
        }
      });
    }
  }

  scene.background = new THREE.Color(room.background);
  scene.fog = new THREE.FogExp2(room.fog, 0.015);

  window.pointLight.color.setHex(room.lightColor);
  window.pointLight2.color.setHex(room.secondColor);
  window.sunLight.position.set(room.sunX || 5, room.sunY || 20, 5);
  window.sunLight.intensity = room.sunIntensity || 1.2;

  createTerrain(room);
  createSky(room);

  // Grass along path borders
for (let z = -55; z < 55; z += 3) {
  const px = getPathX(z, seed);
  for (let side of [-1, 1]) {
    for (let g = 0; g < 2; g++) {
      createGrass(px + side * (2.5 + Math.random() * 3), z + (Math.random() - 0.5) * 2, room);
    }
  }
}

// Scattered grass
for (let i = 0; i < 40; i++) {
  createGrass(
    (Math.random() - 0.5) * 70,
    (Math.random() - 0.5) * 70 - 5,
    room
  );
}


  if (room.hasStars) createStars();

  // Title
  const title = document.getElementById('room-title');
  if (room.isEntry) {
    title.style.display = 'none';
  } else {
    title.style.display = 'block';
    title.textContent = room.name;
    title.style.color = '#' + new THREE.Color(room.lightColor).getHexString();
    title.classList.remove('visible');
    setTimeout(() => title.classList.add('visible'), 600);
  }
  const counter = document.getElementById('track-counter');
if (room.isEntry) {
  counter.textContent = '';
} else {
  counter.textContent = '~ track ' + index;
}

}



function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;

  objects.forEach(obj => {
    if (obj.userData.driftSpeed !== undefined) {
      obj.position.x += Math.sin(time * obj.userData.driftSpeed + obj.userData.driftOffset) * 0.003;
    }
    if (obj.userData.floatSpeed !== undefined) {
      obj.position.y += Math.sin(time * obj.userData.floatSpeed + obj.userData.floatOffset) * 0.002;
    }
  });

  renderer.render(scene, camera);
}