const { CheckListTemplate } = require('../models');

const updateProgress = async (req, res) => {
    try {
        const { progressId } = req.params; // ID этапа из шаблона чек-листа
        const { is_completed } = req.body;

        // Находим этап и обновляем его статус
        const stage = await CheckListTemplate.findByPk(progressId);
        
        if (!stage) {
            return res.status(404).json({ message: 'Этап не найден' });
        }

        stage.is_completed = is_completed;
        await stage.save();

        res.json({ message: 'Прогресс обновлен', stage });
    } catch (error) {
        console.error('Ошибка в updateProgress:', error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении прогресса' });
    }
};

module.exports = { updateProgress };