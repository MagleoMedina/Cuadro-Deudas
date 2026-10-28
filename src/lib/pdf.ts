import { File, Paths } from 'expo-file-system';
import { writeAsStringAsync } from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Articulo } from '@/db/repo';

import { colorDe } from './colors';
import { formatearFecha, hoyISO } from './dates';
import { formatearMonto } from './money';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function construirHtml(articulos: Articulo[], generadoEn: Date = new Date()): string {
  const desgloses = articulos
    .map((articulo) => {
      const color = colorDe(articulo.color);
      const cuotas = (() => {
        let acumulado = 0;
        return articulo.cuotas
          .map((cuota) => {
            const pagada = cuota.pagadoCents >= cuota.montoCents;
            const parcial = !pagada && cuota.pagadoCents > 0;
            const estado = pagada ? 'Pagada' : parcial ? 'Parcial' : 'Pendiente';
            const claseEstado = pagada
              ? 'estado-pagada'
              : parcial
                ? 'estado-parcial'
                : 'estado-pendiente';
            acumulado += cuota.pagadoCents;
            const saldoGeneral = Math.max(0, articulo.montoInicialCents - acumulado);
            return `
            <tr>
              <td>${cuota.numero}</td>
              <td class="num">${formatearMonto(cuota.montoCents)}</td>
              <td>${formatearFecha(cuota.fechaVencimiento)}</td>
              <td class="num">${formatearMonto(cuota.pagadoCents)}</td>
              <td class="${claseEstado}">${estado}</td>
              <td class="num ${saldoGeneral === 0 ? 'saldo-cero' : ''}">${formatearMonto(saldoGeneral)}</td>
            </tr>`;
          })
          .join('');
      })();

      return `
        <section class="bloque" style="border-left:6px solid ${color.borde}">
          <h2 style="color:${color.texto}">${escapar(articulo.nombre)}</h2>
          <p class="meta">
            Monto inicial ${formatearMonto(articulo.montoInicialCents)} ·
            Cuota ${formatearMonto(articulo.montoCuotaCents)} ·
            Abonado ${formatearMonto(articulo.pagadoCents)} ·
            Saldo ${formatearMonto(articulo.saldoCents)}
          </p>
          <table class="cuotas">
            <thead>
              <tr>
                <th>#</th>
                <th>Monto</th>
                <th>Vencimiento</th>
                <th>Pagado</th>
                <th>Estado</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>${cuotas}</tbody>
          </table>
        </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 24px; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 0; font-size: 14px; }
  h1 { font-size: 28px; margin: 0 0 4px; text-align: center; }
  .fecha { color: #6B7280; font-size: 13px; margin: 0 0 20px; text-align: center; }
  table { width: auto; border-collapse: collapse; font-size: 14px; margin: 0 auto; }
  th { background: #111827; color: #FFFFFF; text-align: left; padding: 10px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; }
  td { padding: 10px 14px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .estado-pagada { color: #047857; font-weight: 700; white-space: nowrap; }
  .estado-parcial { color: #EA580C; font-weight: 700; white-space: nowrap; }
  .estado-pendiente { color: #4B5563; white-space: nowrap; }
  .saldo-cero { color: #047857; font-weight: 700; }
  .bloque { margin-top: 22px; padding: 10px 14px; background: #FFFFFF; page-break-inside: avoid; }
  .bloque h2 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #4B5563; margin: 0 0 8px; }
  .cuotas th { background: #F3F4F6; color: #374151; }
  .vacio { color: #6B7280; font-size: 13px; padding: 16px 0; text-align: center; }
</style>
</head>
<body>
  <h1>Cuadro Compromisos Eduardo</h1>
  <p class="fecha">Generado el ${formatearFecha(
    `${generadoEn.getFullYear()}-${String(generadoEn.getMonth() + 1).padStart(2, '0')}-${String(
      generadoEn.getDate()
    ).padStart(2, '0')}`
  )}</p>

  ${articulos.length === 0 ? '<p class="vacio">Sin artículos registrados.</p>' : desgloses}
</body>
</html>`;
}

export async function exportarPdf(articulos: Articulo[]): Promise<void> {
  const html = construirHtml(articulos);

  if (!(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ html });
    return;
  }

  // El URI que devuelve printToFileAsync no tiene permiso READ para
  // expo-file-system ni expo-sharing en Android ("Not allowed to read
  // file" / "Missing 'READ' permission"). Solución: pedir el PDF en
  // base64 y escribirlo nosotros en Paths.cache con la API legacy
  // (encoding base64). El archivo resultante sí es compartible —
  // mismo origen que exportarRespaldo en backup.ts.
  const { base64 } = await Print.printToFileAsync({ html, base64: true });
  if (!base64) {
    throw new Error('El PDF se generó vacío. Intenta de nuevo.');
  }

  const destino = new File(Paths.cache, `cuadro-compromisos-${hoyISO()}.pdf`);
  if (destino.exists) {
    destino.delete();
  }
  destino.create();
  await writeAsStringAsync(destino.uri, base64, { encoding: 'base64' });

  await Sharing.shareAsync(destino.uri, {
    UTI: 'com.adobe.pdf',
    mimeType: 'application/pdf',
    dialogTitle: 'Cuadro Compromisos Eduardo',
  });
}
