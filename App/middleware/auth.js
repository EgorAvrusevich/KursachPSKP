const jwt = require('jsonwebtoken');

// 1. Проверка наличия и валидности токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) return res.status(401).json({ message: 'Доступ запрещен. Токен отсутствует.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Неверный или просроченный токен.' });
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