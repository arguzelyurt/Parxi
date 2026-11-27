// Tüm ilerleme cihazda. Geliştirme derlemesinde MMKV (senkron, hızlı); Expo Go ve web'de
// MMKV yerel modülü olmadığı için AsyncStorage'a düşer. Eski AsyncStorage kaydı ilk açılışta MMKV'ye taşınır.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdState, Booster, initialAdState } from '../core/monetization';
import type { MissionState } from '../core/missions';
import type { WeeklyState } from '../core/weekly';
import type { LogEntry } from '../core/wallet';
import { Cosmetics, DEFAULT_COSMETICS, GiftState } from '../core/market';
import { initialLives, Lives } from '../core/lives';
import { LangSetting, t } from '../i18n';
import { CAR_MODELS } from '../core/garage';
import { sectionOf } from '../core/maps';
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
  /** Elmas (değerli para) ve park bileti (sandık / çark parası) */
  gems: number;
  tickets: number;
  /** Son 200 para hareketi (nedeniyle) */
  walletLog: LogEntry[];
  /** Elmas kumbarası (her seviyede 1 elmas birikir; satın alınca kırılır) */
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
  cosmetics: Cosmetics;
  /** Ödülü alınmış koleksiyon setleri (market kategorileri) */
  setsClaimed: string[];
  /** Market günlük hediyesi */
  gift: GiftState;
  /** Canlar (5, 10 dakikada bir dolar) */
  lives: Lives;
  /** Bildirim ışıkları: garajda görülmüş arabalar, haritada görülmüş en yüksek seviye, marketin görüldüğü gün/sürüm */
  seenCars: string[];
  seenMapLevel: number;
  marketSeenDay: string | null;
  marketSeenVersion: number;
  /** Bulut kaydın son eşitlendiği an (0 = hiç) */
  cloudSyncedAt: number;
  /** "Hesap aç" önerisi bir kez gösterildi mi */
  accountPrompted: boolean;
  /** Garajda seçilen, ana sayfada duran araba */
  favoriteCar: string;
  /** 1. seviyedeki öğretici bitti mi */
  tutorialDone: boolean;
  /** Tanıtım kartı gösterilen engeller */
  seenIntro: string[];
  /** Ödülü verilmiş haritalar */
  mapsClaimed: number[];
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
  /** Haftalık görevler */
  weekly: WeeklyState | null;
  /** Günlük Otopark seri koruyucuları (en çok 3) */
  streakShield: number;
  /** Süreli güçler: sınırsız can ve coin x2 (bitiş anı, 0 = yok) */
  boosts: { infiniteLivesUntil: number; coinX2Until: number };
  /** Şans çarkının bedava çevrildiği son yerel gün */
  wheelDay: string | null;
  /** Reklamla para: bugünkü sayı */
  adMoney: { day: string; count: number };
  /** Açılış töreni gösterilip ödülü verilmiş kısımlar (1, 2, …) */
  sectionsClaimed: number[];
  /** Ekonomi sürümü: eski kayıtlar bir kez taşınır */
  economyV: number;
  /** Bildirim izni bir kez soruldu mu */
  notifAsked: boolean;
  /** Saat geri alma hilesine karşı: en son görülen zaman */
  lastSeenAt: number;
}

const KEY = 'parxi.progress.v1';

/** Bulut kayıttan gelen ham nesneyi güvenli bir Progress'e çevirir (eksik alanlar varsayılan) */
export function normalizeProgress(saved: Record<string, unknown>): Progress {
  return parseProgress(JSON.stringify(saved));
}

export const todayUTC = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export const defaultProgress = (): Progress => ({
  version: 2,
  level: 1,
  coins: 100,
  gems: 20,
  tickets: 1,
  walletLog: [],
  piggy: 0,
  stars: {},
  boosters: { undo: 5, hint: 3, crane: 2, extraSlot: 1 },
  colorBlind: false,
  speed: 'normal',
  lang: 'auto',
  owned: [],
  cosmetics: { ...DEFAULT_COSMETICS },
  setsClaimed: [],
  gift: { day: null, streak: 0 },
  lives: initialLives(Date.now()),
  seenCars: [CAR_MODELS[0].key],
  seenMapLevel: 1,
  marketSeenDay: null,
  marketSeenVersion: 0,
  cloudSyncedAt: 0,
  accountPrompted: false,
  favoriteCar: CAR_MODELS[0].key,
  tutorialDone: false,
  seenIntro: [],
  mapsClaimed: [],
  daily: { lastDoneKey: null, streak: 0, stars: {} },
  ads: initialAdState(todayUTC()),
  skipRewarded: false,
  rescueAdsToday: { day: todayUTC(), count: 0 },
  starterOfferAt: 0,
  starterBought: false,
  removeAdsPrompted: false,
  processedPurchases: [],
  missions: null,
  weekly: null,
  streakShield: 0,
  boosts: { infiniteLivesUntil: 0, coinX2Until: 0 },
  wheelDay: null,
  adMoney: { day: todayUTC(), count: 0 },
  sectionsClaimed: [],
  economyV: 1,
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

function parseProgress(raw: string): Progress {
  const saved = JSON.parse(raw);
  const d = defaultProgress();
  const p = { ...d, ...saved, version: 2 } as Progress;
  p.level = Math.max(1, Number(p.level) || 1);
  p.boosters = { ...d.boosters, ...saved.boosters };
  p.daily = { ...d.daily, ...saved.daily };
  p.cosmetics = { ...d.cosmetics, ...saved.cosmetics };
  if (!Array.isArray(p.seenIntro)) p.seenIntro = [];
  if (!Array.isArray(p.mapsClaimed)) p.mapsClaimed = [];
  if (!Array.isArray(p.setsClaimed)) p.setsClaimed = [];
  p.gift = { ...d.gift, ...saved.gift };
  if (!saved.lives || typeof saved.lives.count !== 'number') p.lives = d.lives;
  // Bildirim ışıkları eski kayıtlarda: o ana kadar açılmış her şey görülmüş sayılır
  if (!Array.isArray(saved.seenCars)) p.seenCars = CAR_MODELS.filter((m) => m.level <= Math.max(1, p.level - 1)).map((m) => m.key);
  if (typeof saved.seenMapLevel !== 'number') p.seenMapLevel = p.level;
  if (!(p.speed in SPEED_MS)) p.speed = 'normal';
  if (!['auto', 'tr', 'en'].includes(p.lang)) p.lang = 'auto';
  p.ads = { ...initialAdState(todayUTC()), ...saved.ads, firstSession: !saved.ads };
  p.boosts = { ...d.boosts, ...saved.boosts };
  p.adMoney = { ...d.adMoney, ...saved.adMoney };
  if (!Array.isArray(p.walletLog)) p.walletLog = [];
  if (!Array.isArray(p.sectionsClaimed)) p.sectionsClaimed = [];
  // Ekonomi v1'e taşıma: elmas ve bilet başlangıç bakiyesi; coin kumbarası elmas kumbarasına döner;
  // geçilmiş kısımların töreni gösterilmez (ödülleri bir kez topluca verilir)
  if (!saved.economyV) {
    p.gems = 20;
    p.tickets = 1;
    p.piggy = Math.min(300, Math.round((Number(saved.piggy) || 0) / 10));
    p.economyV = 1;
    p.sectionsClaimed = Array.from({ length: sectionOf(p.level) }, (_, i) => i + 1);
  }
  p.gems = Math.max(0, Number(p.gems) || 0);
  p.tickets = Math.max(0, Number(p.tickets) || 0);
  p.streakShield = Math.max(0, Math.min(3, Number(p.streakShield) || 0));
  return p;
}

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await store().get();
    if (!raw) return defaultProgress();
    return parseProgress(raw);
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
