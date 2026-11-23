import React, { useMemo } from 'react';
import { View } from 'react-native';
import { CarModel, carPalette } from '../core/garage';
import { UI } from '../game/palette';

interface Run {
  x: number;
  y: number;
  n: number;
  color: string;
}

/** Aynı renkteki yatay pikselleri tek parça yapar: bir araba ~80 View, 600 değil. */
function runsOf(m: CarModel, silhouette: boolean): Run[] {
  const pal = carPalette(m);
  const out: Run[] = [];
  m.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') {
        x++;
        continue;
      }
      const color = silhouette ? UI.secret : pal[ch] ?? '#FF00FF';
      let n = 1;
      while (x + n < row.length && row[x + n] !== '.' && (silhouette || row[x + n] === ch)) n++;
      out.push({ x, y, n, color });
      x += n;
    }
  });
  return out;
}

/** Piksel araba. width: çizim genişliği (piksel boyutu buna göre); silhouette: kilitli model. */
export default function CarArt({ model, width, silhouette }: { model: CarModel; width: number; silhouette?: boolean }) {
  const cols = Math.max(...model.rows.map((r) => r.length));
  const px = Math.max(1, Math.floor(width / cols));
  const runs = useMemo(() => runsOf(model, !!silhouette), [model, silhouette]);
  return (
    <View style={{ width: px * cols, height: px * model.rows.length }}>
      {runs.map((r, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: r.x * px, top: r.y * px, width: r.n * px, height: px, backgroundColor: r.color }}
        />
      ))}
    </View>
  );
}
