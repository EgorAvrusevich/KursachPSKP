const { Application, Vacancy, CheckListTemplate, CandidateProgress, User, Chat, ChatMessage, sequelize } = require('../models');
const { publishEvent } = require('../services/mqService');

// 1. Получить мои отклики (для кандидата)
const getMyApplications = async (req, res) => {
    try {
        const userId = req.user.UserId; // Используем UserId из токена

        const apps = await Application.findAll({
            where: { candidate_id: userId }, // ИСПРАВЛЕНО: согласно связи candidate_id
            include: [
                {
                    model: Vacancy,
                    include: [CheckListTemplate]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(apps);
    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера" });
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
            const templates = await CheckListTemplate.findAll({
                where: { vacancy_id: app.vacancy_id },
                transaction: t
            });

            if (templates.length > 0) {
                const progress = templates.map(temp => ({
                    application_id: id,
                    template_id: temp.TemplateId,
                    stage_name: temp.stage_name,
                    is_completed: false,
                    order_index: temp.order_index
                }));
                await CandidateProgress.bulkCreate(progress, { transaction: t });
            }

            // ПУБЛИКУЕМ СОБЫТИЕ В RABBITMQ
            // Мы не создаем чат здесь, это сделает воркер асинхронно
            await publishEvent('application_accepted', {
                applicationId: app.ApplicationId,
                candidateId: app.candidate_id,
                recruiterId: req.user.UserId
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
                as: 'ChatMessages' // Проверьте, чтобы совпадало с hasMany
            }],
            // Попробуем сортировку по литералу, чтобы исключить ошибки алиасов Sequelize
            order: [[sequelize.literal('[ChatMessages].[sent_at]'), 'ASC']]
        });
        
        if (!chat) return res.status(404).json({ message: "Чат еще не создан" });
        res.json(chat);
    } catch (err) {
        console.error("DEBUG SQL ERROR:", err.parent || err); 
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getMyApplications,
    createApplication,
    updateApplicationStatus,
    getApplicationsByVacancy,
    deleteApplication,
    openChat
};