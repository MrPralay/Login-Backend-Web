const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');
const User = require('../models/User');
const OTP = require('../models/OTP');

// --- RESEND CONFIG ---
const resend = new Resend(process.env.RESEND_API_KEY);

// No longer using createTransporter function for Resend

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
        
        console.log("[DEBUG] Sending email via Resend API...");

        const emailContent = `
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
        `;

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'Your Registration OTP',
            html: emailContent,
        });

        if (error) {
            console.error("[RESEND ERROR]", error);
            throw new Error(error.message);
        }

        console.log(`✅ Email sent successfully via Resend. ID: ${data ? data.id : 'N/A'}`);
        res.json({ message: 'OTP sent successfully to your inbox!' });
    } catch (err) {
        console.error("OTP Error Trace:", err);
        res.status(500).json({ message: "Failed to send OTP: " + err.message });
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