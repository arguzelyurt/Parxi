// Yayın öncesi kontrol: `npm run release-check`. Eksik bir şey varsa listeler ve hata koduyla çıkar.
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const problems: string[] = [];
const ok: string[] = [];
const read = (p: string) => readFileSync(p, 'utf8');
const check = (cond: boolean, good: string, bad: string) => (cond ? ok : problems).push(cond ? good : bad);

const app = JSON.parse(read('app.json')).expo;
const ads = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads')?.[1] ?? {};
const TEST_APP_IDS = ['ca-app-pub-3940256099942544~3347511713', 'ca-app-pub-3940256099942544~1458002511'];

check(/^\d+\.\d+\.\d+$/.test(app.version), `Sürüm: ${app.version}`, 'app.json sürümü geçersiz');
check(!TEST_APP_IDS.includes(ads.iosAppId), 'AdMob iOS uygulama kimliği gerçek', 'app.json → AdMob iosAppId hâlâ Google test kimliği');
check(!TEST_APP_IDS.includes(ads.androidAppId), 'AdMob Android uygulama kimliği gerçek', 'app.json → AdMob androidAppId hâlâ Google test kimliği');
check(!read('src/services/ads.ts').includes('XXXXXXXXXXXXXXXX'), 'AdMob reklam birimleri dolu', 'src/services/ads.ts → PROD_UNITS reklam birim kimlikleri boş');
check(existsSync('GoogleService-Info.plist') && existsSync('google-services.json'), 'Firebase dosyaları var', 'Firebase yapılandırma dosyaları eksik');

const config = read('src/config.ts');
check(/PRIVACY_URL = 'https:\/\/[^']+'/.test(config), 'Gizlilik politikası adresi var', 'src/config.ts → PRIVACY_URL boş');
check(/SUPPORT_EMAIL = '[^']+@[^']+'/.test(config), 'Destek e-postası var', 'src/config.ts → SUPPORT_EMAIL boş');

const names = ['locales/en.json', 'locales/tr.json'].map((p) => JSON.parse(read(p)).CFBundleDisplayName);
check(names.every((n) => n === app.name), `Telefondaki ad: ${app.name}`, `locales/*.json → CFBundleDisplayName "${names.join(', ')}" (app.json: ${app.name})`);

const hash = (p: string) => (existsSync(p) ? createHash('md5').update(readFileSync(p)).digest('hex') : '');
const glugoIcon = '../Floxi/assets/icon.png';
check(!existsSync(glugoIcon) || hash(glugoIcon) !== hash('assets/icon.png'), 'İkon Parxi’ye ait', 'assets/icon.png hâlâ Floxi ikonu');

console.log('\nHazır:');
ok.forEach((s) => console.log('  ✓ ' + s));
if (problems.length) {
  console.log('\nEksik:');
  problems.forEach((s) => console.log('  ✗ ' + s));
  process.exit(1);
}
console.log('\nKod tarafında eksik yok. Sıradaki adım: npx eas-cli@latest build --profile production\n');
