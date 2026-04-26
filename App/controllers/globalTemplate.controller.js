const { GlobalTemplate, GlobalTemplateItem, sequelize } = require('../models');

// Создать новый шаблон в библиотеке
exports.createGlobalTemplate = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, description, items } = req.body; // items - массив строк
        const recruiter_id = req.user.id;

        const template = await GlobalTemplate.create({
            name,
            description,
            recruiter_id
        }, { transaction: t });

        if (items && items.length > 0) {
            const itemObjects = items.map((content, index) => ({
                content,
                order_index: index,
                GlobalTemplateId: template.GlobalTemplateId
            }));
            await GlobalTemplateItem.bulkCreate(itemObjects, { transaction: t });
        }

        await t.commit();
        res.status(201).json(template);
    } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ message: "Ошибка при создании шаблона" });
    }
};

// Получить все шаблоны рекрутера
exports.getMyGlobalTemplates = async (req, res) => {
    try {
        const templates = await GlobalTemplate.findAll({
            where: { recruiter_id: req.user.id },
            include: [{ model: GlobalTemplateItem, order: [['order_index', 'ASC']] }]
        });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении шаблонов" });
    }
};