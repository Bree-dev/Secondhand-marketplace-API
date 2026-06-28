require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import the Master Router package
const apiRoutes = require('./routes/index');

const app = express();

// Global configurations
app.use(cors());
app.use(express.json());

// Expose the uploads directory publicly so your frontend can read uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1.  A HOME SANITY CHECK ROUTE (Fixes the "Cannot GET /" screen)
app.get('/', (req, res) => {
    res.json({ message: "🚀 Secondhand Marketplace API is live and running cleanly!" });
});

// 2. MATCH FRONTEND EXPECTATIONS BY ADDING '/v1'
app.use('/api/v1', apiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Marketplace server running dynamically on port ${PORT}`);
});