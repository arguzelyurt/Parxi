// Canlı parçalar: hareketli Parxi logosu ve arabaların sergilendiği vitrin sahnesi.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { CarModel } from '../core/garage';
import CarArt from './CarArt';

const LOGO_COLORS = ['#FF4D4D', '#FFB020', '#3BCE7A', '#3A86FF', '#B04CFF'];

/** "Parxi": her harf kendi renginde, dalga gibi zıplar */
export function AnimatedLogo({ size = 52 }: { size?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  const letters = 'Parxi'.split('');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {letters.map((ch, i) => {
        const ph = i / letters.length;
        // her harf dalganın farklı anında zıplar
        const pts = [0, 1, 2, 3, 4].map((k) => k / 4);
        const y = t.interpolate({
          inputRange: pts,
          outputRange: pts.map((p) => {
            const d = (((p - ph) % 1) + 1) % 1;
            return d < 0.25 ? -Math.sin((d / 0.25) * Math.PI) * size * 0.18 : 0;
          }),
        });
        const rot = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [`${(i % 2 ? -1 : 1) * 4}deg`, `${(i % 2 ? 1 : -1) * 4}deg`, `${(i % 2 ? -1 : 1) * 4}deg`] });
        return (
          <Animated.View key={i} style={{ transform: [{ translateY: y }, { rotate: rot }] }}>
            <Text
              style={[
                styles.letter,
                { fontSize: size, color: LOGO_COLORS[i % LOGO_COLORS.length], textShadowRadius: size * 0.08 },
              ]}
            >
              {ch}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

/**
 * Vitrin: spot ışığı, parlayan zemin (podyum), süzülen araba, zeminde yansıması ve parıltılar.
 * Araba görselleri scripts/make_cars.py ile üretiliyor; daha gerçekçi (ör. yapay zekâyla üretilmiş)
 * görseller aynı adla assets/cars/ içine konursa burası onları kullanır.
 */
export function Showcase({ model, width, silhouette, glow = '#56CCF2' }: { model: CarModel; width: number; silhouette?: boolean; glow?: string }) {
  const f = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(f, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(f, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [f]);
  const carH = width / 2;
  const float = f.interpolate({ inputRange: [0, 1], outputRange: [0, -carH * 0.05] });
  const shadowScale = f.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
  const sparkles = useMemo(
    () => [
      { x: 0.1, y: 0.2, d: 0 },
      { x: 0.86, y: 0.12, d: 700 },
      { x: 0.72, y: 0.62, d: 1300 },
      { x: 0.2, y: 0.66, d: 1900 },
    ],
    [],
  );
  const H = carH * 1.45;
  return (
    <View style={{ width, height: H, alignItems: 'center', overflow: 'hidden' }}>
      {/* spot ışığı */}
      <View style={[styles.beam, { width: width * 0.78, height: width * 0.78, left: width * 0.11, top: carH * 0.5 - width * 0.39, backgroundColor: glow }]} />
      <View style={[styles.beam, { width: width * 0.5, height: width * 0.5, left: width * 0.25, top: carH * 0.5 - width * 0.25, backgroundColor: glow, opacity: 0.1 }]} />
      {/* podyum */}
      <View style={[styles.podium, { width: width * 0.86, height: carH * 0.3, top: carH * 0.86, borderColor: glow }]} />
      <Animated.View style={[styles.podShadow, { width: width * 0.6, height: carH * 0.1, top: carH * 0.92, transform: [{ scaleX: shadowScale }] }]} />
      {/* araba */}
      <Animated.View style={{ position: 'absolute', top: carH * 0.08, transform: [{ translateY: float }] }}>
        <CarArt model={model} width={width * 0.9} silhouette={silhouette} />
      </Animated.View>
      {/* zeminde yansıma: tekerlek hizasından aşağı, kısa ve silik */}
      {!silhouette && (
        <View pointerEvents="none" style={{ position: 'absolute', top: carH * 0.08 + carH * 0.9 * 0.82, height: carH * 0.22, width, overflow: 'hidden', alignItems: 'center', opacity: 0.14 }}>
          <Animated.View style={{ marginTop: -carH * 0.9 * 0.18, transform: [{ scaleY: -1 }, { translateY: float }] }}>
            <CarArt model={model} width={width * 0.9} />
          </Animated.View>
        </View>
      )}
      {!silhouette && sparkles.map((s, i) => <Sparkle key={i} x={s.x * width} y={s.y * carH} delay={s.d} />)}
    </View>
  );
}

function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.delay(1800 - delay / 2),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a, delay]);
  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: y,
        color: '#FFFFFF',
        fontSize: 22,
        opacity: a,
        transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.2] }) }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }],
      }}
    >
      ✦
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  letter: { fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 4 } },
  beam: { position: 'absolute', opacity: 0.08, borderRadius: 999 },
  podium: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(86,204,242,0.14)', borderWidth: 2 },
  podShadow: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)' },
});
