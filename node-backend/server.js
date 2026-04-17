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
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://abhishekbhosale2025_db_user:1eLFkqW1RWtUT62R@cluster0.toiimzv.mongodb.net/smartdoc_db?retryWrites=true&w=majority&amp;w=majority')
  .then(async () => {
    console.log("✅ MongoDB Connected");
    // Auto-seed Main Admin if not exists
    const bcrypt = require('bcryptjs');
    const { User } = require('./models');
    try {
      const existing = await User.findOne({ username: 'admin' });
      if (!existing) {
        const hashed = bcrypt.hashSync('admin123', 10);
        await User.create({
          username: 'admin',
          email: 'admin@smartdoc.com',
          password: hashed,
          role: 'Main_Admin',
          kyc_status: 'Verified'
        });
        console.log('✅ Auto-created Main Admin (admin / admin123)');
      } else {
        console.log('✅ Main Admin already exists');
      }
    } catch (seedErr) {
      console.log('⚠️ Admin seed skipped:', seedErr.message);
    }
  })
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
// app.get('/', (req, res) => {
//     res.send("SmartDoc Connect API is Running...");
// });

const frontendDistPath = path.join(__dirname, '../frontend/dist');
console.log("hello",frontendDistPath)

app.use(express.static(frontendDistPath));


app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
}); 
// --- ERROR HANDLING MIDDLEWARE ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server!' });
});

// --- START SERVER ---
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});







// const express = require('express');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const path = require('path');
// require('dotenv').config();

// const authRoutes = require('./routes/authRoutes');
// const docRoutes = require('./routes/docRoutes');
// const userRoutes = require('./routes/userRoutes');

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Connect to MongoDB (Deprecated options removed)
// mongoose.connect(process.env.MONGO_URI)
// .then(() => console.log('MongoDB Connected'))
// .catch(err => console.error('MongoDB Connection Error:', err));

// // Define your API routes
// app.use('/api/auth', authRoutes);
// app.use('/api/docs', docRoutes);
// app.use('/api/users', userRoutes);

// // --- ADDED FOR SERVING FRONTEND ---
// // 1. Serve the static files from the React app
// const frontendDistPath = path.join(__dirname, '../frontend/dist');
// app.use(express.static(frontendDistPath));

// // 2. Catch-all handler for React Router
// // Using Regex /.*/ instead of '*' to fix the path-to-regexp error
// app.get(/.*/, (req, res) => {
//     res.sendFile(path.join(frontendDistPath, 'index.html'));
// });
// // ----------------------------------

// // Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });