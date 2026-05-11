const { SavedVacancy, Vacancy, Profile, sequelize } = require('../models');

// 1. Получить все сохранённые вакансии текущего пользователя
const getSavedVacancies = async (req, res) => {
    try {
        const userId = req.user.id;

        const saved = await SavedVacancy.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Vacancy,
                    include: [
                        {
                            model: Profile,
                            as: 'RecruiterProfile',
                            attributes: ['full_name']
                        }
                    ],
                    attributes: ['VacancyId', 'title', 'city', 'salary', 'description', 'status', 'createdAt']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json(saved);
    } catch (error) {
        console.error("Ошибка получения сохранённых вакансий:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 2. Добавить вакансию в избранное
const saveVacancy = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { vacancyId } = req.params;
        const userId = req.user.id;

        if (!vacancyId) {
            await t.rollback();
            return res.status(400).json({ message: "Не указан ID вакансии" });
        }

        // Проверяем, нет ли уже в избранном
        const existing = await SavedVacancy.findOne({
            where: { user_id: userId, vacancy_id: vacancyId },
            transaction: t
        });

        if (existing) {
            await t.rollback();
            return res.status(400).json({ message: "Вакансия уже сохранена" });
        }

        await SavedVacancy.create({
            user_id: userId,
            vacancy_id: vacancyId
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: "Вакансия сохранена" });
    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка сохранения вакансии:", error);
        res.status(500).json({ message: "Ошибка при сохранении" });
    }
};

// 3. Удалить вакансию из избранного
const unsaveVacancy = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const record = await SavedVacancy.findOne({
            where: { SaveId: id, user_id: userId },
            transaction: t
        });

        if (!record) {
            await t.rollback();
            return res.status(404).json({ message: "Запись не найдена" });
        }

        await record.destroy({ transaction: t });
        await t.commit();

        res.json({ message: "Вакансия удалена из избранного" });
    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка удаления из избранного:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

module.exports = {
    getSavedVacancies,
    saveVacancy,
    unsaveVacancy
};