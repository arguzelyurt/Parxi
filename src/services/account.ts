// Hesap: isteğe bağlı giriş (e-posta/şifre, Google, Apple) ve bulut kayıt (Firestore users/{uid}).
// Ayrıntı ve Firebase konsol adımları: docs/HESAP.md
// Yerel modüller yoksa (Expo Go, web, eski derleme) hepsi sessizce "yok" döner; oyun çevrimdışı çalışır.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { hasNativeModule } from './native';
import { reportError } from './firebase';

export type Provider = 'password' | 'google' | 'apple';

export interface Account {
  uid: string;
  email: string | null;
  name: string | null;
  provider: Provider;
}

export type AccountError =
  | 'cancelled'
  | 'invalid-email'
  | 'wrong-password'
  | 'user-not-found'
  | 'email-in-use'
  | 'weak-password'
  | 'network'
  | 'recent-login'
  | 'unavailable'
  | 'unknown';

/* eslint-disable @typescript-eslint/no-require-imports */
const authMod = () => require('@react-native-firebase/auth') as typeof import('@react-native-firebase/auth');
const fsMod = () => require('@react-native-firebase/firestore') as typeof import('@react-native-firebase/firestore');
/* eslint-enable @typescript-eslint/no-require-imports */

export const accountAvailable = (): boolean =>
  hasNativeModule('RNFBAppModule') && (hasNativeModule('NativeRNFBTurboAuth') || hasNativeModule('RNFBAuthModule'));

/** Google girişi: yerel modül var ve Firebase'de Google açılıp yapılandırma dosyaları yenilendiyse */
const googleWebClientId = (): string =>
  ((Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined)?.googleWebClientId ?? '').trim();
export const googleAvailable = (): boolean => accountAvailable() && hasNativeModule('RNGoogleSignin') && !!googleWebClientId();

/** Apple ile giriş yalnız iOS'ta */
export const appleAvailable = (): boolean => accountAvailable() && Platform.OS === 'ios' && hasNativeModule('ExpoAppleAuthentication');

function toAccount(u: { uid: string; email: string | null; displayName: string | null; providerData: { providerId: string }[] } | null): Account | null {
  if (!u) return null;
  const ids = u.providerData.map((p) => p.providerId);
  const provider: Provider = ids.includes('apple.com') ? 'apple' : ids.includes('google.com') ? 'google' : 'password';
  return { uid: u.uid, email: u.email, name: u.displayName, provider };
}

function errCode(e: unknown): AccountError {
  const code = String((e as { code?: string })?.code ?? '');
  if (code.includes('cancel') || code === 'ERR_REQUEST_CANCELED' || code === 'SIGN_IN_CANCELLED' || code === '12501') return 'cancelled';
  if (code.includes('invalid-email')) return 'invalid-email';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'wrong-password';
  if (code.includes('user-not-found')) return 'user-not-found';
  if (code.includes('email-already-in-use')) return 'email-in-use';
  if (code.includes('weak-password')) return 'weak-password';
  if (code.includes('network')) return 'network';
  if (code.includes('requires-recent-login')) return 'recent-login';
  return 'unknown';
}

type Result = { ok: true; account: Account } | { ok: false; error: AccountError };

async function run(fn: () => Promise<{ user: Parameters<typeof toAccount>[0] }>): Promise<Result> {
  if (!accountAvailable()) return { ok: false, error: 'unavailable' };
  try {
    const cred = await fn();
    return { ok: true, account: toAccount(cred.user)! };
  } catch (e) {
    const error = errCode(e);
    if (error === 'unknown') reportError(e, 'account');
    return { ok: false, error };
  }
}

export function currentAccount(): Account | null {
  if (!accountAvailable()) return null;
  try {
    const a = authMod();
    return toAccount(a.getAuth().currentUser);
  } catch {
    return null;
  }
}

export function onAccountChanged(cb: (a: Account | null) => void): () => void {
  if (!accountAvailable()) return () => {};
  try {
    const a = authMod();
    return a.onAuthStateChanged(a.getAuth(), (u) => cb(toAccount(u)));
  } catch {
    return () => {};
  }
}

export const signInEmail = (email: string, password: string) =>
  run(() => authMod().signInWithEmailAndPassword(authMod().getAuth(), email.trim(), password));

export const signUpEmail = (email: string, password: string) =>
  run(() => authMod().createUserWithEmailAndPassword(authMod().getAuth(), email.trim(), password));

export async function resetPassword(email: string): Promise<AccountError | null> {
  if (!accountAvailable()) return 'unavailable';
  try {
    await authMod().sendPasswordResetEmail(authMod().getAuth(), email.trim());
    return null;
  } catch (e) {
    return errCode(e);
  }
}

let googleConfigured = false;
export const signInGoogle = () =>
  run(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    if (!googleConfigured) {
      GoogleSignin.configure({ webClientId: googleWebClientId() });
      googleConfigured = true;
    }
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success' || !res.data.idToken) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
    const a = authMod();
    return a.signInWithCredential(a.getAuth(), a.GoogleAuthProvider.credential(res.data.idToken));
  });

/** Apple: hesabı silerken token iptali için yetki kodu saklanır */
let appleAuthCode: string | null = null;
export const signInApple = () =>
  run(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
    const res = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
    });
    if (!res.identityToken) throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
    appleAuthCode = res.authorizationCode ?? null;
    const a = authMod();
    return a.signInWithCredential(a.getAuth(), a.AppleAuthProvider.credential(res.identityToken));
  });

export async function signOut(): Promise<void> {
  if (!accountAvailable()) return;
  try {
    const acc = currentAccount();
    if (acc?.provider === 'google') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut().catch(() => null);
    }
    await authMod().signOut(authMod().getAuth());
  } catch (e) {
    reportError(e, 'signOut');
  }
}

// ---------- Bulut kayıt ----------

const userDoc = (uid: string) => fsMod().doc(fsMod().getFirestore(), 'users', uid);

/** Buluttaki kayıt (yoksa null) */
export async function loadCloud(uid: string): Promise<Record<string, unknown> | null> {
  try {
    const snap = await fsMod().getDoc(userDoc(uid));
    const data = snap.data() as { save?: string } | undefined;
    return data?.save ? (JSON.parse(data.save) as Record<string, unknown>) : null;
  } catch (e) {
    reportError(e, 'loadCloud');
    throw e;
  }
}

export async function saveCloud(uid: string, save: { level: number }): Promise<boolean> {
  try {
    await fsMod().setDoc(userDoc(uid), {
      save: JSON.stringify(save),
      level: save.level,
      updatedAt: fsMod().serverTimestamp(),
    });
    return true;
  } catch (e) {
    reportError(e, 'saveCloud');
    return false;
  }
}

/**
 * Hesabı sil (App Store 5.1.1(v)): buluttaki kayıt + Firebase hesabı; Apple'da token iptali.
 * Uzun süredir girişliyse Firebase yeniden giriş ister ('recent-login').
 */
export async function deleteAccount(): Promise<AccountError | null> {
  if (!accountAvailable()) return 'unavailable';
  const a = authMod();
  const user = a.getAuth().currentUser;
  if (!user) return null;
  try {
    if (currentAccount()?.provider === 'apple') {
      // Apple: taze bir yetki kodu al (token iptali ve "yakın zamanda giriş" şartı için)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
      const res = await Apple.signInAsync({ requestedScopes: [] });
      if (res.identityToken) await a.reauthenticateWithCredential(user, a.AppleAuthProvider.credential(res.identityToken));
      appleAuthCode = res.authorizationCode ?? appleAuthCode;
    }
    await fsMod().deleteDoc(userDoc(user.uid)).catch(() => {});
    if (appleAuthCode) await a.revokeToken(a.getAuth(), appleAuthCode).catch(() => {});
    await a.deleteUser(user);
    appleAuthCode = null;
    return null;
  } catch (e) {
    return errCode(e);
  }
}
