// Ortak parçalar: Glugo'daki düğme, kart ve başlık düzeni.
import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useFlyCoins } from './FlyCoins';
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

/** Coin sayacı: uçan coinlerin hedefi; coin gelince zıplar */
export function Coins({ coins, onPress }: { coins: number; onPress(): void }) {
  const fly = useFlyCoins();
  const ref = useRef<View>(null);
  const scale = fly ? fly.bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) : 1;
  return (
    <Pressable onPress={onPress} hitSlop={12}>
      <Animated.View
        ref={ref}
        onLayout={() => fly?.setTarget(ref.current)}
        style={[styles.coinPill, { transform: [{ scale }] }]}
      >
        <Image source={ICONS.coin} style={styles.coinIcon} />
        <Text style={styles.coins}>{coins}</Text>
        <Text style={styles.coinPlus}>+</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Sekme ekranlarının üst başlığı: solda başlık, sağda coin */
export function TabHeader({ title, coins, onCoins }: { title: string; coins: number; onCoins(): void }) {
  return (
    <View style={styles.tabHeader}>
      <Text style={styles.tabTitle}>{title}</Text>
      <Coins coins={coins} onPress={onCoins} />
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
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: UI.panel, borderRadius: 16, paddingLeft: 6, paddingRight: 4, paddingVertical: 4 },
  coinIcon: { width: 24, height: 24 },
  coinPlus: { color: UI.bg, backgroundColor: UI.accent, fontSize: 16, fontWeight: '900', width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabTitle: { color: UI.text, fontSize: 30, fontWeight: '900' },
  card: { backgroundColor: UI.panel, borderRadius: 18, padding: 16 },
});
