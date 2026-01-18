const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Story = require('../models/Story');
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
        const isRequested = userToFollow.followRequests.includes(currentUser._id);

        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(id => id.toString() !== userToFollow._id.toString());
            userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== currentUser._id.toString());
            await currentUser.save();
            await userToFollow.save();
            return res.json({ message: 'Unfollowed', isFollowing: false });
        } else if (isRequested) {
            // Cancel request
            userToFollow.followRequests = userToFollow.followRequests.filter(id => id.toString() !== currentUser._id.toString());
            await userToFollow.save();
            return res.json({ message: 'Request cancelled', isRequested: false });
        } else {
            // Follow logic
            if (userToFollow.isPrivate) {
                // Private: add to requests
                userToFollow.followRequests.push(currentUser._id);
                await userToFollow.save();
                return res.json({ message: 'Request sent', isRequested: true });
            } else {
                // Public: direct follow
                currentUser.following.push(userToFollow._id);
                userToFollow.following.includes(currentUser._id);
                userToFollow.followers.push(currentUser._id);
                
                // Add Activity
                userToFollow.activity.push({
                    type: 'follow',
                    user: currentUser._id,
                    text: 'started following you'
                });

                await currentUser.save();
                await userToFollow.save();
                return res.json({ message: 'Followed', isFollowing: true });
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET FOLLOW REQUESTS ---
router.get('/requests', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('followRequests', 'username fullName profilePicture location');
        res.json(user.followRequests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ACCEPT / DECLINE REQUEST ---
router.post('/requests/:id/:action', protect, async (req, res) => {
    try {
        const { id, action } = req.params; // action: 'accept', 'decline'
        const currentUser = await User.findById(req.user._id);
        const requestUser = await User.findById(id);

        if (!requestUser) return res.status(404).json({ message: 'User not found' });

        // Remove from followRequests
        currentUser.followRequests = currentUser.followRequests.filter(rid => rid.toString() !== id);

        if (action === 'accept') {
            currentUser.followers.push(requestUser._id);
            requestUser.following.push(currentUser._id);

            // Add Activity to both? Usually just the one being followed
            currentUser.activity.push({
                type: 'follow',
                user: requestUser._id,
                text: 'started following you'
            });

            await requestUser.save();
        }
        
        await currentUser.save();
        res.json({ message: `Request ${action}ed` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET SUGGESTIONS ---
router.get('/suggestions', protect, async (req, res) => {
    try {
        const users = await User.find({
            _id: { $nin: [...req.user.following, req.user._id] }
        })
        .select('username fullName profilePicture location')
        .limit(10);
        res.json(users);
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
        const { fullName, username, bio, profilePicture, isPrivate, notificationSettings } = req.body;
        const user = await User.findById(req.user._id);

        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ message: 'Username is already taken' });
            }
            user.username = username;
        }

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
// --- CREATE POST ---
router.post('/post', protect, async (req, res) => {
    try {
        const { content, image, title, location, hashtags, isLocked, passcode } = req.body;
        const newPost = new Post({
            user: req.user._id,
            content,
            image,
            title,
            location,
            hashtags,
            isLocked,
            passcode
        });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET MY POSTS ---
router.get('/my-posts', protect, async (req, res) => {
    try {
        const posts = await Post.find({ user: req.user._id })
            .populate('user', 'username fullName profilePicture')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET SINGLE POST (With Privacy) ---
router.get('/post/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('user', 'username profilePicture isPrivate followers') // Need followers/isPrivate for check
            .populate({
                path: 'comments',
                populate: { path: 'user', select: 'username profilePicture' }
            });

        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Privacy Check
        const isOwner = post.user._id.toString() === req.user._id.toString();
        const isPublic = !post.user.isPrivate;
        const isFollowing = post.user.followers.includes(req.user._id);

        if (!isPublic && !isFollowing && !isOwner) {
            return res.status(403).json({ message: 'This account is private' });
        }

        // Locked Content Check
        if (post.isLocked && !isOwner) {
            post.image = null; // Redact image
            // We keep title/content visible? Plan said "Locked Content placeholder". 
            // Usually we hide the image but maybe show minimal info.
            // Let's redact image. The frontend handles the "Locked" overlay using isLocked flag.
        }

        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- UNLOCK POST ---
router.post('/post/:id/unlock', protect, async (req, res) => {
    try {
        const { passcode } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.passcode === passcode) {
            return res.json({ success: true, image: post.image });
        } else {
            return res.status(401).json({ success: false, message: 'Incorrect passcode' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DELETE POST ---
router.delete('/post/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        await post.deleteOne();
        res.json({ message: 'Post deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LIKE / UNLIKE POST ---
router.post('/post/:id/like', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const likeIndex = post.likes.indexOf(req.user._id);
        let isLiked = false;
        if (likeIndex > -1) {
            post.likes.splice(likeIndex, 1);
            isLiked = false;
        } else {
            post.likes.push(req.user._id);
            isLiked = true;

            // Add Activity to post owner (if not liking own post)
            if (post.user.toString() !== req.user._id.toString()) {
                const postOwner = await User.findById(post.user);
                if (postOwner) {
                    postOwner.activity.push({
                        type: 'like',
                        user: req.user._id,
                        post: post._id,
                        text: 'liked your post'
                    });
                    await postOwner.save();
                }
            }
        }

        await post.save();
        res.json({ likesCount: post.likes.length, isLiked });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADD COMMENT ---
router.post('/post/:id/comment', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const newComment = {
            user: req.user._id,
            text: req.body.text
        };

        post.comments.push(newComment);
        await post.save();

        // Return the populated post to update UI
        const updatedPost = await Post.findById(req.params.id)
            .populate('comments.user', 'username profilePicture');
        
        res.json(updatedPost.comments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET GLOBAL FEED ---
// --- GET GLOBAL FEED ---
router.get('/feed', protect, async (req, res) => {
    try {
        let posts = await Post.find()
            .populate('user', 'username fullName profilePicture')
            .sort({ createdAt: -1 })
            .limit(50);
        
        // Redact locked posts
        posts = posts.map(post => {
            if (post.isLocked && post.user._id.toString() !== req.user._id.toString()) {
                post.image = null; 
            }
            return post;
        });

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

// ===== STORIES API =====

// Create new story or add segment to existing story
router.post('/story', protect, async (req, res) => {
    try {
        const { media, mediaType } = req.body;
        
        // Check if user has an active story (not expired)
        let story = await Story.findOne({
            user: req.user._id,
            expiresAt: { $gt: Date.now() }
        });

        if (story) {
            // Add segment to existing story
            story.segments.push({ media, mediaType });
            await story.save();
        } else {
            // Create new story
            story = new Story({
                user: req.user._id,
                segments: [{ media, mediaType }]
            });
            await story.save();
        }

        res.status(201).json(story);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all active stories from followed users + own story
router.get('/stories', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const followingIds = [...user.following, req.user._id];

        const stories = await Story.find({
            user: { $in: followingIds },
            expiresAt: { $gt: Date.now() }
        })
        .populate('user', 'username profilePicture')
        .populate('segments.views', 'username')
        .populate('segments.likes', 'username')
        .sort({ createdAt: -1 });

        // Group by user and mark if viewed (Merging segments from all story documents)
        const storiesByUser = {};
        stories.forEach(story => {
            const userId = story.user._id.toString();
            // Attach original storyId to each segment for interaction routing
            const segmentsWithId = story.segments.map(seg => ({
                ...seg.toObject(),
                storyId: story._id
            }));

            if (!storiesByUser[userId]) {
                storiesByUser[userId] = {
                    user: story.user,
                    story: { 
                        _id: story._id, // Default ID (will use segment.storyId for actions)
                        segments: segmentsWithId 
                    },
                    hasUnviewed: story.segments.some(seg => 
                        !seg.views.some(v => v._id.toString() === req.user._id.toString())
                    )
                };
            } else {
                // Merge segments and update unviewed status
                storiesByUser[userId].story.segments.push(...segmentsWithId);
                if (!storiesByUser[userId].hasUnviewed) {
                    storiesByUser[userId].hasUnviewed = story.segments.some(seg => 
                        !seg.views.some(v => v._id.toString() === req.user._id.toString())
                    );
                }
                // Sort segments by creation time to ensure chronological order
                storiesByUser[userId].story.segments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            }
        });

        res.json(Object.values(storiesByUser));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get specific user's story with all segments
router.get('/story/:userId', protect, async (req, res) => {
    try {
        const story = await Story.findOne({
            user: req.params.userId,
            expiresAt: { $gt: Date.now() }
        })
        .populate('user', 'username profilePicture')
        .populate('segments.views', 'username profilePicture')
        .populate('segments.likes', 'username');

        if (!story) {
            return res.status(404).json({ message: 'No active story found' });
        }

        res.json(story);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark segment as viewed
router.post('/story/:storyId/segment/:segmentId/view', protect, async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId);
        if (!story) return res.status(404).json({ message: 'Story not found' });

        const segment = story.segments.id(req.params.segmentId);
        if (!segment) return res.status(404).json({ message: 'Segment not found' });

        // Add view if not already viewed
        if (!segment.views.includes(req.user._id)) {
            segment.views.push(req.user._id);
            await story.save();
        }

        res.json({ message: 'View recorded' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Like/unlike segment
router.post('/story/:storyId/segment/:segmentId/like', protect, async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId);
        if (!story) return res.status(404).json({ message: 'Story not found' });

        const segment = story.segments.id(req.params.segmentId);
        if (!segment) return res.status(404).json({ message: 'Segment not found' });

        const likeIndex = segment.likes.indexOf(req.user._id);
        if (likeIndex > -1) {
            segment.likes.splice(likeIndex, 1);
        } else {
            segment.likes.push(req.user._id);
        }

        await story.save();
        res.json({ liked: likeIndex === -1, likesCount: segment.likes.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Share story segment to followers (creates a post)
router.post('/story/:storyId/segment/:segmentId/share', protect, async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId).populate('user', 'username');
        if (!story) return res.status(404).json({ message: 'Story not found' });

        const segment = story.segments.id(req.params.segmentId);
        if (!segment) return res.status(404).json({ message: 'Segment not found' });

        // Create a post sharing this story
        const post = new Post({
            user: req.user._id,
            content: `Shared ${story.user.username}'s story`,
            image: segment.media,
            isSharedStory: true,
            originalStory: story._id
        });

        await post.save();
        res.json({ message: 'Story shared successfully', post });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get list of users who viewed your story
router.get('/story/:storyId/viewers', protect, async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId)
            .populate('segments.views', 'username profilePicture');

        if (!story) return res.status(404).json({ message: 'Story not found' });

        // Check ownership
        if (story.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Collect unique viewers across all segments
        const viewersMap = new Map();
        story.segments.forEach(segment => {
            segment.views.forEach(viewer => {
                if (!viewersMap.has(viewer._id.toString())) {
                    viewersMap.set(viewer._id.toString(), viewer);
                }
            });
        });

        const viewers = Array.from(viewersMap.values());
        res.json({ viewersCount: viewers.length, viewers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a story segment
router.delete('/story/:storyId/segment/:segmentId', protect, async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId);
        if (!story) return res.status(404).json({ message: 'Story not found' });

        // Ownership check
        if (story.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Remove the segment
        if (!segment) return res.status(404).json({ message: 'Segment not found' });

        // Remove the segment using pull
        story.segments.pull({ _id: req.params.segmentId });

        // If no segments left, delete the entire story document
        if (story.segments.length === 0) {
            await Story.findByIdAndDelete(req.params.storyId);
            return res.json({ message: 'Story deleted completely', storyDeleted: true });
        }

        await story.save();
        res.json({ message: 'Segment deleted successfully', storyDeleted: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SEARCH & ACTIVITY ---

// Global Search
router.get('/search', protect, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        // Fuzzy search for username or full name
        const users = await User.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { fullName: { $regex: query, $options: 'i' } }
            ],
            _id: { $ne: req.user._id } // Exclude self
        }).select('username fullName profilePicture followers');

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Save Post (Favorites)
router.post('/post/:postId/save', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const postIndex = user.savedPosts.indexOf(req.params.postId);

        let saved = false;
        if (postIndex === -1) {
            user.savedPosts.push(req.params.postId);
            saved = true;
        } else {
            user.savedPosts.splice(postIndex, 1);
            saved = false;
        }

        await user.save();
        res.json({ saved, message: saved ? 'Post saved to favorites' : 'Post removed from favorites' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Saved Posts
router.get('/saved', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'savedPosts',
            populate: { path: 'user', select: 'username profilePicture' }
        });
        res.json(user.savedPosts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Activity Feed
router.get('/activity', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('activity.user', 'username profilePicture');
        // Return latest 50 activities
        const activities = user.activity.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cleanup expired stories (can be called by cron job or middleware)
router.delete('/stories/cleanup', protect, async (req, res) => {
    try {
        const result = await Story.deleteMany({
            expiresAt: { $lt: Date.now() }
        });

        res.json({ message: `Deleted ${result.deletedCount} expired stories` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

