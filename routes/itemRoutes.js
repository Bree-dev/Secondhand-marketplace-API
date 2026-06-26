const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const authController = require('../controllers/authController'); //  Import the controller handling dashboard logic
const authMiddleware = require('../middleware/authMiddleware'); // This contains  verifyToken logic
const multer = require('multer');
const path = require('path');

// 1. CONFIGURE STORAGE ENVIRONMENT
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Targets your local image directory
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 2. RUN INCOMING VERIFICATION CONTROLS
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 //  5MB Maximum file restriction rule
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Security Block: Only image file formats (.jpg, .jpeg, .png, .webp) are allowed!'));
        }
    }
});

// 3. THE SAFE WRAPPER INTERCEPTOR
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

// 4. API ENDPOINT REGISTER MAP
router.post('/create', authMiddleware, handleUploadMiddleware(itemController.createItem));
router.put('/:id', authMiddleware, handleUploadMiddleware(itemController.updateItem));

// Standard endpoints without file uploads stay clean:
router.get('/', itemController.getAllItems || itemController.getAllMarketplaceItems);
router.get('/mine', authMiddleware, itemController.getMyItems || itemController.getGroupedMyListings);
router.delete('/:id', authMiddleware, itemController.deleteItem);

router.get('/admin/dashboard', authMiddleware, authController.getAdminDashboardData);

// 5. EXPORT ROUTER STRUCTURAL PIPELINE
module.exports = router;