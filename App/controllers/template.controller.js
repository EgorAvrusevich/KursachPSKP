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
    // Начинаем транзакцию, чтобы если пункты не сохранятся, название тоже не менялось
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { stage_name, items } = req.body;
        const recruiter_id = req.user.id;

        // 1. Проверяем, существует ли шаблон и принадлежит ли он этому рекрутеру
        const template = await CheckListTemplate.findOne({
            where: { id, recruiter_id }
        });

        if (!template) {
            await t.rollback();
            return res.status(404).json({ message: "Шаблон не найден или у вас нет прав на его редактирование" });
        }

        // 2. Обновляем основную информацию (название этапа)
        await template.update({ stage_name }, { transaction: t });

        // 3. Обновляем пункты чек-листа
        if (items && Array.isArray(items)) {
            // Удаляем все старые пункты этого шаблона
            await CheckListItem.destroy({
                where: { template_id: id },
                transaction: t
            });

            // Формируем массив новых пунктов
            const itemsToCreate = items
                .filter(content => content.trim() !== '') // Убираем пустые строки
                .map(content => ({
                    template_id: id,
                    content: content
                }));

            // Массово записываем новые пункты
            if (itemsToCreate.length > 0) {
                await CheckListItem.bulkCreate(itemsToCreate, { transaction: t });
            }
        }

        // Если всё прошло успешно — фиксируем изменения
        await t.commit();

        res.json({ 
            message: "Шаблон успешно обновлен",
            templateId: id 
        });

    } catch (error) {
        // В случае ошибки откатываем все изменения в базе
        await t.rollback();
        console.error("Ошибка при обновлении шаблона:", error);
        res.status(500).json({ message: "Ошибка сервера при обновлении шаблона" });
    }
};

module.exports = { GetMyTemplates, createTemplate, updateTemplate };