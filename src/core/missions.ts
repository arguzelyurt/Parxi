// Günlük görevler (Glugo'dan uyarlandı). Saf mantık ve cihazda; görevler tarihten tohumla
// seçilir, herkese aynı görevler gelir. Üç görev bitince sandık açılır.

import { hashSeed, mulberry32, shuffle } from './rng';
import { t } from '../i18n';

export type MissionKind = 'win' | 'threeStar' | 'noHelp' | 'daily' | 'launches' | 'hard';

export interface Mission {
  kind: MissionKind;
  target: number;
  reward: number; // coin
}

export interface MissionState {
  day: string; // YYYY-MM-DD (UTC)
  missions: Mission[];
  progress: number[];
  claimed: boolean[];
  chestClaimed: boolean;
}

const POOL: Mission[] = [
  { kind: 'win', target: 3, reward: 20 },
  { kind: 'win', target: 5, reward: 35 },
  { kind: 'threeStar', target: 1, reward: 25 },
  { kind: 'threeStar', target: 2, reward: 40 },
  { kind: 'noHelp', target: 2, reward: 30 },
  { kind: 'daily', target: 1, reward: 25 },
  { kind: 'launches', target: 30, reward: 20 },
  { kind: 'launches', target: 60, reward: 35 },
  { kind: 'hard', target: 1, reward: 40 },
];

export const MISSION_CHEST = { coins: 50, hint: 1 } as const;

/** Günün 3 görevi: aynı türden iki görev gelmez. */
export function missionsFor(day: string): Mission[] {
  const order = shuffle(POOL, mulberry32(hashSeed(`parxi-missions-${day}`)));
  const picked: Mission[] = [];
  for (const m of order) {
    if (picked.some((p) => p.kind === m.kind)) continue;
    picked.push(m);
    if (picked.length === 3) break;
  }
  return picked;
}

export function freshMissions(day: string): MissionState {
  return { day, missions: missionsFor(day), progress: [0, 0, 0], claimed: [false, false, false], chestClaimed: false };
}

/** Gün değiştiyse yeni görevler. */
export const ensureMissions = (s: MissionState | null | undefined, day: string): MissionState =>
  s && s.day === day ? s : freshMissions(day);

export interface WinEvent {
  stars: number;
  launches: number;
  usedHelp: boolean;
  isDaily: boolean;
  hard: boolean;
}

/** Bir seviye (ya da Günlük Otopark) kazanılınca görev ilerlemesi. */
export function applyWin(s: MissionState, e: WinEvent): MissionState {
  const progress = s.missions.map((m, i) => {
    let add = 0;
    if (m.kind === 'win') add = 1;
    if (m.kind === 'threeStar' && e.stars === 3) add = 1;
    if (m.kind === 'noHelp' && !e.usedHelp) add = 1;
    if (m.kind === 'daily' && e.isDaily) add = 1;
    if (m.kind === 'launches') add = e.launches;
    if (m.kind === 'hard' && e.hard) add = 1;
    return Math.min(m.target, s.progress[i] + add);
  });
  return progress.every((v, i) => v === s.progress[i]) ? s : { ...s, progress };
}

export const missionDone = (s: MissionState, i: number) => s.progress[i] >= s.missions[i].target;
export const canClaimMission = (s: MissionState, i: number) => missionDone(s, i) && !s.claimed[i];
export const canClaimChest = (s: MissionState) => s.claimed.every(Boolean) && !s.chestClaimed;
export const missionsLeft = (s: MissionState) => !s.chestClaimed && s.missions.some((_, i) => !missionDone(s, i));

export function claimMission(s: MissionState, i: number): { state: MissionState; coins: number } {
  if (!canClaimMission(s, i)) return { state: s, coins: 0 };
  const claimed = s.claimed.slice();
  claimed[i] = true;
  return { state: { ...s, claimed }, coins: s.missions[i].reward };
}

export function missionLabel(m: Mission): string {
  switch (m.kind) {
    case 'win':
      return t('mission.win', { n: m.target });
    case 'threeStar':
      return m.target === 1 ? t('mission.threeStar1') : t('mission.threeStarN', { n: m.target });
    case 'noHelp':
      return t('mission.noHelp', { n: m.target });
    case 'daily':
      return t('mission.daily');
    case 'launches':
      return t('mission.launches', { n: m.target });
    case 'hard':
      return t('mission.hard');
  }
}
