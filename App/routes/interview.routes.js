const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interview.controller');
const progressController = require('../controllers/progress.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// 1. Получить данные интервью и чек-лист (GET /api/interviews/:id)
router.get('/my', authenticateToken, interviewController.getMyInterviews);
router.get('/:id', authenticateToken, interviewController.getInterviewData);
router.delete('/:id', authenticateToken, interviewController.deleteInterview);

// 2. Назначить встречу (POST /api/interviews/schedule)
router.post('/schedule', authenticateToken, authorizeRole(['Recruiter']), interviewController.scheduleInterview);

// 3. Обновить настройки видимости (PATCH /api/interviews/:id/settings)
router.patch('/:id/settings', authenticateToken, authorizeRole(['Recruiter']), interviewController.updateSettings);

// 4. Обновить прогресс этапа (PATCH /api/interviews/progress/:progressId)
router.patch('/progress/:progressId', authenticateToken, progressController.updateProgressDetail);

module.exports = router;