import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { allMaps, MapInfo, mapOfLevel, mapReward } from '../core/maps';
import { Booster } from '../core/monetization';
import { UI } from '../game/palette';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import { TabHeader } from './kit';

const BOOSTER_ICON: Record<Booster, string> = { undo: '↶', hint: '💡', crane: '🏗', extraSlot: '＋' };

/** Haritalar: tamamlananlar, şu anki (seviye noktalarıyla) ve kilitli olanlar. */
export default function MapScreen({ progress, onPlay, onShop }: { progress: Progress; onPlay(): void; onShop(): void }) {
  const current = mapOfLevel(progress.level).index;
  const maps = allMaps();
  const scroll = useRef<ScrollView>(null);
  const y = useRef(0);
  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, y.current - 40), animated: false }), 50);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={t('map.title')} coins={progress.coins} onCoins={onShop} />
      <ScrollView ref={scroll} contentContainerStyle={styles.list}>
        {maps.map((m) => {
          const state = m.index < current ? 'done' : m.index === current ? 'current' : 'locked';
          return (
            <View key={m.index} onLayout={(e) => m.index === current && (y.current = e.nativeEvent.layout.y)}>
              <MapCard m={m} state={state} level={progress.level} stars={progress.stars} claimed={progress.mapsClaimed.includes(m.index)} onPlay={onPlay} />
            </View>
          );
        })}
        <Text style={styles.more}>{t('map.more')}</Text>
      </ScrollView>
    </View>
  );
}

function MapCard(p: {
  m: MapInfo;
  state: 'done' | 'current' | 'locked';
  level: number;
  stars: Record<string, number>;
  claimed: boolean;
  onPlay(): void;
}) {
  const { m, state } = p;
  const locked = state === 'locked';
  const doneLevels = state === 'done' ? m.size : state === 'current' ? p.level - m.first : 0;
  const reward = mapReward(m.index);
  return (
    <View style={[styles.card, state === 'current' && { borderColor: m.color }, locked && { opacity: 0.55 }]}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: locked ? UI.bg : m.color }]}>
          <Text style={styles.icon}>{locked ? '🔒' : m.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {m.index + 1}. {t(`map.${m.key}` as Key)}
          </Text>
          <Text style={styles.range}>{t('map.levels', { a: m.first, b: m.last })}</Text>
        </View>
        {state === 'done' && <Text style={styles.check}>✓</Text>}
      </View>

      {state === 'current' && (
        <View style={styles.path}>
          {Array.from({ length: m.size }, (_, i) => {
            const lv = m.first + i;
            const done = lv < p.level;
            const here = lv === p.level;
            const st = p.stars[`L${lv}`] ?? 0;
            return (
              <View key={lv} style={[styles.node, done && { backgroundColor: m.color }, here && styles.nodeHere]}>
                <Text style={[styles.nodeText, (done || here) && { color: UI.bg }]}>{done ? '★'.repeat(st) || '✓' : lv}</Text>
              </View>
            );
          })}
        </View>
      )}

      {state !== 'done' && (
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${(doneLevels / m.size) * 100}%`, backgroundColor: m.color }]} />
        </View>
      )}

      <View style={styles.rewardRow}>
        <Text style={styles.gift}>🎁</Text>
        <Chip text={`● ${reward.coins}`} gold />
        {(Object.keys(reward.boosters) as Booster[]).map((k) => (
          <Chip key={k} text={`${BOOSTER_ICON[k]} ${reward.boosters[k]}`} />
        ))}
        {state === 'done' && p.claimed && <Text style={styles.claimed}>✓</Text>}
      </View>

      {state === 'current' && (
        <Pressable onPress={p.onPlay} style={[styles.play, { backgroundColor: m.color }]}>
          <Text style={styles.playText}>▶ {t('common.level', { n: p.level })}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Chip({ text, gold }: { text: string; gold?: boolean }) {
  return (
    <View style={[styles.chip, gold && { backgroundColor: UI.gold }]}>
      <Text style={[styles.chipText, gold && { color: UI.bg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 30, gap: 14 },
  card: { backgroundColor: UI.panel, borderRadius: 20, padding: 16, gap: 12, borderWidth: 3, borderColor: 'transparent' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 32 },
  name: { color: UI.text, fontSize: 21, fontWeight: '900' },
  range: { color: UI.dim, fontSize: 15, fontWeight: '700', marginTop: 2 },
  check: { color: UI.gold, fontSize: 30, fontWeight: '900' },
  path: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  node: { width: 46, height: 46, borderRadius: 23, backgroundColor: UI.bg, alignItems: 'center', justifyContent: 'center' },
  nodeHere: { backgroundColor: UI.text, transform: [{ scale: 1.12 }] },
  nodeText: { color: UI.dim, fontWeight: '900', fontSize: 14 },
  bar: { height: 10, borderRadius: 5, backgroundColor: UI.bg, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  gift: { fontSize: 22 },
  chip: { backgroundColor: UI.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: UI.text, fontWeight: '900', fontSize: 15 },
  claimed: { color: UI.gold, fontWeight: '900', fontSize: 18 },
  play: { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  playText: { color: UI.bg, fontWeight: '900', fontSize: 21 },
  more: { color: UI.dim, fontSize: 14, textAlign: 'center', marginTop: 6 },
});
