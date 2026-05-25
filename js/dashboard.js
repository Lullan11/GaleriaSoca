import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const userName = document.getElementById("userName");

const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {

  if(user){

    try{

    console.log(user.email);
      const q = query(
        collection(db, "usuarios"),
        where("correo", "==", user.email)
      );

      const querySnapshot = await getDocs(q);

      if(!querySnapshot.empty){

        querySnapshot.forEach((doc) => {

          const data = doc.data();

          userName.textContent = `Hola, ${data.nombre}`;

        });

      }else{

        userName.textContent = "Hola";

      }

    }catch(error){

      console.log(error);

    }

  }else{

    window.location.href = "index.html";

  }

});

logoutBtn.addEventListener("click", async () => {

  await signOut(auth);

  window.location.href = "index.html";

});