const express = require('express');
const router = express.Router();
const ApprovedController = require('../controllers/approved.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Все маршруты защищены авторизацией
router.get('/', authenticateToken, ApprovedController.getApprovedCandidates);
router.post('/add', authenticateToken, ApprovedController.addToApproved);
router.patch('/:id', authenticateToken, ApprovedController.updateCandidateNote);
router.delete('/:id', authenticateToken, ApprovedController.removeFromApproved);

module.exports = router;