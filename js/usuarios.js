import { db, auth } from "./firebase-config.js";
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { checkAuth, isAdmin, logout } from "./auth-check.js";
import { cargarNotificaciones, mostrarPanelNotificaciones, crearNotificacion } from "./notifications.js";

await checkAuth();

if (!isAdmin()) {
    Swal.fire("Acceso denegado", "Solo administradores", "error").then(() => {
        window.location.href = "dashboard.html";
    });
}

// Inicializar notificaciones
await cargarNotificaciones();

// Evento para el icono de notificaciones
const notifIcono = document.getElementById("notificacionesIcono");
if (notifIcono) {
    notifIcono.addEventListener("click", (e) => {
        e.stopPropagation();
        mostrarPanelNotificaciones();
    });
}

// Cerrar sesión
document.getElementById("logoutBtn").addEventListener("click", logout);

const usuariosContainer = document.getElementById("usuariosContainer");

// Botón para crear usuario
const crearUsuarioHTML = `
    <div class="crear-usuario-container">
        <button id="btnCrearUsuario" class="btn-crear-usuario">
            <i class="fas fa-user-plus"></i> + Nuevo Usuario
        </button>
    </div>
`;
usuariosContainer.insertAdjacentHTML("beforebegin", crearUsuarioHTML);

document.getElementById("btnCrearUsuario").addEventListener("click", async () => {
    // SweetAlert para confirmar contraseña del admin
    const { value: adminPassword } = await Swal.fire({
        title: '🔐 Verificación de seguridad',
        html: `
            <div style="text-align: left; padding: 10px;">
                <div style="background: rgba(255, 74, 74, 0.1); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                    <i class="fas fa-shield-alt" style="color: #FF4A4A; font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    <p style="color: #fff; margin: 0; font-size: 14px;">Para crear un nuevo usuario, necesitamos verificar tu identidad.</p>
                </div>
                <label style="color: #FF4A4A; font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">
                    <i class="fas fa-key"></i> Contraseña de administrador
                </label>
                <input id="admin-password" class="swal2-input" type="password" placeholder="Ingresa tu contraseña" style="width: 100%; margin: 0;">
                <p style="color: #888; font-size: 11px; margin-top: 10px;">
                    <i class="fas fa-info-circle"></i> Esta medida protege la seguridad del sistema
                </p>
            </div>
        `,
        focusConfirm: false,
        width: '450px',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check"></i> Verificar y continuar',
        cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
        confirmButtonColor: '#27ae60',
        cancelButtonColor: '#555',
        preConfirm: () => {
            const password = document.getElementById('admin-password').value;
            if (!password) {
                Swal.showValidationMessage('❌ Ingresa tu contraseña para continuar');
                return false;
            }
            return password;
        }
    });
    
    if (!adminPassword) {
        return;
    }
    
    // Guardar el email del admin actual
    const adminEmail = auth.currentUser?.email;
    
    // Resto del código para crear usuario...
    const { value: formValues } = await Swal.fire({
        title: '📝 Crear nuevo usuario',
        html: `
            <div style="text-align: left; padding: 10px;">
                <div style="background: linear-gradient(135deg, #1a1a1a, #0d0d0d); border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid #2a2a2a;">
                    <i class="fas fa-user-plus" style="color: #27ae60; font-size: 22px; margin-bottom: 8px; display: block;"></i>
                    <p style="color: #aaa; font-size: 13px; margin: 0;">Completa la información del nuevo usuario</p>
                </div>
                
                <label style="color: #FF4A4A; font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                    <i class="fas fa-user"></i> Nombre completo
                </label>
                <input id="new-nombre" class="swal2-input" placeholder="Ej: Juan Pérez" style="margin-bottom: 15px;" required>
                
                <label style="color: #FF4A4A; font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                    <i class="fas fa-envelope"></i> Correo electrónico
                </label>
                <input id="new-email" class="swal2-input" type="email" placeholder="correo@ejemplo.com" style="margin-bottom: 15px;" required>
                
                <label style="color: #FF4A4A; font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                    <i class="fas fa-lock"></i> Contraseña
                </label>
                <input id="new-password" class="swal2-input" type="password" placeholder="Mínimo 6 caracteres" style="margin-bottom: 15px;" required>
                
                <label style="color: #FF4A4A; font-size: 12px; font-weight: 600; margin-bottom: 5px; display: block;">
                    <i class="fas fa-tag"></i> Rol
                </label>
                <select id="new-rol" class="swal2-select" style="width: 100%; padding: 10px; border-radius: 10px; background: #1a1a1a; color: #fff; border: 1px solid #2a2a2a;">
                    <option value="usuario">👤 Usuario normal</option>
                    <option value="admin">👑 Administrador</option>
                </select>
            </div>
        `,
        focusConfirm: false,
        width: '500px',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-save"></i> Crear usuario',
        cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
        confirmButtonColor: '#27ae60',
        cancelButtonColor: '#555',
        preConfirm: () => {
            const nombre = document.getElementById('new-nombre').value;
            const email = document.getElementById('new-email').value;
            const password = document.getElementById('new-password').value;
            const rol = document.getElementById('new-rol').value;
            
            if (!nombre || !nombre.trim()) {
                Swal.showValidationMessage('❌ El nombre es requerido');
                return false;
            }
            if (!email || !email.trim()) {
                Swal.showValidationMessage('❌ El correo es requerido');
                return false;
            }
            if (!email.includes('@') || !email.includes('.')) {
                Swal.showValidationMessage('❌ Ingresa un correo válido');
                return false;
            }
            if (!password || password.length < 6) {
                Swal.showValidationMessage('❌ La contraseña debe tener al menos 6 caracteres');
                return false;
            }
            return { 
                nombre: nombre.trim(), 
                email: email.trim().toLowerCase(), 
                password, 
                rol 
            };
        }
    });
    
    if (formValues) {
        try {
            Swal.fire({
                title: '⏳ Creando usuario...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Crear usuario en Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, formValues.email, formValues.password);
            
            // Guardar en Firestore
            await addDoc(collection(db, "usuarios"), {
                nombre: formValues.nombre,
                correo: formValues.email,
                rol: formValues.rol,
                activo: true,
                uid: userCredential.user.uid,
                fechaCreacion: new Date().toISOString()
            });
            
            // Volver a loguear al admin
            await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
            
            // Actualizar localStorage
            localStorage.setItem("userName", "Administrador");
            localStorage.setItem("userRol", "admin");
            localStorage.setItem("userEmail", adminEmail);
            
            // Notificación
            await crearNotificacion("crear", `Se creó un nuevo usuario: ${formValues.nombre} (${formValues.rol === 'admin' ? 'Admin' : 'Usuario'})`, "success");
            
            Swal.fire({
                icon: 'success',
                title: '✅ Usuario creado',
                html: `
                    <div style="text-align: center;">
                        <i class="fas fa-user-check" style="font-size: 48px; color: #27ae60; margin-bottom: 10px; display: block;"></i>
                        <p><strong>${formValues.nombre}</strong> ha sido creado exitosamente</p>
                        <p style="color: #aaa; font-size: 12px;">Rol: ${formValues.rol === 'admin' ? '👑 Administrador' : '👤 Usuario'}</p>
                    </div>
                `,
                timer: 2500,
                showConfirmButton: false
            });
            
            await cargarUsuarios();
            
        } catch (error) {
            console.error("Error:", error);
            let mensaje = "Error al crear usuario";
            let detalle = "";
            
            if (error.code === 'auth/email-already-in-use') {
                mensaje = "❌ Correo ya registrado";
                detalle = "Este correo electrónico ya está en uso por otro usuario";
            } else if (error.code === 'auth/invalid-email') {
                mensaje = "❌ Correo inválido";
                detalle = "Ingresa un correo electrónico válido";
            } else if (error.code === 'auth/weak-password') {
                mensaje = "❌ Contraseña débil";
                detalle = "La contraseña debe tener al menos 6 caracteres";
            } else if (error.code === 'auth/wrong-password') {
                mensaje = "❌ Contraseña incorrecta";
                detalle = "La contraseña de administrador es incorrecta";
            }
            
            Swal.fire({
                icon: 'error',
                title: mensaje,
                text: detalle,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Entendido'
            });
        }
    }
});
async function cargarUsuarios() {
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    usuariosContainer.innerHTML = "";
    
    if (querySnapshot.empty) {
        usuariosContainer.innerHTML = '<div class="no-pedidos"><i class="fas fa-users"></i><p>No hay usuarios registrados</p></div>';
        return;
    }
    
    const usuariosArray = [];
    querySnapshot.forEach((doc) => {
        usuariosArray.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por fecha de creación
    usuariosArray.sort((a, b) => {
        if (a.fechaCreacion && b.fechaCreacion) {
            return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
        }
        return 0;
    });
    
    usuariosArray.forEach((u) => {
        const card = document.createElement("div");
        card.className = "usuario-card";
        card.innerHTML = `
            <div class="usuario-info">
                <h3><i class="fas fa-user-circle"></i> ${u.nombre || "Sin nombre"}</h3>
                <p><i class="fas fa-envelope"></i> ${u.correo}</p>
                <p><i class="fas fa-tag"></i> Rol: <span class="rol-badge ${u.rol}">${u.rol === 'admin' ? '👑 Administrador' : '👤 Usuario'}</span></p>
                <p><i class="fas ${u.activo ? "fa-check-circle activo" : "fa-times-circle inactivo"}"></i> ${u.activo ? "Activo" : "Inactivo"}</p>
            </div>
            <div class="usuario-acciones">
                <button onclick="window.cambiarRol('${u.id}', '${u.rol}')" class="btn-rol"><i class="fas fa-exchange-alt"></i> Cambiar rol</button>
                <button onclick="window.toggleActivo('${u.id}', ${u.activo})" class="btn-estado"><i class="fas ${u.activo ? 'fa-ban' : 'fa-check'}"></i> ${u.activo ? "Desactivar" : "Activar"}</button>
                ${u.rol !== "admin" ? `<button onclick="window.eliminarUsuario('${u.id}', '${u.nombre}')" class="btn-eliminar-user"><i class="fas fa-trash"></i> Eliminar</button>` : '<span class="admin-badge">👑 Admin principal</span>'}
            </div>
        `;
        usuariosContainer.appendChild(card);
    });
}

window.cambiarRol = async (id, rolActual) => {
    const nuevoRol = rolActual === "admin" ? "usuario" : "admin";
    const result = await Swal.fire({
        title: `¿Cambiar rol a ${nuevoRol === 'admin' ? 'Administrador' : 'Usuario'}?`,
        text: `El usuario pasará a ser ${nuevoRol === 'admin' ? 'Administrador' : 'Usuario'}`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, cambiar"
    });
    if (result.isConfirmed) {
        await updateDoc(doc(db, "usuarios", id), { rol: nuevoRol });
        await crearNotificacion("editar", `Se cambió el rol de un usuario a ${nuevoRol}`, "info");
        Swal.fire("✅ Actualizado", `Rol cambiado a ${nuevoRol}`, "success");
        cargarUsuarios();
    }
};

window.toggleActivo = async (id, activo) => {
    const nuevoEstado = !activo;
    const result = await Swal.fire({
        title: `${nuevoEstado ? 'Activar' : 'Desactivar'} usuario?`,
        text: `El usuario quedará ${nuevoEstado ? 'activo' : 'inactivo'}`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: `Sí, ${nuevoEstado ? 'activar' : 'desactivar'}`
    });
    if (result.isConfirmed) {
        await updateDoc(doc(db, "usuarios", id), { activo: nuevoEstado });
        await crearNotificacion("editar", `Se ${nuevoEstado ? 'activó' : 'desactivó'} un usuario`, "info");
        Swal.fire("✅ Actualizado", "", "success");
        cargarUsuarios();
    }
};

window.eliminarUsuario = async (id, nombre) => {
    const result = await Swal.fire({
        title: "¿Eliminar usuario?",
        text: `¿Estás seguro de eliminar a ${nombre}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar"
    });
    if (result.isConfirmed) {
        await deleteDoc(doc(db, "usuarios", id));
        await crearNotificacion("eliminar", `Se eliminó el usuario ${nombre}`, "warning");
        Swal.fire("✅ Eliminado", "Usuario eliminado", "success");
        cargarUsuarios();
    }
};

cargarUsuarios();