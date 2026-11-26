import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { streakAlive } from '../core/daily';
import { CAR_MODELS, carByKey, nextCar } from '../core/garage';
import { isHardLevel } from '../core/generator';
import { mapOfLevel } from '../core/maps';
import { canClaimChest, canClaimMission, MissionState } from '../core/missions';
import { settleLives } from '../core/lives';
import { UI } from '../game/palette';
import { starterOfferActive } from '../game/purchases';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import CarArt from './CarArt';
import { carName, levelsDone } from './GarageScreen';
import { Coins } from './kit';
import { LivesPill, useNow } from './Lives';
import { Wiggle } from './MissionsPanel';
import { AnimatedLogo, Showcase } from './Showcase';
import { ICONS } from './icons';

interface Props {
  progress: Progress;
  todayKey: string;
  onPlay(): void;
  onDaily(): void;
  onGarage(): void;
  onMap(): void;
  onShop(): void;
  onLives(): void;
  missions: MissionState;
  onMissions(): void;
  /** Bildirim ışıkları */
  dots: { garage: boolean; map: boolean };
}

/**
 * Ana sayfa: "kaldığın yerden devam" kartı oyuncuyu yönlendirir: haritadaki yerini, geçtiği son
 * seviyeleri ve yakın hedefleri (harita ödülü, sıradaki araba, zor seviye) gösterir.
 */
export default function HomeScreen(p: Props) {
  const { progress, todayKey } = p;
  const now = useNow(1000);
  const n = progress.level;
  const map = mapOfLevel(n);
  const inMap = n - map.first;
  const toMapEnd = map.last - n + 1;
  const dailyDone = progress.daily.lastDoneKey === todayKey;
  const streak = streakAlive(progress.daily.lastDoneKey, todayKey) ? progress.daily.streak : 0;
  const done = levelsDone(progress);
  const owned = CAR_MODELS.filter((m) => m.level <= Math.max(1, done)).length;
  const car = nextCar(done);
  const toCar = car ? car.level - n + 1 : 0;
  const m = p.missions;
  const missionsDone = m.claimed.filter(Boolean).length;
  const missionReady = m.missions.some((_, i) => canClaimMission(m, i)) || canClaimChest(m);
  const starter = starterOfferActive(progress, now);
  const lives = settleLives(progress.lives, now).count;
  const hard = isHardLevel(n);

  // Yol: geçilen son 2 seviye, şu anki, sonraki 3
  const road = [-2, -1, 0, 1, 2, 3].map((d) => n + d).filter((lv) => lv >= 1);

  // "Devam et" düğmesi hafifçe nefes alır
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        {starter ? (
          <Pressable onPress={p.onShop} style={styles.offer}>
            <Text style={styles.offerText}>🎁 {t('home.starterTitle')}</Text>
          </Pressable>
        ) : (
          <LivesPill lives={progress.lives} onPress={p.onLives} />
        )}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {starter && <LivesPill lives={progress.lives} compact onPress={p.onLives} />}
          <Coins coins={progress.coins} onPress={p.onShop} />
        </View>
      </View>

      <View style={styles.hero}>
        <AnimatedLogo size={50} />
        <Pressable onPress={p.onGarage}>
          <Showcase model={carByKey(progress.favoriteCar)} width={250} />
        </Pressable>
      </View>

      {/* Kaldığın yerden devam */}
      <View style={[styles.journey, { borderColor: map.color }]}>
        <Pressable onPress={p.onMap} style={styles.mapHead}>
          <View style={[styles.mapBadge, { backgroundColor: map.color }]}>
            <Text style={styles.mapIcon}>{map.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{n === 1 ? t('home.start') : t('home.continue')}</Text>
            <Text style={styles.mapName}>
              {t(`map.${map.key}` as Key)} · {inMap}/{map.size}
            </Text>
          </View>
          <Text style={styles.chev}>›</Text>
          {p.dots.map && <View style={styles.dot} />}
        </Pressable>

        <View style={styles.road}>
          <View style={[styles.roadLine, { backgroundColor: map.color }]} />
          {road.map((lv) => {
            const isDone = lv < n;
            const here = lv === n;
            const st = progress.stars[`L${lv}`] ?? 0;
            const gift = lv === map.last;
            const carHere = car && lv === car.level;
            return (
              <View key={lv} style={styles.stop}>
                <View
                  style={[
                    styles.stopDot,
                    isDone && { backgroundColor: map.color },
                    here && [styles.stopHere, { borderColor: map.color }],
                    isHardLevel(lv) && !isDone && !here && styles.stopHard,
                  ]}
                >
                  <Text style={[styles.stopNum, isDone && { color: UI.bg }, here && styles.stopNumHere]}>
                    {gift && !isDone ? '🎁' : carHere && !here ? '🚗' : lv}
                  </Text>
                </View>
                <Text style={styles.stopStars}>{isDone ? '★'.repeat(st) || '✓' : here ? '▲' : ' '}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.goals}>
          <Goal icon="🎁" text={toMapEnd <= 1 ? t('home.goalMapNow') : t('home.goalMap', { n: toMapEnd })} />
          {car && (
            <Goal
              icon="🚗"
              text={toCar <= 1 ? t('home.goalCarNow', { name: carName(car.key) }) : t('home.goalCar', { n: toCar })}
              art={<CarArt model={car} width={64} silhouette={toCar > 1} />}
            />
          )}
          {hard && <Goal icon="⚡" text={t('home.goalHard')} hot />}
        </View>

        <Animated.View style={{ transform: [{ scale: lives > 0 ? scale : 1 }] }}>
          <Pressable
            onPress={p.onPlay}
            style={({ pressed }) => [styles.play, { backgroundColor: lives > 0 ? UI.accent : UI.panelHi }, pressed && { opacity: 0.9 }]}
          >
            <Text style={[styles.playText, lives === 0 && { color: UI.text }]}>
              {lives > 0 ? `▶  ${n === 1 ? t('home.playFirst') : t('home.playOn')}` : `❤ ${t('home.noLives')}`}
            </Text>
            <Text style={[styles.playSub, lives === 0 && { color: UI.dim }]}>{t('common.level', { n })}</Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.tiles}>
        <Tile icon="calendar" label={t('home.daily')} value={dailyDone ? '✓' : `🔥${streak}`} dot={!dailyDone} onPress={p.onDaily} />
        <Tile icon="car" label={t('tab.garage')} value={`${owned}/${CAR_MODELS.length}`} dot={p.dots.garage} onPress={p.onGarage} />
        <Tile icon="missions" label={t('home.missions')} value={`${missionsDone}/${m.missions.length}`} alert={missionReady} onPress={p.onMissions} />
      </View>

      {progress.level > 30 && progress.piggy >= 300 && (
        <Pressable onPress={p.onShop} style={styles.piggy}>
          <Text style={styles.piggyText}>🐷 {progress.piggy}</Text>
        </Pressable>
      )}

    </ScrollView>
  );
}

function Goal({ icon, text, art, hot }: { icon: string; text: string; art?: React.ReactNode; hot?: boolean }) {
  return (
    <View style={[styles.goal, hot && { backgroundColor: 'rgba(232,69,60,0.18)' }]}>
      <Text style={styles.goalIcon}>{icon}</Text>
      <Text style={[styles.goalText, hot && { color: '#FF8A80' }]} numberOfLines={2}>
        {text}
      </Text>
      {art}
    </View>
  );
}

function Tile(props: { icon: keyof typeof ICONS; label: string; value: string; dot?: boolean; alert?: boolean; onPress(): void }) {
  return (
    <Pressable onPress={props.onPress} style={({ pressed }) => [styles.tile, props.alert && styles.tileAlert, pressed && { transform: [{ scale: 0.96 }] }]}>
      <Wiggle on={!!props.alert}>
        <Image source={ICONS[props.icon]} style={styles.tileImg} />
      </Wiggle>
      <Text style={styles.tileValue}>{props.value}</Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {props.label}
      </Text>
      {props.alert ? (
        <View style={styles.alert}>
          <Text style={styles.alertText}>!</Text>
        </View>
      ) : (
        props.dot && <View style={styles.dot} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  offer: { backgroundColor: UI.gold, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  offerText: { color: UI.bg, fontWeight: '900', fontSize: 15 },
  hero: { alignItems: 'center', marginTop: 4 },

  journey: { marginTop: 10, backgroundColor: UI.panel, borderRadius: 24, padding: 16, gap: 14, borderWidth: 2 },
  mapHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapBadge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mapIcon: { fontSize: 28 },
  kicker: { color: UI.dim, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  mapName: { color: UI.text, fontSize: 20, fontWeight: '900' },
  chev: { color: UI.dim, fontSize: 32, fontWeight: '300' },

  road: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 2 },
  roadLine: { position: 'absolute', left: 20, right: 20, top: 21, height: 4, borderRadius: 2, opacity: 0.45 },
  stop: { alignItems: 'center', width: 46 },
  stopDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: UI.bg, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stopHere: { width: 46, height: 46, borderRadius: 23, backgroundColor: UI.text, borderWidth: 4, marginTop: -1 },
  stopHard: { borderWidth: 2, borderColor: UI.danger },
  stopNum: { color: UI.dim, fontSize: 15, fontWeight: '900' },
  stopNumHere: { color: UI.bg, fontSize: 18 },
  stopStars: { color: UI.gold, fontSize: 10, marginTop: 3, letterSpacing: -0.5 },

  goals: { gap: 8 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: UI.bg2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44 },
  goalIcon: { fontSize: 20 },
  goalText: { flex: 1, color: UI.text, fontSize: 15, fontWeight: '800' },

  play: {
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: UI.accent,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  playText: { color: UI.bg, fontSize: 26, fontWeight: '900' },
  playSub: { color: 'rgba(15,27,45,0.7)', fontSize: 14, fontWeight: '800', marginTop: 0 },

  tiles: { flexDirection: 'row', gap: 12, marginTop: 14 },
  tile: { flex: 1, backgroundColor: UI.panel, borderRadius: 18, paddingVertical: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  tileAlert: { borderColor: UI.gold },
  tileImg: { width: 52, height: 52 },
  alert: { position: 'absolute', top: -8, right: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: UI.danger, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  alertText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: -2 },
  tileValue: { color: UI.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  tileLabel: { color: UI.dim, fontSize: 15, fontWeight: '700', marginTop: 2 },
  dot: { position: 'absolute', top: 8, right: 10, width: 14, height: 14, borderRadius: 7, backgroundColor: UI.danger, borderWidth: 2, borderColor: UI.panel },
  piggy: { alignSelf: 'center', marginTop: 14, backgroundColor: UI.panel, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8 },
  piggyText: { color: UI.gold, fontWeight: '900', fontSize: 18 },
});
