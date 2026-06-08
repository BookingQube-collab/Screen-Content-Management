/**
 * Push API-only env vars to the Urban Arena API Vercel project.
 *
 * Usage:
 *   node scripts/push-api-vercel-env.cjs
 *
 * Optional:
 *   VERCEL_PROJECT=urban-arena-api
 *   VERCEL_PROJECT_ID=prj_...
 *   VERCEL_SCOPE=e3urbanarena-8919s-projects
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const scope = process.env.VERCEL_SCOPE || "e3urbanarena-8919s-projects";
const projectId = process.env.VERCEL_PROJECT_ID || "";
const projectName = process.env.VERCEL_PROJECT || "urban-arena-api";
const linkDir = path.join(root, "artifacts", "api-server");
const poolerHost = process.env.POOLER_HOST || "aws-1-ap-south-1.pooler.supabase.com";
const targets = ["production", "development"];

const API_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_ANON_KEY",
  "PORT",
  "DEFAULT_OBJECT_STORAGE_BUCKET_ID",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
];

const pgPath = path.join(__dirname, "_pgtmp", "node_modules", "pg");
const { Pool } = require(fs.existsSync(pgPath) ? pgPath : "pg");

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
  return run("npx", args, { cwd: opts.cwd || linkDir, shell: true });
}

function removeVercelEnv(name, target, cwd) {
  try {
    vercelCmd(["vercel", "env", "rm", name, target, "-y", "--scope", scope], { cwd });
  } catch {
    // ignore
  }
}

function setVercelEnv(name, value, target, cwd) {
  removeVercelEnv(name, target, cwd);
  const b64 = Buffer.from(value, "utf8").toString("base64");
  const ps = [
    `$v = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}'))`,
    `$v | npx vercel env add ${name} ${target} --yes --scope ${scope}`,
  ].join("; ");
  run("powershell", ["-NoProfile", "-Command", ps], { cwd });
}

async function main() {
  const envMap = readDotEnv(envPath);
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "SUPABASE_URL",
    "SUPABASE_PROJECT_REF",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_ANON_KEY",
    "PORT",
    "DEFAULT_OBJECT_STORAGE_BUCKET_ID",
  ];
  for (const key of required) {
    if (!envMap[key]?.trim()) throw new Error(`Missing or empty ${key} in .env`);
  }

  envMap.DATABASE_URL = toPoolerDatabaseUrl(envMap.DATABASE_URL.trim());
  const serviceAccountJson = await loadServiceAccountJson(envMap);

  const linkArgs = ["vercel", "link", "--yes", "--scope", scope];
  if (projectId) linkArgs.push("--project", projectId);
  else linkArgs.push("--project", projectName);

  console.log("API project:", projectId || projectName);
  vercelCmd(linkArgs);

  const vars = {
    DATABASE_URL: envMap.DATABASE_URL,
    JWT_SECRET: envMap.JWT_SECRET.trim(),
    SUPABASE_URL: envMap.SUPABASE_URL.trim(),
    SUPABASE_PROJECT_REF: envMap.SUPABASE_PROJECT_REF.trim(),
    SUPABASE_PUBLISHABLE_KEY: envMap.SUPABASE_PUBLISHABLE_KEY.trim(),
    SUPABASE_SECRET_KEY: envMap.SUPABASE_SECRET_KEY.trim(),
    SUPABASE_ANON_KEY: envMap.SUPABASE_ANON_KEY.trim(),
    PORT: envMap.PORT.trim(),
    DEFAULT_OBJECT_STORAGE_BUCKET_ID: envMap.DEFAULT_OBJECT_STORAGE_BUCKET_ID.trim(),
    GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccountJson,
  };

  for (const target of targets) {
    for (const [name, value] of Object.entries(vars)) {
      setVercelEnv(name, value, target, linkDir);
      console.log(`Set ${name} (${target})`);
    }
  }

  console.log("\nAPI env vars pushed.");
  vercelCmd(["vercel", "env", "ls", "--scope", scope]);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
