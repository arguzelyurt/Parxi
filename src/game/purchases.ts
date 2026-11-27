// Satın alınan ürünün oyuna etkisi. Saf fonksiyon: aynı satın alma kimliği ikinci kez gelirse
// (iOS yeniden oynatma, geri yükleme) hiçbir şey değişmez.

import { Booster, GEM_PACKS, LEGACY_PRODUCTS, PRODUCTS, STARTER_PACK, SUPPORTER_GEMS } from '../core/monetization';
import { earn } from '../core/wallet';
import type { Progress } from './storage';

export type ProductKey = keyof typeof PRODUCTS;

export const productKeyById = (id: string): ProductKey | undefined =>
  (Object.keys(PRODUCTS) as ProductKey[]).find((k) => PRODUCTS[k].id === id);


export function applyPurchase(p: Progress, productId: string, purchaseId: string, now: number): Progress {
  if (p.processedPurchases.includes(purchaseId)) return p;
  const key = productKeyById(productId);
  const legacy = LEGACY_PRODUCTS[productId];
  if (!key && !legacy) return p;
  let next: Progress = {
    ...p,
    boosters: { ...p.boosters },
    ads: { ...p.ads, lastPurchaseAt: now }, // her satın almadan sonra 24 saat geçiş reklamı yok
    processedPurchases: [...p.processedPurchases, purchaseId].slice(-100),
  };
  const why = `iap:${key ?? productId}`;
  if (legacy) {
    next = earn(next, { coins: legacy.coins }, why, now);
    for (const [k, v] of Object.entries(legacy.boosters ?? {}) as [Booster, number][]) next.boosters[k] += v;
    return next;
  }
  if (key && key in GEM_PACKS) return earn(next, { gems: GEM_PACKS[key as keyof typeof GEM_PACKS] }, why, now);
  switch (key) {
    case 'removeAds':
      next.ads.removeAds = true;
      next = earn(next, { coins: 500 }, why, now);
      break;
    case 'supporter':
      next.ads.removeAds = true;
      next.skipRewarded = true;
      next = earn(next, { gems: SUPPORTER_GEMS }, why, now);
      break;
    case 'starter':
      next = earn(next, { gems: STARTER_PACK.gems, coins: STARTER_PACK.coins, tickets: STARTER_PACK.tickets }, why, now);
      for (const [k, v] of Object.entries(STARTER_PACK.boosters) as [Booster, number][]) next.boosters[k] += v;
      next.starterBought = true;
      break;
    case 'piggy':
      next = earn(next, { gems: p.piggy }, why, now);
      next.piggy = 0;
      break;
  }
  return next;
}

/** Kalıcı ürünler geri yüklenirken: kimlik farklı olsa da etkisi yalnızca bir kez. */
export function restoreNonConsumable(p: Progress, productId: string): Progress {
  const key = productKeyById(productId);
  if (key === 'removeAds') return { ...p, ads: { ...p.ads, removeAds: true } };
  if (key === 'supporter') return { ...p, ads: { ...p.ads, removeAds: true }, skipRewarded: true };
  return p;
}

export const isConsumable = (productId: string): boolean => {
  const key = productKeyById(productId);
  return (!!key && PRODUCTS[key].type === 'consumable') || productId in LEGACY_PRODUCTS;
};

/** Başlangıç paketi: 15. seviyeden sonra açılır, 48 saat geçerli. */
export const STARTER_WINDOW_MS = 48 * 3600_000;
export function starterOfferActive(p: Progress, now: number): boolean {
  if (p.starterBought || p.starterOfferAt === 0) return false;
  return now - p.starterOfferAt < STARTER_WINDOW_MS;
}
