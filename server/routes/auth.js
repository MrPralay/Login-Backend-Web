const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const User = require('../models/User');
const OTP = require('../models/OTP');

// --- NODEMAILER OAUTH2 CONFIG ---
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

async function createTransporter() {
    try {
        console.log("[DEBUG] Fetching Google OAuth2 Access Token...");
        const accessToken = await oauth2Client.getAccessToken();
        console.log("[DEBUG] Access Token fetched successfully.");

        return nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.EMAIL_USER,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: accessToken.token
            }
        });
    } catch (err) {
        console.error("Transporter Error:", err);
        throw err;
    }
}

// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
    try {
        const { username, password, email, otp } = req.body;

        if (!otp) return res.status(400).json({ message: 'OTP is required' });

        // Verify OTP
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, email });
        await newUser.save();

        // Delete OTP after successful registration
        await OTP.deleteOne({ email });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'Email or Username already taken' });
        res.status(500).json({ message: err.message });
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

        // --- SEND ACTUAL EMAIL ---
        const transporter = await createTransporter();
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your Registration OTP",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #532e6d;">Registration OTP</h2>
                    <p>Hello,</p>
                    <p>Your one-time password for registration is:</p>
                    <h1 style="color: #d8b4ff; background: #532e6d; display: inline-block; padding: 10px 20px; border-radius: 5px;">${otp}</h1>
                    <p>This code will expire in 5 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr />
                    <p style="font-size: 12px; color: #777;">Powered By Pralay</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${email}`);

        res.json({ message: 'OTP sent successfully to your inbox!' });
    } catch (err) {
        console.error("OTP Error:", err);
        res.status(500).json({ error: "Failed to send OTP email: " + err.message });
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