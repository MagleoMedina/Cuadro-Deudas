import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UI } from '@/constants/ui';
import type { Articulo, NuevoArticulo } from '@/db/repo';
import { colorDe, PALETA } from '@/lib/colors';
import { FRECUENCIAS, etiquetaIntervalo, formatearFecha, hoyISO, sumarPeriodo, type Frecuencia } from '@/lib/dates';
import { formatearMonto, montoAInput, parseMontoACentos } from '@/lib/money';

import { FechaCampo } from './fecha-campo';
import { Aviso, Boton, Campo, ModalShell, Selector } from './ui';

interface ModalArticuloProps {
  visible: boolean;
  articulo: Articulo | null;
  colorSugerido: string;
  onClose: () => void;
  onGuardar: (datos: NuevoArticulo, id?: number) => Promise<void>;
}

export function ModalArticulo({
  visible,
  articulo,
  colorSugerido,
  onClose,
  onGuardar,
}: ModalArticuloProps) {
  const [nombre, setNombre] = useState(articulo?.nombre ?? '');
  const [montoInicial, setMontoInicial] = useState(
    articulo ? montoAInput(articulo.montoInicialCents) : ''
  );
  const [montoCuota, setMontoCuota] = useState(
    articulo ? montoAInput(articulo.montoCuotaCents) : ''
  );
  const [numCuotas, setNumCuotas] = useState(articulo ? String(articulo.numCuotas) : '1');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(articulo?.frecuencia ?? 'meses');
  const [intervalo, setIntervalo] = useState(articulo ? String(articulo.intervalo) : '1');
  const [fechaInicio, setFechaInicio] = useState(articulo?.fechaInicio ?? hoyISO());
  const [color, setColor] = useState(articulo?.color ?? colorSugerido);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const montoCents = parseMontoACentos(montoInicial);
  const cuotaCents = parseMontoACentos(montoCuota);
  const n = Number(numCuotas);
  const paso = Number(intervalo);
  const ultimaCuota =
    montoCents !== null && cuotaCents !== null && Number.isInteger(n) && n >= 1
      ? montoCents - cuotaCents * (n - 1)
      : null;

  const guardar = async () => {
    setError(null);

    if (!nombre.trim()) {
      setError('Escribe el nombre del artículo.');
      return;
    }
    if (montoCents === null || montoCents <= 0) {
      setError('El monto inicial debe ser mayor que $0.00.');
      return;
    }
    if (cuotaCents === null || cuotaCents <= 0) {
      setError('La cuota debe ser mayor que $0.00.');
      return;
    }
    if (!Number.isInteger(n) || n < 1) {
      setError('El número de cuotas debe ser un entero mayor o igual a 1.');
      return;
    }
    if (!Number.isInteger(paso) || paso < 1) {
      setError('El intervalo debe ser un entero mayor o igual a 1.');
      return;
    }
    if (ultimaCuota === null || ultimaCuota <= 0) {
      setError(
        `La cuota de ${formatearMonto(cuotaCents)} por ${n} cuotas supera el monto inicial.`
      );
      return;
    }

    setGuardando(true);
    try {
      await onGuardar(
        {
          nombre: nombre.trim(),
          montoInicialCents: montoCents,
          montoCuotaCents: cuotaCents,
          numCuotas: n,
          frecuencia,
          intervalo: paso,
          fechaInicio,
          color,
        },
        articulo?.id
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el artículo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalShell
      visible={visible}
      titulo={articulo ? 'Editar artículo' : 'Registrar artículo'}
      onClose={onClose}
      pie={
        <>
          <Boton titulo="Cancelar" variante="fantasma" onPress={onClose} style={styles.pieBoton} />
          <Boton
            titulo={articulo ? 'Guardar cambios' : 'Registrar'}
            onPress={guardar}
            disabled={guardando}
            style={styles.pieBoton}
          />
        </>
      }>
      {error ? <Aviso texto={error} /> : null}

      <Campo
        etiqueta="Artículo"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej. Refrigeradora"
        autoCapitalize="sentences"
      />

      <Campo
        etiqueta="Monto inicial ($)"
        value={montoInicial}
        onChangeText={setMontoInicial}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />

      <View style={styles.fila}>
        <Campo
          etiqueta="Cuota ($)"
          value={montoCuota}
          onChangeText={setMontoCuota}
          placeholder="0.00"
          keyboardType="decimal-pad"
          style={styles.mitad}
        />
        <Campo
          etiqueta="N.º de cuotas"
          value={numCuotas}
          onChangeText={setNumCuotas}
          keyboardType="number-pad"
          style={styles.mitad}
        />
      </View>

      <Selector
        etiqueta="Frecuencia"
        valor={frecuencia}
        opciones={FRECUENCIAS.map((f) => ({ valor: f.valor, etiqueta: f.etiqueta }))}
        onChange={setFrecuencia}
      />

      <View style={styles.fila}>
        <Campo
          etiqueta="Intervalo"
          value={intervalo}
          onChangeText={setIntervalo}
          keyboardType="number-pad"
          ayuda={etiquetaIntervalo(frecuencia, Number.isFinite(paso) ? paso : 1)}
          style={styles.mitad}
        />
        <View style={styles.mitad}>
          <FechaCampo etiqueta="Primera cuota" valor={fechaInicio} onChange={setFechaInicio} />
        </View>
      </View>

      <View style={styles.campoColor}>
        <Text style={styles.etiquetaColor}>Color del artículo</Text>
        <View style={styles.paleta}>
          {PALETA.map((tono) => (
            <Pressable
              key={tono.borde}
              accessibilityRole="button"
              accessibilityLabel={`Color ${tono.borde}`}
              onPress={() => setColor(tono.borde)}
              style={[
                styles.muestra,
                { backgroundColor: tono.borde },
                color === tono.borde && styles.muestraActiva,
              ]}
            />
          ))}
        </View>
      </View>

      {ultimaCuota !== null && ultimaCuota > 0 && Number.isInteger(n) && n >= 1 ? (
        <View style={[styles.resumen, { backgroundColor: colorDe(color).fondo }]}>
          <Text style={styles.resumenTexto}>
            Última cuota: <Text style={styles.resumenFuerte}>{formatearMonto(ultimaCuota)}</Text>
          </Text>
          <Text style={styles.resumenTexto}>
            Total: <Text style={styles.resumenFuerte}>{formatearMonto(montoCents ?? 0)}</Text>
          </Text>
          <Text style={styles.resumenTexto}>
            Última fecha:{' '}
            <Text style={styles.resumenFuerte}>
              {formatearFecha(
                sumarPeriodo(
                  fechaInicio,
                  frecuencia,
                  Number.isInteger(paso) && paso > 0 ? paso : 1,
                  Math.max(0, n - 1)
                )
              )}
            </Text>
          </Text>
        </View>
      ) : null}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  mitad: {
    flex: 1,
  },
  campoColor: {
    gap: 8,
    marginBottom: 14,
  },
  etiquetaColor: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.textoSuave,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  paleta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  muestra: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  muestraActiva: {
    borderColor: UI.texto,
  },
  resumen: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginTop: 4,
  },
  resumenTexto: {
    fontSize: 13,
    color: UI.texto,
  },
  resumenFuerte: {
    fontWeight: '800',
  },
  pieBoton: {
    flex: 1,
  },
});
