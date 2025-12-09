export interface Equipo {
  id: number;
  nombre: string;
  etiqueta: string;
  procesador: string;
  memorias_ram?: string[];
  almacenamientos?: string[];
  sucursal_id?: number;
  sucursal_nombre?: string;
}
