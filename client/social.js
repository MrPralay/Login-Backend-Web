document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const profileContainer = document.getElementById('profile-container');
    const userProfileContainer = document.getElementById('user-profile-container');
    const backToSearch = document.getElementById('back-to-search');
    const loadingOverlay = document.getElementById('loading-overlay');

    let me = null;
    let chatsUnlocked = false;

    // --- TAB SWITCH FLOW ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    function switchTab(tabId) {
        navItems.forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeNav) activeNav.classList.add('active');
        
        tabContents.forEach(content => content.classList.remove('active'));
        const activeSection = document.getElementById(`${tabId}-section`);
        if (activeSection) activeSection.classList.add('active');

        // Logic triggers
        if (tabId === 'profile') loadMyProfile();
        if (tabId === 'messages') handleMessagesTab();
    }

    document.getElementById('header-activity').addEventListener('click', () => switchTab('activity'));
    document.getElementById('header-messages').addEventListener('click', () => switchTab('messages'));

    // --- LOADING HELPER ---
    function showLoading(show) {
        if (show) loadingOverlay.classList.remove('hidden');
        else loadingOverlay.classList.add('hidden');
    }

    // --- CHAT LOCK LOGIC ---
    function handleMessagesTab() {
        if (me && me.isChatLocked && !chatsUnlocked) {
            document.getElementById('chat-locked-ui').classList.remove('hidden');
            document.getElementById('active-chats').classList.add('hidden');
            document.getElementById('chat-lock-status').className = 'fa-solid fa-lock';
        } else {
            document.getElementById('chat-locked-ui').classList.add('hidden');
            document.getElementById('active-chats').classList.remove('hidden');
            document.getElementById('chat-lock-status').className = me && me.isChatLocked ? 'fa-solid fa-lock-open' : '';
        }
    }

    document.getElementById('unlock-chats-btn').addEventListener('click', async () => {
        const passcode = document.getElementById('chat-passcode').value;
        try {
            const res = await fetch('/api/social/chat-lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode, action: 'verify' })
            });
            const data = await res.json();
            if (data.success) {
                chatsUnlocked = true;
                handleMessagesTab();
            } else {
                alert('Invalid Passcode');
            }
        } catch (err) {
            console.error(err);
        }
    });

    // --- SETTINGS LOGIC ---
    function openSettings() {
        if (!me) return;
        document.getElementById('setting-fullname').value = me.fullName || '';
        document.getElementById('setting-bio').value = me.bio || '';
        document.getElementById('setting-pfp').value = me.profilePicture || '';
        document.getElementById('setting-private').checked = me.isPrivate;
        document.getElementById('setting-chat-lock').checked = me.isChatLocked;
        
        if (me.isChatLocked) {
            document.getElementById('chat-passcode-setup').classList.remove('hidden');
        }

        document.getElementById('settings-overlay').classList.remove('hidden');
    }

    document.getElementById('setting-chat-lock').addEventListener('change', (e) => {
        const setup = document.getElementById('chat-passcode-setup');
        if (e.target.checked) setup.classList.remove('hidden');
        else setup.classList.add('hidden');
    });

    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-overlay').classList.add('hidden');
    });

    document.getElementById('save-settings').addEventListener('click', async () => {
        const settings = {
            fullName: document.getElementById('setting-fullname').value,
            bio: document.getElementById('setting-bio').value,
            profilePicture: document.getElementById('setting-pfp').value,
            isPrivate: document.getElementById('setting-private').checked
        };

        showLoading(true);
        try {
            await fetch('/api/social/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            const chatLockChecked = document.getElementById('setting-chat-lock').checked;
            const passcode = document.getElementById('setting-chat-passcode').value;

            if (chatLockChecked && passcode) {
                await fetch('/api/social/chat-lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ passcode, action: 'set' })
                });
            } else if (!chatLockChecked && me.isChatLocked) {
                await fetch('/api/social/chat-lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'toggle' })
                });
            }

            document.getElementById('settings-overlay').classList.add('hidden');
            init(); // Refresh data
        } catch (err) {
            console.log(err);
        } finally {
            showLoading(false);
        }
    });

    // --- SEARCH LOGIC ---
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);
        
        if (query.length === 0) {
            searchResults.innerHTML = '<div class="search-placeholder"><i class="fa-solid fa-users"></i><p>Search for your friends and creators</p></div>';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`/api/social/search?q=${query}`);
                const users = await res.json();
                renderSearchResults(users);
            } catch (err) {
                console.error("Search error:", err);
            }
        }, 300);
    });

    function renderSearchResults(users) {
        if (users.length === 0) {
            searchResults.innerHTML = '<p class="no-results">No users found</p>';
            return;
        }

        searchResults.innerHTML = '';
        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-item';
            userCard.innerHTML = `
                <div class="user-avatar">
                    <img src="${user.profilePicture || 'me.png'}" alt="${user.username}" onerror="this.src='me.png'">
                </div>
                <div class="user-info">
                    <h4>${user.username}</h4>
                    <p>${user.fullName || 'Socially User'}</p>
                </div>
            `;
            userCard.onclick = () => viewUserProfile(user.username);
            searchResults.appendChild(userCard);
        });
    }

    // --- PROFILE FETCHING ---
    async function loadMyProfile() {
        showLoading(true);
        try {
            const res = await fetch(`/api/social/profile/${me.username}`);
            const profile = await res.json();
            renderProfile(profile, profileContainer, true);
        } catch (err) {
            console.error("Profile load error:", err);
        } finally {
            showLoading(false);
        }
    }

    async function viewUserProfile(username) {
        showLoading(true);
        try {
            const res = await fetch(`/api/social/profile/${username}`);
            const profile = await res.json();
            
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById('user-profile-section').classList.add('active');
            
            renderProfile(profile, userProfileContainer, false);
        } catch (err) {
            console.error("User profile load error:", err);
        } finally {
            showLoading(false);
        }
    }

    function renderProfile(profile, container, isOwn) {
        container.innerHTML = `
            <div class="profile-header">
                <div class="profile-top">
                    <div class="profile-image-large">
                        <img src="${profile.profilePicture || 'me.png'}" alt="${profile.username}" onerror="this.src='me.png'">
                    </div>
                    <div class="profile-stats">
                        <div class="stat-item">
                            <h3>0</h3>
                            <p>Posts</p>
                        </div>
                        <div class="stat-item">
                            <h3>${profile.followersCount}</h3>
                            <p>Followers</p>
                        </div>
                        <div class="stat-item">
                            <h3>${profile.followingCount}</h3>
                            <p>Following</p>
                        </div>
                    </div>
                </div>

                <div class="profile-bio">
                    <h2>${profile.username}</h2>
                    <p>${profile.fullName || '(No name set)'}</p>
                    <p class="bio-text">${profile.bio || 'Welcome to my profile!'}</p>
                </div>

                <div class="profile-actions">
                    ${isOwn ? `
                        <button class="btn btn-secondary" id="edit-profile-btn">Edit Profile</button>
                        <button class="btn btn-secondary">Share Profile</button>
                    ` : `
                        <button class="btn ${profile.isFollowing ? 'btn-secondary' : 'btn-primary'}" id="follow-btn">
                            ${profile.isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button class="btn btn-secondary">Message</button>
                    `}
                </div>
            </div>

            <div class="profile-content">
                ${profile.isRestricted ? `
                    <div class="private-account-message">
                        <i class="fa-solid fa-lock"></i>
                        <h3>This Account is Private</h3>
                        <p>Follow to see their photos and videos.</p>
                    </div>
                ` : `
                    <div class="no-posts-container">
                        <div class="no-posts-icon">
                            <i class="fa-solid fa-camera"></i>
                        </div>
                        <h2>No Posts Yet</h2>
                        <p>When ${isOwn ? 'you share photos' : profile.username + ' shares photos'}, they will appear here.</p>
                    </div>
                `}
            </div>
        `;

        if (isOwn) {
            document.getElementById('edit-profile-btn').addEventListener('click', openSettings);
        } else {
            const followBtn = document.getElementById('follow-btn');
            followBtn.addEventListener('click', () => handleFollow(profile, followBtn));
        }
    }

    async function handleFollow(profile, btn) {
        try {
            const followRes = await fetch(`/api/social/follow/${profile.id}`, { method: 'POST' });
            const data = await followRes.json();
            
            if (data.isFollowing) {
                btn.textContent = 'Following';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            } else {
                btn.textContent = 'Follow';
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-secondary');
            }
            
            // Auto refresh profile stats
            viewUserProfile(profile.username);
        } catch (err) {
            console.error("Follow error:", err);
        }
    }

    document.getElementById('back-to-search').addEventListener('click', () => {
        switchTab('search');
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    });

    // Initial Load
    async function init() {
        showLoading(true);
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                me = await res.json();
                if (me.profilePicture) {
                    document.getElementById('nav-profile-pic').src = me.profilePicture;
                }
            }
        } catch (err) {
            console.error("Init error:", err);
        } finally {
            showLoading(false);
        }
    }

    init();
});
