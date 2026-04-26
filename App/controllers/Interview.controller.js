const { Interview, Application, CheckListTemplate, Vacancy, CandidateProgress } = require('../models');

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
                    include: [CheckListTemplate] // Тянем этапы, созданные при создании вакансии
                }]
            }]
        });

        if (!interview) return res.status(404).json({ message: "Интервью не найдено" });
        
        res.json(interview);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при загрузке данных интервью" });
    }
};

const updateProgress = async (req, res) => {
    const { progressId } = req.params;
    const { is_completed, comment } = req.body;

    try {
        // Находим и обновляем запись в MSSQL через Sequelize
        const [updated] = await CandidateProgress.update(
            { 
                is_completed, 
                comment, 
                updated_at: new Date() 
            },
            { where: { ProgressId: progressId } }
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

module.exports = { updateProgress, getInterviewData, scheduleInterview };