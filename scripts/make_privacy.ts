// docs/privacy/index.html üretir (GitHub Pages ile herkese açık yayınlanır). Çalıştır: npx tsx scripts/make_privacy.ts
import { writeFileSync } from 'fs';
import { PRIVACY, PRIVACY_UPDATED } from '../src/content/privacy';
import { SUPPORT_EMAIL } from '../src/config';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const contact = SUPPORT_EMAIL ? `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>` : '[e-posta adresi / email address]';
const sec = (lang: 'tr' | 'en', title: string) =>
  `<section id="${lang}" lang="${lang}"><h2>${title}</h2>` +
  PRIVACY[lang].map((b) => `<h3>${esc(b.h)}</h3><p>${esc(b.p)}</p>`).join('') +
  `<p><b>${lang === 'tr' ? 'İletişim' : 'Contact'}:</b> ${contact}</p></section>`;

const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Parxi — Gizlilik Politikası / Privacy Policy</title>
<style>
:root{color-scheme:light dark}body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;background:light-dark(#fff,#0f1b2d);color:light-dark(#14202f,#eef3f9)}
main{max-width:720px;margin:0 auto;padding:40px 20px}h1{font-size:32px;line-height:1.15;margin:0 0 6px}h2{margin-top:40px;padding-top:12px;border-top:1px solid light-dark(#dfe6ee,#24395a)}
h3{font-size:17px;margin:22px 0 4px}a{color:light-dark(#1d6fa5,#56ccf2)}.meta{opacity:.7;font-size:14px}nav a{margin-right:14px;font-weight:600}
</style></head><body><main>
<h1>Parxi — Gizlilik Politikası</h1><p class="meta">Son güncelleme / Last updated: ${PRIVACY_UPDATED}</p>
<nav><a href="#tr">Türkçe</a><a href="#en">English</a></nav>
${sec('tr', 'Türkçe')}
${sec('en', 'English')}
</main></body></html>
`;
writeFileSync('docs/privacy/index.html', html);
console.log('docs/privacy/index.html yazıldı');
