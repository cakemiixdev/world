import assert from 'node:assert/strict';
import test from 'node:test';
import { GamepadInput } from '../gamepad.js';

function makeGamepad({ connected = true, axes = [], buttons = [], index = 0 } = {}) {
  return {
    connected,
    id: 'Test Controller',
    index,
    axes,
    buttons: Array.from({ length: 16 }, (_, buttonIndex) => ({
      pressed: Boolean(buttons[buttonIndex]),
      value: buttons[buttonIndex] ? 1 : 0,
    })),
  };
}

test('reads sticks with a dead zone and emits a button edge only once per press', () => {
  let gamepad = makeGamepad({
    axes: [0.09, -0.59, -0.59, 0.09],
    buttons: { 0: true, 1: true },
  });
  const input = new GamepadInput(() => [gamepad]);

  const first = input.poll();
  assert.equal(first.connected, true);
  assert.equal(first.id, 'Test Controller');
  assert.equal(first.mapping, 'generic');
  assert.equal(first.moveX, 0);
  assert.ok(Math.abs(first.moveY + 0.5) < 0.0001);
  assert.ok(Math.abs(first.lookX + 0.5) < 0.0001);
  assert.equal(first.pressed.jump, true);
  assert.equal(first.pressed.interact, true);

  const held = input.poll();
  assert.equal(held.pressed.jump, false);
  assert.equal(held.held.jump, true);

  gamepad = makeGamepad({ axes: [0, 0, 0, 0] });
  input.poll();
  gamepad = makeGamepad({ buttons: { 0: true } });
  assert.equal(input.poll().pressed.jump, true);
});

test('reports disconnection and resets held inputs', () => {
  let gamepad = makeGamepad({ buttons: { 9: true } });
  const input = new GamepadInput(() => [gamepad]);
  assert.equal(input.poll().held.pause, true);

  gamepad = makeGamepad({ connected: false });
  const disconnected = input.poll();
  assert.equal(disconnected.connected, false);
  assert.deepEqual(disconnected.held, {});

  gamepad = makeGamepad({ buttons: { 9: true } });
  assert.equal(input.poll().pressed.pause, true);
});
test('exposes horizontal D-pad edges for controller-driven menus', () => {
  const input = new GamepadInput(() => [makeGamepad({ buttons: { 14: true, 15: true } })]);
  const state = input.poll();
  assert.equal(state.held.dpadLeft, true);
  assert.equal(state.held.dpadRight, true);
  assert.equal(state.pressed.dpadLeft, true);
  assert.equal(state.pressed.dpadRight, true);
});
