import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const form = document.getElementById("login-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const remember = document.getElementById("remember");
const forgot = document.getElementById("forgot");
const formError = document.getElementById("form-error");
const submitBtn = form.querySelector('button[type="submit"]');

function showMessage(text, ok = false) {
  formError.textContent = text;
  formError.classList.toggle("ok", ok);
}

// Show / hide password
document.querySelectorAll(".toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "Hide" : "Show";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
});

const errorMessages = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes or reset your password.",
  "auth/network-request-failed": "Network error. Check your connection and try again."
};

// Log in
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("");

  if (!form.checkValidity()) {
    showMessage("Enter your email and password.");
    form.querySelector(":invalid").focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    // "Remember me" keeps you signed in after closing the browser
    await setPersistence(auth, remember.checked ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    window.location.href = "home.html";
  } catch (error) {
    console.error(error.code, error.message);
    showMessage(errorMessages[error.code] || "Couldn't log in (" + error.code + ").");
    submitBtn.disabled = false;
    submitBtn.textContent = "Log in";
  }
});

// Forgot password: sends a reset link to the email typed above
forgot.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!email.value.trim()) {
    showMessage("Enter your email above, then click Forgot password.");
    email.focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email.value.trim());
    showMessage("Reset link sent. Check your inbox.", true);
  } catch (error) {
    console.error(error.code, error.message);
    showMessage(errorMessages[error.code] || "Couldn't send the reset email (" + error.code + ").");
  }
});
