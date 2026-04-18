const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

router.get('/stats', auth, userController.getDashboardStats);
router.get('/logs', auth, userController.getLogs);

router.get('/', auth, userController.getPendingUsers);  
router.post('/', auth, userController.createUser);      
router.get('/search', auth, userController.searchUsers); 

router.post('/:id/approve', auth, userController.approveUser);
router.post('/:id/reject', auth, userController.rejectUser);

router.get('/faculty', auth, userController.getFaculty);
router.get('/departments', auth, userController.getDepartments);

module.exports = router;