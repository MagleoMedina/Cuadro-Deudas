import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UI } from '@/constants/ui';
import type { Articulo } from '@/db/repo';
import { colorDe } from '@/lib/colors';
import { formatearFecha, hoyISO } from '@/lib/dates';
import { formatearMonto } from '@/lib/money';
import { borde45, sombraElevada } from '@/lib/shadows';

import { Boton } from './ui';

const PX_POR_CARACTER = 8.5;
const PX_POR_TITULO = 7.5;

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

interface AnchosColumnas {
  articulo: number;
  monto: number;
  inicial: number;
  cuota: number;
  fecha: number;
  pagadas: number;
  pendientes: number;
  saldoPagado: number;
  saldo: number;
}

/** Color de cada cabecera, en el mismo orden que CABECERAS. */
const COLORES_CABECERA: { fondo: string; texto: string }[] = [
  { fondo: '#2D3748', texto: '#F9FAFB' }, // Articulo
  { fondo: '#1D4ED8', texto: '#FFFFFF' }, // Monto Total
  { fondo: '#15803D', texto: '#FFFFFF' }, // cuota Inicial
  { fondo: '#FACC15', texto: '#1F2937' }, // Cuota
  { fondo: '#2D3748', texto: '#F9FAFB' }, // fecha
  { fondo: '#15803D', texto: '#FFFFFF' }, // cuotas pagadas
  { fondo: '#B91C1C', texto: '#FFFFFF' }, // cuotas pendientes
  { fondo: '#111827', texto: '#FFFFFF' }, // Saldo Pagado hasta el día
  { fondo: '#B91C1C', texto: '#FFFFFF' }, // saldo pendiente restante
];

/** Ancho estimado: máximo largo de texto de la columna (o título partido en 2 líneas). */
function anchoPorContenido(textos: string[], titulo: string, extra: number, minimo: number): number {
  const contenido =
    textos.reduce((max, texto) => Math.max(max, texto.length), 0) * PX_POR_CARACTER;
  const titular = Math.ceil(titulo.length / 2) * PX_POR_TITULO;
  return Math.max(minimo, Math.max(contenido, titular) + extra);
}

function anchosDeColumnas(articulos: Articulo[]): AnchosColumnas {
  const hayPagados = articulos.some((articulo) => articulo.saldoCents === 0);
  return {
    articulo: anchoPorContenido(
      articulos.map((articulo) => articulo.nombre.slice(0, 24)),
      CABECERAS[0],
      12,
      140
    ),
    monto: anchoPorContenido(
      articulos.map((articulo) => formatearMonto(articulo.montoInicialCents)),
      CABECERAS[1],
      18,
      125
    ),
    inicial: anchoPorContenido(
      articulos.map((articulo) => formatearMonto(articulo.cuotaInicialCents)),
      CABECERAS[2],
      18,
      135
    ),
    cuota: anchoPorContenido(
      articulos.map((articulo) => formatearMonto(articulo.montoCuotaCents)),
      CABECERAS[3],
      18,
      100
    ),
    fecha: anchoPorContenido(
      articulos.map((articulo) => formatearFecha(articulo.proximaFecha)),
      CABECERAS[4],
      12,
      100
    ),
    pagadas: anchoPorContenido(
      articulos.map((articulo) => String(articulo.cuotasPagadas)),
      CABECERAS[5],
      30,
      110
    ),
    pendientes: anchoPorContenido(
      articulos.map((articulo) => String(articulo.cuotasPendientes)),
      CABECERAS[6],
      30,
      120
    ),
    saldoPagado: anchoPorContenido(
      articulos.map((articulo) => formatearMonto(articulo.pagadoCents)),
      CABECERAS[7],
      24,
      170
    ),
    saldo: anchoPorContenido(
      articulos.map((articulo) => formatearMonto(articulo.saldoCents)),
      CABECERAS[8],
      (hayPagados ? 80 : 20) + 34,
      215
    ),
  };
}

interface TablaProps {
  articulos: Articulo[];
  escala: number;
  onAbonar: (articulo: Articulo) => void;
  onEditarAbonos: (articulo: Articulo) => void;
  onEditar: (articulo: Articulo) => void;
  onArchivar: (articulo: Articulo) => void;
  onEliminar: (articulo: Articulo) => void;
}

export function CompromisosTable({
  articulos,
  escala,
  onAbonar,
  onEditarAbonos,
  onEditar,
  onArchivar,
  onEliminar,
}: TablaProps) {
  const [altura, setAltura] = useState(0);

  if (articulos.length === 0) {
    return (
      <View style={styles.vacio}>
        <Text style={styles.vacioTitulo}>Sin artículos registrados</Text>
        <Text style={styles.vacioTexto}>
          Usa «Registrar artículo» para crear tu primer compromiso.
        </Text>
      </View>
    );
  }

  const anchos = anchosDeColumnas(articulos);
  const anchoTotal =
    anchos.articulo +
    anchos.monto +
    anchos.inicial +
    anchos.cuota +
    anchos.fecha +
    anchos.pagadas +
    anchos.pendientes +
    anchos.saldoPagado +
    anchos.saldo +
    33; // padding izquierdo + derecho de cabecera y filas

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={styles.scroll}>
      <View
        style={{
          width: anchoTotal * escala,
          height: altura > 0 ? altura * escala : undefined,
        }}>
        <View
          onLayout={(evento) => setAltura(evento.nativeEvent.layout.height)}
          style={{
            width: anchoTotal,
            transform: [{ scale: escala }],
            transformOrigin: 'top left',
          }}>
          <View style={styles.tabla}>
            <View style={styles.cabecera}>
              {CABECERAS.map((titulo, indice) => (
                <View
                  key={titulo}
                  style={[
                    styles.cabeceraCelda,
                    {
                      width: [
                        anchos.articulo,
                        anchos.monto,
                        anchos.inicial,
                        anchos.cuota,
                        anchos.fecha,
                        anchos.pagadas,
                        anchos.pendientes,
                        anchos.saldoPagado,
                        anchos.saldo,
                      ][indice],
                      backgroundColor: COLORES_CABECERA[indice].fondo,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.cabeceraTexto,
                      { color: COLORES_CABECERA[indice].texto },
                    ]}>
                    {titulo}
                  </Text>
                </View>
              ))}
            </View>

            {articulos.map((articulo) => (
              <FilaArticulo
                key={articulo.id}
                articulo={articulo}
                anchos={anchos}
                onAbonar={onAbonar}
                onEditarAbonos={onEditarAbonos}
                onEditar={onEditar}
                onArchivar={onArchivar}
                onEliminar={onEliminar}
              />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/** Cuotas con estado y saldo corrido: financiado − pagado acumulado hasta esa cuota. */
function cuotasConSaldoCorrido(articulo: Articulo) {
  let acumulado = 0;
  const financiado = Math.max(0, articulo.montoInicialCents - articulo.cuotaInicialCents);
  return articulo.cuotas.map((cuota) => {
    const estado =
      cuota.pagadoCents >= cuota.montoCents
        ? 'Pagada'
        : cuota.pagadoCents > 0
          ? 'Parcial'
          : cuota.fechaVencimiento < hoyISO()
            ? 'Vencida'
            : 'Pendiente';
    const colorEstado =
      estado === 'Pagada'
        ? UI.exito
        : estado === 'Vencida'
          ? UI.peligro
          : estado === 'Parcial'
            ? '#B45309'
            : UI.textoSuave;
    acumulado += cuota.pagadoCents;
    return {
      cuota,
      estado,
      colorEstado,
      saldoGeneral: Math.max(0, financiado - acumulado),
    };
  });
}

function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={[styles.datoValor, destacado && styles.datoValorCero]}>{valor}</Text>
    </View>
  );
}

interface FilaProps {
  articulo: Articulo;
  anchos: AnchosColumnas;
  onAbonar: (articulo: Articulo) => void;
  onEditarAbonos: (articulo: Articulo) => void;
  onEditar: (articulo: Articulo) => void;
  onArchivar: (articulo: Articulo) => void;
  onEliminar: (articulo: Articulo) => void;
}

function FilaArticulo({
  articulo,
  anchos,
  onAbonar,
  onEditarAbonos,
  onEditar,
  onArchivar,
  onEliminar,
}: FilaProps) {
  const [abierto, setAbierto] = useState(false);
  const color = colorDe(articulo.color);
  const pagado = articulo.saldoCents === 0;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${articulo.nombre}, saldo ${formatearMonto(articulo.saldoCents)}`}
        onPress={() => setAbierto((valor) => !valor)}
        style={[
          styles.fila,
          {
            backgroundColor: pagado ? UI.exitoSuave : color.fondo,
            borderLeftColor: pagado ? UI.exito : color.borde,
          },
        ]}>
        <View style={[styles.celdaArticulo, { width: anchos.articulo }]}>
          <Text style={[styles.nombre, { color: pagado ? '#064E3B' : color.texto }]} numberOfLines={2}>
            {articulo.nombre}
          </Text>
          <Text style={styles.subtitulo}>
            {articulo.archivado ? 'Archivado · ' : ''}
            {articulo.numCuotas} cuota{articulo.numCuotas === 1 ? '' : 's'}
          </Text>
        </View>

        <Text style={[styles.celdaTexto, { width: anchos.monto }]}>
          {formatearMonto(articulo.montoInicialCents)}
        </Text>
        <Text style={[styles.celdaTexto, { width: anchos.inicial }]}>
          {formatearMonto(articulo.cuotaInicialCents)}
        </Text>
        <Text style={[styles.celdaTexto, { width: anchos.cuota }]}>
          {formatearMonto(articulo.montoCuotaCents)}
        </Text>
        <Text style={[styles.celdaTexto, { width: anchos.fecha }]}>
          {formatearFecha(articulo.proximaFecha)}
        </Text>
        <Text style={[styles.celdaTexto, { width: anchos.pagadas }]}>
          {articulo.cuotasPagadas}
        </Text>
        <Text style={[styles.celdaTexto, { width: anchos.pendientes }]}>
          {articulo.cuotasPendientes}
        </Text>
        <Text style={[styles.celdaTexto, { width: anchos.saldoPagado }]}>
          {formatearMonto(articulo.pagadoCents)}
        </Text>

        <View style={[styles.celdaSaldo, { width: anchos.saldo }]}>
          <Text style={[styles.saldo, pagado && styles.saldoCero]}>
            {formatearMonto(articulo.saldoCents)}
          </Text>
          {pagado ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>Pagado</Text>
            </View>
          ) : (
            <Text style={styles.flecha}>{abierto ? '▾' : '▸'}</Text>
          )}
        </View>
      </Pressable>

      {abierto ? (
        <View style={[styles.detalle, { borderLeftColor: pagado ? UI.exito : color.borde }]}>
          <Text style={styles.detalleTitulo}>Desglose de cuotas</Text>

          <View style={styles.detalleDatos}>
            <Dato etiqueta="Monto total" valor={formatearMonto(articulo.montoInicialCents)} />
            <Dato
              etiqueta="Cuota inicial"
              valor={formatearMonto(articulo.cuotaInicialCents)}
            />
            <Dato etiqueta="Cuota" valor={formatearMonto(articulo.montoCuotaCents)} />
            <Dato etiqueta="Cuotas pagadas" valor={String(articulo.cuotasPagadas)} />
            <Dato etiqueta="Cuotas pendientes" valor={String(articulo.cuotasPendientes)} />
            <Dato etiqueta="Saldo pagado" valor={formatearMonto(articulo.pagadoCents)} />
            <Dato
              etiqueta="Saldo pendiente"
              valor={formatearMonto(articulo.saldoCents)}
              destacado={articulo.saldoCents === 0}
            />
          </View>

          <View style={styles.detalleCabecera}>
            <Text style={[styles.detalleTh, { width: 46 }]}>#</Text>
            <Text style={[styles.detalleTh, { width: 130 }]}>Monto</Text>
            <Text style={[styles.detalleTh, { width: 130 }]}>Vencimiento</Text>
            <Text style={[styles.detalleTh, { width: 130 }]}>Pagado</Text>
            <Text style={[styles.detalleTh, { width: 120 }]}>Estado</Text>
            <Text style={[styles.detalleTh, { width: 120 }]}>Saldo</Text>
          </View>

          {cuotasConSaldoCorrido(articulo).map((fila) => (
            <View key={fila.cuota.id} style={styles.detalleFila}>
              <Text style={[styles.detalleTd, { width: 46 }]}>{fila.cuota.numero}</Text>
              <Text style={[styles.detalleTd, { width: 130 }]}>
                {formatearMonto(fila.cuota.montoCents)}
              </Text>
              <Text style={[styles.detalleTd, { width: 130 }]}>
                {formatearFecha(fila.cuota.fechaVencimiento)}
              </Text>
              <Text style={[styles.detalleTd, { width: 130 }]}>
                {formatearMonto(fila.cuota.pagadoCents)}
              </Text>
              <Text style={[styles.detalleTd, { width: 120, color: fila.colorEstado, fontWeight: '700' }]}>
                {fila.estado}
              </Text>
              <Text
                style={[
                  styles.detalleTd,
                  { width: 120, fontWeight: '700', color: fila.saldoGeneral === 0 ? UI.exito : UI.texto },
                ]}>
                {formatearMonto(fila.saldoGeneral)}
              </Text>
            </View>
          ))}

          <Text style={styles.detalleResumen}>
            {articulo.pagos.length} abono{articulo.pagos.length === 1 ? '' : 's'} registrado
            {articulo.pagos.length === 1 ? '' : 's'}
          </Text>

          <View style={styles.acciones}>
            {articulo.saldoCents > 0 ? (
              <Boton compacto titulo="Abonar" onPress={() => onAbonar(articulo)} />
            ) : null}
            {articulo.pagos.length > 0 ? (
              <Boton
                compacto
                variante="secundario"
                titulo="Editar abonos"
                onPress={() => onEditarAbonos(articulo)}
              />
            ) : null}
            <Boton compacto variante="secundario" titulo="Editar cuotas" onPress={() => onEditar(articulo)} />
            <Boton
              compacto
              variante="fantasma"
              titulo={articulo.archivado ? 'Desarchivar' : 'Archivar'}
              onPress={() => onArchivar(articulo)}
            />
            <Boton compacto variante="peligro" titulo="Eliminar" onPress={() => onEliminar(articulo)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: UI.fondo,
    borderRadius: 18,
    ...sombraElevada,
  },
  tabla: {
    paddingVertical: 2,
  },
  cabecera: {
    flexDirection: 'row',
    backgroundColor: UI.sombra,
    paddingLeft: 19,
    paddingRight: 14,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    overflow: 'hidden',
  },
  cabeceraCelda: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  cabeceraTexto: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderLeftWidth: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(163, 177, 198, 0.35)',
  },
  celdaArticulo: {
    paddingRight: 12,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitulo: {
    fontSize: 12,
    color: UI.textoSuave,
    marginTop: 2,
  },
  celdaTexto: {
    fontSize: 14,
    color: UI.texto,
    fontWeight: '600',
    paddingRight: 8,
  },
  celdaSaldo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  saldo: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.texto,
  },
  saldoCero: {
    color: '#047857',
  },
  badge: {
    backgroundColor: UI.exito,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 0,
  },
  badgeTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  flecha: {
    fontSize: 16,
    color: UI.textoSuave,
  },
  detalle: {
    backgroundColor: UI.fondo,
    borderLeftWidth: 5,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI.borde,
  },
  detalleTitulo: {
    fontSize: 13,
    fontWeight: '800',
    color: UI.textoSuave,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  detalleDatos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginBottom: 16,
  },
  dato: {
    minWidth: 110,
  },
  datoEtiqueta: {
    fontSize: 10,
    fontWeight: '800',
    color: UI.textoSuave,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  datoValor: {
    fontSize: 14,
    fontWeight: '800',
    color: UI.texto,
    marginTop: 2,
  },
  datoValorCero: {
    color: UI.exito,
  },
  detalleCabecera: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: UI.borde,
  },
  detalleTh: {
    fontSize: 11,
    fontWeight: '800',
    color: UI.textoSuave,
    textTransform: 'uppercase',
  },
  detalleFila: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI.borde,
  },
  detalleTd: {
    fontSize: 13,
    color: UI.texto,
  },
  detalleResumen: {
    marginTop: 12,
    fontSize: 13,
    color: UI.textoSuave,
    fontWeight: '600',
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  vacio: {
    backgroundColor: UI.fondo,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    ...borde45,
    ...sombraElevada,
  },
  vacioTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: UI.texto,
  },
  vacioTexto: {
    fontSize: 13,
    color: UI.textoSuave,
    textAlign: 'center',
  },
});
