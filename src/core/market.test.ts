/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyItem, DEFAULT_COSMETICS, equipItem, MARKET, ownsItem, Wallet } from './market';
import { ECONOMY } from './monetization';

const wallet = (coins: number): Wallet => ({
  coins,
  boosters: { undo: 0, hint: 0, crane: 0, extraSlot: 0 },
  owned: [],
  cosmetics: { ...DEFAULT_COSMETICS },
});

test('kimlikler benzersiz, varsayılanlar ücretsiz', () => {
  assert.equal(new Set(MARKET.map((m) => m.id)).size, MARKET.length);
  for (const id of Object.values(DEFAULT_COSMETICS)) assert.ok(MARKET.find((m) => m.id === id)?.free);
});

test('paketler tek tek almaktan ucuz', () => {
  for (const m of MARKET) {
    if (!m.booster) continue;
    assert.ok(m.price < ECONOMY.prices[m.booster.kind] * m.booster.count, m.id);
  }
});

test('güçlendirici paketi coin düşer, envanter artar, tekrar alınabilir', () => {
  let r = buyItem(wallet(300), 'pack:hint3');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.wallet.coins, 170);
  assert.equal(r.wallet.boosters.hint, 3);
  r = buyItem(r.wallet, 'pack:hint3');
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.wallet.boosters.hint, 6);
  const mix = buyItem(wallet(500), 'pack:mix');
  assert.ok(mix.ok && mix.wallet.boosters.crane === 2 && mix.wallet.boosters.extraSlot === 1);
});

test('kozmetik: yetersiz coin, satın al ve kullan, ikinci kez alınmaz', () => {
  assert.deepEqual(buyItem(wallet(100), 'theme:neon'), { ok: false, reason: 'coins' });
  const r = buyItem(wallet(2000), 'theme:neon');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.wallet.coins, 500);
  assert.equal(r.wallet.cosmetics.theme, 'theme:neon');
  assert.deepEqual(buyItem(r.wallet, 'theme:neon'), { ok: false, reason: 'owned' });
  const back = equipItem(r.wallet, 'theme:gece');
  assert.equal(back.cosmetics.theme, 'theme:gece');
  // Sahip olunmayanı kullanamaz
  assert.equal(equipItem(back, 'car:neon').cosmetics.car, 'car:klasik');
  assert.ok(ownsItem(back, MARKET.find((m) => m.id === 'car:klasik')!));
});
