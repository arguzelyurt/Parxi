/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimMap, mapAt, mapCompletedAt, mapOfLevel, mapReward, MAP_COUNT } from './maps';

test('harita boyutları: 1. harita 10 seviye, 5. harita 60. seviyede biter', () => {
  assert.deepEqual([mapAt(0).first, mapAt(0).last], [1, 10]);
  assert.deepEqual([mapAt(1).first, mapAt(1).last], [11, 21]);
  assert.equal(mapAt(4).last, 60);
  for (let i = 1; i < MAP_COUNT + 5; i++) assert.equal(mapAt(i).first, mapAt(i - 1).last + 1);
});

test('seviyenin haritası ve tamamlanma', () => {
  assert.equal(mapOfLevel(1).index, 0);
  assert.equal(mapOfLevel(10).index, 0);
  assert.equal(mapOfLevel(11).index, 1);
  assert.equal(mapOfLevel(60).index, 4);
  assert.equal(mapCompletedAt(10)?.index, 0);
  assert.equal(mapCompletedAt(9), null);
  assert.equal(mapCompletedAt(60)?.index, 4);
  assert.equal(mapOfLevel(5000).last >= 5000, true);
});

test('ödüller büyür ve bir kez verilir', () => {
  for (let i = 1; i < MAP_COUNT; i++) assert.ok(mapReward(i).coins > mapReward(i - 1).coins);
  const p = { coins: 0, boosters: { undo: 0, hint: 0, crane: 0, extraSlot: 0 }, mapsClaimed: [] as number[] };
  const a = claimMap(p, 4);
  assert.equal(a.coins, mapReward(4).coins);
  assert.equal(a.boosters.extraSlot, 1);
  assert.equal(claimMap(a, 4), a);
});
