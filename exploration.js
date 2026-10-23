export const LANDMARK_INTERACTION_RADIUS = 10;
const TOAST_DURATION = 4;

export class ExplorerJournal {
  constructor(progressStore = null) {
    this.progressStore = progressStore;
    this.discoveredZones = progressStore?.load().discoveredDestinations ?? new Set();
    this.toastTime = 0;
    this.lastDiscovery = '';
  }

  update(zone, position, forward, delta, targetPosition = null) {
    const [landmarkX, landmarkZ] = targetPosition
      ? [targetPosition.x, targetPosition.z]
      : zone.landmark.pos;
    const targetX = landmarkX - position.x;
    const targetZ = landmarkZ - position.z;
    const distance = Math.hypot(targetX, targetZ);
    const forwardLength = Math.hypot(forward.x, forward.z) || 1;
    const forwardX = forward.x / forwardLength;
    const forwardZ = forward.z / forwardLength;
    const rightDot = -forwardZ * targetX + forwardX * targetZ;
    const forwardDot = forwardX * targetX + forwardZ * targetZ;
    const angle = Math.atan2(rightDot, forwardDot);
    const directions = ['AHEAD', 'AHEAD RIGHT', 'RIGHT', 'BEHIND RIGHT', 'BEHIND', 'BEHIND LEFT', 'LEFT', 'AHEAD LEFT'];
    const directionIndex = Math.round(angle / (Math.PI / 4) + 8) % 8;
    this.toastTime = Math.max(0, this.toastTime - delta);

    return {
      distance: Math.round(distance),
      direction: distance < 1 ? 'HERE' : directions[directionIndex],
      discovered: this.discoveredZones.has(zone.destinationId ?? zone.id),
      nearby: distance <= LANDMARK_INTERACTION_RADIUS,
      discoveredCount: this.discoveredZones.size,
      toast: this.toastTime > 0 ? this.lastDiscovery : '',
    };
  }

  discover(zone) {
    const destinationId = zone.destinationId ?? zone.id;
    if (this.discoveredZones.has(destinationId)) return false;
    this.discoveredZones.add(destinationId);
    this.progressStore?.save({
      ...this.progressStore.load(),
      discoveredDestinations: this.discoveredZones,
    });
    this.lastDiscovery = zone.destination?.mission?.item ??
      zone.destination?.evidence.label ??
      zone.landmark.label;
    this.toastTime = TOAST_DURATION;
    return true;
  }
}
