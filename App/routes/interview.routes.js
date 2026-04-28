const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interview.controller'); // Импортируем контроллер
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// 1. Получить данные интервью и чек-лист (GET /api/interviews/:id)
router.get('/:id', authenticateToken, interviewController.getInterviewData);

// 2. Назначить встречу (POST /api/interviews/schedule)
router.post('/schedule', authenticateToken, authorizeRole(['Recruiter']), interviewController.scheduleInterview);

// 3. Обновить настройки видимости (PATCH /api/interviews/:id/settings)
// Исправляет 404 при клике на "глаз"
router.patch('/:id/settings', authenticateToken, authorizeRole(['Recruiter']), interviewController.updateSettings);

// 4. Обновить прогресс этапа (PATCH /api/interviews/progress/:progressId)
// Исправляет 404/500 при сохранении комментариев или галочек
router.patch('/progress/:progressId', authenticateToken, interviewController.updateProgress);

module.exports = router;