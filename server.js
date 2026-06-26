require('dotenv').config();
const express = require('express');
const cors = require('cors');


// Import the Master Router package
const apiRoutes = require('./routes/index');

const app = express();

// Global configurations
app.use(cors());
app.use(express.json());

const path = require('path');
// Expose the uploads directory publicly so your frontend can read uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Pass all API routing responsibilities down to the routes folder
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Marketplace server running dynamically on port ${PORT}`);
}); 
