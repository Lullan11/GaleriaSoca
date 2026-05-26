import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let notificacionesCache = [];

// Obtener usuario actual
function getCurrentUser() {
    return {
        nombre: localStorage.getItem("userName") || "Usuario",
        email: localStorage.getItem("userEmail") || "unknown",
        rol: localStorage.getItem("userRol") || "usuario"
    };
}

// Crear notificación con información del usuario
export async function crearNotificacion(accion, detalles, tipo, pedidoId = null, pedidoNombre = null) {
    const usuario = getCurrentUser();
    
    const notificacion = {
        accion: accion, // 'crear', 'editar', 'eliminar'
        detalles: detalles,
        tipo: tipo,
        pedidoId: pedidoId,
        pedidoNombre: pedidoNombre,
        usuario: {
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol
        },
        leida: false,
        fecha: new Date().toISOString(),
        timestamp: Date.now()
    };
    
    try {
        await addDoc(collection(db, "notificaciones"), notificacion);
        await cargarNotificaciones();
        actualizarBadge();
        // Mostrar toast en tiempo real
        mostrarToast(accion, detalles, usuario.nombre);
    } catch (error) {
        console.error("Error guardando notificación:", error);
    }
}

function mostrarToast(accion, detalles, usuario) {
    const iconos = {
        crear: { icon: 'success', emoji: '➕' },
        editar: { icon: 'info', emoji: '✏️' },
        eliminar: { icon: 'error', emoji: '🗑️' }
    };
    
    const config = iconos[accion] || { icon: 'info', emoji: '📢' };
    
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true
    });
    
    Toast.fire({
        icon: config.icon,
        title: `${config.emoji} ${accion.toUpperCase()}`,
        text: `${detalles} por ${usuario}`
    });
}

// Cargar notificaciones
export async function cargarNotificaciones() {
    try {
        const q = query(collection(db, "notificaciones"), orderBy("fecha", "desc"));
        const querySnapshot = await getDocs(q);
        notificacionesCache = [];
        
        querySnapshot.forEach((doc) => {
            notificacionesCache.push({ id: doc.id, ...doc.data() });
        });
        
        actualizarBadge();
        return notificacionesCache;
    } catch (error) {
        console.error("Error cargando notificaciones:", error);
        return [];
    }
}

function actualizarBadge() {
    const noLeidas = notificacionesCache.filter(n => !n.leida).length;
    const badge = document.querySelector(".notificaciones-badge");
    if (badge) {
        if (noLeidas > 0) {
            badge.textContent = noLeidas > 9 ? "9+" : noLeidas;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    }
}

export async function marcarComoLeida(id) {
    await updateDoc(doc(db, "notificaciones", id), { leida: true });
    await cargarNotificaciones();
}

export function mostrarPanelNotificaciones() {
    const panelExistente = document.getElementById("notificacionesPanel");
    if (panelExistente) {
        panelExistente.remove();
        return;
    }
    
    const getIconoAccion = (accion) => {
        switch(accion) {
            case 'crear': return 'fa-plus-circle';
            case 'editar': return 'fa-edit';
            case 'eliminar': return 'fa-trash-alt';
            default: return 'fa-bell';
        }
    };
    
    const getColorAccion = (accion) => {
        switch(accion) {
            case 'crear': return '#27ae60';
            case 'editar': return '#f39c12';
            case 'eliminar': return '#e74c3c';
            default: return '#3498db';
        }
    };
    
    const panelHTML = `
        <div id="notificacionesPanel" class="notificaciones-panel">
            <div class="panel-header">
                <h3><i class="fas fa-bell"></i> Notificaciones</h3>
                <button id="cerrarPanelNotif" class="cerrar-panel"><i class="fas fa-times"></i></button>
            </div>
            <div class="panel-body" id="panelBodyNotif">
                ${notificacionesCache.length === 0 ? '<div class="no-notificaciones">No hay notificaciones</div>' : 
                    notificacionesCache.map(n => `
                        <div class="notificacion-item ${n.leida ? 'leida' : 'no-leida'}" data-id="${n.id}">
                            <div class="notif-icon" style="background: ${getColorAccion(n.accion)}20; color: ${getColorAccion(n.accion)}">
                                <i class="fas ${getIconoAccion(n.accion)}"></i>
                            </div>
                            <div class="notif-content">
                                <div class="notif-titulo">
                                    <strong>${n.accion?.toUpperCase() || 'NOTIFICACIÓN'}</strong>
                                    ${n.pedidoNombre ? `<span class="notif-pedido">🎨 ${n.pedidoNombre}</span>` : ''}
                                </div>
                                <div class="notif-mensaje">${n.detalles}</div>
                                <div class="notif-usuario">
                                    <i class="fas fa-user"></i> ${n.usuario?.nombre || 'Usuario'} 
                                    <span class="notif-rol ${n.usuario?.rol}">${n.usuario?.rol || 'usuario'}</span>
                                </div>
                                <div class="notif-fecha">${new Date(n.fecha).toLocaleString()}</div>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML("beforeend", panelHTML);
    
    const panel = document.getElementById("notificacionesPanel");
    setTimeout(() => panel.classList.add("visible"), 10);
    
    document.getElementById("cerrarPanelNotif").addEventListener("click", () => {
        panel.classList.remove("visible");
        setTimeout(() => panel.remove(), 300);
    });
    
    document.querySelectorAll(".notificacion-item").forEach(item => {
        item.addEventListener("click", async () => {
            const id = item.dataset.id;
            if (!item.classList.contains("leida")) {
                await marcarComoLeida(id);
                item.classList.remove("no-leida");
                item.classList.add("leida");
                actualizarBadge();
            }
        });
    });
}

export async function agregarIconoNotificaciones() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;
    
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;
    
    const notifHTML = `
        <div class="notificaciones-icono" id="notificacionesIcono">
            <i class="fas fa-bell"></i>
            <span class="notificaciones-badge" style="display:none">0</span>
        </div>
    `;
    
    logoutBtn.insertAdjacentHTML("beforebegin", notifHTML);
    
    await cargarNotificaciones();
    
    document.getElementById("notificacionesIcono").addEventListener("click", mostrarPanelNotificaciones);
}