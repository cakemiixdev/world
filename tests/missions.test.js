import assert from 'node:assert/strict';
import test from 'node:test';
import { DESTINATIONS } from '../destinations.js';
import * as THREE from 'three';
import { Fieldwork } from '../fieldwork.js';
import { buildWorld, ZONES } from '../world.js';

test('every starter destination defines a named item recovery and return mission', () => {
  assert.ok(DESTINATIONS.length > 0);

  for (const destination of DESTINATIONS) {
    assert.ok(destination.mission, `${destination.id} is missing mission data`);
    assert.ok(destination.evidence, `${destination.id} is missing its world pickup`);
    assert.ok(destination.mission.item, `${destination.id} is missing its requested item`);
    assert.equal(
      destination.mission.item,
      destination.evidence.label,
      `${destination.id} mission item must match its visible pickup`
    );
    assert.ok(destination.mission.landmark, `${destination.id} is missing the item landmark`);
    assert.ok(destination.mission.request, `${destination.id} is missing the contact request`);
    assert.ok(destination.mission.returned, `${destination.id} is missing the return dialogue`);
    assert.ok(
      Number.isInteger(destination.mission.reward) && destination.mission.reward > 0,
      `${destination.id} must award positive field tokens`
    );
    assert.match(destination.objective, /return/i, `${destination.id} objective must explain the return leg`);
  }
});


test('every destination references a configured biome', () => {
  for (const destination of DESTINATIONS) {
    assert.ok(ZONES[destination.zoneId]);
  }
});

test('ocean expeditions build a traversable pickup route and supported item', () => {
  const oceanDestinations = DESTINATIONS.filter((destination) => destination.zoneId === 'ocean');
  assert.equal(oceanDestinations.length, 2);

  for (const destination of oceanDestinations) {
    const scene = new THREE.Scene();
    const world = buildWorld(scene, destination.zoneId, destination);
    assert.ok(world.water);
    assert.equal(world.water.userData.surfaceY, 0);
    assert.ok(world.spawn.y < world.water.userData.surfaceY);
    assert.ok(world.spawn.y > world.water.userData.surfaceY - 20);
    assert.ok(world.evidence);
    assert.ok(world.landmark.children.length > 1);

    const directionX = world.witness.position.x - world.spawn.x;
    const directionZ = world.witness.position.z - world.spawn.z;
    const offsetX = destination.evidence.pos[0] - world.spawn.x;
    const offsetZ = destination.evidence.pos[1] - world.spawn.z;
    const lengthSquared = directionX ** 2 + directionZ ** 2;
    const progress = Math.max(0, Math.min(1, (offsetX * directionX + offsetZ * directionZ) / lengthSquared));
    const pathX = world.spawn.x + directionX * progress;
    const pathZ = world.spawn.z + directionZ * progress;
    assert.ok(Math.hypot(destination.evidence.pos[0] - pathX, destination.evidence.pos[1] - pathZ) <= 2.4);

    const fieldwork = new Fieldwork(scene, {});
    fieldwork.setWorld(world);
    assert.equal(fieldwork.marker.userData.itemName, destination.mission.item);
  }
});
