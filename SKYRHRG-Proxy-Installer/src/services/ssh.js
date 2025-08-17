const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

function runSshCommand({ host, username, password, command, onData }) {
	return new Promise((resolve, reject) => {
		const conn = new Client();
		let stdout = '';
		let stderr = '';
		conn
			.on('ready', () => {
				conn.exec(command, { pty: true }, (err, stream) => {
					if (err) {
						conn.end();
						return reject(err);
					}
					stream
						.on('close', (code, signal) => {
							conn.end();
							resolve({ code, signal, stdout, stderr });
						})
						.on('data', (data) => {
							stdout += data.toString();
							if (onData) onData(data.toString());
						})
						.stderr.on('data', (data) => {
							stderr += data.toString();
							if (onData) onData(data.toString());
						});
				});
			})
			.on('error', (err) => reject(err))
			.connect({ host, username, password, tryKeyboard: false, readyTimeout: 15000 });
	});
}

function buildSquidInstallScript({ ip, port, proxyUser, proxyPass }) {
	// Inspired by serverok/squid-proxy-installer with basic user/pass auth
	// Non-interactive minimal installer for Debian/Ubuntu/CentOS like systems
	return `#!/usr/bin/env bash
set -e
export DEBIAN_FRONTEND=noninteractive

if command -v apt-get >/dev/null 2>&1; then
	apt-get update -y && apt-get install -y squid apache2-utils >/dev/null 2>&1 || apt-get install -y squid >/dev/null 2>&1
elif command -v yum >/dev/null 2>&1; then
	yum install -y squid httpd-tools >/dev/null 2>&1 || yum install -y squid >/dev/null 2>&1
elif command -v dnf >/dev/null 2>&1; then
	dnf install -y squid httpd-tools >/dev/null 2>&1 || dnf install -y squid >/dev/null 2>&1
fi

SQUID_CONF="/etc/squid/squid.conf"
HTPASSWD_FILE="/etc/squid/passwd"

# Backup existing config
if [ -f "$SQUID_CONF" ]; then
	cp "$SQUID_CONF" "/etc/squid/squid.conf.bak.$(date +%s)" || true
fi

# Create user for basic auth
if command -v htpasswd >/dev/null 2>&1; then
	if [ ! -f "$HTPASSWD_FILE" ]; then
		install -m 640 -o proxy -g proxy /dev/null "$HTPASSWD_FILE"
	fi
	echo "${proxyPass}" | htpasswd -i -b "$HTPASSWD_FILE" "${proxyUser}" >/dev/null 2>&1 || true
else
	# Fallback if htpasswd not installed
	echo "${proxyUser}:$(openssl passwd -apr1 ${proxyPass})" > "$HTPASSWD_FILE"
	chown proxy:proxy "$HTPASSWD_FILE" && chmod 640 "$HTPASSWD_FILE"
fi

cat > "$SQUID_CONF" <<EOF
http_port ${port}
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic realm proxy
acl authenticated proxy_auth REQUIRED
acl Safe_ports port 80 443 21 70 210 280 488 591 777 1025-65535
http_access allow authenticated
http_access deny all
coredump_dir /var/spool/squid
cache deny all
EOF

systemctl enable squid >/dev/null 2>&1 || true
systemctl restart squid >/dev/null 2>&1 || service squid restart >/dev/null 2>&1 || service squid3 restart >/dev/null 2>&1

echo "COPY::${ip}:${port}:${proxyUser}:${proxyPass}"
`;
}

function installSquidOverSsh({ host, username, password, port, proxyUser, proxyPass, onData }) {
	const script = buildSquidInstallScript({ ip: host, port, proxyUser, proxyPass });
	const command = `bash -s <<'EOS'\n${script}\nEOS`;
	return runSshCommand({ host, username, password, command, onData });
}

module.exports = { runSshCommand, installSquidOverSsh, buildSquidInstallScript };