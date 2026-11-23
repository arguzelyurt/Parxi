import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  canClaimChest,
  canClaimMission,
  MISSION_CHEST,
  missionDone,
  missionLabel,
  MissionState,
} from '../core/missions';
import { UI } from '../game/palette';
import { t } from '../i18n';

interface Props {
  state: MissionState;
  onClaim(i: number): void;
  onClaimChest(): void;
}

export default function MissionsCard({ state, onClaim, onClaimChest }: Props) {
  const chestReady = canClaimChest(state);
  const doneCount = state.claimed.filter(Boolean).length;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{t('missions.title')}</Text>
        <Text style={styles.count}>{doneCount}/3</Text>
      </View>
      {state.missions.map((m, i) => {
        const done = missionDone(state, i);
        const claimable = canClaimMission(state, i);
        const pct = Math.min(1, state.progress[i] / m.target);
        return (
          <View key={i} style={styles.row}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.label, state.claimed[i] && styles.labelDone]}>{missionLabel(m)}</Text>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${pct * 100}%` }, done && { backgroundColor: UI.gold }]} />
              </View>
            </View>
            {state.claimed[i] ? (
              <Text style={styles.check}>✓</Text>
            ) : (
              <Pressable
                disabled={!claimable}
                onPress={() => onClaim(i)}
                style={[styles.claim, !claimable && styles.claimOff]}
              >
                <Text style={[styles.claimText, !claimable && { color: UI.dim }]}>
                  {claimable ? t('missions.claim', { n: m.reward }) : `${state.progress[i]}/${m.target}`}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {!state.chestClaimed && (
        <Pressable
          disabled={!chestReady}
          onPress={onClaimChest}
          style={[styles.chest, chestReady && styles.chestReady]}
        >
          <Text style={[styles.chestText, chestReady && { color: UI.bg }]}>
            {t('missions.chest', { coins: MISSION_CHEST.coins, hint: MISSION_CHEST.hint })}
            {chestReady ? t('missions.open') : ''}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: UI.panel, borderRadius: 18, padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center' },
  title: { color: UI.text, fontSize: 18, fontWeight: '800', flex: 1 },
  count: { color: UI.dim, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { color: UI.text, fontSize: 14, fontWeight: '600' },
  labelDone: { color: UI.dim, textDecorationLine: 'line-through' },
  bar: { height: 6, borderRadius: 3, backgroundColor: UI.bg, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: UI.accent },
  claim: { backgroundColor: UI.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 64, alignItems: 'center' },
  claimOff: { backgroundColor: UI.bg },
  claimText: { color: UI.bg, fontWeight: '800', fontSize: 13 },
  check: { color: UI.gold, fontSize: 20, fontWeight: '900', minWidth: 64, textAlign: 'center' },
  chest: { borderRadius: 12, padding: 10, backgroundColor: UI.bg, alignItems: 'center' },
  chestReady: { backgroundColor: UI.gold },
  chestText: { color: UI.dim, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
