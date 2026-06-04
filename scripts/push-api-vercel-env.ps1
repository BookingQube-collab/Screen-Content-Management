# Push API env vars from repo root `.env` to the correct Vercel project.
# Usage (after `npx vercel login` with the account that owns the API):
#   cd artifacts/api-server
#   pwsh -File ../../scripts/push-api-vercel-env.ps1 -Scope <team-slug>
#
# Example team: the Hobby team shown as "e3urbanarena-8919's projects" in the dashboard
# (use the slug from `npx vercel teams ls` after logging into that account).

param(
  [Parameter(Mandatory = $true)]
  [string]$Scope,
  [string]$Project = "screen-content-management-api-serve",
  [string]$PoolerHost = "aws-1-ap-south-1.pooler.supabase.com"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $root ".env"
$apiDir = Join-Path $root "artifacts\api-server"

if (-not (Test-Path $envPath)) { throw "Missing $envPath" }

function Read-DotEnv([string]$path) {
  $map = @{}
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    if ($_ -match '^([^=]+)=(.*)$') { $map[$matches[1]] = $matches[2] }
  }
  $map
}

function To-PoolerDatabaseUrl([string]$direct, [string]$poolerHost) {
  if ($direct -match 'pooler\.supabase\.com') { return $direct }
  if ($direct -notmatch '^postgresql://postgres:([^@]+)@db\.([a-z0-9]+)\.supabase\.co:5432/(.+)$') {
    throw "DATABASE_URL is not direct Supabase format; set pooler URL manually."
  }
  $pass = $matches[1]
  $ref = $matches[2]
  $path = $matches[3]
  "postgresql://postgres.${ref}:${pass}@${poolerHost}:5432/${path}"
}

$envMap = Read-DotEnv $envPath
$names = @(
  "DATABASE_URL", "JWT_SECRET", "SUPABASE_URL", "SUPABASE_PROJECT_REF",
  "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_ANON_KEY"
)
foreach ($n in $names) {
  if (-not $envMap.ContainsKey($n) -or [string]::IsNullOrWhiteSpace($envMap[$n])) {
    throw "Missing or empty $n in .env"
  }
}

$envMap["DATABASE_URL"] = To-PoolerDatabaseUrl $envMap["DATABASE_URL"] $PoolerHost

Set-Location $apiDir
npx vercel link --yes --project $Project --scope $Scope

$targets = @("production", "preview", "development")
foreach ($name in $names) {
  $value = $envMap[$name]
  foreach ($target in $targets) {
    npx vercel env add $name $target --value $value --yes --force 2>&1 | Out-Null
    Write-Host "Set $name ($target)"
  }
}

npx vercel env ls
npx vercel deploy --prod --yes
Write-Host "Done. Verify https://${Project}.vercel.app/"
