// Gizlilik politikası metni (uygulama içinde gösterilir; web sürümü: docs/privacy/index.html).
// Yayından önce DEVELOPER ve EMAIL doldurulmalı (src/config.ts SUPPORT_EMAIL ile aynı).

export const PRIVACY_UPDATED = '26.11.2026';

type Block = { h: string; p: string };

export const PRIVACY: Record<'tr' | 'en', Block[]> = {
  tr: [
    { h: 'Kısaca', p: 'Parxi’yi hesap açmadan oynayabilirsin; bu durumda ilerlemen yalnızca telefonunda saklanır. Hesap açmak isteğe bağlıdır. Senden konum, fotoğraf, rehber veya telefon numarası istemeyiz. Oyunun ücretsiz kalabilmesi için reklam gösteririz ve hataları düzeltmek için anonim kullanım ve çökme verisi toplarız.' },
    { h: 'İsteğe bağlı hesap', p: 'Ayarlar → Hesap bölümünden e-posta/şifre, Google veya Apple ile giriş yaparsan e-posta adresin ve hesap kimliğin Google Firebase Authentication’da, oyun ilerlemen (seviye, coin, garaj, kozmetikler) Google Cloud Firestore’da hesabına bağlı olarak saklanır. Amaç: ilerlemenin kaybolmaması ve başka telefonda devam edebilmen. Hukuki sebep: sözleşmenin ifası. Hesabını Ayarlar → Hesap → “Hesabı sil” ile istediğin an silebilirsin; buluttaki kayıt ve hesap kalıcı olarak silinir.' },
    { h: 'Reklam (Google AdMob)', p: 'Reklam kimliği (IDFA/AAID), cihaz ve uygulama bilgisi ve IP’den yaklaşık ülke bilgisi reklam göstermek ve ölçmek için kullanılır. Kişiselleştirilmiş reklam yalnızca izin verirsen gösterilir (AB/İngiltere’de Google izin formu, iOS’ta takip izni). Tercihini Ayarlar’dan değiştirebilirsin.' },
    { h: 'Kullanım ve hata verisi (Firebase)', p: 'Oyun içi olaylar (ör. seviye bitti), uygulama örneği kimliği, cihaz modeli, işletim sistemi ve ülke Firebase Analytics’e; çökme kayıtları Crashlytics’e gider. Amaç oyunu iyileştirmek ve hataları düzeltmektir. Remote Config ile oyun ayarları güncellenir.' },
    { h: 'Satın almalar', p: 'Ödemeler Apple App Store veya Google Play üzerinden yapılır; kart bilgilerini biz görmeyiz.' },
    { h: 'Yurt dışına aktarım ve saklama', p: 'Google hizmetleri veriyi başta ABD olmak üzere Türkiye dışındaki sunucularda işler. Telefondaki veriler uygulamayı silene kadar, hesap verileri hesabı silene kadar, Analytics verileri en fazla 14 ay, çökme kayıtları 90 gün saklanır.' },
    { h: 'Çocuklar', p: 'Parxi 13 yaşından küçük çocuklara yönelik değildir ve bilerek çocuklardan kişisel veri toplamaz.' },
    { h: 'Hakların (KVKK / GDPR)', p: 'Verilerine erişme, düzeltme, silme ve itiraz haklarına sahipsin. Başvuruların için aşağıdaki e-postaya yaz; 30 gün içinde ücretsiz yanıtlanır.' },
  ],
  en: [
    { h: 'Summary', p: 'You can play Parxi without an account; your progress then stays only on your phone. Creating an account is optional. We never ask for your location, photos, contacts or phone number. We show ads to keep the game free and collect anonymous usage and crash data to fix bugs.' },
    { h: 'Optional account', p: 'If you sign in under Settings → Account with email/password, Google or Apple, your email address and account ID are stored in Google Firebase Authentication and your game progress (level, coins, garage, cosmetics) in Google Cloud Firestore, linked to your account, so you never lose progress and can continue on another phone. You can delete your account at any time in Settings → Account → “Delete account”; the cloud save and the account are permanently deleted.' },
    { h: 'Ads (Google AdMob)', p: 'The advertising ID, device and app information and coarse location from your IP address are used to show and measure ads. Personalized ads only with your consent (Google consent form in the EEA/UK, App Tracking Transparency on iOS). You can change this in Settings.' },
    { h: 'Usage and crash data (Firebase)', p: 'In-game events (e.g. level completed), an app instance ID, device model, OS and country go to Firebase Analytics, and crash logs to Crashlytics, to improve the game and fix bugs. Remote Config updates game settings.' },
    { h: 'Purchases', p: 'Payments are processed by the Apple App Store or Google Play; we never see your payment details.' },
    { h: 'Transfers and retention', p: 'Google processes data on servers outside your country, including the United States. Data on your phone is kept until you uninstall, account data until you delete your account, analytics for up to 14 months and crash logs for 90 days.' },
    { h: 'Children', p: 'Parxi is not directed at children under 13 and does not knowingly collect their data.' },
    { h: 'Your rights', p: 'You may access, correct or delete your data or object to its processing. Email us at the address below; we reply within 30 days.' },
  ],
};
