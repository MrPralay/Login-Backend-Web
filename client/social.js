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

    let currentUser = null;

    // --- TAB SWITCH FLOW ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            
            // UI Updates
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabId}-section`).classList.add('active');

            // Logic trigger
            if (tabId === 'profile') {
                loadMyProfile();
            }
        });
    });

    // --- LOADING HELPER ---
    function showLoading(show) {
        if (show) loadingOverlay.classList.remove('hidden');
        else loadingOverlay.classList.add('hidden');
    }

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
        }, 500);
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
                    <img src="${user.profilePicture || 'me.png'}" alt="${user.username}">
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
            // Re-using the existing endpoint or creating a new one
            // Let's use our new social profile endpoint for consistency
            const res = await fetch('/api/user/profile');
            const authUser = await res.json();
            
            // Now get full social data
            const socialRes = await fetch(`/api/social/profile/${authUser.username}`);
            const profile = await socialRes.json();
            
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
            
            // Switch to user profile view
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
                        <img src="${profile.profilePicture || 'me.png'}" alt="${profile.username}">
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
                        <button class="btn btn-secondary">Edit Profile</button>
                        <button class="btn btn-secondary">Share Profile</button>
                    ` : `
                        <button class="btn ${profile.isFollowing ? 'btn-secondary' : 'btn-primary'}" id="follow-btn">
                            ${profile.isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button class="btn btn-secondary">Message</button>
                    `}
                </div>
            </div>

            ${isOwn ? `
                <div class="privacy-toggle-container">
                    <span>Private Account</span>
                    <label class="switch">
                        <input type="checkbox" id="privacy-toggle" ${profile.isPrivate ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            ` : ''}

            <div class="profile-content">
                ${profile.isRestricted ? `
                    <div class="private-account-message">
                        <i class="fa-solid fa-lock"></i>
                        <h3>This Account is Private</h3>
                        <p>Follow to see their photos and videos.</p>
                    </div>
                ` : `
                    <div class="posts-grid">
                        <div class="post-item"></div>
                        <div class="post-item"></div>
                        <div class="post-item"></div>
                        <div class="post-item"></div>
                        <div class="post-item"></div>
                        <div class="post-item"></div>
                    </div>
                `}
            </div>
        `;

        // Event Listeners for buttons
        if (isOwn) {
            document.getElementById('privacy-toggle').addEventListener('change', togglePrivacy);
        } else {
            const followBtn = document.getElementById('follow-btn');
            followBtn.addEventListener('click', () => handleFollow(profile, followBtn));
        }
    }

    async function handleFollow(profile, btn) {
        try {
            // Need to find user ID. The API returns it or we can find it.
            // Let's modify the profile API to include the ID if needed, 
            // but we can also use username-based follow if we want.
            // For now, let's assume we need to fetch the search result again or modify profile API.
            // I'll use the ID from the search or profile if I add it.
            
            // Let's re-fetch the search result to get ID? No, better add it to profile API.
            // WAIT - my follow API uses /api/social/follow/:id. I should use username.
            // Let's fix the backend to use ID from username search or just pass ID in profile.
            
            // I'll use the current profile username to find the ID on server.
            const res = await fetch(`/api/social/search?q=${profile.username}`);
            const users = await res.json();
            const target = users.find(u => u.username === profile.username);
            
            if (target) {
                const followRes = await fetch(`/api/social/follow/${target._id}`, { method: 'POST' });
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
                
                // Refresh profile stats?
                viewUserProfile(profile.username);
            }
        } catch (err) {
            console.error("Follow error:", err);
        }
    }

    async function togglePrivacy() {
        try {
            const res = await fetch('/api/social/toggle-privacy', { method: 'POST' });
            const data = await res.json();
            console.log(data.message);
        } catch (err) {
            console.error("Privacy toggle error:", err);
        }
    }

    backToSearch.addEventListener('click', () => {
        tabContents.forEach(c => c.classList.remove('active'));
        document.getElementById('search-section').classList.add('active');
        navItems.forEach(n => n.classList.remove('active'));
        document.querySelector('[data-tab="search"]').classList.add('active');
    });

    // Initial Load - Home is default
    async function init() {
        showLoading(true);
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const user = await res.json();
                if (user.profilePicture) {
                    document.getElementById('nav-profile-pic').src = user.profilePicture;
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
