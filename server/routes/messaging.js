const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get all conversations for the current user
router.get('/conversations', protect, async (req, res) => {
    try {
        const conversations = await Conversation.find({ 
            participants: req.user._id 
        })
        .populate('participants', 'username profilePicture')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        res.json(conversations);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
});

// Get/Create conversation with a specific user
router.get('/conversation/with/:userId', protect, async (req, res) => {
    try {
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, req.params.userId] }
        }).populate('participants', 'username profilePicture');

        if (!conversation) {
            conversation = new Conversation({
                participants: [req.user._id, req.params.userId]
            });
            await conversation.save();
            await conversation.populate('participants', 'username profilePicture');
        }

        const messages = await Message.find({ conversation: conversation._id })
            .sort({ createdAt: 1 });

        res.json({ conversation, messages });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch/create conversation" });
    }
});

// Send a message or share a story
router.post('/send', protect, async (req, res) => {
    try {
        const { recipientId, text, sharedStory } = req.body;

        // Find or create conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, recipientId] }
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [req.user._id, recipientId]
            });
            await conversation.save();
        }

        const message = new Message({
            conversation: conversation._id,
            sender: req.user._id,
            text: text || "",
            sharedStory: sharedStory || null
        });

        await message.save();

        // Update conversation last message
        conversation.lastMessage = message._id;
        conversation.lastMessageText = text || (sharedStory ? "Shared a story" : "");
        conversation.updatedAt = Date.now();
        await conversation.save();

        res.json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send message" });
    }
});

module.exports = router;
