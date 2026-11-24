// Ekran düzeni: telefonda tam genişlik, iPad'de içerik ortada en fazla MAX_W genişliğinde.
// Tablette yolcu, durak ve otopark hücreleri k kadar büyür.
import { useWindowDimensions } from 'react-native';

/** Telefonda ekran genişliği, iPad'de içerik sütunu en fazla bu kadar */
export const MAX_W = 820;

export function useLayout() {
  const { width: screenW, height } = useWindowDimensions();
  const tablet = Math.min(screenW, height) >= 600;
  return {
    /** İçeriğin kullanabileceği genişlik */
    width: Math.min(screenW, MAX_W),
    height,
    tablet,
    /** Tablette yolcu, durak gibi öğeler bu kadar büyür */
    k: tablet ? 1.3 : 1,
  };
}
