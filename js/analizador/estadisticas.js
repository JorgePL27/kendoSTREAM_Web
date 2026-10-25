// estadisticas.js
// KendoSTREAM — © 2026 Jorge Pascual Lansac. Distribuido bajo PolyForm
// Noncommercial License 1.0.0 — ver LICENSE.txt en la raíz del proyecto.
//
// Analizador (Fase 1, bloque 4): estadísticas individuales y rankings.
// Lógica pura: sin DOM ni red. Con require en Node, globales en el navegador.
//
// Trabaja sobre el modelo enriquecido con asignarIdentidades() (alias-personas.js) y sobre el
// índice de nombres de podios.js. Reglas:
//  - Un combate con resultado técnico (incomparecencia u otro motivo) cuenta como combate y como
//    victoria o derrota de quien está presente, y se anota aparte (victoriasTecnicas). No cuenta en
//    puntos ni en técnicas, ni en el porcentaje de victorias. El puesto vacío no es una persona.
//  - Un combate empatado cuenta como jugado y no suma victoria.
//  - Los puntos a favor y en contra salen del marcador; las técnicas, de los eventos. Un punto que
//    llega por hansoku (dos hansoku dan un punto al rival) cuenta como punto, pero se anota en su
//    propia columna "hansoku" y no en men, kote, do o tsuki. Los hansoku cometidos se cuentan aparte.
//  - Un resultado manual (sin marcador ni eventos) cuenta como victoria o derrota, pero no aporta puntos.
//  - Las medallas salen del podio de cada competición. En individual, para la persona del podio. En equipos,
//    para cada persona que combatió con ese equipo en esa competición (orosEquipo, platasEquipo y
//    broncesEquipo dicen cuántas de las medallas son de equipo; ya están sumadas en oros, platas y bronces).

const TECNICAS_BASE = ["men", "kote", "do", "tsuki"];
const CLAVES_TECNICA = ["men", "kote", "do", "tsuki", "hansoku", "otras"];

function tecnicasVacias() {
  return { men: 0, kote: 0, do: 0, tsuki: 0, hansoku: 0, otras: 0 };
}

function claveDeTecnica(evento) {
  if (evento.origen === "hansoku" || evento.tecnica === "hansoku") return "hansoku";
  return TECNICAS_BASE.includes(evento.tecnica) ? evento.tecnica : "otras";
}

function competicionEsDeEquipos(competicion) {
  return competicion.modalidad.opcion === "equipos" || competicion.encuentros.length > 0;
}

function textoDeOpcion(opcion) {
  return (opcion && (opcion.texto || opcion.opcion)) || "";
}

function claveDeCategoria(competicion) {
  return textoDeOpcion(competicion.categoria).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}

function nombreDeCompeticionEstadistica(competicion) {
  return [textoDeOpcion(competicion.categoria), textoDeOpcion(competicion.modalidad)].filter(Boolean).join(" · ") || competicion.id;
}

// Categorías que hay en el modelo, para el filtro: [{ clave, texto }].
function categoriasDisponibles(modelo) {
  const mapa = new Map();
  modelo.campeonatos.forEach((campeonato) => {
    campeonato.competiciones.forEach((competicion) => {
      const clave = claveDeCategoria(competicion);
      if (clave && !mapa.has(clave)) mapa.set(clave, textoDeOpcion(competicion.categoria));
    });
  });
  return Array.from(mapa.entries()).map(([clave, texto]) => ({ clave, texto })).sort((a, b) => (a.texto < b.texto ? -1 : 1));
}

// filtros: { campeonatoId, modalidad ("todas" | "individual" | "equipos"), categoria (clave) }
// podios: { "campeonatoId|competicionId": resultado de resolverPodio() }
// Devuelve { filas, detalle, resumen, avisos }.
function calcularEstadisticas(modelo, indice, podios, filtros = {}) {
  const filtro = Object.assign({ campeonatoId: "", modalidad: "todas", categoria: "" }, filtros);
  const filas = new Map();
  const detalle = new Map();
  const avisos = [];
  const resumen = { combates: 0, personas: 0 };
  let podiosIncompletos = 0;
  let sinEspiritu = 0;

  const obtenerFila = (personaId, nombreAlternativo) => {
    if (!filas.has(personaId)) {
      const conocida = indice.personas.get(personaId);
      filas.set(personaId, {
        personaId,
        nombre: conocida ? conocida.nombre : (nombreAlternativo || ""),
        club: conocida ? conocida.club : "",
        clubId: conocida ? (conocida.clubId || null) : null,
        combates: 0,
        victorias: 0,
        derrotas: 0,
        empates: 0,
        victoriasTecnicas: 0,
        derrotasTecnicas: 0,
        combatesValidos: 0,
        victoriasValidas: 0,
        porcentaje: null,
        puntosFavor: 0,
        puntosContra: 0,
        tecnicasFavor: tecnicasVacias(),
        tecnicasContra: tecnicasVacias(),
        hansoku: 0,
        prorrogasJugadas: 0,
        prorrogasGanadas: 0,
        oros: 0,
        platas: 0,
        bronces: 0,
        orosEquipo: 0,
        platasEquipo: 0,
        broncesEquipo: 0,
        espirituLucha: 0,
        competiciones: new Set()
      });
      detalle.set(personaId, []);
    }
    return filas.get(personaId);
  };

  modelo.campeonatos.forEach((campeonato) => {
    if (filtro.campeonatoId && campeonato.id !== filtro.campeonatoId) return;
    campeonato.competiciones.forEach((competicion) => {
      const porEquipos = competicionEsDeEquipos(competicion);
      if (filtro.modalidad === "individual" && porEquipos) return;
      if (filtro.modalidad === "equipos" && !porEquipos) return;
      if (filtro.categoria && claveDeCategoria(competicion) !== filtro.categoria) return;

      const nombreCompeticion = nombreDeCompeticionEstadistica(competicion);

      competicion.combates.forEach((combate) => {
        const r = combate.resultado;
        if (r.tipo === null && r.ganador === null) return; // sin resultado: no se cuenta
        resumen.combates += 1;
        const esTecnica = r.tipo === "tecnica";
        const ladoGanador = r.ganador === "shiro" || r.ganador === "aka" ? r.ganador : null;
        const empate = r.tipo === "empate" || r.ganador === "empate";
        const prorroga = combate.encho === true || r.tipo === "encho";
        const sinPuntos = r.origen === "manual";

        if (esTecnica && ladoGanador && combate[ladoGanador].hueco) {
          avisos.push({
            tipo: "hueco-ganador",
            mensaje: `${nombreCompeticion}, combate ${combate.numero}: el puesto vacío figura como ganador por resultado técnico. Revisa si es un error del registro.`
          });
        }

        ["shiro", "aka"].forEach((lado) => {
          const otroLado = lado === "shiro" ? "aka" : "shiro";
          const yo = combate[lado];
          const rival = combate[otroLado];
          if (yo.hueco || !yo.personaId) return;

          const fila = obtenerFila(yo.personaId, yo.nombre);
          fila.combates += 1;
          fila.competiciones.add(`${campeonato.id}|${competicion.id}`);

          let resultado = null;
          if (empate) {
            fila.empates += 1;
            resultado = "E";
          } else if (ladoGanador === lado) {
            fila.victorias += 1;
            if (esTecnica) fila.victoriasTecnicas += 1;
            resultado = "V";
          } else if (ladoGanador) {
            fila.derrotas += 1;
            if (esTecnica) fila.derrotasTecnicas += 1;
            resultado = "D";
          }

          let favor = null;
          let contra = null;
          const tecnicasDelCombate = [];
          if (!esTecnica) {
            fila.combatesValidos += 1;
            if (resultado === "V") fila.victoriasValidas += 1;
            if (!sinPuntos) {
              favor = combate.marcador[lado];
              contra = combate.marcador[otroLado];
              fila.puntosFavor += favor;
              fila.puntosContra += contra;
            }
          }
          if (prorroga) {
            fila.prorrogasJugadas += 1;
            if (resultado === "V") fila.prorrogasGanadas += 1;
          }

          let hansokuCombate = 0;
          combate.eventos.forEach((evento) => {
            if (evento.tipo === "hansoku" && evento.lado === lado) {
              fila.hansoku += 1;
              hansokuCombate += 1;
            } else if (evento.tipo === "punto" && !esTecnica && !sinPuntos) {
              const clave = claveDeTecnica(evento);
              if (evento.lado === lado) {
                fila.tecnicasFavor[clave] += 1;
                tecnicasDelCombate.push(clave);
              } else {
                fila.tecnicasContra[clave] += 1;
              }
            }
          });

          const conocido = rival.personaId ? indice.personas.get(rival.personaId) : null;
          detalle.get(yo.personaId).push({
            campeonatoId: campeonato.id,
            campeonatoNombre: campeonato.nombre,
            competicionId: competicion.id,
            competicionNombre: nombreCompeticion,
            porEquipos,
            ronda: combate.rondaTexto,
            numero: combate.numero,
            rival: rival.hueco
              ? { nombre: "Puesto vacío", club: rival.club, personaId: null, hueco: true }
              : { nombre: conocido ? conocido.nombre : rival.nombre, club: conocido ? conocido.club : rival.club, personaId: rival.personaId || null, hueco: false },
            resultado,
            tecnica: esTecnica,
            motivo: esTecnica ? r.motivo : null,
            prorroga,
            puntosFavor: favor,
            puntosContra: contra,
            tecnicas: tecnicasDelCombate,
            hansoku: hansokuCombate
          });
        });
      });

      // Medallas (solo individuales) y fighting spirit
      const resuelto = podios ? podios[`${campeonato.id}|${competicion.id}`] : null;
      if (resuelto) {
        if (resuelto.faltan.length > 0) podiosIncompletos += 1;
        if (resuelto.espirituLucha === null) sinEspiritu += 1;
        const { primero, segundo, terceros } = resuelto.podio;
        if (!porEquipos) {
          if (primero && primero.ref) obtenerFila(primero.ref, primero.nombre).oros += 1;
          if (segundo && segundo.ref) obtenerFila(segundo.ref, segundo.nombre).platas += 1;
          terceros.forEach((t) => { if (t.ref) obtenerFila(t.ref, t.nombre).bronces += 1; });
        } else {
          // Cada persona que combatió con el equipo en esta competición recibe su medalla.
          const miembros = new Map();
          competicion.combates.forEach((combate) => {
            [combate.shiro, combate.aka].forEach((lado) => {
              if (lado.hueco || !lado.personaId || !lado.equipoId) return;
              if (!miembros.has(lado.equipoId)) miembros.set(lado.equipoId, new Set());
              miembros.get(lado.equipoId).add(lado.personaId);
            });
          });
          const darMedalla = (entrada, clave) => {
            if (!entrada || !entrada.ref || !miembros.has(entrada.ref)) return;
            miembros.get(entrada.ref).forEach((personaId) => {
              const fila = obtenerFila(personaId);
              fila[clave] += 1;
              fila[`${clave}Equipo`] += 1;
            });
          };
          darMedalla(primero, "oros");
          darMedalla(segundo, "platas");
          terceros.forEach((t) => darMedalla(t, "bronces"));
        }
        if (Array.isArray(resuelto.espirituLucha)) {
          resuelto.espirituLucha.forEach((e) => { if (e.ref) obtenerFila(e.ref, e.nombre).espirituLucha += 1; });
        }
      }
    });
  });

  const lista = Array.from(filas.values()).map((fila) => {
    fila.porcentaje = fila.combatesValidos > 0 ? (fila.victoriasValidas / fila.combatesValidos) * 100 : null;
    fila.competiciones = fila.competiciones.size;
    return fila;
  }).sort((a, b) => (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0));
  resumen.personas = lista.length;

  if (podiosIncompletos > 0 || sinEspiritu > 0) {
    avisos.push({
      tipo: "podios-pendientes",
      podiosIncompletos,
      sinEspiritu,
      mensaje: "Hay podios incompletos o fighting spirit sin decidir: las medallas y el fighting spirit pueden estar incompletos."
    });
  }
  return { filas: lista, detalle, resumen, avisos };
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

function textoPorcentaje(valor) {
  return `${valor.toFixed(1)} %`;
}

// Cada ranking devuelve las primeras "limite" personas y, además, a quienes empatan con la última.
function calcularRankings(filas, opciones = {}) {
  const minimo = Number.isFinite(opciones.minCombates) ? opciones.minCombates : 3;
  const limite = Number.isFinite(opciones.limite) && opciones.limite > 0 ? opciones.limite : 5;
  const compararNombre = (a, b) => (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0);

  const construir = (id, titulo, candidatos, claves, texto) => {
    // claves: (fila) => array de números; se ordena de mayor a menor en cada posición (negar para ascendente).
    const ordenados = candidatos.slice().sort((a, b) => {
      const ka = claves(a);
      const kb = claves(b);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
      return compararNombre(a, b);
    });
    let corte = Math.min(limite, ordenados.length);
    while (corte > 0 && corte < ordenados.length && claves(ordenados[corte]).join() === claves(ordenados[corte - 1]).join()) corte += 1;
    return {
      id,
      titulo,
      filas: ordenados.slice(0, corte).map((fila) => ({ personaId: fila.personaId, nombre: fila.nombre, club: fila.club, texto: texto(fila) }))
    };
  };

  const rankings = [];
  rankings.push(construir("victorias", "Más victorias", filas.filter((f) => f.victorias > 0),
    (f) => [f.victorias, f.porcentaje === null ? -1 : f.porcentaje], (f) => `${f.victorias}`));
  rankings.push(construir("porcentaje", `% de victorias (mínimo ${minimo} combates)`,
    filas.filter((f) => f.porcentaje !== null && f.combatesValidos >= minimo),
    (f) => [f.porcentaje, f.combatesValidos], (f) => `${textoPorcentaje(f.porcentaje)} (${f.victoriasValidas}/${f.combatesValidos})`));
  rankings.push(construir("puntosFavor", "Más puntos a favor", filas.filter((f) => f.puntosFavor > 0),
    (f) => [f.puntosFavor], (f) => `${f.puntosFavor}`));
  rankings.push(construir("puntosContra", `Menos puntos en contra (mínimo ${minimo} combates)`,
    filas.filter((f) => f.combatesValidos >= minimo),
    (f) => [-f.puntosContra, f.combatesValidos], (f) => `${f.puntosContra} en ${f.combatesValidos} combates`));
  TECNICAS_BASE.forEach((tecnica) => {
    rankings.push(construir(tecnica, `Más puntos de ${tecnica}`, filas.filter((f) => f.tecnicasFavor[tecnica] > 0),
      (f) => [f.tecnicasFavor[tecnica]], (f) => `${f.tecnicasFavor[tecnica]}`));
  });
  rankings.push(construir("hansoku", "Más hansoku", filas.filter((f) => f.hansoku > 0),
    (f) => [f.hansoku], (f) => `${f.hansoku}`));
  rankings.push(construir("medallero", "Medallero", filas.filter((f) => f.oros + f.platas + f.bronces > 0),
    (f) => [f.oros, f.platas, f.bronces], (f) => `${f.oros} oro · ${f.platas} plata · ${f.bronces} bronce`));
  rankings.push(construir("espiritu", "Fighting spirit", filas.filter((f) => f.espirituLucha > 0),
    (f) => [f.espirituLucha], (f) => `${f.espirituLucha}`));
  return rankings;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CLAVES_TECNICA,
    categoriasDisponibles,
    calcularEstadisticas,
    calcularRankings
  };
}
