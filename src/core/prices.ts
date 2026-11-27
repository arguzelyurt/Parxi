// Ekonominin bütün fiyat ve ödülleri tek yerde (docs/PLAN-EKONOMI.md).
// Üç para: coin (bol, günlük), elmas (değerli, az), park bileti (sandık ve çark).
// Temel kural: para seviyeyi satın almaz; seviyeler yalnız oynanarak açılır.

import type { Rarity } from './market';

export type Currency = 'coins' | 'gems' | 'tickets';
export type Money = Partial<Record<Currency, number>>;

/** Elmas kazanılan yerler */
export const GEM_REWARD = {
  /** Harita bitirme: 10 + 2 × harita sırası */
  mapBase: 10,
  mapPer: 2,
  /** Yeni garaj arabası açılınca */
  newCar: 3,
  /** Günlük Otopark serisinin 7. ve 30. günü */
  streak7: 5,
  streak30: 30,
  /** Günün "büyük görevi" */
  bigMission: 2,
  /** Market seti tamamlanınca (coin ödülüne ek) */
  set: { car: 30, rider: 20, theme: 20, stop: 10, fx: 10, garage: 30 } as Record<string, number>,
} as const;

export const mapGems = (index: number): number => GEM_REWARD.mapBase + GEM_REWARD.mapPer * index;

/** Elmasla alınanlar (Remote Config yalnız PRICE_BOUNDS içinde değiştirebilir) */
export const GEM_COST: Record<'continue' | 'infiniteLives' | 'shield' | 'repair' | 'coinX2', number> = {
  /** Tıkanınca +1 yer (seviye başına 1 kez) */
  continue: 15,
  infiniteLives: 20,
  shield: 40,
  repair: 120,
  coinX2: 25,
};

export const BOOST_MS = { infiniteLives: 30 * 60_000, coinX2: 15 * 60_000 } as const;
/** Seri koruyucu en çok kaç tane birikir */
export const SHIELD_MAX = 3;
/** Takas: tek yönlü, elmas → coin */
export const TRADE = { gems: 10, coins: 500 } as const;

/** Bilet kazanılan yerler */
export const TICKET_REWARD = {
  /** Kısım (3 harita) açılışı: Altın sandık + bilet */
  section: 2,
  /** Haftalık görevlerin her biri */
  weekly: 1,
  /** Market günlük hediyesi 4. gün */
  gift4: 1,
} as const;

/** Ödüllü reklamla para: günde en çok 5 kez, 25 coin ya da 1 bilet */
export const AD_MONEY = { perDay: 5, coins: 25, tickets: 1 } as const;

export type ChestKind = 'bronze' | 'silver' | 'gold';
export const CHEST_KINDS: ChestKind[] = ['bronze', 'silver', 'gold'];
export const CHEST_COST: Record<ChestKind, Money> = {
  bronze: { coins: 400 },
  silver: { tickets: 2 },
  gold: { tickets: 5 },
};

/** Şans çarkı: günde 1 bedava, sonra 1 bilet */
export const WHEEL_COST: Money = { tickets: 1 };

/** Destansı / efsane kozmetik ve özel garaj arabası için elmas fiyatı (coin fiyatına ek seçenek) */
export function gemPriceFor(item: { kind: string; price: number; rarity: Rarity }): number | null {
  const r5 = (n: number) => Math.round(n / 5) * 5;
  if (item.kind === 'garage') return Math.min(350, Math.max(80, r5(item.price / 25)));
  if (item.kind === 'booster') return null;
  if (item.rarity === 'epic') return Math.min(150, Math.max(60, r5(item.price / 40)));
  if (item.rarity === 'legend') return Math.min(300, Math.max(150, r5(item.price / 30)));
  return null;
}

/** Elmas kumbarası: her seviyede 1 elmas, 300'de dolar (satın alınca kırılır) */
export const GEM_PIGGY = { perLevel: 1, cap: 300, unlockLevel: 30 } as const;

/**
 * Uzaktan fiyat ayarının güvenli aralıkları (Remote Config anahtarı → [en az, en çok]).
 * Uzaktan gelen değer bu aralığa sıkıştırılır; aralık dışı ya da bozuk değer yok sayılır.
 */
export const PRICE_BOUNDS = {
  price_continue: [10, 25],
  price_infiniteLives: [15, 40],
  price_shield: [30, 60],
  price_repair: [80, 200],
  price_coinX2: [15, 40],
  price_bronze: [250, 800],
  price_silver: [1, 4],
  price_gold: [3, 8],
} as const satisfies Record<string, readonly [number, number]>;

const DEFAULTS = { gem: { ...GEM_COST }, chest: { bronze: 400, silver: 2, gold: 5 } };

/** Remote Config değerlerini fiyatlara uygula (sınırlar içinde); hiç değer yoksa varsayılanlar */
export function applyPriceConfig(remote: Record<string, unknown>): void {
  const pick = (key: keyof typeof PRICE_BOUNDS, def: number): number => {
    const raw = remote[key];
    const v = Number(raw);
    if (raw === undefined || raw === '' || raw === null || !Number.isFinite(v)) return def;
    const [lo, hi] = PRICE_BOUNDS[key];
    return Math.round(Math.min(hi, Math.max(lo, v)));
  };
  (Object.keys(DEFAULTS.gem) as (keyof typeof GEM_COST)[]).forEach((k) => {
    GEM_COST[k] = pick(`price_${k}` as keyof typeof PRICE_BOUNDS, DEFAULTS.gem[k]);
  });
  CHEST_COST.bronze = { coins: pick('price_bronze', DEFAULTS.chest.bronze) };
  CHEST_COST.silver = { tickets: pick('price_silver', DEFAULTS.chest.silver) };
  CHEST_COST.gold = { tickets: pick('price_gold', DEFAULTS.chest.gold) };
}
