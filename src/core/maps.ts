// Harita ilerlemesi. Seviyeler haritalara bölünür; her harita bir öncekinden bir seviye uzun:
// 1. harita 10 seviye, 2. harita 11, … 5. harita 60. seviyede biter. Harita tamamlanınca ödül verilir,
// ödül harita ilerledikçe büyür. Saf mantık (test edilir).

import type { Booster } from './monetization';

export interface MapInfo {
  /** 0'dan başlar */
  index: number;
  key: string;
  icon: string;
  /** Kart rengi */
  color: string;
  first: number;
  last: number;
  size: number;
}

export interface MapReward {
  coins: number;
  boosters: Partial<Record<Booster, number>>;
}

const BASE: { key: string; icon: string; color: string }[] = [
  { key: 'mahalle', icon: '🏘️', color: '#3BCE7A' },
  { key: 'carsi', icon: '🛍️', color: '#FF9F1C' },
  { key: 'liman', icon: '⚓', color: '#3A86FF' },
  { key: 'gar', icon: '🚉', color: '#9B5DE5' },
  { key: 'havalimani', icon: '✈️', color: '#2EC4B6' },
  { key: 'stadyum', icon: '🏟️', color: '#FF5A5F' },
  { key: 'sahil', icon: '🏖️', color: '#FFD23F' },
  { key: 'orman', icon: '🌲', color: '#3BCE7A' },
  { key: 'dag', icon: '⛰️', color: '#A0673F' },
  { key: 'col', icon: '🏜️', color: '#FF9F1C' },
  { key: 'kar', icon: '❄️', color: '#56CCF2' },
  { key: 'kanyon', icon: '🏞️', color: '#F15BB5' },
  { key: 'ada', icon: '⛴️', color: '#3A86FF' },
  { key: 'kopru', icon: '🌉', color: '#9B5DE5' },
  { key: 'festival', icon: '🎡', color: '#FF5A5F' },
  { key: 'neon', icon: '🌃', color: '#B04CFF' },
  { key: 'saray', icon: '🏰', color: '#F2C94C' },
  { key: 'uzay', icon: '🚀', color: '#56CCF2' },
  { key: 'yildiz', icon: '🌌', color: '#9B5DE5' },
  { key: 'zirve', icon: '🏔️', color: '#F2C94C' },
];

/** Ekranda gösterilen harita sayısı (sonrası güncellemelerde) */
export const MAP_COUNT = BASE.length;

export const mapSize = (index: number): number => 10 + index;

/** index. haritanın ilk seviyesi: 1 + (10 + 11 + … ) */
export const mapFirst = (index: number): number => 1 + index * 10 + (index * (index - 1)) / 2;

export function mapAt(index: number): MapInfo {
  const b = BASE[index % BASE.length];
  const first = mapFirst(index);
  const size = mapSize(index);
  return { index, key: b.key, icon: b.icon, color: b.color, first, last: first + size - 1, size };
}

/** Seviyenin bulunduğu harita */
export function mapOfLevel(level: number): MapInfo {
  let i = 0;
  while (mapAt(i).last < level) i++;
  return mapAt(i);
}

export const allMaps = (): MapInfo[] => Array.from({ length: MAP_COUNT }, (_, i) => mapAt(i));

/** Harita tamamlama ödülü: harita ilerledikçe büyür */
export function mapReward(index: number): MapReward {
  const boosters: Partial<Record<Booster, number>> = {
    hint: 1 + Math.floor(index / 3),
    undo: 2 + Math.floor(index / 4),
  };
  if (index >= 2) boosters.crane = 1 + Math.floor(index / 5);
  if (index >= 4) boosters.extraSlot = 1 + Math.floor(index / 6);
  return { coins: 150 + index * 75, boosters };
}

/** Bu seviye bitince tamamlanan harita (yoksa null) */
export function mapCompletedAt(level: number): MapInfo | null {
  const m = mapOfLevel(level);
  return m.last === level ? m : null;
}

export interface Purse {
  coins: number;
  boosters: Record<Booster, number>;
  mapsClaimed: number[];
}

/** Ödülü bir kez verir (aynı harita ikinci kez ödül vermez) */
export function claimMap<T extends Purse>(p: T, index: number): T {
  if (p.mapsClaimed.includes(index)) return p;
  const r = mapReward(index);
  const boosters = { ...p.boosters };
  (Object.keys(r.boosters) as Booster[]).forEach((k) => (boosters[k] += r.boosters[k] ?? 0));
  return { ...p, coins: p.coins + r.coins, boosters, mapsClaimed: [...p.mapsClaimed, index] };
}
