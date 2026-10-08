// ============================================================
// Mi Biblioteca - lógica de la aplicación (CRUD con Supabase)
// ============================================================

// 1. CONEXIÓN con Supabase (usa los datos de config.js)
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TABLA = "libros";

// 2. REFERENCIAS al HTML
const form = document.getElementById("form-libro");
const tablaBody = document.getElementById("tabla-body");
const contador = document.getElementById("contador");
const btnSubmit = document.getElementById("btn-submit");
const btnCancelar = document.getElementById("btn-cancelar");
const statusEl = document.getElementById("conn-status");
const buscar = document.getElementById("f-buscar");
const filtroGenero = document.getElementById("f-filtro-genero");
const filtroEstado = document.getElementById("f-filtro-estado");
const modal = document.getElementById("modal");
const modalTexto = document.getElementById("modal-texto");
const toast = document.getElementById("toast");

const campos = {
  id: document.getElementById("f-id"),
  titulo: document.getElementById("f-titulo"),
  autor: document.getElementById("f-autor"),
  genero: document.getElementById("f-genero"),
  paginas: document.getElementById("f-paginas"),
  estado: document.getElementById("f-estado"),
  notas: document.getElementById("f-notas"),
};

let libros = [];            // lista en memoria (para filtrar sin consultar de nuevo)
let idAEliminar = null;

// 3. LISTAR (SELECT)
async function cargarLibros() {
  const { data, error } = await client
    .from(TABLA)
    .select("*")
    .order("fecha_registro", { ascending: false });

  if (error) {
    statusEl.textContent = "🔴 sin conexión";
    mostrarToast("Error al cargar: " + error.message, true);
    tablaBody.innerHTML = `<tr><td colspan="6" class="vacio">No se pudieron cargar los datos.</td></tr>`;
    return;
  }
  statusEl.textContent = "🟢 conectado a Supabase";
  libros = data;
  dibujarTabla();
}

// 4. DIBUJAR TABLA aplicando búsqueda y filtros
function dibujarTabla() {
  const texto = buscar.value.trim().toLowerCase();
  const genero = filtroGenero.value;
  const estado = filtroEstado.value;

  const lista = libros.filter((l) =>
    (!texto || l.titulo.toLowerCase().includes(texto) || l.autor.toLowerCase().includes(texto)) &&
    (!genero || l.genero === genero) &&
    (!estado || l.estado === estado)
  );

  contador.textContent = lista.length;

  if (lista.length === 0) {
    tablaBody.innerHTML = `<tr><td colspan="6" class="vacio">No hay libros para mostrar.</td></tr>`;
    return;
  }

  tablaBody.innerHTML = lista.map((l) => `
    <tr>
      <td>${esc(l.titulo)}</td>
      <td>${esc(l.autor)}</td>
      <td>${esc(l.genero)}</td>
      <td>${l.paginas}</td>
      <td><span class="pill pill-${claseEstado(l.estado)}">${l.estado}</span></td>
      <td class="acc">
        <button class="btn-sm" data-accion="editar" data-id="${l.id}">Editar</button>
        <button class="btn-sm" data-accion="eliminar" data-id="${l.id}">Eliminar</button>
      </td>
    </tr>`).join("");
}

function claseEstado(e) {
  return e === "Leído" ? "leido" : e === "Leyendo" ? "leyendo" : "pendiente";
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// 5. VALIDACIONES
function validar() {
  limpiarErrores();
  let ok = true;
  if (!campos.titulo.value.trim()) { error("titulo", "El título es obligatorio."); ok = false; }
  if (!campos.autor.value.trim())  { error("autor", "El autor es obligatorio."); ok = false; }
  if (!campos.genero.value)        { error("genero", "Elegí un género."); ok = false; }
  const pag = Number(campos.paginas.value);
  if (campos.paginas.value === "" || isNaN(pag) || pag < 1) { error("paginas", "Ingresá un número mayor a 0."); ok = false; }
  if (!campos.estado.value)        { error("estado", "Elegí un estado."); ok = false; }
  return ok;
}
function error(campo, msg) {
  document.getElementById("err-" + campo).textContent = msg;
  campos[campo].classList.add("invalid");
}
function limpiarErrores() {
  document.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
  document.querySelectorAll(".invalid").forEach((e) => e.classList.remove("invalid"));
}

// 6. GUARDAR: INSERT (nuevo) o UPDATE (editando)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validar()) return;

  const datos = {
    titulo: campos.titulo.value.trim(),
    autor: campos.autor.value.trim(),
    genero: campos.genero.value,
    paginas: Number(campos.paginas.value),
    estado: campos.estado.value,
    notas: campos.notas.value.trim() || null,
  };

  btnSubmit.disabled = true;
  const id = campos.id.value;
  const { error: err } = id
    ? await client.from(TABLA).update(datos).eq("id", id)   // UPDATE
    : await client.from(TABLA).insert(datos);               // INSERT
  btnSubmit.disabled = false;

  if (err) { mostrarToast("Error al guardar: " + err.message, true); return; }

  mostrarToast(id ? "Libro actualizado." : "Libro registrado.");
  reiniciarForm();
  cargarLibros();
});

btnCancelar.addEventListener("click", reiniciarForm);

function reiniciarForm() {
  form.reset();
  campos.id.value = "";
  limpiarErrores();
  btnSubmit.textContent = "Guardar libro";
  btnCancelar.hidden = true;
}

// 7. EDITAR: carga el libro en el formulario
function editar(id) {
  const l = libros.find((x) => x.id === id);
  if (!l) return;
  campos.id.value = l.id;
  campos.titulo.value = l.titulo;
  campos.autor.value = l.autor;
  campos.genero.value = l.genero;
  campos.paginas.value = l.paginas;
  campos.estado.value = l.estado;
  campos.notas.value = l.notas || "";
  btnSubmit.textContent = "Actualizar libro";
  btnCancelar.hidden = false;
  form.scrollIntoView({ behavior: "smooth" });
}

// 8. ELIMINAR con confirmación (DELETE)
function pedirEliminar(id) {
  const l = libros.find((x) => x.id === id);
  idAEliminar = id;
  modalTexto.textContent = `Se eliminará "${l ? l.titulo : "este libro"}". No se puede deshacer.`;
  modal.hidden = false;
}
document.getElementById("modal-cancelar").addEventListener("click", () => { idAEliminar = null; modal.hidden = true; });
document.getElementById("modal-ok").addEventListener("click", async () => {
  if (!idAEliminar) return;
  const { error: err } = await client.from(TABLA).delete().eq("id", idAEliminar);
  modal.hidden = true;
  if (err) { mostrarToast("Error al eliminar: " + err.message, true); return; }
  idAEliminar = null;
  mostrarToast("Libro eliminado.");
  cargarLibros();
});

// 9. Botones Editar / Eliminar de la tabla (un solo listener para todos)
tablaBody.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-accion]");
  if (!b) return;
  if (b.dataset.accion === "editar") editar(b.dataset.id);
  if (b.dataset.accion === "eliminar") pedirEliminar(b.dataset.id);
});

// 10. Búsqueda y filtros en vivo
buscar.addEventListener("input", dibujarTabla);
filtroGenero.addEventListener("change", dibujarTabla);
filtroEstado.addEventListener("change", dibujarTabla);

// 11. Mensajes
let tt;
function mostrarToast(msg, esError = false) {
  clearTimeout(tt);
  toast.textContent = msg;
  toast.classList.toggle("err", esError);
  toast.hidden = false;
  tt = setTimeout(() => (toast.hidden = true), 3500);
}

// 12. INICIO
cargarLibros();
