import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, ScrollViewInstance, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { allMaps, MapInfo, mapOfLevel, mapReward } from '../core/maps';
import { Booster } from '../core/monetization';
import { UI } from '../game/palette';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import { Btn, TabHeader, TextLink } from './kit';
import Sheet from './Sheet';

const BOOSTER_ICON: Record<Booster, string> = { undo: '↶', hint: '💡', crane: '🏗', extraSlot: '＋' };

/** Haritalar: tamamlananlar, şu anki (seviye noktalarıyla) ve kilitli olanlar. */
export default function MapScreen({
  progress,
  onPlay,
  onPlayLevel,
  onShop,
  newFrom,
}: {
  progress: Progress;
  onPlay(): void;
  /** Geçilmiş bir seviyeyi tekrar oyna */
  onPlayLevel(n: number): void;
  onShop(): void;
  /** Bu seviyeden sonra açılanlar "yeni" (haritaya son bakıştan beri) */
  newFrom: number;
}) {
  const [pick, setPick] = useState<number | null>(null);
  const current = mapOfLevel(progress.level).index;
  const maps = allMaps();
  const scroll = useRef<ScrollViewInstance>(null);
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
              <MapCard
                m={m}
                state={state}
                level={progress.level}
                stars={progress.stars}
                claimed={progress.mapsClaimed.includes(m.index)}
                onPlay={onPlay}
                onPick={setPick}
                newFrom={newFrom}
              />
            </View>
          );
        })}
        <Text style={styles.more}>{t('map.more')}</Text>
      </ScrollView>
      <Sheet visible={pick !== null} onClose={() => setPick(null)}>
        {pick !== null && (
          <>
            <Text style={styles.sheetTitle}>{t('common.level', { n: pick })}</Text>
            <Text style={styles.sheetStars}>
              {'★'.repeat(progress.stars[`L${pick}`] ?? 0)}
              <Text style={{ color: UI.panelHi }}>{'★'.repeat(3 - (progress.stars[`L${pick}`] ?? 0))}</Text>
            </Text>
            <Text style={styles.sheetSub}>
              {(progress.stars[`L${pick}`] ?? 0) >= 3 ? t('map.replayPerfect') : t('map.replayMore')}
            </Text>
            <View style={{ height: 8 }} />
            <Btn
              label={t('map.replay')}
              primary
              onPress={() => {
                const n = pick;
                setPick(null);
                onPlayLevel(n);
              }}
            />
            <TextLink label={t('common.close')} onPress={() => setPick(null)} />
          </>
        )}
      </Sheet>
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
  onPick(n: number): void;
  newFrom: number;
}) {
  const { m, state } = p;
  const [open, setOpen] = useState(state === 'current');
  const isNewMap = state === 'current' && m.first > p.newFrom;
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
        {isNewMap && <Text style={styles.newBadge}>{t('market.new')}</Text>}
        {state === 'done' && (
          <Pressable onPress={() => setOpen((o) => !o)} hitSlop={10} style={styles.toggle}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.toggleText}>{open ? '▲' : '▼'}</Text>
          </Pressable>
        )}
      </View>

      {!locked && open && (
        <View style={styles.path}>
          {Array.from({ length: m.size }, (_, i) => {
            const lv = m.first + i;
            const done = lv < p.level;
            const here = lv === p.level;
            const st = p.stars[`L${lv}`] ?? 0;
            const fresh = here && lv > p.newFrom;
            return (
              <Pressable
                key={lv}
                disabled={!done && !here}
                onPress={() => (here ? p.onPlay() : p.onPick(lv))}
                style={[styles.node, done && { backgroundColor: m.color }, here && styles.nodeHere]}
              >
                <Text style={[styles.nodeNum, (done || here) && { color: UI.bg }]}>{lv}</Text>
                {done && <Text style={styles.nodeStars}>{'★'.repeat(st)}{'☆'.repeat(3 - st)}</Text>}
                {fresh && <View style={styles.nodeDot} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {state !== 'done' && (
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${(doneLevels / m.size) * 100}%`, backgroundColor: m.color }]} />
        </View>
      )}

      <View style={[styles.rewardRow, p.claimed && styles.rewardTaken]}>
        <Text style={styles.gift}>{p.claimed ? '✅' : '🎁'}</Text>
        <Chip text={`● ${reward.coins}`} gold={!p.claimed} />
        {(Object.keys(reward.boosters) as Booster[]).map((k) => (
          <Chip key={k} text={`${BOOSTER_ICON[k]} ${reward.boosters[k]}`} />
        ))}
        <Text style={[styles.rewardLabel, p.claimed && { color: UI.accent }]}>{p.claimed ? t('reward.taken') : t('reward.waiting')}</Text>
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
  node: { width: 52, height: 52, borderRadius: 26, backgroundColor: UI.bg, alignItems: 'center', justifyContent: 'center' },
  nodeHere: { backgroundColor: UI.text, transform: [{ scale: 1.12 }] },
  nodeNum: { color: UI.dim, fontWeight: '900', fontSize: 15, lineHeight: 18 },
  nodeStars: { color: UI.bg, fontSize: 9, letterSpacing: -0.5, lineHeight: 11 },
  nodeDot: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: UI.danger, borderWidth: 2, borderColor: UI.panel },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleText: { color: UI.dim, fontSize: 14, fontWeight: '900' },
  newBadge: { backgroundColor: UI.danger, color: '#fff', fontSize: 12, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  rewardTaken: { backgroundColor: UI.bg2, borderRadius: 14, padding: 8, opacity: 0.85 },
  rewardLabel: { color: UI.gold, fontWeight: '900', fontSize: 14, marginLeft: 'auto' },
  sheetTitle: { color: UI.text, fontSize: 26, fontWeight: '900' },
  sheetStars: { color: UI.gold, fontSize: 34, letterSpacing: 4 },
  sheetSub: { color: UI.dim, fontSize: 15, textAlign: 'center' },
  bar: { height: 10, borderRadius: 5, backgroundColor: UI.bg, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  gift: { fontSize: 22 },
  chip: { backgroundColor: UI.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: UI.text, fontWeight: '900', fontSize: 15 },
  play: { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  playText: { color: UI.bg, fontWeight: '900', fontSize: 21 },
  more: { color: UI.dim, fontSize: 14, textAlign: 'center', marginTop: 6 },
});
