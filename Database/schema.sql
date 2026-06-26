-- 1. Enable extensions for advanced features (optional but good practice)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE USERS TABLE
-- Stores account details for Buyers, Sellers, and the Admin.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,            -- Stores securely encrypted passwords (via bcrypt)
    whatsapp_number VARCHAR(20) NOT NULL,           -- Format example: 254712345678
    role VARCHAR(20) DEFAULT 'seller' NOT NULL,     -- Roles: 'buyer', 'seller', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CREATE ITEMS TABLE
-- Stores the inventory details for the secondhand items.
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    seller_id INT REFERENCES users(id) ON DELETE CASCADE, -- Links the item to a specific user in the users table
    title VARCHAR(150) NOT NULL,
    description TEXT,                                     -- Detailed condition and item descriptions
    category VARCHAR(50) NOT NULL,                        -- e.g., 'Electronics', 'Furniture', 'Kitchenware'
    condition VARCHAR(50) NOT NULL,                       -- e.g., 'New', 'Like New', 'Gently Used', 'Well Loved'
    price NUMERIC(12, 2) NOT NULL,                        -- Handles decimal values cleanly without rounding issues
    location VARCHAR(100) NOT NULL,                       -- e.g., 'Nairobi CBD', 'Westlands', 'Nakuru'
    image_url VARCHAR(255),                               -- Stores the cloud path or local path to the uploaded photo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Used for sorting newest items first
);

-- 4. PERFORMANCE & LOGICAL INDEXES
-- Indexing the created_at column ensures that "ORDER BY created_at DESC" remains lightning fast as the database grows.
CREATE INDEX idx_items_created_at ON items(created_at DESC);

-- Indexing the columns used for search optimization.
CREATE INDEX idx_items_search_fields ON items(title, category, location);




