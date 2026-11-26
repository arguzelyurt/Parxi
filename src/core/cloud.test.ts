/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { differs, isAhead, mergeSaves, SaveLike } from './cloud';

const save = (level: number, extra: Partial<SaveLike & { coins: number }> = {}) => ({
  level,
  coins: 100,
  stars: {},
  lastSeenAt: 1000,
  processedPurchases: [],
  owned: [],
  skipRewarded: false,
  ads: { removeAds: false },
  ...extra,
});

test('ileri olan kazanır: seviye, sonra yıldız, sonra yenilik', () => {
  assert.ok(isAhead(save(10), save(9)));
  assert.ok(isAhead(save(5, { stars: { L1: 3 } }), save(5, { stars: { L1: 2 } })));
  assert.ok(isAhead(save(5, { lastSeenAt: 2000 }), save(5)));
  assert.ok(!isAhead(save(5), save(5, { lastSeenAt: 2000 })));
});

test('birleştirme: coin toplanmaz, satın almalar ve kozmetikler birleşir, yıldızlar en yüksek', () => {
  const local = save(12, { coins: 500, processedPurchases: ['a'], owned: ['car:alev'], stars: { L1: 1, L2: 3 } });
  const remote = save(8, { coins: 9000, processedPurchases: ['b'], owned: ['theme:kar'], stars: { L1: 3 }, ads: { removeAds: true } });
  const m = mergeSaves(local, remote);
  assert.equal(m.level, 12);
  assert.equal(m.coins, 500);
  assert.deepEqual(m.processedPurchases.sort(), ['a', 'b']);
  assert.deepEqual(m.owned.sort(), ['car:alev', 'theme:kar']);
  assert.deepEqual(m.stars, { L1: 3, L2: 3 });
  assert.equal(m.ads.removeAds, true);
});

test('farklı mı', () => {
  assert.ok(differs(save(3), save(4)));
  assert.ok(!differs(save(3), save(3, { coins: 999 })));
});
