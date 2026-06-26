const express = require('express');
const router = express.Router();

// 1. Import individual feature routers
const authRoutes = require('./authRoutes');
const itemRoutes = require('./itemRoutes');

// 2. Centralize them under clean sub-paths
router.use('/auth', authRoutes); // Centralizes to: /api/auth/...
router.use('/items', itemRoutes); // Centralizes to: /api/items/...

// Optional: You can move your health check route here too!
router.get('/health', async (req, res) => {
    const db = require('../config/db');
    try {
        const dbResult = await db.query('SELECT NOW()');
        res.json({ status: "All modular systems nominal. 🚀", databaseTime: dbResult.rows[0].now });
    } catch (err) {
        res.status(500).json({ status: "Database failure", error: err.message });
    }
});



module.exports = router;
