// Web önizlemesi için boş uygulama: mağaza yalnızca iOS/Android'de.
import type { IapHandlers, StoreProduct } from './iap';
export type { IapHandlers, StoreProduct };
export const iapAvailable = () => false;
export const storeProducts = (): StoreProduct[] => [];
export async function initIap(_h: IapHandlers): Promise<void> {}
export async function buy(_productId: string): Promise<void> {
  throw new Error('store-unavailable');
}
export async function restore(_h: IapHandlers): Promise<void> {
  throw new Error('store-unavailable');
}
export const priceFor = (_id: string, usd: number) => `$${usd.toFixed(2)}`;
