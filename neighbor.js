import * as THREE from 'three';

const PATROL_SPEED = 2.2;
const INVESTIGATE_SPEED = 3.1;
const CHASE_SPEED = 4.4;
const VISION_RANGE = 34;
const CROUCH_VISION_RANGE = 16;
const VISION_HALF_ANGLE = Math.PI / 3.2;
const DETECTION_TIME = 1.35;
const BRAIN_INTERVAL = 0.12;

export class Neighbor {
  constructor(scene, world) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.direction = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.lastKnownPosition = new THREE.Vector3();
    this.setWorld(world);
  }

  _createCharacter() {
    const character = new THREE.Group();
    const coat = new THREE.MeshStandardMaterial({ color: 0x29364a, flatShading: true, roughness: 1 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xff5a3c, flatShading: true, roughness: 1 });
    const face = new THREE.MeshStandardMaterial({ color: 0xd8a47c, flatShading: true, roughness: 1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x111820, flatShading: true, roughness: 1 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.48), coat);
    torso.position.y = 1.25;
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.2, 0.54), trim);
    collar.position.set(0, 1.78, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.58), face);
    head.position.y = 2.08;
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.2, 0.75), dark);
    hat.position.y = 2.48;
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.05), dark);
    leftEye.position.set(-0.15, 2.13, 0.31);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.15;
    const legs = [];
    for (const x of [-0.24, 0.24]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.64, 0.28), dark);
      leg.position.set(x, 0.42, 0);
      legs.push(leg);
    }
    const arms = [];
    for (const x of [-0.54, 0.54]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.76, 0.28), coat);
      arm.position.set(x, 1.24, 0);
      arms.push(arm);
    }
    character.add(torso, collar, head, hat, leftEye, rightEye, ...legs, ...arms);
    character.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    this.legs = legs;
    this.arms = arms;
    return character;
  }

  setWorld(world) {
    this._removeDecoyEffects();
    if (this.character) {
      this.scene.remove(this.character);
      this.character.traverse((object) => {
        if (!object.isMesh) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
    }

    this.world = world;
    this.route = world.neighborRoute;
    this.routeIndex = 0;
    this.state = 'patrol';
    this.alert = 0;
    this.thinkTimer = 0;
    this.lostSightTime = 0;
    this.searchTime = 0;
    this.bobTime = 0;
    this.caughtNow = false;
    this.lastDecoyId = 0;
    this.character = this._createCharacter();
    this.character.position.set(
      this.route[0][0],
      world.getGroundHeight(this.route[0][0], this.route[0][1]),
      this.route[0][1]
    );
    this.scene.add(this.character);
    this.target.set(this.route[0][0], 0, this.route[0][1]);
    this.lastKnownPosition.copy(this.target);
  }

  _canSee(player, distance) {
    const visionRange = player.crouching ? CROUCH_VISION_RANGE : VISION_RANGE;
    if (distance > visionRange || player.climbing || player.inWater) return false;

    const target = player.camera.position.clone();
    target.y -= player.crouching ? 0.15 : 0.45;
    const origin = this.character.position.clone();
    origin.y += 1.65;
    this.direction.subVectors(target, origin);
    const sightDistance = this.direction.length();
    this.direction.normalize();

    const facing = new THREE.Vector3(
      Math.sin(this.character.rotation.y),
      0,
      Math.cos(this.character.rotation.y)
    );
    const horizontalDirection = new THREE.Vector3(this.direction.x, 0, this.direction.z).normalize();
    const halfAngle = player.crouching ? VISION_HALF_ANGLE * 0.65 : VISION_HALF_ANGLE;
    if (facing.dot(horizontalDirection) < Math.cos(halfAngle)) return false;

    this.raycaster.set(origin, this.direction);
    this.raycaster.far = Math.max(0, sightDistance - 0.6);
    return this.raycaster.intersectObjects(this.world.occluders, true).length === 0;
  }

  _setTarget(x, z) {
    this.target.set(x, 0, z);
  }

  _think(delta, player, distance) {
    const seesPlayer = this._canSee(player, distance);
    const hearsPlayer = player.noiseRadius > 0 && distance <= player.noiseRadius;
    const decoy = player.decoyNoise;
    if (decoy && decoy.id !== this.lastDecoyId) {
      this.lastDecoyId = decoy.id;
      if (Math.hypot(decoy.x - this.character.position.x, decoy.z - this.character.position.z) <= decoy.radius) {
        this.lastKnownPosition.set(decoy.x, 0, decoy.z);
        this._setTarget(decoy.x, decoy.z);
        this.state = 'investigate';
        this.alert = Math.min(this.alert, 0.35);
        this.searchTime = 0;
        this._throwPebble(decoy.x, decoy.z, player.camera.position);
      }
    }

    if (seesPlayer) {
      this.alert = Math.min(1, this.alert + delta / DETECTION_TIME);
      this.lastKnownPosition.set(player.camera.position.x, 0, player.camera.position.z);
      this.lostSightTime = 0;
      if (this.alert >= 1) this.state = 'chase';
    } else {
      this.alert = Math.max(0, this.alert - delta * 0.18);
    }

    if (this.state === 'patrol') {
      if (hearsPlayer) {
        this.state = 'investigate';
        this.lastKnownPosition.set(player.camera.position.x, 0, player.camera.position.z);
        this._setTarget(this.lastKnownPosition.x, this.lastKnownPosition.z);
      } else if (seesPlayer && this.alert > 0.2) {
        this.state = 'investigate';
        this._setTarget(this.lastKnownPosition.x, this.lastKnownPosition.z);
      } else {
        const [x, z] = this.route[this.routeIndex];
        this._setTarget(x, z);
      }
      return;
    }

    if (this.state === 'investigate') {
      if (seesPlayer && this.alert >= 1) {
        this.state = 'chase';
      } else {
        this._setTarget(this.lastKnownPosition.x, this.lastKnownPosition.z);
        if (distanceToPoint(this.character.position, this.target) < 2) {
          this.state = 'search';
          this.searchTime = 3.5;
        }
      }
      return;
    }

    if (this.state === 'chase') {
      if (seesPlayer) {
        this._setTarget(player.camera.position.x, player.camera.position.z);
      } else {
        this.lostSightTime += delta;
        this._setTarget(this.lastKnownPosition.x, this.lastKnownPosition.z);
        if (this.lostSightTime > 2.4) {
          this.state = 'search';
          this.searchTime = 4;
        }
      }
      return;
    }

    if (this.state === 'search') {
      this.searchTime -= delta;
      if (hearsPlayer) {
        this.state = 'investigate';
        this.lastKnownPosition.set(player.camera.position.x, 0, player.camera.position.z);
        this._setTarget(this.lastKnownPosition.x, this.lastKnownPosition.z);
      } else if (this.searchTime <= 0) {
        this.state = 'patrol';
        this.alert = 0;
        this.routeIndex = (this.routeIndex + 1) % this.route.length;
        const [x, z] = this.route[this.routeIndex];
        this._setTarget(x, z);
      }
    }
  }

  _showDecoyMarker(x, z) {
    if (this.decoyMarker) {
      this._disposeMesh(this.decoyMarker);
    }
    this.decoyMarker = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.12, 6, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffd400,
        emissive: 0xff9d00,
        emissiveIntensity: 1.5,
        flatShading: true,
      })
    );
    this.decoyMarker.rotation.x = -Math.PI / 2;
    this.decoyMarker.position.set(x, this.world.getGroundHeight(x, z) + 0.2, z);
    this.decoyMarker.userData.time = 2.5;
    this.scene.add(this.decoyMarker);
  }

  _throwPebble(x, z, origin) {
    if (this.pebble) this._disposeMesh(this.pebble);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffd400,
      emissive: 0x634700,
      flatShading: true,
    });
    this.pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), material);
    this.scene.add(this.pebble);
    this.pebbleFlight = {
      startX: origin.x,
      startY: origin.y - 0.2,
      startZ: origin.z,
      endX: x,
      endY: this.world.getGroundHeight(x, z) + 0.25,
      endZ: z,
      time: 0,
      duration: 0.65,
    };
  }

  _disposeMesh(mesh) {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => material.dispose());
  }

  _updatePebble(delta) {
    if (!this.pebbleFlight || !this.pebble) return;
    const flight = this.pebbleFlight;
    flight.time = Math.min(flight.duration, flight.time + delta);
    const progress = flight.time / flight.duration;
    this.pebble.position.set(
      THREE.MathUtils.lerp(flight.startX, flight.endX, progress),
      THREE.MathUtils.lerp(flight.startY, flight.endY, progress) + Math.sin(progress * Math.PI) * 3.2,
      THREE.MathUtils.lerp(flight.startZ, flight.endZ, progress)
    );
    this.pebble.rotation.x += delta * 9;
    this.pebble.rotation.z += delta * 7;
    if (progress >= 1) {
      this._disposeMesh(this.pebble);
      this.pebble = null;
      this.pebbleFlight = null;
      this._showDecoyMarker(flight.endX, flight.endZ);
    }
  }

  _move(delta, player) {
    const dx = this.target.x - this.character.position.x;
    const dz = this.target.z - this.character.position.z;
    const distance = Math.hypot(dx, dz);
    const targetIsPlayer = this.state === 'chase' && this.lostSightTime === 0;
    const speed = this.state === 'chase'
      ? CHASE_SPEED
      : this.state === 'investigate'
        ? INVESTIGATE_SPEED
        : this.state === 'search'
          ? 0.8
          : PATROL_SPEED;

    if (distance > 0.12) {
      const step = Math.min(distance, speed * delta);
      this.character.position.x += dx / distance * step;
      this.character.position.z += dz / distance * step;
      this.character.rotation.y = Math.atan2(dx, dz);
      this.bobTime += delta * (this.state === 'chase' ? 12 : 7);
      this.legs.forEach((leg, index) => {
        leg.rotation.x = Math.sin(this.bobTime + index * Math.PI) * 0.45;
      });
      this.arms.forEach((arm, index) => {
        arm.rotation.x = Math.sin(this.bobTime + (1 - index) * Math.PI) * 0.35;
      });
    } else if (this.state === 'patrol') {
      this.routeIndex = (this.routeIndex + 1) % this.route.length;
      const [x, z] = this.route[this.routeIndex];
      this._setTarget(x, z);
    }

    if (targetIsPlayer && distance < 1.7) {
      this.caughtNow = true;
      player.setWorld(this.world);
      this.state = 'investigate';
      this.alert = 0;
      this.lostSightTime = 0;
      this._setTarget(this.character.position.x, this.character.position.z);
    }

    const groundY = this.world.getGroundHeight(this.character.position.x, this.character.position.z);
    this.character.position.y = groundY + Math.sin(this.bobTime) * (distance > 0.12 ? 0.04 : 0);
  }

  update(delta, player) {
    this.caughtNow = false;
    this._updatePebble(delta);
    if (this.decoyMarker) {
      this.decoyMarker.userData.time -= delta;
      this.decoyMarker.scale.setScalar(1 + Math.sin(this.decoyMarker.userData.time * 9) * 0.12);
      if (this.decoyMarker.userData.time <= 0) {
        this._disposeMesh(this.decoyMarker);
        this.decoyMarker = null;
      }
    }
    this.thinkTimer -= delta;
    const distance = Math.hypot(
      player.camera.position.x - this.character.position.x,
      player.camera.position.z - this.character.position.z
    );

    if (this.thinkTimer <= 0) {
      const step = Math.min(BRAIN_INTERVAL, delta + BRAIN_INTERVAL);
      this._think(step, player, distance);
      this.thinkTimer = BRAIN_INTERVAL;
    }

    this._move(delta, player);
    return {
      state: this.state,
      alert: this.alert,
      distance: Math.round(distance),
      caughtNow: this.caughtNow,
    };
  }

  _removeDecoyEffects() {
    if (this.pebble) this._disposeMesh(this.pebble);
    if (this.decoyMarker) this._disposeMesh(this.decoyMarker);
    this.pebble = null;
    this.pebbleFlight = null;
    this.decoyMarker = null;
  }
}

function distanceToPoint(position, target) {
  return Math.hypot(position.x - target.x, position.z - target.z);
}
