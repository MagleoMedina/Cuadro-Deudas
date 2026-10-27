import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { UI } from '@/constants/ui';

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'fantasma';

interface BotonProps {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBoton;
  disabled?: boolean;
  compacto?: boolean;
  style?: ViewStyle;
}

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  disabled = false,
  compacto = false,
  style,
}: BotonProps) {
  const paleta = {
    primario: { fondo: UI.primario, texto: UI.textoPrimario, borde: UI.primario },
    secundario: { fondo: UI.primarioSuave, texto: UI.primario, borde: UI.primarioSuave },
    peligro: { fondo: UI.peligroSuave, texto: UI.peligro, borde: UI.peligroSuave },
    fantasma: { fondo: 'transparent', texto: UI.textoSuave, borde: UI.borde },
  }[variante];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        compacto && styles.botonCompacto,
        {
          backgroundColor: paleta.fondo,
          borderColor: paleta.borde,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}>
      <Text
        style={[
          styles.botonTexto,
          compacto && styles.botonTextoCompacto,
          { color: paleta.texto },
        ]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

interface CampoProps extends TextInputProps {
  etiqueta: string;
  ayuda?: string;
}

export function Campo({ etiqueta, ayuda, style, ...props }: CampoProps) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor={UI.textoSuave}
        style={[styles.input, style]}
        {...props}
      />
      {ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

interface SelectorProps<T extends string> {
  etiqueta: string;
  valor: T;
  opciones: { valor: T; etiqueta: string }[];
  onChange: (valor: T) => void;
}

export function Selector<T extends string>({
  etiqueta,
  valor,
  opciones,
  onChange,
}: SelectorProps<T>) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={styles.selector}>
        {opciones.map((opcion) => {
          const activo = opcion.valor === valor;
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => onChange(opcion.valor)}
              style={[styles.opcion, activo && styles.opcionActiva]}>
              <Text style={[styles.opcionTexto, activo && styles.opcionTextoActiva]}>
                {opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Aviso({ texto, tono = 'error' }: { texto: string; tono?: 'error' | 'info' }) {
  const esError = tono === 'error';
  return (
    <View style={[styles.aviso, { backgroundColor: esError ? UI.peligroSuave : UI.primarioSuave }]}>
      <Text style={[styles.avisoTexto, { color: esError ? UI.peligro : UI.primario }]}>{texto}</Text>
    </View>
  );
}

interface ModalShellProps {
  visible: boolean;
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  pie?: ReactNode;
}

export function ModalShell({ visible, titulo, onClose, children, pie }: ModalShellProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalFondo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={styles.modalTarjeta}>
          <View style={styles.modalCabecera}>
            <Text style={styles.modalTitulo}>{titulo}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Text style={styles.modalCerrar}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContenido}>
            {children}
          </ScrollView>
          {pie ? <View style={styles.modalPie}>{pie}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  boton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCompacto: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  botonTexto: {
    fontSize: 15,
    fontWeight: '700',
  },
  botonTextoCompacto: {
    fontSize: 13,
  },
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
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: UI.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: UI.texto,
  },
  ayuda: {
    fontSize: 12,
    color: UI.textoSuave,
  },
  selector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  opcion: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.borde,
    backgroundColor: '#FFFFFF',
  },
  opcionActiva: {
    backgroundColor: UI.primario,
    borderColor: UI.primario,
  },
  opcionTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: UI.textoSuave,
  },
  opcionTextoActiva: {
    color: UI.textoPrimario,
  },
  aviso: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  avisoTexto: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalFondo: {
    flex: 1,
    backgroundColor: UI.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalTarjeta: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    backgroundColor: UI.fondo,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI.tarjeta,
    borderBottomWidth: 1,
    borderBottomColor: UI.borde,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.texto,
    flexShrink: 1,
  },
  modalCerrar: {
    fontSize: 14,
    fontWeight: '700',
    color: UI.primario,
    marginLeft: 12,
  },
  modalContenido: {
    padding: 20,
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalPie: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: UI.tarjeta,
    borderTopWidth: 1,
    borderTopColor: UI.borde,
  },
});
