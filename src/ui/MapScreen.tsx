// Harita: "Parxi Otoparkı". Her harita bir kat; katlar yukarıdan aşağı dizilir, oyuncu aşağı iner.
// Sağdaki rampada oyuncunun garajındaki arabalar kattan kata iner. Bulunduğun katta vitrin araban
// zıplar. Kata dokununca kat içi açılır (FloorView): her seviye bir park yeri.
// Haritalar 3'erli kısımlar hâlinde açılır; yeni kısım açılınca bir kez tören yapılır (Altın sandık + 2 bilet).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, ScrollViewInstance, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { allMaps, MapInfo, mapOfLevel, pendingSection, SECTION_SIZE } from '../core/maps';
import { CAR_MODELS, carByKey, CarModel, SPECIAL_CARS } from '../core/garage';
import type { Reward } from '../core/chests';
import { TICKET_REWARD } from '../core/prices';
import { UI } from '../game/palette';
import { visibleMapCount } from '../game/mapThemes';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import CarArt from './CarArt';
import ChestOpen from './ChestOpen';
import FloorView, { FloorMode } from './FloorView';
import { ICONS } from './icons';
import { TabHeader } from './kit';
import { useLayout } from './layout';
import { Blink, Bob, Drift, PathMover, Pop, Shake } from './anim';

export const FLOOR_H = 112;
const GAP = 22;
const DIV_H = 64;
const RAMP_W = 64;
export const CAR_COLORS = ['#E8453C', '#3A86FF', '#3BCE7A', '#FFB020', '#B04CFF', '#56CCF2', '#FF4D9A'];

export const mapName = (m: MapInfo) => t(`map.${m.key}` as Key);
export const floorLabel = (m: MapInfo) => t('map.floor', { n: m.index + 1 });

/** Garajda gerçekten olan arabalar (rampada ve kat yolunda dolaşanlar): son açılanlar önce */
export function garageCars(p: Progress, n = 4): CarModel[] {
  const done = Math.max(1, p.level - 1);
  const have = [
    ...CAR_MODELS.filter((m) => m.level <= done),
    ...SPECIAL_CARS.filter((m) => p.owned.includes(`garage:${m.key}`)),
  ];
  const fav = carByKey(p.favoriteCar);
  const rest = have.filter((m) => m.key !== fav.key).reverse();
  return rest.length ? rest.slice(0, n) : [fav];
}

type Item = { kind: 'floor'; m: MapInfo; y: number; locked: boolean } | { kind: 'div'; section: number; maps: MapInfo[]; y: number };

export default function MapScreen({
  progress,
  onPlay,
  onPlayLevel,
  newFrom,
  onSection,
}: {
  progress: Progress;
  onPlay(): void;
  /** Geçilmiş bir seviyeyi tekrar oyna */
  onPlayLevel(n: number): void;
  onShop(): void;
  /** Bu seviyeden sonra açılanlar "yeni" (haritaya son bakıştan beri) */
  newFrom: number;
  /** Kısım açılış ödülü (bir kez); sonuç ekranda gösterilir */
  onSection(section: number): Reward | null;
}) {
  const { width } = useLayout();
  const all = allMaps();
  const current = mapOfLevel(progress.level).index;
  const shownCount = visibleMapCount(current, all.length);
  const locked = all.slice(shownCount, shownCount + SECTION_SIZE);
  const scroll = useRef<ScrollViewInstance>(null);

  // Az önce biten kat: tamamlama anı bir kez (sekmeye girince)
  const justDone = useMemo(() => {
    const m = current > 0 ? all[current - 1] : null;
    return m && m.last >= newFrom && m.last < progress.level ? m.index : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [floor, setFloor] = useState<{ index: number; mode: FloorMode } | null>(justDone !== null ? { index: justDone, mode: 'complete' } : null);
  const pending = pendingSection(progress.level, progress.sectionsClaimed);
  const [ceremony, setCeremony] = useState<{ section: number; reward: Reward } | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Düzen: katlar ve kısım ayraçları (y konumları rampa için)
  const items = useMemo(() => {
    const out: Item[] = [];
    let y = 12;
    const list = [...all.slice(0, shownCount), ...locked];
    list.forEach((m, i) => {
      if (i > 0 && m.index % SECTION_SIZE === 0) {
        const s = m.index / SECTION_SIZE;
        out.push({ kind: 'div', section: s, maps: all.slice(m.index, m.index + SECTION_SIZE), y });
        y += DIV_H + GAP;
      }
      out.push({ kind: 'floor', m, y, locked: m.index >= shownCount });
      y += FLOOR_H + GAP;
    });
    return { list: out, height: y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownCount, all.length]);

  const curItem = items.list.find((it) => it.kind === 'floor' && it.m.index === current);
  const scrollTo = (y: number) => setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, y - 160), animated: true }), 80);
  useEffect(() => {
    if (curItem) scrollTo(curItem.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kısım töreni: kat ekranı kapalıyken, bekleyen kısım varsa
  useEffect(() => {
    if (floor || pending === null || ceremony || unlocking) return;
    const div = items.list.find((it) => it.kind === 'div' && it.section === pending);
    if (div) scrollTo(div.y);
    setUnlocking(true);
    const id = setTimeout(() => {
      const r = onSection(pending);
      setUnlocking(false);
      if (r) setCeremony({ section: pending, reward: r });
    }, 1300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, pending]);

  const rampX = width - RAMP_W / 2 - 8;
  const cardW = width - 16 - RAMP_W - 12;
  const floorsY = items.list.filter((it) => it.kind === 'floor').map((it) => it.y + FLOOR_H / 2);
  // Zikzak rampa: her katın hizasında bir sağa bir sola
  const rampPts: [number, number][] = [[rampX, 0], ...floorsY.map((y, i): [number, number] => [rampX + (i % 2 ? 12 : -12), y]), [rampX, items.height]];
  const cars = garageCars(progress, 3);

  if (floor) {
    const m = all[floor.index];
    return (
      <FloorView
        m={m}
        mode={floor.mode}
        progress={progress}
        onBack={() => {
          setFloor(null);
          if (curItem) scrollTo(curItem.y);
        }}
        onPlay={onPlay}
        onPlayLevel={onPlayLevel}
        onGoCurrent={() => setFloor({ index: current, mode: 'active' })}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={t('map.lot')} money={progress} />
      <ScrollView ref={scroll} contentContainerStyle={{ height: items.height + 20 }}>
        {/* Rampa */}
        {rampPts.slice(1).map((b, i) => {
          const a = rampPts[i];
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
          return (
            <View
              key={i}
              style={[styles.ramp, { left: (a[0] + b[0]) / 2 - len / 2 - 2, top: (a[1] + b[1]) / 2 - 15, width: len + 4, transform: [{ rotate: `${ang}deg` }] }]}
            >
              <View style={styles.rampLine} />
            </View>
          );
        })}
        {cars.map((c, i) => (
          <PathMover
            key={c.key}
            fadeEnds
            ms={Math.max(9000, items.height * 9)}
            offset={i / cars.length}
            points={rampPts.map((p, k) => {
              const nx = rampPts[Math.min(k + 1, rampPts.length - 1)];
              const ang = (Math.atan2(nx[1] - p[1], nx[0] - p[0]) * 180) / Math.PI;
              return [p[0] - 18, p[1] - 9, k === rampPts.length - 1 ? 90 : ang, 1];
            })}
          >
            <CarArt model={c} width={36} />
          </PathMover>
        ))}
        {floorsY.slice(0, 1).map((y) => (
          <Blink key="light" style={[styles.light, { left: rampX - 30, top: y - 60 }]}>
            <View style={[styles.lamp, { backgroundColor: '#3BCE7A' }]} />
          </Blink>
        ))}

        {items.list.map((it) =>
          it.kind === 'div' ? (
            <Divider key={`d${it.section}`} section={it.section} maps={it.maps} y={it.y} w={cardW} claimed={progress.sectionsClaimed.includes(it.section)} open={it.maps[0].index < shownCount} />
          ) : (
            <FloorCard
              key={it.m.index}
              m={it.m}
              y={it.y}
              w={cardW}
              progress={progress}
              state={it.locked ? 'locked' : it.m.index < current ? 'done' : it.m.index === current ? 'current' : 'next'}
              onOpen={() =>
                setFloor({ index: it.m.index, mode: it.locked ? 'locked' : it.m.index < current ? 'done' : it.m.index === current ? 'active' : 'upcoming' })
              }
              onPlay={onPlay}
            />
          ),
        )}
        {locked.length > 0 && (
          <>
            <Drift from={-180} to={width + 40} ms={26000} style={[styles.cloud, { top: items.height - (FLOOR_H + GAP) * 2 - 30 }]}>
              <View style={styles.cloudShape} />
            </Drift>
            <Drift from={-220} to={width + 40} ms={34000} offset={0.5} style={[styles.cloud, { top: items.height - FLOOR_H - 40 }]}>
              <View style={[styles.cloudShape, { width: 240, height: 80 }]} />
            </Drift>
          </>
        )}
        <Text style={[styles.more, { top: items.height - 6 }]}>{t('map.more')}</Text>
      </ScrollView>

      {unlocking && pending !== null && <Unlocking section={pending} />}
      {ceremony && (
        <ChestOpen
          look="gold"
          title={t('section.title')}
          reward={ceremony.reward}
          onClose={() => {
            setCeremony(null);
            if (curItem) scrollTo(curItem.y);
          }}
        />
      )}
    </View>
  );
}

function FloorCard(p: { m: MapInfo; y: number; w: number; progress: Progress; state: 'done' | 'current' | 'next' | 'locked'; onOpen(): void; onPlay(): void }) {
  const { m, progress, state } = p;
  const n = progress.level;
  const doneCount = state === 'done' ? m.size : state === 'current' ? n - m.first : 0;
  const starSum = Array.from({ length: m.size }, (_, i) => progress.stars[`L${m.first + i}`] ?? 0).reduce((a, b) => a + b, 0);
  const claimed = progress.mapsClaimed.includes(m.index);
  const look = LOOK[state];
  return (
    <Pressable onPress={p.onOpen} style={({ pressed }) => [styles.card, { top: p.y, width: p.w, backgroundColor: look.bg, borderColor: look.border }, pressed && { opacity: 0.9 }]}>
      <View style={styles.cardHead}>
        <View style={styles.kat}>
          <Text style={styles.katText}>{floorLabel(m)}</Text>
        </View>
        <View style={[styles.mapDot, { backgroundColor: m.color }]} />
        <Text style={[styles.cardName, state === 'locked' && { color: UI.dim }]} numberOfLines={1}>
          {mapName(m)}
        </Text>
        {state === 'done' && <Text style={styles.cardStat}>★ {starSum}/{m.size * 3}</Text>}
        {state === 'current' && <Text style={[styles.cardStat, { color: '#9FE2FF' }]}>{doneCount}/{m.size}</Text>}
        {state === 'locked' ? (
          <Shake every={2200}>
            <Image source={ICONS.lock} style={styles.headIcon} />
          </Shake>
        ) : (
          <Shake on={state === 'current'} every={2600}>
            <Image source={ICONS.chest} style={[styles.headIcon, claimed && { opacity: 0.45 }]} />
          </Shake>
        )}
      </View>
      <View style={styles.cardRow}>
        {state === 'locked' ? (
          <Hazard w={p.w - 26} />
        ) : state === 'next' ? (
          <>
            {Array.from({ length: 7 }, (_, i) => (
              <View key={i} style={styles.emptyBay} />
            ))}
            <Text style={styles.nextText}>0/{m.size}</Text>
          </>
        ) : state === 'done' ? (
          Array.from({ length: 7 }, (_, i) => <MiniCar key={i} color={CAR_COLORS[(i + m.index) % 7]} />)
        ) : (
          <>
            {Array.from({ length: Math.min(doneCount, 4) }, (_, i) => (
              <Bob key={i} px={2} ms={700} delay={i * 180}>
                <MiniCar color={CAR_COLORS[(i + m.index) % 7]} />
              </Bob>
            ))}
            <Bob px={3} ms={500} style={{ overflow: 'visible' }}>
              <CarArt model={carByKey(progress.favoriteCar)} width={46} />
            </Bob>
            <View style={{ flex: 1 }} />
            <Pop>
              <Pressable onPress={p.onOpen} hitSlop={6} style={styles.enter}>
                <Text style={styles.enterText}>{t('map.enter')} ▶</Text>
              </Pressable>
            </Pop>
          </>
        )}
      </View>
      {state === 'locked' && <View style={styles.veil} pointerEvents="none" />}
    </Pressable>
  );
}

const LOOK = {
  done: { bg: '#1C3A2A', border: '#3BCE7A' },
  current: { bg: '#13223A', border: UI.accent },
  next: { bg: '#16263D', border: '#2F4C74' },
  locked: { bg: '#141C2B', border: '#2A3A55' },
};

export function MiniCar({ color, w = 26, h = 14 }: { color: string; w?: number; h?: number }) {
  return (
    <View style={[styles.mini, { backgroundColor: color, width: w, height: h }]}>
      <View style={[styles.miniCab, { width: w * 0.4, height: h * 0.55 }]} />
    </View>
  );
}

export function Hazard({ w, h = 16 }: { w: number; h?: number }) {
  return (
    <View style={[styles.hazard, { width: w, height: h }]}>
      {Array.from({ length: Math.ceil(w / 20) + 2 }, (_, i) => (
        <View key={i} style={[styles.stripe, { left: i * 20 - 14, height: h * 2.2, top: -h * 0.6 }]} />
      ))}
    </View>
  );
}

function Divider({ section, maps, y, w, claimed, open }: { section: number; maps: MapInfo[]; y: number; w: number; claimed: boolean; open: boolean }) {
  return (
    <View style={[styles.div, { top: y, width: w }, !open && { borderColor: '#2A3A55' }]}>
      <Image source={ICONS[open ? 'chest-gold' : 'lock']} style={{ width: 36, height: 36, opacity: claimed ? 0.5 : 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.divKicker}>{t('map.section', { n: section + 1 })}</Text>
        <Text style={styles.divName} numberOfLines={1}>
          {maps.map(mapName).join(' · ')}
        </Text>
      </View>
      <Text style={styles.divReward}>{claimed ? '✓' : `🎟 +${TICKET_REWARD.section}`}</Text>
    </View>
  );
}

/** Tören öncesi: kilit kırılır, ışık patlar */
function Unlocking({ section }: { section: number }) {
  return (
    <View style={styles.unlock} pointerEvents="none">
      <Pop k={1.25} ms={300}>
        <Shake every={0}>
          <Image source={ICONS.lock} style={{ width: 120, height: 120 }} />
        </Shake>
      </Pop>
      <Text style={styles.unlockText}>{t('map.section', { n: section + 1 })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ramp: { position: 'absolute', height: 30, backgroundColor: '#545B6B', borderWidth: 3, borderColor: '#1A1D26', borderRadius: 14, justifyContent: 'center' },
  rampLine: { height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#F2E3B8', marginHorizontal: 8 },
  light: { position: 'absolute', backgroundColor: '#1A1D26', borderRadius: 7, padding: 3 },
  lamp: { width: 10, height: 10, borderRadius: 5 },
  card: { position: 'absolute', left: 12, height: FLOOR_H, borderRadius: 18, borderWidth: 3, padding: 10, gap: 8, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kat: { backgroundColor: UI.bg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  katText: { color: UI.gold, fontSize: 11, fontWeight: '900' },
  mapDot: { width: 8, height: 8, borderRadius: 4 },
  cardName: { flex: 1, color: UI.text, fontSize: 17, fontWeight: '900' },
  cardStat: { color: '#8FF0B4', fontSize: 13, fontWeight: '900' },
  headIcon: { width: 28, height: 28 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 5, borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.22)', paddingTop: 9, minHeight: 44 },
  mini: { borderRadius: 5, borderWidth: 2, borderColor: '#1A1D26', alignItems: 'center', justifyContent: 'center' },
  miniCab: { backgroundColor: '#1E2636', borderRadius: 3 },
  emptyBay: { width: 22, height: 14, borderRadius: 4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(242,227,184,0.4)' },
  nextText: { color: UI.dim, fontWeight: '900', fontSize: 13, marginLeft: 'auto' },
  enter: { backgroundColor: UI.accent, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 6 },
  enterText: { color: UI.bg, fontWeight: '900', fontSize: 14 },
  hazard: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#1A1D26', opacity: 0.6 },
  stripe: { position: 'absolute', width: 10, backgroundColor: UI.gold, transform: [{ rotate: '35deg' }] },
  veil: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,27,45,0.25)' },
  div: { position: 'absolute', left: 12, height: DIV_H, borderRadius: 16, borderWidth: 2, borderColor: UI.gold, backgroundColor: '#2E2810', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  divKicker: { color: UI.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  divName: { color: UI.text, fontSize: 14, fontWeight: '900' },
  divReward: { color: '#8FF0B4', fontWeight: '900', fontSize: 14 },
  cloud: { position: 'absolute', left: 0 },
  cloudShape: { width: 200, height: 70, borderRadius: 40, backgroundColor: 'rgba(231,238,247,0.2)' },
  more: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: UI.dim, fontSize: 12 },
  unlock: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,10,20,0.6)', gap: 12, zIndex: 40 },
  unlockText: { color: UI.gold, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
});
