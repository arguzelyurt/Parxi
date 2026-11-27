import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAfford, earn, logTotals, spend, Purse3 } from './wallet';
import { CHESTS, chestOdds, rollChest, spinWheel, WHEEL, freeSpinReady } from './chests';
import { RARITIES } from './market';
import { applyWeekly, canClaimWeekly, claimWeekly, ensureWeekly, freshWeekly, WEEKLY_COUNT } from './weekly';
import { localDay, localWeek, msToLocalMidnight, msToNextWeek, prevDay } from './time';
import { claimMission, ensureMissions, freshMissions, missionsFor } from './missions';
import { mulberry32 } from './rng';
import { mapReward, pendingSection, sectionOf, mapFirst } from './maps';
import { applyPriceConfig, CHEST_COST, gemPriceFor, GEM_COST, TRADE } from './prices';
import { buyBoost, buyShield, claimSection, grantAdMoney, openChest, spin, streakAfterDaily, tradeGems, canRepairStreak, repairStreak, seeded } from '../game/economy';
import { applyPurchase } from '../game/purchases';
import type { Progress } from '../game/storage';

const purse = (c = 0, g = 0, k = 0): Purse3 => ({ coins: c, gems: g, tickets: k, walletLog: [] });

test('cüzdan: kazan/harca, bakiye = kayıtların toplamı', () => {
  let p = purse();
  p = earn(p, { coins: 100, gems: 20, tickets: 3 }, 'a');
  p = spend(p, { gems: 15 }, 'b')!;
  p = earn(p, { coins: -50 }, 'negatif yok sayılır');
  assert.deepEqual(logTotals(p.walletLog), { coins: p.coins, gems: p.gems, tickets: p.tickets });
  assert.equal(spend(p, { gems: 6 }, 'c'), null);
  assert.equal(canAfford(p, { coins: 100, gems: 5 }), true);
  for (let i = 0; i < 260; i++) p = earn(p, { coins: 1 }, 'x');
  assert.equal(p.walletLog.length, 200);
});

test('sandık olasılıkları toplamı 100, ödüller tabloda', () => {
  for (const k of ['bronze', 'silver', 'gold'] as const) {
    assert.equal(RARITIES.reduce((s, r) => s + CHESTS[k].itemRarity[r], 0), 100);
    const o = chestOdds(k);
    assert.ok(o.gems >= 0 && o.gems <= 100 && o.item >= 0 && o.item <= 100);
    const r = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const x = rollChest(k, [], r);
      assert.ok(x.coins! >= CHESTS[k].coins[0] && x.coins! <= CHESTS[k].coins[1]);
    }
  }
  // Altın sandık her zaman kozmetik verir (bitmişse elmas)
  const r = mulberry32(3);
  for (let i = 0; i < 50; i++) assert.ok(rollChest('gold', [], r).item);
  assert.equal(WHEEL.reduce((s, w) => s + w.weight, 0), 100);
  const counts = WHEEL.map(() => 0);
  const rr = mulberry32(11);
  for (let i = 0; i < 20000; i++) counts[spinWheel(rr)]++;
  assert.ok(Math.abs(counts[0] / 20000 - 0.28) < 0.02);
});

test('çark: günde 1 bedava, sonra bilet', () => {
  assert.equal(freeSpinReady(null, '2026-11-27'), true);
  assert.equal(freeSpinReady('2026-11-27', '2026-11-27'), false);
  let p = base({ tickets: 1 });
  const a = spin(p, '2026-11-27', seeded(0.4))!;
  assert.equal(a.p.wheelDay, '2026-11-27');
  p = a.p;
  const ticketsBefore = p.tickets;
  const b = spin(p, '2026-11-27', seeded(0.1))!;
  assert.ok(b.p.tickets <= ticketsBefore - 1 + 1); // bilet harcandı (çarktan bilet çıkmış olabilir)
  assert.equal(spin({ ...b.p, tickets: 0 }, '2026-11-27'), null);
});

test('yerel gün ve hafta', () => {
  const t = new Date(2026, 10, 27, 23, 30).getTime(); // Cuma 23:30
  assert.equal(localDay(t), '2026-11-27');
  assert.equal(localWeek(t), '2026-11-23');
  assert.equal(msToLocalMidnight(t), 30 * 60_000);
  assert.equal(localWeek(new Date(2026, 10, 30, 0, 1).getTime()), '2026-11-30');
  assert.ok(msToNextWeek(t) > 2 * 86400_000);
  assert.equal(prevDay('2026-03-01'), '2026-02-28');
});

test('görevler: büyük görev elmas verir, toplanmayan ödül silinir ve hatırlatılır', () => {
  const day = '2026-11-27';
  const ms = missionsFor(day);
  assert.equal(ms.filter((m) => m.gems).length, 1);
  let s = freshMissions(day);
  const big = s.missions.findIndex((m) => m.gems);
  s = { ...s, progress: s.missions.map((m) => m.target) };
  const r = claimMission(s, big);
  assert.equal(r.gems, 2);
  const next = ensureMissions(r.state, '2026-11-28');
  assert.equal(next.missed, s.missions.length - 1);
  assert.equal(next.progress.every((v) => v === 0), true);
  assert.equal(ensureMissions(next, '2026-11-28'), next);
});

test('haftalık görevler: ilerleme, ödül, pazartesi sıfırlama', () => {
  let w = freshWeekly('2026-11-23');
  assert.equal(w.missions.length, WEEKLY_COUNT);
  for (let i = 0; i < 60; i++) w = applyWeekly(w, { stars: 3, hard: true, passengers: 40, buses: 2, level: true, firstDaily: true, mapDone: true });
  assert.ok(w.missions.every((_, i) => canClaimWeekly(w, i)));
  const c = claimWeekly(w, 0);
  assert.ok(c.gems >= 10 && c.tickets === 1);
  assert.equal(claimWeekly(c.state, 0).gems, 0);
  const n = ensureWeekly(c.state, '2026-11-30');
  assert.equal(n.missed, WEEKLY_COUNT - 1);
});

test('harita elması ve kısım töreni', () => {
  assert.equal(mapReward(0).gems, 10);
  assert.equal(mapReward(5).gems, 20);
  assert.equal(sectionOf(1), 0);
  assert.equal(sectionOf(mapFirst(3)), 1);
  assert.equal(pendingSection(mapFirst(3), []), 1);
  assert.equal(pendingSection(mapFirst(3), [1]), null);
  assert.equal(pendingSection(5, []), null);
  const p = base({});
  const a = claimSection(p, 1, seeded(0.3))!;
  assert.equal(a.p.tickets, p.tickets + 2 + (a.reward.tickets! - 2));
  assert.ok(a.reward.item || a.reward.gems);
  assert.equal(claimSection(a.p, 1), null); // bir kez
});

test('elmas harcamaları ve sınırlar', () => {
  let p = base({ gems: 200 });
  const now = 1_000_000;
  p = buyBoost(p, 'coinX2', now)!;
  assert.equal(p.gems, 200 - GEM_COST.coinX2);
  assert.equal(p.boosts.coinX2Until, now + 15 * 60_000);
  p = buyBoost(p, 'coinX2', now + 60_000)!; // süre uzar, üst üste binmez
  assert.equal(p.boosts.coinX2Until, now + 30 * 60_000);
  p = { ...p, gems: 500 };
  p = buyShield(buyShield(buyShield(p)!)!)!;
  assert.equal(p.streakShield, 3);
  assert.equal(buyShield(p), null);
  const t = tradeGems({ ...p, gems: 10 })!;
  assert.equal(t.gems, 0);
  assert.equal(t.coins, p.coins + TRADE.coins);
  assert.equal(tradeGems(t), null); // tek yön, elmas kalmadı
  assert.equal(gemPriceFor({ kind: 'booster', price: 100, rarity: 'common' }), null);
  assert.equal(gemPriceFor({ kind: 'car', price: 500, rarity: 'common' }), null);
  assert.equal(gemPriceFor({ kind: 'garage', price: 9000, rarity: 'legend' }), 350);
});

test('seri koruyucu kaçırılan günü kapatır; onarma 48 saat içinde', () => {
  const p = base({ daily: { lastDoneKey: '2026-11-25', streak: 6, stars: {} }, streakShield: 1 });
  const a = streakAfterDaily(p, '2026-11-27');
  assert.deepEqual(a, { streak: 7, shields: 1, gems: 5 });
  const noShield = streakAfterDaily({ ...p, streakShield: 0 }, '2026-11-27');
  assert.equal(noShield.streak, 1);
  const q = { ...p, streakShield: 0, gems: 200 };
  assert.equal(canRepairStreak(q, '2026-11-27'), true);
  const r = repairStreak(q, '2026-11-27')!;
  assert.equal(r.daily.lastDoneKey, '2026-11-26');
  assert.equal(streakAfterDaily(r, '2026-11-27').streak, 7);
  assert.equal(canRepairStreak(q, '2026-11-28'), false);
});

test('reklamla para günde 5; sandık bedeli düşülür', () => {
  let p = base({});
  for (let i = 0; i < 5; i++) p = grantAdMoney(p, 'tickets', 'd')!;
  assert.equal(p.tickets, 6);
  assert.equal(grantAdMoney(p, 'coins', 'd'), null);
  assert.ok(grantAdMoney(p, 'coins', 'e'));
  const c = openChest({ ...p, tickets: 5 }, 'gold', false, seeded(0.5))!;
  assert.equal(c.p.tickets, 0 + (c.reward.tickets ?? 0));
  assert.equal(openChest({ ...p, coins: 10 }, 'bronze'), null);
});

test('satın almalar: elmas paketleri, başlangıç paketi, eski coin ürünü', () => {
  let p = base({});
  p = applyPurchase(p, 'parxi.gems_500', 'a', 0);
  assert.equal(p.gems, 520);
  assert.equal(applyPurchase(p, 'parxi.gems_500', 'a', 0), p);
  p = applyPurchase(p, 'parxi.starter_pack', 'b', 0);
  assert.equal(p.gems, 820);
  assert.equal(p.tickets, 4);
  const c = p.coins;
  p = applyPurchase(p, 'parxi.coins_500', 'c', 0);
  assert.equal(p.coins, c + 500);
  p = applyPurchase({ ...p, piggy: 300 }, 'parxi.piggy_bank', 'd', 0);
  assert.equal(p.gems, 1120);
  assert.equal(p.piggy, 0);
});

function base(over: Partial<Progress>): Progress {
  return {
    version: 2,
    level: 1,
    coins: 1000,
    gems: 20,
    tickets: 1,
    walletLog: [],
    piggy: 0,
    stars: {},
    boosters: { undo: 0, hint: 0, crane: 0, extraSlot: 0 },
    colorBlind: false,
    speed: 'normal',
    lang: 'tr',
    owned: [],
    cosmetics: { theme: 'theme:gece', car: 'car:klasik', rider: 'rider:klasik', stop: 'stop:klasik', fx: 'fx:sade' },
    setsClaimed: [],
    gift: { day: null, streak: 0 },
    lives: { count: 5, since: 0 },
    seenCars: [],
    seenMapLevel: 1,
    marketSeenDay: null,
    marketSeenVersion: 0,
    cloudSyncedAt: 0,
    accountPrompted: false,
    favoriteCar: 'altin',
    tutorialDone: true,
    seenIntro: [],
    mapsClaimed: [],
    daily: { lastDoneKey: null, streak: 0, stars: {} },
    ads: { day: 'd', interstitialsToday: 0, rewardedToday: 0, levelsSinceInterstitial: 0, lastAdAt: 0, lastPurchaseAt: 0, removeAds: false, firstSession: false },
    skipRewarded: false,
    rescueAdsToday: { day: 'd', count: 0 },
    starterOfferAt: 0,
    starterBought: false,
    removeAdsPrompted: false,
    processedPurchases: [],
    missions: null,
    weekly: null,
    streakShield: 0,
    boosts: { infiniteLivesUntil: 0, coinX2Until: 0 },
    wheelDay: null,
    adMoney: { day: 'd', count: 0 },
    sectionsClaimed: [],
    economyV: 1,
    notifAsked: true,
    lastSeenAt: 0,
    ...over,
  };
}

test('uzaktan fiyat ayarı güvenli aralıkta kalır', () => {
  applyPriceConfig({ price_continue: 1, price_coinX2: 30, price_gold: 99, price_bronze: 'bozuk' });
  assert.equal(GEM_COST.continue, 10);
  assert.equal(GEM_COST.coinX2, 30);
  assert.deepEqual(CHEST_COST.gold, { tickets: 8 });
  assert.deepEqual(CHEST_COST.bronze, { coins: 400 });
  applyPriceConfig({});
  assert.equal(GEM_COST.continue, 15);
  assert.deepEqual(CHEST_COST.gold, { tickets: 5 });
});
