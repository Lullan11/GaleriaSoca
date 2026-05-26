import { auth } from "./firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

export async function checkAuth() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (!user) {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso denegado',
                    text: 'Debes iniciar sesión primero',
                    timer: 1500
                }).then(() => {
                    window.location.href = "index.html";
                });
                resolve(false);
            } else {
                try {
                    const q = query(collection(db, "usuarios"), where("correo", "==", user.email));
                    const querySnapshot = await getDocs(q);
                    
                    let rol = "usuario";
                    let nombre = user.email;
                    
                    if (!querySnapshot.empty) {
                        const userData = querySnapshot.docs[0].data();
                        rol = userData?.rol || "usuario";
                        nombre = userData?.nombre || user.email;
                    }
                    
                    localStorage.setItem("userName", nombre);
                    localStorage.setItem("userRol", rol);
                    localStorage.setItem("userEmail", user.email);
                    
                    resolve({ user, rol });
                } catch (error) {
                    console.error("Error:", error);
                    resolve({ user, rol: "usuario" });
                }
            }
        });
    });
}

export function isAdmin() {
    return localStorage.getItem("userRol") === "admin";
}

export async function logout() {
    await auth.signOut();
    localStorage.clear();
    Swal.fire({
        icon: 'success',
        title: 'Sesión cerrada',
        timer: 1000,
        showConfirmButton: false
    }).then(() => {
        window.location.href = "index.html";
    });
}