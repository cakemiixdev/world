import * as THREE from 'three';

export const MINIGAMES = Object.freeze([
  Object.freeze({
    id: 'everest-climb',
    name: 'EVEREST: SUMMIT TRAIL',
    description: 'Climb the marked ridge and reach the summit checkpoints.',
    zones: Object.freeze(['snow', 'mountain']),
    color: 0x43d9ff,
    airborne: false,
    reward: 20,
  }),
  Object.freeze({
    id: 'river-swim',
    name: 'RIVER: CURRENT RUN',
    description: 'Swim through the river gates before the clock runs out.',
    zones: Object.freeze(['hub', 'garden']),
    color: 0x4aa3ff,
    airborne: false,
    reward: 15,
  }),
  Object.freeze({
    id: 'elytra-hoops',
    name: 'SKY: GLIDE COURSE',
    description: 'Jump, open your glide, and fly through every sky hoop.',
    zones: Object.freeze(['snow', 'mountain', 'canyon', 'forest', 'desert']),
    color: 0xffd400,
    airborne: true,
    reward: 25,
  }),
]);

const CHECKPOINT_RADIUS = 4.2;

export function getMinigame(id) {
  return MINIGAMES.find((minigame) => minigame.id === id) ?? null;
}

function nameAtLocation(game, zoneId) {
  if (game.id === 'everest-climb' && zoneId === 'mountain') return 'MUTIANYU: RIDGE TRAIL';
  return game.name;
}

export function getAvailableMinigames(zoneId) {
  return MINIGAMES
    .filter((minigame) => minigame.zones.includes(zoneId))
    .map((minigame) => ({ ...minigame, name: nameAtLocation(minigame, zoneId) }));
}

function routeFor(game, world, start) {
  if (game.id === 'river-swim') {
    const water = world.water?.userData;
    if (!water) throw new Error('This location has no river course.');
    const centerZ = (water.minZ + water.maxZ) / 2;
    const direction = start.x < (water.minX + water.maxX) / 2 ? 1 : -1;
    const entryX = direction > 0 ? water.minX + 4 : water.maxX - 4;
    const usableWidth = water.maxX - water.minX - 8;
    return [0.12, 0.38, 0.64, 0.88].map((fraction) => new THREE.Vector3(
      entryX + direction * usableWidth * fraction,
      water.surfaceY + 0.2,
      THREE.MathUtils.clamp(centerZ, water.minZ + 2, water.maxZ - 2)
    ));
  }

  const target = game.id === 'everest-climb'
    ? world.landmark.position
    : world.outpost;
  if (!target) throw new Error('This location has no route for that challenge.');
  const startPoint = new THREE.Vector3(start.x, start.y, start.z);
  const endPoint = target.clone();
  const distance = startPoint.distanceTo(endPoint);
  if (distance < 12) throw new Error('Move to an open area before starting this course.');
  return [0.24, 0.46, 0.68, 0.9, 1].map((fraction, index) => {
    const x = THREE.MathUtils.lerp(startPoint.x, endPoint.x, fraction);
    const z = THREE.MathUtils.lerp(startPoint.z, endPoint.z, fraction);
    const ground = world.getGroundHeight(x, z);
    const altitude = game.airborne ? 5 + Math.sin((index / 4) * Math.PI) * 4 : 2.1;
    return new THREE.Vector3(x, ground + altitude, z);
  });
}

function formatTime(seconds) {
  const totalTenths = Math.floor(seconds * 10);
  const minutes = Math.floor(totalTenths / 600).toString().padStart(2, '0');
  const remainder = ((totalTenths % 600) / 10).toFixed(1).padStart(4, '0');
  return `${minutes}:${remainder}`;
}

export class MinigameManager {
  constructor(scene, progressStore) {
    this.scene = scene;
    this.progressStore = progressStore;
    this.course = null;
    const progress = progressStore.load();
    this.records = progress.minigameRecords;
    this.completedMinigames = progress.completedMinigames;
    this.status = '';
    this.onBestTime = null;
  }

  get isActive() {
    return Boolean(this.course && !this.course.complete);
  }

  get activeGame() {
    return this.course?.game ?? null;
  }

  get availableGames() {
    return this.course ? [] : getAvailableMinigames(this.currentZoneId ?? '');
  }

  get currentStatus() {
    if (!this.course) return this.status;
    const game = this.course.game;
    if (this.course.complete) {
      return `${game.name} COMPLETE · ${formatTime(this.course.elapsed)}${this.course.newRecord ? ' · NEW BEST!' : ''}`;
    }
    const checkpoint = this.course.checkpointIndex + 1;
    return `${game.name} · GATE ${checkpoint}/${this.course.gates.length} · ${formatTime(this.course.elapsed)}`;
  }

  get bestTimes() {
    return { ...this.records };
  }

  setWorld(world) {
    this.stop();
    this.world = world;
    this.currentZoneId = world.zone.id;
  }

  start(id, world, player) {
    const game = getMinigame(id);
    if (!game) throw new RangeError(`Unknown mini-game: ${id}`);
    if (!game.zones.includes(world.zone.id)) throw new Error(`${game.name} is not available in this location.`);
    if (this.isActive) throw new Error('Finish or leave the current course first.');
    this.stop();

    const courseGame = { ...game, name: nameAtLocation(game, world.zone.id) };
    const gates = routeFor(courseGame, world, player.camera.position);
    const material = new THREE.MeshStandardMaterial({
      color: courseGame.color,
      emissive: courseGame.color,
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.2,
    });
    const gateObjects = gates.map((position, index) => {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.13, 6, 16), material);
      ring.rotation.y = index % 2 ? Math.PI / 4 : 0;
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 3.7, 5),
        new THREE.MeshBasicMaterial({ color: courseGame.color, transparent: true, opacity: 0.35 })
      );
      beacon.position.y = 2.1;
      group.add(ring, beacon);
      group.position.copy(position);
      this.scene.add(group);
      return group;
    });
    this.course = {
      game: courseGame,
      gates,
      gateObjects,
      checkpointIndex: 0,
      elapsed: 0,
      complete: false,
      newRecord: false,
      destinationId: world.zone.destinationId ?? world.zone.id,
    };
    this.currentZoneId = world.zone.id;
    this.status = '';
    player.setPathTarget(gates[0], player.camera.position);
    return this.currentStatus;
  }

  update(delta, player) {
    const course = this.course;
    if (!course || course.complete) return null;
    course.elapsed += delta;
    const target = course.gates[course.checkpointIndex];
    const position = player.camera.position;
    const closeEnough = Math.hypot(position.x - target.x, position.z - target.z) <= CHECKPOINT_RADIUS &&
      Math.abs(position.y - target.y) <= 6;
    if (!closeEnough || (course.game.airborne && (!player.gliding || player.onGround))) return null;

    course.gateObjects[course.checkpointIndex].visible = false;
    course.checkpointIndex += 1;
    if (course.checkpointIndex < course.gates.length) {
      player.setPathTarget(course.gates[course.checkpointIndex], position);
      return { type: 'checkpoint', index: course.checkpointIndex };
    }

    course.complete = true;
    const priorBest = this.records[course.game.id];
    course.newRecord = !Number.isFinite(priorBest) || course.elapsed < priorBest;
    const firstCompletion = !this.completedMinigames.has(course.game.id);
    course.reward = firstCompletion ? course.game.reward : 0;
    if (firstCompletion) this.completedMinigames.add(course.game.id);
    if (course.newRecord) {
      this.records[course.game.id] = course.elapsed;
    }
    if (course.newRecord || firstCompletion) {
      const progress = this.progressStore.load();
      this.progressStore.save({
        ...progress,
        minigameRecords: this.records,
        completedMinigames: this.completedMinigames,
        fieldTokens: progress.fieldTokens + course.reward,
      });
      if (course.newRecord) this.onBestTime?.(course.game.id, course.elapsed);
    }
    return {
      type: 'complete',
      elapsed: course.elapsed,
      newRecord: course.newRecord,
      reward: course.reward,
    };
  }

  stop() {
    if (this.course) {
      this.course.gateObjects.forEach((gate) => {
        this.scene.remove(gate);
        gate.traverse((object) => {
          if (!object.isMesh) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        });
      });
    }
    this.course = null;
  }

  dispose() {
    this.stop();
  }
}

export { formatTime as formatMinigameTime };
