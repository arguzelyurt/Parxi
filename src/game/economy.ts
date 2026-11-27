// Oyuncu kaydı (Progress) üzerinde ekonomi işlemleri: elmas harcamaları, sandık, çark, kısım ödülü.
// Saf fonksiyonlar; yetmeyen bakiyede null döner (ekran "Elmas al"a yönlendirir).

import { prevKey } from '../core/daily';
import { rollChest, Reward, spinWheel, WHEEL, freeSpinReady } from '../core/chests';
import { itemById, MYSTERY_PRICE } from '../core/market';
import type { Booster } from '../core/monetization';
import {
  AD_MONEY,
  BOOST_MS,
  CHEST_COST,
  ChestKind,
  GEM_COST,
  GEM_REWARD,
  SHIELD_MAX,
  TICKET_REWARD,
  TRADE,
  WHEEL_COST,
} from '../core/prices';
import { earn, spend } from '../core/wallet';
import type { Progress } from './storage';

export const coinX2Active = (p: Progress, now: number) => p.boosts.coinX2Until > now;
export const infiniteLivesActive = (p: Progress, now: number) => p.boosts.infiniteLivesUntil > now;

/** Ödülü kayda işle: paralar, güçlendiriciler, kozmetik (garaja / dolaba girer, kullanılmaz) */
export function applyReward(p: Progress, r: Reward, why: string, now = Date.now()): Progress {
  let next = earn(p, { coins: r.coins, gems: r.gems, tickets: r.tickets }, why, now);
  if (r.boosters) {
    const b = { ...next.boosters };
    (Object.keys(r.boosters) as Booster[]).forEach((k) => (b[k] += r.boosters![k] ?? 0));
    next = { ...next, boosters: b };
  }
  if (r.item && itemById(r.item) && !next.owned.includes(r.item)) next = { ...next, owned: [...next.owned, r.item] };
  return next;
}

/** Süreli güç satın al: sınırsız can 30 dk / coin x2 15 dk (süre bitmeden alınırsa uzar; x2 üst üste binmez) */
export function buyBoost(p: Progress, kind: 'infiniteLives' | 'coinX2', now: number): Progress | null {
  const paid = spend(p, { gems: GEM_COST[kind] }, `boost:${kind}`, now);
  if (!paid) return null;
  const key = kind === 'infiniteLives' ? 'infiniteLivesUntil' : 'coinX2Until';
  const from = Math.max(now, p.boosts[key]);
  return { ...paid, boosts: { ...paid.boosts, [key]: from + BOOST_MS[kind] } };
}

export function buyShield(p: Progress): Progress | null {
  if (p.streakShield >= SHIELD_MAX) return null;
  const paid = spend(p, { gems: GEM_COST.shield }, 'shield');
  return paid && { ...paid, streakShield: paid.streakShield + 1 };
}

const dayGap = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** Seri bugün kırık mı ve 48 saat içinde onarılabilir mi (dün kaçırıldı, bugün daha oynanmadı) */
export function canRepairStreak(p: Progress, today: string): boolean {
  const last = p.daily.lastDoneKey;
  return !!last && p.daily.streak > 1 && last === prevKey(prevKey(today)) && p.streakShield === 0;
}

export function repairStreak(p: Progress, today: string): Progress | null {
  if (!canRepairStreak(p, today)) return null;
  const paid = spend(p, { gems: GEM_COST.repair }, 'streak:repair');
  return paid && { ...paid, daily: { ...paid.daily, lastDoneKey: prevKey(today) } };
}

/**
 * Günlük Otopark bitince yeni seri: kaçırılan günler koruyucuyla kapatılabilir.
 * Döner: yeni seri, harcanan koruyucu, seri kilometre taşı elması.
 */
export function streakAfterDaily(p: Progress, today: string): { streak: number; shields: number; gems: number } {
  const last = p.daily.lastDoneKey;
  if (last === today) return { streak: p.daily.streak, shields: 0, gems: 0 };
  let streak = 1;
  let shields = 0;
  if (last) {
    const missed = dayGap(last, today) - 1;
    if (missed <= 0) streak = p.daily.streak + 1;
    else if (missed <= p.streakShield) {
      streak = p.daily.streak + 1;
      shields = missed;
    }
  }
  const gems = (streak % 7 === 0 ? GEM_REWARD.streak7 : 0) + (streak % 30 === 0 ? GEM_REWARD.streak30 : 0);
  return { streak, shields, gems };
}

/** Tek yönlü takas: 10 elmas → 500 coin */
export function tradeGems(p: Progress): Progress | null {
  const paid = spend(p, { gems: TRADE.gems }, 'trade');
  return paid && earn(paid, { coins: TRADE.coins }, 'trade');
}

/** Sandık aç (ücretli ya da ödül olarak bedava) */
export function openChest(p: Progress, kind: ChestKind, free = false, r: () => number = Math.random): { p: Progress; reward: Reward } | null {
  const paid = free ? p : spend(p, CHEST_COST[kind], `chest:${kind}`);
  if (!paid) return null;
  const reward = rollChest(kind, paid.owned, r);
  return { p: applyReward(paid, reward, `chest:${kind}`), reward };
}

/** Şans çarkı: bugün ilk çevirme bedava, sonra 1 bilet */
export function spin(p: Progress, today: string, r: () => number = Math.random): { p: Progress; index: number } | null {
  const free = freeSpinReady(p.wheelDay, today);
  const paid = free ? { ...p, wheelDay: today } : spend(p, WHEEL_COST, 'wheel');
  if (!paid) return null;
  const index = spinWheel(r);
  return { p: applyReward(paid, WHEEL[index].reward, `wheel:${WHEEL[index].id}`), index };
}

/** Reklamla para (günde 5): 25 coin ya da 1 bilet */
export function adMoneyLeft(p: Progress, today: string): number {
  const used = p.adMoney.day === today ? p.adMoney.count : 0;
  return Math.max(0, AD_MONEY.perDay - used);
}

export function grantAdMoney(p: Progress, kind: 'coins' | 'tickets', today: string): Progress | null {
  const left = adMoneyLeft(p, today);
  if (!left) return null;
  const next = earn(p, kind === 'coins' ? { coins: AD_MONEY.coins } : { tickets: AD_MONEY.tickets }, `ad:${kind}`);
  return { ...next, adMoney: { day: today, count: AD_MONEY.perDay - left + 1 } };
}

/** Kısım açılış ödülü: Altın sandık + 2 bilet (bir kez) */
export function claimSection(p: Progress, section: number, r: () => number = Math.random): { p: Progress; reward: Reward } | null {
  if (p.sectionsClaimed.includes(section)) return null;
  const base = earn({ ...p, sectionsClaimed: [...p.sectionsClaimed, section] }, { tickets: TICKET_REWARD.section }, `section:${section}`);
  const chest = openChest(base, 'gold', true, r)!;
  return { p: chest.p, reward: { ...chest.reward, tickets: (chest.reward.tickets ?? 0) + TICKET_REWARD.section } };
}

/** Tıkanınca elmasla devam (+1 yer): 15 elmas */
export const payContinue = (p: Progress): Progress | null => spend(p, { gems: GEM_COST.continue }, 'continue');

/** Sürpriz kutu artık bir Gümüş sandık açar; coin fiyatı (1.500) kalır, bileti olmayan da açabilir */
export function openMystery(p: Progress, r: () => number = Math.random): { p: Progress; reward: Reward } | null {
  const paid = spend(p, { coins: MYSTERY_PRICE }, 'mystery');
  if (!paid) return null;
  const reward = rollChest('silver', paid.owned, r);
  return { p: applyReward(paid, reward, 'mystery'), reward };
}

/** Aynı rastgele sonucu iki kez üretmek için (önce ekrana, sonra kayda): tohumlu sayı üreteci */
export function seeded(seed: number): () => number {
  let a = Math.floor(seed * 4294967296) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
