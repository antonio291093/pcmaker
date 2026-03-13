export interface Equipo {
  id: number;
  nombre: string;
  etiqueta: string;
  procesador: string;
  descripcion?: string;
  memorias_ram?: string[];
  almacenamientos?: string[];
  sucursal_id?: number;
  sucursal_nombre?: string;
  origen: 'tecnico' | 'recepcion_directa';
  cantidad?: number
}

// Etiqueta preliminar (ANTES de guardar / imprimir)
export type EtiquetaDraft = {
  lote: string;
  id: string; // serie
};

// Etiqueta final (DESPUÉS de backend)
export type Etiqueta = {
  lote: string;
  id: string;
  barcode: string;
};

export type Categoria = {
  id: number
  descripcion: string
}

export type ItemEtiqueta = Partial<{
  sku: string
  barcode: string
  descripcion: string
  especificacion: string
}>