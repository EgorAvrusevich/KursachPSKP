const { Application, Profile, Vacancy, CheckListTemplate, CandidateProgress, User, Chat, ChatMessage, sequelize } = require('../models');
const { publishEvent } = require('../services/mqService');

// 1. Получить мои отклики (для кандидата)
const getMyApplications = async (req, res) => {
    try {
        // Проверяем, как именно называется поле в твоем токене (id или UserId)
        const userId = req.user.UserId || req.user.id;

        if (!userId) {
            return res.status(401).json({ message: "Пользователь не авторизован" });
        }

        const apps = await Application.findAll({
            where: { candidate_id: userId },
            include: [
                {
                    model: Vacancy,
                    include: [
                        { model: CheckListTemplate },
                        // ДОБАВЬТЕ ЭТО:
                        {
                            model: Profile,
                            // убедитесь, что имя модели совпадает с тем, что в selectedApp.Vacancy?.RecruiterProfile
                            as: 'RecruiterProfile'
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(apps);
    } catch (error) {
        // КРИТИЧНО: Выведи ошибку в консоль сервера, чтобы увидеть, на какое поле он ругается
        console.error("ПОЛНАЯ ОШИБКА getMyApplications:", error);
        res.status(500).json({
            message: "Ошибка сервера",
            error: error.message // Временно выводим текст ошибки для отладки
        });
    }
};

// 2. Создать новый отклик
const createApplication = async (req, res) => {
    try {
        const { vacancyId } = req.body;
        const userId = req.user.id;

        const existingApp = await Application.findOne({
            where: { candidate_id: userId, vacancy_id: vacancyId }
        });

        if (existingApp) {
            return res.status(400).json({ message: "Вы уже откликнулись" });
        }

        const application = await Application.create({
            candidate_id: userId,
            vacancy_id: vacancyId,
            status: 'На рассмотрении'
        });

        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ message: "Ошибка создания отклика" });
    }
};

// 3. Обновить статус (Рекрутер) + RabbitMQ
const updateApplicationStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { status } = req.body;

        const app = await Application.findByPk(id, {
            include: [Vacancy],
            transaction: t
        });

        if (!app) {
            await t.rollback();
            return res.status(404).json({ message: "Отклик не найден" });
        }

        // Создаем прогресс и чат, если статус стал 'Принято' или 'На рассмотрении'
        const activeStatuses = ['Принято', 'На рассмотрении'];

        if (activeStatuses.includes(status)) {
            const existingProgress = await CandidateProgress.findOne({
                where: { application_id: id },
                transaction: t
            });

            // Если записей в прогрессе еще нет — создаем их из шаблона
            if (!existingProgress) {
                const templates = await CheckListTemplate.findAll({
                    where: { vacancy_id: app.vacancy_id },
                    transaction: t
                });

                if (templates.length > 0) {
                    const progress = templates.map(temp => ({
                        application_id: id,
                        template_id: temp.TemplateId,
                        is_completed: false
                    }));
                    await CandidateProgress.bulkCreate(progress, { transaction: t });
                }
            }

            // Создаем чат, если его еще нет
            const existingChat = await Chat.findOne({
                where: { application_id: id },
                transaction: t
            });
            if (!existingChat) {
                await Chat.create({ application_id: id }, { transaction: t });
            }

            // RabbitMQ публикуем только при финальном принятии
            if (status === 'Принято' && app.status !== 'Принято') {
                const recruiterId = req.user.UserId || req.user.id;
                await publishEvent('application_accepted', {
                    applicationId: app.ApplicationId,
                    candidateId: app.candidate_id,
                    recruiterId: recruiterId
                });
            }
        }

        await app.update({ status }, { transaction: t });
        await t.commit();

        res.json({ message: "Статус обновлен", status });
    } catch (error) {
        if (t) await t.rollback();
        console.error(error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 4. Получить отклики на конкретную вакансию (для Рекрутера)
const getApplicationsByVacancy = async (req, res) => {
    try {
        const { vacancyId } = req.params;

        const apps = await Application.findAll({
            // У тебя в модели поле называется vacancy_id (судя по ассоциациям)
            where: { vacancy_id: vacancyId },
            include: [
                {
                    model: User,
                    as: 'Candidate', // В ассоциациях ты указал as: 'Candidate'
                    attributes: ['UserId', 'email'], // В модели User первичный ключ UserId
                    include: [Profile] // Чтобы на фронте работало app.Candidate.Profile.full_name
                }
            ]
        });

        res.json(apps);
    } catch (error) {
        console.error("Ошибка получения откликов по вакансии:", error);
        res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
};

// 5. Удалить отклик
const deleteApplication = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Используем applicationId — это маршруты передают PK заявки
        const app = await Application.findOne({
            where: { id: id, candidate_id: userId }
        });

        if (!app) {
            await t.rollback();
            return res.status(404).json({ message: "Отклик не найден" });
        }

        await app.destroy({ transaction: t });
        await t.commit();

        res.json({ message: "Отклик успешно удален" });
    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка удаления отклика:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

const createChat = async (req, res) => {
    try {
        const { applicationId } = req.params;

        const app = await Application.findByPk(applicationId);
        if (!app) return res.status(404).json({ message: "Отклик не найден" });

        const [chat] = await Chat.findOrCreate({
            where: { application_id: applicationId },
            defaults: { application_id: applicationId }
        });

        if (chat._options?.isNewRecord === false) {
            return res.json({ message: "Чат уже существует", ChatId: chat.ChatId, alreadyExisted: true });
        }

        await ChatMessage.create({
            chat_id: chat.ChatId,
            sender_id: req.user.UserId || req.user.id,
            message_text: "Чат создан. Начните общение!",
            is_system: true
        });

        res.status(201).json({ message: "Чат создан", ChatId: chat.ChatId });
    } catch (err) {
        console.error("Ошибка в createChat:", err);
        res.status(500).json({ error: err.message });
    }
};

const openChat = async (req, res) => {
    try {
        const { applicationId } = req.params;

        const chat = await Chat.findOne({
            where: { application_id: applicationId },
            include: [{
                model: ChatMessage,
                // Сортировку пишем прямо здесь, это надежнее для MSSQL в Sequelize
                separate: true,
                order: [['sent_at', 'ASC']]
            }]
        });

        if (!chat) return res.status(404).json({ message: "Чат еще не создан" });
        res.json(chat);
    } catch (err) {
        console.error("Ошибка в openChat:", err);
        res.status(500).json({ error: err.message });
    }
};

const getApplicationChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.UserId || req.user.id;

        const app = await Application.findByPk(id, {
            include: [{ model: Vacancy }]
        });

        if (!app) return res.status(404).json({ message: "Отклик не найден" });

        const isCandidate = Number(app.candidate_id) === Number(userId);
        const isRecruiter = Number(app.Vacancy?.recruiter_id) === Number(userId);

        if (!isCandidate && !isRecruiter) {
            return res.status(403).json({ message: "Нет доступа к этому чек-листу" });
        }

        const currentStatus = app.status.trim();
        const allowedStatuses = ['Принято', 'На рассмотрении', 'Рассмотрение', 'Новый'];

        if (!allowedStatuses.includes(currentStatus)) {
            return res.status(403).json({ message: "Чек-лист доступен только на этапах рассмотрения или принятия" });
        }

        const checklist = await CandidateProgress.findAll({
            where: { application_id: id },
            include: [{
                model: CheckListTemplate,
                required: true,
                attributes: ['stage_name', 'order_index']
            }],
            order: [[CheckListTemplate, 'order_index', 'ASC']]
        });

        const formattedChecklist = checklist.map(item => ({
            id: item.ProgressId || item.id,
            title: item.CheckListTemplate?.stage_name || "Без названия",
            comment: item.recruiter_comment || item.comment || '',
            description: "Этап процесса найма",
            is_completed: item.is_completed,
            order: item.CheckListTemplate?.order_index
        }));

        res.json(formattedChecklist);
    } catch (error) {
        console.error("Ошибка получения чек-листа:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

module.exports = {
    getMyApplications,
    createApplication,
    updateApplicationStatus,
    getApplicationsByVacancy,
    deleteApplication,
    openChat,
    createChat,
    getApplicationChecklist
};