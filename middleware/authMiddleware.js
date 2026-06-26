const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Read token from request header matrix
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: "Access denied. Please log in first." });
    }

    try {
        // Verify token authenticity against our secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user identity properties (id, role) to request
        next();             // Let user proceed to the controller
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired login token." });
    }
};