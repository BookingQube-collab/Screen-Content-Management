import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile, writeFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times without risking some
// packages that are not bundle compatible
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "pino",
  "pino-http",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("building server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  const internalFile = path.resolve(distDir, "internal.cjs");
  const entryFile = path.resolve(distDir, "index.cjs");

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/app.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: internalFile,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // esbuild emits `module.exports = vO(entry)` before the Express app is initialized.
  let bundle = await readFile(internalFile, "utf8");
  bundle = bundle.replace(/module\.exports=vO\(\w+\);/, "");
  const patched = bundle.replace(
    /var sW=(\w+);\s*\/\*!\s*Bundled license/,
    "var sW=$1;module.exports=$1;exports=$1;\n/*! Bundled license",
  );
  if (patched === bundle) {
    throw new Error(
      "Could not patch Express app export (expected `var sW=<app>;` before license block)",
    );
  }
  await writeFile(internalFile, patched);

  // Vercel / Node require the entry file; load the fully-initialized app from internal.js.
  await writeFile(
    entryFile,
    [
      '"use strict";',
      "const loaded = require('./internal.cjs');",
      "const app = loaded && loaded.default ? loaded.default : loaded;",
      "module.exports = app;",
      "",
    ].join("\n"),
  );
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
