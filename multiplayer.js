const SESSION_KEY = 'world-hop-multiplayer-session';
const API_KEY = 'world-hop-multiplayer-api';

export class MultiplayerClient {
  constructor({ urlInput, nameInput, codeInput, capacityInput, status, onPlayers, onClose }) {
    this.urlInput = urlInput;
    this.nameInput = nameInput;
    this.codeInput = codeInput;
    this.capacityInput = capacityInput;
    this.status = status;
    this.onPlayers = onPlayers;
    this.onClose = onClose;
    this.session = this._restoreSession();
    this.syncInFlight = false;
    this.lastSyncAt = 0;
    this.lastErrorAt = 0;

    this.urlInput.value = localStorage.getItem(API_KEY) ?? '';
    this.urlInput.addEventListener('change', () => {
      localStorage.setItem(API_KEY, this.urlInput.value.trim().replace(/\/+$/, ''));
    });
    document.getElementById('btn-room-create').addEventListener('click', () => {
      this.createRoom().catch((error) => this._showError(error));
    });
    document.getElementById('btn-room-join').addEventListener('click', () => {
      this.joinRoom().catch((error) => this._showError(error));
    });
    document.getElementById('btn-room-leave').addEventListener('click', () => {
      this.leaveRoom().catch((error) => this._showError(error));
    });
    document.getElementById('btn-room-close').addEventListener('click', () => {
      this.onClose();
    });

    if (this.session) {
      this.codeInput.value = this.session.code;
      document.getElementById('btn-room-leave').classList.remove('hidden');
      this.status.textContent = `REJOINED ROOM ${this.session.code}. Your field session token is stored for this browser tab.`;
      this.onPlayers([]);
    }
  }

  get isConnected() {
    return Boolean(this.session);
  }

  get roomCode() {
    return this.session?.code ?? '';
  }

  async createRoom() {
    const capacity = Number(this.capacityInput.value);
    const result = await this._post('/api/rooms/create', {
      name: this.nameInput.value,
      capacity,
    });
    this._saveSession(result);
    this.status.textContent = `ROOM ${result.code} CREATED · SHARE THIS CODE WITH FRIENDS.`;
    return result;
  }

  async joinRoom() {
    const result = await this._post('/api/rooms/join', {
      name: this.nameInput.value,
      code: this.codeInput.value,
    });
    this._saveSession(result);
    this.status.textContent = `JOINED ROOM ${result.code} · ${result.players.length}/${result.capacity} PLAYERS.`;
    this.onPlayers(result.players);
    return result;
  }

  async leaveRoom() {
    if (!this.session) return;
    await this._post('/api/rooms/leave', {
      code: this.session.code,
      token: this.session.token,
    });
    this.session = null;
    sessionStorage.removeItem(SESSION_KEY);
    document.getElementById('btn-room-leave').classList.add('hidden');
    this.onPlayers([]);
    this.status.textContent = 'LEFT THE ROOM. YOUR LOCAL ACCESS TOKEN WAS REMOVED; THE DATABASE RETAINS ITS HASH.';
  }

  async update(position, heading, zone) {
    if (!this.session || this.syncInFlight) return;
    const now = performance.now();
    if (now - this.lastSyncAt < 900) return;
    this.lastSyncAt = now;
    this.syncInFlight = true;
    try {
      const result = await this._post('/api/rooms/sync', {
        code: this.session.code,
        token: this.session.token,
        x: position.x,
        z: position.z,
        heading,
        zone,
      });
      this.onPlayers(result.players);
      this.status.textContent = `ROOM ${this.session.code} · ${result.players.length} ACTIVE PLAYERS`;
    } catch (error) {
      if (now - this.lastErrorAt > 5000) {
        this.lastErrorAt = now;
        this._showError(error);
      }
    } finally {
      this.syncInFlight = false;
    }
  }

  _apiBase() {
    const value = this.urlInput.value.trim().replace(/\/+$/, '');
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error('Enter the HTTPS URL of your deployed Python multiplayer server.');
    }
    if (!['https:', 'http:'].includes(url.protocol) || (location.protocol === 'https:' && url.protocol !== 'https:')) {
      throw new Error('Use an HTTPS server URL when playing on the Cloudflare Pages site.');
    }
    localStorage.setItem(API_KEY, url.origin);
    return url.origin;
  }

  async _post(path, payload) {
    const base = this.session?.apiBase ?? this._apiBase();
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(`The multiplayer server returned an unreadable response (${response.status}).`);
    }
    if (!response.ok) throw new Error(result.error || `Multiplayer request failed (${response.status}).`);
    return result;
  }

  _saveSession(result) {
    this.session = {
      code: result.code,
      token: result.token,
      playerId: result.playerId,
      capacity: result.capacity,
      apiBase: this._apiBase(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    document.getElementById('btn-room-leave').classList.remove('hidden');
    this.codeInput.value = result.code;
    this.onPlayers(result.players);
  }

  _restoreSession() {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    try {
      const session = JSON.parse(saved);
      if (
        typeof session.code === 'string' &&
        typeof session.token === 'string' &&
        typeof session.playerId === 'string' &&
        typeof session.apiBase === 'string'
      ) return session;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
    return null;
  }

  _showError(error) {
    const message = error instanceof Error ? error.message : String(error);
    this.status.textContent = `MULTIPLAYER ERROR · ${message}`;
  }
}
