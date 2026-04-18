const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) return res.status(401).json({ error: 'Access Denied: No Token Provided' });

        const token = authHeader.replace('Token ', '').replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Access Denied: Invalid Token Format' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password'); // Exclude password hash from req.user
        
        if (!req.user) return res.status(401).json({ error: 'User associated with this token no longer exists.' });
        
        next();
    } catch (e) { 
        if (e.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session Expired. Please login again.' });
        }
        res.status(401).json({ error: 'Invalid Token' }); 
    }
};