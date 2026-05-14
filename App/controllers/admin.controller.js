const { User, Profile, Vacancy, Application, GlobalTemplate, GlobalTemplateItem, sequelize } = require('../models');
const { Op } = require('sequelize');

// Кэш: существует ли колонка is_blocked (чтобы не проверять каждый раз)
let isBlockedColumnExistsCache = null;

async function isBlockedColumnExists() {
    if (isBlockedColumnExistsCache !== null) return isBlockedColumnExistsCache;
    try {
        const columns = await sequelize.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'is_blocked'",
            { type: sequelize.QueryTypes.SELECT }
        );
        isBlockedColumnExistsCache = columns.length > 0;
        return isBlockedColumnExistsCache;
    } catch {
        isBlockedColumnExistsCache = false;
        return false;
    }
}

// Получить всех пользователей с фильтрацией и пагинацией
const getAllUsers = async (req, res) => {
    try {
        const { search, role, isBlocked, page = 1, limit = 10 } = req.query;
        const whereCondition = {};

        if (search) whereCondition.email = { [Op.like]: `%${search}%` };
        if (role && role !== 'all') whereCondition.role = role;

        const offset = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User.findAll({
                where: whereCondition,
                include: [{ model: Profile, attributes: ['full_name', 'phone', 'bio'] }],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            }),
            User.count({ where: whereCondition })
        ]);

        // Фильтрация по is_blocked на уровне JS (устойчиво к отсутствию колонки)
        let filteredUsers = users;
        if (isBlocked && isBlocked !== 'all') {
            const target = isBlocked === 'true';
            filteredUsers = users.filter(u => (u.is_blocked || false) === target);
        }

        const usersWithStats = await Promise.all(filteredUsers.map(async (user) => {
            const [appsCount, vacsCount] = await Promise.all([
                Application.count({ where: { candidate_id: user.UserId } }),
                Vacancy.count({ where: { recruiter_id: user.UserId } })
            ]);
            return { ...user.toJSON(), applicationsCount: appsCount, vacanciesCount: vacsCount };
        }));

        res.json({
            users: usersWithStats,
            total: filteredUsers.length,
            page: parseInt(page),
            totalPages: Math.ceil(filteredUsers.length / limit),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error("Ошибка при получении пользователей:", error);
        res.status(500).json({ message: 'Ошибка при получении списка пользователей', error: error.message });
    }
};

// Заблокировать пользователя
const blockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const hasCol = await isBlockedColumnExists();
        if (!hasCol) return res.status(400).json({ message: 'Колонка is_blocked не существует в базе' });

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        if (user.role === 'Admin') return res.status(403).json({ message: 'Нельзя заблокировать администратора' });
        await user.update({ is_blocked: true });
        res.json({ message: 'Пользователь успешно заблокирован', user });
    } catch (error) {
        console.error("Ошибка при блокировке:", error);
        res.status(500).json({ message: 'Ошибка при блокировке', error: error.message });
    }
};

// Разблокировать пользователя
const unblockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const hasCol = await isBlockedColumnExists();
        if (!hasCol) return res.status(400).json({ message: 'Колонка is_blocked не существует в базе' });

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        await user.update({ is_blocked: false });
        res.json({ message: 'Пользователь успешно разблокирован', user });
    } catch (error) {
        console.error("Ошибка при разблокировке:", error);
        res.status(500).json({ message: 'Ошибка при разблокировке', error: error.message });
    }
};

// Удалить пользователя
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        if (user.role === 'Admin') return res.status(403).json({ message: 'Нельзя удалить администратора' });
        await user.destroy();
        res.json({ message: 'Пользователь успешно удален' });
    } catch (error) {
        console.error("Ошибка при удалении:", error);
        res.status(500).json({ message: 'Ошибка при удалении', error: error.message });
    }
};

// Получить все заявки для модерации
const getAllApplications = async (req, res) => {
    try {
        const { status, vacancyId, page = 1, limit = 20 } = req.query;
        const whereCondition = {};
        if (status && status !== 'all') whereCondition.status = status;
        if (vacancyId) whereCondition.vacancy_id = vacancyId;
        const offset = (page - 1) * limit;

        const [applications, total] = await Promise.all([
            Application.findAll({
                where: whereCondition,
                include: [
                    { model: User, as: 'Candidate', attributes: ['UserId', 'email'], include: [{ model: Profile, attributes: ['full_name', 'phone'] }] },
                    { model: Vacancy, attributes: ['VacancyId', 'title', 'city', 'salary'], include: [{ model: Profile, as: 'RecruiterProfile', attributes: ['full_name'] }] }
                ],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                subQuery: false
            }),
            Application.count({ where: whereCondition })
        ]);

        res.json({
            applications,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error("Ошибка при получении заявок:", error);
        res.status(500).json({ message: 'Ошибка при получении заявок', error: error.message });
    }
};

// Панель администратора — статистика
const getAdminDashboard = async (req, res) => {
    try {
        const hasCol = await isBlockedColumnExists();
        const queries = [
            sequelize.query("SELECT role, COUNT(*) AS count FROM Users GROUP BY role", { type: sequelize.QueryTypes.SELECT }),
            sequelize.query("SELECT status, COUNT(*) AS count FROM Applications GROUP BY status", { type: sequelize.QueryTypes.SELECT }),
            sequelize.query("SELECT COUNT(*) AS count FROM Users", { type: sequelize.QueryTypes.SELECT }),
            sequelize.query("SELECT COUNT(*) AS count FROM Vacancies", { type: sequelize.QueryTypes.SELECT })
        ];
        if (hasCol) {
            queries.push(sequelize.query("SELECT COUNT(*) AS count FROM Users WHERE is_blocked = 1", { type: sequelize.QueryTypes.SELECT }));
        }

        const [usersByRole, appsByStatus, totalResult, vacanciesTotalResult, blockedResult] = await Promise.all(queries);

        const pi = (v) => { const n = parseInt(v?.count || v); return isNaN(n) ? 0 : n; };

        res.json({
            users: {
                byRole: usersByRole.map(r => ({ role: r.role, count: pi(r) })),
                total: pi(totalResult[0]),
                blocked: blockedResult ? pi(blockedResult[0]) : 0
            },
            vacancies: { total: pi(vacanciesTotalResult[0]) },
            applications: { byStatus: appsByStatus.map(a => ({ status: a.status, count: pi(a) })) }
        });
    } catch (error) {
        console.error("Ошибка при получении статистики:", error);
        res.status(500).json({ message: 'Ошибка при получении статистики', error: error.message });
    }
};

// Модерация вакансий — получить все
const getAllVacanciesForModeration = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const whereCondition = {};
        if (search) {
            whereCondition[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }
        const offset = (page - 1) * limit;

        const [vacancies, total] = await Promise.all([
            Vacancy.findAll({
                where: whereCondition,
                include: [
                    { model: Profile, as: 'RecruiterProfile', attributes: ['full_name'] },
                    { model: User, as: 'Recruiter', attributes: ['UserId', 'email'] }
                ],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                subQuery: false
            }),
            Vacancy.count({ where: whereCondition })
        ]);

        const vacanciesWithApps = await Promise.all(vacancies.map(async (v) => {
            const appCount = await Application.count({ where: { vacancy_id: v.VacancyId } });
            return { ...v.toJSON(), ApplicationsCount: appCount };
        }));

        res.json({
            vacancies: vacanciesWithApps,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error("Ошибка при получении вакансий:", error);
        res.status(500).json({ message: 'Ошибка при получении вакансий', error: error.message });
    }
};

// Удалить вакансию (админ)
const deleteVacancyAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const vacancy = await Vacancy.findByPk(id);
        if (!vacancy) return res.status(404).json({ message: 'Вакансия не найдена' });
        await vacancy.destroy();
        res.json({ message: 'Вакансия успешно удалена' });
    } catch (error) {
        console.error("Ошибка при удалении вакансии:", error);
        res.status(500).json({ message: 'Ошибка при удалении вакансии', error: error.message });
    }
};

// Удалить отклик (админ)
const deleteApplicationAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const app = await Application.findByPk(id);
        if (!app) return res.status(404).json({ message: 'Заявка не найдена' });
        await app.destroy();
        res.json({ message: 'Заявка успешно удалена' });
    } catch (error) {
        console.error("Ошибка при удалении заявки:", error);
        res.status(500).json({ message: 'Ошибка при удалении заявки', error: error.message });
    }
};

// Глобальные шаблоны — CRUD
const getGlobalTemplates = async (req, res) => {
    try {
        const templates = await GlobalTemplate.findAll({
            include: [{ model: GlobalTemplateItem, order: [['order_index', 'ASC']] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(templates);
    } catch (error) {
        console.error("Ошибка при получении шаблонов:", error);
        res.status(500).json({ message: 'Ошибка при получении шаблонов', error: error.message });
    }
};

const createGlobalTemplate = async (req, res) => {
    try {
        const { name, description, items } = req.body;
        const template = await GlobalTemplate.create({ name, description, recruiter_id: req.user.id });
        if (items && items.length > 0) {
            await GlobalTemplateItem.bulkCreate(
                items.map((item, index) => ({ content: item.content, order_index: index, global_template_id: template.GlobalTemplateId }))
            );
        }
        res.status(201).json({ message: 'Шаблон создан', template });
    } catch (error) {
        console.error("Ошибка при создании шаблона:", error);
        res.status(500).json({ message: 'Ошибка при создании шаблона', error: error.message });
    }
};

const deleteGlobalTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await GlobalTemplate.findByPk(id);
        if (!template) return res.status(404).json({ message: 'Шаблон не найден' });
        await template.destroy();
        res.json({ message: 'Шаблон удален' });
    } catch (error) {
        console.error("Ошибка при удалении шаблона:", error);
        res.status(500).json({ message: 'Ошибка при удалении шаблона', error: error.message });
    }
};

module.exports = {
    getAllUsers, blockUser, unblockUser, deleteUser,
    getAllApplications, getAdminDashboard,
    getAllVacanciesForModeration, deleteVacancyAdmin, deleteApplicationAdmin,
    getGlobalTemplates, createGlobalTemplate, deleteGlobalTemplate
};