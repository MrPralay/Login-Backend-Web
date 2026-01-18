document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const viewTitle = document.getElementById('view-title');
    const feedContainer = document.getElementById('feed-container');
    const postContent = document.getElementById('post-content');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results-container');
    const loadingBar = document.getElementById('loading-bar');
    const mePfp = document.getElementById('me-pfp');
    const meName = document.getElementById('me-fullname');
    const meHandle = document.getElementById('me-handle');
    const setModal = document.getElementById('settings-modal');

    let me = null;

    // --- INITIALIZATION ---
    async function init() {
        showLoading(true);
        try {
            // Get current user profile
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                me = await res.json();
                updateMeUI();
                loadFeed(); // Default view
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
        mePfp.src = me.profilePicture || 'me.png';
        document.querySelector('.mini-pfp').src = me.profilePicture || 'me.png';
        meName.textContent = me.fullName || me.username;
        meHandle.textContent = `@${me.username}`;
    }

    function showLoading(show) {
        loadingBar.style.width = show ? '40%' : '100%';
        if (!show) setTimeout(() => loadingBar.style.width = '0', 300);
    }

    // --- NAVIGATION ---
    navButtons.forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.getAttribute('data-tab');
            if (tabId) switchTab(tabId);
        };
    });

    function switchTab(tabId) {
        navButtons.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        tabContents.forEach(c => c.classList.remove('active'));
        document.getElementById(`${tabId}-section`).classList.add('active');

        // Update Title & Content
        viewTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
        if (tabId === 'home') {
            loadFeed();
            document.getElementById('create-post-container').classList.remove('hidden');
        } else {
            document.getElementById('create-post-container').classList.add('hidden');
        }

        if (tabId === 'profile') loadUserProfile(me.username, 'profile-display');
    }

    // --- FEED LOGIC ---
    async function loadFeed() {
        feedContainer.innerHTML = '<div class="empty-state"><p>Loading feed...</p></div>';
        try {
            const res = await fetch('/api/social/feed');
            const posts = await res.json();
            renderPosts(posts, feedContainer);
        } catch (err) {
            console.error(err);
        }
    }

    function renderPosts(posts, container) {
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-wind"></i>
                    <p>It's quiet here. Following more people to see what's happening!</p>
                </div>`;
            return;
        }

        container.innerHTML = '';
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <img src="${post.user.profilePicture || 'me.png'}" class="post-pfp" onerror="this.src='me.png'">
                <div class="post-body">
                    <div class="post-header">
                        <span class="post-name">${post.user.fullName || post.user.username}</span>
                        <span class="post-handle">@${post.user.username}</span>
                        <span class="post-time">· ${formatTime(post.createdAt)}</span>
                    </div>
                    <div class="post-content">${post.content}</div>
                    ${post.image ? `<img src="${post.image}" class="post-image" onerror="this.style.display='none'">` : ''}
                    <div class="post-actions">
                        <div><i class="fa-regular fa-comment"></i> <span>0</span></div>
                        <div><i class="fa-solid fa-retweet"></i> <span>0</span></div>
                        <div class="like-btn" data-id="${post._id}"><i class="fa-regular fa-heart"></i> <span>${post.likes?.length || 0}</span></div>
                        <div><i class="fa-solid fa-chart-simple"></i> <span>0</span></div>
                        <div><i class="fa-regular fa-share-from-square"></i></div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function formatTime(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return new Date(date).toLocaleDateString();
    }

    // --- POSTING LOGIC ---
    postContent.oninput = () => {
        submitPostBtn.disabled = !postContent.value.trim();
        postContent.style.height = 'auto';
        postContent.style.height = postContent.scrollHeight + 'px';
    };

    submitPostBtn.onclick = async () => {
        const content = postContent.value.trim();
        if (!content) return;

        showLoading(true);
        try {
            const res = await fetch('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (res.ok) {
                postContent.value = '';
                submitPostBtn.disabled = true;
                loadFeed();
            }
        } catch (err) {
            console.error(err);
        } finally {
            showLoading(false);
        }
    };

    // --- SEARCH LOGIC ---
    let searchTimeout;
    searchInput.oninput = () => {
        clearTimeout(searchTimeout);
        const q = searchInput.value.trim();
        if (!q) {
            searchResults.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            const res = await fetch(`/api/social/search?q=${q}`);
            const users = await res.json();
            renderSearchResults(users);
        }, 300);
    };

    function renderSearchResults(users) {
        searchResults.innerHTML = '';
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'user-pill'; // We can add specific styling or reuse card-list items
            item.innerHTML = `
                <img src="${user.profilePicture || 'me.png'}" class="mini-pfp" onerror="this.src='me.png'">
                <div class="pill-cnt">
                    <p><b>${user.fullName || user.username}</b></p>
                    <p>@${user.username}</p>
                </div>
                <button class="follow-btn-mini">Follow</button>
            `;
            item.onclick = (e) => {
                if(e.target.tagName !== 'BUTTON') viewOtherProfile(user.username);
            };
            searchResults.appendChild(item);
        });
    }

    // --- PROFILE VIEWS ---
    async function loadUserProfile(username, targetId) {
        showLoading(true);
        try {
            const res = await fetch(`/api/social/profile/${username}`);
            const profile = await res.json();
            renderProfileUI(profile, document.getElementById(targetId));
        } catch (err) {
            console.error(err);
        } finally {
            showLoading(false);
        }
    }

    function renderProfileUI(profile, container) {
        const isMe = profile.username === me.username;
        container.innerHTML = `
            <div class="profile-hero">
                <div class="banner"></div>
                <img src="${profile.profilePicture || 'me.png'}" class="p-image" onerror="this.src='me.png'">
                ${isMe ? 
                    `<button class="edit-prof-btn" onclick="document.getElementById('settings-modal').classList.remove('hidden')">Edit profile</button>` :
                    `<button class="edit-prof-btn">${profile.isFollowing ? 'Following' : 'Follow'}</button>`
                }
            </div>
            <div class="p-info">
                <h1>${profile.fullName || profile.username}</h1>
                <span>@${profile.username}</span>
                <p class="p-bio">${profile.bio || 'Setting the trend for the high elite connection. 💎'}</p>
                <div class="p-stats">
                    <span><b>${profile.followingCount}</b> Following</span>
                    <span><b>${profile.followersCount}</b> Followers</span>
                </div>
            </div>
            <div id="${profile.username}-posts">
                <!-- User posts will load here -->
            </div>
        `;
    }

    function viewOtherProfile(username) {
        switchTab('user-profile-section');
        loadUserProfile(username, 'user-profile-section');
    }

    // --- SUGGESTIONS ---
    async function loadSuggestions() {
        const list = document.getElementById('suggestions-list');
        try {
            const res = await fetch('/api/social/search?q=a'); // Just get some random users
            const users = await res.json();
            list.innerHTML = '';
            users.slice(0, 3).forEach(u => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                   <img src="${u.profilePicture || 'me.png'}" onerror="this.src='me.png'">
                   <div class="s-info">
                       <p><b>${u.fullName || u.username}</b></p>
                       <p>@${u.username}</p>
                   </div>
                   <button>Follow</button>
                `;
                item.onclick = () => viewOtherProfile(u.username);
                list.appendChild(item);
            });
        } catch (err) {}
    }

    // --- SETTINGS ---
    document.getElementById('close-settings').onclick = () => setModal.classList.add('hidden');
    document.getElementById('save-settings-btn').onclick = async () => {
        const data = {
            fullName: document.getElementById('set-fullname').value,
            bio: document.getElementById('set-bio').value,
            profilePicture: document.getElementById('set-pfp').value,
            isPrivate: document.getElementById('set-private').checked
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
