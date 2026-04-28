// routes/progress.js
const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');
const { authenticateToken } = require('../middleware/auth');

router.patch('/:id', authenticateToken, progressController.updateProgressDetail);

module.exports = router;