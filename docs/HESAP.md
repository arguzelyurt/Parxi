# Parxi — Hesap ve Bulut Kayıt

Durum: **kodu yazıldı (26 Kasım 2026)**. Çalışması için aşağıdaki "Firebase konsol adımları" yapılmalı.

Durum: **planlandı, geliştirilmedi.** Önce Parxi'de yapılacak, oturunca aynı yapı Glugo ve Floxi'ye taşınacak.

## Amaç

Oyuncu isterse hesap açar; ilerlemesi (seviye, coin, güçlendiriciler, garaj, kozmetikler, günlük seri) buluta kaydedilir. Telefon değiştirince ya da uygulamayı silip yükleyince aynı hesapla girip kaldığı yerden devam eder.

**Giriş isteğe bağlı kalır.** Hesap açmadan oyun bugünkü gibi tamamen çevrimdışı oynanır (Apple da hesap gerektirmeyen uygulamalarda girişin zorunlu tutulmamasını istiyor).

## Giriş yöntemleri

| Yöntem | Not |
|---|---|
| Apple ile giriş | Google girişi sunulduğu için Apple kuralı 4.8 gereği zorunlu |
| Google ile giriş | |
| Kullanıcı adı / e-posta + şifre | Firebase'in e-posta/şifre girişi. Şifre sıfırlama e-postasını Firebase gönderir |
| Telefon (SMS) | **Yok.** Her SMS ücretli |

## Teknik yapı (sunucusuz, Firebase)

- **Firebase Authentication**: giriş. Proje zaten bağlı (parxi-71f97).
- **Cloud Firestore**: her oyuncu için tek belge, `users/{uid}`. İçinde ilerlemenin tamamı (1–2 KB).
- Güvenlik kuralı: herkes yalnızca kendi `uid` belgesini okuyup yazabilir.
- Satın almalar yine Apple/Google üzerinden; "Reklamsız" gibi kalıcı ürünler zaten "Satın alımları geri yükle" ile geri geliyor. Bulut kayıt bunun yerine geçmez, ikisi birlikte çalışır.

### Ne zaman okunur / yazılır (maliyeti düşük tutmak için)
- Oturum açılınca 1 okuma.
- Yazma: uygulama arka plana geçerken ve her 5 seviyede bir. Her seviye sonunda değil.
- Böylece günde binlerce aktif oyuncu bile ücretsiz kotanın altında kalır.

### Çakışma (iki telefonda farklı ilerleme)
- Kural: **daha ileri olan kazanır** (yüksek seviye; eşitse daha yeni kayıt).
- Coin ve güçlendiriciler için: kazanan kaydın değerleri alınır, toplanmaz (coin çoğaltma hilesini önler).
- Satın alma kimlikleri (`processedPurchases`) iki kaydın birleşimi alınır.
- Misafirken oynanmış ilerleme, hesap ilk kez açılınca hesaba taşınır. Hesapta zaten ilerleme varsa oyuncuya "Bu telefondaki mi, hesaptaki mi?" diye sorulur.

## Ekranlar

- **Ayarlar → Hesap** bölümü: "Apple ile devam et", "Google ile devam et", "E-posta ile giriş / kayıt".
- Girişliyken: hesap adı/e-postası, son eşitleme zamanı, "Çıkış yap", "Hesabı sil".
- Ana sayfada bir kez, 10. seviyeden sonra yumuşak öneri: "İlerlemen kaybolmasın, hesap aç" (kapatılabilir, ısrar yok).

## Zorunlu kurallar (App Store / Play)

- **Hesap silme uygulamanın içinde** olmalı (Apple 5.1.1(v)). Silince: Firestore belgesi + Firebase hesabı silinir, Apple ile girişte Apple tokenı iptal edilir (Firebase'in `revokeToken` fonksiyonuyla, sunucu gerekmeden; kodlarken doğrulanacak).
- Google Play: Veri güvenliği formunda hesap silme bağlantısı istenir (uygulama içi + web sayfası).
- **Gizlilik politikası güncellenir:** e-posta adresi ve hesap kimliği artık toplanan veri. App Store "Uygulama Gizliliği" ve Play "Veri güvenliği" beyanlarına "E-posta adresi — uygulama işlevi — kimliğe bağlı" eklenir.

## Maliyet (Kasım 2026 fiyatları)

| Kalem | Ücretsiz | Aşınca |
|---|---|---|
| Giriş (aylık aktif kullanıcı) | 50.000'e kadar | kullanıcı başına 0,0055 $ (50–100 bin) |
| Firestore depolama | 1 GiB | çok düşük |
| Firestore okuma | günde 50.000 | 100.000 okuma başına 0,03 $ |
| Firestore yazma | günde 20.000 | 100.000 yazma başına 0,09 $ |

- Başlangıçta **Spark (ücretsiz) planında** kalınır: kart bağlı değil, sürpriz fatura yok. Kota dolarsa o gün sadece bulut kaydı durur, oyun çalışmaya devam eder.
- Büyüyünce **Blaze**'e geçilir ve Google Cloud'da bütçe uyarısı (ör. 5 $) kurulur.
- Gelişmiş giriş sürümüne (Identity Platform) yükseltme yapılmaz; gerek yok ve Spark'ta günlük 3.000 aktif kullanıcı sınırı getiriyor.

## İş listesi (geliştirme başladığında)

1. Firebase konsolunda Apple, Google, E-posta/şifre sağlayıcılarını aç; Apple Developer'da Sign in with Apple yetkisi (`com.parxi.game`)
2. Paketler: `@react-native-firebase/auth`, `@react-native-firebase/firestore`, Apple ve Google giriş modülleri → yeni geliştirme derlemesi
3. `src/services/account.ts`: giriş, çıkış, silme, token iptali
4. `src/game/cloudSave.ts`: okuma/yazma, birleştirme kuralı (saf fonksiyon + testler)
5. Ayarlar'da Hesap bölümü, ilk girişte "hangisi kalsın" seçimi, 10. seviye önerisi
6. Firestore güvenlik kuralları
7. Gizlilik politikası, STORE.md beyanları, TR/EN metinler
8. Test: iki telefonda aynı hesap, misafir → hesap, hesap silme, çevrimdışıyken oynayıp sonra eşitleme
9. Aynı modülü Glugo ve Floxi'ye taşı


## Firebase konsol adımları (kullanıcının yapacağı)
1. **Authentication → Sign-in method**: *Email/Password*, *Google* ve *Apple* sağlayıcılarını aç.
   - Apple için Services ID gerekmez (yalnız iOS uygulaması); "Apple" sağlayıcısını açmak yeterli.
2. **Firestore Database → Create database** (production mode, bölge: `eur3` ya da `europe-west`).
3. **Firestore → Rules** sekmesine şunu yapıştır ve yayınla:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write, delete: if request.auth != null && request.auth.uid == uid
           && (request.resource == null || request.resource.data.save is string);
       }
     }
   }
   ```
4. Google açıldıktan sonra **Project settings → Your apps**'ten `GoogleService-Info.plist` (iOS) ve `google-services.json` (Android) dosyalarını **yeniden indir**, `~/Parxi`'deki eskilerin yerine koy ve commit et.
   - `app.config.js` bu dosyalarda Google bilgisini (REVERSED_CLIENT_ID, web client id) bulunca Google giriş eklentisini kendiliğinden ekler. Bulamazsa Google düğmesi görünmez, derleme bozulmaz.
   - Android'de Google girişi için Play Console'daki uygulama imzalama SHA-1'i Firebase'e eklenmeli.
5. Apple Developer: "Sign in with Apple" yeteneği EAS derlemesinde kendiliğinden açılır (`ios.usesAppleSignIn: true`).

## Uygulamadaki kurallar
- Giriş isteğe bağlı: Ayarlar → Hesap. Girişsiz oyun aynen çalışır.
- Girişte buluttaki kayıt okunur:
  - Bulutta kayıt yoksa telefondaki yazılır.
  - Telefondaki kayıt boşsa (seviye 1) buluttaki alınır.
  - İkisi farklıysa "Bu telefon (Seviye X) / Hesap (Seviye Y)" diye sorulur. Satın almalar ve sahip olunan kozmetikler her iki durumda korunur.
- Sonraki açılışlarda birleştirme kuralı `src/core/cloud.ts`: ileri olan kayıt kazanır, coin toplanmaz, satın almalar birleşir.
- Yazma: arka plana geçince, her 5 seviyede bir ve "Şimdi eşitle" ile.
- Hesap silme uygulama içinden: buluttaki kayıt + Firebase hesabı silinir, Apple'da token iptal edilir.
- Dosyalar: `src/services/account.ts`, `src/core/cloud.ts`, `src/ui/AccountSheet.tsx`, `app.config.js`.

## Yayın öncesi
- Gizlilik politikası: e-posta adresi ve kullanıcı kimliği (yalnız giriş yapanlar için), oyun ilerlemesi Firestore'da; hesap silme yolu.
- App Store "App Privacy": Contact Info → Email Address (App Functionality, linked to user), Identifiers → User ID.
- Play "Data safety": aynı veriler + "hesap silme isteği" bağlantısı.
