document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const navItems = document.querySelectorAll('.nav-item');
    const feedContainer = document.getElementById('feed-container');
    const searchInput = document.getElementById('search-input');
    const storiesRow = document.getElementById('stories-container');
    const requestsList = document.getElementById('follow-requests-list');
    const suggestionsList = document.getElementById('suggestions-list');
    const loadingBar = document.getElementById('loading-bar');
    const setModal = document.getElementById('settings-modal');

    // Stats and Identifiers
    const mePfp = document.getElementById('me-pfp');
    const meName = document.getElementById('me-fullname');
    const meLoc = document.getElementById('me-location');
    const mePostsCount = document.getElementById('me-posts-count');
    const meFollowersCount = document.getElementById('me-followers-count');
    const meFollowingCount = document.getElementById('me-following-count');

    let me = null;

    // --- INITIALIZATION ---
    async function init() {
        showLoading(true);
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                me = await res.json();
                updateMeUI();
                loadFeed();
                loadStories();
                loadRequests();
                loadSuggestions();
                loadContacts();
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
        meName.textContent = me.fullName || me.username;
        meLoc.textContent = me.location || 'New York, USA';
        mePostsCount.textContent = '245'; // Placeholder for total posts
        meFollowersCount.textContent = formatStat(me.followersCount);
        meFollowingCount.textContent = formatStat(me.followingCount);
        document.getElementById('total-followers-text').textContent = formatStat(me.followersCount);
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
                loadFeed();
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
