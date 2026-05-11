const { User, Profile } = require('../models');

const getProfile = async (req, res) => {
    try {
        const userProfile = await User.findByPk(req.user.id, {
            attributes: ['email', 'role'],
            include: [{
                model: Profile,
                attributes: ['full_name', 'phone', 'bio']
            }]
        });

        if (!userProfile) return res.status(404).json({ message: 'Профиль не найден' });
        res.json(userProfile);
    } catch (error) {
        console.error("Ошибка получения профиля:", error);
        res.status(500).json({ message: 'Ошибка получения данных' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { full_name, phone, bio } = req.body;

        await Profile.update(
            { full_name, phone, bio },
            { where: { UserId: req.user.id } }
        );

        res.json({ message: 'Профиль успешно обновлен' });
    } catch (error) {
        console.error("Ошибка обновления профиля:", error);
        res.status(500).json({ message: 'Ошибка обновления' });
    }
};

module.exports = { getProfile, updateProfile };