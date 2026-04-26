const { Vacancy, Application, User, CheckListTemplate, GlobalTemplate, GlobalTemplateItem, sequelize } = require('../models');
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

const getMyVacancies = async (req, res) => {
    try {
        console.log("=== API LOG: Поиск вакансий для UserID:", req.user.id);

        const vacancies = await Vacancy.findAll({
            where: { recruiter_id: req.user.id },
            // Если в БД нет колонок createdAt/updatedAt, добавь в модель timestamps: false
            order: [['VacancyId', 'DESC']] 
        });

        console.log(`=== API LOG: Найдено вакансий: ${vacancies.length}`);
        res.json(vacancies);
    } catch (error) {
        // Если это не выводится, проверь, запущен ли сервер именно в этом терминале
        console.error("!!! ОШИБКА БЭКЕНДА:", error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getVacancyById, applyToVacancy, getAllVacancies, createVacancyWithChecklist, getMyVacancies };