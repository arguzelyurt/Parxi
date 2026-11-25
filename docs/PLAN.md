# Parxi — Oyun Tasarımı ve Faz Planı

## Kısaca

Parxi, "Bus Jam / Car Out" türünde bir renk eşleştirme bulmacası. Glugo ve Floxi ile aynı aileden:
aynı lacivert tasarım, alttaki araç kartları, market, dükkan, adil reklam ve sunucusuz yapı.

Ekranın altında renkli araçlarla dolu bir **otopark** var. Üstte yolcu **kuyruğu** bekliyor,
ikisinin arasında da 5 yerlik bir **durak** var.

1. Önü kenara kadar açık bir araca **dokunursun**. Araç otoparktan çıkar ve durakta boş bir yere geçer.
2. Kuyruğun önündeki yolcu, durakta kendi rengindeki araca biner. Aynı renkte iki araç varsa önce gelene biner.
3. Araç dolunca (araba 4, otobüs 6, tır 8 koltuk) yola çıkar ve durakta yeri boşalır.
4. Öndeki yolcu binecek araç bulamazsa kuyruk bekler. Durak doluyken bu olursa **tıkanırsın**.
5. Bütün yolcular binince seviye biter.

Araçlar sadece ileri gidebilir, bu yüzden hangi aracı hangi sırayla çıkaracağın önemli. Yolcunun istediği
renk en dipte kalmışsa önce önündekileri durağa almak gerekir, ama durak sınırlı.

## Rakiplerden farkımız (Bus Jam, Car Out, Parking Jam…)

| Fark | Neden önemli |
|---|---|
| **Her seviye çözülebilir garanti**: üretici seviyeyi bir çözüm üzerinden kurar, testler ilk 120 seviyeyi o çözümle oynatır | "İmkânsız seviye" şikâyeti olmaz, ipucu her zaman çalışır |
| **Çözümde durakta her zaman bir boş yer kalır** | Oyuncuya nefes payı. Rakipler durağı bilerek sıkıştırıp reklama itiyor |
| **Yıldızlar ustalıktan gelir**: durağı çözümdeki kadar az doldurursan 3 yıldız | Düşünerek oynamayı ödüllendirir |
| **Piksel Garaj**: seviye geçtikçe 22 piksel araba açılır, en güzelleri ileride | Uzun vadeli hedef, sıfır maliyet |
| **Günlük Otopark + paylaşım**: herkese aynı bulmaca, sunucusuz (tohumlu üretim) | Glugo'daki Günlük Tüp gibi her gün gelme sebebi |
| **Adil reklam**: oyun ortasında ve kaybedince reklam yok, ilk 10 seviye reklamsız | Kötü yorum almayı önler |
| **Renk körlüğü modu**: araçlarda ve yolcularda sembol | Erişilebilirlik |

## Teknik kısıtlar (Glugo / Floxi ile aynı)

- Sunucu ve işletme maliyeti yok. Her şey cihazda çalışıyor, seviyeler tohumla üretiliyor.
- Gelir: IAP + reklam (AdMob).
- Expo SDK 58 + React Native 0.88, TypeScript. Reklam, mağaza, bildirim, kayıt (MMKV) ve Firebase katmanı Floxi'den taşındı.
- Ses yok, sadece titreşim (Glugo'daki karar).

## Seviye üretimi (src/core/generator.ts)

- Araçlar **ters çıkış sırasıyla** yerleştirilir: her yeni aracın önündeki yol, ondan sonra çıkacak araçlardan boş olmak zorunda. Böylece geride hangi araçlar kalırsa kalsın en az birinin önü daima açık.
- Yolcu kuyruğu bu çıkış sırası oynanarak yazılır. Durakta aynı anda en fazla `wait` araç bekler (her zaman durak - 1).
- Zorluk eğrisi: ilk 3 seviye öğretici, 4. seviyeden itibaren hızla artar. Izgara 6x5'ten 10x11'e (seviye başına ~20-28 araç), renk 2'den 7'ye (23. seviyede 7), otobüs 3. seviyeden, tır 8. seviyeden itibaren. Kuyruk ilerledikçe daha karışık.
- Her 10. seviye **Zor**: durakta 4 yer, ödül x2.
- 10. seviyeden sonra **gizli araçlar**: önü açılana kadar rengi "?" görünür.
- 16. seviyeden sonra **bariyer**: bir hücreyi kapatır, üstündeki sayı kadar araç yola çıkınca kalkar.
- 24. seviyeden sonra **kilitli araç**: rozetinin rengindeki bir araç yola çıkana kadar yerinden oynamaz.
- 32. seviyeden sonra **VIP yolcu** (taçlı): sıranın önüne gelince sınırlı dokunuş bekler, binemezse seviye kaybedilir.
- Engeller çözümün zaman çizelgesine göre yerleştirilir (bariyerin kalkma sayısı ve kilidin anahtarı, çözümde o araçtan önce dolar), bu yüzden çözülebilirlik garantisi bozulmaz. Her engel ilk geldiği seviyede bir tanıtım kartıyla anlatılır.

## Harita ilerlemesi (src/core/maps.ts)

- 20 harita: Mahalle, Çarşı, Liman, Tren Garı, Havalimanı … Zirve. Her harita bir öncekinden bir seviye uzun: 1. harita 10 seviye (1–10), 2. harita 11 (11–21) … 5. harita 60. seviyede biter, 20. harita 390. seviyede.
- Harita tamamlanınca ödül (bir kez): 150 + 75 × harita coin, ipucu, geri al; 3. haritadan itibaren vinç, 5. haritadan itibaren +1 yer. Ödül harita ilerledikçe büyür.
- Harita sekmesinde bütün haritalar: tamamlananlar ✓, şu anki seviye noktalarıyla, sonrakiler kilitli; her kartta ödül görünür.

## Fazlar

### Faz 1 — Oynanabilir prototip (şu an)
- [x] Floxi'den iskelet: tasarım dili, sekmeler, reklam, mağaza, bildirim, kayıt, TR/EN
- [x] Çekirdek kurallar: otopark, çıkış yolu, durak, yolcu biniş sırası, tıkanma
- [x] Üretici + çözücü + ipucu, Zor seviyeler, gizli araçlar
- [x] Testler (kurallar, ilk 120 seviyenin çözülebilirliği, çözücü, günlükler)
- [x] Oyun ekranı: kuyruk, durak (koltuk göstergesi), otopark, çıkış/çarpma/ayrılış animasyonları, biniş hızı
- [x] Güçlendiriciler: Geri al, İpucu, **Vinç** (önü kapalı aracı kaldırıp durağa koyar), +1 Yer; tıkanınca reklamla kurtarma
- [x] Piksel Garaj: 22 model (Minik → Altın Süper), vitrin arabası ana sayfada, yeni araba kazanma kartında
- [x] Market: güçlendirici paketleri, 5 tema, 4 araç stili (Klasik, Parlak, Retro, Neon)
- [x] Parxi ikonu, açılış ekranı
- [x] İlk açılış öğreticisi (1. seviye: önü açık araç, biniş, önü kapalı araç, durak sınırı)
- [ ] Gerçek cihazda his testi: dokunma alanları, animasyon hızları, zorluk eğrisi
- [ ] 10 kişilik test

### Faz 2 — Gelir ve kalıcılık
- [x] Floxi'den gelen dükkan ürünleri (`parxi.*` kimlikleriyle), kumbara, başlangıç paketi, adil reklam kuralları
- [x] Firebase (proje: parxi-71f97): Analytics, Crashlytics, Remote Config bağlandı. İlk veriler telefonda geliştirme derlemesi çalışınca görünür
- [x] EAS projesi; ilk iOS geliştirme derlemesi başarılı
- [ ] Gerçek cihazda reklam + sandbox satın alma testi
- [x] Yeni engeller: bariyer (16+), kilitli araç (24+), VIP yolcu (32+); tanıtım kartları; tıkanma türüne göre kurtarma (+1 yer, VIP'ye ek sabır, vinç)
- [ ] Oyuncu testinden sonra engellerin geliş seviyeleri ve sıklığı ayarlanacak

### Faz 3 — Meta ve tekrar gelme
- [x] Günlük Otopark + seri + paylaşım metni
- [x] Günlük görevler + sandık, yerel bildirimler (Floxi'den)
- [ ] Garaja yeni modeller (260. seviyeden sonrası)
- [x] Garajda araba detay kartı (büyük görünüm, açıldığı seviye, nadirlik: Sıradan / Nadir / Destansı / Efsane)

### Faz 4 — Yayın · ayrıntı: docs/RELEASE.md
- [x] Mağaza metinleri, ürün listesi, gizlilik beyanları (docs/STORE.md), ekran görüntüleri ve Play görselleri (store/)
- [x] Gizlilik politikası + KVKK taslağı (ad/e-posta eksik, herkese açık yapılmalı) → `src/config.ts`
- [ ] AdMob uygulama ve reklam birimi kimlikleri
- [ ] App Store Connect ve Play Console kurulumu, Play kapalı testi (12 kişi / 14 gün)
- [ ] EAS production derlemesi ve gönderim (`npm run release-check` temiz çıkmalı)

### Faz 4.5 — İlk test geri bildirimi (Kasım 2026)
- [x] Menülerde daha az yazı, daha büyük punto; ana sayfada büyük Oyna, harita ilerlemesi, üç kısayol (Günlük, Garaj, Görevler)
- [x] Zorluk 4. seviyeden itibaren artıyor, engeller daha erken
- [x] Otopark durakla aynı genişlikte, 9x8'den 10x11'e; seviye başına ~20-28 araç; araçlar üstten görünüş çizimleri (scripts/make_vehicles.py), ön/arka belirgin; doygun ve ayırt edici renkler
- [x] Oyun ekranı: yolcular durakta ve büyük, durak yerleri belirgin, otopark daha küçük
- [x] O seviyede açılacak araba otoparkın altında gösteriliyor
- [x] Garaj: piksel yerine özgün yumuşak çizimli araba görselleri (scripts/make_cars.py)
- [x] Harita ilerlemesi ve harita ödülleri (Harita sekmesi; Günlük ana sayfaya taşındı)
- [x] iPad desteği: tablet açık (yalnız dikey, tam ekran), içerik ortada 820 genişliğe kadar, tablette büyük öğeler; iPad mağaza görüntüleri (store/ipad-13*)
- [ ] iPhone mağaza ekran görüntülerini yeni tasarımla yeniden üret

### Faz 4.6 — Market, durak koltukları, kaldığı yerden devam (planlandı) · ayrıntı: docs/PLAN-MARKET-DURAK.md
- [ ] Seviye bitince ilerleme hemen kaydedilsin ("Ana menü" sonrası kaldığı yerden devam; coin çoğaltma açığı kapanır)
- [ ] Durakta saydam tavan: araç kapasitesi kadar koltuk, binen yolcular tepeden görünür, renkler korunur
- [ ] Market: günlük hediye, günün fırsatları, kategoriler, kaplamalar, yolcu görünümleri, özel garaj arabaları, duraklar, kutlama efektleri, sürpriz kutu

### Faz 5 — Hesap ve bulut kayıt (ileride) · ayrıntı: docs/HESAP.md
- [ ] İsteğe bağlı giriş: Apple, Google, e-posta/şifre (Firebase Authentication)
- [ ] İlerlemenin Firestore'a kaydı, telefonlar arası eşitleme, çakışma kuralı
- [ ] Uygulama içinden hesap silme, gizlilik politikası ve mağaza beyanlarının güncellenmesi
- [ ] Parxi'de oturunca Glugo ve Floxi'ye taşıma
