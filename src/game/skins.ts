// Marketteki kozmetiklerin görünümü. Kimlikler core/market.ts ile aynı.

import { UI } from './palette';

export interface Theme {
  bg: string;
  /** Otopark zemini */
  board: string;
  /** Yol ve durak zemini */
  rail: string;
  railEdge: string;
  /** Yol çizgileri ve durak işaretleri */
  stop: string;
  panel: string;
}

export const THEMES: Record<string, Theme> = {
  'theme:gece': { bg: UI.bg, board: '#0A1424', rail: UI.rail, railEdge: UI.railEdge, stop: '#56CCF2', panel: UI.bg2 },
  'theme:okyanus': { bg: '#0B1A28', board: '#071320', rail: '#14405A', railEdge: '#2A7BA0', stop: '#3FA3C8', panel: '#123049' },
  'theme:orman': { bg: '#0E1A13', board: '#08120C', rail: '#25432D', railEdge: '#4C8458', stop: '#6FB07C', panel: '#1A3022' },
  'theme:gunbatimi': { bg: '#22111B', board: '#170A12', rail: '#5A2A3C', railEdge: '#C0684E', stop: '#F2A65A', panel: '#3A1B2A' },
  'theme:neon': { bg: '#08070F', board: '#040309', rail: '#1C1238', railEdge: '#B04CFF', stop: '#3DF5FF', panel: '#18112E' },
};

export const themeFor = (id: string): Theme => THEMES[id] ?? THEMES['theme:gece'];

export type CarStyle = 'klasik' | 'parlak' | 'retro' | 'neon';
export const carStyleFor = (id: string): CarStyle => (id.split(':')[1] as CarStyle) || 'klasik';
