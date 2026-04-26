const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { authenticateToken } = require('../middleware/auth');
const globalTemplateController = require('../controllers/globalTemplate.controller')

// Получить все уникальные названия этапов, которые этот рекрутер использовал ранее
router.get('/templates/my', authenticateToken, templateController.GetMyTemplates);
router.post('/templates/create', authenticateToken, templateController.createTemplate);
router.put('/templates/:id', authenticateToken, templateController.updateTemplate);

router.get('/templates/global', authenticateToken, globalTemplateController.getMyGlobalTemplates);
router.post('/templates/create', authenticateToken, globalTemplateController.createGlobalTemplate);

module.exports = router;