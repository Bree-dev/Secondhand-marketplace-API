const db = require('../config/db');

// 1. POST A NEW ITEM (Seller Action)
exports.createItem = async (req, res) => {
    try {
        const sellerId = req.user.id; // Pulled from your authMiddleware token array
        const { title, price, category, condition, location } = req.body;

        // 🚀 CAPTURE LOCAL FILE PATH IF UPLOADED, OTHERWISE FALLBACK TO NULL
        let image_url = null;
        if (req.file) {
            // This saves a clean structural identifier like "uploads/1717320000000-phone.jpg"
            image_url = req.file.path.replace(/\\/g, '/'); 
        }

        const insertQuery = `
            INSERT INTO items (title, price, category, condition, location, image_url, seller_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const values = [title, price, category, condition, location, image_url, sellerId];
        const result = await db.query(insertQuery, values);

        res.status(201).json({ message: "Listing created successfully!", item: result.rows[0] });
    } catch (err) {
        console.error("Failed to construct backend database record:", err);
        res.status(500).json({ message: "Server error creating item listing." });
    }
};

// 2. GET ALL ITEMS WITH LIVE SEARCH & CATEGORY FILTERING (Buyer Feed)
exports.getAllItems = async (req, res) => {
    try {
        // 1. Extract query params sent by frontend app.js
        const { category, search } = req.query;

        // Base SQL string joining items with user details so we know the seller's name and phone
        let queryText = `
            SELECT items.*, users.name as seller_name, users.whatsapp_number 
            FROM items 
            JOIN users ON items.seller_id = users.id
        `;
        
        const queryParams = [];
        const whereClauses = [];

        // 2. Condition A: If filtering by a specific category (and it's not 'All')
        if (category && category !== 'All') {
            queryParams.push(category);
            whereClauses.push(`items.category = $${queryParams.length}`);
        }

        // 3. Condition B: If a user typed something into the search bar
        if (search) {
            queryParams.push(`%${search}%`); // Using SQL wildcards for partial matching
            // ILIKE makes the search case-insensitive in PostgreSQL (e.g., 'HP', 'hp', 'Hp' all match)
            whereClauses.push(`(items.title ILIKE $${queryParams.length} OR items.description ILIKE $${queryParams.length} OR items.location ILIKE $${queryParams.length})`);
        }

        // 4. If any conditions exist, stitch them into the main SQL text block
        if (whereClauses.length > 0) {
            queryText += ' WHERE ' + whereClauses.join(' AND ');
        }

        // Always sort items so the newest listings appear at the top of the feed
        queryText += ' ORDER BY items.created_at DESC';

        // 5. Fire off the structured dynamic query straight to PostgreSQL
        const result = await db.query(queryText, queryParams);
        
        res.json(result.rows);
    } catch (err) {
        console.error("Failed to execute database query filtering:", err);
        res.status(500).json({ message: "Server error fetching marketplace records." });
    }
};

exports.deleteItem = async (req, res) => {
    const itemId = req.params.id;
    const sellerId = req.user.id; // Extracted safely from the JWT token payload by authMiddleware

    try {
        // 1. Verify if the item exists and belongs to the authenticated user
        const itemCheck = await db.query('SELECT * FROM items WHERE id = $1', [itemId]);

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ message: "Item not found." });
        }

        if (itemCheck.rows[0].seller_id !== sellerId) {
            return res.status(403).json({ message: "Unauthorized! You can only delete your own listings." });
        }

        // 2. Perform the cascading deletion query
        await db.query('DELETE FROM items WHERE id = $1', [itemId]);
        
        res.json({ message: "Listing successfully removed from the marketplace. 🗑️" });
    } catch (err) {
        console.error("Database deletion error:", err);
        res.status(500).json({ message: "Internal server error during deletion process." });
    }
};

// GET ONLY THE ITEMS BELONGING TO THE LOGGED-IN SELLER
exports.getGroupedMyListings = async (req, res) => {
    try {
        // req.user.id is automatically populated by your authMiddleware decoding the token
        const sellerId = req.user.id; 

        const queryText = `
            SELECT items.*, users.name as seller_name, users.whatsapp_number 
            FROM items 
            JOIN users ON items.seller_id = users.id
            WHERE items.seller_id = $1
            ORDER BY items.created_at DESC
        `;

        const result = await db.query(queryText, [sellerId]);
        res.json(result.rows);
    } catch (err) {
        console.error("Database failed to load user listings:", err);
        res.status(500).json({ message: "Server error retrieving your dashboard inventory." });
    }
};

// UPDATE AN EXISTING ITEM RECORD (PUT /api/items/:id)
exports.updateItem = async (req, res) => {
    try {
        const itemId = req.params.id;
        const sellerId = req.user.id;
        const { title, price, category, condition, location, existing_image_url } = req.body;

        // 1. Verify item ownership
        const verifyResult = await db.query('SELECT * FROM items WHERE id = $1', [itemId]);
        if (verifyResult.rows.length === 0) return res.status(404).json({ message: "Item not found." });
        if (verifyResult.rows[0].seller_id !== sellerId) return res.status(403).json({ message: "Unauthorized." });

        //  2. DETERMINE IMAGE PATH DIRECTION:
        let image_url = verifyResult.rows[0].image_url; // Default to existing database record
        if (req.file) {
            image_url = req.file.path.replace(/\\/g, '/'); // If a fresh file is chosen, overwrite it!
        } else if (existing_image_url === '') {
            image_url = null; // Cleared completely
        }

        const updateQuery = `
            UPDATE items 
            SET title = $1, price = $2, category = $3, condition = $4, location = $5, image_url = $6
            WHERE id = $7 AND seller_id = $8
            RETURNING *
        `;
        const values = [title, price, category, condition, location, image_url, itemId, sellerId];
        const result = await db.query(updateQuery, values);

        res.json({ message: "Listing updated successfully!", item: result.rows[0] });
    } catch (err) {
        console.error("Database update sequence execution failed:", err);
        res.status(500).json({ message: "Server error updating listing." });
    }
};