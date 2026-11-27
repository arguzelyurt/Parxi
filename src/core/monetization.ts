// Reklam ve ekonomi kuralları (Glugo'dan uyarlandı). Saf mantık: SDK'lar (AdMob, mağaza)
// services/ altında bunun önüne bağlanır. Remote Config yalnızca FAIR_BOUNDS içinde oynar.

import { t } from '../i18n';

export interface AdRules {
  firstInterstitialAfterLevel: number;
  levelsBetweenInterstitials: number;
  minSecondsBetweenAds: number;
  maxInterstitialsPerDay: number;
  noAdsHoursAfterPurchase: number;
  maxRewardedPerDay: number;
}

export const AD_RULES: AdRules = {
  firstInterstitialAfterLevel: 10,
  levelsBetweenInterstitials: 3,
  minSecondsBetweenAds: 180,
  maxInterstitialsPerDay: 12,
  noAdsHoursAfterPurchase: 24,
  maxRewardedPerDay: 20,
};

/**
 * "Adil reklam" sözünün sınırları. Uzaktan ayar bu sınırların dışına çıkamaz:
 * ne kadar agresif bir değer gelirse gelsin en kötü bu kadar sık reklam gösterilir.
 */
export const FAIR_BOUNDS: Record<keyof AdRules, [min: number, max: number]> = {
  firstInterstitialAfterLevel: [8, 40],
  levelsBetweenInterstitials: [2, 10],
  minSecondsBetweenAds: [90, 900],
  maxInterstitialsPerDay: [0, 15],
  noAdsHoursAfterPurchase: [12, 72],
  maxRewardedPerDay: [5, 30],
};

export function clampRules(remote: Partial<Record<keyof AdRules, unknown>>): AdRules {
  const out = { ...AD_RULES };
  (Object.keys(FAIR_BOUNDS) as (keyof AdRules)[]).forEach((k) => {
    const v = Number(remote[k]);
    if (remote[k] === undefined || remote[k] === '' || !Number.isFinite(v)) return;
    const [lo, hi] = FAIR_BOUNDS[k];
    out[k] = Math.round(Math.min(hi, Math.max(lo, v)));
  });
  return out;
}

export const ECONOMY = {
  levelComplete: 10,
  perStar: 5,
  hardMultiplier: 2,
  /** Günlük Otopark ödülü ve her 7 günlük seride bonus */
  daily: 30,
  streak7Bonus: 100,
  /** Güçlendirici fiyatları (coin) */
  prices: { undo: 30, hint: 50, crane: 80, extraSlot: 150 },
  /** Tıkanınca ödüllü reklamla +1 rıhtım yeri: günde en fazla */
  rescueAdsPerDay: 3,
  /** Elmas kumbarası: seviye başına 1 elmas, 300'de dolar */
  piggy: { perLevel: 1, cap: 300, unlockLevel: 30 },
  /** Başlangıç paketi bu seviyeden sonra 48 saatliğine açılır */
  starterUnlockLevel: 15,
} as const;

export type Booster = keyof typeof ECONOMY.prices;

/** Güçlendiricinin ekranda görünen adı (dile göre) */
export const boosterName = (k: Booster): string => t(`booster.${k}`);

export interface AdState {
  /** Bugünün UTC günü (YYYY-MM-DD); gün değişince sayaçlar sıfırlanır. */
  day: string;
  interstitialsToday: number;
  rewardedToday: number;
  levelsSinceInterstitial: number;
  lastAdAt: number;
  lastPurchaseAt: number;
  removeAds: boolean;
  firstSession: boolean;
}

export const initialAdState = (day: string): AdState => ({
  day,
  interstitialsToday: 0,
  rewardedToday: 0,
  levelsSinceInterstitial: 0,
  lastAdAt: 0,
  lastPurchaseAt: 0,
  removeAds: false,
  firstSession: true,
});

export function rollDay(s: AdState, day: string): AdState {
  return s.day === day ? s : { ...s, day, interstitialsToday: 0, rewardedToday: 0 };
}

export interface LevelEndContext {
  level: number;
  won: boolean;
  isDaily: boolean;
  online: boolean;
  now: number;
}

export type AdDecision = { show: true } | { show: false; reason: string };

/** Seviye bitiş ekranından "Sonraki"ye basınca çağrılır. Oyun ortasında asla çağrılmaz. */
export function shouldShowInterstitial(s: AdState, c: LevelEndContext, R: AdRules = AD_RULES): AdDecision {
  if (s.removeAds) return { show: false, reason: 'remove-ads' };
  if (!c.won) return { show: false, reason: 'after-loss' };
  if (c.isDaily) return { show: false, reason: 'daily' };
  if (!c.online) return { show: false, reason: 'offline' };
  if (s.firstSession) return { show: false, reason: 'first-session' };
  if (c.level <= R.firstInterstitialAfterLevel) return { show: false, reason: 'early-levels' };
  if (s.lastPurchaseAt && c.now - s.lastPurchaseAt < R.noAdsHoursAfterPurchase * 3600_000)
    return { show: false, reason: 'recent-purchase' };
  if (s.interstitialsToday >= R.maxInterstitialsPerDay) return { show: false, reason: 'daily-cap' };
  if (s.levelsSinceInterstitial < R.levelsBetweenInterstitials) return { show: false, reason: 'frequency' };
  if (c.now - s.lastAdAt < R.minSecondsBetweenAds * 1000) return { show: false, reason: 'cooldown' };
  return { show: true };
}

export const onLevelWon = (s: AdState): AdState => ({
  ...s,
  levelsSinceInterstitial: s.levelsSinceInterstitial + 1,
});

export const onInterstitialShown = (s: AdState, now: number): AdState => ({
  ...s,
  interstitialsToday: s.interstitialsToday + 1,
  levelsSinceInterstitial: 0,
  lastAdAt: now,
});

/** Ödüllü reklam da bekleme sayacını sıfırlar: art arda reklam görülmesin. */
export const onRewardedShown = (s: AdState, now: number): AdState => ({
  ...s,
  rewardedToday: s.rewardedToday + 1,
  lastAdAt: now,
});

export const canShowRewarded = (s: AdState, R: AdRules = AD_RULES): boolean => s.rewardedToday < R.maxRewardedPerDay;

export function coinsForLevel(stars: number, hard: boolean): number {
  return (ECONOMY.levelComplete + stars * ECONOMY.perStar) * (hard ? ECONOMY.hardMultiplier : 1);
}

export function piggyAfterLevel(piggy: number, level: number): number {
  if (level < ECONOMY.piggy.unlockLevel) return piggy;
  return Math.min(ECONOMY.piggy.cap, piggy + ECONOMY.piggy.perLevel);
}

/** Mağaza ürün kimlikleri; App Store Connect ve Play Console'da aynen açılacak. */
export const PRODUCTS = {
  removeAds: { id: 'parxi.remove_ads', type: 'non-consumable', usd: 4.99 },
  supporter: { id: 'parxi.supporter', type: 'non-consumable', usd: 9.99 },
  starter: { id: 'parxi.starter_pack', type: 'consumable', usd: 1.99 },
  piggy: { id: 'parxi.piggy_bank', type: 'consumable', usd: 2.99 },
  gems80: { id: 'parxi.gems_80', type: 'consumable', usd: 0.99 },
  gems500: { id: 'parxi.gems_500', type: 'consumable', usd: 4.99 },
  gems1200: { id: 'parxi.gems_1200', type: 'consumable', usd: 9.99 },
  gems2800: { id: 'parxi.gems_2800', type: 'consumable', usd: 19.99 },
} as const;

/** Artık satılmayan eski ürünler: yarım kalmış satın alma gelirse yine işlenir */
export const LEGACY_PRODUCTS: Record<string, { coins?: number; boosters?: Partial<Record<Booster, number>> }> = {
  'parxi.rescue': { boosters: { extraSlot: 2, hint: 1 } },
  'parxi.coins_500': { coins: 500 },
  'parxi.coins_1800': { coins: 1800 },
  'parxi.coins_5500': { coins: 5500 },
  'parxi.coins_16000': { coins: 16000 },
};

/** Paketlerin içeriği */
export const GEM_PACKS = { gems80: 80, gems500: 500, gems1200: 1200, gems2800: 2800 } as const;
export const STARTER_PACK = { gems: 300, coins: 2000, tickets: 3, boosters: { extraSlot: 2, crane: 2, hint: 3 } } as const;
export const SUPPORTER_GEMS = 500;
