const { Interview, Application, CheckListTemplate, Vacancy, CandidateProgress } = require('../models');
const { publishEvent } = require('../services/mqService');

// 1. Создать встречу (когда рекрутер нажимает "Назначить")
const scheduleInterview = async (req, res) => {
    try {
        const { application_id, scheduled_at } = req.body;

        const interview = await Interview.create({
            application_id,
            scheduled_at,
            status: 'Scheduled',
            meeting_link: `room-${application_id}-${Date.now()}` // Генерируем уникальный ID комнаты
        });

        if (status === 'Принято') {
            await publishEvent('application_accepted', {
                applicationId: id,
                candidateId: app.candidate_id, // Убедись, что это поле есть в app
                recruiterId: req.user.UserId,
                action: 'CREATE_CHAT'
            });
        }

        res.status(201).json(interview);

    } catch (error) {
        res.status(500).json({ message: "Ошибка при назначении интервью" });
    }
};

// 2. Получить данные для страницы интервью (видео + чек-лист)
const getInterviewData = async (req, res) => {
    try {
        const { id } = req.params; // interviewId

        const interview = await Interview.findByPk(id, {
            include: [{
                model: Application,
                include: [{
                    model: Vacancy,
                    include: [CheckListTemplate]
                }]
            },
            { model: CandidateProgress } // ОБЯЗАТЕЛЬНО добавь это включение
            ]
        });

        if (!interview) return res.status(404).json({ message: "Интервью не найдено" });

        res.json(interview);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при загрузке данных интервью" });
    }
};

const updateProgress = async (req, res) => {
    // ВАЖНО: деструктурируем из params именно тот ключ, который указан в роутах
    // Если в роутере написано /progress/:id, то здесь должно быть { id }
    const { progressId } = req.params;
    const { is_completed, comment } = req.body;

    // Защита от undefined и пустых строк
    if (!progressId || progressId === 'undefined') {
        return res.status(400).json({ message: "Progress ID is missing or invalid" });
    }

    try {
        const [updated] = await CandidateProgress.update(
            {
                is_completed,
                comment,
                updated_at: new Date()
            },
            { where: { ProgressId: progressId } } // Убедись, что в БД колонка именно ProgressId
        );

        if (updated) {
            res.json({ message: "Прогресс обновлен" });
        } else {
            res.status(404).json({ message: "Запись не найдена" });
        }
    } catch (error) {
        console.error("Error updating progress:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const { show_comments_to_candidate } = req.body;
        const userId = req.user.id;

        // Находим интервью
        const interview = await Interview.findByPk(id);

        if (!interview) {
            return res.status(404).json({ message: "Интервью не найдено" });
        }

        // Проверка: только рекрутер этой вакансии может менять настройки
        // (Логика зависит от твоей структуры БД, например через Application)
        if (req.user.role !== 'Recruiter') {
            return res.status(403).json({ message: "Нет прав для изменения настроек" });
        }

        // Обновляем настройки
        await interview.update({
            show_comments_to_candidate: show_comments_to_candidate
        });

        res.json({
            message: "Настройки обновлены",
            show_comments_to_candidate: interview.show_comments_to_candidate
        });
    } catch (error) {
        console.error("Ошибка при обновлении настроек интервью:", error);
        res.status(500).json({ message: "Ошибка сервера при обновлении настроек" });
    }
};

module.exports = { updateProgress, getInterviewData, scheduleInterview, updateSettings };