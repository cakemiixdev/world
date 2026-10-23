import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { ExplorerJournal } from '../exploration.js';
import { Fieldwork } from '../fieldwork.js';
import { ProgressStore } from '../progress.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test('starts with empty progress and saves mission and discovery state across store instances', () => {
  const storage = createStorage();
  const firstSession = new ProgressStore(storage);
  const initial = firstSession.load();

  assert.equal(initial.fieldTokens, 0);
  assert.equal(initial.activeDestinations.size, 0);
  assert.equal(initial.discoveredDestinations.size, 0);

  firstSession.save({
    activeDestinations: new Set(['everest']),
    retrievedDestinations: new Set(['everest']),
    completedDestinations: new Set(['giza']),
    discoveredDestinations: new Set(['giza']),
    fieldTokens: 25,
  });

  const nextSession = new ProgressStore(storage).load();
  assert.deepEqual([...nextSession.activeDestinations], ['everest']);
  assert.deepEqual([...nextSession.retrievedDestinations], ['everest']);
  assert.deepEqual([...nextSession.completedDestinations], ['giza']);
  assert.deepEqual([...nextSession.discoveredDestinations], ['giza']);
  assert.equal(nextSession.fieldTokens, 25);
});

test('clears saved progress', () => {
  const store = new ProgressStore(createStorage());
  store.save({
    activeDestinations: new Set(),
    retrievedDestinations: new Set(),
    completedDestinations: new Set(),
    discoveredDestinations: new Set(),
    fieldTokens: 0,
  });

  store.clear();

  assert.equal(store.load().fieldTokens, 0);
  assert.equal(store.load().activeDestinations.size, 0);
});

test('reports malformed saved data instead of silently discarding it', () => {
  const storage = createStorage();
  storage.setItem('world-hop.progress.v1', '{broken');
  assert.throws(() => new ProgressStore(storage).load(), /invalid JSON/);
});

test('rejects invalid token balances before saving', () => {
  const store = new ProgressStore(createStorage());
  assert.throws(() => store.save({
    activeDestinations: new Set(),
    retrievedDestinations: new Set(),
    completedDestinations: new Set(),
    discoveredDestinations: new Set(),
    fieldTokens: -1,
  }), /non-negative integer/);
});

test('restores a recovered mission and awards its reward after delivery', () => {
  const storage = createStorage();
  const progressStore = new ProgressStore(storage);
  const destination = {
    id: 'everest',
    mission: { item: 'BRASS BUTTON', reward: 30 },
    evidence: { pos: [-16, -5], label: 'BRASS BUTTON', kind: 'button' },
  };
  const createWorld = () => ({
    zone: { id: 'snow', destination, destinationId: destination.id },
    getGroundHeight: () => 0,
  });

  const firstPlayer = { nearEvidence: true, nearContact: false };
  const firstFieldwork = new Fieldwork(new THREE.Scene(), firstPlayer, progressStore);
  firstFieldwork.setWorld(createWorld());
  firstFieldwork.activate();
  assert.equal(firstFieldwork.collect(), true);

  const returningPlayer = { nearEvidence: false, nearContact: true };
  const returningFieldwork = new Fieldwork(new THREE.Scene(), returningPlayer, progressStore);
  returningFieldwork.setWorld(createWorld());
  assert.equal(returningFieldwork.isReturning, true);
  assert.equal(returningFieldwork.deliver(), 30);

  const completedFieldwork = new Fieldwork(new THREE.Scene(), returningPlayer, progressStore);
  completedFieldwork.setWorld(createWorld());
  assert.equal(completedFieldwork.isComplete, true);
  assert.equal(completedFieldwork.fieldTokens, 30);
});

test('restores discovered destinations in the exploration journal', () => {
  const progressStore = new ProgressStore(createStorage());
  const journal = new ExplorerJournal(progressStore);
  assert.equal(journal.discover({
    destinationId: 'everest',
    destination: { mission: { item: 'BRASS BUTTON' } },
    landmark: { label: 'MOUNT EVEREST' },
  }), true);

  const restoredJournal = new ExplorerJournal(progressStore);
  assert.equal(restoredJournal.discoveredZones.has('everest'), true);
  assert.equal(restoredJournal.discoveredZones.size, 1);
});

test('mission saves preserve mini-game records, completions, and their token rewards', () => {
  const storage = createStorage();
  const progressStore = new ProgressStore(storage);
  progressStore.save({
    activeDestinations: new Set(),
    retrievedDestinations: new Set(),
    completedDestinations: new Set(),
    completedMinigames: new Set(['river-swim']),
    discoveredDestinations: new Set(),
    minigameRecords: { 'river-swim': 38.4 },
    fieldTokens: 15,
  });
  const destination = {
    id: 'everest',
    mission: { item: 'BRASS BUTTON', reward: 30 },
    evidence: { pos: [-16, -5], label: 'BRASS BUTTON', kind: 'button' },
  };
  const fieldwork = new Fieldwork(new THREE.Scene(), { nearEvidence: false }, progressStore);
  fieldwork.setWorld({
    zone: { id: 'snow', destination, destinationId: destination.id },
    getGroundHeight: () => 0,
  });
  fieldwork.activate();

  const restored = progressStore.load();
  assert.equal(restored.minigameRecords['river-swim'], 38.4);
  assert.equal(restored.completedMinigames.has('river-swim'), true);
  assert.equal(restored.fieldTokens, 15);
});
