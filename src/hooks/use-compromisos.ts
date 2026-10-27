import { useCallback, useEffect, useState } from 'react';

import { getDb } from '@/db';
import {
  archivarArticulo as archivarArticuloDb,
  crearArticulo as crearArticuloDb,
  crearPago as crearPagoDb,
  editarArticulo as editarArticuloDb,
  editarPago as editarPagoDb,
  eliminarArticulo as eliminarArticuloDb,
  eliminarPago as eliminarPagoDb,
  listarArticulos,
  type Articulo,
  type NuevoArticulo,
  type NuevoPago,
} from '@/db/repo';

async function cargarArticulos(incluirArchivados: boolean): Promise<Articulo[]> {
  const db = await getDb();
  return listarArticulos(db, incluirArchivados);
}

export function useCompromisos() {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [incluirArchivados, setIncluirArchivados] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async (incluir?: boolean) => {
    try {
      const datos = await cargarArticulos(incluir ?? incluirArchivados);
      setArticulos(datos);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la base de datos.');
    } finally {
      setCargando(false);
    }
  }, [incluirArchivados]);

  useEffect(() => {
    let activo = true;
    void (async () => {
      try {
        const datos = await cargarArticulos(incluirArchivados);
        if (activo) {
          setArticulos(datos);
          setError(null);
        }
      } catch (e) {
        if (activo) {
          setError(e instanceof Error ? e.message : 'No se pudo leer la base de datos.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    })();
    return () => {
      activo = false;
    };
  }, [incluirArchivados]);

  const crearArticulo = useCallback(async (articulo: NuevoArticulo) => {
    const db = await getDb();
    await crearArticuloDb(db, articulo);
    await recargar();
  }, [recargar]);

  const editarArticulo = useCallback(async (id: number, articulo: NuevoArticulo) => {
    const db = await getDb();
    await editarArticuloDb(db, id, articulo);
    await recargar();
  }, [recargar]);

  const eliminarArticulo = useCallback(async (id: number) => {
    const db = await getDb();
    await eliminarArticuloDb(db, id);
    await recargar();
  }, [recargar]);

  const archivarArticulo = useCallback(async (id: number, archivado: boolean) => {
    const db = await getDb();
    await archivarArticuloDb(db, id, archivado);
    await recargar();
  }, [recargar]);

  const crearPago = useCallback(async (articleId: number, pago: NuevoPago) => {
    const db = await getDb();
    await crearPagoDb(db, articleId, pago);
    await recargar();
  }, [recargar]);

  const editarPago = useCallback(async (pagoId: number, articleId: number, pago: NuevoPago) => {
    const db = await getDb();
    await editarPagoDb(db, pagoId, articleId, pago);
    await recargar();
  }, [recargar]);

  const eliminarPago = useCallback(async (pagoId: number, articleId: number) => {
    const db = await getDb();
    await eliminarPagoDb(db, pagoId, articleId);
    await recargar();
  }, [recargar]);

  return {
    articulos,
    cargando,
    error,
    incluirArchivados,
    setIncluirArchivados,
    recargar,
    crearArticulo,
    editarArticulo,
    eliminarArticulo,
    archivarArticulo,
    crearPago,
    editarPago,
    eliminarPago,
  };
}
