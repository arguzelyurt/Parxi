# Parxi — Hareketli harita: Katlı otopark (planlandı)

Onaylanan tasarım: A (Oyuncak şehir) + D (Katlı otopark) harmanı.
Tasarımlar: https://claude.ai/artifact/45oxcLkAQ2uAW5gZWCqs8m ("A + D harmanı" satırı; karşılaştırma için mevcut harita ekran görüntüleri de orada)

Durum: **H1–H3 geliştirildi** (`src/ui/MapScreen.tsx`, `FloorView.tsx`, `anim.tsx`). Kat kartlarına "sıradaki kat" durumu eklendi (açık ama daha gelinmemiş kat). Kalan: H4 telefonda deneme. Faz 4.9 ekonomi planıyla (docs/PLAN-EKONOMI.md) birlikte yürür; "önceki 3 dünya bitince sonraki 3 açılır" ve "harita yukarıdan aşağı" kuralları buradaki düzene uygulanır.

## Neden
Şu anki harita tek uzun kaydırmalı yol: büyük düğümler, araya giren başlık ve ödül kartları, durağan. İstenen: daha küçük ama hareketli, dikkat çeken bir harita.

## 1. Genel görünüm: "Parxi Otoparkı" (Harita sekmesi)
- Her harita bir **kat**: -1 KAT Mahalle, -2 KAT Çarşı … Katlar yukarıdan aşağı sıralanır, oyuncu aşağı iner.
- Kat kartı (küçük, ~110 pt): kat etiketi, harita adı, ilerleme (4/15) ve bir sıra mini araç.
  - **Biten kat:** yeşil çerçeve, araçlar park etmiş, parıldayan yıldız.
  - **Bulunduğun kat:** mavi çerçeve. Park etmiş araçlar hafifçe kıpırdar. **Vitrindeki araba** bu sırada küçük zıplar ve kat kartının çizgileri içinde kalır (kart taşmayı keser). Sağda "Giriş ▶" düğmesi atar.
  - **Sandık katı / kısım ödülü:** altın çerçeve, sandık arada bir sallanır.
  - **Kilitli kat:** sarı-siyah şerit, kilit titrer, bariyer inip kalkar, üstünden bulut kayar.
- Sağda **rampa yolu**: katları birbirine bağlayan kıvrımlı yol, şerit çizgisi akar.
  - Rampada **oyuncunun garajında gerçekten açılmış arabalar** kattan kata iner (görseller assets/cars, sahip olunanlardan rastgele 3–4 tane).
  - Trafik lambası yanıp söner.
- Kata dokunmak ya da "Giriş" kat içine götürür.

## 2. Kat içi (bir haritanın seviyeleri)
- Üstte: "◀ Otopark" geri düğmesi, kat etiketi + harita adı, coin sayacı, ilerleme çubuğu (n/15) ve kat sandığı.
- Ortada otopark alanı: her **seviye bir park yeri**, yılan düzeni (üst sıra soldan sağa, orta sağdan sola, alt soldan sağa). Haritanın uzunluğu kadar yer; sıra sayısı haritaya göre değişir.
- Çevre yolunda garaj arabaları dolaşır, giriş bariyeri açılıp kapanır, trafik lambası yanıp söner.
- Dört durum:
  1. **Aktif kat:** biten yerlerde renkli araç park etmiş, altında yıldızlar. Sıradaki yer nabız gibi atar, içinde vitrin araban bekler. Son yer kat sandığı. Altta "Sıradaki: Seviye N" + "▶ Oyna".
  2. **Bitmiş kat:** bütün yerler dolu, eksik yıldızlar sönük. Yere dokununca seviye tekrar oynanır (yalnız yeni yıldızlar coin verir). Altta "Eksik yıldızları topla" + ilk eksik seviyeye kısayol. Sandık "✓ Alındı".
  3. **Kilitli kat:** gri önizleme, bulutlar, kapalı bariyer. Kart: "Bu kat henüz kapalı", açılma koşulu (önceki 3 dünya), kat ödülü. Altta "N seviye kaldı" + bulunduğun kata git.
  4. **Kat tamamlandı:** son araç park edince sandık açılır, coinler sayaca uçar, araçlar zıplar, bariyer kalkar, "Kat tamam!". Altta ödül özeti + "Alt kata in ▼" (genel görünüme dönüp kamera bir sonraki kata kayar).

## Teknik notlar (geliştirme başlayınca)
- MapScreen ikiye ayrılır: `GarageMapScreen` (katlar) ve `FloorScreen` (kat içi). Harita verisi `maps.ts` aynen kullanılır.
- Animasyonlar Reanimated / Animated ile, döngülü ve hafif: yol çizgisi akışı, rampada araç (path üstünde ilerleme), bob/pop/wiggle/pulse, bulut kayması. Ekran dışındaki katların animasyonu durdurulur.
- Rampa ve çevre yolu araçları: `progress.owned` + `CAR_MODELS` içinden sahip olunanlar.
- Vitrin arabası: `favoriteCar`.
- Mevcut "harita ödülü" kartı ve kısım bulutları bu düzene taşınır; `mapThemes.ts` renkleri kat kartlarında vurgu olarak kalabilir.
- Düşük güç modunda / "hareketi azalt" açıkken animasyonlar kapanır.

## Aşamalar
- H1: Katlar ekranı (statik) + kat içi park yeri düzeni + geçişler
- H2: Animasyonlar (rampa araçları, yol akışı, durum animasyonları)
- H3: Kat tamamlama anı + "Alt kata in" kamera kayması
- H4: Web önizlemede ekran görüntüleriyle kontrol, ardından TestFlight
