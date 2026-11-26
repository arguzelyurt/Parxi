import type { Kind } from '../core/rules';

/** Saydam tavanın (koltuklu kabin) görseldeki yeri (sağa bakan araç, oranlar 0..1). scripts/make_vehicles.py CABIN ile aynı. */
export const CABIN: Record<Kind, { x0: number; x1: number; y0: number; y1: number }> = {
  car: { x0: 0.22, x1: 0.58, y0: 0.19, y1: 0.81 },
  bus: { x0: 0.08, x1: 0.83, y0: 0.2, y1: 0.8 },
  truck: { x0: 0.06, x1: 0.66, y0: 0.19, y1: 0.81 },
};

/** Durakta araç biraz daha kalın çizilir ki koltuklar seçilebilsin (otobüs ve tır ince görünmesin). */
export const DOCK_THICKEN: Record<Kind, number> = { car: 1, bus: 1.25, truck: 1.45 };

/** Koltuk ızgarası: her zaman 2 sıra; sütun = kapasite / 2. Dolum sırası: arkadan öne, üst sonra alt. */
export function seatGrid(cap: number): { cols: number; rows: number; order: { col: number; row: number }[] } {
  const rows = 2;
  const cols = Math.ceil(cap / rows);
  const order: { col: number; row: number }[] = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (order.length < cap) order.push({ col: c, row: r });
  return { cols, rows, order };
}
