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
# If serving the UI through Apache/Nginx on http://localhost, also set:
# ALLOWED_ORIGIN=http://localhost,http://localhost:3000
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

If you host the static UI at http://localhost (port 80) behind Apache, point the form to the Node API at http://localhost:3000 or reverse-proxy /api/* to the Node server.

## API
- POST `/api/csrf/init` form: `fp` -> `{ token }`
- POST `/api/proxy/create` form: `ip, username, password, proxy_user, proxy_pass, port, csrf_token, fp` -> streamed text with `COPY::` line
- GET `/api/proxy/list` -> `{ proxies: [...] }`

## Troubleshooting
- 404 at `http://localhost/api/csrf/init`:
  - Ensure you are calling the Node server host/port (default `http://localhost:3000/api/csrf/init`).
  - If you must call `/api/*` on port 80, configure your web server to reverse-proxy `/api/` to the Node server.
- CORS blocked when serving UI from `http://localhost` and API on `http://localhost:3000`:
  - Set `ALLOWED_ORIGIN=http://localhost,http://localhost:3000` in `.env` and restart the Node server.
- CSRF `missing_csrf`:
  - Ensure the browser first calls `/api/csrf/init` and sets the hidden input value to the returned token. Our UI already does this automatically.

## Notes
- The installer script targets Debian/Ubuntu/CentOS families and configures Squid with basic auth using NCSA.
- Database stores servers and created proxies, updating status after successful installation.