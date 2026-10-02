// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBX_P_pTnYKFoy76PzHwcJ1WiivtcDXxSo",
    authDomain: "forumbase-pt.firebaseapp.com",
    projectId: "forumbase-pt",
    storageBucket: "forumbase-pt.firebasestorage.app",
    messagingSenderId: "746415762155",
    appId: "1:746415762155:web:48ce283a1c65e82bf0acae",
    measurementId: "G-SDMKWJ6XC6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

//submit button
const submit = document.getElementById('submit');
submit.addEventListener("click", function (event) {
    event.preventDefault()
    //input
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        alert("Creating Account")
        const username = document.getElementById('user').value;
        return updateProfile(user, { displayName: username });
    })
    .then(() => {
        window.location.href = "home.html";
    })
    .catch((error) => {
        console.error(error.code, error.message);
    });
})