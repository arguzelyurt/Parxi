// Garaj: seviyelere bağlı açılan araba modelleri. Görseller assets/cars/<key>.png
// (özgün çizimler, scripts/make_cars.py ile üretilir). Model, `level` numaralı seviye
// bitirilince açılır (ilk model baştan açık). Güzel modeller bilerek ileri seviyelerde.

export interface CarModel {
  key: string;
  level: number;
}

export const CAR_MODELS: CarModel[] = [
  { key: 'minik', level: 1 },
  { key: 'sedan', level: 3 },
  { key: 'taksi', level: 6 },
  { key: 'pikap', level: 10 },
  { key: 'minibus', level: 15 },
  { key: 'jip', level: 20 },
  { key: 'polis', level: 25 },
  { key: 'ambulans', level: 30 },
  { key: 'klasik', level: 40 },
  { key: 'dondurma', level: 50 },
  { key: 'karavan', level: 60 },
  { key: 'okul', level: 70 },
  { key: 'itfaiye', level: 80 },
  { key: 'tir', level: 95 },
  { key: 'cabrio', level: 110 },
  { key: 'spor', level: 125 },
  { key: 'limuzin', level: 140 },
  { key: 'canavar', level: 160 },
  { key: 'f1', level: 180 },
  { key: 'super', level: 200 },
  { key: 'roket', level: 230 },
  { key: 'altin', level: 260 },
];

export const carByKey = (key: string): CarModel => CAR_MODELS.find((m) => m.key === key) ?? CAR_MODELS[0];

/** Bitirilen en yüksek seviyeye göre açılmış modeller */
export const unlockedCars = (levelsDone: number): CarModel[] => CAR_MODELS.filter((m) => m.level <= Math.max(1, levelsDone));

/** Bu seviye bitince açılan model (yoksa null) */
export const carUnlockedAt = (level: number): CarModel | null => (level > 1 ? (CAR_MODELS.find((m) => m.level === level) ?? null) : null);

/** Sıradaki kilitli model */
export const nextCar = (levelsDone: number): CarModel | null => CAR_MODELS.find((m) => m.level > Math.max(1, levelsDone)) ?? null;
