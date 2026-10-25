// analizador.js — interfaz del analizador de campeonatos
// KendoSTREAM — © 2026 Jorge Pascual Lansac. Distribuido bajo PolyForm
// Noncommercial License 1.0.0 — ver LICENSE.txt en la raíz del proyecto.

// Esta pantalla carga registros, los fusiona y muestra lo que han entendido el lector
// (lector-registros.js), el análisis de personas y clubes (alias-personas.js), los podios
// (podios.js), las estadísticas individuales (estadisticas.js) y permite descargar el registro
// completo (exportar-registro.js).
// Todos esos scripts se cargan antes en index.html.

const VERSION_ANALIZADOR = "0.4.0";

let archivosCargados = []; // { nombre, tamano, registro, error }
let modelo = null;         // resultado de fusionarRegistros(), o null si no hay registros válidos
let alias = crearAliasVacio(); // archivo de alias en uso (ids estables de clubes, equipos y personas)
let analisis = null;       // resultado de analizarRegistros(modelo, { alias })
let modeloEnriquecido = null; // el modelo con personaId, clubId y equipoId en cada lado
let indice = null;         // nombres por id, para el podio

// Decisiones del usuario sobre cada competición, por "campeonatoId|competicionId":
// { podio: { primero, segundo, terceros }, espirituLucha: [] }
const decisionesPodio = new Map();
const editoresPodio = new Map();     // clave -> true (abierto) o false (cerrado a mano)
const editoresEspiritu = new Set();  // claves con el selector de fighting spirit abierto

// Filtros y orden de la sección de estadísticas
const estadoEstadisticas = {
  campeonatoId: "",
  modalidad: "todas",
  categoria: "",
  minCombates: 3,
  limite: 5,
  tecnicas: "favor",
  texto: "",
  clubId: "",
  orden: { campo: "victorias", ascendente: false },
  fichaId: null
};
let resultadoEstadisticas = null;

let ordenPersonas = { campo: "club", ascendente: true };
const filtrosPersonas = { texto: "", clubId: "", equipoId: "" };

const zonaCarga = document.getElementById("zonaCarga");
const botonElegir = document.getElementById("botonElegir");
const campoArchivos = document.getElementById("archivoRegistros");
const listaArchivos = document.getElementById("listaArchivos");
const botonQuitarTodos = document.getElementById("botonQuitarTodos");
const botonCargarAlias = document.getElementById("botonCargarAlias");
const botonDescargarAlias = document.getElementById("botonDescargarAlias");
const campoAlias = document.getElementById("archivoAlias");
const avisoAlias = document.getElementById("avisoAlias");
const bloqueResumen = document.getElementById("bloqueResumen");
const contenedorCifras = document.getElementById("cifras");
const contenedorCampeonatos = document.getElementById("contenedorCampeonatos");
const bloquePersonas = document.getElementById("bloquePersonas");
const bloqueDudas = document.getElementById("bloqueDudas");
const tituloDudas = document.getElementById("tituloDudas");
const contenedorDudas = document.getElementById("contenedorDudas");
const contenedorDecisiones = document.getElementById("contenedorDecisiones");
const contenedorClubes = document.getElementById("contenedorClubes");
const cuerpoPersonas = document.getElementById("cuerpoPersonas");
const listaClubes = document.getElementById("listaClubes");
const filtroNombre = document.getElementById("filtroNombre");
const filtroClub = document.getElementById("filtroClub");
const filtroEquipo = document.getElementById("filtroEquipo");
const botonLimpiarFiltros = document.getElementById("botonLimpiarFiltros");
const contadorPersonas = document.getElementById("contadorPersonas");
const botonesOrden = Array.from(document.querySelectorAll("#tablaPersonas button.orden"));
const bloquePodios = document.getElementById("bloquePodios");
const contenedorPodios = document.getElementById("contenedorPodios");
const bloqueEstadisticas = document.getElementById("bloqueEstadisticas");
const estadisticasBloqueadas = document.getElementById("estadisticasBloqueadas");
const estadisticasContenido = document.getElementById("estadisticasContenido");
const estCampeonato = document.getElementById("estCampeonato");
const estModalidad = document.getElementById("estModalidad");
const estCategoria = document.getElementById("estCategoria");
const estMinimo = document.getElementById("estMinimo");
const estLimite = document.getElementById("estLimite");
const estadisticasAvisos = document.getElementById("estadisticasAvisos");
const contenedorRankings = document.getElementById("contenedorRankings");
const estBuscar = document.getElementById("estBuscar");
const estClub = document.getElementById("estClub");
const estTecnicas = document.getElementById("estTecnicas");
const estContador = document.getElementById("estContador");
const tablaEstadisticas = document.getElementById("tablaEstadisticas");
const fichaPersona = document.getElementById("fichaPersona");
const bloqueAvisos = document.getElementById("bloqueAvisos");
const listaAvisos = document.getElementById("listaAvisos");

document.getElementById("versionAnalizador").textContent = `v${VERSION_ANALIZADOR}`;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// Todo el texto que viene de los archivos se inserta con textContent: nunca se interpreta como HTML.
function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function plural(n, singular, pluralForma) {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

function textoOpcion(opcion) {
  return (opcion && (opcion.texto || opcion.opcion)) || "";
}

function nombreCompeticion(competicion) {
  return [textoOpcion(competicion.categoria), textoOpcion(competicion.modalidad)].filter(Boolean).join(" · ") || competicion.id;
}

function buscarCompeticion(campeonatoId, competicionId) {
  if (!modelo) return null;
  const campeonato = modelo.campeonatos.find((c) => c.id === campeonatoId);
  return campeonato ? campeonato.competiciones.find((c) => c.id === competicionId) || null : null;
}

function mostrarAvisoAlias(texto, correcto) {
  avisoAlias.textContent = texto;
  avisoAlias.classList.toggle("correcto", correcto === true);
}

function nombreSeguro(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "campeonato";
}

function descargarJson(objeto, nombreArchivo) {
  const blob = new Blob([JSON.stringify(objeto, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Carga de registros
// ---------------------------------------------------------------------------

async function leerArchivo(archivo) {
  const entrada = { nombre: archivo.name, tamano: archivo.size, registro: null, error: null };
  try {
    const texto = await archivo.text();
    entrada.registro = leerRegistro(texto, archivo.name);
  } catch (error) {
    entrada.error = error instanceof ErrorRegistro ? error.message : "No se ha podido leer el archivo.";
  }
  return entrada;
}

async function anadirArchivos(lista) {
  for (const archivo of Array.from(lista)) {
    const entrada = await leerArchivo(archivo);
    // El mismo archivo (mismo nombre y tamaño) cargado otra vez sustituye al anterior.
    const posicion = archivosCargados.findIndex((a) => a.nombre === entrada.nombre && a.tamano === entrada.tamano);
    if (posicion === -1) archivosCargados.push(entrada);
    else archivosCargados[posicion] = entrada;
  }
  reconstruir();
}

function quitarArchivo(posicion) {
  archivosCargados.splice(posicion, 1);
  reconstruir();
}

// Vuelve a calcular el modelo y el análisis con lo cargado y repinta todo.
// El alias devuelto por el análisis pasa a ser el alias en uso: así los ids no cambian entre pasadas.
function reconstruir() {
  const validos = archivosCargados.filter((a) => a.registro).map((a) => a.registro);
  modelo = validos.length > 0 ? fusionarRegistros(validos) : null;
  analisis = modelo ? analizarRegistros(modelo, { alias }) : null;
  if (analisis) {
    alias = analisis.alias;
    modeloEnriquecido = asignarIdentidades(modelo, analisis);
    indice = crearIndiceDeIdentidades(analisis);
    sanearDecisiones();
  } else {
    modeloEnriquecido = null;
    indice = null;
  }
  pintarArchivos();
  pintarResumen();
  pintarPersonas();
  pintarPodios();
  pintarAvisos();
  botonDescargarAlias.disabled = !aliasTieneContenido();
}

function aliasTieneContenido() {
  return alias.clubes.length + alias.equipos.length + alias.personas.length > 0;
}

// Si una decisión apunta a una persona o equipo que ya no existe (por ejemplo, una persona pendiente
// que se ha unido a otra), se descarta esa parte.
function sanearDecisiones() {
  const existe = (entrada) => !entrada || indice.personas.has(entrada.ref) || indice.equipos.has(entrada.ref);
  decisionesPodio.forEach((decision) => {
    if (decision.podio) {
      const p = decision.podio;
      if (![p.primero, p.segundo].concat(p.terceros).every(existe)) delete decision.podio;
    }
    if (decision.espirituLucha) decision.espirituLucha = decision.espirituLucha.filter(existe);
  });
}

// ---------------------------------------------------------------------------
// Alias: cargar y descargar
// ---------------------------------------------------------------------------

async function cargarAlias(archivo) {
  try {
    const texto = await archivo.text();
    alias = leerAlias(texto);
    mostrarAvisoAlias(
      `Alias cargado: ${plural(alias.personas.length, "persona", "personas")}, ${plural(alias.clubes.length, "club", "clubes")} y ${plural(alias.equipos.length, "equipo", "equipos")}.`,
      true
    );
    reconstruir();
  } catch (error) {
    mostrarAvisoAlias(error instanceof ErrorAlias ? error.message : "No se ha podido leer el archivo de alias.", false);
  }
}

function descargarAlias() {
  descargarJson(alias, "alias-kendostream.json");
}

// Aplica la decisión del usuario sobre una duda y vuelve a analizar.
function decidir(operacion) {
  try {
    alias = operacion();
    mostrarAvisoAlias("", false);
    reconstruir();
  } catch (error) {
    mostrarAvisoAlias(error instanceof ErrorAlias ? error.message : "No se ha podido guardar la decisión.", false);
  }
}

// ---------------------------------------------------------------------------
// Pintado: archivos y resumen
// ---------------------------------------------------------------------------

function pintarArchivos() {
  listaArchivos.innerHTML = "";
  archivosCargados.forEach((entrada, posicion) => {
    const fila = crear("li", "fila-archivo");
    fila.appendChild(crear("span", "nombre", entrada.nombre));
    if (entrada.registro) {
      const competiciones = entrada.registro.competiciones;
      const combates = competiciones.reduce((suma, c) => suma + c.combates.length, 0);
      fila.appendChild(crear("span", "detalle",
        `Esquema ${entrada.registro.esquema} · ${plural(competiciones.length, "competición", "competiciones")} · ${plural(combates, "combate", "combates")}`));
    } else {
      fila.classList.add("con-error");
      fila.appendChild(crear("span", "detalle", entrada.error));
    }
    const boton = crear("button", "", "✕");
    boton.type = "button";
    boton.title = "Quitar este registro";
    boton.addEventListener("click", () => quitarArchivo(posicion));
    fila.appendChild(boton);
    listaArchivos.appendChild(fila);
  });
  botonQuitarTodos.hidden = archivosCargados.length === 0;
}

function crearCifra(numero, etiqueta) {
  const cifra = crear("div", "cifra");
  cifra.appendChild(crear("div", "numero", String(numero)));
  cifra.appendChild(crear("div", "etiqueta", etiqueta));
  return cifra;
}

function crearTablaCompeticiones(campeonato) {
  const contenedor = crear("div", "contenedor-tabla");
  const tabla = crear("table", "tabla-competiciones");
  const cabecera = crear("tr");
  [["Categoría", ""], ["Modalidad", ""], ["Combates", "centrado"], ["Encuentros", "centrado"]].forEach(([titulo, clase]) => {
    cabecera.appendChild(crear("th", clase, titulo));
  });
  const encabezado = crear("thead");
  encabezado.appendChild(cabecera);
  tabla.appendChild(encabezado);

  const cuerpo = crear("tbody");
  campeonato.competiciones.forEach((competicion) => {
    const fila = crear("tr");
    fila.appendChild(crear("td", "", textoOpcion(competicion.categoria) || "—"));
    fila.appendChild(crear("td", "", textoOpcion(competicion.modalidad) || "—"));
    fila.appendChild(crear("td", "centrado", String(competicion.combates.length)));
    fila.appendChild(crear("td", "centrado", String(competicion.encuentros.length)));
    cuerpo.appendChild(fila);
  });
  tabla.appendChild(cuerpo);
  contenedor.appendChild(tabla);
  return contenedor;
}

function pintarResumen() {
  contenedorCifras.innerHTML = "";
  contenedorCampeonatos.innerHTML = "";
  bloqueResumen.hidden = !modelo;
  if (!modelo) return;

  const total = contarModelo(modelo);
  contenedorCifras.appendChild(crearCifra(total.campeonatos, total.campeonatos === 1 ? "campeonato" : "campeonatos"));
  contenedorCifras.appendChild(crearCifra(total.competiciones, total.competiciones === 1 ? "competición" : "competiciones"));
  contenedorCifras.appendChild(crearCifra(total.combates, total.combates === 1 ? "combate" : "combates"));
  contenedorCifras.appendChild(crearCifra(total.encuentros, total.encuentros === 1 ? "encuentro" : "encuentros"));
  if (analisis) {
    const personasSeguras = analisis.personas.filter((p) => !p.pendiente).length;
    contenedorCifras.appendChild(crearCifra(personasSeguras, personasSeguras === 1 ? "persona" : "personas"));
    contenedorCifras.appendChild(crearCifra(analisis.clubes.length, analisis.clubes.length === 1 ? "club" : "clubes"));
  }

  modelo.campeonatos.forEach((campeonato) => {
    const tarjeta = crear("div", "campeonato");
    tarjeta.appendChild(crear("h3", "", campeonato.nombre || campeonato.id));
    tarjeta.appendChild(crear("p", "fechas", campeonato.fechas.join(" · ")));
    tarjeta.appendChild(crearTablaCompeticiones(campeonato));
    contenedorCampeonatos.appendChild(tarjeta);
  });
}

// ---------------------------------------------------------------------------
// Pintado: personas y clubes
// ---------------------------------------------------------------------------

function tarjetaDudaNombre(duda) {
  const tarjeta = crear("div", "tarjeta-duda");
  const titulo = crear("div", "titulo-duda", `«${duda.nombre}»`);
  titulo.appendChild(crear("span", "contexto",
    `${duda.clubNombre || "sin club"} · ${plural(duda.apariciones, "aparición", "apariciones")}`));
  tarjeta.appendChild(titulo);
  tarjeta.appendChild(crear("p", "", "¿Es la misma persona que alguna de estas?"));

  duda.candidatos.forEach((candidato) => {
    const fila = crear("div", "fila-candidato");
    fila.appendChild(crear("span", "nombre", candidato.nombre));
    fila.appendChild(crear("span", "motivo",
      `${candidato.motivo === "apellido" ? "mismo apellido" : "misma inicial"} · ${plural(candidato.apariciones, "aparición", "apariciones")}`));
    const boton = crear("button", "boton-primario", "Es esta persona");
    boton.type = "button";
    boton.addEventListener("click", () => decidir(() => resolverDudaUnir(alias, duda, candidato.personaId)));
    fila.appendChild(boton);
    tarjeta.appendChild(fila);
  });

  const acciones = crear("div", "acciones-duda");
  const otra = crear("button", "boton-secundario boton-pequeno", "Es otra persona");
  otra.type = "button";
  otra.addEventListener("click", () => decidir(() => resolverDudaSeparar(alias, duda)));
  acciones.appendChild(otra);
  tarjeta.appendChild(acciones);
  return tarjeta;
}

function tarjetaDudaClub(duda) {
  const tarjeta = crear("div", "tarjeta-duda");
  tarjeta.appendChild(crear("div", "titulo-duda", `Equipo «${duda.equipoNombre}»`));
  tarjeta.appendChild(crear("p", "", "No se ha podido deducir a qué club pertenece. Escribe el club (o elige uno de los que ya existen)."));
  const acciones = crear("div", "acciones-duda");
  const campo = crear("input");
  campo.type = "text";
  campo.setAttribute("list", "listaClubes");
  campo.placeholder = "Nombre del club";
  campo.value = duda.propuesta || "";
  const boton = crear("button", "boton-primario", "Asignar club");
  boton.type = "button";
  boton.addEventListener("click", () => decidir(() => resolverDudaClubEquipo(alias, duda, { nombreClub: campo.value })));
  acciones.appendChild(campo);
  acciones.appendChild(boton);
  tarjeta.appendChild(acciones);
  return tarjeta;
}

function pintarDudas() {
  contenedorDudas.innerHTML = "";
  const dudas = analisis ? analisis.dudas : [];
  bloqueDudas.hidden = dudas.length === 0;
  if (dudas.length === 0) return;
  tituloDudas.textContent = plural(dudas.length, "duda por resolver", "dudas por resolver");
  dudas.forEach((duda) => {
    contenedorDudas.appendChild(duda.tipo === "club-de-equipo" ? tarjetaDudaClub(duda) : tarjetaDudaNombre(duda));
  });
}

function pintarClubes() {
  contenedorClubes.innerHTML = "";
  const clubes = analisis.clubes.slice().sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
  clubes.forEach((club) => {
    const equipos = analisis.equipos.filter((e) => e.clubId === club.id);
    const personas = analisis.personas.filter((p) => p.clubId === club.id).length;
    const tarjeta = crear("div", "tarjeta-club");
    tarjeta.appendChild(crear("h4", "", club.nombre));
    tarjeta.appendChild(crear("p", "detalle-club", plural(personas, "persona", "personas")));
    if (equipos.length > 0) {
      const lista = crear("ul");
      equipos.forEach((equipo) => lista.appendChild(crear("li", "", equipo.nombre)));
      tarjeta.appendChild(lista);
    }
    contenedorClubes.appendChild(tarjeta);
  });

  const sinClub = analisis.equipos.filter((e) => !e.clubId);
  if (sinClub.length > 0) {
    const tarjeta = crear("div", "tarjeta-club sin-club");
    tarjeta.appendChild(crear("h4", "", "Sin club"));
    tarjeta.appendChild(crear("p", "detalle-club", "Equipos pendientes de asignar"));
    const lista = crear("ul");
    sinClub.forEach((equipo) => lista.appendChild(crear("li", "", equipo.nombre)));
    tarjeta.appendChild(lista);
    contenedorClubes.appendChild(tarjeta);
  }
}

// --- Tabla de personas: filtros y orden ---

function claveBusqueda(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[.,;:]/g, " ").replace(/\s+/g, " ").trim();
}

// Para cada persona, los equipos con los que ha combatido.
function equiposPorPersona() {
  const mapa = new Map();
  modeloEnriquecido.campeonatos.forEach((campeonato) => {
    campeonato.competiciones.forEach((competicion) => {
      competicion.combates.forEach((combate) => {
        [combate.shiro, combate.aka].forEach((lado) => {
          if (!lado.personaId || !lado.equipoId) return;
          if (!mapa.has(lado.personaId)) mapa.set(lado.personaId, new Set());
          mapa.get(lado.personaId).add(lado.equipoId);
        });
      });
    });
  });
  return mapa;
}

function filasDePersonas() {
  const equipos = equiposPorPersona();
  return analisis.personas.map((persona) => {
    const ids = equipos.has(persona.id) ? Array.from(equipos.get(persona.id)) : [];
    const nombresEquipos = ids.map((id) => (indice.equipos.has(id) ? indice.equipos.get(id).nombre : "")).filter(Boolean).sort();
    return { persona, equipoIds: new Set(ids), equipos: nombresEquipos };
  });
}

function pasaFiltros(fila) {
  const { persona } = fila;
  if (filtrosPersonas.clubId && persona.clubId !== filtrosPersonas.clubId) return false;
  if (filtrosPersonas.equipoId && !fila.equipoIds.has(filtrosPersonas.equipoId)) return false;
  const texto = claveBusqueda(filtrosPersonas.texto);
  if (texto) {
    const candidatos = [persona.nombre].concat(persona.alias).map(claveBusqueda);
    if (!candidatos.some((c) => c.includes(texto))) return false;
  }
  return true;
}

function compararFilas(a, b) {
  const pa = a.persona;
  const pb = b.persona;
  const texto = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  let resultado = 0;
  switch (ordenPersonas.campo) {
    case "nombre": resultado = texto(pa.nombre, pb.nombre); break;
    case "club": resultado = texto(pa.clubNombre, pb.clubNombre); break;
    case "equipos": resultado = texto(a.equipos.join(", "), b.equipos.join(", ")); break;
    case "combates": resultado = pa.apariciones - pb.apariciones; break;
    case "variantes": resultado = pa.alias.length - pb.alias.length; break;
    case "estado": resultado = (pa.pendiente ? 0 : 1) - (pb.pendiente ? 0 : 1); break;
    default: resultado = 0;
  }
  if (!ordenPersonas.ascendente) resultado = -resultado;
  return resultado || texto(pa.nombre, pb.nombre);
}

function pintarCabecerasOrden() {
  botonesOrden.forEach((boton) => {
    const activo = boton.dataset.campo === ordenPersonas.campo;
    if (!boton.dataset.titulo) boton.dataset.titulo = boton.textContent;
    boton.textContent = boton.dataset.titulo + (activo ? (ordenPersonas.ascendente ? " ▲" : " ▼") : "");
    boton.classList.toggle("activo", activo);
    boton.parentElement.setAttribute("aria-sort", activo ? (ordenPersonas.ascendente ? "ascending" : "descending") : "none");
  });
}

function pintarTablaPersonas() {
  cuerpoPersonas.innerHTML = "";
  pintarCabecerasOrden();
  if (!analisis) {
    contadorPersonas.textContent = "";
    return;
  }
  const todas = filasDePersonas();
  const filas = todas.filter(pasaFiltros).sort(compararFilas);
  contadorPersonas.textContent = `${filas.length} de ${plural(todas.length, "persona", "personas")}`;

  if (filas.length === 0) {
    const fila = crear("tr");
    const celda = crear("td", "sin-resultados", "Ninguna persona cumple los filtros.");
    celda.colSpan = 6;
    fila.appendChild(celda);
    cuerpoPersonas.appendChild(fila);
    return;
  }
  filas.forEach(({ persona, equipos }) => {
    const fila = crear("tr", persona.pendiente ? "fila-pendiente" : "");
    fila.appendChild(crear("td", "", persona.nombre));
    fila.appendChild(crear("td", "", persona.clubNombre || "—"));
    fila.appendChild(crear("td", "", equipos.length > 0 ? equipos.join(" · ") : "—"));
    fila.appendChild(crear("td", "centrado", String(persona.apariciones)));
    fila.appendChild(crear("td", "", persona.alias.length > 0 ? persona.alias.join(" · ") : "—"));
    fila.appendChild(crear("td", persona.pendiente ? "estado-pendiente" : "estado-registro",
      persona.pendiente ? "Pendiente" : (persona.origen === "registro" ? "Id del registro" : "")));
    cuerpoPersonas.appendChild(fila);
  });
}

// Rellena un desplegable de filtro conservando la opción elegida si sigue existiendo.
function rellenarFiltro(select, opciones, textoTodos, valorActual) {
  select.innerHTML = "";
  const todos = crear("option", "", textoTodos);
  todos.value = "";
  select.appendChild(todos);
  opciones.forEach(({ id, nombre }) => {
    const opcion = crear("option", "", nombre);
    opcion.value = id;
    select.appendChild(opcion);
  });
  select.value = opciones.some((o) => o.id === valorActual) ? valorActual : "";
  return select.value;
}

function pintarFiltros() {
  const clubes = analisis.clubes.map((c) => ({ id: c.id, nombre: c.nombre })).sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
  const equipos = analisis.equipos.map((e) => ({ id: e.id, nombre: e.nombre })).sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
  filtrosPersonas.clubId = rellenarFiltro(filtroClub, clubes, "Todos los clubes", filtrosPersonas.clubId);
  filtrosPersonas.equipoId = rellenarFiltro(filtroEquipo, equipos, "Todos los equipos", filtrosPersonas.equipoId);
}

function pintarPersonas() {
  bloquePersonas.hidden = !analisis;
  contenedorDecisiones.innerHTML = "";
  listaClubes.innerHTML = "";
  if (!analisis) return;

  analisis.clubes.forEach((club) => {
    const opcion = document.createElement("option");
    opcion.value = club.nombre;
    listaClubes.appendChild(opcion);
  });
  analisis.decisiones.forEach((decision) => contenedorDecisiones.appendChild(crear("div", "nota", decision.mensaje)));

  pintarDudas();
  pintarClubes();
  pintarFiltros();
  pintarTablaPersonas();
}

// ---------------------------------------------------------------------------
// Pintado: podios y fighting spirit
// ---------------------------------------------------------------------------

function claveDeCompeticion(campeonato, competicion) {
  return `${campeonato.id}|${competicion.id}`;
}

function textoOrigenPodio(origen) {
  if (origen === "manual") return "Editado a mano";
  if (origen === "calculado") return "Calculado por el organizador";
  if (origen === "analizador") return "Calculado por el analizador";
  return "";
}

function textoEntrada(entrada) {
  return entrada.club ? `${entrada.nombre} · ${entrada.club}` : entrada.nombre;
}

function filaPodio(puesto, texto, falta) {
  const fila = crear("div", falta ? "fila-podio falta" : "fila-podio");
  fila.appendChild(crear("span", "puesto", puesto));
  fila.appendChild(crear("span", "valor", texto));
  return fila;
}

function resolverCompeticion(campeonato, competicion) {
  const calculado = calcularPodio(competicion, indice);
  const decision = decisionesPodio.get(claveDeCompeticion(campeonato, competicion)) || null;
  return resolverPodio({ calculado, existente: competicion.podio, decision });
}

function pintarFilasDelPodio(resuelto) {
  const lista = crear("div", "filas-podio");
  const { podio, faltan } = resuelto;
  const falta = (puesto) => faltan.includes(puesto);
  lista.appendChild(filaPodio("1.º", podio.primero ? textoEntrada(podio.primero) : (falta("primero") ? "Falta decidir" : "—"), !podio.primero && falta("primero")));
  lista.appendChild(filaPodio("2.º", podio.segundo ? textoEntrada(podio.segundo) : (falta("segundo") ? "Falta decidir" : "—"), !podio.segundo && falta("segundo")));
  if (falta("terceros")) {
    lista.appendChild(filaPodio("3.º", "Falta decidir", true));
  } else if (podio.terceros.length === 0) {
    lista.appendChild(filaPodio("3.º", "Sin terceros", false));
  } else {
    podio.terceros.forEach((tercero) => lista.appendChild(filaPodio("3.º", textoEntrada(tercero), false)));
  }
  return lista;
}

function editorDelPodio(clave, competicion, resuelto) {
  const participantes = participantesDeCompeticion(competicion, indice);
  const contenedor = crear("div");
  const rejilla = crear("div", "editor-podio");
  const campos = [
    ["Primero", resuelto.podio.primero],
    ["Segundo", resuelto.podio.segundo],
    ["Tercero", resuelto.podio.terceros[0] || null],
    ["Tercero", resuelto.podio.terceros[1] || null]
  ];
  const selects = campos.map(([etiqueta, actual]) => {
    const campo = crear("label", "campo-editor");
    campo.appendChild(crear("span", "", etiqueta));
    const select = crear("select");
    const vacio = crear("option", "", "— Vacío —");
    vacio.value = "";
    select.appendChild(vacio);
    participantes.forEach((participante, posicion) => {
      const opcion = crear("option", "", textoEntrada(participante));
      opcion.value = String(posicion);
      if (actual && actual.ref === participante.ref) opcion.selected = true;
      select.appendChild(opcion);
    });
    // Una entrada que ya traía el registro y no está entre los participantes se conserva tal cual.
    if (actual && !participantes.some((p) => p.ref === actual.ref)) {
      const opcion = crear("option", "", textoEntrada(actual));
      opcion.value = "actual";
      opcion.selected = true;
      select.appendChild(opcion);
    }
    campo.appendChild(select);
    rejilla.appendChild(campo);
    return select;
  });
  contenedor.appendChild(rejilla);

  const mensaje = crear("div", "error-podio");
  const acciones = crear("div", "acciones-duda");
  const guardar = crear("button", "boton-primario", "Guardar podio");
  guardar.type = "button";
  guardar.addEventListener("click", () => {
    const elegidos = selects.map((select, posicion) => {
      if (select.value === "") return null;
      return select.value === "actual" ? campos[posicion][1] : participantes[Number(select.value)];
    });
    const refs = elegidos.filter(Boolean).map((e) => e.ref);
    if (new Set(refs).size !== refs.length) {
      mensaje.textContent = "El mismo participante no puede ocupar dos puestos.";
      return;
    }
    const previa = decisionesPodio.get(clave) || {};
    decisionesPodio.set(clave, Object.assign({}, previa, {
      podio: { primero: elegidos[0], segundo: elegidos[1], terceros: [elegidos[2], elegidos[3]].filter(Boolean) }
    }));
    editoresPodio.set(clave, false);
    pintarPodios();
  });
  const cancelar = crear("button", "boton-secundario boton-pequeno", "Cancelar");
  cancelar.type = "button";
  cancelar.addEventListener("click", () => {
    editoresPodio.set(clave, false);
    pintarPodios();
  });
  acciones.appendChild(guardar);
  acciones.appendChild(cancelar);
  acciones.appendChild(mensaje);
  contenedor.appendChild(acciones);
  return contenedor;
}

function bloqueEspiritu(clave, competicion, resuelto) {
  const contenedor = crear("div");
  contenedor.appendChild(crear("div", "subtitulo-podio", "Fighting spirit"));
  const candidatos = personasDeCompeticion(competicion, indice);
  const actual = resuelto.espirituLucha; // null = sin decidir
  const editando = editoresEspiritu.has(clave) || actual === null;

  const guardarEspiritu = (lista) => {
    const previa = decisionesPodio.get(clave) || {};
    decisionesPodio.set(clave, Object.assign({}, previa, { espirituLucha: lista }));
    editoresEspiritu.delete(clave);
    pintarPodios();
  };

  if (!editando) {
    contenedor.appendChild(filaPodio("", actual.length === 0 ? "Ninguno" : actual.map(textoEntrada).join("; "), false));
    const acciones = crear("div", "acciones-duda");
    const cambiar = crear("button", "boton-secundario boton-pequeno", "Cambiar");
    cambiar.type = "button";
    cambiar.addEventListener("click", () => {
      editoresEspiritu.add(clave);
      pintarPodios();
    });
    acciones.appendChild(cambiar);
    contenedor.appendChild(acciones);
    return contenedor;
  }

  if (actual === null) {
    contenedor.appendChild(filaPodio("", "Sin decidir: puede haber varios o ninguno", true));
  }
  const rejilla = crear("div", "rejilla-checks");
  const marcas = candidatos.map((candidato) => {
    const etiqueta = crear("label");
    const marca = crear("input");
    marca.type = "checkbox";
    marca.checked = !!actual && actual.some((e) => e.ref === candidato.ref);
    etiqueta.appendChild(marca);
    etiqueta.appendChild(crear("span", "", textoEntrada(candidato)));
    rejilla.appendChild(etiqueta);
    return marca;
  });
  contenedor.appendChild(rejilla);

  const acciones = crear("div", "acciones-duda");
  const guardar = crear("button", "boton-primario", "Guardar selección");
  guardar.type = "button";
  guardar.addEventListener("click", () => guardarEspiritu(candidatos.filter((_, i) => marcas[i].checked)));
  const ninguno = crear("button", "boton-secundario boton-pequeno", "Ninguno");
  ninguno.type = "button";
  ninguno.addEventListener("click", () => guardarEspiritu([]));
  acciones.appendChild(guardar);
  acciones.appendChild(ninguno);
  if (actual !== null) {
    const cancelar = crear("button", "boton-secundario boton-pequeno", "Cancelar");
    cancelar.type = "button";
    cancelar.addEventListener("click", () => {
      editoresEspiritu.delete(clave);
      pintarPodios();
    });
    acciones.appendChild(cancelar);
  }
  contenedor.appendChild(acciones);
  return contenedor;
}

function tarjetaPodio(campeonato, competicion) {
  const clave = claveDeCompeticion(campeonato, competicion);
  const resuelto = resolverCompeticion(campeonato, competicion);
  const tarjeta = crear("div", "tarjeta-podio");

  const cabecera = crear("div", "cabecera-podio");
  cabecera.appendChild(crear("h4", "", nombreCompeticion(competicion)));
  const origen = textoOrigenPodio(resuelto.podio.primero || resuelto.podio.segundo || resuelto.podio.terceros.length > 0 ? resuelto.podio.origen : null);
  if (origen) cabecera.appendChild(crear("span", "etiqueta-origen", origen));
  tarjeta.appendChild(cabecera);

  tarjeta.appendChild(pintarFilasDelPodio(resuelto));
  resuelto.avisos.forEach((aviso) => tarjeta.appendChild(crear("div", "nota", aviso)));

  const decision = decisionesPodio.get(clave);
  const abierto = editoresPodio.has(clave) ? editoresPodio.get(clave) : resuelto.faltan.length > 0;
  if (abierto) {
    tarjeta.appendChild(editorDelPodio(clave, competicion, resuelto));
  } else {
    const acciones = crear("div", "acciones-duda");
    const editar = crear("button", "boton-secundario boton-pequeno", "Editar podio");
    editar.type = "button";
    editar.addEventListener("click", () => {
      editoresPodio.set(clave, true);
      pintarPodios();
    });
    acciones.appendChild(editar);
    if (decision && decision.podio) {
      const volver = crear("button", "boton-secundario boton-pequeno", "Volver al cálculo automático");
      volver.type = "button";
      volver.addEventListener("click", () => {
        delete decision.podio;
        editoresPodio.delete(clave);
        pintarPodios();
      });
      acciones.appendChild(volver);
    }
    tarjeta.appendChild(acciones);
  }

  tarjeta.appendChild(bloqueEspiritu(clave, competicion, resuelto));
  return tarjeta;
}

function descargarRegistroCompleto(campeonato) {
  const podios = {};
  campeonato.competiciones.forEach((competicion) => {
    podios[competicion.id] = resolverCompeticion(campeonato, competicion);
  });
  const registro = construirRegistroEnriquecido(campeonato, analisis, podios, { version: VERSION_ANALIZADOR });
  const fecha = campeonato.fechas.length > 0 ? campeonato.fechas[0] : "sin-fecha";
  descargarJson(registro, `${fecha}_${nombreSeguro(campeonato.nombre)}_completo.json`);
}

function filaDescarga(campeonato) {
  const fila = crear("div", "fila-descarga");
  const boton = crear("button", "boton-primario", "Descargar registro completo (.json)");
  boton.type = "button";
  const bloqueado = analisis.dudas.length > 0;
  boton.disabled = bloqueado;
  boton.addEventListener("click", () => descargarRegistroCompleto(campeonato));
  fila.appendChild(boton);

  let nota;
  if (bloqueado) {
    nota = "Resuelve primero las dudas de personas y clubes: hasta entonces los ids no son definitivos.";
  } else {
    const resueltos = campeonato.competiciones.map((c) => resolverCompeticion(campeonato, c));
    const podiosIncompletos = resueltos.filter((r) => r.faltan.length > 0).length;
    const sinEspiritu = resueltos.filter((r) => r.espirituLucha === null).length;
    const pendientes = [];
    if (podiosIncompletos > 0) pendientes.push(plural(podiosIncompletos, "podio incompleto", "podios incompletos"));
    if (sinEspiritu > 0) pendientes.push(`fighting spirit sin decidir en ${plural(sinEspiritu, "competición", "competiciones")}`);
    nota = pendientes.length > 0
      ? `Se guardará con ${pendientes.join(" y ")}: esas partes quedan vacías en el archivo.`
      : "Todo decidido: personas, clubes, podios y fighting spirit.";
  }
  fila.appendChild(crear("span", "nota-descarga", nota));
  return fila;
}

function pintarPodios() {
  contenedorPodios.innerHTML = "";
  bloquePodios.hidden = !modeloEnriquecido;
  if (modeloEnriquecido) {
    modeloEnriquecido.campeonatos.forEach((campeonato) => {
      const seccion = crear("div", "campeonato");
      seccion.appendChild(crear("h3", "", campeonato.nombre || campeonato.id));
      campeonato.competiciones.forEach((competicion) => seccion.appendChild(tarjetaPodio(campeonato, competicion)));
      seccion.appendChild(filaDescarga(campeonato));
      contenedorPodios.appendChild(seccion);
    });
  }
  // Las medallas y el fighting spirit de las estadísticas dependen de los podios.
  pintarEstadisticas();
}

// ---------------------------------------------------------------------------
// Pintado: estadísticas
// ---------------------------------------------------------------------------

function podiosResueltos() {
  const mapa = {};
  modeloEnriquecido.campeonatos.forEach((campeonato) => {
    campeonato.competiciones.forEach((competicion) => {
      mapa[claveDeCompeticion(campeonato, competicion)] = resolverCompeticion(campeonato, competicion);
    });
  });
  return mapa;
}

function numeroOGuion(valor, decimales) {
  if (valor === null || valor === undefined) return "—";
  return decimales ? valor.toFixed(decimales) : String(valor);
}

// Columnas de la tabla: cambian las cuatro técnicas según se vean las hechas o las recibidas.
function columnasEstadisticas() {
  const origen = estadoEstadisticas.tecnicas === "favor" ? "tecnicasFavor" : "tecnicasContra";
  const sufijo = estadoEstadisticas.tecnicas === "favor" ? "" : " rec.";
  const numerica = (campo, titulo, valor, ayuda) => ({ campo, titulo, valor, texto: (f) => numeroOGuion(valor(f)), numerica: true, ayuda });
  return [
    { campo: "nombre", titulo: "Persona", valor: (f) => f.nombre, texto: (f) => f.nombre, numerica: false, enlace: true },
    { campo: "club", titulo: "Club", valor: (f) => f.club, texto: (f) => f.club || "—", numerica: false },
    numerica("combates", "Combates", (f) => f.combates, "Combates disputados (incluye los resultados técnicos)"),
    numerica("victorias", "V", (f) => f.victorias, "Victorias, incluidas las técnicas"),
    numerica("derrotas", "D", (f) => f.derrotas, "Derrotas"),
    numerica("empates", "E", (f) => f.empates, "Empates"),
    { campo: "porcentaje", titulo: "% V", valor: (f) => f.porcentaje, texto: (f) => numeroOGuion(f.porcentaje, 1), numerica: true, ayuda: "Victorias entre combates, sin contar los resultados técnicos" },
    numerica("victoriasTecnicas", "V. técn.", (f) => f.victoriasTecnicas, "Victorias por incomparecencia u otro resultado técnico"),
    numerica("puntosFavor", "PF", (f) => f.puntosFavor, "Puntos a favor"),
    numerica("puntosContra", "PC", (f) => f.puntosContra, "Puntos en contra"),
    numerica("men", `Men${sufijo}`, (f) => f[origen].men),
    numerica("kote", `Kote${sufijo}`, (f) => f[origen].kote),
    numerica("do", `Do${sufijo}`, (f) => f[origen].do),
    numerica("tsuki", `Tsuki${sufijo}`, (f) => f[origen].tsuki),
    numerica("hansoku", "Hansoku", (f) => f.hansoku, "Hansoku cometidos"),
    { campo: "prorrogas", titulo: "Prórrogas", valor: (f) => f.prorrogasJugadas, texto: (f) => `${f.prorrogasJugadas}/${f.prorrogasGanadas}`, numerica: true, ayuda: "Jugadas / ganadas" },
    numerica("oros", "Oros", (f) => f.oros),
    numerica("platas", "Platas", (f) => f.platas),
    numerica("bronces", "Bronces", (f) => f.bronces),
    numerica("espirituLucha", "FS", (f) => f.espirituLucha, "Fighting spirit")
  ];
}

function pintarControlesEstadisticas() {
  const campeonatos = modeloEnriquecido.campeonatos.map((c) => ({ id: c.id, nombre: c.nombre || c.id }));
  estadoEstadisticas.campeonatoId = rellenarFiltro(estCampeonato, campeonatos, "Todos los campeonatos", estadoEstadisticas.campeonatoId);
  const categorias = categoriasDisponibles(modeloEnriquecido).map((c) => ({ id: c.clave, nombre: c.texto }));
  estadoEstadisticas.categoria = rellenarFiltro(estCategoria, categorias, "Todas las categorías", estadoEstadisticas.categoria);
  const clubes = analisis.clubes.map((c) => ({ id: c.id, nombre: c.nombre })).sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
  estadoEstadisticas.clubId = rellenarFiltro(estClub, clubes, "Todos los clubes", estadoEstadisticas.clubId);
}

function pintarAvisosEstadisticas() {
  estadisticasAvisos.innerHTML = "";
  resultadoEstadisticas.avisos.forEach((aviso) => estadisticasAvisos.appendChild(crear("div", "nota nota-aviso", aviso.mensaje)));
  estadisticasAvisos.appendChild(crear("div", "nota",
    `${plural(resultadoEstadisticas.resumen.combates, "combate", "combates")} y ${plural(resultadoEstadisticas.resumen.personas, "persona", "personas")} con los filtros actuales.`));
}

function pintarRankings() {
  contenedorRankings.innerHTML = "";
  const rankings = calcularRankings(resultadoEstadisticas.filas, {
    minCombates: estadoEstadisticas.minCombates,
    limite: estadoEstadisticas.limite
  });
  rankings.forEach((ranking) => {
    const tarjeta = crear("div", "tarjeta-ranking");
    tarjeta.appendChild(crear("h4", "", ranking.titulo));
    if (ranking.filas.length === 0) {
      tarjeta.appendChild(crear("div", "sin-datos", "Sin datos"));
    } else {
      const lista = crear("ol");
      ranking.filas.forEach((fila) => {
        const item = crear("li");
        item.appendChild(crear("span", "valor-ranking", fila.texto));
        item.appendChild(crear("span", "", fila.nombre));
        if (fila.club) item.appendChild(crear("span", "club-mini", ` · ${fila.club}`));
        lista.appendChild(item);
      });
      tarjeta.appendChild(lista);
    }
    contenedorRankings.appendChild(tarjeta);
  });
}

function compararEstadisticas(columna) {
  return (a, b) => {
    const va = columna.valor(a);
    const vb = columna.valor(b);
    let resultado;
    if (columna.numerica) resultado = (va === null ? -1 : va) - (vb === null ? -1 : vb);
    else resultado = va < vb ? -1 : va > vb ? 1 : 0;
    if (!estadoEstadisticas.orden.ascendente) resultado = -resultado;
    return resultado || (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0);
  };
}

function pintarTablaEstadisticas() {
  const columnas = columnasEstadisticas();
  const orden = estadoEstadisticas.orden;
  if (!columnas.some((c) => c.campo === orden.campo)) estadoEstadisticas.orden = { campo: "victorias", ascendente: false };

  const cabecera = tablaEstadisticas.querySelector("thead");
  cabecera.innerHTML = "";
  const filaCabecera = crear("tr");
  columnas.forEach((columna) => {
    const activa = columna.campo === estadoEstadisticas.orden.campo;
    const th = crear("th", columna.numerica ? "centrado" : "");
    const boton = crear("button", activa ? "orden activo" : "orden",
      columna.titulo + (activa ? (estadoEstadisticas.orden.ascendente ? " ▲" : " ▼") : ""));
    boton.type = "button";
    if (columna.ayuda) boton.title = columna.ayuda;
    boton.addEventListener("click", () => {
      const actual = estadoEstadisticas.orden;
      estadoEstadisticas.orden = actual.campo === columna.campo
        ? { campo: columna.campo, ascendente: !actual.ascendente }
        : { campo: columna.campo, ascendente: !columna.numerica };
      pintarTablaEstadisticas();
    });
    th.setAttribute("aria-sort", activa ? (estadoEstadisticas.orden.ascendente ? "ascending" : "descending") : "none");
    th.appendChild(boton);
    filaCabecera.appendChild(th);
  });
  cabecera.appendChild(filaCabecera);

  const cuerpo = tablaEstadisticas.querySelector("tbody");
  cuerpo.innerHTML = "";
  const todas = resultadoEstadisticas.filas;
  const texto = claveBusqueda(estadoEstadisticas.texto);
  const filas = todas
    .filter((f) => (!estadoEstadisticas.clubId || f.clubId === estadoEstadisticas.clubId) && (!texto || claveBusqueda(f.nombre).includes(texto)))
    .sort(compararEstadisticas(columnas.find((c) => c.campo === estadoEstadisticas.orden.campo)));
  estContador.textContent = `${filas.length} de ${plural(todas.length, "persona", "personas")}`;

  if (filas.length === 0) {
    const fila = crear("tr");
    const celda = crear("td", "sin-resultados", "Ninguna persona cumple los filtros.");
    celda.colSpan = columnas.length;
    fila.appendChild(celda);
    cuerpo.appendChild(fila);
  }
  filas.forEach((f) => {
    const fila = crear("tr", f.personaId === estadoEstadisticas.fichaId ? "fila-seleccionada" : "");
    columnas.forEach((columna) => {
      const celda = crear("td", columna.numerica ? "centrado" : "");
      if (columna.enlace) {
        const boton = crear("button", "boton-enlace", columna.texto(f));
        boton.type = "button";
        boton.title = "Ver la ficha";
        boton.addEventListener("click", () => {
          estadoEstadisticas.fichaId = f.personaId;
          pintarTablaEstadisticas();
          pintarFicha();
          fichaPersona.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        celda.appendChild(boton);
      } else {
        celda.textContent = columna.texto(f);
      }
      fila.appendChild(celda);
    });
    cuerpo.appendChild(fila);
  });
}

function textoResultado(resultado) {
  return { V: "Victoria", D: "Derrota", E: "Empate" }[resultado] || "—";
}

function pintarFicha() {
  fichaPersona.innerHTML = "";
  const fila = resultadoEstadisticas.filas.find((f) => f.personaId === estadoEstadisticas.fichaId);
  fichaPersona.hidden = !fila;
  if (!fila) return;

  const cabecera = crear("div", "cabecera-ficha");
  const titulo = crear("h3", "", fila.nombre);
  if (fila.club) titulo.appendChild(crear("span", "club-ficha", fila.club));
  cabecera.appendChild(titulo);
  const cerrar = crear("button", "boton-secundario boton-pequeno", "Cerrar ficha");
  cerrar.type = "button";
  cerrar.addEventListener("click", () => {
    estadoEstadisticas.fichaId = null;
    pintarTablaEstadisticas();
    pintarFicha();
  });
  cabecera.appendChild(cerrar);
  fichaPersona.appendChild(cabecera);

  const cifras = crear("div", "cifras-ficha");
  [
    [fila.combates, "combates"], [fila.victorias, "victorias"], [fila.derrotas, "derrotas"], [fila.empates, "empates"],
    [numeroOGuion(fila.porcentaje, 1), "% de victorias"], [fila.victoriasTecnicas, "victorias técnicas"],
    [fila.puntosFavor, "puntos a favor"], [fila.puntosContra, "puntos en contra"], [fila.hansoku, "hansoku"],
    [`${fila.prorrogasJugadas}/${fila.prorrogasGanadas}`, "prórrogas (jug./gan.)"],
    [fila.oros, "oros"], [fila.platas, "platas"], [fila.bronces, "bronces"], [fila.espirituLucha, "fighting spirit"],
    [fila.competiciones, "competiciones"]
  ].forEach(([numero, etiqueta]) => cifras.appendChild(crearCifra(numero, etiqueta)));
  fichaPersona.appendChild(cifras);

  // Técnicas a favor y recibidas
  const contenedorTecnicas = crear("div", "contenedor-tabla");
  const tablaTecnicas = crear("table", "tabla-competiciones");
  const encabezado = crear("tr");
  [["Técnica", ""], ["A favor", "centrado"], ["Recibidas", "centrado"]].forEach(([t, c]) => encabezado.appendChild(crear("th", c, t)));
  const cabeceraTecnicas = crear("thead");
  cabeceraTecnicas.appendChild(encabezado);
  tablaTecnicas.appendChild(cabeceraTecnicas);
  const cuerpoTecnicas = crear("tbody");
  [["men", "Men"], ["kote", "Kote"], ["do", "Do"], ["tsuki", "Tsuki"], ["hansoku", "Punto por hansoku"], ["otras", "Otras"]].forEach(([clave, nombre]) => {
    if ((clave === "hansoku" || clave === "otras") && fila.tecnicasFavor[clave] === 0 && fila.tecnicasContra[clave] === 0) return;
    const f = crear("tr");
    f.appendChild(crear("td", "", nombre));
    f.appendChild(crear("td", "centrado", String(fila.tecnicasFavor[clave])));
    f.appendChild(crear("td", "centrado", String(fila.tecnicasContra[clave])));
    cuerpoTecnicas.appendChild(f);
  });
  tablaTecnicas.appendChild(cuerpoTecnicas);
  contenedorTecnicas.appendChild(tablaTecnicas);
  fichaPersona.appendChild(crear("h3", "", "Técnicas"));
  fichaPersona.appendChild(contenedorTecnicas);

  // Lista de combates
  const combates = resultadoEstadisticas.detalle.get(fila.personaId) || [];
  const variosCampeonatos = modeloEnriquecido.campeonatos.length > 1;
  fichaPersona.appendChild(crear("h3", "", `Combates (${combates.length})`));
  const contenedorCombates = crear("div", "contenedor-tabla");
  const tablaCombates = crear("table", "tabla-competiciones tabla-estadisticas");
  const filaTitulos = crear("tr");
  const titulos = (variosCampeonatos ? ["Campeonato"] : []).concat(["Competición", "Ronda", "N.º", "Rival", "Resultado", "Marcador", "Técnicas", "Notas"]);
  titulos.forEach((t) => filaTitulos.appendChild(crear("th", "", t)));
  const cabeceraCombates = crear("thead");
  cabeceraCombates.appendChild(filaTitulos);
  tablaCombates.appendChild(cabeceraCombates);
  const cuerpoCombates = crear("tbody");
  combates.forEach((c) => {
    const f = crear("tr");
    if (variosCampeonatos) f.appendChild(crear("td", "", c.campeonatoNombre || c.campeonatoId));
    f.appendChild(crear("td", "", c.competicionNombre));
    f.appendChild(crear("td", "", c.ronda || "—"));
    f.appendChild(crear("td", "", c.numero === null ? "—" : String(c.numero)));
    f.appendChild(crear("td", "", c.rival.club && !c.rival.hueco ? `${c.rival.nombre} · ${c.rival.club}` : c.rival.nombre));
    f.appendChild(crear("td", `resultado-${c.resultado}`, textoResultado(c.resultado)));
    f.appendChild(crear("td", "centrado", c.puntosFavor === null ? "—" : `${c.puntosFavor}–${c.puntosContra}`));
    f.appendChild(crear("td", "", c.tecnicas.length > 0 ? c.tecnicas.join(", ") : "—"));
    const notas = [];
    if (c.prorroga) notas.push("Prórroga");
    if (c.tecnica) notas.push(`Resultado técnico${c.motivo ? ` (${c.motivo})` : ""}`);
    if (c.hansoku > 0) notas.push(plural(c.hansoku, "hansoku", "hansoku"));
    if (c.porEquipos) notas.push("Equipos");
    f.appendChild(crear("td", "", notas.length > 0 ? notas.join(" · ") : "—"));
    cuerpoCombates.appendChild(f);
  });
  tablaCombates.appendChild(cuerpoCombates);
  contenedorCombates.appendChild(tablaCombates);
  fichaPersona.appendChild(contenedorCombates);
}

// Recalcula con los filtros de campeonato, modalidad y categoría, y repinta todo.
function recalcularEstadisticas() {
  resultadoEstadisticas = calcularEstadisticas(modeloEnriquecido, indice, podiosResueltos(), {
    campeonatoId: estadoEstadisticas.campeonatoId,
    modalidad: estadoEstadisticas.modalidad,
    categoria: estadoEstadisticas.categoria
  });
  pintarAvisosEstadisticas();
  pintarRankings();
  pintarTablaEstadisticas();
  pintarFicha();
}

function pintarEstadisticas() {
  bloqueEstadisticas.hidden = !analisis;
  if (!analisis) return;
  // Con dudas sin resolver las cifras saldrían repartidas entre dos personas y habría que calcularlas dos veces.
  const bloqueadas = analisis.dudas.length > 0;
  estadisticasBloqueadas.hidden = !bloqueadas;
  estadisticasContenido.hidden = bloqueadas;
  if (bloqueadas) {
    estadisticasBloqueadas.textContent =
      `Resuelve primero ${plural(analisis.dudas.length, "duda", "dudas")} de personas y clubes: así las estadísticas se calculan una sola vez y no quedan repartidas entre dos personas.`;
    return;
  }
  pintarControlesEstadisticas();
  recalcularEstadisticas();
}

function pintarAvisos() {
  listaAvisos.innerHTML = "";
  const avisos = modelo ? modelo.avisos : [];
  bloqueAvisos.hidden = avisos.length === 0;
  avisos.forEach((aviso) => {
    const competicion = buscarCompeticion(aviso.campeonatoId, aviso.competicionId);
    const fila = crear("li", "aviso");
    if (competicion) fila.appendChild(crear("span", "donde", nombreCompeticion(competicion)));
    fila.appendChild(crear("span", "", aviso.mensaje));
    listaAvisos.appendChild(fila);
  });
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

botonElegir.addEventListener("click", () => campoArchivos.click());

campoArchivos.addEventListener("change", () => {
  anadirArchivos(campoArchivos.files);
  campoArchivos.value = ""; // permite volver a elegir el mismo archivo
});

botonQuitarTodos.addEventListener("click", () => {
  archivosCargados = [];
  estadoEstadisticas.fichaId = null;
  decisionesPodio.clear();
  editoresPodio.clear();
  editoresEspiritu.clear();
  reconstruir();
});

botonCargarAlias.addEventListener("click", () => campoAlias.click());
campoAlias.addEventListener("change", () => {
  if (campoAlias.files.length > 0) cargarAlias(campoAlias.files[0]);
  campoAlias.value = "";
});
botonDescargarAlias.addEventListener("click", descargarAlias);

filtroNombre.addEventListener("input", () => {
  filtrosPersonas.texto = filtroNombre.value;
  pintarTablaPersonas();
});
filtroClub.addEventListener("change", () => {
  filtrosPersonas.clubId = filtroClub.value;
  pintarTablaPersonas();
});
filtroEquipo.addEventListener("change", () => {
  filtrosPersonas.equipoId = filtroEquipo.value;
  pintarTablaPersonas();
});
botonLimpiarFiltros.addEventListener("click", () => {
  filtrosPersonas.texto = "";
  filtrosPersonas.clubId = "";
  filtrosPersonas.equipoId = "";
  filtroNombre.value = "";
  filtroClub.value = "";
  filtroEquipo.value = "";
  pintarTablaPersonas();
});
botonesOrden.forEach((boton) => {
  boton.addEventListener("click", () => {
    const campo = boton.dataset.campo;
    if (ordenPersonas.campo === campo) ordenPersonas.ascendente = !ordenPersonas.ascendente;
    else ordenPersonas = { campo, ascendente: campo !== "combates" };
    pintarTablaPersonas();
  });
});

estCampeonato.addEventListener("change", () => {
  estadoEstadisticas.campeonatoId = estCampeonato.value;
  recalcularEstadisticas();
});
estModalidad.addEventListener("change", () => {
  estadoEstadisticas.modalidad = estModalidad.value;
  recalcularEstadisticas();
});
estCategoria.addEventListener("change", () => {
  estadoEstadisticas.categoria = estCategoria.value;
  recalcularEstadisticas();
});
estMinimo.addEventListener("input", () => {
  const valor = parseInt(estMinimo.value, 10);
  estadoEstadisticas.minCombates = Number.isFinite(valor) && valor > 0 ? valor : 1;
  pintarRankings();
});
estLimite.addEventListener("change", () => {
  estadoEstadisticas.limite = parseInt(estLimite.value, 10);
  pintarRankings();
});
estBuscar.addEventListener("input", () => {
  estadoEstadisticas.texto = estBuscar.value;
  pintarTablaEstadisticas();
});
estClub.addEventListener("change", () => {
  estadoEstadisticas.clubId = estClub.value;
  pintarTablaEstadisticas();
});
estTecnicas.addEventListener("change", () => {
  estadoEstadisticas.tecnicas = estTecnicas.value;
  pintarTablaEstadisticas();
});

zonaCarga.addEventListener("dragover", (evento) => {
  evento.preventDefault();
  zonaCarga.classList.add("arrastrando");
});
zonaCarga.addEventListener("dragleave", () => zonaCarga.classList.remove("arrastrando"));
zonaCarga.addEventListener("drop", (evento) => {
  evento.preventDefault();
  zonaCarga.classList.remove("arrastrando");
  anadirArchivos(evento.dataTransfer.files);
});

// Si se suelta un archivo fuera de la zona, el navegador no debe abrirlo y abandonar la página.
window.addEventListener("dragover", (evento) => evento.preventDefault());
window.addEventListener("drop", (evento) => evento.preventDefault());

reconstruir();
