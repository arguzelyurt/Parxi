// Üç paralı cüzdan: kazanma, harcama ve hareket kaydı. Saf mantık (test edilir).
// Bakiye her zaman hareketlerin toplamıyla tutarlı kalır (son 200 hareket saklanır).

import type { Currency, Money } from './prices';

export interface LogEntry {
  t: number;
  why: string;
  c?: number;
  g?: number;
  k?: number;
}

export interface Purse3 {
  coins: number;
  gems: number;
  tickets: number;
  walletLog: LogEntry[];
}

export const LOG_MAX = 200;
const KEYS: Currency[] = ['coins', 'gems', 'tickets'];

function log(p: Purse3, m: Money, sign: 1 | -1, why: string, now: number): LogEntry[] {
  const e: LogEntry = { t: now, why };
  if (m.coins) e.c = sign * m.coins;
  if (m.gems) e.g = sign * m.gems;
  if (m.tickets) e.k = sign * m.tickets;
  return [...(p.walletLog ?? []), e].slice(-LOG_MAX);
}

export const isEmpty = (m: Money): boolean => KEYS.every((k) => !m[k]);

/** Para ekle (negatif değer yok sayılır) */
export function earn<T extends Purse3>(p: T, m: Money, why: string, now = Date.now()): T {
  const clean: Money = {};
  for (const k of KEYS) if ((m[k] ?? 0) > 0) clean[k] = Math.floor(m[k]!);
  if (isEmpty(clean)) return p;
  return {
    ...p,
    coins: p.coins + (clean.coins ?? 0),
    gems: p.gems + (clean.gems ?? 0),
    tickets: p.tickets + (clean.tickets ?? 0),
    walletLog: log(p, clean, 1, why, now),
  };
}

export const canAfford = (p: Pick<Purse3, Currency>, m: Money): boolean => KEYS.every((k) => (p[k] ?? 0) >= (m[k] ?? 0));

/** Harca; yetmiyorsa null */
export function spend<T extends Purse3>(p: T, m: Money, why: string, now = Date.now()): T | null {
  if (!canAfford(p, m)) return null;
  if (isEmpty(m)) return p;
  return {
    ...p,
    coins: p.coins - (m.coins ?? 0),
    gems: p.gems - (m.gems ?? 0),
    tickets: p.tickets - (m.tickets ?? 0),
    walletLog: log(p, m, -1, why, now),
  };
}

/** Kayıttaki hareketlerin toplamı (test ve hata ayıklama) */
export function logTotals(log: LogEntry[]): Required<Money> {
  return log.reduce(
    (a, e) => ({ coins: a.coins + (e.c ?? 0), gems: a.gems + (e.g ?? 0), tickets: a.tickets + (e.k ?? 0) }),
    { coins: 0, gems: 0, tickets: 0 },
  );
}
