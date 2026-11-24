import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLayout } from './layout';
import { CAR_MODELS, CarModel, nextCar } from '../core/garage';
import { UI } from '../game/palette';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import CarArt from './CarArt';
import { Btn, TabHeader } from './kit';
import Sheet from './Sheet';

export const carName = (key: string): string => t(`car.${key}` as Key);

export type Tier = 'common' | 'rare' | 'epic' | 'legend';
/** Açıldığı seviyeye göre nadirlik: güzel modeller ileride */
export const tierOf = (m: CarModel): Tier => (m.level < 30 ? 'common' : m.level < 100 ? 'rare' : m.level < 200 ? 'epic' : 'legend');
export const TIER_COLOR: Record<Tier, string> = { common: UI.dim, rare: UI.accent, epic: '#B98CFF', legend: UI.gold };

/** Bitirilen en yüksek seviye */
export const levelsDone = (p: Progress): number => p.level - 1;

export default function GarageScreen({
  progress,
  onShop,
  onFavorite,
}: {
  progress: Progress;
  onShop(): void;
  onFavorite(key: string): void;
}) {
  const { width, tablet } = useLayout();
  const cols = tablet ? 3 : 2;
  const tile = Math.floor((width - 24 * 2 - 12 * (cols - 1)) / cols);
  const done = levelsDone(progress);
  const open = CAR_MODELS.filter((m) => m.level <= Math.max(1, done)).length;
  const next = nextCar(done);
  const [open_, setOpen] = useState<CarModel | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={t('garage.title')} coins={progress.coins} onCoins={onShop} />
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.summary}>
          <Text style={styles.count}>{t('garage.count', { a: open, b: CAR_MODELS.length })}</Text>
          {next && <Text style={styles.next}>{t('garage.next', { n: next.level })}</Text>}
        </View>
        <View style={styles.grid}>
          {CAR_MODELS.map((m) => {
            const unlocked = m.level <= Math.max(1, done);
            const fav = progress.favoriteCar === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setOpen(m)}
                style={[styles.tile, { width: tile }, fav && styles.tileFav]}
              >
                <View style={{ height: tile * 0.5, justifyContent: 'center' }}>
                  <CarArt model={m} width={tile - 28} silhouette={!unlocked} />
                </View>
                <Text style={[styles.name, !unlocked && { color: UI.dim }]}>{unlocked ? carName(m.key) : '???'}</Text>
                <Text style={[styles.meta, fav && { color: UI.accent }]}>
                  {!unlocked ? '🔒 ' + t('garage.locked', { n: m.level }) : fav ? t('garage.favorite') : ' '}
                </Text>
                <Text style={[styles.tier, { color: TIER_COLOR[tierOf(m)] }]}>{t(`garage.tier.${tierOf(m)}` as Key)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.more}>{t('garage.more')}</Text>
      </ScrollView>
      <Sheet visible={!!open_} onClose={() => setOpen(null)}>
        {open_ && (
          <CarDetail
            m={open_}
            unlocked={open_.level <= Math.max(1, done)}
            fav={progress.favoriteCar === open_.key}
            left={open_.level - done}
            width={width - 96}
            onFavorite={() => {
              onFavorite(open_.key);
              setOpen(null);
            }}
            onClose={() => setOpen(null)}
          />
        )}
      </Sheet>
    </View>
  );
}

function CarDetail(p: {
  m: CarModel;
  unlocked: boolean;
  fav: boolean;
  left: number;
  width: number;
  onFavorite(): void;
  onClose(): void;
}) {
  const tier = tierOf(p.m);
  return (
    <>
      <Text style={[styles.tier, { color: TIER_COLOR[tier], fontSize: 13 }]}>{t(`garage.tier.${tier}` as Key)}</Text>
      <Text style={styles.detailName}>{p.unlocked ? carName(p.m.key) : '???'}</Text>
      <View style={{ marginVertical: 18 }}>
        <CarArt model={p.m} width={p.width} silhouette={!p.unlocked} />
      </View>
      <Text style={styles.detailSub}>
        {p.unlocked
          ? p.m.level <= 1
            ? t('garage.starter')
            : t('garage.unlockedAt', { n: p.m.level })
          : t('garage.lockedAt', { n: p.m.level, left: p.left })}
      </Text>
      <View style={{ height: 8 }} />
      {p.unlocked && !p.fav && <Btn label={t('garage.setFavorite')} primary onPress={p.onFavorite} />}
      {p.unlocked && p.fav && <Text style={[styles.detailSub, { color: UI.accent, marginVertical: 8 }]}>{t('garage.favorite')}</Text>}
      <Btn label={t('garage.close')} onPress={p.onClose} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  sub: { color: UI.dim, fontSize: 13 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { color: UI.text, fontWeight: '800', fontSize: 15 },
  next: { color: UI.gold, fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    backgroundColor: UI.panel,
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileFav: { borderColor: UI.accent },
  name: { color: UI.text, fontWeight: '800', fontSize: 15, marginTop: 8 },
  meta: { color: UI.gold, fontSize: 12, marginTop: 2 },
  tier: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  detailName: { color: UI.text, fontSize: 26, fontWeight: '900', marginTop: 2 },
  detailSub: { color: UI.dim, fontSize: 14, textAlign: 'center' },
  more: { color: UI.dim, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
