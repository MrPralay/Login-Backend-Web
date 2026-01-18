const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    const token = req.cookies.token; 
    
    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" }); 
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        // Security Check: Token's sessionId MUST match the one in DB
        if (!user || user.currentSessionId !== decoded.sessionId) {
            console.log("❌ Session mismatch/expired.");
            res.clearCookie('token'); 
            return res.status(401).json({ message: "Session expired" }); 
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth Error:", err.message);
        res.clearCookie('token');
        return res.status(401).json({ message: "Not authorized" }); 
    }
};

module.exports = { protect };
