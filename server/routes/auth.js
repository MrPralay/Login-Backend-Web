const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { google } = require('googleapis');

// Configure OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Helper: Create Base64 Encoded Email
const createEmailBody = (to, from, subject, message) => {
    const str = [
        `To: <${to}>`,
        `From: <${from}>`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        `MIME-Version: 1.0`,
        ``,
        message
    ].join('\n');

    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

// --- SEND OTP ROUTE ---
router.post('/send-otp', async (req, res) => {
    console.log('🔔 Request to send OTP to:', req.body.email);
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // CRITICAL FIX: Force refresh the access token before sending
        // This prevents "Invalid Credentials" errors on cloud platforms like Render
        const { token } = await oauth2Client.getAccessToken();
        if (!token) throw new Error("Could not generate Google Access Token");

        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

        await OTP.findOneAndUpdate(
            { email },
            { otp: otpCode, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        const rawMessage = createEmailBody(
            email,
            process.env.EMAIL_USER,
            'Your Antigravity OTP Code',
            `Your verification code is: ${otpCode}. It expires in 5 minutes.`
        );

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage }
        });

        console.log(`✅ OTP ${otpCode} sent successfully to ${email}`);
        res.status(200).json({ message: 'OTP Sent! Check your Email inbox' });

    } catch (err) {
        console.error("❌ GMAIL API ERROR:", err.message);
        res.status(500).json({ 
            error: "Failed to send OTP", 
            message: err.message 
        });
    }
});

// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
    try {
        const { username, password, email, otp } = req.body;

        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, email });
        await newUser.save();

        await OTP.deleteOne({ _id: otpRecord._id });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'Email or Username already taken' });
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