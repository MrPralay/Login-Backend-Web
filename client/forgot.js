window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("loader").style.display = "none";
        document.getElementById("main-content").style.display = "block";
    }, 1000);
});

let selectedUsername = "";
let selectedEmail = "";

function showMessage(msg, type) {
    const msb = document.getElementById("messageBOX");
    const msgP = document.getElementById("message");
    msgP.innerText = msg;
    msgP.className = type;
    msb.classList.remove("hidden");
    
    if (type !== "success") {
        setTimeout(() => {
            msb.classList.add("hidden");
        }, 3000);
    }
}

async function findAccounts() {
    const email = document.getElementById("email").value.trim();
    if (!email || !email.includes("@")) {
        return showMessage("Please enter a valid email", "warning");
    }

    try {
        const response = await fetch("/api/find-accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            selectedEmail = email;
            renderAccounts(data.accounts);
            switchStep("step-select", "Select Account");
        } else {
            showMessage(data.message || "No accounts found", "wrong");
        }
    } catch (err) {
        showMessage("Server error", "wrong");
    }
}

function renderAccounts(accounts) {
    const list = document.getElementById("accounts-list");
    list.innerHTML = "";
    accounts.forEach(acc => {
        const div = document.createElement("div");
        div.className = "account-item";
        div.innerText = acc.username;
        div.onclick = () => selectAccount(acc.username);
        list.appendChild(div);
    });
}

async function selectAccount(username) {
    selectedUsername = username;
    document.getElementById("display-email").innerText = selectedEmail;
    
    try {
        const response = await fetch("/api/forgot-send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: selectedEmail, username: selectedUsername })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage("OTP sent successfully!", "success");
            switchStep("step-otp", "Verify OTP");
        } else {
            showMessage(data.message || "Failed to send OTP", "wrong");
        }
    } catch (err) {
        showMessage("Connection error", "wrong");
    }
}

function moveNext(current, nextId) {
    if (current.value.length === 1 && nextId !== 'null') {
        document.getElementById(nextId).focus();
    }
}

async function verifyOTP() {
    const otp = document.getElementById("otp1").value +
                document.getElementById("otp2").value +
                document.getElementById("otp3").value +
                document.getElementById("otp4").value;

    if (otp.length !== 4) {
        return showMessage("Enter 4-digit OTP", "warning");
    }

    // We proceed to password entry. Verification happens at the final reset step 
    // to match the security pattern, or we can add a pre-verification step.
    // Given the user flow, I'll move to the reset step.
    switchStep("step-reset", "New Password");
}

async function resetPassword() {
    const newPass = document.getElementById("new-password").value;
    const otp = document.getElementById("otp1").value +
                document.getElementById("otp2").value +
                document.getElementById("otp3").value +
                document.getElementById("otp4").value;

    if (!newPass) return showMessage("Please enter new password", "warning");

    try {
        const response = await fetch("/api/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: selectedEmail,
                username: selectedUsername,
                otp: otp,
                newPassword: newPass
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage("Password reset successful! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
        } else {
            showMessage(data.message || "Reset failed", "wrong");
        }
    } catch (err) {
        showMessage("Server error", "wrong");
    }
}

function switchStep(stepId, title) {
    document.querySelectorAll(".step-container").forEach(el => el.classList.add("hidden"));
    document.getElementById(stepId).classList.remove("hidden");
    document.getElementById("step-title").innerText = title;
}
