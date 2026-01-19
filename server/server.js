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
const { protect } = require('./middleware/auth');
const socialRoutes = require('./routes/social');
const messagingRoutes = require('./routes/messaging');
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// --- 0. CONFIGURATION CHECK (DEBUG DEPLOYMENT) ---
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'EMAIL_USER', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'];
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

// --- 2. AUTH MIDDLEWARE ---
const protectRedirect = async (req, res, next) => {
    const token = req.cookies.token; 
    if (!token) return res.redirect('/'); 
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.currentSessionId !== decoded.sessionId) {
            res.clearCookie('token'); 
            return res.redirect('/'); 
        }
        req.user = user;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.redirect('/'); 
    }
};

// --- 3. REGISTRATION SUCCESS PROTECTION ---
const checkRegSuccess = (req, res, next) => {
    if (req.cookies.reg_success === 'true') {
        next();
    } else {
        console.log("❌ Unauthenticated access to success page attempt. Redirecting...");
        res.redirect('/');
    }
};

// --- ROUTES ---

app.use('/api', authRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/messaging', messagingRoutes);

// Apply checkMasterKey to the landing page
app.get('/', checkMasterKey, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/home.html'));
});

app.get('/social', protectRedirect, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/social.html'));
});

app.get('/dashboard', protectRedirect, (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.sendFile(path.join(__dirname, '../private/profile.html'));
});

// Protect the success page
app.get('/registration-success', checkRegSuccess, (req, res) => {
    // Burn the cookie immediately so it can't be used twice
    res.clearCookie('reg_success');
    res.sendFile(path.join(__dirname, '../client/success.html'));
});

app.get('/private/:fileName', protectRedirect, (req, res) => {
    res.sendFile(path.join(__dirname, '../private', req.params.fileName));
});

app.get('/api/user/profile', protect, (req, res) => {
    // --- REAL PROFILE UPDATE ---
    // Returning all fields required by the Elite UI to prevent undefined errors
    res.json({
        id: req.user._id,
        username: req.user.username,
        fullName: req.user.fullName || "",
        bio: req.user.bio || "",
        profilePicture: req.user.profilePicture || "",
        location: req.user.location || "New York, USA",
        onlineStatus: req.user.onlineStatus || "offline",
        isPrivate: req.user.isPrivate,
        followersCount: req.user.followers.length,
        followingCount: req.user.following.length,
        stories: req.user.stories || [],
        savedPosts: req.user.savedPosts || []
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

// Only run the server if we are NOT in Vercel (Local Development)
if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Server locked and loaded on port ${PORT}`));
}

// Export the app for Vercel to run smoothly
module.exports = app;