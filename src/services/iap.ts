// Mağaza satın almaları (expo-iap: StoreKit 2 + Google Play Billing). Sunucu yok:
// iOS işlemleri Apple imzalı gelir, Android'de satın alma "purchased" durumundaysa ödül verilir
// ve finishTransaction ile onaylanır (onaylanmayan Android satın alımı 3 günde iade edilir).

import { Platform } from 'react-native';
import { PRODUCTS } from '../core/monetization';
import { isConsumable } from '../game/purchases';
import { hasNativeModule } from './native';

type Lib = typeof import('expo-iap');
export type StoreProduct = { id: string; displayPrice: string; title: string };

export interface IapHandlers {
  /** Yeni ya da yeniden oynatılan satın alma: ödülü ver. */
  onGranted(productId: string, purchaseId: string): void;
  /** Geri yüklenen kalıcı ürün. */
  onRestored(productId: string): void;
  onError(message: string): void;
}

let lib: Lib | null = null;
let connected = false;
let products: StoreProduct[] = [];
const subs: { remove(): void }[] = [];

export const iapAvailable = () => connected;
export const storeProducts = () => products;

export async function initIap(h: IapHandlers): Promise<void> {
  if (Platform.OS === 'web' || connected || !hasNativeModule('ExpoIap')) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require('expo-iap') as Lib;
  } catch {
    return; // Expo Go: yerel modül yok
  }
  const l = lib;
  try {
    connected = await l.initConnection();
  } catch {
    connected = false;
  }
  if (!connected) return;

  subs.push(
    l.purchaseUpdatedListener(async (purchase) => {
      if (purchase.purchaseState !== 'purchased') return; // bekleyen ödemeler (ör. nakit) onaylanınca tekrar gelir
      h.onGranted(purchase.productId, purchase.id);
      try {
        await l.finishTransaction({ purchase, isConsumable: isConsumable(purchase.productId) });
      } catch {}
    }),
    l.purchaseErrorListener((e) => {
      if (e.code === l.ErrorCode.UserCancelled) return;
      h.onError(e.message);
    }),
  );

  try {
    const skus = Object.values(PRODUCTS).map((p) => p.id);
    const res = await l.fetchProducts({ skus, type: 'in-app' });
    products = ((res ?? []) as { id: string; displayPrice: string; title: string }[]).map((p) => ({
      id: p.id,
      displayPrice: p.displayPrice,
      title: p.title,
    }));
  } catch {}

  // Önceki oturumdan kalan kalıcı ürünler (cihaz değişimi, yeniden kurulum).
  await refreshOwned(h);
}

async function refreshOwned(h: IapHandlers) {
  if (!lib) return;
  try {
    const owned = await lib.getAvailablePurchases();
    for (const p of owned) if (!isConsumable(p.productId)) h.onRestored(p.productId);
  } catch {}
}

export async function buy(productId: string): Promise<void> {
  if (!lib || !connected) throw new Error('store-unavailable');
  await lib.requestPurchase({
    request: { apple: { sku: productId }, google: { skus: [productId] } },
    type: 'in-app',
  });
}

export async function restore(h: IapHandlers): Promise<void> {
  if (!lib || !connected) throw new Error('store-unavailable');
  try {
    await lib.restorePurchases();
  } catch {}
  await refreshOwned(h);
}

export function priceFor(productId: string, fallbackUsd: number): string {
  return products.find((p) => p.id === productId)?.displayPrice ?? `$${fallbackUsd.toFixed(2)}`;
}
