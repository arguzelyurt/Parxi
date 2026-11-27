// Haftalık görevler: 3 görev, pazartesi 00:00'da (yerel) yenilenir. Ödül elmas + 1 bilet;
// hafta bitene kadar alınabilir, toplanmayan ödül silinir. Saf mantık (test edilir).

import { hashSeed, mulberry32, shuffle } from './rng';
import { t } from '../i18n';
import { TICKET_REWARD } from './prices';

export type WeeklyKind = 'win' | 'passengers' | 'buses' | 'threeStar' | 'hard' | 'dailyDays' | 'map';

export interface WeeklyMission {
  kind: WeeklyKind;
  target: number;
  gems: number;
  tickets: number;
}

export interface WeeklyState {
  week: string; // pazartesinin yerel tarihi
  missions: WeeklyMission[];
  progress: number[];
  claimed: boolean[];
  missed?: number;
}

const W = (kind: WeeklyKind, target: number, gems: number): WeeklyMission => ({ kind, target, gems, tickets: TICKET_REWARD.weekly });

export const WEEKLY_POOL: WeeklyMission[] = [
  W('win', 40, 15),
  W('passengers', 1500, 15),
  W('buses', 25, 12),
  W('threeStar', 10, 15),
  W('hard', 3, 12),
  W('dailyDays', 5, 20),
  W('map', 1, 10),
];

export const WEEKLY_COUNT = 3;

export const WEEKLY_ICON: Record<WeeklyKind, 'flag' | 'people' | 'bus' | 'star' | 'bolt' | 'calendar' | 'chest'> = {
  win: 'flag',
  passengers: 'people',
  buses: 'bus',
  threeStar: 'star',
  hard: 'bolt',
  dailyDays: 'calendar',
  map: 'chest',
};

export function weeklyFor(week: string): WeeklyMission[] {
  return shuffle(WEEKLY_POOL, mulberry32(hashSeed(`parxi-weekly-${week}`))).slice(0, WEEKLY_COUNT);
}

export function freshWeekly(week: string): WeeklyState {
  const missions = weeklyFor(week);
  return { week, missions, progress: missions.map(() => 0), claimed: missions.map(() => false) };
}

export const weeklyDone = (s: WeeklyState, i: number) => s.progress[i] >= s.missions[i].target;
export const canClaimWeekly = (s: WeeklyState, i: number) => weeklyDone(s, i) && !s.claimed[i];
export const weeklyReady = (s: WeeklyState) => s.missions.some((_, i) => canClaimWeekly(s, i));

export function ensureWeekly(s: WeeklyState | null | undefined, week: string): WeeklyState {
  if (s && s.week === week) return s;
  const fresh = freshWeekly(week);
  const missed = s ? s.missions.filter((_, i) => canClaimWeekly(s, i)).length : 0;
  return missed ? { ...fresh, missed } : fresh;
}

export interface WeeklyEvent {
  stars: number;
  hard: boolean;
  passengers?: number;
  buses?: number;
  /** Günlük Otopark günün ilk bitirişi */
  firstDaily?: boolean;
  /** Bu seviyeyle bir harita bitti */
  mapDone?: boolean;
  /** Normal seviye mi (Günlük Otopark değil) */
  level?: boolean;
}

export function applyWeekly(s: WeeklyState, e: WeeklyEvent): WeeklyState {
  const progress = s.missions.map((m, i) => {
    let add = 0;
    if (m.kind === 'win' && e.level) add = 1;
    if (m.kind === 'passengers') add = e.passengers ?? 0;
    if (m.kind === 'buses') add = e.buses ?? 0;
    if (m.kind === 'threeStar' && e.level && e.stars === 3) add = 1;
    if (m.kind === 'hard' && e.level && e.hard) add = 1;
    if (m.kind === 'dailyDays' && e.firstDaily) add = 1;
    if (m.kind === 'map' && e.mapDone) add = 1;
    return Math.min(m.target, s.progress[i] + add);
  });
  return progress.every((v, i) => v === s.progress[i]) ? s : { ...s, progress };
}

export function claimWeekly(s: WeeklyState, i: number): { state: WeeklyState; gems: number; tickets: number } {
  if (!canClaimWeekly(s, i)) return { state: s, gems: 0, tickets: 0 };
  const claimed = s.claimed.slice();
  claimed[i] = true;
  return { state: { ...s, claimed }, gems: s.missions[i].gems, tickets: s.missions[i].tickets };
}

export function weeklyLabel(m: WeeklyMission): string {
  return t(`weekly.${m.kind}`, { n: m.target });
}
