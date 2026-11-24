import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isEquipped, itemDesc, ItemKind, itemName, MARKET, MarketItem, ownsItem, Wallet } from '../core/market';
import { boosterName, Booster } from '../core/monetization';
import { Key, t } from '../i18n';
import { COLORS, UI } from '../game/palette';
import { carStyleFor, themeFor } from '../game/skins';
import { VehicleView } from './GameScreen';
import { TabHeader } from './kit';

interface Props {
  wallet: Wallet;
  onBuy(id: string): void;
  onEquip(id: string): void;
  onExit?(): void;
  /** Coin yetmeyince gerçek para dükkanı */
  onOpenShop(): void;
}

const TABS: ItemKind[] = ['booster', 'theme', 'car'];
const BOOSTERS: Booster[] = ['undo', 'hint', 'crane', 'extraSlot'];

const SAMPLE = [0, 2, 3, 5, 7, 6];

export default function MarketScreen({ wallet, onBuy, onEquip, onOpenShop }: Props) {
  const [tab, setTab] = useState<ItemKind>('booster');
  const items = MARKET.filter((m) => m.kind === tab);

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={t('market.title')} coins={wallet.coins} onCoins={onOpenShop} />

      <View style={styles.tabs}>
        {TABS.map((kind) => (
          <Pressable
            key={kind}
            onPress={() => setTab(kind)}
            style={[styles.tab, tab === kind && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === kind && { color: UI.bg }]}>{t(`market.tab.${kind}` as Key)}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'booster' && (
          <View style={styles.inventory}>
            {BOOSTERS.map((k) => (
              <View key={k} style={styles.invItem}>
                <Text style={styles.invCount}>{wallet.boosters[k]}</Text>
                <Text style={styles.invName}>{boosterName(k)}</Text>
              </View>
            ))}
          </View>
        )}
        {items.map((item, i) => (
          <ItemRow
            key={item.id}
            item={item}
            index={i}
            wallet={wallet}
            onBuy={() => (wallet.coins >= item.price ? onBuy(item.id) : onOpenShop())}
            onEquip={() => onEquip(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ItemRow(props: { item: MarketItem; index: number; wallet: Wallet; onBuy(): void; onEquip(): void }) {
  const { item, wallet } = props;
  const owned = item.kind !== 'booster' && ownsItem(wallet, item);
  const equipped = isEquipped(wallet, item);
  const affordable = wallet.coins >= item.price;

  let action: React.ReactNode;
  if (equipped) action = <Text style={styles.using}>{t('market.using')}</Text>;
  else if (owned)
    action = (
      <Pressable onPress={props.onEquip} style={[styles.btn, styles.btnGhost]}>
        <Text style={[styles.btnText, { color: UI.text }]}>{t('market.use')}</Text>
      </Pressable>
    );
  else
    action = (
      <Pressable onPress={props.onBuy} style={[styles.btn, !affordable && styles.btnOff]}>
        <Text style={[styles.btnText, !affordable && { color: UI.dim }]}>● {item.price}</Text>
      </Pressable>
    );

  return (
    <View style={[styles.row, equipped && styles.rowOn]}>
      <View style={styles.preview}>
        <Preview item={item} index={props.index} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{itemName(item)}</Text>
        {item.desc && <Text style={styles.desc}>{itemDesc(item)}</Text>}
      </View>
      {action}
    </View>
  );
}

function Preview({ item, index }: { item: MarketItem; index: number }) {
  if (item.kind === 'theme') {
    const t = themeFor(item.id);
    return (
      <View style={[styles.miniRail, { backgroundColor: t.rail, borderColor: t.railEdge }]}>
        <View style={[styles.miniBoard, { backgroundColor: t.board }]}>
          {SAMPLE.slice(0, 3).map((c) => (
            <View key={c} style={{ width: 14, height: 7, borderRadius: 2, backgroundColor: COLORS[c] }} />
          ))}
        </View>
      </View>
    );
  }
  if (item.kind === 'car')
    return (
      <VehicleView
        v={{ kind: 'car', color: SAMPLE[index % SAMPLE.length], dir: 'right' }}
        length={60}
        thickness={28}
        style={carStyleFor(item.id)}
      />
    );
  const icon: Record<string, string> = { undo: '↶', hint: '💡', crane: '🏗', extraSlot: '＋' };
  return <Text style={styles.boosterIcon}>{item.booster ? icon[item.booster.kind] : '🎁'}</Text>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  back: { color: UI.text, fontSize: 34, fontWeight: '300', marginTop: -6 },
  title: { color: UI.text, fontSize: 24, fontWeight: '900' },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.panel,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coinText: { color: UI.gold, fontWeight: '800', fontSize: 15 },
  coinPlus: { color: UI.accent, fontWeight: '900', fontSize: 16 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 24, marginTop: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: UI.bg2, alignItems: 'center' },
  tabOn: { backgroundColor: UI.accent },
  tabText: { color: UI.text, fontWeight: '800', fontSize: 15 },
  list: { paddingHorizontal: 24, paddingVertical: 16, gap: 10 },
  inventory: { flexDirection: 'row', backgroundColor: UI.panel, borderRadius: 16, padding: 12, marginBottom: 4 },
  invItem: { flex: 1, alignItems: 'center' },
  invCount: { color: UI.gold, fontSize: 20, fontWeight: '900' },
  invName: { color: UI.dim, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: UI.panel,
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowOn: { borderColor: UI.accent },
  preview: { width: 76, height: 56, alignItems: 'center', justifyContent: 'center' },
  name: { color: UI.text, fontSize: 18, fontWeight: '800' },
  desc: { color: UI.dim, fontSize: 12, marginTop: 2 },
  btn: { backgroundColor: UI.gold, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 78, alignItems: 'center' },
  btnOff: { backgroundColor: UI.bg },
  btnGhost: { backgroundColor: UI.panelHi },
  btnText: { color: UI.bg, fontWeight: '800' },
  using: { color: UI.accent, fontWeight: '800', minWidth: 78, textAlign: 'center' },
  miniRail: { width: 70, height: 50, borderRadius: 12, borderWidth: 2, padding: 7 },
  miniBoard: { flex: 1, borderRadius: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 3, padding: 4 },
  boosterIcon: { fontSize: 28, color: UI.text },
  note: { color: UI.dim, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
