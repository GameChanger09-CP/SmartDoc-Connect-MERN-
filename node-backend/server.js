const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize App
const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Allow Frontend to communicate

// --- STATIC FOLDERS (For serving uploaded files) ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/kyc_docs', express.static(path.join(__dirname, 'kyc_docs')));
app.use('/dept_reports', express.static(path.join(__dirname, 'dept_reports')));

// --- DATABASE CONNECTION ---
// Removed deprecated options (useNewUrlParser, etc.) to fix MongoParseError
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- ROUTES ---
const authRoutes = require('./routes/authRoutes');
const docRoutes = require('./routes/docRoutes');
const userRoutes = require('./routes/userRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', docRoutes);
app.use('/api/users', userRoutes);

// --- BASE ROUTE (Health Check) ---
app.get('/', (req, res) => {
    res.send("SmartDoc Connect API is Running...");
});

// --- ERROR HANDLING MIDDLEWARE ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server!' });
});

// --- START SERVER ---
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});