/* ============================================================
   EVENTOS  —  agenda + cuenta atrás de la página principal
   ============================================================
   Para AÑADIR un evento: copia un bloque { ... }, pégalo debajo
   del último (con una coma entre bloques) y cambia los datos.

   Campos:
     titulo        Nombre del evento.
     fecha         Inicio, con este formato exacto y la zona horaria:
                   "2026-10-18T10:00:00+02:00"
                   (+02:00 = hora de verano en España, hasta el 25 oct;
                    +01:00 = hora de invierno, desde el 25 oct).
     duracionHoras Cuántas horas se considera "en directo" tras empezar.
                   Pasado ese tiempo, la cuenta atrás desaparece sola.
     lugar         Texto libre (puede dejarse "").
     descripcion   Texto breve (puede dejarse "").
     enlace        Enlace a la retransmisión o a la web del evento ("" si no hay).
     textoEnlace   Texto del botón del enlace.
     cuentaAtras   true  -> sale la cuenta atrás en la página principal.
                   false -> solo aparece en la lista de Noticias y eventos.
     kendostream   true si se retransmite / organiza con KendoSTREAM.

   Para QUITAR la cuenta atrás: pon cuentaAtras: false (o borra el bloque).
   Si no hay ningún evento futuro con cuentaAtras: true, la sección
   no se muestra. Los eventos pasados pasan solos a "Eventos pasados".
   ============================================================ */
window.KS_EVENTOS = [
  {
    titulo: "Campeonato de Aragón de Kendo 2026",
    fecha: "2026-10-18T10:00:00+02:00",
    duracionHoras: 8,
    lugar: "Aragón",
    descripcion: "Primer torneo retransmitido con KendoSTREAM, estrenando la versión 2.1.",
    enlace: "https://www.youtube.com/watch?v=poGoMjy4NHA",
    textoEnlace: "Ver la retransmisión en Youtube",
    cuentaAtras: true,
    kendostream: true
  }
];
