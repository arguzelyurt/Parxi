// Seviye haritasının her bölümü için zemin renkleri ve süsler (assets/map, scripts/make_icons.py).
import type { MapProp } from '../ui/icons';

export interface MapTheme {
  /** Zemin: üst ve alt ton */
  ground: [string, string];
  /** Yol rengi (noktalar) */
  path: string;
  props: MapProp[];
  /** Kenarda su şeridi (liman, sahil, ada, köprü) */
  water?: 'left' | 'right';
}

export const MAP_THEMES: Record<string, MapTheme> = {
  mahalle: { ground: ['#7BD389', '#4FB06A'], path: '#FFF6D6', props: ['house', 'tree', 'house2', 'tree', 'lamp'] },
  carsi: { ground: ['#F6C98A', '#E0A462'], path: '#FFFFFF', props: ['shop', 'stall', 'lamp', 'shop', 'balloon'] },
  liman: { ground: ['#E9D8B4', '#D6BE8E'], path: '#FFFFFF', props: ['crane', 'lighthouse', 'boat', 'boat'], water: 'left' },
  gar: { ground: ['#C9B8E8', '#A894D4'], path: '#FFFFFF', props: ['station', 'train', 'lamp', 'tree'] },
  havalimani: { ground: ['#A8E6E0', '#7CCFC6'], path: '#FFFFFF', props: ['tower', 'plane', 'flag', 'plane'] },
  stadyum: { ground: ['#7BD389', '#3FA25C'], path: '#FFFFFF', props: ['stadium', 'flag', 'balloon', 'lamp'] },
  sahil: { ground: ['#FFE6A8', '#F4CF7A'], path: '#FFFFFF', props: ['umbrella', 'palm', 'boat', 'umbrella'], water: 'right' },
  orman: { ground: ['#6CC07C', '#3C8F50'], path: '#FFF6D6', props: ['pine', 'tree', 'pine', 'house2'] },
  dag: { ground: ['#B9C7A8', '#8FA383'], path: '#FFFFFF', props: ['mountain', 'pine', 'mountainSnow', 'flag'] },
  col: { ground: ['#F7D58A', '#E8B65E'], path: '#FFFFFF', props: ['pyramid', 'cactus', 'cactus', 'mesa'] },
  kar: { ground: ['#EAF4FF', '#C9DEF2'], path: '#7FB8E6', props: ['snowman', 'pineSnow', 'mountainSnow', 'pineSnow'] },
  kanyon: { ground: ['#F0A27A', '#D9734A'], path: '#FFF6D6', props: ['mesa', 'cactus', 'mesa', 'flag'] },
  ada: { ground: ['#FFE6A8', '#9ED99B'], path: '#FFFFFF', props: ['palm', 'lighthouse', 'boat', 'palm'], water: 'left' },
  kopru: { ground: ['#B8D8F0', '#8DBEE0'], path: '#FFFFFF', props: ['bridge', 'boat', 'lamp', 'bridge'], water: 'right' },
  festival: { ground: ['#F7B5D9', '#E58AC0'], path: '#FFFFFF', props: ['ferris', 'tent', 'balloon', 'tent'] },
  neon: { ground: ['#3A2A6E', '#22184A'], path: '#56CCF2', props: ['skyscraper', 'lamp', 'skyscraper', 'balloon'] },
  saray: { ground: ['#E8D9B0', '#CDB57E'], path: '#FFFFFF', props: ['castle', 'flag', 'tree', 'castle'] },
  uzay: { ground: ['#1C1F4A', '#0C0E2A'], path: '#FFE066', props: ['rocket', 'planet', 'star', 'planet'] },
  yildiz: { ground: ['#2A1C5A', '#140C33'], path: '#FFE066', props: ['star', 'planet', 'rocket', 'star'] },
  zirve: { ground: ['#DCE8F5', '#A9C1DA'], path: '#3A86FF', props: ['mountainSnow', 'flag', 'pineSnow', 'mountainSnow'] },
};

export const themeOfMap = (key: string): MapTheme => MAP_THEMES[key] ?? MAP_THEMES.mahalle;

/** Haritalar 3'erli kısımlar hâlinde açılır: bitmemiş kısmın sonrası bulut altında görünmez */
export const GROUP = 3;
export const visibleMapCount = (currentIndex: number, total: number): number =>
  Math.min(total, (Math.floor(currentIndex / GROUP) + 1) * GROUP);
