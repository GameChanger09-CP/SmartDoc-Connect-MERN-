const express = require('express');
const router = express.Router();

// 🔥 REQUIRED IMPORT (Missing previously)
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

// Route Map: Prefix is /api/users

// Statistics & Logs
router.get('/stats', auth, userController.getDashboardStats);
router.get('/logs', auth, userController.getLogs);

// User Management
router.get('/', auth, userController.getPendingUsers);  // For Admin Provisioning
router.post('/', auth, userController.createUser);      // For Admin Provisioning
router.get('/search', auth, userController.searchUsers); // For Offline Upload

// User Actions
router.post('/:id/approve', auth, userController.approveUser);
router.post('/:id/reject', auth, userController.rejectUser);

// Organization Data
router.get('/faculty', auth, userController.getFaculty);
router.get('/departments', auth, userController.getDepartments);

module.exports = router;