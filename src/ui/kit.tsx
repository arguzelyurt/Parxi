// Ortak parçalar: Glugo'daki düğme, kart ve başlık düzeni.
import React, { createContext, useContext, useRef } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { FlyKind, useFlyCoins, ViewRef } from './FlyCoins';
import { num } from '../i18n';
import { ICONS } from './icons';
import { Text } from './Text';
import { UI } from '../game/palette';

export function Btn(props: {
  label: string;
  onPress(): void;
  primary?: boolean;
  gold?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const filled = props.primary || props.gold;
  return (
    <Pressable
      disabled={props.disabled || props.loading}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.btn,
        props.primary && { backgroundColor: UI.accent },
        props.gold && { backgroundColor: UI.gold },
        { opacity: props.disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={filled ? UI.bg : UI.text} />
      ) : (
        <Text style={[styles.btnText, filled && { color: UI.bg }]}>{props.label}</Text>
      )}
    </Pressable>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ alignSelf: 'center', marginTop: 12 }}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

/** Para sayaçlarının "+" düğmesi nereye gider (App sağlar): coin/elmas → Market Elmas, bilet → Sandıklar */
export const MoneyNav = createContext<((kind: FlyKind) => void) | null>(null);
export const useMoneyNav = () => useContext(MoneyNav);

export interface Money3 {
  coins: number;
  gems: number;
  tickets: number;
}

const PILL_ICON: Record<FlyKind, keyof typeof ICONS> = { coins: 'coin', gems: 'gem', tickets: 'ticket' };
const PILL_COLOR: Record<FlyKind, string> = { coins: UI.gold, gems: '#9FD0FF', tickets: '#8FF0B4' };

/** Tek para sayacı: uçan paraların hedefi; para gelince zıplar */
export function Pill({ kind, value, onPress, small }: { kind: FlyKind; value: number; onPress?(): void; small?: boolean }) {
  const fly = useFlyCoins();
  const nav = useMoneyNav();
  const ref = useRef<ViewRef>(null);
  const scale = fly ? fly.bumps[kind].interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) : 1;
  const press = onPress ?? (nav ? () => nav(kind) : undefined);
  return (
    <Pressable onPress={press} disabled={!press} hitSlop={6}>
      <Animated.View
        ref={ref}
        onLayout={() => fly?.setTarget(ref.current, kind)}
        style={[styles.coinPill, small && styles.pillSmall, { transform: [{ scale }] }]}
      >
        <Image source={ICONS[PILL_ICON[kind]]} style={small ? styles.iconSmall : styles.coinIcon} />
        <Text style={[styles.coins, { color: PILL_COLOR[kind] }, small && { fontSize: 15 }]}>{num(value)}</Text>
        {press && !small && <Text style={styles.coinPlus}>+</Text>}
      </Animated.View>
    </Pressable>
  );
}

/** Coin sayacı (oyun ekranı gibi dar yerler) */
export function Coins({ coins, onPress }: { coins: number; onPress?(): void }) {
  return <Pill kind="coins" value={coins} onPress={onPress} />;
}

/** Üç para yan yana: coin, elmas, bilet */
export function MoneyBar({ money, small }: { money: Money3; small?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      <Pill kind="coins" value={money.coins} small={small} />
      <Pill kind="gems" value={money.gems} small={small} />
      <Pill kind="tickets" value={money.tickets} small={small} />
    </View>
  );
}

/** Sekme ekranlarının üst başlığı: solda başlık, sağda üç para */
export function TabHeader({ title, money }: { title: string; money: Money3 }) {
  return (
    <View style={styles.tabHeader}>
      <Text style={styles.tabTitle} numberOfLines={1}>
        {title}
      </Text>
      <MoneyBar money={money} small />
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?(): void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  return <View style={[styles.card, style]}>{children}</View>;
}

export const kit = StyleSheet.create({
  cardTitle: { color: UI.text, fontSize: 19, fontWeight: '800' },
  cardSub: { color: UI.dim, fontSize: 15, marginTop: 4 },
  section: { color: UI.dim, fontSize: 14, fontWeight: '800', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
});

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'stretch',
    paddingVertical: 17,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: UI.bg2,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: UI.text, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  link: { color: UI.dim, fontSize: 16, textDecorationLine: 'underline' },
  coins: { color: UI.gold, fontSize: 20, fontWeight: '900' },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: UI.panel, borderRadius: 16, paddingLeft: 5, paddingRight: 4, paddingVertical: 4 },
  pillSmall: { paddingRight: 9, gap: 4, paddingVertical: 3 },
  coinIcon: { width: 24, height: 24 },
  iconSmall: { width: 20, height: 20 },
  coinPlus: { color: UI.bg, backgroundColor: UI.accent, fontSize: 16, fontWeight: '900', width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabTitle: { color: UI.text, fontSize: 26, fontWeight: '900', flexShrink: 1 },
  card: { backgroundColor: UI.panel, borderRadius: 18, padding: 16 },
});
