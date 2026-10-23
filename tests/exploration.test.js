import assert from 'node:assert/strict';
import test from 'node:test';
import { ExplorerJournal, LANDMARK_INTERACTION_RADIUS } from '../exploration.js';

const zone = {
  id: 'desert',
  landmark: {
    pos: [20, 0],
    label: 'THE GREAT PYRAMID',
  },
};

test('points toward the active landmark using the camera direction', () => {
  const journal = new ExplorerJournal();
  const ahead = journal.update(
    zone,
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: -1 },
    1 / 60
  );
  assert.equal(ahead.direction, 'RIGHT');
  assert.equal(ahead.distance, 20);
});

test('discovers each zone landmark by interaction and expires the discovery toast', () => {
  const journal = new ExplorerJournal();
  const position = { x: 12, y: 0, z: 0 };
  const forward = { x: 1, y: 0, z: 0 };

  const nearby = journal.update(zone, position, forward, 1 / 60);
  assert.equal(nearby.nearby, true);
  assert.equal(nearby.discovered, false);
  assert.equal(journal.discover(zone), true);
  const discovery = journal.update(zone, position, forward, 1 / 60);
  assert.equal(discovery.discovered, true);
  assert.equal(discovery.discoveredCount, 1);
  assert.equal(discovery.toast, 'THE GREAT PYRAMID');

  const repeated = journal.update(zone, position, forward, 1 / 60);
  assert.equal(journal.discover(zone), false);
  assert.equal(repeated.discovered, true);
  assert.equal(repeated.discoveredCount, 1);

  const expired = journal.update(zone, position, forward, 5);
  assert.equal(expired.toast, '');
});

test('keeps landmarks out of reach until the player gets close', () => {
  const journal = new ExplorerJournal();
  const status = journal.update(
    zone,
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    1 / 60
  );
  assert.equal(status.nearby, false);
  assert.equal(status.discovered, false);
  assert.equal(status.discoveredCount, 0);
});

test('uses the shared landmark interaction distance', () => {
  assert.equal(LANDMARK_INTERACTION_RADIUS, 10);
});
