// controllers/template.controller.js
const { CheckListTemplate } = require('../models');

const GetMyTemplates = async (req, res) => {
    try {
        const templates = await CheckListTemplate.findAll({
            include: [{
                model: Vacancy,
                where: { recruiter_id: req.user.id }
            }],
            attributes: ['stage_name'],
            group: ['stage_name']
        });
        res.json(templates);
    } catch (error) {
        res.status(500).send();
    }
}

const createTemplate = async (req, res) => {
    try {
        const { stage_name, items } = req.body;
        const recruiter_id = req.user.id; // Берем из токена

        // 1. Создаем сам этап
        const template = await CheckListTemplate.create({
            stage_name,
            recruiter_id,
            order_index: count + 1
        });

        // 2. Создаем пункты для этого этапа
        if (items && items.length > 0) {
            const itemObjects = items.map(text => ({
                template_id: template.id,
                content: text
            }));
            await CheckListItem.bulkCreate(itemObjects);
        }

        res.status(201).json(template);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

const updateTemplate = async (req, res) => {
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


module.exports = { GetMyTemplates, createTemplate, updateTemplate };