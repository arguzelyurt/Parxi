// Bu dosya scripts/make_vehicles.py tarafından üretilir, elle düzenleme.
import { ImageSourcePropType } from 'react-native';

type Kind = 'car' | 'bus' | 'truck';

/** [tür][stil][renk] → görsel; gizli araçlar için hidden[tür] */
export const VEHICLE_IMAGES: Record<Kind, Record<string, ImageSourcePropType[]>> = {
  car: {
    klasik: [require('../../assets/vehicles/car-klasik-0.png'), require('../../assets/vehicles/car-klasik-1.png'), require('../../assets/vehicles/car-klasik-2.png'), require('../../assets/vehicles/car-klasik-3.png'), require('../../assets/vehicles/car-klasik-4.png'), require('../../assets/vehicles/car-klasik-5.png'), require('../../assets/vehicles/car-klasik-6.png'), require('../../assets/vehicles/car-klasik-7.png')],
    parlak: [require('../../assets/vehicles/car-parlak-0.png'), require('../../assets/vehicles/car-parlak-1.png'), require('../../assets/vehicles/car-parlak-2.png'), require('../../assets/vehicles/car-parlak-3.png'), require('../../assets/vehicles/car-parlak-4.png'), require('../../assets/vehicles/car-parlak-5.png'), require('../../assets/vehicles/car-parlak-6.png'), require('../../assets/vehicles/car-parlak-7.png')],
    retro: [require('../../assets/vehicles/car-retro-0.png'), require('../../assets/vehicles/car-retro-1.png'), require('../../assets/vehicles/car-retro-2.png'), require('../../assets/vehicles/car-retro-3.png'), require('../../assets/vehicles/car-retro-4.png'), require('../../assets/vehicles/car-retro-5.png'), require('../../assets/vehicles/car-retro-6.png'), require('../../assets/vehicles/car-retro-7.png')],
    neon: [require('../../assets/vehicles/car-neon-0.png'), require('../../assets/vehicles/car-neon-1.png'), require('../../assets/vehicles/car-neon-2.png'), require('../../assets/vehicles/car-neon-3.png'), require('../../assets/vehicles/car-neon-4.png'), require('../../assets/vehicles/car-neon-5.png'), require('../../assets/vehicles/car-neon-6.png'), require('../../assets/vehicles/car-neon-7.png')],
  },
  bus: {
    klasik: [require('../../assets/vehicles/bus-klasik-0.png'), require('../../assets/vehicles/bus-klasik-1.png'), require('../../assets/vehicles/bus-klasik-2.png'), require('../../assets/vehicles/bus-klasik-3.png'), require('../../assets/vehicles/bus-klasik-4.png'), require('../../assets/vehicles/bus-klasik-5.png'), require('../../assets/vehicles/bus-klasik-6.png'), require('../../assets/vehicles/bus-klasik-7.png')],
    parlak: [require('../../assets/vehicles/bus-parlak-0.png'), require('../../assets/vehicles/bus-parlak-1.png'), require('../../assets/vehicles/bus-parlak-2.png'), require('../../assets/vehicles/bus-parlak-3.png'), require('../../assets/vehicles/bus-parlak-4.png'), require('../../assets/vehicles/bus-parlak-5.png'), require('../../assets/vehicles/bus-parlak-6.png'), require('../../assets/vehicles/bus-parlak-7.png')],
    retro: [require('../../assets/vehicles/bus-retro-0.png'), require('../../assets/vehicles/bus-retro-1.png'), require('../../assets/vehicles/bus-retro-2.png'), require('../../assets/vehicles/bus-retro-3.png'), require('../../assets/vehicles/bus-retro-4.png'), require('../../assets/vehicles/bus-retro-5.png'), require('../../assets/vehicles/bus-retro-6.png'), require('../../assets/vehicles/bus-retro-7.png')],
    neon: [require('../../assets/vehicles/bus-neon-0.png'), require('../../assets/vehicles/bus-neon-1.png'), require('../../assets/vehicles/bus-neon-2.png'), require('../../assets/vehicles/bus-neon-3.png'), require('../../assets/vehicles/bus-neon-4.png'), require('../../assets/vehicles/bus-neon-5.png'), require('../../assets/vehicles/bus-neon-6.png'), require('../../assets/vehicles/bus-neon-7.png')],
  },
  truck: {
    klasik: [require('../../assets/vehicles/truck-klasik-0.png'), require('../../assets/vehicles/truck-klasik-1.png'), require('../../assets/vehicles/truck-klasik-2.png'), require('../../assets/vehicles/truck-klasik-3.png'), require('../../assets/vehicles/truck-klasik-4.png'), require('../../assets/vehicles/truck-klasik-5.png'), require('../../assets/vehicles/truck-klasik-6.png'), require('../../assets/vehicles/truck-klasik-7.png')],
    parlak: [require('../../assets/vehicles/truck-parlak-0.png'), require('../../assets/vehicles/truck-parlak-1.png'), require('../../assets/vehicles/truck-parlak-2.png'), require('../../assets/vehicles/truck-parlak-3.png'), require('../../assets/vehicles/truck-parlak-4.png'), require('../../assets/vehicles/truck-parlak-5.png'), require('../../assets/vehicles/truck-parlak-6.png'), require('../../assets/vehicles/truck-parlak-7.png')],
    retro: [require('../../assets/vehicles/truck-retro-0.png'), require('../../assets/vehicles/truck-retro-1.png'), require('../../assets/vehicles/truck-retro-2.png'), require('../../assets/vehicles/truck-retro-3.png'), require('../../assets/vehicles/truck-retro-4.png'), require('../../assets/vehicles/truck-retro-5.png'), require('../../assets/vehicles/truck-retro-6.png'), require('../../assets/vehicles/truck-retro-7.png')],
    neon: [require('../../assets/vehicles/truck-neon-0.png'), require('../../assets/vehicles/truck-neon-1.png'), require('../../assets/vehicles/truck-neon-2.png'), require('../../assets/vehicles/truck-neon-3.png'), require('../../assets/vehicles/truck-neon-4.png'), require('../../assets/vehicles/truck-neon-5.png'), require('../../assets/vehicles/truck-neon-6.png'), require('../../assets/vehicles/truck-neon-7.png')],
  },
};

export const HIDDEN_IMAGES: Record<Kind, ImageSourcePropType> = {
  car: require('../../assets/vehicles/car-hidden.png'),
  bus: require('../../assets/vehicles/bus-hidden.png'),
  truck: require('../../assets/vehicles/truck-hidden.png'),
};
