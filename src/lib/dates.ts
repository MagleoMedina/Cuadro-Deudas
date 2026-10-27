/** Utilidades de fechas. Las fechas se guardan como "YYYY-MM-DD" (sin zona horaria). */

export type Frecuencia = 'dias' | 'semanas' | 'meses';

export const FRECUENCIAS: {
  valor: Frecuencia;
  etiqueta: string;
  singular: string;
  plural: string;
}[] = [
  { valor: 'dias', etiqueta: 'Días', singular: 'día', plural: 'días' },
  { valor: 'semanas', etiqueta: 'Semanas', singular: 'semana', plural: 'semanas' },
  { valor: 'meses', etiqueta: 'Meses', singular: 'mes', plural: 'meses' },
];

export function hoyISO(): string {
  return aISO(new Date());
}

export function aISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function desdeISO(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, (mes ?? 1) - 1, dia ?? 1, 12, 0, 0, 0);
}

export function sumarPeriodo(
  iso: string,
  frecuencia: Frecuencia,
  intervalo: number,
  veces: number
): string {
  const base = desdeISO(iso);
  const paso = Math.max(1, intervalo) * Math.max(0, veces);
  if (frecuencia === 'dias') {
    base.setDate(base.getDate() + paso);
  } else if (frecuencia === 'semanas') {
    base.setDate(base.getDate() + paso * 7);
  } else {
    const diaOriginal = base.getDate();
    base.setDate(1);
    base.setMonth(base.getMonth() + paso);
    const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(diaOriginal, ultimoDia));
  }
  return aISO(base);
}

export function formatearFecha(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function etiquetaIntervalo(frecuencia: Frecuencia, intervalo: number): string {
  const base = FRECUENCIAS.find((f) => f.valor === frecuencia) ?? FRECUENCIAS[0];
  if (intervalo <= 1) {
    return `Cada ${base.singular}`;
  }
  return `Cada ${intervalo} ${base.plural}`;
}
