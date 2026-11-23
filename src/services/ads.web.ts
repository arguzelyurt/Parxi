// Web önizlemesi için boş uygulama: AdMob yerel modülü web'de yok.
// Geliştirmede ödüllü reklam akışı 1 sn sonra "izlendi" sayılır.
export async function initAds(_removeAds: boolean): Promise<void> {}
export const adsAvailable = () => false;
export const interstitialReady = () => false;
export const rewardedReady = () => __DEV__;
export const needsPrivacyOptions = () => false;
export async function showPrivacyOptions(): Promise<void> {}
export async function showInterstitial(): Promise<boolean> {
  return false;
}
export async function showRewarded(): Promise<boolean> {
  return __DEV__ ? new Promise((r) => setTimeout(() => r(true), 1000)) : false;
}
export function dropInterstitial() {}
