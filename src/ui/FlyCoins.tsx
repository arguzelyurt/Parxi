// Ödül animasyonu: coinler basılan yerden çıkıp üstteki coin sayacına uçar, sayaç zıplar.
// Kullanım: const fly = useFlyCoins(); fly(fromRef, miktar, () => kaydet())
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ICONS } from './icons';

type Pt = { x: number; y: number };
interface Flight {
  id: number;
  from: Pt;
  to: Pt;
  count: number;
}

interface Ctx {
  /** `from` ölçülebilen bir görünüm (ref) ya da ekran noktası; bitince onDone */
  fly(from: View | Pt | null, amount: number, onDone?: () => void): void;
  /** Coin sayacı kendini hedef olarak kaydeder */
  setTarget(v: View | null): void;
  /** Sayaç "zıplama" değeri (0→1→0) */
  bump: Animated.Value;
}

const FlyCtx = createContext<Ctx | null>(null);

export const useFlyCoins = () => useContext(FlyCtx);

const measure = (v: View): Promise<Pt | null> =>
  new Promise((res) => {
    try {
      v.measureInWindow((x, y, w, h) => res(w || h ? { x: x + w / 2, y: y + h / 2 } : null));
    } catch {
      res(null);
    }
  });

export function FlyCoinsProvider({ children }: { children: React.ReactNode }) {
  const target = useRef<View | null>(null);
  const bump = useRef(new Animated.Value(0)).current;
  const [flights, setFlights] = useState<Flight[]>([]);
  const nextId = useRef(1);

  const fly = useCallback<Ctx['fly']>(
    async (from, amount, onDone) => {
      const start = from && 'measureInWindow' in from ? await measure(from as View) : (from as Pt | null);
      const end = target.current ? await measure(target.current) : null;
      if (!start || !end) {
        onDone?.();
        return;
      }
      const count = Math.max(5, Math.min(12, Math.round(amount / 6)));
      const id = nextId.current++;
      setFlights((f) => [...f, { id, from: start, to: end, count }]);
      // Coinler varınca: kaydet, sayaç zıplasın
      setTimeout(() => {
        onDone?.();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        bump.setValue(0);
        Animated.sequence([
          Animated.timing(bump, { toValue: 1, duration: 140, useNativeDriver: true }),
          Animated.spring(bump, { toValue: 0, friction: 4, useNativeDriver: true }),
        ]).start();
      }, 820);
      setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 1400);
    },
    [bump],
  );

  const setTarget = useCallback((v: View | null) => {
    if (v) target.current = v;
  }, []);

  return (
    <FlyCtx.Provider value={{ fly, setTarget, bump }}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        {flights.map((f) => (
          <Burst key={f.id} f={f} />
        ))}
      </View>
    </FlyCtx.Provider>
  );
}

function Burst({ f }: { f: Flight }) {
  const coins = useRef(
    Array.from({ length: f.count }, (_, i) => ({
      t: new Animated.Value(0),
      // önce etrafa saçılır, sonra kavisle sayaca gider
      dx: Math.cos((i / f.count) * Math.PI * 2) * (36 + (i % 3) * 14),
      dy: Math.sin((i / f.count) * Math.PI * 2) * (30 + (i % 2) * 16) - 20,
      delay: i * 35,
    })),
  ).current;
  React.useEffect(() => {
    Animated.parallel(
      coins.map((c) =>
        Animated.sequence([
          Animated.delay(c.delay),
          Animated.timing(c.t, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]),
      ),
    ).start();
  }, [coins]);
  const S = 26;
  return (
    <>
      {coins.map((c, i) => {
        const tx = c.t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [f.from.x, f.from.x + c.dx, f.to.x] });
        const ty = c.t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [f.from.y, f.from.y + c.dy, f.to.y] });
        const sc = c.t.interpolate({ inputRange: [0, 0.15, 0.3, 0.9, 1], outputRange: [0.2, 1.25, 1, 0.8, 0.4] });
        const op = c.t.interpolate({ inputRange: [0, 0.05, 0.92, 1], outputRange: [0, 1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: -S / 2,
              top: -S / 2,
              opacity: op,
              transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
            }}
          >
            <Image source={ICONS.coin} style={{ width: S, height: S }} />
          </Animated.View>
        );
      })}
    </>
  );
}
