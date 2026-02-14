const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middlewares/upload');
const auth = require('../middlewares/auth');

router.post('/login/', authController.login);
router.post('/register/', upload.single('gov_id'), authController.register);

// 🔥 Updated Routes for 2-Step Flow
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword); // Removed /:token
router.put('/update-profile', auth, authController.updateProfile);

module.exports = router;