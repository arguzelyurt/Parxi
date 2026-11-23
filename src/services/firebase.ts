// Firebase: Analytics (ölçüm), Crashlytics (çökme raporu), Remote Config (uzaktan ayar).
// Parxi Firebase projesi: parxi-71f97. Sunucumuz yok; Firebase'in ücretsiz Spark planı yeterli. Yerel modül yoksa (Expo Go) sessizce atlanır.

import { AD_RULES } from '../core/monetization';
import { setAnalyticsSink } from './analytics';
import { setRemoteValues } from './remoteConfig';
import { hasNativeModule } from './native';

/** Uzaktan ayarın varsayılanları: Firebase konsolunda aynı adlarla parametre açılınca bunların yerine geçer. */
const REMOTE_DEFAULTS: Record<string, string | number> = { ...AD_RULES, variant: 'default' };

export async function initFirebase(): Promise<void> {
  if (!hasNativeModule('RNFBAppModule')) return; // Expo Go: Firebase yok
  // Ölçüm
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const an = require('@react-native-firebase/analytics') as typeof import('@react-native-firebase/analytics');
    const analytics = an.getAnalytics();
    setAnalyticsSink((name, params) => {
      try {
        void an.logEvent(analytics, name, params);
      } catch {}
    });
  } catch {}

  // Çökme raporu: geliştirmede kapalı, yayında açık. JS çökmeleri modül tarafından otomatik yakalanır.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cr = require('@react-native-firebase/crashlytics') as typeof import('@react-native-firebase/crashlytics');
    await cr.setCrashlyticsCollectionEnabled(cr.getCrashlytics(), !__DEV__);
  } catch {}

  // Uzaktan ayar: önce varsayılanlar, sonra (en fazla saatte bir) sunucudan güncel değerler.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rc = require('@react-native-firebase/remote-config') as typeof import('@react-native-firebase/remote-config');
    const config = rc.getRemoteConfig();
    config.defaultConfig = REMOTE_DEFAULTS;
    config.settings = { minimumFetchIntervalMillis: __DEV__ ? 60_000 : 3_600_000, fetchTimeoutMillis: 10_000 };
    await rc.fetchAndActivate(config).catch(() => false);
    const all = rc.getAll(config);
    setRemoteValues(Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.asString()])));
  } catch {}
}

/** Beklenmeyen ama çökmeyen hataları raporlamak için. */
export function reportError(e: unknown, where: string) {
  if (!hasNativeModule('RNFBAppModule')) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cr = require('@react-native-firebase/crashlytics') as typeof import('@react-native-firebase/crashlytics');
    const c = cr.getCrashlytics();
    cr.log(c, where);
    cr.recordError(c, e instanceof Error ? e : new Error(String(e)));
  } catch {}
}
