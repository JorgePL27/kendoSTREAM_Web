// podios.js
// KendoSTREAM — © 2026 Jorge Pascual Lansac. Distribuido bajo PolyForm
// Noncommercial License 1.0.0 — ver LICENSE.txt en la raíz del proyecto.
//
// Analizador (Fase 1, bloque 3): podio y fighting spirit de cada competición.
// Lógica pura: sin DOM ni red. Con require en Node, globales en el navegador.
//
// Trabaja sobre el modelo ya enriquecido con asignarIdentidades() (alias-personas.js):
// cada lado de combate lleva personaId, clubId y equipoId.
//
// Las entradas del podio son { ref, nombre, club }: en individual ref es el personaId y en
// equipos el equipoId (con el nombre del equipo y el de su club).

const CODIGOS_RONDA = ["GRUPOS", "OCTAVOS", "CUARTOS", "SEMIFINAL", "FINAL", "RONDA_32", "RONDA_64"];

function limpiarTextoRonda(texto) {
  return String(texto === null || texto === undefined ? "" : texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Código de ronda de la lista cerrada del contrato. Si el registro ya trae rondaCodigo (esquema 2)
// manda ese; si no, se normaliza el texto libre (SEMIFINALES y SEMIFINAL 2 son SEMIFINAL, LIGA n es GRUPOS).
// TERCER_PUESTO es interno: sirve para no confundir ese combate con una semifinal o una final.
function codigoDeRonda(texto, codigo) {
  if (typeof codigo === "string" && CODIGOS_RONDA.includes(codigo)) return codigo;
  const clave = limpiarTextoRonda(texto);
  if (clave === "") return null;
  if (/SEMI/.test(clave)) return "SEMIFINAL";
  if (/TERCER|BRONCE|3ER|3 Y 4/.test(clave)) return "TERCER_PUESTO";
  if (/CUARTOS/.test(clave)) return "CUARTOS";
  if (/OCTAVOS/.test(clave)) return "OCTAVOS";
  if (/\bFINAL\b/.test(clave)) return "FINAL";
  if (/^(LIGA|GRUPO|GRUPOS|POOL)\b/.test(clave)) return "GRUPOS";
  return null;
}

function esCompeticionPorEquipos(competicion) {
  return competicion.modalidad.opcion === "equipos" || competicion.encuentros.length > 0;
}

// ---------------------------------------------------------------------------
// Índice de nombres a partir del análisis de personas y clubes
// ---------------------------------------------------------------------------

function crearIndiceDeIdentidades(analisis) {
  const clubes = new Map(analisis.clubes.map((c) => [c.id, c.nombre]));
  const personas = new Map(analisis.personas.map((p) => [p.id, { nombre: p.nombre, club: p.clubNombre || "", clubId: p.clubId || null }]));
  const equipos = new Map(analisis.equipos.map((e) => [e.id, { nombre: e.nombre, club: e.clubId ? (clubes.get(e.clubId) || "") : "", clubId: e.clubId || null }]));
  return { personas, equipos, clubes };
}

function entradaDePersona(lado, indice) {
  const conocida = lado.personaId ? indice.personas.get(lado.personaId) : null;
  return {
    ref: lado.personaId || null,
    nombre: conocida ? conocida.nombre : lado.nombre,
    club: conocida ? conocida.club : lado.club
  };
}

function entradaDeEquipo(lado, indice) {
  const conocido = lado.equipoId ? indice.equipos.get(lado.equipoId) : null;
  return {
    ref: lado.equipoId || null,
    nombre: conocido ? conocido.nombre : lado.nombre,
    club: conocido ? conocido.club : ""
  };
}

function ordenarEntradas(lista) {
  return lista.sort((a, b) => (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0));
}

// Quienes pueden estar en el podio: personas en individual, equipos en competiciones por equipos.
function participantesDeCompeticion(competicion, indice) {
  const mapa = new Map();
  const anadir = (entrada) => {
    if (entrada.ref && !mapa.has(entrada.ref)) mapa.set(entrada.ref, entrada);
  };
  if (esCompeticionPorEquipos(competicion)) {
    competicion.encuentros.forEach((e) => {
      anadir(entradaDeEquipo({ nombre: e.shiro.nombre, equipoId: e.shiro.equipoId }, indice));
      anadir(entradaDeEquipo({ nombre: e.aka.nombre, equipoId: e.aka.equipoId }, indice));
    });
    competicion.combates.forEach((c) => {
      [c.shiro, c.aka].forEach((lado) => {
        if (lado.equipoId) anadir(entradaDeEquipo({ nombre: lado.club, equipoId: lado.equipoId }, indice));
      });
    });
  } else {
    competicion.combates.forEach((c) => {
      [c.shiro, c.aka].forEach((lado) => {
        if (!lado.hueco) anadir(entradaDePersona(lado, indice));
      });
    });
  }
  return ordenarEntradas(Array.from(mapa.values()));
}

// Las personas que combatieron en la competición (candidatas al fighting spirit),
// también en las competiciones por equipos.
function personasDeCompeticion(competicion, indice) {
  const mapa = new Map();
  competicion.combates.forEach((c) => {
    [c.shiro, c.aka].forEach((lado) => {
      if (lado.hueco || !lado.personaId || mapa.has(lado.personaId)) return;
      mapa.set(lado.personaId, entradaDePersona(lado, indice));
    });
  });
  return ordenarEntradas(Array.from(mapa.values()));
}

// ---------------------------------------------------------------------------
// Cálculo del podio desde el cuadro
// ---------------------------------------------------------------------------

function ladoGanador(resultado) {
  return resultado.ganador === "shiro" || resultado.ganador === "aka" ? resultado.ganador : null;
}

function unidadesIndividuales(competicion, indice) {
  return competicion.combates.map((c) => {
    const ganadorLado = ladoGanador(c.resultado);
    const perdedorLado = ganadorLado === null ? null : (ganadorLado === "shiro" ? "aka" : "shiro");
    return {
      codigo: codigoDeRonda(c.rondaTexto, c.rondaCodigo),
      ganador: ganadorLado && !c[ganadorLado].hueco ? entradaDePersona(c[ganadorLado], indice) : null,
      perdedor: perdedorLado && !c[perdedorLado].hueco ? entradaDePersona(c[perdedorLado], indice) : null
    };
  });
}

// En equipos la ronda vive en los combates del encuentro (esquema 1) o en el propio encuentro (esquema 2).
function unidadesPorEquipos(competicion, indice, avisos) {
  return competicion.encuentros.map((e) => {
    const codigos = new Set(
      competicion.combates
        .filter((c) => c.encuentro && c.encuentro.id === e.id)
        .map((c) => codigoDeRonda(c.rondaTexto, c.rondaCodigo))
        .filter(Boolean)
    );
    const delEncuentro = codigoDeRonda(e.rondaTexto, e.rondaCodigo);
    if (delEncuentro) codigos.add(delEncuentro);
    if (codigos.size > 1) avisos.push(`Un encuentro de ${e.shiro.nombre} contra ${e.aka.nombre} tiene rondas distintas en sus combates.`);
    const ganadorLado = ladoGanador(e.resultado);
    const perdedorLado = ganadorLado === null ? null : (ganadorLado === "shiro" ? "aka" : "shiro");
    return {
      codigo: codigos.size === 1 ? Array.from(codigos)[0] : null,
      ganador: ganadorLado ? entradaDeEquipo(e[ganadorLado], indice) : null,
      perdedor: perdedorLado ? entradaDeEquipo(e[perdedorLado], indice) : null
    };
  });
}

// Propone el podio a partir de la final y las semifinales, y dice qué no ha podido determinar.
// Devuelve { origen, primero, segundo, terceros, faltan, avisos, participantes }.
function calcularPodio(competicion, indice) {
  const avisos = [];
  const faltan = [];
  const participantes = participantesDeCompeticion(competicion, indice);
  const unidades = esCompeticionPorEquipos(competicion)
    ? unidadesPorEquipos(competicion, indice, avisos)
    : unidadesIndividuales(competicion, indice);

  let finales = unidades.filter((u) => u.codigo === "FINAL");
  // Dos participantes y un único combate sin etiquetar: ese combate es la final.
  if (finales.length === 0 && participantes.length === 2 && unidades.length === 1) finales = unidades;
  const semifinales = unidades.filter((u) => u.codigo === "SEMIFINAL");

  let primero = null;
  let segundo = null;
  if (finales.length === 1 && finales[0].ganador && finales[0].perdedor) {
    primero = finales[0].ganador;
    segundo = finales[0].perdedor;
  } else {
    faltan.push("primero", "segundo");
    if (finales.length === 0) avisos.push("No hay ningún combate etiquetado como final.");
    else if (finales.length > 1) avisos.push("Hay varios combates etiquetados como final.");
    else avisos.push("La final no tiene un ganador claro.");
  }

  let terceros = [];
  if (participantes.length <= 2) {
    terceros = [];
  } else if (semifinales.length === 2 && semifinales.every((s) => s.perdedor)) {
    terceros = semifinales.map((s) => s.perdedor);
  } else {
    faltan.push("terceros");
    if (semifinales.length !== 2) avisos.push("No hay dos semifinales etiquetadas, así que no se pueden deducir los terceros.");
    else avisos.push("Alguna semifinal no tiene un ganador claro, así que no se pueden deducir los terceros.");
  }

  if (primero && semifinales.length === 2 && semifinales.every((s) => s.ganador)) {
    const ganadoresSemis = semifinales.map((s) => s.ganador.ref);
    if (!ganadoresSemis.includes(primero.ref) || !ganadoresSemis.includes(segundo.ref)) {
      avisos.push("Los finalistas no coinciden con los ganadores de las semifinales: revisa el podio.");
    }
  }

  return { origen: "analizador", primero, segundo, terceros, faltan, avisos, participantes };
}

// ---------------------------------------------------------------------------
// Qué manda: lo editado a mano, luego el podio que ya trae el registro, luego el calculado
// ---------------------------------------------------------------------------

function podioDelRegistroVacio(podio) {
  return !podio || (!podio.primero && !podio.segundo && (!Array.isArray(podio.terceros) || podio.terceros.length === 0));
}

// decision (opcional): { podio: { primero, segundo, terceros }, espirituLucha: [] } con cualquiera de las dos partes.
// espirituLucha devuelto: array (puede ir vacío: "ninguno") o null (sin decidir).
function resolverPodio({ calculado, existente, decision }) {
  let podio;
  let faltan = [];
  let avisos = [];
  if (decision && decision.podio) {
    podio = {
      primero: decision.podio.primero || null,
      segundo: decision.podio.segundo || null,
      terceros: (decision.podio.terceros || []).filter(Boolean),
      origen: "manual"
    };
  } else if (!podioDelRegistroVacio(existente)) {
    podio = {
      primero: existente.primero || null,
      segundo: existente.segundo || null,
      terceros: Array.isArray(existente.terceros) ? existente.terceros.slice() : [],
      origen: typeof existente.origen === "string" && existente.origen ? existente.origen : "analizador"
    };
  } else {
    podio = { primero: calculado.primero, segundo: calculado.segundo, terceros: calculado.terceros.slice(), origen: "analizador" };
    faltan = calculado.faltan.slice();
    avisos = calculado.avisos.slice();
  }

  let espirituLucha = null;
  if (decision && Array.isArray(decision.espirituLucha)) espirituLucha = decision.espirituLucha.slice();
  else if (existente && Array.isArray(existente.espirituLucha)) espirituLucha = existente.espirituLucha.slice();

  return { podio, faltan, avisos, espirituLucha };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CODIGOS_RONDA,
    codigoDeRonda,
    esCompeticionPorEquipos,
    crearIndiceDeIdentidades,
    participantesDeCompeticion,
    personasDeCompeticion,
    calcularPodio,
    resolverPodio
  };
}
