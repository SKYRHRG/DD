const express = require('express');
const { nanoid } = require('nanoid');
const multer = require('multer');
const upload = multer();
const { verifyCsrf } = require('../middleware/csrf');
const { getServerByIp, createServer, createProxy, updateProxyStatus, listProxies } = require('../services/db');
const { installSquidOverSsh } = require('../services/ssh');

const router = express.Router();

// POST /api/proxy/create - form-like body to mirror given frontend
router.post('/create', upload.none(), verifyCsrf, async (req, res, next) => {
	try {
		const { ip, username, password, proxy_user, proxy_pass, port } = req.body;
		if (!ip || !username || !password || !proxy_user || !proxy_pass || !port) {
			return res.status(400).json({ error: 'missing_fields' });
		}

		let server = await getServerByIp(ip);
		if (!server) {
			server = await createServer({ label: null, ip, username, password });
		}

		const proxyUser = proxy_user;
		const proxyPass = proxy_pass;

		const created = await createProxy({ serverId: server.id, port: Number(port), proxyUser, proxyPass, status: 'installing' });

		res.setHeader('Content-Type', 'text/plain; charset=utf-8');
		res.setHeader('Transfer-Encoding', 'chunked');

		res.write('🔁 Connecting to server...\n');

		await installSquidOverSsh({
			host: ip,
			username,
			password,
			port: Number(port),
			proxyUser,
			proxyPass,
			onData: (chunk) => {
				// Stream remote output to client
				try { res.write(chunk.replace(/\u001b\[[0-9;]*m/g, '')); } catch (e) {}
			},
		});

		await updateProxyStatus(created.id, 'active');
		res.write(`\nCOPY::${ip}:${port}:${proxyUser}:${proxyPass}\n`);
		res.end();
	} catch (err) {
		next(err);
	}
});

router.get('/list', async (req, res, next) => {
	try {
		const rows = await listProxies();
		res.json({ proxies: rows });
	} catch (err) {
		next(err);
	}
});

module.exports = { router };