import { auth } from "./firebase-config.js";

import {
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const recoverForm = document.getElementById("recoverForm");

const message = document.getElementById("message");

const backButton = document.getElementById("backButton");

function showMessage(text, type){

  message.style.display = "block";

  message.className = `message ${type}`;

  message.innerHTML = text;

}

recoverForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const email = document.getElementById("recoverEmail").value;

  try {

    await sendPasswordResetEmail(auth, email);

    recoverForm.style.display = "none";

    backButton.style.display = "block";

    showMessage(

      `
      Correo de recuperación enviado correctamente.<br><br>

      Revisa tu bandeja principal o la carpeta de spam.
      `,

      "success"

    );

  } catch (error) {

    showMessage(
      "No se pudo enviar el correo de recuperación",
      "error"
    );

    console.log(error);

  }

});