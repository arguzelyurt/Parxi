import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ECONOMY, PRODUCTS } from '../core/monetization';
import { UI } from '../game/palette';
import { ProductKey, starterOfferActive, STARTER_WINDOW_MS } from '../game/purchases';
import { Progress } from '../game/storage';
import { iapAvailable, priceFor } from '../services/iap';
import Sheet from './Sheet';
import { num, t } from '../i18n';

interface Props {
  visible: boolean;
  progress: Progress;
  onClose(): void;
  onBuy(key: ProductKey): void;
  onRestore(): void;
}

const COIN_ROWS: { key: ProductKey; amount: number; note?: 'shop.more20' | 'shop.more40' | 'shop.best' }[] = [
  { key: 'coins500', amount: 500 },
  { key: 'coins1800', amount: 1800, note: 'shop.more20' },
  { key: 'coins5500', amount: 5500, note: 'shop.more40' },
  { key: 'coins16000', amount: 16000, note: 'shop.best' },
];

export default function ShopSheet({ visible, progress, onClose, onBuy, onRestore }: Props) {
  const now = Date.now();
  const starter = starterOfferActive(progress, now);
  const hoursLeft = starter ? Math.ceil((progress.starterOfferAt + STARTER_WINDOW_MS - now) / 3600_000) : 0;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{t('shop.title')}</Text>
      <Text style={styles.coins}>● {progress.coins}</Text>
      {!iapAvailable() && (
        <Text style={styles.warn}>
          {t('shop.unavailable')}
        </Text>
      )}
      <ScrollView style={{ alignSelf: 'stretch', maxHeight: 460 }} contentContainerStyle={{ gap: 8 }}>
        {starter && (
          <Row
            highlight
            label={t('shop.starter')}
            sub={t('shop.starterSub', { h: hoursLeft })}
            price={priceFor(PRODUCTS.starter.id, PRODUCTS.starter.usd)}
            onPress={() => onBuy('starter')}
          />
        )}
        {!progress.ads.removeAds && (
          <Row
            label={t('shop.removeAds')}
            sub={t('shop.removeAdsSub')}
            price={priceFor(PRODUCTS.removeAds.id, PRODUCTS.removeAds.usd)}
            onPress={() => onBuy('removeAds')}
          />
        )}
        {!progress.skipRewarded && (
          <Row
            label={t('shop.supporter')}
            sub={t('shop.supporterSub')}
            price={priceFor(PRODUCTS.supporter.id, PRODUCTS.supporter.usd)}
            onPress={() => onBuy('supporter')}
          />
        )}
        <Row
          label={t('shop.rescue')}
          sub={t('shop.rescueSub')}
          price={priceFor(PRODUCTS.rescue.id, PRODUCTS.rescue.usd)}
          onPress={() => onBuy('rescue')}
        />
        {progress.level > ECONOMY.piggy.unlockLevel && (
          <Row
            label={t('shop.piggy', { n: num(progress.piggy) })}
            sub={
              progress.piggy >= ECONOMY.piggy.cap
                ? t('shop.piggyFull')
                : t('shop.piggySub', { per: ECONOMY.piggy.perLevel, cap: num(ECONOMY.piggy.cap) })
            }
            price={priceFor(PRODUCTS.piggy.id, PRODUCTS.piggy.usd)}
            onPress={() => onBuy('piggy')}
            disabled={progress.piggy < 300}
          />
        )}
        {COIN_ROWS.map((r) => (
          <Row
            key={r.key}
            label={t('shop.coins', { n: num(r.amount) })}
            sub={r.note ? t(r.note) : undefined}
            price={priceFor(PRODUCTS[r.key].id, PRODUCTS[r.key].usd)}
            onPress={() => onBuy(r.key)}
          />
        ))}
      </ScrollView>
      <Pressable onPress={onRestore} hitSlop={8} style={{ marginTop: 12 }}>
        <Text style={styles.link}>{t('settings.restore')}</Text>
      </Pressable>
    </Sheet>
  );
}

function Row(props: {
  label: string;
  sub?: string;
  price: string;
  onPress(): void;
  highlight?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.row,
        props.highlight && styles.rowHi,
        (pressed || props.disabled) && { opacity: 0.6 },
      ]}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowLabel}>{props.label}</Text>
        {props.sub && <Text style={styles.rowSub}>{props.sub}</Text>}
      </View>
      <View style={styles.price}>
        <Text style={styles.priceText}>{props.price}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { color: UI.text, fontSize: 22, fontWeight: '800' },
  coins: { color: UI.gold, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  warn: { color: UI.dim, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: UI.bg, borderRadius: 14, padding: 14 },
  rowHi: { borderWidth: 2, borderColor: UI.gold },
  rowLabel: { color: UI.text, fontSize: 16, fontWeight: '700' },
  rowSub: { color: UI.dim, fontSize: 12, marginTop: 2 },
  price: {
    backgroundColor: UI.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  priceText: { color: UI.bg, fontWeight: '800' },
  link: { color: UI.dim, fontSize: 13, textDecorationLine: 'underline' },
});
