import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Articulo } from '@/db/repo';

import { colorDe } from './colors';
import { formatearFecha } from './dates';
import { formatearMonto } from './money';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function construirHtml(articulos: Articulo[], generadoEn: Date = new Date()): string {
  const totalInicial = articulos.reduce((total, a) => total + a.montoInicialCents, 0);
  const totalPagado = articulos.reduce((total, a) => total + a.pagadoCents, 0);
  const totalSaldo = articulos.reduce((total, a) => total + a.saldoCents, 0);

  const filas = articulos
    .map((articulo) => {
      const color = colorDe(articulo.color);
      return `
        <tr style="background:${color.fondo}">
          <td style="border-left:4px solid ${color.borde};font-weight:700">${escapar(articulo.nombre)}</td>
          <td class="num">${formatearMonto(articulo.montoInicialCents)}</td>
          <td class="num">${formatearMonto(articulo.montoCuotaCents)}</td>
          <td>${formatearFecha(articulo.proximaFecha)}</td>
          <td class="num ${articulo.saldoCents === 0 ? 'pagado' : ''}">${formatearMonto(
            articulo.saldoCents
          )}${articulo.saldoCents === 0 ? ' · Pagado' : ''}</td>
        </tr>`;
    })
    .join('');

  const desgloses = articulos
    .map((articulo) => {
      const color = colorDe(articulo.color);
      const cuotas = articulo.cuotas
        .map((cuota) => {
          const estado =
            cuota.pagadoCents >= cuota.montoCents
              ? 'Pagada'
              : cuota.pagadoCents > 0
                ? 'Parcial'
                : 'Pendiente';
          return `
            <tr>
              <td>${cuota.numero}</td>
              <td class="num">${formatearMonto(cuota.montoCents)}</td>
              <td>${formatearFecha(cuota.fechaVencimiento)}</td>
              <td class="num">${formatearMonto(cuota.pagadoCents)}</td>
              <td>${estado}</td>
            </tr>`;
        })
        .join('');

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
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 0; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .fecha { color: #6B7280; font-size: 12px; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #111827; color: #FFFFFF; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
  td { padding: 8px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .pagado { color: #047857; font-weight: 700; }
  .totales { margin-top: 12px; display: flex; gap: 24px; font-size: 12px; font-weight: 700; }
  .bloque { margin-top: 22px; padding: 10px 14px; background: #FFFFFF; page-break-inside: avoid; }
  .bloque h2 { font-size: 15px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #4B5563; margin: 0 0 8px; }
  .cuotas th { background: #F3F4F6; color: #374151; }
  .vacio { color: #6B7280; font-size: 13px; padding: 16px 0; }
</style>
</head>
<body>
  <h1>Cuadro Compromisos Eduardo</h1>
  <p class="fecha">Generado el ${formatearFecha(
    `${generadoEn.getFullYear()}-${String(generadoEn.getMonth() + 1).padStart(2, '0')}-${String(
      generadoEn.getDate()
    ).padStart(2, '0')}`
  )}</p>

  ${
    articulos.length === 0
      ? '<p class="vacio">Sin artículos registrados.</p>'
      : `<table>
          <thead>
            <tr>
              <th>Articulo</th>
              <th class="num">Monto inicial</th>
              <th class="num">Cuota</th>
              <th>fecha</th>
              <th class="num">saldo pendiente restante</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <div class="totales">
          <span>Total deuda: ${formatearMonto(totalInicial)}</span>
          <span>Total abonado: ${formatearMonto(totalPagado)}</span>
          <span>Saldo global: ${formatearMonto(totalSaldo)}</span>
        </div>
        ${desgloses}`
  }
</body>
</html>`;
}

export async function exportarPdf(articulos: Articulo[]): Promise<void> {
  const html = construirHtml(articulos);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'Cuadro Compromisos Eduardo',
    });
  } else {
    await Print.printAsync({ uri });
  }
}
