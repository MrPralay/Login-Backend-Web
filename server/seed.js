const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
require('dotenv').config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB for seeding...");

        // Find a user to assign posts to (or create a demo one)
        let mainUser = await User.findOne();
        if (!mainUser) {
            console.log("No users found. Please register first.");
            process.exit(0);
        }

        const posts = [
            {
                user: mainUser._id,
                content: "Just redefined the future of social networking. The elite connection starts here. 💎 #EliteUX",
                image: "mynew.png"
            },
            {
                user: mainUser._id,
                content: "Minimalism is not the lack of something. It's the perfect amount of everything. ✨",
                image: "mynew.png"
            },
            {
                user: mainUser._id,
                content: "The bridge between logic and magic is design. 🚀 #AgenticSystems",
                image: "mynew.png"
            }
        ];

        await Post.insertMany(posts);
        console.log("Successfully seeded elite posts!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
