import type { SQLiteDatabase } from 'expo-sqlite';

import type { Frecuencia } from '@/lib/dates';
import { sumarPeriodo } from '@/lib/dates';

export interface Cuota {
  id: number;
  numero: number;
  montoCents: number;
  fechaVencimiento: string;
  pagadoCents: number;
}

export interface Pago {
  id: number;
  montoCents: number;
  fecha: string;
  nota: string | null;
  createdAt: string;
}

export interface Articulo {
  id: number;
  nombre: string;
  montoInicialCents: number;
  numCuotas: number;
  frecuencia: Frecuencia;
  intervalo: number;
  fechaInicio: string;
  color: string;
  archivado: boolean;
  createdAt: string;
  cuotas: Cuota[];
  pagos: Pago[];
  pagadoCents: number;
  saldoCents: number;
  proximaFecha: string | null;
  montoCuotaCents: number;
}

export interface NuevoArticulo {
  nombre: string;
  montoInicialCents: number;
  montoCuotaCents: number;
  numCuotas: number;
  frecuencia: Frecuencia;
  intervalo: number;
  fechaInicio: string;
  color: string;
}

export interface NuevoPago {
  montoCents: number;
  fecha: string;
  nota: string | null;
}

interface FilaArticulo {
  id: number;
  nombre: string;
  monto_inicial_cents: number;
  num_cuotas: number;
  frecuencia: string;
  intervalo_dias: number;
  fecha_inicio: string;
  color: string;
  archivado: number;
  created_at: string;
}

interface FilaCuota {
  id: number;
  article_id: number;
  numero: number;
  monto_cents: number;
  fecha_vencimiento: string;
  pagado_cents: number;
}

interface FilaPago {
  id: number;
  article_id: number;
  monto_cents: number;
  fecha: string;
  nota: string | null;
  created_at: string;
}

export async function listarArticulos(
  db: SQLiteDatabase,
  incluirArchivados: boolean
): Promise<Articulo[]> {
  const filas = await db.getAllAsync<FilaArticulo>(
    incluirArchivados
      ? 'SELECT * FROM articles ORDER BY archivado ASC, created_at DESC, id DESC'
      : 'SELECT * FROM articles WHERE archivado = 0 ORDER BY created_at DESC, id DESC'
  );
  if (filas.length === 0) {
    return [];
  }

  const cuotas = await db.getAllAsync<FilaCuota>(
    'SELECT * FROM installments ORDER BY article_id ASC, numero ASC'
  );
  const pagos = await db.getAllAsync<FilaPago>(
    'SELECT * FROM payments ORDER BY article_id ASC, fecha ASC, id ASC'
  );

  const cuotasPorArticulo = new Map<number, Cuota[]>();
  for (const fila of cuotas) {
    const lista = cuotasPorArticulo.get(fila.article_id) ?? [];
    lista.push({
      id: fila.id,
      numero: fila.numero,
      montoCents: fila.monto_cents,
      fechaVencimiento: fila.fecha_vencimiento,
      pagadoCents: fila.pagado_cents,
    });
    cuotasPorArticulo.set(fila.article_id, lista);
  }

  const pagosPorArticulo = new Map<number, Pago[]>();
  for (const fila of pagos) {
    const lista = pagosPorArticulo.get(fila.article_id) ?? [];
    lista.push({
      id: fila.id,
      montoCents: fila.monto_cents,
      fecha: fila.fecha,
      nota: fila.nota,
      createdAt: fila.created_at,
    });
    pagosPorArticulo.set(fila.article_id, lista);
  }

  return filas.map((fila) => {
    const cuotasArticulo = cuotasPorArticulo.get(fila.id) ?? [];
    const pagosArticulo = pagosPorArticulo.get(fila.id) ?? [];
    const pagadoCents = pagosArticulo.reduce((total, pago) => total + pago.montoCents, 0);
    const saldoCents = Math.max(0, fila.monto_inicial_cents - pagadoCents);
    const pendiente = cuotasArticulo.find((cuota) => cuota.pagadoCents < cuota.montoCents);

    return {
      id: fila.id,
      nombre: fila.nombre,
      montoInicialCents: fila.monto_inicial_cents,
      numCuotas: fila.num_cuotas,
      frecuencia: fila.frecuencia as Frecuencia,
      intervalo: fila.intervalo_dias,
      fechaInicio: fila.fecha_inicio,
      color: fila.color,
      archivado: fila.archivado === 1,
      createdAt: fila.created_at,
      cuotas: cuotasArticulo,
      pagos: pagosArticulo,
      pagadoCents,
      saldoCents,
      proximaFecha: saldoCents === 0 ? null : (pendiente?.fechaVencimiento ?? null),
      montoCuotaCents: cuotasArticulo[0]?.montoCents ?? 0,
    };
  });
}

export function calcularCuotas(articulo: NuevoArticulo): { montoCents: number; fecha: string }[] {
  const cuotas: { montoCents: number; fecha: string }[] = [];
  const resto = articulo.montoInicialCents - articulo.montoCuotaCents * (articulo.numCuotas - 1);
  for (let indice = 0; indice < articulo.numCuotas; indice += 1) {
    cuotas.push({
      montoCents: indice === articulo.numCuotas - 1 ? resto : articulo.montoCuotaCents,
      fecha: sumarPeriodo(articulo.fechaInicio, articulo.frecuencia, articulo.intervalo, indice),
    });
  }
  return cuotas;
}

export async function crearArticulo(
  db: SQLiteDatabase,
  articulo: NuevoArticulo
): Promise<number> {
  const cuotas = calcularCuotas(articulo);
  if (cuotas.some((cuota) => cuota.montoCents <= 0)) {
    throw new Error('La cuota y el número de cuotas no cubren el monto inicial.');
  }

  let nuevoId = 0;
  await db.withTransactionAsync(async () => {
    const resultado = await db.runAsync(
      `INSERT INTO articles
        (nombre, monto_inicial_cents, num_cuotas, frecuencia, intervalo_dias,
         fecha_inicio, color, archivado, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      articulo.nombre.trim(),
      articulo.montoInicialCents,
      articulo.numCuotas,
      articulo.frecuencia,
      articulo.intervalo,
      articulo.fechaInicio,
      articulo.color,
      new Date().toISOString()
    );
    nuevoId = resultado.lastInsertRowId;

    for (let indice = 0; indice < cuotas.length; indice += 1) {
      await db.runAsync(
        `INSERT INTO installments
          (article_id, numero, monto_cents, fecha_vencimiento, pagado_cents)
         VALUES (?, ?, ?, ?, 0)`,
        nuevoId,
        indice + 1,
        cuotas[indice].montoCents,
        cuotas[indice].fecha
      );
    }
  });

  return nuevoId;
}

export async function editarArticulo(
  db: SQLiteDatabase,
  id: number,
  articulo: NuevoArticulo
): Promise<void> {
  const cuotas = calcularCuotas(articulo);
  if (cuotas.some((cuota) => cuota.montoCents <= 0)) {
    throw new Error('La cuota y el número de cuotas no cubren el monto inicial.');
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE articles SET
        nombre = ?, monto_inicial_cents = ?, num_cuotas = ?, frecuencia = ?,
        intervalo_dias = ?, fecha_inicio = ?, color = ?
       WHERE id = ?`,
      articulo.nombre.trim(),
      articulo.montoInicialCents,
      articulo.numCuotas,
      articulo.frecuencia,
      articulo.intervalo,
      articulo.fechaInicio,
      articulo.color,
      id
    );

    await db.runAsync('DELETE FROM installments WHERE article_id = ?', id);

    for (let indice = 0; indice < cuotas.length; indice += 1) {
      await db.runAsync(
        `INSERT INTO installments
          (article_id, numero, monto_cents, fecha_vencimiento, pagado_cents)
         VALUES (?, ?, ?, ?, 0)`,
        id,
        indice + 1,
        cuotas[indice].montoCents,
        cuotas[indice].fecha
      );
    }

    await reasignar(db, id);
  });
}

export async function archivarArticulo(
  db: SQLiteDatabase,
  id: number,
  archivado: boolean
): Promise<void> {
  await db.runAsync('UPDATE articles SET archivado = ? WHERE id = ?', archivado ? 1 : 0, id);
}

export async function eliminarArticulo(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM articles WHERE id = ?', id);
}

export async function crearPago(
  db: SQLiteDatabase,
  articleId: number,
  pago: NuevoPago
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO payments (article_id, monto_cents, fecha, nota, created_at) VALUES (?, ?, ?, ?, ?)',
      articleId,
      pago.montoCents,
      pago.fecha,
      pago.nota?.trim() ? pago.nota.trim() : null,
      new Date().toISOString()
    );
    await reasignar(db, articleId);
  });
}

export async function editarPago(
  db: SQLiteDatabase,
  pagoId: number,
  articleId: number,
  pago: NuevoPago
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE payments SET monto_cents = ?, fecha = ?, nota = ? WHERE id = ?',
      pago.montoCents,
      pago.fecha,
      pago.nota?.trim() ? pago.nota.trim() : null,
      pagoId
    );
    await reasignar(db, articleId);
  });
}

export async function eliminarPago(
  db: SQLiteDatabase,
  pagoId: number,
  articleId: number
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM payments WHERE id = ?', pagoId);
    await reasignar(db, articleId);
  });
}

/** Reparte todos los abonos del artículo sobre las cuotas pendientes, en orden. */
async function reasignar(db: SQLiteDatabase, articleId: number): Promise<void> {
  await db.runAsync(
    `DELETE FROM payment_allocations
     WHERE payment_id IN (SELECT id FROM payments WHERE article_id = ?)`,
    articleId
  );

  const cuotas = await db.getAllAsync<{ id: number; monto_cents: number }>(
    'SELECT id, monto_cents FROM installments WHERE article_id = ? ORDER BY numero ASC',
    articleId
  );
  const pagos = await db.getAllAsync<{ id: number; monto_cents: number }>(
    'SELECT id, monto_cents FROM payments WHERE article_id = ? ORDER BY fecha ASC, id ASC',
    articleId
  );

  let indiceCuota = 0;
  let aplicadoEnCuota = 0;

  for (const pago of pagos) {
    let restante = pago.monto_cents;
    while (restante > 0 && indiceCuota < cuotas.length) {
      const disponible = cuotas[indiceCuota].monto_cents - aplicadoEnCuota;
      if (disponible <= 0) {
        indiceCuota += 1;
        aplicadoEnCuota = 0;
        continue;
      }
      const aplicar = Math.min(restante, disponible);
      await db.runAsync(
        'INSERT INTO payment_allocations (payment_id, installment_id, monto_cents) VALUES (?, ?, ?)',
        pago.id,
        cuotas[indiceCuota].id,
        aplicar
      );
      restante -= aplicar;
      aplicadoEnCuota += aplicar;
      if (aplicadoEnCuota >= cuotas[indiceCuota].monto_cents) {
        indiceCuota += 1;
        aplicadoEnCuota = 0;
      }
    }
  }

  await db.runAsync(
    `UPDATE installments SET pagado_cents = COALESCE(
       (SELECT SUM(monto_cents) FROM payment_allocations WHERE installment_id = installments.id), 0)
     WHERE article_id = ?`,
    articleId
  );
}
