import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Share, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { dailyKey, dailyLevel, levelFor } from './src/core/generator';
import { dailyShareText, nextStreak } from './src/core/daily';
import {
  applyWin,
  chestTicket,
  claimMission,
  ensureMissions,
  MISSION_CHEST,
  missionsLeft,
} from './src/core/missions';
import { applyWeekly, claimWeekly, ensureWeekly } from './src/core/weekly';
import { localDay, localWeek } from './src/core/time';
import { GEM_REWARD, ChestKind } from './src/core/prices';
import { earn } from './src/core/wallet';
import {
  applyReward,
  buyBoost,
  buyShield,
  claimSection,
  coinX2Active,
  grantAdMoney,
  infiniteLivesActive,
  adMoneyLeft,
  openChest,
  openMystery,
  repairStreak,
  seeded,
  spin,
  streakAfterDaily,
  tradeGems,
} from './src/game/economy';
import type { Reward } from './src/core/chests';
import type { FlyKind } from './src/ui/FlyCoins';
import { MoneyNav } from './src/ui/kit';
import { planNotifications } from './src/core/notifyPlan';
import { requestNotificationPermission, reschedule } from './src/services/notifications';
import {
  canShowRewarded,
  coinsForLevel,
  ECONOMY,
  onLevelWon,
  piggyAfterLevel,
  onInterstitialShown,
  onRewardedShown,
  PRODUCTS,
  rollDay,
  shouldShowInterstitial,
} from './src/core/monetization';
import { UI } from './src/game/palette';
import { themeFor } from './src/game/skins';
import { Key, resolveLang, setLang, t } from './src/i18n';
import { getLocales } from 'expo-localization';

const deviceLang = (() => {
  try {
    return getLocales()[0]?.languageCode ?? null;
  } catch {
    return null;
  }
})();
import { applyPurchase, ProductKey, productKeyById, restoreNonConsumable, starterOfferActive } from './src/game/purchases';
import { loadProgress, Progress, saveProgress, todayUTC, trustedNow } from './src/game/storage';
import * as Ads from './src/services/ads';
import * as Iap from './src/services/iap';
import { track } from './src/services/analytics';
import { getAdRules } from './src/services/remoteConfig';
import { initFirebase } from './src/services/firebase';
import GameScreen, { MonetizationApi, WinResult } from './src/ui/GameScreen';
import ShopSheet from './src/ui/ShopSheet';
import HomeScreen from './src/ui/HomeScreen';
import MapScreen from './src/ui/MapScreen';
import { claimMap, mapCompletedAt, mapOfLevel, pendingSection } from './src/core/maps';
import GarageScreen from './src/ui/GarageScreen';
import { carUnlockedAt } from './src/core/garage';
import { introFor, Feature } from './src/core/features';
import MarketScreen, { MarketPage } from './src/ui/MarketScreen';
import DailyScreen from './src/ui/DailyScreen';
import SettingsScreen from './src/ui/SettingsScreen';
import TabBar, { Tab } from './src/ui/TabBar';
import { MAX_W } from './src/ui/layout';
import { buyItem, buyItemWithGems, BuyResult, claimGift, equipItem, MARKET_VERSION, Wallet } from './src/core/market';
import { canPlay } from './src/core/lives';
import { differs, mergeSaves } from './src/core/cloud';
import { ECONOMY as ECO } from './src/core/monetization';
import { dailyReady, mapHasNew, marketHasNew, missionsReady, newCars } from './src/game/badges';
import { normalizeProgress } from './src/game/storage';
import { Account, currentAccount, loadCloud, onAccountChanged, saveCloud } from './src/services/account';
import AccountSheet from './src/ui/AccountSheet';
import { LivesPanel } from './src/ui/Lives';
import Sheet from './src/ui/Sheet';
import { FlyCoinsProvider } from './src/ui/FlyCoins';
import MissionsPanel from './src/ui/MissionsPanel';
import { enableFonts } from './src/ui/Text';
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';

type Screen = { kind: 'tabs' } | { kind: 'level'; n: number; replay?: boolean } | { kind: 'daily'; key: string };

export default function App() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: 'tabs' });
  const [tab, setTab] = useState<Tab>('home');
  const [, setAdsTick] = useState(0); // izin formu sonrası "gizlilik tercihleri" düğmesi için
  const [livesOpen, setLivesOpen] = useState(false);
  /** Para sayacının "+" düğmesi: Market'in Elmas ya da Sandıklar sayfası */
  const [marketPage, setMarketPage] = useState<{ page: MarketPage; n: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [fontsLoaded, fontError] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  enableFonts(fontsLoaded && !fontError);
  const progressRef = useRef<Progress | null>(null);
  progressRef.current = progress;

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((p) => {
      if (!p) return p;
      const next = fn(p);
      saveProgress(next);
      // Para hareketleri ölçülür (kayıttaki yeni girdiler)
      if (next.walletLog !== p.walletLog) {
        const old = new Set(p.walletLog);
        for (const e of next.walletLog.filter((x) => !old.has(x)).slice(-5)) track({ name: 'wallet', why: e.why, coins: e.c ?? 0, gems: e.g ?? 0, tickets: e.k ?? 0 });
      }
      return next;
    });
  }, []);

  // Açılış: kayıt, gün değişimi, reklam izni + SDK, mağaza bağlantısı.
  useEffect(() => {
    initFirebase();
    loadProgress().then((p) => {
      let rolled = { ...p, ads: rollDay(p.ads, todayUTC()) };
      // Geçilmiş ama ödülü alınmamış haritalar (harita sistemi gelmeden önce oynayanlar için)
      for (let i = 0; i < mapOfLevel(rolled.level).index; i++) rolled = claimMap(rolled, i);
      setProgress(rolled);
      Ads.initAds(rolled.ads.removeAds).then(() => setAdsTick((t) => t + 1));
      Iap.initIap({
        onGranted(productId, purchaseId) {
          update((cur) => applyPurchase(cur, productId, purchaseId, Date.now()));
          track({ name: 'iap_purchase', product: productId });
          const key = productKeyById(productId);
          if (key === 'removeAds' || key === 'supporter') Ads.dropInterstitial();
        },
        onRestored(productId) {
          update((cur) => restoreNonConsumable(cur, productId));
        },
        onError(message) {
          Alert.alert(t('alert.purchaseFailed'), message);
        },
      });
    });
  }, [update]);

  const buy = useCallback((key: ProductKey) => {
    Iap.buy(PRODUCTS[key].id).catch(() =>
      Alert.alert(t('alert.storeDown'), t('alert.storeDownSub')),
    );
  }, []);

  const restore = useCallback(() => {
    Iap.restore({
      onGranted: (id, pid) => update((cur) => applyPurchase(cur, id, pid, Date.now())),
      onRestored: (id) => update((cur) => restoreNonConsumable(cur, id)),
      onError: () => {},
    })
      .then(() => Alert.alert(t('alert.restored'), t('alert.restoredSub')))
      .catch(() => Alert.alert(t('alert.storeDown')));
  }, [update]);

  const money: MonetizationApi = useMemo(
    () => ({
      async watchAd(placement: string) {
        const p = progressRef.current;
        if (!p) return false;
        if (p.skipRewarded) return true; // destekçi paketi
        if (!canShowRewarded(rollDay(p.ads, todayUTC()), getAdRules())) return false;
        const ok = await Ads.showRewarded();
        if (ok) {
          track({ name: 'ad_shown', type: 'rewarded', placement });
          update((cur) => ({ ...cur, ads: onRewardedShown(rollDay(cur.ads, todayUTC()), Date.now()) }));
        }
        return ok;
      },
      rewardedAvailable() {
        const p = progressRef.current;
        if (!p) return false;
        return p.skipRewarded || (canShowRewarded(rollDay(p.ads, todayUTC()), getAdRules()) && Ads.rewardedReady());
      },
      openShop() {
        track({ name: 'iap_offer_shown', product: 'shop', placement: 'game' });
        setShopOpen(true);
      },
    }),
    [update],
  );

  // Dil her çizimden önce ayarlanır; Ayarlar'dan değişince bütün ekranlar yeniden çizilir
  setLang(resolveLang(progress?.lang ?? 'auto', deviceLang));

  // Oynanan seviye ekranda tutulur: kazanınca progress.level hemen artar, ama kazanma kartı açık kalır.
  const n = screen.kind === 'level' ? screen.n : (progress?.level ?? 1);
  const level = useMemo(() => levelFor(n), [n]);
  /** Seviyeye başla (n verilmezse sıradaki). Can yoksa can penceresi açılır. */
  const playLevel = useCallback((at?: number) => {
    const p = progressRef.current;
    if (!p) return;
    if (!canPlay(p.lives, trustedNow(p)) && !infiniteLivesActive(p, trustedNow(p)) && !(p.level === 1 && !p.tutorialDone)) {
      setLivesOpen(true);
      return;
    }
    const target = typeof at === 'number' ? Math.min(at, p.level) : p.level;
    setScreen({ kind: 'level', n: target, replay: target < p.level });
  }, []);
  const replay = screen.kind === 'level' && !!screen.replay;
  const today = dailyKey(new Date());
  const dailyKeyOpen = screen.kind === 'daily' ? screen.key : null;
  const daily = useMemo(() => (dailyKeyOpen ? dailyLevel(dailyKeyOpen) : null), [dailyKeyOpen]);

  /** Görevlerin günü ve haftası: telefonun yerel saatine göre (saat ileri alınamaz: trustedNow) */
  const mDay = (p: Progress) => localDay(trustedNow(p));
  const mWeek = (p: Progress) => localWeek(trustedNow(p));

  const onLevelWin = useCallback(
    (r: WinResult) =>
      update((p) => {
        const now = trustedNow(p);
        const x2 = coinX2Active(p, now) ? 2 : 1;
        // Tekrar oynanan seviye: yalnız yeni kazanılan yıldızlar için coin, en iyi yıldız saklanır.
        if (n < p.level) {
          const old = p.stars[level.id] ?? 0;
          const gained = Math.max(0, r.stars - old);
          return { ...earn(p, { coins: gained * ECO.perStar * x2 }, 'replay'), stars: { ...p.stars, [level.id]: Math.max(r.stars, old) } };
        }
        // Yalnız sıradaki seviye ödül verir ve ilerletir (aynı seviye iki kez ödül vermez).
        if (n !== p.level) return p;
        const m = mapCompletedAt(p.level);
        const car = carUnlockedAt(p.level);
        const nextLevel = p.level + 1;
        let next: Progress = earn(p, { coins: coinsForLevel(r.stars, !!level.hard) * x2, gems: car ? GEM_REWARD.newCar : 0 }, `level:${p.level}`);
        // Haritanın son seviyesi: harita ödülü (bir kez): coin + elmas + güçlendirici
        if (m) next = claimMap(next, m.index);
        const ev = {
          stars: r.stars,
          launches: r.launches,
          passengers: r.passengers,
          buses: r.buses,
          trucks: r.trucks,
          cars: r.cars,
          usedHelp: r.usedHelp,
          isDaily: false,
          hard: !!level.hard,
        };
        return {
          ...next,
          level: nextLevel,
          piggy: piggyAfterLevel(p.piggy, p.level),
          stars: { ...p.stars, [level.id]: Math.max(r.stars, p.stars[level.id] ?? 0) },
          ads: onLevelWon(p.ads),
          starterOfferAt:
            p.starterOfferAt === 0 && nextLevel > ECONOMY.starterUnlockLevel ? Date.now() : p.starterOfferAt,
          missions: applyWin(ensureMissions(p.missions, mDay(p)), ev),
          weekly: applyWeekly(ensureWeekly(p.weekly, mWeek(p)), { ...ev, level: true, mapDone: !!m }),
        };
      }),
    [update, level, n],
  );

  /** Günlük ödül yalnızca günün ilk bitirişinde; her 7 günlük seride bonus. */
  const dailyCoins = useCallback(
    (key: string) => {
      const p = progressRef.current;
      if (!p || p.daily.lastDoneKey === key) return 0;
      const { streak } = streakAfterDaily(p, key);
      return ECONOMY.daily + (streak % 7 === 0 ? ECONOMY.streak7Bonus : 0);
    },
    [],
  );

  const onDailyWin = useCallback(
    (key: string, r: WinResult) => {
      const coins = dailyCoins(key);
      update((p) => {
        const first = p.daily.lastDoneKey !== key;
        const st = streakAfterDaily(p, key);
        const ev = {
          stars: r.stars,
          launches: r.launches,
          passengers: r.passengers,
          buses: r.buses,
          trucks: r.trucks,
          cars: r.cars,
          usedHelp: r.usedHelp,
          isDaily: true,
          hard: true,
        };
        return {
          ...earn(p, { coins, gems: first ? st.gems : 0 }, 'daily'),
          streakShield: p.streakShield - (first ? st.shields : 0),
          daily: {
            lastDoneKey: key,
            streak: st.streak,
            stars: { ...p.daily.stars, [key]: Math.max(r.stars, p.daily.stars[key] ?? 0) },
          },
          missions: applyWin(ensureMissions(p.missions, mDay(p)), ev),
          weekly: applyWeekly(ensureWeekly(p.weekly, mWeek(p)), { ...ev, firstDaily: first }),
        };
      });
    },
    [update, dailyCoins],
  );

  const claim = useCallback(
    (i: number) =>
      update((p) => {
        const r = claimMission(ensureMissions(p.missions, mDay(p)), i);
        return { ...earn(p, { coins: r.coins, gems: r.gems }, 'mission'), missions: r.state };
      }),
    [update],
  );

  const claimChest = useCallback(
    () =>
      update((p) => {
        const m = ensureMissions(p.missions, mDay(p));
        if (!m.claimed.every(Boolean) || m.chestClaimed) return p;
        return {
          ...earn(p, { coins: MISSION_CHEST.coins, tickets: chestTicket(m.day) }, 'mission:chest'),
          boosters: { ...p.boosters, hint: p.boosters.hint + MISSION_CHEST.hint },
          missions: { ...m, chestClaimed: true },
        };
      }),
    [update],
  );

  const claimWeek = useCallback(
    (i: number) =>
      update((p) => {
        const r = claimWeekly(ensureWeekly(p.weekly, mWeek(p)), i);
        return { ...earn(p, { gems: r.gems, tickets: r.tickets }, 'weekly'), weekly: r.state };
      }),
    [update],
  );

  /** "Dün toplanmadı" hatırlatması bir kez gösterilir */
  const seenMissed = useCallback(
    () =>
      update((p) => {
        const m = ensureMissions(p.missions, mDay(p));
        const w = ensureWeekly(p.weekly, mWeek(p));
        if (m.missed || w.missed) track({ name: 'missions_missed', daily: m.missed ?? 0, weekly: w.missed ?? 0 });
        return { ...p, missions: { ...m, missed: 0 }, weekly: { ...w, missed: 0 } };
      }),
    [update],
  );

  // Bildirim planı: açılışta, günlük bulmaca çözülünce ve uygulama arka plana geçerken yeniden kurulur.
  const scheduleNotifications = useCallback(() => {
    const p = progressRef.current;
    if (!p) return;
    reschedule(
      planNotifications({
        now: new Date(),
        todayKey: todayUTC(),
        dailyDoneKey: p.daily.lastDoneKey,
        streak: p.daily.streak,
        piggyFull: p.level > ECONOMY.piggy.unlockLevel && p.piggy >= ECONOMY.piggy.cap,
        missionsLeft: missionsLeft(ensureMissions(p.missions, mDay(p))),
      }),
    );
  }, []);

  const dailyDone = progress?.daily.lastDoneKey;
  const loaded = !!progress;
  useEffect(() => {
    if (loaded) scheduleNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyDone, loaded, progress?.lang, scheduleNotifications]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') scheduleNotifications();
    });
    return () => sub.remove();
  }, [scheduleNotifications]);

  // Bildirim izni: oyuncu oyunu sevdiğini gösterince (ilk Günlük Otopark ya da 6. seviye), ana menüde bir kez sor.
  const askNotif =
    !!progress &&
    !progress.notifAsked &&
    screen.kind === 'tabs' &&
    (!!progress.daily.lastDoneKey || progress.level >= 6);
  useEffect(() => {
    if (!askNotif) return;
    update((p) => ({ ...p, notifAsked: true }));
    Alert.alert(
      t('alert.notifTitle'),
      t('alert.notifBody'),
      [
        { text: t('common.notNow'), style: 'cancel' },
        { text: t('common.yes'), onPress: () => requestNotificationPermission().then((ok) => ok && scheduleNotifications()) },
      ],
    );
  }, [askNotif, update, scheduleNotifications]);

  const walletOf = (p: Progress): Wallet => ({
    coins: p.coins,
    gems: p.gems,
    boosters: p.boosters,
    owned: p.owned,
    cosmetics: p.cosmetics,
    setsClaimed: p.setsClaimed,
  });

  /**
   * Önce hesapla (ekrana göster), sonra aynı işlemi kayda uygula. Rastgele işlemler tohumla
   * yapıldığı için iki hesap da aynı sonucu verir.
   */
  const act = useCallback(
    <R,>(fn: (p: Progress) => { p: Progress; out: R } | null): R | null => {
      const p = progressRef.current;
      if (!p) return null;
      const r = fn(p);
      if (!r) return null;
      update((cur) => fn(cur)?.p ?? cur);
      return r.out;
    },
    [update],
  );

  // Market işlemleri sonucu ekrana göstermek için önce hesaplanır, sonra kaydedilir.
  const marketBuy = useCallback(
    (id: string, gems?: boolean): BuyResult =>
      act((p) => {
        const r = gems ? buyItemWithGems(walletOf(p), id) : buyItem(walletOf(p), id, todayUTC());
        return { p: r.ok ? { ...p, ...r.wallet } : p, out: r };
      }) ?? { ok: false, reason: 'unknown' },
    [act],
  );

  const marketGift = useCallback(
    () =>
      act((p) => {
        const r = claimGift(walletOf(p), p.gift, todayUTC());
        if (!r) return null;
        return { p: earn({ ...p, ...r.wallet, gift: r.gift }, { tickets: r.got.tickets }, 'gift'), out: r.got };
      }),
    [act],
  );

  const marketMystery = useCallback(() => {
    const seed = Math.random();
    return act((p) => {
      const r = openMystery(p, seeded(seed));
      return r && { p: r.p, out: r.reward };
    });
  }, [act]);

  const marketChest = useCallback((kind: ChestKind) => {
    const seed = Math.random();
    return act((p) => {
      const r = openChest(p, kind, false, seeded(seed));
      return r && { p: r.p, out: r.reward };
    });
  }, [act]);

  const marketSpin = useCallback(() => {
    const seed = Math.random();
    return act((p) => {
      const r = spin(p, mDay(p), seeded(seed));
      return r && { p: r.p, out: r.index };
    });
  }, [act]);

  const gemAction = useCallback(
    (kind: 'infiniteLives' | 'coinX2' | 'shield' | 'repair' | 'trade'): boolean =>
      !!act((p) => {
        const now = trustedNow(p);
        const r =
          kind === 'shield'
            ? buyShield(p)
            : kind === 'repair'
              ? repairStreak(p, dailyKey(new Date()))
              : kind === 'trade'
                ? tradeGems(p)
                : buyBoost(p, kind, now);
        return r && { p: r, out: true };
      }),
    [act],
  );

  const adMoney = useCallback(
    async (kind: 'coins' | 'tickets') => {
      const ok = await money.watchAd(`money_${kind}`);
      if (!ok) return false;
      update((p) => grantAdMoney(p, kind, mDay(p)) ?? p);
      return true;
    },
    [money, update],
  );

  const sectionClaim = useCallback((section: number) => {
    const seed = Math.random();
    return act((p) => {
      const r = claimSection(p, section, seeded(seed));
      return r && { p: r.p, out: r.reward };
    });
  }, [act]);

  const marketEquip = useCallback(
    (id: string) => update((p) => ({ ...p, ...equipItem(walletOf(p), id) })),
    [update],
  );

  const seeIntro = useCallback(
    (f: Feature) => update((p) => (p.seenIntro.includes(f) ? p : { ...p, seenIntro: [...p.seenIntro, f] })),
    [update],
  );


  /** Para sayacına basınca: coin ve elmas → Market Elmas sayfası, bilet → Sandıklar */
  const openMoney = useCallback(
    (kind: FlyKind) => {
      if (screen.kind !== 'tabs') return money.openShop();
      setMissionsOpen(false);
      setMarketPage((m) => ({ page: kind === 'tickets' ? 'chests' : 'gems', n: (m?.n ?? 0) + 1 }));
      setTab('market');
    },
    [screen.kind, money],
  );

  // ---------- Bildirim ışıkları ----------
  const badges = {
    home: !!progress && (missionsReady(progress) || dailyReady(progress, today)),
    map: !!progress && mapHasNew(progress),
    market: !!progress && marketHasNew(progress),
    garage: !!progress && newCars(progress).length > 0,
  };
  // Harita/garaj açıkken "yeni" işaretleri görünsün; sekmeden çıkınca görüldü sayılır
  const [mapSeenAtOpen, setMapSeenAtOpen] = useState(0);
  const [garageFresh, setGarageFresh] = useState<string[]>([]);
  const prevTab = useRef<Tab>('home');
  useEffect(() => {
    const p = progressRef.current;
    if (!p || screen.kind !== 'tabs') return;
    const prev = prevTab.current;
    prevTab.current = tab;
    if (prev === tab) return;
    if (tab === 'map') setMapSeenAtOpen(p.seenMapLevel);
    if (tab === 'garage') setGarageFresh(newCars(p));
    if (prev === 'map') update((c) => ({ ...c, seenMapLevel: c.level }));
    if (prev === 'garage') update((c) => ({ ...c, seenCars: [...new Set([...c.seenCars, ...newCars(c)])] }));
    if (tab === 'market') update((c) => ({ ...c, marketSeenDay: todayUTC(), marketSeenVersion: MARKET_VERSION }));
  }, [tab, screen.kind, update]);

  // ---------- Hesap ve bulut kayıt ----------
  const syncAccount = useCallback(
    async (acc: Account, firstLogin: boolean) => {
      const local = progressRef.current;
      if (!local) return;
      setSyncing(true);
      try {
        const raw = await loadCloud(acc.uid);
        let next: Progress = local;
        if (raw) {
          const remote = normalizeProgress(raw);
          const freshLocal = local.level <= 1 && Object.keys(local.stars).length === 0;
          if (freshLocal) next = mergeSaves(remote, local);
          else if (firstLogin && differs(local, remote)) {
            const choice = await new Promise<'local' | 'remote'>((res) =>
              Alert.alert(t('account.conflictTitle'), t('account.conflictBody'), [
                { text: t('account.keepDevice', { n: local.level }), onPress: () => res('local') },
                { text: t('account.keepCloud', { n: remote.level }), onPress: () => res('remote') },
              ]),
            );
            const base = choice === 'local' ? local : remote;
            const other = choice === 'local' ? remote : local;
            // Seçilen kayıt kalır; satın almalar ve sahip olunan kozmetikler kaybolmaz
            next = {
              ...base,
              processedPurchases: [...new Set([...base.processedPurchases, ...other.processedPurchases])],
              owned: [...new Set([...base.owned, ...other.owned])],
              skipRewarded: base.skipRewarded || other.skipRewarded,
              ads: { ...base.ads, removeAds: base.ads.removeAds || other.ads.removeAds },
            };
          } else next = mergeSaves(local, remote);
        }
        const stamped = { ...next, cloudSyncedAt: Date.now() };
        if (await saveCloud(acc.uid, stamped)) {
          setProgress(stamped);
          saveProgress(stamped);
        }
      } catch {
        // çevrimdışı: sonra yeniden denenir
      } finally {
        setSyncing(false);
      }
    },
    [],
  );

  const accountUid = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded) return;
    const first = currentAccount();
    setAccount(first);
    accountUid.current = first?.uid ?? null;
    if (first) syncAccount(first, false);
    return onAccountChanged((a) => {
      const was = accountUid.current;
      accountUid.current = a?.uid ?? null;
      setAccount(a);
      if (a && a.uid !== was) {
        setAccountOpen(false);
        syncAccount(a, true);
      }
    });
  }, [loaded, syncAccount]);

  // Arka plana geçince ve her 5 seviyede bir buluta yaz
  const lvl = progress?.level ?? 0;
  useEffect(() => {
    const acc = account;
    if (!acc || lvl < 2 || lvl % 5 !== 0) return;
    const p = progressRef.current;
    if (p) saveCloud(acc.uid, p).then((ok) => ok && update((c) => ({ ...c, cloudSyncedAt: Date.now() })));
  }, [lvl, account, update]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      const p = progressRef.current;
      if (st === 'background' && account && p) saveCloud(account.uid, p);
    });
    return () => sub.remove();
  }, [account]);

  const shareDaily = useCallback((key: string, r: WinResult) => {
    const p = progressRef.current;
    const streak = p?.daily.lastDoneKey === key ? p.daily.streak : 1;
    Share.share({ message: dailyShareText(key, r.stars, r.launches, r.parked, streak) }).catch(() => {});
  }, []);

  /** "Sonraki seviye": geçiş reklamı kurallarına göre belki reklam, sonra yeni seviye. */
  const onNext = useCallback(async () => {
    const p = progressRef.current;
    if (!p) return;
    if (screen.kind === 'level' && screen.replay) {
      setScreen({ kind: 'tabs' });
      setTab('map');
      return;
    }
    const ads = rollDay(p.ads, todayUTC());
    const decision = shouldShowInterstitial(
      ads,
      { level: p.level - 1, won: true, isDaily: false, online: Ads.interstitialReady(), now: trustedNow(p) },
      getAdRules(),
    );
    let after = ads;
    if (decision.show && (await Ads.showInterstitial())) {
      track({ name: 'ad_shown', type: 'interstitial', placement: 'level_end' });
      after = onInterstitialShown(ads, Date.now());
      // 3. geçiş reklamından sonra bir kez "Reklamsız" önerisi.
      if (after.interstitialsToday === 3 && !p.removeAdsPrompted) {
        update((cur) => ({ ...cur, removeAdsPrompted: true }));
        Alert.alert(t('alert.noAdsTitle'), t('alert.noAdsBody'), [
          { text: t('common.notNow'), style: 'cancel' },
          { text: t('common.show'), onPress: () => setShopOpen(true) },
        ]);
      }
    }
    update((cur) => ({ ...cur, ads: after }));
    if (!canPlay(p.lives, trustedNow(p)) && !infiniteLivesActive(p, trustedNow(p))) {
      setScreen({ kind: 'tabs' });
      setTab('home');
      setLivesOpen(true);
      return;
    }
    setScreen({ kind: 'level', n: p.level });
  }, [update, screen]);

  return (
    <SafeAreaProvider>
      <FlyCoinsProvider>
      <MoneyNav.Provider value={openMoney}>
      <StatusBar style="light" />
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor:
            progress && (screen.kind === 'level' || screen.kind === 'daily')
              ? themeFor(progress.cosmetics.theme).bg
              : UI.bg,
        }}
      >
        {/* iPad'de içerik ortada, telefon genişliğine yakın bir sütunda */}
        <View style={{ flex: 1, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
        {progress ? (
          <>
            {screen.kind === 'tabs' && (
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                  {tab === 'home' && (
                    <HomeScreen
                      progress={progress}
                      todayKey={today}
                      onPlay={() => playLevel()}
                      onDaily={() => setTab('daily')}
                      onGarage={() => setTab('garage')}
                      onMap={() => setTab('map')}
                      onShop={() => money.openShop()}
                      missions={ensureMissions(progress.missions, mDay(progress))}
                      weekly={ensureWeekly(progress.weekly, mWeek(progress))}
                      onMissions={() => setMissionsOpen(true)}
                      onLives={() => setLivesOpen(true)}
                      dots={{ garage: badges.garage, map: badges.map }}
                    />
                  )}
                  {tab === 'map' && (
                    <MapScreen
                      progress={progress}
                      onPlay={() => playLevel()}
                      onPlayLevel={(lv) => playLevel(lv)}
                      onShop={() => money.openShop()}
                      newFrom={progress.seenMapLevel}
                      onSection={sectionClaim}
                    />
                  )}
                  {tab === 'daily' && (
                    <DailyScreen
                      progress={progress}
                      todayKey={today}
                      onPlay={() => setScreen({ kind: 'daily', key: today })}
                      onShop={() => openMoney('gems')}
                      onGem={gemAction}
                    />
                  )}
                  {tab === 'market' && (
                    <MarketScreen
                      key={marketPage?.n ?? 0}
                      page={marketPage?.page}
                      wallet={walletOf(progress)}
                      money={progress}
                      gift={progress.gift}
                      today={todayUTC()}
                      onBuy={marketBuy}
                      onEquip={marketEquip}
                      onGift={marketGift}
                      onMystery={marketMystery}
                      onChest={marketChest}
                      wheelFree={progress.wheelDay !== mDay(progress)}
                      onSpin={marketSpin}
                      adLeft={adMoneyLeft(progress, mDay(progress))}
                      adAvailable={money.rewardedAvailable()}
                      onAdMoney={adMoney}
                      now={now}
                      starter={starterOfferActive(progress, now)}
                      boosts={progress.boosts}
                      shields={progress.streakShield}
                      onIap={buy}
                      onGem={gemAction}
                      onOpenShop={() => money.openShop()}
                    />
                  )}
                  {tab === 'garage' && (
                    <GarageScreen
                      progress={progress}
                      onShop={() => money.openShop()}
                      onFavorite={(key) => update((p) => ({ ...p, favoriteCar: key }))}
                      onMarket={() => setTab('market')}
                      fresh={garageFresh}
                    />
                  )}
                  {tab === 'settings' && (
                    <SettingsScreen
                      progress={progress}
                      update={update}
                      onShop={() => money.openShop()}
                      onRestore={restore}
                      privacyOptions={Ads.needsPrivacyOptions() ? Ads.showPrivacyOptions : null}
                      accountLabel={account ? (account.email ?? account.name ?? t(`account.via.${account.provider}` as Key)) : null}
                      onAccount={() => setAccountOpen(true)}
                    />
                  )}
                </View>
                <TabBar
                  tab={tab}
                  onTab={setTab}
                  dots={{
                    home: badges.home,
                    map: badges.map,
                    market: badges.market,
                    garage: badges.garage,
                  }}
                />
              </View>
            )}
            {screen.kind === 'level' && (
              <GameScreen
                key={level.id}
                level={level}
                heading={t('common.level', { n })}
                trackId={n}
                progress={progress}
                update={update}
                money={money}
                coinsFor={(stars) =>
                  (replay ? Math.max(0, stars - (progress.stars[level.id] ?? 0)) * ECO.perStar : coinsForLevel(stars, !!level.hard)) *
                  (coinX2Active(progress, trustedNow(progress)) ? 2 : 1)
                }
                onWin={onLevelWin}
                newCar={replay ? null : carUnlockedAt(n)}
                mapDone={replay ? null : mapCompletedAt(n)}
                replay={replay}
                tutorial={n === 1 && !progress.tutorialDone}
                onTutorialDone={() => update((p) => ({ ...p, tutorialDone: true }))}
                intro={introFor(level, progress.seenIntro)}
                onIntroSeen={seeIntro}
                nextLabel={replay ? t('game.backToMap') : t('game.next')}
                onNext={onNext}
                onExit={() => setScreen({ kind: 'tabs' })}
              />
            )}
            {screen.kind === 'daily' && daily && (
              <GameScreen
                key={daily.id}
                level={daily}
                heading={t('game.dailyHeading')}
                trackId={daily.id}
                progress={progress}
                update={update}
                money={money}
                coinsFor={() => dailyCoins(screen.key)}
                onWin={(r) => onDailyWin(screen.key, r)}
                nextLabel={t('common.home')}
                onNext={() => setScreen({ kind: 'tabs' })}
                onExit={() => setScreen({ kind: 'tabs' })}
                extraWinAction={{ label: t('daily.share'), onPress: (r) => shareDaily(screen.key, r) }}
                intro={introFor(daily, progress.seenIntro)}
                onIntroSeen={seeIntro}
              />
            )}
            <Sheet visible={livesOpen} onClose={() => setLivesOpen(false)}>
              <LivesPanel
                progress={progress}
                update={update}
                adAvailable={money.rewardedAvailable()}
                watchAd={() => money.watchAd('lives')}
                onShop={() => {
                  setLivesOpen(false);
                  money.openShop();
                }}
                onClose={() => setLivesOpen(false)}
                onPlay={() => {
                  setLivesOpen(false);
                  playLevel();
                }}
              />
            </Sheet>
            <Sheet visible={accountOpen} onClose={() => setAccountOpen(false)}>
              <AccountSheet
                account={account}
                syncedAt={progress.cloudSyncedAt}
                syncing={syncing}
                onSync={() => account && syncAccount(account, false)}
                onClose={() => setAccountOpen(false)}
              />
            </Sheet>
            {missionsOpen && screen.kind === 'tabs' && (
              <MissionsPanel
                state={ensureMissions(progress.missions, mDay(progress))}
                weekly={ensureWeekly(progress.weekly, mWeek(progress))}
                onClaim={claim}
                onClaimChest={claimChest}
                onClaimWeekly={claimWeek}
                onSeenMissed={seenMissed}
                onClose={() => setMissionsOpen(false)}
              />
            )}
            <ShopSheet
              visible={shopOpen}
              progress={progress}
              onClose={() => setShopOpen(false)}
              onBuy={buy}
              onRestore={restore}
            />
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={UI.accent} />
          </View>
        )}
        </View>
      </SafeAreaView>
      </MoneyNav.Provider>
      </FlyCoinsProvider>
    </SafeAreaProvider>
  );
}
