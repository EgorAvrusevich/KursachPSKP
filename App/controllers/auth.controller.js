const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Profile } = require('../models');

const register = async (req, res) => {
    try {
        const { email, password, fullName, role } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'Пользователь уже существует' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            email,
            password_hash: hashedPassword,
            role: role || 'Candidate'
        });

        await Profile.create({
            UserId: newUser.UserId,
            full_name: fullName
        });

        res.status(201).json({ message: 'Пользователь успешно создан', userId: newUser.UserId });
    } catch (error) {
        console.error('ОШИБКА В КОНТРОЛЛЕРЕ:', error);
        res.status(500).json({ message: 'Ошибка при регистрации', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Неверный пароль' });

        // ИСПРАВЛЕНИЕ: используем user.UserId (как в модели)
        const token = jwt.sign(
            { id: user.UserId, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ token, role: user.role });
    } catch (error) {
        console.error('ОШИБКА В КОНТРОЛЛЕРЕ:', error);
        res.status(500).json({ message: 'Ошибка при входе', error: error.message });
    }
};

module.exports = { register, login };