import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UI } from '@/constants/ui';
import type { Articulo } from '@/db/repo';
import { colorDe } from '@/lib/colors';
import { formatearFecha, hoyISO } from '@/lib/dates';
import { formatearMonto } from '@/lib/money';

import { Boton } from './ui';

const ANCHO_TABLA = 860;
const COL = {
  articulo: 260,
  monto: 140,
  cuota: 140,
  fecha: 130,
  saldo: 190,
};

const CABECERAS = ['Articulo', 'Monto inicial', 'Cuota', 'fecha', 'saldo pendiente restante'];

interface TablaProps {
  articulos: Articulo[];
  onAbonar: (articulo: Articulo) => void;
  onEditar: (articulo: Articulo) => void;
  onArchivar: (articulo: Articulo) => void;
  onEliminar: (articulo: Articulo) => void;
}

export function CompromisosTable({
  articulos,
  onAbonar,
  onEditar,
  onArchivar,
  onEliminar,
}: TablaProps) {
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

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={styles.scroll}>
      <View style={styles.tabla}>
        <View style={styles.cabecera}>
          {CABECERAS.map((titulo, indice) => (
            <Text
              key={titulo}
              style={[
                styles.cabeceraTexto,
                {
                  width: [
                    COL.articulo,
                    COL.monto,
                    COL.cuota,
                    COL.fecha,
                    COL.saldo,
                  ][indice],
                },
              ]}>
              {titulo}
            </Text>
          ))}
        </View>

        {articulos.map((articulo) => (
          <FilaArticulo
            key={articulo.id}
            articulo={articulo}
            onAbonar={onAbonar}
            onEditar={onEditar}
            onArchivar={onArchivar}
            onEliminar={onEliminar}
          />
        ))}
      </View>
    </ScrollView>
  );
}

interface FilaProps {
  articulo: Articulo;
  onAbonar: (articulo: Articulo) => void;
  onEditar: (articulo: Articulo) => void;
  onArchivar: (articulo: Articulo) => void;
  onEliminar: (articulo: Articulo) => void;
}

function FilaArticulo({ articulo, onAbonar, onEditar, onArchivar, onEliminar }: FilaProps) {
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
        <View style={[styles.celdaArticulo, { width: COL.articulo }]}>
          <Text style={[styles.nombre, { color: pagado ? '#064E3B' : color.texto }]} numberOfLines={2}>
            {articulo.nombre}
          </Text>
          <Text style={styles.subtitulo}>
            {articulo.archivado ? 'Archivado · ' : ''}
            {articulo.numCuotas} cuota{articulo.numCuotas === 1 ? '' : 's'}
          </Text>
        </View>

        <Text style={[styles.celdaTexto, { width: COL.monto }]}>
          {formatearMonto(articulo.montoInicialCents)}
        </Text>
        <Text style={[styles.celdaTexto, { width: COL.cuota }]}>
          {formatearMonto(articulo.montoCuotaCents)}
        </Text>
        <Text style={[styles.celdaTexto, { width: COL.fecha }]}>
          {formatearFecha(articulo.proximaFecha)}
        </Text>

        <View style={[styles.celdaSaldo, { width: COL.saldo }]}>
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

          <View style={styles.detalleCabecera}>
            <Text style={[styles.detalleTh, { width: 46 }]}>#</Text>
            <Text style={[styles.detalleTh, { width: 130 }]}>Monto</Text>
            <Text style={[styles.detalleTh, { width: 130 }]}>Vencimiento</Text>
            <Text style={[styles.detalleTh, { width: 130 }]}>Pagado</Text>
            <Text style={[styles.detalleTh, { width: 120 }]}>Estado</Text>
          </View>

          {articulo.cuotas.map((cuota) => {
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

            return (
              <View key={cuota.id} style={styles.detalleFila}>
                <Text style={[styles.detalleTd, { width: 46 }]}>{cuota.numero}</Text>
                <Text style={[styles.detalleTd, { width: 130 }]}>
                  {formatearMonto(cuota.montoCents)}
                </Text>
                <Text style={[styles.detalleTd, { width: 130 }]}>
                  {formatearFecha(cuota.fechaVencimiento)}
                </Text>
                <Text style={[styles.detalleTd, { width: 130 }]}>
                  {formatearMonto(cuota.pagadoCents)}
                </Text>
                <Text style={[styles.detalleTd, { width: 120, color: colorEstado, fontWeight: '700' }]}>
                  {estado}
                </Text>
              </View>
            );
          })}

          <Text style={styles.detalleResumen}>
            Abonado {formatearMonto(articulo.pagadoCents)} de{' '}
            {formatearMonto(articulo.montoInicialCents)} · {articulo.pagos.length} abono
            {articulo.pagos.length === 1 ? '' : 's'}
          </Text>

          <View style={styles.acciones}>
            {articulo.saldoCents > 0 ? (
              <Boton compacto titulo="Abonar" onPress={() => onAbonar(articulo)} />
            ) : null}
            <Boton compacto variante="secundario" titulo="Editar" onPress={() => onEditar(articulo)} />
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
    backgroundColor: UI.tarjeta,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.borde,
  },
  tabla: {
    width: ANCHO_TABLA,
  },
  cabecera: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingLeft: 19,
    paddingRight: 14,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  cabeceraTexto: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingRight: 8,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderLeftWidth: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17, 24, 39, 0.08)',
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F3F4F6',
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
    backgroundColor: UI.tarjeta,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.borde,
    padding: 28,
    alignItems: 'center',
    gap: 6,
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
