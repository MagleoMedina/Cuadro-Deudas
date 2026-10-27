/** Utilidades de dinero. Todos los montos internos se guardan en centavos enteros. */

/** Convierte texto libre ("1,234.56") a centavos. Devuelve null si no es válido. */
export function parseMontoACentos(texto: string): number | null {
  const limpio = texto.replace(/[^\d.]/g, '');
  if (limpio === '' || limpio === '.') {
    return null;
  }
  const valor = Number(limpio);
  if (!Number.isFinite(valor)) {
    return null;
  }
  return Math.round(valor * 100);
}

/** Formatea centavos como "$1,234.56". */
export function formatearMonto(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(Math.round(centavos));
  const entero = Math.floor(absoluto / 100);
  const decimales = String(absoluto % 100).padStart(2, '0');
  const conSeparadores = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${signo}$${conSeparadores}.${decimales}`;
}

/** Texto editable para un input a partir de centavos. */
export function montoAInput(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

/** Centavos a texto sin símbolo, para PDF. */
export function montoSinSimbolo(centavos: number): string {
  return formatearMonto(centavos).replace('$', '');
}
