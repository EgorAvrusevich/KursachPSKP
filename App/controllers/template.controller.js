// controllers/template.controller.js
const { CheckListTemplate, Vacancy } = require('../models');

// 1. Получить все уникальные названия этапов, которые этот рекрутер использовал ранее
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
        console.error("Ошибка получения шаблонов:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 2. Создать этап(ы) чек-листа
const createTemplate = async (req, res) => {
    try {
        const { stage_name, items } = req.body;

        // Создаём основной этап (vacancy_id пока не привязан)
        const template = await CheckListTemplate.create({
            stage_name,
            order_index: 0
        });

        // Создаём дополнительные этапы из items
        if (items && items.length > 0) {
            const itemObjects = items.map((item, index) => ({
                stage_name: item,
                order_index: index + 1
            }));
            await CheckListTemplate.bulkCreate(itemObjects);
        }

        res.status(201).json(template);
    } catch (error) {
        console.error("Ошибка создания шаблона:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 3. Обновить этап чек-листа (по TemplateId)
const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { stage_name } = req.body;

        const template = await CheckListTemplate.findByPk(id);

        if (!template) {
            return res.status(404).json({ message: "Шаблон не найден" });
        }

        await template.update({ stage_name });
        res.json({ message: "Шаблон обновлён", template });
    } catch (error) {
        console.error("Ошибка при обновлении шаблона:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

module.exports = { GetMyTemplates, createTemplate, updateTemplate };