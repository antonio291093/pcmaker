import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

type Etiqueta = {
  lote: string;
  id: string;        // SERIE
  barcode: string;  // PNG base64 generado en backend
};

interface Props {
  etiquetas: Etiqueta[];
}

const styles = StyleSheet.create({
  page: {
    width: '50mm',
    height: '25mm',
    padding: 2,
    fontSize: 6,
  },
  container: {
    height: '100%',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  lote: {
    fontSize: 6,
  },
  barcodeContainer: {
    alignItems: 'center',
  },
  barcodeImage: {
    width: '100%',
    height: 28,
    objectFit: 'contain',
  },
  serieTexto: {
    fontSize: 6,
    textAlign: 'center',
    marginTop: 1,
  },
});

export default function EtiquetaTermicaPDF({ etiquetas }: Props) {
  return (
    <Document>
      {etiquetas.map((e, i) => (
        <Page
          key={i}
          size={{ width: '50mm', height: '25mm' }}
          style={styles.page}
        >
          <View style={styles.container}>
            {/* Encabezado */}
            <View>
              <Text style={styles.title}>PC MAKER</Text>
              <Text style={styles.lote}>{e.lote}</Text>
            </View>

            {/* Código de barras */}
            <View style={styles.barcodeContainer}>
              <Image
                src={e.barcode}
                style={styles.barcodeImage}
              />
              <Text style={styles.serieTexto}>{e.id}</Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}
