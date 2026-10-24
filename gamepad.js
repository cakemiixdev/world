const AXIS_DEADZONE = 0.18;
const BUTTON_THRESHOLD = 0.55;

function readAxis(value) {
  if (!Number.isFinite(value)) return 0;
  const magnitude = Math.abs(value);
  if (magnitude <= AXIS_DEADZONE) return 0;
  return Math.sign(value) * (magnitude - AXIS_DEADZONE) / (1 - AXIS_DEADZONE);
}

function isPressed(button) {
  return Boolean(button && (
    typeof button === 'number'
      ? button >= BUTTON_THRESHOLD
      : button.pressed || button.value >= BUTTON_THRESHOLD
  ));
}

export class GamepadInput {
  constructor(gamepadProvider = () => globalThis.navigator?.getGamepads?.() ?? []) {
    this.gamepadProvider = gamepadProvider;
    this.previousButtons = new Map();
    this.connectedIndex = null;
  }

  poll() {
    const gamepads = this.gamepadProvider();
    let gamepad = this.connectedIndex === null ? null : gamepads?.[this.connectedIndex];
    if (!gamepad?.connected) {
      gamepad = Array.from(gamepads ?? []).find((candidate) => candidate?.connected) ?? null;
      if (gamepad?.index !== this.connectedIndex) this.previousButtons.clear();
      this.connectedIndex = gamepad?.index ?? null;
    }

    if (!gamepad) {
      this.connectedIndex = null;
      const connectedIndexes = new Set(
        Array.from(gamepads ?? []).filter((candidate) => candidate?.connected).map((candidate) => candidate.index)
      );
      for (const key of this.previousButtons.keys()) {
        const index = Number(key.split(':', 1)[0]);
        if (!connectedIndexes.has(index)) this.previousButtons.delete(key);
      }
      return {
        connected: false,
        id: '',
        mapping: '',
        moveX: 0,
        moveY: 0,
        lookX: 0,
        lookY: 0,
        pressed: {},
        held: {},
      };
    }

    const button = (index) => isPressed(gamepad.buttons[index]);
    const held = {
      jump: button(0),
      interact: button(1),
      decoy: button(2),
      glide: button(3),
      crouch: button(4),
      sprint: button(5),
      flashlight: button(6),
      spyglass: button(7),
      map: button(8),
      pause: button(9),
      compassLeft: button(14),
      compassRight: button(15),
      dpadUp: button(12),
      dpadDown: button(13),
      dpadLeft: button(14),
      dpadRight: button(15),
    };
    const pressed = {};
    for (const [name, down] of Object.entries(held)) {
      const key = `${gamepad.index}:${name}`;
      pressed[name] = down && !this.previousButtons.get(key);
      this.previousButtons.set(key, down);
    }
    for (const key of this.previousButtons.keys()) {
      if (!key.startsWith(`${gamepad.index}:`)) this.previousButtons.delete(key);
    }

    return {
      connected: true,
      id: gamepad.id || 'GAMEPAD',
      mapping: gamepad.mapping || 'generic',
      moveX: readAxis(gamepad.axes[0]),
      moveY: readAxis(gamepad.axes[1]),
      lookX: readAxis(gamepad.axes[2]),
      lookY: readAxis(gamepad.axes[3]),
      pressed,
      held,
    };
  }

  reset() {
    this.previousButtons.clear();
  }
}
