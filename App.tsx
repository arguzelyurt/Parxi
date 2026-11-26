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
import { MAX_W } from './src/ui/layout';
import { buyItem, BuyResult, claimGift, equipItem, MARKET_VERSION, openMysteryBox, Wallet } from './src/core/market';
import { canPlay } from './src/core/lives';
import { differs, mergeSaves } from './src/core/cloud';
import { ECONOMY as ECO } from './src/core/monetization';
import { dailyReady, mapHasNew, marketHasNew, missionsReady, newCars } from './src/game/badges';
import { normalizeProgress } from './src/game/storage';
import { Account, currentAccount, loadCloud, onAccountChanged, saveCloud } from './src/services/account';
import AccountSheet from './src/ui/AccountSheet';
import { LivesPanel } from './src/ui/Lives';
import Sheet from './src/ui/Sheet';
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
    if (!canPlay(p.lives, trustedNow(p)) && !(p.level === 1 && !p.tutorialDone)) {
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

  const onLevelWin = useCallback(
    (r: WinResult) =>
      update((p) => {
        // Tekrar oynanan seviye: yalnız yeni kazanılan yıldızlar için coin, en iyi yıldız saklanır.
        if (n < p.level) {
          const old = p.stars[level.id] ?? 0;
          const gained = Math.max(0, r.stars - old);
          return { ...p, coins: p.coins + gained * ECO.perStar, stars: { ...p.stars, [level.id]: Math.max(r.stars, old) } };
        }
        // Yalnız sıradaki seviye ödül verir ve ilerletir (aynı seviye iki kez ödül vermez).
        if (n !== p.level) return p;
        const coins = p.coins + coinsForLevel(r.stars, !!level.hard);
        const m = mapCompletedAt(p.level);
        const nextLevel = p.level + 1;
        return {
          ...p,
          level: nextLevel,
          coins,
          piggy: piggyAfterLevel(p.piggy, p.level),
          stars: { ...p.stars, [level.id]: Math.max(r.stars, p.stars[level.id] ?? 0) },
          ads: onLevelWon(p.ads),
          starterOfferAt:
            p.starterOfferAt === 0 && nextLevel > ECONOMY.starterUnlockLevel ? Date.now() : p.starterOfferAt,
          // Haritanın son seviyesi: harita ödülü (bir kez)
          ...(m ? claimMap({ coins, boosters: p.boosters, mapsClaimed: p.mapsClaimed }, m.index) : {}),
          missions: applyWin(ensureMissions(p.missions, todayUTC()), {
            stars: r.stars,
            launches: r.launches,
            usedHelp: r.usedHelp,
            isDaily: false,
            hard: !!level.hard,
          }),
        };
      }),
    [update, level, n],
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
    setsClaimed: p.setsClaimed,
  });

  // Market işlemleri sonucu ekrana göstermek için önce hesaplanır, sonra kaydedilir.
  const marketBuy = useCallback(
    (id: string): BuyResult => {
      const p = progressRef.current;
      if (!p) return { ok: false, reason: 'unknown' };
      const r = buyItem(walletOf(p), id, todayUTC());
      if (r.ok) update((cur) => {
        const again = buyItem(walletOf(cur), id, todayUTC());
        return again.ok ? { ...cur, ...again.wallet } : cur;
      });
      return r;
    },
    [update],
  );

  const marketGift = useCallback(() => {
    const p = progressRef.current;
    if (!p) return null;
    const r = claimGift(walletOf(p), p.gift, todayUTC());
    if (!r) return null;
    update((cur) => {
      const again = claimGift(walletOf(cur), cur.gift, todayUTC());
      return again ? { ...cur, ...again.wallet, gift: again.gift } : cur;
    });
    return r.got;
  }, [update]);

  const marketMystery = useCallback(() => {
    const p = progressRef.current;
    if (!p) return null;
    const r = openMysteryBox(walletOf(p));
    if (!r.ok) return null;
    // Aynı sonucu kaydet (rastgelelik bir kez)
    update((cur) => (cur.coins === p.coins && cur.owned.length === p.owned.length ? { ...cur, ...r.wallet } : cur));
    return { item: r.item, setBonus: r.setBonus };
  }, [update]);

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
    if (!canPlay(p.lives, trustedNow(p))) {
      setScreen({ kind: 'tabs' });
      setTab('home');
      setLivesOpen(true);
      return;
    }
    setScreen({ kind: 'level', n: p.level });
  }, [update, screen]);

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
                      missions={ensureMissions(progress.missions, todayUTC())}
                      onClaimMission={claim}
                      onClaimChest={claimChest}
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
                      newFrom={mapSeenAtOpen}
                    />
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
                      gift={progress.gift}
                      today={todayUTC()}
                      onBuy={marketBuy}
                      onEquip={marketEquip}
                      onGift={marketGift}
                      onMystery={marketMystery}
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
                      accountLabel={account ? (account.email ?? account.name ?? t(`account.via.${account.provider}`)) : null}
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
                  replay ? Math.max(0, stars - (progress.stars[level.id] ?? 0)) * ECO.perStar : coinsForLevel(stars, !!level.hard)
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
    </SafeAreaProvider>
  );
}
