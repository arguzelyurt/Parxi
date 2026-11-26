// app.json'u temel alır; Google ile girişi yalnız Firebase'de Google açılıp yapılandırma dosyaları
// yenilendiyse ekler (yoksa derleme bozulmasın). Ayrıntı: docs/HESAP.md
const fs = require('fs');
const path = require('path');

function googleConfig() {
  try {
    const plist = fs.readFileSync(path.join(__dirname, 'GoogleService-Info.plist'), 'utf8');
    const reversed = /<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1];
    const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'google-services.json'), 'utf8'));
    const web = (json.client ?? [])
      .flatMap((c) => c.oauth_client ?? [])
      .find((o) => o.client_type === 3)?.client_id;
    return reversed && web ? { reversed, web } : null;
  } catch {
    return null;
  }
}

module.exports = ({ config }) => {
  const g = googleConfig();
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ...(g ? ['@react-native-google-signin/google-signin'] : [])],
    extra: { ...(config.extra ?? {}), googleWebClientId: g?.web ?? '' },
  };
};
