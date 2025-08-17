require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { initializeDatabase } = require('./services/db');
const csrfMiddleware = require('./middleware/csrf');
const { errorHandler, notFoundHandler } = require('./middleware/errors');

const proxyRoutes = require('./routes/proxy');
const metaRoutes = require('./routes/meta');

const app = express();

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN_ENV = process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`;
const ALLOWED_ORIGINS = ALLOWED_ORIGIN_ENV.split(',').map(s => s.trim()).filter(Boolean);

// Security headers (allow inline scripts/styles for our simple static page)
app.use(helmet({
	contentSecurityPolicy: {
		useDefaults: true,
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			styleSrc: ["'self'", "https:", "'unsafe-inline'"],
			fontSrc: ["'self'", "https:", "data:"],
			imgSrc: ["'self'", "data:"],
			objectSrc: ["'none'"],
			upgradeInsecureRequests: null,
		},
	},
	hsts: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS (allow comma-separated origins)
app.use(cors({
	origin: function (origin, callback) {
		if (!origin) return callback(null, true);
		if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
		return callback(new Error('Not allowed by CORS: ' + origin));
	},
	credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
	windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
	max: Number(process.env.RATE_LIMIT_MAX || 60),
	standardHeaders: true,
	legacyHeaders: false,
});
app.use('/api/', limiter);

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health
app.get('/health', (req, res) => {
	res.json({ ok: true });
});

// CSRF init and verification endpoints similar to the provided page
app.use('/api/csrf', csrfMiddleware.router);

// API routes
app.use('/api/proxy', proxyRoutes.router);
app.use('/api/meta', metaRoutes.router);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

initializeDatabase()
	.then(() => {
		app.listen(PORT, () => {
			console.log(`SKYRHRG Proxy Installer listening on http://localhost:${PORT}`);
		});
	})
	.catch((err) => {
		console.error('Failed to initialize database', err);
		process.exit(1);
	});