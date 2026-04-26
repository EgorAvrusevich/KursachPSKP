const { GlobalTemplate, GlobalTemplateItem, sequelize } = require('../models');

// 1. Получить конкретный шаблон по ID (Новое)
const getGlobalTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        const recruiter_id = req.user.id;

        const template = await GlobalTemplate.findOne({
            where: { 
                GlobalTemplateId: id, // НЕ 'id', а имя из модели!
                recruiter_id: recruiter_id 
            },
            include: [{ model: GlobalTemplateItem }]
        });

        if (!template) return res.status(404).json({ message: "Шаблон не найден" });
        res.json(template);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 2. Создать новый шаблон в библиотеке
const createGlobalTemplate = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, description, items } = req.body;
        const recruiter_id = req.user.id;

        const template = await GlobalTemplate.create({
            name,
            description,
            recruiter_id
        }, { transaction: t });

        if (items && items.length > 0) {
            const templateId = template.id || template.global_template_id || template.GlobalTemplateId;

            const itemObjects = items.map((content, index) => ({
                content,
                order_index: index,
                global_template_id: templateId 
            }));

            await GlobalTemplateItem.bulkCreate(itemObjects, { transaction: t });
        }

        await t.commit();
        res.status(201).json(template);
    } catch (error) {
        if (t) await t.rollback();
        console.error("ОШИБКА СОХРАНЕНИЯ:", error);
        res.status(500).json({ message: "Ошибка при создании шаблона" });
    }
};

// 3. Получить все шаблоны рекрутера
const getMyGlobalTemplates = async (req, res) => {
    try {
        const templates = await GlobalTemplate.findAll({
            where: { recruiter_id: req.user.id },
            include: [{ model: GlobalTemplateItem }],
            order: [
                ['createdAt', 'DESC'],
                [GlobalTemplateItem, 'order_index', 'ASC']
            ]
        });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении шаблонов" });
    }
};

// 4. Обновить шаблон
const updateGlobalTemplate = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { name, items } = req.body; // Получаем 'name' вместо 'stage_name'
        const recruiter_id = req.user.id;

        // 1. Поиск по GlobalTemplateId
        const template = await GlobalTemplate.findOne({
            where: {
                GlobalTemplateId: id, // Используем точное имя ПК из БД
                recruiter_id: recruiter_id
            },
            transaction: t
        });

        if (!template) {
            await t.rollback();
            return res.status(404).json({ message: "Шаблон не найден" });
        }

        // 2. Обновляем название (поле 'name' в модели GlobalTemplate)
        await template.update({ name }, { transaction: t });

        // 3. Обновляем пункты (используем модель GlobalTemplateItem)
        if (items && Array.isArray(items)) {
            // Удаляем старые пункты по global_template_id
            await GlobalTemplateItem.destroy({
                where: { global_template_id: id },
                transaction: t
            });

            const itemsToCreate = items
                .filter(content => content.trim() !== '')
                .map((content, index) => ({
                    global_template_id: id, // Связь
                    content: content,
                    order_index: index // Добавляем индекс для сохранения порядка
                }));

            if (itemsToCreate.length > 0) {
                await GlobalTemplateItem.bulkCreate(itemsToCreate, { transaction: t });
            }
        }

        await t.commit();
        res.json({ message: "Шаблон успешно обновлен", templateId: id });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка при обновлении шаблона:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

module.exports = { 
    getMyGlobalTemplates, 
    createGlobalTemplate, 
    getGlobalTemplateById,
    updateGlobalTemplate
};