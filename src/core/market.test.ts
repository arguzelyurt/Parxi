/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buyItem,
  claimGift,
  collectionCount,
  dailyDeals,
  DEFAULT_COSMETICS,
  equipItem,
  giftStreakFor,
  itemsOf,
  MARKET,
  MEGA_PACK,
  msToNextDay,
  MYSTERY_PRICE,
  mysteryOdds,
  openMysteryBox,
  ownsItem,
  priceFor,
  SET_BONUS,
  Wallet,
} from './market';
import { SPECIAL_CARS } from './garage';
import { mulberry32 } from './rng';
import { ECONOMY } from './monetization';

const wallet = (coins: number): Wallet => ({
  coins,
  boosters: { undo: 0, hint: 0, crane: 0, extraSlot: 0 },
  owned: [],
  cosmetics: { ...DEFAULT_COSMETICS },
  setsClaimed: [],
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
  assert.equal(r.wallet.coins, 2000 - MARKET.find((m) => m.id === 'theme:neon')!.price);
  assert.equal(r.wallet.cosmetics.theme, 'theme:neon');
  assert.deepEqual(buyItem(r.wallet, 'theme:neon'), { ok: false, reason: 'owned' });
  const back = equipItem(r.wallet, 'theme:gece');
  assert.equal(back.cosmetics.theme, 'theme:gece');
  // Sahip olunmayanı kullanamaz
  assert.equal(equipItem(back, 'car:neon').cosmetics.car, 'car:klasik');
  assert.ok(ownsItem(back, MARKET.find((m) => m.id === 'car:klasik')!));
});

test('mega paket tek tek almaktan ucuz', () => {
  const single = (Object.keys(MEGA_PACK) as (keyof typeof MEGA_PACK)[]).reduce((s, k) => s + ECONOMY.prices[k] * MEGA_PACK[k], 0);
  assert.ok(MARKET.find((m) => m.id === 'pack:mega')!.price < single);
});

test('her kategoride bir ücretsiz varsayılan (garaj hariç), fiyat bantları nadirliğe uygun', () => {
  for (const k of ['car', 'rider', 'theme', 'stop', 'fx'] as const) assert.equal(itemsOf(k).filter((m) => m.free).length, 1, k);
  const band = { common: [400, 900], rare: [900, 2100], epic: [2500, 5000], legend: [6000, 12000] };
  for (const m of MARKET) {
    if (m.kind === 'booster' || m.free) continue;
    const [a, b] = band[m.rarity];
    assert.ok(m.price >= a && m.price <= b, `${m.id} ${m.price}`);
  }
  // Garaj ürünleri garajdaki özel arabalarla eşleşir
  assert.deepEqual(itemsOf('garage').map((m) => m.id.split(':')[1]).sort(), SPECIAL_CARS.map((c) => c.key).sort());
});

test('günün fırsatları: aynı gün aynı, gün değişince değişir; fiyat indirimli', () => {
  const w = wallet(0);
  const a = dailyDeals('2026-11-25', w);
  assert.deepEqual(a, dailyDeals('2026-11-25', w));
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map((d) => d.item.id)).size, 3);
  const days = new Set(Array.from({ length: 10 }, (_, i) => dailyDeals(`2026-12-${10 + i}`, w).map((d) => d.item.id).join()));
  assert.ok(days.size > 5);
  for (const d of a) {
    assert.ok(d.price < d.item.price);
    assert.equal(priceFor(w, d.item, '2026-11-25'), d.price);
  }
  // Bir şey satın alınca günün fırsatları değişmez
  assert.deepEqual(dailyDeals('2026-11-25', { owned: [a[0].item.id] }), a);
  // Satın alırken fırsat fiyatı uygulanır
  const cos = a.find((d) => d.item.kind !== 'booster')!;
  const r = buyItem(wallet(cos.price), cos.item.id, '2026-11-25');
  assert.ok(r.ok && r.wallet.coins === 0);
});

test('gece yarısına kalan süre', () => {
  assert.equal(msToNextDay(Date.UTC(2026, 10, 25, 23, 0, 0)), 3600000);
});

test('set ödülü: kategorinin hepsi alınınca bir kez', () => {
  let w = wallet(100000);
  let bonus = 0;
  for (const m of itemsOf('stop')) {
    if (m.free) continue;
    const r = buyItem(w, m.id);
    assert.ok(r.ok);
    if (!r.ok) return;
    w = r.wallet;
    bonus += r.setBonus;
  }
  assert.equal(bonus, SET_BONUS.stop);
  assert.ok(w.setsClaimed.includes('stop'));
  assert.deepEqual(collectionCount(w, 'stop'), { owned: 5, total: 5 });
});

test('sürpriz kutu: olasılıklar toplamı 100, sahip olunmayan verir, hepsi alınınca kapanır', () => {
  const w = wallet(1000000);
  const o = mysteryOdds(w);
  assert.ok(Math.abs(o.common + o.rare + o.epic + o.legend - 100) < 0.5);
  assert.deepEqual(openMysteryBox(wallet(10)), { ok: false, reason: 'coins' });
  let cur = w;
  const rnd = mulberry32(42);
  const seen = new Set<string>();
  for (;;) {
    const r = openMysteryBox(cur, rnd);
    if (!r.ok) {
      assert.equal(r.reason, 'empty');
      break;
    }
    assert.ok(!seen.has(r.item.id) && !ownsItem(cur, r.item));
    seen.add(r.item.id);
    assert.equal(r.wallet.coins, cur.coins - MYSTERY_PRICE + r.setBonus);
    cur = r.wallet;
  }
  assert.equal(seen.size, MARKET.filter((m) => m.kind !== 'booster' && !m.free).length);
  const odds = mysteryOdds(cur);
  assert.equal(odds.common + odds.rare + odds.epic + odds.legend, 0);
});

test('günlük hediye: günde bir, seri artar, gün atlanırsa başa döner', () => {
  let w = wallet(0);
  let g = { day: null as string | null, streak: 0 };
  const a = claimGift(w, g, '2026-11-25')!;
  assert.equal(a.gift.streak, 1);
  assert.equal(a.wallet.coins, 50);
  assert.equal(claimGift(a.wallet, a.gift, '2026-11-25'), null);
  const b = claimGift(a.wallet, a.gift, '2026-11-26')!;
  assert.equal(b.gift.streak, 2);
  const c = claimGift(b.wallet, b.gift, '2026-11-26') ?? claimGift(b.wallet, b.gift, '2026-11-27')!;
  assert.equal(c.gift.streak, 3);
  assert.equal(c.wallet.boosters.hint, 1);
  assert.equal(giftStreakFor(c.gift, '2026-11-30'), 1);
  w = c.wallet;
  g = c.gift;
  assert.ok(w && g);
});
