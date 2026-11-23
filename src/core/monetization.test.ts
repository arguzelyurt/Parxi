/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_RULES,
  clampRules,
  coinsForLevel,
  initialAdState,
  onInterstitialShown,
  onLevelWon,
  piggyAfterLevel,
  rollDay,
  shouldShowInterstitial,
} from './monetization';

const ctx = { level: 20, won: true, isDaily: false, online: true, now: 10_000_000 };

test('adil reklam: ilk oturum ve ilk seviyelerde geçiş reklamı yok', () => {
  const s = { ...initialAdState('2026-11-22'), levelsSinceInterstitial: 5 };
  assert.equal(shouldShowInterstitial(s, ctx).show, false); // ilk oturum
  const s2 = { ...s, firstSession: false };
  assert.equal(shouldShowInterstitial(s2, { ...ctx, level: 5 }).show, false);
  assert.equal(shouldShowInterstitial(s2, ctx).show, true);
  assert.equal(shouldShowInterstitial({ ...s2, removeAds: true }, ctx).show, false);
});

test('adil reklam: sıklık ve bekleme', () => {
  let s = { ...initialAdState('d'), firstSession: false, levelsSinceInterstitial: 3 };
  s = onInterstitialShown(s, ctx.now);
  assert.equal(shouldShowInterstitial(s, ctx).show, false);
  s = onLevelWon(onLevelWon(onLevelWon(s)));
  assert.equal(shouldShowInterstitial(s, ctx).show, false); // 180 sn dolmadı
  assert.equal(shouldShowInterstitial(s, { ...ctx, now: ctx.now + 181_000 }).show, true);
});

test('uzaktan ayar adil sınırları aşamaz', () => {
  const r = clampRules({ firstInterstitialAfterLevel: 1, maxInterstitialsPerDay: 999, minSecondsBetweenAds: 'x' });
  assert.equal(r.firstInterstitialAfterLevel, 8);
  assert.equal(r.maxInterstitialsPerDay, 15);
  assert.equal(r.minSecondsBetweenAds, AD_RULES.minSecondsBetweenAds);
});

test('ekonomi', () => {
  assert.equal(coinsForLevel(3, false), 25);
  assert.equal(coinsForLevel(3, true), 50);
  assert.equal(piggyAfterLevel(0, 10), 0);
  assert.equal(piggyAfterLevel(2990, 40), 3000);
  assert.equal(rollDay({ ...initialAdState('a'), interstitialsToday: 4 }, 'b').interstitialsToday, 0);
});
