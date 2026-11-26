// Hesap penceresi (Ayarlar → Hesap): Apple / Google / e-posta ile giriş-kayıt; girişliyken eşitleme, çıkış, hesap silme.
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text, fontStyle } from './Text';
import {
  Account,
  AccountError,
  accountAvailable,
  appleAvailable,
  deleteAccount,
  googleAvailable,
  resetPassword,
  signInApple,
  signInEmail,
  signInGoogle,
  signOut,
  signUpEmail,
} from '../services/account';
import { UI } from '../game/palette';
import { Key, t } from '../i18n';
import { Btn, TextLink } from './kit';

const errText = (e: AccountError) => t(`account.err.${e}` as Key);

export default function AccountSheet(props: {
  account: Account | null;
  syncedAt: number;
  syncing: boolean;
  onSync(): void;
  onClose(): void;
}) {
  const { account } = props;
  const [mode, setMode] = useState<'choose' | 'email'>('choose');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const go = async (fn: () => Promise<{ ok: true } | { ok: false; error: AccountError }>) => {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok && r.error !== 'cancelled') setMsg(errText(r.error));
  };

  if (!accountAvailable())
    return (
      <>
        <Text style={styles.title}>{t('account.title')}</Text>
        <Text style={styles.sub}>{t('account.unavailable')}</Text>
        <TextLink label={t('common.close')} onPress={props.onClose} />
      </>
    );

  if (account)
    return (
      <>
        <Text style={styles.title}>{t('account.title')}</Text>
        <Text style={styles.who}>{account.email ?? account.name ?? t(`account.via.${account.provider}` as Key)}</Text>
        <Text style={styles.sub}>{t(`account.via.${account.provider}` as Key)}</Text>
        <Text style={styles.sub}>
          {props.syncing
            ? t('account.syncing')
            : props.syncedAt
              ? t('account.synced', { time: new Date(props.syncedAt).toLocaleString() })
              : t('account.notSynced')}
        </Text>
        <View style={{ height: 8 }} />
        <Btn label={t('account.syncNow')} primary loading={props.syncing} onPress={props.onSync} />
        <Btn label={t('account.signOut')} onPress={() => signOut()} />
        <TextLink
          label={t('account.delete')}
          onPress={() =>
            Alert.alert(t('account.deleteTitle'), t('account.deleteBody'), [
              { text: t('common.notNow'), style: 'cancel' },
              {
                text: t('account.deleteYes'),
                style: 'destructive',
                onPress: async () => {
                  const e = await deleteAccount();
                  if (e) Alert.alert(t('account.title'), e === 'recent-login' ? t('account.err.recent-login') : errText(e));
                  else Alert.alert(t('account.deletedTitle'), t('account.deletedBody'));
                },
              },
            ])
          }
        />
      </>
    );

  if (mode === 'email')
    return (
      <>
        <Text style={styles.title}>{t('account.email')}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('account.emailPh')}
          placeholderTextColor={UI.dim}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          style={[styles.input, fontStyle({ fontWeight: '700' })]}
        />
        <TextInput
          value={pass}
          onChangeText={setPass}
          placeholder={t('account.passPh')}
          placeholderTextColor={UI.dim}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          style={[styles.input, fontStyle({ fontWeight: '700' })]}
        />
        {msg && <Text style={styles.err}>{msg}</Text>}
        {busy ? (
          <ActivityIndicator color={UI.accent} style={{ marginVertical: 12 }} />
        ) : (
          <>
            <Btn label={t('account.signIn')} primary disabled={!email || pass.length < 6} onPress={() => go(() => signInEmail(email, pass))} />
            <Btn label={t('account.signUp')} disabled={!email || pass.length < 6} onPress={() => go(() => signUpEmail(email, pass))} />
            <TextLink
              label={t('account.forgot')}
              onPress={async () => {
                if (!email) return setMsg(t('account.err.invalid-email'));
                const e = await resetPassword(email);
                setMsg(e ? errText(e) : t('account.resetSent'));
              }}
            />
          </>
        )}
        <TextLink label={`‹ ${t('account.back')}`} onPress={() => setMode('choose')} />
      </>
    );

  return (
    <>
      <Text style={styles.title}>{t('account.title')}</Text>
      <Text style={[styles.sub, { marginBottom: 10 }]}>{t('account.why')}</Text>
      {busy && <ActivityIndicator color={UI.accent} style={{ marginVertical: 8 }} />}
      {appleAvailable() && (
        <Pressable disabled={busy} onPress={() => go(signInApple)} style={[styles.provider, { backgroundColor: '#FFFFFF' }]}>
          <Text style={[styles.providerText, { color: '#000' }]}> {t('account.apple')}</Text>
        </Pressable>
      )}
      {googleAvailable() && (
        <Pressable disabled={busy} onPress={() => go(signInGoogle)} style={[styles.provider, { backgroundColor: '#FFFFFF' }]}>
          <Text style={[styles.providerText, { color: '#1F1F1F' }]}>
            <Text style={{ color: '#4285F4', fontWeight: '900' }}>G</Text> {t('account.google')}
          </Text>
        </Pressable>
      )}
      <Pressable disabled={busy} onPress={() => setMode('email')} style={[styles.provider, { backgroundColor: UI.panelHi }]}>
        <Text style={styles.providerText}>✉️ {t('account.email')}</Text>
      </Pressable>
      {msg && <Text style={styles.err}>{msg}</Text>}
      {!googleAvailable() && Platform.OS !== 'web' && __DEV__ && <Text style={styles.note}>{t('account.googleSetup')}</Text>}
      <TextLink label={t('common.close')} onPress={props.onClose} />
    </>
  );
}

const styles = StyleSheet.create({
  title: { color: UI.text, fontSize: 24, fontWeight: '900' },
  who: { color: UI.text, fontSize: 18, fontWeight: '800', marginTop: 6 },
  sub: { color: UI.dim, fontSize: 14, textAlign: 'center', marginTop: 2 },
  note: { color: UI.dim, fontSize: 11, textAlign: 'center', marginTop: 6 },
  err: { color: UI.danger, fontSize: 14, fontWeight: '700', textAlign: 'center', marginVertical: 6 },
  provider: { alignSelf: 'stretch', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  providerText: { color: UI.text, fontSize: 17, fontWeight: '800' },
  input: {
    alignSelf: 'stretch',
    backgroundColor: UI.bg,
    color: UI.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 8,
  },
});
