// Seviye haritası (Candy Crush tarzı): her bölüm kendi temalı zemininde, seviyeler kıvrımlı bir yol
// üzerinde. Haritalar 3'erli kısımlar hâlinde açılır; sonraki kısım bulutların altında kilitli görünür.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, ScrollViewInstance, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { allMaps, MapInfo, mapOfLevel, mapReward } from '../core/maps';
import { carByKey } from '../core/garage';
import { Booster } from '../core/monetization';
import { UI } from '../game/palette';
import { GROUP, themeOfMap, visibleMapCount } from '../game/mapThemes';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import CarArt from './CarArt';
import { ICONS, MAP_PROPS } from './icons';
import { Btn, TabHeader, TextLink } from './kit';
import { useLayout } from './layout';
import Sheet from './Sheet';

const BOOSTER_ICON: Record<Booster, string> = { undo: '↶', hint: '💡', crane: '🏗', extraSlot: '＋' };
const HEAD = 96;
const ROW = 92;
const FOOT = 110;
const NODE = 58;

const sectionHeight = (m: MapInfo) => HEAD + m.size * ROW + FOOT;

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
  const { width, height } = useLayout();
  const [pick, setPick] = useState<number | null>(null);
  const all = allMaps();
  const current = mapOfLevel(progress.level).index;
  const shown = all.slice(0, visibleMapCount(current, all.length));
  const nextGroup = all.slice(shown.length, shown.length + GROUP);
  const scroll = useRef<ScrollViewInstance>(null);

  // Açılışta şu anki seviyeye kaydır
  const targetY = useMemo(() => {
    let y = 0;
    for (const m of shown) {
      if (m.index === current) return y + HEAD + (progress.level - m.first) * ROW - height * 0.35;
      y += sectionHeight(m);
    }
    return 0;
  }, [shown, current, progress.level, height]);
  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, targetY), animated: false }), 60);
    return () => clearTimeout(id);
  }, [targetY]);

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={t('map.title')} coins={progress.coins} onCoins={onShop} />
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 24 }}>
        {shown.map((m) => (
          <Section
            key={m.index}
            m={m}
            width={width}
            progress={progress}
            isNew={m.index === current && m.first > newFrom}
            newFrom={newFrom}
            onPlay={onPlay}
            onPick={setPick}
          />
        ))}
        {nextGroup.length > 0 && <Clouds width={width} next={nextGroup} lastShown={shown[shown.length - 1]} />}
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

/** Basit sözde-rastgele (aynı harita hep aynı görünür) */
const rnd = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function Section(p: {
  m: MapInfo;
  width: number;
  progress: Progress;
  isNew: boolean;
  newFrom: number;
  onPlay(): void;
  onPick(n: number): void;
}) {
  const { m, width: W, progress } = p;
  const theme = themeOfMap(m.key);
  const H = sectionHeight(m);
  const claimed = progress.mapsClaimed.includes(m.index);
  const reward = mapReward(m.index);
  const done = progress.level > m.last;
  const amp = W * 0.27;
  const waterW = W * 0.2;
  const center = theme.water === 'left' ? W / 2 + waterW / 2 : theme.water === 'right' ? W / 2 - waterW / 2 : W / 2;
  const nodes = Array.from({ length: m.size }, (_, i) => {
    const lv = m.first + i;
    const x = center + Math.sin(i * 0.9 + m.index * 1.7) * amp * (theme.water ? 0.8 : 1);
    const y = HEAD + i * ROW + ROW / 2;
    return { lv, x, y };
  });
  const dark = theme.ground[1] === '#0C0E2A' || theme.ground[1] === '#140C33' || theme.ground[1] === '#22184A';

  return (
    <View style={{ width: W, height: H, overflow: 'hidden' }}>
      {/* zemin: üstten alta iki ton */}
      {Array.from({ length: 8 }, (_, k) => (
        <View
          key={k}
          style={{ position: 'absolute', left: 0, right: 0, top: (H / 8) * k, height: H / 8 + 1, backgroundColor: k < 4 ? theme.ground[0] : theme.ground[1], opacity: k < 4 ? 1 - k * 0.06 : 0.82 + (k - 4) * 0.045 }}
        />
      ))}
      {/* doku: küçük çimen/kum noktaları ya da yıldızlar */}
      {Array.from({ length: Math.round(H / 26) }, (_, k) => (
        <View
          key={`d${k}`}
          style={{
            position: 'absolute',
            left: rnd(m.index, k) * W,
            top: rnd(k, m.index + 3) * H,
            width: dark ? 3 : 7,
            height: dark ? 3 : 4,
            borderRadius: 3,
            backgroundColor: dark ? '#FFFFFF' : 'rgba(0,0,0,0.08)',
            opacity: dark ? 0.6 * rnd(k, 9) + 0.2 : 1,
          }}
        />
      ))}
      {/* su şeridi */}
      {theme.water && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, width: waterW, [theme.water]: 0, backgroundColor: '#3FA7E0' }}>
          {Array.from({ length: Math.round(H / 60) }, (_, k) => (
            <View key={k} style={{ position: 'absolute', top: k * 60 + 20, left: 10 + (k % 2) * 16, width: 26, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.55)' }} />
          ))}
        </View>
      )}
      {/* süsler: yolun boş tarafına */}
      {nodes
        .filter((_, i) => i % 2 === 1)
        .map((n, k) => {
          const onLeft = n.x > center;
          const size = 86 + rnd(m.index, k) * 30;
          const inWater = theme.water === (onLeft ? 'left' : 'right');
          const prop = inWater ? 'boat' : theme.props[k % theme.props.length];
          const left = onLeft ? 6 + rnd(k, 2) * 14 : W - size - 6 - rnd(k, 5) * 14;
          return <Image key={`p${k}`} source={MAP_PROPS[prop]} style={{ position: 'absolute', left, top: n.y - size * 0.6, width: size, height: size }} />;
        })}
      {/* yol noktaları */}
      {nodes.slice(0, -1).map((a, i) => {
        const b = nodes[i + 1];
        return Array.from({ length: 5 }, (_, k) => {
          const tt = (k + 1) / 6;
          const lv = a.lv;
          const passed = lv < progress.level;
          return (
            <View
              key={`${i}-${k}`}
              style={{
                position: 'absolute',
                left: a.x + (b.x - a.x) * tt - 5,
                top: a.y + (b.y - a.y) * tt - 5,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: passed ? theme.path : 'rgba(255,255,255,0.45)',
                borderWidth: 1.5,
                borderColor: 'rgba(0,0,0,0.15)',
              }}
            />
          );
        });
      })}

      {/* başlık */}
      <View style={[styles.banner, { backgroundColor: m.color }]}>
        <Text style={styles.bannerIcon}>{m.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>
            {m.index + 1}. {t(`map.${m.key}` as Key)}
          </Text>
          <Text style={styles.bannerSub}>{t('map.levels', { a: m.first, b: m.last })}</Text>
        </View>
        {done && <Text style={styles.bannerDone}>✓</Text>}
        {p.isNew && <Text style={styles.newBadge}>{t('market.new')}</Text>}
      </View>

      {/* seviyeler */}
      {nodes.map((n) => (
        <LevelNode
          key={n.lv}
          lv={n.lv}
          x={n.x}
          y={n.y}
          color={m.color}
          state={n.lv < progress.level ? 'done' : n.lv === progress.level ? 'here' : 'next'}
          stars={progress.stars[`L${n.lv}`] ?? 0}
          car={n.lv === progress.level ? progress.favoriteCar : null}
          fresh={n.lv === progress.level && n.lv > p.newFrom}
          gift={n.lv === m.last}
          giftTaken={claimed}
          onPress={() => (n.lv === progress.level ? p.onPlay() : n.lv < progress.level ? p.onPick(n.lv) : undefined)}
        />
      ))}

      {/* harita ödülü */}
      <View style={[styles.reward, claimed && styles.rewardTaken]}>
        <Image source={ICONS.chest} style={[styles.rewardChest, claimed && { opacity: 0.6 }]} />
        <View style={styles.chips}>
          <Chip text={`● ${reward.coins}`} gold={!claimed} />
          {(Object.keys(reward.boosters) as Booster[]).map((k) => (
            <Chip key={k} text={`${BOOSTER_ICON[k]} ${reward.boosters[k]}`} />
          ))}
        </View>
        <Text style={[styles.rewardLabel, claimed && { color: UI.accent }]}>{claimed ? `✓ ${t('reward.taken')}` : t('reward.waiting')}</Text>
      </View>
    </View>
  );
}

function LevelNode(p: {
  lv: number;
  x: number;
  y: number;
  color: string;
  state: 'done' | 'here' | 'next';
  stars: number;
  car: string | null;
  fresh: boolean;
  gift: boolean;
  giftTaken: boolean;
  onPress(): void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (p.state !== 'here') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [p.state, pulse]);
  const size = p.state === 'here' ? NODE + 14 : NODE;
  return (
    <View style={{ position: 'absolute', left: p.x - size / 2, top: p.y - size / 2, width: size, alignItems: 'center' }}>
      {p.state === 'here' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { width: size, height: size, borderRadius: size / 2, borderColor: '#FFFFFF' },
            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] },
          ]}
        />
      )}
      <Pressable
        disabled={p.state === 'next'}
        onPress={p.onPress}
        style={({ pressed }) => [
          styles.node,
          { width: size, height: size, borderRadius: size / 2 },
          p.state === 'done' && { backgroundColor: p.color },
          p.state === 'here' && { backgroundColor: '#FFFFFF', borderColor: p.color, borderWidth: 6 },
          p.state === 'next' && styles.nodeNext,
          pressed && { transform: [{ scale: 0.92 }] },
        ]}
      >
        <Text style={[styles.nodeNum, p.state === 'here' && { color: UI.bg, fontSize: 22 }, p.state === 'next' && { color: 'rgba(255,255,255,0.75)' }]}>{p.lv}</Text>
      </Pressable>
      {p.state === 'done' && (
        <Text style={styles.nodeStars}>
          {'★'.repeat(p.stars)}
          <Text style={{ color: 'rgba(0,0,0,0.3)' }}>{'★'.repeat(3 - p.stars)}</Text>
        </Text>
      )}
      {p.car && (
        <View style={[styles.carOnNode, { left: (size - 64) / 2 }]} pointerEvents="none">
          <CarArt model={carByKey(p.car)} width={64} />
        </View>
      )}
      {p.fresh && <View style={styles.freshDot} />}
      {p.gift && (
        <Image source={ICONS.chest} style={[styles.giftOnNode, p.giftTaken && { opacity: 0.5 }]} />
      )}
    </View>
  );
}

function Clouds({ width, next, lastShown }: { width: number; next: MapInfo[]; lastShown: MapInfo }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);
  const H = 360;
  const theme = themeOfMap(next[0].key);
  return (
    <View style={{ width, height: H, overflow: 'hidden', backgroundColor: theme.ground[0] }}>
      {/* sonraki bölümün silik izi */}
      {theme.props.slice(0, 3).map((pr, k) => (
        <Image key={k} source={MAP_PROPS[pr]} style={{ position: 'absolute', left: (k * width) / 3 + 10, top: 120 + (k % 2) * 60, width: 110, height: 110, opacity: 0.5 }} />
      ))}
      {Array.from({ length: 22 }, (_, k) => {
        const r = 50 + rnd(k, 1) * 50;
        const x = rnd(k, 2) * width;
        const y = rnd(k, 3) * H;
        const tx = drift.interpolate({ inputRange: [0, 1], outputRange: [0, (k % 2 ? 1 : -1) * 18] });
        return (
          <Animated.View
            key={k}
            style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: k % 3 ? '#F4F7FB' : '#E1E8F0', opacity: 0.93, transform: [{ translateX: tx }] }}
          />
        );
      })}
      <View style={styles.cloudCenter}>
        <Image source={ICONS.lock} style={{ width: 78, height: 78 }} />
        <Text style={styles.cloudTitle}>{next.map((m) => m.icon).join('  ')}</Text>
        <Text style={styles.cloudText}>{t('map.cloud', { name: t(`map.${lastShown.key}` as Key) })}</Text>
      </View>
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
  banner: { position: 'absolute', left: 16, right: 16, top: 16, height: 62, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  bannerIcon: { fontSize: 30 },
  bannerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 2 } },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '800' },
  bannerDone: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  newBadge: { backgroundColor: UI.danger, color: '#fff', fontSize: 12, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  node: { alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: '#7D8796', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 3 } },
  nodeNext: { backgroundColor: 'rgba(40,50,70,0.55)', borderColor: 'rgba(255,255,255,0.7)' },
  nodeNum: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  nodeStars: { color: '#FFD23F', fontSize: 14, letterSpacing: -1, marginTop: -6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  ring: { position: 'absolute', top: 0, left: 0, borderWidth: 4 },
  carOnNode: { position: 'absolute', top: -34 },
  freshDot: { position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: UI.danger, borderWidth: 3, borderColor: '#FFFFFF' },
  giftOnNode: { position: 'absolute', right: -40, top: 2, width: 44, height: 44 },
  reward: { position: 'absolute', left: 16, right: 16, bottom: 18, height: 74, borderRadius: 20, backgroundColor: 'rgba(15,27,45,0.88)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 2, borderColor: UI.gold },
  rewardTaken: { borderColor: UI.accent, backgroundColor: 'rgba(15,27,45,0.7)' },
  rewardChest: { width: 50, height: 50 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, flex: 1 },
  chip: { backgroundColor: UI.panelHi, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: UI.text, fontWeight: '900', fontSize: 13 },
  rewardLabel: { color: UI.gold, fontWeight: '900', fontSize: 13 },
  cloudCenter: { position: 'absolute', left: 30, right: 30, top: 80, alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,27,45,0.78)', borderRadius: 24, padding: 18 },
  cloudTitle: { fontSize: 30 },
  cloudText: { color: UI.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  sheetTitle: { color: UI.text, fontSize: 26, fontWeight: '900' },
  sheetStars: { color: UI.gold, fontSize: 34, letterSpacing: 4 },
  sheetSub: { color: UI.dim, fontSize: 15, textAlign: 'center' },
});
