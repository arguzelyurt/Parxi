// Bulut kayıt birleştirme kuralı (saf, test edilir). Ayrıntı: docs/HESAP.md
// - Daha ileri olan kayıt kazanır: yüksek seviye; eşitse daha çok yıldız; o da eşitse daha yeni kayıt.
// - Coin ve güçlendiriciler kazanan kayıttan alınır, toplanmaz (çoğaltma olmasın).
// - Satın alma kimlikleri, sahip olunan kozmetikler ve kalıcı satın almalar iki kaydın birleşimi.

export interface SaveLike {
  level: number;
  stars: Record<string, number>;
  lastSeenAt: number;
  processedPurchases: string[];
  owned: string[];
  removeAds?: boolean;
  skipRewarded: boolean;
  ads: { removeAds: boolean };
}

const starSum = (s: Record<string, number>) => Object.values(s).reduce((a, b) => a + b, 0);

/** a, b'den daha ileri mi */
export function isAhead(a: SaveLike, b: SaveLike): boolean {
  if (a.level !== b.level) return a.level > b.level;
  const sa = starSum(a.stars);
  const sb = starSum(b.stars);
  if (sa !== sb) return sa > sb;
  return a.lastSeenAt >= b.lastSeenAt;
}

const union = (a: string[], b: string[]) => [...new Set([...(a ?? []), ...(b ?? [])])];

export function mergeSaves<T extends SaveLike>(local: T, remote: T): T {
  const win = isAhead(local, remote) ? local : remote;
  const other = win === local ? remote : local;
  const stars: Record<string, number> = { ...other.stars };
  for (const [k, v] of Object.entries(win.stars)) stars[k] = Math.max(v, stars[k] ?? 0);
  return {
    ...win,
    stars,
    processedPurchases: union(win.processedPurchases, other.processedPurchases),
    owned: union(win.owned, other.owned),
    skipRewarded: win.skipRewarded || other.skipRewarded,
    ads: { ...win.ads, removeAds: win.ads.removeAds || other.ads.removeAds },
  };
}

/** İki kayıt belirgin biçimde farklı mı (girişte "hangisi kalsın?" sorulur) */
export function differs(a: SaveLike, b: SaveLike): boolean {
  return a.level !== b.level || starSum(a.stars) !== starSum(b.stars);
}
