const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool dynamically using the single connection string
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Live cloud databases require SSL encryption to connect securely
    ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
});

// Verify connection health on startup
pool.on('connect', () => {
    console.log('🐘 PostgreSQL Database connected successfully via pool.');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database pool connection failure:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};