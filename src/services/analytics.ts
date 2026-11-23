// Ölçüm olayları. Şu an geliştirmede konsola yazar. Firebase Analytics bağlanınca
// açılışta setAnalyticsSink(...) ile bağlanır; olay adları sabit kalır.

import type { Booster } from '../core/monetization';
import { getVariant } from './remoteConfig';

export type AnalyticsEvent =
  | { name: 'level_start'; level: number | string; hard: boolean }
  | { name: 'level_complete'; level: number | string; launches: number; parked: number; stars: number }
  | { name: 'level_stuck'; level: number | string; launches: number; overflow: boolean }
  | { name: 'booster_used'; kind: Booster; source: 'inventory' | 'coins' | 'ad' }
  | { name: 'ad_shown'; type: 'interstitial' | 'rewarded'; placement: string }
  | { name: 'iap_offer_shown'; product: string; placement: string }
  | { name: 'iap_purchase'; product: string };

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
