# SKYRHRG Proxy Installer

A full-stack proxy installer inspired by ServerOk Squid installer, with a clean UI, API, SQLite database, and SSH-driven provisioning.

## Stack
- Front-end: Vanilla HTML, Bootstrap 5
- Back-end: Node.js (Express), Helmet, CORS, Rate limiting
- SSH: ssh2
- DB: SQLite (sqlite3)
- CSRF: HMAC-based token bound to a simple client fingerprint

## Quickstart
1. Copy env example and update values
```bash
cp .env.example .env
```
2. Install deps
```bash
npm i
```
3. Run
```bash
npm run dev
```
Then open http://localhost:3000

## API
- POST `/api/csrf/init` form: `fp` -> `{ token }`
- POST `/api/proxy/create` form: `ip, username, password, proxy_user, proxy_pass, port, csrf_token, fp` -> streamed text with `COPY::` line
- GET `/api/proxy/list` -> `{ proxies: [...] }`

## Notes
- The installer script targets Debian/Ubuntu/CentOS families and configures Squid with basic auth using NCSA.
- Database stores servers and created proxies, updating status after successful installation.