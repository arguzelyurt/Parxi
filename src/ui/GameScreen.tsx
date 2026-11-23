import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  addDockSlot,
  boardOne,
  capOf,
  Dir,
  evaluate,
  exitVehicle,
  freeSlots,
  initialState,
  Kind,
  lenOf,
  Level,
  occupancy,
  barrierUp,
  canExit,
  extendVip,
  isLocked,
  lockOf,
  reopen,
  vipPatienceLeft,
  BARRIER,
  Parked,
  passengersLeft,
  pathClear,
  starsFor,
  State,
  Vehicle,
} from '../core/rules';
import { hint } from '../core/solver';
import { CarModel } from '../core/garage';
import { Feature } from '../core/features';
import { Booster, boosterName, ECONOMY } from '../core/monetization';
import { Key, t } from '../i18n';
import { COLORS, SYMBOLS, UI } from '../game/palette';
import { Progress, SPEED_MS, todayUTC } from '../game/storage';
import { Btn, TextLink } from './kit';
import { CarStyle, carStyleFor, themeFor } from '../game/skins';
import { track } from '../services/analytics';
import CarArt from './CarArt';
import { carName } from './GarageScreen';

const ROAD = 14; // otoparkın etrafındaki yol
const EXIT_MS = 230; // aracın otoparktan çıkışı
const LEAVE_MS = 420; // dolan aracın duraktan ayrılışı
const BUMP_MS = 260; // önü kapalıyken sarsılma
const QUEUE_VISIBLE = 12;

export interface MonetizationApi {
  /** Ödüllü reklam: true = ödül hak edildi. Destekçi paketinde anında true. */
  watchAd(placement: string): Promise<boolean>;
  rewardedAvailable(): boolean;
  openShop(): void;
}

export interface WinResult {
  stars: number;
  /** Otoparktan çıkarılan araç sayısı */
  launches: number;
  /** Durakta aynı anda bekleyen en fazla araç */
  parked: number;
  /** Bu seviyede herhangi bir güçlendirici (ya da reklamla kurtarma) kullanıldı mı */
  usedHelp: boolean;
}

interface Props {
  level: Level;
  /** Başlık: "Seviye 12" ya da "Günlük Otopark" */
  heading: string;
  /** Ölçüm için seviye kimliği */
  trackId: number | string;
  progress: Progress;
  update(fn: (p: Progress) => Progress): void;
  money: MonetizationApi;
  /** Yıldıza göre kazanılacak coin (ekranda gösterilir) */
  coinsFor(stars: number): number;
  /** Kazanınca bir kez: ödülü üst bileşen verir */
  onWin(r: WinResult): void;
  /** Bu seviye bitince garaja giren araba (kazanma kartında gösterilir) */
  newCar?: CarModel | null;
  /** Kazanma kartındaki ana düğme */
  nextLabel: string;
  onNext(): void;
  onExit(): void;
  /** Kazanma kartında ek düğme (ör. Günlük Otopark paylaş) */
  extraWinAction?: { label: string; onPress(r: WinResult): void };
  /** İlk açılış öğreticisi (1. seviye) */
  tutorial?: boolean;
  onTutorialDone?(): void;
  /** Bu seviyede ilk kez görülen engel: başta tanıtım kartı */
  intro?: Feature | null;
  onIntroSeen?(f: Feature): void;
}

/** Araç stili (marketten) + renk körlüğü: her bileşene tek tek geçmemek için */
const SkinCtx = createContext<{ car: CarStyle; colorBlind: boolean }>({ car: 'klasik', colorBlind: false });

const haptic = (kind: 'tap' | 'bump' | 'win' | 'stuck' | 'leave') => {
  try {
    if (kind === 'tap') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === 'bump') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (kind === 'leave') Haptics.selectionAsync();
    else if (kind === 'win') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
};

interface Moving {
  v: Vehicle;
  start: number;
  next: State;
  crane: boolean;
}
interface Leaving {
  key: string;
  p: Parked;
  slot: number;
  start: number;
}

export default function GameScreen(props: Props) {
  const { level, heading, trackId, progress, update, money, onNext } = props;
  const colorBlind = progress.colorBlind;
  const theme = themeFor(progress.cosmetics.theme);
  const skin = useMemo(() => ({ car: carStyleFor(progress.cosmetics.car), colorBlind }), [progress.cosmetics.car, colorBlind]);
  const { width, height } = useWindowDimensions();
  const [s, setS] = useState<State>(() => initialState(level));
  const [history, setHistory] = useState<State[]>([]);
  const [moving, setMoving] = useState<Moving | null>(null);
  const [boarding, setBoarding] = useState(false);
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  const [bump, setBump] = useState<{ id: number; start: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hintId, setHintId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [craneMode, setCraneMode] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [wonCoins, setWonCoins] = useState(0);
  // Öğretici: 0 dokun · 1 biniş · 2 önü kapalı · 3 durak sınırı · -1 bitti
  const [tut, setTut] = useState(props.tutorial ? 0 : -1);
  const tutNext = useRef<number | null>(null);
  const [introOpen, setIntroOpen] = useState<Feature | null>(props.intro ?? null);
  const freeCrane = useRef(false);
  const wonReported = useRef(false);
  const usedHelp = useRef(false);
  const stuckReported = useRef<State | null>(null);
  const onWinRef = useRef(props.onWin);
  onWinRef.current = props.onWin;
  const coinsForRef = useRef(props.coinsFor);
  coinsForRef.current = props.coinsFor;

  const busy = !!moving || boarding;

  useEffect(() => {
    track({ name: 'level_start', level: trackId, hard: !!level.hard });
  }, [level, trackId]);

  // Yerleşim: otopark ekranın kalan yüksekliğine sığar
  const availW = width - 24 - ROAD * 2;
  const availH = height * 0.5 - ROAD * 2;
  const cs = Math.max(26, Math.min(58, Math.floor(Math.min(availW / level.w, availH / level.h))));
  const lotW = cs * level.w;
  const lotH = cs * level.h;

  // Animasyon saati: yalnızca bir şey hareket ederken çalışır
  const animating = !!moving || leaving.length > 0 || !!bump;
  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const loop = () => {
      const tNow = Date.now();
      setNow(tNow);
      setLeaving((ls) => (ls.some((l) => tNow - l.start > LEAVE_MS) ? ls.filter((l) => tNow - l.start <= LEAVE_MS) : ls));
      setBump((b) => (b && tNow - b.start > BUMP_MS ? null : b));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animating]);

  // Çıkış animasyonu bitince araç durağa geçer, yolcular binmeye başlar
  useEffect(() => {
    if (!moving) return;
    const id = setTimeout(() => {
      setS(moving.next);
      setMoving(null);
      setBoarding(true);
    }, EXIT_MS);
    return () => clearTimeout(id);
  }, [moving]);

  // Yolcular tek tek biner
  const stepMs = SPEED_MS[progress.speed];
  useEffect(() => {
    if (!boarding || moving) return;
    const id = setTimeout(() => {
      const st = boardOne(level, s);
      if (!st) {
        const ev = evaluate(level, s);
        setS(ev);
        setBoarding(false);
        if (ev.status === 'won') haptic('win');
        else if (ev.status === 'stuck') haptic('stuck');
        return;
      }
      if (st.departed) {
        const p = s.dock[st.slot]!;
        setLeaving((ls) => [...ls, { key: `${p.v.id}`, p: { ...p, filled: capOf(p.v) }, slot: st.slot, start: Date.now() }]);
        haptic('leave');
      }
      setS(st.state);
    }, stepMs);
    return () => clearTimeout(id);
  }, [boarding, moving, s, level, stepMs]);

  /** Biniş sırasında ekrana dokununca hepsi hemen biner */
  const skipBoarding = () => {
    if (!boarding || moving) return;
    let cur = s;
    for (;;) {
      const st = boardOne(level, cur);
      if (!st) break;
      if (st.departed) {
        const p = cur.dock[st.slot]!;
        setLeaving((ls) => [...ls, { key: `${p.v.id}`, p: { ...p, filled: capOf(p.v) }, slot: st.slot, start: Date.now() }]);
      }
      cur = st.state;
    }
    const ev = evaluate(level, cur);
    setS(ev);
    setBoarding(false);
    if (ev.status === 'won') haptic('win');
    else if (ev.status === 'stuck') haptic('stuck');
  };

  // Öğretici: dokunuşun animasyonu ve binişi bitince sonraki adım
  useEffect(() => {
    if (busy || tutNext.current === null) return;
    setTut(tutNext.current);
    tutNext.current = null;
  }, [busy]);
  const finishTutorial = () => {
    setTut(-1);
    props.onTutorialDone?.();
  };
  useEffect(() => {
    if (tut >= 0 && s.status === 'won' && !busy) finishTutorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.status, busy]);
  const tutTarget = useMemo(() => (tut === 0 || tut === 2 ? hint(level, s) : null), [tut, level, s]);

  // Kazanınca ödül bir kez verilir
  useEffect(() => {
    if (busy || s.status !== 'won' || wonReported.current) return;
    wonReported.current = true;
    const stars = starsFor(level, s);
    setWonCoins(coinsForRef.current(stars));
    onWinRef.current({ stars, launches: s.taps, parked: s.peak, usedHelp: usedHelp.current });
    track({ name: 'level_complete', level: trackId, launches: s.taps, parked: s.peak, stars });
  }, [s, busy, trackId, level]);

  useEffect(() => {
    if (busy || s.status !== 'stuck' || stuckReported.current === s) return;
    stuckReported.current = s;
    track({ name: 'level_stuck', level: trackId, launches: s.taps, overflow: true });
  }, [s, busy, trackId]);

  /** Envanterden, yoksa coin ile. İkisi de yoksa dükkanı açar. */
  const spend = (kind: Booster): boolean => {
    if (progress.boosters[kind] > 0) {
      usedHelp.current = true;
      update((p) => ({ ...p, boosters: { ...p.boosters, [kind]: p.boosters[kind] - 1 } }));
      track({ name: 'booster_used', kind, source: 'inventory' });
      return true;
    }
    const price = ECONOMY.prices[kind];
    if (progress.coins >= price) {
      usedHelp.current = true;
      update((p) => ({ ...p, coins: p.coins - price }));
      track({ name: 'booster_used', kind, source: 'coins' });
      return true;
    }
    money.openShop();
    return false;
  };

  const onVehicle = (v: Vehicle) => {
    if (busy || s.status !== 'playing') return;
    if (tutTarget !== null && v.id !== tutTarget) {
      setBump({ id: v.id, start: Date.now() });
      haptic('bump');
      return;
    }
    // Vinç yalnızca çıkamayan araçta harcanır; çıkabiliyorsa normal çıkış
    const crane = craneMode && !canExit(level, s, v);
    if (crane && freeSlots(s) > 0 && !freeCrane.current && !spend('crane')) return;
    const r = exitVehicle(level, s, v.id, crane);
    if (r === 'locked') {
      setBump({ id: v.id, start: Date.now() });
      setMessage(t('game.locked'));
      haptic('bump');
      return;
    }
    if (r === 'blocked') {
      setBump({ id: v.id, start: Date.now() });
      setMessage(t('game.blocked'));
      haptic('bump');
      return;
    }
    if (r === 'full') {
      setMessage(t('game.full'));
      haptic('bump');
      return;
    }
    if (typeof r === 'string') return;
    setHistory((h) => [...h, s]);
    setCraneMode(false);
    freeCrane.current = false;
    setHintId(null);
    setMessage(null);
    if (tut === 0) tutNext.current = 1;
    if (tut === 2) tutNext.current = 3;
    setMoving({ v, start: Date.now(), next: r, crane });
    haptic('tap');
  };

  const undo = () => {
    if (busy || history.length === 0) return;
    if (!spend('undo')) return;
    setS(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setHintId(null);
    setCraneMode(false);
    setLeaving([]);
  };

  const restart = () => {
    if (busy) return;
    setS(initialState(level));
    setHistory([]);
    setHintId(null);
    setCraneMode(false);
    setMessage(null);
    setLeaving([]);
  };

  const askHint = () => {
    if (busy || s.status !== 'playing') return;
    const id = hint(level, s);
    if (id === null) {
      setMessage(t('game.noSolution'));
      return;
    }
    if (!spend('hint')) return;
    setHintId(id);
  };

  const toggleCrane = () => {
    if (busy || s.status !== 'playing') return;
    if (!craneMode && progress.boosters.crane === 0 && progress.coins < ECONOMY.prices.crane) {
      money.openShop();
      return;
    }
    setCraneMode((v) => !v);
    setMessage(craneMode ? null : t('game.craneHint'));
  };

  const extraSlot = () => {
    if (busy || s.status !== 'playing') return;
    if (!spend('extraSlot')) return;
    setS(addDockSlot(level, s));
  };

  // Tıkanınca kurtarma
  const today = todayUTC();
  const rescueAdsUsed = progress.rescueAdsToday.day === today ? progress.rescueAdsToday.count : 0;
  const canRescueAd = rescueAdsUsed < ECONOMY.rescueAdsPerDay && money.rewardedAvailable();

  const rescueByAd = async () => {
    if (adBusy) return;
    setAdBusy(true);
    const ok = await money.watchAd('rescue');
    setAdBusy(false);
    if (!ok) return;
    usedHelp.current = true;
    update((p) => ({ ...p, rescueAdsToday: { day: today, count: rescueAdsUsed + 1 } }));
    if (s.reason === 'vip') {
      track({ name: 'booster_used', kind: 'undo', source: 'ad' });
      setS((cur) => extendVip(level, cur, 2));
    } else if (s.reason === 'noMove') {
      track({ name: 'booster_used', kind: 'crane', source: 'ad' });
      freeCrane.current = true;
      setCraneMode(true);
      setMessage(t('game.craneHint'));
      setS((cur) => reopen(cur));
    } else {
      track({ name: 'booster_used', kind: 'extraSlot', source: 'ad' });
      setS((cur) => addDockSlot(level, cur));
    }
  };

  const rescueBySpend = () => {
    if (!spend('extraSlot')) return;
    setS(addDockSlot(level, s));
  };

  /** Çıkabilecek araç kalmayınca: vinç seç (dokununca harcanır) */
  const rescueByCrane = () => {
    if (progress.boosters.crane === 0 && progress.coins < ECONOMY.prices.crane) {
      money.openShop();
      return;
    }
    setCraneMode(true);
    setMessage(t('game.craneHint'));
    setS(reopen(s));
  };

  const doubleCoins = async () => {
    if (adBusy || doubled) return;
    setAdBusy(true);
    const ok = await money.watchAd('double_coins');
    setAdBusy(false);
    if (!ok) return;
    setDoubled(true);
    update((p) => ({ ...p, coins: p.coins + wonCoins }));
  };

  // Görünüm
  const grid = useMemo(() => occupancy(level, s), [s, level]);
  const hiddenSet = useMemo(() => new Set(level.hidden ?? []), [level]);
  const stars = starsFor(level, s);
  const winResult = (): WinResult => ({ stars, launches: s.taps, parked: s.peak, usedHelp: usedHelp.current });

  const slotW = Math.min(72, Math.floor((width - 24 - 20 - (s.dock.length - 1) * 6) / s.dock.length));
  const dockCarLen = slotW - 8;
  const dockCarT = Math.round(dockCarLen * 0.42);

  const infoText = message ?? t('game.idle', { n: passengersLeft(level, s) });
  const vipLeft = vipPatienceLeft(level, s);
  const tutText = tut >= 0 ? t(`tut.${tut}` as Key) : null;
  const queue = level.queue.slice(s.qi, s.qi + QUEUE_VISIBLE);
  const more = passengersLeft(level, s) - queue.length;

  const boosterLabel = (k: Booster) =>
    progress.boosters[k] > 0 ? t('game.uses', { n: progress.boosters[k] }) : `● ${ECONOMY.prices[k]}`;
  const boosterBadge = (k: Booster) =>
    progress.boosters[k] > 0 ? { text: `${progress.boosters[k]}`, coin: false } : { text: `${ECONOMY.prices[k]}`, coin: true };

  return (
    <SkinCtx.Provider value={skin}>
      <Pressable style={[styles.root, { backgroundColor: theme.bg }]} onPress={skipBoarding} disabled={!boarding}>
        <View style={styles.header}>
          <Pressable onPress={props.onExit} hitSlop={12} disabled={busy} style={styles.headerSide}>
            <Text style={styles.headerBtn}>{t('common.back')}</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>{heading}</Text>
            {level.hard && <Text style={styles.hard}>{t('game.hardTag')}</Text>}
          </View>
          <Pressable onPress={money.openShop} hitSlop={12} style={[styles.headerSide, { alignItems: 'flex-end' }]}>
            <Text style={styles.coinText}>● {progress.coins} +</Text>
          </Pressable>
        </View>

        {/* Yolcu kuyruğu: öndeki en solda */}
        <View style={[styles.queue, { backgroundColor: theme.panel }]}>
          {queue.map((c, i) => (
            <View key={`${s.qi + i}`}>
              <PersonView color={c} size={i === 0 ? 30 : 22} front={i === 0} vip={level.vip?.qi === s.qi + i} />
              {i === 0 && vipLeft !== null && (
                <View style={[styles.vipBadge, vipLeft <= 1 && { backgroundColor: UI.danger }]}>
                  <Text style={styles.vipBadgeText}>⏳{Math.max(0, vipLeft)}</Text>
                </View>
              )}
            </View>
          ))}
          {more > 0 && <Text style={styles.more}>+{more}</Text>}
        </View>

        {/* Durak */}
        <View style={[styles.dock, { backgroundColor: theme.rail, borderColor: theme.railEdge }]}>
          <Text style={[styles.dockLabel, { color: theme.stop }]}>{t('game.dock')}</Text>
          <View style={styles.slots}>
            {s.dock.map((p, i) => (
              <View key={i} style={[styles.slot, { width: slotW, borderColor: theme.stop }]}>
                {p && (
                  <View style={{ alignItems: 'center' }}>
                    <VehicleView v={{ ...p.v, dir: 'right' }} length={dockCarLen} thickness={dockCarT} />
                    <Seats p={p} size={Math.max(5, Math.floor(dockCarLen / 11))} />
                  </View>
                )}
              </View>
            ))}
            {leaving.map((l) => {
              const k = Math.min(1, (now - l.start) / LEAVE_MS);
              return (
                <View
                  key={l.key}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: l.slot * (slotW + 6) + 4 + k * k * width,
                    top: 6,
                    opacity: 1 - k * 0.5,
                  }}
                >
                  <VehicleView v={{ ...l.p.v, dir: 'right' }} length={dockCarLen} thickness={dockCarT} />
                </View>
              );
            })}
          </View>
        </View>

        {tutText ? (
          <View style={styles.tutCard}>
            <Text style={styles.tutText}>{tutText}</Text>
            {(tut === 1 || tut === 3) && !busy && (
              <Pressable
                onPress={() => {
                  if (tut === 3) finishTutorial();
                  else setTut(s.lot.some((v) => !canExit(level, s, v, grid)) ? 2 : 3);
                }}
                style={styles.tutBtn}
                hitSlop={8}
              >
                <Text style={styles.tutBtnText}>{t('tut.ok')}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Text style={styles.info}>{infoText}</Text>
        )}

        {/* Otopark */}
        <View
          style={{
            width: lotW + ROAD * 2,
            height: lotH + ROAD * 2,
            alignSelf: 'center',
            backgroundColor: theme.rail,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: theme.railEdge,
          }}
        >
          <View style={{ position: 'absolute', left: ROAD, top: ROAD, width: lotW, height: lotH, backgroundColor: theme.board, borderRadius: 8 }}>
            {/* Park yeri çizgileri */}
            {Array.from({ length: level.w * level.h }, (_, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: (i % level.w) * cs + cs * 0.42,
                  top: Math.floor(i / level.w) * cs + cs * 0.42,
                  width: cs * 0.16,
                  height: cs * 0.16,
                  borderRadius: cs,
                  backgroundColor: theme.stop,
                  opacity: 0.12,
                }}
              />
            ))}
          </View>
          {(level.barriers ?? []).map((b) =>
            barrierUp(b, s) ? (
              <BarrierView key={`b${b.cell}`} left={ROAD + (b.cell % level.w) * cs} top={ROAD + Math.floor(b.cell / level.w) * cs} cs={cs} n={b.need - s.departed} />
            ) : null,
          )}
          {s.lot.map((v) => {
            const isMoving = moving?.v.id === v.id;
            if (isMoving) return null;
            const clear = pathClear(level, s, v, grid);
            const lock = isLocked(level, s, v.id) ? lockOf(level, v.id) : undefined;
            let dx = 0;
            let dy = 0;
            if (bump?.id === v.id) {
              const k = (now - bump.start) / BUMP_MS;
              const amp = Math.sin(k * Math.PI * 3) * (1 - k) * cs * 0.12;
              [dx, dy] = offset(v.dir, amp);
            }
            return (
              <LotVehicle
                key={v.id}
                v={v}
                cs={cs}
                dx={dx}
                dy={dy}
                hidden={hiddenSet.has(v.id) && !clear}
                lockKey={lock?.key}
                highlight={hintId === v.id || (craneMode && (!clear || !!lock))}
                onPress={() => onVehicle(v)}
              />
            );
          })}
          {tutTarget !== null && !busy && (() => {
            const v = s.lot.find((x) => x.id === tutTarget);
            if (!v) return null;
            const n = lenOf(v);
            const hor = v.dir === 'left' || v.dir === 'right';
            return <Pointer x={ROAD + (v.x + (hor ? n / 2 : 0.5)) * cs} y={ROAD + (v.y + (hor ? 0.5 : n / 2)) * cs} size={cs} />;
          })()}
          {moving && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {(() => {
                const k = Math.min(1, (now - moving.start) / EXIT_MS);
                const dist = k * k * (Math.max(lotW, lotH) + cs * 2);
                const [dx, dy] = moving.crane ? [0, -dist] : offset(moving.v.dir, dist);
                return <LotVehicle v={moving.v} cs={cs} dx={dx} dy={dy} fade={1 - k} />;
              })()}
            </View>
          )}
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.toolbar}>
          <Tool icon="↶" label={boosterName('undo')} badge={boosterBadge('undo')} disabled={history.length === 0 || busy || s.status === 'won'} onPress={undo} />
          <Tool icon="💡" label={boosterName('hint')} badge={boosterBadge('hint')} disabled={busy || s.status !== 'playing'} onPress={askHint} />
          <Tool icon="🏗" label={boosterName('crane')} badge={boosterBadge('crane')} active={craneMode} disabled={busy || s.status !== 'playing'} onPress={toggleCrane} />
          <Tool icon="＋" label={boosterName('extraSlot')} badge={boosterBadge('extraSlot')} disabled={busy || s.status !== 'playing'} onPress={extraSlot} />
          <Tool icon="↻" label={t('game.restart')} disabled={busy} onPress={restart} />
        </View>

        {introOpen && (
          <Overlay>
            <Text style={styles.introTag}>{t('intro.new')}</Text>
            <Text style={styles.overTitle}>{t(`intro.${introOpen}.title` as Key)}</Text>
            <View style={{ marginVertical: 18, alignItems: 'center', justifyContent: 'center', minHeight: 70 }}>
              <IntroPicture f={introOpen} />
            </View>
            <Text style={[styles.overSub, { fontSize: 15 }]}>{t(`intro.${introOpen}.desc` as Key)}</Text>
            <View style={{ height: 10 }} />
            <Btn
              label={t('intro.ok')}
              primary
              onPress={() => {
                props.onIntroSeen?.(introOpen);
                setIntroOpen(null);
              }}
            />
          </Overlay>
        )}
        {!busy && s.status === 'won' && (
          <Overlay>
            <Text style={styles.overTitle}>{stars === 3 ? t('game.perfect') : t('game.done')}</Text>
            <Text style={styles.stars}>
              {'★'.repeat(stars)}
              <Text style={{ color: UI.panelHi }}>{'★'.repeat(3 - stars)}</Text>
            </Text>
            <Text style={styles.overSub}>{t('game.summary', { n: s.taps, peak: s.peak })}</Text>
            {props.newCar && (
              <View style={styles.newCar}>
                <Text style={styles.newCarTitle}>{t('game.newCar')}</Text>
                <View style={{ marginVertical: 10 }}>
                  <CarArt model={props.newCar} width={150} />
                </View>
                <Text style={styles.overSub}>{t('game.newCarSub', { name: carName(props.newCar.key) })}</Text>
              </View>
            )}
            {wonCoins > 0 && <Text style={styles.reward}>{t('game.reward', { n: doubled ? wonCoins * 2 : wonCoins })}</Text>}
            <Btn label={props.nextLabel} primary disabled={adBusy} onPress={onNext} />
            {props.extraWinAction && <Btn label={props.extraWinAction.label} onPress={() => props.extraWinAction!.onPress(winResult())} />}
            {wonCoins > 0 && !doubled && money.rewardedAvailable() && (
              <Btn label={t('game.adDouble', { n: wonCoins * 2 })} gold loading={adBusy} onPress={doubleCoins} />
            )}
            {props.nextLabel !== t('common.home') && <TextLink label={t('common.home')} onPress={props.onExit} />}
          </Overlay>
        )}
        {!busy && s.status === 'stuck' && (
          <Overlay>
            <Text style={styles.overTitle}>{t('game.stuck')}</Text>
            <Text style={styles.overSub}>
              {s.reason === 'vip' ? t('game.stuckVip') : s.reason === 'noMove' ? t('game.stuckNoMove') : t('game.stuckFull')}
            </Text>
            <View style={{ height: 8 }} />
            {canRescueAd && (
              <Btn
                label={s.reason === 'vip' ? t('game.rescueVipAd') : s.reason === 'noMove' ? t('game.rescueCraneAd') : t('game.rescueAd')}
                gold
                loading={adBusy}
                onPress={rescueByAd}
              />
            )}
            {s.reason === 'full' && (
              <Btn label={t('game.rescueSpend', { cost: boosterLabel('extraSlot') })} primary onPress={rescueBySpend} />
            )}
            {s.reason === 'noMove' && (
              <Btn label={t('game.rescueCrane', { cost: boosterLabel('crane') })} primary onPress={rescueByCrane} />
            )}
            <Btn label={t('game.undoCost', { cost: boosterLabel('undo') })} onPress={undo} />
            <Btn label={t('game.restartFull')} onPress={restart} />
            <TextLink label={t('common.home')} onPress={props.onExit} />
          </Overlay>
        )}
      </Pressable>
    </SkinCtx.Provider>
  );
}

function offset(d: Dir, k: number): [number, number] {
  if (d === 'right') return [k, 0];
  if (d === 'left') return [-k, 0];
  if (d === 'down') return [0, k];
  return [0, -k];
}

/** Otoparktaki araç: ızgaradaki yerine oturur, dokunulabilir */
function LotVehicle(props: {
  v: Vehicle;
  cs: number;
  dx?: number;
  dy?: number;
  hidden?: boolean;
  highlight?: boolean;
  lockKey?: number;
  fade?: number;
  onPress?: () => void;
}) {
  const { v, cs } = props;
  const n = lenOf(v);
  const hor = v.dir === 'left' || v.dir === 'right';
  const pad = Math.max(2, Math.round(cs * 0.07));
  const w = (hor ? n : 1) * cs;
  const h = (hor ? 1 : n) * cs;
  const body = (
    <View style={{ width: w - pad * 2, height: h - pad * 2, alignItems: 'center', justifyContent: 'center' }}>
      <VehicleView v={v} length={n * cs - pad * 2} thickness={cs - pad * 2} hidden={props.hidden} highlight={props.highlight} />
      {props.lockKey !== undefined && <LockBadge color={props.lockKey} size={Math.round(cs * 0.56)} />}
    </View>
  );
  return (
    <View
      style={{
        position: 'absolute',
        left: ROAD + v.x * cs + pad + (props.dx ?? 0),
        top: ROAD + v.y * cs + pad + (props.dy ?? 0),
        opacity: props.fade ?? 1,
      }}
    >
      {props.onPress ? (
        <Pressable onPress={props.onPress} hitSlop={2} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </View>
  );
}

const ROT: Record<Dir, string> = { right: '0deg', down: '90deg', left: '180deg', up: '270deg' };

/**
 * Üstten görünüş araç. Önce sağa bakan yatay araç çizilir (length x thickness),
 * sonra yönüne döndürülür. Dikey araçlarda dış kutu thickness x length olur.
 */
export function VehicleView(props: {
  v: Pick<Vehicle, 'kind' | 'color' | 'dir'>;
  length: number;
  thickness: number;
  hidden?: boolean;
  highlight?: boolean;
  style?: CarStyle;
}) {
  const ctx = useContext(SkinCtx);
  const style = props.style ?? ctx.car;
  const { length: L, thickness: T, v } = props;
  const hor = v.dir === 'left' || v.dir === 'right';
  const color = props.hidden ? UI.secret : COLORS[v.color];
  const dark = shade(color, 0.7);
  const light = tint(color, 0.35);
  const glass = '#1C2A40';
  const r = T * 0.28;

  const inner = (
    <View
      style={{
        width: L,
        height: T,
        borderRadius: r,
        backgroundColor: color,
        borderWidth: style === 'neon' ? 2 : 1.5,
        borderColor: props.highlight ? UI.accent : style === 'neon' ? light : dark,
        overflow: 'hidden',
        transform: [{ rotate: ROT[v.dir] }],
      }}
    >
      <VehicleDetails kind={v.kind} L={L} T={T} color={color} dark={dark} light={light} glass={glass} style={style} hidden={!!props.hidden} />
      {props.hidden && (
        <View style={styles.centerAbs}>
          <Text style={{ color: UI.dim, fontWeight: '900', fontSize: T * 0.5, transform: [{ rotate: `-${ROT[v.dir]}` }] }}>?</Text>
        </View>
      )}
      {!props.hidden && ctx.colorBlind && (
        <View style={styles.centerAbs}>
          <Text style={{ color: 'rgba(18,20,28,0.8)', fontWeight: '900', fontSize: T * 0.42, transform: [{ rotate: `-${ROT[v.dir]}` }] }}>
            {SYMBOLS[v.color]}
          </Text>
        </View>
      )}
    </View>
  );
  return (
    <View
      style={[
        { width: hor ? L : T, height: hor ? T : L, alignItems: 'center', justifyContent: 'center' },
        props.highlight && styles.glow,
        style === 'neon' && !props.hidden && { shadowColor: color, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
      ]}
    >
      {inner}
    </View>
  );
}

/** Sağa bakan yatay aracın detayları (cam, tavan, farlar) */
function VehicleDetails(p: {
  kind: Kind;
  L: number;
  T: number;
  color: string;
  dark: string;
  light: string;
  glass: string;
  style: CarStyle;
  hidden: boolean;
}) {
  const { kind, L, T, glass, style } = p;
  const lamp = Math.max(3, T * 0.14);
  const roof = style === 'retro' ? '#F4F1DE' : p.light;
  const parts: React.ReactNode[] = [];
  if (kind === 'car') {
    // arka cam, tavan, ön cam
    parts.push(<View key="rw" style={[abs, { left: L * 0.14, top: T * 0.16, width: L * 0.1, height: T * 0.68, backgroundColor: glass, borderRadius: 3 }]} />);
    parts.push(<View key="rf" style={[abs, { left: L * 0.26, top: T * 0.14, width: L * 0.32, height: T * 0.72, backgroundColor: roof, borderRadius: 4, opacity: style === 'retro' ? 1 : 0.55 }]} />);
    parts.push(<View key="fw" style={[abs, { left: L * 0.6, top: T * 0.12, width: L * 0.14, height: T * 0.76, backgroundColor: glass, borderRadius: 4 }]} />);
  } else if (kind === 'bus') {
    parts.push(<View key="rf" style={[abs, { left: L * 0.05, top: T * 0.18, width: L * 0.76, height: T * 0.64, backgroundColor: roof, borderRadius: 4, opacity: style === 'retro' ? 1 : 0.5 }]} />);
    for (let i = 0; i < 4; i++)
      parts.push(<View key={`v${i}`} style={[abs, { left: L * (0.1 + i * 0.17), top: T * 0.38, width: L * 0.1, height: T * 0.24, backgroundColor: p.dark, borderRadius: 2, opacity: 0.5 }]} />);
    parts.push(<View key="fw" style={[abs, { left: L * 0.84, top: T * 0.1, width: L * 0.09, height: T * 0.8, backgroundColor: glass, borderRadius: 3 }]} />);
  } else {
    // tır: dorse + kabin
    parts.push(<View key="tr" style={[abs, { left: L * 0.03, top: T * 0.1, width: L * 0.68, height: T * 0.8, backgroundColor: style === 'retro' ? '#F4F1DE' : p.light, borderRadius: 3, opacity: style === 'retro' ? 1 : 0.6 }]} />);
    parts.push(<View key="l1" style={[abs, { left: L * 0.08, top: T * 0.33, width: L * 0.58, height: 2, backgroundColor: p.dark, opacity: 0.45 }]} />);
    parts.push(<View key="l2" style={[abs, { left: L * 0.08, top: T * 0.62, width: L * 0.58, height: 2, backgroundColor: p.dark, opacity: 0.45 }]} />);
    parts.push(<View key="gap" style={[abs, { left: L * 0.72, top: 0, width: L * 0.03, height: T, backgroundColor: p.dark }]} />);
    parts.push(<View key="fw" style={[abs, { left: L * 0.86, top: T * 0.12, width: L * 0.08, height: T * 0.76, backgroundColor: glass, borderRadius: 3 }]} />);
  }
  if (style === 'parlak')
    parts.push(<View key="gl" style={[abs, { left: L * 0.08, top: T * 0.08, width: L * 0.5, height: T * 0.14, backgroundColor: '#FFFFFF', opacity: 0.45, borderRadius: T }]} />);
  if (!p.hidden) {
    parts.push(<View key="h1" style={[abs, { right: 1, top: T * 0.1, width: lamp * 0.7, height: lamp, backgroundColor: '#FFE066', borderRadius: 2 }]} />);
    parts.push(<View key="h2" style={[abs, { right: 1, bottom: T * 0.1, width: lamp * 0.7, height: lamp, backgroundColor: '#FFE066', borderRadius: 2 }]} />);
    parts.push(<View key="t1" style={[abs, { left: 1, top: T * 0.12, width: lamp * 0.5, height: lamp * 0.8, backgroundColor: '#FF4D4D', borderRadius: 2 }]} />);
    parts.push(<View key="t2" style={[abs, { left: 1, bottom: T * 0.12, width: lamp * 0.5, height: lamp * 0.8, backgroundColor: '#FF4D4D', borderRadius: 2 }]} />);
  }
  return <>{parts}</>;
}

const abs = { position: 'absolute' as const };

/** Duraktaki aracın koltukları: dolu olanlar yolcu renginde */
function Seats({ p, size }: { p: Parked; size: number }) {
  const cap = capOf(p.v);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2, marginTop: 4, maxWidth: size * 5 + 8 }}>
      {Array.from({ length: cap }, (_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: i < p.filled ? COLORS[p.v.color] : 'transparent',
            borderWidth: 1,
            borderColor: i < p.filled ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
          }}
        />
      ))}
    </View>
  );
}

/** Piksel yolcu: kafa + renkli gövde */
export function PersonView({ color, size, front, vip }: { color: number; size: number; front?: boolean; vip?: boolean }) {
  const ctx = useContext(SkinCtx);
  const head = size * 0.38;
  return (
    <View style={{ width: size * 0.62, height: size, alignItems: 'center' }}>
      {vip && (
        <Text style={{ position: 'absolute', top: -size * 0.42, fontSize: size * 0.36, zIndex: 2 }} accessibilityLabel="VIP">
          👑
        </Text>
      )}
      <View style={{ width: head, height: head, borderRadius: 3, backgroundColor: '#FFD7B0', borderWidth: front ? 1.5 : 0, borderColor: '#FFFFFF' }} />
      <View
        style={{
          marginTop: 1,
          width: size * 0.58,
          height: size * 0.56,
          borderTopLeftRadius: size * 0.2,
          borderTopRightRadius: size * 0.2,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          backgroundColor: COLORS[color],
          borderWidth: front ? 1.5 : 0,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {ctx.colorBlind && <Text style={{ fontSize: size * 0.28, fontWeight: '900', color: 'rgba(18,20,28,0.8)' }}>{SYMBOLS[color]}</Text>}
      </View>
    </View>
  );
}

/** Kilitli aracın üstündeki rozet: anahtar renginde daire + kilit */
function LockBadge({ color, size }: { color: number; size: number }) {
  const ctx = useContext(SkinCtx);
  return (
    <View pointerEvents="none" style={[styles.centerAbs]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: COLORS[color],
          borderWidth: 2,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.5 }}>{ctx.colorBlind ? SYMBOLS[color] : '🔒'}</Text>
      </View>
    </View>
  );
}

/** Bariyer: sarı-siyah blok, kalkmasına kaç araç kaldığını gösterir */
function BarrierView({ left, top, cs, n }: { left: number; top: number; cs: number; n: number }) {
  const pad = Math.max(3, cs * 0.1);
  const stripes = 4;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: left + pad, top: top + pad, width: cs - pad * 2, height: cs - pad * 2 }}>
      <View style={{ flex: 1, borderRadius: 6, overflow: 'hidden', borderWidth: 2, borderColor: '#1A1D26', flexDirection: 'row' }}>
        {Array.from({ length: stripes }, (_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? '#1A1D26' : '#FFD23F' }} />
        ))}
      </View>
      <View style={[styles.centerAbs]}>
        <View style={styles.barrierCount}>
          <Text style={styles.barrierCountText}>{n}</Text>
        </View>
      </View>
    </View>
  );
}

/** Öğreticide hedef araç: nabız gibi atan halka + parmak */
function Pointer({ x, y, size }: { x: number; y: number; size: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  const r = size * 0.9;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - r / 2, top: y - r / 2, width: r, height: r }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: r,
          borderWidth: 3,
          borderColor: UI.accent,
          opacity: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }),
          transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.25] }) }],
        }}
      />
      <Animated.Text
        style={{
          position: 'absolute',
          left: r * 0.45,
          top: r * 0.45,
          fontSize: size * 0.7,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.15] }) }],
        }}
      >
        👆
      </Animated.Text>
    </View>
  );
}

/** Tanıtım kartındaki küçük resim */
function IntroPicture({ f }: { f: Feature }) {
  if (f === 'barrier') return <BarrierView left={0} top={0} cs={64} n={3} />;
  if (f === 'vip')
    return (
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', paddingTop: 16 }}>
        <PersonView color={5} size={40} vip front />
        <PersonView color={0} size={30} />
        <PersonView color={3} size={30} />
      </View>
    );
  const v = { kind: 'car' as const, color: f === 'lock' ? 7 : 3, dir: 'right' as const };
  return (
    <View>
      <VehicleView v={v} length={110} thickness={52} hidden={f === 'hidden'} />
      {f === 'lock' && <LockBadge color={2} size={34} />}
    </View>
  );
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function tint(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Alttaki araç kartı (Glugo'daki gibi): simge + ad, sağ üstte hak sayısı ya da coin fiyatı */
function Tool(props: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  badge?: { text: string; coin: boolean };
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [styles.tool, props.active && { borderColor: UI.accent }, { opacity: props.disabled ? 0.4 : pressed ? 0.75 : 1 }]}
    >
      <Text style={styles.toolIcon}>{props.icon}</Text>
      <Text style={styles.toolText} numberOfLines={1}>
        {props.label}
      </Text>
      {props.badge && (
        <View style={[styles.badge, props.badge.coin && { backgroundColor: UI.gold }]}>
          <Text style={styles.badgeText}>{props.badge.coin ? `●${props.badge.text}` : props.badge.text}</Text>
        </View>
      )}
    </Pressable>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { color: UI.text, fontSize: 20, fontWeight: '700' },
  hard: { color: UI.danger, fontSize: 12, fontWeight: '700', marginTop: 2 },
  headerSide: { minWidth: 80 },
  headerBtn: { color: UI.dim, fontSize: 17 },
  coinText: { color: UI.gold, fontWeight: '700', fontSize: 16 },
  queue: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 48,
  },
  more: { color: UI.dim, fontSize: 12, fontWeight: '700', marginLeft: 4, marginBottom: 4 },
  dock: { marginTop: 10, borderRadius: 16, borderWidth: 2, paddingTop: 4, paddingBottom: 8, paddingHorizontal: 10, overflow: 'hidden' },
  dockLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, opacity: 0.8, marginBottom: 4 },
  slots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  slot: {
    height: 64,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingTop: 6,
  },
  info: { color: UI.dim, textAlign: 'center', marginVertical: 10, minHeight: 18, fontSize: 13 },
  vipBadge: { position: 'absolute', top: -10, right: -18, backgroundColor: UI.gold, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  vipBadgeText: { color: UI.bg, fontSize: 11, fontWeight: '900' },
  barrierCount: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  barrierCountText: { color: '#1A1D26', fontWeight: '900', fontSize: 13 },
  tutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: UI.panel,
    borderColor: UI.accent,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
    minHeight: 44,
  },
  tutText: { flex: 1, color: UI.text, fontSize: 14, fontWeight: '600' },
  tutBtn: { backgroundColor: UI.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  tutBtnText: { color: UI.bg, fontWeight: '800' },
  introTag: { color: UI.gold, fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  centerAbs: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  glow: { shadowColor: UI.accent, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 12 },
  tool: {
    backgroundColor: UI.panel,
    borderRadius: 14,
    width: 64,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toolIcon: { color: UI.text, fontSize: 18 },
  toolText: { color: UI.text, fontWeight: '600', fontSize: 11, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: UI.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: UI.bg, fontSize: 11, fontWeight: '800' },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,10,16,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { width: '86%', backgroundColor: UI.panel, borderRadius: 22, padding: 24, alignItems: 'center', gap: 4 },
  overTitle: { color: UI.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  overSub: { color: UI.dim, textAlign: 'center' },
  newCar: { alignItems: 'center', backgroundColor: UI.bg2, borderRadius: 16, padding: 12, marginTop: 10, alignSelf: 'stretch' },
  newCarTitle: { color: UI.gold, fontWeight: '900', fontSize: 16 },
  reward: { color: UI.gold, fontSize: 18, fontWeight: '700', marginVertical: 8 },
  stars: { color: UI.gold, fontSize: 40, letterSpacing: 4 },
});

