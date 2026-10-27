/** Paleta automática para diferenciar artículos. */

export interface ColorArticulo {
  fondo: string;
  borde: string;
  texto: string;
}

export const PALETA: ColorArticulo[] = [
  { fondo: '#EFF6FF', borde: '#3B82F6', texto: '#1E3A8A' },
  { fondo: '#F0FDF4', borde: '#22C55E', texto: '#14532D' },
  { fondo: '#FEF3C7', borde: '#F59E0B', texto: '#78350F' },
  { fondo: '#FDF2F8', borde: '#EC4899', texto: '#831843' },
  { fondo: '#F5F3FF', borde: '#8B5CF6', texto: '#4C1D95' },
  { fondo: '#ECFEFF', borde: '#06B6D4', texto: '#164E63' },
  { fondo: '#FFF7ED', borde: '#F97316', texto: '#7C2D12' },
  { fondo: '#F7FEE7', borde: '#84CC16', texto: '#365314' },
  { fondo: '#FEF2F2', borde: '#EF4444', texto: '#7F1D1D' },
  { fondo: '#EEF2FF', borde: '#6366F1', texto: '#312E81' },
  { fondo: '#F0FDFA', borde: '#14B8A6', texto: '#134E4A' },
  { fondo: '#FAF5FF', borde: '#A855F7', texto: '#581C87' },
];

export function colorPorIndice(indice: number): string {
  return PALETA[indice % PALETA.length].borde;
}

export function colorDe(borde: string): ColorArticulo {
  return PALETA.find((c) => c.borde === borde) ?? PALETA[0];
}
