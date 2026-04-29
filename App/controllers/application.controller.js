const { Application, Vacancy, CheckListTemplate, CandidateProgress, User, Chat, ChatMessage, sequelize } = require('../models');
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
                    // Если связи CheckListTemplate нет напрямую в Vacancy, 
                    // убедись, что она прописана в моделях
                    include: [CheckListTemplate]
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
        const userId = req.user.UserId;

        const existingApp = await Application.findOne({
            where: { candidate_id: userId, vacancy_id: vacancyId } // ИСПРАВЛЕНО
        });

        if (existingApp) {
            return res.status(400).json({ message: "Вы уже откликнулись" });
        }

        const application = await Application.create({
            candidate_id: userId, // ИСПРАВЛЕНО
            vacancy_id: vacancyId, // ИСПРАВЛЕНО
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

        // Если принимаем — готовим прогресс
        if (status === 'Принято' && app.status !== 'Принято') {
            // 1. Проверяем, не создавали ли мы уже прогресс для этого отклика
            const existingProgress = await CandidateProgress.findOne({
                where: { application_id: id },
                transaction: t
            });

            if (!existingProgress) {
                const templates = await CheckListTemplate.findAll({
                    where: { vacancy_id: app.vacancy_id },
                    transaction: t
                });

                if (templates.length > 0) {
                    const progress = templates.map(temp => ({
                        application_id: id,
                        template_id: temp.TemplateId,
                        // Убираем stage_name и order_index, если решили брать их из шаблона через JOIN
                        is_completed: false
                    }));
                    await CandidateProgress.bulkCreate(progress, { transaction: t });
                }
            }

            // 2. Логика RabbitMQ (событие публикуем всегда при смене на "Принято")
            const recruiterId = req.user.UserId || req.user.id || req.user.sub;
            await publishEvent('application_accepted', {
                applicationId: app.ApplicationId,
                candidateId: app.candidate_id,
                recruiterId: recruiterId
            });
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
            where: { VacancyId: vacancyId },
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'email'] // Не тянем пароли и лишнее
                }
            ]
        });

        res.json(apps);
    } catch (error) {
        console.error("Ошибка получения откликов по вакансии:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 5. Удалить отклик
const deleteApplication = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const app = await Application.findOne({
            where: { id: id, UserId: userId }
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
        const { id } = req.params; // ID отклика
        const userId = req.user.UserId || req.user.id;

        // 1. Находим отклик с базовой проверкой
        const app = await Application.findByPk(id);

        if (!app) {
            return res.status(404).json({ message: "Отклик не найден" });
        }

        // 2. Безопасность: кандидат видит только свой чек-лист
        if (Number(app.candidate_id) !== Number(userId)) {
            return res.status(403).json({ message: "Нет доступа к этому чек-листу" });
        }

        // 3. Проверка статуса (учитываем возможные пробелы из MSSQL)
        if (app.status.trim() !== 'Принято') {
            return res.status(403).json({ message: "Чек-лист доступен только после принятия отклика" });
        }

        // 4. Загружаем прогресс, ПРИСОЕДИНЯЯ шаблоны
        const checklist = await CandidateProgress.findAll({
            where: { application_id: id },
            include: [
                {
                    model: CheckListTemplate,
                    required: true, // INNER JOIN, чтобы не получить пустые этапы
                    attributes: ['stage_name', 'order_index'] // берем данные отсюда
                }
            ],
            // Сортируем по полю из присоединенной таблицы CheckListTemplate
            order: [[CheckListTemplate, 'order_index', 'ASC']]
        });

        // 5. Мапим данные для фронтенда
        const formattedChecklist = checklist.map(item => ({
            id: item.ProgressId || item.id,
            // Данные берем из вложенного объекта CheckListTemplate
            title: item.CheckListTemplate?.stage_name || "Без названия",
            description: "Этап отбора",
            is_completed: item.is_completed,
            order: item.CheckListTemplate?.order_index
        }));

        res.json(formattedChecklist);
    } catch (error) {
        console.error("Ошибка получения чек-листа:", error);
        res.status(500).json({
            message: "Ошибка сервера при загрузке чек-листа",
            details: error.message
        });
    }
};

module.exports = {
    getMyApplications,
    createApplication,
    updateApplicationStatus,
    getApplicationsByVacancy,
    deleteApplication,
    openChat,
    getApplicationChecklist
};