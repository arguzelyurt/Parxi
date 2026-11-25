import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BuyResult,
  collectionCount,
  dailyDeals,
  Deal,
  Gift,
  giftFor,
  giftStreakFor,
  GiftState,
  canClaimGift,
  isEquipped,
  itemDesc,
  ItemKind,
  itemName,
  itemsOf,
  keyOf,
  MarketItem,
  msToNextDay,
  MYSTERY_PRICE,
  mysteryOdds,
  mysteryPool,
  ownsItem,
  priceFor,
  RARITIES,
  Rarity,
  Wallet,
} from '../core/market';
import { carByKey } from '../core/garage';
import { boosterName, Booster } from '../core/monetization';
import { Key, num, t } from '../i18n';
import { COLORS, UI } from '../game/palette';
import { carStyleFor, riderFor, stopFor, themeFor } from '../game/skins';
import { track } from '../services/analytics';
import { DockVehicle, PersonView, SkinCtx, VehicleView } from './GameScreen';
import { StopBand, WinFx } from './Cosmetics';
import CarArt from './CarArt';
import { TIER_COLOR } from './GarageScreen';
import { useLayout } from './layout';
import { Btn, TabHeader } from './kit';
import Sheet from './Sheet';

interface Props {
  wallet: Wallet;
  gift: GiftState;
  today: string;
  /** Satın al (günün fırsatı fiyatıyla); sonucu döner */
  onBuy(id: string): BuyResult;
  onEquip(id: string): void;
  onGift(): Gift | null;
  onMystery(): { item: MarketItem; setBonus: number } | null;
  /** Coin yetmeyince gerçek para dükkanı */
  onOpenShop(): void;
}

type Cat = Exclude<ItemKind, never>;
const CATS: { kind: Cat; icon: string }[] = [
  { kind: 'booster', icon: '⚡' },
  { kind: 'garage', icon: '🚙' },
  { kind: 'car', icon: '🎨' },
  { kind: 'rider', icon: '🧍' },
  { kind: 'theme', icon: '🌆' },
  { kind: 'stop', icon: '🚏' },
  { kind: 'fx', icon: '🎆' },
];
const catTitle = (k: Cat) => (k === 'car' ? t('market.cat.car') : t(`market.tab.${k}` as Key));
const BOOSTERS: Booster[] = ['undo', 'hint', 'crane', 'extraSlot'];
const BOOSTER_ICON: Record<string, string> = { undo: '↶', hint: '💡', crane: '🏗', extraSlot: '＋' };
const ITEM_ICON: Partial<Record<string, string>> = {
  'rider:klasik': '🧍',
  'rider:sapka': '🎩',
  'rider:korsan': '🏴‍☠️',
  'rider:kedi': '🐱',
  'rider:kopek': '🐶',
  'rider:robot': '🤖',
  'rider:astronot': '🧑‍🚀',
  'rider:uzayli': '👽',
  'fx:sade': '✨',
  'fx:konfeti': '🎊',
  'fx:balon': '🎈',
  'fx:yildiz': '🌟',
  'fx:havai': '🎆',
};
const PREVIEW_COLORS = [5, 2, 0, 3];

const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const giftText = (g: Gift) =>
  [`● ${g.coins}`, ...Object.entries(g.boosters ?? {}).map(([k, v]) => `${BOOSTER_ICON[k]} ${v}`)].join('  ');

export default function MarketScreen(props: Props) {
  const { wallet, today } = props;
  const [cat, setCat] = useState<Cat | null>(null);
  const [now, setNow] = useState(Date.now());
  const [boxOpen, setBoxOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; sub?: string; item?: MarketItem } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    track({ name: 'market_view', category: cat ?? 'home' });
  }, [cat]);

  const deals = useMemo(() => dailyDeals(today, wallet), [today, wallet]);

  const buy = (item: MarketItem) => {
    const price = priceFor(wallet, item, today);
    if (wallet.coins < price) return props.onOpenShop();
    const r = props.onBuy(item.id);
    if (!r.ok) return;
    track({ name: 'item_buy', item: item.id, price, deal: price !== item.price });
    if (r.setBonus) setToast({ title: t('market.setBonus', { n: r.setBonus }), item });
    else if (item.kind === 'garage') setToast({ title: t('market.inGarage'), item });
  };

  const header = (
    <TabHeader title={cat ? catTitle(cat) : t('market.title')} coins={wallet.coins} onCoins={props.onOpenShop} />
  );

  return (
    <View style={{ flex: 1 }}>
      {cat ? (
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => setCat(null)} hitSlop={12} style={styles.back}>
            <Text style={styles.backText}>‹ {t('market.title')}</Text>
          </Pressable>
          {header}
          <CategoryView kind={cat} wallet={wallet} today={today} onBuy={buy} onEquip={props.onEquip} />
        </View>
      ) : (
        <>
          {header}
          <ScrollView contentContainerStyle={styles.home}>
            <GiftBanner
              gift={props.gift}
              today={today}
              onClaim={() => {
                const g = props.onGift();
                if (g) {
                  track({ name: 'daily_gift', streak: giftStreakFor(props.gift, today) });
                  setToast({ title: t('market.giftGot', { what: giftText(g) }) });
                }
              }}
            />

            <View style={styles.rowHead}>
              <Text style={styles.h2}>{t('market.deals')}</Text>
              <Text style={styles.timer}>⏳ {fmtTime(msToNextDay(now))}</Text>
            </View>
            <View style={styles.deals}>
              {deals.map((d) => (
                <DealCard key={d.item.id} d={d} affordable={wallet.coins >= d.price} onPress={() => buy(d.item)} />
              ))}
            </View>

            <Text style={styles.h2}>{t('market.categories')}</Text>
            <View style={styles.cats}>
              {CATS.map((c) => {
                const cnt = collectionCount(wallet, c.kind);
                const fresh = itemsOf(c.kind).some((m) => m.isNew && !ownsItem(wallet, m));
                return (
                  <Pressable key={c.kind} onPress={() => setCat(c.kind)} style={({ pressed }) => [styles.cat, pressed && { opacity: 0.8 }]}>
                    {fresh && <Text style={styles.newBadge}>{t('market.new')}</Text>}
                    <Text style={styles.catIcon}>{c.icon}</Text>
                    <Text style={styles.catName} numberOfLines={1}>
                      {catTitle(c.kind)}
                    </Text>
                    <Text style={styles.catCount}>
                      {c.kind === 'booster' ? t('market.packs', { n: cnt.total }) : `${cnt.owned}/${cnt.total}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setBoxOpen(true)} style={({ pressed }) => [styles.box, pressed && { opacity: 0.85 }]}>
              <Text style={{ fontSize: 44 }}>📦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.boxTitle}>{t('market.box')}</Text>
                <Text style={styles.boxSub}>{t('market.boxSub')}</Text>
              </View>
              <View style={styles.priceTag}>
                <Text style={styles.priceTagText}>● {num(MYSTERY_PRICE)}</Text>
              </View>
            </Pressable>
          </ScrollView>
        </>
      )}

      <Sheet visible={boxOpen} onClose={() => setBoxOpen(false)}>
        <MysterySheet
          wallet={wallet}
          onOpen={() => {
            if (wallet.coins < MYSTERY_PRICE) return props.onOpenShop();
            const r = props.onMystery();
            setBoxOpen(false);
            if (r) {
              track({ name: 'mystery_box', item: r.item.id });
              setToast({
                title: t('market.boxGot'),
                sub: r.setBonus ? t('market.setBonus', { n: r.setBonus }) : undefined,
                item: r.item,
              });
            }
          }}
        />
      </Sheet>

      <Sheet visible={!!toast} onClose={() => setToast(null)}>
        {toast && (
          <>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            {toast.item && (
              <>
                <View style={{ height: 110, justifyContent: 'center', marginVertical: 8 }}>
                  <ItemThumb item={toast.item} size={1.6} />
                </View>
                <Text style={[styles.rarity, { color: TIER_COLOR[toast.item.rarity] }]}>{t(`garage.tier.${toast.item.rarity}` as Key)}</Text>
                <Text style={styles.toastItem}>{itemName(toast.item)}</Text>
              </>
            )}
            {toast.sub && <Text style={[styles.boxSub, { marginTop: 6 }]}>{toast.sub}</Text>}
            <View style={{ height: 10 }} />
            <Btn label={t('market.ok')} primary onPress={() => setToast(null)} />
          </>
        )}
      </Sheet>
    </View>
  );
}

function GiftBanner({ gift, today, onClaim }: { gift: GiftState; today: string; onClaim(): void }) {
  const can = canClaimGift(gift, today);
  const streak = giftStreakFor(gift, today);
  const g = giftFor(streak);
  return (
    <Pressable disabled={!can} onPress={onClaim} style={[styles.gift, !can && styles.giftDone]}>
      <Text style={{ fontSize: 40 }}>🎁</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.giftTitle, !can && { color: UI.text }]}>{t('market.gift')}</Text>
        <Text style={[styles.giftSub, !can && { color: UI.dim }]}>
          {can ? `${t('market.giftSub', { n: streak })} · ${giftText(g)}` : t('market.giftDone')}
        </Text>
      </View>
      {can && (
        <View style={styles.giftBtn}>
          <Text style={styles.giftBtnText}>{t('market.giftTake')}</Text>
        </View>
      )}
    </Pressable>
  );
}

function DealCard({ d, affordable, onPress }: { d: Deal; affordable: boolean; onPress(): void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.deal, { borderColor: TIER_COLOR[d.item.rarity] }, pressed && { opacity: 0.85 }]}>
      <Text style={styles.pct}>-{d.pct}%</Text>
      <View style={{ height: 52, justifyContent: 'center' }}>
        <ItemThumb item={d.item} size={0.8} />
      </View>
      <Text style={styles.dealName} numberOfLines={2}>
        {itemName(d.item)}
      </Text>
      <Text style={styles.oldPrice}>{num(d.item.price)}</Text>
      <Text style={[styles.dealPrice, !affordable && { color: UI.dim }]}>● {num(d.price)}</Text>
    </Pressable>
  );
}

function MysterySheet({ wallet, onOpen }: { wallet: Wallet; onOpen(): void }) {
  const odds = mysteryOdds(wallet);
  const empty = mysteryPool(wallet).length === 0;
  return (
    <>
      <Text style={{ fontSize: 56 }}>📦</Text>
      <Text style={styles.toastTitle}>{t('market.box')}</Text>
      <Text style={[styles.boxSub, { textAlign: 'center' }]}>{empty ? t('market.boxEmpty') : t('market.boxSub')}</Text>
      {!empty && (
        <>
          <Text style={[styles.h3, { marginTop: 14 }]}>{t('market.boxOdds')}</Text>
          <View style={styles.odds}>
            {RARITIES.map((r) => (
              <View key={r} style={styles.oddRow}>
                <Text style={[styles.rarity, { color: TIER_COLOR[r], flex: 1 }]}>{t(`garage.tier.${r}` as Key)}</Text>
                <Text style={styles.oddPct}>%{odds[r]}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 8 }} />
          <Btn label={t('market.boxOpen', { n: num(MYSTERY_PRICE) })} gold onPress={onOpen} />
        </>
      )}
    </>
  );
}

// ---------- Kategori ekranı: önizleme + ızgara ----------

function CategoryView(p: { kind: Cat; wallet: Wallet; today: string; onBuy(m: MarketItem): void; onEquip(id: string): void }) {
  const { kind, wallet, today } = p;
  const items = itemsOf(kind);
  const { width, tablet } = useLayout();
  const startId = items.find((m) => isEquipped(wallet, m))?.id ?? items.find((m) => !ownsItem(wallet, m))?.id ?? items[0].id;
  const [sel, setSel] = useState(startId);
  const item = items.find((m) => m.id === sel) ?? items[0];
  const cols = tablet ? 4 : 3;
  const tile = Math.floor((width - 24 * 2 - 10 * (cols - 1)) / cols);

  if (kind === 'booster') return <BoosterList wallet={wallet} today={today} onBuy={p.onBuy} />;

  const owned = ownsItem(wallet, item);
  const equipped = isEquipped(wallet, item);
  const price = priceFor(wallet, item, today);
  const affordable = wallet.coins >= price;

  return (
    <ScrollView contentContainerStyle={styles.catRoot}>
      <View style={styles.previewBox}>
        <View style={styles.rowHead}>
          <Text style={styles.previewLabel}>{t('market.preview')}</Text>
          {kind === 'car' && <Text style={styles.previewLabel}>{t('market.colorNote')}</Text>}
        </View>
        <BigPreview item={item} width={width - 48 - 28} />
        <View style={styles.previewFoot}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rarity, { color: TIER_COLOR[item.rarity] }]}>{t(`garage.tier.${item.rarity}` as Key)}</Text>
            <Text style={styles.previewName}>{itemName(item)}</Text>
          </View>
          {equipped ? (
            <Text style={styles.using}>✓ {t('market.using')}</Text>
          ) : owned ? (
            kind === 'garage' ? (
              <Text style={styles.using}>✓ {t('market.owned')}</Text>
            ) : (
              <Pressable onPress={() => p.onEquip(item.id)} style={[styles.actBtn, { backgroundColor: UI.accent }]}>
                <Text style={styles.actText}>{t('market.use')}</Text>
              </Pressable>
            )
          ) : (
            <Pressable onPress={() => p.onBuy(item)} style={[styles.actBtn, !affordable && { backgroundColor: UI.panelHi }]}>
              {price !== item.price && <Text style={styles.oldPriceSmall}>{num(item.price)}</Text>}
              <Text style={[styles.actText, !affordable && { color: UI.dim }]}>● {num(price)}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.grid}>
        {items.map((m) => {
          const o = ownsItem(wallet, m);
          const eq = isEquipped(wallet, m);
          const pr = priceFor(wallet, m, today);
          const on = m.id === sel;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                setSel(m.id);
                track({ name: 'item_preview', item: m.id });
              }}
              style={[
                styles.tile,
                { width: tile, borderColor: on ? UI.text : m.rarity === 'common' ? 'transparent' : TIER_COLOR[m.rarity] },
              ]}
            >
              {m.isNew && !o && <Text style={styles.newBadge}>{t('market.new')}</Text>}
              {pr !== m.price && !o && <Text style={styles.dealBadge}>%</Text>}
              <View style={{ height: tile * 0.52, justifyContent: 'center' }}>
                <ItemThumb item={m} size={tile / 110} />
              </View>
              <Text style={styles.tileName} numberOfLines={1}>
                {itemName(m)}
              </Text>
              <Text style={[styles.tilePrice, (o || eq) && { color: UI.accent }]}>
                {eq ? `✓ ${t('market.using')}` : o ? `✓ ${t('market.owned')}` : `● ${num(pr)}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function BoosterList({ wallet, today, onBuy }: { wallet: Wallet; today: string; onBuy(m: MarketItem): void }) {
  return (
    <ScrollView contentContainerStyle={styles.catRoot}>
      <Text style={styles.h3}>{t('market.inventory')}</Text>
      <View style={styles.inventory}>
        {BOOSTERS.map((k) => (
          <View key={k} style={styles.invItem}>
            <Text style={styles.invIcon}>{BOOSTER_ICON[k]}</Text>
            <Text style={styles.invCount}>{wallet.boosters[k]}</Text>
            <Text style={styles.invName}>{boosterName(k)}</Text>
          </View>
        ))}
      </View>
      {itemsOf('booster').map((m) => {
        const price = priceFor(wallet, m, today);
        const affordable = wallet.coins >= price;
        return (
          <View key={m.id} style={[styles.row, m.best && { borderColor: UI.gold }]}>
            {m.best && <Text style={styles.bestBadge}>{t('market.best')}</Text>}
            <Text style={styles.rowIcon}>{m.booster ? BOOSTER_ICON[m.booster.kind] : m.best ? '💎' : '🎁'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{itemName(m)}</Text>
              {itemDesc(m) && <Text style={styles.rowDesc}>{itemDesc(m)}</Text>}
            </View>
            <Pressable onPress={() => onBuy(m)} style={[styles.actBtn, !affordable && { backgroundColor: UI.panelHi }]}>
              {price !== m.price && <Text style={styles.oldPriceSmall}>{num(m.price)}</Text>}
              <Text style={[styles.actText, !affordable && { color: UI.dim }]}>● {num(price)}</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const fakeVehicle = (kind: 'car' | 'bus' | 'truck', color: number) => ({ id: 0, kind, color, x: 0, y: 0, dir: 'right' as const });

/** Izgara ve fırsat kartındaki küçük görsel */
function ItemThumb({ item, size }: { item: MarketItem; size: number }) {
  const k = keyOf(item.id);
  switch (item.kind) {
    case 'car':
      return <VehicleView v={{ kind: 'car', color: PREVIEW_COLORS[(k.length + 1) % 4], dir: 'right' }} length={70 * size} thickness={35 * size} style={k} />;
    case 'garage':
      return <CarArt model={carByKey(k)} width={92 * size} />;
    case 'theme': {
      const th = themeFor(item.id);
      return (
        <View style={[styles.miniRail, { width: 76 * size, height: 50 * size, backgroundColor: th.rail, borderColor: th.railEdge }]}>
          <View style={[styles.miniBoard, { backgroundColor: th.board }]}>
            {[0, 2, 3, 5].map((c) => (
              <View key={c} style={{ width: 14 * size, height: 7 * size, borderRadius: 2, backgroundColor: COLORS[c] }} />
            ))}
          </View>
        </View>
      );
    }
    case 'stop': {
      const st = stopFor(item.id);
      return (
        <View style={[styles.miniRail, { width: 76 * size, height: 50 * size, backgroundColor: st.rail ?? UI.rail, borderColor: st.railEdge ?? UI.railEdge, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 24 * size }}>{st.sign}</Text>
        </View>
      );
    }
    case 'rider':
      return (
        <SkinCtx.Provider value={{ car: 'klasik', rider: riderFor(item.id), colorBlind: false }}>
          <PersonView color={PREVIEW_COLORS[k.length % 4]} size={46 * size} front />
        </SkinCtx.Provider>
      );
    case 'fx':
      return <Text style={{ fontSize: 34 * size }}>{ITEM_ICON[item.id] ?? '✨'}</Text>;
    default:
      return <Text style={{ fontSize: 30 * size }}>{item.booster ? BOOSTER_ICON[item.booster.kind] : '🎁'}</Text>;
  }
}

/** Üstteki büyük önizleme: ürünün oyunda nasıl görüneceği */
function BigPreview({ item, width }: { item: MarketItem; width: number }) {
  const k = keyOf(item.id);
  const h = 130;
  switch (item.kind) {
    case 'car':
      return (
        <SkinCtx.Provider value={{ car: carStyleFor(item.id), rider: 'klasik', colorBlind: false }}>
          <View style={[styles.previewArea, { height: h }]}>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {PREVIEW_COLORS.slice(0, 2).map((c) => (
                  <VehicleView key={c} v={{ kind: 'car', color: c, dir: 'right' }} length={72} thickness={36} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <VehicleView v={{ kind: 'bus', color: PREVIEW_COLORS[2], dir: 'right' }} length={96} thickness={32} />
                <VehicleView v={{ kind: 'car', color: PREVIEW_COLORS[3], dir: 'right' }} length={56} thickness={28} />
              </View>
            </View>
            <DockVehicle p={{ v: fakeVehicle('car', 7), filled: 3 }} length={96} still />
          </View>
        </SkinCtx.Provider>
      );
    case 'rider':
      return (
        <SkinCtx.Provider value={{ car: 'klasik', rider: riderFor(item.id), colorBlind: false }}>
          <View style={[styles.previewArea, { height: h }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              {PREVIEW_COLORS.map((c, i) => (
                <PersonView key={c} color={c} size={i === 0 ? 62 : 48} front={i === 0} />
              ))}
            </View>
            <DockVehicle p={{ v: fakeVehicle('car', 5), filled: 4 }} length={100} still />
          </View>
        </SkinCtx.Provider>
      );
    case 'theme': {
      const th = themeFor(item.id);
      return (
        <View style={[styles.previewArea, { height: h, backgroundColor: th.bg, borderRadius: 14 }]}>
          <View style={{ flex: 1, height: h - 20, borderRadius: 12, borderWidth: 3, borderColor: th.railEdge, backgroundColor: th.rail, padding: 8 }}>
            <View style={{ flex: 1, backgroundColor: th.board, borderRadius: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8, alignContent: 'center' }}>
              {[0, 2, 3, 5, 6, 1, 4].map((c, i) => (
                <VehicleView key={c} v={{ kind: i % 3 === 1 ? 'bus' : 'car', color: c, dir: 'right' }} length={i % 3 === 1 ? 66 : 44} thickness={22} />
              ))}
            </View>
          </View>
        </View>
      );
    }
    case 'stop': {
      const st = stopFor(item.id);
      return (
        <View style={[styles.previewArea, { height: h, flexDirection: 'column', justifyContent: 'center' }]}>
          <View style={{ width: '100%', borderRadius: 16, borderWidth: 2, overflow: 'hidden', backgroundColor: st.rail ?? UI.rail, borderColor: st.railEdge ?? UI.railEdge, paddingHorizontal: 12, paddingBottom: 10 }}>
            {st.band && <StopBand colors={st.band} />}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingTop: 10 }}>
              <Text style={{ fontSize: 30 }}>{st.sign}</Text>
              {PREVIEW_COLORS.map((c, i) => (
                <PersonView key={c} color={c} size={i === 0 ? 46 : 36} front={i === 0} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ flex: 1, height: 26, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: st.railEdge ?? UI.accent, opacity: 0.7 }} />
              ))}
            </View>
          </View>
        </View>
      );
    }
    case 'fx':
      return (
        <View style={[styles.previewArea, { height: h, overflow: 'hidden', backgroundColor: UI.bg, borderRadius: 14, justifyContent: 'center' }]}>
          <Text style={{ color: UI.gold, fontSize: 34, fontWeight: '900' }}>★ ★ ★</Text>
          <WinFx key={item.id} kind={k} width={width} height={h} />
        </View>
      );
    case 'garage':
      return (
        <View style={[styles.previewArea, { height: h + 20, justifyContent: 'center' }]}>
          <CarArt model={carByKey(k)} width={Math.min(300, width)} />
        </View>
      );
    default:
      return null;
  }
}

export const RARITY_ORDER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legend: 3 };

const styles = StyleSheet.create({
  home: { paddingHorizontal: 24, paddingBottom: 28, gap: 12 },
  back: { paddingHorizontal: 24, paddingTop: 10 },
  backText: { color: UI.accent, fontSize: 16, fontWeight: '800' },
  h2: { color: UI.text, fontSize: 20, fontWeight: '900', marginTop: 6 },
  h3: { color: UI.dim, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { color: UI.gold, fontSize: 15, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] },

  gift: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: UI.gold, borderRadius: 20, padding: 14 },
  giftDone: { backgroundColor: UI.panel },
  giftTitle: { color: UI.bg, fontSize: 20, fontWeight: '900' },
  giftSub: { color: '#3B2A10', fontSize: 14, fontWeight: '700', marginTop: 2 },
  giftBtn: { backgroundColor: UI.bg, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10 },
  giftBtnText: { color: UI.gold, fontSize: 17, fontWeight: '900' },

  deals: { flexDirection: 'row', gap: 10 },
  deal: { flex: 1, backgroundColor: UI.panel, borderRadius: 16, borderWidth: 2, alignItems: 'center', padding: 8, paddingTop: 14 },
  pct: { position: 'absolute', top: -10, right: -4, backgroundColor: UI.danger, color: '#fff', fontWeight: '900', fontSize: 13, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  dealName: { color: UI.text, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 4, minHeight: 32 },
  oldPrice: { color: UI.dim, fontSize: 12, textDecorationLine: 'line-through', marginTop: 2 },
  dealPrice: { color: UI.gold, fontSize: 17, fontWeight: '900' },

  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cat: { width: '31%', flexGrow: 1, backgroundColor: UI.panel, borderRadius: 16, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  catIcon: { fontSize: 32 },
  catName: { color: UI.text, fontSize: 14, fontWeight: '800', marginTop: 6 },
  catCount: { color: UI.dim, fontSize: 13, fontWeight: '700', marginTop: 2 },
  newBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: UI.accent, color: UI.bg, fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden', zIndex: 2 },
  dealBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: UI.danger, color: '#fff', fontSize: 11, fontWeight: '900', paddingHorizontal: 6, borderRadius: 6, overflow: 'hidden', zIndex: 2 },

  box: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: UI.gold, padding: 14, marginTop: 4 },
  boxTitle: { color: UI.text, fontSize: 19, fontWeight: '900' },
  boxSub: { color: UI.dim, fontSize: 14, marginTop: 2 },
  priceTag: { backgroundColor: UI.gold, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  priceTagText: { color: UI.bg, fontSize: 16, fontWeight: '900' },
  odds: { alignSelf: 'stretch', backgroundColor: UI.bg2, borderRadius: 14, padding: 12, gap: 6, marginTop: 6 },
  oddRow: { flexDirection: 'row', alignItems: 'center' },
  oddPct: { color: UI.text, fontSize: 15, fontWeight: '800' },

  toastTitle: { color: UI.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  toastItem: { color: UI.text, fontSize: 20, fontWeight: '800' },
  rarity: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  catRoot: { paddingHorizontal: 24, paddingBottom: 28, gap: 12 },
  previewBox: { backgroundColor: UI.panel, borderRadius: 20, padding: 14, gap: 8 },
  previewLabel: { color: UI.dim, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  previewArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 10 },
  previewFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewName: { color: UI.text, fontSize: 20, fontWeight: '900' },
  using: { color: UI.accent, fontSize: 16, fontWeight: '900' },
  actBtn: { backgroundColor: UI.gold, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', minWidth: 96 },
  actText: { color: UI.bg, fontSize: 17, fontWeight: '900' },
  oldPriceSmall: { color: 'rgba(15,27,45,0.6)', fontSize: 11, textDecorationLine: 'line-through', fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { backgroundColor: UI.panel, borderRadius: 16, borderWidth: 2, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  tileName: { color: UI.text, fontSize: 13, fontWeight: '800', marginTop: 4 },
  tilePrice: { color: UI.gold, fontSize: 13, fontWeight: '900', marginTop: 2 },

  inventory: { flexDirection: 'row', backgroundColor: UI.panel, borderRadius: 16, padding: 12 },
  invItem: { flex: 1, alignItems: 'center' },
  invIcon: { fontSize: 20, color: UI.text },
  invCount: { color: UI.gold, fontSize: 20, fontWeight: '900' },
  invName: { color: UI.dim, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: UI.panel, borderRadius: 16, padding: 14, borderWidth: 2, borderColor: 'transparent' },
  bestBadge: { position: 'absolute', top: -9, left: 14, backgroundColor: UI.gold, color: UI.bg, fontSize: 10, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  rowIcon: { fontSize: 28, color: UI.text, width: 36, textAlign: 'center' },
  rowName: { color: UI.text, fontSize: 18, fontWeight: '800' },
  rowDesc: { color: UI.dim, fontSize: 12, marginTop: 2 },

  miniRail: { borderRadius: 10, borderWidth: 2, padding: 6 },
  miniBoard: { flex: 1, borderRadius: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 3, padding: 4 },
});
