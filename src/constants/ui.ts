import { Platform } from 'react-native';

const serif = Platform.select({ ios: 'Georgia', android: 'serif' }) ?? 'Georgia';

export const UI = {
  fondo: '#E0E5EC',
  tarjeta: '#E0E5EC',
  texto: '#1F2937',
  textoSuave: '#4B5563',
  borde: 'rgba(163, 177, 198, 0.45)',
  bordeLuz: 'rgba(255, 255, 255, 0.55)',
  sombraOscura: '#A3B1C6',
  sombraLuz: '#FFFFFF',
  primario: '#059669',
  primarioSuave: '#D1FAE5',
  textoPrimario: '#FFFFFF',
  peligro: '#DC2626',
  peligroTexto: '#B91C1C',
  peligroSuave: '#FEE2E2',
  exito: '#059669',
  exitoSuave: '#D1FAE5',
  overlay: 'rgba(31, 41, 55, 0.45)',
  sombra: '#2D3748',
  serif,
} as const;
