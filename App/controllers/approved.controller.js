const { ApprovedCandidate, Profile, User, sequelize } = require('../models');

// 1. Получить список всех одобренных кандидатов для текущего рекрутера
const getApprovedCandidates = async (req, res) => {
    try {
        const recruiterId = req.user.id;

        const approved = await ApprovedCandidate.findAll({
            where: { recruiter_id: recruiterId },
            include: [
                {
                    model: Profile,
                    as: 'CandidateProfile',
                    attributes: ['full_name', 'phone', 'bio']
                },
                {
                    model: User,
                    as: 'Candidate',
                    attributes: ['email']
                }
            ],
            order: [['added_at', 'DESC']]
        });

        res.json(approved);
    } catch (error) {
        console.error("Ошибка получения списка одобренных кандидатов:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 2. Добавить кандидата в список одобренных вручную
const addToApproved = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { candidateId, notes } = req.body;
        const recruiterId = req.user.id;

        if (!candidateId) {
            await t.rollback();
            return res.status(400).json({ message: "Не указан ID кандидата" });
        }

        const existing = await ApprovedCandidate.findOne({
            where: { recruiter_id: recruiterId, candidate_id: candidateId },
            transaction: t
        });

        if (existing) {
            await t.rollback();
            return res.status(400).json({ message: "Кандидат уже находится в вашем списке" });
        }

        await ApprovedCandidate.create({
            recruiter_id: recruiterId,
            candidate_id: candidateId,
            notes: notes || '',
            added_at: new Date()
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: "Кандидат успешно добавлен в список одобренных" });
    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка добавления кандидата:", error);
        res.status(500).json({ message: "Ошибка при добавлении кандидата" });
    }
};

// 3. Удалить кандидата из списка одобренных
const removeFromApproved = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const recruiterId = req.user.id;

        const record = await ApprovedCandidate.findOne({
            where: { Id: id, recruiter_id: recruiterId },
            transaction: t
        });

        if (!record) {
            await t.rollback();
            return res.status(404).json({ message: "Запись не найдена или у вас нет прав на её удаление" });
        }

        await record.destroy({ transaction: t });
        await t.commit();

        res.json({ message: "Кандидат удален из списка одобренных" });
    } catch (error) {
        if (t) await t.rollback();
        console.error("Ошибка удаления кандидата:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

// 4. Обновить заметку о кандидате
const updateCandidateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const recruiterId = req.user.id;

        const record = await ApprovedCandidate.findOne({
            where: { Id: id, recruiter_id: recruiterId }
        });

        if (!record) {
            return res.status(404).json({ message: "Кандидат не найден" });
        }

        await record.update({ notes });

        res.json({ message: "Заметка обновлена", notes });
    } catch (error) {
        console.error("Ошибка обновления заметки:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

module.exports = {
    getApprovedCandidates,
    addToApproved,
    removeFromApproved,
    updateCandidateNote
};