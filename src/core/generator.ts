// Tohumlu seviye üretici.
//
// Çözülebilirlik garantisi iki adımda kurulur:
// 1) Otopark: araçlar TERS çıkış sırasıyla yerleştirilir. Her yeni aracın önündeki yol,
//    daha önce yerleştirilen (yani ondan SONRA çıkacak) araçlardan boş olmak zorunda.
//    Böylece "son yerleştirilen önce çıkar" sırası her zaman oynanabilir. Üstelik geride
//    hangi araçlar kalırsa kalsın, içlerinden en az birinin önü daima açıktır.
// 2) Yolcu kuyruğu: bu çıkış sırası, durakta en fazla D araç bekleyecek şekilde oynanır;
//    her adımda duraktaki açık araçlardan rastgele birine yolcu yazılır. Oyun kuralı (yolcu,
//    rengi tutan ve önce gelen araca biner) bu yazımla birebir aynı işlediği için çözüm geçerlidir.
// Zorluk; ızgara büyüklüğü, renk sayısı, araç karışımı, D (aynı anda bekleyen araç) ve
// kuyruğun ne kadar karıştığıyla ayarlanır. Her 10. seviye Zor: durakta bir yer eksik.

import { Barrier, Dir, Kind, KINDS, Level, Lock, State, Vehicle, cellsOf, exitPath, initialState, tap } from './rules';
import { hashSeed, mulberry32, pick, randInt, Rng, shuffle } from './rng';

export const PALETTE_SIZE = 8;

export interface Difficulty {
  w: number;
  h: number;
  colors: number;
  /** Doldurulmaya çalışılan hücre oranı */
  fill: number;
  /** Araç türü ağırlıkları */
  mix: Record<Kind, number>;
  dockSize: number;
  /** Çözümde durakta aynı anda bekleyen en fazla araç */
  wait: number;
  /** Bekleyen araç varken yenisini açma olasılığı (kuyruğun karışıklığı) */
  interleave: number;
  hiddenFrac: number;
  /** Bariyer, kilitli araç sayısı ve VIP yolcu olasılığı */
  barriers: number;
  locks: number;
  vipChance: number;
  hard: boolean;
}

/** Engellerin ilk geldiği seviyeler (tanıtım kartı bu seviyelerde çıkar) */
export const FEATURE_LEVEL = { hidden: 10, barrier: 16, lock: 24, vip: 32 } as const;

export const isHardLevel = (n: number): boolean => n >= 10 && n % 10 === 0;

export function difficultyFor(n: number): Difficulty {
  const hard = isHardLevel(n);
  // İlk üç seviye öğretici; 4. seviyeden itibaren zorluk hızla artar
  // Otopark ekran genişliğini (durakla aynı) doldurur: geniş ve kalabalık, araçlar küçük
  const [w, h] =
    n === 1 ? [6, 5] : n === 2 ? [7, 6] : n === 3 ? [8, 7] : n <= 6 ? [9, 8] : n <= 15 ? [9, 9] : n <= 35 ? [10, 10] : [10, 11];
  const colors = n <= 2 ? 2 : Math.min(7, 3 + Math.floor((n - 3) / 5));
  const mix: Record<Kind, number> = {
    car: 1,
    bus: n < 3 ? 0 : n < 10 ? 0.4 : 0.5,
    truck: n < 8 ? 0 : n < 25 ? 0.22 : 0.32,
  };
  const dockSize = hard ? 4 : 5;
  // Çözümde durakta her zaman en az bir boş yer kalır (oyuncuya nefes payı)
  const wait = n <= 3 ? 2 : n < 15 || hard ? 3 : 4;
  const interleave = Math.min(0.8, 0.4 + n * 0.012) + (hard ? 0.1 : 0);
  const hiddenFrac = n < FEATURE_LEVEL.hidden ? 0 : Math.min(0.5, 0.25 + (n - FEATURE_LEVEL.hidden) * 0.006);
  const barriers = n < FEATURE_LEVEL.barrier ? 0 : n < 30 ? 1 : 2;
  const locks = n < FEATURE_LEVEL.lock ? 0 : n < 50 ? 1 : 2;
  // İlk geldiği seviyede kesin olsun ki tanıtım kartı boşa çıkmasın
  const vipChance = n < FEATURE_LEVEL.vip ? 0 : n === FEATURE_LEVEL.vip ? 1 : 0.6;
  return {
    w,
    h,
    colors,
    fill: n === 1 ? 0.3 : n === 2 ? 0.45 : n === 3 ? 0.6 : 0.75,
    mix,
    dockSize,
    wait: Math.min(wait, dockSize - 1),
    interleave,
    hiddenFrac,
    barriers,
    locks,
    vipChance,
    hard,
  };
}

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

function weighted<T extends string>(rng: Rng, w: Record<T, number>): T {
  const keys = (Object.keys(w) as T[]).filter((k) => w[k] > 0);
  const total = keys.reduce((n, k) => n + w[k], 0);
  let r = rng() * total;
  for (const k of keys) {
    r -= w[k];
    if (r <= 0) return k;
  }
  return keys[keys.length - 1];
}

/** Ters çıkış sırasıyla otopark (dönen dizi: yerleştirme sırası; çıkış sırası bunun tersi) */
export function buildLot(rng: Rng, d: Difficulty): Vehicle[] {
  const { w, h } = d;
  const grid = new Array(w * h).fill(false);
  const placed: Vehicle[] = [];
  const target = Math.floor(w * h * d.fill);
  let used = 0;
  let fails = 0;
  while (used < target && fails < 400) {
    let kind = weighted(rng, d.mix);
    // Izgara dolarken uzun araç sığmaz: kısaltarak dene
    if (fails > 120) kind = 'car';
    const len = KINDS[kind].len;
    const dir = pick(rng, DIRS);
    const hor = dir === 'left' || dir === 'right';
    const x = randInt(rng, 0, hor ? w - len : w - 1);
    const y = randInt(rng, 0, hor ? h - 1 : h - len);
    const v: Vehicle = { id: placed.length, kind, color: 0, x, y, dir };
    const cells = cellsOf(v, w);
    // Kenara dayalı ve kenara bakan araç anında çıkar, sıkıcı: biraz daha az olası
    const path = exitPath(v, w, h);
    if (cells.some((c) => grid[c]) || path.some((c) => grid[c]) || (path.length === 0 && rng() < 0.7)) {
      fails++;
      continue;
    }
    // Not: kafa kafaya bakan iki araç oluşamaz, çünkü sonraki aracın yolu öncekinden boş olmalı.
    for (const c of cells) grid[c] = true;
    placed.push(v);
    used += len;
    fails = 0;
  }
  return placed;
}

/** Araçlara renk dağıtır: her renkten en az bir araç */
function paint(rng: Rng, vs: Vehicle[], colors: number): number[] {
  const palette = shuffle([...Array(PALETTE_SIZE).keys()], rng).slice(0, Math.min(colors, vs.length));
  const order = shuffle(vs.map((_, i) => i), rng);
  const out = new Array(vs.length).fill(0);
  order.forEach((vi, k) => (out[vi] = k < palette.length ? palette[k] : pick(rng, palette)));
  return out;
}

/**
 * Çıkış sırasına göre yolcu kuyruğu yazar. Dönen par: durakta aynı anda bekleyen en fazla araç.
 */
export function writeQueue(rng: Rng, exitOrder: Vehicle[], wait: number, interleave: number): { queue: number[]; par: number } {
  const open: { v: Vehicle; left: number }[] = [];
  const queue: number[] = [];
  let i = 0;
  let par = 0;
  while (i < exitOrder.length || open.length > 0) {
    if (i < exitOrder.length && (open.length === 0 || (open.length < wait && rng() < interleave))) {
      const v = exitOrder[i++];
      open.push({ v, left: KINDS[v.kind].cap });
      par = Math.max(par, open.length);
      continue;
    }
    // Açık bir renk seç; o renkte önce gelen araca yaz (oyundaki biniş kuralıyla aynı)
    const colors = [...new Set(open.map((o) => o.v.color))];
    const color = pick(rng, colors);
    const k = open.findIndex((o) => o.v.color === color);
    const o = open[k];
    queue.push(color);
    if (--o.left === 0) open.splice(k, 1);
  }
  return { queue, par };
}

/** Üreticinin çözümü: son yerleştirilen önce çıkar */
export const intendedOrder = (level: Level): number[] => level.vehicles.map((v) => v.id).reverse();

interface Timeline {
  /** Her aracın çıkışından hemen önce yola çıkmış araç sayısı ve renk dağılımı */
  before: Map<number, { departed: number; gone: number[] }>;
  /** Her dokunuştan sonraki kuyruk konumu (index 0: başlangıç) */
  qiAfter: number[];
  final: State;
}

function timeline(level: Level): Timeline {
  let s = initialState(level);
  const before = new Map<number, { departed: number; gone: number[] }>();
  const qiAfter = [s.qi];
  for (const id of intendedOrder(level)) {
    before.set(id, { departed: s.departed, gone: s.gone.slice() });
    const r = tap(level, s, id);
    if (typeof r === 'string') throw new Error(`${level.id}: çözüm geçersiz (${r})`);
    s = r;
    qiAfter.push(s.qi);
  }
  return { before, qiAfter, final: s };
}

/** Bariyerler: boş ve en az bir aracın yolu üstündeki hücreler; kalkma sayısı o araçlar çıkmadan önce dolar */
function placeBarriers(rng: Rng, level: Level, tl: Timeline, count: number): Barrier[] {
  const occupied = new Set(level.vehicles.flatMap((v) => cellsOf(v, level.w)));
  const minD = new Map<number, number>();
  for (const v of level.vehicles) {
    const d = tl.before.get(v.id)!.departed;
    for (const c of exitPath(v, level.w, level.h)) {
      if (occupied.has(c)) continue;
      minD.set(c, Math.min(minD.get(c) ?? Infinity, d));
    }
  }
  const options = shuffle([...minD.entries()].filter(([, d]) => d >= 1), rng);
  return options.slice(0, count).map(([cell, d]) => ({ cell, need: Math.min(d, randInt(rng, 1, 4)) }));
}

/** Kilitler: çıkışından önce başka renkte bir araç yola çıkmış araçlar; anahtar o renk */
function placeLocks(rng: Rng, level: Level, tl: Timeline, count: number, skip: Set<number>): Lock[] {
  const opts = level.vehicles
    .filter((v) => !skip.has(v.id))
    .map((v) => {
      const g = tl.before.get(v.id)!.gone;
      const keys = g.map((n, c) => (n > 0 && c !== v.color ? c : -1)).filter((c) => c >= 0);
      return { v, keys };
    })
    .filter((o) => o.keys.length > 0);
  return shuffle(opts, rng)
    .slice(0, count)
    .map((o) => ({ id: o.v.id, key: pick(rng, o.keys) }));
}

/** VIP: öne geldikten sonra 1-3 dokunuşta binen bir yolcu; sabır = gereken + 1 */
function placeVip(rng: Rng, tl: Timeline): { qi: number; patience: number } | null {
  const q = tl.qiAfter;
  const opts: { qi: number; patience: number }[] = [];
  for (let t = 1; t < q.length; t++) {
    const front = q[t];
    if (front === 0 || (t > 0 && q[t - 1] === front)) continue; // yeni öne gelen yolcu
    let t1 = t + 1;
    while (t1 < q.length && q[t1] === front) t1++;
    const need = t1 - t;
    if (t1 < q.length && need >= 1 && need <= 3) opts.push({ qi: front, patience: need + 1 });
  }
  return opts.length ? pick(rng, opts) : null;
}

export function buildLevel(id: string, seed: number, d: Difficulty): Level {
  const rng = mulberry32(seed);
  let placed: Vehicle[] = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    placed = buildLot(rng, d);
    if (placed.length >= 3) break;
  }
  const colors = paint(rng, placed, d.colors);
  const vehicles = placed.map((v, i) => ({ ...v, color: colors[i] }));
  const exitOrder = vehicles.slice().reverse();
  const { queue, par } = writeQueue(rng, exitOrder, d.wait, d.interleave);
  const level: Level = { id, w: d.w, h: d.h, vehicles, queue, dockSize: d.dockSize, hard: d.hard, par };

  // Engeller, çözümün zaman çizelgesine göre yerleştirilir: çözüm aynen geçerli kalır
  if (d.barriers > 0 || d.locks > 0 || d.vipChance > 0) {
    const tl = timeline(level);
    const barriers = d.barriers > 0 ? placeBarriers(rng, level, tl, d.barriers) : [];
    if (barriers.length) level.barriers = barriers;
    const locks = d.locks > 0 ? placeLocks(rng, level, tl, d.locks, new Set()) : [];
    if (locks.length) level.locks = locks;
    if (d.vipChance > 0 && rng() < d.vipChance) {
      const vip = placeVip(rng, tl);
      if (vip) level.vip = vip;
    }
  }

  // Gizli araçlar: başta önü kapalı olanların bir kısmı (kilitliler hariç, iki engel üst üste binmesin)
  if (d.hiddenFrac > 0) {
    const grid = new Array(d.w * d.h).fill(-1);
    for (const b of level.barriers ?? []) grid[b.cell] = -2;
    for (const v of vehicles) for (const c of cellsOf(v, d.w)) grid[c] = v.id;
    const locked = new Set((level.locks ?? []).map((l) => l.id));
    const hidden: number[] = [];
    for (const v of vehicles) {
      if (locked.has(v.id)) continue;
      const blocked = exitPath(v, d.w, d.h).some((c) => grid[c] !== -1);
      if (blocked && rng() < d.hiddenFrac) hidden.push(v.id);
    }
    if (hidden.length) level.hidden = hidden;
  }
  return level;
}

/** n. seviye (1'den başlar) */
export function levelFor(n: number): Level {
  return buildLevel(`L${n}`, hashSeed(`parxi-level-${n}`), difficultyFor(n));
}

/** Günlük Otopark: herkese aynı, tarih (UTC, YYYY-MM-DD) tohumlu. */
export const dailyKey = (date: Date): string => date.toISOString().slice(0, 10);

export function dailyLevel(key: string): Level {
  const d: Difficulty = { ...difficultyFor(50), dockSize: 4, wait: 3, hard: true, interleave: 0.75, barriers: 1, locks: 1, vipChance: 0.5 };
  return buildLevel(`D${key}`, hashSeed(`parxi-daily-${key}`), d);
}
