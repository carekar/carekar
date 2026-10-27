// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmXKuVbCWYuTERKVEV7fHEkUrRqXpgn2A",
  authDomain: "carekar-6ca30.firebaseapp.com",
  projectId: "carekar-6ca30",
  storageBucket: "carekar-6ca30.firebasestorage.app",
  messagingSenderId: "258346992317",
  appId: "1:258346992317:web:ec525e7004abad2bf9add4",
  measurementId: "G-5TN6BGF2KZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);