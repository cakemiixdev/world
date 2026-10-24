// world.js
import * as THREE from 'three';
import { buildSiteBuildings } from './buildings.js';

export const ZONES = {
  hub:    { id: 'hub',    name: 'THE HUB',              country: 'WORLD HOP', sky: 0x87ceeb, ground: 0x5aa85a, tree: 0x2e8b57, trunk: 0x6b4a2b, hasWater: true,  treeCount: 22, neighborRoute: [[-24, -18], [-10, -34], [18, -30], [34, -10], [30, 14], [8, 22]], landmark: { type: 'tower',   pos: [18, -12], label: 'THE BEACON' } },
  desert: { id: 'desert', name: 'EGYPT - SUNSCORCH',    country: 'EGYPT',     sky: 0xf2d09a, ground: 0xd9b97a, tree: 0x9c7b4d, trunk: 0x7a5a34, hasWater: false, treeCount: 10, neighborRoute: [[-28, -25], [-8, -42], [24, -36], [46, -10], [32, 16], [0, 12]], landmark: { type: 'pyramid', pos: [14, -18], label: 'THE GREAT PYRAMID OF GIZA' } },
  snow:   { id: 'snow',   name: 'NEPAL - FROSTPEAK',    country: 'NEPAL',     sky: 0xcfdde8, ground: 0xeef4f9, tree: 0x2f4a3a, trunk: 0x3a2c22, hasWater: false, treeCount: 14, neighborRoute: [[-49, -22], [-32, -47], [1, -46], [29, -18], [8, 12], [-31, 10]], landmark: { type: 'peak',    pos: [-16, -20], label: 'MOUNT EVEREST' } },
  city:   { id: 'city',   name: 'CITY PARK',            country: 'FRANCE',    sky: 0x9bb7c2, ground: 0x65795a, tree: 0x315a41, trunk: 0x514431, hasWater: false, treeCount: 9, neighborRoute: [[-24, -18], [-10, -34], [18, -30], [34, -10], [30, 14], [8, 22]], landmark: { type: 'iron-tower', pos: [-18, -16], label: 'EIFFEL TOWER' } },
  forest: { id: 'forest', name: 'CLOUD FOREST',         country: 'PERU',      sky: 0x91b3aa, ground: 0x587252, tree: 0x286045, trunk: 0x55402e, hasWater: false, treeCount: 30, neighborRoute: [[-24, -18], [-10, -34], [18, -30], [34, -10], [30, 14], [8, 22]], landmark: { type: 'ruins', pos: [-24, 14], label: 'MACHU PICCHU' } },
  canyon: { id: 'canyon', name: 'THE SOUTH RIM',        country: 'UNITED STATES', sky: 0xd7a174, ground: 0xb86e45, tree: 0x69744a, trunk: 0x5b432f, hasWater: false, treeCount: 8, neighborRoute: [[-28, -25], [-8, -42], [24, -36], [46, -10], [32, 16], [0, 12]], landmark: { type: 'canyon', pos: [-22, -18], label: 'GRAND CANYON SOUTH RIM' } },
  garden: { id: 'garden', name: 'RIVERSIDE GARDENS',    country: 'INDIA',     sky: 0x9cc5cf, ground: 0x72925c, tree: 0x326341, trunk: 0x624b34, hasWater: true, treeCount: 20, neighborRoute: [[-28, -25], [-8, -42], [24, -36], [46, -10], [32, 16], [0, 12]], landmark: { type: 'dome', pos: [18, 12], label: 'TAJ MAHAL' } },
  mountain: { id: 'mountain', name: 'MUTIANYU RIDGE',   country: 'CHINA',     sky: 0xa9c7cf, ground: 0x64734c, tree: 0x31563b, trunk: 0x4d3e30, hasWater: false, treeCount: 24, neighborRoute: [[-49, -22], [-32, -47], [1, -46], [29, -18], [8, 12], [-31, 10]], landmark: { type: 'wall', pos: [19, 7], label: 'GREAT WALL · MUTIANYU' } },
};

function terrainHeight(x, z, zoneId, peakPosition = ZONES.snow.landmark.pos) {
  const d = Math.sqrt(x * x + z * z);
  const rolling = (Math.sin(x * 0.08) * 3 + Math.cos(z * 0.09) * 2.5 + Math.sin((x + z) * 0.04) * 5) * Math.min(1, d / 20);
  if (zoneId === 'desert') {
    return rolling * 0.35 + Math.sin(x * 0.11 + Math.cos(z * 0.06)) * 2.2;
  }
  if (zoneId === 'snow') {
    const [peakX, peakZ] = peakPosition;
    const distance = Math.hypot(x - peakX, z - peakZ);
    const mountain = 24 * Math.exp(-(distance * distance) / (2 * 24 * 24));
    return rolling * 0.5 + mountain;
  }
  if (zoneId === 'mountain') {
    const [peakX, peakZ] = peakPosition;
    const distance = Math.hypot(x - peakX, z - peakZ);
    return rolling * 0.8 + 14 * Math.exp(-(distance * distance) / (2 * 32 * 32));
  }
  if (zoneId === 'canyon') return rolling * 0.25 + Math.sin(z * 0.16) * 1.4 + Math.sin(x * 0.12) * 0.8;
  if (zoneId === 'garden') return rolling * 0.45;
  return rolling;
}

function addBlock(parent, size, material, position, rotationY = 0) {
  const block = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  block.position.set(...position);
  block.rotation.y = rotationY;
  block.castShadow = true;
  block.receiveShadow = true;
  parent.add(block);
  return block;
}

export function buildWorld(scene, zoneId, destination = null) {
  const baseZone = ZONES[zoneId];
  if (!baseZone) throw new RangeError(`Unknown zone: ${zoneId}`);
  const zone = destination ? {
    ...baseZone,
    name: destination.location,
    country: destination.country,
    destinationId: destination.id,
    coordinates: destination.coordinates,
    destination,
    landmark: { ...destination.landmark },
  } : baseZone;
  scene.traverse((object) => {
    if (object.isLight) object.shadow?.map?.dispose();
    if (!object.isMesh && !object.isPoints) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material?.dispose());
  });
  scene.clear();
  scene.background = new THREE.Color(zone.sky);
  scene.fog = new THREE.Fog(zone.sky, 125, 330);

  // Lights
  const sun = new THREE.DirectionalLight(0xfff4d6, 2.0);
  sun.position.set(60, 100, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -125; sun.shadow.camera.right = 125;
  sun.shadow.camera.top = 125; sun.shadow.camera.bottom = -125;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x8899bb, 0.9));
  scene.add(new THREE.HemisphereLight(zone.sky, zone.ground, 0.5));

  // Ground heightmap
  const geo = new THREE.PlaneGeometry(240, 240, 40, 40);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrainHeight(p.getX(i), p.getZ(i), zone.id, zone.landmark.pos));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: zone.ground, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);
  const occluders = [ground];
  const cover = [];
  const isHomeBase = zone.id === 'hub' && (!destination || destination.id === 'hub');

  // Water (hub only)
  let water = null;
  if (zone.hasWater && (isHomeBase || zone.id === 'garden')) {
    const waterWidth = zone.id === 'garden' ? 48 : 60;
    const waterDepth = zone.id === 'garden' ? 12 : 60;
    const wgeo = new THREE.PlaneGeometry(waterWidth, waterDepth); wgeo.rotateX(-Math.PI / 2);
    water = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({ color: 0x2f7fbf, transparent: true, opacity: 0.72, roughness: 0.15, metalness: 0.1 }));
    const waterX = -35;
    const waterZ = zone.id === 'garden' ? -20 : 25;
    water.position.set(waterX, terrainHeight(waterX, waterZ, zone.id, zone.landmark.pos) + 0.15, waterZ);
    water.userData = {
      surfaceY: water.position.y,
      minX: water.position.x - waterWidth / 2,
      maxX: water.position.x + waterWidth / 2,
      minZ: water.position.z - waterDepth / 2,
      maxZ: water.position.z + waterDepth / 2,
    };
    scene.add(water);
  }

  // Ladder + platform + map table (hub only)
  let ladder = null, mapTable = null;
  const colliders = [ground];

  if (isHomeBase) {
    const ladderGroup = new THREE.Group();
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const rungMat = new THREE.MeshStandardMaterial({ color: 0xc49a6c });
    for (const dx of [-0.5, 0.5]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 7, 0.16), railMat);
      rail.position.set(dx, 3.5, 0); rail.castShadow = true; ladderGroup.add(rail);
    }
    for (let i = 0; i < 9; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.14), rungMat);
      rung.position.set(0, 0.7 + i * 0.75, 0); rung.castShadow = true; ladderGroup.add(rung);
    }
    ladderGroup.position.set(6, 0, -8);
    ladder = ladderGroup;
    scene.add(ladderGroup);

    const platform = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 10), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true }));
    platform.position.set(6, 7, -8); platform.castShadow = true; platform.receiveShadow = true;
    scene.add(platform); colliders.push(platform); occluders.push(platform);

    mapTable = new THREE.Group();
    const legMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b });
    for (const [lx, lz] of [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), legMat);
      leg.position.set(lx, 0.6, lz); mapTable.add(leg);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 2.4), new THREE.MeshStandardMaterial({ color: 0xe8d8b0, flatShading: true }));
    top.position.y = 1.25; mapTable.add(top);
    const pinColors = [0xffd400, 0xff5a3c, 0x4aa3ff];
    [[-0.8, 0.9], [0.8, 0.9], [0, 0]].forEach(([px, pz], i) => {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 8), new THREE.MeshStandardMaterial({ color: pinColors[i] }));
      pin.position.set(px, 1.5, pz); mapTable.add(pin);
    });
    mapTable.position.set(6, 7.2, -8);
    scene.add(mapTable);
  }

  // Landmark
  const lm = zone.landmark;
  const landmark = new THREE.Group();
  const animatedParts = [];
  const stone = new THREE.MeshStandardMaterial({ color: 0xd9d4c8, flatShading: true, roughness: 1 });
  const goldStone = new THREE.MeshStandardMaterial({ color: 0xc9a96a, flatShading: true, roughness: 1 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x79634a, flatShading: true, roughness: 1 });
  if (lm.type === 'tower') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 5), darkStone);
    base.position.y = 0.6;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 3), stone);
    shaft.position.y = 5.1;
    const trim = new THREE.MeshStandardMaterial({ color: 0x3e5360, flatShading: true, roughness: 1 });
    for (const height of [2, 5, 8]) {
      addBlock(landmark, [3.25, 0.28, 3.25], trim, [0, height, 0]);
      addBlock(landmark, [0.48, 1.4, 0.12], darkStone, [0, height + 0.85, 1.56]);
    }
    const beacon = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3, 4), goldStone);
    beacon.position.y = 11.1;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.7, 0.16, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd400, emissive: 0x684f00, flatShading: true })
    );
    ring.position.y = 11.1;
    ring.rotation.x = Math.PI / 2;
    const beaconLight = new THREE.PointLight(0xffd400, 8, 32);
    beaconLight.position.y = 11;
    landmark.add(base, shaft, beacon, ring, beaconLight);
    animatedParts.push({ ring, beaconLight });
  } else if (lm.type === 'pyramid') {
    const stepMaterials = [goldStone, darkStone, goldStone, stone, goldStone];
    for (let i = 0; i < stepMaterials.length; i++) {
      const width = 15 - i * 2.45;
      addBlock(landmark, [width, 2, width], stepMaterials[i], [0, 1 + i * 2, 0]);
    }
    addBlock(landmark, [1.6, 2.5, 0.18], darkStone, [0, 1.25, 7.58]);
    addBlock(landmark, [2.8, 0.45, 1.2], stone, [0, 2.6, 8.1]);
    for (let i = 0; i < 7; i++) {
      addBlock(landmark, [1.5, 0.2, 0.8], darkStone, [0, 0.15 + i * 0.34, 8.8 + i * 0.26]);
    }
  } else if (lm.type === 'peak') {
    const mountainStone = new THREE.MeshStandardMaterial({ color: 0x879eab, flatShading: true, roughness: 1 });
    const snowStone = new THREE.MeshStandardMaterial({ color: 0xf4f7f6, flatShading: true, roughness: 1 });
    for (let level = 0; level < 8; level++) {
      const width = 19 - level * 2.1;
      addBlock(landmark, [width, 2.6, width * 0.82], level > 4 ? snowStone : mountainStone, [
        (level % 2 ? -1 : 1) * (0.35 + level * 0.1),
        1.3 + level * 2.25,
        level % 3 === 0 ? 0.35 : -0.25,
      ]);
    }
    addBlock(landmark, [2.8, 2.2, 2.8], snowStone, [0, 19.8, 0]);
  } else if (lm.type === 'iron-tower') {
    const iron = new THREE.MeshStandardMaterial({ color: 0x414b4e, flatShading: true, metalness: 0.35, roughness: 0.75 });
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x60696a, flatShading: true, metalness: 0.2 });
    for (const height of [3, 6.5, 10]) {
      const width = 5 - height * 0.24;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.38, width), platformMat);
      deck.position.y = height;
      landmark.add(deck);
      for (const x of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, height, 0.28), iron);
        leg.position.set(x * width * 0.38, height / 2, 0);
        leg.rotation.z = -x * 0.16;
        landmark.add(leg);
      }
      for (const z of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, height, 0.28), iron);
        leg.position.set(0, height / 2, z * width * 0.38);
        leg.rotation.x = z * 0.16;
        landmark.add(leg);
      }
      const brace = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.14, 0.14), iron);
      brace.position.set(0, height * 0.52, width * 0.3);
      brace.rotation.z = 0.42;
      landmark.add(brace);
      const reverseBrace = brace.clone();
      reverseBrace.position.x = 0;
      reverseBrace.rotation.z = -0.42;
      landmark.add(reverseBrace);
    }
    for (const x of [-1, 1]) {
      const archLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6, 0.22), iron);
      archLeg.position.set(x * 1.25, 3, 0);
      archLeg.rotation.z = x * 0.32;
      landmark.add(archLeg);
    }
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2, 4), iron);
    spire.position.y = 11.1;
    landmark.add(spire);
  } else if (lm.type === 'ruins') {
    const terrace = new THREE.MeshStandardMaterial({ color: 0x78865d, flatShading: true, roughness: 1 });
    const stoneBlocks = new THREE.MeshStandardMaterial({ color: 0x9a9273, flatShading: true, roughness: 1 });
    for (let level = 0; level < 5; level++) {
      const width = 13 - level * 2.1;
      const platform = new THREE.Mesh(new THREE.BoxGeometry(width, 0.8, width * 0.72), terrace);
      platform.position.y = 0.4 + level * 1.2;
      landmark.add(platform);
      for (const x of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(width * 0.3, 1.2, 0.6), stoneBlocks);
        wall.position.set(x * width * 0.28, 1 + level * 1.2, 0);
        landmark.add(wall);
      }
      for (let step = 0; step < 4; step++) {
        addBlock(landmark, [1.3, 0.24, 0.8], stoneBlocks, [
          0,
          0.15 + step * 0.34 + level * 1.2,
          width * 0.31 + step * 0.42,
        ]);
      }
    }
  } else if (lm.type === 'canyon') {
    const canyonColors = [0x9b5838, 0xc07b48, 0xd59a5e, 0x7d4534];
    canyonColors.forEach((color, layer) => {
      const cliff = new THREE.Mesh(
        new THREE.BoxGeometry(16 - layer * 1.4, 2.2, 13 - layer * 1.1),
        new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 })
      );
      cliff.position.set(layer % 2 ? 1.2 : -1.2, 1.1 + layer * 2.15, layer % 2 ? 0.8 : -0.8);
      landmark.add(cliff);
    });
  } else if (lm.type === 'dome') {
    const marble = new THREE.MeshStandardMaterial({ color: 0xe5e1d2, flatShading: true, roughness: 0.75 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x496a72, flatShading: true, roughness: 0.8 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(12, 4.2, 8), marble);
    base.position.y = 2.1;
    const domeMaterials = [marble, accent, marble, accent];
    for (let level = 0; level < 4; level++) {
      const width = 5.7 - level * 1.1;
      addBlock(landmark, [width, 0.7, width], domeMaterials[level], [
        0,
        4.55 + level * 0.68,
        -0.2,
      ]);
    }
    const dome = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.2, 4), marble);
    dome.position.y = 7.9;
    landmark.add(base, dome);
    for (const x of [-4.5, 4.5]) {
      const minaret = new THREE.Mesh(new THREE.BoxGeometry(0.82, 8, 0.82), marble);
      minaret.position.set(x, 4, -1.5);
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.34, 1.2), accent);
      balcony.position.set(x, 5.8, -1.5);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.3, 4), accent);
      cap.position.set(x, 8.6, 0);
      cap.position.z = -1.5;
      landmark.add(minaret, balcony, cap);
    }
    addBlock(landmark, [2.2, 1.7, 0.24], accent, [0, 2.1, 4.08]);
    addBlock(landmark, [1.25, 1.15, 0.28], darkStone, [0, 1.7, 4.22]);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.2, 4), accent);
    finial.position.y = 9.6;
    landmark.add(finial);
  } else if (lm.type === 'wall') {
    const wallStone = new THREE.MeshStandardMaterial({ color: 0xa79d83, flatShading: true, roughness: 1 });
    const watchtowerMaterial = new THREE.MeshStandardMaterial({ color: 0x716b5e, flatShading: true, roughness: 1 });
    for (let segment = 0; segment < 9; segment++) {
      const x = (segment - 4) * 2.5;
      const z = Math.sin(segment * 0.72) * 4;
      const section = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 1.1), wallStone);
      section.position.set(x, 1.2 + Math.sin(segment * 0.5) * 0.3, z);
      section.rotation.y = Math.cos(segment * 0.72) * 0.22;
      landmark.add(section);
      for (let crenel = -1; crenel <= 1; crenel++) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.34), wallStone);
        merlon.position.set(x + crenel * 0.72, 2.58 + Math.sin(segment * 0.5) * 0.3, z);
        merlon.rotation.y = section.rotation.y;
        landmark.add(merlon);
      }
      if (segment % 3 === 0) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4, 2.1), watchtowerMaterial);
        tower.position.set(x, 2, z);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.45, 2.6), darkStone);
        roof.position.set(x, 4.15, z);
        const window = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.12), darkStone);
        window.position.set(x, 2.8, z + 1.1);
        landmark.add(tower, roof, window);
      }
    }
  }
  landmark.position.set(
    lm.pos[0],
    terrainHeight(lm.pos[0], lm.pos[1], zone.id, zone.landmark.pos),
    lm.pos[1]
  );
  landmark.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  scene.add(landmark);
  occluders.push(landmark);

  const siteBuildings = buildSiteBuildings(scene, zone, terrainHeight);
  cover.push(...siteBuildings.cover);
  occluders.push(...siteBuildings.occluders);

  const hasCave = ['desert', 'snow', 'forest', 'canyon', 'mountain'].includes(zone.id);
  const cavePosition = hasCave
    ? new THREE.Vector3(lm.pos[0] + 34, 0, lm.pos[1] + 28)
    : null;
  if (cavePosition) {
    cavePosition.y = terrainHeight(cavePosition.x, cavePosition.z, zone.id, zone.landmark.pos);
    const cave = new THREE.Group();
    const caveStone = new THREE.MeshStandardMaterial({ color: 0x35312d, roughness: 1, flatShading: true });
    const caveInterior = new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 1, flatShading: true });
    const entranceStone = new THREE.MeshStandardMaterial({
      color: zone.id === 'snow' ? 0x8b9aa0 : zone.id === 'canyon' ? 0x724432 : 0x57584e,
      roughness: 1,
      flatShading: true,
    });
    const caveParts = [
      [new THREE.BoxGeometry(0.8, 5, 16), caveStone, [-3.2, 2.5, 0]],
      [new THREE.BoxGeometry(0.8, 5, 16), caveStone, [3.2, 2.5, 0]],
      [new THREE.BoxGeometry(7.2, 0.9, 16), caveInterior, [0, 5.05, 0]],
      [new THREE.BoxGeometry(1.1, 2.3, 1.5), entranceStone, [-2.7, 1.15, 7.4]],
      [new THREE.BoxGeometry(1.1, 2.3, 1.5), entranceStone, [2.7, 1.15, 7.4]],
      [new THREE.BoxGeometry(4.5, 1.2, 1.5), entranceStone, [0, 4.4, 7.4]],
      [new THREE.BoxGeometry(1.3, 0.4, 1.8), entranceStone, [-2.1, 5.25, 7.1]],
      [new THREE.BoxGeometry(1.3, 0.4, 1.8), entranceStone, [2.1, 5.25, 7.1]],
    ];
    for (const [geometry, material, position] of caveParts) {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(...position);
      part.castShadow = true;
      part.receiveShadow = true;
      cave.add(part);
    }
    const caveGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xffd400, emissive: 0x5b4100, flatShading: true })
    );
    caveGlow.position.set(0, 3.45, 7.55);
    cave.add(caveGlow);
    cave.position.copy(cavePosition);
    scene.add(cave);
    occluders.push(cave);
    for (let segment = 0; segment <= 4; segment++) {
      const z = cavePosition.z + 6 - segment * 3;
      cover.push(
        { x: cavePosition.x - 3.2, z, radius: 0.75, height: 5 },
        { x: cavePosition.x + 3.2, z, radius: 0.75, height: 5 }
      );
    }
  }

  const trailPoints = [new THREE.Vector3(0, 0, 10), new THREE.Vector3(lm.pos[0], 0, lm.pos[1])];
  if (cavePosition) trailPoints.push(new THREE.Vector3(cavePosition.x, 0, cavePosition.z + 6));
  const outpostPosition = zone.id === 'hub'
    ? new THREE.Vector3(48, 0, -48)
    : new THREE.Vector3(lm.pos[0] - 58, 0, lm.pos[1] + 58);
  outpostPosition.y = terrainHeight(outpostPosition.x, outpostPosition.z, zone.id, zone.landmark.pos);
  trailPoints.push(outpostPosition);
  const outpost = new THREE.Group();
  const canvasColor = zone.id === 'snow' ? 0x8dabb4 : zone.id === 'desert' || zone.id === 'canyon' ? 0xc78d4e : 0x657f55;
  const canvasMaterial = new THREE.MeshStandardMaterial({ color: canvasColor, roughness: 1, flatShading: true });
  const timberMaterial = new THREE.MeshStandardMaterial({ color: 0x59452f, roughness: 1, flatShading: true });
  const crateMaterial = new THREE.MeshStandardMaterial({ color: 0xa67b48, roughness: 1, flatShading: true });
  const tent = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 4.5), canvasMaterial);
  tent.position.set(0, 1.4, 0);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.8, 4), canvasMaterial);
  roof.position.set(0, 3.65, 0);
  roof.rotation.y = Math.PI / 4;
  const tentDoor = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x26302d, roughness: 1 })
  );
  tentDoor.position.set(0, 1, 2.3);
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.18, 1.4), timberMaterial);
  tableTop.position.set(5, 1, 1.5);
  const tableLegs = [-1, 1].flatMap((x) => [-0.45, 0.45].map((z) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1, 0.14), timberMaterial);
    leg.position.set(5 + x * 1.2, 0.5, 1.5 + z);
    return leg;
  }));
  const crates = [[-4, 0.6, 2.8], [4, 0.6, -2.7], [5.1, 0.6, -2.7]].map((position) => {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), crateMaterial);
    crate.position.set(...position);
    crate.castShadow = true;
    crate.receiveShadow = true;
    return crate;
  });
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6, 0.18), timberMaterial);
  mast.position.set(-6, 3, -3);
  const bannerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd400,
    emissive: 0x392600,
    roughness: 0.8,
    flatShading: true,
  });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.12), bannerMaterial);
  banner.position.set(-5.1, 5.2, -3);
  const campfireBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.2), darkStone);
  campfireBase.position.set(0, 0.18, 6);
  const fire = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.4, 5),
    new THREE.MeshStandardMaterial({ color: 0xff9b35, emissive: 0x7a2700, flatShading: true })
  );
  fire.position.set(0, 1, 6);
  const fireLight = new THREE.PointLight(0xff9b35, 2.2, 12);
  fireLight.position.set(0, 1.5, 6);
  outpost.add(tent, roof, tentDoor, tableTop, ...tableLegs, ...crates, mast, banner, campfireBase, fire, fireLight);
  outpost.position.copy(outpostPosition);
  outpost.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  scene.add(outpost);
  occluders.push(outpost);
  const distanceToTrail = (x, z) => {
    let minimumDistance = Infinity;
    for (let index = 0; index < trailPoints.length - 1; index++) {
      const start = trailPoints[index];
      const end = trailPoints[index + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const lengthSquared = dx * dx + dz * dz;
      const t = lengthSquared > 0
        ? THREE.MathUtils.clamp(((x - start.x) * dx + (z - start.z) * dz) / lengthSquared, 0, 1)
        : 0;
      minimumDistance = Math.min(minimumDistance, Math.hypot(x - start.x - dx * t, z - start.z - dz * t));
    }
    return minimumDistance;
  };
  const trailMaterial = new THREE.MeshStandardMaterial({
    color: zone.id === 'snow' ? 0xc7d2d4 : zone.id === 'desert' || zone.id === 'canyon' ? 0xd4ad78 : 0x948566,
    roughness: 1,
    flatShading: true,
  });
  for (let pathIndex = 0; pathIndex < trailPoints.length - 1; pathIndex++) {
    const start = trailPoints[pathIndex];
    const end = trailPoints[pathIndex + 1];
    const distance = start.distanceTo(end);
    const stepCount = Math.max(2, Math.floor(distance / 4));
    for (let step = 1; step < stepCount; step++) {
      const t = step / stepCount;
      const x = THREE.MathUtils.lerp(start.x, end.x, t);
      const z = THREE.MathUtils.lerp(start.z, end.z, t);
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.16, 1.25),
        trailMaterial
      );
      stone.position.set(x, terrainHeight(x, z, zone.id, zone.landmark.pos) + 0.08, z);
      stone.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
      stone.castShadow = true;
      stone.receiveShadow = true;
      scene.add(stone);
    }
  }

  const witnessX = lm.pos[0] + 7;
  const witnessZ = lm.pos[1] + 6;
  const witness = new THREE.Group();
  const characterStyle = zone.destination?.character ?? {
    coat: zone.id === 'desert' ? 0x8a4e31 : zone.id === 'snow' ? 0x344b63 : 0x405d70,
    trim: zone.id === 'snow' ? 0xe4e8e4 : 0xff5a3c,
    headwear: 'cap',
    gear: 'radio',
  };
  const witnessCoat = new THREE.MeshStandardMaterial({ color: characterStyle.coat, flatShading: true, roughness: 1 });
  const witnessTrim = new THREE.MeshStandardMaterial({ color: characterStyle.trim, flatShading: true, roughness: 1 });
  const witnessSkin = new THREE.MeshStandardMaterial({ color: 0xb97855, flatShading: true, roughness: 1 });
  const witnessDark = new THREE.MeshStandardMaterial({ color: 0x172027, flatShading: true, roughness: 1 });
  const witnessGear = new THREE.MeshStandardMaterial({ color: characterStyle.trim, flatShading: true, roughness: 0.8 });
  const witnessBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.05, 0.46), witnessCoat);
  witnessBody.position.y = 1.02;
  const witnessScarf = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.18, 0.5), witnessTrim);
  witnessScarf.position.y = 1.48;
  const witnessHead = new THREE.Group();
  const witnessFace = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.62, 0.54), witnessSkin);
  witnessFace.position.y = 1.82;
  const hatGeometry = characterStyle.headwear === 'sunhat'
    ? new THREE.CylinderGeometry(0.52, 0.38, 0.12, 8)
    : characterStyle.headwear === 'chullo'
      ? new THREE.ConeGeometry(0.38, 0.55, 6)
      : characterStyle.headwear === 'turban' || characterStyle.headwear === 'hood'
        ? new THREE.SphereGeometry(0.4, 8, 5)
        : new THREE.CylinderGeometry(0.28, 0.34, 0.18, 6);
  const witnessHat = new THREE.Mesh(hatGeometry, witnessDark);
  witnessHat.position.y = 2.12;
  if (characterStyle.headwear === 'hood' || characterStyle.headwear === 'turban') {
    witnessHat.scale.set(1, 0.82, 1);
  }
  const witnessEyes = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.045, 0.035), witnessDark);
  witnessEyes.position.set(0, 1.86, 0.32);
  const witnessMouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.035), witnessDark);
  witnessMouth.position.set(0, 1.7, 0.32);
  witnessHead.add(witnessFace, witnessHat, witnessEyes, witnessMouth);
  if (characterStyle.headwear === 'sunhat') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 8), witnessGear);
    band.position.y = 2.09;
    witnessHead.add(band);
  } else if (characterStyle.headwear === 'beret') {
    const beret = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.55), witnessGear);
    beret.scale.set(1.15, 0.38, 1);
    beret.position.set(0.08, 2.18, 0);
    witnessHead.add(beret);
  } else if (characterStyle.headwear === 'ranger-hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.09, 8), witnessGear);
    brim.position.y = 2.1;
    witnessHead.add(brim);
  }
  const gear = new THREE.Group();
  if (characterStyle.gear === 'camera') {
    const cameraBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.24), witnessDark);
    cameraBody.position.set(0.48, 1.14, 0.1);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 8), witnessGear);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0.48, 1.14, 0.29);
    gear.add(cameraBody, lens);
  } else if (characterStyle.gear === 'pack') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.25), witnessGear);
    pack.position.set(0, 1.15, -0.32);
    gear.add(pack);
  } else if (characterStyle.gear === 'radio') {
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.18), witnessGear);
    radio.position.set(-0.43, 1.45, 0.12);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 5), witnessDark);
    antenna.position.set(-0.43, 1.82, 0.12);
    gear.add(radio, antenna);
  } else if (characterStyle.gear === 'goggles') {
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.12), witnessGear);
    goggles.position.set(0, 1.88, 0.31);
    gear.add(goggles);
  } else {
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.22), witnessGear);
    prop.position.set(0.48, 1.05, 0.08);
    gear.add(prop);
  }
  const witnessArms = [-0.5, 0.5].map((x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.74, 0.24), witnessCoat);
    arm.position.set(x, 1.02, 0);
    witness.add(arm);
    return arm;
  });
  const witnessLegs = [-0.19, 0.19].map((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 0.28), witnessDark);
    leg.position.set(x, 0.28, 0);
    return leg;
  });
  witness.add(witnessBody, witnessScarf, witnessHead, gear, ...witnessLegs);
  witness.position.set(
    witnessX,
    terrainHeight(witnessX, witnessZ, zone.id, zone.landmark.pos),
    witnessZ
  );
  witness.rotation.y = Math.atan2(-witness.position.x, 10 - witness.position.z);
  witness.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  witness.userData.mouth = witnessMouth;
  witness.userData.talking = false;
  scene.add(witness);

  // Biome-specific trees
  const trunkMat = new THREE.MeshStandardMaterial({ color: zone.trunk });
  const leafMat = new THREE.MeshStandardMaterial({ color: zone.tree, flatShading: true });
  let randomSeed = zone.id.split('').reduce((seed, char) => seed + char.charCodeAt(0), 0) || 1;
  const random = () => {
    randomSeed = (randomSeed * 16807) % 2147483647;
    return (randomSeed - 1) / 2147483646;
  };
  const treePositions = [];
  const evidencePosition = zone.destination?.evidence?.pos;
  for (let i = 0; i < zone.treeCount; i++) {
    const g = new THREE.Group();
    if (zone.id === 'desert') {
      const cactus = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 0.9), leafMat);
      cactus.position.y = 1.6;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.45), leafMat);
      arm.position.set(0.7, 1.8, 0);
      const armTip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.45), leafMat);
      armTip.position.set(1.2, 2.2, 0);
      g.add(cactus, arm, armTip);
    } else {
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.5), trunkMat);
      trunk.position.y = 1;
      g.add(trunk);
      if (zone.id === 'snow' || zone.id === 'mountain') {
        for (let layer = 0; layer < 3; layer++) {
          const width = 3.4 - layer * 0.7;
          const leaves = new THREE.Mesh(new THREE.BoxGeometry(width, 1.25, width), leafMat);
          leaves.position.y = 1.9 + layer * 1.05;
          g.add(leaves);
        }
      } else {
        const leaves = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), leafMat);
        leaves.position.y = 3;
        g.add(leaves);
      }
    }
    g.traverse((object) => {
      if (object.isMesh) object.castShadow = true;
    });
    let x, z, attempts = 0;
    do {
      x = (random() - 0.5) * 210;
      z = (random() - 0.5) * 210;
      attempts++;
    } while (attempts < 60 && (
      Math.hypot(x, z) < 12 ||
      Math.hypot(x - lm.pos[0], z - lm.pos[1]) < 13 ||
      Math.hypot(x - outpostPosition.x, z - outpostPosition.z) < 13 ||
      (cavePosition && Math.hypot(x - cavePosition.x, z - cavePosition.z) < 16) ||
      distanceToTrail(x, z) < 4 ||
      (evidencePosition && Math.hypot(x - evidencePosition[0], z - evidencePosition[1]) < 8) ||
      treePositions.some((position) => Math.hypot(x - position.x, z - position.z) < 7)
    ));
    treePositions.push({ x, z });
    g.position.set(x, terrainHeight(x, z, zone.id, zone.landmark.pos), z);
    scene.add(g);
    occluders.push(g);
    cover.push({
      x,
      z,
      radius: zone.id === 'desert' ? 0.9 : 1,
      height: zone.id === 'desert' ? 3.2 : 4.5,
    });
  }

  // Low-poly rocks add scale and visual detail without obstructing routes.
  const rockMat = new THREE.MeshStandardMaterial({
    color: zone.id === 'snow' ? 0x9aabb6 : zone.id === 'desert' || zone.id === 'canyon' ? 0x9e7950 : 0x66715a,
    flatShading: true,
    roughness: 1,
  });
  for (let i = 0; i < 48; i++) {
    const x = (random() - 0.5) * 220;
    const z = (random() - 0.5) * 220;
    if (
      Math.hypot(x, z) < 9 ||
      Math.hypot(x - lm.pos[0], z - lm.pos[1]) < 12 ||
      Math.hypot(x - outpostPosition.x, z - outpostPosition.z) < 10 ||
      (cavePosition && Math.hypot(x - cavePosition.x, z - cavePosition.z) < 14) ||
      (evidencePosition && Math.hypot(x - evidencePosition[0], z - evidencePosition[1]) < 5) ||
      treePositions.some((position) => Math.hypot(x - position.x, z - position.z) < 4)
    ) continue;
    const size = 0.7 + random() * 1.5;
    const rock = new THREE.Mesh(
      new THREE.BoxGeometry(size * 1.3, size * 0.8, size),
      rockMat
    );
    rock.position.set(x, terrainHeight(x, z, zone.id, zone.landmark.pos) + size * 0.35, z);
    rock.rotation.set(random() * 0.5, random() * Math.PI, random() * 0.35);
    rock.scale.set(1.3, 0.8, 1);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    occluders.push(rock);
    cover.push({ x, z, radius: size * 1.2, height: size * 1.15 });
  }

  // Clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.9 });
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const puff = new THREE.Mesh(new THREE.BoxGeometry(4 + random() * 3, 2, 4), cloudMat);
      puff.position.set((random() - 0.5) * 6, random() * 0.6, (random() - 0.5) * 4);
      c.add(puff);
    }
    c.position.set((random() - 0.5) * 250, 30 + random() * 25, (random() - 0.5) * 250);
    c.userData.driftSpeed = 0.35 + random() * 0.3;
    clouds.push(c);
    scene.add(c);
  }

  const weatherKind = zone.id === 'snow' ? 'snow' : zone.id === 'desert' ? 'dust' : null;
  let weather = null;
  if (weatherKind) {
    const count = weatherKind === 'snow' ? 220 : 100;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < positions.length; i += 3) {
      const x = (random() - 0.5) * 180;
      const z = (random() - 0.5) * 180;
      positions[i] = x;
      positions[i + 1] = terrainHeight(x, z, zone.id, zone.landmark.pos) + 4 + random() * (weatherKind === 'snow' ? 28 : 12);
      positions[i + 2] = z;
    }
    const weatherGeometry = new THREE.BufferGeometry();
    weatherGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const weatherMaterial = new THREE.PointsMaterial({
      color: weatherKind === 'snow' ? 0xc3e2ff : 0xd9a35b,
      size: weatherKind === 'snow' ? 0.3 : 0.2,
      transparent: true,
      opacity: weatherKind === 'snow' ? 0.8 : 0.32,
      depthWrite: false,
    });
    weather = new THREE.Points(weatherGeometry, weatherMaterial);
    weather.name = 'ambient-weather';
    weather.frustumCulled = false;
    scene.add(weather);
  }

  const spawn = new THREE.Vector3(0, terrainHeight(0, 10, zone.id, zone.landmark.pos) + 1.7, 10);
  let elapsed = 0;
  return {
    zone,
    ground,
    water,
    ladder,
    mapTable,
    landmark,
    buildings: siteBuildings.objects,
    cave: cavePosition,
    outpost: outpostPosition,
    evidence: destination?.evidence
      ? {
          position: new THREE.Vector3(
            destination.evidence.pos[0],
            terrainHeight(destination.evidence.pos[0], destination.evidence.pos[1], zone.id, zone.landmark.pos),
            destination.evidence.pos[1]
          ),
          radius: 3.2,
        }
      : null,
    witness,
    colliders,
    occluders,
    cover,
    neighborRoute: zone.neighborRoute,
    spawn,
    getGroundHeight(x, z) {
      return terrainHeight(x, z, zone.id, zone.landmark.pos);
    },
    update(delta) {
      elapsed += delta;
      clouds.forEach((cloud) => {
        cloud.position.x += cloud.userData.driftSpeed * delta;
        if (cloud.position.x > 140) cloud.position.x = -140;
      });
      if (weather) {
        const positions = weather.geometry.attributes.position;
        const values = positions.array;
        const fallSpeed = weatherKind === 'snow' ? 4.5 : 0.35;
        const driftSpeed = weatherKind === 'snow' ? 0.22 : 0.65;
        for (let i = 0; i < values.length; i += 3) {
          values[i] += driftSpeed * delta;
          if (values[i] > 90) values[i] = -90;
          values[i + 1] -= fallSpeed * delta;
          if (values[i + 1] <= terrainHeight(values[i], values[i + 2], zone.id, zone.landmark.pos)) {
            const x = (random() - 0.5) * 180;
            const z = (random() - 0.5) * 180;
            values[i] = x;
            values[i + 1] = terrainHeight(x, z, zone.id, zone.landmark.pos) + (weatherKind === 'snow' ? 30 : 14);
            values[i + 2] = z;
          }
        }
        positions.needsUpdate = true;
      }
      if (water) {
        water.position.y = water.userData.surfaceY + Math.sin(elapsed * 1.3) * 0.08;
        water.material.opacity = 0.68 + Math.sin(elapsed * 0.8) * 0.04;
      }
      witness.position.y = terrainHeight(witness.position.x, witness.position.z, zone.id, zone.landmark.pos) + Math.sin(elapsed * 1.4) * 0.035;
      witnessHead.rotation.y = Math.sin(elapsed * 0.75) * 0.12;
      witnessMouth.scale.y = witness.userData.talking ? 1 + Math.abs(Math.sin(elapsed * 14)) * 4 : 1;
      witnessArms.forEach((arm, index) => {
        arm.rotation.x = Math.sin(elapsed * 1.8 + index * Math.PI) * 0.08;
      });
      animatedParts.forEach(({ ring, beaconLight }) => {
        ring.rotation.z += delta * 0.65;
        beaconLight.intensity = 6 + Math.sin(elapsed * 2.2) * 2;
      });
    },
  };
}
