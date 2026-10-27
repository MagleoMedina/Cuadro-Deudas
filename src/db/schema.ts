import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'cuadro-compromisos.db';
export const DATABASE_VERSION = 1;

export async function migrar(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = fila?.user_version ?? 0;
  if (version >= DATABASE_VERSION) {
    return;
  }

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        monto_inicial_cents INTEGER NOT NULL,
        num_cuotas INTEGER NOT NULL,
        frecuencia TEXT NOT NULL,
        intervalo_dias INTEGER NOT NULL,
        fecha_inicio TEXT NOT NULL,
        color TEXT NOT NULL,
        archivado INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        numero INTEGER NOT NULL,
        monto_cents INTEGER NOT NULL,
        fecha_vencimiento TEXT NOT NULL,
        pagado_cents INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        monto_cents INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        nota TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        installment_id INTEGER NOT NULL REFERENCES installments(id) ON DELETE CASCADE,
        monto_cents INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_installments_article ON installments(article_id);
      CREATE INDEX IF NOT EXISTS idx_payments_article ON payments(article_id);
      CREATE INDEX IF NOT EXISTS idx_allocations_payment ON payment_allocations(payment_id);
      CREATE INDEX IF NOT EXISTS idx_allocations_installment ON payment_allocations(installment_id);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
