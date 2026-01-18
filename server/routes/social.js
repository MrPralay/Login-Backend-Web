const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');

// --- SEARCH USERS ---
router.get('/search', protect, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const users = await User.find({
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { fullName: { $regex: q, $options: 'i' } }
            ],
            _id: { $ne: req.user._id } // Don't include self
        }).select('username fullName profilePicture isPrivate');

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET USER PROFILE ---
router.get('/profile/:username', protect, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isFollowing = user.followers.includes(req.user._id);
        const isSelf = user._id.toString() === req.user._id.toString();

        const profileData = {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            bio: user.bio,
            profilePicture: user.profilePicture,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            isPrivate: user.isPrivate,
            isFollowing,
            isSelf
        };

        // If private and not following (and not self), hide "posts" (which we'll implement later)
        if (user.isPrivate && !isFollowing && !isSelf) {
            profileData.isRestricted = true;
        } else {
            profileData.isRestricted = false;
        }

        res.json(profileData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FOLLOW / UNFOLLOW ---
router.post('/follow/:id', protect, async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user._id);

        if (!userToFollow) return res.status(404).json({ message: 'User not found' });
        if (userToFollow._id.toString() === currentUser._id.toString()) {
            return res.status(400).json({ message: "You can't follow yourself" });
        }

        const isFollowing = currentUser.following.includes(userToFollow._id);

        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(id => id.toString() !== userToFollow._id.toString());
            userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== currentUser._id.toString());
            await currentUser.save();
            await userToFollow.save();
            return res.json({ message: 'Unfollowed', isFollowing: false });
        } else {
            // Follow
            currentUser.following.push(userToFollow._id);
            userToFollow.followers.push(currentUser._id);
            await currentUser.save();
            await userToFollow.save();
            return res.json({ message: 'Followed', isFollowing: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TOGGLE PRIVACY ---
router.post('/toggle-privacy', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.isPrivate = !user.isPrivate;
        await user.save();
        res.json({ isPrivate: user.isPrivate, message: `Account is now ${user.isPrivate ? 'Private' : 'Public'}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- UPDATE SETTINGS ---
router.post('/settings', protect, async (req, res) => {
    try {
        const { fullName, bio, profilePicture, isPrivate, notificationSettings } = req.body;
        const user = await User.findById(req.user._id);

        if (fullName !== undefined) user.fullName = fullName;
        if (bio !== undefined) user.bio = bio;
        if (profilePicture !== undefined) user.profilePicture = profilePicture;
        if (isPrivate !== undefined) user.isPrivate = isPrivate;
        if (notificationSettings !== undefined) user.notificationSettings = notificationSettings;

        await user.save();
        res.json({ message: 'Settings updated successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CHAT LOCK ---
router.post('/chat-lock', protect, async (req, res) => {
    try {
        const { passcode, action } = req.body; // action: 'set', 'verify', 'toggle'
        const user = await User.findById(req.user._id);

        if (action === 'set') {
            user.chatLockPasscode = passcode;
            user.isChatLocked = true;
            await user.save();
            return res.json({ message: 'Chat lock enabled' });
        }

        if (action === 'verify') {
            if (user.chatLockPasscode === passcode) {
                return res.json({ success: true });
            } else {
                return res.status(401).json({ success: false, message: 'Incorrect passcode' });
            }
        }

        if (action === 'toggle') {
            user.isChatLocked = !user.isChatLocked;
            await user.save();
            return res.json({ isChatLocked: user.isChatLocked });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CREATE POST ---
router.post('/post', protect, async (req, res) => {
    try {
        const { content, image } = req.body;
        const newPost = new Post({
            user: req.user._id,
            content,
            image
        });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET GLOBAL FEED ---
router.get('/feed', protect, async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('user', 'username fullName profilePicture')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SEED DUMMY DATA ---
router.post('/seed', protect, async (req, res) => {
    try {
        // Only allow seeding if the DB is empty or for testing
        const count = await User.countDocuments();
        if (count > 10) return res.status(400).json({ message: "Already seeded" });

        const demoUsers = [
            { username: 'JaneDoe', fullName: 'Jane Doe', email: 'jane@demo.com', password: 'hashed' },
            { username: 'JohnDoe', fullName: 'John Doe', email: 'john@demo.com', password: 'hashed' },
            { username: 'PralayDev', fullName: 'Pralay Designer', email: 'pralay@demo.com', password: 'hashed' }
        ];

        // This is simplified. In real seed we'd hash passwords.
        // For now, let's just create some posts for the EXISTING user and maybe 1-2 new ones.
        
        const contentExamples = [
            "Just launched the new UI! What do you guys think? 🚀",
            "Designing a unique experience is always better than following trends.",
            "Who else loves glassmorphism in web design? ✨",
            "The future of social media is here. 100x better than Insta!"
        ];

        for (let i = 0; i < 5; i++) {
            await new Post({
                user: req.user._id,
                content: contentExamples[i % contentExamples.length],
                image: "mynew.png"
            }).save();
        }

        res.json({ message: "Demo posts created for your profile!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
