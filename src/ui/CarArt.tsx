import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import { CAR_MODELS, CarModel } from '../core/garage';
import { UI } from '../game/palette';

// Metro, require yollarının sabit olmasını istiyor
const IMAGES: Record<string, ImageSourcePropType> = {
  altin: require('../../assets/cars/altin.png'),
  taksi: require('../../assets/cars/taksi.png'),
  jip: require('../../assets/cars/jip.png'),
  sedan: require('../../assets/cars/sedan.png'),
  golf: require('../../assets/cars/golf.png'),
  polis: require('../../assets/cars/polis.png'),
  dondurma: require('../../assets/cars/dondurma.png'),
  klasik: require('../../assets/cars/klasik.png'),
  itfaiye: require('../../assets/cars/itfaiye.png'),
  minibus: require('../../assets/cars/minibus.png'),
  minik: require('../../assets/cars/minik.png'),
  karavan: require('../../assets/cars/karavan.png'),
  cabrio: require('../../assets/cars/cabrio.png'),
  ambulans: require('../../assets/cars/ambulans.png'),
  okul: require('../../assets/cars/okul.png'),
  pikap: require('../../assets/cars/pikap.png'),
  tir: require('../../assets/cars/tir.png'),
  super: require('../../assets/cars/super.png'),
  limuzin: require('../../assets/cars/limuzin.png'),
  f1: require('../../assets/cars/f1.png'),
  canavar: require('../../assets/cars/canavar.png'),
  future: require('../../assets/cars/future.png'),
  // Market'e özel
  cop: require('../../assets/cars/cop.png'),
  pizza: require('../../assets/cars/pizza.png'),
  safari: require('../../assets/cars/safari.png'),
  vincli: require('../../assets/cars/vincli.png'),
  uzay: require('../../assets/cars/uzay.png'),
  elektrik: require('../../assets/cars/elektrik.png'),
  ralli: require('../../assets/cars/ralli.png'),
};

/** Araba görseli (2:1). silhouette: henüz açılmamış model, tek renk gölge olarak. */
export default function CarArt({ model, width, silhouette }: { model: CarModel; width: number; silhouette?: boolean }) {
  return (
    <Image
      source={IMAGES[model.key] ?? IMAGES[CAR_MODELS[0].key]}
      style={{ width, height: width / 2, tintColor: silhouette ? UI.secret : undefined }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
