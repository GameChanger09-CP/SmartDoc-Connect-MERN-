require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const doc = require('./controllers/docController')
const app = express();


// Routes
app.get('/download-report/:docId', cors({
    origin: 'http://localhost:5173',
    exposedHeaders: ['Content-Disposition'],
  }),  doc.downloadDeptReport);

// Middleware
 app.use(cors());

app.use(express.json());

// Serve Static Files (Replaces MEDIA_URL)
app.use('/uploads', express.static('uploads'));
app.use('/kyc_docs', express.static('kyc_docs'));
app.use('/dept_reports', express.static('dept_reports'));


app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/documents', require('./routes/docRoutes'));
app.use('/api', require('./routes/userRoutes')); // Handles users, depts, logs

// Database Connection & Server Start
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
        app.listen(process.env.PORT, () => {
            console.log(`🚀 Node API running on http://127.0.0.1:${process.env.PORT}`);
        });
    })
    .catch(err => console.error('MongoDB connection error:', err));