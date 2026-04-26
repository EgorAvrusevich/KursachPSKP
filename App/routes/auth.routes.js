const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const profileController = require('../controllers/profile.controller');
const VacancyController = require('../controllers/vacancy.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Публичные маршруты
router.post('/register', authController.register);
router.post('/login', authController.login);

// Маршруты личного кабинета (нужен токен)
router.get('/profile', authenticateToken, profileController.getProfile);
router.put('/profile', authenticateToken, profileController.updateProfile);

router.get('/vacancies', VacancyController.getAllVacancies);

// Пример для Админа (согласно заданию)
router.delete('/users/:id', authenticateToken, authorizeRole(['Admin']), (req, res) => {
    // Логика удаления/блокировки пользователя
});

module.exports = router;