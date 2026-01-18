const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    image: {
        type: String, // Base64 or URL
        required: true
    },
    type: {
        type: String,
        enum: ['image', 'video'],
        default: 'image'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Story', storySchema);
