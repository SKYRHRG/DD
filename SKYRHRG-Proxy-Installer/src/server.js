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
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`;

// Security headers
app.use(helmet());

// CORS
app.use(cors({
	origin: ALLOWED_ORIGIN,
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