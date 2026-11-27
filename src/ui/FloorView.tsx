// Kat içi: bir haritanın seviyeleri park yerleri olarak. Yol yılan gibi döner (üst sıra soldan sağa,
// sonraki sağdan sola…). Biten yerde araç park etmiş durur, altında yıldızları; sıradaki yerde vitrin
// araban bekler; son yer kat sandığı. Çevre yolunda garajındaki arabalar dolaşır.
// Durumlar: aktif, bitmiş (tekrar oyna), kilitli (önizleme), tamamlandı (sandık açılır, "Alt kata in").
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { MapInfo, mapFirst, mapOfLevel, mapReward, SECTION_SIZE } from '../core/maps';
import { carByKey } from '../core/garage';
import { isHardLevel } from '../core/generator';
import { UI } from '../game/palette';
import { Progress } from '../game/storage';
import { num, t } from '../i18n';
import CarArt from './CarArt';
import { useFlyCoins, ViewRef } from './FlyCoins';
import { ICONS } from './icons';
import { Btn, Pill, TextLink } from './kit';
import { useLayout } from './layout';
import Sheet from './Sheet';
import { Blink, Bob, Drift, PathMover, Pop, PulseRing, Shake } from './anim';
import { CAR_COLORS, floorLabel, garageCars, Hazard, mapName, MiniCar } from './MapScreen';

export type FloorMode = 'active' | 'upcoming' | 'done' | 'locked' | 'complete';

const COLS = 5;
const BAY_H = 86;
const LANE = 16;
const RING = 26;

export default function FloorView(p: {
  m: MapInfo;
  mode: FloorMode;
  progress: Progress;
  onBack(): void;
  onPlay(): void;
  onPlayLevel(n: number): void;
  onGoCurrent(): void;
}) {
  const { m, mode, progress } = p;
  const { width } = useLayout();
  const fly = useFlyCoins();
  const [pick, setPick] = useState<number | null>(null);
  const n = progress.level;
  const doneCount = mode === 'done' || mode === 'complete' ? m.size : Math.max(0, Math.min(m.size, n - m.first));
  const reward = mapReward(m.index);
  const claimed = progress.mapsClaimed.includes(m.index);

  // Otopark ölçüleri
  const lotW = width - 24;
  const inner = lotW - RING * 2 - 6 - 16;
  const gap = 6;
  const bayW = Math.floor((inner - gap * (COLS - 1)) / COLS);
  const rows = Math.ceil(m.size / COLS);
  const lotH = RING * 2 + 6 + 16 + rows * BAY_H + (rows - 1) * LANE;

  // Tamamlanınca: sandıktan paralar sayaca uçar (yalnız gösterim; ödül seviye bitince verildi)
  const chestRef = useRef<ViewRef>(null);
  useEffect(() => {
    if (mode !== 'complete' || !fly) return;
    const a = setTimeout(() => fly.fly(chestRef.current, reward.coins), 900);
    const b = setTimeout(() => fly.fly(chestRef.current, reward.gems, undefined, 'gems'), 1100);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Çevre yolu (halkanın ortası) ve üstündeki arabalar
  const c = 3 + RING / 2;
  const loop: [number, number, number, number][] = [
    [c, c, 0, 1],
    [lotW - c, c, 90, 1],
    [lotW - c, lotH - c, 0, -1],
    [c, lotH - c, -90, 1],
    [c, c, 0, 1],
  ];
  const cars = mode === 'locked' ? [] : garageCars(progress, 4);

  const firstImperfect = Array.from({ length: m.size }, (_, i) => m.first + i).find((lv) => (progress.stars[`L${lv}`] ?? 0) < 3);
  const starSum = Array.from({ length: m.size }, (_, i) => progress.stars[`L${m.first + i}`] ?? 0).reduce((a, b) => a + b, 0);
  const curMap = mapOfLevel(n);
  // Kilitli kat, kısmının ilk haritası açılınca açılır
  const leftToOpen = mode === 'locked' ? Math.max(0, mapFirst(Math.floor(m.index / SECTION_SIZE) * SECTION_SIZE) - n) : 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <Pressable onPress={p.onBack} hitSlop={8} style={styles.back}>
          <Text style={styles.backText}>◀ {t('map.lot')}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.kat}>{floorLabel(m)}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {mapName(m)}
          </Text>
        </View>
        <Pill kind="coins" value={progress.coins} small />
      </View>
      <View style={styles.progRow}>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${(doneCount / m.size) * 100}%` }, doneCount === m.size && { backgroundColor: '#3BCE7A' }]} />
        </View>
        <Text style={styles.prog}>
          {doneCount}/{m.size}
        </Text>
        {mode === 'locked' ? (
          <Shake>
            <Image source={ICONS.lock} style={styles.headIcon} />
          </Shake>
        ) : claimed && mode !== 'complete' ? (
          <Text style={styles.taken}>✓</Text>
        ) : (
          <Shake on={mode === 'active'}>
            <Image source={ICONS.chest} style={styles.headIcon} />
          </Shake>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 150 }}>
        <View style={[{ width: lotW, height: lotH }, mode === 'locked' && { opacity: 0.45 }]}>
          <View style={styles.ringOuter}>
            <View style={styles.ring}>
              <View style={styles.dash} />
              <View style={styles.asphalt}>
                {Array.from({ length: rows }, (_, r) => (
                  <View key={r} style={[styles.bayRow, { height: BAY_H, marginTop: r ? LANE : 0, flexDirection: r % 2 ? 'row-reverse' : 'row', gap }]}>
                    {Array.from({ length: COLS }, (_, k) => {
                      const lv = m.first + r * COLS + k;
                      if (lv > m.last) return <View key={k} style={{ width: bayW }} />;
                      return (
                        <Bay
                          key={k}
                          lv={lv}
                          w={bayW}
                          state={
                            mode === 'locked'
                              ? 'future'
                              : lv < n || mode === 'complete'
                                ? 'done'
                                : lv === n
                                  ? 'current'
                                  : 'future'
                          }
                          last={lv === m.last}
                          hard={isHardLevel(lv)}
                          stars={progress.stars[`L${lv}`] ?? 0}
                          color={CAR_COLORS[lv % 7]}
                          fav={progress.favoriteCar}
                          celebrate={mode === 'complete'}
                          chestRef={lv === m.last ? chestRef : undefined}
                          onPress={() => (lv < n ? setPick(lv) : lv === n ? p.onPlay() : undefined)}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </View>
          {cars.map((car, i) => (
            <PathMover key={car.key} points={loop} ms={14000} offset={i / cars.length}>
              <View style={{ marginLeft: -17, marginTop: -9 }}>
                <CarArt model={car} width={34} />
              </View>
            </PathMover>
          ))}
          <Gate open={mode === 'complete'} still={mode === 'locked'} left={6} top={lotH - RING - 2} />
          <Blink style={[styles.light, { left: lotW - 24, top: -4 }]}>
            <View style={[styles.lamp, { backgroundColor: '#FF4D4D' }]} />
          </Blink>
          {mode === 'locked' && (
            <>
              <Drift from={-240} to={width} ms={26000} style={{ position: 'absolute', top: lotH * 0.2 }}>
                <View style={styles.cloud} />
              </Drift>
              <Drift from={-260} to={width} ms={34000} offset={0.45} style={{ position: 'absolute', top: lotH * 0.55 }}>
                <View style={[styles.cloud, { width: 260, height: 100 }]} />
              </Drift>
              <Hazard w={lotW - 40} h={18} />
            </>
          )}
        </View>
        {mode === 'locked' && (
          <View style={styles.lockCard}>
            <Shake>
              <Image source={ICONS.lock} style={{ width: 48, height: 48 }} />
            </Shake>
            <Text style={styles.lockTitle}>{t('floor.closed')}</Text>
            <Text style={styles.lockSub}>{t('floor.closedSub')}</Text>
            <Text style={styles.lockReward}>{t('floor.sectionReward')}</Text>
          </View>
        )}
        {mode === 'complete' && (
          <Pop k={1.12} ms={600} style={styles.doneBanner}>
            <Text style={styles.doneText}>{t('floor.complete')}</Text>
          </Pop>
        )}
      </ScrollView>

      {/* Alt kart */}
      <View style={[styles.foot, mode === 'complete' && { borderColor: UI.gold, borderWidth: 2 }]}>
        {mode === 'active' && (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.footKicker}>{t('floor.next')}</Text>
              <Text style={styles.footTitle}>{t('common.level', { n })}</Text>
              <Text style={styles.footGold}>
                {t('floor.chestAt')} · ● {num(reward.coins)} · 💎 {reward.gems}
              </Text>
            </View>
            <Pop ms={800}>
              <Pressable onPress={p.onPlay} style={styles.playBtn}>
                <Text style={styles.playText}>▶ {t('floor.play')}</Text>
              </Pressable>
            </Pop>
          </>
        )}
        {mode === 'done' && (
          <>
            <View style={{ flex: 1 }}>
              <Text style={[styles.footKicker, { color: '#8FF0B4' }]}>
                {t('floor.doneKicker')} · ★ {starSum}/{m.size * 3}
              </Text>
              <Text style={styles.footTitle}>{firstImperfect ? t('floor.moreStars') : t('floor.perfect')}</Text>
              <Text style={styles.footSub}>{t('floor.starCoins')}</Text>
            </View>
            {firstImperfect ? (
              <Pressable onPress={() => p.onPlayLevel(firstImperfect)} style={[styles.playBtn, styles.ghost]}>
                <Text style={[styles.playText, { color: UI.gold, fontSize: 16 }]}>★ {firstImperfect}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={p.onGoCurrent} style={styles.playBtn}>
                <Text style={[styles.playText, { fontSize: 16 }]}>{t('floor.goCurrent')}</Text>
              </Pressable>
            )}
          </>
        )}
        {mode === 'upcoming' && (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.footKicker}>{t('floor.upcoming')}</Text>
              <Text style={styles.footTitle}>{t('floor.levelsLeft', { n: Math.max(0, m.first - n) })}</Text>
            </View>
            <Pressable onPress={p.onGoCurrent} style={styles.playBtn}>
              <Text style={[styles.playText, { fontSize: 16 }]}>{mapName(curMap)}</Text>
            </Pressable>
          </>
        )}
        {mode === 'locked' && (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.footKicker}>{t('floor.opensIn')}</Text>
              <Text style={styles.footTitle}>{t('floor.levelsLeft', { n: leftToOpen })}</Text>
            </View>
            <Pressable onPress={p.onGoCurrent} style={styles.playBtn}>
              <Text style={[styles.playText, { fontSize: 16 }]}>{mapName(curMap)}</Text>
            </Pressable>
          </>
        )}
        {mode === 'complete' && (
          <>
            <View style={{ flex: 1 }}>
              <Text style={[styles.footKicker, { color: UI.gold }]}>{t('floor.chestOf', { name: mapName(m) })}</Text>
              <Text style={styles.footTitle}>
                ● {num(reward.coins)} · 💎 {reward.gems}
              </Text>
              <Text style={styles.footSub}>{t('floor.gateOpen')}</Text>
            </View>
            <Pop ms={700}>
              <Pressable onPress={p.onBack} style={styles.playBtn}>
                <Text style={[styles.playText, { fontSize: 16 }]}>{t('floor.down')} ▼</Text>
              </Pressable>
            </Pop>
          </>
        )}
      </View>

      <Sheet visible={pick !== null} onClose={() => setPick(null)}>
        {pick !== null && (
          <>
            <Text style={styles.sheetTitle}>{t('common.level', { n: pick })}</Text>
            <Text style={styles.sheetStars}>
              {'★'.repeat(progress.stars[`L${pick}`] ?? 0)}
              <Text style={{ color: UI.panelHi }}>{'★'.repeat(3 - (progress.stars[`L${pick}`] ?? 0))}</Text>
            </Text>
            <Text style={styles.footSub}>{(progress.stars[`L${pick}`] ?? 0) >= 3 ? t('map.replayPerfect') : t('map.replayMore')}</Text>
            <View style={{ height: 8 }} />
            <Btn
              label={t('map.replay')}
              primary
              onPress={() => {
                const lv = pick;
                setPick(null);
                p.onPlayLevel(lv);
              }}
            />
            <TextLink label={t('common.close')} onPress={() => setPick(null)} />
          </>
        )}
      </Sheet>
    </View>
  );
}

function Bay(p: {
  lv: number;
  w: number;
  state: 'done' | 'current' | 'future';
  last: boolean;
  hard: boolean;
  stars: number;
  color: string;
  fav: string;
  celebrate: boolean;
  chestRef?: React.RefObject<ViewRef | null>;
  onPress(): void;
}) {
  const edge = p.state === 'current' ? UI.accent : p.last ? UI.gold : p.state === 'future' ? 'rgba(242,227,184,0.45)' : '#F2E3B8';
  return (
    <Pressable onPress={p.onPress} style={{ width: p.w, height: BAY_H, alignItems: 'center' }}>
      {p.state === 'current' && <PulseRing size={{ w: p.w + 6, h: BAY_H + 6 }} color={UI.accent} radius={10} />}
      <View style={[styles.bay, { width: p.w, borderColor: edge }, p.state === 'current' && { backgroundColor: 'rgba(86,204,242,0.18)' }]}>
        {p.state === 'done' && !p.last && (
          <>
            <Bob on={p.celebrate} px={4} ms={300} delay={(p.lv % 5) * 80}>
              <MiniCar color={p.color} w={p.w * 0.5} h={p.w * 0.72} />
            </Bob>
            <Text style={styles.stars}>
              {'★'.repeat(p.stars)}
              <Text style={{ color: 'rgba(255,255,255,0.25)' }}>{'★'.repeat(3 - p.stars)}</Text>
            </Text>
          </>
        )}
        {p.state === 'current' && (
          <>
            <Bob px={3} ms={500}>
              <CarArt model={carByKey(p.fav)} width={p.w - 6} />
            </Bob>
            <Pop>
              <View style={styles.numChip}>
                <Text style={styles.numChipText}>{p.lv}</Text>
              </View>
            </Pop>
          </>
        )}
        {p.last && p.state !== 'current' && (
          <Animated.View ref={p.chestRef as React.Ref<ViewRef>} style={{ alignItems: 'center' }}>
            {p.celebrate ? (
              <Pop k={1.2} ms={350}>
                <Image source={ICONS.chest} style={{ width: p.w * 0.8, height: p.w * 0.8 }} />
              </Pop>
            ) : (
              <Shake on={p.state === 'future'}>
                <Image source={ICONS.chest} style={{ width: p.w * 0.72, height: p.w * 0.72, opacity: p.state === 'done' ? 0.55 : 1 }} />
              </Shake>
            )}
            <Text style={[styles.num, { color: UI.gold }]}>{p.lv}</Text>
          </Animated.View>
        )}
        {p.state === 'future' && !p.last && <Text style={[styles.num, p.hard && { color: '#FF8A80' }]}>{p.lv}</Text>}
      </View>
    </Pressable>
  );
}

/** Giriş bariyeri: açılıp kapanır (tamamlanınca açık kalır) */
function Gate({ open, still, left, top }: { open: boolean; still: boolean; left: number; top: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) {
      Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }).start();
      return;
    }
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(v, { toValue: 0.18, duration: 500, useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(v, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [open, still, v]);
  return (
    <Animated.View
      style={[
        styles.gate,
        { left, top },
        { transform: [{ translateX: -35 }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-70deg'] }) }, { translateX: 35 }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 12 },
  back: { backgroundColor: UI.panel, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8 },
  backText: { color: UI.text, fontWeight: '900', fontSize: 14 },
  kat: { color: UI.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  name: { color: UI.text, fontSize: 20, fontWeight: '900' },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginTop: 10 },
  bar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: UI.panel, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: UI.accent },
  prog: { color: '#9FE2FF', fontWeight: '900', fontSize: 13 },
  headIcon: { width: 28, height: 28 },
  taken: { color: '#8FF0B4', fontWeight: '900', fontSize: 16 },
  ringOuter: { flex: 1, backgroundColor: '#1A1D26', borderRadius: 30, padding: 3 },
  ring: { flex: 1, backgroundColor: '#545B6B', borderRadius: 28, padding: RING },
  dash: { position: 'absolute', left: RING / 2, top: RING / 2, right: RING / 2, bottom: RING / 2, borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(242,227,184,0.7)' },
  asphalt: { flex: 1, backgroundColor: '#3A4152', borderRadius: 14, padding: 8 },
  bayRow: { justifyContent: 'space-between' },
  bay: { height: BAY_H, borderWidth: 2.5, borderTopWidth: 0, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, gap: 4, overflow: 'hidden' },
  stars: { color: UI.gold, fontSize: 10, fontWeight: '900', letterSpacing: -0.5 },
  num: { color: UI.dim, fontSize: 15, fontWeight: '900', marginBottom: 6 },
  numChip: { backgroundColor: UI.accent, borderRadius: 8, paddingHorizontal: 6, marginTop: 2 },
  numChipText: { color: UI.bg, fontWeight: '900', fontSize: 14 },
  gate: { position: 'absolute', width: 70, height: 6, borderRadius: 3, backgroundColor: UI.gold, borderWidth: 1, borderColor: '#1A1D26' },
  light: { position: 'absolute', backgroundColor: '#1A1D26', borderRadius: 7, padding: 3 },
  lamp: { width: 10, height: 10, borderRadius: 5 },
  cloud: { width: 220, height: 80, borderRadius: 40, backgroundColor: 'rgba(231,238,247,0.22)' },
  lockCard: { position: 'absolute', left: 40, right: 40, top: 110, backgroundColor: UI.bg2, borderWidth: 2, borderColor: UI.gold, borderRadius: 22, padding: 16, alignItems: 'center', gap: 6 },
  lockTitle: { color: UI.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  lockSub: { color: UI.dim, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  lockReward: { color: UI.gold, fontSize: 13, fontWeight: '900' },
  doneBanner: { position: 'absolute', left: 0, right: 0, top: 160, alignItems: 'center' },
  doneText: { color: UI.gold, fontSize: 36, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 8 },
  foot: { position: 'absolute', left: 12, right: 12, bottom: 10, backgroundColor: UI.bg2, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  footKicker: { color: UI.dim, fontSize: 12, fontWeight: '800' },
  footTitle: { color: UI.text, fontSize: 19, fontWeight: '900' },
  footGold: { color: UI.gold, fontSize: 12, fontWeight: '800' },
  footSub: { color: UI.dim, fontSize: 12, fontWeight: '700' },
  playBtn: { backgroundColor: UI.accent, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 18 },
  ghost: { backgroundColor: UI.panel, borderWidth: 2, borderColor: UI.gold },
  playText: { color: UI.bg, fontSize: 20, fontWeight: '900' },
  sheetTitle: { color: UI.text, fontSize: 24, fontWeight: '900' },
  sheetStars: { color: UI.gold, fontSize: 30, letterSpacing: 3 },
});
