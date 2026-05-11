const { GlobalTemplate, GlobalTemplateItem, sequelize } = require('../models');

// Вспомогательная функция для получения recruiterId из токена
const getRecruiterId = (req) => req.user.id;

// 1. Получить конкретный шаблон по ID
const getGlobalTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        const recruiterId = getRecruiterId(req);

        const template = await GlobalTemplate.findOne({
            where: {
                GlobalTemplateId: id,
                recruiter_id: recruiterId
            },
            include: [{ model: GlobalTemplateItem }]
        });

        if (!template) return res.status(404).json({ message: "Шаблон не найден" });
        res.json(template);
    } catch (error) {
        console.error("Ошибка получения шаблона:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 2. Создать новый шаблон в библиотеке
const createGlobalTemplate = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, description, items } = req.body;
        const recruiterId = getRecruiterId(req);

        const template = await GlobalTemplate.create({
            name,
            description,
            recruiter_id: recruiterId
        }, { transaction: t });

        if (items && items.length > 0) {
            const itemObjects = items.map((content, index) => ({
                content,
                order_index: index,
                global_template_id: template.GlobalTemplateId
            }));

            await GlobalTemplateItem.bulkCreate(itemObjects, { transaction: t });
        }

        await t.commit();
        res.status(201).json(template);
    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка при создании шаблона:", error);
        res.status(500).json({ message: "Ошибка при создании шаблона" });
    }
};

// 3. Получить все шаблоны рекрутера
const getMyGlobalTemplates = async (req, res) => {
    try {
        const recruiterId = getRecruiterId(req);
        const templates = await GlobalTemplate.findAll({
            where: { recruiter_id: recruiterId },
            include: [{ model: GlobalTemplateItem }]
        });
        res.json(templates);
    } catch (error) {
        console.error("Ошибка получения шаблонов:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 4. Обновить шаблон
const updateGlobalTemplate = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { name, items } = req.body;
        const recruiterId = getRecruiterId(req);

        const template = await GlobalTemplate.findOne({
            where: { GlobalTemplateId: id, recruiter_id: recruiterId },
            transaction: t
        });

        if (!template) {
            await t.rollback();
            return res.status(404).json({ message: "Шаблон не найден" });
        }

        // Обновляем название
        await template.update({ name }, { transaction: t });

        // Пересоздаём пункты (replace-подход: удаляем старые, создаём новые)
        if (items && Array.isArray(items)) {
            await GlobalTemplateItem.destroy({
                where: { global_template_id: template.GlobalTemplateId },
                transaction: t
            });

            const itemsToCreate = items
                .filter(content => content.trim() !== '')
                .map((content, index) => ({
                    global_template_id: template.GlobalTemplateId,
                    content,
                    order_index: index
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

const deleteGlobalTemplate = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const recruiterId = getRecruiterId(req);

        const template = await GlobalTemplate.findOne({
            where: { GlobalTemplateId: id, recruiter_id: recruiterId },
            transaction: t
        });

        if (!template) {
            await t.rollback();
            return res.status(404).json({ message: "Шаблон не найден или у вас нет прав на его удаление" });
        }

        // Удаляем пункты и сам шаблон в транзакции
        await GlobalTemplateItem.destroy({
            where: { global_template_id: template.GlobalTemplateId },
            transaction: t
        });

        await template.destroy({ transaction: t });
        await t.commit();

        res.json({ message: "Шаблон и его пункты успешно удалены" });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка при удалении шаблона:", error);
        res.status(500).json({ message: "Ошибка сервера при удалении" });
    }
};

module.exports = {
    getMyGlobalTemplates,
    createGlobalTemplate,
    getGlobalTemplateById,
    updateGlobalTemplate,
    deleteGlobalTemplate
};