// AdMob sarmalayıcı. Ne zaman reklam gösterileceğine core/monetization.ts karar verir;
// bu dosya yalnızca izin formu, yükleme ve gösterme işini yapar.
//
// Expo Go ve web'de yerel modül yok: o zaman "available" false olur. Geliştirme sırasında
// ödüllü reklam akışı test edilebilsin diye __DEV__ modunda ödül 1 sn sonra simüle edilir.

import { Platform } from 'react-native';
import { hasNativeModule } from './native';

// Yayına çıkmadan önce AdMob panelinden alınan gerçek kimliklerle değiştir.
// Geliştirme derlemelerinde her zaman Google'ın test kimlikleri kullanılır.
const PROD_UNITS = {
  ios: { interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/IOS_INTERSTITIAL', rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/IOS_REWARDED' },
  android: { interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/AND_INTERSTITIAL', rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/AND_REWARDED' },
};

type Lib = typeof import('react-native-google-mobile-ads');
type Interstitial = import('react-native-google-mobile-ads').InterstitialAd;
type Rewarded = import('react-native-google-mobile-ads').RewardedAd;

let lib: Lib | null = null;
let interstitial: Interstitial | null = null;
let rewarded: Rewarded | null = null;
let initStarted = false;
let canRequestAds = false;
let privacyOptionsRequired = false;

function loadLib(): Lib | null {
  if (Platform.OS === 'web' || !hasNativeModule('RNGoogleMobileAdsModule')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads') as Lib;
  } catch {
    return null;
  }
}

function units(l: Lib) {
  if (__DEV__) return { interstitial: l.TestIds.INTERSTITIAL, rewarded: l.TestIds.REWARDED };
  return Platform.OS === 'ios' ? PROD_UNITS.ios : PROD_UNITS.android;
}

function loadInterstitial(l: Lib) {
  const ad = l.InterstitialAd.createForAdRequest(units(l).interstitial);
  ad.addAdEventListener(l.AdEventType.CLOSED, () => loadInterstitial(l));
  ad.addAdEventListener(l.AdEventType.ERROR, () => setTimeout(() => loadInterstitial(l), 30_000));
  ad.load();
  interstitial = ad;
}

function loadRewarded(l: Lib) {
  const ad = l.RewardedAd.createForAdRequest(units(l).rewarded);
  ad.addAdEventListener(l.AdEventType.ERROR, () => setTimeout(() => loadRewarded(l), 30_000));
  ad.load();
  rewarded = ad;
}

/**
 * Açılışta bir kez: önce izin formu (AB/İngiltere'de gösterilir), sonra iOS'ta ATT izni,
 * sonra SDK başlatma ve ilk reklamların yüklenmesi. Reklamsız alanlar için yalnızca izin formu gerekmez.
 */
export async function initAds(removeAds: boolean): Promise<void> {
  if (initStarted) return;
  initStarted = true;
  lib = loadLib();
  if (!lib) return;
  try {
    const info = await lib.AdsConsent.gatherConsent();
    canRequestAds = info.canRequestAds;
    privacyOptionsRequired =
      info.privacyOptionsRequirementStatus === lib.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    // İzin akışı hata verirse (ağ yok vb.) önceki oturumun kararına bakılır.
    try {
      canRequestAds = (await lib.AdsConsent.getConsentInfo()).canRequestAds;
    } catch {
      canRequestAds = false;
    }
  }
  if (!canRequestAds) return;

  if (Platform.OS === 'ios') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const att = require('expo-tracking-transparency') as typeof import('expo-tracking-transparency');
      await att.requestTrackingPermissionsAsync();
    } catch {}
  }

  try {
    // Genel izleyici: reklam içeriği en fazla "PG" seviyesinde (mağaza yaş sınıfı 4+/Herkes ile uyumlu)
    await lib
      .MobileAds()
      .setRequestConfiguration({ maxAdContentRating: lib.MaxAdContentRating.PG })
      .catch(() => {});
    await lib.MobileAds().initialize();
    if (!removeAds) loadInterstitial(lib);
    loadRewarded(lib);
  } catch {}
}

export const adsAvailable = () => !!lib && canRequestAds;
export const interstitialReady = () => !!interstitial?.loaded;
export const rewardedReady = () => !!rewarded?.loaded || (!adsAvailable() && __DEV__);
export const needsPrivacyOptions = () => privacyOptionsRequired;

export async function showPrivacyOptions(): Promise<void> {
  if (!lib) return;
  try {
    await lib.AdsConsent.showPrivacyOptionsForm();
  } catch {}
}

/** true = reklam gösterildi. */
export async function showInterstitial(): Promise<boolean> {
  const ad = interstitial;
  if (!lib || !ad?.loaded) return false;
  return new Promise((resolve) => {
    const off = ad.addAdEventListener(lib!.AdEventType.CLOSED, () => {
      off();
      resolve(true);
    });
    ad.show().catch(() => {
      off();
      resolve(false);
    });
  });
}

/** true = oyuncu ödülü hak etti (videoyu sonuna kadar izledi). */
export async function showRewarded(): Promise<boolean> {
  const l = lib;
  const ad = rewarded;
  if (!l || !ad || !canRequestAds) {
    // Geliştirme simülasyonu (Expo Go / web).
    if (__DEV__) return new Promise((r) => setTimeout(() => r(true), 1000));
    return false;
  }
  if (!ad.loaded) return false;
  return new Promise((resolve) => {
    let earned = false;
    const offEarn = ad.addAdEventListener(l.RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const offClose = ad.addAdEventListener(l.AdEventType.CLOSED, () => {
      offEarn();
      offClose();
      loadRewarded(l); // bir sonrakini hazırla
      resolve(earned);
    });
    ad.show().catch(() => {
      offEarn();
      offClose();
      resolve(false);
    });
  });
}

/** Reklamsız satın alınınca bekleyen geçiş reklamını bırak. */
export function dropInterstitial() {
  interstitial = null;
}
