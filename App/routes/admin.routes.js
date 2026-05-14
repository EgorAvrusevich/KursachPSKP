const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Все маршруты требуют аутентификации и роли Admin
const adminAuth = [authenticateToken, authorizeRole(['Admin'])];

// --- Пользователи ---
router.get('/users', adminAuth, adminController.getAllUsers);
router.put('/users/:id/block', adminAuth, adminController.blockUser);
router.put('/users/:id/unblock', adminAuth, adminController.unblockUser);
router.delete('/users/:id', adminAuth, adminController.deleteUser);

// --- Заявки ---
router.get('/applications', adminAuth, adminController.getAllApplications);
router.delete('/applications/:id', adminAuth, adminController.deleteApplicationAdmin);

// --- Панель ---
router.get('/dashboard', adminAuth, adminController.getAdminDashboard);

// --- Модерация вакансий ---
router.get('/vacancies', adminAuth, adminController.getAllVacanciesForModeration);
router.delete('/vacancies/:id', adminAuth, adminController.deleteVacancyAdmin);

// --- Глобальные шаблоны ---
router.get('/templates', adminAuth, adminController.getGlobalTemplates);
router.post('/templates', adminAuth, adminController.createGlobalTemplate);
router.delete('/templates/:id', adminAuth, adminController.deleteGlobalTemplate);

module.exports = router;