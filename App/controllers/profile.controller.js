const { User, Profile } = require('../models');

const getProfile = async (req, res) => {
    try {
        // req.user.id берется из твоего middleware (из токена)
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
        res.status(500).json({ message: 'Ошибка получения данных', error: error.message });
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
        res.status(500).json({ message: 'Ошибка обновления', error: error.message });
    }
};

module.exports = { getProfile, updateProfile };