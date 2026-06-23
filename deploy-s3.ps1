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

  Deploy actual de Arketo (S3 privado + CloudFront OAC):
    ./deploy-s3.ps1 -Bucket arketo -Profile arketo -DistributionId E2RZNKY9KTZGSQ
  Front en vivo: https://d3fs77bs4fvh0.cloudfront.net
#>
param(
  [Parameter(Mandatory = $true)] [string]$Bucket,
  [string]$Profile = "",
  [string]$Region = "us-east-1",
  # Si se pasa, invalida la cache de CloudFront tras el sync (refresca index.html).
  [string]$DistributionId = ""
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
  --cache-control "no-cache" --content-type "text/html" --region $Region @profileArg

if ($DistributionId) {
  Write-Host "==> Invalidando cache de CloudFront ($DistributionId)..." -ForegroundColor Cyan
  aws cloudfront create-invalidation --distribution-id $DistributionId `
    --paths "/*" --region $Region @profileArg | Out-Null
  Write-Host "==> Invalidación creada (tarda ~1-2 min en propagar)." -ForegroundColor Green
}

Write-Host "==> Listo." -ForegroundColor Green
if (-not $DistributionId) {
  Write-Host "    (Pasa -DistributionId <id> para invalidar CloudFront y refrescar index.html.)" -ForegroundColor DarkGray
}
