// Can göstergesi ve "canın bitti" paneli (ana sayfa, harita ve oyun ekranında ortak).
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { addLives, fillLives, Lives, MAX_LIVES, msToNextLife, REFILL_COINS, settleLives } from '../core/lives';
import { UI } from '../game/palette';
import { Progress, trustedNow } from '../game/storage';
import { t } from '../i18n';
import { Btn, TextLink } from './kit';
import { buyBoost, infiniteLivesActive } from '../game/economy';
import { BOOST_MS, GEM_COST } from '../core/prices';

export const fmtMs = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Saniyede bir yenilenen saat */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** ❤ 4 · 07:12 */
export function LivesPill({ lives, onPress, compact, infiniteUntil = 0 }: { lives: Lives; onPress?(): void; compact?: boolean; infiniteUntil?: number }) {
  const now = useNow();
  const s = settleLives(lives, now);
  const next = msToNextLife(lives, now);
  if (infiniteUntil > now)
    return (
      <Pressable onPress={onPress} disabled={!onPress} hitSlop={8} style={[styles.pill, compact && styles.pillCompact]}>
        <Text style={styles.heart}>❤</Text>
        <Text style={styles.count}>∞</Text>
        <Text style={styles.timer}>{fmtMs(infiniteUntil - now)}</Text>
      </Pressable>
    );
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={8} style={[styles.pill, compact && styles.pillCompact]}>
      <Text style={styles.heart}>❤</Text>
      <Text style={styles.count}>{s.count}</Text>
      {s.count < MAX_LIVES && <Text style={styles.timer}>{fmtMs(next)}</Text>}
      {s.count >= MAX_LIVES && !compact && <Text style={styles.full}>{t('lives.full')}</Text>}
    </Pressable>
  );
}

/** Can paneli: kalp sırası, sayaç, reklamla +1, coin ile doldur */
export function LivesPanel(props: {
  progress: Progress;
  update(fn: (p: Progress) => Progress): void;
  adAvailable: boolean;
  watchAd(): Promise<boolean>;
  onShop(): void;
  onClose(): void;
  /** Can varken "Oyna" düğmesi */
  onPlay?(): void;
}) {
  const now = useNow();
  const { progress, update } = props;
  const s = settleLives(progress.lives, now);
  const next = msToNextLife(progress.lives, now);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Text style={styles.title}>{s.count > 0 ? t('lives.title') : t('lives.empty')}</Text>
      <View style={styles.hearts}>
        {Array.from({ length: MAX_LIVES }, (_, i) => (
          <Text key={i} style={[styles.bigHeart, i >= s.count && styles.heartOff]}>
            ❤
          </Text>
        ))}
      </View>
      <Text style={styles.sub}>
        {s.count >= MAX_LIVES ? t('lives.allFull') : t('lives.next', { time: fmtMs(next) })}
      </Text>
      <Text style={styles.rule}>{t('lives.rule')}</Text>
      <View style={{ height: 8 }} />
      {s.count > 0 && props.onPlay && <Btn label={t('lives.play')} primary onPress={props.onPlay} />}
      {s.count < MAX_LIVES && props.adAvailable && (
        <Btn
          label={t('lives.ad')}
          gold
          loading={busy}
          onPress={async () => {
            setBusy(true);
            const ok = await props.watchAd();
            setBusy(false);
            if (ok) update((p) => ({ ...p, lives: addLives(p.lives, 1, trustedNow(p)) }));
          }}
        />
      )}
      {s.count < MAX_LIVES && (
        <Btn
          label={t('lives.refill', { n: REFILL_COINS })}
          primary={!props.onPlay || s.count === 0}
          onPress={() => {
            if (progress.coins < REFILL_COINS) return props.onShop();
            update((p) => (p.coins >= REFILL_COINS ? { ...p, coins: p.coins - REFILL_COINS, lives: fillLives(trustedNow(p)) } : p));
          }}
        />
      )}
      {!infiniteLivesActive(progress, now) && (
        <Btn
          label={`${t('lives.buyInfinite', { m: BOOST_MS.infiniteLives / 60000 })}  ·  💎 ${GEM_COST.infiniteLives}`}
          onPress={() => {
            if (progress.gems < GEM_COST.infiniteLives) return props.onShop();
            update((p) => buyBoost(p, 'infiniteLives', trustedNow(p)) ?? p);
          }}
        />
      )}
      {infiniteLivesActive(progress, now) && <Text style={styles.sub}>♾️ {t('lives.infiniteOn')} · {fmtMs(progress.boosts.infiniteLivesUntil - now)}</Text>}
      <TextLink label={t('common.close')} onPress={props.onClose} />
    </>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: UI.panel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  pillCompact: { paddingHorizontal: 8, paddingVertical: 3 },
  heart: { color: '#FF4D6D', fontSize: 16 },
  count: { color: UI.text, fontSize: 16, fontWeight: '900' },
  timer: { color: UI.dim, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  full: { color: UI.dim, fontSize: 12, fontWeight: '700' },
  title: { color: UI.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  hearts: { flexDirection: 'row', gap: 6, marginVertical: 10 },
  bigHeart: { fontSize: 34, color: '#FF4D6D' },
  heartOff: { color: UI.panelHi },
  sub: { color: UI.text, fontSize: 16, fontWeight: '800' },
  rule: { color: UI.dim, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
