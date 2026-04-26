const express = require('express');
const router = express.Router();
const { Interview, Application, Vacancy, CheckListTemplate } = require('../models');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Получить данные интервью и чек-лист для видео-комнаты
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const interview = await Interview.findByPk(req.params.id, {
            include: [{
                model: Application,
                include: [{
                    model: Vacancy,
                    include: [CheckListTemplate] // Подгружаем этапы, созданные в CreateVacancy
                }]
            }]
        });

        if (!interview) {
            return res.status(404).json({ message: "Интервью не найдено" });
        }

        res.json(interview);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка сервера при получении интервью" });
    }
});

// Создать новое интервью (назначить встречу)
router.post('/schedule', authenticateToken, authorizeRole(['Recruiter']), async (req, res) => {
    try {
        const { application_id, scheduled_at } = req.body;
        
        const newInterview = await Interview.create({
            application_id,
            scheduled_at,
            status: 'Scheduled',
            meeting_link: `room-${application_id}-${Date.now()}`
        });

        res.status(201).json(newInterview);
    } catch (error) {
        res.status(500).json({ message: "Не удалось назначить интервью" });
    }
});

module.exports = router;