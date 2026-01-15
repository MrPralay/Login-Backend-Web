require('dotenv').config();
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first'); // FORCE IPv4 (Fixes Render/Gmail Timeout)
const express = require('express');
const mongoose = require('mongoose');
const path = require('path'); 
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const authRoutes = require('./routes/auth');
const User = require('./models/User'); 

const app = express();
app.use(express.json());
app.use(cookieParser());

// --- 0. CONFIGURATION CHECK (DEBUG DEPLOYMENT) ---
const requiredEnv = ['MONGO_URI', 'EMAIL_USER', 'EMAIL_PASS', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
    console.error("❌ CRITICAL ERROR: Missing Environment Variables:", missingEnv.join(", "));
    console.error("👉 If running on Render, go to Dashboard > Settings > Environment Variables");
} else {
    console.log("✅ All required environment variables are present.");
}


// GLOBAL ERROR HANDLERS (Prevent Crashes)
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR: Unhandled Rejection:', reason);
});

// --- 1. PRO SECURITY: MASTER KEY REDIRECT MIDDLEWARE (WITH TIMER & BURN) ---
const checkMasterKey = async (req, res, next) => {
    const manualKey = req.cookies.master_key;

    if (manualKey) {
        try {
            // Find the user with this specific key
            const user = await User.findOne({ authId: manualKey });
            
            if (user && user.authIdCreatedAt) {
                const currentTime = new Date();
                const timeDiff = (currentTime - user.authIdCreatedAt) / 1000 / 60; // Minutes

                // A. TIMER CHECK: If older than 15 minutes, key is dead
                if (timeDiff > 15) {
                    console.log("⚠️ Master Key expired. Wiping from DB...");
                    user.authId = null;
                    user.authIdCreatedAt = null;
                    await user.save();
                    return next(); 
                }

                // B. ONE-TIME USE BURN: Delete it immediately so it can't be reused
                user.authId = null;
                user.authIdCreatedAt = null;

                // C. RE-ARM SESSION: Generate a fresh sessionId
                const newSessionId = crypto.randomBytes(16).toString('hex');
                user.currentSessionId = newSessionId;
                await user.save();

                // Create a new signed JWT
                const token = jwt.sign(
                    { id: user._id, username: user.username, sessionId: newSessionId },
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' }
                );

                // Set token cookie and teleport
                // Set token cookie and teleport
                res.cookie('token', token, { 
                    httpOnly: true, 
                    secure: process.env.NODE_ENV === 'production', 
                    sameSite: 'lax' 
                });
                console.log("✅ Master Key used and destroyed. Redirecting...");
                return res.redirect('/dashboard');
            }
        } catch (err) {
            console.error("Master Key Check Error:", err);
        }
    }
    next();
};

// --- 2. SESSION-AWARE PROTECT MIDDLEWARE ---
const protect = async (req, res, next) => {
    const token = req.cookies.token; 
    
    if (!token) {
        return res.redirect('/'); 
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        // Security Check: Token's sessionId MUST match the one in DB
        if (!user || user.currentSessionId !== decoded.sessionId) {
            console.log("❌ Session mismatch/expired. Redirecting to login...");
            res.clearCookie('token'); 
            return res.redirect('/'); 
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth Error:", err.message);
        res.clearCookie('token');
        return res.redirect('/'); 
    }
};

// --- ROUTES ---

app.use('/api', authRoutes);

// Apply checkMasterKey to the landing page
app.get('/', checkMasterKey, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/home.html'));
});

app.get('/dashboard', protect, (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.sendFile(path.join(__dirname, '../private/profile.html'));
});

app.get('/private/:fileName', protect, (req, res) => {
    res.sendFile(path.join(__dirname, '../private', req.params.fileName));
});

app.get('/api/user/profile', protect, (req, res) => {
    res.json({
        username: req.user.username,
        bio: req.user.bio || ""
    });
});

app.post('/api/user/update-bio', protect, async (req, res) => {
    try {
        const { bio } = req.body;
        req.user.bio = bio;
        await req.user.save();
        res.json({ message: "Bio updated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update bio" });
    }
});

app.get('/api/dashboard-data', protect, (req, res) => {
    res.json({
        message: "Will you marry me?",
        user: req.user.username 
    });
});

app.use(express.static(path.join(__dirname, '../client')));

// Redirect any unknown routes back to login
app.use((req, res) => {
    res.redirect('/');
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Secure Connection Established'))
    .catch(err => console.error('Database connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server locked and loaded on port ${PORT}`));