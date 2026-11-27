// Haritadaki küçük döngülü hareketler: zıplama, nabız, sallanma, yanıp sönme, kayma.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

function useLoop(make: (v: Animated.Value) => Animated.CompositeAnimation, on = true, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const loop = Animated.loop(make(v));
    const id = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(id);
      loop.stop();
      v.setValue(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, delay]);
  return v;
}

const pingPong = (v: Animated.Value, ms: number) =>
  Animated.sequence([
    Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
  ]);

/** Aşağı yukarı zıplar */
export function Bob({ children, px = 4, ms = 550, delay = 0, on = true, style }: { children: React.ReactNode; px?: number; ms?: number; delay?: number; on?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useLoop((x) => pingPong(x, ms), on, delay);
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -px] }) }] }]}>{children}</Animated.View>;
}

/** Hafifçe büyüyüp küçülür */
export function Pop({ children, k = 1.08, ms = 650, on = true, style }: { children: React.ReactNode; k?: number; ms?: number; on?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useLoop((x) => pingPong(x, ms), on);
  return <Animated.View style={[style, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, k] }) }] }]}>{children}</Animated.View>;
}

/** Dışa doğru genişleyip kaybolan halka */
export function PulseRing({ size, color, radius, on = true }: { size: { w: number; h: number }; color: string; radius: number; on?: boolean }) {
  const v = useLoop((x) => Animated.timing(x, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }), on);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size.w,
        height: size.h,
        borderRadius: radius,
        borderWidth: 3,
        borderColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
      }}
    />
  );
}

/** Ara ara sallanır (sandık, kilit) */
export function Shake({ children, every = 2400, on = true, style }: { children: React.ReactNode; every?: number; on?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(
    (x) =>
      Animated.sequence([
        Animated.delay(every),
        Animated.timing(x, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(x, { toValue: -1, duration: 120, useNativeDriver: true }),
        Animated.timing(x, { toValue: 0.6, duration: 100, useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]),
    on,
  );
  return <Animated.View style={[style, { transform: [{ rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) }] }]}>{children}</Animated.View>;
}

/** Yanıp söner (trafik lambası, boş park yeri) */
export function Blink({ children, ms = 1000, delay = 0, style }: { children: React.ReactNode; ms?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(
    (x) =>
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.delay(ms),
        Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(ms),
      ]),
    true,
    delay,
  );
  return <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }]}>{children}</Animated.View>;
}

/** Sürekli soldan sağa kayar (bulut) */
export function Drift({ children, from, to, ms, offset = 0, style }: { children: React.ReactNode; from: number; to: number; ms: number; offset?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop((x) => Animated.timing(x, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
  const o = Math.max(0, Math.min(0.99, offset));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          transform: [
            {
              translateX: v.interpolate({
                inputRange: [0, 1 - o, 1 - o + 0.0001, 1],
                outputRange: [from + (to - from) * o, to, from, from + (to - from) * o],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Bir yol boyunca dolaşan öğe. points: [x, y, dönüş(derece), aynala(-1/1)] köşe noktaları;
 * öğe noktalar arasında düz gider ve köşede döner. offset: başlangıç payı (0–1).
 */
export function PathMover({
  points,
  ms,
  offset = 0,
  fadeEnds,
  children,
}: {
  points: [number, number, number, number][];
  ms: number;
  offset?: number;
  /** Açık yol: başta ve sonda görünmez olur (baştan yeniden başlarken atlama görünmesin) */
  fadeEnds?: boolean;
  children: React.ReactNode;
}) {
  const v = useLoop((x) => Animated.timing(x, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
  // Uzunluğa göre zaman payları
  const seg = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = seg.reduce((a, b) => a + b, 0) || 1;
  const ts = [0];
  seg.forEach((l) => ts.push(ts[ts.length - 1] + l / total));
  ts[ts.length - 1] = 1;
  // offset: zamanı kaydır (0..1 döngüsünde başka yerden başlasın)
  const shift = (t: number) => (t + offset) % 1;
  const samples: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const rs: string[] = [];
  const ss: number[] = [];
  const os: number[] = [];
  const at = (t: number) => {
    let i = 0;
    while (i < ts.length - 2 && ts[i + 1] < t) i++;
    const f = ts[i + 1] === ts[i] ? 0 : (t - ts[i]) / (ts[i + 1] - ts[i]);
    const a = points[i];
    const b = points[i + 1];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, r: a[2], s: a[3] };
  };
  const N = 60;
  for (let k = 0; k <= N; k++) {
    const input = k / N;
    const tt = shift(input);
    os.push(fadeEnds && (tt < 0.04 || tt > 0.96) ? 0 : 1);
    const p = at(tt);
    samples.push(input);
    xs.push(p.x);
    ys.push(p.y);
    rs.push(`${p.r}deg`);
    ss.push(p.s);
  }
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        opacity: v.interpolate({ inputRange: samples, outputRange: os }),
        transform: [
          { translateX: v.interpolate({ inputRange: samples, outputRange: xs }) },
          { translateY: v.interpolate({ inputRange: samples, outputRange: ys }) },
          { rotate: v.interpolate({ inputRange: samples, outputRange: rs }) },
          { scaleX: v.interpolate({ inputRange: samples, outputRange: ss }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
