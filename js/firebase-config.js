import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "AIzaSyCTuJCzBQjAsWiIgsibUrUTL86__0CXI1E",

  authDomain: "soca-system.firebaseapp.com",

  projectId: "soca-system",

  storageBucket: "soca-system.firebasestorage.app",

  messagingSenderId: "616147869417",

  appId: "1:616147869417:web:cadf41cdb31ce08db55a78"

};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);