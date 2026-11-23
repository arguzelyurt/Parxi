import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { prevKey, streakAlive } from '../core/daily';
import { ECONOMY } from '../core/monetization';
import { UI } from '../game/palette';
import { Progress } from '../game/storage';
import { t } from '../i18n';
import { Btn, Card, kit, TabHeader } from './kit';

interface Props {
  progress: Progress;
  todayKey: string;
  onPlay(): void;
  onShop(): void;
}


export default function DailyScreen({ progress, todayKey, onPlay, onShop }: Props) {
  const done = progress.daily.lastDoneKey === todayKey;
  const streak = streakAlive(progress.daily.lastDoneKey, todayKey) ? progress.daily.streak : 0;
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
      <TabHeader title={t('daily.title')} coins={progress.coins} onCoins={onShop} />
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
