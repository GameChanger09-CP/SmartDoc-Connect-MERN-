const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

router.get('/stats', auth, userController.getDashboardStats);
router.get('/users', auth, userController.getPendingUsers);
router.post('/users', auth, userController.createUser);
router.post('/users/:id/approve', auth, userController.approveUser);
router.post('/users/:id/reject', auth, userController.rejectUser);
router.get('/faculty', auth, userController.getFaculty);
router.get('/departments', auth, userController.getDepartments);
router.get('/logs', auth, userController.getLogs);

module.exports = router;