// Ekran düzeni: telefonda tam genişlik, iPad'de içerik ortada en fazla MAX_W genişliğinde.
import { useWindowDimensions } from 'react-native';

export const MAX_W = 680;

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
