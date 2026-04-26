const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Роут для обновления чек-листа (доступен только рекрутеру)
router.patch(
    '/:progressId', 
    authenticateToken, 
    authorizeRole(['Recruiter']),
    progressController.updateProgress
);

module.exports = router;    