// Günlük Otopark: seri hesabı ve paylaşım metni. Sunucusuz: herkes aynı günün tohumundan aynı
// bulmacayı üretir (generator.dailyLevel), sonuç metin olarak paylaşılır.

import { getLang, t } from '../i18n';

/** YYYY-MM-DD anahtarından bir gün önceki anahtar (UTC). */
export function prevKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Bugün bitirilince yeni seri. Aynı gün ikinci kez bitirmek seriyi değiştirmez. */
export function nextStreak(lastDoneKey: string | null, streak: number, today: string): number {
  if (lastDoneKey === today) return streak;
  if (lastDoneKey === prevKey(today)) return streak + 1;
  return 1;
}

/** Seri bugün devam ediyor mu (dün ya da bugün bitirilmiş)? */
export function streakAlive(lastDoneKey: string | null, today: string): boolean {
  return lastDoneKey === today || lastDoneKey === prevKey(today);
}

export function dailyShareText(key: string, stars: number, launches: number, parked: number, streak: number): string {
  const [y, m, d] = key.split('-');
  const date = getLang() === 'tr' ? `${d}.${m}.${y}` : `${m}/${d}/${y}`;
  const starLine = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  const park = t('daily.sharePark', { n: parked });
  return [
    t('daily.shareTitle', { date }),
    t('daily.shareLine', { stars: starLine, n: launches, park }),
    streak > 1 ? t('daily.shareStreak', { n: streak }) : '',
    '#Parxi',
  ]
    .filter(Boolean)
    .join('\n');
}
