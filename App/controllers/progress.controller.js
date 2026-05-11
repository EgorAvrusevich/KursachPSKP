const { CandidateProgress, sequelize } = require('../models');

const updateProgressDetail = async (req, res) => {
    const { id } = req.params; // ID записи из CandidateProgress
    const { is_completed, comment } = req.body;

    try {
        // Находим этап
        const step = await CandidateProgress.findByPk(id);

        if (!step) {
            return res.status(404).json({ message: "Запись прогресса не найдена" });
        }

        // Формируем данные для обновления только переданных полей
        const updateData = {};
        if (is_completed !== undefined) updateData.is_completed = is_completed;
        if (comment !== undefined) updateData.comment = comment;

        await step.update(updateData);

        res.json({
            message: "Данные этапа обновлены",
            is_completed: step.is_completed,
            comment: step.comment
        });
    } catch (error) {
        console.error("Ошибка обновления прогресса:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

module.exports = { updateProgressDetail };