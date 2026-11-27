// Sandıklar (Bronz / Gümüş / Altın) ve Şans Çarkı. Saf mantık; olasılıklar ekranda yazılır
// (App Store kuralı 3.1.1). Rastgelelik dışarıdan verilir, böylece test edilebilir.

import type { Booster } from './monetization';
import { MARKET, MarketItem, Rarity, RARITIES } from './market';
import type { ChestKind, Money } from './prices';

export interface Reward extends Money {
  boosters?: Partial<Record<Booster, number>>;
  /** Kazanılan kozmetik / garaj arabası (market kimliği) */
  item?: string;
}

interface ChestTable {
  coins: [number, number];
  /** Kaç güçlendirici (rastgele türden) */
  boosters: [number, number];
  /** Kozmetik çıkma olasılığı (%) ve nadirlik ağırlıkları (toplam 100) */
  itemPct: number;
  itemRarity: Record<Rarity, number>;
  /** Elmas çıkma olasılığı (%) ve aralığı */
  gemPct: number;
  gems: [number, number];
}

export const CHESTS: Record<ChestKind, ChestTable> = {
  bronze: { coins: [120, 260], boosters: [1, 2], itemPct: 0, itemRarity: { common: 100, rare: 0, epic: 0, legend: 0 }, gemPct: 15, gems: [2, 3] },
  silver: { coins: [200, 400], boosters: [2, 3], itemPct: 30, itemRarity: { common: 60, rare: 35, epic: 5, legend: 0 }, gemPct: 60, gems: [3, 8] },
  gold: { coins: [400, 800], boosters: [3, 4], itemPct: 100, itemRarity: { common: 0, rare: 70, epic: 25, legend: 5 }, gemPct: 100, gems: [10, 20] },
};

const BOOSTERS: Booster[] = ['undo', 'hint', 'crane', 'extraSlot'];
const between = (r: () => number, [a, b]: [number, number]) => a + Math.floor(r() * (b - a + 1));

/** Kozmetik bitmişse yerine verilen elmas */
export const DUPLICATE_GEMS = 15;

function pickItem(owned: string[], weights: Record<Rarity, number>, r: () => number): MarketItem | null {
  const pool = MARKET.filter((m) => m.kind !== 'booster' && !m.free && !owned.includes(m.id));
  const has = (x: Rarity) => pool.some((m) => m.rarity === x);
  const total = RARITIES.reduce((s, x) => s + (has(x) ? weights[x] : 0), 0);
  if (!total) return null;
  let roll = r() * total;
  let rarity: Rarity = RARITIES.find((x) => has(x) && weights[x] > 0)!;
  for (const x of RARITIES) {
    if (!has(x) || weights[x] <= 0) continue;
    rarity = x;
    if (roll < weights[x]) break;
    roll -= weights[x];
  }
  const list = pool.filter((m) => m.rarity === rarity);
  return list[Math.floor(r() * list.length)] ?? null;
}

/** Sandığı aç: ödüller (para düşülmez; o cüzdanın işi) */
export function rollChest(kind: ChestKind, owned: string[], r: () => number = Math.random): Reward {
  const c = CHESTS[kind];
  const out: Reward = { coins: between(r, c.coins), boosters: {} };
  const n = between(r, c.boosters);
  for (let i = 0; i < n; i++) {
    const b = BOOSTERS[Math.floor(r() * BOOSTERS.length)];
    out.boosters![b] = (out.boosters![b] ?? 0) + 1;
  }
  if (r() * 100 < c.gemPct) out.gems = between(r, c.gems);
  if (r() * 100 < c.itemPct) {
    const it = pickItem(owned, c.itemRarity, r);
    if (it) out.item = it.id;
    else out.gems = (out.gems ?? 0) + DUPLICATE_GEMS;
  }
  return out;
}

/** Ekranda yazan olasılıklar (yüzde) */
export function chestOdds(kind: ChestKind): { coins: number; boosters: number; gems: number; item: number; rarity: Record<Rarity, number> } {
  const c = CHESTS[kind];
  return { coins: 100, boosters: 100, gems: c.gemPct, item: c.itemPct, rarity: c.itemRarity };
}

// ---------- Şans çarkı ----------

export interface WheelSlice {
  id: string;
  weight: number; // toplam 100
  reward: Reward;
  color: string;
}

/** Renkler assets/icons/wheel.png dilimleriyle aynı sırada (saat 3'ten başlayıp saat yönünde) */
export const WHEEL: WheelSlice[] = [
  { id: 'coins', weight: 28, reward: { coins: 100 }, color: '#E8453C' },
  { id: 'hint', weight: 18, reward: { boosters: { hint: 1 } }, color: '#3A86FF' },
  { id: 'crane', weight: 14, reward: { boosters: { crane: 1 } }, color: '#3BCE7A' },
  { id: 'slot', weight: 10, reward: { boosters: { extraSlot: 1 } }, color: '#FFB020' },
  { id: 'ticket', weight: 12, reward: { tickets: 1 }, color: '#B04CFF' },
  { id: 'gems3', weight: 12, reward: { gems: 3 }, color: '#56CCF2' },
  { id: 'gems10', weight: 5, reward: { gems: 10 }, color: '#FF4D9A' },
  { id: 'jackpot', weight: 1, reward: { coins: 1000, gems: 25 }, color: '#2EC4B6' },
];

export function spinWheel(r: () => number = Math.random): number {
  let roll = r() * WHEEL.reduce((s, x) => s + x.weight, 0);
  for (let i = 0; i < WHEEL.length; i++) {
    if (roll < WHEEL[i].weight) return i;
    roll -= WHEEL[i].weight;
  }
  return 0;
}

/** Bugün bedava çevirme hakkı var mı */
export const freeSpinReady = (wheelDay: string | null, today: string): boolean => wheelDay !== today;
