import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UI } from '../game/palette';
import { Key, t } from '../i18n';

export type Tab = 'home' | 'daily' | 'market' | 'garage' | 'settings';

const TABS: { key: Tab; icon: string; label: Key }[] = [
  { key: 'home', icon: '⌂', label: 'tab.home' },
  { key: 'daily', icon: '◷', label: 'tab.daily' },
  { key: 'market', icon: '◈', label: 'tab.market' },
  { key: 'garage', icon: '🚗', label: 'tab.garage' },
  { key: 'settings', icon: '⚙', label: 'tab.settings' },
];

/** Alt sekme çubuğu. dots: sekmede bekleyen bir şey varsa (ör. bugünün Günlük Otopark'ı) */
export default function TabBar({ tab, onTab, dots }: { tab: Tab; onTab(t: Tab): void; dots: Partial<Record<Tab, boolean>> }) {
  return (
    <View style={styles.bar}>
      {TABS.map((item) => {
        const on = item.key === tab;
        return (
          <Pressable key={item.key} onPress={() => onTab(item.key)} style={styles.item} hitSlop={4}>
            <View style={[styles.iconWrap, on && styles.iconOn]}>
              <Text style={[styles.icon, on && { color: UI.bg }]}>{item.icon}</Text>
              {dots[item.key] && <View style={styles.dot} />}
            </View>
            <Text style={[styles.label, on && { color: UI.text }]}>{t(item.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: UI.bg2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
    paddingBottom: 6,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: UI.accent },
  icon: { color: UI.dim, fontSize: 18, fontWeight: '700' },
  label: { color: UI.dim, fontSize: 11, fontWeight: '700' },
  dot: {
    position: 'absolute',
    top: 2,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: UI.gold,
  },
});
