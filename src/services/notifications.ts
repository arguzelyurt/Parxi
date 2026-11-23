// Yerel bildirimler (expo-notifications). Sunucu yok: hepsi telefonda zamanlanır.
// İzin, oyuncu oyunu sevdiğini gösterdikten sonra (ilk Günlük Otopark ya da 6. seviye) bir kez sorulur.

import { Platform } from 'react-native';
import { PlannedNotification } from '../core/notifyPlan';

type Lib = typeof import('expo-notifications');
let lib: Lib | null = null;

function load(): Lib | null {
  if (lib || Platform.OS === 'web') return lib;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require('expo-notifications') as Lib;
    // Oyun açıkken bildirim gösterme (oyuncu zaten oyunda).
    lib.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
    });
  } catch {
    lib = null;
  }
  return lib;
}

export async function notificationsGranted(): Promise<boolean> {
  const l = load();
  if (!l) return false;
  try {
    return (await l.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const l = load();
  if (!l) return false;
  try {
    const r = await l.requestPermissionsAsync();
    return r.granted;
  } catch {
    return false;
  }
}

/** Bekleyen bütün bildirimleri silip planı baştan kurar. */
export async function reschedule(plan: PlannedNotification[]): Promise<void> {
  const l = load();
  if (!l || !(await notificationsGranted())) return;
  try {
    await l.cancelAllScheduledNotificationsAsync();
    for (const n of plan) {
      await l.scheduleNotificationAsync({
        identifier: n.id,
        content: { title: n.title, body: n.body },
        trigger: { type: l.SchedulableTriggerInputTypes.DATE, date: n.at },
      });
    }
  } catch {}
}
