# SKYRHRG Proxy Installer

A full-stack proxy installer inspired by ServerOk Squid installer, with a clean UI, API, MySQL database, and SSH-driven provisioning.

## Stack
- Front-end: Vanilla HTML, Bootstrap 5
- Back-end: Node.js (Express), Helmet, CORS, Rate limiting
- SSH: ssh2
- DB: MySQL (mysql2/promise)
- CSRF: HMAC-based token bound to a simple client fingerprint

## Quickstart (Local)
1. Copy env example and update values
```bash
cp .env.example .env
# If serving the UI through Apache/Nginx on http://localhost, also set:
# ALLOWED_ORIGIN=http://localhost,http://localhost:3000
# Configure MySQL connection accordingly
```
2. Create database and user in MySQL (example)
```sql
CREATE DATABASE skyrhrg_proxy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'skyrhrg'@'%' IDENTIFIED BY 'change_me_mysql_password';
GRANT ALL PRIVILEGES ON skyrhrg_proxy.* TO 'skyrhrg'@'%';
FLUSH PRIVILEGES;
```
3. Install deps and run
```bash
npm i
npm run dev
```
Open http://localhost:3000

## Production
- Public URL: https://proxy.skyrhrgts.com/
- Set in `.env`:
```env
NODE_ENV=production
ALLOWED_ORIGIN=https://proxy.skyrhrgts.com
```
- Run Node behind your reverse proxy (Nginx/Apache) and proxy `/api/` and static files to the Node app on the internal port (`PORT`, default 3000). The app auto-redirects HTTP to HTTPS when `NODE_ENV=production` and `trust proxy` is enabled.

### Nginx example
```
server {
    listen 443 ssl;
    server_name proxy.skyrhrgts.com;

    location / {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## API
- POST `/api/csrf/init` form: `fp` -> `{ token }`
- POST `/api/proxy/create` form-data: `ip, username, password, proxy_user, proxy_pass, port, csrf_token, fp` -> streamed text with `COPY::` line
- GET `/api/proxy/list` -> `{ proxies: [...] }`

## Troubleshooting
- 404 at `/api/csrf/init` on port 80:
  - Point to Node API (`https://proxy.skyrhrgts.com/api/csrf/init`) or proxy `/api/` to Node.
- CORS blocked across origins:
  - Set `ALLOWED_ORIGIN=https://proxy.skyrhrgts.com,http://localhost:3000`.
- CSRF `missing_csrf`:
  - Ensure the UI first calls `/api/csrf/init` and populates the hidden field.

## Notes
- The installer script targets Debian/Ubuntu/CentOS families and configures Squid with basic auth using NCSA.
- Database stores servers and created proxies, updating status after successful installation.