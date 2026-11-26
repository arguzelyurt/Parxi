// Garaj: seviyelere bağlı açılan araba modelleri. Görseller assets/cars/<key>.png
// (768x384, sağa bakan, şeffaf arka plan; dışarıdan gelen görseller scripts/fit_car.py ile uyarlanır). Model, `level` numaralı seviye
// bitirilince açılır (ilk model baştan açık). Güzel modeller bilerek ileri seviyelerde.

export interface CarModel {
  key: string;
  /** Açıldığı seviye (özel arabalarda 0: yalnız market'ten) */
  level: number;
  special?: boolean;
}

export const CAR_MODELS: CarModel[] = [
  { key: 'altin', level: 1 },
  { key: 'taksi', level: 3 },
  { key: 'jip', level: 6 },
  { key: 'sedan', level: 10 },
  { key: 'golf', level: 15 },
  { key: 'polis', level: 20 },
  { key: 'dondurma', level: 25 },
  { key: 'klasik', level: 30 },
  { key: 'itfaiye', level: 40 },
  { key: 'minibus', level: 50 },
  { key: 'minik', level: 60 },
  { key: 'karavan', level: 70 },
  { key: 'cabrio', level: 80 },
  { key: 'ambulans', level: 95 },
  { key: 'okul', level: 110 },
  { key: 'pikap', level: 125 },
  { key: 'tir', level: 140 },
  { key: 'super', level: 160 },
  { key: 'limuzin', level: 180 },
  { key: 'f1', level: 200 },
  { key: 'canavar', level: 230 },
  { key: 'future', level: 260 },
];

/** Yalnız market'te coin ile alınan özel arabalar (market kimliği: 'garage:<key>') */
export const SPECIAL_CARS: CarModel[] = ['cop', 'pizza', 'safari', 'vincli', 'uzay', 'elektrik', 'ralli'].map((key) => ({
  key,
  level: 0,
  special: true,
}));

export const carByKey = (key: string): CarModel =>
  CAR_MODELS.find((m) => m.key === key) ?? SPECIAL_CARS.find((m) => m.key === key) ?? CAR_MODELS[0];

/** Bitirilen en yüksek seviyeye göre açılmış modeller */
export const unlockedCars = (levelsDone: number): CarModel[] => CAR_MODELS.filter((m) => m.level <= Math.max(1, levelsDone));

/** Bu seviye bitince açılan model (yoksa null) */
export const carUnlockedAt = (level: number): CarModel | null => (level > 1 ? (CAR_MODELS.find((m) => m.level === level) ?? null) : null);

/** Sıradaki kilitli model */
export const nextCar = (levelsDone: number): CarModel | null => CAR_MODELS.find((m) => m.level > Math.max(1, levelsDone)) ?? null;
