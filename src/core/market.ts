// Coin marketi: oyunda biriken coin'lerle alınan şeyler. Saf mantık (test edilir).
// Gerçek para ile satış ayrı: o "Dükkan" (services/iap + ui/ShopSheet).
//
// Kural: hiçbir kozmetik aracın ya da yolcunun RENGİNİ değiştirmez (oyun okunur kalır).

import { Booster } from './monetization';
import { Key, t } from '../i18n';
import { hashSeed, mulberry32 } from './rng';

/** car = otoparktaki araç stili/kaplaması, garage = garaja giren özel araba */
export type ItemKind = 'booster' | 'car' | 'rider' | 'theme' | 'stop' | 'fx' | 'garage';
export type CosmeticKind = 'car' | 'rider' | 'theme' | 'stop' | 'fx';
export const COSMETIC_KINDS: CosmeticKind[] = ['car', 'rider', 'theme', 'stop', 'fx'];
/** Toplanabilir (set ödülü olan) kategoriler */
export const COLLECTION_KINDS: Exclude<ItemKind, 'booster'>[] = ['car', 'rider', 'theme', 'stop', 'fx', 'garage'];

export type Rarity = 'common' | 'rare' | 'epic' | 'legend';
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legend'];

export interface MarketItem {
  id: string; // ör. 'theme:okyanus'
  kind: ItemKind;
  price: number;
  rarity: Rarity;
  /** Güçlendirici paketi: ne kadar verir (yoksa `bundle`) */
  booster?: { kind: Booster; count: number };
  bundle?: Record<Booster, number>;
  /** Kozmetik: baştan sahip olunan */
  free?: boolean;
  /** "En avantajlı" rozeti */
  best?: boolean;
  /** "Yeni" rozeti */
  isNew?: boolean;
}

const B = (id: string, price: number, extra: Partial<MarketItem>): MarketItem => ({ id, kind: 'booster', price, rarity: 'common', ...extra });
const C = (kind: Exclude<ItemKind, 'booster'>, key: string, price: number, rarity: Rarity, extra: Partial<MarketItem> = {}): MarketItem => ({
  id: `${kind}:${key}`,
  kind,
  price,
  rarity,
  ...extra,
});
const FREE = { free: true };
const NEW = { isNew: true };

export const MIX_PACK: Record<Booster, number> = { undo: 3, hint: 3, crane: 2, extraSlot: 1 };
export const MEGA_PACK: Record<Booster, number> = { undo: 10, hint: 8, crane: 5, extraSlot: 3 };

export const MARKET: MarketItem[] = [
  // Güçlendirici paketleri: tek tek almaktan ~%10-25 ucuz
  B('pack:undo3', 80, { booster: { kind: 'undo', count: 3 } }),
  B('pack:hint3', 130, { booster: { kind: 'hint', count: 3 } }),
  B('pack:crane3', 200, { booster: { kind: 'crane', count: 3 } }),
  B('pack:slot2', 250, { booster: { kind: 'extraSlot', count: 2 } }),
  B('pack:mix', 450, { bundle: MIX_PACK }),
  B('pack:mega', 1200, { bundle: MEGA_PACK, best: true, isNew: true }),

  // Araç stilleri ve kaplamaları (otopark ve durak)
  C('car', 'klasik', 0, 'common', FREE),
  C('car', 'parlak', 500, 'common'),
  C('car', 'retro', 700, 'common'),
  C('car', 'puantiye', 800, 'common', NEW),
  C('car', 'yaris', 1200, 'rare', NEW),
  C('car', 'taksi', 1500, 'rare', NEW),
  C('car', 'neon', 1800, 'rare'),
  C('car', 'kamuflaj', 2500, 'epic', NEW),
  C('car', 'ahsap', 2800, 'epic', NEW),
  C('car', 'karbon', 3200, 'epic', NEW),
  C('car', 'alev', 4500, 'epic', NEW),
  C('car', 'altin', 8000, 'legend', NEW),

  // Yolcu görünümleri (gövde hep yolcunun renginde)
  C('rider', 'klasik', 0, 'common', FREE),
  C('rider', 'sapka', 600, 'common', NEW),
  C('rider', 'korsan', 800, 'common', NEW),
  C('rider', 'kedi', 1200, 'rare', NEW),
  C('rider', 'kopek', 1400, 'rare', NEW),
  C('rider', 'robot', 2600, 'epic', NEW),
  C('rider', 'astronot', 3500, 'epic', NEW),
  C('rider', 'uzayli', 6500, 'legend', NEW),

  // Temalar (otopark zemini, yol, arka plan)
  C('theme', 'gece', 0, 'common', FREE),
  C('theme', 'okyanus', 600, 'common'),
  C('theme', 'orman', 800, 'common'),
  C('theme', 'gunbatimi', 1000, 'rare'),
  C('theme', 'kar', 1200, 'rare', NEW),
  C('theme', 'col', 1400, 'rare', NEW),
  C('theme', 'neon', 1500, 'rare'),
  C('theme', 'sahil', 2000, 'rare', NEW),
  C('theme', 'uzay', 3000, 'epic', NEW),
  C('theme', 'sehir', 3500, 'epic', NEW),

  // Duraklar
  C('stop', 'klasik', 0, 'common', FREE),
  C('stop', 'tramvay', 800, 'common', NEW),
  C('stop', 'kumsal', 1200, 'rare', NEW),
  C('stop', 'kis', 1500, 'rare', NEW),
  C('stop', 'havalimani', 2800, 'epic', NEW),

  // Kutlama efektleri (seviye sonunda)
  C('fx', 'sade', 0, 'common', FREE),
  C('fx', 'konfeti', 1000, 'rare', NEW),
  C('fx', 'balon', 1200, 'rare', NEW),
  C('fx', 'yildiz', 2500, 'epic', NEW),
  C('fx', 'havai', 4000, 'epic', NEW),

  // Yalnız market'te satılan garaj arabaları
  C('garage', 'elektrik', 1500, 'rare', NEW),
  C('garage', 'pizza', 1800, 'rare', NEW),
  C('garage', 'cop', 2000, 'rare', NEW),
  C('garage', 'safari', 2800, 'epic', NEW),
  C('garage', 'vincli', 3200, 'epic', NEW),
  C('garage', 'ralli', 4500, 'epic', NEW),
  C('garage', 'altintaksi', 7000, 'legend', NEW),
  C('garage', 'uzay', 9000, 'legend', NEW),
];

/** Ürünün ekranda görünen adı ve açıklaması (dile göre). */
export const itemName = (m: MarketItem): string => t(`item.${m.id}` as Key);
export const itemDesc = (m: MarketItem): string | undefined =>
  m.bundle ? t(`item.${m.id}.desc` as Key) : undefined;

export const itemById = (id: string): MarketItem | undefined => MARKET.find((m) => m.id === id);
export const itemsOf = (kind: ItemKind): MarketItem[] => MARKET.filter((m) => m.kind === kind);
export const keyOf = (id: string): string => id.split(':')[1] ?? '';

export type Cosmetics = Record<CosmeticKind, string>;
export const DEFAULT_COSMETICS: Cosmetics = {
  theme: 'theme:gece',
  car: 'car:klasik',
  rider: 'rider:klasik',
  stop: 'stop:klasik',
  fx: 'fx:sade',
};

/** Set ödülü: bir kategorinin hepsini toplayınca (bir kez) */
export const SET_BONUS: Record<Exclude<ItemKind, 'booster'>, number> = {
  car: 3000,
  rider: 2000,
  theme: 2000,
  stop: 1000,
  fx: 1000,
  garage: 4000,
};

/** Marketin dokunduğu ilerleme alanları */
export interface Wallet {
  coins: number;
  boosters: Record<Booster, number>;
  owned: string[];
  cosmetics: Cosmetics;
  setsClaimed: string[];
}

export const ownsItem = (w: Pick<Wallet, 'owned'>, item: MarketItem): boolean => !!item.free || w.owned.includes(item.id);

const isCosmetic = (k: ItemKind): k is CosmeticKind => (COSMETIC_KINDS as string[]).includes(k);

export const isEquipped = (w: Wallet, item: MarketItem): boolean => isCosmetic(item.kind) && w.cosmetics[item.kind] === item.id;

/** Kategoride sahip olunan / toplam */
export function collectionCount(w: Pick<Wallet, 'owned'>, kind: ItemKind): { owned: number; total: number } {
  const all = itemsOf(kind);
  return { owned: all.filter((m) => ownsItem(w, m)).length, total: all.length };
}

// ---------- Günün fırsatları ----------

export const DEAL_DISCOUNTS = [20, 30, 40];

export interface Deal {
  item: MarketItem;
  pct: number;
  price: number;
}

const roundPrice = (p: number) => Math.max(10, Math.round(p / 10) * 10);

/**
 * Günün 3 fırsatı: tarihten tohumla seçilir (sunucu gerekmez), sahip olunmayan kozmetiklerden.
 * Bir güçlendirici paketi her zaman listede olabilir; kozmetikler bitince paketler gelir.
 */
export function dailyDeals(dayKey: string, w: Pick<Wallet, 'owned'>): Deal[] {
  const rnd = mulberry32(hashSeed(`deals:${dayKey}`));
  const pool = MARKET.filter((m) => m.kind !== 'booster' && !ownsItem(w, m));
  const packs = MARKET.filter((m) => m.kind === 'booster');
  const picked: MarketItem[] = [];
  const take = (list: MarketItem[]) => {
    const rest = list.filter((m) => !picked.includes(m));
    if (rest.length) picked.push(rest[Math.floor(rnd() * rest.length)]);
  };
  take(pool);
  take(pool);
  take(packs);
  while (picked.length < 3) take(packs);
  const pcts = [...DEAL_DISCOUNTS].sort(() => rnd() - 0.5);
  return picked.map((item, i) => ({ item, pct: pcts[i], price: roundPrice((item.price * (100 - pcts[i])) / 100) }));
}

/** Gece yarısına (UTC, oyunun günü) kalan süre */
export function msToNextDay(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now;
}

/** Ürünün bugünkü fiyatı (fırsattaysa indirimli) */
export function priceFor(w: Pick<Wallet, 'owned'>, item: MarketItem, dayKey: string): number {
  const d = dailyDeals(dayKey, w).find((x) => x.item.id === item.id);
  return d ? d.price : item.price;
}

// ---------- Satın alma ----------

export type BuyResult =
  | { ok: true; wallet: Wallet; setBonus: number }
  | { ok: false; reason: 'coins' | 'owned' | 'unknown' };

function addBoosters(b: Record<Booster, number>, add: Record<Booster, number>) {
  (Object.keys(add) as Booster[]).forEach((k) => (b[k] += add[k]));
}

/** Kategori tamamlandıysa set ödülü (bir kez) */
function withSetBonus(w: Wallet, kind: ItemKind): { wallet: Wallet; bonus: number } {
  if (kind === 'booster' || w.setsClaimed.includes(kind)) return { wallet: w, bonus: 0 };
  const c = collectionCount(w, kind);
  if (c.owned < c.total) return { wallet: w, bonus: 0 };
  const bonus = SET_BONUS[kind];
  return { wallet: { ...w, coins: w.coins + bonus, setsClaimed: [...w.setsClaimed, kind] }, bonus };
}

/** Kozmetiği cüzdana ekle: kozmetik hemen kullanılır, garaj arabası garaja girer. */
function grant(w: Wallet, item: MarketItem): Wallet {
  const next: Wallet = { ...w, owned: [...w.owned, item.id], cosmetics: { ...w.cosmetics } };
  if (isCosmetic(item.kind)) next.cosmetics[item.kind] = item.id;
  return next;
}

/** Satın al. `dayKey` verilirse günün fırsatı fiyatı uygulanır. */
export function buyItem(w: Wallet, id: string, dayKey?: string): BuyResult {
  const item = itemById(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (item.kind !== 'booster' && ownsItem(w, item)) return { ok: false, reason: 'owned' };
  const price = dayKey ? priceFor(w, item, dayKey) : item.price;
  if (w.coins < price) return { ok: false, reason: 'coins' };
  let next: Wallet = { ...w, coins: w.coins - price, boosters: { ...w.boosters } };
  if (item.kind === 'booster') {
    if (item.booster) next.boosters[item.booster.kind] += item.booster.count;
    else if (item.bundle) addBoosters(next.boosters, item.bundle);
    return { ok: true, wallet: next, setBonus: 0 };
  }
  next = grant(next, item);
  const s = withSetBonus(next, item.kind);
  return { ok: true, wallet: s.wallet, setBonus: s.bonus };
}

/** Sahip olunan kozmetiği kullan. */
export function equipItem(w: Wallet, id: string): Wallet {
  const item = itemById(id);
  if (!item || !isCosmetic(item.kind) || !ownsItem(w, item)) return w;
  return { ...w, cosmetics: { ...w.cosmetics, [item.kind]: item.id } };
}

// ---------- Sürpriz kutu ----------

export const MYSTERY_PRICE = 1500;
/** Ekranda yazan olasılıklar (nadirliğe göre ağırlık); o nadirlikte ürün kalmadıysa diğerlerine paylaşılır */
export const MYSTERY_WEIGHTS: Record<Rarity, number> = { common: 55, rare: 30, epic: 12, legend: 3 };

export const mysteryPool = (w: Pick<Wallet, 'owned'>): MarketItem[] => MARKET.filter((m) => m.kind !== 'booster' && !ownsItem(w, m));

/** Şu anki olasılıklar (yüzde, toplam 100) */
export function mysteryOdds(w: Pick<Wallet, 'owned'>): Record<Rarity, number> {
  const pool = mysteryPool(w);
  const has = (r: Rarity) => pool.some((m) => m.rarity === r);
  const total = RARITIES.reduce((s, r) => s + (has(r) ? MYSTERY_WEIGHTS[r] : 0), 0);
  const out = { common: 0, rare: 0, epic: 0, legend: 0 } as Record<Rarity, number>;
  if (!total) return out;
  for (const r of RARITIES) out[r] = has(r) ? Math.round((MYSTERY_WEIGHTS[r] / total) * 1000) / 10 : 0;
  return out;
}

export type BoxResult = { ok: true; wallet: Wallet; item: MarketItem; setBonus: number } | { ok: false; reason: 'coins' | 'empty' };

/** Sürpriz kutu: sahip olunmayan rastgele bir kozmetik (yalnız coin ile). */
export function openMysteryBox(w: Wallet, rnd: () => number = Math.random): BoxResult {
  const pool = mysteryPool(w);
  if (!pool.length) return { ok: false, reason: 'empty' };
  if (w.coins < MYSTERY_PRICE) return { ok: false, reason: 'coins' };
  const odds = mysteryOdds(w);
  let roll = rnd() * 100;
  let rarity: Rarity = RARITIES.find((r) => odds[r] > 0)!;
  for (const r of RARITIES) {
    if (odds[r] <= 0) continue;
    rarity = r;
    if (roll < odds[r]) break;
    roll -= odds[r];
  }
  const list = pool.filter((m) => m.rarity === rarity);
  const item = list[Math.floor(rnd() * list.length)] ?? pool[0];
  const next = grant({ ...w, coins: w.coins - MYSTERY_PRICE }, item);
  const s = withSetBonus(next, item.kind);
  return { ok: true, wallet: s.wallet, item, setBonus: s.bonus };
}

// ---------- Günlük hediye ----------

export interface Gift {
  coins: number;
  boosters?: Partial<Record<Booster, number>>;
}

/** 7 günlük seri; sonra başa döner. Gün atlanırsa seri 1'e döner. */
export const GIFTS: Gift[] = [
  { coins: 50 },
  { coins: 80 },
  { coins: 40, boosters: { hint: 1 } },
  { coins: 120 },
  { coins: 60, boosters: { crane: 1 } },
  { coins: 200 },
  { coins: 300, boosters: { extraSlot: 1 } },
];

export interface GiftState {
  /** Son alınan gün (YYYY-AA-GG) */
  day: string | null;
  /** Seride kaçıncı gün (1..) */
  streak: number;
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export const canClaimGift = (g: GiftState, today: string): boolean => g.day !== today;

/** Bugün alınacak hediyenin serideki sırası (1..7) */
export function giftStreakFor(g: GiftState, today: string): number {
  if (!g.day) return 1;
  if (g.day === today) return g.streak;
  return dayDiff(g.day, today) === 1 ? g.streak + 1 : 1;
}

export const giftFor = (streak: number): Gift => GIFTS[(Math.max(1, streak) - 1) % GIFTS.length];

export function claimGift(w: Wallet, g: GiftState, today: string): { wallet: Wallet; gift: GiftState; got: Gift } | null {
  if (!canClaimGift(g, today)) return null;
  const streak = giftStreakFor(g, today);
  const got = giftFor(streak);
  const boosters = { ...w.boosters };
  for (const [k, v] of Object.entries(got.boosters ?? {}) as [Booster, number][]) boosters[k] += v;
  return { wallet: { ...w, coins: w.coins + got.coins, boosters }, gift: { day: today, streak }, got };
}
