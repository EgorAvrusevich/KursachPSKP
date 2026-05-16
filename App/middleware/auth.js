const jwt = require('jsonwebtoken');
const { User } = require('../models');

// 1. Проверка наличия и валидности токена + проверка блокировки
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) return res.status(401).json({ message: 'Доступ запрещен. Токен отсутствует.' });

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) return res.status(403).json({ message: 'Неверный или просроченный токен.' });

        // Проверяем актуальный статус блокировки из БД
        try {
            const dbUser = await User.findByPk(user.id, { attributes: ['is_blocked'] });
            if (dbUser?.is_blocked) {
                return res.status(403).json({ message: 'Ваш аккаунт заблокирован. Обратитесь к администратору.', is_blocked: true });
            }
        } catch { /* при ошибке БД пропускаем */ }

        req.user = user;
        next();
    });
};

// 2. Проверка ролей (RBAC)
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Недостаточно прав для выполнения операции.' });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRole };