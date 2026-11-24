import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { streakAlive } from '../core/daily';
import { CAR_MODELS, carByKey } from '../core/garage';
import { mapOfLevel } from '../core/maps';
import { canClaimChest, canClaimMission, MissionState } from '../core/missions';
import { UI } from '../game/palette';
import { starterOfferActive } from '../game/purchases';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import CarArt from './CarArt';
import { levelsDone } from './GarageScreen';
import { Coins } from './kit';
import MissionsCard from './MissionsCard';
import Sheet from './Sheet';

interface Props {
  progress: Progress;
  todayKey: string;
  onPlay(): void;
  onDaily(): void;
  onGarage(): void;
  onMap(): void;
  onShop(): void;
  missions: MissionState;
  onClaimMission(i: number): void;
  onClaimChest(): void;
}

/** Ana sayfa: az yazı, büyük Oyna düğmesi, üç kısayol. */
export default function HomeScreen(p: Props) {
  const { progress, todayKey } = p;
  const [missionsOpen, setMissionsOpen] = useState(false);
  const n = progress.level;
  const map = mapOfLevel(n);
  const inMap = n - map.first;
  const dailyDone = progress.daily.lastDoneKey === todayKey;
  const streak = streakAlive(progress.daily.lastDoneKey, todayKey) ? progress.daily.streak : 0;
  const owned = CAR_MODELS.filter((m) => m.level <= Math.max(1, levelsDone(progress))).length;
  const m = p.missions;
  const missionsDone = m.claimed.filter(Boolean).length;
  const missionReady = m.missions.some((_, i) => canClaimMission(m, i)) || canClaimChest(m);
  const starter = starterOfferActive(progress, Date.now());

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        {starter ? (
          <Pressable onPress={p.onShop} style={styles.offer}>
            <Text style={styles.offerText}>🎁 {t('home.starterTitle')}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Coins coins={progress.coins} onPress={p.onShop} />
      </View>

      <View style={styles.hero}>
        <CarArt model={carByKey(progress.favoriteCar)} width={300} />
        <Text style={styles.logo}>Parxi</Text>
      </View>

      <Pressable onPress={p.onMap} style={styles.mapRow}>
        <Text style={styles.mapIcon}>{map.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.mapName}>{t(`map.${map.key}` as Key)}</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${(inMap / map.size) * 100}%`, backgroundColor: map.color }]} />
          </View>
        </View>
        <Text style={styles.mapCount}>
          {inMap}/{map.size}
        </Text>
      </Pressable>

      <Pressable onPress={p.onPlay} style={({ pressed }) => [styles.play, pressed && { transform: [{ scale: 0.98 }] }]}>
        <Text style={styles.playText}>▶ {t('common.level', { n })}</Text>
      </Pressable>

      <View style={styles.tiles}>
        <Tile icon="🔥" label={t('home.daily')} value={dailyDone ? '✓' : `${streak}`} dot={!dailyDone} onPress={p.onDaily} />
        <Tile icon="🚗" label={t('tab.garage')} value={`${owned}/${CAR_MODELS.length}`} onPress={p.onGarage} />
        <Tile icon="🎯" label={t('home.missions')} value={`${missionsDone}/3`} dot={missionReady} onPress={() => setMissionsOpen(true)} />
      </View>

      {progress.level > 30 && progress.piggy >= 300 && (
        <Pressable onPress={p.onShop} style={styles.piggy}>
          <Text style={styles.piggyText}>🐷 {progress.piggy}</Text>
        </Pressable>
      )}

      <Sheet visible={missionsOpen} onClose={() => setMissionsOpen(false)}>
        <View style={{ alignSelf: 'stretch' }}>
          <MissionsCard state={m} onClaim={p.onClaimMission} onClaimChest={p.onClaimChest} />
        </View>
      </Sheet>
    </ScrollView>
  );
}

function Tile(props: { icon: string; label: string; value: string; dot?: boolean; onPress(): void }) {
  return (
    <Pressable onPress={props.onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
      <Text style={styles.tileIcon}>{props.icon}</Text>
      <Text style={styles.tileValue}>{props.value}</Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {props.label}
      </Text>
      {props.dot && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  offer: { backgroundColor: UI.gold, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  offerText: { color: UI.bg, fontWeight: '900', fontSize: 15 },
  hero: { alignItems: 'center', marginTop: 18 },
  logo: { color: UI.text, fontSize: 52, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: UI.panel,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 18,
  },
  mapIcon: { fontSize: 32 },
  mapName: { color: UI.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  mapCount: { color: UI.dim, fontSize: 17, fontWeight: '800' },
  bar: { height: 10, borderRadius: 5, backgroundColor: UI.bg, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  play: {
    marginTop: 14,
    backgroundColor: UI.accent,
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: UI.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  playText: { color: UI.bg, fontSize: 28, fontWeight: '900' },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 14 },
  tile: { flex: 1, backgroundColor: UI.panel, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  tileIcon: { fontSize: 30 },
  tileValue: { color: UI.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  tileLabel: { color: UI.dim, fontSize: 15, fontWeight: '700', marginTop: 2 },
  dot: { position: 'absolute', top: 10, right: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: UI.gold },
  piggy: { alignSelf: 'center', marginTop: 14, backgroundColor: UI.panel, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8 },
  piggyText: { color: UI.gold, fontWeight: '900', fontSize: 18 },
});
