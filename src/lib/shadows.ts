import type { ViewStyle } from 'react-native';

/**
 * Soft UI a 45° desde arriba-izquierda.
 * RN solo soporta una sombra por vista (sin multicapa real como CSS).
 * Estrategia: drop-shadow tintada (nunca negro puro) + bordes por cara
 * (clara arriba-izquierda, oscura abajo-derecha) que simulan la luz.
 */

export const LUZ = 'rgba(255, 255, 255, 0.55)';
export const SOMBRA_BORDE = 'rgba(163, 177, 198, 0.5)';

/** Borde perimetral a 45°: luz arriba/izquierda, sombra abajo/derecha. */
export const borde45: ViewStyle = {
  borderWidth: 1,
  borderTopColor: LUZ,
  borderLeftColor: LUZ,
  borderBottomColor: SOMBRA_BORDE,
  borderRightColor: SOMBRA_BORDE,
};

/** Borde invertido: efecto hundido (inset) en controles presionados. */
export const bordeHundido: ViewStyle = {
  borderWidth: 1,
  borderTopColor: SOMBRA_BORDE,
  borderLeftColor: SOMBRA_BORDE,
  borderBottomColor: LUZ,
  borderRightColor: LUZ,
};

/** Elemento elevado: drop-shadow tintada con el gris sombra. */
export const sombraElevada: ViewStyle = {
  shadowColor: '#A3B1C6',
  shadowOffset: { width: 8, height: 10 },
  shadowOpacity: 0.5,
  shadowRadius: 18,
  elevation: 6,
};

/** Elevación mayor para modales y contenedores principales. */
export const sombraFuerte: ViewStyle = {
  shadowColor: '#A3B1C6',
  shadowOffset: { width: 10, height: 14 },
  shadowOpacity: 0.55,
  shadowRadius: 26,
  elevation: 12,
};

/** Estado hundido: sombra interna simulada (borde invertido + sombra mínima). */
export const sombraHundida: ViewStyle = {
  shadowColor: '#A3B1C6',
  shadowOffset: { width: 2, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 1,
  ...bordeHundido,
};

/** Sombra con tinte del acento, para botones primarios. */
export const sombraAcento = (color: string): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: 6, height: 8 },
  shadowOpacity: 0.4,
  shadowRadius: 14,
  elevation: 6,
});
