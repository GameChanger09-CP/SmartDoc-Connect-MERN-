const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const seedAdmin = require('./seedAdmin'); // Import the seed function

// Load environment variables
dotenv.config();

// Initialize App
const app = express();

// --- SAFETY: Ensure required upload directories exist ---
const requiredDirs = ['uploads', 'kyc_docs', 'dept_reports'];
requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created missing directory: ${dirPath}`);
    }
});

// --- MIDDLEWARE ---
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// --- STATIC FOLDERS (For Uploads) ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/kyc_docs', express.static(path.join(__dirname, 'kyc_docs')));
app.use('/dept_reports', express.static(path.join(__dirname, 'dept_reports')));

// --- DATABASE CONNECTION & SEEDING ---
if (!process.env.MONGO_URI) {
    console.error("❌ FATAL ERROR: MONGO_URI is not defined.");
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("✅ MongoDB Connected");
        
        // Run the seed logic automatically on startup
        await seedAdmin(); 
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1); 
    });

// --- API ROUTES ---
const authRoutes = require('./routes/authRoutes');
const docRoutes = require('./routes/docRoutes');
const userRoutes = require('./routes/userRoutes');

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', docRoutes);
app.use('/api/users', userRoutes);

// --- API HEALTH CHECK ---
// Moved to /api/health so it doesn't block the frontend root URL
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "success", message: "SmartDoc Connect API is Running..." });
});

// --- API 404 CATCH-ALL ---
// Only catch unresolved routes that start with /api
app.use('/api', (req, res) => {
    res.status(404).json({ error: "API Endpoint Not Found" });
});

// --- FRONTEND SERVING (SPA) ---
// Assuming your frontend folder is one level up from node-backend
const frontendDistPath = path.join(__dirname, '../frontend/dist');
console.log("Serving frontend from:", frontendDistPath);

// 1. Serve static assets (js, css, images) from the React build
app.use(express.static(frontendDistPath));

// 2. Catch-all for React Router
// Any request that isn't an API route and isn't a static file gets index.html
// 2. Catch-all for React Router
// Any request that isn't an API route and isn't a static file gets index.html
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// --- GLOBAL ERROR HANDLING MIDDLEWARE ---
app.use((err, req, res, next) => {
    console.error("🔥 Unhandled Error:", err.stack);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size is too large.' });
    }

    res.status(500).json({ error: 'Internal Server Error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// --- START SERVER & GRACEFUL SHUTDOWN ---
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (err) => {
    console.error("❌ Unhandled Rejection! Shutting down...");
    console.error(err.name, err.message);
    server.close(() => process.exit(1));
});

// Handle SIGTERM (Render/Heroku shutdown)
process.on('SIGTERM', () => {
    console.log("👋 SIGTERM received. Shutting down gracefully...");
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log("MongoDB connection closed.");
            process.exit(0);
        });
    });
});