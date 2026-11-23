/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../i18n/en';
import { tr } from '../i18n/tr';
import { num, resolveLang, setLang, t } from '../i18n';
import { dailyShareText } from './daily';
import { missionLabel } from './missions';
import { MARKET, itemName, itemDesc } from './market';
import { CAR_MODELS } from './garage';

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('İngilizce çeviri eksiksiz ve yer tutucular aynı', () => {
  for (const k of Object.keys(tr) as (keyof typeof tr)[]) {
    assert.ok(en[k] && en[k].trim().length > 0, `boş: ${k}`);
    assert.deepEqual(vars(en[k]), vars(tr[k]), `yer tutucu farklı: ${k}`);
  }
});

test('dil seçimi: otomatik = cihaz dili Türkçe ise Türkçe, değilse İngilizce', () => {
  assert.equal(resolveLang('auto', 'tr'), 'tr');
  assert.equal(resolveLang('auto', 'de'), 'en');
  assert.equal(resolveLang('auto', null), 'en');
  assert.equal(resolveLang('tr', 'en'), 'tr');
});

test('market ve araba adlarının çevirisi var', () => {
  setLang('en');
  for (const m of MARKET) {
    assert.ok(!itemName(m).startsWith('item.'), m.id);
    if (m.desc) assert.ok(!itemDesc(m)!.startsWith('item.'), m.id);
  }
  for (const m of CAR_MODELS) assert.ok(!t(`car.${m.key}` as keyof typeof tr).startsWith('car.'), m.key);
  setLang('tr');
});

test('İngilizce metinler: görev, paylaşım, sayı biçimi', () => {
  setLang('en');
  assert.equal(missionLabel({ kind: 'win', target: 3, reward: 20 }), 'Finish 3 levels');
  const s = dailyShareText('2026-11-22', 3, 12, 0, 4);
  assert.match(s, /Daily Lot 11\/22\/2026/);
  assert.match(s, /max 0 at the stop/);
  assert.equal(num(16000), '16,000');
  assert.equal(t('common.level', { n: 7 }), 'Level 7');
  setLang('tr');
  assert.equal(num(16000), '16.000');
});
