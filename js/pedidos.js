import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { subirImagenes } from "./cloudinary-config.js";
import { checkAuth, isAdmin, logout } from "./auth-check.js";
import { crearNotificacion, cargarNotificaciones, mostrarPanelNotificaciones } from "./notifications.js";
await checkAuth();

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

// Cerrar sesión - solo una vez
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
}

// CAMBIO DE MÓDULOS
const btnFormulario = document.getElementById("btnFormulario");
const btnLista = document.getElementById("btnLista");
const moduloFormulario = document.getElementById("moduloFormulario");
const moduloLista = document.getElementById("moduloLista");

if (btnFormulario) {
    btnFormulario.addEventListener("click", () => {
        btnFormulario.classList.add("active");
        btnLista.classList.remove("active");
        moduloFormulario.classList.add("active");
        moduloLista.classList.remove("active");
    });
}

if (btnLista) {
    btnLista.addEventListener("click", () => {
        btnLista.classList.add("active");
        btnFormulario.classList.remove("active");
        moduloLista.classList.add("active");
        moduloFormulario.classList.remove("active");
        renderizarPedidos();
    });
}

let pedidosEditando = null;
let todosPedidos = [];
let paginaActual = 1;
let busquedaActual = "";
let filtroEstadoActual = "todos";
const pedidosPorPagina = 6;

const imagenesInput = document.getElementById("imagenes");
const previewContainer = document.getElementById("previewContainer");
const pedidoForm = document.getElementById("pedidoForm");
const pedidosContainer = document.getElementById("pedidosContainer");
const submitBtn = document.getElementById("submitBtn");
const searchInput = document.getElementById("searchPedido");
const filterEstado = document.getElementById("filterEstado");

// Previsualización
if (imagenesInput) {
    imagenesInput.addEventListener("change", () => {
        previewContainer.innerHTML = "";
        const files = imagenesInput.files;
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewContainer.innerHTML += `<img src="${e.target.result}">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Búsqueda y filtros
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        busquedaActual = e.target.value.toLowerCase();
        paginaActual = 1;
        renderizarPedidos();
    });
}

if (filterEstado) {
    filterEstado.addEventListener("change", (e) => {
        filtroEstadoActual = e.target.value;
        paginaActual = 1;
        renderizarPedidos();
    });
}

// Guardar o actualizar
if (pedidoForm) {
    pedidoForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        submitBtn.disabled = true;
        
        try {
            let imagenesURLs = [];
            const files = Array.from(imagenesInput.files);
            
            if (files.length > 0) {
                imagenesURLs = await subirImagenes(files);
            }
            
            const cliente = document.getElementById("cliente").value;
            const pedidoData = {
                cliente: cliente,
                telefono: document.getElementById("telefono").value,
                tipoArte: document.getElementById("tipoArte").value,
                precio: parseFloat(document.getElementById("precio").value) || 0,
                adelanto: parseFloat(document.getElementById("adelanto").value) || 0,
                fechaEntrega: document.getElementById("fechaEntrega").value,
                estado: document.getElementById("estado").value,
                descripcion: document.getElementById("descripcion").value,
                observaciones: document.getElementById("observaciones").value,
            };
            
            if (pedidosEditando) {
                if (imagenesURLs.length > 0) {
                    pedidoData.imagenes = imagenesURLs;
                }
                await updateDoc(doc(db, "pedidos", pedidosEditando), pedidoData);
                await crearNotificacion("editar", `Se actualizó el pedido de ${cliente}`, "info", pedidosEditando, cliente);
                Swal.fire("✅ Actualizado", "Pedido actualizado correctamente", "success");
                pedidosEditando = null;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar pedido';
                const formHeader = document.querySelector(".form-header h3");
                if (formHeader) formHeader.innerHTML = '<i class="fas fa-plus-circle"></i> Crear nuevo pedido';
                if (btnFormulario) btnFormulario.click();
            } else {
                pedidoData.imagenes = imagenesURLs;
                pedidoData.fechaCreacion = new Date().toISOString();
                await addDoc(collection(db, "pedidos"), pedidoData);
                await crearNotificacion("crear", `Se creó un nuevo pedido para ${cliente}`, "success", null, cliente);
                Swal.fire("✅ Guardado", "Pedido creado exitosamente", "success");
            }
            
            pedidoForm.reset();
            previewContainer.innerHTML = "";
            imagenesInput.value = "";
            await cargarPedidos();
            
        } catch (error) {
            Swal.fire("❌ Error", error.message, "error");
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

async function cargarPedidos() {
    const querySnapshot = await getDocs(collection(db, "pedidos"));
    todosPedidos = [];
    
    querySnapshot.forEach((doc) => {
        todosPedidos.push({ id: doc.id, ...doc.data() });
    });
    
    renderizarPedidos();
}

function renderizarPedidos() {
    if (!pedidosContainer) return;
    
    let pedidosFiltrados = todosPedidos.filter(p => {
        const matchBusqueda = !busquedaActual || 
            p.cliente?.toLowerCase().includes(busquedaActual) ||
            p.tipoArte?.toLowerCase().includes(busquedaActual);
        const matchEstado = filtroEstadoActual === "todos" || p.estado === filtroEstadoActual;
        return matchBusqueda && matchEstado;
    });
    
    pedidosFiltrados.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
    
    const totalPedidos = pedidosFiltrados.length;
    const totalPaginas = Math.ceil(totalPedidos / pedidosPorPagina);
    const inicio = (paginaActual - 1) * pedidosPorPagina;
    const fin = inicio + pedidosPorPagina;
    const pedidosPagina = pedidosFiltrados.slice(inicio, fin);
    
    if (pedidosPagina.length === 0) {
        pedidosContainer.innerHTML = `
            <div class="no-pedidos">
                <i class="fas fa-inbox"></i>
                <p>No hay pedidos para mostrar</p>
                <small>${busquedaActual || filtroEstadoActual !== "todos" ? "Intenta con otros filtros" : "Crea tu primer pedido"}</small>
            </div>
        `;
    } else {
        pedidosContainer.innerHTML = pedidosPagina.map(pedido => crearCardPedido(pedido)).join('');
    }
    
    const pagContainer = document.getElementById("paginacionPedidos");
    if (pagContainer) {
        if (totalPaginas > 1) {
            let pagHTML = '<div class="paginacion">';
            pagHTML += `<button class="pagina-btn ${paginaActual === 1 ? 'disabled' : ''}" onclick="cambiarPaginaPedidos(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>◀ Anterior</button>`;
            
            let startPage = Math.max(1, paginaActual - 2);
            let endPage = Math.min(totalPaginas, paginaActual + 2);
            
            if (startPage > 1) {
                pagHTML += `<button class="pagina-btn" onclick="cambiarPaginaPedidos(1)">1</button>`;
                if (startPage > 2) pagHTML += `<span class="paginacion-puntos">...</span>`;
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pagHTML += `<button class="pagina-btn ${i === paginaActual ? 'activa' : ''}" onclick="cambiarPaginaPedidos(${i})">${i}</button>`;
            }
            
            if (endPage < totalPaginas) {
                if (endPage < totalPaginas - 1) pagHTML += `<span class="paginacion-puntos">...</span>`;
                pagHTML += `<button class="pagina-btn" onclick="cambiarPaginaPedidos(${totalPaginas})">${totalPaginas}</button>`;
            }
            
            pagHTML += `<button class="pagina-btn ${paginaActual === totalPaginas ? 'disabled' : ''}" onclick="cambiarPaginaPedidos(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}>Siguiente ▶</button>`;
            pagHTML += '</div>';
            pagContainer.innerHTML = pagHTML;
        } else {
            pagContainer.innerHTML = '';
        }
    }
}

window.cambiarPaginaPedidos = (pagina) => {
    const pedidosFiltrados = todosPedidos.filter(p => {
        const matchBusqueda = !busquedaActual || 
            p.cliente?.toLowerCase().includes(busquedaActual) ||
            p.tipoArte?.toLowerCase().includes(busquedaActual);
        const matchEstado = filtroEstadoActual === "todos" || p.estado === filtroEstadoActual;
        return matchBusqueda && matchEstado;
    });
    const totalPaginas = Math.ceil(pedidosFiltrados.length / pedidosPorPagina);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaActual = pagina;
    renderizarPedidos();
};

function crearCardPedido(pedido) {
    const saldo = (pedido.precio || 0) - (pedido.adelanto || 0);
    const telefonoLink = pedido.telefono ? `<a href="https://wa.me/57${pedido.telefono}" target="_blank" class="whatsapp-link"><i class="fab fa-whatsapp"></i> ${pedido.telefono}</a>` : "No disponible";
    const esAdmin = isAdmin();
    const fechaCreacion = pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleDateString() : "";
    
    const estadoIcono = {
        'Pendiente': '📋',
        'Diseñando': '🎨',
        'Listo': '✅',
        'Entregado': '🚚',
        'Cancelado': '❌'
    };
    
    return `
        <div class="pedido-card">
            <div class="pedido-card-header">
                <div class="pedido-cliente">
                    <h4><i class="fas fa-user-circle"></i> ${pedido.cliente || "Sin cliente"}</h4>
                    <span class="estado-badge ${(pedido.estado || "pendiente").toLowerCase()}">
                        ${estadoIcono[pedido.estado] || '📋'} ${pedido.estado || "Pendiente"}
                    </span>
                </div>
                <div class="pedido-card-actions">
                    <button class="icon-btn ver" onclick="window.verPedidoDetalle('${pedido.id}')" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="icon-btn editar" onclick="window.editarPedidoCompleto('${pedido.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${esAdmin ? `<button class="icon-btn eliminar" onclick="window.eliminarPedidoCompleto('${pedido.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </div>
            </div>
            <div class="pedido-card-body">
                <div class="pedido-info-row">
                    <span><i class="fas fa-palette"></i> ${pedido.tipoArte || "Sin tipo"}</span>
                    <span><i class="fas fa-dollar-sign"></i> $${(pedido.precio || 0).toLocaleString()}</span>
                    <span class="saldo"><i class="fas fa-coins"></i> Saldo: $${saldo.toLocaleString()}</span>
                </div>
                <div class="pedido-info-row">
                    <span><i class="fab fa-whatsapp"></i> ${telefonoLink}</span>
                    <span><i class="fas fa-calendar"></i> Entrega: ${pedido.fechaEntrega || "Sin fecha"}</span>
                    <span><i class="fas fa-clock"></i> Creado: ${fechaCreacion}</span>
                </div>
            </div>
            ${pedido.imagenes && pedido.imagenes.length > 0 ? `
                <div class="pedido-imagenes-preview">
                    ${pedido.imagenes.slice(0, 4).map(img => `<img src="${img}" onclick="window.verImagenGrande('${img}')">`).join('')}
                    ${pedido.imagenes.length > 4 ? `<span class="mas-imagenes">+${pedido.imagenes.length - 4}</span>` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

window.verPedidoDetalle = async (id) => {
    const pedido = todosPedidos.find(p => p.id === id);
    if (!pedido) return;
    
    const imagenesHTML = pedido.imagenes && pedido.imagenes.length > 0 
        ? `<div class="modal-imagenes">${pedido.imagenes.map(img => `<img src="${img}" onclick="window.open('${img}')">`).join('')}</div>`
        : "<p>📷 Sin imágenes</p>";
    
    Swal.fire({
        title: `🎨 ${pedido.cliente}`,
        html: `
            <div style="text-align:left">
                <p><strong><i class="fas fa-palette"></i> Tipo:</strong> ${pedido.tipoArte}</p>
                <p><strong><i class="fab fa-whatsapp"></i> Teléfono:</strong> ${pedido.telefono ? `<a href="https://wa.me/57${pedido.telefono}" target="_blank">${pedido.telefono} <i class="fab fa-whatsapp"></i></a>` : "No"}</p>
                <p><strong><i class="fas fa-dollar-sign"></i> Precio:</strong> $${(pedido.precio || 0).toLocaleString()}</p>
                <p><strong><i class="fas fa-money-bill-wave"></i> Adelanto:</strong> $${(pedido.adelanto || 0).toLocaleString()}</p>
                <p><strong><i class="fas fa-coins"></i> Saldo:</strong> $${((pedido.precio || 0) - (pedido.adelanto || 0)).toLocaleString()}</p>
                <p><strong><i class="fas fa-calendar"></i> Entrega:</strong> ${pedido.fechaEntrega || "No definida"}</p>
                <p><strong><i class="fas fa-align-left"></i> Descripción:</strong> ${pedido.descripcion || "Sin descripción"}</p>
                ${pedido.observaciones ? `<p><strong><i class="fas fa-sticky-note"></i> Observaciones:</strong> ${pedido.observaciones}</p>` : ''}
                ${imagenesHTML}
            </div>
        `,
        width: "600px",
        confirmButtonText: "Cerrar"
    });
};

window.editarPedidoCompleto = async (id) => {
    const pedido = todosPedidos.find(p => p.id === id);
    if (!pedido) return;
    
    pedidosEditando = id;
    document.getElementById("cliente").value = pedido.cliente || "";
    document.getElementById("telefono").value = pedido.telefono || "";
    document.getElementById("tipoArte").value = pedido.tipoArte || "";
    document.getElementById("precio").value = pedido.precio || 0;
    document.getElementById("adelanto").value = pedido.adelanto || 0;
    document.getElementById("fechaEntrega").value = pedido.fechaEntrega || "";
    document.getElementById("estado").value = pedido.estado || "Pendiente";
    document.getElementById("descripcion").value = pedido.descripcion || "";
    document.getElementById("observaciones").value = pedido.observaciones || "";
    
    if (pedido.imagenes) {
        previewContainer.innerHTML = pedido.imagenes.map(img => `<img src="${img}">`).join("");
    }
    
    submitBtn.innerHTML = '<i class="fas fa-edit"></i> Actualizar pedido';
    const formHeader = document.querySelector(".form-header h3");
    if (formHeader) formHeader.innerHTML = '<i class="fas fa-edit"></i> Editando pedido';
    if (btnFormulario) btnFormulario.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
};

window.eliminarPedidoCompleto = async (id) => {
    if (!isAdmin()) {
        Swal.fire("Acceso denegado", "Solo administradores pueden eliminar", "error");
        return;
    }
    
    const result = await Swal.fire({
        title: "¿Eliminar pedido?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar"
    });
    
    if (result.isConfirmed) {
        const pedido = todosPedidos.find(p => p.id === id);
        await deleteDoc(doc(db, "pedidos", id));
        await crearNotificacion("eliminar", `Se eliminó el pedido de ${pedido?.cliente || "un cliente"}`, "warning", id, pedido?.cliente);
        Swal.fire("Eliminado", "Pedido eliminado", "success");
        await cargarPedidos();
        if (moduloLista && moduloLista.classList.contains("active")) {
            renderizarPedidos();
        }
    }
};

window.verImagenGrande = (url) => {
    Swal.fire({ imageUrl: url, imageAlt: "Imagen", width: "auto", showCloseButton: true });
};

cargarPedidos();