const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: "" },
    sharedStory: {
        story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
        segmentId: { type: String },
        media: { type: String },
        mediaType: { type: String }
    },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Index for conversation message history
messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
