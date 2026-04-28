const { CandidateProgress, sequelize } = require('../models');

const updateProgressDetail = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params; // ID записи из CandidateProgresses
        const { is_completed, comment } = req.body;
        const recruiter_id = req.user.id;

        // Находим этап
        const step = await CandidateProgress.findByPk(id);

        if (!step) {
            await t.rollback();
            return res.status(404).json({ message: "Запись прогресса не найдена" });
        }

        // В идеале здесь должна быть проверка: 
        // принадлежит ли вакансия этого этапа текущему рекрутеру (req.user.id)

        const updateData = {};
        if (is_completed !== undefined) updateData.is_completed = is_completed;
        if (comment !== undefined) updateData.comment = comment;

        await step.update(updateData, { transaction: t });

        await t.commit();
        res.json({ 
            message: "Данные этапа обновлены", 
            is_completed: step.is_completed,
            comment: step.comment 
        });
    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка обновления прогресса:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

module.exports = { updateProgressDetail };