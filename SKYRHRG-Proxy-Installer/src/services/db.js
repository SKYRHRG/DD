const mysql = require('mysql2/promise');

let pool;

function getPool() {
	if (!pool) throw new Error('DB not initialized');
	return pool;
}

async function initializeDatabase() {
	const host = process.env.MYSQL_HOST || 'localhost';
	const port = Number(process.env.MYSQL_PORT || 3306);
	const user = process.env.MYSQL_USER || 'root';
	const password = process.env.MYSQL_PASSWORD || '';
	const database = process.env.MYSQL_DATABASE || 'skyrhrg_proxy';

	pool = mysql.createPool({
		host,
		port,
		user,
		password,
		database,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
	});

	// Create tables if not exist
	await pool.execute(`CREATE TABLE IF NOT EXISTS servers (
		id INT AUTO_INCREMENT PRIMARY KEY,
		label VARCHAR(255) NULL,
		ip VARCHAR(255) NOT NULL,
		username VARCHAR(255) NOT NULL,
		password VARCHAR(255) NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		INDEX (ip)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

	await pool.execute(`CREATE TABLE IF NOT EXISTS proxies (
		id INT AUTO_INCREMENT PRIMARY KEY,
		server_id INT NOT NULL,
		port INT NOT NULL,
		proxy_user VARCHAR(255) NOT NULL,
		proxy_pass VARCHAR(255) NOT NULL,
		status VARCHAR(64) NOT NULL DEFAULT 'created',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE KEY uniq_proxy (server_id, port, proxy_user),
		CONSTRAINT fk_proxy_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function createServer({ label, ip, username, password }) {
	const [result] = await getPool().execute(
		`INSERT INTO servers (label, ip, username, password) VALUES (?, ?, ?, ?)`,
		[label || null, ip, username, password]
	);
	return { id: result.insertId, label, ip, username };
}

async function getServerByIp(ip) {
	const [rows] = await getPool().execute(`SELECT * FROM servers WHERE ip = ? LIMIT 1`, [ip]);
	return rows[0] || null;
}

async function listServers() {
	const [rows] = await getPool().execute(`SELECT id, label, ip, username, created_at FROM servers ORDER BY created_at DESC`);
	return rows;
}

async function createProxy({ serverId, port, proxyUser, proxyPass, status }) {
	const [result] = await getPool().execute(
		`INSERT INTO proxies (server_id, port, proxy_user, proxy_pass, status) VALUES (?, ?, ?, ?, ?)`,
		[serverId, port, proxyUser, proxyPass, status || 'created']
	);
	return { id: result.insertId, serverId, port, proxyUser, proxyPass, status: status || 'created' };
}

async function updateProxyStatus(id, status) {
	const [result] = await getPool().execute(`UPDATE proxies SET status = ? WHERE id = ?`, [status, id]);
	return result.affectedRows > 0;
}

async function listProxies() {
	const [rows] = await getPool().execute(
		`SELECT p.id, s.ip, p.port, p.proxy_user AS proxyUser, p.proxy_pass AS proxyPass, p.status, p.created_at AS createdAt
		 FROM proxies p INNER JOIN servers s ON s.id = p.server_id ORDER BY p.created_at DESC`
	);
	return rows;
}

module.exports = {
	initializeDatabase,
	createServer,
	getServerByIp,
	listServers,
	createProxy,
	updateProxyStatus,
	listProxies,
	getPool,
};