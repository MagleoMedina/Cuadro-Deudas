import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME, migrar } from './schema';

let promesa: Promise<SQLiteDatabase> | null = null;

/** Abre la base de datos una sola vez y aplica las migraciones. */
export function getDb(): Promise<SQLiteDatabase> {
  if (!promesa) {
    promesa = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await migrar(db);
      return db;
    })();
  }
  return promesa;
}
