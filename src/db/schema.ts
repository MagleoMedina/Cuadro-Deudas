import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'cuadro-compromisos.db';
export const DATABASE_VERSION = 3;

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

  if (version < 2) {
    await db.execAsync(
      `ALTER TABLE payments ADD COLUMN tipo TEXT NOT NULL DEFAULT 'abono'`
    );
  }

  // v3: la cancelación inicial deja de repartirse entre las cuotas. El monto
  // financiado pasa a ser monto total − cuota inicial, así que las cuotas
  // existentes se recalculan y se liberan los repartos del pago inicial.
  if (version < 3) {
    await db.execAsync(`
      DELETE FROM payment_allocations
      WHERE payment_id IN (SELECT id FROM payments WHERE tipo = 'inicial');
    `);

    const articulos = await db.getAllAsync<{
      id: number;
      monto_inicial_cents: number;
      inicial: number;
    }>(`
      SELECT a.id, a.monto_inicial_cents,
        COALESCE((SELECT SUM(p.monto_cents) FROM payments p
                  WHERE p.article_id = a.id AND p.tipo = 'inicial'), 0) AS inicial
      FROM articles a
      WHERE COALESCE((SELECT SUM(p.monto_cents) FROM payments p
                      WHERE p.article_id = a.id AND p.tipo = 'inicial'), 0) > 0
    `);

    for (const articulo of articulos) {
      const financiado = articulo.monto_inicial_cents - articulo.inicial;
      const cuotas = await db.getAllAsync<{ id: number; monto_cents: number }>(
        'SELECT id, monto_cents FROM installments WHERE article_id = ? ORDER BY numero ASC',
        articulo.id
      );
      if (financiado <= 0 || cuotas.length === 0) {
        continue;
      }

      const n = cuotas.length;
      const cuota = cuotas[0].monto_cents;
      const resto = financiado - cuota * (n - 1);

      if (resto > 0) {
        for (let indice = 0; indice < n; indice += 1) {
          await db.runAsync(
            'UPDATE installments SET monto_cents = ? WHERE id = ?',
            indice === n - 1 ? resto : cuota,
            cuotas[indice].id
          );
        }
      } else {
        const base = Math.floor(financiado / n);
        let acumulado = 0;
        for (let indice = 0; indice < n; indice += 1) {
          const monto = indice === n - 1 ? financiado - acumulado : base;
          acumulado += monto;
          await db.runAsync(
            'UPDATE installments SET monto_cents = ? WHERE id = ?',
            monto,
            cuotas[indice].id
          );
        }
      }
    }

    await db.execAsync(`
      UPDATE installments SET pagado_cents = COALESCE(
        (SELECT SUM(monto_cents) FROM payment_allocations
         WHERE installment_id = installments.id), 0);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
