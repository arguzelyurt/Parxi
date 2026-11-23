// Seviyede bulunan engeller: ilk kez görüldüklerinde oyun başında tanıtım kartı çıkar.
import type { Level } from './rules';

export type Feature = 'hidden' | 'barrier' | 'lock' | 'vip';
export const FEATURES: Feature[] = ['hidden', 'barrier', 'lock', 'vip'];

export function featuresOf(level: Level): Feature[] {
  const out: Feature[] = [];
  if (level.hidden?.length) out.push('hidden');
  if (level.barriers?.length) out.push('barrier');
  if (level.locks?.length) out.push('lock');
  if (level.vip) out.push('vip');
  return out;
}

/** Bu seviyede tanıtılacak ilk yeni engel (bir seviyede en fazla bir kart) */
export const introFor = (level: Level, seen: string[]): Feature | null =>
  featuresOf(level).find((f) => !seen.includes(f)) ?? null;
