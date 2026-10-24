// main.js
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { setupMap } from './map.js';
import { ExplorerJournal } from './exploration.js';
import { Neighbor } from './neighbor.js';
import { setupStory } from './story.js';
import { DESTINATIONS, STARTER_DESTINATION_COUNT } from './destinations.js';
import { Fieldwork } from './fieldwork.js';
import { PlayerAvatar } from './player-avatar.js';
import { Inventory } from './inventory.js';
import { MultiplayerClient } from './multiplayer.js';
import { ProgressStore } from './progress.js';
import { MinigameManager, formatMinigameTime } from './minigames.js';
import { GamepadInput } from './gamepad.js';

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Required page element #${id} was not found.`);
  return element;
}

const loading = getElement('loading');
function showError(message) {
  loading.classList.remove('hidden');
  loading.textContent = `Unable to load WORLD HOP: ${message}`;
}

window.addEventListener('error', (event) => {
  console.error('WORLD HOP runtime error:', event.error || event.message);
  showError(event.message || 'An unexpected runtime error occurred.');
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (/pointer lock/i.test(reason instanceof Error ? reason.message : String(reason))) {
    event.preventDefault();
    console.warn('Pointer lock is unavailable; use drag-to-look controls instead.');
    return;
  }
  console.error('WORLD HOP unhandled promise rejection:', reason);
  showError(reason instanceof Error ? reason.message : String(reason));
});

try {
  const canvas = getElement('scene');
  const renderScale = 0.78;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth * renderScale, window.innerHeight * renderScale, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.1, 500);

  let currentDestination = DESTINATIONS[0];
  let world = buildWorld(scene, currentDestination.zoneId, currentDestination);
  const flashlight = new THREE.SpotLight(0xffedb3, 80, 38, Math.PI / 7, 0.62, 1.4);
  const flashlightTarget = new THREE.Object3D();
  flashlight.visible = false;
  scene.add(flashlight, flashlightTarget);
  flashlight.target = flashlightTarget;

  const player = new Player(camera, canvas);
  const gamepadInput = new GamepadInput();
  const viewArms = new THREE.Group();
  const sleeveMaterial = new THREE.MeshStandardMaterial({ color: 0x315a72, flatShading: true, roughness: 1 });
  const cuffMaterial = new THREE.MeshStandardMaterial({ color: 0xffd400, flatShading: true, roughness: 1 });
  const gloveMaterial = new THREE.MeshStandardMaterial({ color: 0xb97855, flatShading: true, roughness: 1 });
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.42, -0.8, -1.15);
    arm.rotation.z = side * -0.18;
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.4, 0.16), sleeveMaterial);
    sleeve.position.y = -0.06;
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.17), cuffMaterial);
    cuff.position.y = 0.15;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), gloveMaterial);
    hand.position.y = 0.26;
    arm.add(sleeve, cuff, hand);
    viewArms.add(arm);
  }
  scene.add(camera);
  camera.add(viewArms);
  player.setWorld(world);
  const neighbor = new Neighbor(scene, world);
  const progressStore = new ProgressStore();
  const minigames = new MinigameManager(scene, progressStore);
  minigames.setWorld(world);
  const fieldwork = new Fieldwork(scene, player, progressStore);
  fieldwork.setWorld(world);

  const menu = getElement('menu');
  const storyPanel = getElement('story');
  const mapPanel = getElement('map');
  const hud = getElement('hud');
  const hudProgress = getElement('hud-progress');
  const hudObjective = getElement('hud-objective');
  const questSummary = getElement('quest-summary');
  const questToggle = getElement('quest-toggle');
  const questDetails = getElement('quest-details');
  const carriedItem = getElement('carried-item');
  const compass = getElement('hud-compass');
  const compassHeading = getElement('compass-heading');
  const compassTarget = getElement('compass-target');
  const compassTargetLabel = getElement('compass-target-label');
  const pauseButton = getElement('btn-pause');
  const pauseMenu = getElement('pause-menu');
  const resumeButton = getElement('btn-resume');
  const pauseLightButton = getElement('btn-pause-light');
  const pauseRouteButton = getElement('btn-pause-route');
  const pauseMapButton = getElement('btn-pause-map');
  const pauseChallengesButton = getElement('btn-pause-challenges');
  const challengesButton = getElement('btn-challenges');
  const challengePanel = getElement('challenge-panel');
  const challengeList = getElement('challenge-list');
  const challengeMessage = getElement('challenge-message');
  const challengeHud = getElement('challenge-hud');
  const challengeStatus = getElement('challenge-status');
  const challengeLeaveButton = getElement('btn-challenge-leave');
  const fieldTipCopy = getElement('field-tip-copy');
  const victoryPanel = getElement('victory-panel');
  const victoryKicker = getElement('victory-kicker');
  const victoryTitle = getElement('victory-title');
  const victoryDetail = getElement('victory-detail');
  const victoryReward = getElement('victory-reward-text');
  const victoryCloseButton = getElement('btn-victory-close');
  const pauseMenuButton = getElement('btn-pause-menu');
  const refreshButton = getElement('btn-refresh');
  const exitHelpButton = getElement('btn-exit-help');
  const pauseStatus = getElement('pause-status');
  const statsButton = getElement('btn-stats');
  const statsPanel = getElement('stats-panel');
  const statTime = getElement('stat-time');
  const statDistance = getElement('stat-distance');
  const statClues = getElement('stat-clues');
  const statTokens = getElement('stat-tokens');
  const multiplayerPanel = getElement('multiplayer-panel');
  const pauseMultiplayerButton = getElement('btn-pause-multiplayer');
  const roomBadge = getElement('room-badge');
  const controllerStatus = getElement('controller-status');
  const interactPrompt = getElement('interact-prompt');
  const journal = new ExplorerJournal(progressStore);
  const playerAvatar = new PlayerAvatar(scene);
  const remotePlayers = new Map();
  let multiplayer;
  let hasStarted = false;
  let paused = false;
  let flashlightOn = false;
  let spyglassOn = false;
  let cameraBaseFov = 78;
  let sessionElapsed = 0;
  let sessionDistance = 0;
  const previousPlayerPosition = new THREE.Vector3();
  let navigationTargetIndex = 0;
  let savedCinematic = null;
  let multiplayerReturnPaused = false;
  let lastGamepadId = '';
  let controllerConnected = false;

  function createRemotePlayer(playerName) {
    const root = new THREE.Group();
    let colorSeed = 0;
    for (const char of playerName) colorSeed = (colorSeed * 31 + char.charCodeAt(0)) % 0xffffff;
    const shirt = new THREE.MeshStandardMaterial({ color: colorSeed || 0x4080c0, flatShading: true });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd5a078, flatShading: true });
    const pants = new THREE.MeshStandardMaterial({ color: 0x26364d, flatShading: true });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.88, 0.42), shirt);
    torso.position.y = 1.08;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.56), skin);
    head.position.y = 1.82;
    const eyes = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.07, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x172027, flatShading: true })
    );
    eyes.position.set(0, 1.84, 0.3);
    const arms = [-0.48, 0.48].map((x) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.74, 0.34), shirt);
      arm.position.set(x, 1.08, 0);
      return arm;
    });
    const legs = [-0.18, 0.18].map((x) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.65, 0.32), pants);
      leg.position.set(x, 0.33, 0);
      return leg;
    });
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 320;
    labelCanvas.height = 80;
    const context = labelCanvas.getContext('2d');
    if (!context) throw new Error('Could not create a player-name label.');
    context.fillStyle = '#0b0f14';
    context.fillRect(2, 2, 316, 76);
    context.strokeStyle = '#ffd400';
    context.lineWidth = 6;
    context.strokeRect(3, 3, 314, 74);
    context.fillStyle = '#f4f7fb';
    context.font = '900 34px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(playerName.slice(0, 20), 160, 42, 285);
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    labelTexture.magFilter = THREE.NearestFilter;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture, transparent: true }));
    label.position.y = 2.65;
    label.scale.set(2.3, 0.58, 1);
    root.add(torso, head, eyes, ...arms, ...legs, label);
    root.userData.labelTexture = labelTexture;
    root.userData.targetPosition = new THREE.Vector3();
    return root;
  }

  function updateRemotePlayers(players) {
    roomBadge.classList.toggle('hidden', !multiplayer?.isConnected);
    if (multiplayer?.isConnected) roomBadge.textContent = `ROOM ${multiplayer.roomCode}`;
    const visible = new Set();
    for (const player of players) {
      if (player.id === multiplayer?.session?.playerId || player.zone !== currentDestination.id) continue;
      visible.add(player.id);
      let avatar = remotePlayers.get(player.id);
      if (!avatar) {
        avatar = createRemotePlayer(player.name);
        remotePlayers.set(player.id, avatar);
        scene.add(avatar);
      }
      avatar.userData.targetPosition.set(
        player.x,
        world.getGroundHeight(player.x, player.z),
        player.z
      );
      avatar.rotation.y = Number(player.heading) * Math.PI / 180;
    }
    for (const [id, avatar] of remotePlayers) {
      if (visible.has(id)) continue;
      avatar.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      avatar.userData.labelTexture?.dispose();
      avatar.removeFromParent();
      remotePlayers.delete(id);
    }
  }

  multiplayer = new MultiplayerClient({
    urlInput: getElement('multiplayer-url'),
    nameInput: getElement('multiplayer-name'),
    codeInput: getElement('multiplayer-code'),
    capacityInput: getElement('multiplayer-capacity'),
    status: getElement('multiplayer-status'),
    onPlayers: updateRemotePlayers,
    onClose: () => {
      multiplayerPanel.classList.add('hidden');
      if (multiplayerReturnPaused) {
        paused = true;
        pauseMenu.classList.remove('hidden');
      } else if (hasStarted) {
        paused = false;
        player.startLooking();
      } else {
        menu.classList.remove('hidden');
      }
    },
  });
  if (multiplayer.isConnected) {
    roomBadge.textContent = `ROOM ${multiplayer.roomCode}`;
    roomBadge.classList.remove('hidden');
  }
  roomBadge.addEventListener('click', () => {
    if (!multiplayer.roomCode) return;
    if (!navigator.clipboard?.writeText) {
      roomBadge.textContent = `ROOM ${multiplayer.roomCode} · COPY FROM MENU`;
      return;
    }
    navigator.clipboard.writeText(multiplayer.roomCode)
      .then(() => { roomBadge.textContent = `COPIED ${multiplayer.roomCode}`; })
      .catch(() => { roomBadge.textContent = `ROOM ${multiplayer.roomCode} · COPY FROM MENU`; });
  });

  function openMultiplayerPanel(fromPause = false) {
    multiplayerReturnPaused = fromPause;
    pauseMenu.classList.add('hidden');
    if (hasStarted) {
      paused = true;
      player.stopLooking();
    } else {
      menu.classList.add('hidden');
    }
    multiplayerPanel.classList.remove('hidden');
  }
  const story = setupStory({
    onClose: () => {
      if (!hud.classList.contains('hidden') && victoryPanel.classList.contains('hidden')) {
        player.startLooking();
      }
    },
    onCinematic: (active) => {
      if (active) {
        setSpyglass(false);
        playerAvatar.root.visible = true;
        savedCinematic = {
          position: camera.position.clone(),
          quaternion: camera.quaternion.clone(),
          fov: cameraBaseFov,
          witnessRotation: world.witness.rotation.y,
        };
        const playerPosition = camera.position.clone();
        playerPosition.y -= 1.7;
        const contactPosition = world.witness.position.clone();
        const direction = new THREE.Vector3().subVectors(contactPosition, playerPosition);
        direction.y = 0;
        if (direction.lengthSq() < 0.01) camera.getWorldDirection(direction);
        direction.normalize();
        world.witness.rotation.y = Math.atan2(
          playerPosition.x - contactPosition.x,
          playerPosition.z - contactPosition.z
        );
        const side = new THREE.Vector3(direction.z, 0, -direction.x);
        const center = playerPosition.add(contactPosition).multiplyScalar(0.5);
        center.y += 1.1;
        const distance = Math.max(4.5, Math.min(8, center.distanceTo(contactPosition) * 1.3));
        camera.position.copy(center).addScaledVector(side, distance);
        camera.position.y += 1.4;
        camera.fov = 48;
        cameraBaseFov = 48;
        camera.lookAt(center);
        camera.updateProjectionMatrix();
        return;
      }
      if (!savedCinematic) return;
      camera.position.copy(savedCinematic.position);
      camera.quaternion.copy(savedCinematic.quaternion);
      camera.fov = savedCinematic.fov;
      cameraBaseFov = savedCinematic.fov;
      camera.updateProjectionMatrix();
      world.witness.rotation.y = savedCinematic.witnessRotation;
      playerAvatar.root.visible = false;
      savedCinematic = null;
    },
    onTalking: (talking) => {
      if (world.witness) world.witness.userData.talking = talking;
    },
  });
  playerAvatar.load().catch((error) => {
    console.error('WORLD HOP could not load the custom avatar:', error);
  });
  player.interact = () => {
    if (player.nearEvidence && fieldwork.isNear) {
      if (!fieldwork.collect()) return;
      player.setPathTarget(world.witness.position, camera.position);
      player.stopLooking();
      story.showFound(world.zone);
      return;
    }
    if (!player.nearContact) return;
    player.stopLooking();
    if (fieldwork.isReturning) {
      story.showTurnIn(world.zone, () => {
        const reward = fieldwork.deliver();
        if (reward === false) throw new Error('The recovered mission item could not be delivered.');
        journal.discover(world.zone);
        hudProgress.textContent = `CLUES ${journal.discoveredZones.size} / ${STARTER_DESTINATION_COUNT}`;
        showVictoryScreen({
          kicker: 'FIELDWORK COMPLETE · MISSION CLEARED',
          title: `${world.zone.destination.mission.item} RETURNED!`,
          detail: world.zone.destination.mission.returned,
          reward,
        });
      });
      return;
    }
    story.showInterview(world.zone, {
      active: fieldwork.isActive,
      completed: fieldwork.isComplete,
      returning: fieldwork.isReturning,
      onAccept: () => {
        fieldwork.activate();
        player.setPathTarget(world.evidence.position, savedCinematic?.position);
        navigationTargetIndex = 0;
      },
    });
  };
  interactPrompt.addEventListener('click', () => player.interact?.());

  let mapUI;
  function configureMap() {
    mapUI = setupMap({
      getCurrentDestination: () => currentDestination.id,
      onSelect: (id, destination) => {
        const selectedDestination = destination ?? DESTINATIONS.find((entry) => entry.id === id);
        if (!selectedDestination) throw new RangeError(`Unknown destination: ${id}`);
        loadDestination(selectedDestination);
        hasStarted = true;
        hud.classList.remove('hidden');
        story.showArrival(world.zone);
      },
      onClose: () => {
        if (hasStarted) player.startLooking();
        else menu.classList.remove('hidden');
      },
    });
  }
  configureMap();

  function loadDestination(destination) {
    currentDestination = destination;
    challengeHud.classList.add('hidden');
    challengeStatus.textContent = '';
    navigationTargetIndex = 0;
    for (const avatar of remotePlayers.values()) {
      avatar.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      avatar.userData.labelTexture?.dispose();
      avatar.removeFromParent();
    }
    remotePlayers.clear();
    camera.removeFromParent();
    world = buildWorld(scene, destination.zoneId, destination);
    scene.add(camera);
    minigames.setWorld(world);
    scene.add(flashlight, flashlightTarget);
    flashlight.visible = flashlightOn;
    playerAvatar.attach(scene);
    player.setWorld(world);
    previousPlayerPosition.copy(camera.position);
    neighbor.setWorld(world);
    fieldwork.setWorld(world);
    questSummary.textContent = fieldwork.objective;
    hudObjective.textContent = fieldwork.objective;
    hudProgress.textContent = `CLUES ${journal.discoveredZones.size} / ${STARTER_DESTINATION_COUNT}`;
    const targets = availableNavigationTargets();
    navigationTargetIndex %= targets.length;
    camera.getWorldDirection(forward);
    updateCompass(forward, targets[navigationTargetIndex].position, targets[navigationTargetIndex].label);
  }

  function setFlashlight(enabled) {
    flashlightOn = enabled;
    flashlight.visible = enabled;
    pauseLightButton.setAttribute('aria-pressed', String(enabled));
    pauseLightButton.textContent = `FLASHLIGHT: ${enabled ? 'ON' : 'OFF'} · L`;
  }

  function pauseGame() {
    if (!hasStarted || story.isOpen() || mapUI.isOpen() || paused) return;
    paused = true;
    player.stopLooking();
    pauseMenu.classList.remove('hidden');
      pauseStatus.textContent = '';
      setSpyglass(false);
      resumeButton.focus();
  }

  function resumeGame() {
    if (!paused) return;
    paused = false;
    pauseMenu.classList.add('hidden');
    player.startLooking();
  }

  function showVictoryScreen({ kicker, title, detail, reward = 0 }) {
    victoryKicker.textContent = kicker;
    victoryTitle.textContent = title;
    victoryDetail.textContent = detail;
    victoryReward.textContent = reward > 0
      ? `+${reward} FIELD TOKENS · TOTAL ${progressStore.load().fieldTokens}`
      : `NO REPEAT BONUS · FIELD TOKENS ${progressStore.load().fieldTokens}`;
    victoryPanel.classList.remove('hidden');
    victoryCloseButton.focus();
    player.stopLooking();
  }

  function closeVictoryScreen() {
    victoryPanel.classList.add('hidden');
    if (hasStarted && !paused) player.startLooking();
  }

  const inventory = new Inventory(getElement('inventory'), (item, active) => {
    if (item === 'flashlight') setFlashlight(active ?? !flashlightOn);
    if (item === 'spyglass') setSpyglass(active ?? !spyglassOn);
  });

  function setSpyglass(enabled) {
    spyglassOn = enabled;
    const spyglassSlot = document.querySelector('[data-item="spyglass"]');
    spyglassSlot?.classList.toggle('active', enabled);
    spyglassSlot?.setAttribute('aria-description', enabled ? 'Spyglass zoom active' : 'Spyglass zoom inactive');
  }

  function updateStats() {
    const minutes = Math.floor(sessionElapsed / 60).toString().padStart(2, '0');
    const seconds = Math.floor(sessionElapsed % 60).toString().padStart(2, '0');
    statTime.textContent = `TIME ${minutes}:${seconds}`;
    statDistance.textContent = `DISTANCE ${Math.round(sessionDistance)} M`;
    statClues.textContent = `CLUES ${journal.discoveredZones.size} / ${STARTER_DESTINATION_COUNT}`;
    statTokens.textContent = `FIELD TOKENS ${fieldwork.fieldTokens}`;
  }

  function availableNavigationTargets() {
    const fieldTarget = fieldwork.isReturning
      ? world.witness.position
      : fieldwork.isActive && !fieldwork.isComplete
        ? world.evidence.position
        : null;
    return [
      ...(fieldTarget ? [{
        position: fieldTarget,
        label: fieldwork.isReturning ? 'RETURN TO CONTACT' : fieldwork.prompt,
      }] : []),
      { position: world.landmark.position, label: world.zone.landmark.label },
      ...(world.cave ? [{ position: world.cave, label: 'CAVE ROUTE' }] : []),
      ...(world.outpost ? [{ position: world.outpost, label: 'FIELD OUTPOST' }] : []),
    ];
  }

  function updateCompass(forward, targetPosition, targetName) {
    const flatForward = forward.clone();
    flatForward.y = 0;
    if (flatForward.lengthSq() < 0.001) flatForward.set(0, 0, -1);
    flatForward.normalize();
    const heading = (Math.atan2(flatForward.x, -flatForward.z) * 180 / Math.PI + 360) % 360;
    const cardinal = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    compassHeading.textContent = cardinal[Math.round(heading / 45) % 8];

    const toTarget = targetPosition.clone().sub(camera.position);
    toTarget.y = 0;
    if (toTarget.lengthSq() > 0.001) {
      toTarget.normalize();
      const dot = THREE.MathUtils.clamp(flatForward.dot(toTarget), -1, 1);
      const cross = flatForward.x * toTarget.z - flatForward.z * toTarget.x;
      compassTarget.style.transform = `rotate(${Math.atan2(cross, dot) * 180 / Math.PI}deg)`;
    }
    compassTargetLabel.textContent = targetName.length > 18
      ? `${targetName.slice(0, 16)}…`
      : targetName;
    compass.title = `Compass target: ${targetName}. Click or press V to change route.`;
  }

  function cycleNavigationTarget() {
    const targets = availableNavigationTargets();
    navigationTargetIndex = (navigationTargetIndex + 1) % targets.length;
    camera.getWorldDirection(forward);
    const selectedTarget = targets[navigationTargetIndex];
    updateCompass(forward, selectedTarget.position, selectedTarget.label);
  }

  function visibleControls(container) {
    return [...container.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && !element.closest('.hidden');
      });
  }

  function moveControllerFocus(horizontal, vertical) {
    const panel = [victoryPanel, challengePanel, pauseMenu, multiplayerPanel, mapPanel, storyPanel, menu]
      .find((element) => !element.classList.contains('hidden'));
    if (!panel) return false;
    const controls = visibleControls(panel);
    if (controls.length === 0) return true;
    const current = document.activeElement;
    if (panel === mapPanel && current === mapPanel.querySelector('#destination-search') &&
        vertical > 0) {
      mapPanel.querySelector('.destination-card')?.focus();
      return true;
    }
    const currentRect = current.getBoundingClientRect?.();
    if (!currentRect || !controls.includes(current)) {
      controls[0].focus();
      return true;
    }
    const originX = currentRect.left + currentRect.width / 2;
    const originY = currentRect.top + currentRect.height / 2;
    const candidates = controls
      .filter((element) => element !== current)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - originX;
        const dy = rect.top + rect.height / 2 - originY;
        const primary = dx * horizontal + dy * vertical;
        const cross = Math.abs(dx * vertical - dy * horizontal);
        return { element, score: primary > 0 ? primary + cross * 2 : Infinity };
      })
      .sort((a, b) => a.score - b.score);
    (Number.isFinite(candidates[0]?.score) ? candidates[0].element : controls[0]).focus();
    return true;
  }

  function handleGamepad(state) {
    controllerConnected = state.connected;
    if (state.connected && state.id !== lastGamepadId) {
      controllerStatus.textContent = `CONTROLLER CONNECTED · ${state.id.slice(0, 18)} · ${state.mapping.toUpperCase()}`;
      lastGamepadId = state.id;
    } else if (!state.connected) {
      controllerStatus.textContent = 'NO CONTROLLER · CONNECT USB / BLUETOOTH, THEN PRESS ANY BUTTON';
      lastGamepadId = '';
    }

    player.setGamepadState(state);
    const inOverlay = [victoryPanel, challengePanel, pauseMenu, multiplayerPanel, mapPanel, storyPanel, menu]
      .some((element) => !element.classList.contains('hidden'));
    const pressEscape = () => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
    }));

    if (state.pressed.pause) {
      if (paused) resumeGame();
      else if (hasStarted && !story.isOpen() && !mapUI.isOpen() && challengePanel.classList.contains('hidden')) pauseGame();
      else if (inOverlay) pressEscape();
      else if (!hasStarted) mapUI.open();
    }

    if (inOverlay) {
      if (state.pressed.dpadUp) moveControllerFocus(0, -1);
      if (state.pressed.dpadDown) moveControllerFocus(0, 1);
      if (state.pressed.dpadLeft) moveControllerFocus(-1, 0);
      if (state.pressed.dpadRight) moveControllerFocus(1, 0);
      if (state.pressed.jump) {
        const activePanel = [victoryPanel, challengePanel, pauseMenu, multiplayerPanel, mapPanel, storyPanel, menu]
          .find((element) => !element.classList.contains('hidden'));
        if (activePanel === storyPanel) {
          const continueButton = getElement('story-continue');
          if (!continueButton.disabled) continueButton.click();
          else storyPanel.querySelector('.story-choice')?.click();
        } else if (activePanel === mapPanel &&
            document.activeElement === mapPanel.querySelector('#destination-search')) {
          mapPanel.querySelector('.destination-card')?.focus();
        } else {
          const controls = activePanel && visibleControls(activePanel);
          const focused = document.activeElement;
          (controls?.includes(focused) ? focused : controls?.[0])?.click();
        }
      }
      if (state.pressed.interact) pressEscape();
      return;
    }

    if (!hasStarted) return;
    if (state.pressed.compassLeft || state.pressed.compassRight) cycleNavigationTarget();
    if (state.pressed.dpadUp) openChallenges();
    if (state.pressed.dpadDown) {
      player.stopLooking();
      mapUI.open();
    }
    if (state.pressed.map) {
      player.stopLooking();
      mapUI.open();
    }
    if (state.pressed.interact) {
      if (player.nearLadder) {
        player.climbing = !player.climbing;
        if (player.climbing) player.velocity.set(0, 0, 0);
      } else if (player.nearEvidence || player.nearContact) {
        player.interact?.();
      }
    }
    if (state.pressed.jump) player._jump();
    if (state.pressed.glide) {
      if (player.gliding) {
        player.gliding = false;
        player.wantsGlide = false;
      } else if (!player.inWater && !player.climbing) {
        if (player.onGround) player.wantsGlide = !player.wantsGlide;
        else player.gliding = true;
      }
    }
    if (state.pressed.decoy) player.throwDecoy();
    if (state.pressed.flashlight) setFlashlight(!flashlightOn);
    if (state.held.spyglass && !spyglassOn) inventory.use('spyglass', true);
    else if (!state.held.spyglass && spyglassOn) inventory.use('spyglass', false);
  }

  function renderChallenges() {
    challengeList.replaceChildren();
    const games = minigames.availableGames;
    if (games.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'challenge-message';
      empty.textContent = 'No field trial is available here. Try Giza, Everest, Machu Picchu, the Grand Canyon, the Taj Mahal, Mutianyu, or Beacon Island.';
      challengeList.appendChild(empty);
      return;
    }
    for (const game of games) {
      const option = document.createElement('button');
      option.className = 'challenge-option';
      option.type = 'button';
      const name = document.createElement('strong');
      name.textContent = game.name;
      const description = document.createElement('span');
      description.textContent = game.description;
      const best = document.createElement('span');
      best.className = 'challenge-best';
      const record = minigames.bestTimes[game.id];
      best.textContent = record === undefined
        ? 'PERSONAL BEST · NOT SET'
        : `PERSONAL BEST · ${formatMinigameTime(record)}`;
      option.append(name, description, best);
      option.addEventListener('click', () => {
        try {
          minigames.start(game.id, world, player);
          challengePanel.classList.add('hidden');
          challengeMessage.textContent = '';
          challengeHud.classList.remove('hidden');
          challengeLeaveButton.classList.remove('hidden');
          player.startLooking();
        } catch (error) {
          challengeMessage.textContent = error instanceof Error ? error.message : String(error);
        }
      });
      challengeList.appendChild(option);
    }
  }

  function openChallenges() {
    if (!hasStarted || story.isOpen() || mapUI.isOpen()) return;
    paused = false;
    pauseMenu.classList.add('hidden');
    setSpyglass(false);
    player.stopLooking();
    challengeMessage.textContent = '';
    renderChallenges();
    challengePanel.classList.remove('hidden');
    challengeList.querySelector('button')?.focus();
  }

  function closeChallenges() {
    challengePanel.classList.add('hidden');
    if (hasStarted) player.startLooking();
  }

  function leaveChallenge() {
    minigames.stop();
    challengeHud.classList.add('hidden');
    challengeStatus.textContent = '';
    challengeLeaveButton.classList.add('hidden');
    if (world.landmark) player.setPathTarget(world.landmark.position);
  }

  getElement('btn-explore').addEventListener('click', () => {
    menu.classList.add('hidden');
    mapUI.open();
  });
  compass.onclick = cycleNavigationTarget;
  pauseButton.addEventListener('click', pauseGame);
  resumeButton.addEventListener('click', resumeGame);
  questToggle.addEventListener('click', () => {
    const expanded = questToggle.getAttribute('aria-expanded') !== 'true';
    questToggle.setAttribute('aria-expanded', String(expanded));
    questDetails.classList.toggle('hidden', !expanded);
  });
  pauseLightButton.addEventListener('click', () => setFlashlight(!flashlightOn));
  pauseRouteButton.addEventListener('click', cycleNavigationTarget);
  pauseMapButton.addEventListener('click', () => {
    if (!paused) return;
    paused = false;
    pauseMenu.classList.add('hidden');
    player.stopLooking();
    mapUI.open();
  });
  challengesButton.addEventListener('click', openChallenges);
  pauseChallengesButton.addEventListener('click', openChallenges);
  getElement('btn-challenge-close').addEventListener('click', closeChallenges);
  challengeLeaveButton.addEventListener('click', leaveChallenge);
  victoryCloseButton.addEventListener('click', closeVictoryScreen);
  pauseMultiplayerButton.addEventListener('click', () => openMultiplayerPanel(true));
  getElement('btn-multiplayer').addEventListener('click', () => openMultiplayerPanel(false));
  pauseMenuButton.addEventListener('click', () => {
    getElement('pause-controls').scrollIntoView({ behavior: 'smooth', block: 'center' });
    pauseStatus.textContent = 'CONTROLS ARE LISTED BELOW.';
  });
  refreshButton.addEventListener('click', () => window.location.reload());
  exitHelpButton.addEventListener('click', () => {
    pauseStatus.textContent = 'PRESS ALT + F4 TO CLOSE THIS GAME WINDOW. BROWSERS BLOCK WEB PAGES FROM CLOSING THEMSELVES.';
  });
  statsButton.addEventListener('click', () => {
    const expanded = statsButton.getAttribute('aria-expanded') !== 'true';
    statsButton.setAttribute('aria-expanded', String(expanded));
    statsPanel.classList.toggle('hidden', !expanded);
  });

  document.addEventListener('keydown', (event) => {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if (typing && event.code !== 'Escape') return;
    if (event.code === 'Digit1' && !event.repeat && hasStarted && !paused && !story.isOpen() && !mapUI.isOpen() && challengePanel.classList.contains('hidden')) {
      inventory.select('flashlight');
    } else if (event.code === 'Digit2' && !event.repeat && hasStarted && !paused && !story.isOpen() && !mapUI.isOpen() && challengePanel.classList.contains('hidden')) {
      inventory.select('spyglass');
    } else if (event.code === 'KeyZ' && !event.repeat && hasStarted && !paused && !story.isOpen() && !mapUI.isOpen() && challengePanel.classList.contains('hidden')) {
      inventory.select('spyglass');
      inventory.use('spyglass');
    } else if (event.code === 'KeyM' && !event.repeat && paused) {
      event.preventDefault();
      pauseMapButton.click();
    } else if (event.code === 'KeyG' && !event.repeat && hasStarted && !paused && !story.isOpen() && !mapUI.isOpen() && victoryPanel.classList.contains('hidden')) {
      event.preventDefault();
      if (challengePanel.classList.contains('hidden')) openChallenges();
      else closeChallenges();
    } else if (event.code === 'Escape' && !victoryPanel.classList.contains('hidden')) {
      closeVictoryScreen();
    } else if (event.code === 'Escape' && challengePanel && !challengePanel.classList.contains('hidden')) {
      closeChallenges();
    } else if (event.code === 'KeyM' && !event.repeat && !hud.classList.contains('hidden') && !story.isOpen() && !paused && challengePanel.classList.contains('hidden')) {
      event.preventDefault();
      if (mapUI.isOpen()) {
        mapUI.close();
        player.startLooking();
      } else {
        player.stopLooking();
        mapUI.open();
      }
    } else if (event.code === 'Escape' && story.isOpen()) {
      story.close();
    } else if (event.code === 'Escape' && mapUI.isOpen()) {
      mapUI.close();
      if (hasStarted) player.startLooking();
      else menu.classList.remove('hidden');
    } else if (event.code === 'Escape' && paused) {
      resumeGame();
    } else if (event.code === 'Escape' && hasStarted && !event.repeat) {
      pauseGame();
    } else if (event.code === 'KeyL' && !event.repeat && hasStarted && !story.isOpen() && !mapUI.isOpen() && !paused && challengePanel.classList.contains('hidden')) {
      setFlashlight(!flashlightOn);
    } else if (event.code === 'KeyV' && !event.repeat && hasStarted && !story.isOpen() && !mapUI.isOpen() && !paused && challengePanel.classList.contains('hidden')) {
      cycleNavigationTarget();
    }
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 2 && inventory.selected === 'spyglass' && hasStarted && !paused && !story.isOpen() && !mapUI.isOpen()) {
      inventory.use('spyglass', true);
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 2 && spyglassOn) inventory.use('spyglass', false);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth * renderScale, window.innerHeight * renderScale, false);
  });

  const clock = new THREE.Clock();
  const forward = new THREE.Vector3();
  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    handleGamepad(gamepadInput.poll());

    if (spyglassOn && (paused || story.isOpen() || mapUI.isOpen() || !challengePanel.classList.contains('hidden'))) {
      setSpyglass(false);
    }
    const desiredFov = spyglassOn ? 24 : cameraBaseFov;
    camera.fov = THREE.MathUtils.damp(camera.fov, desiredFov, 10, dt);
    camera.updateProjectionMatrix();
    if (!paused) {
      world.update(dt);
      fieldwork.update(dt);
    }
    const isPlaying = hasStarted && !mapUI.isOpen() && !story.isOpen() && !paused &&
      victoryPanel.classList.contains('hidden') &&
      challengePanel.classList.contains('hidden');
    if (isPlaying) {
      player.update(dt);
      neighbor.update(dt, player);
      const courseEvent = minigames.update(dt, player);
      if (courseEvent?.type === 'checkpoint') {
        challengeMessage.textContent = `CHECKPOINT ${courseEvent.index} / ${minigames.course.gates.length - 1} · KEEP GOING!`;
      } else if (courseEvent?.type === 'complete') {
        if (courseEvent.reward > 0) {
          fieldwork.fieldTokens = progressStore.load().fieldTokens;
        }
        challengeMessage.textContent = courseEvent.newRecord
          ? `NEW PERSONAL BEST · ${formatMinigameTime(courseEvent.elapsed)}${courseEvent.reward ? ` · +${courseEvent.reward} TOKENS` : ''}`
          : `COURSE COMPLETE · ${formatMinigameTime(courseEvent.elapsed)}${courseEvent.reward ? ` · +${courseEvent.reward} TOKENS` : ''}`;
        showVictoryScreen({
          kicker: 'FIELD TRIAL COMPLETE · ALL GATES CLEARED',
          title: courseEvent.newRecord ? 'NEW PERSONAL BEST!' : 'COURSE COMPLETE!',
          detail: `${minigames.course.game.name}\nTIME · ${formatMinigameTime(courseEvent.elapsed)}${courseEvent.newRecord ? '\nYOUR BEST TIME IS SAVED.' : ''}`,
          reward: courseEvent.reward,
        });
      }
      if (minigames.course) {
        challengeHud.classList.remove('hidden');
        challengeStatus.textContent = minigames.currentStatus;
        challengeLeaveButton.classList.remove('hidden');
        challengeLeaveButton.textContent = minigames.course.complete ? 'CLOSE RESULT' : 'LEAVE COURSE';
      }
      sessionElapsed += dt;
      sessionDistance += previousPlayerPosition.distanceTo(camera.position);
    }
    const interactionKeys = controllerConnected ? 'B / E' : 'E';
    if (isPlaying && player.nearLadder) {
      interactPrompt.textContent = `${interactionKeys} · ${player.climbing ? 'LEAVE' : 'CLIMB'} LADDER`;
      interactPrompt.classList.remove('hidden');
    } else if (isPlaying && player.nearContact && fieldwork.isReturning) {
      interactPrompt.textContent = `${interactionKeys} · RETURN ${fieldwork.prompt} TO ${world.zone.destination.contact.split(' · ')[0]}`;
      interactPrompt.classList.remove('hidden');
    } else if (isPlaying && player.nearContact) {
      interactPrompt.textContent = `${interactionKeys} · TALK TO ${world.zone.destination?.contact.split(' · ')[0] ?? 'FIELD CONTACT'}`;
      interactPrompt.classList.remove('hidden');
    } else if (isPlaying && fieldwork.isNear) {
      interactPrompt.textContent = `${interactionKeys} · PICK UP ${fieldwork.prompt}`;
      interactPrompt.classList.remove('hidden');
    } else {
      interactPrompt.classList.add('hidden');
    }
    previousPlayerPosition.copy(camera.position);
    if (hasStarted && multiplayer.isConnected) {
      const heading = (Math.atan2(forward.x, -forward.z) * 180 / Math.PI + 360) % 360;
      multiplayer.update(camera.position, heading, currentDestination.id);
    }
    for (const avatar of remotePlayers.values()) {
      avatar.position.lerp(avatar.userData.targetPosition, Math.min(1, dt * 7));
    }
    camera.getWorldDirection(forward);
    flashlight.position.copy(camera.position);
    flashlightTarget.position.copy(camera.position).addScaledVector(forward, 24);
    if (!story.isOpen()) {
      playerAvatar.update(camera.position, forward);
    }

    camera.getWorldDirection(forward);
    const navigationTargets = availableNavigationTargets();
    navigationTargetIndex %= navigationTargets.length;
    const selectedNavigationTarget = navigationTargets[navigationTargetIndex];
    updateCompass(
      forward,
      selectedNavigationTarget.position,
      selectedNavigationTarget.label
    );
    const fieldTarget = fieldwork.isActive && !fieldwork.isReturning && !fieldwork.isComplete
      ? world.evidence.position
      : null;
    const exploration = journal.update(world.zone, camera.position, forward, dt, fieldTarget);
    hudObjective.textContent = fieldwork.objective;
    hudProgress.textContent = `CLUES ${exploration.discoveredCount} / ${STARTER_DESTINATION_COUNT}`;
    questSummary.textContent = fieldwork.objective;
    carriedItem.textContent = fieldwork.hasItem ? `CARRYING · ${fieldwork.prompt}` : '';
    carriedItem.classList.toggle('hidden', !fieldwork.hasItem);
    if (minigames.isActive) {
      fieldTipCopy.textContent = minigames.activeGame.airborne
        ? 'Follow the glowing hoops. Hold the glide control in the air and steer through each ring.'
        : minigames.activeGame.id === 'river-swim'
          ? 'Swim through the glowing gates in order. Space / A swims upward; Shift / RB dives.'
          : 'Follow each blue gate up the ridge. The compass points to the next checkpoint.';
    } else if (fieldwork.isReturning) {
      fieldTipCopy.textContent = `Follow the compass back to ${world.zone.destination.contact.split(' · ')[0]}. ${controllerConnected ? 'Press B' : 'Press E'} to return the item.`;
    } else if (fieldwork.isActive) {
      fieldTipCopy.textContent = `Follow the compass to the glowing ${fieldwork.prompt}. Get close, then press ${controllerConnected ? 'B' : 'E'} to collect it.`;
    } else if (player.nearContact) {
      fieldTipCopy.textContent = `Talk to ${world.zone.destination.contact.split(' · ')[0]} to hear their request. Press ${controllerConnected ? 'B' : 'E'}.`;
    } else {
      fieldTipCopy.textContent = `Follow the compass to ${world.zone.landmark.label}. Explore the area and meet the local contact.`;
    }
    updateStats();

    playerAvatar.root.visible = Boolean(savedCinematic && story.isOpen());
    viewArms.visible = hasStarted && isPlaying;
    renderer.render(scene, camera);
  }
  animate();

  hudProgress.textContent = `CLUES 0 / ${STARTER_DESTINATION_COUNT}`;
  hudObjective.textContent = fieldwork.objective;
  questSummary.textContent = fieldwork.objective;
  loading.classList.add('hidden');
} catch (error) {
  console.error('WORLD HOP failed to initialize:', error);
  showError(error instanceof Error ? error.message : String(error));
}
