// Satın alınan ürünün oyuna etkisi. Saf fonksiyon: aynı satın alma kimliği ikinci kez gelirse
// (iOS yeniden oynatma, geri yükleme) hiçbir şey değişmez.

import { PRODUCTS } from '../core/monetization';
import type { Progress } from './storage';

export type ProductKey = keyof typeof PRODUCTS;

export const productKeyById = (id: string): ProductKey | undefined =>
  (Object.keys(PRODUCTS) as ProductKey[]).find((k) => PRODUCTS[k].id === id);

const COIN_PACKS: Partial<Record<ProductKey, number>> = {
  coins500: 500,
  coins1800: 1800,
  coins5500: 5500,
  coins16000: 16000,
};

export function applyPurchase(p: Progress, productId: string, purchaseId: string, now: number): Progress {
  if (p.processedPurchases.includes(purchaseId)) return p;
  const key = productKeyById(productId);
  if (!key) return p;
  const next: Progress = {
    ...p,
    boosters: { ...p.boosters },
    ads: { ...p.ads, lastPurchaseAt: now }, // her satın almadan sonra 24 saat geçiş reklamı yok
    processedPurchases: [...p.processedPurchases, purchaseId].slice(-100),
  };
  const coins = COIN_PACKS[key];
  if (coins) next.coins += coins;
  switch (key) {
    case 'removeAds':
      next.ads.removeAds = true;
      next.coins += 500;
      break;
    case 'supporter':
      next.ads.removeAds = true;
      next.skipRewarded = true;
      break;
    case 'starter':
      next.coins += 800;
      next.boosters.extraSlot += 3;
      next.boosters.crane += 3;
      next.starterBought = true;
      break;
    case 'rescue':
      next.boosters.extraSlot += 2;
      next.boosters.hint += 1;
      break;
    case 'piggy':
      next.coins += p.piggy;
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
  return !!key && PRODUCTS[key].type === 'consumable';
};

/** Başlangıç paketi: 15. seviyeden sonra açılır, 48 saat geçerli. */
export const STARTER_WINDOW_MS = 48 * 3600_000;
export function starterOfferActive(p: Progress, now: number): boolean {
  if (p.starterBought || p.starterOfferAt === 0) return false;
  return now - p.starterOfferAt < STARTER_WINDOW_MS;
}
