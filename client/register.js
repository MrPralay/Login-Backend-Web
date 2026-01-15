window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("main-content").style.display = "block";
    }, 1000);
});

// Auto-focus logic for 4-digit OTP boxes
const otpBoxes = [
    document.getElementById('otp-1'),
    document.getElementById('otp-2'),
    document.getElementById('otp-3'),
    document.getElementById('otp-4')
];

otpBoxes.forEach((box, index) => {
    box.addEventListener('input', (e) => {
        if (e.target.value && index < 3) {
            otpBoxes[index + 1].focus();
        }
    });

    box.addEventListener('keydown', (e) => {
        if (e.key === "Backspace" && !e.target.value && index > 0) {
            otpBoxes[index - 1].focus();
        }
    });
});

async function sendOTP() {
    const email = document.getElementById('reg-email').value;
    const msb = document.getElementById("messageBOX");
    const msg = document.getElementById("message");

    if (!email || !email.includes('@')) {
        msg.innerText = "Enter a valid email address";
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
            msg.innerText = "OTP Sent! Check Terminal/MongoDB";
            msg.className = "success";
            msb.classList.remove("hidden");
            document.getElementById('otp-container').style.display = "block";
            document.getElementById('otp-btn').innerText = "Resend";
        } else {
            msg.innerText = data.error || "Failed to send OTP";
            msg.className = "wrong";
            msb.classList.remove("hidden");
        }
    } catch (err) {
        msg.innerText = "Server error";
        msg.className = "wrong";
        msb.classList.remove("hidden");
    }
}

async function handleRegister() {
    const user = document.getElementById("reg-username").value;
    const pass = document.getElementById("reg-password").value;
    const email = document.getElementById("reg-email").value;
    const msb = document.getElementById("messageBOX");
    const msg = document.getElementById("message");

    // Collect 4-digit OTP
    const otp = otpBoxes.map(box => box.value).join('');

    if (!user || !pass || !email || otp.length < 4) {
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
                email: email,
                otp: otp
            })
        });

        const data = await response.json();

        if (response.ok) {
            // SUCCESS FLOW: Show Success View
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
