// Uzaktan ayar katmanı. Şu an yalnızca uygulamadaki varsayılanlar çalışır.
// Firebase Remote Config bağlanınca tek yapılacak: açılışta setRemoteValues(...) çağırmak.
// Gelen her değer FAIR_BOUNDS ile sınırlanır; uzaktan "adil reklam" sözü bozulamaz.

import { AD_RULES, AdRules, clampRules } from '../core/monetization';
import { applyPriceConfig } from '../core/prices';

let adRules: AdRules = AD_RULES;
/** A/B testinde hangi gruptayız (analitik olaylarına eklenir). */
let variant = 'default';

export function setRemoteValues(values: Record<string, unknown>) {
  adRules = clampRules(values);
  // Fiyatlar da yalnız güvenli aralıklar içinde (prices.PRICE_BOUNDS)
  applyPriceConfig(values);
  if (typeof values.variant === 'string' && values.variant) variant = values.variant;
}

export const getAdRules = (): AdRules => adRules;
export const getVariant = (): string => variant;
