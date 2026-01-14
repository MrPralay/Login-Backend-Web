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
  }
});

module.exports = mongoose.model('User', userSchema);