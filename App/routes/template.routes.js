const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { authenticateToken } = require('../middleware/auth');
const globalTemplateController = require('../controllers/globalTemplate.controller')

// Получить все уникальные названия этапов, которые этот рекрутер использовал ранее
router.get('/my', authenticateToken, templateController.GetMyTemplates);
router.post('/create-old', authenticateToken, templateController.createTemplate);
router.put('/:id', authenticateToken, templateController.updateTemplate);

router.get('/global/:id', authenticateToken, globalTemplateController.getGlobalTemplateById);
router.put('/global/:id', authenticateToken, globalTemplateController.updateGlobalTemplate);
router.get('/global', authenticateToken, globalTemplateController.getMyGlobalTemplates);
router.post('/create', authenticateToken, globalTemplateController.createGlobalTemplate);

module.exports = router;