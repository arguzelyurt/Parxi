# Parxi

Renkli araç ve yolcu eşleştirme bulmacası (Bus Jam / Car Out türü). Otoparktan araçları sırayla çıkar,
durakta rengi tutan yolcuları bindir, herkesi yola çıkar. Tamamen çevrimdışı ve sunucusuz.
Glugo ve Floxi ile aynı aileden. Tasarım, farklılaşma ve faz planı için `docs/PLAN.md`'ye bak.

## Çalıştırma

Reklam, mağaza ve MMKV yerel modül istediği için **Expo Go yetmez**, geliştirme derlemesi gerekir:

```bash
npm install
npx expo run:ios          # Mac'te Xcode ile (simülatör ya da bağlı iPhone)
npx expo run:android      # Android Studio / bağlı telefon
npm test                  # çekirdek mantık + ekonomi testleri
npm run typecheck
```

Expo Go'da ve web'de (`npx expo start --web`) oyun yine açılır: reklam ve mağaza devre dışı kalır,
kayıt AsyncStorage'a düşer.

## Nasıl oynanır

- Önü kenara kadar açık bir araca **dokun**: araç otoparktan çıkar, durakta boş bir yere geçer.
- Kuyruğun önündeki yolcu, durakta kendi rengindeki araca biner (aynı renkte önce gelen araca).
- Araç dolunca (araba 4, otobüs 6, tır 8) yola çıkar, yeri boşalır.
- Durak doluyken öndeki yolcu hiçbir araca binemezse tıkanırsın: geri al, +1 durak yeri ya da baştan başla.
- 3 yıldız = durağı çözümdeki kadar az doldurmak.
- Güçlendiriciler: Geri al, İpucu, Vinç (önü kapalı ya da kilitli bir aracı kaldırır), +1 Yer.
- Engeller: gizli araç (16+), bariyer (24+), kilitli araç (36+), VIP yolcu (48+). Her biri ilk geldiği seviyede tanıtılır.

## Yayına çıkmadan önce doldurulacaklar

- `npx eas-cli@latest init` (EAS proje kimliği)
- `src/services/ads.ts` → `PROD_UNITS`, `app.json` → AdMob `androidAppId` / `iosAppId`
- App Store Connect ve Play Console'da ürünler: `src/core/monetization.ts` → `PRODUCTS` (`parxi.*`)
- `src/config.ts` → gizlilik politikası adresi ve destek e-postası
- Kontrol: `npm run release-check`

## Klasörler

- `src/core/` saf oyun mantığı (kurallar, üretici, çözücü, garaj, ekonomi, görevler) + testler
- `src/game/` kayıt, satın alma etkileri, palet, temalar
- `src/services/` AdMob, mağaza, bildirim, Firebase
- `src/ui/` ekranlar
