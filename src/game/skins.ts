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
  'theme:kar': { bg: '#0F1C2B', board: '#16283C', rail: '#2C4A66', railEdge: '#CFE8FF', stop: '#E6F4FF', panel: '#1C3248' },
  'theme:col': { bg: '#221A10', board: '#2B2014', rail: '#5A4325', railEdge: '#E0B56A', stop: '#F2C98A', panel: '#3A2C18' },
  'theme:sahil': { bg: '#0C2230', board: '#0A2A36', rail: '#1F5A6B', railEdge: '#F2D29B', stop: '#7FE3F0', panel: '#14404F' },
  'theme:uzay': { bg: '#05040C', board: '#0B0A1A', rail: '#1B1840', railEdge: '#7A6CFF', stop: '#C7BFFF', panel: '#141233' },
  'theme:sehir': { bg: '#0B0F1A', board: '#121826', rail: '#242C40', railEdge: '#FFB020', stop: '#FFD166', panel: '#1A2135' },
};

export const themeFor = (id: string): Theme => THEMES[id] ?? THEMES['theme:gece'];

/** Araç stili/kaplaması: assets/vehicles/{tür}-{stil}-{renk}.png */
export type CarStyle = string;
export const carStyleFor = (id: string): CarStyle => id.split(':')[1] || 'klasik';

/** Yolcu görünümü: 'klasik' | 'sapka' | 'korsan' | 'kedi' | 'kopek' | 'robot' | 'astronot' | 'uzayli' */
export type RiderSkin = string;
export const riderFor = (id: string): RiderSkin => id.split(':')[1] || 'klasik';

/** Durak görünümü: zemini ve tabelası. null alanlar temadan gelir. */
export interface StopSkin {
  sign: string;
  rail?: string;
  railEdge?: string;
  /** Durağın üstünde ince süs bandı */
  band?: string[];
}

export const STOPS: Record<string, StopSkin> = {
  'stop:klasik': { sign: '🚏' },
  'stop:tramvay': { sign: '🚋', rail: '#2E2A26', railEdge: '#C9A227', band: ['#8A8F99', '#3B3F47'] },
  'stop:kumsal': { sign: '🏖️', rail: '#4F3E2A', railEdge: '#F2D29B', band: ['#F2D29B', '#56CCF2'] },
  'stop:kis': { sign: '⛄', rail: '#25415A', railEdge: '#E6F4FF', band: ['#FFFFFF', '#CFE8FF'] },
  'stop:havalimani': { sign: '✈️', rail: '#252A35', railEdge: '#F2C94C', band: ['#F2C94C', '#1A1D26'] },
};

export const stopFor = (id: string): StopSkin => STOPS[id] ?? STOPS['stop:klasik'];

/** Kutlama efekti: 'sade' | 'konfeti' | 'balon' | 'yildiz' | 'havai' */
export const fxFor = (id: string): string => id.split(':')[1] || 'sade';
