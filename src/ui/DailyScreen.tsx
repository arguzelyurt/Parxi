import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { prevKey, streakAlive } from '../core/daily';
import { ECONOMY } from '../core/monetization';
import { UI } from '../game/palette';
import { Progress } from '../game/storage';
import { t } from '../i18n';
import { Btn, Card, kit, TabHeader } from './kit';
import { canRepairStreak, streakAfterDaily } from '../game/economy';
import { GEM_COST, GEM_REWARD, SHIELD_MAX } from '../core/prices';
import { Image } from 'react-native';
import { ICONS } from './icons';

interface Props {
  progress: Progress;
  todayKey: string;
  onPlay(): void;
  onShop(): void;
  /** Elmas harcaması: seri koruyucu ya da seri onarma */
  onGem(kind: 'shield' | 'repair'): boolean;
}


export default function DailyScreen({ progress, todayKey, onPlay, onShop, onGem }: Props) {
  const done = progress.daily.lastDoneKey === todayKey;
  // Koruyucular kaçırılan günleri kapatıyorsa seri hâlâ canlı
  const after = streakAfterDaily(progress, todayKey);
  const streak = done || streakAlive(progress.daily.lastDoneKey, todayKey) || after.streak > 1 ? progress.daily.streak : 0;
  const repair = canRepairStreak(progress, todayKey);
  const todayStars = progress.daily.stars[todayKey] ?? 0;
  const nextStreak = done ? streak : streak + 1;
  const toBonus = 7 - (nextStreak % 7 || 7);

  // Son 7 gün (bugün en sağda)
  const week: string[] = [];
  let k = todayKey;
  for (let i = 0; i < 7; i++) {
    week.unshift(k);
    k = prevKey(k);
  }

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={t('daily.title')} money={progress} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <Text style={styles.big}>{done ? t('daily.doneTitle') : t('daily.readyTitle')}</Text>
          <Text style={kit.cardSub}>{t('daily.desc')}</Text>
          {done && (
            <Text style={styles.stars}>
              {'★'.repeat(todayStars)}
              <Text style={{ color: UI.panelHi }}>{'★'.repeat(3 - todayStars)}</Text>
            </Text>
          )}
          {done && (
            <View style={styles.taken}>
              <Text style={styles.takenText}>
                ✅ ● {ECONOMY.daily + (streak > 0 && streak % 7 === 0 ? ECONOMY.streak7Bonus : 0)} · {t('reward.taken')}
              </Text>
            </View>
          )}
          <Btn label={done ? t('daily.replay') : t('daily.play', { n: ECONOMY.daily })} onPress={onPlay} primary />
        </Card>

        <Text style={kit.section}>{t('daily.streak')}</Text>
        <Card>
          <View style={styles.streakRow}>
            <Text style={styles.streakNum}>🔥 {streak}</Text>
            <Text style={[kit.cardSub, { flex: 1, marginLeft: 12, marginTop: 0 }]}>
              {toBonus === 0 && !done
                ? t('daily.bonusToday', { n: ECONOMY.streak7Bonus })
                : toBonus === 1
                  ? t('daily.bonusIn1', { n: ECONOMY.streak7Bonus })
                  : t('daily.bonusIn', { d: toBonus, n: ECONOMY.streak7Bonus })}
            </Text>
          </View>
          <View style={styles.week}>
            {week.map((d) => {
              const stars = progress.daily.stars[d] ?? 0;
              const isToday = d === todayKey;
              const day = t('daily.days').split(',')[new Date(`${d}T12:00:00Z`).getUTCDay()];
              return (
                <View key={d} style={styles.dayCol}>
                  <View style={[styles.dayDot, stars > 0 && styles.dayDone, isToday && styles.dayToday]}>
                    <Text style={[styles.dayMark, stars > 0 && { color: UI.bg }]}>{stars > 0 ? '✓' : ''}</Text>
                  </View>
                  <Text style={[styles.dayName, isToday && { color: UI.text }]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {repair && (
          <Card style={{ marginTop: 12, borderWidth: 2, borderColor: UI.danger }}>
            <Text style={kit.cardTitle}>🔥 {t('daily.repair')}</Text>
            <Text style={kit.cardSub}>{t('daily.repairSub', { n: progress.daily.streak })}</Text>
            <Btn label={`💎 ${GEM_COST.repair}  ·  ${t('daily.repair')}`} gold onPress={() => onGem('repair') || onShop()} />
          </Card>
        )}
        <Card style={{ marginTop: 12 }}>
          <View style={styles.streakRow}>
            <Image source={ICONS.shield} style={{ width: 40, height: 40 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={kit.cardTitle}>{t('daily.shields', { n: `${progress.streakShield}/${SHIELD_MAX}` })}</Text>
              <Text style={[kit.cardSub, { marginTop: 2 }]}>{t('daily.shieldNote')}</Text>
            </View>
          </View>
          {progress.streakShield < SHIELD_MAX && (
            <Btn label={`💎 ${GEM_COST.shield}  ·  ${t('daily.buyShield')}`} onPress={() => onGem('shield') || onShop()} />
          )}
          <Text style={[kit.cardSub, { fontSize: 13 }]}>
            {t('daily.gemMilestones', { a: GEM_REWARD.streak7, b: GEM_REWARD.streak30 })}
          </Text>
        </Card>

        <Text style={kit.section}>{t('daily.how')}</Text>
        <Card>
          <Text style={kit.cardSub}>{t('daily.rules', { n: ECONOMY.daily })}</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  hero: { marginTop: 8, gap: 4 },
  big: { color: UI.text, fontSize: 20, fontWeight: '800' },
  stars: { color: UI.gold, fontSize: 30, letterSpacing: 3, marginTop: 6 },
  taken: { alignSelf: 'flex-start', backgroundColor: UI.bg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginVertical: 6 },
  takenText: { color: UI.accent, fontWeight: '900', fontSize: 15 },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakNum: { color: UI.gold, fontSize: 26, fontWeight: '900' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  dayCol: { alignItems: 'center', gap: 4 },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDone: { backgroundColor: UI.gold },
  dayToday: { borderWidth: 2, borderColor: UI.accent },
  dayMark: { color: UI.dim, fontWeight: '900' },
  dayName: { color: UI.dim, fontSize: 11, fontWeight: '700' },
});
