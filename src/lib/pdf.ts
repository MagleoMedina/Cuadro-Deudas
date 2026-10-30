import { File, Paths } from 'expo-file-system';
import { writeAsStringAsync } from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Articulo } from '@/db/repo';

import { colorDe } from './colors';
import { formatearFecha, hoyISO } from './dates';
import { formatearMonto } from './money';

const CABECERAS = [
  'Articulo',
  'Monto Total',
  'cuota Inicial',
  'Cuota',
  'fecha',
  'cuotas pagadas',
  'cuotas pendientes',
  'Saldo Pagado hasta el día',
  'saldo pendiente restante',
];

const COLORES_CABECERA = [
  '#111827',
  '#1D4ED8',
  '#15803D',
  '#FACC15',
  '#111827',
  '#15803D',
  '#B91C1C',
  '#111827',
  '#B91C1C',
];

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tablaResumen(articulos: Articulo[]): string {
  if (articulos.length === 0) {
    return '<p class="vacio">Sin artículos registrados.</p>';
  }

  const cabecera = CABECERAS.map((titulo, indice) => {
    const colorTexto = COLORES_CABECERA[indice] === '#FACC15' ? '#1F2937' : '#FFFFFF';
    return `<th style="background:${COLORES_CABECERA[indice]};color:${colorTexto}">${titulo}</th>`;
  }).join('');

  const filas = articulos
    .map((articulo) => {
      const color = colorDe(articulo.color);
      return `
        <tr style="background:${color.fondo}">
          <td style="border-left:5px solid ${color.borde}; font-weight:700">${escapar(articulo.nombre)}</td>
          <td class="num">${formatearMonto(articulo.montoInicialCents)}</td>
          <td class="num">${formatearMonto(articulo.cuotaInicialCents)}</td>
          <td class="num">${formatearMonto(articulo.montoCuotaCents)}</td>
          <td class="centro">${formatearFecha(articulo.proximaFecha)}</td>
          <td class="num">${articulo.cuotasPagadas}</td>
          <td class="num">${articulo.cuotasPendientes}</td>
          <td class="num">${formatearMonto(articulo.pagadoCents)}</td>
          <td class="num ${articulo.saldoCents === 0 ? 'saldo-cero' : ''}">${formatearMonto(
            articulo.saldoCents
          )}</td>
        </tr>`;
    })
    .join('');

  return `<table class="resumen">
    <thead><tr>${cabecera}</tr></thead>
    <tbody>${filas}</tbody>
  </table>`;
}

function desgloses(articulos: Articulo[]): string {
  return articulos
    .map((articulo) => {
      const color = colorDe(articulo.color);
      const financiado = Math.max(0, articulo.montoInicialCents - articulo.cuotaInicialCents);
      let acumulado = 0;
      const cuotas = articulo.cuotas
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
          const saldoGeneral = Math.max(0, financiado - acumulado);
          return `
            <tr>
              <td class="centro">${cuota.numero}</td>
              <td class="num">${formatearMonto(cuota.montoCents)}</td>
              <td class="centro">${formatearFecha(cuota.fechaVencimiento)}</td>
              <td class="num">${formatearMonto(cuota.pagadoCents)}</td>
              <td class="${claseEstado}">${estado}</td>
              <td class="num">${formatearMonto(saldoGeneral)}</td>
            </tr>`;
        })
        .join('');

      return `
        <section class="bloque" style="border-left:6px solid ${color.borde}">
          <h2 style="color:${color.texto}">${escapar(articulo.nombre)}</h2>
          <p class="meta">
            Monto total ${formatearMonto(articulo.montoInicialCents)} ·
            Cuota inicial ${formatearMonto(articulo.cuotaInicialCents)} ·
            Financiado ${formatearMonto(
              articulo.montoInicialCents - articulo.cuotaInicialCents
            )} ·
            Cuota ${formatearMonto(articulo.montoCuotaCents)} ·
            Cuotas pagadas ${articulo.cuotasPagadas} ·
            Cuotas pendientes ${articulo.cuotasPendientes} ·
            Saldo pagado ${formatearMonto(articulo.pagadoCents)} ·
            Saldo pendiente ${formatearMonto(articulo.saldoCents)}
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
}

function documento(cuerpo: string, generadoEn: Date): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 24px; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 0; font-size: 13px; }
  h1 { font-size: 28px; margin: 0 0 4px; text-align: center; }
  .fecha { color: #6B7280; font-size: 13px; margin: 0 0 20px; text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #111827; color: #FFFFFF; padding: 8px; font-size: 10px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: .3px; }
  td { padding: 8px; font-size: 11px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .centro { text-align: center; white-space: nowrap; }
  .estado-pagada { color: #047857; font-weight: 700; white-space: nowrap; }
  .estado-parcial { color: #EA580C; font-weight: 700; white-space: nowrap; }
  .estado-pendiente { color: #4B5563; white-space: nowrap; }
  .saldo-cero { color: #047857; font-weight: 700; }
  .resumen { margin-bottom: 26px; }
  .bloque { margin-top: 22px; padding: 10px 14px; background: #FFFFFF; page-break-inside: avoid; }
  .bloque h2 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #4B5563; margin: 0 0 8px; }
  .cuotas { font-size: 11px; }
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
  ${cuerpo}
</body>
</html>`;
}

/** PDF del cuadro general: una fila por artículo, sin desglose de cuotas. */
export function construirHtmlResumen(
  articulos: Articulo[],
  generadoEn: Date = new Date()
): string {
  return documento(tablaResumen(articulos), generadoEn);
}

/** PDF completo: cuadro general + desglose de cuotas por artículo. */
export function construirHtml(articulos: Articulo[], generadoEn: Date = new Date()): string {
  return documento(`${tablaResumen(articulos)}${desgloses(articulos)}`, generadoEn);
}

export async function exportarPdfResumen(articulos: Articulo[]): Promise<void> {
  await compartirPdf(construirHtmlResumen(articulos), `cuadro-resumen-${hoyISO()}.pdf`);
}

export async function exportarPdf(articulos: Articulo[]): Promise<void> {
  await compartirPdf(construirHtml(articulos), `cuadro-compromisos-${hoyISO()}.pdf`);
}

async function compartirPdf(html: string, nombreArchivo: string): Promise<void> {
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

  const destino = new File(Paths.cache, nombreArchivo);
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
