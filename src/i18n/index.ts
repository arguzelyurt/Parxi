// Basit çeviri katmanı: React'tan bağımsız (çekirdek mantık ve testler de kullanır).
// Uygulama dili App'te, her çizimden önce setLang ile ayarlanır.
import { en } from './en';
import { tr } from './tr';

export type Lang = 'tr' | 'en';
export type LangSetting = Lang | 'auto';
export type Key = keyof typeof tr;

const DICTS: Record<Lang, Record<Key, string>> = { tr, en };
let current: Lang = 'tr';

export const setLang = (l: Lang) => {
  current = l;
};
export const getLang = (): Lang => current;

/** Cihaz dili Türkçe ise Türkçe, değilse İngilizce. */
export function resolveLang(setting: LangSetting, deviceLang: string | null | undefined): Lang {
  if (setting === 'tr' || setting === 'en') return setting;
  return (deviceLang ?? '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? tr[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Sayıyı dile göre biçimler (1.800 / 1,800) */
export const num = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, current === 'tr' ? '.' : ',');
