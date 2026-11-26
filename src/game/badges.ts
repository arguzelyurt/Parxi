// Bildirim ışıkları: sekmede ya da kartta bakılmamış bir yenilik / alınmamış bir ödül var mı.
import { CAR_MODELS, SPECIAL_CARS } from '../core/garage';
import { canClaimGift, MARKET_VERSION } from '../core/market';
import { canClaimChest, canClaimMission, ensureMissions } from '../core/missions';
import { Progress, todayUTC } from './storage';

/** Garaja girmiş ama henüz görülmemiş arabalar */
export function newCars(p: Progress): string[] {
  const done = Math.max(1, p.level - 1);
  const have = [
    ...CAR_MODELS.filter((m) => m.level <= done).map((m) => m.key),
    ...SPECIAL_CARS.filter((m) => p.owned.includes(`garage:${m.key}`)).map((m) => m.key),
  ];
  return have.filter((k) => !p.seenCars.includes(k));
}

/** Haritada bakılmamış yeni seviye (son ziyaretten beri seviye açıldı) */
export const mapHasNew = (p: Progress): boolean => p.level > p.seenMapLevel;

export const marketHasNew = (p: Progress, today = todayUTC()): boolean =>
  canClaimGift(p.gift, today) || p.marketSeenDay !== today || p.marketSeenVersion < MARKET_VERSION;

export function missionsReady(p: Progress, today = todayUTC()): boolean {
  const m = ensureMissions(p.missions, today);
  return m.missions.some((_, i) => canClaimMission(m, i)) || canClaimChest(m);
}

export const dailyReady = (p: Progress, dayKey: string): boolean => p.daily.lastDoneKey !== dayKey;
