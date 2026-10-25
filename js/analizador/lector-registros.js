// lector-registros.js
// KendoSTREAM — Analizador (Fase 1, bloque 1): lector de registros y modelo interno.
// Igual que los motores del organizador, es lógica pura: sin DOM ni red.
// Con require en Node, globales en el navegador.
// Licencia: PolyForm Noncommercial License 1.0.0 (https://polyformproject.org/licenses/noncommercial/1.0.0)

const ESQUEMAS_SOPORTADOS = [1, 2];

class ErrorRegistro extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = "ErrorRegistro";
    this.codigo = codigo;
  }
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function clonarDatos(valor) {
  return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
}

function valorONulo(valor) {
  return valor === undefined ? null : valor;
}

function iguales(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function esObjeto(valor) {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

// ---------------------------------------------------------------------------
// Normalización de un registro (esquemas 1 y 2) al modelo interno
// ---------------------------------------------------------------------------

// Un lado vacio (nombre en blanco) es un puesto vacio de un equipo: no es una persona.
function normalizarLado(lado) {
  const origen = esObjeto(lado) ? lado : {};
  const nombre = typeof origen.nombre === "string" ? origen.nombre : "";
  return {
    nombre,
    club: typeof origen.club === "string" ? origen.club : "",
    hueco: nombre.trim() === "",
    personaId: valorONulo(origen.personaId),
    clubId: valorONulo(origen.clubId),
    equipoId: valorONulo(origen.equipoId)
  };
}

function normalizarResultado(resultado) {
  const origen = esObjeto(resultado) ? resultado : {};
  return {
    ganador: valorONulo(origen.ganador),
    tipo: valorONulo(origen.tipo),
    motivo: valorONulo(origen.motivo),
    // El esquema 1 no tiene origen: todos sus resultados los registro un panel.
    origen: typeof origen.origen === "string" ? origen.origen : "panel"
  };
}

function normalizarCombate(combate, contexto) {
  if (!esObjeto(combate) || typeof combate.id !== "string" || combate.id === "") {
    throw new ErrorRegistro(
      "combate-sin-id",
      `Hay un combate sin id en la competición ${contexto.competicionId} (posición ${contexto.posicion + 1}).`
    );
  }
  if (!esObjeto(combate.shiro) || !esObjeto(combate.aka)) {
    throw new ErrorRegistro(
      "combate-incompleto",
      `El combate ${combate.id} de la competición ${contexto.competicionId} no tiene shiro o aka.`
    );
  }
  const encuentro = esObjeto(combate.encuentro) && typeof combate.encuentro.id === "string"
    ? {
        id: combate.encuentro.id,
        posicion: valorONulo(combate.encuentro.posicion),
        desempate: combate.encuentro.desempate === true
      }
    : null;
  const marcador = esObjeto(combate.marcador) ? combate.marcador : {};
  return {
    id: combate.id,
    numero: valorONulo(combate.numero),
    fecha: valorONulo(combate.fecha),
    pista: valorONulo(combate.pista),
    shiaijo: valorONulo(combate.shiaijo),
    fase: valorONulo(combate.fase),
    rondaTexto: typeof combate.ronda === "string" ? combate.ronda : "",
    rondaCodigo: valorONulo(combate.rondaCodigo),
    grupo: valorONulo(combate.grupo),
    shiro: normalizarLado(combate.shiro),
    aka: normalizarLado(combate.aka),
    encho: combate.encho === true,
    eventos: Array.isArray(combate.eventos) ? clonarDatos(combate.eventos) : [],
    marcador: { shiro: marcador.shiro || 0, aka: marcador.aka || 0 },
    resultado: normalizarResultado(combate.resultado),
    encuentro,
    inicio: valorONulo(combate.inicio),
    fin: valorONulo(combate.fin),
    duracionSeg: valorONulo(combate.duracionSeg),
    // El esquema 1 no tiene revision: equivale a 0.
    revision: Number.isInteger(combate.revision) ? combate.revision : 0
  };
}

function normalizarLadoEncuentro(lado) {
  const origen = esObjeto(lado) ? lado : {};
  return {
    nombre: typeof origen.nombre === "string" ? origen.nombre : "",
    equipoId: valorONulo(origen.equipoId)
  };
}

function normalizarEncuentro(encuentro) {
  if (!esObjeto(encuentro) || typeof encuentro.id !== "string" || encuentro.id === "") {
    throw new ErrorRegistro("encuentro-sin-id", "Hay un encuentro de equipos sin id.");
  }
  const resultado = esObjeto(encuentro.resultado) ? encuentro.resultado : {};
  return {
    id: encuentro.id,
    shiro: normalizarLadoEncuentro(encuentro.shiro),
    aka: normalizarLadoEncuentro(encuentro.aka),
    integrantes: valorONulo(encuentro.integrantes),
    eliminatoria: encuentro.eliminatoria === true,
    resultado: { ganador: valorONulo(resultado.ganador), motivo: valorONulo(resultado.motivo) },
    alineacion: esObjeto(encuentro.alineacion) ? clonarDatos(encuentro.alineacion) : null,
    shiaijo: valorONulo(encuentro.shiaijo),
    fase: valorONulo(encuentro.fase),
    rondaTexto: typeof encuentro.ronda === "string" ? encuentro.ronda : "",
    rondaCodigo: valorONulo(encuentro.rondaCodigo),
    grupo: valorONulo(encuentro.grupo)
  };
}

function normalizarPodio(podio) {
  const base = { primero: null, segundo: null, terceros: [], origen: null };
  return esObjeto(podio) ? Object.assign(base, clonarDatos(podio)) : base;
}

function podioVacio(podio) {
  return !podio.primero && !podio.segundo && (!Array.isArray(podio.terceros) || podio.terceros.length === 0);
}

function normalizarOpcion(valor) {
  const origen = esObjeto(valor) ? valor : {};
  return {
    opcion: typeof origen.opcion === "string" ? origen.opcion : "",
    texto: typeof origen.texto === "string" ? origen.texto : ""
  };
}

function normalizarCompeticion(competicion) {
  if (!esObjeto(competicion) || typeof competicion.id !== "string" || competicion.id === "") {
    throw new ErrorRegistro("competicion-sin-id", "Hay una competición sin id.");
  }
  const combates = Array.isArray(competicion.combates) ? competicion.combates : [];
  const encuentros = Array.isArray(competicion.encuentros) ? competicion.encuentros : [];
  return {
    id: competicion.id,
    categoria: normalizarOpcion(competicion.categoria),
    modalidad: normalizarOpcion(competicion.modalidad),
    integrantesEquipo: valorONulo(competicion.integrantesEquipo),
    podio: normalizarPodio(competicion.podio),
    combates: combates.map((c, posicion) => normalizarCombate(c, { competicionId: competicion.id, posicion })),
    encuentros: encuentros.map(normalizarEncuentro)
  };
}

// Lee un registro del panel (objeto o texto JSON) y lo devuelve normalizado.
// Lanza ErrorRegistro con un mensaje claro si el registro no es válido.
function leerRegistro(contenido, nombreArchivo = null) {
  let datos = contenido;
  if (typeof contenido === "string") {
    try {
      datos = JSON.parse(contenido);
    } catch (error) {
      throw new ErrorRegistro("json-invalido", "El archivo no es un JSON válido.");
    }
  }
  if (!esObjeto(datos)) {
    throw new ErrorRegistro("registro-invalido", "El archivo no contiene un registro de combates.");
  }
  if (!Number.isInteger(datos.esquema)) {
    throw new ErrorRegistro("esquema-ausente", "El archivo no indica el esquema, así que no parece un registro de KendoSTREAM.");
  }
  if (!ESQUEMAS_SOPORTADOS.includes(datos.esquema)) {
    throw new ErrorRegistro(
      "esquema-no-soportado",
      `El registro usa el esquema ${datos.esquema}, y este analizador solo entiende los esquemas ${ESQUEMAS_SOPORTADOS.join(" y ")}. Puede que necesites una versión más reciente del analizador.`
    );
  }
  if (!esObjeto(datos.evento) || typeof datos.evento.id !== "string" || datos.evento.id === "") {
    throw new ErrorRegistro("evento-sin-id", "El registro no tiene evento.id.");
  }
  const evento = datos.evento;
  if (!Array.isArray(datos.competiciones)) {
    throw new ErrorRegistro("sin-competiciones", "El registro no contiene la lista de competiciones.");
  }
  const fechas = Array.isArray(evento.fechas) ? evento.fechas.slice() : (evento.fecha ? [evento.fecha] : []);
  return {
    archivo: nombreArchivo,
    esquema: datos.esquema,
    programa: esObjeto(datos.programa) ? clonarDatos(datos.programa) : null,
    evento: { id: evento.id, nombre: typeof evento.nombre === "string" ? evento.nombre : "", fechas },
    competiciones: (Array.isArray(datos.competiciones) ? datos.competiciones : []).map(normalizarCompeticion)
  };
}

// ---------------------------------------------------------------------------
// Fusión de registros en un modelo
// ---------------------------------------------------------------------------

function crearModelo() {
  return { campeonatos: [], avisos: [] };
}

// Decide cuál de dos versiones del mismo combate se queda:
// 1) un resultado del panel sustituye a uno manual, aunque el manual tenga mas revision;
// 2) entre el mismo origen gana la revision mayor;
// 3) con la misma revision se queda el que ya estaba y, si difieren, se avisa.
function elegirCombate(actual, nuevo) {
  const origenActual = actual.resultado.origen;
  const origenNuevo = nuevo.resultado.origen;
  if (origenActual !== origenNuevo && (origenActual === "panel" || origenNuevo === "panel")) {
    return { combate: origenNuevo === "panel" ? nuevo : actual, conflicto: false };
  }
  if (nuevo.revision > actual.revision) return { combate: nuevo, conflicto: false };
  if (nuevo.revision < actual.revision) return { combate: actual, conflicto: false };
  return { combate: actual, conflicto: !iguales(actual, nuevo) };
}

function nuevoAviso(modelo, tipo, mensaje, datos) {
  modelo.avisos.push(Object.assign({ tipo, mensaje }, datos));
}

function fusionarCompeticion(modelo, campeonato, destino, origen) {
  const contexto = { campeonatoId: campeonato.id, competicionId: destino.id };

  if (!iguales(destino.categoria, origen.categoria) || !iguales(destino.modalidad, origen.modalidad)) {
    nuevoAviso(modelo, "conflicto-competicion",
      "Dos registros describen la misma competición con distinta categoría o modalidad. Se conserva la del primero.", contexto);
  }

  // podio e integrantesEquipo no se fusionan: un valor vacio cede ante uno relleno,
  // y si ambos estan rellenos y difieren se avisa y se queda el primero.
  if (podioVacio(destino.podio)) {
    if (!podioVacio(origen.podio)) destino.podio = origen.podio;
  } else if (!podioVacio(origen.podio) && !iguales(destino.podio, origen.podio)) {
    nuevoAviso(modelo, "conflicto-podio",
      "Dos registros traen un podio distinto para la misma competición. Se conserva el del primero.", contexto);
  }
  if (destino.integrantesEquipo === null) {
    destino.integrantesEquipo = origen.integrantesEquipo;
  } else if (origen.integrantesEquipo !== null && origen.integrantesEquipo !== destino.integrantesEquipo) {
    nuevoAviso(modelo, "conflicto-integrantes",
      "Dos registros indican un número distinto de integrantes por equipo. Se conserva el del primero.", contexto);
  }

  origen.combates.forEach((nuevo) => {
    const posicion = destino.combates.findIndex((c) => c.id === nuevo.id);
    if (posicion === -1) {
      destino.combates.push(nuevo);
      return;
    }
    const eleccion = elegirCombate(destino.combates[posicion], nuevo);
    destino.combates[posicion] = eleccion.combate;
    if (eleccion.conflicto) {
      nuevoAviso(modelo, "conflicto-combate",
        "El mismo combate aparece dos veces con la misma revisión y datos distintos. Se conserva el primero.",
        Object.assign({ combateId: nuevo.id }, contexto));
    }
  });

  origen.encuentros.forEach((nuevo) => {
    const actual = destino.encuentros.find((e) => e.id === nuevo.id);
    if (!actual) {
      destino.encuentros.push(nuevo);
    } else if (!iguales(actual, nuevo)) {
      nuevoAviso(modelo, "conflicto-encuentro",
        "El mismo encuentro aparece dos veces con datos distintos. Se conserva el primero.",
        Object.assign({ encuentroId: nuevo.id }, contexto));
    }
  });
}

// Añade un registro ya leido al modelo. Los registros del mismo evento (evento.id)
// se fusionan; con otro evento.id forman otro campeonato.
function agregarRegistro(modelo, registro) {
  let campeonato = modelo.campeonatos.find((c) => c.id === registro.evento.id);
  if (!campeonato) {
    campeonato = { id: registro.evento.id, nombre: registro.evento.nombre, fechas: [], fuentes: [], competiciones: [] };
    modelo.campeonatos.push(campeonato);
  }
  if (!campeonato.nombre) campeonato.nombre = registro.evento.nombre;
  registro.evento.fechas.forEach((fecha) => {
    if (!campeonato.fechas.includes(fecha)) campeonato.fechas.push(fecha);
  });
  campeonato.fechas.sort();
  campeonato.fuentes.push({ archivo: registro.archivo, esquema: registro.esquema });

  registro.competiciones.forEach((origen) => {
    let destino = campeonato.competiciones.find((c) => c.id === origen.id);
    if (!destino) {
      // Se crea vacia y se fusiona igual, para que los duplicados dentro de un mismo archivo tambien se resuelvan.
      destino = {
        id: origen.id,
        categoria: clonarDatos(origen.categoria),
        modalidad: clonarDatos(origen.modalidad),
        integrantesEquipo: null,
        podio: normalizarPodio(null),
        combates: [],
        encuentros: []
      };
      campeonato.competiciones.push(destino);
    }
    fusionarCompeticion(modelo, campeonato, destino, clonarDatos(origen));
  });
  return modelo;
}

// Ordena los combates por numero y avisa si un numero se repite dentro de una competicion.
function cerrarModelo(modelo) {
  modelo.campeonatos.forEach((campeonato) => {
    campeonato.competiciones.forEach((competicion) => {
      competicion.combates.sort((a, b) => {
        const na = a.numero === null ? Infinity : a.numero;
        const nb = b.numero === null ? Infinity : b.numero;
        return na - nb;
      });
      const vistos = new Set();
      competicion.combates.forEach((c) => {
        if (c.numero === null) return;
        if (vistos.has(c.numero)) {
          nuevoAviso(modelo, "numero-repetido",
            `El número de combate ${c.numero} se repite en la misma competición.`,
            { campeonatoId: campeonato.id, competicionId: competicion.id, combateId: c.id });
        }
        vistos.add(c.numero);
      });
    });
  });
  return modelo;
}

// Construye un modelo nuevo a partir de varios registros ya leidos con leerRegistro.
// Cargar dos veces el mismo registro no duplica nada.
function fusionarRegistros(registros) {
  const modelo = crearModelo();
  registros.forEach((registro) => agregarRegistro(modelo, registro));
  return cerrarModelo(modelo);
}

function contarModelo(modelo) {
  const total = { campeonatos: modelo.campeonatos.length, competiciones: 0, combates: 0, encuentros: 0 };
  modelo.campeonatos.forEach((campeonato) => {
    total.competiciones += campeonato.competiciones.length;
    campeonato.competiciones.forEach((competicion) => {
      total.combates += competicion.combates.length;
      total.encuentros += competicion.encuentros.length;
    });
  });
  return total;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ESQUEMAS_SOPORTADOS,
    ErrorRegistro,
    leerRegistro,
    crearModelo,
    agregarRegistro,
    fusionarRegistros,
    contarModelo,
    elegirCombate
  };
}
