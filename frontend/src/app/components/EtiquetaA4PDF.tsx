import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface Etiqueta {
  lote: string;
  id: string;
}

interface Props {
  etiquetas: Etiqueta[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingHorizontal: 15,
    fontSize: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  etiqueta: {
    width: '63mm',
    height: '25mm',
    border: '1 solid #000',
    padding: 4,
    marginRight: 4,
    marginBottom: 6,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  lote: {
    fontSize: 8,
    marginTop: 2,
  },
  serie: {
    fontSize: 8,
    marginTop: 2,
  },
});

export default function EtiquetaA4PDF({ etiquetas }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.grid}>
          {etiquetas.map((e, idx) => (
            <View key={idx} style={styles.etiqueta} wrap={false}>
              <Text style={styles.titulo}>PC MAKER</Text>
              <Text style={styles.lote}>{e.lote}</Text>
              <Text style={styles.serie}>Serie: {e.id}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
