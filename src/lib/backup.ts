import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { hoyISO } from './dates';

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
  tipo?: string;
  created_at: string;
}

interface FilaReparto {
  id: number;
  payment_id: number;
  installment_id: number;
  monto_cents: number;
}

interface Respaldo {
  app: string;
  version: number;
  exportadoEn: string;
  articles: FilaArticulo[];
  installments: FilaCuota[];
  payments: FilaPago[];
  payment_allocations: FilaReparto[];
}

const NOMBRE_APP = 'cuadro-compromisos-eduardo';

export async function exportarRespaldo(db: SQLiteDatabase): Promise<void> {
  const respaldo: Respaldo = {
    app: NOMBRE_APP,
    version: 1,
    exportadoEn: new Date().toISOString(),
    articles: await db.getAllAsync<FilaArticulo>('SELECT * FROM articles ORDER BY id'),
    installments: await db.getAllAsync<FilaCuota>('SELECT * FROM installments ORDER BY id'),
    payments: await db.getAllAsync<FilaPago>('SELECT * FROM payments ORDER BY id'),
    payment_allocations: await db.getAllAsync<FilaReparto>(
      'SELECT * FROM payment_allocations ORDER BY id'
    ),
  };

  const archivo = new File(Paths.cache, `${NOMBRE_APP}-${hoyISO()}.json`);
  if (archivo.exists) {
    archivo.delete();
  }
  archivo.create();
  await archivo.write(JSON.stringify(respaldo, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Respaldo Cuadro Compromisos Eduardo',
    });
  }
}

/** Reemplaza toda la información local con la del archivo. Devuelve cuántos artículos importó. */
export async function importarRespaldo(db: SQLiteDatabase): Promise<number> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (resultado.canceled || resultado.assets.length === 0) {
    return 0;
  }

  const archivo = new File(resultado.assets[0].uri);
  const contenido = await archivo.text();
  const datos = JSON.parse(contenido) as Partial<Respaldo>;

  if (
    datos.app !== NOMBRE_APP ||
    !Array.isArray(datos.articles) ||
    !Array.isArray(datos.installments) ||
    !Array.isArray(datos.payments) ||
    !Array.isArray(datos.payment_allocations)
  ) {
    throw new Error('El archivo no es un respaldo válido de esta app.');
  }

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM payment_allocations;
      DELETE FROM payments;
      DELETE FROM installments;
      DELETE FROM articles;
    `);

    for (const fila of datos.articles as FilaArticulo[]) {
      await db.runAsync(
        `INSERT INTO articles
          (id, nombre, monto_inicial_cents, num_cuotas, frecuencia, intervalo_dias,
           fecha_inicio, color, archivado, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.nombre,
        fila.monto_inicial_cents,
        fila.num_cuotas,
        fila.frecuencia,
        fila.intervalo_dias,
        fila.fecha_inicio,
        fila.color,
        fila.archivado,
        fila.created_at
      );
    }

    for (const fila of datos.installments as FilaCuota[]) {
      await db.runAsync(
        `INSERT INTO installments
          (id, article_id, numero, monto_cents, fecha_vencimiento, pagado_cents)
         VALUES (?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.article_id,
        fila.numero,
        fila.monto_cents,
        fila.fecha_vencimiento,
        fila.pagado_cents
      );
    }

    for (const fila of datos.payments as FilaPago[]) {
      await db.runAsync(
        `INSERT INTO payments (id, article_id, monto_cents, fecha, nota, tipo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.article_id,
        fila.monto_cents,
        fila.fecha,
        fila.nota,
        fila.tipo === 'inicial' ? 'inicial' : 'abono',
        fila.created_at
      );
    }

    for (const fila of datos.payment_allocations as FilaReparto[]) {
      await db.runAsync(
        `INSERT INTO payment_allocations (id, payment_id, installment_id, monto_cents)
         VALUES (?, ?, ?, ?)`,
        fila.id,
        fila.payment_id,
        fila.installment_id,
        fila.monto_cents
      );
    }
  });

  return (datos.articles as FilaArticulo[]).length;
}
