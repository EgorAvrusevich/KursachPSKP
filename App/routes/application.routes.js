const express = require('express');
const router = express.Router();
const ApplicationController = require('../controllers/application.controller');
const { authenticateToken } = require('../middleware/auth');

// Получить все уникальные названия этапов, которые этот рекрутер использовал ранее
router.get('/my', authenticateToken, ApplicationController.getMyApplications);
router.get('/:id/checklist', authenticateToken, ApplicationController.getApplicationChecklist);
router.patch('/:id/status', authenticateToken, ApplicationController.updateApplicationStatus)
router.get('/:applicationId', authenticateToken, ApplicationController.openChat);
router.post('/:id', authenticateToken, ApplicationController.createApplication);

module.exports = router;