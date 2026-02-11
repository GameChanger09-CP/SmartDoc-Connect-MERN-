const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middlewares/upload');

router.post('/login/', authController.login);
router.post('/register/', upload.single('gov_id'), authController.register);

module.exports = router;