import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {Client} from "pg";

/**
 * Aplica UNICAMENTE los mensajes de bendicion curados (prisma/seed.sql).
 * El seed es idempotente: usa ON CONFLICT para actualizar sin duplicar.
 *
 * Uso:
 *   DATABASE_URL=postgresql://USUARIO:CLAVE@HOST:5432/BASE \
 *     npm run seed:blessing-messages -- --confirm
 *
 * Requiere DATABASE_URL configurada explicitamente. No incluye ni lee secretos
 * incrustados. Solo ejecuta contra la base indicada; nunca se ejecuta solo.
 */

const confirmFlag = process.argv.includes("--confirm");
if (!confirmFlag) {
  console.error(
    "Seed bloqueado: este comando escribe en la base de datos indicada por DATABASE_URL.\n" +
      "Vuelve a ejecutarlo agregando --confirm cuando estes seguro del destino. Ejemplo:\n" +
      "  npm run seed:blessing-messages -- --confirm"
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("Falta DATABASE_URL. Configurala con la cadena de conexion del entorno de destino.");
  process.exit(1);
}

function describeTarget(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    const database = parsed.pathname.replace(/^\//, "") || "(sin nombre)";
    return `${parsed.hostname}:${parsed.port || "5432"}/${database} (usuario ${parsed.username || "desconocido"})`;
  } catch {
    return "(DATABASE_URL no tiene formato URL valido)";
  }
}

const seedPath = fileURLToPath(new URL("../prisma/seed.sql", import.meta.url));
const seedSql = readFileSync(seedPath, "utf8");

console.log(`Aplicando mensajes de bendicion de prisma/seed.sql en ${describeTarget(databaseUrl)}`);

const client = new Client({connectionString: databaseUrl});
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(seedSql);
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

console.log("Mensajes de bendicion aplicados. Verifica con una consulta de solo lectura si lo deseas.");
