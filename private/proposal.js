async function startProposal() {
    // 1. Get elements
    const splash = document.getElementById('splash-screen');
    const container = document.getElementById('main-container');
    const welcome = document.getElementById('welcomeMessage');
    const proposal = document.getElementById('proposal-text');

    try {
        // 2. Fetch data (Cookie is sent automatically)
        const response = await fetch("/api/dashboard-data");
        
        if (response.ok) {
            const data = await response.json();
            
            // 3. Inject the data
            if (welcome) welcome.innerText = `My Dearest ${data.user},`;
            if (proposal) proposal.innerText = data.message;

            // 4. Reveal the content container
            if (container) {
                container.style.display = "block";
                // Force a small reflow before opacity change for smooth animation
                setTimeout(() => { 
                    container.style.opacity = "1"; 
                }, 50);
            }

            // 5. Smoothly remove the splash screen
            setTimeout(() => {
                if (splash) {
                    splash.style.opacity = "0";
                    setTimeout(() => {
                        splash.style.display = "none";
                        // Re-enable scrolling if you disabled it for the splash
                        document.body.style.overflow = "auto";
                    }, 1000);
                }
            }, 2500); 

        } else {
            // API failed (401 or 403) - Immediate cleanup
            console.error("Session invalid. Redirecting...");
            window.location.replace("/");
        }
    } catch (err) {
        // Network error or server down
        console.error("Critical error:", err);
        window.location.replace("/");
    }
}

// --- Interaction Functions ---

function handleYes() {
    const questionDiv = document.getElementById('proposal-text');
    if (questionDiv) {
        // Updated with a beautiful romantic message
        questionDiv.innerHTML = `
            <div style="animation: fadeIn 1.5s ease;">
                <h2 style='color: #d63384; font-family: "Parisienne", cursive; font-size: 3rem;'>
                    I am the happiest person alive! ❤️💍
                </h2>
                <p style="font-size: 1.2rem; color: #555;">I can't wait to spend forever with you.</p>
            </div>
        `;
    }
    // You can call a confetti function here!
    console.log("She said YES! Time to celebrate.");
}

function handleNo() {
    alert("Take all the time you need, my love. My heart belongs to you regardless.");
}

async function logout() {
    try {
        // 1. Tell server to clear the cookie
        await fetch("/api/logout", { method: "POST" });
        
        // 2. Clear any local remnants
        localStorage.clear(); 
        sessionStorage.clear();

        // 3. Hard redirect to the login page
        window.location.replace("/");
    } catch (err) {
        // Even if the API call fails, force the user out
        window.location.replace("/");
    }
}

// --- Trigger Start ---
// Using DOMContentLoaded ensures the elements exist before we touch them
document.addEventListener('DOMContentLoaded', startProposal);