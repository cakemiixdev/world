import assert from 'node:assert/strict';
import test from 'node:test';
import { DESTINATIONS } from '../destinations.js';

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
