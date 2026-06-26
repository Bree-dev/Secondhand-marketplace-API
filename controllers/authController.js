const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Built-in Node tool, no installation needed
const nodemailer = require('nodemailer'); // Handles secure automated email distribution
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const SALT_ROUNDS = 10;

// 🔑 CONTROLLER 1: Handle User Registration
exports.register = async (req, res) => {
    const { name, email, whatsapp_number, password } = req.body;

    if (!name || !email || !whatsapp_number || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // 🛡️ Strict Complexity Policy Validation
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            message: 'Password security violation: Must be at least 6 characters long and include at least one number and one special character.' 
        });
    }

    try {
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        const insertResult = await db.query(
            'INSERT INTO users (name, email, password_hash, whatsapp_number) VALUES ($1, $2, $3, $4) RETURNING id, name, email, whatsapp_number, role',
            [name.trim(), email.trim().toLowerCase(), password_hash, whatsapp_number.trim()]
        );

        const user = insertResult.rows[0];
        res.status(201).json({ message: 'Registration successful.', user });
    } catch (err) {
        console.error('Auth registration error:', err);
        res.status(500).json({ message: 'Registration failed.', error: err.message });
    }
};

// 🔑 CONTROLLER 2: Handle User Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const result = await db.query('SELECT id, name, email, password_hash, whatsapp_number, role FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const matched = await bcrypt.compare(password, user.password_hash);
        if (!matched) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                whatsapp_number: user.whatsapp_number,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Auth login error:', err);
        res.status(500).json({ message: 'Login failed.', error: err.message });
    }
};

// 🔑 CONTROLLER 3: Handle Secure "Forgot Password" Request
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    // 🔬 DEBUG CODE: Let's see exactly what your server is reading!
    console.log("--- ENV DEBUG CONFIG CHECK ---");
    console.log("SYSTEM_EMAIL read as:", process.env.SYSTEM_EMAIL);
    console.log("SYSTEM_EMAIL_PASSWORD length:", process.env.SYSTEM_EMAIL_PASSWORD ? process.env.SYSTEM_EMAIL_PASSWORD.length : "UNDEFINED");
    console.log("------------------------------");

    if (!email) {
        return res.status(400).json({ message: 'Email address is required.' });
    }
    

    if (!email) {
        return res.status(400).json({ message: 'Email address is required.' });
    }

    try {
        const cleanEmail = email.trim().toLowerCase();
        
        // 1. Check if the user exists in your database
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
        
        // Security Protocol: Generic success message regardless of existence to stop phishing hacks
        if (userCheck.rows.length === 0) {
            return res.json({ message: 'If that email is registered, a secure recovery link has been sent.' });
        }

        // 2. Generate secure token string using crypto tool
        const token = crypto.randomBytes(20).toString('hex');
        
        // 3. Set expiration timestamp: Current time + 1 Hour (3,600,000 ms)
        const expiryTime = Date.now() + 3600000;

        // 4. Update tracking metrics into your altered Postgres database columns
        await db.query(
            'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
            [token, expiryTime, cleanEmail]
        );

        // 5. Configure Nodemailer with secure credentials loaded from your .env file
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SYSTEM_EMAIL,
                pass: process.env.SYSTEM_EMAIL_PASSWORD
            }
        });

        // 6. Construct the reset link pointing to your local front-end file
        const resetLink = `file:///home/bree/Desktop/Second-Hand/Front-End/reset-password.html?token=${token}`;

        const mailOptions = {
            from: '"Second-Hand Marketplace" <noreply@marketplace.com>',
            to: cleanEmail,
            subject: 'Reset Your Second-Hand Marketplace Password',
            html: `
                <div style="font-family: sans-serif; max-width: 450px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 4px;">
                    <h2 style="text-transform: uppercase; font-size: 18px; font-weight: 900; tracking: -0.025em; color: #111827;">Password Recovery</h2>
                    <p style="font-size: 13px; color: #4b5563; line-height: 1.5;">We received a request to reset your marketplace account password. Click the button below to update your login credentials:</p>
                    <a href="${resetLink}" style="background-color: #111827; color: white; padding: 10px 16px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 10px; border-radius: 2px;">Reset Password</a>
                    <p style="font-size: 11px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #f3f4f6; padding-top: 10px;">This link expires automatically in 1 hour. If you didn't request this action, you can safely ignore this email.</p>
                </div>
            `
        };

        // 🚀 Dispatch the email completely off-screen from the client interface
        await transporter.sendMail(mailOptions);

        // 7. 🔒 SECURE RESPONSE: Confirm delivery safely *without* returning the token back to the browser network
        return res.json({ 
            message: 'If that email is registered, a secure recovery link has been sent.'
        });

    } catch (err) {
        console.error('Auth forgotPassword error:', err);
        return res.status(500).json({ message: 'Failed to process recovery request.', error: err.message });
    }
};

// 🔑 CONTROLLER 4: Handle "Reset Password" Form Submission
exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    // 🛡️ Strict Complexity Policy Validation Replaces the Old Length Check!
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!newPassword || !passwordRegex.test(newPassword)) {
        return res.status(400).json({ 
            message: 'Password security violation: Must be at least 6 characters long and include at least one number and one special character.' 
        });
    }
    try {
        const currentTime = Date.now();

        const findUser = await db.query(
            'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2',
            [token, currentTime]
        );

        if (findUser.rows.length === 0) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        const userId = findUser.rows[0].id;

        // Hash the new password using your existing SALT_ROUNDS configuration constant
        const new_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password_hash AND clear out the recovery tracking parameters completely
        await db.query(
            'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
            [new_hash, userId]
        );

        return res.json({ message: 'Password successfully updated!' });

    } catch (err) {
        console.error('Auth resetPassword error:', err);
        return res.status(500).json({ message: 'Failed to update user password.', error: err.message });
    }
};

// 📊 ADMIN PRIVILEGE: Fetch all users and their respective marketplace listings
exports.getAdminDashboardData = async (req, res) => {
    // Gatekeeper: Ensure the incoming request token belongs to an authorized admin
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Administrator credentials required.' });
    }

    try {
        const queryText = `
            SELECT 
                u.id AS user_id, 
                u.name AS user_name, 
                u.email AS user_email, 
                u.whatsapp_number,
                i.id AS item_id,
                i.title AS item_title,
                i.price AS item_price,
                i.image_url AS item_image
            FROM users u
            LEFT JOIN items i ON u.id = i.seller_id
            ORDER BY u.name ASC, i.created_at DESC;
        `;

        const result = await db.query(queryText);

        // Group the flat SQL rows into an organized JSON array structured by user
        const dashboardData = [];
        
        result.rows.forEach(row => {
            let user = dashboardData.find(u => u.id === row.user_id);
            if (!user) {
                user = {
                    id: row.user_id,
                    name: row.user_name,
                    email: row.user_email,
                    whatsapp: row.whatsapp_number,
                    items: []
                };
                dashboardData.push(user);
            }
            
            // If the user has posted an item, push it into their sub-array
            if (row.item_id) {
                user.items.push({
                    id: row.item_id,
                    title: row.item_title,
                    price: row.item_price,
                    image: row.item_image
                });
            }
        });

        return res.json({ users: dashboardData });

    } catch (err) {
        console.error('Admin Dashboard Data Error:', err);
        return res.status(500).json({ message: 'Failed to compile dashboard metrics.', error: err.message });
    }
};