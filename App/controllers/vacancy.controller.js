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
            recruiter_id: req.user.id,
            status: 'Active'
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
        const { search } = req.query;
        let whereCondition = {};

        if (search) {
            whereCondition = {
                [Op.or]: [
                    { title: { [Op.like]: `%${search}%` } },
                    { company: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const vacancies = await Vacancy.findAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']]
        });
        res.json(vacancies);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении вакансий' });
    }
};

const getVacancyById = async (req, res) => {
    try {
        const vacancy = await Vacancy.findByPk(req.params.id);
        if (!vacancy) return res.status(404).json({ message: 'Вакансия не найдена' });
        res.json(vacancy);
    } catch (error) {
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
            status: 'Pending'
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
                    // Количество нерассмотренных (статус 'pending' или тот, что у тебя по дефолту)
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM Applications AS app
                            WHERE app.vacancy_id = Vacancy.VacancyId
                              AND app.status = 'pending'
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

module.exports = { getVacancyById, applyToVacancy, getAllVacancies, createVacancyWithChecklist, getMyVacancies, getVacancyByApplication, getVacancyCandidates };