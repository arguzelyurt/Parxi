// Hangi yerel bildirimin ne zaman gideceğini planlar (Glugo'dan uyarlandı). Saf mantık; zamanlamayı servis yapar.
// Kural: günde en fazla 1 bildirim, öncelik sırasıyla. Uygulama her açıldığında ve arka plana geçerken
// plan baştan kurulur; oyuncu oynamaya devam ettikçe yalnızca en yakın hatırlatma bekler.

import { prevKey } from './daily';
import { t } from '../i18n';

export interface NotifyInput {
  now: Date; // yerel saat
  todayKey: string; // UTC gün (Günlük Otopark ile aynı)
  dailyDoneKey: string | null;
  streak: number;
  piggyFull: boolean;
  /** Bitirilmemiş görev ödülü var mı */
  missionsLeft: boolean;
}

export interface PlannedNotification {
  id: string;
  at: Date;
  title: string;
  body: string;
}

function at(base: Date, addDays: number, hour: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Seri bu gece bozulma riskinde mi? (dün çözüldü, bugün henüz değil) */
export const streakAtRisk = (lastDone: string | null, today: string, streak: number): boolean =>
  !!lastDone && streak >= 2 && lastDone === prevKey(today);

export function planNotifications(i: NotifyInput): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  const doneToday = i.dailyDoneKey === i.todayKey;
  const future = (d: Date) => d.getTime() > i.now.getTime() + 60_000;

  if (!doneToday && streakAtRisk(i.dailyDoneKey, i.todayKey, i.streak) && future(at(i.now, 0, 20))) {
    out.push({
      id: 'streak',
      at: at(i.now, 0, 20),
      title: t('notif.streakTitle', { n: i.streak }),
      body: t('notif.streakBody'),
    });
  } else if (!doneToday && future(at(i.now, 0, 19))) {
    out.push({
      id: 'daily',
      at: at(i.now, 0, 19),
      title: t('notif.dailyTitle'),
      body: t('notif.dailyBody'),
    });
  } else {
    out.push({
      id: 'daily',
      at: at(i.now, 1, 19),
      title: t('notif.newDailyTitle'),
      body: i.streak >= 2 && doneToday ? t('notif.newDailyStreak', { n: i.streak }) : t('notif.newDailyBody'),
    });
  }

  if (i.missionsLeft && future(at(i.now, 0, 21))) {
    out.push({ id: 'missions', at: at(i.now, 0, 21), title: t('notif.missionsTitle'), body: t('notif.missionsBody') });
  }

  if (i.piggyFull) out.push({ id: 'piggy', at: at(i.now, 1, 12), title: t('notif.piggyTitle'), body: t('notif.piggyBody') });

  out.push({
    id: 'winback',
    at: at(i.now, 3, 19),
    title: t('notif.winbackTitle'),
    body: t('notif.winbackBody'),
  });

  // Günde en fazla bir bildirim: aynı güne düşenlerden yalnızca ilki (öncelik sırası).
  const seen = new Set<string>();
  return out.filter((n) => {
    const k = n.at.toDateString();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
