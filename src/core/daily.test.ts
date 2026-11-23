/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyShareText, nextStreak, prevKey, streakAlive } from './daily';
import { dailyKey, dailyLevel } from './generator';

test('önceki gün, ay ve yıl geçişi', () => {
  assert.equal(prevKey('2026-11-22'), '2026-11-21');
  assert.equal(prevKey('2026-03-01'), '2026-02-28');
  assert.equal(prevKey('2027-01-01'), '2026-12-31');
});

test('seri', () => {
  assert.equal(nextStreak(null, 0, '2026-11-22'), 1);
  assert.equal(nextStreak('2026-11-21', 4, '2026-11-22'), 5);
  assert.equal(nextStreak('2026-11-22', 5, '2026-11-22'), 5);
  assert.equal(nextStreak('2026-11-19', 9, '2026-11-22'), 1);
  assert.equal(streakAlive('2026-11-21', '2026-11-22'), true);
  assert.equal(streakAlive('2026-11-20', '2026-11-22'), false);
});

test('paylaşım metni', () => {
  const t = dailyShareText('2026-11-22', 2, 14, 1, 3);
  assert.match(t, /22\.11\.2026/);
  assert.match(t, /★★☆/);
  assert.match(t, /3 günlük seri/);
});

test('günlük bulmaca herkese aynı, her gün farklı', () => {
  assert.equal(dailyKey(new Date('2026-11-22T23:00:00Z')), '2026-11-22');
  assert.deepEqual(dailyLevel('2026-11-22'), dailyLevel('2026-11-22'));
  assert.notDeepEqual(dailyLevel('2026-11-22').vehicles, dailyLevel('2026-11-23').vehicles);
});
