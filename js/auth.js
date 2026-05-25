import { auth } from "./firebase-config.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");

const message = document.getElementById("message");

function showMessage(text, type){

  message.style.display = "block";

  message.className = `message ${type}`;

  message.textContent = text;

}

loginForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const email = document.getElementById("email").value;

  const password = document.getElementById("password").value;

  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    showMessage(
      "Ingresando al sistema...",
      "success"
    );

    setTimeout(() => {

      window.location.href = "dashboard.html";

    }, 1200);

  } catch (error) {

    showMessage(
      "Correo o contraseña incorrectos",
      "error"
    );

    console.log(error);

  }

});


const togglePassword = document.getElementById("togglePassword");

const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", () => {

  const type = passwordInput.getAttribute("type");

  if(type === "password"){

    passwordInput.setAttribute("type", "text");

    togglePassword.textContent = "😲";

  }else{

    passwordInput.setAttribute("type", "password");

    togglePassword.textContent = "👁";

  }

});