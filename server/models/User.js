const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  // THE DOUBLE LOCK: Stores the unique ID of the current active session
  currentSessionId: { 
    type: String, 
    default: null 
  },
  // THE MASTER KEY: Stores the temporary ID used for the "Inspect" redirect trick
  authId: {
    type: String,
    default: null
  },
  // --- THE TIMER ADDITION ---
  // Stores the exact time the Master Key was created so we can expire it after 15 mins
  authIdCreatedAt: {
    type: Date,
    default: null
  },
  // --- PERSONAL DETAILS ---
  bio: {
    type: String,
    default: ""
  },
  fullName: {
    type: String,
    default: ""
  },
  profilePicture: {
    type: String,
    default: ""
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    type: String,
    default: "New York, USA"
  },
  onlineStatus: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  // --- SOCIAL FEATURES ---
  isPrivate: {
    type: Boolean,
    default: false
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  stories: [{
    image: String,
    createdAt: { type: Date, default: Date.now }
  }],
  // --- SETTINGS & SECURITY ---
  chatLockPasscode: {
    type: String,
    default: null
  },
  isChatLocked: {
    type: Boolean,
    default: false
  },
  notificationSettings: {
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    newFollowers: { type: Boolean, default: true },
    messages: { type: Boolean, default: true }
  },
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  activity: [{
    type: { type: String }, // 'like', 'follow', 'comment', etc.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    text: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
});
module.exports = mongoose.model('User', userSchema);