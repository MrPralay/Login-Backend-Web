const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    image: {
        type: String,
        default: ""
    },
    title: { type: String, trim: true },
    location: { type: String, trim: true },
    hashtags: [{ type: String }],
    isLocked: { type: Boolean, default: false },
    passcode: { type: String, default: null },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Shared Stories support
    isSharedStory: { type: Boolean, default: false },
    originalStory: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' }
});

module.exports = mongoose.model('Post', postSchema);
