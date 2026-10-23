import * as THREE from 'three';

export class Fieldwork {
  constructor(scene, player, progressStore = null) {
    this.scene = scene;
    this.player = player;
    this.progressStore = progressStore;
    this.world = null;
    this.destination = null;
    this.marker = null;
    const progress = progressStore?.load();
    this.activeDestinations = progress?.activeDestinations ?? new Set();
    this.retrievedDestinations = progress?.retrievedDestinations ?? new Set();
    this.completedDestinations = progress?.completedDestinations ?? new Set();
    this.fieldTokens = progress?.fieldTokens ?? 0;
  }

  _saveProgress() {
    if (!this.progressStore) return;
    const progress = this.progressStore.load();
    this.progressStore.save({
      activeDestinations: this.activeDestinations,
      retrievedDestinations: this.retrievedDestinations,
      completedDestinations: this.completedDestinations,
      completedMinigames: progress.completedMinigames,
      discoveredDestinations: progress.discoveredDestinations,
      minigameRecords: progress.minigameRecords,
      fieldTokens: this.fieldTokens,
    });
  }

  setWorld(world) {
    this._removeMarker();
    this.world = world;
    this.destination = world.zone.destination ?? null;
    if (!this.destination?.evidence || !this.destination?.mission) {
      throw new Error(`Destination ${world.zone.id} has no mission item configured.`);
    }

    const evidence = this.destination.evidence;
    const marker = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({
      color: 0xffd400,
      emissive: 0xffa500,
      emissiveIntensity: 1.3,
      flatShading: true,
      metalness: 0.35,
      roughness: 0.55,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b252c, flatShading: true, roughness: 1 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x76502f, flatShading: true, roughness: 1 });
    const chest = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.58, 0.72), wood);
    base.position.y = 0.38;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.2, 0.8), dark);
    lid.position.y = 0.77;
    const chestBands = [-0.32, 0.32].map((x) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.83), gold);
      band.position.set(x, 0.47, 0);
      return band;
    });
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.08), gold);
    lock.position.set(0, 0.49, 0.41);
    chest.add(base, lid, ...chestBands, lock);
    let artifact;
    switch (evidence.kind) {
      case 'notebook':
      case 'letter':
      case 'rubbing':
        artifact = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.44), gold);
        artifact.rotation.y = 0.25;
        artifact.position.y = 0.48;
        break;
      case 'thread':
        artifact = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 5, 8), gold);
        artifact.rotation.x = Math.PI / 2;
        artifact.position.y = 0.54;
        break;
      case 'button':
        artifact = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 8), gold);
        artifact.rotation.x = Math.PI / 2;
        artifact.position.y = 0.48;
        break;
      case 'camera-plate':
        artifact = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.36), gold);
        artifact.position.y = 0.48;
        break;
      case 'compass':
        artifact = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.32, 4), gold);
        artifact.rotation.x = Math.PI;
        artifact.position.y = 0.5;
        break;
      case 'anchor':
        artifact = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.1, 5, 7), gold);
        artifact.position.y = 0.58;
        break;
      default:
        throw new RangeError(`Unsupported evidence model: ${evidence.kind}`);
    }
    artifact.position.y = 1.15;
    marker.add(chest, artifact);

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.8, 5, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    beacon.position.y = 1.8;
    marker.add(beacon);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.045, 5, 20),
      new THREE.MeshStandardMaterial({ color: 0xffd400, emissive: 0x765700, emissiveIntensity: 1 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    marker.add(ring);
    marker.position.set(
      evidence.pos[0],
      world.getGroundHeight(evidence.pos[0], evidence.pos[1]),
      evidence.pos[1]
    );
    marker.traverse((object) => {
      if (object.isMesh) object.castShadow = true;
    });
    marker.userData.artifact = artifact;
    marker.userData.ring = ring;
    marker.visible = this.activeDestinations.has(this.destination.id) &&
      !this.retrievedDestinations.has(this.destination.id) &&
      !this.completedDestinations.has(this.destination.id);
    marker.name = this.destination.mission.item;
    marker.userData.itemName = this.destination.mission.item;
    this.marker = marker;
    this.scene.add(marker);
  }

  activate() {
    if (!this.destination) return;
    this.activeDestinations.add(this.destination.id);
    if (this.marker) this.marker.visible = true;
    this._saveProgress();
  }

  get isActive() {
    return Boolean(this.destination && this.activeDestinations.has(this.destination.id));
  }

  get isComplete() {
    return Boolean(this.destination && this.completedDestinations.has(this.destination.id));
  }

  get isReturning() {
    return Boolean(
      this.destination &&
      this.activeDestinations.has(this.destination.id) &&
      this.retrievedDestinations.has(this.destination.id) &&
      !this.completedDestinations.has(this.destination.id)
    );
  }

  get hasItem() {
    return this.isReturning;
  }

  get isNear() {
    return Boolean(this.isActive && !this.isReturning && !this.isComplete && this.player.nearEvidence);
  }

  get canTurnIn() {
    return Boolean(this.isReturning && this.player.nearContact);
  }

  update(delta) {
    if (!this.marker || !this.marker.visible) return;
    const elapsed = this.marker.userData.elapsed ?? 0;
    this.marker.userData.elapsed = elapsed + delta;
    this.marker.userData.artifact.position.y = 1.15 + Math.sin(elapsed * 2.8) * 0.12;
    this.marker.userData.artifact.rotation.y += delta * 0.8;
    this.marker.userData.ring.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.12);
  }

  collect() {
    if (!this.destination || !this.isActive || this.isComplete || !this.player.nearEvidence) return false;
    this.retrievedDestinations.add(this.destination.id);
    if (this.marker) this.marker.visible = false;
    this._saveProgress();
    return true;
  }

  deliver() {
    if (!this.destination || !this.canTurnIn) return false;
    this.completedDestinations.add(this.destination.id);
    this.fieldTokens += this.destination.mission.reward;
    this._removeMarker();
    this._saveProgress();
    return this.destination.mission.reward;
  }

  get objective() {
    if (!this.destination) return 'Select a destination from the field board.';
    if (this.isComplete) {
      return `MISSION COMPLETE · ${this.destination.mission.item} returned · +${this.destination.mission.reward} TOKENS`;
    }
    if (this.isReturning) {
      return `RETURN ${this.destination.mission.item} TO ${this.destination.contact.split(' · ')[0]}`;
    }
    if (this.isActive) return this.destination.objective;
    return `Talk to ${this.destination.contact.split(' · ')[0]} at the landmark.`;
  }

  get prompt() {
    return this.destination?.mission?.item ?? 'MISSION ITEM';
  }

  _removeMarker() {
    if (!this.marker) return;
    this.scene.remove(this.marker);
    this.marker.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.marker = null;
  }
}
