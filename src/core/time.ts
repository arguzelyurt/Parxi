// Yerel gün ve hafta anahtarları. Görevler telefonun saatine göre gece 00:00'da yenilenir
// (Günlük Otopark'ın "herkese aynı bulmaca" günü UTC kalır, bkz. generator.dailyKey).

const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel gün: YYYY-MM-DD */
export function localDay(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Yerel gece yarısına kalan süre */
export function msToLocalMidnight(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now;
}

/** Haftanın anahtarı: o haftanın pazartesisi (yerel) */
export function localWeek(now: number): string {
  const d = new Date(now);
  const back = (d.getDay() + 6) % 7; // pazartesi 0
  return localDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime());
}

/** Gelecek pazartesi 00:00'a (yerel) kalan süre */
export function msToNextWeek(now: number): number {
  const d = new Date(now);
  const back = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back + 7).getTime() - now;
}

/** Bir gün önceki anahtar (takvim günü olarak) */
export function prevDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d - 1));
  return x.toISOString().slice(0, 10);
}
