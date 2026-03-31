# Cloudflare + Azure VM Domain Setup Guide

This guide covers configuring Cloudflare DNS to route traffic for `varalabs.dev` to your single Azure B2 VM running the ERP platform.

---

## 1. DNS Records

In Cloudflare Dashboard → `varalabs.dev` → DNS → Records:

### Root Domain
| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|-------------|-----|
| A | `@` | `<VM_PUBLIC_IP>` | Proxied ☁️ | Auto |

### Wildcard (Multi-Tenant Subdomains)
| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|-------------|-----|
| A | `*` | `<VM_PUBLIC_IP>` | Proxied ☁️ | Auto |

> [!NOTE]
> **Wildcard proxying** (orange cloud on `*`) requires a Cloudflare paid plan (Pro+).
> On the free plan, you must add individual A records per tenant:
> ```
> school1  A  <VM_PUBLIC_IP>  Proxied
> school2  A  <VM_PUBLIC_IP>  Proxied
> ```

---

## 2. SSL/TLS Configuration

Cloudflare Dashboard → `varalabs.dev` → SSL/TLS:

| Setting | Value | Why |
|---------|-------|-----|
| Encryption mode | **Full** | Cloudflare → VM uses HTTP (port 80), but Cloudflare encrypts client-facing |
| Always Use HTTPS | **ON** | Redirects HTTP → HTTPS at the edge |
| Automatic HTTPS Rewrites | **ON** | Fixes mixed content |
| Minimum TLS Version | **1.2** | Security best practice |
| TLS 1.3 | **ON** | Performance + security |

### Traffic Flow
```
Browser ──HTTPS──→ Cloudflare Edge ──HTTP:80──→ Azure VM (Nginx)
                   (SSL terminated)              (internal Docker network)
```

The VM never handles SSL certificates. Cloudflare terminates TLS.

---

## 3. Security Settings

### Cloudflare → Security → Settings
- **Browser Integrity Check**: ON
- **Bot Fight Mode**: ON (free plan)
- **Challenge Passage**: 30 minutes

### Cloudflare → Security → WAF (if on Pro+)
- Rate limit `/graphql` to 100 requests/minute per IP
- Block requests from known bad ASNs
- Challenge suspicious traffic

### Recommended Page Rules (free plan gets 3)

| Rule | Setting | Value |
|------|---------|-------|
| `*.varalabs.dev/uploads/*` | Cache Level | Cache Everything |
| `*.varalabs.dev/graphql` | Security Level | High |
| `*.varalabs.dev/*.js` | Cache Level | Cache Everything, Edge TTL 7 days |

---

## 4. Multi-Tenant Subdomain Routing

The ERP uses subdomains for tenant isolation: `school1.varalabs.dev`, `school2.varalabs.dev`, etc.

### How it works:
1. All `*.varalabs.dev` traffic hits the same VM
2. Nginx accepts requests for any `*.varalabs.dev` server name
3. The frontend SPA reads the subdomain from `window.location.hostname`
4. The frontend sends the tenant identifier via headers/cookies to the GraphQL backend
5. The backend resolves the tenant context from the request

### Nginx `server_name` directive:
```nginx
server_name *.varalabs.dev varalabs.dev;
```
This is already configured in `deployment/nginx.conf`.

---

## 5. Mobile App Integration

Mobile apps don't use subdomains. All mobile traffic goes to one API endpoint.

### Approach: Tenant Identification via JWT

1. **Login**: The app sends credentials + school code to `https://varalabs.dev/graphql`
2. **Token Issuance**: Backend embeds `tenant_id` in the JWT payload:
   ```json
   {
     "sub": "user_id_123",
     "tenant_id": "school_uuid_456",
     "role": "student",
     "exp": 1712000000
   }
   ```
3. **Subsequent Requests**: Mobile app includes `Authorization: Bearer <JWT>` on every request
4. **Backend Enforcement**: Middleware extracts `tenant_id` from JWT and scopes all database queries to that tenant

This ensures tenant isolation regardless of whether the request comes from web (subdomain-based) or mobile (JWT-based).

---

## 6. Important Notes

### CORS Configuration
Since all traffic goes through Nginx on the same origin, **CORS is not needed for web requests**. The frontend at `school1.varalabs.dev` calls `/graphql` on the same origin — no cross-origin request.

For mobile apps hitting the API directly, the Rust backend should allow:
```
Access-Control-Allow-Origin: *  (for mobile)
```
Or restrict to your app's custom scheme.

### Cloudflare IP Ranges
The Nginx config includes `set_real_ip_from` directives for Cloudflare's IP ranges. These should be updated periodically from:
- https://www.cloudflare.com/ips-v4
- https://www.cloudflare.com/ips-v6

### Azure NSG
Optionally, restrict port 80/443 inbound traffic to **only** Cloudflare's IP ranges in your Azure Network Security Group. This ensures nobody can bypass Cloudflare by hitting the VM IP directly.
