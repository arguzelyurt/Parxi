// Coin marketi: oyunda biriken coin'lerle alınan şeyler. Saf mantık (test edilir).
// Gerçek para ile satış ayrı: o "Dükkan" (services/iap + ui/ShopSheet).

import { Booster } from './monetization';
import { Key, t } from '../i18n';

export type ItemKind = 'booster' | 'theme' | 'car';

export interface MarketItem {
  id: string; // ör. 'theme:okyanus'
  kind: ItemKind;
  name: string;
  price: number;
  /** Güçlendirici paketi: ne kadar verir */
  booster?: { kind: Booster; count: number };
  /** Kozmetik: ilk sürümde ücretsiz gelen */
  free?: boolean;
  desc?: string;
}

export const MARKET: MarketItem[] = [
  // Güçlendirici paketleri: tek tek almaktan ~%10-25 ucuz
  { id: 'pack:undo3', kind: 'booster', name: '3 Geri al', price: 80, booster: { kind: 'undo', count: 3 } },
  { id: 'pack:hint3', kind: 'booster', name: '3 İpucu', price: 130, booster: { kind: 'hint', count: 3 } },
  { id: 'pack:crane3', kind: 'booster', name: '3 Vinç', price: 200, booster: { kind: 'crane', count: 3 } },
  { id: 'pack:slot2', kind: 'booster', name: '2 × +1 Yer', price: 250, booster: { kind: 'extraSlot', count: 2 } },
  { id: 'pack:mix', kind: 'booster', name: 'Karışık paket', price: 450, desc: '3 Geri al, 3 İpucu, 2 Vinç, 1 Yer' },

  // Oyun temaları (tahta, ray, arka plan)
  { id: 'theme:gece', kind: 'theme', name: 'Gece', price: 0, free: true },
  { id: 'theme:okyanus', kind: 'theme', name: 'Okyanus', price: 600 },
  { id: 'theme:orman', kind: 'theme', name: 'Orman', price: 800 },
  { id: 'theme:gunbatimi', kind: 'theme', name: 'Gün batımı', price: 1000 },
  { id: 'theme:neon', kind: 'theme', name: 'Neon', price: 1500 },

  // Araç stilleri (otoparktaki araçların görünümü)
  { id: 'car:klasik', kind: 'car', name: 'Klasik', price: 0, free: true },
  { id: 'car:parlak', kind: 'car', name: 'Parlak', price: 500 },
  { id: 'car:retro', kind: 'car', name: 'Retro', price: 700 },
  { id: 'car:neon', kind: 'car', name: 'Neon', price: 1200 },
];

/** Ürünün ekranda görünen adı ve açıklaması (dile göre). `name`/`desc` alanları Türkçe yedek. */
export const itemName = (m: MarketItem): string => t(`item.${m.id}` as Key);
export const itemDesc = (m: MarketItem): string | undefined => (m.desc ? t(`item.${m.id}.desc` as Key) : undefined);

export const MIX_PACK: Record<Booster, number> = { undo: 3, hint: 3, crane: 2, extraSlot: 1 };

export const itemById = (id: string): MarketItem | undefined => MARKET.find((m) => m.id === id);

/** Marketin dokunduğu ilerleme alanları */
export interface Wallet {
  coins: number;
  boosters: Record<Booster, number>;
  owned: string[];
  cosmetics: { theme: string; car: string };
}

export const ownsItem = (w: Wallet, item: MarketItem): boolean => !!item.free || w.owned.includes(item.id);

export const isEquipped = (w: Wallet, item: MarketItem): boolean =>
  item.kind !== 'booster' && w.cosmetics[item.kind] === item.id;

export type BuyResult = { ok: true; wallet: Wallet } | { ok: false; reason: 'coins' | 'owned' | 'unknown' };

/** Satın al. Kozmetik alınınca hemen kullanılır. */
export function buyItem(w: Wallet, id: string): BuyResult {
  const item = itemById(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (item.kind !== 'booster' && ownsItem(w, item)) return { ok: false, reason: 'owned' };
  if (w.coins < item.price) return { ok: false, reason: 'coins' };
  const next: Wallet = {
    coins: w.coins - item.price,
    boosters: { ...w.boosters },
    owned: w.owned,
    cosmetics: { ...w.cosmetics },
  };
  if (item.kind === 'booster') {
    if (item.booster) next.boosters[item.booster.kind] += item.booster.count;
    else (Object.keys(MIX_PACK) as Booster[]).forEach((k) => (next.boosters[k] += MIX_PACK[k]));
  } else {
    next.owned = [...w.owned, item.id];
    next.cosmetics[item.kind] = item.id;
  }
  return { ok: true, wallet: next };
}

/** Sahip olunan kozmetiği kullan. */
export function equipItem(w: Wallet, id: string): Wallet {
  const item = itemById(id);
  if (!item || item.kind === 'booster' || !ownsItem(w, item)) return w;
  return { ...w, cosmetics: { ...w.cosmetics, [item.kind]: item.id } };
}

export const DEFAULT_COSMETICS = { theme: 'theme:gece', car: 'car:klasik' };
