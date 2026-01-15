const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');

// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, email });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'Email or Username already taken' });
        res.status(500).json({ error: err.message });
    }
});

// --- SEND OTP ROUTE ---
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        // Save OTP to DB (replaces existing one for this email if it exists)
        await OTP.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        console.log(`[DEBUG] OTP for ${email}: ${otp}`);
        
        // In a real app, you'd use Nodemailer here. For now, we just save to DB.
        res.json({ message: 'OTP sent successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const sessionId = crypto.randomBytes(16).toString('hex');
        const masterAuthId = crypto.randomBytes(24).toString('hex'); 

        user.currentSessionId = sessionId;
        user.authId = masterAuthId; 
        user.authIdCreatedAt = new Date(); 
        await user.save();

        const token = jwt.sign(
            { id: user._id, username: user.username, sessionId: sessionId }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.cookie('token', token, {
            httpOnly: true, 
            secure: true, // Required for Render HTTPS     
            sameSite: 'lax',   
            maxAge: 3600000    
        });

        res.json({ message: "Login successful", masterKey: masterAuthId });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LOGOUT ROUTE ---
router.post('/logout', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (token) {
            const decoded = jwt.decode(token);
            if (decoded) {
                await User.findByIdAndUpdate(decoded.id, { 
                    currentSessionId: null,
                    authId: null,
                    authIdCreatedAt: null 
                });
            }
        }
        res.clearCookie('token');
        res.clearCookie('master_key'); 
        res.json({ message: "Logged out" });
    } catch (err) {
        res.status(500).json({ error: "Logout error" });
    }
});

module.exports = router;