const express = require('express');
const router = express.Router();
const SavedVacancyController = require('../controllers/savedVacancy.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, SavedVacancyController.getSavedVacancies);
router.post('/:vacancyId', authenticateToken, SavedVacancyController.saveVacancy);
router.delete('/:id', authenticateToken, SavedVacancyController.unsaveVacancy);

module.exports = router;