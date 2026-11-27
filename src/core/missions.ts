// Günlük görevler (Glugo'dan uyarlandı). Saf mantık ve cihazda; görevler tarihten tohumla
// seçilir, herkese aynı görevler gelir. Üç görev bitince sandık açılır.

import { hashSeed, mulberry32, shuffle } from './rng';
import { t } from '../i18n';
import { GEM_REWARD } from './prices';

export type MissionKind =
  | 'win'
  | 'threeStar'
  | 'noHelp'
  | 'daily'
  | 'launches'
  | 'hard'
  | 'passengers'
  | 'buses'
  | 'trucks'
  | 'cars';

export interface Mission {
  kind: MissionKind;
  target: number;
  reward: number; // coin
  /** Günün büyük görevi: elmas da verir */
  gems?: number;
}

export interface MissionState {
  day: string; // YYYY-MM-DD (UTC)
  missions: Mission[];
  progress: number[];
  claimed: boolean[];
  chestClaimed: boolean;
  /** Dünden toplanmadan silinen ödül sayısı (bir kez hatırlatılır) */
  missed?: number;
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
  { kind: 'passengers', target: 150, reward: 25 },
  { kind: 'passengers', target: 300, reward: 45 },
  { kind: 'buses', target: 5, reward: 25 },
  { kind: 'buses', target: 10, reward: 40 },
  { kind: 'trucks', target: 3, reward: 30 },
  { kind: 'trucks', target: 6, reward: 45 },
  { kind: 'cars', target: 20, reward: 20 },
  { kind: 'cars', target: 40, reward: 35 },
];

/** Günde kaç görev */
export const MISSIONS_PER_DAY = 4;

/** Görevin ikonu (assets/icons) */
export const MISSION_ICON: Record<MissionKind, 'flag' | 'star' | 'shield' | 'calendar' | 'parking' | 'bolt' | 'people' | 'bus' | 'truck' | 'car'> = {
  win: 'flag',
  threeStar: 'star',
  noHelp: 'shield',
  daily: 'calendar',
  launches: 'parking',
  hard: 'bolt',
  passengers: 'people',
  buses: 'bus',
  trucks: 'truck',
  cars: 'car',
};

export const MISSION_CHEST = { coins: 50, hint: 1 } as const;

/** Günlük sandıktan bilet çıkar mı (%50, güne göre sabit: herkese aynı, ekranda görünür) */
export const chestTicket = (day: string): number => (hashSeed(`parxi-chest-ticket-${day}`) % 2 === 0 ? 1 : 0);

/** Günün görevleri: aynı türden iki görev gelmez, en az biri "taşı/park et" türünden. */
export function missionsFor(day: string): Mission[] {
  const order = shuffle(POOL, mulberry32(hashSeed(`parxi-missions-${day}`)));
  const picked: Mission[] = [];
  const counting = (k: MissionKind) => k === 'passengers' || k === 'buses' || k === 'trucks' || k === 'cars' || k === 'launches';
  const first = order.find((m) => counting(m.kind));
  if (first) picked.push(first);
  for (const m of order) {
    if (picked.some((p) => p.kind === m.kind)) continue;
    picked.push(m);
    if (picked.length === MISSIONS_PER_DAY) break;
  }
  // Biri "büyük görev": iki kat hedef, daha çok coin ve elmas
  let big = -1;
  for (let i = picked.length - 1; i >= 0; i--)
    if (picked[i].kind !== 'daily') {
      big = i;
      break;
    }
  if (big >= 0) {
    const m = picked[big];
    picked[big] = { ...m, target: m.target * 2, reward: Math.round((m.reward * 1.5) / 5) * 5, gems: GEM_REWARD.bigMission };
  }
  return picked;
}

export function freshMissions(day: string): MissionState {
  const missions = missionsFor(day);
  return { day, missions, progress: missions.map(() => 0), claimed: missions.map(() => false), chestClaimed: false };
}

/** Toplanabilir ama toplanmamış ödül sayısı (sandık dahil) */
export const unclaimedCount = (s: MissionState): number =>
  s.missions.filter((_, i) => canClaimMission(s, i)).length + (canClaimChest(s) ? 1 : 0);

/** Gün değiştiyse yeni görevler. Toplanmayan ödüller silinir; yeni gün bunu bir kez hatırlatır. */
export function ensureMissions(s: MissionState | null | undefined, day: string): MissionState {
  if (s && s.day === day) return s;
  const fresh = freshMissions(day);
  const missed = s ? unclaimedCount(s) : 0;
  return missed ? { ...fresh, missed } : fresh;
}

export interface WinEvent {
  stars: number;
  launches: number;
  usedHelp: boolean;
  isDaily: boolean;
  hard: boolean;
  /** Seviyedeki yolcu sayısı (kazanınca hepsi binmiştir) */
  passengers?: number;
  /** Yola çıkan otobüs / tır / araba sayısı */
  buses?: number;
  trucks?: number;
  cars?: number;
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
    if (m.kind === 'passengers') add = e.passengers ?? 0;
    if (m.kind === 'buses') add = e.buses ?? 0;
    if (m.kind === 'trucks') add = e.trucks ?? 0;
    if (m.kind === 'cars') add = e.cars ?? 0;
    return Math.min(m.target, s.progress[i] + add);
  });
  return progress.every((v, i) => v === s.progress[i]) ? s : { ...s, progress };
}

export const missionDone = (s: MissionState, i: number) => s.progress[i] >= s.missions[i].target;
export const canClaimMission = (s: MissionState, i: number) => missionDone(s, i) && !s.claimed[i];
export const canClaimChest = (s: MissionState) => s.claimed.every(Boolean) && !s.chestClaimed;
export const missionsLeft = (s: MissionState) => !s.chestClaimed && s.missions.some((_, i) => !missionDone(s, i));

export function claimMission(s: MissionState, i: number): { state: MissionState; coins: number; gems: number } {
  if (!canClaimMission(s, i)) return { state: s, coins: 0, gems: 0 };
  const claimed = s.claimed.slice();
  claimed[i] = true;
  return { state: { ...s, claimed }, coins: s.missions[i].reward, gems: s.missions[i].gems ?? 0 };
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
    case 'passengers':
      return t('mission.passengers', { n: m.target });
    case 'buses':
      return t('mission.buses', { n: m.target });
    case 'trucks':
      return t('mission.trucks', { n: m.target });
    case 'cars':
      return t('mission.cars', { n: m.target });
  }
}
