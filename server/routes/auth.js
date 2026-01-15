const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN
    }
});

// Verify Connection Configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error("❌ SMTP Connection Error:", error);
    } else {
        console.log("✅ SMTP Server is ready to take messages");
    }
});

router.post('/send-otp', async (req, res) => {
    console.log('🔔 SEND-OTP REQUEST RECEIVED!', req.body);
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // 1. Generate 4-digit OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

        // 2. Save to DB (TTL will handle deletion)
        await OTP.findOneAndUpdate(
            { email },
            { otp: otpCode, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        // 3. Send Email via Nodemailer
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Antigravity OTP Code',
            text: `Your verification code is: ${otpCode}. It expires in 5 minutes.`
        };

        if (process.env.EMAIL_USER) {
            console.log(`DEBUG: Attempting to send using user: ${process.env.EMAIL_USER}`);
            await transporter.sendMail(mailOptions);
            console.log(`📧 Email sent to ${email}`);
        }

        res.status(200).json({ message: 'OTP sent! Check your Email.' });
    } catch (err) {
        console.error("❌ OTP SENDING ERROR:", err);
        res.status(500).json({ error: "Failed to send OTP", details: err.message });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { username, password, email, otp } = req.body;

        // 1. Verify OTP
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // 2. Hash Password and Save User
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, email });
        await newUser.save();

        // 3. Burn OTP after successful registration
        await OTP.deleteOne({ _id: otpRecord._id });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'Email or Username already taken' });
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const sessionId = crypto.randomBytes(16).toString('hex');
        const masterAuthId = crypto.randomBytes(24).toString('hex'); 

        // UPDATED: Save Session, Master Key, AND the current Timestamp
        user.currentSessionId = sessionId;
        user.authId = masterAuthId; 
        user.authIdCreatedAt = new Date(); // <--- This starts the timer
        await user.save();

        const token = jwt.sign(
            { id: user._id, username: user.username, sessionId: sessionId }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.cookie('token', token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',      
            sameSite: 'lax',   
            maxAge: 3600000    
        });

        res.json({ message: "Login successful. Master Key expires in 15 mins." });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (token) {
            const decoded = jwt.decode(token);
            if (decoded) {
                await User.findByIdAndUpdate(decoded.id, { 
                    currentSessionId: null,
                    authId: null,
                    authIdCreatedAt: null // Wipe the timer too
                });
            }
        }
        res.clearCookie('token');
        res.clearCookie('master_key'); 
        res.json({ message: "Logged out. All keys destroyed." });
    } catch (err) {
        res.status(500).json({ error: "Logout error" });
    }
});

module.exports = router;