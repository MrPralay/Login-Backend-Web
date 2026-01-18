document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const navItems = document.querySelectorAll('.nav-item');
    const feedContainer = document.getElementById('feed-container');
    const storiesRow = document.getElementById('stories-container');
    const requestsList = document.getElementById('follow-requests-list');
    const suggestionsList = document.getElementById('suggestions-list');
    const loadingBar = document.getElementById('loading-bar');
    // const setModal = document.getElementById('settings-modal'); 

    // Stats and Identifiers
    const mePostsCount = document.getElementById('prof-posts-count');
    const meFollowersCount = document.getElementById('prof-followers-count');
    const meFollowingCount = document.getElementById('prof-following-count');
    const feedView = document.getElementById('feed-view');
    const profileView = document.getElementById('profile-view');
    const profileContentArea = document.getElementById('profile-content-area');

    const createPostModal = document.getElementById('create-post-modal');
    const postFileInput = document.getElementById('post-file-input');
    const mediaPreview = document.getElementById('media-preview');
    const sharePostBtn = document.getElementById('share-post-btn');
    const backCreatePost = document.getElementById('back-create-post');
    const postCaption = document.getElementById('post-caption');
    const storyFileInput = document.getElementById('story-file-input');

    let selectedFileBase64 = null;

    // --- POST CREATION LOGIC ---
    // --- TOAST NOTIFICATION LOGIC ---
    function showToast(message, type = 'normal') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        
        container.appendChild(toast);

        // Remove after 3s
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- POST CREATION LOGIC ---
    // New Inputs
    const postTitle = document.getElementById('post-title');
    const postLocation = document.getElementById('post-location');
    const postHashtags = document.getElementById('post-hashtags');
    const postLockToggle = document.getElementById('post-lock-toggle');
    
    // Passcode Logic Elements
    const postPasscode = document.getElementById('post-passcode');
    const postLockInputArea = document.getElementById('post-lock-input-area');
    const btnSetPasscode = document.getElementById('btn-set-passcode');
    const btnChangePasscode = document.getElementById('btn-change-passcode');
    const passcodeSetDisplay = document.getElementById('passcode-set-display');
    const passcodeInputGroup = document.getElementById('passcode-input-group');
    
    // Footer Buttons
    const closeFooterBtn = document.getElementById('close-footer-btn');
    const shareFooterBtn = document.getElementById('share-footer-btn');

    let currentPasscodeValue = null;

    // Toggle Lock UI
    postLockToggle.onchange = (e) => {
        if (e.target.checked) {
            postLockInputArea.classList.remove('hidden');
        } else {
            postLockInputArea.classList.add('hidden');
            // Reset passcode state if unchecked? User might want to keep it.
            // Let's keep data but hide UI.
        }
    };

    // Set Passcode Logic
    btnSetPasscode.onclick = () => {
        const code = postPasscode.value.trim();
        if (code.length !== 4 || isNaN(code)) {
            showToast('Passcode must be 4 digits', 'error');
            return;
        }
        currentPasscodeValue = code;
        passcodeInputGroup.classList.add('hidden');
        passcodeSetDisplay.classList.remove('hidden');
        showToast('Passcode set successfully', 'success');
    };

    // Change Passcode Logic
    btnChangePasscode.onclick = () => {
        currentPasscodeValue = null;
        postPasscode.value = '';
        passcodeInputGroup.classList.remove('hidden');
        passcodeSetDisplay.classList.add('hidden');
    };

    postFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            selectedFileBase64 = event.target.result;
            mediaPreview.innerHTML = '';
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = selectedFileBase64;
                mediaPreview.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = selectedFileBase64;
                video.controls = true;
                mediaPreview.appendChild(video);
            }
            // Update modal UI info
            document.getElementById('modal-me-username').textContent = me.username;
            document.getElementById('modal-me-pfp').src = me.profilePicture || 'me.png';
            
            // Allow clicking again
            postFileInput.value = ''; 
            
            createPostModal.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    };

    // Both buttons close logic
    const closeCreateLogic = () => {
        createPostModal.classList.add('hidden');
        postFileInput.value = ''; 
        resetPostForm();
    };
    backCreatePost.onclick = closeCreateLogic;
    closeFooterBtn.onclick = closeCreateLogic;

    function resetPostForm() {
        postCaption.value = '';
        postTitle.value = '';
        postLocation.value = '';
        postHashtags.value = '';
        
        // Reset Passcode Logic
        postPasscode.value = '';
        currentPasscodeValue = null;
        postLockToggle.checked = false;
        postLockInputArea.classList.add('hidden');
        passcodeInputGroup.classList.remove('hidden');
        passcodeSetDisplay.classList.add('hidden');
        
        selectedFileBase64 = null;
    }

    shareFooterBtn.onclick = async () => {
        if (!selectedFileBase64) return;
        
        // Validation for Locked
        const isLocked = postLockToggle.checked;
        
        if (isLocked) {
             if (!currentPasscodeValue) {
                 showToast('Please SET the passcode first', 'error');
                 return;
             }
        }

        showLoading(true);
        try {
            // Process Hashtags
            const tags = postHashtags.value.split(/[\s,]+/).filter(t => t.trim().length > 0);

            const res = await fetch('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postCaption.value,
                    image: selectedFileBase64,
                    title: postTitle.value,
                    location: postLocation.value,
                    hashtags: tags,
                    isLocked,
                    passcode: isLocked ? currentPasscodeValue : null
                })
            });

            if (res.ok) {
                closeCreateLogic();
                showToast('Post shared successfully!', 'success');
                // Refresh data
                await init(); 
                if (!profileView.classList.contains('hidden')) renderProfile();
                if (!feedView.classList.contains('hidden')) loadFeed();
            } else {
                showToast('Failed to share post', 'error');
            }
        } catch (err) {
            console.error(err);
        } finally {
            showLoading(false);
        }
    };

    let me = null;
    let myPosts = [];

    // --- INITIALIZATION ---
    async function init() {
        showLoading(true);
        loadStories(); // Start loading stories
        try {
            const [pRes, postsRes] = await Promise.all([
                fetch('/api/user/profile'),
                fetch('/api/social/my-posts')
            ]);

            if (pRes.ok) {
                me = await pRes.json();
                if (postsRes.ok) myPosts = await postsRes.json();
                
                updateMeUI();
                loadFeed();
                loadStories();
                loadRequests();
                loadSuggestions();
            } else {
                window.location.href = '/';
            }
        } catch (err) {
            console.error(err);
        } finally {
            showLoading(false);
        }
    }

    function updateMeUI() {
        // Updated for profile view
        document.getElementById('profile-pfp-large').src = me.profilePicture || 'me.png';
        document.getElementById('profile-username').innerHTML = `${me.username} ${me.isPrivate ? '<i class="fa-solid fa-lock" style="font-size: 0.9rem; margin-left: 5px;"></i>' : ''}`;
        document.getElementById('prof-fullname').textContent = me.fullName || me.username;
        document.getElementById('prof-bio').textContent = me.bio || 'Digital Creator | Explorer';
        
        mePostsCount.textContent = '0'; // We'll update this based on actual posts
        meFollowersCount.textContent = formatStat(me.followersCount);
        meFollowingCount.textContent = formatStat(me.followingCount);
        
        document.getElementById('total-followers-text').textContent = formatStat(me.followersCount);
        renderProfile();
    }

    function formatStat(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num;
    }

    function showLoading(show) {
        loadingBar.style.width = show ? '40%' : '100%';
        if (!show) setTimeout(() => loadingBar.style.width = '0', 300);
    }

    // --- NAVIGATION ---
    navItems.forEach(item => {
        item.onclick = () => {
            const tabId = item.getAttribute('data-tab');

            // Action-only items (don't switch view)
            if (tabId === 'create') {
                postFileInput.click();
                return;
            }
            if (tabId === 'settings') {
                populateSettings();
                setModal.classList.remove('hidden');
                // We keep the underlying view active (feed or profile)
                // But we highlight 'settings' icon to show where we are?
                // User requested previously: "after quiting setting it will show nothing clicked" -> "show nothing clicked" meaning revert to previous.
                // Actually user said: "when we clicks setting it shows as orage ... but when cross it ... still orange ... if i make that after quiting setting it will show nothing clicked"
                // My fix for that was to restore state on close.
                // So here we CAN set 'active' on settings, because close handler restores it.
            }

            // Normal Navigation
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            if (tabId === 'settings') {
                // Already handled opening above, but we still want it 'active'
                return; 
            } else if (tabId === 'home') {
                feedView.classList.remove('hidden');
                profileView.classList.add('hidden');
                loadFeed();
            } else if (tabId === 'profile') {
                feedView.classList.add('hidden');
                profileView.classList.remove('hidden');
                renderProfile();
            } else if (tabId === 'create') {
                showToast('Create post functionality coming soon!');
            } else if (tabId === 'search') {
                showToast('Search functionality coming soon!');
            } else if (tabId === 'messenger') {
                showToast('Messenger coming soon!');
            }
        };
    });

    // --- STORIES ---
    let activeStories = []; 
    let currentStoryUserIndex = 0;
    let currentStorySegmentIndex = 0;
    let storyTimer = null;

    async function loadStories() {
        try {
            const addStoryBtn = document.getElementById('add-story-btn');
            const addStoryPfp = document.getElementById('add-story-pfp');
            if (me) addStoryPfp.src = me.profilePicture || 'me.png';
            
            addStoryBtn.onclick = () => storyFileInput.click();

            const res = await fetch('/api/social/stories');
            activeStories = await res.json();
            
            // Clear dynamic stories (keep Add Story)
            const dynamicStories = storiesRow.querySelectorAll('.story-circle:not(.add-story)');
            dynamicStories.forEach(s => s.remove());

            activeStories.forEach((group, index) => {
                const div = document.createElement('div');
                div.className = `story-circle ${group.hasUnviewed ? 'unviewed' : 'viewed'}`;
                div.innerHTML = `
                    <div class="story-img">
                        <img src="${group.user.profilePicture || 'me.png'}" onerror="this.src='me.png'">
                    </div>
                    <span>${group.user.username === me.username ? 'Your Story' : group.user.username}</span>
                `;
                div.onclick = () => startViewingStories(index);
                storiesRow.appendChild(div);
            });
        } catch (err) {
            console.error('Error loading stories:', err);
        }
    }

    storyFileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            
            showLoading(true);
            try {
                const res = await fetch('/api/social/story', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ media: base64, mediaType })
                });
                
                if (res.ok) {
                    showToast('Story added successfully!', 'success');
                    loadStories(); // Refresh
                } else {
                    showToast('Failed to upload story', 'error');
                }
            } catch (err) { 
                console.error(err); 
                showToast('Error uploading story', 'error');
            } finally { 
                showLoading(false); 
                storyFileInput.value = ''; // Reset
            }
        };
        reader.readAsDataURL(file);
    };

    function startViewingStories(userIndex) {
        currentStoryUserIndex = userIndex;
        currentStorySegmentIndex = 0;
        openStoryViewer();
    }

    const storyViewerModal = document.getElementById('story-viewer-modal');
    const storyMediaContainer = document.getElementById('story-media-container');
    const storyProgressBar = document.getElementById('story-progress'); // Old one, we'll use a new container logic
    const storyProgressBarContainer = document.querySelector('.story-progress-bar-container');

    function openStoryViewer() {
        const userGroup = activeStories[currentStoryUserIndex];
        const segment = userGroup.story.segments[currentStorySegmentIndex];
        
        storyViewerModal.classList.remove('hidden');
        
        // Update User Info
        document.getElementById('story-user-pfp').src = userGroup.user.profilePicture || 'me.png';
        document.getElementById('story-username').textContent = userGroup.user.username;
        document.getElementById('story-time').textContent = formatTime(segment.createdAt);

        // Update Media
        storyMediaContainer.innerHTML = '';
        if (segment.mediaType === 'video') {
            const video = document.createElement('video');
            video.src = segment.media;
            video.autoplay = true;
            video.onloadedmetadata = () => startSegmentTimer(video.duration * 1000);
            storyMediaContainer.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = segment.media;
            storyMediaContainer.appendChild(img);
            startSegmentTimer(5000);
        }

        // Setup Progress Bars
        renderProgressBars(userGroup.story.segments.length);
        
        // Record View
        markSegmentViewed(userGroup.story._id, segment._id);

        // Setup Action Buttons
        const likeBtn = document.getElementById('story-like-btn');
        const isLiked = segment.likes.some(v => (v._id || v) === me._id);
        likeBtn.className = isLiked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart';
        likeBtn.style.color = isLiked ? '#ed4956' : '#fff';
        
        likeBtn.onclick = async () => {
            const res = await fetch(`/api/social/story/${userGroup.story._id}/segment/${segment._id}/like`, { method: 'POST' });
            const data = await res.json();
            segment.likes = data.liked ? [...segment.likes, me._id] : segment.likes.filter(id => id !== me._id);
            openStoryViewer(); // Refresh UI
        };

        // Viewer List Logic
        const viewersBtn = document.getElementById('story-viewers-btn');
        if (userGroup.user._id === me._id) {
            viewersBtn.classList.remove('hidden');
            document.getElementById('story-viewers-count').textContent = `${segment.views.length} viewers`;
            viewersBtn.onclick = () => showViewersOverlay(userGroup.story._id);
        } else {
            viewersBtn.classList.add('hidden');
        }

        // Share Story Logic
        document.getElementById('story-share-btn').onclick = async () => {
            if (storyTimer) clearTimeout(storyTimer); // Pause
            if (confirm('Share this story to your feed?')) {
                try {
                    const res = await fetch(`/api/social/story/${userGroup.story._id}/segment/${segment._id}/share`, { method: 'POST' });
                    if (res.ok) {
                        showToast('Story shared to your feed!', 'success');
                    } else {
                        showToast('Failed to share story', 'error');
                    }
                } catch (err) {
                    console.error(err);
                }
            }
            openStoryViewer(); // Resume/Restart
        };
    }

    function renderProgressBars(count) {
        storyProgressBarContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const segment = document.createElement('div');
            segment.className = 'story-progress-segment';
            const fill = document.createElement('div');
            fill.className = 'story-progress-fill';
            if (i < currentStorySegmentIndex) fill.style.width = '100%';
            segment.appendChild(fill);
            storyProgressBarContainer.appendChild(segment);
        }
    }

    function startSegmentTimer(duration) {
        if (storyTimer) clearTimeout(storyTimer);
        
        const fills = document.querySelectorAll('.story-progress-fill');
        const currentFill = fills[currentStorySegmentIndex];
        
        currentFill.style.transition = 'none';
        currentFill.style.width = '0%';
        currentFill.offsetHeight; // reflow
        currentFill.style.transition = `width ${duration}ms linear`;
        currentFill.style.width = '100%';

        storyTimer = setTimeout(() => {
            nextStorySegment();
        }, duration);
    }

    function nextStorySegment() {
        const userGroup = activeStories[currentStoryUserIndex];
        if (currentStorySegmentIndex < userGroup.story.segments.length - 1) {
            currentStorySegmentIndex++;
            openStoryViewer();
        } else if (currentStoryUserIndex < activeStories.length - 1) {
            currentStoryUserIndex++;
            currentStorySegmentIndex = 0;
            openStoryViewer();
        } else {
            closeStoryViewer();
        }
    }

    function closeStoryViewer() {
        if (storyTimer) clearTimeout(storyTimer);
        storyViewerModal.classList.add('hidden');
        loadStories(); // Refresh seen states
    }

    document.getElementById('close-story-btn').onclick = closeStoryViewer;

    async function markSegmentViewed(storyId, segmentId) {
        try {
            await fetch(`/api/social/story/${storyId}/segment/${segmentId}/view`, { method: 'POST' });
        } catch (err) {}
    }

    // Viewers Overlay Logic
    const viewersOverlay = document.getElementById('story-viewers-overlay');
    async function showViewersOverlay(storyId) {
        if (storyTimer) clearTimeout(storyTimer); // Pause story
        
        viewersOverlay.classList.remove('hidden');
        const listContainer = document.getElementById('story-viewers-list');
        listContainer.innerHTML = '<p>Loading viewers...</p>';

        try {
            const res = await fetch(`/api/social/story/${storyId}/viewers`);
            const data = await res.json();
            listContainer.innerHTML = '';
            
            if (data.viewers.length === 0) {
                listContainer.innerHTML = '<p style="text-align:center; color: #999;">No viewers yet</p>';
            }

            data.viewers.forEach(viewer => {
                const div = document.createElement('div');
                div.className = 'viewer-item';
                div.innerHTML = `
                    <img src="${viewer.profilePicture || 'me.png'}">
                    <b>${viewer.username}</b>
                `;
                listContainer.appendChild(div);
            });
        } catch (err) {
            console.error(err);
        }
    }

    document.getElementById('close-viewers-btn').onclick = () => {
        viewersOverlay.classList.add('hidden');
        // Resume story? For simplicity, we'll just keep it paused or user can restart.
        // Let's restart the current segment.
        openStoryViewer();
    };

    // --- REQUESTS ---
    async function loadRequests() {
        try {
            const res = await fetch('/api/social/requests');
            const requests = await res.json();
            document.getElementById('request-badge').textContent = requests.length;
            requestsList.innerHTML = '';
            requests.forEach(req => {
                const item = document.createElement('div');
                item.className = 'user-item-mini';
                item.innerHTML = `
                    <img src="${req.profilePicture || 'me.png'}">
                    <div class="user-info-text">
                        <b>${req.fullName || req.username}</b>
                        <span>${req.location || 'NYC'} wants to add you</span>
                        <div class="request-actions">
                            <button class="btn-accept" data-id="${req._id}">Accept</button>
                            <button class="btn-decline" data-id="${req._id}">Decline</button>
                        </div>
                    </div>
                `;
                requestsList.appendChild(item);
            });

            // Action listeners
            requestsList.querySelectorAll('button').forEach(btn => {
                btn.onclick = async () => {
                    const action = btn.classList.contains('btn-accept') ? 'accept' : 'decline';
                    const id = btn.getAttribute('data-id');
                    await fetch(`/api/social/requests/${id}/${action}`, { method: 'POST' });
                    loadRequests();
                    init(); // Refresh following counts
                };
            });
        } catch (err) {}
    }

    // --- SUGGESTIONS ---
    async function loadSuggestions() {
        try {
            const res = await fetch('/api/social/suggestions');
            const users = await res.json();
            suggestionsList.innerHTML = '';
            users.slice(0, 5).forEach(u => {
                const div = document.createElement('div');
                div.className = 'user-item-mini';
                div.innerHTML = `
                    <img src="${u.profilePicture || 'me.png'}">
                    <div class="user-info-text">
                        <b>${u.fullName || u.username}</b>
                        <span>${u.location || 'USA'}</span>
                    </div>
                    <i class="fa-solid fa-plus btn-follow-add" data-id="${u._id}"></i>
                `;
                suggestionsList.appendChild(div);
            });

            suggestionsList.querySelectorAll('.btn-follow-add').forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.getAttribute('data-id');
                    await fetch(`/api/social/follow/${id}`, { method: 'POST' });
                    loadSuggestions();
                };
            });
        } catch (err) {}
    }

    // --- FEED LOGIC ---
    async function loadFeed() {
        feedContainer.innerHTML = '<div class="empty-state"><p>Loading elite feed...</p></div>';
        try {
            const res = await fetch('/api/social/feed');
            const posts = await res.json();
            renderPostsElite(posts);
        } catch (err) {
            console.error(err);
        }
    }

    function renderPostsElite(posts) {
        if (posts.length === 0) {
            feedContainer.innerHTML = '<div class="empty-state"><p>No posts to show.</p></div>';
            return;
        }

        feedContainer.innerHTML = '';
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            
            let mediaContent = '';
            
            // Locked Content Logic
            if (post.isLocked && !post.image) {
                mediaContent = `
                    <div class="post-image-grid has-lock-overlay" onclick="unlockPost('${post._id}', this)">
                        <div class="locked-overlay">
                            <i class="fa-solid fa-lock"></i>
                            <span>Private Content</span>
                            <small>Tap to Unlock</small>
                        </div>
                        <div style="height: 300px; background: #000;"></div>
                    </div>`;
            } else if (post.image) {
                // Video check
                const isVideo = (post.image.includes('data:video') || post.image.endsWith('.mp4'));
                mediaContent = `
                    <div class="post-image-grid">
                        ${isVideo 
                            ? `<video src="${post.image}" controls></video>` 
                            : `<img src="${post.image}">`}
                    </div>`;
            }

            card.innerHTML = `
                <div class="post-user">
                    <img src="${post.user.profilePicture || 'me.png'}" onerror="this.src='me.png'">
                    <div class="post-user-info">
                        <b>${post.user.fullName || post.user.username}</b>
                        <span>@${post.user.username} · ${formatTime(post.createdAt)}</span>
                        ${post.location ? `<div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${post.location}</div>` : ''}
                    </div>
                    <i class="fa-solid fa-ellipsis" style="margin-left: auto; color: #ccc; cursor: pointer;"></i>
                </div>
                <div class="post-content">
                    ${post.title ? `<strong>${post.title}</strong><br>` : ''}
                    ${post.content}
                    ${post.hashtags && post.hashtags.length > 0 ? `<br><small style="color:#0095f6;">${post.hashtags.map(t=>'#'+t).join(' ')}</small>` : ''}
                </div>
                ${mediaContent}
                <div class="post-actions-elite">
                    <div class="like-btn" data-id="${post._id}">
                        <i class="fa-regular fa-heart"></i>
                        <span>${post.likes?.length || '0'}</span>
                    </div>
                    <div>
                        <i class="fa-regular fa-comment"></i>
                        <span>${post.comments?.length || '0'}</span>
                    </div>
                </div>
            `;
            feedContainer.appendChild(card);
            
            // Events
            const likeBtn = card.querySelector('.like-btn');
            const isLiked = post.likes && post.likes.includes(me._id);
            updateLikeBtnUI(likeBtn.querySelector('i'), isLiked);
            
            likeBtn.onclick = () => toggleLike(post._id, likeBtn);
        });
    }

    // Expose unlock function to global scope (hacky but works for onclick string)
    window.unlockPost = async (postId, element) => {
        const passcode = prompt('Enter 4-digit passcode to unlock:');
        if (!passcode) return;

        try {
            const res = await fetch(`/api/social/post/${postId}/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode })
            });

            if (res.ok) {
                const data = await res.json();
                showToast('Content unlocked!', 'success');
                // Replace content
                const isVideo = (data.image.includes('data:video') || data.image.endsWith('.mp4'));
                element.outerHTML = `
                    <div class="post-image-grid">
                        ${isVideo 
                            ? `<video src="${data.image}" controls autoplay></video>` 
                            : `<img src="${data.image}">`}
                    </div>`;
            } else {
                showToast('Incorrect passcode', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    };

    let currentProfileTab = 'posts';

    async function renderProfile() {
        // Use cached data to avoid delay
        profileContentArea.innerHTML = '';
        
        try {
            if (currentProfileTab === 'posts') {
                const posts = myPosts;
                mePostsCount.textContent = posts.length;

                if (posts.length === 0) {
                    profileContentArea.innerHTML = `
                        <div class="empty-state-prof">
                            <div class="empty-icon-wrap">
                                <i class="fa-solid fa-camera"></i>
                            </div>
                            <h2>Share Photos</h2>
                            <p>When you share photos, they will appear here.</p>
                            <a href="#" id="share-first-post-link" style="color: #0095f6; font-weight: 600; text-decoration: none; font-size: 0.9rem; margin-top: 10px;">Share your first post</a>
                        </div>
                    `;
                    document.getElementById('share-first-post-link').onclick = (e) => {
                        e.preventDefault();
                        document.getElementById('post-file-input').click();
                    };
                } else {
                    // ELITE GRID RENDER
                    profileContentArea.innerHTML = '<div class="grid-container"></div>';
                    const grid = profileContentArea.querySelector('.grid-container');
                    
                    posts.forEach(post => {
                        const div = document.createElement('div');
                        div.className = 'profile-grid-item';
                        
                        // Check if video
                        const isVideo = post.image && (post.image.includes('data:video') || post.image.endsWith('.mp4'));
                        
                        let mediaHtml = isVideo 
                            ? `<video src="${post.image}" muted></video>` 
                            : `<img src="${post.image || 'peg.png'}">`;

                        div.innerHTML = `
                            ${mediaHtml}
                            <div class="grid-overlay">
                                <div class="grid-stat">
                                    <i class="fa-solid fa-heart"></i> ${formatStat(post.likes.length)}
                                </div>
                                <div class="grid-stat">
                                    <i class="fa-solid fa-comment"></i> ${formatStat(post.comments.length)}
                                </div>
                            </div>
                            ${isVideo ? '<i class="fa-solid fa-video grid-type-icon"></i>' : ''}
                        `;
                        
                        div.onclick = () => openPostDetail(post._id);
                        grid.appendChild(div);
                    });
                }
            } else if (currentProfileTab === 'reels') {
                profileContentArea.innerHTML = `
                    <div class="empty-state-prof">
                        <div class="empty-icon-wrap">
                            <i class="fa-solid fa-clapperboard"></i>
                        </div>
                        <h2>Reels</h2>
                        <p>Reels help you grow your audience.</p>
                    </div>
                `;
            } else if (currentProfileTab === 'tagged') {
                profileContentArea.innerHTML = `
                    <div class="empty-state-prof">
                        <div class="empty-icon-wrap">
                            <i class="fa-solid fa-id-card"></i>
                        </div>
                        <h2>Photos of you</h2>
                        <p>When people tag you in photos, they'll appear here.</p>
                    </div>
                `;
            }
        } catch (err) {
            console.error(err);
        }
    }

    // --- POST DETAIL LOGIC ---
    const detailModal = document.getElementById('post-detail-modal');
    async function openPostDetail(postId) {
        showLoading(true);
        try {
            const res = await fetch(`/api/social/post/${postId}`);
            if (!res.ok) throw new Error('Post not found');
            const post = await res.json();
            
            // Populate Modal
            const container = document.getElementById('detail-media-container');
            container.innerHTML = '';
            
            const isVideo = post.image && (post.image.includes('data:video') || post.image.endsWith('.mp4'));
            if (isVideo) {
                const vid = document.createElement('video');
                vid.src = post.image;
                vid.controls = true;
                vid.autoplay = true;
                container.appendChild(vid);
            } else {
                const img = document.createElement('img');
                img.src = post.image;
                container.appendChild(img);
            }

            // User Info
            document.getElementById('detail-user-pfp').src = post.user.profilePicture || 'me.png';
            document.getElementById('detail-username').textContent = post.user.username;
            document.getElementById('detail-likes-text').textContent = `${formatStat(post.likes.length)} likes`;
            document.getElementById('detail-post-time').textContent = formatTime(post.createdAt).toUpperCase();

            // Setup Actions
            const likeBtn = document.getElementById('detail-like-btn');
            const isLiked = post.likes.includes(me.id || me._id);
            updateLikeBtnUI(likeBtn, isLiked);

            likeBtn.onclick = async () => {
                const lRes = await fetch(`/api/social/post/${post._id}/like`, { method: 'POST' });
                const lData = await lRes.json();
                document.getElementById('detail-likes-text').textContent = `${formatStat(lData.likesCount)} likes`;
                updateLikeBtnUI(likeBtn, lData.isLiked);
                // Refresh grid stats in background
                init(); 
            };
            
            // Download
            document.getElementById('detail-download-btn').onclick = () => {
                const link = document.createElement('a');
                link.href = post.image;
                link.download = `post_${post._id}`;
                link.click();
            };

            // --- HEADER ACTIONS ---
            // Close Button
            document.getElementById('close-detail-btn-header').onclick = () => {
                detailModal.classList.add('hidden');
            };

            // Options Menu logic
            const optionsBtn = document.getElementById('post-options-btn');
            const optionsMenu = document.getElementById('post-options-menu');
            const deleteOption = document.getElementById('option-delete');
            const copyLinkOption = document.getElementById('option-copy-link');
            const cancelOption = document.getElementById('option-cancel');

            // Reset menu state
            optionsMenu.classList.add('hidden');

            const isOwner = post.user._id === (me.id || me._id);
            if (isOwner) {
                deleteOption.classList.remove('hidden');
            } else {
                deleteOption.classList.add('hidden');
            }

            optionsBtn.onclick = (e) => {
                e.stopPropagation();
                optionsMenu.classList.toggle('hidden');
            };

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!optionsMenu.contains(e.target) && e.target !== optionsBtn) {
                    optionsMenu.classList.add('hidden');
                }
            });

            cancelOption.onclick = () => optionsMenu.classList.add('hidden');

            copyLinkOption.onclick = () => {
                const url = `${window.location.origin}/?post=${post._id}`;
                navigator.clipboard.writeText(url).then(() => {
                    showToast('Link copied to clipboard!', 'success');
                    optionsMenu.classList.add('hidden');
                });
            };

            deleteOption.onclick = async () => {
                if (!confirm('Are you sure you want to delete this post?')) return;
                
                try {
                    const res = await fetch(`/api/social/post/${post._id}`, { method: 'DELETE' });
                    if (res.ok) {
                        detailModal.classList.add('hidden');
                        init(); // Refresh feed/profile
                    } else {
                        showToast('Failed to delete post', 'error');
                    }
                } catch (err) {
                    console.error(err);
                }
            };

            // Comments
            const commentsList = document.getElementById('detail-comments-list');
            commentsList.innerHTML = '';
            // Add Caption as first comment if exists
            if (post.content) {
                renderCommentRow(commentsList, post.user, post.content, post.createdAt);
            }
            post.comments.forEach(c => {
                renderCommentRow(commentsList, c.user, c.text, c.createdAt);
            });

            // Add Comment Logic
            const commentInput = document.getElementById('detail-comment-input');
            const postCommentBtn = document.getElementById('post-comment-btn');
            
            postCommentBtn.onclick = async () => {
                if (!commentInput.value.trim()) return;
                const text = commentInput.value;
                commentInput.value = '';
                
                const cRes = await fetch(`/api/social/post/${post._id}/comment`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ text })
                });
                const updatedComments = await cRes.json();
                
                // Re-render comments to show new one (or just append)
                // For simplicity, re-rendering last one is okay, but let's just append the new one
                const newComment = updatedComments[updatedComments.length - 1];
                // We need the full user object for the new comment. 
                // Since the API returns populated comments, we can just use that.
                renderCommentRow(commentsList, newComment.user, newComment.text, newComment.createdAt);
                
                // Scroll to bottom
                commentsList.scrollTop = commentsList.scrollHeight;
                 // Refresh grid stats in background
                init(); 
            };

            detailModal.classList.remove('hidden');
        } catch (err) {
            console.error(err);
        } finally {
            showLoading(false);
        }
    }

    function updateLikeBtnUI(btn, isLiked) {
        if (isLiked) {
            btn.classList.remove('fa-regular');
            btn.classList.add('fa-solid', 'liked');
        } else {
            btn.classList.remove('fa-solid', 'liked');
            btn.classList.add('fa-regular');
        }
    }

    function renderCommentRow(container, user, text, date) {
        const div = document.createElement('div');
        div.className = 'comment-row';
        div.innerHTML = `
            <img src="${user.profilePicture || 'me.png'}" class="comment-pfp">
            <div class="comment-content">
                <span><b>${user.username}</b> ${text}</span>
                <span class="comment-time">${formatTime(date)}</span>
            </div>
        `;
        container.appendChild(div);
    }
    
    // Close Detail Modal (Header Button)
    document.getElementById('close-detail-btn-header').onclick = () => {
        detailModal.classList.add('hidden');
    };

    // Add profile tab switching listeners
    const profileTabs = document.querySelectorAll('.p-tab');
    profileTabs.forEach(tab => {
        tab.onclick = () => {
            profileTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentProfileTab = tab.getAttribute('data-tab');
            renderProfile();
        };
    });

    function formatTime(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return new Date(date).toLocaleDateString();
    }

    // --- CONTACTS ---
    function loadContacts() {
        const contactsList = document.getElementById('contacts-list');
        const demoContacts = [
            { name: 'Libby Katti', loc: 'Bowling Green, KY', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' },
            { name: 'Chris Manning', loc: 'Austin, Texas', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100' }
        ];
        contactsList.innerHTML = '';
        demoContacts.forEach(c => {
            const div = document.createElement('div');
            div.className = 'user-item-mini';
            div.innerHTML = `
                <img src="${c.img}">
                <div class="user-info-text"><b>${c.name}</b><span>${c.loc}</span></div>
                <i class="fa-regular fa-comment-dots" style="color: #ff7e5f;"></i>
            `;
            contactsList.appendChild(div);
        });
    }

    // --- SETTINGS LOGIC ---
    const setModal = document.getElementById('settings-modal');
    const setTabs = document.querySelectorAll('.set-tab');
    const setContentBlocks = document.querySelectorAll('.set-content-block');
    
    // Tab Switching
    setTabs.forEach(tab => {
        tab.onclick = () => {
            const tabId = tab.getAttribute('data-set-tab');
            if (!tabId) return; // For logout or custom actions

            setTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            setContentBlocks.forEach(block => block.classList.add('hidden'));
            const content = document.getElementById(`set-content-${tabId}`);
            if (content) content.classList.remove('hidden');
        };
    });

    // Populate Settings logic
    function populateSettings() {
        if (!me) return;
        document.getElementById('edit-pfp-preview').src = me.profilePicture || 'me.png';
        document.getElementById('edit-username-display').textContent = me.username;
        document.getElementById('set-fullname').value = me.fullName || '';
        document.getElementById('set-username').value = me.username;
        document.getElementById('set-bio').value = me.bio || '';
        document.getElementById('privacy-toggle').checked = me.isPrivate;
    }

    // Modal Open/Close
    // Modal Open/Close
    document.getElementById('close-settings').onclick = () => {
        setModal.classList.add('hidden');
        // Restore correct nav state
        navItems.forEach(i => i.classList.remove('active'));
        if (!profileView.classList.contains('hidden')) {
            document.querySelector('.nav-item[data-tab="profile"]').classList.add('active');
        } else {
            document.querySelector('.nav-item[data-tab="home"]').classList.add('active');
        }
    };
    
    // Profile Picture Upload
    const settingsPfpInput = document.getElementById('settings-pfp-input');
    const changePfpBtn = document.getElementById('change-pfp-btn');
    const changePfpTextBtn = document.getElementById('change-pfp-text-btn');
    
    const triggerPfpInput = () => settingsPfpInput.click();
    changePfpBtn.onclick = triggerPfpInput;
    changePfpTextBtn.onclick = triggerPfpInput;

    let newPfpBase64 = null;
    settingsPfpInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            newPfpBase64 = ev.target.result;
            document.getElementById('edit-pfp-preview').src = newPfpBase64;
        };
        reader.readAsDataURL(file);
    };

    // Save Profile
    document.getElementById('save-profile-btn').onclick = async () => {
        showLoading(true);
        try {
            const data = {
                fullName: document.getElementById('set-fullname').value,
                username: document.getElementById('set-username').value,
                bio: document.getElementById('set-bio').value
            };
            if (newPfpBase64) data.profilePicture = newPfpBase64;

            const res = await fetch('/api/social/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const updatedUser = await res.json(); // Assuming backend returns { message, user }
                if (updatedUser.user) me = updatedUser.user;
                updateMeUI();
                showToast('Profile saved!', 'success');
                document.getElementById('close-settings').click();
            } else {
                const err = await res.json();
                showToast(err.message || 'Failed to save', 'error');
            }
        } catch (err) {
            console.error(err);
        } finally {
            showLoading(false);
        }
    };

    // Privacy Toggle
    document.getElementById('privacy-toggle').onchange = async (e) => {
        const isPrivate = e.target.checked;
        try {
            const res = await fetch('/api/social/toggle-privacy', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                me.isPrivate = data.isPrivate;
                updateMeUI();
                showToast(data.message, 'success');
            } else {
                e.target.checked = !isPrivate;
                showToast('Failed to update privacy', 'error');
            }
        } catch (err) { console.error(err); }
    };

    // Logout
    document.getElementById('logout-btn').onclick = () => {
        document.cookie = 'token=; Max-Age=0; path=/;';
        window.location.href = '/';
    };

    init();
});
