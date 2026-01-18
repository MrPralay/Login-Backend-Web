document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const navItems = document.querySelectorAll('.nav-item');
    const feedContainer = document.getElementById('feed-container');
    const storiesRow = document.getElementById('stories-container');
    const requestsList = document.getElementById('follow-requests-list');
    const suggestionsList = document.getElementById('suggestions-list');
    const loadingBar = document.getElementById('loading-bar');
    const setModal = document.getElementById('settings-modal');

    // Stats and Identifiers
    const mePostsCount = document.getElementById('prof-posts-count');
    const meFollowersCount = document.getElementById('prof-followers-count');
    const profileView = document.getElementById('profile-view');
    const profileContentArea = document.getElementById('profile-content-area');

    const createPostModal = document.getElementById('create-post-modal');
    const postFileInput = document.getElementById('post-file-input');
    const mediaPreview = document.getElementById('media-preview');
    const sharePostBtn = document.getElementById('share-post-btn');
    const backCreatePost = document.getElementById('back-create-post');
    const postCaption = document.getElementById('post-caption');

    let selectedFileBase64 = null;

    // --- POST CREATION LOGIC ---
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
            createPostModal.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    };

    backCreatePost.onclick = () => {
        createPostModal.classList.add('hidden');
        postFileInput.value = '';
    };

    sharePostBtn.onclick = async () => {
        if (!selectedFileBase64) return;
        
        showLoading(true);
        try {
            const res = await fetch('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postCaption.value,
                    image: selectedFileBase64 // Sending as base64
                })
            });

            if (res.ok) {
                createPostModal.classList.add('hidden');
                postCaption.value = '';
                postFileInput.value = '';
                // Refresh data
                await init(); 
                // Ensure we are viewing profile if we share from there
                if (!profileView.classList.contains('hidden')) {
                    renderProfile();
                }
            } else {
                alert('Failed to share post. Try a smaller file.');
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
        document.getElementById('profile-username').textContent = me.username;
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
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const tabId = item.getAttribute('data-tab');
            if (tabId === 'settings') {
                setModal.classList.remove('hidden');
            } else if (tabId === 'home') {
                feedView.classList.remove('hidden');
                profileView.classList.add('hidden');
                loadFeed();
            } else if (tabId === 'profile') {
                feedView.classList.add('hidden');
                profileView.classList.remove('hidden');
                renderProfile();
            } else if (tabId === 'create') {
                alert('Create post functionality coming soon!');
            } else if (tabId === 'search') {
                alert('Search functionality coming soon!');
            } else if (tabId === 'messenger') {
                alert('Messenger coming soon!');
            }
        };
    });

    // --- STORIES ---
    async function loadStories() {
        try {
            storiesRow.innerHTML = `
                <div class="story-circle add-story">
                    <div class="story-img"><i class="fa-solid fa-plus"></i></div>
                    <span>Add Story</span>
                </div>`;
            const res = await fetch('/api/social/suggestions'); // Using suggest logic to find users with stories
            const users = await res.json();
            users.forEach(u => {
                if (u.profilePicture) {
                    const div = document.createElement('div');
                    div.className = 'story-circle';
                    div.innerHTML = `
                        <div class="story-img"><img src="${u.profilePicture}" onerror="this.src='me.png'"></div>
                        <span>${u.username}</span>
                    `;
                    storiesRow.appendChild(div);
                }
            });
        } catch (err) {}
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
            card.innerHTML = `
                <div class="post-user">
                    <img src="${post.user.profilePicture || 'me.png'}" onerror="this.src='me.png'">
                    <div class="post-user-info">
                        <b>${post.user.fullName || post.user.username}</b>
                        <span>@${post.user.username} · ${formatTime(post.createdAt)}</span>
                    </div>
                    <i class="fa-solid fa-ellipsis" style="margin-left: auto; color: #ccc; cursor: pointer;"></i>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.image ? `<div class="post-image-grid"><img src="${post.image}"></div>` : ''}
                <div class="post-actions-elite">
                    <div class="like-btn" data-id="${post._id}">
                        <i class="fa-regular fa-heart"></i>
                        <span>${post.likes?.length || '4.5K'}</span>
                    </div>
                    <div>
                        <i class="fa-regular fa-comment"></i>
                        <span>${post.comments?.length || '2.1K'}</span>
                    </div>
                    <div>
                        <i class="fa-solid fa-share-nodes"></i>
                        <span>1.7K</span>
                    </div>
                    <i class="fa-regular fa-bookmark" style="margin-left: auto;"></i>
                </div>
            `;
            feedContainer.appendChild(card);
        });
    }

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
                    profileContentArea.innerHTML = '<div class="post-grid-placeholder" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;"></div>';
                    const grid = profileContentArea.querySelector('.post-grid-placeholder');
                    posts.forEach(post => {
                        const img = document.createElement('img');
                        img.src = post.image || 'peg.png';
                        img.className = 'grid-img';
                        grid.appendChild(img);
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

    // --- SETTINGS MGT ---
    document.getElementById('close-settings').onclick = () => setModal.classList.add('hidden');
    document.getElementById('save-settings-btn').onclick = async () => {
        const data = {
            fullName: document.getElementById('set-fullname').value,
            bio: document.getElementById('set-bio').value,
            profilePicture: document.getElementById('set-pfp').value
        };
        showLoading(true);
        await fetch('/api/social/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        setModal.classList.add('hidden');
        init();
    };

    init();
});
