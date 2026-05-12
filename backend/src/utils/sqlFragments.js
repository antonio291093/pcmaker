// Descripción unificada de un ítem de venta según su origen
const CASE_DESCRIPCION_VENTA = `
      CASE
        WHEN i.equipo_id IS NOT NULL THEN e.nombre
        WHEN ie.inventario_id IS NOT NULL THEN ie.modelo
        WHEN i.id IS NOT NULL THEN i.especificacion
        ELSE cm.descripcion
      END`;

// Especificaciones técnicas de un ítem de venta según su origen
const CASE_ESPECIFICACIONES_VENTA = `
      CASE
        WHEN i.equipo_id IS NOT NULL THEN
          CONCAT(
            e.procesador, ' | ',
            (
              SELECT string_agg(
                substring(cmr.descripcion FROM '([0-9]+[ ]*GB)'),
                ' + '
              )
              FROM equipos_ram er
              JOIN catalogo_memoria_ram cmr ON cmr.id = er.memoria_ram_id
              WHERE er.equipo_id = e.id
            ),
            ' | ',
            (
              SELECT string_agg(ca.descripcion, ' + ')
              FROM equipos_almacenamiento ea
              JOIN catalogo_almacenamiento ca ON ca.id = ea.almacenamiento_id
              WHERE ea.equipo_id = e.id
            )
          )
        WHEN ie.inventario_id IS NOT NULL THEN
          CONCAT(
            ie.procesador, ' | ',
            ie.ram_gb, 'GB ', ie.ram_tipo, ' | ',
            ie.almacenamiento_gb, 'GB ', ie.almacenamiento_tipo
          )
        ELSE NULL
      END`;

module.exports = { CASE_DESCRIPCION_VENTA, CASE_ESPECIFICACIONES_VENTA };
