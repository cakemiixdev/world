import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getAvailableMinigames, MinigameManager } from '../minigames.js';
import { ProgressStore } from '../progress.js';
import { buildWorld } from '../world.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function createPlayer(position = new THREE.Vector3(0, 1.7, 10)) {
  return {
    camera: { position },
    gliding: false,
    onGround: true,
    setPathTarget(target) {
      this.pathTarget = target.clone();
    },
  };
}

test('offers each field trial only at its intended locations', () => {
  assert.deepEqual(getAvailableMinigames('snow').map((game) => game.id), [
    'everest-climb',
    'elytra-hoops',
  ]);
  assert.deepEqual(getAvailableMinigames('hub').map((game) => game.id), ['river-swim']);
  assert.deepEqual(getAvailableMinigames('city'), []);
});

test('river course advances gates and saves a personal best', () => {
  const progressStore = new ProgressStore(createStorage());
  const scene = new THREE.Scene();
  const manager = new MinigameManager(scene, progressStore);
  const player = createPlayer();
  const world = {
    zone: { id: 'hub', destinationId: 'hub' },
    water: { userData: { minX: -65, maxX: -5, minZ: -5, maxZ: 55, surfaceY: 1 } },
  };
  manager.setWorld(world);
  manager.start('river-swim', world, player);
  assert.equal(manager.course.gates.length, 4);

  let event;
  for (const gate of manager.course.gates) {
    player.camera.position.copy(gate);
    event = manager.update(1, player);
  }

  assert.equal(event.type, 'complete');
  assert.equal(event.elapsed, 4);
  assert.equal(event.newRecord, true);
  assert.equal(event.reward, 15);
  assert.equal(progressStore.load().minigameRecords['river-swim'], 4);
  assert.equal(progressStore.load().fieldTokens, 15);
  assert.deepEqual([...progressStore.load().completedMinigames], ['river-swim']);

  manager.start('river-swim', world, player);
  for (const gate of manager.course.gates) {
    player.camera.position.copy(gate);
    event = manager.update(1, player);
  }
  assert.equal(event.reward, 0);
  assert.equal(progressStore.load().fieldTokens, 15);
  manager.dispose();
});

test('glide course requires the player to be airborne and gliding at each gate', () => {
  const scene = new THREE.Scene();
  const manager = new MinigameManager(scene, new ProgressStore(createStorage()));
  const player = createPlayer();
  const world = {
    zone: { id: 'snow', destinationId: 'everest' },
    landmark: { position: new THREE.Vector3(-20, 10, -20) },
    outpost: new THREE.Vector3(40, 0, 40),
    getGroundHeight: () => 0,
  };
  manager.setWorld(world);
  manager.start('elytra-hoops', world, player);

  player.camera.position.copy(manager.course.gates[0]);
  assert.equal(manager.update(1, player), null);
  assert.equal(manager.course.checkpointIndex, 0);

  player.gliding = true;
  player.onGround = false;
  assert.equal(manager.update(1, player).type, 'checkpoint');
  assert.equal(manager.course.checkpointIndex, 1);
  manager.dispose();
});

test('Everest and glide courses finish with their one-time rewards', () => {
  const progressStore = new ProgressStore(createStorage());
  const world = {
    zone: { id: 'snow', destinationId: 'everest' },
    landmark: { position: new THREE.Vector3(-20, 10, -20) },
    outpost: new THREE.Vector3(40, 0, 40),
    getGroundHeight: () => 0,
  };
  const player = createPlayer();
  const scene = new THREE.Scene();
  const manager = new MinigameManager(scene, progressStore);
  manager.setWorld(world);

  manager.start('everest-climb', world, player);
  let event;
  for (const gate of manager.course.gates) {
    player.camera.position.copy(gate);
    event = manager.update(0.9, player);
  }
  assert.equal(event.reward, 20);

  manager.start('elytra-hoops', world, player);
  player.gliding = true;
  player.onGround = false;
  for (const gate of manager.course.gates) {
    player.camera.position.copy(gate);
    event = manager.update(0.9, player);
  }
  assert.equal(event.reward, 25);
  assert.equal(progressStore.load().fieldTokens, 45);
  manager.dispose();
});

test('rejects a course that does not match the current location', () => {
  const manager = new MinigameManager(new THREE.Scene(), new ProgressStore(createStorage()));
  const world = { zone: { id: 'city' } };
  manager.setWorld(world);
  assert.throws(() => manager.start('river-swim', world, createPlayer()), /not available/);
  manager.dispose();
});

test('places Beacon Island water above the terrain for swimming', () => {
  const scene = new THREE.Scene();
  const world = buildWorld(scene, 'hub');

  assert.ok(world.water);
  assert.ok(world.water.userData.surfaceY > world.getGroundHeight(-35, 25));

  scene.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
});
