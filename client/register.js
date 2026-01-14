async function handleRegister() {
    const user = document.getElementById("reg-username").value;
    const pass = document.getElementById("reg-password").value;
    const msg = document.getElementById("reg-msg");

    if (!user || !pass) {
        msg.innerText = "Fields cannot be empty!";
        msg.className = "error";
        return;
    }

    try {
        const response = await fetch("api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: user,
                password: pass
            })
        });
        const data = await response.json();

        if (response.ok) {
            msg.innerText = "Registration Successful! Redirecting...";
            msg.className = "success";
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
        } else {
            msg.innerText = data.error || "User already exists!";
            msg.className = "error";
        }
    } catch (err) {
        msg.innerText = "Server error. Is your backend running?";
        msg.className = "error";
    }
}