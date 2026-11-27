// Sandık açılışı: ışınlar döner, sandık 3 kez sallanır, kapak açılır; ödül kartları sırayla
// fırlar, nadir ödül en son ve parlayarak gelir. "Topla" ile paralar kendi sayaçlarına uçar.
// Modal değil (ekranın üstünde bir katman), böylece uçan paralar sayaçlara ulaşır.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import type { Reward } from '../core/chests';
import { itemById, itemName } from '../core/market';
import type { Booster } from '../core/monetization';
import { boosterName } from '../core/monetization';
import { UI } from '../game/palette';
import { Key, num, t } from '../i18n';
import { FlyKind, useFlyCoins, ViewRef } from './FlyCoins';
import { ICONS } from './icons';
import { TIER_COLOR } from './GarageScreen';

export type ChestLook = 'bronze' | 'silver' | 'gold' | 'plain';
const CHEST_IMG: Record<ChestLook, keyof typeof ICONS> = { bronze: 'chest-bronze', silver: 'chest-silver', gold: 'chest-gold', plain: 'chest' };
const GLOW: Record<ChestLook, string> = { bronze: '#E3A56B', silver: '#DCE6F0', gold: '#FFC400', plain: '#FFC400' };
const B_ICON: Record<Booster, string> = { undo: '↶', hint: '💡', crane: '🏗', extraSlot: '＋' };

interface Card {
  key: string;
  icon?: keyof typeof ICONS;
  glyph?: string;
  value: string;
  label: string;
  money?: { kind: FlyKind; amount: number };
  rare?: string;
}

export function rewardCards(r: Reward): Card[] {
  const out: Card[] = [];
  if (r.coins) out.push({ key: 'c', icon: 'coin', value: `+${num(r.coins)}`, label: t('money.coins'), money: { kind: 'coins', amount: r.coins } });
  if (r.gems) out.push({ key: 'g', icon: 'gem', value: `+${num(r.gems)}`, label: t('money.gems'), money: { kind: 'gems', amount: r.gems } });
  if (r.tickets) out.push({ key: 't', icon: 'ticket', value: `+${r.tickets}`, label: t('money.tickets'), money: { kind: 'tickets', amount: r.tickets } });
  for (const [k, v] of Object.entries(r.boosters ?? {}) as [Booster, number][])
    if (v) out.push({ key: `b${k}`, glyph: B_ICON[k], value: `x${v}`, label: boosterName(k) });
  if (r.item) {
    const it = itemById(r.item);
    if (it) out.push({ key: 'item', icon: it.kind === 'garage' ? 'car' : 'star', value: itemName(it), label: t(`garage.tier.${it.rarity}` as Key), rare: TIER_COLOR[it.rarity] });
  }
  return out;
}

export default function ChestOpen(props: {
  look: ChestLook;
  title: string;
  reward: Reward;
  /** Topla bitince */
  onClose(): void;
  /** Tören gibi kendi başlığı olan açılışlarda sandık sallanmadan açılmasın */
  instant?: boolean;
}) {
  const fly = useFlyCoins();
  const cards = rewardCards(props.reward);
  const [opened, setOpened] = useState(!!props.instant);
  const shake = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const show = useRef(cards.map(() => new Animated.Value(0))).current;
  const refs = useRef<(ViewRef | null)[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const rays = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
    rays.start();
    const one = (v: number) => Animated.timing(shake, { toValue: v, duration: 70, useNativeDriver: true });
    const seq = props.instant
      ? Animated.delay(150)
      : Animated.sequence([one(1), one(-1), one(1), one(-1), one(0), Animated.delay(180), one(1), one(-1), one(1), one(-1), one(0), Animated.delay(180), one(1), one(-1), one(1), one(0)]);
    seq.start(() => {
      setOpened(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      Animated.stagger(
        250,
        show.map((v) => Animated.spring(v, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true })),
      ).start();
    });
    return () => rays.stop();
  }, [props.instant, shake, spin, pop, show]);

  const collect = () => {
    if (busy) return;
    setBusy(true);
    let delay = 0;
    cards.forEach((c, i) => {
      if (!c.money || !fly) return;
      setTimeout(() => fly.fly(refs.current[i], c.money!.amount, undefined, c.money!.kind), delay);
      delay += 120;
    });
    setTimeout(props.onClose, cards.some((c) => c.money) && fly ? 900 + delay : 0);
  };

  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] });
  const raysRot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glow = GLOW[props.look];

  return (
    <View style={styles.fill}>
      <View style={styles.backdrop} />
      <View style={styles.center}>
        <Text style={[styles.kicker, { color: glow }]}>{props.title}</Text>
        <View style={styles.stage}>
          <Animated.View style={[styles.rays, { transform: [{ rotate: raysRot }], opacity: opened ? 0.55 : 0.25 }]}>
            {Array.from({ length: 12 }, (_, i) => (
              <View key={i} style={[styles.ray, { backgroundColor: glow, transform: [{ rotate: `${i * 30}deg` }] }]} />
            ))}
          </Animated.View>
          <View style={[styles.halo, { backgroundColor: glow }]} />
          <Animated.View
            style={{
              transform: [
                { rotate },
                { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
                { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
              ],
            }}
          >
            <Image source={ICONS[CHEST_IMG[props.look]]} style={styles.chest} />
          </Animated.View>
        </View>

        <View style={styles.cards}>
          {cards.map((c, i) => (
            <Animated.View
              key={c.key}
              ref={(r) => {
                refs.current[i] = r;
              }}
              style={[
                styles.card,
                c.rare && { borderColor: c.rare, borderWidth: 3, minWidth: 150 },
                {
                  opacity: show[i],
                  transform: [
                    { scale: show[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                    { translateY: show[i].interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) },
                  ],
                },
              ]}
            >
              {c.icon ? <Image source={ICONS[c.icon]} style={styles.cardIcon} /> : <Text style={styles.glyph}>{c.glyph}</Text>}
              <Text style={styles.cardValue} numberOfLines={1}>
                {c.value}
              </Text>
              <Text style={[styles.cardLabel, c.rare && { color: c.rare }]}>{c.label}</Text>
            </Animated.View>
          ))}
        </View>

        {opened && (
          <Pressable onPress={collect} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.btnText}>{t('missions.collect')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 50 },
  backdrop: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,10,20,0.88)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 10 },
  kicker: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  stage: { width: 260, height: 220, alignItems: 'center', justifyContent: 'center' },
  rays: { position: 'absolute', width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', width: 18, height: 300, borderRadius: 9, opacity: 0.5 },
  halo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, opacity: 0.22 },
  chest: { width: 150, height: 150 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, minHeight: 110 },
  card: { backgroundColor: UI.panel, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', minWidth: 92, borderWidth: 2, borderColor: UI.panelHi },
  cardIcon: { width: 40, height: 40 },
  glyph: { fontSize: 30, height: 40, lineHeight: 40 },
  cardValue: { color: UI.text, fontSize: 18, fontWeight: '900', marginTop: 2, maxWidth: 160 },
  cardLabel: { color: UI.dim, fontSize: 12, fontWeight: '800' },
  btn: { marginTop: 10, backgroundColor: UI.gold, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 48, borderBottomWidth: 4, borderBottomColor: '#C78F00' },
  btnText: { color: UI.bg, fontSize: 22, fontWeight: '900' },
});
