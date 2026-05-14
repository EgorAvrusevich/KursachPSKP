const { Vacancy, Profile, Application, User, CheckListTemplate, GlobalTemplate, GlobalTemplateItem, CandidateProgress, sequelize } = require('../models');
const { Op } = require('sequelize');

const createVacancyWithChecklist = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { title, description, city, salary, checklist } = req.body;

        // 1. Создаем саму вакансию
        const vacancy = await Vacancy.create({
            title,
            description,
            city,
            salary,
            recruiter_id: req.user.id
        }, { transaction: t });

        // 2. Работаем с чек-листом
        if (checklist && checklist.length > 0) {
            // Формируем записи для CheckListTemplate (копии для этой конкретной вакансии)
            const templatesToCreate = checklist.map((item, index) => ({
                vacancy_id: vacancy.VacancyId,
                stage_name: item.stage_name, // Название может быть из шаблона или введено вручную
                order_index: index
            }));

            await CheckListTemplate.bulkCreate(templatesToCreate, { transaction: t });
        }

        await t.commit();
        res.status(201).json(vacancy);
    } catch (error) {
        await t.rollback();
        console.error("Ошибка создания вакансии:", error);
        res.status(500).json({ message: 'Ошибка при создании вакансии и этапов чек-листа' });
    }
};

const getAllVacancies = async (req, res) => {
    try {
        const { search, city, salary, sort = 'newest', page = 1, limit = 10 } = req.query;

        let whereCondition = { [Op.and]: [] };

        // 1. Фильтр по тексту (название или описание)
        if (search) {
            whereCondition[Op.and].push({
                [Op.or]: [
                    { title: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ]
            });
        }

        // 2. Фильтр по городу
        if (city) {
            whereCondition[Op.and].push({ city });
        }

        // 3. Фильтр по зарплате (логика "от")
        if (salary) {
            whereCondition[Op.and].push(
                sequelize.where(
                    sequelize.literal("TRY_CAST(REPLACE(REPLACE([Vacancy].[salary], '$', ''), ' ', '') AS INT)"),
                    { [Op.gte]: parseInt(salary) }
                )
            );
        }

        if (whereCondition[Op.and].length === 0) {
            whereCondition = {};
        }

        // Сортировка
        let order = [['createdAt', 'DESC']];
        switch (sort) {
            case 'oldest':
                order = [['createdAt', 'ASC']];
                break;
            case 'salary_desc':
                order = [[sequelize.literal("TRY_CAST(REPLACE(REPLACE([Vacancy].[salary], '$', ''), ' ', '') AS INT)"), 'DESC']];
                break;
            case 'salary_asc':
                order = [[sequelize.literal("TRY_CAST(REPLACE(REPLACE([Vacancy].[salary], '$', ''), ' ', '') AS INT)"), 'ASC']];
                break;
            case 'title_asc':
                order = [['title', 'ASC']];
                break;
            case 'title_desc':
                order = [['title', 'DESC']];
                break;
            case 'newest':
            default:
                order = [['createdAt', 'DESC']];
                break;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: vacancies } = await Vacancy.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: Profile,
                    as: 'RecruiterProfile',
                    attributes: ['full_name']
                }
            ],
            order,
            limit: parseInt(limit),
            offset
        });

        res.json({
            vacancies,
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit))
        });
    } catch (error) {
        console.error("Ошибка при получении вакансий:", error);
        res.status(500).json({ message: 'Ошибка при получении вакансий' });
    }
};

const getVacancyById = async (req, res) => {
    try {
        const vacancy = await Vacancy.findByPk(req.params.id, {
            include: [
                {
                    model: CheckListTemplate,
                    // Сортировка этапов внутри include
                    separate: true,
                    order: [['order_index', 'ASC']]
                },
                {
                    model: Profile,
                    as: 'RecruiterProfile',
                    attributes: ['full_name']
                }
            ]
        });

        if (!vacancy) return res.status(404).json({ message: 'Вакансия не найдена' });
        res.json(vacancy);
    } catch (error) {
        console.error("Ошибка при получении вакансии:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

const applyToVacancy = async (req, res) => {
    try {
        const existing = await Application.findOne({
            where: {
                vacancy_id: req.params.id,
                candidate_id: req.user.id
            }
        });

        if (existing) return res.status(400).json({ message: 'Вы уже откликнулись' });

        await Application.create({
            vacancy_id: req.params.id,
            candidate_id: req.user.id,
            status: 'Новый'
        });

        res.status(201).json({ message: 'Отклик успешно отправлен' });
    } catch (error) {
        console.error("Ошибка отклика:", error);
        res.status(500).json({ message: 'Ошибка при отклике' });
    }
};

// В контроллере вакансий
const getMyVacancies = async (req, res) => {
    try {
        const userId = req.user.id;
        const vacancies = await Vacancy.findAll({
            where: { recruiter_id: userId },
            attributes: {
                include: [
                    // Общее количество откликов
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM Applications AS app
                            WHERE app.vacancy_id = Vacancy.VacancyId
                        )`),
                        'totalApps'
                    ],
                    // Количество новых откликов (ещё не рассмотрены рекрутером)
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM Applications AS app
                            WHERE app.vacancy_id = Vacancy.VacancyId
                              AND app.status = N'Новый'
                        )`),
                        'pendingApps'
                    ]
                ]
            },
            order: [['createdAt', 'DESC']]
        });

        res.json(vacancies);
    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

const getVacancyByApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const userId = req.user.id;

        // 1. Ищем отклик с проверкой прав доступа (чтобы чужой не посмотрели)
        const application = await Application.findOne({
            where: {
                id: applicationId,
                // Если это кандидат, он видит свои. Если рекрутер - свои.
                [Op.or]: [
                    { candidate_id: userId },
                    { '$Vacancy.recruiter_id$': userId }
                ]
            },
            include: [
                {
                    model: Vacancy,
                    include: [CheckListTemplate] // Общие этапы вакансии
                }
            ]
        });

        if (!application) {
            return res.status(404).json({ message: "Отклик не найден" });
        }

        // 2. Логика прогресса: если статус НЕ 'Pending' (или 'На рассмотрении')
        // Значит, рекрутер уже одобрил заявку и пора показывать динамический прогресс
        let progress = [];
        const activeStatuses = ['Приглашение', 'Accepted', 'Interview', 'TestTask']; // Статусы "дальше рассмотрения"

        if (activeStatuses.includes(application.status)) {
            progress = await CandidateProgress.findAll({
                where: { ApplicationId: applicationId },
                order: [['order_index', 'ASC']]
            });
        }

        // 3. Собираем ответ
        res.json({
            applicationStatus: application.status,
            vacancy: application.Vacancy,
            // Если прогресс пустой (еще на рассмотрении), фронт может показать просто этапы из вакансии
            progress: progress.length > 0 ? progress : null
        });

    } catch (error) {
        console.error("Ошибка получения вакансии по отклику:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

const getVacancyCandidates = async (req, res) => {
    try {
        const { id } = req.params;

        const applications = await Application.findAll({
            where: { vacancy_id: id },
            include: [
                {
                    model: User,
                    as: 'Candidate', // Вы указали этот alias в связях
                    attributes: ['UserId', 'email'],
                    include: [
                        {
                            model: Profile, // Теперь Profile будет доступен благодаря импорту
                            attributes: ['full_name', 'phone']
                        }
                    ]
                }
            ]
        });

        res.json(applications);
    } catch (error) {
        console.error("DETAILED ERROR:", error);
        res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
};

const updateVacancy = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, city, salary } = req.body;
        const userId = req.user.id;

        // Находим вакансию, принадлежащую текущему рекрутеру
        const vacancy = await Vacancy.findOne({
            where: { VacancyId: id, recruiter_id: userId }
        });

        if (!vacancy) {
            return res.status(404).json({ message: 'Вакансия не найдена или доступ запрещен' });
        }

        // Обновляем только основные данные
        await vacancy.update({
            title,
            description,
            city,
            salary
        });

        res.json({ message: 'Данные вакансии обновлены', vacancy });
    } catch (error) {
        console.error("Ошибка обновления вакансии:", error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении' });
    }
};

const deleteVacancy = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params; // id вакансии из URL
        const userId = req.user.id;

        const vacancy = await Vacancy.findOne({
            where: { VacancyId: id, recruiter_id: userId }
        });

        if (!vacancy) {
            await t.rollback();
            return res.status(404).json({ message: 'Вакансия не найдена' });
        }

        // 1. Получаем ID всех откликов, используя ПРАВИЛЬНОЕ имя поля
        const applications = await Application.findAll({
            where: { vacancy_id: id },
            attributes: ['ApplicationId'], // Здесь было 'id', что вызывало ошибку
            transaction: t
        });

        const appIds = applications.map(app => app.ApplicationId);

        if (appIds.length > 0) {
            // 2. Удаляем прогресс кандидатов
            await CandidateProgress.destroy({
                where: { application_id: { [Op.in]: appIds } }, // Убедитесь, что в БД это application_id
                transaction: t
            });

            // 3. Удаляем сами отклики
            await Application.destroy({
                where: { vacancy_id: id },
                transaction: t
            });
        }

        // 4. Удаляем этапы чек-листа
        await CheckListTemplate.destroy({
            where: { vacancy_id: id },
            transaction: t
        });

        // 5. Удаляем вакансию
        await vacancy.destroy({ transaction: t });

        await t.commit();
        res.json({ message: 'Вакансия успешно удалена' });
    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка при удалении вакансии:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

module.exports = {
    getVacancyById, applyToVacancy, getAllVacancies,
    createVacancyWithChecklist, getMyVacancies, getVacancyByApplication,
    getVacancyCandidates, updateVacancy, deleteVacancy
};