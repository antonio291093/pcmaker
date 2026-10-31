/**
 * Crea (o actualiza) los usuarios dedicados para las pruebas E2E de Playwright.
 * Uso: cd backend && E2E_SEED_PASSWORD='...' node scripts/seedE2EUsers.js
 * Requiere backend/.env con DATABASE_URL apuntando a la base de datos de desarrollo.
 * La contraseña de los 3 usuarios se lee de E2E_SEED_PASSWORD (variable de entorno o
 * backend/.env) y debe coincidir con las E2E_*_PASSWORD de e2e/.env.
 * Aborta si DATABASE_URL no apunta a localhost o a una BD de pruebas: el script crea un admin.
 * Idempotente: usa upsert por email, se puede correr varias veces sin duplicar.
 */
const bcrypt = require("bcryptjs");
// config/db carga backend/.env; el pool no se conecta hasta la primera consulta
const pool = require("../src/config/db");

const PASSWORD = process.env.E2E_SEED_PASSWORD;

const HOSTS_LOCALES = ["localhost", "127.0.0.1", "::1", "[::1]"];

function validarAmbiente() {
  if (!PASSWORD) {
    throw new Error("Falta la variable de entorno E2E_SEED_PASSWORD.");
  }

  let url;
  try {
    url = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL no está definida o no es válida.");
  }

  const nombreBd = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const esLocal = HOSTS_LOCALES.includes(url.hostname);
  const esBdPruebas = /(^|[_-])(test|e2e)([_-]|$)/i.test(nombreBd);
  if (!esLocal && !esBdPruebas) {
    throw new Error(
      `DATABASE_URL apunta a ${url.hostname}/${nombreBd}: solo se permite localhost o una BD de pruebas (nombre con test/e2e).`
    );
  }
}

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
  validarAmbiente();
  const sucursal_id = await obtenerSucursalId();
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  for (const usuario of USUARIOS_E2E) {
    const creado = await upsertUsuarioE2E(usuario, sucursal_id, hashedPassword);
    console.log(`✔ ${creado.email} (id=${creado.id}, rol_id=${creado.rol_id}, sucursal_id=${creado.sucursal_id})`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Error creando usuarios E2E:", err.message);
  process.exit(1);
});
