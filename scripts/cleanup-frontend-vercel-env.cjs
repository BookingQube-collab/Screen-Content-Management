/**
 * Remove API-only / duplicate env vars from the frontend (screene3) Vercel project.
 * Keeps Supabase integration vars and frontend build vars.
 */

const path = require("path");
const { spawnSync } = require("child_process");

const linkDir = path.join(__dirname, "..", "artifacts", "urban-arena");
const scope = process.env.VERCEL_SCOPE || "e3urbanarena-8919s-projects";
const projectId = process.env.VERCEL_PROJECT_ID || "prj_lnJtb4WVJINjknCKKRKr7lfxVTZA";
const targets = ["production", "development"];

const REMOVE = [
  "DATABASE_URL",
  "JWT_SECRET",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "DEFAULT_OBJECT_STORAGE_BUCKET_ID",
  "SUPABASE_URL",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_ANON_KEY",
];

function vercelCmd(args) {
  const result = spawnSync("npx", args, {
    cwd: linkDir,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `npx ${args.join(" ")}\n${result.stdout || ""}\n${result.stderr || ""}`.trim(),
    );
  }
}

function rmEnv(name, target) {
  try {
    vercelCmd(["vercel", "env", "rm", name, target, "-y", "--scope", scope]);
    console.log(`Removed ${name} (${target})`);
  } catch (err) {
    console.log(`Skip ${name} (${target}): not found or protected`);
  }
}

vercelCmd([
  "vercel",
  "link",
  "--yes",
  "--project",
  projectId,
  "--scope",
  scope,
]);

for (const target of targets) {
  for (const name of REMOVE) {
    rmEnv(name, target);
  }
}

console.log("\nKept on frontend: BASE_PATH, PORT, Supabase integration vars (POSTGRES_*, NEXT_PUBLIC_*, etc.)");
vercelCmd(["vercel", "env", "ls", "--scope", scope]);
