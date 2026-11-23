// Parxi çekirdek kuralları. UI'dan bağımsız, saf fonksiyonlar (girdiler değiştirilmez).
//
// Otopark: w x h ızgara. Her araç (araba 2, otobüs 3, tır 4 hücre) bir yöne bakar ve yalnızca
// ileri gidebilir. Önündeki şerit kenara kadar boşsa dokununca otoparktan çıkar ve üstteki
// DURAK'ta ilk boş yere geçer. Duraktaki araçlara yolcu kuyruğunun önündeki yolcu, rengi
// tutan araca (önce gelen önce) biner. Dolan araç yola çıkar, yeri boşalır.
// Durak doluyken öndeki yolcu hiçbir araca binemiyorsa TIKANIRSIN. Bütün yolcular binince
// seviye biter (yolcu sayısı araçların toplam koltuk sayısına eşittir).
//
// Engeller:
// - Bariyer: bir hücreyi kapatır; toplam `need` araç yola çıkınca kalkar.
// - Kilitli araç: `key` renginde bir araç yola çıkana kadar yerinden oynamaz.
// - VIP yolcu: kuyruğun önüne gelince en fazla `patience` dokunuş bekler; binemezse seviye kaybedilir.
// Vinç güçlendiricisi bariyeri, kilidi ve önündeki araçları yok sayar.

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Kind = 'car' | 'bus' | 'truck';

export const KINDS: Record<Kind, { len: number; cap: number }> = {
  car: { len: 2, cap: 4 },
  bus: { len: 3, cap: 6 },
  truck: { len: 4, cap: 8 },
};

/** Renk sayısı üst sınırı (palette.COLORS ile aynı) */
export const COLOR_COUNT = 10;

export interface Vehicle {
  id: number;
  kind: Kind;
  color: number;
  /** Kapladığı alanın sol üst hücresi */
  x: number;
  y: number;
  dir: Dir;
}

export interface Barrier {
  cell: number;
  /** Kaç araç yola çıkınca kalkar */
  need: number;
}

export interface Lock {
  id: number;
  /** Bu renkte bir araç yola çıkınca kilit açılır */
  key: number;
}

export interface Vip {
  /** Kuyruktaki sırası (level.queue indeksi) */
  qi: number;
  /** Önüne geldikten sonra en fazla kaç dokunuş bekler */
  patience: number;
}

export interface Level {
  id: string;
  w: number;
  h: number;
  vehicles: Vehicle[];
  /** Yolcu kuyruğu, önden arkaya renkler */
  queue: number[];
  dockSize: number;
  hard?: boolean;
  /** Rengi, önü açılana kadar "?" görünen araçlar (yalnızca görünüm) */
  hidden?: number[];
  barriers?: Barrier[];
  locks?: Lock[];
  vip?: Vip;
  /** Üreticinin çözümündeki en yüksek durak doluluğu (yıldızlar buna göre) */
  par: number;
}

export interface Parked {
  v: Vehicle;
  filled: number;
  /** Durağa geliş sırası: yolcu, aynı renkte önce geleni doldurur */
  at: number;
}

export type Status = 'playing' | 'won' | 'stuck';
/** full: durak dolu ve kimse binemiyor · noMove: çıkabilecek araç yok · vip: VIP yolcu bekleyip gitti */
export type StuckReason = 'full' | 'noMove' | 'vip';

export interface State {
  /** Otoparkta kalan araçlar */
  lot: Vehicle[];
  /** Durak yerleri (boş yer = null) */
  dock: (Parked | null)[];
  /** Kuyrukta sıradaki yolcunun indeksi (level.queue) */
  qi: number;
  status: Status;
  reason?: StuckReason;
  taps: number;
  /** Durakta aynı anda bulunan en fazla araç */
  peak: number;
  arrivals: number;
  /** Yola çıkan araç sayısı (bariyerler buna bakar) */
  departed: number;
  /** Renge göre yola çıkan araç sayısı (kilitler buna bakar) */
  gone: number[];
  /** VIP yolcu öne geldiğinde dokunuş sayısı (null: henüz gelmedi) */
  vipStart: number | null;
}

export const lenOf = (v: Vehicle) => KINDS[v.kind].len;
export const capOf = (v: Vehicle) => KINDS[v.kind].cap;
export const horizontal = (d: Dir) => d === 'left' || d === 'right';

/** Aracın kapladığı hücreler (y * w + x) */
export function cellsOf(v: Vehicle, w: number): number[] {
  const out: number[] = [];
  const n = lenOf(v);
  for (let k = 0; k < n; k++) out.push(horizontal(v.dir) ? v.y * w + v.x + k : (v.y + k) * w + v.x);
  return out;
}

/** Aracın önünden otopark kenarına kadar geçeceği hücreler, yakından uzağa */
export function exitPath(v: Vehicle, w: number, h: number): number[] {
  const n = lenOf(v);
  const out: number[] = [];
  if (v.dir === 'right') for (let x = v.x + n; x < w; x++) out.push(v.y * w + x);
  else if (v.dir === 'left') for (let x = v.x - 1; x >= 0; x--) out.push(v.y * w + x);
  else if (v.dir === 'down') for (let y = v.y + n; y < h; y++) out.push(y * w + v.x);
  else for (let y = v.y - 1; y >= 0; y--) out.push(y * w + v.x);
  return out;
}

export const BARRIER = -2;

/** Bariyer hâlâ inik mi? */
export const barrierUp = (b: Barrier, s: State) => s.departed < b.need;

/** Hücre doluluğu: araç kimliği, kalkmamış bariyer = BARRIER, boş = -1 */
export function occupancy(level: Level, s: State): number[] {
  const g = new Array(level.w * level.h).fill(-1);
  for (const b of level.barriers ?? []) if (barrierUp(b, s)) g[b.cell] = BARRIER;
  for (const v of s.lot) for (const c of cellsOf(v, level.w)) g[c] = v.id;
  return g;
}

/** Araç kilitli mi? (anahtar renginde bir araç henüz yola çıkmadı) */
export function isLocked(level: Level, s: State, id: number): boolean {
  const l = level.locks?.find((x) => x.id === id);
  return !!l && (s.gone[l.key] ?? 0) === 0;
}

export const lockOf = (level: Level, id: number): Lock | undefined => level.locks?.find((x) => x.id === id);

/** Önü kenara kadar boş mu? (Kilide ve durağa bakmaz) */
export function pathClear(level: Level, s: State, v: Vehicle, grid?: number[]): boolean {
  const g = grid ?? occupancy(level, s);
  return exitPath(v, level.w, level.h).every((c) => g[c] === -1);
}

/** Şu an çıkabilir mi? (yol açık ve kilitli değil) */
export const canExit = (level: Level, s: State, v: Vehicle, grid?: number[]) =>
  !isLocked(level, s, v.id) && pathClear(level, s, v, grid);

export const freeSlots = (s: State) => s.dock.filter((p) => p === null).length;
export const dockCount = (s: State) => s.dock.length - freeSlots(s);
export const passengersLeft = (level: Level, s: State) => level.queue.length - s.qi;

export function initialState(level: Level): State {
  const s: State = {
    lot: level.vehicles.slice(),
    dock: new Array(level.dockSize).fill(null),
    qi: 0,
    status: level.queue.length === 0 ? 'won' : 'playing',
    taps: 0,
    peak: 0,
    arrivals: 0,
    departed: 0,
    gone: new Array(COLOR_COUNT).fill(0),
    vipStart: null,
  };
  if (level.vip && level.vip.qi === 0) s.vipStart = 0;
  return s;
}

export type TapError = 'blocked' | 'locked' | 'full' | 'gone' | 'over';

/**
 * Aracı otoparktan çıkarıp durağa koyar (yolcular henüz binmez, bkz. boardOne/settle).
 * crane: Vinç güçlendiricisi, önü kapalı ya da kilitli olsa da çıkarır.
 */
export function exitVehicle(level: Level, s: State, id: number, crane = false): State | TapError {
  if (s.status !== 'playing') return 'over';
  const v = s.lot.find((x) => x.id === id);
  if (!v) return 'gone';
  if (!crane && isLocked(level, s, id)) return 'locked';
  if (!crane && !pathClear(level, s, v)) return 'blocked';
  const slot = s.dock.indexOf(null);
  if (slot < 0) return 'full';
  const dock = s.dock.slice();
  dock[slot] = { v, filled: 0, at: s.arrivals };
  const next: State = {
    ...s,
    lot: s.lot.filter((x) => x.id !== id),
    dock,
    taps: s.taps + 1,
    arrivals: s.arrivals + 1,
  };
  next.peak = Math.max(s.peak, dockCount(next));
  return next;
}

export interface BoardStep {
  state: State;
  slot: number;
  color: number;
  /** Bu yolcuyla araç doldu ve yola çıktı */
  departed: boolean;
}

/** Öndeki tek yolcuyu bindirir. Binecek araç yoksa null. */
export function boardOne(level: Level, s: State): BoardStep | null {
  if (s.status !== 'playing' || s.qi >= level.queue.length) return null;
  const color = level.queue[s.qi];
  let slot = -1;
  s.dock.forEach((p, i) => {
    if (!p || p.v.color !== color || p.filled >= capOf(p.v)) return;
    if (slot < 0 || p.at < s.dock[slot]!.at) slot = i;
  });
  if (slot < 0) return null;
  const dock = s.dock.slice();
  const p = dock[slot]!;
  const filled = p.filled + 1;
  const departed = filled >= capOf(p.v);
  dock[slot] = departed ? null : { ...p, filled };
  let gone = s.gone;
  if (departed) {
    gone = s.gone.slice();
    gone[p.v.color] = (gone[p.v.color] ?? 0) + 1;
  }
  return {
    state: { ...s, dock, qi: s.qi + 1, departed: s.departed + (departed ? 1 : 0), gone },
    slot,
    color,
    departed,
  };
}

/** Durakta binebilecek yolcu var mı? */
const canBoard = (level: Level, s: State) => !!boardOne(level, s);

/** VIP öndeyse kalan sabır (dokunuş), değilse null */
export function vipPatienceLeft(level: Level, s: State): number | null {
  if (!level.vip || s.qi !== level.vip.qi || s.vipStart === null) return null;
  return level.vip.patience - (s.taps - s.vipStart);
}

/** Durum: bitti mi, tıkandı mı? (Yolcular bindirildikten sonra çağrılır) */
export function evaluate(level: Level, s: State): State {
  if (s.status !== 'playing') return s;
  if (s.qi >= level.queue.length) return { ...s, status: 'won' };
  let cur = s;
  // VIP öne geldiyse saati başlat
  if (level.vip && cur.qi === level.vip.qi && cur.vipStart === null) cur = { ...cur, vipStart: cur.taps };
  const left = vipPatienceLeft(level, cur);
  if (left !== null && left <= 0 && !canBoard(level, cur)) return { ...cur, status: 'stuck', reason: 'vip' };
  if (canBoard(level, cur)) return cur;
  if (freeSlots(cur) === 0) return { ...cur, status: 'stuck', reason: 'full' };
  if (cur.lot.length > 0 && legalMoves(level, cur).length === 0) return { ...cur, status: 'stuck', reason: 'noMove' };
  return cur;
}

/** Binebilecek bütün yolcuları bindirir ve durumu değerlendirir. */
export function settle(level: Level, s: State): State {
  let cur = s;
  for (;;) {
    const st = boardOne(level, cur);
    if (!st) break;
    cur = st.state;
  }
  return evaluate(level, cur);
}

/** Tek dokunuş: çıkar + bindir. */
export function tap(level: Level, s: State, id: number, crane = false): State | TapError {
  const r = exitVehicle(level, s, id, crane);
  return typeof r === 'string' ? r : settle(level, r);
}

/** Şu an otoparktan çıkabilecek araçlar (durakta yer varsa) */
export function legalMoves(level: Level, s: State): number[] {
  if (s.status !== 'playing' || freeSlots(s) === 0) return [];
  const g = occupancy(level, s);
  return s.lot.filter((v) => canExit(level, s, v, g)).map((v) => v.id);
}

/** Durağa kalıcı bir yer ekler (güçlendirici ya da tıkanınca kurtarma). */
export function addDockSlot(level: Level, s: State): State {
  if (s.status === 'won') return s;
  const { reason: _r, ...rest } = s;
  return evaluate(level, { ...rest, dock: [...s.dock, null], status: 'playing' });
}

/** Kurtarma: VIP yolcuya ek sabır (dokunuş) */
export function extendVip(level: Level, s: State, extra = 2): State {
  if (s.status === 'won' || s.vipStart === null) return s;
  const { reason: _r, ...rest } = s;
  return evaluate(level, { ...rest, vipStart: s.vipStart + extra, status: 'playing' });
}

/** Vinçle kurtarma için: tıkanma durumunu kaldırır (oyuncu vinçle bir araç seçecek) */
export function reopen(s: State): State {
  if (s.status !== 'stuck') return s;
  const { reason: _r, ...rest } = s;
  return { ...rest, status: 'playing' };
}

/** 3 yıldız: durağı çözümdeki kadar az doldurmak. 2: bir fazlası. */
export function starsFor(level: Level, s: State): 1 | 2 | 3 {
  if (s.peak <= level.par) return 3;
  if (s.peak <= level.par + 1) return 2;
  return 1;
}

export function stateKey(s: State): string {
  const lot = s.lot
    .map((v) => v.id)
    .sort((a, b) => a - b)
    .join(',');
  const dock = s.dock
    .filter((p): p is Parked => !!p)
    .sort((a, b) => a.at - b.at)
    .map((p) => `${p.v.color}.${capOf(p.v) - p.filled}`)
    .join(',');
  const vip = s.vipStart === null ? '' : `|v${s.taps - s.vipStart}`;
  return `${lot}|${dock}|${s.qi}|${s.dock.length}${vip}`;
}

/** Kuyrukta her rengin ilk görüldüğü sıra (ipucu ve çözücü için) */
export function nextNeed(level: Level, s: State): Map<number, number> {
  const m = new Map<number, number>();
  for (let i = s.qi; i < level.queue.length; i++) if (!m.has(level.queue[i])) m.set(level.queue[i], i);
  return m;
}
