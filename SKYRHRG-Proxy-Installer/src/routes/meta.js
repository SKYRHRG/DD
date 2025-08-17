const express = require('express');
const { listServers } = require('../services/db');

const router = express.Router();

router.get('/servers', async (req, res, next) => {
	try {
		const servers = await listServers();
		res.json({ servers });
	} catch (err) {
		next(err);
	}
});

module.exports = { router };