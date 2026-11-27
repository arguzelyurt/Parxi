// Ölçüm olayları. Şu an geliştirmede konsola yazar. Firebase Analytics bağlanınca
// açılışta setAnalyticsSink(...) ile bağlanır; olay adları sabit kalır.

import type { Booster } from '../core/monetization';
import { getVariant } from './remoteConfig';

export type AnalyticsEvent =
  | { name: 'level_start'; level: number | string; hard: boolean }
  | { name: 'level_complete'; level: number | string; launches: number; parked: number; stars: number }
  | { name: 'level_stuck'; level: number | string; launches: number; overflow: boolean }
  | { name: 'booster_used'; kind: Booster; source: 'inventory' | 'coins' | 'ad' | 'gems' }
  | { name: 'ad_shown'; type: 'interstitial' | 'rewarded'; placement: string }
  | { name: 'iap_offer_shown'; product: string; placement: string }
  | { name: 'iap_purchase'; product: string }
  | { name: 'market_view'; category: string }
  | { name: 'item_preview'; item: string }
  | { name: 'item_buy'; item: string; price: number; deal: boolean }
  | { name: 'daily_gift'; streak: number }
  | { name: 'mystery_box'; item: string }
  /** Para hareketi: neden (ör. mission, chest:gold, boost:coinX2) ve değişimler; kişisel veri yok */
  | { name: 'wallet'; why: string; coins: number; gems: number; tickets: number }
  /** Toplanmadan silinen görev ödülleri */
  | { name: 'missions_missed'; daily: number; weekly: number };

type Sink = (name: string, params: Record<string, string | number>) => void;

let sink: Sink | null = null;

export function setAnalyticsSink(s: Sink) {
  sink = s;
}

export function track(e: AnalyticsEvent) {
  const { name, ...rest } = e;
  const params: Record<string, string | number> = { variant: getVariant() };
  for (const [k, v] of Object.entries(rest as Record<string, string | number | boolean>)) {
    params[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
  }
  if (sink) {
    try {
      sink(name, params);
    } catch {}
  } else if (__DEV__) {
    console.log('[analytics]', name, params);
  }
}
