import * as THREE from 'three';

const PALETTES = {
  hub: { wall: 0x9d8b6a, roof: 0x463d31, wood: 0x765538, stone: 0xb7a580, trim: 0xd2b455, dark: 0x292d30, glass: 0x557481 },
  desert: { wall: 0xc9a66e, roof: 0x8d6743, wood: 0x745233, stone: 0xe0c58e, trim: 0xc27643, dark: 0x342c25, glass: 0x49616a },
  snow: { wall: 0xd9d8d0, roof: 0x35414b, wood: 0x72503c, stone: 0xaeb9bc, trim: 0xb98752, dark: 0x283139, glass: 0x56717d },
  city: { wall: 0xb7a48e, roof: 0x493d3a, wood: 0x5e4639, stone: 0xd1c0a8, trim: 0x9a6848, dark: 0x2c3136, glass: 0x58727a },
  forest: { wall: 0x92866b, roof: 0x554d3b, wood: 0x594833, stone: 0xb2a788, trim: 0x7f8e57, dark: 0x302f29, glass: 0x4e6b5b },
  canyon: { wall: 0xb57b54, roof: 0x524033, wood: 0x67442f, stone: 0xd1a371, trim: 0xc49542, dark: 0x352d28, glass: 0x4e6570 },
  garden: { wall: 0xe0d9c7, roof: 0x647b78, wood: 0x756248, stone: 0xf0e9d7, trim: 0xc6a75c, dark: 0x353633, glass: 0x4f777b },
  mountain: { wall: 0xa49b83, roof: 0x4d5142, wood: 0x66503b, stone: 0xc0b69c, trim: 0xb59a54, dark: 0x30312c, glass: 0x506a65 },
};

const SITE_PLANS = {
  hub: [
    { type: 'station', x: 31, z: -18, yaw: -0.25, scale: 1.1, width: 9, depth: 7, radius: 5.8, height: 6 },
    { type: 'watchtower', x: 35, z: -8, yaw: 0.4, scale: 0.82, width: 6, depth: 6, radius: 4.3, height: 8 },
    { type: 'shed', x: 28, z: -27, yaw: 0.65, scale: 0.8, width: 7, depth: 6, radius: 4.7, height: 4 },
  ],
  giza: [
    { type: 'adobe', x: 28, z: -25, yaw: -0.2, scale: 1, width: 8, depth: 6, radius: 5.4, height: 5 },
    { type: 'adobe', x: 35, z: -18, yaw: 0.35, scale: 0.76, width: 8, depth: 6, radius: 4.5, height: 4.5 },
    { type: 'stall', x: 25, z: -32, yaw: 0.7, scale: 0.9, width: 7, depth: 5, radius: 4.3, height: 4 },
  ],
  everest: [
    { type: 'lodge', x: -28, z: -27, yaw: 0.25, scale: 0.95, width: 8, depth: 7, radius: 5.6, height: 6 },
    { type: 'tent', x: -36, z: -22, yaw: -0.3, scale: 0.9, width: 6, depth: 5, radius: 3.9, height: 3.5 },
    { type: 'tent', x: -25, z: -36, yaw: 0.5, scale: 0.78, width: 6, depth: 5, radius: 3.5, height: 3.2 },
  ],
  eiffel: [
    { type: 'maison', x: -31, z: -21, yaw: 0.12, scale: 0.95, width: 7, depth: 6, radius: 5, height: 10 },
    { type: 'maison', x: -38, z: -13, yaw: -0.2, scale: 0.82, width: 7, depth: 6, radius: 4.5, height: 9 },
    { type: 'station', x: -30, z: -7, yaw: 0.55, scale: 0.72, width: 8, depth: 6, radius: 4.4, height: 5 },
  ],
  'machu-picchu': [
    { type: 'stonehouse', x: -34, z: 13, yaw: -0.2, scale: 0.9, width: 7, depth: 6, radius: 4.8, height: 5 },
    { type: 'stonehouse', x: -38, z: 21, yaw: 0.15, scale: 0.82, width: 7, depth: 6, radius: 4.5, height: 4.5 },
    { type: 'pavilion', x: -30, z: 29, yaw: -0.5, scale: 0.78, width: 8, depth: 7, radius: 4.8, height: 7 },
  ],
  'grand-canyon': [
    { type: 'ranger', x: -34, z: -30, yaw: 0.3, scale: 0.95, width: 9, depth: 7, radius: 5.8, height: 6 },
    { type: 'lodge', x: -25, z: -36, yaw: -0.35, scale: 0.78, width: 8, depth: 7, radius: 4.8, height: 5 },
    { type: 'watchtower', x: -41, z: -23, yaw: 0.6, scale: 0.72, width: 6, depth: 6, radius: 3.9, height: 7 },
  ],
  'taj-mahal': [
    { type: 'pavilion', x: 36, z: 6, yaw: 0.2, scale: 0.95, width: 9, depth: 8, radius: 5.8, height: 8 },
    { type: 'pavilion', x: 41, z: 16, yaw: -0.3, scale: 0.74, width: 9, depth: 8, radius: 4.8, height: 7 },
    { type: 'gardenhouse', x: 34, z: 27, yaw: 0.45, scale: 0.76, width: 8, depth: 6, radius: 4.7, height: 5 },
  ],
  'great-wall': [
    { type: 'watchtower', x: 34, z: 1, yaw: -0.25, scale: 0.9, width: 7, depth: 7, radius: 5, height: 9 },
    { type: 'watchtower', x: 40, z: 9, yaw: 0.4, scale: 0.75, width: 7, depth: 7, radius: 4.4, height: 8 },
    { type: 'lodge', x: 34, z: 23, yaw: -0.15, scale: 0.75, width: 8, depth: 7, radius: 4.7, height: 5 },
  ],
};

function makePalette(zoneId) {
  const colors = PALETTES[zoneId] ?? PALETTES.hub;
  return Object.fromEntries(Object.entries(colors).map(([key, color]) => [
    key,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      flatShading: true,
    }),
  ]));
}

function addHouse(addBlock, {
  width,
  depth,
  wallHeight,
  roof = 'gable',
  balcony = false,
  porch = false,
}) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  addBlock('stone', [width + 0.7, 0.55, depth + 0.7], 0, 0.28, 0);
  addBlock('wall', [width, wallHeight, depth], 0, 0.55 + wallHeight / 2, 0);
  addBlock('dark', [1.25, 2.2, 0.16], 0, 1.65, halfDepth + 0.09);
  addBlock('trim', [1.55, 0.16, 0.22], 0, 2.82, halfDepth + 0.1);
  for (const x of [-halfWidth * 0.57, halfWidth * 0.57]) {
    addBlock('glass', [1.05, 1.05, 0.13], x, wallHeight > 5 ? 3.9 : 2.35, halfDepth + 0.1);
    addBlock('trim', [1.34, 0.14, 0.2], x, wallHeight > 5 ? 4.48 : 2.92, halfDepth + 0.12);
    if (balcony) {
      addBlock('stone', [1.6, 0.18, 0.65], x, 3.25, halfDepth + 0.38);
      for (const railX of [-0.62, 0, 0.62]) {
        addBlock('trim', [0.11, 0.46, 0.11], x + railX, 3.53, halfDepth + 0.62);
      }
    }
  }
  if (porch) {
    addBlock('wood', [width + 1.2, 0.28, 2.2], 0, 0.35, halfDepth + 1.1);
    for (const x of [-halfWidth * 0.72, halfWidth * 0.72]) {
      addBlock('wood', [0.25, 2.8, 0.25], x, 1.8, halfDepth + 1.7);
    }
    addBlock('roof', [width + 1.6, 0.35, 2.5], 0, 3.28, halfDepth + 1.1);
  }
  if (roof === 'gable') {
    for (const side of [-1, 1]) {
      addBlock('roof', [halfWidth + 0.55, 0.36, depth + 1], side * halfWidth * 0.24, wallHeight + 0.72, 0, 0, side * 0.48);
    }
    addBlock('roof', [0.42, 0.46, depth + 1.1], 0, wallHeight + 1.15, 0);
  } else {
    addBlock('roof', [width + 1.1, 0.55, depth + 1.1], 0, wallHeight + 0.82, 0);
    addBlock('stone', [width + 0.25, 0.42, 0.45], 0, wallHeight + 1.3, -halfDepth + 0.15);
    addBlock('stone', [width + 0.25, 0.42, 0.45], 0, wallHeight + 1.3, halfDepth - 0.15);
  }
  addBlock('roof', [0.8, 1.3, 0.8], halfWidth * 0.6, wallHeight + 1.35, -halfDepth * 0.45);
}

function addMaison(addBlock) {
  const width = 6.5;
  const depth = 5.5;
  addBlock('stone', [width + 0.8, 0.55, depth + 0.8], 0, 0.28, 0);
  addBlock('wall', [width, 8.1, depth], 0, 4.6, 0);
  addBlock('dark', [1.2, 2.4, 0.18], 0, 1.75, 2.82);
  for (const floor of [2.7, 5.1, 7.45]) {
    addBlock('trim', [width + 0.28, 0.18, 0.22], 0, floor, 2.82);
    for (const x of [-1.8, 1.8]) {
      addBlock('glass', [1.02, 1.25, 0.14], x, floor + 0.82, 2.83);
      addBlock('stone', [1.3, 0.16, 0.25], x, floor + 1.53, 2.84);
      addBlock('trim', [1.55, 0.13, 0.65], x, floor - 0.08, 3.1);
      for (const railX of [-0.58, 0, 0.58]) {
        addBlock('dark', [0.08, 0.38, 0.08], x + railX, floor + 0.1, 3.38);
      }
    }
  }
  for (const side of [-1, 1]) {
    addBlock('roof', [4, 0.42, 6.4], side * 1.15, 9.05, 0, 0, side * 0.48);
  }
  addBlock('roof', [1.2, 0.52, 6.5], 0, 9.55, 0);
  for (const x of [-1.8, 1.8]) {
    addBlock('roof', [0.75, 0.75, 0.6], x, 9.85, -1.6);
  }
}

function addStoneHouse(addBlock) {
  const width = 6.5;
  const depth = 5.5;
  addBlock('stone', [width + 0.8, 0.75, depth + 0.8], 0, 0.38, 0);
  for (const x of [-2.45, -0.85, 0.85, 2.45]) {
    addBlock('wall', [1.55, 2.9, depth], x, 2.2, 0);
  }
  addBlock('dark', [1.25, 2.2, 0.18], 0, 1.65, 2.84);
  addBlock('stone', [1.7, 0.28, 0.36], 0, 2.88, 2.92);
  addBlock('roof', [width + 0.7, 0.65, depth + 0.7], 0, 3.9, 0);
  for (let level = 0; level < 3; level++) {
    addBlock('trim', [width - level * 0.8, 0.32, 0.5], 0, 4.38 + level * 0.42, -1.2);
  }
  for (const x of [-2.2, 2.2]) {
    addBlock('stone', [0.3, 2.2, 0.3], x, 1.55, -2.1);
    addBlock('stone', [0.3, 2.2, 0.3], x, 1.55, 2.1);
  }
}

function addTent(addBlock) {
  addBlock('stone', [6.6, 0.32, 5.6], 0, 0.16, 0);
  for (const side of [-1, 1]) {
    addBlock('trim', [3.5, 0.32, 5.4], side * 0.85, 1.55, 0, 0, side * 0.58);
  }
  addBlock('dark', [1.35, 1.8, 0.13], 0, 1.14, 2.3);
  addBlock('wood', [0.16, 3.2, 0.16], 0, 1.72, 0);
  addBlock('trim', [0.18, 2.5, 0.18], -2.7, 1.33, -2.15, 0, -0.55);
  addBlock('trim', [0.18, 2.5, 0.18], 2.7, 1.33, -2.15, 0, 0.55);
}

function addWatchtower(addBlock) {
  addBlock('stone', [7.3, 0.65, 7.3], 0, 0.32, 0);
  addBlock('wall', [5.2, 5.2, 5.2], 0, 3.25, 0);
  for (const x of [-1.35, 1.35]) {
    addBlock('dark', [0.72, 1.15, 0.18], x, 3.6, 2.64);
    addBlock('trim', [0.94, 0.16, 0.25], x, 4.25, 2.68);
  }
  addBlock('dark', [1.15, 2.1, 0.18], 0, 1.65, 2.64);
  addBlock('stone', [6.6, 0.45, 6.6], 0, 6.1, 0);
  for (const side of [-1, 1]) {
    addBlock('roof', [4.2, 0.45, 6.7], side * 1.2, 6.75, 0, 0, side * 0.42);
  }
  addBlock('roof', [1.15, 0.5, 6.8], 0, 7.35, 0);
  for (const side of [-1, 1]) {
    addBlock('trim', [7.1, 0.36, 0.42], 0, 6.45, side * 3.3);
  }
  addBlock('trim', [0.55, 0.85, 0.55], 0, 7.95, 0);
}

function addPavilion(addBlock) {
  addBlock('stone', [9.2, 0.7, 8.2], 0, 0.35, 0);
  addBlock('wall', [6.4, 0.5, 5.4], 0, 0.95, 0);
  for (const x of [-2.45, 2.45]) {
    for (const z of [-1.95, 1.95]) {
      addBlock('stone', [0.55, 4.7, 0.55], x, 3.55, z);
      addBlock('trim', [0.8, 0.25, 0.8], x, 5.95, z);
    }
  }
  addBlock('roof', [8.2, 0.65, 7.2], 0, 6.42, 0);
  for (let level = 0; level < 4; level++) {
    const width = 5.1 - level * 0.85;
    addBlock(level % 2 ? 'trim' : 'stone', [width, 0.48, width], 0, 6.95 + level * 0.54, -0.2);
  }
  addBlock('trim', [0.65, 0.85, 0.65], 0, 9.2, -0.2);
  addBlock('stone', [2.4, 0.9, 1.8], 0, 1.65, 3.05);
  addBlock('dark', [1, 1.5, 0.14], 0, 2.05, 3.98);
}

function addRangerStation(addBlock) {
  addHouse(addBlock, { width: 8, depth: 6, wallHeight: 4.2, porch: true, roof: 'gable' });
  addBlock('trim', [2.7, 0.55, 0.2], 0, 3.1, 3.18);
  addBlock('dark', [2.35, 0.3, 0.14], 0, 3.15, 3.3);
  for (const x of [-3.2, 3.2]) {
    addBlock('wood', [0.18, 3.8, 0.18], x, 1.95, 3.7);
  }
}

function addStall(addBlock) {
  addBlock('stone', [7, 0.42, 5.4], 0, 0.21, 0);
  addBlock('wood', [6.2, 2.5, 0.35], 0, 1.65, 0.8);
  addBlock('wood', [0.3, 3.7, 0.3], -2.8, 1.9, -1.7);
  addBlock('wood', [0.3, 3.7, 0.3], 2.8, 1.9, -1.7);
  addBlock('trim', [7.3, 0.5, 5.8], 0, 3.7, -0.1);
  addBlock('dark', [4.2, 0.18, 0.2], 0, 2.3, 1.05);
  for (const x of [-2.1, 0, 2.1]) {
    addBlock('stone', [1.15, 0.9, 0.8], x, 0.9, 1.55);
  }
  addBlock('roof', [0.38, 4.4, 0.38], -3.4, 2.2, -2.55);
  addBlock('roof', [0.38, 4.4, 0.38], 3.4, 2.2, -2.55);
}

function buildStructure(addBlock, type) {
  if (type === 'maison') return addMaison(addBlock);
  if (type === 'stonehouse') return addStoneHouse(addBlock);
  if (type === 'tent') return addTent(addBlock);
  if (type === 'watchtower') return addWatchtower(addBlock);
  if (type === 'pavilion' || type === 'gardenhouse') return addPavilion(addBlock);
  if (type === 'ranger') return addRangerStation(addBlock);
  if (type === 'stall') return addStall(addBlock);
  if (type === 'lodge') return addHouse(addBlock, { width: 7.5, depth: 6.5, wallHeight: 4.3, porch: true, roof: 'gable' });
  if (type === 'adobe') return addHouse(addBlock, { width: 7.5, depth: 6, wallHeight: 4.2, roof: 'flat' });
  return addHouse(addBlock, { width: 7.5, depth: 6.5, wallHeight: 4, roof: 'flat' });
}

export function buildSiteBuildings(scene, zone, terrainHeight) {
  const plan = SITE_PLANS[zone.destinationId ?? zone.id] ?? [];
  if (plan.length === 0) return { objects: [], cover: [], occluders: [] };

  const materials = makePalette(zone.id);
  const buckets = new Map(Object.keys(materials).map((key) => [key, []]));
  const cover = [];
  const origin = new THREE.Object3D();
  const part = new THREE.Object3D();
  const worldMatrix = new THREE.Matrix4();

  for (const structure of plan) {
    const baseY = terrainHeight(structure.x, structure.z, zone.id, zone.landmark.pos);
    origin.position.set(structure.x, baseY, structure.z);
    origin.rotation.set(0, structure.yaw, 0);
    origin.scale.setScalar(structure.scale);
    origin.updateMatrix();

    const addBlock = (material, size, x, y, z, rotationY = 0, rotationZ = 0) => {
      part.position.set(x, y, z);
      part.rotation.set(0, rotationY, rotationZ);
      part.scale.set(size[0], size[1], size[2]);
      part.updateMatrix();
      worldMatrix.multiplyMatrices(origin.matrix, part.matrix);
      buckets.get(material).push(worldMatrix.clone());
    };

    buildStructure(addBlock, structure.type);
    cover.push({
      x: structure.x,
      z: structure.z,
      radius: structure.radius,
      height: structure.height,
    });
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const objects = [];
  for (const [materialKey, matrices] of buckets) {
    if (matrices.length === 0) continue;
    const mesh = new THREE.InstancedMesh(geometry, materials[materialKey], matrices.length);
    mesh.name = `site-buildings-${materialKey}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
    objects.push(mesh);
  }

  return { objects, cover, occluders: objects };
}
