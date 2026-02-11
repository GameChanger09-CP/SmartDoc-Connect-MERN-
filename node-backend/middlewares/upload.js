const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'gov_id') cb(null, 'kyc_docs/');
        else if (file.fieldname === 'report_file') cb(null, 'dept_reports/');
        else cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

module.exports = multer({ storage });