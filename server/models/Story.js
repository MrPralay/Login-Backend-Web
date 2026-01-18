const mongoose = require('mongoose');

const storySegmentSchema = new mongoose.Schema({
    media: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    createdAt: { type: Date, default: Date.now },
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const storySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    segments: [storySegmentSchema],
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
});

// Index for efficient expiry cleanup
storySchema.index({ expiresAt: 1 });

// Virtual to check if story is expired
storySchema.virtual('isExpired').get(function() {
    return Date.now() > this.expiresAt;
});

// Pre-validate hook to set expiry (24 hours from creation)
storySchema.pre('validate', function() {
    if (this.isNew && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
});

module.exports = mongoose.model('Story', storySchema);
