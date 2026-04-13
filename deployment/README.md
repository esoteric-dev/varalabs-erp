# ERP Deployment Guide — Azure B2 VM

Single VM deployment with Docker Compose, Nginx reverse proxy, and Cloudflare edge protection.

```
User → Cloudflare (SSL/WAF) → Azure VM :80
                                  ┌──────────────────────┐
                                  │   Nginx (port 80)    │
                                  │   ┌──────┐ ┌───────┐ │
                                  │   │ React│ │ Rust  │ │
                                  │   │  :80 │ │ :8080 │ │
                                  │   └──────┘ └───┬───┘ │
                                  │         uploads vol  │
                                  └──────────────────────┘
                                          │ VNet
                                  ┌───────┴────────┐
                                  │ PostgreSQL     │
                                  │ Flexible Server│
                                  └────────────────┘
```

---

## 1. Quick Start (5 minutes)

If your VM is already set up with Docker, you just need to configure GitHub Secrets and push.

### 1.1 Create GitHub Secrets

Go to **GitHub → Your repo → Settings → Secrets and variables → Actions → New repository secret**

You need exactly **6 secrets**:

#### Infrastructure Secrets (`DEPLOY_*`)

| Secret | Value | Example |
|--------|-------|---------|
| `DEPLOY_HOST` | Azure VM public IP | `20.193.xxx.xxx` |
| `DEPLOY_USER` | SSH username | `azureuser` |
| `DEPLOY_PASSWORD` | SSH password | `YourSecurePassword123!` |
| `DEPLOY_GH_PAT` | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx` |

#### Application Secrets (`APP_*`)

| Secret | Value | Example |
|--------|-------|---------|
| `APP_DATABASE_URL` | PostgreSQL connection string | `postgres://admin:pass@server.postgres.database.azure.com:5432/erp?sslmode=require` |
| `APP_JWT_SECRET` | Random string for JWT signing | `a1b2c3d4e5f6...` (32+ chars) |

### 1.2 Create the GitHub PAT (`DEPLOY_GH_PAT`)

This token lets the VM pull your private Docker images from GitHub Container Registry.

1. Go to **github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Set expiration (90 days recommended)
4. Check **only** these scopes:
   - ✅ `read:packages`
5. Click **Generate token**
6. Copy the token and save it as the `DEPLOY_GH_PAT` secret

### 1.3 Deploy

```bash
# Push any change to app-gateway/ → backend deploys automatically
# Push any change to erp-frontend/ → frontend deploys automatically

# Or trigger manually:
# GitHub → Actions → "Deploy Backend" → Run workflow
```

---

## 2. VM Setup (First Time Only)

### 2.1 Azure Resources

| Resource | Configuration |
|----------|--------------|
| **VM** | Standard_B2s, Ubuntu 22.04 LTS |
| **VNet** | `erp-vnet` with `vm-subnet` (10.0.0.0/24) + `db-subnet` (10.0.1.0/24) |
| **PostgreSQL** | Flexible Server in `db-subnet`, private access only |
| **NSG Rules** | Allow inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS) |

> **Security**: Port 8080 should NOT be open publicly. Only Nginx (port 80) is exposed.

### 2.2 Install Docker on the VM

```bash
ssh azureuser@<VM_IP>

# Install Docker Engine
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Log out and back in
exit
ssh azureuser@<VM_IP>

# Verify
docker --version        # Docker version 27.x
docker compose version  # Docker Compose version v2.x
```

### 2.3 Create Deployment Directory

```bash
mkdir -p ~/erp-deployment
```

That's it. GitHub Actions handles everything else.

---

## 3. Cloudflare DNS Setup

In **Cloudflare → varalabs.dev → DNS**:

| Type | Name  | Content   | Proxy     |
|------|-------|-----------|-----------|
| A    | `@`   | `<VM_IP>` | Proxied ☁️ |
| A    | `api` | `<VM_IP>` | Proxied ☁️ |
| A    | `*`   | `<VM_IP>` | Proxied ☁️ |

The `api.varalabs.dev` subdomain is the dedicated entry point for the Android app — it exposes only the backend API (no frontend). See [Android API Setup](./android-api.md) for the full mobile integration guide.

**SSL/TLS Settings** (Cloudflare → SSL/TLS):
- Encryption mode: **Full**
- Always Use HTTPS: **ON**
- Minimum TLS Version: **1.2**

> **Note**: Wildcard proxy (`*`) requires Cloudflare paid plan. On free plan, add individual A records per tenant subdomain.

---

## 4. How the CI/CD Works

```
┌─ GitHub Actions Runner ──────────────────────────────┐
│                                                       │
│  1. Build Docker image                                │
│  2. Push to ghcr.io                                   │
│  3. SCP: copy docker-compose.yml + nginx.conf to VM   │
│  4. SSH: write .env, pull images, docker compose up   │
│  5. SSH: run health checks                            │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Backend workflow triggers on:
- Changes to `app-gateway/**`
- Changes to `deployment/**`
- Changes to `.github/workflows/backend-deploy.yml`
- Manual dispatch

### Frontend workflow triggers on:
- Changes to `erp-frontend/**`
- Changes to `deployment/**`
- Changes to `.github/workflows/frontend-deploy.yml`
- Manual dispatch

### What each deploy does:
- **Backend deploy**: Rebuilds backend image → force-recreates `app-gateway` + `nginx-proxy` containers
- **Frontend deploy**: Rebuilds frontend image → force-recreates `frontend` + `nginx-proxy` containers

Neither deploy touches the other's container unnecessarily.

---

## 5. Data Persistence

| Data | Storage | Survives Restart? |
|------|---------|-------------------|
| Uploads (photos, files) | Docker volume `erp-uploads-data` | ✅ Yes |
| Database | Azure PostgreSQL Flexible Server | ✅ Yes |
| Container logs | json-file driver (auto-rotated) | Rotated |

### Backup uploads

```bash
docker run --rm -v erp-uploads-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 6. Troubleshooting

### View container status
```bash
cd ~/erp-deployment
docker compose ps
```

### View logs
```bash
docker compose logs --tail=50 app-gateway    # Backend logs
docker compose logs --tail=50 frontend       # Frontend logs
docker compose logs --tail=50 nginx-proxy    # Nginx access/error logs
docker compose logs -f nginx-proxy           # Follow live
```

### Restart a single service
```bash
docker compose restart app-gateway
```

### Full redeploy
```bash
docker compose down
docker compose up -d
```

### Check disk space
```bash
docker system df -v
```

### Rollback to previous version
```bash
cd ~/erp-deployment

# Edit .env — change the image tag to a previous commit SHA
# BACKEND_IMAGE=ghcr.io/esoteric-dev/varalabs-erp/app-gateway:<old-sha>

docker compose pull app-gateway
docker compose up -d --force-recreate app-gateway nginx-proxy
```

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `unauthorized` on docker pull | PAT expired or wrong scope | Regenerate PAT with `read:packages`, update `DEPLOY_GH_PAT` secret |
| `empty compose file` | docker-compose.yml corrupt or empty | Re-run workflow, check SCP step output |
| Container keeps restarting | App crash (check logs) | `docker compose logs app-gateway` |
| `502 Bad Gateway` | Backend not ready yet | Wait 30s, check `docker compose ps` for health status |
| DB connection refused | VM not in same VNet as Postgres | Verify `vm-subnet` is in `erp-vnet` |

---

## 7. Secrets Reference Card

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Secrets                      │
├─────────────────┬───────────────────────────────────┤
│ DEPLOY_HOST     │ VM public IP (e.g. 20.193.x.x)   │
│ DEPLOY_USER     │ SSH user (e.g. azureuser)         │
│ DEPLOY_PASSWORD │ SSH password                      │
│ DEPLOY_GH_PAT  │ GitHub PAT (read:packages)        │
│ APP_DATABASE_URL│ postgres://user:pass@host/db      │
│ APP_JWT_SECRET  │ Random 32+ char string            │
└─────────────────┴───────────────────────────────────┘
```

> **Migrating from old secrets?** If you had `VM_HOST`, `VM_USERNAME`, `VM_PASSWORD`, `GH_PAT_FOR_VM`, `DATABASE_URL`, `JWT_SECRET` — you can delete those after creating the new ones above. The names changed to avoid conflicts and use a consistent naming convention.
