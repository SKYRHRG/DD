const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'proxy.sqlite');

let db;

function getDb() {
	if (!db) throw new Error('DB not initialized');
	return db;
}

function initializeDatabase() {
	const dir = path.dirname(DATABASE_PATH);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	return new Promise((resolve, reject) => {
		db = new sqlite3.Database(DATABASE_PATH, (err) => {
			if (err) return reject(err);
			db.serialize(() => {
				db.run(`CREATE TABLE IF NOT EXISTS servers (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					label TEXT,
					ip TEXT NOT NULL,
					username TEXT NOT NULL,
					password TEXT NOT NULL,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP
				)`);

				db.run(`CREATE TABLE IF NOT EXISTS proxies (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					server_id INTEGER NOT NULL,
					port INTEGER NOT NULL,
					proxy_user TEXT NOT NULL,
					proxy_pass TEXT NOT NULL,
					status TEXT NOT NULL DEFAULT 'created',
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					UNIQUE(server_id, port, proxy_user),
					FOREIGN KEY(server_id) REFERENCES servers(id) ON DELETE CASCADE
				)`);
				resolve();
			});
		});
	});
}

function createServer({ label, ip, username, password }) {
	return new Promise((resolve, reject) => {
		getDb().run(
			`INSERT INTO servers (label, ip, username, password) VALUES (?, ?, ?, ?)`,
			[label || null, ip, username, password],
			function (err) {
				if (err) return reject(err);
				resolve({ id: this.lastID, label, ip, username });
			}
		);
	});
}

function getServerByIp(ip) {
	return new Promise((resolve, reject) => {
		getDb().get(`SELECT * FROM servers WHERE ip = ?`, [ip], (err, row) => {
			if (err) return reject(err);
			resolve(row || null);
		});
	});
}

function listServers() {
	return new Promise((resolve, reject) => {
		getDb().all(`SELECT id, label, ip, username, created_at FROM servers ORDER BY created_at DESC`, [], (err, rows) => {
			if (err) return reject(err);
			resolve(rows);
		});
	});
}

function createProxy({ serverId, port, proxyUser, proxyPass, status }) {
	return new Promise((resolve, reject) => {
		getDb().run(
			`INSERT INTO proxies (server_id, port, proxy_user, proxy_pass, status) VALUES (?, ?, ?, ?, ?)`,
			[serverId, port, proxyUser, proxyPass, status || 'created'],
			function (err) {
				if (err) return reject(err);
				resolve({ id: this.lastID, serverId, port, proxyUser, proxyPass, status: status || 'created' });
			}
		);
	});
}

function updateProxyStatus(id, status) {
	return new Promise((resolve, reject) => {
		getDb().run(`UPDATE proxies SET status = ? WHERE id = ?`, [status, id], function (err) {
			if (err) return reject(err);
			resolve(this.changes > 0);
		});
	});
}

function listProxies() {
	return new Promise((resolve, reject) => {
		getDb().all(
			`SELECT p.id, s.ip, p.port, p.proxy_user AS proxyUser, p.proxy_pass AS proxyPass, p.status, p.created_at AS createdAt
			 FROM proxies p INNER JOIN servers s ON s.id = p.server_id ORDER BY p.created_at DESC`,
			[],
			(err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			}
		);
	});
}

module.exports = {
	initializeDatabase,
	createServer,
	getServerByIp,
	listServers,
	createProxy,
	updateProxyStatus,
	listProxies,
	getDb,
};