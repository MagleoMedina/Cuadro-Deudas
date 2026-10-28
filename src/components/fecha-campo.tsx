import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { UI } from '@/constants/ui';
import { aISO, desdeISO, formatearFecha } from '@/lib/dates';
import { borde45, bordeHundido, sombraElevada } from '@/lib/shadows';

interface FechaCampoProps {
  etiqueta: string;
  valor: string;
  onChange: (iso: string) => void;
}

export function FechaCampo({ etiqueta, valor, onChange }: FechaCampoProps) {
  const [abierto, setAbierto] = useState(false);

  const manejar = (evento: DateTimePickerEvent, fecha?: Date) => {
    if (Platform.OS === 'android') {
      setAbierto(false);
    }
    if (evento.type === 'set' && fecha) {
      onChange(aISO(fecha));
    }
  };

  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setAbierto(true)}
        style={styles.caja}>
        <Text style={styles.valor}>{formatearFecha(valor)}</Text>
        <Text style={styles.accion}>Cambiar</Text>
      </Pressable>
      {abierto ? (
        <View style={styles.picker}>
          <DateTimePicker
            value={desdeISO(valor)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={manejar}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setAbierto(false)} style={styles.listo}>
              <Text style={styles.listoTexto}>Listo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    gap: 6,
    marginBottom: 14,
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.textoSuave,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: UI.fondo,
    ...bordeHundido,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  valor: {
    fontSize: 16,
    color: UI.texto,
    fontWeight: '600',
  },
  accion: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.primario,
  },
  picker: {
    marginTop: 8,
    backgroundColor: UI.fondo,
    borderRadius: 14,
    ...borde45,
    ...sombraElevada,
    overflow: 'hidden',
  },
  listo: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listoTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.primario,
  },
});
