const path = require("node:path");
const { config } = require("dotenv");
const { defineConfig } = require("drizzle-kit");

const repoRoot = path.resolve(__dirname, "../..");

// Load root `.env` so `pnpm --filter @workspace/db run push` works locally.
config({ path: path.join(repoRoot, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env at the repo root and set your Supabase connection string.",
  );
}

/**
 * Push schema to Supabase (from repo root):
 *   1. cp .env.example .env  → set DATABASE_URL with your Supabase password
 *   2. pnpm --filter @workspace/db run push
 *
 * Use session pooler (preferred) or direct Postgres; add ?uselibpqcompat=true&sslmode=require if omitted.
 * For versioned migrations: `pnpm --filter @workspace/db run generate` then `migrate`.
 */
module.exports = defineConfig({
  schema: "./src/schema/index.ts",
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: "require",
  },
});
