const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB for seeding...");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const demoUsersData = [
            {
                username: 'katia_zuere',
                fullName: 'Katia Zuere',
                email: 'katia@demo.com',
                password: hashedPassword,
                location: 'Tallahassee, Florida',
                profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
                bio: 'Digital Designer & Explorer | Capturing moments in pixels.',
                onlineStatus: 'online'
            },
            {
                username: 'charlie_word',
                fullName: 'Charlie Word',
                email: 'charlie@demo.com',
                password: hashedPassword,
                location: 'Austin, Texas',
                profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
                bio: 'Storyteller and Visual Artist. Nature is my canvas.',
                onlineStatus: 'online'
            },
            {
                username: 'amanda_smith',
                fullName: 'Amanda Smith',
                email: 'amanda@demo.com',
                password: hashedPassword,
                location: 'New York, NYC',
                profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
                bio: 'Living my best life in the city that never sleeps.',
                onlineStatus: 'away'
            }
        ];

        const demoUsers = [];
        for (const userData of demoUsersData) {
            let u = await User.findOne({ username: userData.username });
            if (!u) {
                u = new User(userData);
                await u.save();
            } else {
                Object.assign(u, userData);
                await u.save();
            }
            demoUsers.push(u);
        }

        // Add stories
        for (const u of demoUsers) {
            u.stories = [
                { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400' },
                { image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400' }
            ];
            await u.save();
        }

        // Add posts for Charlie
        const charlie = demoUsers.find(u => u.username === 'charlie_word');
        const posts = [
            {
                user: charlie._id,
                content: "Cool summer breezes rustling the leaves and the whisper of a mountain stream. Children laughing as they try to catch fireflies in the fading light. Dad remembering the first trout that rose to his elk hair caddis pattern after a perfect cast. #nature #summer #vibes",
                image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200",
                createdAt: new Date()
            }
        ];

        await Post.deleteMany({ user: charlie._id });
        await Post.insertMany(posts);

        // Add follow requests to the FIRST user in DB (presumably the main user)
        const mainUser = await User.findOne({ username: { $nin: demoUsersData.map(d => d.username) } });
        if (mainUser) {
            mainUser.followRequests = [demoUsers[0]._id, demoUsers[2]._id];
            await mainUser.save();
            console.log(`Added follow requests to ${mainUser.username}`);
        }

        console.log("Elite demo data seeded successfully!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
