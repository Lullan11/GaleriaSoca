import { db } from "./firebase-config.js";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { checkAuth, logout, isAdmin } from "./auth-check.js";
import { agregarIconoNotificaciones, crearNotificacion } from "./notifications.js";

let todosPedidos = [];
let paginaActual = 1;
let mesActual = new Date().getMonth();
let anoActual = new Date().getFullYear();
const pedidosPorPagina = 5;

await checkAuth();
await agregarIconoNotificaciones();

document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("userName").textContent = `${localStorage.getItem("userName") || "Usuario"}`;

// Crear estructura del dashboard
const statsGrid = document.querySelector(".stats-grid");

const tabsHTML = `
    <div class="dashboard-tabs">
        <button class="tab-btn active" data-tab="resumen">📊 Resumen</button>
        <button class="tab-btn" data-tab="calendario">📅 Calendario de entregas</button>
        <button class="tab-btn" data-tab="pedidos">📋 Todos los pedidos</button>
    </div>
`;

statsGrid.insertAdjacentHTML("afterend", tabsHTML);

// Crear contenedores de tabs
const tabResumen = document.createElement("div");
tabResumen.id = "tabResumen";
tabResumen.className = "tab-content active";

const tabCalendario = document.createElement("div");
tabCalendario.id = "tabCalendario";
tabCalendario.className = "tab-content";

const tabPedidos = document.createElement("div");
tabPedidos.id = "tabPedidos";
tabPedidos.className = "tab-content";

statsGrid.parentNode.insertBefore(tabResumen, statsGrid.nextSibling);
tabResumen.parentNode.insertBefore(tabCalendario, tabResumen.nextSibling);
tabCalendario.parentNode.insertBefore(tabPedidos, tabCalendario.nextSibling);

tabResumen.appendChild(statsGrid);

tabResumen.insertAdjacentHTML("beforeend", `
    <section class="ultimos-pedidos-section">
        <div class="section-header">
            <h3>📋 Últimos pedidos</h3>
            <button class="ver-todos-btn" onclick="document.querySelector('[data-tab=\\'pedidos\\']').click()">Ver todos →</button>
        </div>
        <div id="listaUltimosPedidos" class="lista-ultimos-pedidos"></div>
    </section>
`);

tabPedidos.innerHTML = `
    <div class="pedidos-header">
        <h3><i class="fas fa-list"></i> Lista completa de pedidos</h3>
        <a href="pedidos.html" class="btn-crear-pedido">➕ Crear nuevo pedido</a>
    </div>
    <div id="listaCompletaPedidos" class="lista-completa-pedidos"></div>
    <div id="paginacion" class="paginacion-container"></div>
`;

// Eventos de tabs
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        const tab = btn.dataset.tab;
        tabResumen.style.display = tab === "resumen" ? "block" : "none";
        tabCalendario.style.display = tab === "calendario" ? "block" : "none";
        tabPedidos.style.display = tab === "pedidos" ? "block" : "none";
        
        if (tab === "calendario") {
            renderizarCalendarioVisual();
        }
        if (tab === "pedidos") {
            renderizarListaCompleta();
        }
    });
});

tabCalendario.style.display = "none";
tabPedidos.style.display = "none";

async function cargarDashboard() {
    try {
        const querySnapshot = await getDocs(collection(db, "pedidos"));
        let pedidosActivos = 0;
        let entregasHoy = 0;
        let ingresosTotales = 0;
        const hoy = new Date().toISOString().split("T")[0];
        
        todosPedidos = [];
        
        querySnapshot.forEach((doc) => {
            const p = doc.data();
            const pedidoConId = { id: doc.id, ...p };
            todosPedidos.push(pedidoConId);
            
            if (p.estado !== "Entregado" && p.estado !== "Cancelado") {
                pedidosActivos++;
            }
            if (p.fechaEntrega === hoy && p.estado !== "Entregado") {
                entregasHoy++;
            }
            ingresosTotales += (p.precio || 0);
        });
        
        document.getElementById("pedidosActivos").textContent = pedidosActivos;
        document.getElementById("entregasHoy").textContent = entregasHoy;
        document.getElementById("ingresosTotales").textContent = `$${ingresosTotales.toLocaleString()}`;
        
        const ultimosPedidos = [...todosPedidos]
            .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
            .slice(0, 5);
        
        const listaContainer = document.getElementById("listaUltimosPedidos");
        
        if (ultimosPedidos.length === 0) {
            listaContainer.innerHTML = '<div class="no-pedidos">📭 No hay pedidos creados aún</div>';
        } else {
            listaContainer.innerHTML = ultimosPedidos.map(pedido => crearCardPedido(pedido, true)).join('');
        }
        
    } catch (error) {
        console.error("Error:", error);
    }
}

function crearCardPedido(pedido, enResumen = false) {
    const saldo = (pedido.precio || 0) - (pedido.adelanto || 0);
    const telefonoLink = pedido.telefono ? `<a href="https://wa.me/57${pedido.telefono}" target="_blank" class="whatsapp-link"><i class="fab fa-whatsapp"></i> ${pedido.telefono}</a>` : "No especificado";
    const esAdmin = isAdmin();
    
    return `
        <div class="pedido-card-modern">
            <div class="pedido-card-header">
                <div>
                    <h4>🎨 ${pedido.cliente || "Sin cliente"}</h4>
                    <span class="estado-badge ${(pedido.estado || "pendiente").toLowerCase()}">${pedido.estado || "Pendiente"}</span>
                </div>
                <div class="pedido-card-actions">
                    <button class="icon-btn ver" onclick="window.verDetallePedido('${pedido.id}')"><i class="fas fa-eye"></i></button>
                    <button class="icon-btn editar" onclick="window.editarPedidoGlobal('${pedido.id}')"><i class="fas fa-edit"></i></button>
                    ${esAdmin ? `<button class="icon-btn eliminar" onclick="window.eliminarPedidoGlobal('${pedido.id}')"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            <div class="pedido-card-body">
                <p><i class="fas fa-palette"></i> ${pedido.tipoArte || "Sin tipo"}</p>
                <p><i class="fas fa-dollar-sign"></i> $${(pedido.precio || 0).toLocaleString()} <span class="saldo">(Saldo: $${saldo.toLocaleString()})</span></p>
                <p><i class="fab fa-whatsapp"></i> ${telefonoLink}</p>
                <p><i class="fas fa-calendar"></i> Entrega: ${pedido.fechaEntrega || "Sin fecha"}</p>
            </div>
            ${!enResumen && pedido.imagenes && pedido.imagenes.length > 0 ? 
                `<div class="pedido-mini-imagenes">${pedido.imagenes.slice(0, 3).map(img => `<img src="${img}" onclick="window.verImagen('${img}')">`).join('')}</div>` : ''
            }
        </div>
    `;
}

// Calendario visual en cuadrícula
function renderizarCalendarioVisual() {
    const primerDia = new Date(anoActual, mesActual, 1);
    const ultimoDia = new Date(anoActual, mesActual + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaInicioSemana = primerDia.getDay(); // 0 = Domingo
    
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    // Agrupar pedidos por fecha
    const pedidosPorFecha = {};
    todosPedidos.forEach(pedido => {
        if (pedido.fechaEntrega) {
            if (!pedidosPorFecha[pedido.fechaEntrega]) {
                pedidosPorFecha[pedido.fechaEntrega] = [];
            }
            pedidosPorFecha[pedido.fechaEntrega].push(pedido);
        }
    });
    
    let calendarioHTML = `
        <div class="calendario-visual">
            <div class="calendario-header">
                <button class="cal-mes-btn" onclick="cambiarMes(-1)"><i class="fas fa-chevron-left"></i></button>
                <h3>${meses[mesActual]} ${anoActual}</h3>
                <button class="cal-mes-btn" onclick="cambiarMes(1)"><i class="fas fa-chevron-right"></i></button>
                <button class="cal-hoy-btn" onclick="irHoy()">Hoy</button>
            </div>
            <div class="calendario-grid">
                <div class="calendario-dias-semana">
                    ${diasSemana.map(dia => `<div class="cal-dia-nombre">${dia}</div>`).join('')}
                </div>
                <div class="calendario-dias">
    `;
    
    // Días vacíos al inicio
    for (let i = 0; i < diaInicioSemana; i++) {
        calendarioHTML += `<div class="cal-dia vacio"></div>`;
    }
    
    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaStr = `${anoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const pedidosDia = pedidosPorFecha[fechaStr] || [];
        const esHoy = fechaStr === new Date().toISOString().split("T")[0];
        
        calendarioHTML += `
            <div class="cal-dia ${esHoy ? 'hoy' : ''} ${pedidosDia.length > 0 ? 'con-pedidos' : ''}">
                <div class="cal-dia-numero">${dia}</div>
                ${pedidosDia.length > 0 ? `
                    <div class="cal-pedidos">
                        ${pedidosDia.slice(0, 2).map(p => `
                            <div class="cal-pedido-item ${p.estado?.toLowerCase()}" onclick="window.verDetallePedido('${p.id}')" title="${p.cliente} - ${p.tipoArte}">
                                <span class="cal-pedido-nombre">${p.cliente?.substring(0, 12)}${p.cliente?.length > 12 ? '...' : ''}</span>
                            </div>
                        `).join('')}
                        ${pedidosDia.length > 2 ? `<div class="cal-pedido-mas">+${pedidosDia.length - 2} más</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    calendarioHTML += `
                </div>
            </div>
        </div>
    `;
    
    tabCalendario.innerHTML = calendarioHTML;
}

window.cambiarMes = (delta) => {
    let nuevaFecha = new Date(anoActual, mesActual + delta, 1);
    mesActual = nuevaFecha.getMonth();
    anoActual = nuevaFecha.getFullYear();
    renderizarCalendarioVisual();
};

window.irHoy = () => {
    const hoy = new Date();
    mesActual = hoy.getMonth();
    anoActual = hoy.getFullYear();
    renderizarCalendarioVisual();
};

function renderizarListaCompleta() {
    const pedidosOrdenados = [...todosPedidos].sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
    const inicio = (paginaActual - 1) * pedidosPorPagina;
    const fin = inicio + pedidosPorPagina;
    const pedidosPagina = pedidosOrdenados.slice(inicio, fin);
    const totalPaginas = Math.ceil(pedidosOrdenados.length / pedidosPorPagina);
    
    const container = document.getElementById("listaCompletaPedidos");
    
    if (pedidosPagina.length === 0) {
        container.innerHTML = '<div class="no-pedidos">📭 No hay pedidos creados aún</div>';
    } else {
        container.innerHTML = pedidosPagina.map(pedido => crearCardPedido(pedido, false)).join('');
    }
    
    const pagContainer = document.getElementById("paginacion");
    if (totalPaginas > 1) {
        let pagHTML = '<div class="paginacion">';
        pagHTML += `<button class="pagina-btn ${paginaActual === 1 ? 'disabled' : ''}" onclick="cambiarPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>◀ Anterior</button>`;
        
        let startPage = Math.max(1, paginaActual - 2);
        let endPage = Math.min(totalPaginas, paginaActual + 2);
        
        if (startPage > 1) {
            pagHTML += `<button class="pagina-btn" onclick="cambiarPagina(1)">1</button>`;
            if (startPage > 2) pagHTML += `<span class="paginacion-puntos">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pagHTML += `<button class="pagina-btn ${i === paginaActual ? 'activa' : ''}" onclick="cambiarPagina(${i})">${i}</button>`;
        }
        
        if (endPage < totalPaginas) {
            if (endPage < totalPaginas - 1) pagHTML += `<span class="paginacion-puntos">...</span>`;
            pagHTML += `<button class="pagina-btn" onclick="cambiarPagina(${totalPaginas})">${totalPaginas}</button>`;
        }
        
        pagHTML += `<button class="pagina-btn ${paginaActual === totalPaginas ? 'disabled' : ''}" onclick="cambiarPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}>Siguiente ▶</button>`;
        pagHTML += '</div>';
        pagContainer.innerHTML = pagHTML;
    } else {
        pagContainer.innerHTML = '';
    }
}

window.cambiarPagina = (pagina) => {
    const totalPaginas = Math.ceil(todosPedidos.length / pedidosPorPagina);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaActual = pagina;
    renderizarListaCompleta();
    document.getElementById("tabPedidos").scrollIntoView({ behavior: "smooth" });
};

// Funciones globales
window.verDetallePedido = async (id) => {
    const pedido = todosPedidos.find(p => p.id === id);
    if (!pedido) return;
    
    const imagenesHTML = pedido.imagenes && pedido.imagenes.length > 0 
        ? `<div class="modal-imagenes">${pedido.imagenes.map(img => `<img src="${img}" onclick="window.open('${img}')">`).join('')}</div>`
        : '<p>📷 Sin imágenes</p>';
    
    Swal.fire({
        title: `🎨 ${pedido.cliente}`,
        html: `
            <div style="text-align:left">
                <p><strong>Tipo:</strong> ${pedido.tipoArte}</p>
                <p><strong>📞 Teléfono:</strong> ${pedido.telefono ? `<a href="https://wa.me/57${pedido.telefono}" target="_blank">${pedido.telefono} <i class="fab fa-whatsapp"></i></a>` : "No"}</p>
                <p><strong>💰 Precio:</strong> $${(pedido.precio || 0).toLocaleString()}</p>
                <p><strong>💵 Adelanto:</strong> $${(pedido.adelanto || 0).toLocaleString()}</p>
                <p><strong>⚖️ Saldo:</strong> $${((pedido.precio || 0) - (pedido.adelanto || 0)).toLocaleString()}</p>
                <p><strong>📅 Entrega:</strong> ${pedido.fechaEntrega || "No definida"}</p>
                <p><strong>📝 Descripción:</strong> ${pedido.descripcion || "Sin descripción"}</p>
                ${pedido.observaciones ? `<p><strong>📌 Observaciones:</strong> ${pedido.observaciones}</p>` : ''}
                ${imagenesHTML}
            </div>
        `,
        width: "600px",
        confirmButtonText: "Cerrar"
    });
};

window.editarPedidoGlobal = async (id) => {
    const pedido = todosPedidos.find(p => p.id === id);
    if (!pedido) return;
    
    const { value: formValues } = await Swal.fire({
        title: '✏️ Editar pedido',
        html: `
            <input id="edit-cliente" class="swal2-input" placeholder="Cliente" value="${pedido.cliente || ''}">
            <input id="edit-telefono" class="swal2-input" placeholder="Teléfono" value="${pedido.telefono || ''}">
            <input id="edit-tipoArte" class="swal2-input" placeholder="Tipo de arte" value="${pedido.tipoArte || ''}">
            <input id="edit-precio" class="swal2-input" type="number" placeholder="Precio" value="${pedido.precio || 0}">
            <input id="edit-adelanto" class="swal2-input" type="number" placeholder="Adelanto" value="${pedido.adelanto || 0}">
            <input id="edit-fechaEntrega" class="swal2-input" type="date" value="${pedido.fechaEntrega || ''}">
            <select id="edit-estado" class="swal2-input">
                <option value="Pendiente" ${pedido.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
                <option value="Diseñando" ${pedido.estado === "Diseñando" ? "selected" : ""}>Diseñando</option>
                <option value="Listo" ${pedido.estado === "Listo" ? "selected" : ""}>Listo</option>
                <option value="Entregado" ${pedido.estado === "Entregado" ? "selected" : ""}>Entregado</option>
                <option value="Cancelado" ${pedido.estado === "Cancelado" ? "selected" : ""}>Cancelado</option>
            </select>
            <textarea id="edit-descripcion" class="swal2-textarea" placeholder="Descripción">${pedido.descripcion || ''}</textarea>
            <textarea id="edit-observaciones" class="swal2-textarea" placeholder="Observaciones">${pedido.observaciones || ''}</textarea>
        `,
        focusConfirm: false,
        preConfirm: () => {
            return {
                cliente: document.getElementById('edit-cliente').value,
                telefono: document.getElementById('edit-telefono').value,
                tipoArte: document.getElementById('edit-tipoArte').value,
                precio: parseFloat(document.getElementById('edit-precio').value) || 0,
                adelanto: parseFloat(document.getElementById('edit-adelanto').value) || 0,
                fechaEntrega: document.getElementById('edit-fechaEntrega').value,
                estado: document.getElementById('edit-estado').value,
                descripcion: document.getElementById('edit-descripcion').value,
                observaciones: document.getElementById('edit-observaciones').value
            };
        }
    });
    
    if (formValues) {
        const estadoAnterior = pedido.estado;
        await updateDoc(doc(db, "pedidos", id), formValues);
        
        let detalle = `Pedido de ${formValues.cliente}`;
        if (formValues.estado !== estadoAnterior) {
            detalle += ` - Cambió estado de ${estadoAnterior} a ${formValues.estado}`;
        }
        
        await crearNotificacion("editar", detalle, "info", id, formValues.cliente);
        Swal.fire('✅ Actualizado', 'Pedido actualizado correctamente', 'success');
        location.reload();
    }
};

window.eliminarPedidoGlobal = async (id) => {
    if (!isAdmin()) {
        Swal.fire('Acceso denegado', 'Solo administradores pueden eliminar', 'error');
        return;
    }
    
    const result = await Swal.fire({
        title: '¿Eliminar pedido?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    });
    if (result.isConfirmed) {
        const pedido = todosPedidos.find(p => p.id === id);
        await deleteDoc(doc(db, "pedidos", id));
        await crearNotificacion("eliminar", `Se eliminó el pedido de ${pedido?.cliente || "un cliente"}`, "warning", id, pedido?.cliente);
        Swal.fire('Eliminado', 'Pedido eliminado', 'success');
        location.reload();
    }
};

window.verImagen = (url) => {
    Swal.fire({ imageUrl: url, imageAlt: "Imagen", width: "auto", showCloseButton: true });
};

cargarDashboard();