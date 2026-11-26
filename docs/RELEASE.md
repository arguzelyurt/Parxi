# Parxi — Yayın Kontrol Listesi

`npm run release-check` kod tarafında eksik kalanları listeler. Hepsi ✓ olunca derleme alınabilir.

## Hazır olanlar (kod tarafı)

- [x] Oyun, ekonomi, reklam/mağaza katmanı, bildirimler, Firebase (parxi-71f97), EAS projesi
- [x] Parxi ikonu, Android adaptif ikon, açılış ekranı
- [x] Sürüm 1.0.0; derleme numaraları EAS'ta otomatik artar (`eas.json` → production autoIncrement)
- [x] iOS şifreleme beyanı (`ITSAppUsesNonExemptEncryption = false`): ihracat uyumluluğu sorusu çıkmaz
- [x] Reklam içerik sınırı PG (4+ / Herkes yaş sınıfıyla uyumlu)
- [x] Gizlilik politikası + KVKK aydınlatma metni: https://claude.ai/artifact/5vJ2QPGdhm7hnXpg8c1JLM (taslak, ad/e-posta eksik, henüz yalnızca sana açık)
- [x] Ayarlar'da gizlilik politikası bağlantısı, satın alımları geri yükleme, reklam izin tercihleri
- [x] Mağaza metinleri, anahtar kelimeler, ürün listesi, gizlilik beyanları: `docs/STORE.md`
- [x] Ekran görüntüleri İngilizce + Türkçe: iOS 6,7" ×6, Android ×6, Play öne çıkan görseli, Play ikonu: `store/`
- [x] Türkçe + İngilizce arayüz

## Senin yapacakların (sırayla)

### 1. Gerçek cihaz testi (≈30 dk)
1. `npx expo run:ios --device` ile telefona kur, ilk 15 seviyeyi oyna: dokunma, animasyon hızı, zorluk nasıl? Notlarını bana yaz
2. App Store Connect → Kullanıcılar ve Erişim → Sandbox test kullanıcısı (Floxi için açtığın kullanıcı da olur)
3. Dükkan'dan bir coin paketi ve Reklamsız'ı sandbox'ta satın al, sonra uygulamayı silip "Satın alımları geri yükle" dene
4. 11. seviyeden sonra geçiş reklamı, tıkanınca ödüllü reklam çıkıyor mu bak (geliştirme derlemesinde test reklamları)

### 2. AdMob (≈15 dk)
1. admob.google.com → Uygulamalar → Uygulama ekle → iOS → "Henüz yayınlanmadı" → ad: Parxi
2. Aynısını Android için yap
3. Her uygulamada iki reklam birimi aç: **Geçiş** ve **Ödüllü**
4. Bana dört reklam birimi kimliğini (`ca-app-pub-…/…`) ve iki uygulama kimliğini (`ca-app-pub-…~…`) gönder, ben `app.json` ve `src/services/ads.ts`'ye koyayım
5. Gizlilik ve mesajlaşma → GDPR mesajına Parxi'nin iki uygulamasını da ekle

### 3. Gizlilik politikası (≈5 dk)
1. Bana veri sorumlusu olarak yazılacak **ad soyad** ve **destek e-postası** gönder (Floxi'dekiyle aynı olabilir)
2. Politika sayfasını claude.ai'de aç → Paylaş → **herkese açık** yap

### 4. App Store Connect
1. Uygulamalar → + → Yeni uygulama → iOS, ad "Parxi: Car Park Puzzle", ana dil English (U.S.), paket kimliği `com.parxi.game`, SKU `parxi`; sonra Türkçe dilini ekleyip "Parxi: Araba Bulmacası" metinlerini gir
2. Uygulama içi satın almalar → `docs/STORE.md`'deki 9 ürünü aynı kimliklerle aç
3. Uygulama Gizliliği → `docs/STORE.md`'deki tablo; gizlilik politikası URL'si
4. Yaş sınırı anketi → beklenen 4+
5. Görseller: İngilizce için `store/ios-6.7-en` + `store/ipad-13-en`, Türkçe için `store/ios-6.7` + `store/ipad-13`
6. Fiyat: Ücretsiz; Kullanılabilirlik: bütün ülkeler

### 5. Google Play Console
1. Uygulama oluştur → Oyun, Ücretsiz, varsayılan dil English (US)
2. Mağaza girişi: İngilizce `store/android-en`, Türkçe çeviri `store/android` görselleri
3. Uygulama içeriği: gizlilik politikası, reklam var, veri güvenliği, içerik derecelendirmesi (IARC), hedef kitle 13+
4. Para kazanma → Ürünler → 9 ürün
5. **Önemli:** Kişisel geliştirici hesabı 2023 Kasım'dan sonra açıldıysa üretime çıkmadan önce **en az 12 test kullanıcısıyla 14 gün kapalı test** zorunlu. Floxi'nin test grubunu Parxi için de kullanabilirsin

### 6. Derleme ve gönderme
```bash
npm run release-check                                  # hepsi ✓ olmalı
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios               # TestFlight'a gider
npx eas-cli@latest submit --platform android           # Play'de önce kapalı test kanalına yükle
```

## Önerilen sonraki adımlar
- Oyuncu testinden sonra yeni engeller: kilitli araç, bariyer, VIP yolcu
- 260. seviyeden sonra yeni garaj modelleri
- Sonraki diller: Almanca, İspanyolca, Portekizce (Brezilya), Japonca
- **app-ads.txt:** AdMob gelirini korumak için geliştirici web sitesinde `app-ads.txt` önerilir


## Gizlilik politikası adresi (GitHub Pages)
- Uygulamadaki ve mağazadaki adres: https://arguzelyurt.github.io/Parxi/privacy/
- Bir kez açılır: GitHub → arguzelyurt/Parxi → Settings → Pages → Source: "Deploy from a branch", Branch: `main`, klasör `/docs` → Save. Birkaç dakika sonra adres çalışır.
- Metin `src/content/privacy.ts` içinde; değişince `npx tsx scripts/make_privacy.ts` çalıştırılıp commit'lenir.
- Yayından önce `src/config.ts` → `SUPPORT_EMAIL` doldurulmalı (sayfada iletişim adresi olarak görünür).
