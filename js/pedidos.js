import { db } from "./firebase-config.js";

const imagenesInput =
  document.getElementById("imagenes");

const previewContainer =
  document.getElementById("previewContainer");

imagenesInput.addEventListener("change", () => {

  previewContainer.innerHTML = "";

  const files = imagenesInput.files;

  for(const file of files){

    const reader = new FileReader();

    reader.onload = (e) => {

      previewContainer.innerHTML += `

        <img src="${e.target.result}">

      `;

    };

    reader.readAsDataURL(file);

  }

});