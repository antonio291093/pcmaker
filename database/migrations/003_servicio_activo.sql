INSERT INTO configuraciones (nombre, valor, descripcion)
VALUES ('servicio_activo', 'true', 'Habilita o deshabilita el acceso al ERP')
ON CONFLICT (nombre) DO NOTHING;
