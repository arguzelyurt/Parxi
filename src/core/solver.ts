// Derinlik öncelikli çözücü, iki sırayla dener:
// 1) Üreticinin çözüm sırası (son yerleştirilen önce çıkar; kimliği büyük olan önce). Oyuncu
//    bu sıradan çok sapmadıysa çözümü hemen bulur.
// 2) Renge göre: önce öndeki yolcunun rengindeki araçlar, sonra rengi kuyrukta en yakın gelenler.
// Görülen durumlar atlanır.

import { capOf, Level, legalMoves, nextNeed, State, stateKey, tap } from './rules';

export interface SolveResult {
  moves: number[] | null;
  /** Düğüm sınırına takıldıysa true (çözümsüz demek değildir) */
  exhausted: boolean;
}

type Order = 'intended' | 'color';

export function solve(level: Level, start: State, maxNodes = 20000): SolveResult {
  const a = search(level, start, Math.ceil(maxNodes / 2), 'intended');
  if (a.moves) return a;
  const b = search(level, start, Math.floor(maxNodes / 2), 'color');
  return b.moves ? b : { moves: null, exhausted: a.exhausted || b.exhausted };
}

function search(level: Level, start: State, maxNodes: number, order: Order): SolveResult {
  const seen = new Set<string>();
  let nodes = 0;
  let exhausted = false;

  const dfs = (s: State, path: number[]): number[] | null => {
    if (s.status === 'won') return path;
    if (s.status === 'stuck') return null;
    if (++nodes > maxNodes) {
      exhausted = true;
      return null;
    }
    const key = stateKey(s);
    if (seen.has(key)) return null;
    seen.add(key);

    const need = nextNeed(level, s);
    // Durakta zaten bekleyen araçların renkleri için yeni araç getirmek genelde gereksiz
    const waiting = new Map<number, number>();
    for (const p of s.dock) if (p) waiting.set(p.v.color, (waiting.get(p.v.color) ?? 0) + capOf(p.v) - p.filled);
    const options = legalMoves(level, s)
      .map((id) => {
        const v = s.lot.find((x) => x.id === id)!;
        const at = need.get(v.color) ?? Infinity;
        if (order === 'intended') return { id, score: -id };
        return { id, score: at + (waiting.has(v.color) ? 1000 : 0) };
      })
      .sort((a, b) => a.score - b.score);
    for (const o of options) {
      const r = tap(level, s, o.id);
      if (typeof r === 'string' || r.status === 'stuck') continue;
      const res = dfs(r, [...path, o.id]);
      if (res) return res;
      if (exhausted) return null;
    }
    return null;
  };

  const moves = dfs(start, []);
  return { moves, exhausted };
}

/** İpucu: çözüm bulunursa ilk hamle (araç kimliği). Telefonda hızlı kalsın diye düğüm sınırı düşük. */
export function hint(level: Level, s: State, maxNodes = 4000): number | null {
  const r = solve(level, s, maxNodes);
  return r.moves && r.moves.length > 0 ? r.moves[0] : null;
}
