async function initProfile() {
    const splash = document.getElementById('splash-screen');
    const content = document.getElementById('main-content');
    const navUser = document.getElementById('nav-username');
    const displayUser = document.getElementById('display-username');
    const userBio = document.getElementById('user-bio');
    const avatarLetter = document.getElementById('avatar-letter');

    try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
            window.location.replace('/');
            return;
        }

        const data = await response.json();
        
        // Update UI
        navUser.innerText = data.username;
        displayUser.innerText = data.username;
        userBio.innerText = data.bio || "No bio yet. Click Edit Bio to add one!";
        avatarLetter.innerText = data.username.charAt(0).toUpperCase();

        // Reveal content
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            content.style.display = 'flex';
        }, 500);

    } catch (err) {
        console.error('Failed to load profile:', err);
        window.location.replace('/');
    }
}

function toggleEdit() {
    const displayArea = document.getElementById('user-bio');
    const editArea = document.getElementById('bio-edit-area');
    const editBtn = document.getElementById('edit-bio-btn');
    const bioInput = document.getElementById('bio-input');

    if (editArea.style.display === 'none') {
        editArea.style.display = 'block';
        displayArea.style.display = 'none';
        editBtn.style.display = 'none';
        bioInput.value = displayArea.innerText === "No bio yet. Click Edit Bio to add one!" ? "" : displayArea.innerText;
    } else {
        editArea.style.display = 'none';
        displayArea.style.display = 'block';
        editBtn.style.display = 'inline-block';
    }
}

async function saveBio() {
    const bioInput = document.getElementById('bio-input');
    const userBio = document.getElementById('user-bio');

    try {
        const response = await fetch('/api/user/update-bio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: bioInput.value })
        });

        if (response.ok) {
            userBio.innerText = bioInput.value || "No bio yet. Click Edit Bio to add one!";
            toggleEdit();
        } else {
            alert('Failed to update bio');
        }
    } catch (err) {
        console.error('Error saving bio:', err);
        alert('Server error');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.replace('/');
    } catch (err) {
        window.location.replace('/');
    }
}

document.addEventListener('DOMContentLoaded', initProfile);
