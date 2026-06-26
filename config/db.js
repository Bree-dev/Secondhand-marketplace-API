const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool pointing to our environment variables
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
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