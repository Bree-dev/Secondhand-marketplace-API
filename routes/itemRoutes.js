const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const authController = require('../controllers/authController'); 
const authMiddleware = require('../middleware/authMiddleware'); 
const multer = require('multer');
const path = require('path');

// NEW CLOUDINARY INTEGRATION MODULES
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 1. CONFIGURE CLOUDINARY WITH RENDER ENVIRONMENT VARIABLES
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. CONFIGURE STORAGE TO STREAM DIRECTLY TO THE CLOUD
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'secondhand_marketplace', // Name of folder inside your Cloudinary platform
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

// 3. ATTACH THE CLOUDINARY ENGINE TO MULTER
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB Maximum file restriction rule
    }
});

// 4. THE SAFE WRAPPER INTERCEPTOR (Kept exactly intact!)
function handleUploadMiddleware(routeHandler) {
    return (req, res, next) => {
        upload.single('image')(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: "Upload failed: Image size cannot exceed 5MB." });
                }
                return res.status(400).json({ message: `Upload error: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ message: err.message });
            }
            routeHandler(req, res, next);
        });
    };
}

// 5. API ENDPOINT REGISTER MAP 
router.post('/create', authMiddleware, handleUploadMiddleware(itemController.createItem));
router.put('/:id', authMiddleware, handleUploadMiddleware(itemController.updateItem));

router.get('/', itemController.getAllItems || itemController.getAllMarketplaceItems);
router.get('/mine', authMiddleware, itemController.getMyItems || itemController.getGroupedMyListings);
router.delete('/:id', authMiddleware, itemController.deleteItem);

router.get('/admin/dashboard', authMiddleware, authController.getAdminDashboardData);

module.exports = router;