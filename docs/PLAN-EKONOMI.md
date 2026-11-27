# Parxi — Çoklu Para, Haftalık Görevler, Sandıklar ve Ekonomi Planı

27 Kasım 2026. **Durum:** plan ve tasarım hazır; geliştirme için kullanıcının onayı bekleniyor.

**Tasarımlar:** "Parxi — Ekonomi, Görevler ve Sandık Tasarımları" (Design tuvali, 8 ekran):
1. Ana sayfa (3 para sayacı)
2. Görevler paneli (Günlük / Haftalık)
3. Topla anı (elmas ve bilet uçuşu)
4. Market: Sandıklar ve Şans Çarkı
5. Market: Elmas
6. Sandık açılışı
7. Tıkanınca elmasla devam
8. Harita: kısım açılış töreni

Ekonominin akışı (kaynaklar → paralar → harcamalar) da tuvalde ayrı bir şema olarak var.

## Kullanıcının kararları (Wordcade için verilen cevapların Parxi'ye uyarlanması)
| # | Konu | Karar | Parxi'de |
|---|---|---|---|
| 1 | Para birimleri | Birden fazla para: coin, elmas, kâğıt para. Ne alınacağı ve ekonomi dengesi planlansın | **Coin** (var) + **Elmas** (yeni) + **Park Bileti** (yeni, "kâğıt para") |
| 2 | Sonraki 3 dünya ne zaman açılsın | Önceki 3'ün bütün bölümleri bitince | Parxi'de seviyeler sırayla oynandığı için **zaten böyle**. Eksik olan yalnız açılış töreni ve ödülü |
| 3 | Harita yönü | Yukarıdan aşağı akar | **Zaten böyle** (Faz 4.8). Değişiklik yok |
| 4 | Toplanmayan günlük ödül | 1 gün geçince alınamaz; kalan süre sayaçla görünür | Panelde yenilenme sayacı **var**. Eksik olanlar: toplanmamış görevde "silinir" uyarısı, yerel saate göre gün ve haftalık görevler |

## Parxi'de zaten olanlar (yeniden yapılmayacak)
- **Coin:** Seviye, yıldız, Günlük Otopark, görev, harita ödülü ve market hediyesiyle kazanılıyor. Güçlendiricilere, kozmetiklere, can doldurmaya (300) ve sürpriz kutuya (1.500) harcanıyor.
- **Görevler:** Görevler paneli var. "Topla" ile coinler sayaca uçuyor, sayaç zıplıyor.
  - Günde 4 görev geliyor, her birinin ikonu var.
  - Sandık çubuğu ve sandık var.
  - Ünlem ve sallanma var.
- **Harita:** Candy Crush tarzı ve yukarıdan aşağı akıyor. 3'erli kısımlar hâlinde; sonraki kısım bulut ve kilit altında.
- **Market:**
  - Günlük hediye (7 günlük seri) ve günün fırsatları.
  - Kategoriler, sürpriz kutu (olasılıklar ekranda yazılı) ve set ödülleri.
- **Diğer:**
  - Can sistemi: 5 can, 10 dakikada bir doluyor.
  - Kumbara ve başlangıç paketi.
  - Gerçek parayla coin paketleri: 500, 1.800, 5.500 ve 16.000 coin.

## Wordcade planından Parxi'ye alınmayanlar
- **XP ve seviye testi istisnası:** Parxi'de XP yok. Seviyeler sırayla açılıyor, seviye testi de yok.
- **Premium abonelik ve dünya paketleri:** Parxi'de onların yerine "Reklamsız" ve "Destekçi" tek seferlik ürünleri var.
- **"Para öğrenmeyi kilitlemez" kuralı:** Parxi'de karşılığı "para seviyeyi satın almaz" kuralı (aşağıda).
- **Sesler:** Parxi'de ses yok, yalnız titreşim var.

## Ekonomi tasarımı
### Temel kural
**Para seviyeyi satın almaz.** Her seviye güçlendirici kullanmadan çözülebilir (üretici bunu garanti ediyor). Para üç şey satar:
- **Rahatlık:** güçlendirici, can, tıkanınca devam.
- **Süs:** kaplama, tema, yolcu, durak, efekt, özel garaj arabası.
- **Sürpriz:** sandık, çark.

Haritalar ve seviyeler yalnız oynayarak açılır.

### Para birimleri
| Para | Görünüm | Rolü | Nereden | Nereye |
|---|---|---|---|---|
| **Coin** | sarı, yıldız kabartmalı jeton (mevcut ikon) | günlük para, bol | seviye, yıldız, Günlük Otopark, günlük görev, harita ödülü, reklam | güçlendiriciler, sıradan/nadir kozmetik, can doldurma, Bronz sandık |
| **Elmas** | mavi kristal | değerli para, az | haftalık görev, harita bitirme, yeni araba açılışı, seri kilometre taşları, set ödülü, gerçek para | tıkanınca devam, sınırsız can 30 dk, seri koruyucu, coin x2, destansı/efsane kozmetik, özel garaj arabası, elmas→coin takası |
| **Park Bileti** | yeşil otopark fişi (delikli kenar, "P") | eğlence parası | günlük sandık, kısım açılışı, haftalık görev, market hediyesi (4. gün), reklam | Gümüş/Altın sandık, şans çarkı (bedava hak bitince), ileride etkinlik girişi |

### Kazanç tablosu (ilk değerler, testten sonra ayarlanacak)
| Kaynak | Bugün | Yeni |
|---|---|---|
| Seviye bitirme | 10 coin + yıldız başı 5 (Zor x2) | aynı |
| Günlük görev (4 tane) | 20–45 coin | aynı. Biri "büyük görev" olur: +2 elmas |
| Günlük sandık (4/4) | 50 coin + 1 ipucu | 50 coin + 1 ipucu + %50 olasılıkla 1 bilet |
| Haftalık görev (3 tane, **yeni**) | — | her biri 10–20 elmas + 1 bilet |
| Günlük Otopark | 30 coin; 7. günde +100 coin | aynı + 7. günde 5 elmas, 30. günde 30 elmas |
| Market günlük hediye | 7 günlük seri (coin ve güçlendirici) | 4. gün 1 bilet, 7. gün 5 elmas eklenir |
| Harita bitirme | 150 + 75×harita coin + güçlendirici | aynı + **10 + 2×harita elmas** |
| Kısım açılışı (3 harita, **yeni tören**) | — | Altın sandık + 2 bilet |
| Yeni araba açılışı | — | 3 elmas |
| Set ödülü (market) | 1.000–4.000 coin | aynı + 10–30 elmas |
| Ödüllü reklam | +1 yer / VIP sabrı / vinç / +1 can | aynı + günde 5 kez "25 coin ya da 1 bilet" |

**Tahmini kazanç:** Günde ~20 dakika (~12 seviye) oynayan aktif bir oyuncu için:
- **Coin:** günde ~550
- **Elmas:** günde ~3, haftalık görevlerle haftada ~65
- **Bilet:** günde ~0,8

### Fiyat listesi
| Ürün | Fiyat | Not |
|---|---|---|
| Geri al / İpucu / Vinç / +1 Yer | 30 / 50 / 80 / 150 coin | mevcut |
| Can doldurma (5) | 300 coin | mevcut |
| **Tıkanınca devam (+1 yer)** | 15 elmas | reklam yoksa ya da reklam hakkı bittiyse; seviye başına 1 kez |
| **Sınırsız can 30 dk** | 20 elmas | |
| **Seri koruyucu** (Günlük Otopark) | 40 elmas | en çok 3 tane birikir |
| **Seri onarma** (48 saat içinde) | 120 elmas | |
| **Coin x2 · 15 dk** | 25 elmas | seviye ödüllerine uygulanır |
| **Elmas → coin takası** | 10 elmas = 500 coin | tersi yok |
| Sıradan / nadir kozmetik | 400–2.100 coin | mevcut |
| Destansı / efsane kozmetik | coin (mevcut) **ya da** 60–300 elmas | ikisi de görünür |
| Özel garaj arabası | coin (mevcut) **ya da** 80–350 elmas | |
| **Bronz sandık** | 400 coin | güçlendirici + coin |
| **Gümüş sandık** | 2 bilet | güçlendirici + coin + %30 kozmetik + az elmas |
| **Altın sandık** | 5 bilet | garantili kozmetik (nadir ve üstü) + elmas |
| **Şans çarkı** | günde 1 bedava, sonra 1 bilet | 8 dilim: coin, ipucu, vinç, +1 yer, 1 bilet, 3 elmas, 10 elmas, büyük ödül |
| Sürpriz kutu | 1.500 coin | Gümüş sandığa dönüşür. Coin fiyatı da kalır, böylece bileti olmayan da açabilir |

Bütün sandıkların ve çarkın olasılıkları ekranda yazar (Apple kuralı 3.1.1).

### Gerçek parayla satılanlar (IAP)
| Ürün | Bugün | Yeni |
|---|---|---|
| Para paketleri | coin: 500 / 1.800 / 5.500 / 16.000 | **elmas:** 80 ($0,99) / 500 ($4,99) / 1.200 ($9,99) / 2.800 ($19,99). Coin ve bilet doğrudan satılmaz, takasla alınır |
| Başlangıç paketi | coin + güçlendirici | 300 elmas + 2.000 coin + 3 bilet + güçlendiriciler ($1,99, tek sefer) |
| Kumbara | coin biriktirir | **elmas kumbarası:** seviye başına 1 elmas, 300'de kırılır ($2,99) |
| Kurtarma ($0,99) | +1 yer | kaldırılır; yerini 15 elmasla devam alır |
| Reklamsız / Destekçi | | aynı; Destekçi'ye bir kez 500 elmas eklenir |

**App Store Connect:** Ürünler henüz oluşturulmadıysa elmas kimlikleriyle açılır (`parxi.gems_80` …). Coin ürünleri açıldıysa satıştan kaldırılır. Eski coin satın almaları geri yüklemede coin olarak kalır.

### Denge ve enflasyon
- **Coin:** Oyuncu kazandığının %60–80'ini harcasın.
  - Haftada bir sıradan kozmetik alabilecek kadar biriktirebilmeli.
  - Bronz sandık ve güçlendiriciler sürekli harcama alanı.
- **Elmas:** Bedava oynayan biri ayda ~250 elmas kazanır.
  - Bu, 1 efsane kozmetik ya da 4–5 seri koruyucu demek.
  - Satın alma "hızlandırır" ama şart olmaz.
- **Bilet:** Haftada ~5 bilet: 1 Altın ya da 2 Gümüş sandık.
- **Sınırlar:**
  - Reklam parası günde 5.
  - Seri koruyucu en çok 3.
  - Tıkanınca devam seviye başına 1.
  - Takas tek yönlü.
  - Coin x2 üst üste binmez.
- **Ölçülecekler** (Firebase Analytics, kişisel veri yok):
  - günlük kazanılan ve harcanan para (türüne göre)
  - bakiye dağılımı
  - en çok alınan ürün
  - toplanmadan silinen görev oranı
  - sandık ve çark kullanımı
- **Tek dosya:** Bütün fiyat ve ödüller `src/core/prices.ts` içinde. Remote Config yalnız güvenli aralıklar içinde ayar yapabilir (reklamdaki FAIR_BOUNDS gibi).

## Görevler
- **Günlük:** 4 görev kalır. Biri "büyük görev" olur: daha zordur ve elmas verir.
- **Haftalık (yeni):** 3 görev, pazartesi 00:00'da yenilenir. Ödülü hafta bitene kadar alınabilir. Örnekler:
  - 40 seviye bitir
  - 1.500 yolcu taşı
  - 25 otobüs doldur
  - 10 seviyeyi 3 yıldızla bitir
  - 3 Zor seviye bitir
  - 5 gün Günlük Otopark oyna
  - 1 harita bitir
- **Panel:**
  - Üstte "Günlük | Haftalık" sekmeleri.
  - Günlükte "Yenilenmesine 15 sa 08 dk", haftalıkta "Yenilenmesine 3 gün 6 sa".
  - **Toplanmamış ödül uyarısı:** Biten ama toplanmamış görevde kırmızı "Bugün 23:59'da silinir" (haftalıkta "Pazar 23:59'da silinir"). Son 1 saatte sayaç kırmızıya döner ve görev ikonu daha sık sallanır.
- **Gün değişimi:**
  - **Bugün:** UTC'ye göre; Türkiye'de gece 03:00'te değişiyor.
  - **Yeni:** Telefonun yerel saatine göre gece 00:00. Saat ileri alınarak hile yapılmasın diye `trustedNow` kullanılır.
  - Günlük Otopark'ın "herkese aynı bulmaca" günü UTC kalır.
- **Toplanmayan ödül:** Gün bitince silinir. Ertesi gün panelde "Dün 1 ödül toplanmadı" diye bir kez hatırlatılır (ödül verilmez).
- **Topla animasyonu:** Mevcut uçuş elmas ve bilet için de çalışır; her para kendi sayacına uçar.

## Harita: kısım açılış töreni
Kısım kuralı aynı. Önceki kısmın son seviyesi bitince haritaya dönüldüğünde (~2,5 sn):
1. Ekran bulut alanına kayar.
2. Bulutlar iki yana dağılır.
3. Kilit sallanır ve kırılır, ışık patlar, titreşim olur.
4. 3 yeni haritanın başlıkları sırayla düşer.
5. "Yeni kısım açıldı!" kartı çıkar: Altın sandık + 2 bilet, "Topla" ile.
6. Haritanın bitirme ödülünde elmas da görünür.

## Ekranlar ve arayüz
- **Üst sayaçlar** (ana sayfa, market, harita, oyun):
  - coin, elmas ve bilet yan yana; her birinin "+" düğmesi kendi yerine götürür
  - oyun ekranında yer dar olduğu için yalnız coin ve can
- **Market:** sekmeler Öne Çıkanlar · Sandıklar · Güçlendirici · Görünüm · Garaj · Elmas. Kozmetiklerin fiyatında coin/elmas seçimi.
- **Sandık açılışı:**
  - Işınlar döner, sandık 3 kez sallanır, kapak açılır.
  - Ödül kartları sırayla döner, nadirlik çerçeveleri parlar.
  - Paralar sayaçlara uçar.
- **Tıkanma kartı:** "📺 Reklam izle +1 yer" ve "💎 15 · +1 yer" yan yana; reklam hakkı bitince yalnız elmas.

## Veri ve teknik
- **Kayıt (Progress):**
  - `wallet: { coins, gems, tickets }` eklenir. Mevcut `coins` alanı buraya taşınır, eski kayıtlar bozulmaz.
  - `walletLog`: son 200 hareket, nedeniyle (ör. `mission:passengers`, `chest:gold`). Hata ayıklama ve bakiye kontrolü için.
  - `weekly: { week, missions, progress, claimed }`, `streakShield`, `boosts: { infiniteLivesUntil, coinX2Until }`, `wheelDay`.
- **Bulut kayıt** (`src/core/cloud.ts`): Elmas ve bilet de "kazanan kaydın değerleri" kuralına uyar, toplanmaz.
- **Yeni çizimler** (`scripts/make_icons.py`): elmas, bilet, bronz/gümüş/altın sandık, şans çarkı, seri koruyucu kalkan, x2 rozeti. Ek paket gerekmez: React Native + mevcut Animated.
- **Uçan paralar:** `FlyCoins` para türü alır (`fly(from, {gems: 2})`). Her sayaç kendini hedef olarak kaydeder.
- **Testler:**
  - cüzdan ve kayıt tutarlılığı (bakiye = kayıtların toplamı)
  - fiyat ve sınır kuralları
  - takasın tek yönlü olması
  - sandık olasılıklarının toplamının 100 olması
  - çarkın günde 1 bedava hakkı
  - yerel gün ve haftalık sıfırlama
  - toplanmayan ödülün silinmesi
  - kısım töreninin bir kez çalışması
  - eski kayıtların taşınması
- **Yeni yerel paket yok.** Yine de TestFlight için yeni bir EAS derlemesi gerekir. Gerçek para ürünleri (elmas paketleri) App Store Connect'te açıldıktan sonra denenebilir.

## Uygulama sırası
1. **E1 — Cüzdan ve 3 para:**
   - `prices.ts`, cüzdan ve kayıt taşıma
   - üst sayaçlar
   - elmas ve bilet ikonları
   - çok paralı uçuş animasyonu
   - mevcut ödüllere elmas eklenmesi: harita, yeni araba, set, seri
2. **E2 — Görevler:**
   - haftalık görevler
   - büyük görev
   - yerel gün
   - "silinir" uyarısı ve son saat uyarısı
3. **E3 — Sandıklar ve çark:**
   - Bronz, Gümüş ve Altın sandık
   - şans çarkı
   - sürpriz kutunun Gümüş sandığa dönüşmesi
   - sandık açılış animasyonu
4. **E4 — Elmas harcama noktaları:**
   - tıkanınca devam
   - sınırsız can
   - seri koruyucu ve seri onarma
   - coin x2
   - takas
   - kozmetiklerde elmas fiyatı
5. **E5 — Harita töreni:** Kısım açılış animasyonu ve ödülü.
6. **E6 — Gerçek para:**
   - elmas paketleri, başlangıç paketi, elmas kumbarası
   - App Store Connect ürünleri
   - STORE.md güncellemesi

Her faz bitince TestFlight'a gönderilir.

---
Tasarımlar (8 ekran + ekonomi akışı): https://claude.ai/artifact/45oxcLkAQ2uAW5gZWCqs8m
