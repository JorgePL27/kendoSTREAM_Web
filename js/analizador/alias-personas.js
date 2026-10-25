// alias-personas.js
// KendoSTREAM — © 2026 Jorge Pascual Lansac. Distribuido bajo PolyForm
// Noncommercial License 1.0.0 — ver LICENSE.txt en la raíz del proyecto.
//
// Analizador (Fase 1, bloque 2): clubes, equipos y personas a partir del modelo del lector.
// Lógica pura: sin DOM ni red. Con require en Node, globales en el navegador.
//
// Funcionamiento: analizarRegistros(modelo, { alias }) es una función pura del modelo y del
// archivo de alias. Lo que se decide solo (nombres que solo difieren en mayúsculas, puntos,
// espacios, tildes o una letra) queda guardado en el alias que devuelve; lo dudoso sale en
// "dudas". Al resolver una duda se obtiene un alias nuevo y se vuelve a analizar: los ids
// no cambian entre pasadas porque van en el alias.

const FORMATO_ALIAS = "kendostream-alias";
const VERSION_ALIAS = 1;

class ErrorAlias extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = "ErrorAlias";
    this.codigo = codigo;
  }
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function generarUuid() {
  const criptografia = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (criptografia && typeof criptografia.randomUUID === "function") {
    try {
      return criptografia.randomUUID();
    } catch (error) { /* contexto no seguro: se usa el generador manual */ }
  }
  const bytes = new Uint8Array(16);
  if (criptografia && typeof criptografia.getRandomValues === "function") {
    criptografia.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Clave de comparación: mayúsculas, sin tildes, sin puntos y con los espacios colapsados.
function claveTexto(texto) {
  return String(texto === null || texto === undefined ? "" : texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "primero" es la inicial (o el nombre de pila) y "apellido" lo que sigue. Un nombre de una sola
// palabra no se puede interpretar: puede ser un apellido (ABASOLO) o un nombre de pila (ELENA).
function partirNombre(clave) {
  const palabras = clave.split(" ").filter(Boolean);
  if (palabras.length < 2) return { simple: true, token: palabras[0] || "", primero: "", apellido: "" };
  return { simple: false, token: "", primero: palabras[0], apellido: palabras.slice(1).join(" ") };
}

// true si a y b difieren exactamente en una letra (sustitución, letra de más o de menos,
// o dos letras seguidas intercambiadas).
function diferenciaDeUnaLetra(a, b) {
  if (a === b) return false;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let i = 0;
    while (i < la && a[i] === b[i]) i++;
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return i + 1 < la && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  const corto = la < lb ? a : b;
  const largo = la < lb ? b : a;
  let i = 0;
  while (i < corto.length && corto[i] === largo[i]) i++;
  return corto.slice(i) === largo.slice(i + 1);
}

// Una inicial (o dos, como JL) es compatible con un nombre de pila que empieza por ella.
// Dos nombres de pila completos distintos nunca lo son.
function primerosCompatibles(a, b) {
  if (a === b) return true;
  if (a.length <= 2 && b.startsWith(a)) return true;
  if (b.length <= 2 && a.startsWith(b)) return true;
  return false;
}

function contarVariante(mapa, clave, texto) {
  if (!mapa.has(clave)) mapa.set(clave, new Map());
  const variantes = mapa.get(clave);
  variantes.set(texto, (variantes.get(texto) || 0) + 1);
}

function sumarVez(mapa, texto) {
  mapa.set(texto, (mapa.get(texto) || 0) + 1);
}

// El texto más repetido; a igualdad, el más largo y luego el primero por orden alfabético.
function textoMasFrecuente(variantes) {
  return Array.from(variantes.entries())
    .sort((x, y) => y[1] - x[1] || y[0].length - x[0].length || (x[0] < y[0] ? -1 : 1))[0][0];
}

function esCompeticionDeEquipos(competicion) {
  return competicion.modalidad.opcion === "equipos" || competicion.encuentros.length > 0;
}

// ---------------------------------------------------------------------------
// Archivo de alias
// ---------------------------------------------------------------------------

function crearAliasVacio() {
  return { formato: FORMATO_ALIAS, version: VERSION_ALIAS, clubes: [], equipos: [], personas: [] };
}

function listaDeTextos(valor) {
  return Array.isArray(valor) ? valor.filter((t) => typeof t === "string" && t.trim() !== "") : [];
}

function entradaConId(entrada, tipo) {
  if (entrada === null || typeof entrada !== "object" || typeof entrada.id !== "string" || entrada.id === ""
    || typeof entrada.nombre !== "string" || entrada.nombre.trim() === "") {
    throw new ErrorAlias("alias-invalido", `El archivo de alias tiene un elemento de «${tipo}» sin id o sin nombre.`);
  }
}

// Valida un archivo de alias (objeto o texto JSON) y devuelve una copia normalizada.
function leerAlias(contenido) {
  let datos = contenido;
  if (typeof contenido === "string") {
    try {
      datos = JSON.parse(contenido);
    } catch (error) {
      throw new ErrorAlias("json-invalido", "El archivo de alias no es un JSON válido.");
    }
  }
  if (datos === null || typeof datos !== "object" || datos.formato !== FORMATO_ALIAS) {
    throw new ErrorAlias("formato-invalido", "El archivo no es un archivo de alias de KendoSTREAM.");
  }
  if (!Number.isInteger(datos.version) || datos.version < 1 || datos.version > VERSION_ALIAS) {
    throw new ErrorAlias(
      "version-no-soportada",
      `El archivo de alias es de la versión ${datos.version}, y este analizador solo entiende la versión ${VERSION_ALIAS}.`
    );
  }
  const clubes = (Array.isArray(datos.clubes) ? datos.clubes : []).map((c) => {
    entradaConId(c, "clubes");
    return { id: c.id, nombre: c.nombre, alias: listaDeTextos(c.alias) };
  });
  const equipos = (Array.isArray(datos.equipos) ? datos.equipos : []).map((e) => {
    entradaConId(e, "equipos");
    return { id: e.id, nombre: e.nombre, clubId: typeof e.clubId === "string" ? e.clubId : null };
  });
  const personas = (Array.isArray(datos.personas) ? datos.personas : []).map((p) => {
    entradaConId(p, "personas");
    return { id: p.id, nombre: p.nombre, clubId: typeof p.clubId === "string" ? p.clubId : null, alias: listaDeTextos(p.alias) };
  });
  return { formato: FORMATO_ALIAS, version: VERSION_ALIAS, clubes, equipos, personas };
}

// ---------------------------------------------------------------------------
// Análisis
// ---------------------------------------------------------------------------

function recolectar(modelo) {
  const registros = [];            // un elemento por lado de combate
  const combates = [];             // pares de registros que se enfrentan
  const nombresEquipo = new Map(); // clave -> variantes escritas
  const clubesIndividual = new Map();
  const equipoIdPorClave = new Map();

  modelo.campeonatos.forEach((campeonato) => {
    campeonato.competiciones.forEach((competicion) => {
      const esEquipo = esCompeticionDeEquipos(competicion);
      competicion.combates.forEach((combate) => {
        const par = [];
        ["shiro", "aka"].forEach((nombreLado) => {
          const lado = combate[nombreLado];
          const registro = {
            esEquipo,
            nombre: lado.nombre,
            club: lado.club,
            claveNombre: claveTexto(lado.nombre),
            claveClubTexto: claveTexto(lado.club),
            hueco: lado.hueco,
            personaIdReg: lado.personaId,
            clubIdReg: lado.clubId,
            equipoIdReg: lado.equipoId
          };
          registros.push(registro);
          par.push(registro);
          if (registro.claveClubTexto) {
            if (esEquipo) {
              contarVariante(nombresEquipo, registro.claveClubTexto, lado.club);
              if (lado.equipoId && !equipoIdPorClave.has(registro.claveClubTexto)) {
                equipoIdPorClave.set(registro.claveClubTexto, lado.equipoId);
              }
            } else if (!lado.hueco && !lado.clubId) {
              contarVariante(clubesIndividual, registro.claveClubTexto, lado.club);
            }
          }
        });
        combates.push(par);
      });
      competicion.encuentros.forEach((encuentro) => {
        [encuentro.shiro, encuentro.aka].forEach((lado) => {
          const clave = claveTexto(lado.nombre);
          if (clave) {
            contarVariante(nombresEquipo, clave, lado.nombre);
            if (lado.equipoId && !equipoIdPorClave.has(clave)) equipoIdPorClave.set(clave, lado.equipoId);
          }
        });
      });
    });
  });
  return { registros, combates, nombresEquipo, clubesIndividual, equipoIdPorClave };
}

function analizarRegistros(modelo, opciones = {}) {
  const generarId = opciones.generarId || generarUuid;
  const alias = leerAlias(opciones.alias || crearAliasVacio());
  const decisiones = [];
  const dudas = [];
  const { registros, combates, nombresEquipo, clubesIndividual, equipoIdPorClave } = recolectar(modelo);

  // --- Clubes ---------------------------------------------------------------
  const clubes = alias.clubes;
  const clubPorClave = new Map();
  const registrarClub = (club) => {
    [club.nombre].concat(club.alias).forEach((texto) => {
      const clave = claveTexto(texto);
      if (clave && !clubPorClave.has(clave)) clubPorClave.set(clave, club);
    });
  };
  clubes.forEach(registrarClub);

  const equipos = alias.equipos;
  const equipoPorClave = new Map();
  equipos.forEach((equipo) => equipoPorClave.set(claveTexto(equipo.nombre), equipo));

  // Clubes que salen de las competiciones individuales. Un texto que tambien es un equipo y que
  // empieza por otro club (DENTO RYU frente a DENTO) no es un club: es un equipo de ese club.
  const candidatas = Array.from(clubesIndividual.keys())
    .filter((clave) => !clubPorClave.has(clave) && !equipoPorClave.has(clave))
    .sort();
  const clavesDeClub = new Set(clubPorClave.keys());
  candidatas.forEach((clave) => clavesDeClub.add(clave));
  candidatas.forEach((clave) => {
    const prefijo = Array.from(clavesDeClub).filter((p) => p !== clave && clave.startsWith(`${p} `))
      .sort((a, b) => b.length - a.length)[0];
    if (prefijo && nombresEquipo.has(clave)) {
      decisiones.push({
        tipo: "club-como-equipo",
        mensaje: `«${textoMasFrecuente(clubesIndividual.get(clave))}» aparece como club en una competición individual, pero también es un equipo: se trata como equipo del club ${prefijo}.`
      });
      return;
    }
    const club = { id: generarId(), nombre: textoMasFrecuente(clubesIndividual.get(clave)), alias: [] };
    clubes.push(club);
    registrarClub(club);
  });

  // Clubes que ya traen los registros del esquema 2 (clubId): no se guardan en el alias.
  const clubesDeRegistro = new Map();
  registros.forEach((r) => {
    if (r.clubIdReg && !r.hueco) {
      const entrada = clubesDeRegistro.get(r.clubIdReg) || { individual: new Map(), otros: new Map() };
      sumarVez(r.esEquipo ? entrada.otros : entrada.individual, r.club);
      clubesDeRegistro.set(r.clubIdReg, entrada);
    }
  });

  // --- Equipos --------------------------------------------------------------
  const buscarClubDeEquipo = (clave) => {
    if (clubPorClave.has(clave)) return clubPorClave.get(clave);
    const prefijo = Array.from(clubPorClave.keys()).filter((p) => clave.startsWith(`${p} `))
      .sort((a, b) => b.length - a.length)[0];
    return prefijo ? clubPorClave.get(prefijo) : null;
  };
  equipos.forEach((equipo) => {
    if (equipo.clubId === null) {
      const club = buscarClubDeEquipo(claveTexto(equipo.nombre));
      if (club) equipo.clubId = club.id;
    }
  });
  Array.from(nombresEquipo.keys()).sort().forEach((clave) => {
    if (equipoPorClave.has(clave)) return;
    const club = buscarClubDeEquipo(clave);
    const equipo = {
      id: equipoIdPorClave.get(clave) || generarId(),
      nombre: textoMasFrecuente(nombresEquipo.get(clave)),
      clubId: club ? club.id : null
    };
    equipos.push(equipo);
    equipoPorClave.set(clave, equipo);
  });

  const equiposUsados = new Set(nombresEquipo.keys());
  equipos.forEach((equipo) => {
    const clave = claveTexto(equipo.nombre);
    if (!equiposUsados.has(clave) || equipo.clubId !== null) return;
    const palabras = equipo.nombre.trim().split(/\s+/);
    const ultima = palabras[palabras.length - 1];
    const propuesta = palabras.length > 1 && /^(\d+|[IVX]+|[A-Za-z])$/.test(ultima)
      ? palabras.slice(0, -1).join(" ")
      : null;
    dudas.push({
      tipo: "club-de-equipo",
      equipoId: equipo.id,
      equipoNombre: equipo.nombre,
      propuesta
    });
  });

  // --- Cada lado, con su club ------------------------------------------------
  const resolverClub = (r) => {
    if (r.clubIdReg) return { clubId: r.clubIdReg, equipoId: r.equipoIdReg || null, claveClub: r.clubIdReg };
    const clave = r.claveClubTexto;
    if (r.esEquipo) {
      const equipo = equipoPorClave.get(clave);
      if (!equipo) return { clubId: null, equipoId: null, claveClub: "" };
      return { clubId: equipo.clubId, equipoId: equipo.id, claveClub: equipo.clubId || `equipo:${clave}` };
    }
    const club = clubPorClave.get(clave);
    if (club) return { clubId: club.id, equipoId: null, claveClub: club.id };
    const equipo = equipoPorClave.get(clave);
    if (equipo) return { clubId: equipo.clubId, equipoId: null, claveClub: equipo.clubId || `equipo:${clave}` };
    return { clubId: null, equipoId: null, claveClub: "" };
  };
  registros.forEach((r) => { r.res = resolverClub(r); });

  // --- Grupos de nombres (mismo nombre escrito igual en el mismo club) ---------------
  const grupos = new Map();
  const personasDeRegistro = new Map();
  registros.forEach((r) => {
    if (r.hueco || r.claveNombre === "") return;
    if (r.personaIdReg) {
      const persona = personasDeRegistro.get(r.personaIdReg)
        || { id: r.personaIdReg, nombres: new Map(), clubId: r.res.clubId, apariciones: 0 };
      sumarVez(persona.nombres, r.nombre);
      persona.apariciones += 1;
      personasDeRegistro.set(r.personaIdReg, persona);
      r.grupo = null;
      return;
    }
    const clave = `${r.res.claveClub}|${r.claveNombre}`;
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        clave,
        claveNombre: r.claveNombre,
        claveClub: r.res.claveClub,
        clubId: r.res.clubId,
        nombres: new Map(),
        apariciones: 0,
        partes: partirNombre(r.claveNombre)
      });
    }
    const grupo = grupos.get(clave);
    sumarVez(grupo.nombres, r.nombre);
    grupo.apariciones += 1;
    r.grupo = clave;
  });

  // --- Unión de grupos ------------------------------------------------------
  const padre = new Map();
  const miembros = new Map();
  const conflictos = new Map();
  const nombreDePila = new Map();
  const anadirNodo = (nodo, pila) => {
    if (padre.has(nodo)) return;
    padre.set(nodo, nodo);
    miembros.set(nodo, new Set([nodo]));
    if (pila) nombreDePila.set(nodo, pila);
  };
  const buscar = (nodo) => {
    let actual = nodo;
    while (padre.get(actual) !== actual) {
      padre.set(actual, padre.get(padre.get(actual)));
      actual = padre.get(actual);
    }
    return actual;
  };
  const hayConflicto = (ra, rb) => {
    const a = miembros.get(ra);
    const b = miembros.get(rb);
    for (const x of a) {
      const rivales = conflictos.get(x);
      if (rivales) for (const y of b) if (rivales.has(y)) return true;
    }
    const personasA = Array.from(a).some((n) => n.startsWith("P:"));
    const personasB = Array.from(b).some((n) => n.startsWith("P:"));
    if (personasA && personasB) return true;
    const pilas = new Set();
    a.forEach((n) => { if (nombreDePila.has(n)) pilas.add(nombreDePila.get(n)); });
    b.forEach((n) => { if (nombreDePila.has(n)) pilas.add(nombreDePila.get(n)); });
    return pilas.size > 1;
  };
  const unir = (x, y) => {
    const ra = buscar(x);
    const rb = buscar(y);
    if (ra === rb) return true;
    if (hayConflicto(ra, rb)) return false;
    const [grande, pequeno] = miembros.get(ra).size >= miembros.get(rb).size ? [ra, rb] : [rb, ra];
    miembros.get(pequeno).forEach((n) => miembros.get(grande).add(n));
    miembros.delete(pequeno);
    padre.set(pequeno, grande);
    return true;
  };

  const listaGrupos = Array.from(grupos.values()).sort((a, b) => (a.clave < b.clave ? -1 : 1));
  listaGrupos.forEach((g) => {
    const pila = !g.partes.simple && g.partes.primero.length > 2 ? g.partes.primero : null;
    anadirNodo(g.clave, pila);
  });
  alias.personas.forEach((p) => anadirNodo(`P:${p.id}`, null));

  // Quienes se enfrentan en un combate son personas distintas.
  combates.forEach((par) => {
    const [a, b] = par;
    if (!a.grupo || !b.grupo || a.grupo === b.grupo) return;
    if (!conflictos.has(a.grupo)) conflictos.set(a.grupo, new Set());
    if (!conflictos.has(b.grupo)) conflictos.set(b.grupo, new Set());
    conflictos.get(a.grupo).add(b.grupo);
    conflictos.get(b.grupo).add(a.grupo);
  });

  // 1) Lo ya confirmado en el alias.
  const personaPorClave = new Map();
  alias.personas.forEach((p) => {
    if (!p.clubId) return;
    [p.nombre].concat(p.alias).forEach((texto) => {
      const clave = `${p.clubId}|${claveTexto(texto)}`;
      if (!personaPorClave.has(clave)) personaPorClave.set(clave, p);
    });
  });
  const coincidenConAlias = new Set();
  listaGrupos.forEach((g) => {
    const persona = g.clubId ? personaPorClave.get(`${g.clubId}|${g.claveNombre}`) : null;
    if (persona) {
      unir(g.clave, `P:${persona.id}`);
      coincidenConAlias.add(g.clave);
    }
  });

  // 2) Uniones automaticas dentro del mismo club: apellido igual con inicial compatible,
  //    o apellido que difiere en una letra (erratas).
  const compuestos = listaGrupos.filter((g) => !g.partes.simple);
  for (let i = 0; i < compuestos.length; i++) {
    for (let j = i + 1; j < compuestos.length; j++) {
      const a = compuestos[i];
      const b = compuestos[j];
      if (a.claveClub !== b.claveClub) continue;
      if (!primerosCompatibles(a.partes.primero, b.partes.primero)) continue;
      const mismoApellido = a.partes.apellido === b.partes.apellido;
      const errata = a.partes.apellido.length >= 5 && b.partes.apellido.length >= 5
        && diferenciaDeUnaLetra(a.partes.apellido, b.partes.apellido);
      if (!mismoApellido && !errata) continue;
      // Una inicial que podria ser de dos nombres de pila distintos (A. GARCIA frente a ANA y
      // ALBERTO GARCIA) es ambigua: no se une a ninguno.
      const inicial = a.partes.primero.length <= 2 ? a : (b.partes.primero.length <= 2 ? b : null);
      const completo = inicial === a ? b : (inicial === b ? a : null);
      if (inicial && completo && completo.partes.primero.length > 2) {
        const hayOtro = compuestos.some((o) => o !== inicial && o !== completo
          && o.claveClub === inicial.claveClub
          && o.partes.primero.length > 2
          && o.partes.primero !== completo.partes.primero
          && primerosCompatibles(inicial.partes.primero, o.partes.primero)
          && (o.partes.apellido === completo.partes.apellido
            || (o.partes.apellido.length >= 5 && diferenciaDeUnaLetra(o.partes.apellido, completo.partes.apellido))));
        if (hayOtro) continue;
      }
      unir(a.clave, b.clave);
    }
  }

  // 3) Nombres de una sola palabra: no se unen solos. Si hay candidatos, se pregunta.
  const pendientes = new Map(); // clave de grupo -> duda
  listaGrupos.filter((g) => g.partes.simple && !coincidenConAlias.has(g.clave)).forEach((g) => {
    const token = g.partes.token;
    const porApellido = new Map();
    const porInicial = new Map();
    compuestos.forEach((c) => {
      if (c.claveClub !== g.claveClub) return;
      const raiz = buscar(c.clave);
      if (c.partes.apellido === token
        || (token.length >= 5 && c.partes.apellido.length >= 5 && diferenciaDeUnaLetra(token, c.partes.apellido))) {
        porApellido.set(raiz, "apellido");
      } else if (token.length > c.partes.primero.length && token.startsWith(c.partes.primero)) {
        porInicial.set(raiz, "inicial");
      }
    });
    const elegidos = porApellido.size > 0 ? porApellido : porInicial;
    if (elegidos.size > 0) pendientes.set(g.clave, { grupo: g, raices: elegidos });
  });

  // --- Personas -------------------------------------------------------------
  const nombreClub = (clubId) => {
    if (!clubId) return "";
    const club = clubes.find((c) => c.id === clubId);
    if (club) return club.nombre;
    const reg = clubesDeRegistro.get(clubId);
    if (reg) return textoMasFrecuente(reg.individual.size > 0 ? reg.individual : reg.otros);
    return "";
  };

  const componentes = new Map(); // raiz -> { grupos: [], persona: alias | null }
  listaGrupos.forEach((g) => {
    const raiz = buscar(g.clave);
    if (!componentes.has(raiz)) componentes.set(raiz, { grupos: [], personaAlias: null });
    componentes.get(raiz).grupos.push(g);
  });
  alias.personas.forEach((p) => {
    const raiz = buscar(`P:${p.id}`);
    if (componentes.has(raiz)) componentes.get(raiz).personaAlias = p;
  });

  const personas = [];
  const personaDeGrupo = new Map();
  const idDeRaiz = new Map();
  const personasAlias = alias.personas;

  Array.from(componentes.entries())
    .sort((a, b) => (a[1].grupos[0].clave < b[1].grupos[0].clave ? -1 : 1))
    .forEach(([raiz, componente]) => {
      const pendiente = componente.grupos.length === 1 && pendientes.has(componente.grupos[0].clave)
        && !componente.personaAlias;
      const nombres = new Map();
      let apariciones = 0;
      componente.grupos.forEach((g) => {
        g.nombres.forEach((veces, texto) => nombres.set(texto, (nombres.get(texto) || 0) + veces));
        apariciones += g.apariciones;
      });
      const clubId = componente.grupos[0].clubId;
      const personaAlias = componente.personaAlias;
      const nombre = personaAlias ? personaAlias.nombre : textoMasFrecuente(nombres);
      const id = personaAlias ? personaAlias.id : generarId();
      const todos = Array.from(nombres.keys()).filter((t) => t !== nombre);
      const aliasPersona = Array.from(new Set((personaAlias ? personaAlias.alias : []).concat(todos)));

      const persona = {
        id,
        nombre,
        clubId,
        clubNombre: nombreClub(clubId),
        alias: aliasPersona,
        apariciones,
        pendiente,
        origen: "nombre"
      };
      personas.push(persona);
      componente.grupos.forEach((g) => personaDeGrupo.set(g.clave, id));
      idDeRaiz.set(raiz, id);

      // Se guarda en el alias lo que quedo decidido (y solo si el club esta resuelto).
      if (!pendiente && clubId) {
        if (personaAlias) {
          personaAlias.alias = aliasPersona.filter((t) => t !== personaAlias.nombre);
        } else {
          personasAlias.push({ id, nombre, clubId, alias: aliasPersona });
        }
      }
    });

  // Las dudas de nombres incompletos, ya con los ids definitivos de los candidatos.
  pendientes.forEach(({ grupo, raices }) => {
    const candidatos = [];
    raices.forEach((motivo, raiz) => {
      const id = idDeRaiz.get(raiz);
      const persona = personas.find((p) => p.id === id);
      if (persona) candidatos.push({ personaId: persona.id, nombre: persona.nombre, apariciones: persona.apariciones, motivo });
    });
    dudas.push({
      tipo: "nombre-incompleto",
      nombre: textoMasFrecuente(grupo.nombres),
      variantes: Array.from(grupo.nombres.keys()),
      claveNombre: grupo.claveNombre,
      clubId: grupo.clubId,
      clubNombre: nombreClub(grupo.clubId),
      apariciones: grupo.apariciones,
      candidatos
    });
  });

  // Personas que ya traen id en el registro (esquema 2): mandan, no se agrupan por nombre.
  personasDeRegistro.forEach((p) => {
    personas.push({
      id: p.id,
      nombre: textoMasFrecuente(p.nombres),
      clubId: p.clubId,
      clubNombre: nombreClub(p.clubId),
      alias: Array.from(p.nombres.keys()).filter((t) => t !== textoMasFrecuente(p.nombres)),
      apariciones: p.apariciones,
      pendiente: false,
      origen: "registro"
    });
  });
  personas.sort((a, b) => (a.clubNombre < b.clubNombre ? -1 : a.clubNombre > b.clubNombre ? 1 : (a.nombre < b.nombre ? -1 : 1)));

  // --- Resolución por lado (para asignarIdentidades) ---------------------------
  const resolucion = new Map();
  registros.forEach((r) => {
    if (r.hueco || r.claveNombre === "") return;
    const personaId = r.personaIdReg || personaDeGrupo.get(r.grupo);
    const clave = `${r.esEquipo ? "E" : "I"}|${r.claveClubTexto}|${r.claveNombre}`;
    resolucion.set(clave, {
      personaId,
      clubId: r.res.clubId,
      equipoId: r.esEquipo ? r.res.equipoId : null
    });
  });

  const clubesSalida = clubes.map((c) => ({ id: c.id, nombre: c.nombre, alias: c.alias.slice() }));
  clubesDeRegistro.forEach((reg, id) => {
    if (!clubesSalida.some((c) => c.id === id)) clubesSalida.push({ id, nombre: nombreClub(id), alias: [] });
  });

  return {
    clubes: clubesSalida,
    equipos: equipos.map((e) => ({ id: e.id, nombre: e.nombre, clubId: e.clubId })),
    personas,
    dudas,
    decisiones,
    alias: {
      formato: FORMATO_ALIAS,
      version: VERSION_ALIAS,
      clubes: clubes.map((c) => ({ id: c.id, nombre: c.nombre, alias: c.alias.slice() })),
      equipos: equipos.map((e) => ({ id: e.id, nombre: e.nombre, clubId: e.clubId })),
      personas: personasAlias.map((p) => ({ id: p.id, nombre: p.nombre, clubId: p.clubId, alias: p.alias.slice() }))
    },
    _resolucion: resolucion,
    _equipoPorClave: new Map(Array.from(equipoPorClave.entries()).map(([k, e]) => [k, { id: e.id, clubId: e.clubId }]))
  };
}

// Devuelve una copia del modelo con personaId, clubId y equipoId en cada lado de combate
// (y equipoId, clubId en cada encuentro). Lo que el registro ya trae no se toca.
function asignarIdentidades(modelo, analisis) {
  const copia = JSON.parse(JSON.stringify(modelo));
  copia.campeonatos.forEach((campeonato) => {
    campeonato.competiciones.forEach((competicion) => {
      const esEquipo = esCompeticionDeEquipos(competicion);
      competicion.combates.forEach((combate) => {
        ["shiro", "aka"].forEach((nombreLado) => {
          const lado = combate[nombreLado];
          if (lado.hueco || lado.personaId) return;
          const clave = `${esEquipo ? "E" : "I"}|${claveTexto(lado.club)}|${claveTexto(lado.nombre)}`;
          const resolucion = analisis._resolucion.get(clave);
          if (!resolucion) return;
          lado.personaId = resolucion.personaId;
          if (!lado.clubId) lado.clubId = resolucion.clubId;
          if (esEquipo && !lado.equipoId) lado.equipoId = resolucion.equipoId;
        });
      });
      competicion.encuentros.forEach((encuentro) => {
        [encuentro.shiro, encuentro.aka].forEach((lado) => {
          const equipo = analisis._equipoPorClave.get(claveTexto(lado.nombre));
          if (!equipo) return;
          if (!lado.equipoId) lado.equipoId = equipo.id;
          lado.clubId = lado.clubId || equipo.clubId;
        });
      });
    });
  });
  return copia;
}

// ---------------------------------------------------------------------------
// Resolver dudas: cada función devuelve un alias nuevo (hay que volver a analizar)
// ---------------------------------------------------------------------------

function resolverDudaUnir(alias, duda, personaId) {
  const copia = leerAlias(alias);
  const persona = copia.personas.find((p) => p.id === personaId);
  if (!persona) throw new ErrorAlias("persona-desconocida", "La persona elegida no existe en el archivo de alias.");
  duda.variantes.forEach((texto) => {
    if (texto !== persona.nombre && !persona.alias.includes(texto)) persona.alias.push(texto);
  });
  return copia;
}

function resolverDudaSeparar(alias, duda, opciones = {}) {
  const copia = leerAlias(alias);
  if (!duda.clubId) {
    throw new ErrorAlias("club-sin-resolver", "Antes hay que decidir a qué club pertenece el equipo.");
  }
  const generarId = opciones.generarId || generarUuid;
  copia.personas.push({
    id: generarId(),
    nombre: duda.nombre,
    clubId: duda.clubId,
    alias: duda.variantes.filter((t) => t !== duda.nombre)
  });
  return copia;
}

// decision: { clubId } para un club que ya existe, o { nombreClub } para uno nuevo (o existente por nombre).
function resolverDudaClubEquipo(alias, duda, decision, opciones = {}) {
  const copia = leerAlias(alias);
  const equipo = copia.equipos.find((e) => e.id === duda.equipoId);
  if (!equipo) throw new ErrorAlias("equipo-desconocido", "El equipo no existe en el archivo de alias.");
  if (decision && decision.clubId) {
    if (!copia.clubes.some((c) => c.id === decision.clubId)) {
      throw new ErrorAlias("club-desconocido", "El club elegido no existe en el archivo de alias.");
    }
    equipo.clubId = decision.clubId;
    return copia;
  }
  const nombre = decision && typeof decision.nombreClub === "string" ? decision.nombreClub.trim() : "";
  if (nombre === "") throw new ErrorAlias("club-sin-nombre", "Indica el nombre del club.");
  let club = copia.clubes.find((c) => claveTexto(c.nombre) === claveTexto(nombre));
  if (!club) {
    const generarId = opciones.generarId || generarUuid;
    club = { id: generarId(), nombre, alias: [] };
    copia.clubes.push(club);
  }
  equipo.clubId = club.id;
  return copia;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FORMATO_ALIAS,
    VERSION_ALIAS,
    ErrorAlias,
    generarUuid,
    claveTexto,
    diferenciaDeUnaLetra,
    crearAliasVacio,
    leerAlias,
    analizarRegistros,
    asignarIdentidades,
    resolverDudaUnir,
    resolverDudaSeparar,
    resolverDudaClubEquipo
  };
}
