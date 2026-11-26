// Günlük görevler paneli: ekranın üstünde açılan kart (Modal değil, ki uçan coinler üstünde görünsün).
// Her görevin kendi ikonu var; "Topla"ya basınca coinler düğmeden çıkıp sayaca uçar.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import {
  canClaimChest,
  canClaimMission,
  MISSION_CHEST,
  MISSION_ICON,
  missionDone,
  missionLabel,
  MissionState,
} from '../core/missions';
import { UI } from '../game/palette';
import { t } from '../i18n';
import { useFlyCoins } from './FlyCoins';
import { ICONS } from './icons';
import { useNow } from './Lives';

interface Props {
  state: MissionState;
  onClaim(i: number): void;
  onClaimChest(): void;
  onClose(): void;
}

const fmt = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}${t('time.h')} ${m % 60}${t('time.m')}`;
};

export default function MissionsPanel({ state, onClaim, onClaimChest, onClose }: Props) {
  const fly = useFlyCoins();
  const now = useNow(30000);
  const d = new Date(now);
  const left = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now;
  const total = state.missions.length;
  const claimed = state.claimed.filter(Boolean).length;
  const chestReady = canClaimChest(state);
  const chestRef = useRef<View>(null);

  // Açılış: kart aşağıdan yaylanarak gelir
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
  }, [a]);

  return (
    <View style={styles.fill_}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.card,
          { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
        ]}
      >
        <View style={styles.head}>
          <Image source={ICONS.missions} style={styles.headIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('missions.title')}</Text>
            <Text style={styles.ends}>⏳ {t('missions.ends', { time: fmt(left) })}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {/* Sandık ilerlemesi */}
        <View style={styles.chestRow}>
          <View style={styles.chestBar}>
            <View style={[styles.chestFill, { width: `${(claimed / total) * 100}%` }]} />
            <Text style={styles.chestCount}>
              {claimed}/{total}
            </Text>
          </View>
          <Pressable
            ref={chestRef}
            disabled={!chestReady}
            onPress={() => fly?.fly(chestRef.current, MISSION_CHEST.coins, onClaimChest) ?? onClaimChest()}
          >
            <Wiggle on={chestReady}>
              <Image source={ICONS.chest} style={[styles.chestIcon, state.chestClaimed && { opacity: 0.45 }]} />
            </Wiggle>
            {state.chestClaimed && <Text style={styles.chestDone}>✓</Text>}
          </Pressable>
        </View>
        <Text style={styles.chestText}>
          {state.chestClaimed
            ? `✓ ${t('reward.taken')} · ● ${MISSION_CHEST.coins} · 💡 ${MISSION_CHEST.hint}`
            : chestReady
              ? t('missions.chestReady')
              : t('missions.chestHint', { coins: MISSION_CHEST.coins, hint: MISSION_CHEST.hint })}
        </Text>

        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10 }}>
          {state.missions.map((m, i) => (
            <Row
              key={i}
              icon={MISSION_ICON[m.kind]}
              label={missionLabel(m)}
              progress={state.progress[i]}
              target={m.target}
              reward={m.reward}
              done={missionDone(state, i)}
              claimable={canClaimMission(state, i)}
              claimed={state.claimed[i]}
              onClaim={(ref) => (fly ? fly.fly(ref, m.reward, () => onClaim(i)) : onClaim(i))}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function Row(p: {
  icon: keyof typeof ICONS;
  label: string;
  progress: number;
  target: number;
  reward: number;
  done: boolean;
  claimable: boolean;
  claimed: boolean;
  onClaim(from: View | null): void;
}) {
  const btn = useRef<View>(null);
  const pct = Math.min(1, p.progress / p.target);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!p.claimable) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [p.claimable, pulse]);
  return (
    <View style={[styles.row, p.claimable && styles.rowReady, p.claimed && styles.rowDone]}>
      <View style={[styles.iconTile, p.claimable && { backgroundColor: '#FFE9A6' }]}>
        <Image source={ICONS[p.icon]} style={styles.rowIcon} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.label, p.claimed && { color: UI.dim }]} numberOfLines={2}>
          {p.label}
        </Text>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${pct * 100}%` }, p.done && { backgroundColor: UI.gold }]} />
          <Text style={styles.barText}>
            {Math.min(p.progress, p.target)}/{p.target}
          </Text>
        </View>
      </View>
      {p.claimed ? (
        <View style={styles.taken}>
          <Text style={styles.takenText}>✓</Text>
          <Text style={styles.takenSub}>● {p.reward}</Text>
        </View>
      ) : p.claimable ? (
        <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }] }}>
          <Pressable ref={btn} onPress={() => p.onClaim(btn.current)} style={({ pressed }) => [styles.claim, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Image source={ICONS.coin} style={styles.claimCoin} />
            <Text style={styles.claimText}>{p.reward}</Text>
            <Text style={styles.claimSub}>{t('missions.collect')}</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={styles.reward}>
          <Image source={ICONS.coin} style={styles.claimCoin} />
          <Text style={styles.rewardText}>{p.reward}</Text>
        </View>
      )}
    </View>
  );
}

/** 3 saniyede bir hafifçe sallanır (alınacak ödül var) */
export function Wiggle({ on, children }: { on: boolean; children: React.ReactNode }) {
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const shake = Animated.sequence([
      Animated.timing(r, { toValue: 1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(r, { toValue: -1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(r, { toValue: 0.7, duration: 110, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(r, { toValue: -0.5, duration: 100, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(r, { toValue: 0, duration: 90, easing: Easing.linear, useNativeDriver: true }),
      Animated.delay(2500),
    ]);
    const loop = Animated.loop(shake);
    loop.start();
    return () => {
      loop.stop();
      r.setValue(0);
    };
  }, [on, r]);
  const rotate = r.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });
  const scale = r.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.06, 1, 1.06] });
  return <Animated.View style={{ transform: [{ rotate }, { scale }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill_: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  backdrop: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,10,20,0.7)' },
  card: { position: 'absolute', left: 14, right: 14, top: 70, backgroundColor: '#1C2E4A', borderRadius: 26, padding: 16, gap: 10, borderWidth: 3, borderColor: '#56CCF2' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headIcon: { width: 58, height: 58, marginTop: -26, marginLeft: -4 },
  title: { color: UI.text, fontSize: 26, fontWeight: '900' },
  ends: { color: UI.gold, fontSize: 13, fontWeight: '800' },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: UI.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  closeText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  chestRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chestBar: { flex: 1, height: 26, borderRadius: 13, backgroundColor: UI.bg, overflow: 'hidden', justifyContent: 'center' },
  chestFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: UI.gold, borderRadius: 13 },
  chestCount: { color: UI.text, fontWeight: '900', fontSize: 14, textAlign: 'center' },
  chestIcon: { width: 58, height: 58 },
  chestDone: { position: 'absolute', right: -2, bottom: 0, color: UI.accent, fontSize: 22, fontWeight: '900' },
  chestText: { color: UI.dim, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2A4166', borderRadius: 18, padding: 10, borderWidth: 2, borderColor: 'transparent' },
  rowReady: { borderColor: UI.gold, backgroundColor: '#3A4A3A' },
  rowDone: { opacity: 0.6 },
  iconTile: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#CFE6FA', alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 44, height: 44 },
  label: { color: UI.text, fontSize: 15, fontWeight: '800' },
  bar: { height: 18, borderRadius: 9, backgroundColor: UI.bg, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: UI.accent, borderRadius: 9 },
  barText: { color: UI.text, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  claim: { backgroundColor: UI.gold, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 72, borderBottomWidth: 4, borderBottomColor: '#C78F00' },
  claimCoin: { width: 22, height: 22 },
  claimText: { color: UI.bg, fontWeight: '900', fontSize: 16 },
  claimSub: { color: UI.bg, fontWeight: '900', fontSize: 11 },
  reward: { alignItems: 'center', minWidth: 60 },
  rewardText: { color: UI.gold, fontWeight: '900', fontSize: 15 },
  taken: { alignItems: 'center', minWidth: 60 },
  takenText: { color: UI.accent, fontWeight: '900', fontSize: 22 },
  takenSub: { color: UI.dim, fontWeight: '800', fontSize: 12 },
});
