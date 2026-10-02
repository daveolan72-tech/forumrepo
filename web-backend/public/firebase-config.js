// Shared Firebase setup. Imported by login.js and register.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBX_P_pTnYKFoy76PzHwcJ1WiivtcDXxSo",
  authDomain: "forumbase-3260b.firebaseapp.com",
  projectId: "forumbase-3260b",
  storageBucket: "forumbase-3260b.firebasestorage.app",
  messagingSenderId: "746415762155",
  appId: "1:746415762155:web:48ce283a1c65e82bf0acae",
  measurementId: "G-SDMKWJ6XC6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
