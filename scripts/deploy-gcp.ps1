param(
  [string]$ProjectId = "skill-genie",
  [string]$Region = "us-central1",
  [string]$Repo = "tictac",
  [string]$Service = "tictac-nakama",
  [string]$Image = "nakama",
  [string]$SqlInstance = "tictac-postgres",
  [string]$DbPassword = ""
)

$ErrorActionPreference = "Stop"

$Gcloud = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $Gcloud)) {
  $Gcloud = "gcloud"
}

function New-HexSecret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
  $DbPassword = New-HexSecret
}

$ServerKey = New-HexSecret
$SessionKey = New-HexSecret
$RefreshKey = New-HexSecret
$RuntimeHttpKey = New-HexSecret

& $Gcloud config set project $ProjectId

& $Gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  sqladmin.googleapis.com `
  secretmanager.googleapis.com

$existingSql = & $Gcloud sql instances list --format="value(name)" | Select-String -SimpleMatch $SqlInstance
if (-not $existingSql) {
  & $Gcloud sql instances create $SqlInstance `
    --database-version=POSTGRES_15 `
    --tier=db-f1-micro `
    --region=$Region `
    --storage-size=10GB
}

$existingDb = & $Gcloud sql databases list --instance=$SqlInstance --format="value(name)" | Select-String -SimpleMatch "nakama"
if (-not $existingDb) {
  & $Gcloud sql databases create nakama --instance=$SqlInstance
}

$existingUser = & $Gcloud sql users list --instance=$SqlInstance --format="value(name)" | Select-String -SimpleMatch "nakama"
if (-not $existingUser) {
  & $Gcloud sql users create nakama --instance=$SqlInstance --password=$DbPassword
}

# Quick-start connectivity: public IP. For hardened production, move to private IP/VPC.
& $Gcloud sql instances patch $SqlInstance --authorized-networks=0.0.0.0/0 --quiet

$DbHost = & $Gcloud sql instances describe $SqlInstance --format="value(ipAddresses[0].ipAddress)"
$DatabaseAddress = "nakama:$DbPassword@$DbHost`:5432/nakama"

$existingRepo = & $Gcloud artifacts repositories list --location=$Region --format="value(name)" | Select-String -SimpleMatch "repositories/$Repo"
if (-not $existingRepo) {
  & $Gcloud artifacts repositories create $Repo --repository-format=docker --location=$Region
}

function Set-SecretValue([string]$Name, [string]$Value) {
  $exists = & $Gcloud secrets list --format="value(name)" | Select-String -SimpleMatch $Name
  if ($exists) {
    $Value | & $Gcloud secrets versions add $Name --data-file=-
  } else {
    $Value | & $Gcloud secrets create $Name --data-file=-
  }
}

Set-SecretValue "nakama-db-address" $DatabaseAddress
Set-SecretValue "nakama-server-key" $ServerKey
Set-SecretValue "nakama-session-key" $SessionKey
Set-SecretValue "nakama-refresh-key" $RefreshKey
Set-SecretValue "nakama-runtime-http-key" $RuntimeHttpKey

$ImageUrl = "$Region-docker.pkg.dev/$ProjectId/$Repo/$Image`:latest"
& $Gcloud builds submit .\nakama --tag $ImageUrl

& $Gcloud run deploy $Service `
  --image=$ImageUrl `
  --region=$Region `
  --platform=managed `
  --allow-unauthenticated `
  --port=7350 `
  --min-instances=1 `
  --max-instances=1 `
  --timeout=3600 `
  --memory=1Gi `
  --cpu=1 `
  --set-secrets="DATABASE_ADDRESS=nakama-db-address:latest,NAKAMA_SERVER_KEY=nakama-server-key:latest,NAKAMA_SESSION_ENCRYPTION_KEY=nakama-session-key:latest,NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY=nakama-refresh-key:latest,NAKAMA_RUNTIME_HTTP_KEY=nakama-runtime-http-key:latest"

$ServiceUrl = & $Gcloud run services describe $Service --region=$Region --format="value(status.url)"
$HostName = $ServiceUrl -replace "^https://", ""

Write-Host ""
Write-Host "Deployment complete."
Write-Host "Cloud Run URL: $ServiceUrl"
Write-Host ""
Write-Host "Set these Vercel env vars:"
Write-Host "NEXT_PUBLIC_NAKAMA_SERVER_KEY=$ServerKey"
Write-Host "NEXT_PUBLIC_NAKAMA_HOST=$HostName"
Write-Host "NEXT_PUBLIC_NAKAMA_PORT=443"
Write-Host "NEXT_PUBLIC_NAKAMA_USE_SSL=true"
