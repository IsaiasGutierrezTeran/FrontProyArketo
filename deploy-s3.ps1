<#
  Despliegue del frontend Arketo a Amazon S3 (sitio estático).

  SEGURIDAD: este script NO contiene credenciales. Usa las que tengas
  configuradas con `aws configure` (perfil de AWS CLI) o las variables de
  entorno estándar AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY. Nunca pegues
  tus claves en este archivo ni en el repositorio.

  Requisitos:
    1) AWS CLI v2 instalado.
    2) `aws configure` ya ejecutado (o un perfil con `-Profile`).

  Uso:
    ./deploy-s3.ps1 -Bucket nombre-de-tu-bucket
    ./deploy-s3.ps1 -Bucket mi-bucket -Profile arketo -Region us-east-1
#>
param(
  [Parameter(Mandatory = $true)] [string]$Bucket,
  [string]$Profile = "",
  [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
$dist = Join-Path $PSScriptRoot "dist/arketo/browser"

Write-Host "==> Compilando en modo producción..." -ForegroundColor Cyan
npm run build

if (-not (Test-Path $dist)) {
  # Angular 17- usa dist/arketo; 18+ usa dist/arketo/browser. Detecta cuál existe.
  $alt = Join-Path $PSScriptRoot "dist/arketo"
  if (Test-Path (Join-Path $alt "index.html")) { $dist = $alt }
  else { throw "No se encontró el directorio de build ($dist)." }
}

$profileArg = if ($Profile) { @("--profile", $Profile) } else { @() }

Write-Host "==> Sincronizando $dist -> s3://$Bucket ..." -ForegroundColor Cyan
# Hashes de Angular permiten cache largo; index.html nunca se cachea.
aws s3 sync $dist "s3://$Bucket" --delete --exclude "index.html" `
  --cache-control "public,max-age=31536000,immutable" --region $Region @profileArg
aws s3 cp (Join-Path $dist "index.html") "s3://$Bucket/index.html" `
  --cache-control "no-cache" --region $Region @profileArg

Write-Host "==> Listo. (Si usas CloudFront, invalida la distribución para refrescar index.html.)" -ForegroundColor Green
