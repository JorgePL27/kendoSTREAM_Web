// exportar-registro.js
// KendoSTREAM — © 2026 Jorge Pascual Lansac. Distribuido bajo PolyForm
// Noncommercial License 1.0.0 — ver LICENSE.txt en la raíz del proyecto.
//
// Analizador (Fase 1, bloque 3): construye el registro nuevo, en esquema 2, con las personas,
// clubes y equipos identificados, el podio y el fighting spirit. No modifica los registros originales.
// Lógica pura: sin DOM ni red. Con require en Node, globales en el navegador.

function ladoParaRegistro(lado) {
  return {
    nombre: lado.nombre,
    club: lado.club,
    personaId: lado.personaId,
    clubId: lado.clubId,
    equipoId: lado.equipoId
  };
}

function combateParaRegistro(c) {
  return {
    id: c.id,
    numero: c.numero,
    fecha: c.fecha,
    pista: c.pista,
    shiaijo: c.shiaijo,
    ronda: c.rondaTexto,
    fase: c.fase,
    rondaCodigo: c.rondaCodigo,
    grupo: c.grupo,
    shiro: ladoParaRegistro(c.shiro),
    aka: ladoParaRegistro(c.aka),
    encho: c.encho,
    eventos: c.eventos,
    marcador: c.marcador,
    resultado: c.resultado,
    encuentro: c.encuentro,
    inicio: c.inicio,
    fin: c.fin,
    duracionSeg: c.duracionSeg,
    revision: c.revision
  };
}

function ladoDeEncuentroParaRegistro(lado) {
  return { nombre: lado.nombre, equipoId: lado.equipoId, clubId: lado.clubId === undefined ? null : lado.clubId };
}

function encuentroParaRegistro(e) {
  return {
    id: e.id,
    shiro: ladoDeEncuentroParaRegistro(e.shiro),
    aka: ladoDeEncuentroParaRegistro(e.aka),
    integrantes: e.integrantes,
    eliminatoria: e.eliminatoria,
    resultado: e.resultado,
    alineacion: e.alineacion,
    shiaijo: e.shiaijo,
    fase: e.fase,
    ronda: e.rondaTexto,
    rondaCodigo: e.rondaCodigo,
    grupo: e.grupo
  };
}

function podioParaRegistro(resuelto) {
  const podio = resuelto && resuelto.podio
    ? resuelto.podio
    : { primero: null, segundo: null, terceros: [], origen: null };
  const vacio = !podio.primero && !podio.segundo && podio.terceros.length === 0;
  const salida = {
    primero: podio.primero,
    segundo: podio.segundo,
    terceros: podio.terceros,
    origen: vacio ? null : podio.origen
  };
  // Sin decidir (null) no se escribe; "ninguno" se escribe como lista vacía.
  if (resuelto && Array.isArray(resuelto.espirituLucha)) salida.espirituLucha = resuelto.espirituLucha;
  return salida;
}

// campeonato: un campeonato del modelo ya enriquecido con asignarIdentidades().
// analisis: resultado de analizarRegistros(). podios: { [competicionId]: resultado de resolverPodio() }.
// opciones: { version, ahora }.
function construirRegistroEnriquecido(campeonato, analisis, podios, opciones = {}) {
  const personasUsadas = new Set();
  const equiposUsados = new Set();
  campeonato.competiciones.forEach((competicion) => {
    competicion.combates.forEach((c) => {
      [c.shiro, c.aka].forEach((lado) => {
        if (lado.personaId) personasUsadas.add(lado.personaId);
        if (lado.equipoId) equiposUsados.add(lado.equipoId);
      });
    });
    competicion.encuentros.forEach((e) => {
      [e.shiro, e.aka].forEach((lado) => { if (lado.equipoId) equiposUsados.add(lado.equipoId); });
    });
  });

  const personas = analisis.personas
    .filter((p) => personasUsadas.has(p.id))
    .map((p) => ({ id: p.id, nombre: p.nombre, clubId: p.clubId, alias: p.alias.slice() }));
  const equipos = analisis.equipos
    .filter((e) => equiposUsados.has(e.id))
    .map((e) => ({ id: e.id, nombre: e.nombre, clubId: e.clubId }));
  const clubesUsados = new Set();
  personas.forEach((p) => { if (p.clubId) clubesUsados.add(p.clubId); });
  equipos.forEach((e) => { if (e.clubId) clubesUsados.add(e.clubId); });
  const clubes = analisis.clubes
    .filter((c) => clubesUsados.has(c.id))
    .map((c) => ({ id: c.id, nombre: c.nombre }));

  return {
    esquema: 2,
    programa: { nombre: "KendoSTREAM Analizador", version: opciones.version || null },
    evento: {
      id: campeonato.id,
      nombre: campeonato.nombre,
      fecha: campeonato.fechas.length > 0 ? campeonato.fechas[0] : null,
      fechas: campeonato.fechas.slice()
    },
    competiciones: campeonato.competiciones.map((competicion) => ({
      id: competicion.id,
      categoria: competicion.categoria,
      modalidad: competicion.modalidad,
      integrantesEquipo: competicion.integrantesEquipo,
      podio: podioParaRegistro(podios ? podios[competicion.id] : null),
      combates: competicion.combates.map(combateParaRegistro),
      encuentros: competicion.encuentros.map(encuentroParaRegistro)
    })),
    clubes,
    equipos,
    personas,
    fuentes: campeonato.fuentes.map((f) => ({ archivo: f.archivo, esquema: f.esquema })),
    generadoEn: opciones.ahora || new Date().toISOString()
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { construirRegistroEnriquecido };
}
