// Marketteki görünümlerin çizimi: yolcu görünümleri (önden ve tepeden), kutlama efektleri, durak süs bandı.
// Kural: yolcunun gövde rengi hep oyundaki renk; görünüm yalnız kafaya/aksesuara dokunur.

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { COLORS } from '../game/palette';
import { RiderSkin } from '../game/skins';

const SKIN = '#FFD7B0';

const tri = (w: number, h: number, color: string, dir: 'up' | 'down' = 'up') => ({
  width: 0,
  height: 0,
  borderLeftWidth: w / 2,
  borderRightWidth: w / 2,
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  ...(dir === 'up' ? { borderBottomWidth: h, borderBottomColor: color } : { borderTopWidth: h, borderTopColor: color }),
});

/** Önden yolcu kafası (sıradaki yolcular). `s` = kafa boyu. */
export function HeadFront({ skin, s, front }: { skin: RiderSkin; s: number; front?: boolean }) {
  const ring = front ? { borderWidth: 1.5, borderColor: '#FFFFFF' } : null;
  const eye = (left: number, color = '#1A1D26') => (
    <View style={{ position: 'absolute', top: s * 0.42, left, width: s * 0.14, height: s * 0.14, borderRadius: s, backgroundColor: color }} />
  );
  switch (skin) {
    case 'robot':
      return (
        <View style={{ width: s, height: s, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: -s * 0.32, width: 2, height: s * 0.32, backgroundColor: '#9AA3B2' }} />
          <View style={{ position: 'absolute', top: -s * 0.42, width: s * 0.2, height: s * 0.2, borderRadius: s, backgroundColor: '#FF4D4D' }} />
          <View style={[{ width: s, height: s, borderRadius: 2, backgroundColor: '#B8C0CC' }, ring]}>
            {eye(s * 0.18, '#3DF5FF')}
            {eye(s * 0.62, '#3DF5FF')}
          </View>
        </View>
      );
    case 'astronot':
      return (
        <View style={[{ width: s * 1.25, height: s * 1.2, borderRadius: s, backgroundColor: '#F4F7FB', alignItems: 'center', justifyContent: 'center', marginTop: -s * 0.15 }, ring]}>
          <View style={{ width: s * 0.8, height: s * 0.6, borderRadius: s * 0.3, backgroundColor: '#2C4A6E' }} />
        </View>
      );
    case 'uzayli':
      return (
        <View style={{ width: s, height: s, alignItems: 'center' }}>
          {[-1, 1].map((d) => (
            <View key={d} style={{ position: 'absolute', top: -s * 0.4, left: s / 2 + d * s * 0.28 - 1, width: 2, height: s * 0.4, backgroundColor: '#7BE36B', transform: [{ rotate: `${d * 20}deg` }] }} />
          ))}
          <View style={[{ width: s, height: s, borderRadius: s * 0.45, backgroundColor: '#7BE36B' }, ring]}>
            {eye(s * 0.16)}
            {eye(s * 0.66)}
          </View>
        </View>
      );
    default: {
      return (
        <View style={{ width: s, height: s, alignItems: 'center' }}>
          {skin === 'kedi' && (
            <View style={{ position: 'absolute', top: -s * 0.28, width: s, flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={tri(s * 0.38, s * 0.36, '#E8B48A')} />
              <View style={tri(s * 0.38, s * 0.36, '#E8B48A')} />
            </View>
          )}
          <View style={[{ width: s, height: s, borderRadius: skin === 'kedi' || skin === 'kopek' ? s * 0.4 : 3, backgroundColor: SKIN }, ring]} />
          {skin === 'kopek' &&
            [-1, 1].map((d) => (
              <View
                key={d}
                style={{ position: 'absolute', top: s * 0.05, [d < 0 ? 'left' : 'right']: -s * 0.22, width: s * 0.3, height: s * 0.7, borderRadius: s * 0.15, backgroundColor: '#8A5A3B' }}
              />
            ))}
          {skin === 'sapka' && (
            <>
              <View style={{ position: 'absolute', top: -s * 0.42, width: s * 0.78, height: s * 0.46, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: '#3B2A1E' }} />
              <View style={{ position: 'absolute', top: -s * 0.02, width: s * 1.35, height: s * 0.14, borderRadius: 2, backgroundColor: '#3B2A1E' }} />
            </>
          )}
          {skin === 'korsan' && (
            <>
              <View style={{ position: 'absolute', top: -s * 0.08, width: s * 1.05, height: s * 0.34, borderTopLeftRadius: s * 0.4, borderTopRightRadius: s * 0.4, backgroundColor: '#E53935' }} />
              <View style={{ position: 'absolute', top: s * 0.4, left: s * 0.14, width: s * 0.3, height: s * 0.26, borderRadius: s, backgroundColor: '#1A1D26' }} />
              <View style={{ position: 'absolute', top: s * 0.36, width: s, height: 1.5, backgroundColor: '#1A1D26', transform: [{ rotate: '-18deg' }] }} />
            </>
          )}
        </View>
      );
    }
  }
}

/** Tepeden yolcu kafası (araçtaki koltukta). `s` = kafa çapı. */
export function HeadTop({ skin, s }: { skin: RiderSkin; s: number }) {
  const base = (bg: string, r = s, extra: object = {}) => ({ width: s, height: s, borderRadius: r, backgroundColor: bg, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)', ...extra });
  switch (skin) {
    case 'sapka':
      return (
        <View style={{ width: s * 1.5, height: s * 1.5, borderRadius: s, backgroundColor: '#3B2A1E', alignItems: 'center', justifyContent: 'center' }}>
          <View style={base('#5A4130')} />
        </View>
      );
    case 'korsan':
      return <View style={base('#E53935')} />;
    case 'kedi':
      return (
        <View style={{ alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: -s * 0.2, width: s * 1.1, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={tri(s * 0.42, s * 0.4, '#E8B48A')} />
            <View style={tri(s * 0.42, s * 0.4, '#E8B48A')} />
          </View>
          <View style={base(SKIN)} />
        </View>
      );
    case 'kopek':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: s * 0.3, height: s * 0.7, borderRadius: s, backgroundColor: '#8A5A3B', marginRight: -s * 0.1 }} />
          <View style={base(SKIN)} />
          <View style={{ width: s * 0.3, height: s * 0.7, borderRadius: s, backgroundColor: '#8A5A3B', marginLeft: -s * 0.1 }} />
        </View>
      );
    case 'robot':
      return (
        <View style={base('#B8C0CC', 2, { alignItems: 'center', justifyContent: 'center' })}>
          <View style={{ width: s * 0.3, height: s * 0.3, borderRadius: s, backgroundColor: '#FF4D4D' }} />
        </View>
      );
    case 'astronot':
      return (
        <View style={base('#F4F7FB', s, { width: s * 1.2, height: s * 1.2, alignItems: 'center', justifyContent: 'center' })}>
          <View style={{ width: s * 0.55, height: s * 0.4, borderRadius: s * 0.2, backgroundColor: '#2C4A6E' }} />
        </View>
      );
    case 'uzayli':
      return <View style={base('#7BE36B')} />;
    default:
      return <View style={base(SKIN)} />;
  }
}

/** Durak üstünde ince süs bandı (şerit) */
export function StopBand({ colors }: { colors: string[] }) {
  return (
    <View style={{ flexDirection: 'row', height: 5, overflow: 'hidden', marginHorizontal: -12 }}>
      {Array.from({ length: 60 }, (_, i) => (
        <View key={i} style={{ width: 14, height: 5, backgroundColor: colors[i % colors.length] }} />
      ))}
    </View>
  );
}

// ---------- Kutlama efektleri ----------

const FX_COLORS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => COLORS[i]);

function seeded(i: number, k: number) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Seviye sonunda ekranın üstünde oynayan kutlama. `kind` = 'sade' ise hiçbir şey çizmez. */
export function WinFx({ kind, width, height }: { kind: string; width: number; height: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (kind === 'sade') return;
    const anim = Animated.loop(Animated.timing(a, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true }), { iterations: 2 });
    anim.start();
    return () => anim.stop();
  }, [a, kind]);
  const parts = useMemo(() => Array.from({ length: kind === 'havai' ? 3 : 22 }, (_, i) => i), [kind]);
  if (kind === 'sade') return null;

  if (kind === 'havai') {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        {parts.map((b) => {
          const cx = width * (0.2 + b * 0.3);
          const cy = height * (0.18 + seeded(b, 1) * 0.15);
          const t0 = b * 0.18;
          const p = a.interpolate({ inputRange: [0, t0, Math.min(1, t0 + 0.55), 1], outputRange: [0, 0, 1, 1] });
          const op = a.interpolate({ inputRange: [0, t0, t0 + 0.05, Math.min(1, t0 + 0.6), 1], outputRange: [0, 0, 1, 0, 0] });
          return Array.from({ length: 12 }, (_, j) => {
            const ang = (j / 12) * Math.PI * 2;
            const r = 70 + seeded(b, j) * 20;
            return (
              <Animated.View
                key={`${b}-${j}`}
                style={{
                  position: 'absolute',
                  left: cx - 4,
                  top: cy - 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: FX_COLORS[(b * 3 + j) % 8],
                  opacity: op,
                  transform: [
                    { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * r] }) },
                    { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * r + 20] }) },
                  ],
                }}
              />
            );
          });
        })}
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {parts.map((i) => {
        const x = seeded(i, 1) * width;
        const delay = seeded(i, 2) * 0.5;
        const up = kind === 'balon';
        const y = a.interpolate({
          inputRange: [0, delay, 1],
          outputRange: up ? [height + 60, height + 60, -80] : [-40, -40, height * (0.7 + seeded(i, 3) * 0.3)],
        });
        const sway = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (seeded(i, 4) - 0.5) * 60, 0] });
        const rot = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(seeded(i, 5) - 0.5) * 720}deg`] });
        const color = FX_COLORS[i % 8];
        let body: React.ReactNode;
        if (kind === 'konfeti') body = <View style={{ width: 8, height: 14, borderRadius: 2, backgroundColor: color }} />;
        else if (kind === 'yildiz') body = <Text style={{ fontSize: 18 + seeded(i, 6) * 14, color: '#FFD23F' }}>★</Text>;
        else
          body = (
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 26, height: 32, borderRadius: 14, backgroundColor: color }} />
              <View style={{ width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.6)' }} />
            </View>
          );
        return (
          <Animated.View
            key={i}
            style={{ position: 'absolute', left: x, top: 0, transform: [{ translateY: y }, { translateX: sway }, ...(kind === 'balon' ? [] : [{ rotate: rot }])] }}
          >
            {body}
          </Animated.View>
        );
      })}
    </View>
  );
}
