/**
 * Crea (o actualiza) los usuarios dedicados para las pruebas E2E de Playwright.
 * Uso: cd backend && node scripts/seedE2EUsers.js
 * Requiere backend/.env con DATABASE_URL apuntando a la base de datos de desarrollo.
 * Idempotente: usa upsert por email, se puede correr varias veces sin duplicar.
 */
const bcrypt = require("bcryptjs");
const pool = require("../src/config/db");

const PASSWORD = "E2eTest#2026";

const USUARIOS_E2E = [
  {
    nombre: "E2E Ventas Test",
    email: "e2e.ventas@pcmaker.test",
    rol_id: 3, // ventas
  },
  {
    nombre: "E2E Tecnico Test",
    email: "e2e.tecnico@pcmaker.test",
    rol_id: 2, // técnico
  },
  {
    nombre: "E2E Admin Test",
    email: "e2e.admin@pcmaker.test",
    rol_id: 1, // admin
  },
];

async function obtenerSucursalId() {
  const { rows } = await pool.query(
    `SELECT id FROM sucursales ORDER BY id ASC LIMIT 1`
  );
  if (!rows.length) {
    throw new Error("No hay sucursales en la base de datos — crea una antes de correr el seed.");
  }
  return rows[0].id;
}

async function upsertUsuarioE2E({ nombre, email, rol_id }, sucursal_id, hashedPassword) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, email, contraseña, rol_id, activo, sucursal_id)
     VALUES ($1, $2, $3, $4, TRUE, $5)
     ON CONFLICT (email) DO UPDATE
       SET nombre = EXCLUDED.nombre,
           contraseña = EXCLUDED.contraseña,
           rol_id = EXCLUDED.rol_id,
           activo = TRUE,
           sucursal_id = EXCLUDED.sucursal_id
     RETURNING id, email, rol_id, sucursal_id;`,
    [nombre, email, hashedPassword, rol_id, sucursal_id]
  );
  return rows[0];
}

async function main() {
  const sucursal_id = await obtenerSucursalId();
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  for (const usuario of USUARIOS_E2E) {
    const creado = await upsertUsuarioE2E(usuario, sucursal_id, hashedPassword);
    console.log(`✔ ${creado.email} (id=${creado.id}, rol_id=${creado.rol_id}, sucursal_id=${creado.sucursal_id})`);
  }

  console.log(`\nContraseña de ambos usuarios: ${PASSWORD}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Error creando usuarios E2E:", err);
  process.exit(1);
});
