window.addEventListener("load", () => {
    setTimeout(() => {
        // Professional splash/loader logic
        document.getElementById("loader").style.display = "none";
        document.getElementById("main-content").style.display = "block";
    }, 1000);
});

async function handleRegister() {
    const user = document.getElementById("reg-username").value;
    const pass = document.getElementById("reg-password").value;
    const msb = document.getElementById("messageBOX");
    const msg = document.getElementById("message");

    // Reset message styles
    msb.className = "";
    msg.className = "";

    if (!user || !pass) {
        msg.innerText = "Please fill out all fields";
        msg.classList.add("warning");
        msb.classList.remove("hidden");
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
            msg.classList.add("success");
            msb.classList.remove("hidden");

            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
        } else {
            msg.innerText = data.error || data.message || "User already exists!";
            msg.classList.add("wrong");
            msb.classList.remove("hidden");
            
            setTimeout(() => {
                msb.classList.add("hidden");
                msg.innerText = "";
            }, 3000);
        }
    } catch (err) {
        msg.innerText = "Server error. Is backend running?";
        msg.classList.add("wrong");
        msb.classList.remove("hidden");

        setTimeout(() => {
            msb.classList.add("hidden");
            msg.innerText = "";
        }, 3000);
    }
}
