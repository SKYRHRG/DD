const express = require('express');
const crypto = require('crypto');

const router = express.Router();

function hmacToken(payload) {
	const secret = process.env.CSRF_SECRET || 'insecure';
	return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// POST /api/csrf/init - body: { fp }
router.post('/init', express.urlencoded({ extended: false }), (req, res) => {
	const fp = (req.body && req.body.fp) || '';
	if (!fp) return res.status(400).json({ error: 'missing_fp' });
	const token = hmacToken(fp);
	res.json({ token });
});

// Middleware to verify token from form submission
function verifyCsrf(req, res, next) {
	const token = req.body && (req.body.csrf_token || req.body.csrfToken);
	const fp = req.body && (req.body.fp || req.headers['x-client-fp'] || '');
	if (!token) return res.status(403).json({ error: 'missing_csrf' });
	if (!fp) return res.status(403).json({ error: 'missing_fp' });
	const expected = hmacToken(fp);
	if (token !== expected) return res.status(403).json({ error: 'invalid_csrf' });
	return next();
}

module.exports = { router, verifyCsrf, hmacToken };