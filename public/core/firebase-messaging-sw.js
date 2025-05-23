// public/firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// ⚠️ Reemplazá estos valores con tu firebaseConfig
firebase.initializeApp({
  apiKey: "AIzaSyC9r844RrXEy1ECw30Ii1tZAHm_w-vO3CE",
  authDomain: "quizz-app-6b615.firebaseapp.com",
  projectId: "quizz-app-6b615",
  storageBucket: "quizz-app-6b615.firebasestorage.app",
  messagingSenderId: "757616151217",
  appId: "1:757616151217:web:2138991f991da1e424f090",
  measurementId: "G-HWMV685L85"
});

const messaging = firebase.messaging();