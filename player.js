// player.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { LANDMARK_INTERACTION_RADIUS } from './exploration.js';

const DOWN = new THREE.Vector3(0, -1, 0);
const EYE = 1.7;
const WALK_SPEED = 6;
const SPRINT_SPEED = 9.5;
const GLIDE_SPEED = 14;
const PATH_HALF_WIDTH = 2.4;

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.fallbackLookActive = false;
    this.controlsActive = false;
    this.fallbackYaw = camera.rotation.y;
    this.fallbackPitch = camera.rotation.x;
    camera.rotation.order = 'YXZ';
    this.velocity = new THREE.Vector3();
    this.keys = {};
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 4;

    this.onGround = false;
    this.climbing = false;
    this.gliding = false;
    this.inWater = false;
    this.nearLandmark = false;
    this.nearContact = false;
    this.nearEvidence = false;
    this.nearLadder = null;
    this.nearMap = false;
    this.wantsGlide = false;
    this.crouching = false;
    this.sprinting = false;
    this.noiseRadius = 0;
    this.jumpNoiseTime = 0;
    this.decoyNoise = null;
    this.decoyCooldown = 0;
    this.decoyId = 0;
    this.gamepadMoveX = 0;
    this.gamepadMoveY = 0;
    this.gamepadLookX = 0;
    this.gamepadLookY = 0;
    this.gamepadSprint = false;
    this.gamepadCrouch = false;

    document.addEventListener('keydown', (e) => {
      if (!this.controlsActive) return;
      this.keys[e.code] = true;
      if (e.code === 'Space' && !e.repeat) {
        this._jump();
        if (this.wantsGlide && !this.onGround && !this.inWater) {
          this.gliding = true;
          this.wantsGlide = false;
        }
      }
      if (e.code === 'KeyF' && !e.repeat) {
        if (this.gliding) {
          this.gliding = false;
          this.wantsGlide = false;
        } else if (!this.inWater && !this.climbing) {
          if (this.onGround) this.wantsGlide = !this.wantsGlide;
          else this.gliding = true;
        }
      }
      if (e.code === 'KeyQ' && !e.repeat) this.throwDecoy();
      if (e.code === 'KeyE' && !e.repeat && this.nearLadder) {
        this.climbing = !this.climbing;
        if (this.climbing) {
          this.gliding = false;
          this.wantsGlide = false;
          this.velocity.set(0, 0, 0);
        }
      }
      if (e.code === 'KeyE' && !e.repeat && (this.nearEvidence || this.nearContact) && !this.nearLadder) {
        this.interact?.();
      }
    });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => this.clearInput());
    this.controls.addEventListener('unlock', () => this.clearInput());
    this.controls.addEventListener('lock', () => {
      this.fallbackLookActive = false;
    });
    document.addEventListener('mousemove', (event) => {
      if (!this.fallbackLookActive || this.controls.isLocked) return;
      this.fallbackYaw -= event.movementX * 0.002;
      this.fallbackPitch = THREE.MathUtils.clamp(
        this.fallbackPitch - event.movementY * 0.002,
        -Math.PI / 2 + 0.02,
        Math.PI / 2 - 0.02
      );
      this.camera.rotation.set(this.fallbackPitch, this.fallbackYaw, 0);
    });
    domElement.addEventListener('click', () => this.startLooking());
  }

  get isLooking() {
    return Boolean(this.controls.isLocked || this.fallbackLookActive);
  }

  startLooking() {
    this.controlsActive = true;
    if (this.controls.isLocked) return;
    this.fallbackYaw = this.camera.rotation.y;
    this.fallbackPitch = this.camera.rotation.x;
    this.fallbackLookActive = true;
    try {
      this.controls.lock();
    } catch (error) {
      console.warn('Pointer lock is unavailable; using drag-to-look controls.', error);
    }
  }

  stopLooking() {
    this.controlsActive = false;
    this.fallbackLookActive = false;
    this.clearInput();
    if (this.controls.isLocked) document.exitPointerLock();
  }

  clearInput() {
    this.keys = {};
    this.gamepadMoveX = 0;
    this.gamepadMoveY = 0;
    this.gamepadLookX = 0;
    this.gamepadLookY = 0;
    this.gamepadSprint = false;
    this.gamepadCrouch = false;
  }

  setGamepadState(state) {
    this.gamepadMoveX = state.connected ? state.moveX : 0;
    this.gamepadMoveY = state.connected ? state.moveY : 0;
    this.gamepadLookX = state.connected ? state.lookX : 0;
    this.gamepadLookY = state.connected ? state.lookY : 0;
    this.gamepadSprint = Boolean(state.connected && state.held.sprint);
    this.gamepadCrouch = Boolean(state.connected && state.held.crouch);
  }

  throwDecoy() {
    if (this.decoyCooldown > 0 || this.inWater || this.climbing) return false;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) return false;
    forward.normalize();
    const distance = 16;
    const x = THREE.MathUtils.clamp(this.camera.position.x + forward.x * distance, -72, 72);
    const z = THREE.MathUtils.clamp(this.camera.position.z + forward.z * distance, -72, 72);
    this.decoyNoise = {
      id: ++this.decoyId,
      x,
      z,
      radius: 48,
    };
    this.decoyCooldown = 2.5;
    return true;
  }

  _jump() {
    if (this.inWater) {
      this.velocity.y += 4;
    } else if (this.onGround && !this.climbing) {
      this.velocity.y = 9;
      this.onGround = false;
      this.jumpNoiseTime = 1.1;
      if (this.wantsGlide) {
        this.gliding = true;
        this.wantsGlide = false;
      } else {
        this.gliding = false;
      }
    }
  }

  setWorld(world) {
    this.world = world;
    this.camera.position.copy(world.spawn);
    this.velocity.set(0, 0, 0);
    this.climbing = false;
    this.gliding = false;
    this.wantsGlide = false;
    this.inWater = false;
    this.onGround = false;
    this.nearLandmark = false;
    this.nearContact = false;
    this.nearEvidence = false;
    this.nearLadder = null;
    this.nearMap = false;
    this.crouching = false;
    this.sprinting = false;
    this.noiseRadius = 0;
    this.jumpNoiseTime = 0;
    this.decoyNoise = null;
    this.decoyCooldown = 0;
    this.clearInput();
    const firstTarget = world.witness?.position ?? world.landmark.position;
    this.setPathTarget(firstTarget);
    this.camera.rotation.set(
      0,
      Math.atan2(-this.pathDirection.x, -this.pathDirection.y),
      0
    );
    this.fallbackYaw = this.camera.rotation.y;
    this.fallbackPitch = 0;
  }

  setPathTarget(targetPosition, originPosition = this.camera.position) {
    const cp = originPosition;
    this.pathStart = new THREE.Vector2(cp.x, cp.z);
    const target = new THREE.Vector2(targetPosition.x, targetPosition.z);
    const direction = target.sub(this.pathStart);
    this.pathLength = Math.max(direction.length() + 3, 1);
    this.pathDirection = direction.normalize();
    this.pathSide = new THREE.Vector2(-this.pathDirection.y, this.pathDirection.x);
  }

  update(delta) {
    const world = this.world;
    if (!world) return;

    if (this.controlsActive && (this.gamepadLookX !== 0 || this.gamepadLookY !== 0)) {
      this.fallbackYaw = this.camera.rotation.y - this.gamepadLookX * 2.8 * delta;
      this.fallbackPitch = THREE.MathUtils.clamp(
        this.camera.rotation.x - this.gamepadLookY * 2.2 * delta,
        -Math.PI / 2 + 0.02,
        Math.PI / 2 - 0.02
      );
      this.camera.rotation.set(this.fallbackPitch, this.fallbackYaw, 0);
    }

    const cp = this.camera.position;
    const water = world.water?.userData;
    const surfaceY = water?.surfaceY;
    this.inWater = Boolean(
      water &&
      cp.x >= water.minX && cp.x <= water.maxX &&
      cp.z >= water.minZ && cp.z <= water.maxZ &&
      cp.y < surfaceY + EYE && cp.y > surfaceY - 20
    );

    const wasCrouching = this.crouching;
    this.crouching = Boolean(
      (this.keys['KeyC'] || this.gamepadCrouch) && this.onGround && !this.inWater && !this.climbing
    );
    if (wasCrouching !== this.crouching) {
      this.camera.position.y += this.crouching ? -0.65 : 0.65;
    }
    const eyeHeight = this.crouching ? EYE - 0.65 : EYE;

    // Proximity detection
    this.nearLadder = null;
    if (world.ladder) {
      const lp = world.ladder.position, cp = this.camera.position;
      if (Math.abs(cp.x - lp.x) < 1.6 && Math.abs(cp.z - lp.z) < 1.6 && cp.y < 8.2) this.nearLadder = world.ladder;
      else if (this.climbing) this.climbing = false;
    }
    this.nearMap = false;
    if (world.mapTable) {
      if (this.camera.position.distanceTo(world.mapTable.position) < 5 && this.camera.position.y > 6) this.nearMap = true;
    }
    this.nearContact = Boolean(world.witness) &&
      Math.hypot(cp.x - world.witness.position.x, cp.z - world.witness.position.z) < 4.5;

    // Direction from camera
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const dir = new THREE.Vector3();
    if (this.keys['KeyW']) {
      dir.x += this.pathDirection.x;
      dir.z += this.pathDirection.y;
    }
    if (this.keys['KeyS']) {
      dir.x -= this.pathDirection.x;
      dir.z -= this.pathDirection.y;
    }
    if (this.keys['KeyD']) {
      dir.x += this.pathSide.x;
      dir.z += this.pathSide.y;
    }
    if (this.keys['KeyA']) {
      dir.x -= this.pathSide.x;
      dir.z -= this.pathSide.y;
    }
    dir.x += this.pathDirection.x * -this.gamepadMoveY + this.pathSide.x * this.gamepadMoveX;
    dir.z += this.pathDirection.y * -this.gamepadMoveY + this.pathSide.y * this.gamepadMoveX;
    if (dir.lengthSq() > 0) dir.normalize();

    this.sprinting = Boolean(
      this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.gamepadSprint
    ) && this.onGround && !this.crouching && !this.inWater && !this.climbing && dir.lengthSq() > 0;
    this.jumpNoiseTime = Math.max(0, this.jumpNoiseTime - delta);
    this.decoyCooldown = Math.max(0, this.decoyCooldown - delta);
    this.noiseRadius = this.sprinting ? 25 : this.jumpNoiseTime > 0 ? 17 : 0;

    if (this.climbing && this.nearLadder) {
      this.velocity.x = 0; this.velocity.z = 0;
      this.velocity.y = this.keys['KeyW'] || this.gamepadMoveY < -0.2
        ? 4
        : this.keys['KeyS'] || this.gamepadMoveY > 0.2
          ? -4
          : 0;
      this.gliding = false;
    } else if (this.inWater) {
      this.gliding = false;
      this.velocity.x += dir.x * 24 * delta;
      this.velocity.z += dir.z * 24 * delta;
      this.velocity.x *= Math.pow(0.9, delta * 60);
      this.velocity.z *= Math.pow(0.9, delta * 60);
      const targetY = surfaceY + EYE - 0.15;
      this.velocity.y += (targetY - this.camera.position.y) * 4 * delta;
      this.velocity.y *= Math.pow(0.88, delta * 60);
      if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.velocity.y -= 6 * delta;
      if (this.keys['Space']) this.velocity.y += 6 * delta;
    } else {
      const accel = this.sprinting ? 90 : this.onGround ? 60 : 20;
      this.velocity.x += dir.x * accel * delta;
      this.velocity.z += dir.z * accel * delta;
      const fr = this.sprinting ? 0.88 : this.onGround ? 0.82 : 0.94;
      this.velocity.x *= Math.pow(fr, delta * 60);
      this.velocity.z *= Math.pow(fr, delta * 60);

      if (this.gliding && !this.onGround) {
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
          this.velocity.y = Math.max(this.velocity.y - 18 * delta, -18);
        } else {
          this.velocity.y = Math.max(this.velocity.y - 2.5 * delta, -4);
        }
        if (this.keys['Space']) this.velocity.y += 5 * delta;
        this.velocity.x += forward.x * 12 * delta;
        this.velocity.z += forward.z * 12 * delta;
        const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        if (horizontalSpeed > GLIDE_SPEED) {
          const scale = GLIDE_SPEED / horizontalSpeed;
          this.velocity.x *= scale;
          this.velocity.z *= scale;
        }
      } else {
        this.velocity.y = Math.max(this.velocity.y - 24 * delta, -24);
        const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        const maxSpeed = this.sprinting ? SPRINT_SPEED : this.crouching ? 2.4 : WALK_SPEED;
        if (horizontalSpeed > maxSpeed) {
          const scale = maxSpeed / horizontalSpeed;
          this.velocity.x *= scale;
          this.velocity.z *= scale;
        }
      }
    }

    this.camera.position.addScaledVector(this.velocity, delta);
    const relative = new THREE.Vector2(
      this.camera.position.x - this.pathStart.x,
      this.camera.position.z - this.pathStart.y
    );
    const along = THREE.MathUtils.clamp(relative.dot(this.pathDirection), 0, this.pathLength);
    const across = THREE.MathUtils.clamp(relative.dot(this.pathSide), -PATH_HALF_WIDTH, PATH_HALF_WIDTH);
    const constrained = this.pathStart
      .clone()
      .addScaledVector(this.pathDirection, along)
      .addScaledVector(this.pathSide, across);
    if (Math.abs(constrained.x - this.camera.position.x) > 0.001) this.velocity.x = 0;
    if (Math.abs(constrained.y - this.camera.position.z) > 0.001) this.velocity.z = 0;
    this.camera.position.x = constrained.x;
    this.camera.position.z = constrained.y;

    const feetY = this.camera.position.y - eyeHeight;
    for (const obstacle of world.cover) {
      if (feetY >= world.getGroundHeight(obstacle.x, obstacle.z) + obstacle.height) continue;
      let dx = this.camera.position.x - obstacle.x;
      let dz = this.camera.position.z - obstacle.z;
      const distance = Math.hypot(dx, dz);
      const minimumDistance = obstacle.radius + 0.38;
      if (distance >= minimumDistance) continue;
      if (distance < 0.001) {
        dx = 1;
        dz = 0;
      }
      const safeDistance = Math.max(distance, 0.001);
      this.camera.position.x = obstacle.x + dx / safeDistance * minimumDistance;
      this.camera.position.z = obstacle.z + dz / safeDistance * minimumDistance;
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Ground / platform snapping
    this.raycaster.set(this.camera.position, DOWN);
    const hits = this.raycaster.intersectObjects(world.colliders, false);
    this.onGround = false;
    if (!this.inWater && this.velocity.y <= 0.01) {
      const platformHit = hits.find((hit) => hit.object !== world.ground && hit.distance <= eyeHeight + 0.2);
      const terrainFloor = world.getGroundHeight(this.camera.position.x, this.camera.position.z) + eyeHeight;
      if (platformHit) {
        this.camera.position.y = platformHit.point.y + eyeHeight;
        this.velocity.y = 0;
        this.onGround = true;
      } else if (this.camera.position.y <= terrainFloor + 0.25) {
        this.camera.position.y = terrainFloor;
        this.velocity.y = 0;
        this.onGround = true;
      }
      if (this.onGround) {
        this.gliding = false;
      }
    }

    this.nearLandmark = Boolean(world.landmark) && Math.hypot(
      this.camera.position.x - world.landmark.position.x,
      this.camera.position.z - world.landmark.position.z
    ) < LANDMARK_INTERACTION_RADIUS;
    this.nearEvidence = Boolean(world.evidence) && Math.hypot(
      this.camera.position.x - world.evidence.position.x,
      this.camera.position.z - world.evidence.position.z
    ) < world.evidence.radius;

    if (this.camera.position.y < -30) this.setWorld(world);
  }
}