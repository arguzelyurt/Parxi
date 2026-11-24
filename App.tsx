import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Share, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { dailyKey, dailyLevel, levelFor } from './src/core/generator';
import { dailyShareText, nextStreak } from './src/core/daily';
import {
  applyWin,
  canClaimChest,
  canClaimMission,
  claimMission,
  ensureMissions,
  MISSION_CHEST,
  missionsLeft,
} from './src/core/missions';
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
import { resolveLang, setLang, t } from './src/i18n';
import { getLocales } from 'expo-localization';

const deviceLang = (() => {
  try {
    return getLocales()[0]?.languageCode ?? null;
  } catch {
    return null;
  }
})();
import { applyPurchase, ProductKey, productKeyById, restoreNonConsumable } from './src/game/purchases';
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
import { claimMap, mapCompletedAt, mapOfLevel } from './src/core/maps';
import GarageScreen from './src/ui/GarageScreen';
import { carUnlockedAt } from './src/core/garage';
import { introFor, Feature } from './src/core/features';
import MarketScreen from './src/ui/MarketScreen';
import DailyScreen from './src/ui/DailyScreen';
import SettingsScreen from './src/ui/SettingsScreen';
import TabBar, { Tab } from './src/ui/TabBar';
import { buyItem, equipItem, Wallet } from './src/core/market';

type Screen = { kind: 'tabs' } | { kind: 'level' } | { kind: 'daily'; key: string };

export default function App() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: 'tabs' });
  const [tab, setTab] = useState<Tab>('home');
  const [, setAdsTick] = useState(0); // izin formu sonrası "gizlilik tercihleri" düğmesi için
  const progressRef = useRef<Progress | null>(null);
  progressRef.current = progress;

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((p) => {
      if (!p) return p;
      const next = fn(p);
      saveProgress(next);
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

  const n = progress?.level ?? 1;
  const level = useMemo(() => levelFor(n), [n]);
  const today = dailyKey(new Date());
  const dailyKeyOpen = screen.kind === 'daily' ? screen.key : null;
  const daily = useMemo(() => (dailyKeyOpen ? dailyLevel(dailyKeyOpen) : null), [dailyKeyOpen]);

  const onLevelWin = useCallback(
    (r: WinResult) =>
      update((p) => ({
        ...p,
        coins: p.coins + coinsForLevel(r.stars, !!level.hard),
        piggy: piggyAfterLevel(p.piggy, p.level),
        stars: { ...p.stars, [level.id]: Math.max(r.stars, p.stars[level.id] ?? 0) },
        ads: onLevelWon(p.ads),
        // Haritanın son seviyesi: harita ödülü (bir kez)
        ...(() => {
          const m = mapCompletedAt(p.level);
          return m ? claimMap({ coins: p.coins + coinsForLevel(r.stars, !!level.hard), boosters: p.boosters, mapsClaimed: p.mapsClaimed }, m.index) : {};
        })(),
        missions: applyWin(ensureMissions(p.missions, todayUTC()), {
          stars: r.stars,
          launches: r.launches,
          usedHelp: r.usedHelp,
          isDaily: false,
          hard: !!level.hard,
        }),
      })),
    [update, level],
  );

  /** Günlük ödül yalnızca günün ilk bitirişinde; her 7 günlük seride bonus. */
  const dailyCoins = useCallback(
    (key: string) => {
      const p = progressRef.current;
      if (!p || p.daily.lastDoneKey === key) return 0;
      const streak = nextStreak(p.daily.lastDoneKey, p.daily.streak, key);
      return ECONOMY.daily + (streak % 7 === 0 ? ECONOMY.streak7Bonus : 0);
    },
    [],
  );

  const onDailyWin = useCallback(
    (key: string, r: WinResult) => {
      const coins = dailyCoins(key);
      update((p) => ({
        ...p,
        coins: p.coins + coins,
        daily: {
          lastDoneKey: key,
          streak: nextStreak(p.daily.lastDoneKey, p.daily.streak, key),
          stars: { ...p.daily.stars, [key]: Math.max(r.stars, p.daily.stars[key] ?? 0) },
        },
        missions: applyWin(ensureMissions(p.missions, todayUTC()), {
          stars: r.stars,
          launches: r.launches,
          usedHelp: r.usedHelp,
          isDaily: true,
          hard: true,
        }),
      }));
    },
    [update, dailyCoins],
  );

  const claim = useCallback(
    (i: number) =>
      update((p) => {
        const r = claimMission(ensureMissions(p.missions, todayUTC()), i);
        return { ...p, coins: p.coins + r.coins, missions: r.state };
      }),
    [update],
  );

  const claimChest = useCallback(
    () =>
      update((p) => {
        const m = ensureMissions(p.missions, todayUTC());
        if (!m.claimed.every(Boolean) || m.chestClaimed) return p;
        return {
          ...p,
          coins: p.coins + MISSION_CHEST.coins,
          boosters: { ...p.boosters, hint: p.boosters.hint + MISSION_CHEST.hint },
          missions: { ...m, chestClaimed: true },
        };
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
        missionsLeft: missionsLeft(ensureMissions(p.missions, todayUTC())),
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
    boosters: p.boosters,
    owned: p.owned,
    cosmetics: p.cosmetics,
  });

  const marketBuy = useCallback(
    (id: string) =>
      update((p) => {
        const r = buyItem(walletOf(p), id);
        return r.ok ? { ...p, ...r.wallet } : p;
      }),
    [update],
  );

  const marketEquip = useCallback(
    (id: string) => update((p) => ({ ...p, ...equipItem(walletOf(p), id) })),
    [update],
  );

  const seeIntro = useCallback(
    (f: Feature) => update((p) => (p.seenIntro.includes(f) ? p : { ...p, seenIntro: [...p.seenIntro, f] })),
    [update],
  );

  const todayMissions = progress ? ensureMissions(progress.missions, todayUTC()) : null;
  const missionsClaimable =
    !!todayMissions &&
    (todayMissions.missions.some((_, i) => canClaimMission(todayMissions, i)) || canClaimChest(todayMissions));

  const shareDaily = useCallback((key: string, r: WinResult) => {
    const p = progressRef.current;
    const streak = p?.daily.lastDoneKey === key ? p.daily.streak : 1;
    Share.share({ message: dailyShareText(key, r.stars, r.launches, r.parked, streak) }).catch(() => {});
  }, []);

  /** "Sonraki seviye": geçiş reklamı kurallarına göre belki reklam, sonra yeni seviye. */
  const onNext = useCallback(async () => {
    const p = progressRef.current;
    if (!p) return;
    const ads = rollDay(p.ads, todayUTC());
    const decision = shouldShowInterstitial(
      ads,
      { level: p.level, won: true, isDaily: false, online: Ads.interstitialReady(), now: trustedNow(p) },
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
    update((cur) => {
      const level = cur.level + 1;
      const starterOfferAt =
        cur.starterOfferAt === 0 && level > ECONOMY.starterUnlockLevel ? Date.now() : cur.starterOfferAt;
      return { ...cur, level, ads: after, starterOfferAt };
    });
  }, [update]);

  return (
    <SafeAreaProvider>
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
        {progress ? (
          <>
            {screen.kind === 'tabs' && (
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                  {tab === 'home' && (
                    <HomeScreen
                      progress={progress}
                      todayKey={today}
                      onPlay={() => setScreen({ kind: 'level' })}
                      onDaily={() => setTab('daily')}
                      onGarage={() => setTab('garage')}
                      onMap={() => setTab('map')}
                      onShop={() => money.openShop()}
                      missions={ensureMissions(progress.missions, todayUTC())}
                      onClaimMission={claim}
                      onClaimChest={claimChest}
                    />
                  )}
                  {tab === 'map' && (
                    <MapScreen progress={progress} onPlay={() => setScreen({ kind: 'level' })} onShop={() => money.openShop()} />
                  )}
                  {tab === 'daily' && (
                    <DailyScreen
                      progress={progress}
                      todayKey={today}
                      onPlay={() => setScreen({ kind: 'daily', key: today })}
                      onShop={() => money.openShop()}
                    />
                  )}
                  {tab === 'market' && (
                    <MarketScreen
                      wallet={walletOf(progress)}
                      onBuy={marketBuy}
                      onEquip={marketEquip}
                      onOpenShop={() => money.openShop()}
                    />
                  )}
                  {tab === 'garage' && (
                    <GarageScreen
                      progress={progress}
                      onShop={() => money.openShop()}
                      onFavorite={(key) => update((p) => ({ ...p, favoriteCar: key }))}
                    />
                  )}
                  {tab === 'settings' && (
                    <SettingsScreen
                      progress={progress}
                      update={update}
                      onShop={() => money.openShop()}
                      onRestore={restore}
                      privacyOptions={Ads.needsPrivacyOptions() ? Ads.showPrivacyOptions : null}
                    />
                  )}
                </View>
                <TabBar
                  tab={tab}
                  onTab={setTab}
                  dots={{
                    home: missionsClaimable || progress.daily.lastDoneKey !== today,
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
                coinsFor={(stars) => coinsForLevel(stars, !!level.hard)}
                onWin={onLevelWin}
                newCar={carUnlockedAt(n)}
                mapDone={mapCompletedAt(n)}
                tutorial={n === 1 && !progress.tutorialDone}
                onTutorialDone={() => update((p) => ({ ...p, tutorialDone: true }))}
                intro={introFor(level, progress.seenIntro)}
                onIntroSeen={seeIntro}
                nextLabel={t('game.next')}
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
