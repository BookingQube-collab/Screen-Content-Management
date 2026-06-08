/**
 * Push GCS object-storage env vars to the API Vercel project.
 *
 * Reads:
 *   - GOOGLE_SERVICE_ACCOUNT_JSON from root .env, or
 *     google_drive_service_account_key from Postgres settings
 *   - DEFAULT_OBJECT_STORAGE_BUCKET_ID from root .env (required)
 *
 * Usage (from repo root, after `npx vercel login`):
 *   node scripts/push-gcs-vercel-env.cjs
 *
 * Optional env overrides:
 *   VERCEL_SCOPE=e3urbanarena-8919
 *   VERCEL_PROJECT=screen-content-management-api-serve
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const pgPath = path.join(__dirname, "_pgtmp", "node_modules", "pg");
const { Pool } = require(fs.existsSync(pgPath) ? pgPath : "pg");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const apiDir = path.join(root, "artifacts", "api-server");
const scope = process.env.VERCEL_SCOPE || "e3urbanarena-8919s-projects";
const project = process.env.VERCEL_PROJECT || "screen-content-management-api-serve";
// Preview requires an explicit git branch in newer Vercel CLI; production is enough for live API.
const targets = ["production"];

function readDotEnv(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
  return map;
}

async function loadServiceAccountJson(envMap) {
  if (envMap.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) {
    return envMap.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
  }

  const dbUrl = envMap.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing in .env");

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const { rows } = await pool.query(
      "SELECT value FROM settings WHERE key = 'google_drive_service_account_key' LIMIT 1",
    );
    const value = rows[0]?.value?.trim();
    if (!value) throw new Error("google_drive_service_account_key not found in settings table");
    JSON.parse(value);
    return value;
  } finally {
    await pool.end();
  }
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd || apiDir,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
    input: opts.input,
  });
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")}\n${result.stdout || ""}\n${result.stderr || ""}`.trim(),
    );
  }
  return result.stdout;
}

function setVercelEnv(name, value, target) {
  run("npx", [
    "vercel",
    "env",
    "add",
    name,
    target,
    "--value",
    value,
    "--yes",
    "--force",
    "--scope",
    scope,
  ]);
}

async function main() {
  const envMap = readDotEnv(envPath);
  const bucketId = envMap.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim();
  if (!bucketId) {
    throw new Error(
      "DEFAULT_OBJECT_STORAGE_BUCKET_ID is missing in .env. " +
        "Create a GCS bucket, add the line to .env, then rerun this script.",
    );
  }

  const serviceAccountJson = await loadServiceAccountJson(envMap);
  const sa = JSON.parse(serviceAccountJson);
  console.log("Bucket:", bucketId);
  console.log("Service account:", sa.client_email);
  console.log("Vercel project:", project, "@", scope);

  run("npx", ["vercel", "link", "--yes", "--project", project, "--scope", scope]);

  for (const target of targets) {
    setVercelEnv("DEFAULT_OBJECT_STORAGE_BUCKET_ID", bucketId, target);
    console.log(`Set DEFAULT_OBJECT_STORAGE_BUCKET_ID (${target})`);
    setVercelEnv("GOOGLE_SERVICE_ACCOUNT_JSON", serviceAccountJson, target);
    console.log(`Set GOOGLE_SERVICE_ACCOUNT_JSON (${target})`);
  }

  console.log("\nDone. Redeploy Production so the API picks up the new variables.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
