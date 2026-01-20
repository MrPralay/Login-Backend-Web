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
    const setModal = document.getElementById('settings-modal'); 

    function hideAllViews() {
        feedView.classList.add('hidden');
        profileView.classList.add('hidden');
        document.getElementById('messenger-view').classList.add('hidden');
        document.getElementById('search-view').classList.add('hidden');
        document.getElementById('activity-view').classList.add('hidden');
    }

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
    let savedPostsCache = null;

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
                
                // Fetch saved posts for cache
                const sRes = await fetch('/api/social/saved');
                if (sRes.ok) savedPostsCache = await sRes.json();

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
        const mNavPfp = document.getElementById('m-nav-pfp');
        if (mNavPfp) mNavPfp.src = me.profilePicture || 'me.png';

        const profUsername = document.getElementById('profile-username');
        if (profUsername) {
            profUsername.innerHTML = `${me.username} ${me.isPrivate ? '<i class="fa-solid fa-lock" style="font-size: 0.9rem; margin-left: 5px;"></i>' : ''}`;
        }

        document.getElementById('prof-fullname').textContent = me.fullName || me.username;
        document.getElementById('prof-bio').textContent = me.bio || 'Digital Creator | Explorer';

        const threadsTag = document.getElementById('prof-threads-tag');
        if (threadsTag) threadsTag.textContent = `@${me.username}`;
        
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
            } else if (tabId === 'search') {
                hideAllViews();
                document.getElementById('search-view').classList.remove('hidden');
                initSearchView();
            } else if (tabId === 'activity') {
                hideAllViews();
                document.getElementById('activity-view').classList.remove('hidden');
                // Ensure the favorites tab is active if that's what we clicked
                initActivityView('favorites'); 
            } else if (tabId === 'messenger') {
                hideAllViews();
                document.getElementById('messenger-view').classList.remove('hidden');
                openMessengerView();
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
            const plusIcon = addStoryBtn.querySelector('.plus-icon');
            
            if (me) addStoryPfp.src = me.profilePicture || 'me.png';
            
            // Standard Add logic for the plus icon
            plusIcon.onclick = (e) => {
                e.stopPropagation();
                storyFileInput.click();
            };

            const res = await fetch('/api/social/stories');
            activeStories = await res.json();
            
            // UNIFY: Find 'me' in activeStories
            const myStoryIndex = activeStories.findIndex(group => group.user.username === me.username);
            
            if (myStoryIndex !== -1) {
                const myGroup = activeStories[myStoryIndex];
                // Update 'Your Story' circle with glow/faded state
                addStoryBtn.className = `story-circle add-story ${myGroup.hasUnviewed ? 'unviewed' : 'viewed'}`;
                addStoryBtn.onclick = () => startViewingStories(myStoryIndex);
                
                // We'll keep 'activeStories' as is, but we will FILTER it for the dynamic rendering
            } else {
                // Default Add Story state
                addStoryBtn.className = 'story-circle add-story';
                addStoryBtn.onclick = () => storyFileInput.click();
            }

            // Clear dynamic stories (keep Add Story)
            const dynamicStories = storiesRow.querySelectorAll('.story-circle:not(.add-story)');
            dynamicStories.forEach(s => s.remove());

            // Render others' stories (filter out 'me' to avoid duplicates)
            activeStories.forEach((group, index) => {
                if (group.user.username === me.username) return; // Skip 'me' as it's handled by the static circle

                const div = document.createElement('div');
                div.className = `story-circle ${group.hasUnviewed ? 'unviewed' : 'viewed'}`;
                div.innerHTML = `
                    <div class="story-img">
                        <img src="${group.user.profilePicture || 'me.png'}" onerror="this.src='me.png'">
                    </div>
                    <span>${group.user.username}</span>
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
                    const errorData = await res.json();
                    showToast(errorData.error || errorData.message || 'Failed to upload story', 'error');
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
        if (!me) {
            fetch('/api/user/profile').then(res => res.json()).then(data => {
                me = data;
                openStoryViewer();
            });
            return;
        }

        const userGroup = activeStories[currentStoryUserIndex];
        const segment = userGroup.story.segments[currentStorySegmentIndex];
        
        storyViewerModal.classList.remove('hidden');
        
        // Setup Progress Bars FIRST (Required by startSegmentTimer)
        renderProgressBars(userGroup.story.segments.length);

        // Reset Menu
        const menuContainer = document.getElementById('story-menu-container');
        if (menuContainer) menuContainer.classList.add('hidden');

        // Update User Info
        document.getElementById('story-user-pfp').src = userGroup.user.profilePicture || 'me.png';
        document.getElementById('story-username').textContent = userGroup.user.username;
        document.getElementById('story-time').textContent = formatTime(segment.createdAt);
        
        markSegmentViewed(segment.storyId || userGroup.story._id, segment._id);

        const oldMedia = storyMediaContainer.querySelectorAll('img, video');
        oldMedia.forEach(m => m.remove());

        if (segment.mediaType === 'video') {
            const video = document.createElement('video');
            video.src = segment.media;
            video.autoplay = true;
            video.muted = false;
            video.playsInline = true;

            let metadataLoaded = false;
            video.onloadedmetadata = () => {
                metadataLoaded = true;
                startSegmentTimer(video.duration * 1000);
            };
            setTimeout(() => {
                if (!metadataLoaded) startSegmentTimer(10000);
            }, 5000);

            storyMediaContainer.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = segment.media;
            storyMediaContainer.appendChild(img);
            startSegmentTimer(5000);
        }

        updateStoryInteractions();

        // Bind Menu Toggle
        document.getElementById('story-menu-btn').onclick = (e) => {
            e.stopPropagation();
            toggleStoryMenu();
        };
    }

    function updateStoryInteractions() {
        if (!me) return;

        const userGroup = activeStories[currentStoryUserIndex];
        const segment = userGroup.story.segments[currentStorySegmentIndex];
        const myId = me.id || me._id;
        const storyId = segment.storyId || userGroup.story._id;

        // Setup Action Buttons
        const likeBtn = document.getElementById('story-like-btn');
        const isLiked = segment.likes.some(v => (v._id || v) === myId);
        
        likeBtn.className = isLiked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart';
        likeBtn.style.color = isLiked ? '#ed4956' : '#fff';
        
        // Clear previous event listeners if any (by cloning)
        const newLikeBtn = likeBtn.cloneNode(true);
        likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);

        newLikeBtn.onclick = async (e) => {
            e.stopPropagation();
            newLikeBtn.classList.add('heart-pop');
            setTimeout(() => newLikeBtn.classList.remove('heart-pop'), 400);

            const res = await fetch(`/api/social/story/${storyId}/segment/${segment._id}/like`, { method: 'POST' });
            const data = await res.json();
            
            if (data.liked) {
                if (!segment.likes.some(v => (v._id || v) === myId)) segment.likes.push(myId);
            } else {
                segment.likes = segment.likes.filter(v => (v._id || v) !== myId);
            }
            updateStoryInteractions(); // Update UI state
        };

        // Viewer List Logic
        const viewersBtn = document.getElementById('story-viewers-btn');
        if (userGroup.user._id === myId) {
            viewersBtn.classList.remove('hidden');
            document.getElementById('story-viewers-count').textContent = `${segment.views.length} viewers`;
            viewersBtn.onclick = (e) => {
                e.stopPropagation();
                showViewersOverlay(storyId);
            };
        } else {
            viewersBtn.classList.add('hidden');
        }

        // Share Story Logic
        const shareBtn = document.getElementById('story-share-btn');
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        
        newShareBtn.onclick = (e) => {
            e.stopPropagation();
            openShareModal({ type: 'story', data: segment });
        };
    }

    function renderProgressBars(count) {
        const container = document.querySelector('.story-progress-bar-container');
        if (!container) return;
        
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const segment = document.createElement('div');
            segment.className = 'story-progress-segment';
            const fill = document.createElement('div');
            fill.className = 'story-progress-fill';
            
            if (i < currentStorySegmentIndex) {
                fill.style.width = '100%';
            } else {
                fill.style.width = '0%';
            }
            
            segment.appendChild(fill);
            container.appendChild(segment);
        }
    }

    function startSegmentTimer(duration) {
        if (storyTimer) clearTimeout(storyTimer);
        
        const fills = document.querySelectorAll('.story-progress-fill');
        const currentFill = fills[currentStorySegmentIndex];
        
        if (!currentFill) return;

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

    function prevStorySegment() {
        if (currentStorySegmentIndex > 0) {
            currentStorySegmentIndex--;
            openStoryViewer();
        } else if (currentStoryUserIndex > 0) {
            currentStoryUserIndex--;
            // Go to the LAST segment of the previous user
            const prevUserGroup = activeStories[currentStoryUserIndex];
            currentStorySegmentIndex = prevUserGroup.story.segments.length - 1;
            openStoryViewer();
        } else {
            // Restart current segment if at the very beginning
            openStoryViewer();
        }
    }

    document.getElementById('story-next-btn').onclick = (e) => {
        e.stopPropagation();
        nextStorySegment();
    };
    document.getElementById('story-prev-btn').onclick = (e) => {
        e.stopPropagation();
        prevStorySegment();
    };

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
        openStoryViewer();
    };

    // --- STORY MENU LOGIC ---
    function toggleStoryMenu() {
        const menu = document.getElementById('story-menu-container');
        if (menu.classList.contains('hidden')) {
            if (storyTimer) clearTimeout(storyTimer); // Pause story
            renderStoryMenu();
            menu.classList.remove('hidden');
        } else {
            menu.classList.add('hidden');
            openStoryViewer(); // Resume
        }
    }

    function renderStoryMenu() {
        const menu = document.getElementById('story-menu-container');
        const userGroup = activeStories[currentStoryUserIndex];
        const segment = userGroup.story.segments[currentStorySegmentIndex];
        const myId = me.id || me._id;
        const isOwner = userGroup.user._id === myId;

        menu.innerHTML = '';

        // Copy Link Option
        const copyItem = document.createElement('div');
        copyItem.className = 'story-menu-item';
        copyItem.innerHTML = `<i class="fa-solid fa-link"></i> Copy Link`;
        copyItem.onclick = () => copyStoryLink(segment);
        menu.appendChild(copyItem);

        // Delete Option (Owners Only)
        if (isOwner) {
            const deleteItem = document.createElement('div');
            deleteItem.className = 'story-menu-item danger';
            deleteItem.innerHTML = `<i class="fa-solid fa-trash"></i> Delete Story`;
            deleteItem.onclick = () => deleteStorySegment(segment);
            menu.appendChild(deleteItem);
        }
    }

    async function deleteStorySegment(segment) {
        if (!confirm('Are you sure you want to delete this story?')) return;
        
        const storyId = segment.storyId;
        try {
            const res = await fetch(`/api/social/story/${storyId}/segment/${segment._id}`, { method: 'DELETE' });
            const data = await res.json();
            
            if (res.ok) {
                showToast('Story deleted', 'success');
                if (data.storyDeleted) {
                    // Entire story doc gone, skip to next user or close
                    location.reload(); // Simplest way to refresh states
                } else {
                    // Just one segment gone, go to next or reload
                    location.reload();
                }
            } else {
                showToast(data.message || 'Failed to delete', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    }

    function copyStoryLink(segment) {
        const url = `${window.location.origin}/social?story=${segment._id}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link copied to clipboard!', 'success');
            toggleStoryMenu(); // Close menu
        });
    }

    // Close menu on outside click
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('story-menu-container');
        const menuBtn = document.getElementById('story-menu-btn');
        if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) {
            menu.classList.add('hidden');
            openStoryViewer();
        }
    });

    // --- STORY SHARE MODAL LOGIC (UNIFIED) ---
    let selectedShareUsers = new Set();
    let currentShareObject = null; // { type: 'story'|'post', data: ... }
    let allShareFriends = [];

    async function openShareModal(contentObj) {
        if (storyTimer) clearTimeout(storyTimer); // Pause story if active
        
        currentShareObject = contentObj;
        selectedShareUsers.clear();
        document.getElementById('story-share-modal').classList.remove('hidden');
        document.getElementById('confirm-share-btn').disabled = true;
        
        const listContainer = document.getElementById('share-users-list');
        listContainer.innerHTML = '<p style="padding: 10px;">Loading connections...</p>';

        try {
            // Fetch everyone I know (followers + following)
            const res = await fetch('/api/social/suggested'); // For now, use suggested + followers
            let users = await res.json();
            
            // Filter out duplicates and me
            allShareFriends = users.filter(u => u._id !== me._id);
            renderShareList(allShareFriends);
        } catch (err) {
            console.error(err);
        }
    }

    function renderShareList(users) {
        const listContainer = document.getElementById('share-users-list');
        listContainer.innerHTML = '';
        
        if (users.length === 0) {
            listContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: #8e8e8e;">No people found.</p>';
            return;
        }

        users.forEach(user => {
            const div = document.createElement('div');
            div.className = `share-user-item ${selectedShareUsers.has(user._id) ? 'selected' : ''}`;
            div.innerHTML = `
                <div class="share-user-info">
                    <img src="${user.profilePicture || 'me.png'}">
                    <div>
                        <b>${user.username}</b>
                        <div style="font-size: 0.75rem; color: #8e8e8e;">${user.fullName || ''}</div>
                    </div>
                </div>
                <div class="share-check"></div>
            `;
            div.onclick = () => {
                if (selectedShareUsers.has(user._id)) {
                    selectedShareUsers.delete(user._id);
                    div.classList.remove('selected');
                } else {
                    selectedShareUsers.add(user._id);
                    div.classList.add('selected');
                }
                document.getElementById('confirm-share-btn').disabled = selectedShareUsers.size === 0;
            };
            listContainer.appendChild(div);
        });
    }

    let shareSearchTimeout = null;
    document.getElementById('share-user-search').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        
        // Local Filter
        const filtered = allShareFriends.filter(u => 
            u.username.toLowerCase().includes(query) || 
            (u.fullName && u.fullName.toLowerCase().includes(query))
        );
        renderShareList(filtered);

        // Global Search fallback (debounced)
        if (shareSearchTimeout) clearTimeout(shareSearchTimeout);
        if (query.length > 1) {
            shareSearchTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/social/search?q=${query}`);
                    const globalUsers = await res.json();
                    
                    // Merge global results into the local view if not already there
                    const currentIds = new Set(filtered.map(u => u._id));
                    const extras = globalUsers.filter(u => !currentIds.has(u._id) && u._id !== me._id);
                    
                    if (extras.length > 0) {
                        renderShareList([...filtered, ...extras]);
                    }
                } catch (err) {}
            }, 500);
        }
    };

    document.getElementById('close-share-btn').onclick = () => {
        document.getElementById('story-share-modal').classList.add('hidden');
        if (currentShareObject.type === 'story') {
            openStoryViewer(); // Resume only if story
        }
    };

    document.getElementById('confirm-share-btn').onclick = async () => {
        const btn = document.getElementById('confirm-share-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Sending...';

        try {
            const isStory = currentShareObject.type === 'story';
            const content = currentShareObject.data;
            
            const sharedStory = isStory ? {
                story: content.storyId,
                segmentId: content._id,
                media: content.media,
                mediaType: content.mediaType
            } : null;

            const text = isStory ? '' : `Shared a post: ${content.title || ''}`;
            // If it's a post, we might want to handle it differently in the future
            // For now, let's just send the text/data

            for (const userId of selectedShareUsers) {
                await fetch('/api/messaging/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientId: userId,
                        text: text,
                        sharedStory: sharedStory
                    })
                });
            }

            showToast('Shared successfully!', 'success');
            document.getElementById('story-share-modal').classList.add('hidden');
            if (isStory) openStoryViewer(); 
        } catch (err) {
            console.error(err);
            showToast('Failed to share', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    };

    // Close on outside click
    document.addEventListener('click', (e) => {
        const shareModal = document.getElementById('story-share-modal');
        const shareCard = document.querySelector('.share-card');
        if (shareModal && !shareModal.classList.contains('hidden') && !shareCard.contains(e.target)) {
            shareModal.classList.add('hidden');
            openStoryViewer();
        }
    });

    // --- MESSENGER LOGIC ---
    let currentConversationId = null;
    let currentChatRecipient = null;

    function openMessengerView() {
        document.getElementById('messenger-my-username').textContent = me.username;
        loadConversations();
    }

    async function loadConversations() {
        const list = document.getElementById('conversation-list');
        list.innerHTML = '<p style="padding: 20px; color: #8e8e8e;">Loading chats...</p>';

        try {
            const res = await fetch('/api/messaging/conversations');
            const conversations = await res.json();
            
            list.innerHTML = '';
            if (conversations.length === 0) {
                list.innerHTML = '<p style="padding: 20px; color: #8e8e8e; text-align: center;">No messages yet. <br> Start a chat!</p>';
            }

            conversations.forEach(conv => {
                const otherUser = conv.participants.find(p => p._id !== (me.id || me._id));
                if (!otherUser) return;

                const div = document.createElement('div');
                div.className = `conv-item ${currentConversationId === conv._id ? 'active' : ''}`;
                div.innerHTML = `
                    <img src="${otherUser.profilePicture || 'me.png'}">
                    <div class="conv-info">
                        <h4>${otherUser.username}</h4>
                        <p>${conv.lastMessageText || 'No messages yet'}</p>
                    </div>
                `;
                div.onclick = () => openConversation(conv._id, otherUser);
                list.appendChild(div);
            });
        } catch (err) {
            console.error(err);
        }
    }

    async function openConversation(convId, otherUser) {
        currentConversationId = convId;
        currentChatRecipient = otherUser;
        
        document.getElementById('messenger-main-empty').classList.add('hidden');
        document.getElementById('messenger-main-active').classList.remove('hidden');
        
        const headerPfp = document.getElementById('chat-user-pfp');
        const headerUsername = document.getElementById('chat-user-username');
        headerPfp.src = otherUser.profilePicture || 'me.png';
        headerUsername.textContent = otherUser.username;

        loadMessages(convId);
        
        // Mark as active in list
        document.querySelectorAll('.conv-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('h4').textContent === otherUser.username) {
                item.classList.add('active');
            }
        });
    }

    async function loadMessages(convId) {
        const container = document.getElementById('chat-messages-container');
        container.innerHTML = '<p style="text-align: center; color: #8e8e8e;">Loading history...</p>';

        try {
            const res = await fetch(`/api/messaging/conversation/with/${currentChatRecipient._id}`);
            const data = await res.json();
            
            container.innerHTML = '';
            data.messages.forEach(msg => renderMessage(msg));
            container.scrollTop = container.scrollHeight;
        } catch (err) {
            console.error(err);
        }
    }

    function renderMessage(msg) {
        const container = document.getElementById('chat-messages-container');
        const isOutgoing = msg.sender === (me.id || me._id);
        
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
        
        if (msg.sharedStory) {
            const storyPreview = document.createElement('div');
            storyPreview.className = 'shared-story-msg';
            if (msg.sharedStory.mediaType === 'video') {
                storyPreview.innerHTML = `
                    <video src="${msg.sharedStory.media}"></video>
                    <div class="shared-story-tag"><i class="fa-solid fa-play"></i> Story</div>
                `;
            } else {
                storyPreview.innerHTML = `
                    <img src="${msg.sharedStory.media}">
                    <div class="shared-story-tag">Story</div>
                `;
            }
            storyPreview.onclick = () => {
                // Logic to view this story segment? For now just toast
                showToast('Viewing shared story...', 'success');
            };
            bubble.appendChild(storyPreview);
        }

        if (msg.text) {
            const textSpan = document.createElement('span');
            textSpan.textContent = msg.text;
            bubble.appendChild(textSpan);
        }

        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    }

    document.getElementById('chat-send-btn').onclick = sendMessage;
    document.getElementById('chat-msg-input').onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

    async function sendMessage() {
        const input = document.getElementById('chat-msg-input');
        const text = input.value.trim();
        if (!text || !currentChatRecipient) return;

        input.value = '';
        try {
            const res = await fetch('/api/messaging/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    recipientId: currentChatRecipient._id, 
                    text 
                })
            });
            const msg = await res.json();
            renderMessage(msg);
            loadConversations(); // Update last message in list
        } catch (err) {
            console.error(err);
        }
    }

    document.getElementById('new-chat-btn').onclick = () => {
        // Suggested users to start a chat
        showToast('Select a user to start a chat!', 'info');
        // We can reuse the share modal or similar
        openNewChatSearch();
    };

    async function openNewChatSearch() {
        // Reuse suggested logic
        const res = await fetch('/api/social/suggested');
        const suggested = await res.json();
        
        // Simple prompt for now, or build a real modal
        const usernames = suggested.map(u => u.username).join(', ');
        const target = prompt(`Who would you like to message?\nOptions: ${usernames}`);
        if (!target) return;

        const user = suggested.find(u => u.username.toLowerCase() === target.toLowerCase());
        if (user) {
            openConversation(null, user);
        } else {
            showToast('User not found', 'error');
        }
    }

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

    // --- VIDEO AUTOPLAY OBSERVER ---
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.6 });

    // --- FEED LOGIC ---
    let currentFeedSort = 'latest'; // Mobile always loads latest


    function showFeedSkeleton() {
        feedContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            skeleton.innerHTML = `
                <div class="skeleton-header">
                    <div class="skeleton skeleton-pfp"></div>
                    <div class="skeleton skeleton-name"></div>
                </div>
                <div class="skeleton skeleton-media"></div>
                <div class="skeleton-footer">
                    <div class="skeleton skeleton-line"></div>
                    <div class="skeleton skeleton-line short"></div>
                </div>
            `;
            feedContainer.appendChild(skeleton);
        }
    }

    async function loadFeed() {
        showFeedSkeleton();
        try {
            const res = await fetch(`/api/social/feed?sort=${currentFeedSort}`);
            const posts = await res.json();
            renderPostsElite(posts);
        } catch (err) {
            console.error(err);
            feedContainer.innerHTML = '<div class="empty-state"><p>Failed to load feed. Please try again.</p></div>';
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
                        <div style="height: 300px; background: #000; width: 100%;"></div>
                    </div>`;
            } else if (post.image) {
                // Video check
                const isVideo = (post.image.includes('data:video') || post.image.endsWith('.mp4'));
                mediaContent = `
                    <div class="post-image-grid" ondblclick="handleDoubleTapLike('${post._id}', this)">
                        ${isVideo 
                            ? `<video src="${post.image}" controls loop></video>` 
                            : `<img src="${post.image}">`}
                    </div>`;
            }

            const isLiked = post.likes?.includes(me.id || me._id);
            const isSaved = (me.savedPosts || []).includes(post._id);

            card.innerHTML = `
                <div class="post-user">
                    <img src="${post.user.profilePicture || 'me.png'}" onerror="this.src='me.png'">
                    <div class="post-user-info">
                        <b>${post.user.username}</b>
                        ${post.location ? `<span>${post.location}</span>` : `<span>${formatTime(post.createdAt)}</span>`}
                    </div>
                    <i class="fa-solid fa-ellipsis" style="margin-left: auto; color: #8e8e8e; cursor: pointer;"></i>
                </div>
                
                ${mediaContent}

                <div class="post-actions-elite">
                    <div class="action-left">
                        <i class="${isLiked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart'}" data-btn="like" data-id="${post._id}"></i>
                        <i class="fa-regular fa-comment" onclick="openPostDetail('${post._id}')"></i>
                        <i class="fa-regular fa-paper-plane" data-btn="share" data-id="${post._id}"></i>
                        <i class="fa-solid fa-download" data-btn="download" data-id="${post._id}" data-url="${post.image}" style="font-size: 1.3rem;"></i>
                    </div>
                    <i class="${isSaved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}" data-btn="save" data-id="${post._id}" style="color: ${isSaved ? '#000' : 'inherit'}"></i>
                </div>

                <div class="post-likes-info">
                    ${formatStat(post.likes?.length || 0)} likes
                </div>

                <div class="post-content">
                    <b>${post.user.username}</b> ${post.content}
                    ${post.hashtags && post.hashtags.length > 0 ? `<br><span style="color:#00376b;">${post.hashtags.map(t=>'#'+t).join(' ')}</span>` : ''}
                </div>
                <div style="padding: 0 16px 16px 16px; font-size: 0.75rem; color: #8e8e8e; text-transform: uppercase;">
                    ${formatTimeDetailed(post.createdAt)}
                </div>
            `;
            feedContainer.appendChild(card);
            
            // Observe video if present
            const videoEl = card.querySelector('video');
            if (videoEl) videoObserver.observe(videoEl);

            // Events
            const optionsIcon = card.querySelector('.fa-ellipsis');
            optionsIcon.onclick = (e) => {
                e.stopPropagation();
                showPostOptions(post);
            };
            const likeIcon = card.querySelector('[data-btn="like"]');
            likeIcon.onclick = () => toggleLike(post._id, likeIcon);

            const saveIcon = card.querySelector('[data-btn="save"]');
            saveIcon.onclick = () => toggleSavePost(post, saveIcon);

            const shareIcon = card.querySelector('[data-btn="share"]');
            shareIcon.onclick = () => openShareModal({ type: 'post', data: post });

            const downloadIcon = card.querySelector('[data-btn="download"]');
            downloadIcon.onclick = () => downloadMedia(post.image, `post_${post._id}`);
        });
    }

    window.handleDoubleTapLike = async (postId, el) => {
        // Show heart animation
        const heart = document.createElement('i');
        heart.className = 'fa-solid fa-heart highlight-heart';
        el.appendChild(heart);
        setTimeout(() => heart.remove(), 1000);

        // Find the like icon in this card and trigger it if not liked
        const card = el.closest('.post-card');
        const likeIcon = card.querySelector('[data-btn="like"]');
        if (likeIcon.classList.contains('fa-regular')) {
            toggleLike(postId, likeIcon);
        }
    };

    async function downloadMedia(url, filename) {
        if (!url) {
            showToast('No media to download', 'error');
            return;
        }
        showToast('Starting download...', 'info');
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
            showToast('Download failed', 'error');
        }
    }

    function formatTimeDetailed(date) {
        return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    async function toggleLike(postId, icon) {
        const isLiked = icon.classList.contains('fa-solid');
        const card = icon.closest('.post-card') || document.getElementById('post-detail-modal');
        const likesText = card.querySelector('.post-likes-info') || document.getElementById('detail-likes-text');
        
        // Optimistic UI updates
        if (isLiked) {
            icon.className = 'fa-regular fa-heart';
        } else {
            icon.className = 'fa-solid fa-heart liked heart-pop';
        }

        if (likesText) {
            let count = parseInt(likesText.textContent.replace(/[^0-9]/g, '')) || 0;
            count = isLiked ? Math.max(0, count - 1) : count + 1;
            likesText.textContent = `${formatStat(count)} likes`;
        }

        try {
            const res = await fetch(`/api/social/post/${postId}/like`, { method: 'POST' });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || 'Failed to like post');
            }
            
            const data = await res.json();
            
            // Sync with actual data from server
            if (data.isLiked) {
                icon.className = 'fa-solid fa-heart liked';
            } else {
                icon.className = 'fa-regular fa-heart';
            }
            if (likesText) {
                likesText.textContent = `${formatStat(data.likesCount)} likes`;
            }
        } catch (err) { 
            console.error(err);
            // Revert on error
            if (isLiked) {
                icon.className = 'fa-solid fa-heart liked';
            } else {
                icon.className = 'fa-regular fa-heart';
            }
            // Revert likes text if possible
            if (likesText) {
                let count = parseInt(likesText.textContent.replace(/[^0-9]/g, '')) || 0;
                count = isLiked ? count + 1 : Math.max(0, count - 1);
                likesText.textContent = `${formatStat(count)} likes`;
            }
            showToast('Failed to update like', 'error');
        }
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
        if (!me) return;
        
        // INSTANT CACHE LOGIC: 
        // If we are looking at our own profile, use myPosts (cached) instead of fetching.
        let posts = [];
        
        try {
            // Check if viewing self (this is the current behavior of our profile view)
            posts = myPosts;
            
            // If we ever support viewing OTHER profiles, we'd fetch here
            // but for current 'me' profile, use myPosts
            
            profileContentArea.innerHTML = '';
            mePostsCount.textContent = posts.length;

            if (currentProfileTab === 'posts') {
                // Show everything EXCEPT videos in the 'Posts' tab (Standard Photos + Text)
                const gridPosts = posts.filter(p => {
                    const isVideo = p.image && (p.image.includes('data:video') || p.image.endsWith('.mp4'));
                    return !isVideo;
                });

                if (gridPosts.length === 0) {
                    profileContentArea.innerHTML = `
                        <div class="empty-state-prof">
                            <div class="empty-icon-wrap"><i class="fa-solid fa-camera"></i></div>
                            <h2>No Photos Yet</h2>
                            <p>When you share photos, they will appear here.</p>
                        </div>`;
                } else {
                    renderGrid(profileContentArea, gridPosts);
                }
            } else if (currentProfileTab === 'reels') {
                // Show ONLY videos
                const myReels = posts.filter(p => p.image && (p.image.includes('data:video') || p.image.endsWith('.mp4')));
                if (myReels.length === 0) {
                    profileContentArea.innerHTML = `
                        <div class="empty-state-prof">
                            <div class="empty-icon-wrap"><i class="fa-solid fa-clapperboard"></i></div>
                            <h2>No Reels</h2>
                            <p>Capture and share your moments with Reels.</p>
                        </div>`;
                } else {
                    renderGrid(profileContentArea, myReels);
                }
            } else if (currentProfileTab === 'saved') {
                loadSavedPostsForProfile(profileContentArea);
            } else {
                profileContentArea.innerHTML = `
                    <div class="empty-state-prof">
                        <div class="empty-icon-wrap"><i class="fa-solid fa-id-card"></i></div>
                        <h2>Photos of you</h2>
                        <p>When people tag you in photos, they'll appear here.</p>
                    </div>`;
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderGrid(container, posts) {
        container.innerHTML = '<div class="grid-container"></div>';
        const grid = container.querySelector('.grid-container');
        posts.forEach(post => {
            const div = document.createElement('div');
            div.className = 'profile-grid-item';
            const isVideo = post.image && (post.image.includes('data:video') || post.image.endsWith('.mp4'));
            
            div.innerHTML = `
                ${isVideo ? `<video src="${post.image}" muted></video>` : `<img src="${post.image || 'me.png'}">`}
                <div class="grid-overlay">
                    <div class="grid-stat"><i class="fa-solid fa-heart"></i> ${post.likes?.length || 0}</div>
                    <div class="grid-stat"><i class="fa-solid fa-comment"></i> ${post.comments?.length || 0}</div>
                </div>
                ${isVideo ? '<i class="fa-solid fa-video grid-type-icon"></i>' : ''}
            `;
            div.onclick = () => openPostDetail(post._id);
            grid.appendChild(div);
        });
    }


    async function loadSavedPostsForProfile(container) {
        // Use cache if available (null means never fetched)
        if (savedPostsCache !== null) {
            if (savedPostsCache.length === 0) {
                renderEmptySavedState(container);
            } else {
                renderGrid(container, savedPostsCache);
            }
            return;
        }

        container.innerHTML = '<p style="padding: 20px;">Loading saved posts...</p>';
        try {
            const res = await fetch('/api/social/saved');
            const savedPosts = await res.json();
            savedPostsCache = savedPosts; // Update cache
            if (savedPosts.length === 0) {
                renderEmptySavedState(container);
            } else {
                renderGrid(container, savedPosts);
            }
        } catch (err) {
            console.error(err);
            container.innerHTML = '<p style="padding: 20px; color: red;">Failed to load saved posts.</p>';
        }
    }

    function renderEmptySavedState(container) {
        container.innerHTML = `
            <div class="empty-state-prof">
                <div class="empty-icon-wrap"><i class="fa-solid fa-bookmark"></i></div>
                <h2>No Saved Posts</h2>
                <p>Only you can see what you've saved.</p>
            </div>`;
    }

    // --- POST DETAIL LOGIC ---
    const detailModal = document.getElementById('post-detail-modal');
    async function openPostDetail(postId) {
        // Increment view count in background
        fetch(`/api/social/post/${postId}/view`, { method: 'POST' }).catch(() => {});

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
                const alreadyLiked = likeBtn.classList.contains('fa-solid');
                updateLikeBtnUI(likeBtn, !alreadyLiked);
                
                try {
                    const lRes = await fetch(`/api/social/post/${post._id}/like`, { method: 'POST' });
                    const lData = await lRes.json();
                    document.getElementById('detail-likes-text').textContent = `${formatStat(lData.likesCount)} likes`;
                    updateLikeBtnUI(likeBtn, lData.isLiked);
                    init(); 
                } catch (err) {
                    console.error(err);
                    updateLikeBtnUI(likeBtn, alreadyLiked);
                }
            };

            // Save
            const detailSaveBtn = document.getElementById('detail-save-btn');
            const isSaved = (me.savedPosts || []).includes(post._id);
            updateSaveBtnUI(detailSaveBtn, isSaved);
            detailSaveBtn.onclick = () => toggleSavePost(post, detailSaveBtn);
            
            // Download
            document.getElementById('detail-download-btn').onclick = () => {
                const link = document.createElement('a');
                link.href = post.image;
                link.download = `post_${post._id}`;
                link.click();
            };

            // --- HEADER ACTIONS ---
            // Close Button
            document.getElementById('close-detail-btn-header').onclick = closeDetailModal;

            // Options Menu logic
            const optionsBtn = document.getElementById('post-options-btn');
            optionsBtn.onclick = (e) => {
                e.stopPropagation();
                showPostOptions(post);
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


    // Unified Close Modal Logic
    function closeDetailModal() {
        detailModal.classList.add('hidden');
        // Stop any playing video immediately
        const vids = detailModal.querySelectorAll('video');
        vids.forEach(v => {
            v.pause();
            v.currentTime = 0;
            v.src = ""; // Force stop download/buffer
        });
    }
    
    // Close Detail Modal (Header Button) - Initial Bind
    document.getElementById('close-detail-btn-header').onclick = closeDetailModal;

    // Close on Outside Click
    window.onclick = (event) => {
        if (event.target == detailModal) {
            closeDetailModal();
        }
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
    // setModal is already declared at the top
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

    // --- SEARCH & ACTIVITY Hub LOGIC ---

    function updateSaveBtnUI(icon, isSaved) {
        if (isSaved) {
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid', 'fa-bookmark');
            icon.style.color = '#000';
        } else {
            icon.classList.remove('fa-solid', 'fa-bookmark');
            icon.classList.add('fa-regular', 'fa-bookmark');
            icon.style.color = '';
        }
    }

    async function toggleSavePost(post, icon) {
        const postId = post._id;
        // icon is passed directly, no need to query for it inside itself
        const isSavedNow = icon.classList.contains('fa-solid');
        
        // Optimistic UI
        updateSaveBtnUI(icon, !isSavedNow);

        try {
            const res = await fetch(`/api/social/post/${postId}/save`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.message || data.error || 'Failed to save post');
            }
            
            // Sync with server state
            updateSaveBtnUI(icon, data.saved);
            
            // INSTANT CACHE UPDATE (Instagram Style)
            if (savedPostsCache === null) savedPostsCache = [];
            if (!me.savedPosts) me.savedPosts = [];

            if (data.saved) {
                if (!savedPostsCache.find(p => p._id === postId)) {
                    savedPostsCache.unshift(post); 
                }
                if (!me.savedPosts.includes(postId)) me.savedPosts.push(postId);
            } else {
                savedPostsCache = savedPostsCache.filter(p => p._id !== postId);
                me.savedPosts = me.savedPosts.filter(p => p !== postId);
            }
            
            // If we are currently looking at the profile saved tab, re-render it instantly
            if (!profileView.classList.contains('hidden') && currentProfileTab === 'saved') {
                if (savedPostsCache.length === 0) {
                    renderEmptySavedState(profileContentArea);
                } else {
                    renderGrid(profileContentArea, savedPostsCache);
                }
            }

            showToast(data.message, 'success');
        } catch (err) {
            console.error(err);
            updateSaveBtnUI(icon, isSavedNow);
            showToast(err.message || 'Failed to update save status', 'error');
        }
    }

    // --- SEARCH LOGIC ---
    let searchTimeout = null;
    function initSearchView() {
        const input = document.getElementById('global-search-input');
        input.oninput = () => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performGlobalSearch(input.value);
            }, 300);
        };
    }

    async function performGlobalSearch(query) {
        const resultsContainer = document.getElementById('global-search-results');
        if (!query.trim()) {
            resultsContainer.innerHTML = `
                <div class="search-empty-state">
                    <i class="fa-solid fa-user-plus"></i>
                    <h3>Discover People</h3>
                    <p>Search by username or name to find friends.</p>
                </div>`;
            return;
        }

        try {
            const res = await fetch(`/api/social/search?q=${query}`);
            const users = await res.json();
            
            resultsContainer.innerHTML = '';
            if (users.length === 0) {
                resultsContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #8e8e8e;">No people found.</p>';
                return;
            }

            users.forEach(u => renderUserSearchCard(u, resultsContainer));
        } catch (err) { console.error(err); }
    }

    function renderUserSearchCard(user, container) {
        const div = document.createElement('div');
        div.className = 'search-user-card';
        const isFollowing = me.following && me.following.includes(user._id);
        
        div.innerHTML = `
            <div class="user-info">
                <img src="${user.profilePicture || 'me.png'}" class="search-user-pfp">
                <div>
                    <h4 style="margin: 0;">${user.username}</h4>
                    <span style="font-size: 0.85rem; color: #8e8e8e;">${user.fullName || ''}</span>
                </div>
            </div>
            <button class="btn-follow-elite ${isFollowing ? 'following' : ''}" data-id="${user._id}">
                ${isFollowing ? 'Following' : 'Follow'}
            </button>
        `;
        
        const followBtn = div.querySelector('button');
        followBtn.onclick = async () => {
            const res = await fetch(`/api/social/follow/${user._id}`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                const nowFollowing = data.message.includes('Following');
                followBtn.textContent = nowFollowing ? 'Following' : 'Follow';
                followBtn.classList.toggle('following', nowFollowing);
                
                // Update local 'me' state
                if (nowFollowing) {
                    if (!me.following.includes(user._id)) me.following.push(user._id);
                } else {
                    me.following = me.following.filter(f => f !== user._id);
                }
            }
        };
        
        container.appendChild(div);
    }

    // --- ACTIVITY / FAVORITES LOGIC ---
    function initActivityView(targetTab = 'favorites') {
        const tabs = document.querySelectorAll('.act-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                const target = tab.getAttribute('data-act-tab');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.act-content-block').forEach(b => b.classList.add('hidden'));
                document.getElementById(`activity-content-${target}`).classList.remove('hidden');
                
                if (target === 'favorites') loadSavedPosts();
                else loadActivityFeed();
            };
        });
        
        // If a specific tab is requested, trigger it
        const targetBtn = Array.from(tabs).find(t => t.getAttribute('data-act-tab') === targetTab);
        if (targetBtn) targetBtn.click();
    }

    async function loadSavedPosts() {
        const container = document.getElementById('saved-posts-container');
        container.innerHTML = '<p style="padding: 20px;">Loading your favorites...</p>';
        
        try {
            const res = await fetch('/api/social/saved');
            const posts = await res.json();
            
            container.innerHTML = '';
            if (posts.length === 0) {
                container.innerHTML = '<p style="padding: 40px; grid-column: 1/4; text-align: center; color: #8e8e8e;">No saved posts yet.</p>';
                return;
            }

            posts.forEach(post => {
                const item = document.createElement('div');
                item.className = 'saved-post-item';
                const isVideo = (post.image.includes('data:video') || post.image.endsWith('.mp4'));
                
                item.innerHTML = `
                    ${isVideo ? `<video src="${post.image}"></video>` : `<img src="${post.image}">`}
                    <div class="saved-post-overlay">
                        <span><i class="fa-solid fa-heart"></i> ${post.likes.length}</span>
                        <span><i class="fa-solid fa-comment"></i> ${post.comments.length}</span>
                    </div>
                `;
                item.onclick = () => openPostDetail(post._id);
                container.appendChild(item);
            });
        } catch (err) { console.error(err); }
    }

    async function loadActivityFeed() {
        const container = document.getElementById('notifications-container');
        container.innerHTML = '<p style="padding: 20px;">Loading activity...</p>';
        
        try {
            const res = await fetch('/api/social/activity');
            const activities = await res.json();
            
            container.innerHTML = '';
            if (activities.length === 0) {
                container.innerHTML = '<p style="padding: 40px; text-align: center; color: #8e8e8e;">No recent activity.</p>';
                return;
            }

            activities.forEach(act => {
                const item = document.createElement('div');
                item.className = 'notif-item';
                
                let actionText = '';
                if (act.type === 'like') actionText = 'liked your post';
                else if (act.type === 'follow') actionText = 'started following you';
                else if (act.type === 'comment') actionText = `commented: "${act.text}"`;

                item.innerHTML = `
                    <img src="${act.user.profilePicture || 'me.png'}">
                    <div class="notif-text">
                        <b>${act.user.username}</b> ${actionText}
                        <div class="notif-time">${formatTime(act.createdAt)}</div>
                    </div>
                    ${act.post && act.post.image ? `<img src="${act.post.image}" class="notif-action-img">` : ''}
                `;
                item.onclick = () => {
                    if (act.post) openPostDetail(act.post._id);
                };
                container.appendChild(item);
            });
        } catch (err) { console.error(err); }
    }

    // --- REQUESTS ---
    document.getElementById('logout-btn').onclick = () => {
        document.cookie = 'token=; Max-Age=0; path=/;';
        window.location.href = '/';
    };

    init();

    // --- GLOBAL POST OPTIONS ---
    const optionsOverlay = document.getElementById('options-modal-overlay');
    const globalDeleteBtn = document.getElementById('global-option-delete');
    const globalCopyBtn = document.getElementById('global-option-copy-link');
    const globalCancelBtn = document.getElementById('global-option-cancel');

    function showPostOptions(post) {
        optionsOverlay.classList.remove('hidden');
        
        const isOwner = (post.user._id || post.user) === (me.id || me._id);
        
        if (isOwner) {
            globalDeleteBtn.classList.remove('hidden');
        } else {
            globalDeleteBtn.classList.add('hidden');
        }

        globalDeleteBtn.onclick = async () => {
            if (!confirm('Are you sure you want to delete this post?')) return;
            try {
                const res = await fetch(`/api/social/post/${post._id}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast('Post deleted', 'success');
                    optionsOverlay.classList.add('hidden');
                    document.getElementById('post-detail-modal').classList.add('hidden');
                    init();
                } else {
                    showToast('Failed to delete', 'error');
                }
            } catch (err) { console.error(err); }
        };

        globalCopyBtn.onclick = () => {
            const url = `${window.location.origin}/?post=${post._id}`;
            navigator.clipboard.writeText(url).then(() => {
                showToast('Link copied to clipboard!', 'success');
                optionsOverlay.classList.add('hidden');
            });
        };

        globalCancelBtn.onclick = () => optionsOverlay.classList.add('hidden');
        optionsOverlay.onclick = (e) => {
            if (e.target === optionsOverlay) optionsOverlay.classList.add('hidden');
        };
    }

    // --- MOBILE NAVIGATION & HEADER ---
    const mNavItems = document.querySelectorAll('.m-nav-item');
    mNavItems.forEach(item => {
        item.onclick = () => {
            const tabId = item.getAttribute('data-tab');
            
            if (tabId === 'create') {
                postFileInput.click();
                return;
            }

            mNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            hideAllViews();
            if (tabId === 'home') {
                feedView.classList.remove('hidden');
                loadFeed();
            } else if (tabId === 'search') {
                document.getElementById('search-view').classList.remove('hidden');
                initSearchView();
            } else if (tabId === 'activity') {
                document.getElementById('activity-view').classList.remove('hidden');
                initActivityView('notifications');
            } else if (tabId === 'profile') {
                profileView.classList.remove('hidden');
                renderProfile();
            }
        };
    });

    const mHeaderCreate = document.getElementById('m-header-create');
    const mHeaderNotif = document.getElementById('m-header-notif');
    const mHeaderSuggest = document.getElementById('m-header-suggest');

    if (mHeaderCreate) mHeaderCreate.onclick = () => postFileInput.click();
    if (mHeaderNotif) {
        mHeaderNotif.onclick = () => {
            hideAllViews();
            document.getElementById('activity-view').classList.remove('hidden');
            initActivityView('notifications');
        };
    }
    if (mHeaderSuggest) {
        mHeaderSuggest.onclick = () => {
            hideAllViews();
            document.getElementById('search-view').classList.remove('hidden');
            initSearchView(); 
            showToast('Showing suggested people...', 'normal');
        };
    }

    // --- PROFILE ACTIONS ---
    const btnSettingsGear = document.getElementById('btn-settings-prof-gear');
    if (btnSettingsGear) {
        btnSettingsGear.onclick = () => {
            setModal.classList.remove('hidden');
            if (typeof populateSettings === 'function') populateSettings();
        };
    }

    const btnEditProfiles = document.querySelectorAll('.btn-prof-action.primary');
    btnEditProfiles.forEach(btn => {
        btn.onclick = () => {
            setModal.classList.remove('hidden');
            const editTab = Array.from(document.querySelectorAll('.set-tab')).find(t => t.getAttribute('data-set-tab') === 'edit-profile');
            if (editTab) editTab.click();
        };
    });

    const btnViewArchives = document.querySelectorAll('.btn-prof-action.secondary');
    btnViewArchives.forEach(btn => {
        btn.onclick = () => showToast('View archive is currently unavailable.', 'normal');
    });
});
