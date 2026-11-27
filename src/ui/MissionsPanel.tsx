// Görevler paneli (Günlük | Haftalık): ekranın üstünde açılan kart (Modal değil, ki uçan paralar
// üstünde görünsün). "Topla"ya basınca paralar düğmeden çıkıp kendi sayaçlarına uçar.
// Toplanmayan ödül gün (haftalıkta hafta) bitince silinir: kalan süre ve uyarı görünür.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import {
  canClaimChest,
  canClaimMission,
  chestTicket,
  MISSION_CHEST,
  MISSION_ICON,
  missionDone,
  missionLabel,
  MissionState,
} from '../core/missions';
import { UI } from '../game/palette';
import { t } from '../i18n';
import { useFlyCoins, ViewRef } from './FlyCoins';
import { ICONS } from './icons';
import { fmtMs, useNow } from './Lives';
import { canClaimWeekly, WEEKLY_ICON, weeklyDone, weeklyLabel, WeeklyState } from '../core/weekly';
import { msToLocalMidnight, msToNextWeek } from '../core/time';

interface Props {
  state: MissionState;
  weekly: WeeklyState;
  onClaim(i: number): void;
  onClaimChest(): void;
  onClaimWeekly(i: number): void;
  /** "Dün toplanmadı" hatırlatması görüldü */
  onSeenMissed(): void;
  onClose(): void;
}

const fmt = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440);
  if (d > 0) return `${d}${t('time.d')} ${Math.floor((m % 1440) / 60)}${t('time.h')}`;
  return `${Math.floor(m / 60)}${t('time.h')} ${m % 60}${t('time.m')}`;
};

export default function MissionsPanel(props: Props) {
  const { state, weekly, onClaim, onClaimChest, onClose } = props;
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const fly = useFlyCoins();
  const now = useNow(1000);
  const left = msToLocalMidnight(now);
  const weekLeft = msToNextWeek(now);
  const lastHour = left < 3600_000;
  const readyDaily = state.missions.filter((_, i) => canClaimMission(state, i)).length + (canClaimChest(state) ? 1 : 0);
  const readyWeekly = weekly.missions.filter((_, i) => canClaimWeekly(weekly, i)).length;
  const missed = state.missed ?? 0;
  const missedWeek = weekly.missed ?? 0;
  const ticket = chestTicket(state.day);
  const close = () => {
    if (missed || missedWeek) props.onSeenMissed();
    onClose();
  };
  const total = state.missions.length;
  const claimed = state.claimed.filter(Boolean).length;
  const chestReady = canClaimChest(state);
  const chestRef = useRef<ViewRef>(null);

  // Açılış: kart aşağıdan yaylanarak gelir
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
  }, [a]);

  return (
    <View style={styles.fill_}>
      <Pressable style={styles.backdrop} onPress={close} />
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
            <Text style={[styles.ends, tab === 'daily' && lastHour && { color: '#FF7A6E' }]}>
              ⏳ {t('missions.ends', { time: tab === 'daily' ? (lastHour ? fmtMs(left) : fmt(left)) : fmt(weekLeft) })}
            </Text>
          </View>
          <Pressable onPress={close} hitSlop={12} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {(['daily', 'weekly'] as const).map((k) => {
            const n = k === 'daily' ? readyDaily : readyWeekly;
            return (
              <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
                <Text style={[styles.tabText, tab === k && { color: UI.bg }]}>{t(k === 'daily' ? 'missions.daily' : 'missions.weekly')}</Text>
                {n > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{n}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {(tab === 'daily' ? readyDaily : readyWeekly) > 0 && (
          <View style={[styles.expire, tab === 'daily' && lastHour && styles.expireHot]}>
            <Text style={styles.expireText}>{t(tab === 'daily' ? 'missions.expire' : 'missions.expireWeek')}</Text>
            <Text style={styles.expireTime}>{tab === 'daily' ? fmtMs(left) : fmt(weekLeft)}</Text>
          </View>
        )}
        {tab === 'daily' && missed > 0 && <Text style={styles.missed}>{t('missions.missed', { n: missed })}</Text>}
        {tab === 'weekly' && missedWeek > 0 && <Text style={styles.missed}>{t('missions.missedWeek', { n: missedWeek })}</Text>}

        {tab === 'weekly' ? (
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 10 }}>
            {weekly.missions.map((m, i) => (
              <Row
                key={i}
                icon={WEEKLY_ICON[m.kind]}
                label={weeklyLabel(m)}
                progress={weekly.progress[i]}
                target={m.target}
                reward={m.gems}
                rewardIcon="gem"
                extra={m.tickets}
                done={weeklyDone(weekly, i)}
                claimable={canClaimWeekly(weekly, i)}
                claimed={weekly.claimed[i]}
                onClaim={(ref) => {
                  if (!fly) return props.onClaimWeekly(i);
                  fly.fly(ref, m.gems, () => props.onClaimWeekly(i), 'gems');
                  setTimeout(() => fly.fly(ref, m.tickets, undefined, 'tickets'), 150);
                }}
              />
            ))}
          </ScrollView>
        ) : (
        <>

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
            onPress={() => {
              if (!fly) return onClaimChest();
              fly.fly(chestRef.current, MISSION_CHEST.coins, onClaimChest);
              if (ticket) setTimeout(() => fly.fly(chestRef.current, 1, undefined, 'tickets'), 150);
            }}
          >
            <Wiggle on={chestReady}>
              <Image source={ICONS.chest} style={[styles.chestIcon, state.chestClaimed && { opacity: 0.45 }]} />
            </Wiggle>
            {state.chestClaimed && <Text style={styles.chestDone}>✓</Text>}
          </Pressable>
        </View>
        <Text style={styles.chestText}>
          {state.chestClaimed
            ? `✓ ${t('reward.taken')} · ● ${MISSION_CHEST.coins} · 💡 ${MISSION_CHEST.hint}${ticket ? ' · 🎟 1' : ''}`
            : chestReady
              ? t('missions.chestReady')
              : `${t('missions.chestHint', { coins: MISSION_CHEST.coins, hint: MISSION_CHEST.hint })}${ticket ? ' · 🎟 1' : ''}`}
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
              extraGems={m.gems}
              big={!!m.gems}
              hot={lastHour}
              done={missionDone(state, i)}
              claimable={canClaimMission(state, i)}
              claimed={state.claimed[i]}
              onClaim={(ref) => {
                if (!fly) return onClaim(i);
                fly.fly(ref, m.reward, () => onClaim(i));
                if (m.gems) setTimeout(() => fly.fly(ref, m.gems!, undefined, 'gems'), 150);
              }}
            />
          ))}
        </ScrollView>
        </>
        )}
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
  /** Ödülün ikonu (varsayılan coin) */
  rewardIcon?: keyof typeof ICONS;
  /** Haftalık: ek bilet */
  extra?: number;
  /** Büyük görev: ek elmas */
  extraGems?: number;
  big?: boolean;
  /** Son saat: daha sık atar */
  hot?: boolean;
  done: boolean;
  claimable: boolean;
  claimed: boolean;
  onClaim(from: ViewRef | null): void;
}) {
  const btn = useRef<ViewRef>(null);
  const pct = Math.min(1, p.progress / p.target);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!p.claimable) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: p.hot ? 280 : 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: p.hot ? 280 : 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [p.claimable, p.hot, pulse]);
  const icon = p.rewardIcon ?? 'coin';
  const extraText = p.extraGems ? `+${p.extraGems}💎` : p.extra ? `+${p.extra}🎟` : null;
  return (
    <View style={[styles.row, p.claimable && styles.rowReady, p.claimed && styles.rowDone]}>
      <View style={[styles.iconTile, p.claimable && { backgroundColor: '#FFE9A6' }]}>
        <Image source={ICONS[p.icon]} style={styles.rowIcon} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        {p.big && <Text style={styles.bigTag}>{t('missions.big')}</Text>}
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
          <Text style={styles.takenSub}>{icon === 'gem' ? '💎' : '●'} {p.reward}</Text>
        </View>
      ) : p.claimable ? (
        <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }] }}>
          <Pressable ref={btn} onPress={() => p.onClaim(btn.current)} style={({ pressed }) => [styles.claim, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Image source={ICONS[icon]} style={styles.claimCoin} />
            <Text style={styles.claimText}>{p.reward}</Text>
            {extraText && <Text style={styles.claimSub}>{extraText}</Text>}
            <Text style={styles.claimSub}>{t('missions.collect')}</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={styles.reward}>
          <Image source={ICONS[icon]} style={styles.claimCoin} />
          <Text style={[styles.rewardText, icon === 'gem' && { color: '#9FD0FF' }]}>{p.reward}</Text>
          {extraText && <Text style={styles.extra}>{extraText}</Text>}
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
  tabs: { flexDirection: 'row', backgroundColor: UI.bg, borderRadius: 16, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 8 },
  tabOn: { backgroundColor: UI.accent },
  tabText: { color: UI.dim, fontSize: 16, fontWeight: '900' },
  tabBadge: { backgroundColor: UI.danger, borderRadius: 9, minWidth: 18, paddingHorizontal: 5, height: 18, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  expire: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2A2440', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  expireHot: { backgroundColor: '#3A1820', borderWidth: 1.5, borderColor: UI.danger },
  expireText: { flex: 1, color: '#FFB4A8', fontSize: 13, fontWeight: '800' },
  expireTime: { color: '#FF7A6E', fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  missed: { color: UI.dim, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  bigTag: { alignSelf: 'flex-start', backgroundColor: '#4FA3FF', color: '#fff', fontSize: 10, fontWeight: '900', borderRadius: 6, paddingHorizontal: 6, overflow: 'hidden' },
  extra: { color: '#9FD0FF', fontWeight: '900', fontSize: 11 },
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
