/**
 * Push all API/UI env vars from root `.env` (+ GCS creds from DB) to a Vercel project.
 *
 * Usage:
 *   node scripts/push-vercel-env.cjs
 *
 * Optional:
 *   VERCEL_PROJECT_ID=prj_...
 *   VERCEL_PROJECT=screene3
 *   VERCEL_SCOPE=e3urbanarena-8919s-projects
 *   VERCEL_LINK_DIR=artifacts/urban-arena
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const scope = process.env.VERCEL_SCOPE || "e3urbanarena-8919s-projects";
const projectId = process.env.VERCEL_PROJECT_ID || "prj_lnJtb4WVJINjknCKKRKr7lfxVTZA";
const projectName = process.env.VERCEL_PROJECT || "screene3";
const linkDir = path.join(root, process.env.VERCEL_LINK_DIR || "artifacts/urban-arena");
const poolerHost = process.env.POOLER_HOST || "aws-1-ap-south-1.pooler.supabase.com";
const targets = ["production", "development"];

const pgPath = path.join(__dirname, "_pgtmp", "node_modules", "pg");
const { Pool } = require(fs.existsSync(pgPath) ? pgPath : "pg");

const REQUIRED_FROM_ENV = [
  "DATABASE_URL",
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_ANON_KEY",
  "PORT",
  "BASE_PATH",
  "DEFAULT_OBJECT_STORAGE_BUCKET_ID",
];

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

function toPoolerDatabaseUrl(direct) {
  if (direct.includes("pooler.supabase.com")) return direct;
  const m = direct.match(
    /^postgresql:\/\/postgres:([^@]+)@db\.([a-z0-9]+)\.supabase\.co:5432\/(.+)$/,
  );
  if (!m) return direct;
  return `postgresql://postgres.${m[2]}:${m[1]}@${poolerHost}:5432/${m[3]}`;
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
    if (!value) throw new Error("google_drive_service_account_key not found in settings");
    JSON.parse(value);
    return value;
  } finally {
    await pool.end();
  }
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd || linkDir,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    input: opts.input,
    shell: opts.shell ?? false,
  });
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")}\n${result.stdout || ""}\n${result.stderr || ""}`.trim(),
    );
  }
  return (result.stdout || "") + (result.stderr || "");
}

function vercelCmd(args, opts = {}) {
  return run("npx", args, { ...opts, shell: true });
}

function removeVercelEnv(name, target) {
  try {
    vercelCmd(["vercel", "env", "rm", name, target, "-y", "--scope", scope]);
  } catch {
    // ignore if missing
  }
}

function setVercelEnv(name, value, target) {
  removeVercelEnv(name, target);

  if (process.platform === "win32") {
    const b64 = Buffer.from(value, "utf8").toString("base64");
    const ps = [
      `$v = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}'))`,
      `$v | npx vercel env add ${name} ${target} --yes --scope ${scope}`,
    ].join("; ");
    run("powershell", ["-NoProfile", "-Command", ps], { cwd: linkDir });
    return;
  }

  vercelCmd(
    ["vercel", "env", "add", name, target, "--yes", "--scope", scope],
    { input: value },
  );
}

async function main() {
  const envMap = readDotEnv(envPath);
  for (const key of REQUIRED_FROM_ENV) {
    if (!envMap[key]?.trim()) throw new Error(`Missing or empty ${key} in .env`);
  }

  envMap.DATABASE_URL = toPoolerDatabaseUrl(envMap.DATABASE_URL.trim());
  const serviceAccountJson = await loadServiceAccountJson(envMap);
  const sa = JSON.parse(serviceAccountJson);

  console.log("Target project:", projectName, projectId);
  console.log("Scope:", scope);
  console.log("Link dir:", linkDir);
  console.log("Service account:", sa.client_email);

  vercelCmd([
    "vercel",
    "link",
    "--yes",
    "--project",
    projectId,
    "--scope",
    scope,
  ]);

  const vars = {
    ...Object.fromEntries(REQUIRED_FROM_ENV.map((k) => [k, envMap[k].trim()])),
    GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccountJson,
  };

  for (const target of targets) {
    for (const [name, value] of Object.entries(vars)) {
      setVercelEnv(name, value, target);
      console.log(`Set ${name} (${target})`);
    }
  }

  console.log("\nAll variables pushed. Run a Production redeploy on Vercel to apply them.");
  vercelCmd(["vercel", "env", "ls", "--scope", scope]);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
