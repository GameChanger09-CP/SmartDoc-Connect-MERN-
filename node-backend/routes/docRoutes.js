const express = require('express');
const router = express.Router();
const docController = require('../controllers/docController');
const paymentController = require('../controllers/paymentController'); // NEW
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/', auth, docController.getDocs);
router.post('/', auth, upload.single('file'), docController.uploadDoc);
router.post('/:id/route_to', auth, docController.routeDoc);
router.post('/:id/dept_submit_report', auth, upload.single('report_file'), docController.submitReport);
router.post('/:id/forward_to_client', auth, docController.forwardToClient);
router.post('/:id/freeze', auth, docController.toggleFreeze);
router.post('/:id/decline', auth, docController.declineDoc);
router.post('/:id/assign_faculty', auth, docController.assignToFaculty);
router.post('/:id/approve_faculty_report', auth, docController.approveFacultyReport);
router.post('/:id/return', auth, docController.returnDoc);

// 💰 Payment Routes
router.get('/get-razorpay-key', auth, paymentController.getKey);
router.post('/:id/request_payment', auth, paymentController.requestPayment);
router.post('/verify_payment', auth, paymentController.verifyPayment);

module.exports = router;