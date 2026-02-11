const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
    // Expecting token in format: "Token <jwt_string>" to match Django DRF
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Token ', '') || authHeader?.replace('Bearer ', '');
    
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        if (!req.user) throw new Error();
        next();
    } catch (e) { 
        res.status(401).json({ error: 'Invalid Token' }); 
    }
};