# Deployment Guide

This directory contains the backend deployment configuration for the Varalabs ERP platform.

## Architecture

```
User → Cloudflare (SSL/WAF)
       │
       ├── *.varalabs.dev ──→ Vercel Edge Network (React SPA)
       │
       └── api.varalabs.dev ──→ Azure VM :8080 (Rust backend)
                                    │
                                    ├── app-gateway (Axum :8080)
                                    └── minio (S3 storage :9000)
                                    │
                                    └── VNet → Azure PostgreSQL
```

## Components

| Service | Host | Port | Purpose |
|---------|------|------|---------|
| **app-gateway** | Azure VM | 8080 | Rust/Axum backend (GraphQL + REST) |
| **minio** | Azure VM | 9000/9001 | S3-compatible object storage |
| **PostgreSQL** | Azure Flexible Server | 5432 | Database (external to VM) |
| **Frontend** | Vercel | — | React SPA (deployed separately) |

## Backend Deployment (Azure VM)

### 1. Prerequisites

- Docker + Docker Compose installed on the VM
- PostgreSQL Flexible Server accessible from the VM
- Cloudflare DNS configured with:
  - `api.varalabs.dev` A record → VM public IP
  - `*.varalabs.dev` CNAME → Vercel (handled separately)

### 2. Environment Configuration

Create a `.env` file in this directory:

```bash
# ─── Database ─────────────────────────────────────────────────
DATABASE_URL=postgres://<user>:<password>@<host>:5432/<dbname>?sslmode=require

# ─── Authentication ───────────────────────────────────────────
JWT_SECRET=<a-long-random-secret>

# ─── S3-Compatible Object Storage (MinIO / R2 / Backblaze / Wasabi) ──
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=<change-from-default>
S3_SECRET_KEY=<change-from-default>
S3_BUCKET=erp-uploads
# S3_REGION=us-east-1

# Optional: public URL for serving files (bypasses presigned URLs)
# S3_PUBLIC_URL=https://cdn.varalabs.dev

# Optional: presigned URL TTL in seconds (default: 604800 = 7 days)
# S3_PRESIGN_TTL=604800

# ─── Server ───────────────────────────────────────────────────
BIND_ADDR=0.0.0.0:8080
RUST_LOG=app_gateway=info,tower_http=info

# ─── Docker Images ────────────────────────────────────────────
BACKEND_IMAGE=ghcr.io/<your-org>/varalabs-erp/app-gateway:latest
```

### 3. Deploy

```bash
cd deployment

# Start backend + MinIO
docker compose up -d

# Verify all containers are running
docker compose ps

# View logs
docker compose logs -f app-gateway
docker compose logs -f minio
```

### 4. Verify

```bash
# Health check
curl http://localhost:8080/health

# GraphQL endpoint
curl -s http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# MinIO health
curl http://localhost:9000/minio/health/live
```

### 5. Update / Redeploy

```bash
# Pull latest images
docker compose pull

# Restart services
docker compose up -d

# Remove old unused images
docker image prune -f
```

## MinIO Management

### Console Access

Open `http://<vm-ip>:9001` in your browser.

- **Username**: value of `S3_ACCESS_KEY`
- **Password**: value of `S3_SECRET_KEY`

### Bucket Initialization

The `minio-init` container runs on first startup and:
1. Creates the `erp-uploads` bucket (if it doesn't exist)
2. Sets it to public access (for presigned URL compatibility)

This is idempotent — running `docker compose up` multiple times is safe.

### Switching to a Hosted S3 Provider

To migrate from MinIO to Cloudflare R2, Backblaze B2, Wasabi, or AWS S3:

1. **Create a bucket** on your new provider
2. **Migrate files** (if any):
   ```bash
   rclone sync minio:erp-uploads new-provider:erp-uploads
   ```
3. **Update `.env`**:
   ```bash
   S3_ENDPOINT=https://<endpoint-url>
   S3_ACCESS_KEY=<new-key>
   S3_SECRET_KEY=<new-secret>
   S3_BUCKET=erp-uploads
   S3_REGION=<region-if-applicable>
   ```
4. **Restart**: `docker compose up -d app-gateway`
5. **Remove MinIO** (optional): stop and remove the `minio` and `minio-init` services from `docker-compose.yml`

No code changes or database migrations needed.

## DNS Configuration (Cloudflare)

| Record | Type | Value | Proxy Status |
|--------|------|-------|-------------|
| `api.varalabs.dev` | A | `<vm-public-ip>` | Proxied (orange cloud) |
| `*.varalabs.dev` | CNAME | `cname.vercel-dns.com` | DNS only (grey cloud) |

**SSL/TLS Mode**: Set to **"Full"** in Cloudflare dashboard.

## Frontend Deployment

The frontend is deployed to Vercel separately. See `../erp-frontend/vercel.json` for configuration.

See the main [QWEN.md](../QWEN.md) for frontend deployment instructions.

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs app-gateway

# Common issues:
# - DATABASE_URL format incorrect
# - S3_ACCESS_KEY / S3_SECRET_KEY not set
# - PostgreSQL not reachable from VM
```

### MinIO not accessible

```bash
# Check if MinIO is healthy
docker compose exec minio mc ready local

# Verify bucket exists
docker compose exec minio mc ls local/erp-uploads
```

### Presigned URL failures

```bash
# Test backend can reach MinIO
docker compose exec app-gateway wget -qO- http://minio:9000/minio/health/live

# Check S3_ENDPOINT in .env matches MinIO's internal address
# Should be: S3_ENDPOINT=http://minio:9000 (Docker DNS)
```

### Useful Commands

```bash
# Check container status
docker compose ps

# View backend logs
docker compose logs --tail=100 app-gateway

# Restart a single service
docker compose restart app-gateway

# Open a shell in the backend container
docker compose exec app-gateway sh

# Database connection test
docker compose exec app-gateway nc -zv <db-host> 5432

# Clear old Docker images
docker image prune -f --filter "until=24h"
```
