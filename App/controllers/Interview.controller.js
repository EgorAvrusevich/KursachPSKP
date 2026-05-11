const { Interview, User, Profile, Application, Vacancy, CheckListTemplate, CandidateProgress, Chat, ChatMessage, sequelize } = require('../models');
const { publishEvent } = require('../services/mqService');

const scheduleInterview = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { application_id, scheduled_at } = req.body;
        const recruiterId = req.user.UserId || req.user.id;

        // 1. Проверяем существование отклика
        const app = await Application.findByPk(application_id, { transaction: t });
        if (!app) {
            await t.rollback();
            return res.status(404).json({ message: "Отклик не найден" });
        }

        // 2. Создаем запись об интервью
        const meetingRoomId = `room-${application_id}-${Date.now()}`;
        const interview = await Interview.create({
            application_id,
            scheduled_at,
            status: 'Scheduled',
            meeting_link: meetingRoomId,
            show_comments_to_candidate: false // по умолчанию скрыто
        }, { transaction: t });

        // 3. Работа с чатом: находим или создаем чат для уведомления
        let chat = await Chat.findOne({
            where: { application_id },
            transaction: t
        });

        // Если чата почему-то нет (хотя он создается при принятии), создаем его
        if (!chat) {
            chat = await Chat.create({ application_id }, { transaction: t });
        }

        // 4. Формируем текст уведомления с ссылкой
        const dateStr = new Date(scheduled_at).toLocaleString('ru-RU');
        const meetingUrl = `/interview/${interview.InterviewId}`; // Ссылка на фронтенд-комнату
        const messageText = `📅 Назначено интервью!\nДата: ${dateStr}\nПрисоединиться к видеовстрече: ${meetingUrl}`;

        // 5. Сохраняем системное сообщение в БД
        await ChatMessage.create({
            chat_id: chat.ChatId || chat.id,
            sender_id: recruiterId,
            message_text: messageText,
            is_system: true,
            sent_at: new Date()
        }, { transaction: t });

        // 6. Отправляем событие в RabbitMQ для Real-time уведомления через Socket.io
        await publishEvent('interview_scheduled', {
            applicationId: application_id,
            chatId: chat.ChatId || chat.id,
            interviewId: interview.InterviewId,
            candidateId: app.candidate_id,
            recruiterId: recruiterId,
            meetingUrl: meetingUrl,
            message: messageText
        });

        await t.commit();

        // 7. Возвращаем данные. Фронтенд, получив ответ, сделает navigate(`/interview/${interview.id}`)
        res.status(201).json({
            message: "Интервью успешно назначено",
            interviewId: interview.InterviewId,
            redirectUrl: meetingUrl
        });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка при назначении интервью:", error);
        res.status(500).json({ message: "Ошибка сервера при назначении интервью" });
    }
};

const getInterviewData = async (req, res) => {
    try {
        const { id } = req.params;

        const interview = await Interview.findByPk(id, {
            include: [
                {
                    model: Application,
                    include: [
                        {
                            model: Vacancy,
                            include: [CheckListTemplate]
                        },
                        {
                            model: CandidateProgress,
                            include: [{
                                model: CheckListTemplate,
                                // УДАЛИТЕ 'name' ОТСЮДА, оставьте только то, что реально есть в БД
                                attributes: ['stage_name']
                            }]
                        }
                    ]
                }
            ]
        });

        if (!interview) return res.status(404).json({ message: "Интервью не найдено" });
        res.json(interview);
    } catch (error) {
        console.error("Ошибка API:", error);
        res.status(500).json({ message: "Ошибка сервера", error: error.message });
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

const getMyInterviews = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let whereCondition = {};

        // Формируем условие поиска в зависимости от роли
        if (userRole === 'Recruiter') {
            // Рекрутер видит интервью, где он является владельцем вакансии
            whereCondition = { '$Application.Vacancy.recruiter_id$': userId };
        } else if (userRole === 'Candidate') {
            // Кандидат видит интервью, привязанные к его заявкам
            whereCondition = { '$Application.candidate_id$': userId };
        }

        const interviews = await Interview.findAll({
            include: [
                {
                    model: Application,
                    required: true,
                    include: [
                        {
                            model: Vacancy,
                            attributes: ['VacancyId', 'title', 'recruiter_id']
                        },
                        {
                            model: User,
                            as: 'Candidate',
                            attributes: ['UserId', 'email'],
                            include: [{
                                model: Profile,
                                attributes: ['full_name']
                            }]
                        }
                    ]
                }
            ],
            where: whereCondition,
            order: [['scheduled_at', 'DESC']] // Сначала новые/будущие
        });

        res.json(interviews);
    } catch (error) {
        console.error('Ошибка при получении списка интервью:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении интервью' });
    }
};

const deleteInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const interview = await Interview.findByPk(id, {
            include: [{ model: Application, include: [Vacancy] }]
        });

        if (!interview) return res.status(404).json({ message: 'Интервью не найдено' });

        const rawDate = new Date(interview.scheduled_at);

        // 2. Исправляем смещение: вычитаем разницу часового пояса (в минутах)
        // Это уберет лишние 3 часа, которые набрасывает браузер
        const scheduledDate = new Date(rawDate.getTime() + (rawDate.getTimezoneOffset() * 60000));

        const isFuture = scheduledDate > new Date();

        // Если интервью в будущем, отправляем уведомление в чат
        if (isFuture) {
            // Находим чат для этого отклика, чтобы получить chat_id
            const chat = await Chat.findOne({ where: { application_id: interview.application_id } });

            if (chat) {
                // Используем ChatMessage (как в импорте сверху) вместо Message
                await ChatMessage.create({
                    chat_id: chat.ChatId || chat.id, // Убедитесь в правильности ключа
                    sender_id: userId,
                    message_text: `⚠️ Интервью, назначенное на ${new Date(interview.scheduled_at).toLocaleString('ru-RU')}, было отменено.`,
                    is_system: true,
                    sent_at: new Date()
                });
            }
        }

        await interview.destroy();
        res.json({ message: 'Интервью удалено' });
    } catch (error) {
        // Обязательно добавьте лог, чтобы видеть ошибки в будущем
        console.error("Ошибка при удалении интервью:", error);
        res.status(500).json({ message: 'Ошибка при удалении' });
    }
};

module.exports = { getInterviewData, scheduleInterview, updateSettings, getMyInterviews, deleteInterview };