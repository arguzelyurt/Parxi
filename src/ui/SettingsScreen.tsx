import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from './Text';
import app from '../../app.json';
import { PRIVACY_URL, SUPPORT_EMAIL } from '../config';
import { UI } from '../game/palette';
import { Progress, SPEEDS, speedName } from '../game/storage';
import { LangSetting, t } from '../i18n';
import { Btn, Card, kit, TabHeader } from './kit';

interface Props {
  progress: Progress;
  update(fn: (p: Progress) => Progress): void;
  onShop(): void;
  onRestore(): void;
  privacyOptions: (() => void) | null;
  /** Girişli hesabın gösterilecek adı (yoksa null) */
  accountLabel: string | null;
  onAccount(): void;
}

export default function SettingsScreen({ progress, update, onShop, onRestore, privacyOptions, accountLabel, onAccount }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={t('settings.title')} coins={progress.coins} onCoins={onShop} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={kit.section}>{t('account.title')}</Text>
        <Card onPress={onAccount} style={styles.accountCard}>
          <Text style={styles.accountIcon}>{accountLabel ? '☁️' : '👤'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={kit.cardTitle}>{accountLabel ?? t('account.cta')}</Text>
            <Text style={kit.cardSub}>{accountLabel ? t('account.ctaIn') : t('account.ctaSub')}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Card>
        <Text style={kit.section}>{t('settings.game')}</Text>
        <Card style={{ gap: 16 }}>
          <View>
            <Text style={kit.cardTitle}>{t('settings.speed')}</Text>
            <View style={styles.segment}>
              {SPEEDS.map((sp) => (
                <Pressable
                  key={sp}
                  onPress={() => update((p) => ({ ...p, speed: sp }))}
                  style={[styles.segBtn, progress.speed === sp && styles.segOn]}
                >
                  <Text style={[styles.segText, progress.speed === sp && { color: UI.bg }]}>{speedName(sp)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Row
            label={t('settings.colorBlind')}
            value={progress.colorBlind}
            onChange={(v) => update((p) => ({ ...p, colorBlind: v }))}
          />
          <View>
            <Text style={kit.cardTitle}>{t('settings.language')}</Text>
            <View style={styles.segment}>
              {(['auto', 'tr', 'en'] as LangSetting[]).map((l) => (
                <Pressable
                  key={l}
                  onPress={() => update((p) => ({ ...p, lang: l }))}
                  style={[styles.segBtn, progress.lang === l && styles.segOn]}
                >
                  <Text style={[styles.segText, progress.lang === l && { color: UI.bg }]}>
                    {l === 'auto' ? t('settings.langAuto') : l === 'tr' ? 'Türkçe' : 'English'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        <Text style={kit.section}>{t('settings.purchases')}</Text>
        <Card>
          <Text style={kit.cardSub}>
            {progress.ads.removeAds ? t('settings.noAdsOn') : t('settings.noAdsOff')}
          </Text>
          <Btn label={t('settings.shop')} onPress={onShop} primary />
          <Btn label={t('settings.restore')} onPress={onRestore} />
        </Card>

        <Text style={kit.section}>{t('settings.privacy')}</Text>
        <Card>
          {privacyOptions && <Btn label={t('settings.adPrefs')} onPress={privacyOptions} />}
          {!!PRIVACY_URL && <Btn label={t('settings.policy')} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} />}
          {!!SUPPORT_EMAIL && <Text style={[kit.cardSub, { marginTop: 10 }]}>{t('settings.support', { email: SUPPORT_EMAIL })}</Text>}
        </Card>

        {__DEV__ && (
          // Yalnızca geliştirme derlemesinde: seviye atlama ve coin (yayın sürümünde görünmez).
          <View style={styles.dev}>
            <Text style={styles.devLabel}>GELİŞTİRME · seviye {progress.level}</Text>
            <View style={styles.devRow}>
              {[-10, -1, 1, 10].map((d) => (
                <Pressable
                  key={d}
                  style={styles.devBtn}
                  onPress={() => update((p) => ({ ...p, level: Math.max(1, Math.min(500, p.level + d)) }))}
                >
                  <Text style={styles.devBtnText}>{d > 0 ? `+${d}` : d}</Text>
                </Pressable>
              ))}
              {[16, 26, 46].map((lv) => (
                <Pressable key={lv} style={styles.devBtn} onPress={() => update((p) => ({ ...p, level: lv }))}>
                  <Text style={styles.devBtnText}>{lv}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.devBtn} onPress={() => update((p) => ({ ...p, coins: p.coins + 1000 }))}>
                <Text style={styles.devBtnText}>+1000 coin</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.version}>Parxi {app.expo.version}</Text>
      </ScrollView>
    </View>
  );
}

function Row(props: { label: string; sub?: string; value: boolean; onChange(v: boolean): void }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={kit.cardTitle}>{props.label}</Text>
        {props.sub && <Text style={kit.cardSub}>{props.sub}</Text>}
      </View>
      <Switch value={props.value} onValueChange={props.onChange} trackColor={{ true: UI.accent, false: UI.bg2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  accountIcon: { fontSize: 30 },
  chev: { color: UI.dim, fontSize: 30, fontWeight: '300' },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  segment: { flexDirection: 'row', gap: 6, marginTop: 10 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: UI.bg2, alignItems: 'center' },
  segOn: { backgroundColor: UI.accent },
  segText: { color: UI.text, fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dev: {
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
  },
  devLabel: { color: UI.dim, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  devRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  devBtn: { backgroundColor: UI.bg2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  devBtnText: { color: UI.text, fontSize: 13, fontWeight: '600' },
  version: { color: UI.dim, fontSize: 11, textAlign: 'center', marginTop: 20 },
});
