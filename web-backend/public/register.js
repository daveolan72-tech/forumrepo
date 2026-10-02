import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBX_P_pTnYKFoy76PzHwcJ1WiivtcDXxSo",
  authDomain: "forumbase-3260b.firebaseapp.com",
  projectId: "forumbase-3260b",
  storageBucket: "forumbase-3260b.firebasestorage.app",
  messagingSenderId: "746415762155",
  appId: "1:746415762155:web:48ce283a1c65e82bf0acae",
  measurementId: "G-SDMKWJ6XC6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// If you don't see this in the browser console (F12), the script isn't loading.
console.log("register.js loaded");

/* ---------- Terms & Conditions modal ---------- */
const termsLink = document.getElementById("terms-link");
const termsOverlay = document.getElementById("terms-overlay");
const termsClose = document.getElementById("terms-close");

function openTerms(event) {
  event.preventDefault();
  termsOverlay.hidden = false;
}
function closeTerms() {
  termsOverlay.hidden = true;
}

termsLink.addEventListener("click", openTerms);
termsClose.addEventListener("click", closeTerms);
termsOverlay.addEventListener("click", (event) => {
  if (event.target === termsOverlay) closeTerms();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !termsOverlay.hidden) closeTerms();
});

const form = document.querySelector("form");
const errorMsg = document.getElementById("form-error");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMsg.textContent = "";
  errorMsg.classList.remove("ok");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const username = document.getElementById("user")?.value.trim();
  const agreed = document.getElementById("terms")?.checked;

  if (!agreed) {
    errorMsg.textContent = "You must agree to the Terms & Conditions to create an account.";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Account created:", userCredential.user.uid);

    // Save the username. If this fails, the account still exists.
    if (username) {
      try {
        await updateProfile(userCredential.user, { displayName: username });
      } catch (profileError) {
        console.error("Account created, but saving the username failed:", profileError);
      }
    }

    window.location.href = "home.html";
  } catch (error) {
    console.error(error.code, error.message);
    alert("Sign-up failed: " + error.code);
  }
});
