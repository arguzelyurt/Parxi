// Can sistemi: en fazla 5 can; her can 10 dakikada bir dolar.
// Seviyeye başlamak için en az 1 can gerekir; seviye kazanılınca can gitmez.
// Can giden durumlar: "Baştan başla" (oyun sırasında ya da tıkanınca) ve hamle yapılmış bir denemeden çıkmak.
// Saf mantık (test edilir); saat geri alınsa da zaman hesabı `trustedNow` ile yapılır.

export const MAX_LIVES = 5;
export const LIFE_MS = 10 * 60 * 1000;
/** Bütün canları coin ile doldurma */
export const REFILL_COINS = 300;

export interface Lives {
  /** Son hesaplanan can sayısı */
  count: number;
  /** count < MAX iken: bir sonraki canın sayılmaya başladığı an */
  since: number;
}

export const initialLives = (now: number): Lives => ({ count: MAX_LIVES, since: now });

/** Geçen süreyle dolan canları ekler. */
export function settleLives(l: Lives, now: number): Lives {
  if (l.count >= MAX_LIVES) return { count: l.count, since: now };
  const elapsed = Math.max(0, now - l.since);
  const gained = Math.floor(elapsed / LIFE_MS);
  if (gained <= 0) return l;
  const count = Math.min(MAX_LIVES, l.count + gained);
  return { count, since: count >= MAX_LIVES ? now : l.since + gained * LIFE_MS };
}

/** Bir sonraki cana kalan süre (dolu ise 0) */
export function msToNextLife(l: Lives, now: number): number {
  const s = settleLives(l, now);
  if (s.count >= MAX_LIVES) return 0;
  return Math.max(0, s.since + LIFE_MS - now);
}

/** Hepsinin dolmasına kalan süre */
export function msToFull(l: Lives, now: number): number {
  const s = settleLives(l, now);
  if (s.count >= MAX_LIVES) return 0;
  return msToNextLife(s, now) + (MAX_LIVES - s.count - 1) * LIFE_MS;
}

export const canPlay = (l: Lives, now: number): boolean => settleLives(l, now).count > 0;

/** 1 can harca. Can yoksa null. Dolu iken harcanırsa sayaç şimdi başlar. */
export function spendLife(l: Lives, now: number): Lives | null {
  const s = settleLives(l, now);
  if (s.count <= 0) return null;
  return { count: s.count - 1, since: s.count >= MAX_LIVES ? now : s.since };
}

/** Can ekle (reklam, ödül). En fazla MAX. */
export function addLives(l: Lives, n: number, now: number): Lives {
  const s = settleLives(l, now);
  const count = Math.min(MAX_LIVES, s.count + n);
  return { count, since: count >= MAX_LIVES ? now : s.since };
}

export const fillLives = (now: number): Lives => initialLives(now);
