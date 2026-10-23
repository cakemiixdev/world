import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const AVATAR_CONFIG_URL = './assets/player-avatar.json';

function createBlockAvatar() {
  const avatar = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: 0x3f83c5, roughness: 1, flatShading: true });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd5a078, roughness: 1, flatShading: true });
  const pants = new THREE.MeshStandardMaterial({ color: 0x26364d, roughness: 1, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x172027, roughness: 1 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.92, 0.42), shirt);
  torso.position.y = 1.12;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), skin);
  head.position.y = 1.93;
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, 0.035), dark);
  eyes.position.set(0, 1.98, 0.33);
  const arms = [-0.52, 0.52].map((x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.34), shirt);
    arm.position.set(x, 1.08, 0);
    return arm;
  });
  const legs = [-0.2, 0.2].map((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.68, 0.34), pants);
    leg.position.set(x, 0.34, 0);
    return leg;
  });
  avatar.add(torso, head, eyes, ...arms, ...legs);
  avatar.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return avatar;
}

export class PlayerAvatar {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.visible = false;
    this.root.add(createBlockAvatar());
    this.scene.add(this.root);
  }

  attach(scene) {
    this.scene = scene;
    if (this.root.parent !== scene) scene.add(this.root);
  }

  async load() {
    const response = await fetch(AVATAR_CONFIG_URL);
    if (response.status === 404) return false;
    if (!response.ok) throw new Error(`Could not load avatar settings (${response.status}).`);

    const config = await response.json();
    if (config.type === 'default') return false;
    const supportedExtensions = config.type === 'glb'
      ? ['glb']
      : config.type === 'image'
        ? ['png', 'jpg', 'jpeg', 'webp']
        : [];
    if (!supportedExtensions.includes(config.extension) || config.file !== `player-avatar.${config.extension}`) {
      throw new Error('Avatar settings are invalid. Run avatar.py again with a .glb or image file.');
    }
    const assetUrl = `./assets/${encodeURIComponent(config.file)}`;
    let model;
    if (config.type === 'glb') {
      const gltf = await new GLTFLoader().loadAsync(assetUrl);
      model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y < 0.01) throw new Error('The selected GLB has no visible character geometry.');
      const scale = 2.1 / size.y;
      const center = bounds.getCenter(new THREE.Vector3());
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    } else {
      const texture = await new THREE.TextureLoader().loadAsync(assetUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }));
      sprite.scale.set(1.35, 2.1, 1);
      sprite.position.y = 1.05;
      model = sprite;
    }

    this.root.clear();
    this.root.add(model);
    this.root.userData.avatarLoaded = true;
    return true;
  }

  update(position, forward) {
    this.root.position.set(position.x, position.y - 1.7, position.z);
    this.root.rotation.y = Math.atan2(forward.x, forward.z);
  }

  dispose() {
    this.root.removeFromParent();
  }
}
