import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UI } from '@/constants/ui';
import type { Articulo, NuevoPago, TipoPago } from '@/db/repo';
import { formatearFecha, hoyISO } from '@/lib/dates';
import { formatearMonto, montoAInput, parseMontoACentos } from '@/lib/money';
import { borde45, sombraElevada } from '@/lib/shadows';

import { FechaCampo } from './fecha-campo';
import { Aviso, Boton, Campo, ModalShell, Selector } from './ui';

interface ModalAbonoProps {
  visible: boolean;
  articulos: Articulo[];
  articuloInicial: Articulo | null;
  onClose: () => void;
  onCrear: (articleId: number, pago: NuevoPago) => Promise<void>;
  onEditar: (pagoId: number, articleId: number, pago: NuevoPago) => Promise<void>;
  onEliminar: (pagoId: number, articleId: number) => Promise<void>;
}

const OPCIONES_TIPO: { valor: TipoPago; etiqueta: string }[] = [
  { valor: 'abono', etiqueta: 'Abono' },
  { valor: 'inicial', etiqueta: 'Cancelación inicial' },
];

export function ModalAbono({
  visible,
  articulos,
  articuloInicial,
  onClose,
  onCrear,
  onEditar,
  onEliminar,
}: ModalAbonoProps) {
  const disponibles = articulos.filter(
    (articulo) => articulo.saldoCents > 0 || articulo.id === articuloInicial?.id
  );
  const [articleId, setArticleId] = useState<number | null>(() => {
    const inicial =
      articuloInicial ??
      disponibles.find((articulo) => articulo.saldoCents > 0) ??
      disponibles[0] ??
      null;
    return inicial?.id ?? null;
  });
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState('');
  const [tipo, setTipo] = useState<TipoPago>('abono');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const seleccionado = articulos.find((articulo) => articulo.id === articleId) ?? null;
  const montoCents = parseMontoACentos(monto);
  const pagoEnEdicion = seleccionado?.pagos.find((pago) => pago.id === editandoId) ?? null;
  const yaTieneInicial =
    seleccionado?.pagos.some((pago) => pago.tipo === 'inicial' && pago.id !== editandoId) ?? false;
  const saldoDisponible = (seleccionado?.saldoCents ?? 0) + (pagoEnEdicion?.montoCents ?? 0);
  const saldoDespues =
    montoCents === null || seleccionado === null
      ? null
      : Math.max(0, saldoDisponible - montoCents);

  const limpiarFormulario = () => {
    setMonto('');
    setFecha(hoyISO());
    setNota('');
    setTipo('abono');
    setEditandoId(null);
    setError(null);
  };

  const guardar = async () => {
    setError(null);
    if (!seleccionado) {
      setError('Selecciona un artículo.');
      return;
    }
    if (montoCents === null || montoCents <= 0) {
      setError('El abono debe ser mayor que $0.00.');
      return;
    }
    if (montoCents > saldoDisponible) {
      setError(
        `El abono supera el saldo pendiente de ${formatearMonto(saldoDisponible)}.`
      );
      return;
    }

    setGuardando(true);
    try {
      const datos: NuevoPago = {
        montoCents,
        fecha,
        nota: nota.trim() ? nota.trim() : null,
        tipo,
      };
      if (editandoId !== null) {
        await onEditar(editandoId, seleccionado.id, datos);
      } else {
        await onCrear(seleccionado.id, datos);
        Alert.alert('Abono guardado', 'El abono se guardó satisfactoriamente.');
      }
      limpiarFormulario();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el abono.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = (pagoId: number, montoPago: number) => {
    if (!seleccionado) {
      return;
    }
    Alert.alert(
      'Eliminar abono',
      `¿Eliminar el abono de ${formatearMonto(montoPago)}? El saldo volverá a subir.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void onEliminar(pagoId, seleccionado.id).then(() => {
              if (editandoId === pagoId) {
                limpiarFormulario();
              }
            });
          },
        },
      ]
    );
  };

  return (
    <ModalShell
      visible={visible}
      titulo="Abonar a un artículo"
      onClose={onClose}
      pie={
        <>
          <Boton titulo="Cerrar" variante="fantasma" onPress={onClose} style={styles.pieBoton} />
          <Boton
            titulo={editandoId !== null ? 'Guardar cambios' : 'Registrar abono'}
            onPress={guardar}
            disabled={guardando || !seleccionado}
            style={styles.pieBoton}
          />
        </>
      }>
      {error ? <Aviso texto={error} /> : null}

      {disponibles.length === 0 ? (
        <Aviso tono="info" texto="No hay artículos con saldo pendiente. Registra uno primero." />
      ) : (
        <>
          <Text style={styles.etiqueta}>Artículo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {disponibles.map((articulo) => {
              const activo = articulo.id === articleId;
              return (
                <Pressable
                  key={articulo.id}
                  onPress={() => {
                    setArticleId(articulo.id);
                    limpiarFormulario();
                  }}
                  style={[
                    styles.chip,
                    { borderColor: articulo.color },
                    activo && { backgroundColor: articulo.color },
                  ]}>
                  <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>
                    {articulo.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {seleccionado ? (
            <View style={styles.resumen}>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenEtiqueta}>Monto total</Text>
                <Text style={styles.resumenValor}>
                  {formatearMonto(seleccionado.montoInicialCents)}
                </Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenEtiqueta}>Cuota inicial</Text>
                <Text style={styles.resumenValor}>
                  {formatearMonto(seleccionado.cuotaInicialCents)}
                </Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenEtiqueta}>Financiado</Text>
                <Text style={styles.resumenValor}>
                  {formatearMonto(seleccionado.montoInicialCents - seleccionado.cuotaInicialCents)}
                </Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenEtiqueta}>Saldo pagado</Text>
                <Text style={styles.resumenValor}>{formatearMonto(seleccionado.pagadoCents)}</Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenEtiqueta}>Saldo pendiente</Text>
                <Text style={[styles.resumenValor, styles.resumenSaldo]}>
                  {formatearMonto(seleccionado.saldoCents)}
                </Text>
              </View>
            </View>
          ) : null}

          <Selector
            etiqueta="Tipo de abono"
            valor={tipo}
            opciones={
              yaTieneInicial
                ? OPCIONES_TIPO.filter((opcion) => opcion.valor === 'abono')
                : OPCIONES_TIPO
            }
            onChange={setTipo}
          />

          <Campo
            etiqueta={tipo === 'inicial' ? 'Monto de la cancelación ($)' : 'Monto del abono ($)'}
            value={monto}
            onChangeText={setMonto}
            placeholder="0.00"
            keyboardType="decimal-pad"
            ayuda={
              editandoId !== null && pagoEnEdicion
                ? `Editando un abono de ${formatearMonto(pagoEnEdicion.montoCents)}.`
                : saldoDespues !== null
                  ? `Saldo después del abono: ${formatearMonto(saldoDespues)}`
                  : undefined
            }
          />

          <FechaCampo etiqueta="Fecha del abono" valor={fecha} onChange={setFecha} />

          <Campo
            etiqueta="Nota (opcional)"
            value={nota}
            onChangeText={setNota}
            placeholder="Ej. pago en efectivo"
          />

          {editandoId !== null ? (
            <Boton titulo="Cancelar edición" variante="fantasma" compacto onPress={limpiarFormulario} />
          ) : null}

          <Text style={[styles.etiqueta, styles.etiquetaHistorial]}>Abonos registrados</Text>
          {seleccionado && seleccionado.pagos.length > 0 ? (
            [...seleccionado.pagos].reverse().map((pago) => (
              <View key={pago.id} style={styles.pagoFila}>
                <View style={styles.pagoInfo}>
                  <Text style={styles.pagoMonto}>{formatearMonto(pago.montoCents)}</Text>
                  <Text style={styles.pagoDetalle}>
                    {formatearFecha(pago.fecha)}
                    {pago.nota ? ` · ${pago.nota}` : ''}
                  </Text>
                  {pago.tipo === 'inicial' ? (
                    <Text style={styles.pagoTipo}>Cancelación inicial</Text>
                  ) : null}
                </View>
                <Boton
                  compacto
                  variante="secundario"
                  titulo="Editar"
                  onPress={() => {
                    setEditandoId(pago.id);
                    setMonto(montoAInput(pago.montoCents));
                    setFecha(pago.fecha);
                    setNota(pago.nota ?? '');
                    setTipo(pago.tipo);
                    setError(null);
                  }}
                />
                <Boton
                  compacto
                  variante="peligro"
                  titulo="Borrar"
                  onPress={() => confirmarEliminar(pago.id, pago.montoCents)}
                />
              </View>
            ))
          ) : (
            <Text style={styles.sinPagos}>Este artículo todavía no tiene abonos.</Text>
          )}
        </>
      )}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.textoSuave,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  etiquetaHistorial: {
    marginTop: 20,
  },
  chips: {
    marginBottom: 16,
    flexGrow: 0,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: UI.fondo,
    ...borde45,
  },
  chipTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.texto,
  },
  chipTextoActivo: {
    color: '#FFFFFF',
  },
  resumen: {
    backgroundColor: UI.fondo,
    borderRadius: 14,
    padding: 12,
    gap: 6,
    marginBottom: 16,
    ...borde45,
    ...sombraElevada,
    shadowOpacity: 0.35,
    elevation: 3,
  },
  resumenFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resumenEtiqueta: {
    fontSize: 13,
    color: UI.textoSuave,
    fontWeight: '600',
  },
  resumenValor: {
    fontSize: 14,
    color: UI.texto,
    fontWeight: '700',
  },
  resumenSaldo: {
    color: UI.primario,
    fontWeight: '800',
  },
  pagoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UI.fondo,
    ...borde45,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  pagoInfo: {
    flex: 1,
  },
  pagoMonto: {
    fontSize: 15,
    fontWeight: '800',
    color: UI.texto,
  },
  pagoDetalle: {
    fontSize: 12,
    color: UI.textoSuave,
  },
  pagoTipo: {
    fontSize: 11,
    fontWeight: '800',
    color: UI.exito,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  sinPagos: {
    fontSize: 13,
    color: UI.textoSuave,
  },
  pieBoton: {
    flex: 1,
  },
});
