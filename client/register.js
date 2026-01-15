document.addEventListener("DOMContentLoaded", () => {
    const emailInput = document.getElementById("reg-email");
    const sendOtpBtn = document.getElementById("send-otp-btn");

    emailInput.addEventListener("input", () => {
        const email = emailInput.value.trim().toLowerCase();
        if (email.endsWith(".com")) {
            sendOtpBtn.classList.remove("hidden");
        } else {
            sendOtpBtn.classList.add("hidden");
        }
    });
});

window.addEventListener("load", () => {
    setTimeout(() => {
        const loader = document.getElementById("loader");
        const main = document.getElementById("main-content");
        if(loader) loader.style.display = "none";
        if(main) main.style.display = "block";
    }, 1000);
});

async function handleRegister() {
    const user = document.getElementById("reg-username").value;
    const pass = document.getElementById("reg-password").value;
    const email = document.getElementById("reg-email").value;
    const msb = document.getElementById("messageBOX");
    const msg = document.getElementById("message");

    if (!user || !pass || !email) {
        msg.innerText = "Please complete all fields";
        msg.className = "warning";
        msb.classList.remove("hidden");
        return;
    }

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: user,
                password: pass,
                email: email
            })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('registration-form').style.display = "none";
            document.getElementById('success-view').style.display = "block";
        } else {
            msg.innerText = data.message || "Registration failed";
            msg.className = "wrong";
            msb.classList.remove("hidden");
        }
    } catch (err) {
        msg.innerText = "Connection error";
        msg.className = "wrong";
        msb.classList.remove("hidden");
    }
}

async function sendOTP(event) {
    if (event) event.preventDefault();
    const email = document.getElementById("reg-email").value;
    const msg = document.getElementById("message");
    const msb = document.getElementById("messageBOX");

    if (!email || !email.endsWith(".com")) {
        msg.innerText = "Please enter a valid .com email";
        msg.className = "warning";
        msb.classList.remove("hidden");
        return;
    }

    try {
        const response = await fetch("/api/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        if (response.ok) {
            msg.innerText = "OTP sent successfully!";
            msg.className = "success";
            msb.classList.remove("hidden");
            document.getElementById("otp-section").classList.remove("hidden");
        } else {
            msg.innerText = data.error || "Failed to send OTP";
            msg.className = "wrong";
            msb.classList.remove("hidden");
        }
    } catch (err) {
        msg.innerText = "Connection error";
        msg.className = "wrong";
        msb.classList.remove("hidden");
    }
}

function moveNext(current, nextId) {
    if (current.value.length === 1 && nextId !== 'null') {
        document.getElementById(nextId).focus();
    }
}