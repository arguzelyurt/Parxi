// Marketin para sayfaları: Sandıklar + Şans Çarkı, Elmas (paketler, elmasla alınanlar, takas).
import React, { useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { chestOdds, Reward, WHEEL } from '../core/chests';
import { MYSTERY_PRICE, RARITIES } from '../core/market';
import { AD_MONEY, BOOST_MS, CHEST_COST, CHEST_KINDS, ChestKind, GEM_COST, Money, SHIELD_MAX, TRADE } from '../core/prices';
import { GEM_PACKS, PRODUCTS, STARTER_PACK } from '../core/monetization';
import { UI } from '../game/palette';
import { Key, num, t } from '../i18n';
import { priceFor } from '../services/iap';
import ChestOpen, { ChestLook } from './ChestOpen';
import { TIER_COLOR } from './GarageScreen';
import { ICONS } from './icons';
import { Money3 } from './kit';
import { fmtMs } from './Lives';
import Sheet from './Sheet';

const CHEST_IMG: Record<ChestKind, keyof typeof ICONS> = { bronze: 'chest-bronze', silver: 'chest-silver', gold: 'chest-gold' };
const CHEST_EDGE: Record<ChestKind, string> = { bronze: '#C27A3A', silver: '#B8C6D6', gold: '#FFC400' };

/** "● 400" / "💎 15" / "🎟 2" yerine ikonlu fiyat */
export function PriceTag({ cost, dim }: { cost: Money; dim?: boolean }) {
  const [k, v] = (Object.entries(cost).find(([, n]) => n) ?? ['coins', 0]) as [keyof Money, number];
  const icon: keyof typeof ICONS = k === 'gems' ? 'gem' : k === 'tickets' ? 'ticket' : 'coin';
  return (
    <View style={[styles.tag, k === 'tickets' && { backgroundColor: '#3BCE7A' }, k === 'gems' && { backgroundColor: '#4FA3FF' }, dim && { backgroundColor: UI.panelHi }]}>
      <Image source={ICONS[icon]} style={{ width: 18, height: 18 }} />
      <Text style={[styles.tagText, dim && { color: UI.dim }]}>{num(v)}</Text>
    </View>
  );
}

const enough = (m: Money3, c: Money) => (m.coins >= (c.coins ?? 0)) && m.gems >= (c.gems ?? 0) && m.tickets >= (c.tickets ?? 0);

export function ChestsPage(p: {
  money: Money3;
  onChest(kind: ChestKind): Reward | null;
  onMystery(): Reward | null;
  wheelFree: boolean;
  onSpin(): number | null;
  adLeft: number;
  adAvailable: boolean;
  onAdMoney(kind: 'coins' | 'tickets'): Promise<boolean>;
  onNeed(kind: 'coins' | 'gems' | 'tickets'): void;
}) {
  const [open, setOpen] = useState<{ look: ChestLook; title: string; reward: Reward } | null>(null);
  const [odds, setOdds] = useState<ChestKind | null>(null);
  const [adBusy, setAdBusy] = useState(false);

  const buy = (kind: ChestKind) => {
    const cost = CHEST_COST[kind];
    if (!enough(p.money, cost)) return p.onNeed(cost.tickets ? 'tickets' : 'coins');
    const r = p.onChest(kind);
    if (r) setOpen({ look: kind, title: t(`chest.${kind}` as Key).toUpperCase(), reward: r });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.chests}>
          {CHEST_KINDS.map((k) => {
            const cost = CHEST_COST[k];
            return (
              <View key={k} style={[styles.chest, { borderColor: CHEST_EDGE[k] }]}>
                {k === 'gold' && <Text style={styles.best}>{t('chest.best')}</Text>}
                <Image source={ICONS[CHEST_IMG[k]]} style={styles.chestImg} />
                <Text style={[styles.chestName, { color: CHEST_EDGE[k] }]}>{t(`chest.${k}` as Key)}</Text>
                <Text style={styles.chestSub} numberOfLines={2}>
                  {t(`chest.${k}.sub` as Key)}
                </Text>
                <Pressable onPress={() => buy(k)} style={({ pressed }) => [{ alignSelf: 'stretch' }, pressed && { opacity: 0.8 }]}>
                  <PriceTag cost={cost} dim={!enough(p.money, cost)} />
                </Pressable>
                <Pressable onPress={() => setOdds(k)} hitSlop={6}>
                  <Text style={styles.oddsLink}>{t('chest.odds')}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Wheel free={p.wheelFree} tickets={p.money.tickets} onSpin={p.onSpin} onNeed={() => p.onNeed('tickets')} onReward={(r) => setOpen({ look: 'plain', title: t('wheel.title').toUpperCase(), reward: r })} />

        <Pressable
          onPress={() => {
            if (p.money.coins < MYSTERY_PRICE) return p.onNeed('coins');
            const r = p.onMystery();
            if (r) setOpen({ look: 'silver', title: t('market.box').toUpperCase(), reward: r });
          }}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.rowIcon}>
            <Text style={styles.q}>?</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t('market.box')}</Text>
            <Text style={styles.rowSub}>{t('chest.mysterySub')}</Text>
          </View>
          <PriceTag cost={{ coins: MYSTERY_PRICE }} dim={p.money.coins < MYSTERY_PRICE} />
        </Pressable>

        <View style={styles.row}>
          <Image source={ICONS.ticket} style={{ width: 44, height: 44 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t('adMoney.title')}</Text>
            <Text style={styles.rowSub}>{t('adMoney.left', { n: p.adLeft, max: AD_MONEY.perDay })}</Text>
          </View>
          <View style={{ gap: 6 }}>
            {(['tickets', 'coins'] as const).map((k) => (
              <Pressable
                key={k}
                disabled={!p.adLeft || !p.adAvailable || adBusy}
                onPress={async () => {
                  setAdBusy(true);
                  await p.onAdMoney(k);
                  setAdBusy(false);
                }}
                style={[styles.adBtn, (!p.adLeft || !p.adAvailable) && { opacity: 0.4 }]}
              >
                <Text style={styles.adText}>▶ +{k === 'tickets' ? AD_MONEY.tickets : AD_MONEY.coins}</Text>
                <Image source={ICONS[k === 'tickets' ? 'ticket' : 'coin']} style={{ width: 16, height: 16 }} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Sheet visible={!!odds} onClose={() => setOdds(null)}>
        {odds && <OddsSheet kind={odds} />}
      </Sheet>
      {open && <ChestOpen look={open.look} title={open.title} reward={open.reward} onClose={() => setOpen(null)} />}
    </View>
  );
}

function OddsSheet({ kind }: { kind: ChestKind }) {
  const o = chestOdds(kind);
  const line = (label: string, pct: number, color?: string) => (
    <View key={label} style={styles.oddRow}>
      <Text style={[styles.oddLabel, color ? { color } : null]}>{label}</Text>
      <Text style={styles.oddPct}>%{pct}</Text>
    </View>
  );
  return (
    <>
      <Image source={ICONS[CHEST_IMG[kind]]} style={{ width: 72, height: 72 }} />
      <Text style={styles.sheetTitle}>{t(`chest.${kind}` as Key)}</Text>
      <View style={{ alignSelf: 'stretch', gap: 4, marginTop: 8 }}>
        {line(t('money.coins'), o.coins)}
        {line(t('chest.boosters'), o.boosters)}
        {line(t('money.gems'), o.gems)}
        {line(t('chest.item'), o.item)}
        {o.item > 0 &&
          RARITIES.filter((r) => o.rarity[r] > 0).map((r) => line(`   ${t(`garage.tier.${r}` as Key)}`, Math.round((o.item * o.rarity[r]) / 100), TIER_COLOR[r]))}
      </View>
      <Text style={[styles.rowSub, { textAlign: 'center', marginTop: 8 }]}>{t('chest.dupNote')}</Text>
    </>
  );
}

function Wheel(p: { free: boolean; tickets: number; onSpin(): number | null; onNeed(): void; onReward(r: Reward): void }) {
  const rot = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const turns = useRef(0);
  const go = () => {
    if (spinning) return;
    if (!p.free && p.tickets < 1) return p.onNeed();
    const i = p.onSpin();
    if (i === null) return;
    setSpinning(true);
    // Dilim i'nin ortası (saat 3'ten saat yönünde i*45+22.5) okun altına (270°) gelsin
    const land = (270 - (i * 45 + 22.5) + 360) % 360;
    turns.current += 5;
    const to = turns.current * 360 + land;
    Animated.timing(rot, { toValue: to, duration: 3200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      setSpinning(false);
      p.onReward(WHEEL[i].reward);
    });
  };
  const rotate = rot.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  return (
    <View style={styles.wheelCard}>
      <View style={styles.wheelBox}>
        <Animated.Image source={ICONS.wheel} style={[styles.wheelImg, { transform: [{ rotate }] }]} />
        <View style={styles.pointer} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.rowTitle}>{t('wheel.title')}</Text>
        <View style={styles.legend}>
          {WHEEL.map((w) => (
            <View key={w.id} style={styles.legendItem}>
              <View style={[styles.dotC, { backgroundColor: w.color }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {t(`wheel.${w.id}` as Key)} · %{w.weight}
              </Text>
            </View>
          ))}
        </View>
        <Pressable onPress={go} disabled={spinning} style={({ pressed }) => [styles.spinBtn, !p.free && { backgroundColor: '#2A4166' }, (pressed || spinning) && { opacity: 0.8 }]}>
          <Text style={[styles.spinText, !p.free && { color: UI.text }]}>{p.free ? t('wheel.free') : t('wheel.spin')}</Text>
          {!p.free && <Image source={ICONS.ticket} style={{ width: 18, height: 18 }} />}
          {!p.free && <Text style={styles.spinText2}>1</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export function GemsPage(p: {
  money: Money3;
  now: number;
  starter: boolean;
  boosts: { infiniteLivesUntil: number; coinX2Until: number };
  shields: number;
  onIap(key: keyof typeof PRODUCTS): void;
  onGem(kind: 'infiniteLives' | 'coinX2' | 'shield' | 'trade'): boolean;
}) {
  const packs = Object.keys(GEM_PACKS) as (keyof typeof GEM_PACKS)[];
  const gemBtn = (cost: number, onPress: () => void, disabled?: boolean) => (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.8 }, disabled && { opacity: 0.4 }]}>
      <PriceTag cost={{ gems: cost }} dim={p.money.gems < cost} />
    </Pressable>
  );
  const left = (until: number) => (until > p.now ? ` · ${fmtMs(until - p.now)}` : '');
  return (
    <ScrollView contentContainerStyle={styles.root}>
      {p.starter && (
        <Pressable onPress={() => p.onIap('starter')} style={[styles.row, { borderColor: UI.gold, borderWidth: 2 }]}>
          <Image source={ICONS.gem} style={{ width: 44, height: 44 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t('shop.starter')}</Text>
            <Text style={styles.rowSub}>
              {t('gems.starterSub', { g: STARTER_PACK.gems, c: num(STARTER_PACK.coins), k: STARTER_PACK.tickets })}
            </Text>
          </View>
          <View style={styles.iap}>
            <Text style={styles.iapText}>{priceFor(PRODUCTS.starter.id, PRODUCTS.starter.usd)}</Text>
          </View>
        </Pressable>
      )}
      <View style={styles.packs}>
        {packs.map((k, i) => (
          <Pressable key={k} onPress={() => p.onIap(k)} style={({ pressed }) => [styles.pack, i === 2 && { borderColor: '#4FA3FF', borderWidth: 2 }, pressed && { opacity: 0.85 }]}>
            {i === 2 && <Text style={[styles.best, { backgroundColor: '#3A86FF' }]}>{t('gems.popular')}</Text>}
            <Image source={ICONS.gem} style={{ width: 34 + i * 6, height: 34 + i * 6 }} />
            <Text style={styles.packN}>{num(GEM_PACKS[k])}</Text>
            <View style={[styles.iap, { alignSelf: 'stretch' }]}>
              <Text style={styles.iapText}>{priceFor(PRODUCTS[k].id, PRODUCTS[k].usd)}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={styles.h3}>{t('gems.spend')}</Text>
      <View style={styles.list}>
        <View style={styles.item}>
          <Image source={ICONS.infinite} style={styles.itemIcon} />
          <Text style={styles.itemText}>
            {t('gems.infinite', { m: BOOST_MS.infiniteLives / 60000 })}
            <Text style={styles.live}>{left(p.boosts.infiniteLivesUntil)}</Text>
          </Text>
          {gemBtn(GEM_COST.infiniteLives, () => p.onGem('infiniteLives'))}
        </View>
        <View style={styles.item}>
          <Image source={ICONS.x2} style={styles.itemIcon} />
          <Text style={styles.itemText}>
            {t('gems.x2', { m: BOOST_MS.coinX2 / 60000 })}
            <Text style={styles.live}>{left(p.boosts.coinX2Until)}</Text>
          </Text>
          {gemBtn(GEM_COST.coinX2, () => p.onGem('coinX2'))}
        </View>
        <View style={styles.item}>
          <Image source={ICONS.shield} style={styles.itemIcon} />
          <Text style={styles.itemText}>{t('gems.shield', { n: p.shields, max: SHIELD_MAX })}</Text>
          {gemBtn(GEM_COST.shield, () => p.onGem('shield'), p.shields >= SHIELD_MAX)}
        </View>
      </View>

      <View style={[styles.row, { backgroundColor: UI.bg2 }]}>
        <PriceTag cost={{ gems: TRADE.gems }} />
        <Text style={styles.arrow}>→</Text>
        <PriceTag cost={{ coins: TRADE.coins }} />
        <Text style={[styles.rowSub, { flex: 1, textAlign: 'right' }]}>{t('gems.tradeNote')}</Text>
        <Pressable disabled={p.money.gems < TRADE.gems} onPress={() => p.onGem('trade')} style={[styles.adBtn, p.money.gems < TRADE.gems && { opacity: 0.4 }]}>
          <Text style={styles.adText}>{t('gems.trade')}</Text>
        </Pressable>
      </View>
      <Text style={[styles.rowSub, { textAlign: 'center' }]}>{t('gems.rule')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 12, paddingBottom: 30 },
  chests: { flexDirection: 'row', gap: 8 },
  chest: { flex: 1, backgroundColor: UI.panel, borderRadius: 18, borderWidth: 2, padding: 8, alignItems: 'center', gap: 4 },
  best: { position: 'absolute', top: -10, backgroundColor: UI.danger, color: '#fff', borderRadius: 8, paddingHorizontal: 8, fontSize: 11, fontWeight: '900', overflow: 'hidden', zIndex: 2 },
  chestImg: { width: 64, height: 64 },
  chestName: { fontSize: 16, fontWeight: '900' },
  chestSub: { color: UI.dim, fontSize: 11, fontWeight: '700', textAlign: 'center', minHeight: 28 },
  oddsLink: { color: UI.dim, fontSize: 11, textDecorationLine: 'underline', marginTop: 2 },
  tag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: UI.gold, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  tagText: { color: UI.bg, fontWeight: '900', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: UI.panel, borderRadius: 18, padding: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2A2440', alignItems: 'center', justifyContent: 'center' },
  q: { color: '#C9B8F0', fontSize: 26, fontWeight: '900' },
  rowTitle: { color: UI.text, fontSize: 16, fontWeight: '900' },
  rowSub: { color: UI.dim, fontSize: 12, fontWeight: '700' },
  adBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: UI.accent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  adText: { color: UI.bg, fontWeight: '900', fontSize: 13 },
  oddRow: { flexDirection: 'row', justifyContent: 'space-between' },
  oddLabel: { color: UI.text, fontSize: 15, fontWeight: '800' },
  oddPct: { color: UI.dim, fontSize: 15, fontWeight: '900' },
  sheetTitle: { color: UI.text, fontSize: 22, fontWeight: '900' },
  wheelCard: { flexDirection: 'row', gap: 12, backgroundColor: UI.panel, borderRadius: 20, padding: 12, alignItems: 'center' },
  wheelBox: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  wheelImg: { width: 130, height: 130 },
  pointer: { position: 'absolute', top: -4, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 18, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 },
  legendItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 4 },
  dotC: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: UI.dim, fontSize: 10, fontWeight: '700', flexShrink: 1 },
  spinBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3BCE7A', borderRadius: 12, paddingVertical: 9 },
  spinText: { color: '#08240F', fontWeight: '900', fontSize: 15 },
  spinText2: { color: UI.text, fontWeight: '900', fontSize: 15 },
  packs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pack: { width: '48.5%', backgroundColor: UI.panel, borderRadius: 18, padding: 10, alignItems: 'center', gap: 4 },
  packN: { color: '#9FD0FF', fontSize: 22, fontWeight: '900' },
  iap: { backgroundColor: UI.accent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center' },
  iapText: { color: UI.bg, fontWeight: '900' },
  h3: { color: UI.dim, fontSize: 14, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  list: { backgroundColor: UI.panel, borderRadius: 18, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#26395A' },
  itemIcon: { width: 32, height: 32 },
  itemText: { flex: 1, color: UI.text, fontWeight: '800', fontSize: 14 },
  live: { color: '#8FF0B4', fontWeight: '900' },
  arrow: { color: UI.dim, fontSize: 20, fontWeight: '900' },
});
