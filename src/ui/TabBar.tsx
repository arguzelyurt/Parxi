import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { ICONS, IconName } from './icons';
import { Text } from './Text';
import { UI } from '../game/palette';
import { Key, t } from '../i18n';

/** daily: alt çubukta yok, ana sayfadan açılır */
export type Tab = 'home' | 'map' | 'daily' | 'market' | 'garage' | 'settings';

const TABS: { key: Tab; icon: IconName; label: Key }[] = [
  { key: 'home', icon: 'tab-home', label: 'tab.home' },
  { key: 'map', icon: 'tab-map', label: 'tab.map' },
  { key: 'market', icon: 'tab-market', label: 'tab.market' },
  { key: 'garage', icon: 'tab-garage', label: 'tab.garage' },
  { key: 'settings', icon: 'tab-settings', label: 'tab.settings' },
];

/** Seçilen sekmenin ikonu zıplar */
function TabIcon({ name, on }: { name: IconName; on: boolean }) {
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: on ? 1 : 0, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [on, a]);
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
          { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.12] }) },
        ],
      }}
    >
      <Image source={ICONS[name]} style={{ width: 34, height: 34, opacity: on ? 1 : 0.7 }} />
    </Animated.View>
  );
}

/** Alt sekme çubuğu. dots: sekmede bekleyen bir şey varsa (ör. bugünün Günlük Otopark'ı) */
export default function TabBar({ tab, onTab, dots }: { tab: Tab; onTab(t: Tab): void; dots: Partial<Record<Tab, boolean>> }) {
  return (
    <View style={styles.bar}>
      {TABS.map((item) => {
        const on = item.key === tab;
        return (
          <Pressable key={item.key} onPress={() => onTab(item.key)} style={styles.item} hitSlop={4}>
            <View style={[styles.iconWrap, on && styles.iconOn]}>
              <TabIcon name={item.icon} on={on} />
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
  iconWrap: { width: 56, height: 40, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: UI.panelHi },
  icon: { color: UI.dim, fontSize: 22 },
  label: { color: UI.dim, fontSize: 13, fontWeight: '800' },
  // Bildirim ışığı: kırmızı, kenarlıklı, ikonun köşesinde (gözden kaçmasın)
  dot: {
    position: 'absolute',
    top: -1,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: UI.danger,
    borderWidth: 2,
    borderColor: UI.bg2,
  },
});
