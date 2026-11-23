// Tüm ilerleme cihazda. Geliştirme derlemesinde MMKV (senkron, hızlı); Expo Go ve web'de
// MMKV yerel modülü olmadığı için AsyncStorage'a düşer. Eski AsyncStorage kaydı ilk açılışta MMKV'ye taşınır.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdState, Booster, initialAdState } from '../core/monetization';
import type { MissionState } from '../core/missions';
import { DEFAULT_COSMETICS } from '../core/market';
import { LangSetting, t } from '../i18n';
import { hasNativeModule } from '../services/native';

export type Speed = 'slow' | 'normal' | 'fast';
/** Yolcu başına biniş süresi (ms) */
export const SPEED_MS: Record<Speed, number> = { slow: 150, normal: 95, fast: 55 };
export const SPEEDS: Speed[] = ['slow', 'normal', 'fast'];
export const speedName = (s: Speed): string => t(`speed.${s}`);

export interface Progress {
  version: 2;
  level: number;
  coins: number;
  piggy: number;
  stars: Record<string, number>;
  boosters: Record<Booster, number>;
  /** Renk körlüğü modu: araç ve yolcularda semboller */
  colorBlind: boolean;
  /** Yolcuların biniş hızı */
  speed: Speed;
  /** Arayüz dili: 'auto' = telefonun dili (Türkçe değilse İngilizce) */
  lang: LangSetting;
  /** Marketten alınan kozmetikler ve kullanılanlar */
  owned: string[];
  cosmetics: { theme: string; car: string };
  /** Garajda seçilen, ana sayfada duran araba */
  favoriteCar: string;
  /** 1. seviyedeki öğretici bitti mi */
  tutorialDone: boolean;
  /** Tanıtım kartı gösterilen engeller */
  seenIntro: string[];
  /** Günlük Otopark: son bitirilen gün, seri, gün → yıldız */
  daily: { lastDoneKey: string | null; streak: number; stars: Record<string, number> };
  ads: AdState;
  /** Destekçi paketi: ödüllü reklamı izlemeden ödülü al. */
  skipRewarded: boolean;
  /** Tıkanınca reklamla kurtarma: bugünkü sayı */
  rescueAdsToday: { day: string; count: number };
  /** Başlangıç paketi teklifinin başladığı an (0 = henüz değil) */
  starterOfferAt: number;
  starterBought: boolean;
  /** "Reklamsız" önerisi gösterildi mi (3. geçiş reklamından sonra bir kez) */
  removeAdsPrompted: boolean;
  /** İşlenmiş satın alma kimlikleri: aynı satın alma iki kez ödül vermesin */
  processedPurchases: string[];
  /** Günün görevleri (gün değişince yenilenir) */
  missions: MissionState | null;
  /** Bildirim izni bir kez soruldu mu */
  notifAsked: boolean;
  /** Saat geri alma hilesine karşı: en son görülen zaman */
  lastSeenAt: number;
}

const KEY = 'parxi.progress.v1';

export const todayUTC = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export const defaultProgress = (): Progress => ({
  version: 2,
  level: 1,
  coins: 100,
  piggy: 0,
  stars: {},
  boosters: { undo: 5, hint: 3, crane: 2, extraSlot: 1 },
  colorBlind: false,
  speed: 'normal',
  lang: 'auto',
  owned: [],
  cosmetics: { ...DEFAULT_COSMETICS },
  favoriteCar: 'minik',
  tutorialDone: false,
  seenIntro: [],
  daily: { lastDoneKey: null, streak: 0, stars: {} },
  ads: initialAdState(todayUTC()),
  skipRewarded: false,
  rescueAdsToday: { day: todayUTC(), count: 0 },
  starterOfferAt: 0,
  starterBought: false,
  removeAdsPrompted: false,
  processedPurchases: [],
  missions: null,
  notifAsked: false,
  lastSeenAt: Date.now(),
});

interface Backend {
  get(): Promise<string | null>;
  set(v: string): void;
}

function makeBackend(): Backend {
  try {
    if (!hasNativeModule('NitroModules')) throw new Error('no-mmkv');
    // Yerel modül yoksa (Expo Go / web) burada hata fırlar.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const mmkv = createMMKV({ id: 'parxi' });
    return {
      async get() {
        const v = mmkv.getString(KEY);
        if (v !== undefined) return v;
        const old = await AsyncStorage.getItem(KEY).catch(() => null);
        if (old) mmkv.set(KEY, old);
        return old;
      },
      set(v) {
        mmkv.set(KEY, v);
      },
    };
  } catch {
    return {
      get: () => AsyncStorage.getItem(KEY).catch(() => null),
      set: (v) => {
        AsyncStorage.setItem(KEY, v).catch(() => {});
      },
    };
  }
}

let backend: Backend | null = null;
const store = () => (backend ??= makeBackend());

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await store().get();
    if (!raw) return defaultProgress();
    const saved = JSON.parse(raw);
    const d = defaultProgress();
    const p = { ...d, ...saved, version: 2 } as Progress;
    p.level = Math.max(1, Number(p.level) || 1);
    p.boosters = { ...d.boosters, ...saved.boosters };
    p.daily = { ...d.daily, ...saved.daily };
    p.cosmetics = { ...d.cosmetics, ...saved.cosmetics };
    if (!Array.isArray(p.seenIntro)) p.seenIntro = [];
    if (!(p.speed in SPEED_MS)) p.speed = 'normal';
    if (!['auto', 'tr', 'en'].includes(p.lang)) p.lang = 'auto';
    p.ads = { ...initialAdState(todayUTC()), ...saved.ads, firstSession: !saved.ads };
    return p;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    store().set(JSON.stringify({ ...p, lastSeenAt: Math.max(p.lastSeenAt, Date.now()) }));
  } catch {}
}

/** Saat geri alınmışsa en son görülen zamanı kullan. */
export const trustedNow = (p: Progress): number => Math.max(Date.now(), p.lastSeenAt);
