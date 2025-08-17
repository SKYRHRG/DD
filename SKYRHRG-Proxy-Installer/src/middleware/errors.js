function notFoundHandler(req, res, next) {
	res.status(404).json({ error: 'not_found' });
}

function errorHandler(err, req, res, next) {
	console.error(err);
	if (res.headersSent) return;
	res.status(err.status || 500).json({ error: err.code || 'server_error', message: err.message });
}

module.exports = { notFoundHandler, errorHandler };