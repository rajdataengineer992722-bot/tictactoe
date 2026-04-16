# Deploy To GCP

This guide deploys the project as:

```text
Frontend: Vercel
Backend: Google Cloud Run
Database: Google Cloud SQL for PostgreSQL
Container images: Google Artifact Registry
Secrets: Google Secret Manager
```

For the first production deployment, run Cloud Run with `--max-instances=1`. The current match state is in Nakama process memory, so multiple Cloud Run instances need a more deliberate clustering/session strategy.

## 1. Install And Login

Install:

- Google Cloud CLI
- Docker Desktop
- Node.js 20+

Login:

```bash
gcloud auth login
gcloud auth application-default login
```

Set your project:

```bash
gcloud config set project YOUR_GCP_PROJECT_ID
```

## Fast Path

After billing is enabled on your GCP project and `gcloud auth login` is complete, this repo includes a PowerShell deployment script:

```powershell
.\scripts\deploy-gcp.ps1 -ProjectId "skill-genie" -Region "us-central1"
```

It enables APIs, creates Cloud SQL, stores secrets, builds the Nakama image with Cloud Build, deploys Cloud Run, and prints the Vercel environment variables.

The manual steps below are the same process expanded line by line.

Set variables:

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="us-central1"
export REPO="tictac"
export SERVICE="tictac-nakama"
export IMAGE="nakama"
export SQL_INSTANCE="tictac-postgres"
export DB_PASSWORD="CHANGE_ME_STRONG_DB_PASSWORD"
```

PowerShell equivalent:

```powershell
$PROJECT_ID="YOUR_GCP_PROJECT_ID"
$REGION="us-central1"
$REPO="tictac"
$SERVICE="tictac-nakama"
$IMAGE="nakama"
$SQL_INSTANCE="tictac-postgres"
$DB_PASSWORD="CHANGE_ME_STRONG_DB_PASSWORD"
```

## 2. Enable APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

## 3. Create Cloud SQL PostgreSQL

```bash
gcloud sql instances create $SQL_INSTANCE \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-size=10GB
```

```bash
gcloud sql databases create nakama \
  --instance=$SQL_INSTANCE
```

```bash
gcloud sql users create nakama \
  --instance=$SQL_INSTANCE \
  --password="$DB_PASSWORD"
```

For real production traffic, use a larger tier than `db-f1-micro`.

## 4. Get The Cloud SQL IP

Quick-start public IP:

```bash
export DB_HOST="$(gcloud sql instances describe $SQL_INSTANCE --format='value(ipAddresses[0].ipAddress)')"
export DATABASE_ADDRESS="nakama:$DB_PASSWORD@$DB_HOST:5432/nakama"
```

PowerShell:

```powershell
$DB_HOST=(gcloud sql instances describe $SQL_INSTANCE --format="value(ipAddresses[0].ipAddress)")
$DATABASE_ADDRESS="nakama:$DB_PASSWORD@$DB_HOST`:5432/nakama"
```

For a hardened production deployment, prefer Cloud SQL private IP through Serverless VPC Access.

## 5. Create Artifact Registry

```bash
gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION
```

If it already exists, continue.

## 6. Build And Push Nakama

Run this from the repo root:

```bash
gcloud builds submit ./nakama \
  --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE:latest
```

The Dockerfile compiles `nakama/src/main.ts`, copies `build/main.js`, and starts with `nakama/start.sh`.

## 7. Create Secrets

Generate four strong keys:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Set them:

```bash
export NAKAMA_SERVER_KEY="PASTE_KEY_1"
export NAKAMA_SESSION_ENCRYPTION_KEY="PASTE_KEY_2"
export NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY="PASTE_KEY_3"
export NAKAMA_RUNTIME_HTTP_KEY="PASTE_KEY_4"
```

Create Secret Manager entries:

```bash
printf "%s" "$DATABASE_ADDRESS" | gcloud secrets create nakama-db-address --data-file=-
printf "%s" "$NAKAMA_SERVER_KEY" | gcloud secrets create nakama-server-key --data-file=-
printf "%s" "$NAKAMA_SESSION_ENCRYPTION_KEY" | gcloud secrets create nakama-session-key --data-file=-
printf "%s" "$NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY" | gcloud secrets create nakama-refresh-key --data-file=-
printf "%s" "$NAKAMA_RUNTIME_HTTP_KEY" | gcloud secrets create nakama-runtime-http-key --data-file=-
```

If a secret already exists, add a new version instead:

```bash
printf "%s" "$DATABASE_ADDRESS" | gcloud secrets versions add nakama-db-address --data-file=-
```

## 8. Deploy Nakama To Cloud Run

```bash
gcloud run deploy $SERVICE \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=7350 \
  --min-instances=1 \
  --max-instances=1 \
  --timeout=3600 \
  --memory=1Gi \
  --cpu=1 \
  --set-secrets="DATABASE_ADDRESS=nakama-db-address:latest,NAKAMA_SERVER_KEY=nakama-server-key:latest,NAKAMA_SESSION_ENCRYPTION_KEY=nakama-session-key:latest,NAKAMA_SESSION_REFRESH_ENCRYPTION_KEY=nakama-refresh-key:latest,NAKAMA_RUNTIME_HTTP_KEY=nakama-runtime-http-key:latest"
```

Read logs:

```bash
gcloud run services logs read $SERVICE \
  --region=$REGION \
  --limit=100
```

Get the service URL:

```bash
gcloud run services describe $SERVICE \
  --region=$REGION \
  --format="value(status.url)"
```

Example:

```text
https://tictac-nakama-abc123-uc.a.run.app
```

Use the hostname only in frontend config:

```text
tictac-nakama-abc123-uc.a.run.app
```

## 9. Deploy Frontend To Vercel

Push this repo to GitHub, then import it in Vercel:

```text
Root Directory: frontend
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build
```

Set Vercel environment variables:

```env
NEXT_PUBLIC_NAKAMA_SERVER_KEY=PASTE_KEY_1
NEXT_PUBLIC_NAKAMA_HOST=tictac-nakama-abc123-uc.a.run.app
NEXT_PUBLIC_NAKAMA_PORT=443
NEXT_PUBLIC_NAKAMA_USE_SSL=true
```

Deploy.

## 10. Test

1. Open the Vercel URL in one browser.
2. Open the same URL in an incognito window or another browser.
3. Use two different usernames.
4. Click `Find Match` in both windows.
5. Play a game.
6. If it fails, inspect Cloud Run logs:

```bash
gcloud run services logs read $SERVICE \
  --region=$REGION \
  --limit=100
```

## Optional Custom Domain

Recommended:

```text
yourgame.com      -> Vercel frontend
api.yourgame.com  -> Cloud Run Nakama
```

Map Cloud Run:

```bash
gcloud run domain-mappings create \
  --service=$SERVICE \
  --domain=api.yourgame.com \
  --region=$REGION
```

Then update Vercel:

```env
NEXT_PUBLIC_NAKAMA_HOST=api.yourgame.com
NEXT_PUBLIC_NAKAMA_PORT=443
NEXT_PUBLIC_NAKAMA_USE_SSL=true
```
