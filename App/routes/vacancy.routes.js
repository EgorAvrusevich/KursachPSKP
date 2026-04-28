const express = require('express');
const router = express.Router();
const vacancyController = require('../controllers/vacancy.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/my-vacancies', authenticateToken, vacancyController.getMyVacancies);
router.get('/by-application/:applicationId', authenticateToken, vacancyController.getVacancyByApplication);
router.get('/:id/candidates', authenticateToken, vacancyController.getVacancyCandidates);
router.get('/:id', vacancyController.getVacancyById);
router.post('/:id/apply', authenticateToken, vacancyController.applyToVacancy);
router.post('/create-with-checklist', authenticateToken, vacancyController.createVacancyWithChecklist);

module.exports = router;