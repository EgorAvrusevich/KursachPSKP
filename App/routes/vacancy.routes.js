const express = require('express');
const router = express.Router();
const vacancyController = require('../controllers/vacancy.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/:id', vacancyController.getVacancyById);
router.post('/:id/apply', authenticateToken, vacancyController.applyToVacancy);

module.exports = router;