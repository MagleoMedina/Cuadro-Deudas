import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompromisosTable } from '@/components/compromisos-table';
import { ModalAbono } from '@/components/modal-abono';
import { ModalArticulo } from '@/components/modal-articulo';
import { Aviso, Boton } from '@/components/ui';
import { UI } from '@/constants/ui';
import { getDb } from '@/db';
import type { Articulo, NuevoArticulo, NuevoPago } from '@/db/repo';
import { useCompromisos } from '@/hooks/use-compromisos';
import { exportarRespaldo, importarRespaldo } from '@/lib/backup';
import { colorPorIndice } from '@/lib/colors';
import { exportarPdf } from '@/lib/pdf';
import { borde45, bordeHundido, sombraElevada } from '@/lib/shadows';

export default function HomeScreen() {
  const {
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
  } = useCompromisos();

  const { width } = useWindowDimensions();
  const anchoContenido = Math.min(width - 24, 1100);

  const [modalArticulo, setModalArticulo] = useState(false);
  const [articuloEditando, setArticuloEditando] = useState<Articulo | null>(null);
  const [modalAbono, setModalAbono] = useState(false);
  const [articuloAbonar, setArticuloAbonar] = useState<Articulo | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const abrirNuevo = () => {
    setArticuloEditando(null);
    setModalArticulo(true);
  };

  const abrirEditar = (articulo: Articulo) => {
    setArticuloEditando(articulo);
    setModalArticulo(true);
  };

  const abrirAbonar = (articulo: Articulo | null) => {
    setArticuloAbonar(articulo);
    setModalAbono(true);
  };

  const guardarArticulo = async (datos: NuevoArticulo, id?: number) => {
    if (id) {
      await editarArticulo(id, datos);
    } else {
      await crearArticulo(datos);
    }
  };

  const confirmarArchivar = (articulo: Articulo) => {
    if (articulo.archivado) {
      void archivarArticulo(articulo.id, false);
      return;
    }
    Alert.alert(
      'Archivar artículo',
      `«${articulo.nombre}» se ocultará del cuadro. Puedes verlo con «Ver archivados».`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: () => {
            void archivarArticulo(articulo.id, true);
          },
        },
      ]
    );
  };

  const confirmarEliminar = (articulo: Articulo) => {
    Alert.alert(
      'Eliminar artículo',
      `Se borrarán «${articulo.nombre}», sus cuotas y sus abonos. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void eliminarArticulo(articulo.id);
          },
        },
      ]
    );
  };

  const exportar = async () => {
    setOcupado(true);
    try {
      await exportarPdf(articulos);
    } catch (e) {
      Alert.alert('No se pudo exportar', e instanceof Error ? e.message : 'Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  const exportarJson = async () => {
    setOcupado(true);
    try {
      const db = await getDb();
      await exportarRespaldo(db);
    } catch (e) {
      Alert.alert('No se pudo respaldar', e instanceof Error ? e.message : 'Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  const importarJson = () => {
    Alert.alert(
      'Importar respaldo',
      'Se reemplazará toda la información actual por la del archivo. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: () => {
            setOcupado(true);
            void (async () => {
              try {
                const db = await getDb();
                const importados = await importarRespaldo(db);
                await recargar();
                if (importados > 0) {
                  Alert.alert('Respaldo importado', `Se cargaron ${importados} artículos.`);
                }
              } catch (e) {
                Alert.alert(
                  'No se pudo importar',
                  e instanceof Error ? e.message : 'Archivo inválido.'
                );
              } finally {
                setOcupado(false);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={[styles.contenido, { width: anchoContenido }]}>
        <View style={styles.cabecera}>
          <View style={styles.cabeceraTexto}>
            <Text style={styles.titulo}>Cuadro Compromisos Eduardo</Text>
            <View style={styles.regla} />
            <Text style={styles.subtitulo}>Control local de deudas y abonos · montos en $</Text>
          </View>
          {ocupado ? <ActivityIndicator color={UI.primario} /> : null}
        </View>

        {error ? <Aviso texto={error} /> : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContenido}
          showsVerticalScrollIndicator={false}>
          {cargando ? (
            <View style={styles.cargando}>
              <ActivityIndicator color={UI.primario} size="large" />
              <Text style={styles.cargandoTexto}>Cargando compromisos…</Text>
            </View>
          ) : (
            <CompromisosTable
              articulos={articulos}
              onAbonar={abrirAbonar}
              onEditarAbonos={abrirAbonar}
              onEditar={abrirEditar}
              onArchivar={confirmarArchivar}
              onEliminar={confirmarEliminar}
            />
          )}
        </ScrollView>

        <View style={styles.piePagina}>
          <View style={styles.herramientas}>
            <Boton compacto titulo="Exportar PDF" onPress={exportar} disabled={ocupado} />
            <Boton compacto variante="secundario" titulo="Respaldar" onPress={exportarJson} disabled={ocupado} />
            <Boton compacto variante="secundario" titulo="Importar" onPress={importarJson} disabled={ocupado} />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: incluirArchivados }}
              onPress={() => setIncluirArchivados(!incluirArchivados)}
              style={[styles.interruptor, incluirArchivados && styles.interruptorActivo]}>
              <View style={[styles.casilla, incluirArchivados && styles.casillaActiva]}>
                {incluirArchivados ? <Text style={styles.tilde}>✓</Text> : null}
              </View>
              <Text style={styles.interruptorTexto}>Ver archivados</Text>
            </Pressable>
          </View>

          <View style={styles.barra}>
            <Boton
              titulo="Registrar artículo"
              onPress={abrirNuevo}
              style={styles.barraBoton}
            />
            <Boton
              titulo="Abonar"
              variante="secundario"
              onPress={() => abrirAbonar(null)}
              style={styles.barraBoton}
            />
          </View>
        </View>
      </View>

      {modalArticulo ? (
        <ModalArticulo
          visible
          articulo={articuloEditando}
          colorSugerido={colorPorIndice(articulos.length)}
          onClose={() => {
            setModalArticulo(false);
            setArticuloEditando(null);
          }}
          onGuardar={guardarArticulo}
        />
      ) : null}

      {modalAbono ? (
        <ModalAbono
          visible
          articulos={articulos}
          articuloInicial={articuloAbonar}
          onClose={() => {
            setModalAbono(false);
            setArticuloAbonar(null);
          }}
          onCrear={async (articleId: number, pago: NuevoPago) => {
            await crearPago(articleId, pago);
          }}
          onEditar={async (pagoId: number, articleId: number, pago: NuevoPago) => {
            await editarPago(pagoId, articleId, pago);
          }}
          onEliminar={async (pagoId: number, articleId: number) => {
            await eliminarPago(pagoId, articleId);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: UI.fondo,
    alignItems: 'center',
  },
  contenido: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  cabeceraTexto: {
    flex: 1,
  },
  titulo: {
    fontFamily: UI.serif,
    fontSize: 30,
    fontWeight: '700',
    color: UI.texto,
    letterSpacing: -0.6,
  },
  regla: {
    width: 64,
    height: 5,
    borderRadius: 3,
    backgroundColor: UI.primario,
    marginTop: 8,
    marginBottom: 2,
    marginLeft: -4,
  },
  subtitulo: {
    fontSize: 12,
    color: UI.textoSuave,
    marginTop: 4,
    fontWeight: '600',
  },
  herramientas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  interruptor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: UI.fondo,
    ...borde45,
    ...sombraElevada,
    shadowOpacity: 0.3,
    elevation: 2,
  },
  interruptorActivo: {
    backgroundColor: UI.primarioSuave,
    ...bordeHundido,
    shadowOpacity: 0.15,
    elevation: 1,
  },
  casilla: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: UI.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaActiva: {
    backgroundColor: UI.primario,
    borderColor: UI.primario,
  },
  tilde: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
  },
  interruptorTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.texto,
  },
  scroll: {
    flex: 1,
  },
  scrollContenido: {
    paddingBottom: 16,
    gap: 12,
  },
  cargando: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  cargandoTexto: {
    fontSize: 13,
    color: UI.textoSuave,
    fontWeight: '600',
  },
  piePagina: {
    gap: 10,
    paddingTop: 10,
  },
  barra: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  barraBoton: {
    flex: 1,
  },
});
