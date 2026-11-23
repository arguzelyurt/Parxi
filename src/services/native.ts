// Bir yerel (native) modülün bu derlemede gerçekten olup olmadığını, modülü yüklemeden kontrol eder.
// Expo Go'da reklam, satın alma, Firebase ve MMKV modülleri yoktur. Bunları kontrol etmeden
// require etmek, try/catch içinde olsa bile geliştirmede kırmızı "Uncaught Error" ekranı açar.

import { NativeModules, TurboModuleRegistry } from 'react-native';

export function hasNativeModule(name: string): boolean {
  try {
    if (TurboModuleRegistry.get(name)) return true;
  } catch {}
  if (NativeModules[name]) return true;
  try {
    const expo = (globalThis as { expo?: { modules?: Record<string, unknown> } }).expo;
    if (expo?.modules?.[name]) return true;
  } catch {}
  return false;
}
