import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import { CarModel } from '../core/garage';
import { UI } from '../game/palette';

// Metro, require yollarının sabit olmasını istiyor
const IMAGES: Record<string, ImageSourcePropType> = {
  minik: require('../../assets/cars/minik.png'),
  sedan: require('../../assets/cars/sedan.png'),
  taksi: require('../../assets/cars/taksi.png'),
  pikap: require('../../assets/cars/pikap.png'),
  minibus: require('../../assets/cars/minibus.png'),
  jip: require('../../assets/cars/jip.png'),
  polis: require('../../assets/cars/polis.png'),
  ambulans: require('../../assets/cars/ambulans.png'),
  klasik: require('../../assets/cars/klasik.png'),
  dondurma: require('../../assets/cars/dondurma.png'),
  karavan: require('../../assets/cars/karavan.png'),
  okul: require('../../assets/cars/okul.png'),
  itfaiye: require('../../assets/cars/itfaiye.png'),
  tir: require('../../assets/cars/tir.png'),
  cabrio: require('../../assets/cars/cabrio.png'),
  spor: require('../../assets/cars/spor.png'),
  limuzin: require('../../assets/cars/limuzin.png'),
  canavar: require('../../assets/cars/canavar.png'),
  f1: require('../../assets/cars/f1.png'),
  super: require('../../assets/cars/super.png'),
  roket: require('../../assets/cars/roket.png'),
  altin: require('../../assets/cars/altin.png'),
};

/** Araba görseli (2:1). silhouette: henüz açılmamış model, tek renk gölge olarak. */
export default function CarArt({ model, width, silhouette }: { model: CarModel; width: number; silhouette?: boolean }) {
  return (
    <Image
      source={IMAGES[model.key]}
      style={{ width, height: width / 2, tintColor: silhouette ? UI.secret : undefined }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
