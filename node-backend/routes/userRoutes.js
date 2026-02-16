const express = require('express');
const router = express.Router();

// 🔥 REQUIRED IMPORT
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

// Prefix is /api/users

router.get('/stats', auth, userController.getDashboardStats);
router.get('/logs', auth, userController.getLogs);

// User Management
router.get('/', auth, userController.getPendingUsers);  // List Pending
router.post('/', auth, userController.createUser);      // Create New
router.get('/search', auth, userController.searchUsers); // Search

// Approvals
router.post('/:id/approve', auth, userController.approveUser);
router.post('/:id/reject', auth, userController.rejectUser);

// Organization Data
router.get('/faculty', auth, userController.getFaculty);
router.get('/departments', auth, userController.getDepartments);

module.exports = router;